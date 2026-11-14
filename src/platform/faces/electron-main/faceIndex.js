/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Who is who, from the 128 numbers that describe each face (two photos of the same person give close
// numbers: a distance under ~0.5; different people, usually over 0.6).
//
//   - Faces the person confirmed (named a group, or confirmed one by one) are the references.
//   - A new face close enough to the references of ONE person — and clearly farther from everybody
//     else's — is SUGGESTED as that person: the photo gets the person's label at once, and the person can
//     confirm or correct it. A face the person said is "not X" is never suggested as X again.
//   - The other faces are put in GROUPS of similar faces, waiting for a name: naming a group names every
//     face in it, and the new references suggest that person in the rest of the collection.
// Everything is kept in memory (128 floats per face: 30 000 faces ≈ 15 MB) and written to the catalog.

// people's faces: 128 numbers (face-api); pets: 512 normalized numbers (MobileNet) — measured on test photos:
// the same dog 0.19–0.31 apart, two beagles 0.54–0.61, a dog and a cat about 1.0
const KINDS = {
  face: { dims: 128, suggest: 0.5, margin: 0.06, group: 0.47 },
  pet: { dims: 512, suggest: 0.38, margin: 0.08, group: 0.4 },
  scene: { dims: 0, suggest: 1, margin: 1, group: 1 }, // no faces: what photos show is kept apart (scene_scans)
};

const STATUS = { unknown: 0, suggested: 1, confirmed: 2, ignored: 3 };

function dist(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

const toVec = (blob, dims) => new Float32Array(blob.buffer.slice(blob.byteOffset, blob.byteOffset + dims * 4));
const rejectedOf = (s) => (s ? new Set(String(s).split(',').map(Number).filter(Boolean)) : new Set());

class FaceIndex {
  /** @param {'face'|'pet'} kind */
  constructor(db, kind = 'face') {
    this.db = db;
    this.kind = kind;
    const k = KINDS[kind];
    this.dims = k.dims;
    this.SUGGEST = k.suggest;
    this.MARGIN = k.margin;
    this.GROUP = k.group;
    this.faces = null; // id → { id, mediaId, rootId, v, personId, status, cluster, rejected:Set }
  }

  load() {
    if (this.faces) return;
    this.faces = new Map();
    this.groups = new Map(); // cluster → { sum: Float64Array, n, members:Set }
    this.nextGroup = 1;
    for (const r of this.db.allFaces(this.kind)) {
      const f = { id: r.id, mediaId: r.mediaId, rootId: r.rootId, v: toVec(r.descriptor, this.dims), species: r.species || null, personId: r.personId, status: r.status, cluster: r.cluster, rejected: rejectedOf(r.rejected) };
      if (f.status !== STATUS.unknown) f.cluster = null;
      this.faces.set(f.id, f);
      if (f.cluster) this.#join(f, f.cluster);
    }
  }

  reset() { this.faces = null; }

  // ------------------------------------------------------------------ groups
  #join(f, g) {
    let grp = this.groups.get(g);
    if (!grp) this.groups.set(g, (grp = { sum: new Float64Array(this.dims), n: 0, members: new Set(), species: f.species }));
    for (let i = 0; i < this.dims; i++) grp.sum[i] += f.v[i];
    grp.n++;
    grp.members.add(f.id);
    f.cluster = g;
    if (g >= this.nextGroup) this.nextGroup = g + 1;
  }

  #leave(f) {
    const grp = f.cluster && this.groups.get(f.cluster);
    if (grp && grp.members.delete(f.id)) {
      for (let i = 0; i < this.dims; i++) grp.sum[i] -= f.v[i];
      grp.n--;
      if (!grp.n) this.groups.delete(f.cluster);
    }
    f.cluster = null;
  }

  /** The nearest group whose centre is close enough, or a new group. */
  #group(f) {
    let best = null;
    let bestD = this.GROUP;
    const c = new Float32Array(this.dims);
    for (const [g, grp] of this.groups) {
      if (grp.species !== f.species) continue; // a dog never joins a group of cats
      for (let i = 0; i < this.dims; i++) c[i] = grp.sum[i] / grp.n;
      const d = dist(f.v, c);
      if (d < bestD) { bestD = d; best = g; }
    }
    this.#join(f, best ?? this.nextGroup++);
  }

  // ------------------------------------------------------------------ suggestions
  /** The person this face looks like, or null: close to one person's references and clearly not to the others'. */
  #suggest(f, refs) {
    const near = new Map(); // person → distance to their nearest reference
    for (const r of refs) {
      if (r.id === f.id || r.species !== f.species) continue;
      const d = dist(f.v, r.v);
      if (d < (near.get(r.personId) ?? Infinity)) near.set(r.personId, d);
    }
    let best = null;
    let bestD = Infinity;
    let second = Infinity;
    for (const [p, d] of near) {
      if (d < bestD) { second = bestD; best = p; bestD = d; } else if (d < second) second = d;
    }
    if (best === null || bestD > this.SUGGEST || second - bestD < this.MARGIN || f.rejected.has(best)) return null;
    return best;
  }

  #refs(personId = null) {
    const out = [];
    for (const f of this.faces.values()) if (f.status === STATUS.confirmed && f.personId && (personId === null || f.personId === personId)) out.push(f);
    return out;
  }

  /** New faces of a photo: a suggestion when one is clear, a group otherwise. @returns {object[]} changed rows */
  addFaces(rows) {
    this.load();
    const refs = this.#refs();
    const changed = [];
    for (const r of rows) {
      const f = { id: r.id, mediaId: r.mediaId, rootId: r.rootId, v: toVec(r.descriptor, this.dims), species: r.species || null, personId: null, status: STATUS.unknown, cluster: null, rejected: new Set() };
      this.faces.set(f.id, f);
      const p = refs.length ? this.#suggest(f, refs) : null;
      if (p) { f.personId = p; f.status = STATUS.suggested; } else this.#group(f);
      changed.push(f);
    }
    this.#save(changed);
    return changed;
  }

  /** Faces of photos that left the catalog (or were looked at again). */
  dropMedia(mediaId) {
    if (!this.faces) return;
    for (const f of [...this.faces.values()]) if (f.mediaId === mediaId) { this.#leave(f); this.faces.delete(f.id); }
  }

  // ------------------------------------------------------------------ what the person does
  /**
   * These faces are this person (naming a group, confirming suggestions, or "it is someone else").
   * Then the person's new references are looked for among the faces nobody knows yet.
   */
  setPerson(ids, personId) {
    this.load();
    const changed = [];
    for (const id of ids) {
      const f = this.faces.get(id);
      if (!f) continue;
      if (f.personId && f.personId !== personId) f.rejected.add(f.personId);
      f.rejected.delete(personId);
      this.#leave(f);
      f.personId = personId;
      f.status = STATUS.confirmed;
      changed.push(f);
    }
    changed.push(...this.#spread(personId, changed));
    this.#save(changed);
    return changed;
  }

  /** "Not this person": the face goes back to the unknown faces (and is never suggested as them again). */
  reject(ids) {
    this.load();
    const changed = [];
    for (const id of ids) {
      const f = this.faces.get(id);
      if (!f || !f.personId) continue;
      f.rejected.add(f.personId);
      f.personId = null;
      f.status = STATUS.unknown;
      this.#group(f);
      changed.push(f);
    }
    this.#save(changed);
    return changed;
  }

  /** Faces that do not matter (strangers in the background): out of the groups, never suggested. */
  ignore(ids) {
    this.load();
    const changed = [];
    for (const id of ids) {
      const f = this.faces.get(id);
      if (!f) continue;
      this.#leave(f);
      f.personId = null;
      f.status = STATUS.ignored;
      changed.push(f);
    }
    this.#save(changed);
    return changed;
  }

  /** Back from "ignored" to the unknown faces. */
  unignore(ids) {
    this.load();
    const changed = [];
    for (const id of ids) {
      const f = this.faces.get(id);
      if (!f || f.status !== STATUS.ignored) continue;
      f.status = STATUS.unknown;
      this.#group(f);
      changed.push(f);
    }
    this.#save(changed);
    return changed;
  }

  /** A person's label was deleted: their faces are unknown again. */
  forgetPerson(personId) {
    this.load();
    const changed = [];
    for (const f of this.faces.values()) {
      if (f.personId !== personId) continue;
      f.personId = null;
      f.status = STATUS.unknown;
      this.#group(f);
      changed.push(f);
    }
    this.#save(changed);
    return changed;
  }

  /** Faces nobody knows yet that look like the person's new references: suggested as them. */
  #spread(personId, newRefs) {
    if (!newRefs.length) return [];
    const refs = this.#refs();
    const changed = [];
    for (const f of this.faces.values()) {
      if (f.status !== STATUS.unknown) continue;
      // cheap first look: only faces close to one of the new references go through the full check
      let near = false;
      for (const r of newRefs) if (dist(f.v, r.v) <= this.SUGGEST) { near = true; break; }
      if (!near) continue;
      const p = this.#suggest(f, refs);
      if (p === personId) {
        this.#leave(f);
        f.personId = p;
        f.status = STATUS.suggested;
        changed.push(f);
      }
    }
    return changed;
  }

  #save(list) {
    this.db.updateFaces(list.map((f) => ({ id: f.id, personId: f.personId, status: f.status, cluster: f.cluster, rejected: [...f.rejected].join(',') })));
  }

  // ------------------------------------------------------------------ for the window
  /** People with faces in a collection, and the groups waiting for a name (biggest first). */
  overview(rootId) {
    this.load();
    const people = new Map();
    const groups = new Map();
    let ignored = 0;
    const ref = (f) => ({ id: f.id, mediaId: f.mediaId, species: f.species || undefined });
    for (const f of this.faces.values()) {
      if (f.rootId !== rootId) continue;
      if (f.status === STATUS.ignored) { ignored++; continue; }
      if (f.personId) {
        let p = people.get(f.personId);
        if (!p) people.set(f.personId, (p = { personId: f.personId, faces: 0, suggested: [], confirmed: [] }));
        p.faces++;
        if (f.status === STATUS.suggested) p.suggested.push(ref(f));
        else if (p.confirmed.length < 6) p.confirmed.push(ref(f));
        continue;
      }
      if (!f.cluster) continue;
      let g = groups.get(f.cluster);
      if (!g) groups.set(f.cluster, (g = { cluster: f.cluster, faces: [] }));
      g.faces.push(ref(f));
    }
    // the window keeps the faces of the photos it shows (personal / professional) and counts from there
    return {
      people: [...people.values()],
      groups: [...groups.values()].sort((a, b) => b.faces.length - a.faces.length),
      ignored,
    };
  }

  /** The faces of a person in a collection: suggestions first. */
  ofPerson(personId, rootId) {
    this.load();
    return [...this.faces.values()]
      .filter((f) => f.personId === personId && f.rootId === rootId)
      .sort((a, b) => a.status - b.status || a.mediaId - b.mediaId)
      .map((f) => ({ id: f.id, mediaId: f.mediaId, status: f.status }));
  }

  ignoredFaces(rootId) {
    this.load();
    return [...this.faces.values()].filter((f) => f.status === STATUS.ignored && f.rootId === rootId).map((f) => ({ id: f.id, mediaId: f.mediaId, status: f.status }));
  }

  groupFaces(cluster) {
    this.load();
    return [...(this.groups.get(cluster)?.members || [])];
  }

  get(id) { this.load(); return this.faces.get(id) || null; }
}

module.exports = { FaceIndex, STATUS };
