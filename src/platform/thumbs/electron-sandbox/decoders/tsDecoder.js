/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Camcorder videos (AVCHD .MTS/.M2TS and other MPEG transport streams): the <video> element does not
// open this container, so the first seconds are read here (a few MB at most), the H.264 or HEVC key
// frames are taken out of their packets, and one of them is decoded with WebCodecs.
import { RangeReader } from './rangeReader.js';
import { KeyFrameCollector, bestKeyFrame } from './videoKeyFrame.js';

const CHUNK = 1024 * 1024;
const MAX_READ = 24 * 1024 * 1024;
const AFTER_SECONDS = 1;
const VIDEO_TYPES = { 0x1b: 'h264', 0x24: 'hevc' };
const UNSUPPORTED = { 0x01: 'MPEG-1', 0x02: 'MPEG-2', 0x10: 'MPEG-4 Part 2', 0xea: 'VC-1' };

function pesHeader(p) {
  // 00 00 01, stream id, length (2), flags (2), header length, [PTS]
  if (p.length < 9 || p[0] !== 0 || p[1] !== 0 || p[2] !== 1) return null;
  const hasPts = (p[7] & 0x80) !== 0;
  const pts = hasPts && p.length >= 14
    ? ((p[9] >> 1) & 7) * 2 ** 30 + p[10] * 2 ** 22 + (p[11] >> 1) * 2 ** 15 + p[12] * 2 ** 7 + (p[13] >> 1)
    : null;
  return { pts, payload: 9 + p[8] };
}

/**
 * @returns {Promise<{ source: VideoFrame, width: number, height: number, orientation: null }>}
 */
export async function decodeTs(url) {
  const reader = new RangeReader(url);
  const first = await reader.read(0, CHUNK);
  // 188-byte packets, or 192 (M2TS: a 4-byte time stamp before each packet)
  let size = 0;
  let lead = 0;
  if (first[0] === 0x47 && first[188] === 0x47) size = 188;
  else if (first[4] === 0x47 && first[196] === 0x47) { size = 192; lead = 4; }
  else throw new Error('not an MPEG transport stream');

  let pmtPid = -1;
  let videoPid = -1;
  let collector = null;
  let pes = null;          // { pts, parts: [] }
  let firstPts = null;
  let unsupported = null;

  const finishPes = () => {
    if (!pes || !collector) return;
    const total = pes.parts.reduce((s, b) => s + b.length, 0);
    const au = new Uint8Array(total);
    let o = 0;
    for (const b of pes.parts) { au.set(b, o); o += b.length; }
    if (pes.pts !== null && firstPts === null) firstPts = pes.pts;
    const time = pes.pts !== null && firstPts !== null ? (pes.pts - firstPts) / 90000 : 0;
    collector.feed(au, time);
    pes = null;
  };
  const enough = () => collector && (collector.candidates.some((c) => c.time >= AFTER_SECONDS + 1.5) || collector.candidates.length >= 4);

  const section = (payload, pusi) => (pusi ? payload.subarray(1 + payload[0]) : null);

  let buf = first;
  let base = 0;
  let carry = new Uint8Array(0);
  while (true) {
    const data = carry.length ? (() => { const d = new Uint8Array(carry.length + buf.length); d.set(carry); d.set(buf, carry.length); return d; })() : buf;
    let o = 0;
    for (; o + size <= data.length; o += size) {
      const p = o + lead;
      if (data[p] !== 0x47) continue;
      const pusi = (data[p + 1] & 0x40) !== 0;
      const pid = ((data[p + 1] & 0x1f) << 8) | data[p + 2];
      const afc = (data[p + 3] >> 4) & 3;
      if (!(afc & 1)) continue;
      let start = p + 4;
      if (afc & 2) start += 1 + data[p + 4];
      if (start >= p + 188) continue;
      const payload = data.subarray(start, p + 188);
      if (pid === 0 && pmtPid < 0) {
        const s = section(payload, pusi);
        if (!s || s[0] !== 0) continue;
        const end = Math.min(s.length, 3 + (((s[1] & 0x0f) << 8) | s[2]) - 4);
        for (let i = 8; i + 4 <= end; i += 4) {
          if (((s[i] << 8) | s[i + 1]) !== 0) { pmtPid = ((s[i + 2] & 0x1f) << 8) | s[i + 3]; break; }
        }
      } else if (pid === pmtPid && videoPid < 0) {
        const s = section(payload, pusi);
        if (!s || s[0] !== 2) continue;
        const end = Math.min(s.length, 3 + (((s[1] & 0x0f) << 8) | s[2]) - 4);
        let i = 12 + (((s[10] & 0x0f) << 8) | s[11]);
        for (; i + 5 <= end; i += 5 + (((s[i + 3] & 0x0f) << 8) | s[i + 4])) {
          const type = s[i];
          if (VIDEO_TYPES[type]) { videoPid = ((s[i + 1] & 0x1f) << 8) | s[i + 2]; collector = new KeyFrameCollector(VIDEO_TYPES[type] === 'hevc'); break; }
          if (UNSUPPORTED[type] && !unsupported) unsupported = UNSUPPORTED[type];
        }
        if (videoPid < 0) throw new Error(unsupported ? `${unsupported} video is not supported` : 'no video stream');
      } else if (pid === videoPid) {
        if (pusi) {
          finishPes();
          const h = pesHeader(payload);
          if (!h) continue;
          pes = { pts: h.pts, parts: [payload.slice(h.payload)] };
        } else if (pes) {
          pes.parts.push(payload.slice());
        }
      }
    }
    carry = data.slice(o);
    if (enough()) break;
    base += buf.length;
    if (base >= MAX_READ || base >= (await reader.length())) break;
    buf = await reader.read(base, CHUNK);
    if (!buf.length) break;
  }
  if (!collector) throw new Error(unsupported ? `${unsupported} video is not supported` : 'no video stream');
  if (!collector.candidates.length) finishPes();
  const frame = await bestKeyFrame(collector, AFTER_SECONDS);
  return { source: frame, width: frame.displayWidth, height: frame.displayHeight, orientation: null };
}
