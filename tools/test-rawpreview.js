/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The previews inside raw files: only JPEGs a picture engine can draw. Run: node tools/test-rawpreview.js
'use strict';
const { drawable } = require('../src/platform/library/node/rawPreview');

let failed = 0;
const check = (what, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
const seg = (marker, body) => { const b = Buffer.alloc(4 + body.length); b[0] = 0xff; b[1] = marker; b.writeUInt16BE(body.length + 2, 2); body.copy(b, 4); return b; };
const frame = (sof) => Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe1, Buffer.alloc(30)), seg(0xc4, Buffer.alloc(20)), seg(sof, Buffer.from([8, 0x0d, 0xbc, 0x05, 0x38, 3]))]);

check('a baseline JPEG (the full-size preview of a CR2)', drawable(frame(0xc0)));
check('a progressive JPEG', drawable(frame(0xc2)));
check('a lossless JPEG (the raw data of a CR2) is not drawn', !drawable(frame(0xc3)));
check('an arithmetic-coded JPEG is not drawn', !drawable(frame(0xc9)));
check('a frame beyond the bytes looked at: drawn as before', drawable(Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe1, Buffer.alloc(30))])));
if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all raw preview checks passed');
