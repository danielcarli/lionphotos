/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The structure of a HEIF/HEIC file, read without decoding anything: which item is the photo, whether it
// is one HEVC picture or a grid of HEVC tiles (cameras and phones write grids of 512 × 512 tiles), the
// HEVC configuration of the tiles, the rotation, mirroring and crop to apply, and the thumbnail item.
// With this, the tiles can be decoded by WebCodecs — the computer's own HEVC decoder (usually the
// graphics card), which reads the 10-bit HDR HIF files of Canon and Sony cameras.
// Pure JavaScript: runs in the thumbnail workers (and in Node, for tests).

function readBoxes(buf, start, end) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const out = [];
  let o = start;
  while (o + 8 <= end) {
    let size = dv.getUint32(o);
    const type = String.fromCharCode(buf[o + 4], buf[o + 5], buf[o + 6], buf[o + 7]);
    let header = 8;
    if (size === 1) { size = Number(dv.getBigUint64(o + 8)); header = 16; } else if (size === 0) size = end - o;
    if (size < header || o + size > end) break;
    out.push({ type, start: o + header, end: o + size });
    o += size;
  }
  return out;
}

function uint(dv, o, n) {
  if (n === 1) return dv.getUint8(o);
  if (n === 2) return dv.getUint16(o);
  if (n === 4) return dv.getUint32(o);
  if (n === 8) return Number(dv.getBigUint64(o));
  return 0;
}

const hex = (v) => v.toString(16);

/** The WebCodecs codec string of an HEVC decoder configuration record (hvcC payload). */
export function hevcCodec(hvcC) {
  const space = hvcC[1] >> 6;
  const tier = (hvcC[1] >> 5) & 1;
  const profile = hvcC[1] & 0x1f;
  let compat = ((hvcC[2] << 24) | (hvcC[3] << 16) | (hvcC[4] << 8) | hvcC[5]) >>> 0;
  let reversed = 0;
  for (let i = 0; i < 32; i++) { reversed = ((reversed << 1) | (compat & 1)) >>> 0; compat >>>= 1; }
  const constraints = Array.from(hvcC.subarray(6, 12));
  while (constraints.length && constraints[constraints.length - 1] === 0) constraints.pop();
  return `hvc1.${['', 'A', 'B', 'C'][space]}${profile}.${hex(reversed)}.${tier ? 'H' : 'L'}${hvcC[12]}${constraints.map((c) => '.' + hex(c).toUpperCase()).join('')}`;
}

/**
 * @returns {{ primary: object|null, thumb: object|null }} each image: { type: 'hvc1'|'grid', width, height,
 *   tiles: [{ data }], rows, cols, tileWidth, tileHeight, hvcC, codec, transforms: [{ rotate }|{ mirror }|{ crop }] }
 */
export function parseHeif(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const meta = readBoxes(buf, 0, buf.length).find((b) => b.type === 'meta');
  if (!meta) return { primary: null, thumb: null };
  const kids = readBoxes(buf, meta.start + 4, meta.end);
  const box = (t) => kids.find((b) => b.type === t);

  // primary item
  const pitm = box('pitm');
  const primaryId = pitm ? (buf[pitm.start] === 0 ? dv.getUint16(pitm.start + 4) : dv.getUint32(pitm.start + 4)) : null;

  // item types
  const types = new Map();
  const iinf = box('iinf');
  if (iinf) {
    const v = buf[iinf.start];
    for (const e of readBoxes(buf, iinf.start + 4 + (v === 0 ? 2 : 4), iinf.end)) {
      if (e.type !== 'infe') continue;
      const ev = buf[e.start];
      if (ev < 2) continue;
      const id = ev === 2 ? dv.getUint16(e.start + 4) : dv.getUint32(e.start + 4);
      const at = e.start + 4 + (ev === 2 ? 2 : 4) + 2;
      types.set(id, String.fromCharCode(buf[at], buf[at + 1], buf[at + 2], buf[at + 3]));
    }
  }

  // item data locations (file offsets, or inside 'idat')
  const idat = box('idat');
  const locations = new Map();
  const iloc = box('iloc');
  if (iloc) {
    const v = buf[iloc.start];
    let o = iloc.start + 4;
    const offsetSize = buf[o] >> 4;
    const lengthSize = buf[o] & 15;
    const baseSize = buf[o + 1] >> 4;
    const indexSize = v === 1 || v === 2 ? buf[o + 1] & 15 : 0;
    o += 2;
    const count = v < 2 ? dv.getUint16(o) : dv.getUint32(o);
    o += v < 2 ? 2 : 4;
    for (let i = 0; i < count && o < iloc.end; i++) {
      const id = v < 2 ? dv.getUint16(o) : dv.getUint32(o);
      o += v < 2 ? 2 : 4;
      let method = 0;
      if (v === 1 || v === 2) { method = dv.getUint16(o) & 15; o += 2; }
      o += 2;
      const base = uint(dv, o, baseSize);
      o += baseSize;
      const n = dv.getUint16(o);
      o += 2;
      const extents = [];
      for (let k = 0; k < n; k++) {
        o += indexSize;
        const off = uint(dv, o, offsetSize); o += offsetSize;
        const len = uint(dv, o, lengthSize); o += lengthSize;
        extents.push([base + off, len]);
      }
      locations.set(id, { method, extents });
    }
  }
  const dataOf = (id) => {
    const loc = locations.get(id);
    if (!loc) return null;
    const origin = loc.method === 1 && idat ? idat.start : 0;
    const total = loc.extents.reduce((s, [, l]) => s + l, 0);
    const out = new Uint8Array(total);
    let w = 0;
    for (const [off, len] of loc.extents) { out.set(buf.subarray(origin + off, origin + off + len), w); w += len; }
    return out;
  };

  // references: dimg (grid → tiles), thmb (thumbnail → image)
  const refs = { dimg: new Map(), thmb: new Map() };
  const iref = box('iref');
  if (iref) {
    const wide = buf[iref.start] !== 0;
    for (const r of readBoxes(buf, iref.start + 4, iref.end)) {
      let o = r.start;
      const size = wide ? 4 : 2;
      const from = uint(dv, o, size); o += size;
      const n = dv.getUint16(o); o += 2;
      const to = [];
      for (let k = 0; k < n; k++) { to.push(uint(dv, o, size)); o += size; }
      if (refs[r.type]) refs[r.type].set(from, to);
    }
  }

  // properties, and which items they belong to (in order: transformations apply in that order)
  const props = [];
  const assoc = new Map();
  const iprp = box('iprp');
  if (iprp) {
    const parts = readBoxes(buf, iprp.start, iprp.end);
    const ipco = parts.find((b) => b.type === 'ipco');
    if (ipco) for (const p of readBoxes(buf, ipco.start, ipco.end)) props.push(p);
    for (const ipma of parts.filter((b) => b.type === 'ipma')) {
      const v = buf[ipma.start];
      const flags = buf[ipma.start + 3];
      let o = ipma.start + 4;
      const n = dv.getUint32(o); o += 4;
      for (let i = 0; i < n; i++) {
        const id = v < 1 ? dv.getUint16(o) : dv.getUint32(o);
        o += v < 1 ? 2 : 4;
        const m = buf[o++];
        const list = assoc.get(id) || [];
        for (let k = 0; k < m; k++) {
          const index = flags & 1 ? dv.getUint16(o) & 0x7fff : buf[o] & 0x7f;
          o += flags & 1 ? 2 : 1;
          if (index > 0 && props[index - 1]) list.push(props[index - 1]);
        }
        assoc.set(id, list);
      }
    }
  }
  const propsOf = (id) => assoc.get(id) || [];
  const prop = (id, type) => propsOf(id).find((p) => p.type === type) || null;
  const size = (id) => {
    const p = prop(id, 'ispe');
    return p ? { width: dv.getUint32(p.start + 4), height: dv.getUint32(p.start + 8) } : null;
  };
  const transforms = (id) => propsOf(id).flatMap((p) => {
    if (p.type === 'irot') return [{ rotate: (buf[p.start] & 3) * 90 }]; // anticlockwise
    if (p.type === 'imir') return [{ mirror: buf[p.start] & 1 ? 'vertical' : 'horizontal' }];
    if (p.type === 'clap') {
      const r = (k) => { const n = dv.getInt32(p.start + k * 8); const d = dv.getInt32(p.start + k * 8 + 4) || 1; return n / d; };
      return [{ crop: { width: r(0), height: r(1), horizOff: r(2), vertOff: r(3) } }];
    }
    return [];
  });
  const hvcCOf = (id) => {
    const p = prop(id, 'hvcC');
    return p ? buf.slice(p.start, p.end) : null;
  };

  const image = (id) => {
    const type = types.get(id);
    const own = size(id);
    if (type === 'hvc1') {
      const hvcC = hvcCOf(id);
      const data = dataOf(id);
      if (!hvcC || !data || !own) return null;
      return { type, width: own.width, height: own.height, rows: 1, cols: 1, tileWidth: own.width, tileHeight: own.height, tiles: [{ data }], hvcC, codec: hevcCodec(hvcC), transforms: transforms(id) };
    }
    if (type === 'grid') {
      const g = dataOf(id);
      const tiles = refs.dimg.get(id) || [];
      if (!g || g.length < 8 || !tiles.length) return null;
      const gv = new DataView(g.buffer, g.byteOffset, g.byteLength);
      const big = g[1] & 1;
      const rows = g[2] + 1;
      const cols = g[3] + 1;
      const width = big ? gv.getUint32(4) : gv.getUint16(4);
      const height = big ? gv.getUint32(8) : gv.getUint16(6);
      const first = tiles[0];
      const hvcC = hvcCOf(first);
      const tileSize = size(first);
      if (!hvcC || !tileSize || tiles.length < rows * cols) return null;
      return {
        type, width, height, rows, cols, tileWidth: tileSize.width, tileHeight: tileSize.height,
        tiles: tiles.slice(0, rows * cols).map((t) => ({ data: dataOf(t) })), hvcC, codec: hevcCodec(hvcC), transforms: transforms(id),
      };
    }
    return null;
  };

  const primary = primaryId !== null ? image(primaryId) : null;
  let thumb = null;
  for (const [from, to] of refs.thmb) if (to.includes(primaryId)) { thumb = image(from); if (thumb) break; }
  return { primary, thumb };
}

// ---------------------------------------------------------------- a small HEIF holding one picture
const ascii = (t) => Uint8Array.from(t, (c) => c.charCodeAt(0));
function cat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function bx(type, ...parts) {
  const body = cat(parts);
  const head = new Uint8Array(8);
  new DataView(head.buffer).setUint32(0, 8 + body.length);
  head.set(ascii(type), 4);
  return cat([head, body]);
}
const full = (type, version, flags, ...parts) => bx(type, Uint8Array.of(version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255), ...parts);
const u16 = (v) => Uint8Array.of(v >> 8, v & 255);
const u32 = (v) => Uint8Array.of(v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255);

/** The size the HEVC stream really decodes to (its SPS, conformance window applied), or null. */
export function hevcDecodedSize(hvcC) {
  try {
    let o = 23;
    let sps = null;
    for (let a = 0; a < hvcC[22] && o < hvcC.length; a++) {
      const type = hvcC[o] & 0x3f;
      const n = (hvcC[o + 1] << 8) | hvcC[o + 2];
      o += 3;
      for (let k = 0; k < n; k++) {
        const len = (hvcC[o] << 8) | hvcC[o + 1];
        if (type === 33 && !sps) sps = hvcC.subarray(o + 2, o + 2 + len);
        o += 2 + len;
      }
    }
    if (!sps) return null;
    const b = [];
    for (let i = 0; i < sps.length; i++) { if (i >= 2 && sps[i] === 3 && sps[i - 1] === 0 && sps[i - 2] === 0) continue; b.push(sps[i]); }
    let bit = 16; // after the NAL header
    const u = (n) => { let v = 0; for (let i = 0; i < n; i++, bit++) v = (v << 1) | ((b[bit >> 3] >> (7 - (bit & 7))) & 1); return v >>> 0; };
    const ue = () => { let z = 0; while (!u(1) && z < 32) z++; return (2 ** z - 1) + u(z); };
    u(4); // vps id
    const subLayers = u(3);
    u(1);
    bit += 96; // general profile_tier_level: 2+1+5+32+48 bits, then the level (8)
    if (subLayers > 0) return null; // not met in still images
    ue(); // sps id
    const chroma = ue();
    if (chroma === 3) u(1);
    const width = ue();
    const height = ue();
    if (u(1)) {
      const sw = chroma === 1 || chroma === 2 ? 2 : 1;
      const sh = chroma === 1 ? 2 : 1;
      const l = ue(), r = ue(), t = ue(), bt = ue();
      return { width: width - (l + r) * sw, height: height - (t + bt) * sh };
    }
    return { width, height };
  } catch {
    return null;
  }
}

/**
 * A minimal HEIF file with a single HEVC picture (e.g. the thumbnail item of a photo), with its rotation
 * and mirroring, so the decoder reads 320 pixels instead of 12 to 45 megapixels.
 */
export function singleImageHeif(img) {
  if (!img || img.type !== 'hvc1' || img.tiles.length !== 1) return null;
  const data = img.tiles[0].data;
  // the size the stream decodes to (some cameras signal a slightly different one for their thumbnail)
  const real = hevcDecodedSize(img.hvcC) || img;
  const props = [bx('hvcC', img.hvcC), full('ispe', 0, 0, u32(real.width), u32(real.height))];
  // a picture padded beyond its signalled size (Canon thumbnails: 320 × 214 inside 320 × 320) is cropped
  // back to it, from the top-left corner, before any rotation
  if (real.width > img.width || real.height > img.height) {
    const i32 = (v) => { const b = new Uint8Array(4); new DataView(b.buffer).setInt32(0, v); return b; };
    const cw = Math.min(img.width, real.width);
    const ch = Math.min(img.height, real.height);
    props.push(bx('clap', i32(cw), i32(1), i32(ch), i32(1), i32(cw - real.width), i32(2), i32(ch - real.height), i32(2)));
  }
  for (const t of img.transforms) {
    if (t.rotate !== undefined) props.push(bx('irot', Uint8Array.of((t.rotate / 90) & 3)));
    else if (t.mirror) props.push(bx('imir', Uint8Array.of(t.mirror === 'vertical' ? 1 : 0)));
  }
  const ipma = full('ipma', 0, 0, u32(1), u16(1), Uint8Array.of(props.length), Uint8Array.from(props.map((_, i) => (i === 0 ? 0x80 : 0) | (i + 1))));
  const meta = (offset) => full('meta', 0, 0,
    full('hdlr', 0, 0, new Uint8Array(4), ascii('pict'), new Uint8Array(12), new Uint8Array(1)),
    full('pitm', 0, 0, u16(1)),
    full('iinf', 0, 0, u16(1), full('infe', 2, 0, u16(1), u16(0), ascii('hvc1'), new Uint8Array(1))),
    bx('iprp', bx('ipco', ...props), ipma),
    full('iloc', 0, 0, Uint8Array.of(0x44, 0x00), u16(1), u16(1), u16(0), u16(1), u32(offset), u32(data.length)));
  const ftyp = bx('ftyp', ascii('heic'), u32(0), ascii('mif1heic'));
  const offset = ftyp.length + meta(0).length + 8;
  return cat([ftyp, meta(offset), bx('mdat', data)]);
}
