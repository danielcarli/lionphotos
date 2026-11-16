/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Unit tests for what a picture really is, from its bytes (src/platform/library/node/sniff.js).
//   node tools/test-sniff.js
const fs = require('fs'), os = require('os'), path = require('path');
const { decoderOfBytes, pictureDecoder } = require('../src/platform/library/node/sniff');

let failed = 0;
const check = (ok, name, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`); if (!ok) failed++; };
const box = (brand) => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftyp' + brand + '\0\0\0\0mif1heic', 'latin1')]);

check(decoderOfBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 0, 0, 0, 0, 0, 0, 0])) === 'image', 'JPEG');
check(decoderOfBytes(Buffer.from('\x89PNG\r\n\x1a\n\0\0\0\0', 'latin1')) === 'image', 'PNG');
check(decoderOfBytes(Buffer.from('II*\0\x08\0\0\0\0\0\0\0', 'latin1')) === 'tiff', 'TIFF (Intel)');
check(decoderOfBytes(Buffer.from('MM\0*\0\0\0\x08\0\0\0\0', 'latin1')) === 'tiff', 'TIFF (Motorola)');
check(decoderOfBytes(Buffer.from('8BPS\0\x01\0\0\0\0\0\0', 'latin1')) === 'psd', 'PSD');
check(decoderOfBytes(box('heic')) === 'heic', 'HEIC');
check(decoderOfBytes(box('mif1')) === 'heic', 'HEIF (mif1)');
check(decoderOfBytes(box('avif')) === 'image', 'AVIF');
check(decoderOfBytes(Buffer.alloc(32)) === null, 'nothing known (zeros: a file not downloaded yet)');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-sniff-'));
  const fake = path.join(dir, 'IMG_9229.JPG'); fs.writeFileSync(fake, Buffer.concat([box('heic'), Buffer.alloc(64)]));
  const jpgTif = path.join(dir, 'DANC6173-Edit.tif'); fs.writeFileSync(jpgTif, Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(40)]));
  const real = path.join(dir, 'a.jpg'); fs.writeFileSync(real, Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(40)]));
  check(await pictureDecoder(fake, 'image') === 'heic', 'a HEIC named .JPG goes to the HEIC decoder');
  check(await pictureDecoder(jpgTif, 'tiff') === 'image', 'a JPEG named .tif goes to the JPEG decoder');
  check(await pictureDecoder(real, 'image') === 'image', 'a JPEG stays a JPEG');
  check(await pictureDecoder(fake, 'raw') === 'raw' && await pictureDecoder(fake, 'video') === 'video', 'raw files and videos keep their decoder');
  check(await pictureDecoder(path.join(dir, 'gone.jpg'), 'image') === 'image', 'a file that cannot be read keeps the one of its name');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
