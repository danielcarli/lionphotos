/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The hidden thumbnail page. The main process sends jobs (one library item each) and decides the order
// (what is on screen first); this page only does the decoding and encoding, with LionPhotos' own decoders
// (the operating system's thumbnailer is never used):
//   - images — and TIFF, PSD, HEIC, raw previews, camcorder MTS and AVI frames — go to a pool of workers
//     (decoding never blocks this page), HEIC to a worker of its own;
//   - videos use a <video> element: one frame from the first seconds, skipping black frames;
//   - previews (only when the person asks): the first 5 seconds of a video, read frame by frame at
//     thumbnail size and encoded to a small WebM with WebCodecs. Frames are taken by seeking, not by
//     playing, so a clip takes far less than real time to make and nothing is played or heard.
import { encodeThumb, fitInside } from './thumbEncode.js';
import { muxWebm } from './webmMuxer.js';

const host = window.thumbHost;
// a few workers only: each one decodes one picture at a time, and a 45-megapixel JPEG takes about 180 MB
// while it is decoded. 1 worker up to 4 cores, 2 up to 8, 3 above — the rest of the machine stays free.
const CORES = navigator.hardwareConcurrency || 4;
const WORKERS = CORES <= 4 ? 1 : CORES <= 8 ? 2 : 3;
const VIDEO_TIMEOUT_MS = 20000;
const VIDEO_PICKS = [1, 2.5, 4.5]; // seconds tried, all within the first 5 s of the video

// ---------------------------------------------------------------- images
function startWorker(slot) {
  const w = new Worker(new URL('./thumbWorker.js', import.meta.url), { type: 'module' });
  w.onmessage = ({ data }) => { slot.busy--; slot.used++; host.done(data); slot.onIdle?.(); };
  w.onerror = (e) => { console.error('thumb worker', e.message); };
  slot.worker = w;
}

const pool = Array.from({ length: WORKERS }, () => {
  const slot = { worker: null, busy: 0, used: 0 };
  startWorker(slot);
  return slot;
});

// HEIC files go to a worker of their own: libheif (WebAssembly) keeps the memory it once needed until its
// worker ends. So this worker is started only when a HEIC file comes, takes one file at a time, and is
// closed after HEIC_IDLE_MS without work or after HEIC_RECYCLE files.
const HEIC_IDLE_MS = 15000;
const HEIC_RECYCLE = 40;
const heic = { worker: null, busy: 0, used: 0, queue: [], timer: null };
heic.onIdle = () => {
  if (heic.queue.length) { sendHeic(heic.queue.shift()); return; }
  if (heic.big) { heic.big = false; stopHeic(); return; } // a full-size conversion: give its memory back now
  if (heic.used >= HEIC_RECYCLE) { stopHeic(); return; }
  clearTimeout(heic.timer);
  heic.timer = setTimeout(stopHeic, HEIC_IDLE_MS);
};
function stopHeic() {
  clearTimeout(heic.timer);
  if (heic.busy) return;
  heic.worker?.terminate();
  heic.worker = null;
  heic.used = 0;
}
function sendHeic(job) {
  clearTimeout(heic.timer);
  if (!heic.worker) startWorker(heic);
  heic.busy++;
  if (job.kind === 'convert') heic.big = true;
  heic.worker.postMessage(job);
}

function imageJob(job) {
  if (job.kind === 'heic' || job.kind === 'convert') {
    if (heic.busy) heic.queue.push(job); else sendHeic(job);
    return;
  }
  const slot = pool.reduce((a, b) => (b.busy < a.busy ? b : a));
  slot.busy++;
  // the bytes of a raw preview move to the worker instead of being copied
  slot.worker.postMessage(job, job.bytes?.buffer ? [job.bytes.buffer] : []);
}

// ---------------------------------------------------------------- videos
function waitFor(el, event, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, ms);
    const ok = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error(el.error?.message || 'media error')); };
    const cleanup = () => { clearTimeout(timer); el.removeEventListener(event, ok); el.removeEventListener('error', fail); };
    el.addEventListener(event, ok, { once: true });
    el.addEventListener('error', fail, { once: true });
  });
}

/** Mean brightness 0..255 of a frame (on a 16×16 copy), to skip the black frames many videos start with. */
function brightness(video) {
  const c = new OffscreenCanvas(16, 16);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, 16, 16);
  const px = ctx.getImageData(0, 0, 16, 16).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
  return sum / (px.length / 4);
}

async function videoJob(job) {
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.crossOrigin = 'anonymous'; // the frame is read back from a canvas
  try {
    v.src = job.url;
    await waitFor(v, 'loadeddata', VIDEO_TIMEOUT_MS);
    const duration = Number.isFinite(v.duration) ? v.duration : null;
    if (!v.videoWidth || !v.videoHeight) throw new Error('no video track');
    for (const t of VIDEO_PICKS) {
      const at = duration ? Math.min(t, duration * 0.5) : t;
      v.currentTime = at;
      await waitFor(v, 'seeked', VIDEO_TIMEOUT_MS);
      if (brightness(v) > 14 || !duration || at >= duration * 0.5) break;
    }
    const { w, h } = fitInside(v.videoWidth, v.videoHeight, job.max);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(v, 0, 0, w, h);
    const data = await encodeThumb(canvas, job.quality, job.format === 'jpeg' ? 'image/jpeg' : 'image/webp');
    host.done({ jobId: job.jobId, ok: true, data, width: v.videoWidth, height: v.videoHeight, duration });
  } catch (err) {
    host.done({ jobId: job.jobId, ok: false, error: String(err?.message || err) });
  } finally {
    v.removeAttribute('src');
    v.load(); // releases the decoder and the file
  }
}

// ---------------------------------------------------------------- previews (5-second clips)
const PREVIEW_SECONDS = 5;
const PREVIEW_FPS = 12;
const PREVIEW_KEY_EVERY = 24; // a key frame every 2 s
const PREVIEW_RATE = 4;       // the video is played 4× faster while its frames are taken

/**
 * Takes `count` frames, one every `step` seconds, while the video plays fast and muted: decoding runs
 * ahead like normal playback instead of restarting from a key frame for every frame (as seeking does).
 * Resolves false when the page gets no frames this way (then the frames are taken by seeking).
 */
function framesByPlayback(v, count, step, take) {
  if (typeof v.requestVideoFrameCallback !== 'function') return Promise.resolve(false);
  return new Promise((resolve) => {
    let next = 0;
    let done = false;
    let gotAny = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(watchdog);
      v.pause();
      resolve(ok);
    };
    // no frame at all within 3 s: this page cannot play here
    const watchdog = setTimeout(() => finish(gotAny && next > 0 ? fillRest() : false), Math.max(3000, (count * step * 1000) / PREVIEW_RATE * 4));
    const fillRest = () => { while (next < count) take(next++); return true; };
    const onFrame = (_now, meta) => {
      if (done) return;
      gotAny = true;
      while (next < count && meta.mediaTime + 0.001 >= next * step) take(next++);
      if (next >= count) { finish(true); return; }
      v.requestVideoFrameCallback(onFrame);
    };
    v.addEventListener('ended', () => { if (!done && gotAny) { fillRest(); finish(true); } }, { once: true });
    v.requestVideoFrameCallback(onFrame);
    v.playbackRate = PREVIEW_RATE;
    v.play().catch(() => finish(false));
  });
}

async function previewJob(job) {
  const v = document.createElement('video');
  v.muted = true;
  v.preload = 'auto';
  v.crossOrigin = 'anonymous';
  let encoder = null;
  try {
    if (typeof VideoEncoder === 'undefined') throw new Error('WebCodecs unavailable');
    v.src = job.url;
    await waitFor(v, 'loadeddata', VIDEO_TIMEOUT_MS);
    if (!v.videoWidth || !v.videoHeight) throw new Error('no video track');
    const duration = Number.isFinite(v.duration) ? v.duration : PREVIEW_SECONDS;
    const seconds = Math.min(PREVIEW_SECONDS, duration);
    const count = Math.max(1, Math.floor(seconds * PREVIEW_FPS));
    let { w, h } = fitInside(v.videoWidth, v.videoHeight, job.max);
    w -= w % 2; h -= h % 2; // VP8 wants even sizes
    w = Math.max(2, w); h = Math.max(2, h);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    const frames = [];
    let failure = null;
    encoder = new VideoEncoder({
      output: (chunk) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        frames.push({ data, timestampMs: chunk.timestamp / 1000, key: chunk.type === 'key' });
      },
      error: (e) => { failure = e; },
    });
    encoder.configure({ codec: 'vp8', width: w, height: h, bitrate: job.bitrate || 280000, framerate: PREVIEW_FPS });
    const step = 1 / PREVIEW_FPS;
    const take = (i) => {
      ctx.drawImage(v, 0, 0, w, h);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * step * 1e6), duration: Math.round(step * 1e6) });
      encoder.encode(frame, { keyFrame: i % PREVIEW_KEY_EVERY === 0 });
      frame.close();
    };
    const played = await framesByPlayback(v, count, step, take);
    if (failure) throw failure;
    if (!played) {
      // fallback: one seek per frame (slower, but works with any video the page can decode)
      frames.length = 0;
      await encoder.flush();
      encoder.configure({ codec: 'vp8', width: w, height: h, bitrate: job.bitrate || 280000, framerate: PREVIEW_FPS });
      for (let i = 0; i < count; i++) {
        if (failure) throw failure;
        v.currentTime = Math.min(i * step, Math.max(0, duration - 0.05));
        await waitFor(v, 'seeked', VIDEO_TIMEOUT_MS);
        take(i);
        while (encoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 2));
      }
    }
    await encoder.flush();
    if (failure) throw failure;
    const data = muxWebm({ width: w, height: h, frames, durationMs: count * step * 1000 });
    host.done({ jobId: job.jobId, ok: true, data, width: v.videoWidth, height: v.videoHeight, duration: Number.isFinite(v.duration) ? v.duration : null });
  } catch (err) {
    host.done({ jobId: job.jobId, ok: false, error: String(err?.message || err) });
  } finally {
    try { encoder?.close(); } catch { /* already closed */ }
    v.removeAttribute('src');
    v.load();
  }
}

const RUN = { image: imageJob, video: videoJob, preview: previewJob };
host.onJob((job) => (RUN[job.kind] || imageJob)(job));
// can this computer look for faces (Shape Detection API backed by the operating system)? A blank picture
// answers with no faces where it can, and an error where it cannot (Linux)
async function canDetectFaces() {
  try {
    if (typeof FaceDetector !== 'function') return false;
    await new FaceDetector({ fastMode: true }).detect(new OffscreenCanvas(16, 16));
    return true;
  } catch { return false; }
}
canDetectFaces().then((faceDetector) => host.ready({ workers: WORKERS, faceDetector }));
