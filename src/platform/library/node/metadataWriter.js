/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Writing a photo's metadata (author, caption, audio description, headline, place, keywords, instructions)
// into files, the way photographers' tools do — only when the person asks, with the typed code:
//   - a JPEG gets it inside: an XMP packet (APP1) and IPTC-IIM (APP13). The picture itself (everything from
//     the start of scan on) is copied byte for byte, never re-encoded, and checked to be identical;
//   - any other file (raw files above all) is never touched: a sidecar .xmp next to it gets the data, as
//     Lightroom and Photo Mechanic do.
// What other programs wrote is kept: only the properties written here are replaced in the XMP, only their
// datasets in the IPTC, and the other Photoshop resources stay.
'use strict';
const crypto = require('crypto');

/** The fields, their XMP property and IPTC dataset (record 2). */
const FIELDS = [
  { key: 'author', xmp: 'dc:creator', kind: 'seq', iim: 80 },
  { key: 'authorTitle', xmp: 'photoshop:AuthorsPosition', kind: 'text', iim: 85 },
  { key: 'headline', xmp: 'photoshop:Headline', kind: 'text', iim: 105 },
  { key: 'caption', xmp: 'dc:description', kind: 'alt', iim: 120 },
  { key: 'alt', xmp: 'Iptc4xmpCore:AltTextAccessibility', kind: 'alt' },
  { key: 'sublocation', xmp: 'Iptc4xmpCore:Location', kind: 'text', iim: 92 },
  { key: 'city', xmp: 'photoshop:City', kind: 'text', iim: 90 },
  { key: 'state', xmp: 'photoshop:State', kind: 'text', iim: 95 },
  { key: 'country', xmp: 'photoshop:Country', kind: 'text', iim: 101 },
  { key: 'keywords', xmp: 'dc:subject', kind: 'bag', iim: 25 },
  { key: 'instructions', xmp: 'photoshop:Instructions', kind: 'text', iim: 40 },
  // the person's mark as the rating Lightroom and Bridge show: great 5 stars, OK 3, to delete -1 (rejected)
  { key: 'rating', xmp: 'xmp:Rating', kind: 'text' },
];
const NS = {
  dc: 'http://purl.org/dc/elements/1.1/',
  photoshop: 'http://ns.adobe.com/photoshop/1.0/',
  Iptc4xmpCore: 'http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/',
  xmp: 'http://ns.adobe.com/xap/1.0/',
};
const XMP_HEAD = 'http://ns.adobe.com/xap/1.0/\0';
const XMP_EXT_HEAD = 'http://ns.adobe.com/xmp/extension/\0';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function propXml(f, v) {
  if (f.kind === 'text') return `<${f.xmp}>${esc(v)}</${f.xmp}>`;
  if (f.kind === 'alt') return `<${f.xmp}><rdf:Alt><rdf:li xml:lang="x-default">${esc(v)}</rdf:li></rdf:Alt></${f.xmp}>`;
  const items = (Array.isArray(v) ? v : [v]).map((x) => `<rdf:li>${esc(x)}</rdf:li>`).join('');
  return `<${f.xmp}><rdf:${f.kind === 'seq' ? 'Seq' : 'Bag'}>${items}</rdf:${f.kind === 'seq' ? 'Seq' : 'Bag'}></${f.xmp}>`;
}

/**
 * An XMP packet with these fields: the existing packet (if any) with only these properties replaced.
 * A field set to '' or [] is removed; a field left out (undefined) stays as it is.
 * @param {string|null} existing a whole XMP packet, or null
 * @param {object} fields
 */
function mergeXmp(existing, fields) {
  const touched = FIELDS.filter((f) => fields[f.key] !== undefined);
  const props = touched.filter((f) => !isEmpty(fields[f.key])).map((f) => propXml(f, fields[f.key])).join('\n   ');
  let x = existing && existing.includes('<x:xmpmeta') && existing.includes('<rdf:Description') ? existing : null;
  if (!x) {
    const ns = Object.entries(NS).map(([p, u]) => ` xmlns:${p}="${u}"`).join('');
    return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="LionPhotos">\n <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n  <rdf:Description rdf:about=""${ns}>\n   ${props}\n  </rdf:Description>\n </rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>`;
  }
  // the properties written here leave the packet, in either form (attribute or element)
  for (const f of touched) {
    const n = reEsc(f.xmp);
    x = x.replace(new RegExp(`\\s${n}="[^"]*"`, 'g'), '');
    x = x.replace(new RegExp(`<${n}(\\s[^>]*)?/>`, 'g'), '');
    x = x.replace(new RegExp(`<${n}(\\s[^>]*)?>[\\s\\S]*?</${n}>`, 'g'), '');
  }
  if (!props) return x;
  // ...and come back inside the first rdf:Description, with their namespaces declared
  // (a namespace counts when declared on this element or on its ancestors: rdf:RDF, x:xmpmeta)
  const ancestors = (x.match(/<x:xmpmeta\b[^>]*>/) || [''])[0] + (x.match(/<rdf:RDF\b[^>]*>/) || [''])[0];
  return x.replace(/<rdf:Description\b([^>]*?)(\/?)>/, (m, attrs, selfClosing) => {
    let a = attrs;
    for (const [p, u] of Object.entries(NS)) if (!new RegExp(`xmlns:${p}=`).test(a) && !new RegExp(`xmlns:${p}=`).test(ancestors)) a += ` xmlns:${p}="${u}"`;
    return selfClosing ? `<rdf:Description${a}>\n   ${props}\n  </rdf:Description>` : `<rdf:Description${a}>\n   ${props}`;
  });
}

// ------------------------------------------------------------------ IPTC-IIM
function iimRecords(buf) {
  const out = [];
  for (let i = 0; i + 5 <= buf.length && buf[i] === 0x1c;) {
    const len = buf.readUInt16BE(i + 3);
    if (len & 0x8000) break;
    out.push({ rec: buf[i + 1], ds: buf[i + 2], data: buf.subarray(i + 5, i + 5 + len) });
    i += 5 + len;
  }
  return out;
}
function iimRecord(rec, ds, data) {
  const v = data.length > 32000 ? data.subarray(0, 32000) : data;
  const h = Buffer.from([0x1c, rec, ds, 0, 0]);
  h.writeUInt16BE(v.length, 3);
  return Buffer.concat([h, v]);
}
/** The IIM block with these fields replaced (UTF-8, declared in 1:90); the other datasets stay. */
function mergeIim(existing, fields) {
  const touched = new Set(FIELDS.filter((f) => f.iim && fields[f.key] !== undefined).map((f) => f.iim));
  const old = existing ? iimRecords(existing) : [];
  const keep1 = old.filter((r) => r.rec === 1 && r.ds !== 90);
  const keep2 = old.filter((r) => r.rec === 2 && r.ds !== 0 && !touched.has(r.ds));
  const others = old.filter((r) => r.rec !== 1 && r.rec !== 2);
  const parts = [...keep1.map((r) => iimRecord(1, r.ds, r.data)), iimRecord(1, 90, Buffer.from('\x1b%G', 'latin1')), iimRecord(2, 0, Buffer.from([0, 4]))];
  for (const r of keep2) parts.push(iimRecord(2, r.ds, r.data));
  for (const f of FIELDS) {
    if (!f.iim || isEmpty(fields[f.key])) continue;
    for (const v of [].concat(fields[f.key])) parts.push(iimRecord(2, f.iim, Buffer.from(String(v), 'utf8')));
  }
  for (const r of others) parts.push(iimRecord(r.rec, r.ds, r.data));
  return Buffer.concat(parts);
}

/** Photoshop image resources (APP13 "Photoshop 3.0"): [{ id, name, data }]. */
function psResources(seg) {
  const out = [];
  let o = 14;
  while (o + 12 <= seg.length && seg.toString('latin1', o, o + 4) === '8BIM') {
    const id = seg.readUInt16BE(o + 4);
    const nameLen = seg[o + 6];
    const name = seg.subarray(o + 7, o + 7 + nameLen);
    let p = o + 7 + nameLen;
    if ((nameLen + 1) % 2) p++;
    if (p + 4 > seg.length) break;
    const size = seg.readUInt32BE(p);
    out.push({ id, name, data: seg.subarray(p + 4, Math.min(seg.length, p + 4 + size)) });
    o = p + 4 + size + (size % 2);
  }
  return out;
}
function psSegment(resources) {
  const parts = [Buffer.from('Photoshop 3.0\0', 'latin1')];
  for (const r of resources) {
    const name = Buffer.concat([Buffer.from([r.name.length]), r.name, (r.name.length + 1) % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
    const size = Buffer.alloc(4); size.writeUInt32BE(r.data.length);
    parts.push(Buffer.from('8BIM', 'latin1'), Buffer.from([r.id >> 8, r.id & 0xff]), name, size, r.data, r.data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0));
  }
  return Buffer.concat(parts);
}

// ------------------------------------------------------------------ JPEG
function segmentBytes(marker, body) {
  if (body.length + 2 > 0xffff) throw new MetadataTooLarge();
  const h = Buffer.from([0xff, marker, 0, 0]);
  h.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([h, body]);
}
class MetadataTooLarge extends Error { constructor() { super('metadata too large for a JPEG segment'); this.code = 'tooLarge'; } }
class NotJpeg extends Error { constructor() { super('not a JPEG'); this.code = 'notJpeg'; } }

/** The segments before the picture data: [{ marker, start, end, body }], and where the scan starts. */
function jpegSegments(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new NotJpeg();
  const segs = [];
  let o = 2;
  while (o + 4 <= buf.length) {
    if (buf[o] !== 0xff) throw new NotJpeg();
    const marker = buf[o + 1];
    if (marker === 0xff) { o++; continue; } // fill byte
    if (marker === 0xda) return { segs, sos: o };
    if (marker === 0xd9) break;
    const len = buf.readUInt16BE(o + 2);
    segs.push({ marker, start: o, end: o + 2 + len, body: buf.subarray(o + 4, o + 2 + len) });
    o += 2 + len;
  }
  throw new NotJpeg();
}

/**
 * The JPEG with the fields written in its XMP and IPTC; the picture data is the same bytes.
 * @returns {Buffer}
 */
function jpegWithMetadata(buf, fields) {
  const { segs, sos } = jpegSegments(buf);
  const isXmp = (s) => s.marker === 0xe1 && s.body.toString('latin1', 0, XMP_HEAD.length) === XMP_HEAD;
  const isXmpExt = (s) => s.marker === 0xe1 && s.body.toString('latin1', 0, XMP_EXT_HEAD.length) === XMP_EXT_HEAD;
  const isPs = (s) => s.marker === 0xed && s.body.toString('latin1', 0, 14) === 'Photoshop 3.0\0';
  const oldXmp = segs.find(isXmp);
  let packet = mergeXmp(oldXmp ? oldXmp.body.subarray(XMP_HEAD.length).toString('utf8') : null, fields);
  // the extended XMP (very large packets) is dropped with the old packet: its reference goes too
  packet = packet.replace(/\s+xmpNote:HasExtendedXMP="[^"]*"/g, '');
  const xmpSeg = segmentBytes(0xe1, Buffer.concat([Buffer.from(XMP_HEAD, 'latin1'), Buffer.from(packet, 'utf8')]));
  const oldPs = segs.find(isPs);
  const res = oldPs ? psResources(oldPs.body) : [];
  const iimOld = res.find((r) => r.id === 0x0404);
  const iim = mergeIim(iimOld ? iimOld.data : null, fields);
  const digest = crypto.createHash('md5').update(iim).digest();
  const resources = res.filter((r) => r.id !== 0x0404 && r.id !== 0x0425);
  resources.push({ id: 0x0404, name: Buffer.alloc(0), data: iim }, { id: 0x0425, name: Buffer.alloc(0), data: digest });
  const psSeg = segmentBytes(0xed, psSegment(resources));
  // order: APP0/EXIF first as they were, then the XMP and the IPTC, then the rest
  const keep = segs.filter((s) => !isXmp(s) && !isXmpExt(s) && !isPs(s));
  let k = 0;
  while (k < keep.length && (keep[k].marker === 0xe0 || keep[k].marker === 0xe1)) k++;
  const lead = keep.slice(0, k).map((s) => buf.subarray(s.start, s.end));
  const tail = keep.slice(k).map((s) => buf.subarray(s.start, s.end));
  const out = Buffer.concat([buf.subarray(0, 2), ...lead, xmpSeg, psSeg, ...tail, buf.subarray(sos)]);
  // the picture must be the very same bytes
  if (!out.subarray(out.length - (buf.length - sos)).equals(buf.subarray(sos))) throw new Error('picture data changed');
  return out;
}

module.exports = { FIELDS, mergeXmp, mergeIim, jpegWithMetadata, jpegSegments, MetadataTooLarge, NotJpeg };
