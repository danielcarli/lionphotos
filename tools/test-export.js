/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Export photos": the names ({data}-{álbum}-{fotógrafo}-{nº}), the sRGB profile, the metadata options
// (GPS removed for social networks), the PNG and TIFF made, the sizes and the output sharpening.
// Run: node tools/test-export.js   (with Python and Pillow, the files are also opened by a real decoder)
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const X = require('../src/platform/export/node/exportFiles');
const { jpegSegments, jpegWithMetadata, mergeXmp } = require('../src/platform/library/node/metadataWriter');
const { uprightExif } = require('../src/platform/library/electron-main/editedCopyMainService');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAIABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCaiiivlT6Y/9k=', 'base64');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAICAIAAAB/FOjAAAAAGElEQVR4XmM8UaHBQApgIkUxCIxqIAYAADL2AXhkVP5qAAAAAElFTkSuQmCC', 'base64');

/** An EXIF (APP1 body) with an Artist and a GPS directory (latitude 29° 41′ S). */
function exifWithGps(artist = 'Daniel') {
  const b = Buffer.alloc(200);
  b.write('Exif\0\0', 0, 'latin1');
  const T = 6;
  b.write('II', T, 'latin1'); b.writeUInt16LE(42, T + 2); b.writeUInt32LE(8, T + 4);
  b.writeUInt16LE(2, T + 8);
  const art = Buffer.from(artist + '\0', 'latin1');
  // Artist → value at 50; GPS pointer → directory at 80
  b.writeUInt16LE(0x013b, T + 10); b.writeUInt16LE(2, T + 12); b.writeUInt32LE(art.length, T + 14); b.writeUInt32LE(50, T + 18);
  b.writeUInt16LE(0x8825, T + 22); b.writeUInt16LE(4, T + 24); b.writeUInt32LE(1, T + 26); b.writeUInt32LE(80, T + 30);
  b.writeUInt32LE(0, T + 34);
  art.copy(b, T + 50);
  b.writeUInt16LE(2, T + 80);
  b.writeUInt16LE(1, T + 82); b.writeUInt16LE(2, T + 84); b.writeUInt32LE(2, T + 86); b.write('S\0', T + 90, 'latin1');
  b.writeUInt16LE(2, T + 94); b.writeUInt16LE(5, T + 96); b.writeUInt32LE(3, T + 98); b.writeUInt32LE(120, T + 102);
  b.writeUInt32LE(0, T + 106);
  [29, 1, 41, 1, 0, 1].forEach((v, i) => b.writeUInt32LE(v, T + 120 + i * 4));
  return b.subarray(0, T + 150);
}
const seg = (marker, body) => { const h = Buffer.from([0xff, marker, 0, 0]); h.writeUInt16BE(body.length + 2, 2); return Buffer.concat([h, body]); };
const XMP_HEAD = 'http://ns.adobe.com/xap/1.0/\0';
const xmpGps = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="29,41S" exif:GPSLongitude="53,48W"><exif:GPSAltitude>150/1</exif:GPSAltitude></rdf:Description></rdf:RDF></x:xmpmeta>';
const original = Buffer.concat([JPEG.subarray(0, 2), seg(0xe1, exifWithGps()), seg(0xe1, Buffer.concat([Buffer.from(XMP_HEAD, 'latin1'), Buffer.from(xmpGps)])), JPEG.subarray(2)]);
const hasGpsTag = (exif) => { const T = 6, n = exif.readUInt16LE(T + 8); for (let i = 0; i < n; i++) if (exif.readUInt16LE(T + 10 + i * 12) === 0x8825) return true; return false; };

(async () => {
  // ------------------------------------------------------------ names
  const day = new Date(2026, 6, 24, 15).getTime();
  const items = [
    { name: 'IMG_0001.CR3', taken: day, author: 'Daniel Michelon De Carli' },
    { name: 'IMG_0002.JPG', taken: day, author: null },
    { name: 'IMG_0003.JPG', taken: day, author: 'Ana Souza' },
  ];
  let r = X.exportNames(items, { work: 'Formatura UFSM', ext: 'jpg' });
  check(r.names[0] === '2026-07-24-Formatura-UFSM-Daniel-Michelon-De-Carli-001.jpg', 'the default: date, album, photographer, number', r.names[0]);
  check(r.names[1] === '2026-07-24-Formatura-UFSM-002.jpg' && r.noAuthor === 1, 'no author: the piece goes, no hyphen left over, counted', r.names[1]);
  check(r.names[2].includes('Ana-Souza-003'), 'mixed authors: each file its own, the number goes on', r.names[2]);
  r = X.exportNames([{ name: 'a.jpg', taken: day, author: 'José Conceição' }], { work: 'Ateliê: "Cores" <2026>', ext: 'jpg' });
  check(r.names[0] === '2026-07-24-Ateliê-Cores-2026-José-Conceição-001.jpg', 'characters Windows refuses go; accents stay', r.names[0]);
  r = X.exportNames([{ name: 'a.jpg', taken: day, author: 'José Conceição' }], { work: 'Ateliê', ext: 'jpg', ascii: true });
  check(r.names[0] === '2026-07-24-Atelie-Jose-Conceicao-001.jpg', '"without accents"', r.names[0]);
  r = X.exportNames(items.slice(0, 2), { work: 'X', ext: 'jpg', existing: new Set(['2026-07-24-x-daniel-michelon-de-carli-001.jpg']) });
  check(r.names[0] === '2026-07-24-X-Daniel-Michelon-De-Carli-001-2.jpg', 'never over a file already there (case does not matter)', r.names[0]);
  r = X.exportNames([{ name: 'a.jpg', taken: day, author: 'D' }], { work: 'W'.repeat(300), ext: 'jpg' });
  check(r.names[0].length <= 160 && r.names[0].endsWith('-D-001.jpg'), 'too long: the album is cut, the photographer and number stay', `${r.names[0].length}`);
  r = X.exportNames(items.slice(0, 2), { ext: 'png', keepName: true });
  check(r.names.join() === 'IMG_0001.png,IMG_0002.png', 'keeping the original names');
  r = X.exportNames(items.slice(0, 1), { pattern: '{date}_{photographer}_{n}', ext: 'jpg' });
  check(r.names[0] === '2026-07-24_Daniel-Michelon-De-Carli_001.jpg', 'pieces written in English too', r.names[0]);
  r = X.exportNames([{ name: 'con.jpg', taken: null, author: null }], { pattern: '{nome}', ext: 'jpg' });
  check(r.names[0] === 'con-001.jpg', 'a name Windows reserves gets a number');

  // ------------------------------------------------------------ the profile
  const icc = X.srgbIcc();
  check(icc.readUInt32BE(0) === icc.length && icc.toString('latin1', 36, 40) === 'acsp' && icc.toString('latin1', 16, 20) === 'RGB ', 'the sRGB profile: size, signature, colour space', `${icc.length} bytes`);

  // ------------------------------------------------------------ JPEG
  const fields = { author: 'Daniel Michelon De Carli', caption: 'Formatura', city: 'Santa Maria' };
  const opts = (mode) => ({ original, mode, fields, jpegSegments, jpegWithMetadata, uprightExif });
  const segsOf = (b) => jpegSegments(b).segs;
  const exifOf = (b) => segsOf(b).find((s) => s.marker === 0xe1 && s.body.toString('latin1', 0, 6) === 'Exif\0\0')?.body;
  const xmpOf = (b) => segsOf(b).find((s) => s.marker === 0xe1 && s.body.toString('latin1', 0, XMP_HEAD.length) === XMP_HEAD)?.body.toString('utf8');
  const all = X.exportJpeg(JPEG, opts('all'));
  check(segsOf(all).some((s) => s.marker === 0xe2 && s.body.toString('latin1', 0, 12) === 'ICC_PROFILE\0'), 'JPEG: the sRGB profile goes in');
  check(exifOf(all) && hasGpsTag(exifOf(all)) && /29,41S/.test(xmpOf(all)), '"all": the camera’s EXIF and the place stay');
  check(/Daniel Michelon De Carli/.test(xmpOf(all)) && /Santa Maria/.test(xmpOf(all)), '"all": what was written in LionPhotos goes in');
  const noGps = X.exportJpeg(JPEG, opts('noGps'));
  const e = exifOf(noGps);
  check(e && !hasGpsTag(e) && e.includes(Buffer.from('Daniel\0')) && !e.includes(Buffer.from([29, 0, 0, 0, 1, 0, 0, 0, 41])), '"without the place": the GPS directory gone, the rest of the EXIF kept');
  check(!/GPS/.test(xmpOf(noGps)) && /Santa Maria/.test(xmpOf(noGps)), '"without the place": no GPS in the XMP either (the city written stays)');
  const author = X.exportJpeg(JPEG, opts('author'));
  check(!exifOf(author) && /Daniel Michelon/.test(xmpOf(author)) && !/Santa Maria|Formatura/.test(xmpOf(author)), '"only the author": no camera data, only the name');
  const none = X.exportJpeg(JPEG, opts('none'));
  check(!exifOf(none) && !xmpOf(none) && segsOf(none).some((s) => s.marker === 0xe2), '"nothing": only the picture and its profile');
  check(Buffer.compare(original.subarray(-200), JPEG.subarray(-200)) === 0 && jpegSegments(none).sos > 0, 'the picture data is the window’s (the original untouched)');

  // ------------------------------------------------------------ PNG
  const png = X.exportPng(PNG, { mode: 'author', fields, dpi: 300, xmpPacket: (f) => mergeXmp(null, f) });
  const chunks = [];
  for (let o = 8; o < png.length;) { const n = png.readUInt32BE(o); const type = png.toString('latin1', o + 4, o + 8); chunks.push(type); const crc = png.readUInt32BE(o + 8 + n); if (crc !== X.crc32(png.subarray(o + 4, o + 8 + n))) chunks.push('BADCRC'); o += 12 + n; }
  check(chunks.join() === 'IHDR,sRGB,pHYs,iTXt,IDAT,IEND', 'PNG: sRGB, density and XMP chunks after the header, CRCs right', chunks.join());
  check(/Daniel Michelon/.test(png.toString('utf8')) && !/Santa Maria/.test(png.toString('utf8')), 'PNG "only the author"');

  // ------------------------------------------------------------ TIFF
  const w = 5, h = 3;
  const rgba = new Uint8Array(w * h * 4).map((_, i) => (i % 4 === 3 ? 255 : (i * 7) % 256));
  const tif = X.encodeTiff(rgba, w, h, { dpi: 300, xmp: mergeXmp(null, { author: 'Daniel' }) });
  const n = tif.readUInt16LE(8);
  const tags = new Map();
  for (let i = 0; i < n; i++) { const o = 10 + i * 12; tags.set(tif.readUInt16LE(o), { type: tif.readUInt16LE(o + 2), count: tif.readUInt32LE(o + 4), value: tif.readUInt32LE(o + 8), short: tif.readUInt16LE(o + 8) }); }
  const ids = [...tags.keys()];
  check(tif.toString('latin1', 0, 2) === 'II' && tif.readUInt16LE(2) === 42 && ids.every((id, i) => !i || id > ids[i - 1]), 'TIFF: header, tags in order');
  const strip = tags.get(273).value;
  check(tags.get(256).value === w && tags.get(257).value === h && tags.get(279).value === w * h * 3 && tif[strip] === rgba[0] && tif[strip + 3] === rgba[4] && tif.length === strip + w * h * 3, 'TIFF: size and RGB pixels (alpha dropped)');
  check(tif.readUInt32LE(tags.get(282).value) === 300 && tags.get(34675).count === icc.length && tif.toString('latin1', tags.get(34675).value + 36, tags.get(34675).value + 40) === 'acsp', 'TIFF: 300 dpi and the sRGB profile');
  check(tif.toString('utf8', tags.get(700).value, tags.get(700).value + tags.get(700).count).includes('Daniel'), 'TIFF: the metadata as XMP');

  // ------------------------------------------------------------ sizes and sharpening
  const I = await import('../src/workbench/contrib/export/exportImage.js');
  const sz = (id, extra) => I.targetSize(6000, 4000, { ...I.SIZES.find((z) => z.id === id), ...extra });
  check(sz('original').w === 6000 && sz('long', { long: 2048 }).w === 2048 && sz('long', { long: 2048 }).h === 1365, 'original and longest side');
  check(sz('igPortrait').w === 1080 && sz('igPortrait').h === 720, 'a box: the photo fits inside it (a landscape photo in 1080 × 1350)');
  check(I.targetSize(4000, 6000, I.SIZES.find((z) => z.id === 'print10x15')).w === 1200 && sz('print10x15').dpi === 300, 'a print box follows the photo’s orientation, 300 dpi');
  check(I.targetSize(800, 600, I.SIZES.find((z) => z.id === 'uhd')).w === 800, 'never enlarged');
  const px = new Uint8ClampedArray(9 * 9 * 4).fill(100);
  for (let y = 0; y < 9; y++) for (let x = 5; x < 9; x++) px.fill(200, (y * 9 + x) * 4, (y * 9 + x) * 4 + 3);
  I.sharpenPixels(px, 9, 9, { amount: 0.7, radius: 1 });
  check(px[(4 * 9 + 4) * 4] < 100 && px[(4 * 9 + 5) * 4] > 200 && px[(4 * 9 + 0) * 4] === 100 && px[3] === 100, 'sharpening: an edge gets more contrast, flat areas and alpha do not change');
  const jf = Uint8Array.from(JPEG);
  I.withDensity(jf, 300);
  check(jf[13] === 1 && ((jf[14] << 8) | jf[15]) === 300, 'JPEG: 300 dpi in the JFIF header');

  // ------------------------------------------------------------ a real decoder (when Python and Pillow are here)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-export-'));
  const files = { 'a.jpg': noGps, 'b.png': png, 'c.tif': X.encodeTiff(new Uint8Array(64 * 32 * 4).fill(180), 64, 32, { dpi: 300 }) };
  for (const [k, v] of Object.entries(files)) fs.writeFileSync(path.join(dir, k), v);
  const py = spawnSync('python3', ['-I', '-c', `
import sys, os
from PIL import Image
d = sys.argv[1]
for n in sorted(os.listdir(d)):
    im = Image.open(os.path.join(d, n)); im.load()
    print(n, im.size, im.mode, 'icc' if im.info.get('icc_profile') else '-', im.info.get('dpi'))
`, dir], { encoding: 'utf8' });
  if (py.status === 0) {
    const out = py.stdout.trim().split('\n');
    check(/a\.jpg \(16, 8\) RGB icc/.test(out[0]), 'Pillow opens the JPEG, with the profile', out[0]);
    check(/b\.png \(16, 8\)/.test(out[1]) && /\(299\.9|\(300/.test(out[1]), 'Pillow opens the PNG, 300 dpi', out[1]);
    check(/c\.tif \(64, 32\) RGB icc/.test(out[2]) && /300/.test(out[2]), 'Pillow opens the TIFF, with the profile and 300 dpi', out[2]);
  } else console.log('SKIP  a real decoder (no Python with Pillow)', (py.stderr || '').split('\n').slice(-2).join(' '));
  fs.rmSync(dir, { recursive: true, force: true });

  console.log(failures ? `\n${failures} failure(s)` : '\nall passed');
  process.exit(failures ? 1 : 0);
})();
