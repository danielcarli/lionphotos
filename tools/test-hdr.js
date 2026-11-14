/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// HDR photos (PQ, HLG) turned into ordinary pictures, and the colour box of a HEIF read. Run: node tools/test-hdr.js
'use strict';
let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

(async () => {
  const { hdrToSdr, pqToNits, isHdr } = await import('../src/platform/thumbs/electron-sandbox/decoders/hdrToSdr.js');
  // PQ: 0.58 is about 203 nits (the diffuse white), 0.75 about 1000 nits
  check(Math.abs(pqToNits(0.5807) - 203) < 3 && Math.abs(pqToNits(0.7518) - 1000) < 15, 'PQ curve: 203 and 1000 nits', `${pqToNits(0.5807).toFixed(1)} ${pqToNits(0.7518).toFixed(0)}`);
  const px = (rgb) => Uint8ClampedArray.from(rgb.flatMap((v) => [v, v, v, 255]));
  // grey PQ codes: black, 18 % grey of the white (about 37 nits), the white (203), a highlight (1000 nits)
  const codes = [0, 104, 148, 192];
  const out = px(codes);
  hdrToSdr(out, { transfer: 16, primaries: 9 });
  const v = [0, 4, 8, 12].map((i) => out[i]);
  check(v[0] === 0 && v[1] > 90 && v[1] < 140 && v[2] > 215 && v[3] >= v[2] && v[3] <= 255, 'PQ → sRGB: black stays black, mid grey mid, the white near white, highlights rolled off', JSON.stringify(v));
  const flat = px([148]);
  const before = flat[0];
  hdrToSdr(flat, { transfer: 1, primaries: 1 });
  check(flat[0] === before && !isHdr({ transfer: 1 }), 'an ordinary (SDR) photo is left as it is');
  const hlg = px([0, 128, 191, 255]);
  hdrToSdr(hlg, { transfer: 18, primaries: 9 });
  check(hlg[0] === 0 && hlg[4] > 60 && hlg[8] > hlg[4] && hlg[12] >= hlg[8], 'HLG → sRGB: in order, not clipped to black', JSON.stringify([hlg[0], hlg[4], hlg[8], hlg[12]]));
  // a saturated BT.2020 red stays red (not magenta or orange) on the screen
  const red = Uint8ClampedArray.from([148, 60, 60, 255]);
  hdrToSdr(red, { transfer: 16, primaries: 9 });
  check(red[0] > red[1] * 2 && Math.abs(red[1] - red[2]) < 12, 'BT.2020 colours into the screen’s: red stays red', JSON.stringify([...red.slice(0, 3)]));

  const { heifExtras } = await import('../src/platform/thumbs/electron-sandbox/decoders/heicConvert.js');
  // a minimal HEIF with a 'colr' nclx box (PQ, BT.2020) in ipco
  const box = (type, ...parts) => { const body = Buffer.concat(parts); const h = Buffer.alloc(8); h.writeUInt32BE(body.length + 8); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
  const nclx = Buffer.alloc(11); nclx.write('nclx', 0, 'latin1'); nclx.writeUInt16BE(9, 4); nclx.writeUInt16BE(16, 6); nclx.writeUInt16BE(9, 8); nclx[10] = 0x80;
  const file = Buffer.concat([box('ftyp', Buffer.from('heic\0\0\0\0mif1heic', 'latin1')), box('meta', Buffer.alloc(4), box('iprp', box('ipco', box('colr', nclx))))]);
  const ex = heifExtras(new Uint8Array(file));
  check(ex.nclx && ex.nclx.transfer === 16 && ex.nclx.primaries === 9, 'HEIF colour box (nclx) read: PQ, BT.2020', JSON.stringify(ex.nclx));
  console.log(failures ? `\n${failures} failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
