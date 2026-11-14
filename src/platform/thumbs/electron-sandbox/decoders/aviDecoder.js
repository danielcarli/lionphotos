/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// AVI videos (old digital cameras, action cams): the <video> element does not open them. The headers
// say which codec the video uses; a frame about one second in is read directly from the file:
//   - Motion JPEG (most cameras): every frame is a JPEG, decoded as a picture;
//   - H.264: a key frame decoded with WebCodecs.
// Other codecs (DivX/Xvid, DV, Cinepak…) get no thumbnail.
import { RangeReader, view } from './rangeReader.js';
import { KeyFrameCollector, bestKeyFrame } from './videoKeyFrame.js';
import { withHuffmanTables } from './jpegTables.js';

const MJPEG = new Set(['MJPG', 'AVRN', 'DMB1', 'JPEG', 'MJPA', 'LJPG', 'AVDJ']);
const H264 = new Set(['H264', 'X264', 'AVC1', 'DAVC', 'VSSH']);
const MAX_SCAN_BYTES = 64 * 1024 * 1024;
const MAX_FRAMES = 600;
const AFTER_SECONDS = 1;

const fourcc = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

async function chunkHeader(reader, at) {
  const b = await reader.read(at, 12);
  if (b.length < 8) return null;
  return { id: fourcc(b, 0), size: view(b).getUint32(4, true), list: b.length >= 12 ? fourcc(b, 8) : '' };
}

/** Video stream number, codec and frame duration from the 'hdrl' list. */
async function readHeaders(reader, at, end) {
  const out = { usPerFrame: 0, stream: -1, codec: '', width: 0, height: 0 };
  let streamIndex = -1;
  while (at + 8 <= end) {
    const h = await chunkHeader(reader, at);
    if (!h) break;
    if (h.id === 'avih') {
      out.usPerFrame = view(await reader.read(at + 8, 4)).getUint32(0, true);
    } else if (h.id === 'LIST' && h.list === 'strl') {
      streamIndex++;
      let s = at + 12;
      const sEnd = at + 8 + h.size;
      let isVideo = false;
      while (s + 8 <= sEnd) {
        const c = await chunkHeader(reader, s);
        if (!c) break;
        if (c.id === 'strh') {
          const b = await reader.read(s + 8, 8);
          isVideo = fourcc(b, 0) === 'vids';
          if (isVideo && out.stream < 0) out.handler = fourcc(b, 4);
        } else if (c.id === 'strf' && isVideo && out.stream < 0) {
          const b = await reader.read(s + 8, 20);
          const dv = view(b);
          out.width = Math.abs(dv.getInt32(4, true));
          out.height = Math.abs(dv.getInt32(8, true));
          out.codec = fourcc(b, 16);
          out.stream = streamIndex;
        }
        s += 8 + c.size + (c.size & 1);
      }
    }
    at += 8 + h.size + (h.size & 1);
  }
  return out;
}

/** Calls visit(offset, size) for each video chunk of the 'movi' list, in order, until it returns true. */
async function eachVideoChunk(reader, at, end, stream, visit) {
  const tags = [`${String(stream).padStart(2, '0')}dc`, `${String(stream).padStart(2, '0')}db`];
  let frames = 0;
  const stack = [end];
  while (at + 8 <= stack[stack.length - 1] && at < MAX_SCAN_BYTES && frames < MAX_FRAMES) {
    const h = await chunkHeader(reader, at);
    if (!h) break;
    if (h.id === 'LIST') { stack.push(at + 8 + h.size); at += 12; continue; } // 'rec ' groups
    if (tags.includes(h.id) && h.size > 0) {
      if (await visit(at + 8, h.size, frames)) return;
      frames++;
    }
    at += 8 + h.size + (h.size & 1);
    while (stack.length > 1 && at >= stack[stack.length - 1]) stack.pop();
  }
}

/**
 * @returns {Promise<{ source: CanvasImageSource, width: number, height: number, orientation: null }>}
 */
export async function decodeAvi(url) {
  const reader = new RangeReader(url);
  const riff = await reader.read(0, 12);
  if (riff.length < 12 || fourcc(riff, 0) !== 'RIFF' || fourcc(riff, 8) !== 'AVI ') throw new Error('not an AVI file');
  const fileEnd = Math.min(8 + view(riff).getUint32(4, true), await reader.length());
  let headers = null;
  let movi = null;
  for (let at = 12; at + 8 <= fileEnd;) {
    const h = await chunkHeader(reader, at);
    if (!h) break;
    if (h.id === 'LIST' && h.list === 'hdrl') headers = await readHeaders(reader, at + 12, at + 8 + h.size);
    if (h.id === 'LIST' && h.list === 'movi') { movi = { at: at + 12, end: Math.min(at + 8 + h.size, fileEnd) }; break; }
    at += 8 + h.size + (h.size & 1);
  }
  if (!headers || headers.stream < 0 || !movi) throw new Error('no video stream');
  const fps = headers.usPerFrame ? 1e6 / headers.usPerFrame : 30;
  const codec = headers.codec.toUpperCase();
  const handler = (headers.handler || '').toUpperCase();

  if (MJPEG.has(codec) || MJPEG.has(handler)) {
    const wanted = Math.round(fps * AFTER_SECONDS);
    let firstFrame = null;
    let chosen = null;
    await eachVideoChunk(reader, movi.at, movi.end, headers.stream, async (offset, size, index) => {
      if (index === 0) firstFrame = { offset, size };
      if (index >= wanted) { chosen = { offset, size }; return true; }
      return false;
    });
    const pick = chosen || firstFrame;
    if (!pick) throw new Error('no video frame');
    const decode = async (p) => createImageBitmap(new Blob([withHuffmanTables(await reader.read(p.offset, p.size))], { type: 'image/jpeg' }));
    const bmp = await decode(pick);
    return { source: bmp, width: bmp.width, height: bmp.height, orientation: null };
  }

  if (H264.has(codec) || H264.has(handler)) {
    const collector = new KeyFrameCollector(false);
    await eachVideoChunk(reader, movi.at, movi.end, headers.stream, async (offset, size, index) => {
      if (size > 8 * 1024 * 1024) return false;
      collector.feed(await reader.read(offset, size), index / fps);
      return collector.candidates.some((c) => c.time >= AFTER_SECONDS + 1.5) || collector.candidates.length >= 4;
    });
    const frame = await bestKeyFrame(collector, AFTER_SECONDS);
    return { source: frame, width: frame.displayWidth, height: frame.displayHeight, orientation: null };
  }

  throw new Error(`AVI with ${headers.codec || 'unknown'} video is not supported`);
}
