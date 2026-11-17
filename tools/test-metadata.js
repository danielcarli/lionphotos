/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Author, caption and place written by photographers' tools: IPTC (APP13) and XMP in a JPEG, and a sidecar
// XMP next to a raw file. Run: node tools/test-metadata.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readMetadata, searchTags, META_VERSION, iptcMeta } = require('../src/platform/library/node/metadata');
const { jpegWithMetadata, jpegSegments, mergeXmp } = require('../src/platform/library/node/metadataWriter');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

const seg = (marker, body) => { const h = Buffer.alloc(4); h[0] = 0xff; h[1] = marker; h.writeUInt16BE(body.length + 2, 2); return Buffer.concat([h, body]); };
const iim = (rec, ds, text) => { const v = Buffer.from(text, 'utf8'); const h = Buffer.from([0x1c, rec, ds, 0, 0]); h.writeUInt16BE(v.length, 3); return Buffer.concat([h, v]); };
function app13(records) {
  const data = Buffer.concat([iim(1, 90, '\x1b%G'), ...records]);
  const res = Buffer.alloc(12); res.write('8BIM', 0, 'latin1'); res.writeUInt16BE(0x0404, 4); res[6] = 0; res[7] = 0; res.writeUInt32BE(data.length, 8);
  return Buffer.concat([Buffer.from('Photoshop 3.0\0', 'latin1'), res, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
}
const xmp = (inner) => `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" ${inner}</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-meta-'));

  // a JPEG with IPTC only
  const jpg1 = path.join(tmp, 'iptc.jpg');
  fs.writeFileSync(jpg1, Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xed, app13([iim(2, 80, 'Ana Souza'), iim(2, 120, 'Formandos na colação de grau.'), iim(2, 90, 'Santa Maria'), iim(2, 92, 'Centro de Convenções'), iim(2, 95, 'RS'), iim(2, 101, 'Brasil'), iim(2, 25, 'formatura'), iim(2, 25, 'UFSM')])), Buffer.from([0xff, 0xd9])]));
  const m1 = await readMetadata(jpg1, 'jpg', 1, 0);
  check(m1.author === 'Ana Souza' && m1.description === 'Formandos na colação de grau.' && m1.city === 'Santa Maria' && m1.sublocation === 'Centro de Convenções' && m1.state === 'RS' && m1.country === 'Brasil',
    'IPTC: author (By-line), caption, city, sublocation, state, country', JSON.stringify({ a: m1.author, c: m1.city }));
  check(m1.keywords?.length === 2 && searchTags(m1).includes('centro de convenções') && m1.v === META_VERSION, 'IPTC keywords; the place goes to the search words');

  // a JPEG with XMP and IPTC: XMP wins, IPTC fills the rest
  const jpg2 = path.join(tmp, 'xmp.jpg');
  const packet = xmp(`photoshop:City="Santa Maria" photoshop:Headline="Colação de grau"><dc:creator><rdf:Seq><rdf:li>Bruno Lima</rdf:li></rdf:Seq></dc:creator><dc:description><rdf:Alt><rdf:li xml:lang="en">Graduates</rdf:li><rdf:li xml:lang="x-default">Formandos &amp; famílias</rdf:li></rdf:Alt></dc:description><Iptc4xmpCore:AltTextAccessibility><rdf:Alt><rdf:li xml:lang="x-default">Jovem de beca segura um diploma.</rdf:li></rdf:Alt></Iptc4xmpCore:AltTextAccessibility><Iptc4xmpExt:PersonInImage><rdf:Bag><rdf:li>Júlia Ramos</rdf:li></rdf:Bag></Iptc4xmpExt:PersonInImage>`);
  fs.writeFileSync(jpg2, Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe1, Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'), Buffer.from(packet, 'utf8')])), seg(0xed, app13([iim(2, 80, 'Ana Souza'), iim(2, 92, 'Centro de Convenções')])), Buffer.from([0xff, 0xd9])]));
  const m2 = await readMetadata(jpg2, 'jpg', 1, 0);
  check(m2.author === 'Bruno Lima' && m2.description === 'Formandos & famílias' && m2.headline === 'Colação de grau' && m2.city === 'Santa Maria' && m2.sublocation === 'Centro de Convenções',
    'XMP first (default language, entities), IPTC fills what XMP lacks', JSON.stringify({ a: m2.author, d: m2.description, s: m2.sublocation }));
  check(m2.altText === 'Jovem de beca segura um diploma.' && m2.people?.[0] === 'Júlia Ramos', 'XMP accessibility alt text and people shown');

  // a raw file with a sidecar XMP (Lightroom): the sidecar wins over what is inside
  const raw = path.join(tmp, 'IMG_1.CR2');
  fs.writeFileSync(raw, Buffer.from('II*\0\x08\0\0\0\0\0', 'latin1'));
  fs.writeFileSync(path.join(tmp, 'IMG_1.xmp'), xmp('photoshop:City="Frederico Westphalen"><dc:creator><rdf:Seq><rdf:li>Diego Alves</rdf:li></rdf:Seq></dc:creator>'));
  const m3 = await readMetadata(raw, 'cr2', 1, 0);
  check(m3.author === 'Diego Alves' && m3.city === 'Frederico Westphalen', 'a raw file’s sidecar XMP: author and city', JSON.stringify({ a: m3.author, c: m3.city }));


  // writing: into a JPEG that already has XMP (with a rating from another program) and IPTC (with a copyright)
  const scan = Buffer.from([0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0, 0x12, 0x34, 0x56, 0xff, 0xd9]);
  const exifish = seg(0xe1, Buffer.from('Exif\0\0MM\0*\0\0\0\x08\0\0', 'latin1'));
  const packet0 = xmp('xmp:Rating="4" xmlns:xmp="http://ns.adobe.com/xap/1.0/" photoshop:City="Santa Maria" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"><dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/"><rdf:Seq><rdf:li>Bruno Lima</rdf:li></rdf:Seq></dc:creator>');
  const withOthers = Buffer.concat([Buffer.from([0xff, 0xd8]), exifish, seg(0xe1, Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'), Buffer.from(packet0, 'utf8')])),
    seg(0xed, app13([iim(2, 80, 'Ana Souza'), iim(2, 116, '© UFSM')])), scan]);
  const fields = { author: 'Carla Mendes', caption: 'Nova legenda.', alt: 'Nova audiodescrição.', headline: 'Manchete', authorTitle: 'Fotógrafa', sublocation: 'Planetário', city: 'Santa Maria', state: 'RS', country: 'Brasil', keywords: ['astronomia', 'escolas'], instructions: 'Embargo até 13/11' };
  const out = jpegWithMetadata(withOthers, fields);
  const outFile = path.join(tmp, 'written.jpg');
  fs.writeFileSync(outFile, out);
  const m4 = await readMetadata(outFile, 'jpg', 1, out.length);
  check(m4.author === 'Carla Mendes' && m4.description === 'Nova legenda.' && m4.altText === 'Nova audiodescrição.' && m4.headline === 'Manchete' && m4.authorTitle === 'Fotógrafa',
    'written into the JPEG and read back: author, caption, audio description, headline, role', JSON.stringify({ a: m4.author, d: m4.description }));
  check(m4.sublocation === 'Planetário' && m4.city === 'Santa Maria' && m4.state === 'RS' && m4.country === 'Brasil' && m4.keywords?.join() === 'astronomia,escolas' && m4.instructions === 'Embargo até 13/11',
    'place, keywords and instructions read back', JSON.stringify({ s: m4.sublocation, k: m4.keywords }));
  const sosIn = jpegSegments(withOthers).sos, sosOut = jpegSegments(out).sos;
  check(out.subarray(sosOut).equals(withOthers.subarray(sosIn)), 'the picture data is the very same bytes');
  const xmpText = out.toString('utf8');
  check(/xmp:Rating="4"/.test(xmpText) && (xmpText.match(/<x:xmpmeta/g) || []).length === 1 && !/Bruno Lima/.test(xmpText), 'other programs’ XMP stays (the rating); one packet; the old author is replaced');
  // the mark as a rating (1.37.1): replaces the one there, its namespace declared once
  const rated = mergeXmp(packet0, { rating: 5 });
  check(/<xmp:Rating>5<\/xmp:Rating>/.test(rated) && !/xmp:Rating="4"/.test(rated) && (rated.match(/xmlns:xmp=/g) || []).length === 1, 'the mark written as the rating (great: 5), replacing the one there', rated.match(/xmp:Rating[^<]*<?[^ ]*/)?.[0]);
  const fresh = mergeXmp(null, { author: 'Ana', rating: -1 });
  check(/xmlns:xmp="http:\/\/ns\.adobe\.com\/xap\/1\.0\/"/.test(fresh) && /<xmp:Rating>-1<\/xmp:Rating>/.test(fresh), 'a new .xmp: a photo to delete is rejected (-1)');
  const ps = jpegSegments(out).segs.find((g) => g.marker === 0xed);
  const iptc = iptcMeta(ps.body);
  check(iptc.author === 'Carla Mendes' && iptc.city === 'Santa Maria' && iptc.keywords.length === 2 && iptc.sublocation === 'Planetário' && iptc.copyright === '© UFSM', 'IPTC rewritten to match (UTF-8); its other datasets (copyright) stay', JSON.stringify(iptc.author));
  const again = jpegWithMetadata(out, { author: 'Carla Mendes', city: '' });
  const m5 = await readMetadata((fs.writeFileSync(outFile, again), outFile), 'jpg', 1, again.length);
  check(!m5.city && m5.headline === 'Manchete' && jpegSegments(again).segs.filter((g) => g.marker === 0xed).length === 1, 'writing again: a cleared field goes, the others stay; still one IPTC block');
  // a sidecar: other programs' develop settings stay
  const side = mergeXmp(xmp('crs:Exposure2012="+0.50" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"><dc:creator><rdf:Seq><rdf:li>Old</rdf:li></rdf:Seq></dc:creator>'), { author: 'Diego Alves', city: 'Frederico Westphalen' });
  check(side.includes('crs:Exposure2012="+0.50"') && side.includes('Diego Alves') && !side.includes('>Old<') && /xmlns:photoshop=/.test(side), 'sidecar .xmp: develop settings kept, author replaced, namespaces declared');
  let bad = false;
  try { jpegWithMetadata(Buffer.from('not a jpeg'), fields); } catch (e) { bad = e.code === 'notJpeg'; }
  check(bad, 'a file that is not a JPEG is refused');
  // an edited copy: the original's EXIF upright (orientation 1, its old thumbnail unlinked), XMP and IPTC kept,
  // the copy's own picture data untouched
  const { uprightExif, withOriginalMetadata } = require('../src/platform/library/electron-main/editedCopyMainService');
  const tiffBE = Buffer.from([0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, /* IFD0: 1 entry */ 0, 1, /* 0x0112 SHORT 1 = 6 */ 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, /* next IFD */ 0, 0, 0, 0x30]);
  const exifBody = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiffBE]);
  const up = uprightExif(exifBody);
  check(up && up.readUInt16BE(6 + 8 + 2 + 8) === 1 && up.readUInt32BE(6 + 8 + 2 + 12) === 0, 'edited copy: EXIF orientation set to 1, the old thumbnail unlinked');
  const original = Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe1, exifBody), seg(0xe1, Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'), Buffer.from(packet0, 'utf8')])), seg(0xed, app13([iim(2, 80, 'Ana Souza')])), scan]);
  const rendered = Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')), seg(0xdb, Buffer.alloc(65, 1)), Buffer.from([0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0, 0x77, 0x88, 0xff, 0xd9])]);
  const copy = withOriginalMetadata(rendered, original);
  const cs = jpegSegments(copy);
  const m6 = await readMetadata((fs.writeFileSync(outFile, copy), outFile), 'jpg', 1, copy.length);
  check(copy.subarray(cs.sos).equals(rendered.subarray(jpegSegments(rendered).sos)) && !cs.segs.some((g) => g.marker === 0xe0) && cs.segs.some((g) => g.marker === 0xdb)
    && m6.author === 'Bruno Lima' && cs.segs.filter((g) => g.marker === 0xed).length === 1,
    'edited copy: its picture data as drawn, with the original’s EXIF, XMP and IPTC (no JFIF header)', JSON.stringify({ a: m6.author }));
  // a HEIC (iPhone): its EXIF is an item of the 'meta' box, here past the first 256 KB of the file
  {
    const box = (type, ...parts) => { const body = Buffer.concat(parts); const h = Buffer.alloc(8); h.writeUInt32BE(body.length + 8); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
    const full = (type, v, ...parts) => box(type, Buffer.from([v, 0, 0, 0]), ...parts);
    const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
    const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
    // TIFF (big-endian): IFD0 → Make, Model, ExifIFD → DateTimeOriginal
    const date = Buffer.from('2021:11:14 19:32:05\0', 'latin1');
    const make = Buffer.from('Apple\0', 'latin1'), model = Buffer.from('iPhone 11\0', 'latin1');
    const ifd0 = 8, exifIfd = ifd0 + 2 + 3 * 12 + 4, data = exifIfd + 2 + 12 + 4;
    const entry = (tag, type, count, value) => Buffer.concat([u16(tag), u16(type), u32(count), u32(value)]);
    const tiff = Buffer.concat([Buffer.from('MM\0*', 'latin1'), u32(ifd0),
      u16(3), entry(0x010f, 2, make.length, data), entry(0x0110, 2, model.length, data + make.length), entry(0x8769, 4, 1, exifIfd), u32(0),
      u16(1), entry(0x9003, 2, date.length, data + make.length + model.length), u32(0), make, model, date]);
    const exifItem = Buffer.concat([u32(6), Buffer.from('Exif\0\0', 'latin1'), tiff]);
    const at = 300 * 1024;
    const meta = (offset) => full('meta', 0, full('hdlr', 0, u32(0), Buffer.from('pict'), Buffer.alloc(13)), full('pitm', 0, u16(1)),
      full('iinf', 0, u16(2), full('infe', 2, u16(1), u16(0), Buffer.from('hvc1'), Buffer.from('\0')), full('infe', 2, u16(2), u16(0), Buffer.from('Exif'), Buffer.from('\0'))),
      full('iloc', 0, Buffer.from([0x44, 0x00]), u16(1), u16(2), u16(0), u16(1), u32(offset), u32(exifItem.length)));
    const head = Buffer.concat([box('ftyp', Buffer.from('heic'), u32(0), Buffer.from('mif1heic')), meta(at)]);
    const file = path.join(tmp, 'IMG_0001.HEIC');
    fs.writeFileSync(file, Buffer.concat([head, Buffer.alloc(at - head.length), exifItem]));
    const mh = await readMetadata(file, 'heic', 1, at + exifItem.length);
    check(mh.camera === 'Apple iPhone 11' && mh.takenAt === new Date(2021, 10, 14, 19, 32, 5).getTime() && mh.v === META_VERSION,
      'HEIC: camera and date taken read from its Exif item, even past the first 256 KB', JSON.stringify({ c: mh.camera, t: mh.takenAt && new Date(mh.takenAt).toString() }));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failures ? `\n${failures} failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
