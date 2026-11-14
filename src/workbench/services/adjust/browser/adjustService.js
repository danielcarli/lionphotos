/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The adjustments, drawn on the graphics card (WebGL), for the thumbnails, the info panel, the viewer and the
// edited copy. The file never changes: the adjustments are in the catalog, and "Save edited copy" writes a new
// JPEG next to the original. The same shader makes every view and the saved copy, so what is seen is saved:
//   white balance  temperature (blue ↔ yellow) and tint (green ↔ magenta), as gains in linear light;
//   exposure       ±2 stops, in linear light;
//   highlights     darkens (or brightens) the light tones, less and less towards the dark ones;
//   shadows        lifts (or deepens) the dark tones, less and less towards the light ones;
//   whites/blacks  where white and black are (levels);
//   contrast       around the middle grey;
//   vibrance       saturates the dull colours more than the vivid ones (skin stays natural);
//   saturation     towards (or away from) the grey of the same luminance;
//   black & white  with how bright the reds, greens and blues become;
//   vignette       darker (or lighter) corners of the picture as shown (after the crop);
//   clarity, texture, sharpness: local contrast at three sizes — on the graphics card only (each pixel looks
//                  at its neighbours: too slow on the processor).
//   lens           its distortion, vignetting and colour fringes undone, from the Lensfun profile of the lens
//                  (common/lens.js) — before the shape, on the graphics card only.
// The shape (turned, straightened, cropped) is applied first, so the vignette and the detail follow the crop.
// A raw photo is drawn from the camera's JPEG inside it (8 bits) — or, in "develop" mode (adjust.raw), from its
// sensor data developed on this computer (LibRaw, src/platform/raw) in 16 bits: the picture then reaches the
// graphics card as 16-bit floating point, with the light above white kept, and its shape is applied there.
import { ADJUST_KEYS } from '../../library/browser/libraryService.js';
import { GEO_KEYS, drawGeometry, frameOf, geometryKey, geometryOf, hasGeometry } from '../common/geometry.js';
import { LENS_KEYS, hasLens, lensUniforms, loadLensDb } from '../common/lens.js';

const VS = `attribute vec2 p; varying vec2 uv;
void main() { uv = vec2((p.x + 1.0) / 2.0, 1.0 - (p.y + 1.0) / 2.0); gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision highp float;
varying vec2 uv; uniform sampler2D tex;
uniform float ev; uniform float con; uniform float sha; uniform float sat; uniform float hi; uniform float bp; uniform float wp;
uniform float vib; uniform float bw; uniform float vig; uniform float clar; uniform float texr; uniform float shp;
uniform vec3 wb; uniform vec3 bwW; uniform vec2 px; uniform float rC; uniform float rT; uniform mat3 G;
uniform float lensOn; uniform vec2 sz; uniform float Rh; uniform float Rv; uniform float D0; uniform vec4 Dk; uniform vec3 Tr; uniform vec3 Tb; uniform vec3 Vk; uniform float sc; uniform vec2 Mv; uniform vec2 Pk; uniform float Pr;
const vec3 W = vec3(0.2126, 0.7152, 0.0722);
float lum(vec2 p) { return dot(texture2D(tex, p).rgb, W); }
float ring(vec2 q, float r) {
  float s = 0.0;
  for (int i = 0; i < 8; i++) { float a = float(i) * 0.7853982 + r * 0.37; s += lum(q + vec2(cos(a), sin(a)) * r * px); }
  return s / 8.0;
}
void main() {
  vec2 q = (G * vec3(uv, 1.0)).xy;
  // the lens corrected (see lens.js): where this point of the corrected picture is in the photo — green;
  // red and blue a little nearer or farther (the colour fringes); the light the lens lost there, given back
  float lensGain = 1.0;
  vec2 qr = q; vec2 qb = q;
  if (lensOn > 0.5) {
    vec2 p = (q - 0.5) * sz / sc;
    // the perspective straightened (by hand), then the lens
    float w = 1.0 + dot(Pk, p) / Pr;
    p /= max(w, 0.05);
    float r = length(p) / Rh;
    vec2 ps = p * (D0 + r * (Dk.x + r * (Dk.y + r * (Dk.z + r * Dk.w))));
    float rs = length(ps) / Rh;
    qr = ps * (Tr.x + rs * (Tr.y + rs * Tr.z)) / sz + 0.5;
    qb = ps * (Tb.x + rs * (Tb.y + rs * Tb.z)) / sz + 0.5;
    float r2 = dot(ps, ps) / (Rv * Rv);
    lensGain = 1.0 / clamp(1.0 + r2 * (Vk.x + r2 * (Vk.y + r2 * Vk.z)), 0.2, 5.0);
    // the corners by hand: lighter (+) or darker (−), from the midpoint out
    lensGain *= max(0.05, 1.0 + Mv.x * pow(min(length(ps) / (0.5 * length(sz)), 1.5), Mv.y));
    q = w > 0.05 ? ps / sz + 0.5 : vec2(-1.0);
  }
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec4 t = texture2D(tex, q);
  if (lensOn > 0.5) { t.r = texture2D(tex, clamp(qr, 0.0, 1.0)).r; t.b = texture2D(tex, clamp(qb, 0.0, 1.0)).b; }
  float l0 = dot(t.rgb, W);
  float detail = 0.0;
  if (clar != 0.0) { float m = (ring(q, rC) + ring(q, rC * 0.6) + ring(q, rC * 0.3)) / 3.0; float mid = 1.0 - pow(abs(l0 * 2.0 - 1.0), 2.0); detail += clar * (l0 - m) * 1.4 * mid; }
  if (texr != 0.0) { float m = (ring(q, rT) + ring(q, rT * 0.5)) * 0.5; detail += texr * (l0 - m) * 1.8; }
  if (shp > 0.0) { float m = (lum(q + vec2(px.x, 0.0)) + lum(q - vec2(px.x, 0.0)) + lum(q + vec2(0.0, px.y)) + lum(q - vec2(0.0, px.y))) * 0.25; detail += shp * (l0 - m) * 2.2; }
  vec3 c = pow(t.rgb, vec3(2.2)) * wb * exp2(ev) * lensGain;
  float l = dot(c, W);
  c *= 1.0 + sha * (1.0 - smoothstep(0.0, 0.35, l)) * (sha >= 0.0 ? 1.5 : 0.8);
  c *= 1.0 + hi * smoothstep(0.3, 1.0, l) * (hi >= 0.0 ? 0.6 : 0.45);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2)) + detail;
  c = (c - bp) / (wp - bp);
  c = (c - 0.5) * con + 0.5;
  float s = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  float g = dot(c, W);
  c = mix(vec3(g), c, 1.0 + vib * (1.0 - clamp(s, 0.0, 1.0)) * (vib > 0.0 ? 1.2 : 1.0));
  g = dot(c, W);
  c = mix(vec3(g), c, sat);
  if (bw > 0.5) c = vec3(dot(c, bwW));
  if (vig != 0.0) {
    float v = smoothstep(0.3, 1.0, length((uv - 0.5) * 2.0) / 1.4142);
    c = vig < 0.0 ? c * (1.0 + vig * v * 0.9) : mix(c, vec3(1.0), vig * v * 0.6);
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), t.a);
}`;

/** The keys only the graphics card draws (they read each pixel's neighbours). */
export const DETAIL_KEYS = ['sharpness', 'texture', 'clarity'];

/** The shader's values for adjustments from -100 to 100. */
export function uniformsOf(a = {}) {
  const v = (k) => Math.max(-100, Math.min(100, Number(a?.[k]) || 0)) / 100;
  const c = v('contrast');
  const temp = v('temperature') * 0.75, tint = v('tint') * 0.4; // stops on red and blue (±0.75), on green (±0.4)
  const bwW = [0.2126 + v('bwRed') * 0.35, 0.7152 + v('bwGreen') * 0.35, 0.0722 + v('bwBlue') * 0.35].map((x) => Math.max(0, x));
  const sum = bwW[0] + bwW[1] + bwW[2] || 1;
  return {
    ev: v('exposure') * 2, con: c >= 0 ? 1 + c : 1 + c / 1.5, sha: v('shadows'), sat: 1 + v('saturation'),
    hi: v('highlights'), wp: 1 - v('whites') * 0.25, bp: -v('blacks') * 0.25, vib: v('vibrance'),
    bw: a?.bw ? 1 : 0, vig: v('vignette'), clar: v('clarity'), texr: v('texture'), shp: Math.max(0, v('sharpness')),
    wb: [2 ** temp, 2 ** -tint, 2 ** -temp], bwW: bwW.map((x) => x / sum),
  };
}

/**
 * The same as the shader, on the processor — when the graphics card cannot be used (WebGL blocked, a virtual
 * machine, a remote desktop). Clarity, texture and sharpness are left out (the panel says so).
 * @param {ImageData} img changed in place
 */
export function adjustPixels(img, adjust) {
  const u = uniformsOf(adjust);
  const gain = 2 ** u.ev;
  const lin = new Float32Array(256);
  for (let i = 0; i < 256; i++) lin[i] = (i / 255) ** 2.2;
  const ks = u.sha >= 0 ? 1.5 : 0.8, kh = u.hi >= 0 ? 0.6 : 0.45;
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const d = img.data, W = img.width, H = img.height;
  const [wr, wg, wb] = u.wb;
  const range = u.wp - u.bp;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let r = lin[d[i]] * wr * gain, g = lin[d[i + 1]] * wg * gain, b = lin[d[i + 2]] * wb * gain;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const f = (1 + u.sha * (1 - smooth(0, 0.35, l)) * ks) * (1 + u.hi * smooth(0.3, 1, l) * kh);
    r = Math.max(r * f, 0) ** (1 / 2.2); g = Math.max(g * f, 0) ** (1 / 2.2); b = Math.max(b * f, 0) ** (1 / 2.2);
    r = (r - u.bp) / range; g = (g - u.bp) / range; b = (b - u.bp) / range;
    r = (r - 0.5) * u.con + 0.5; g = (g - 0.5) * u.con + 0.5; b = (b - 0.5) * u.con + 0.5;
    const s = Math.min(1, Math.max(0, Math.max(r, g, b) - Math.min(r, g, b)));
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const vk = 1 + u.vib * (1 - s) * (u.vib > 0 ? 1.2 : 1);
    r = y + (r - y) * vk; g = y + (g - y) * vk; b = y + (b - y) * vk;
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = y + (r - y) * u.sat; g = y + (g - y) * u.sat; b = y + (b - y) * u.sat;
    if (u.bw) { r = g = b = r * u.bwW[0] + g * u.bwW[1] + b * u.bwW[2]; }
    if (u.vig) {
      const x = ((p % W) + 0.5) / W, yy = (Math.floor(p / W) + 0.5) / H;
      const v = smooth(0.3, 1, Math.hypot((x - 0.5) * 2, (yy - 0.5) * 2) / Math.SQRT2);
      if (u.vig < 0) { const k = 1 + u.vig * v * 0.9; r *= k; g *= k; b *= k; } else { const k = u.vig * v * 0.6; r += (1 - r) * k; g += (1 - g) * k; b += (1 - b) * k; }
    }
    d[i] = Math.round(Math.min(1, Math.max(0, r)) * 255);
    d[i + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
    d[i + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
  }
  return img;
}

/**
 * The colour a point should be neutral (grey) at → { temperature, tint } that make it so (the eyedropper).
 * @param {number[]} rgb 0–255 of the photo as it is (no adjustments)
 */
export function neutralAt([r, g, b]) {
  const L = (x) => Math.max(1e-4, (Math.max(1, x) / 255) ** 2.2);
  const R = L(r), G = L(g), B = L(b);
  const clamp = (x) => Math.max(-100, Math.min(100, Math.round(x)));
  return { temperature: clamp((100 * Math.log2(B / R)) / 1.5), tint: clamp(250 * Math.log2(G / Math.sqrt(R * B))) };
}

/**
 * "Auto": exposure, whites, blacks, contrast and vibrance from the brightness of the photo as it is.
 * @param {Uint8ClampedArray|Uint8Array} px RGBA of a small copy
 */
export function autoAdjust(px) {
  const ls = [];
  for (let i = 0; i < px.length; i += 4) ls.push((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255);
  if (!ls.length) return {};
  ls.sort((a, b) => a - b);
  const at = (q) => ls[Math.min(ls.length - 1, Math.floor(ls.length * q))];
  const p01 = at(0.005), p50 = at(0.5), p99 = at(0.995);
  // the middle tone towards 0.42 (in stops, at most ±1.5)
  const ev = Math.max(-1.5, Math.min(1.5, Math.log2(0.42 ** 2.2 / Math.max(1e-4, p50) ** 2.2)));
  const k = (2 ** ev) ** (1 / 2.2);
  const hi = Math.min(1.2, p99 * k), lo = p01 * k;
  const whites = Math.max(-40, Math.min(60, Math.round(((1 - Math.min(0.99, hi)) / 0.25) * 100 * 0.9)));
  const blacks = Math.max(-60, Math.min(20, Math.round((-lo / 0.25) * 100 * 0.9)));
  const spread = hi - lo;
  const contrast = spread < 0.6 ? Math.round(Math.min(25, (0.6 - spread) * 60)) : 0;
  return { exposure: Math.round(ev * 50), whites, blacks, contrast, highlights: p99 > 0.97 ? -25 : 0, shadows: p01 < 0.02 && p50 < 0.3 ? 20 : 0, vibrance: 15 };
}

const IDENTITY = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

/** Only the shape of the adjustments (turned, straightened, cropped, the lens, developed): no tones. */
export function shapeOf(a) {
  const out = Object.fromEntries([...GEO_KEYS, ...LENS_KEYS].filter((k) => a?.[k]).map((k) => [k, a[k]]));
  if (a?.raw) out.raw = 1;
  return out;
}
/** A raw file's picture (lionmedia://raw/<id>): developed from its sensor data in develop mode. */
const RAW_URL = /^lionmedia:\/\/raw\/(\d+)/;

/** The size of an adjusted thumbnail (the grid, the panel, the viewer while it opens): small, kept in memory. */
export const THUMB_ADJUSTED = 640;

/** No change of the tones (the shape aside). */
export const isNeutral = (a) => !a || ADJUST_KEYS.every((k) => !a[k]);
const keyOf = (a) => `v2,${ADJUST_KEYS.map((k) => a?.[k] || 0).join(',')}${hasGeometry(a) ? `,${geometryKey(a)}` : ''}${a?.raw ? ',raw' : ''}`;

/**
 * A picture on a canvas, drawn with adjustments. The picture goes to the graphics card once (setSource); each
 * new set of adjustments only draws it again (render) — instant, even at full size. Without WebGL the
 * processor does the same math; `quick` then draws a smaller copy (while a slider moves), the full size after.
 */
export class PictureView {
  constructor() {
    this.canvas = document.createElement('canvas');
    const opts = { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false };
    // WebGL 2 takes 16-bit pictures (a developed raw); the same shader runs on both
    this.gl = this.canvas.getContext('webgl2', opts) || this.canvas.getContext('webgl', opts);
    if (this.gl) this.#setup();
    this.gl2 = !!this.gl && typeof WebGL2RenderingContext !== 'undefined' && this.gl instanceof WebGL2RenderingContext;
    this.source = null;
    this.small = null;
  }

  get maxSize() { return this.gl ? this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) : 16384; }

  #setup() {
    const gl = this.gl;
    const shader = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    this.loc = Object.fromEntries(['ev', 'con', 'sha', 'sat', 'hi', 'bp', 'wp', 'vib', 'bw', 'vig', 'clar', 'texr', 'shp', 'wb', 'bwW', 'px', 'rC', 'rT', 'G', 'lensOn', 'sz', 'Rh', 'Rv', 'D0', 'Dk', 'Tr', 'Tb', 'Vk', 'sc', 'Mv', 'Pk', 'Pr'].map((k) => [k, gl.getUniformLocation(prog, k)]));
    gl.uniformMatrix3fv(this.loc.G, false, IDENTITY);
    // a shader the driver refused (it would draw nothing): the processor draws instead
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[adjust] shader', gl.getProgramInfoLog(prog)); this.gl = null; this.canvas = document.createElement('canvas'); }
  }

  /**
   * The picture to draw (an ImageBitmap or a loaded image — or a developed raw: { raw, width, height, data }
   * in 16-bit floating point, WebGL 2 only); sent to the graphics card once.
   */
  setSource(src, force = false) {
    if (this.source === src && !force) return;
    this.source = src;
    this.small = null;
    this.canvas.width = src.width;
    this.canvas.height = src.height;
    const gl = this.gl;
    if (gl) {
      gl.viewport(0, 0, src.width, src.height);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      if (src.raw) {
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB16F, src.width, src.height, 0, gl.RGB, gl.HALF_FLOAT, src.data);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        gl.uniformMatrix3fv(this.loc.G, false, IDENTITY);
      }
    }
  }

  /** A developed raw's shape (turned, straightened, cropped) is drawn here, on the graphics card: the size of the result and where each of its pixels is in the picture. */
  #shape(adjust) {
    const src = this.source;
    const W = src.width, H = src.height;
    const g = geometryOf(adjust || {});
    const [fw, fh] = frameOf(W, H, g.rot);
    const [x, y, w, h] = g.crop;
    const cw = Math.max(1, Math.round(w * fw)), ch = Math.max(1, Math.round(h * fh));
    const th = ((g.rot + g.angle) * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
    const tx = -x * fw + fw / 2, ty = -y * fh + fh / 2;
    // picture = R⁻¹ · (canvas − t) + centre, in fractions of the picture
    const m = [c * cw / W, -s * cw / H, 0, s * ch / W, c * ch / H, 0, (-c * tx - s * ty + W / 2) / W, (s * tx - c * ty + H / 2) / H, 1];
    return { cw, ch, m };
  }

  /** Draws the picture with these adjustments. @param {{ quick?: boolean }} o quick: a smaller copy without WebGL */
  render(adjust, { quick = false, shape = false } = {}) {
    const src = this.source;
    if (!src) return this.canvas;
    const gl = this.gl;
    if (gl) {
      // a developed raw, or a corrected lens: the shape is drawn here too, after the lens
      const lens = lensUniforms(adjust, src.width, src.height);
      if (src.raw || lens || shape) {
        const { cw, ch, m } = this.#shape(adjust);
        if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }
        gl.viewport(0, 0, cw, ch);
        gl.uniformMatrix3fv(this.loc.G, false, m);
      } else {
        if (this.canvas.width !== src.width || this.canvas.height !== src.height) { this.canvas.width = src.width; this.canvas.height = src.height; }
        gl.viewport(0, 0, src.width, src.height);
        gl.uniformMatrix3fv(this.loc.G, false, IDENTITY);
      }
      gl.uniform1f(this.loc.lensOn, lens ? 1 : 0);
      if (lens) {
        gl.uniform2f(this.loc.sz, src.width, src.height);
        gl.uniform1f(this.loc.Rh, lens.Rh); gl.uniform1f(this.loc.Rv, lens.Rv); gl.uniform1f(this.loc.D0, lens.D0); gl.uniform1f(this.loc.sc, lens.sc);
        gl.uniform4f(this.loc.Dk, ...lens.D); gl.uniform3f(this.loc.Tr, ...lens.Tr); gl.uniform3f(this.loc.Tb, ...lens.Tb); gl.uniform3f(this.loc.Vk, ...lens.V);
        gl.uniform2f(this.loc.Mv, ...lens.M); gl.uniform2f(this.loc.Pk, ...lens.P); gl.uniform1f(this.loc.Pr, lens.Pr);
      }
      const u = uniformsOf(adjust);
      for (const [k, x] of Object.entries(u)) {
        if (Array.isArray(x)) gl.uniform3f(this.loc[k], x[0], x[1], x[2]); else gl.uniform1f(this.loc[k], x);
      }
      // the detail's sizes follow the picture's (the same look on a thumbnail and at full size)
      const side = Math.max(src.width, src.height);
      gl.uniform2f(this.loc.px, 1 / src.width, 1 / src.height);
      gl.uniform1f(this.loc.rC, Math.max(2, side * 0.008));
      gl.uniform1f(this.loc.rT, Math.max(1, side * 0.0016));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return this.canvas;
    }
    // the processor: a copy of at most 1600 pixels while a slider moves, the full size when it stops
    let from = src;
    if (quick && Math.max(src.width, src.height) > 1600) {
      if (!this.small) {
        const k = 1600 / Math.max(src.width, src.height);
        const c = document.createElement('canvas');
        c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
        c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        this.small = c;
      }
      from = this.small;
    }
    const c = this.canvas;
    if (c.width !== from.width || c.height !== from.height) { c.width = from.width; c.height = from.height; }
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(from, 0, 0);
    if (!isNeutral(adjust)) ctx.putImageData(adjustPixels(ctx.getImageData(0, 0, c.width, c.height), adjust), 0, 0);
    return c;
  }

  /** The pixels drawn (RGBA, any row order). */
  pixels() {
    const c = this.canvas, gl = this.gl;
    if (gl) { const px = new Uint8Array(c.width * c.height * 4); gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; }
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  }

  /** Lets the graphics card's memory go. */
  dispose() {
    this.source = null;
    this.small = null;
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.canvas.width = this.canvas.height = 1;
  }
}

export class AdjustService {
  #view = null;
  #cache = new Map(); // `${url}|${adjust}|${max}` → Promise<blob url>
  #done = new Map(); // the same, once made: shown at once (no blank while a picture is drawn again)
  #images = new Map(); // url → Promise<ImageBitmap> (a few, the last used)
  #full = null;
  #geo = null; // the canvas of a drawn picture's shape
  #geoUrls = new Map(); // `${url}|${shape}` → Promise<blob url>, for the viewer
  /** Adjustments copied to paste on other photos. */
  clipboard = null;

  /** @param {any} host the bridge (to keep adjusted thumbnails on disk) */
  constructor(host = null) { this.host = host; }

  /** Where an item's adjusted thumbnail is kept on disk (in the catalog), for these adjustments. */
  storedUrl(it, adjust) { return `lionthumb://a/${it.id}?k=${keyOf(adjust)}`; }

  /**
   * An item's adjusted thumbnail made now (the one on disk is missing or of other adjustments): drawn, kept on
   * disk for the next sessions, and given as a blob: URL for now.
   */
  thumbFor(it, url, adjust) {
    // cropped: from the full picture (the grid's thumbnail, cropped and enlarged, would be blurred); developed
    // from the raw data: from the raw file
    const full = hasGeometry(adjust) || this.develops(adjust, this.pictureUrlOf?.(it)) ? this.pictureUrlOf?.(it) : null;
    return this.adjustedUrl(full || url, adjust, THUMB_ADJUSTED, { store: it.id });
  }

  /** The full-size picture of an item (set by the workbench: a RAW's camera JPEG, a HEIF…), or null. */
  pictureUrlOf = null;

  /** The shared view (thumbnails, the panel, histograms, saved copies). */
  get #shared() { return (this.#view ||= new PictureView()); }

  /** A view of its own (the viewer: the picture stays on the graphics card while it is adjusted). */
  createView() { return new PictureView(); }

  /** Whether the graphics card draws (otherwise the processor does, more slowly). */
  get fast() { return !!this.#shared.gl; }

  // ------------------------------------------------------------------ raw photos, developed from the sensor data
  /** Whether raw files can be developed here (16-bit pictures need WebGL 2). */
  get canDevelop() { return this.#shared.gl2; }

  /** Whether this picture is drawn from a developed raw: develop mode on, a raw file's picture, WebGL 2. */
  develops(adjust, url) { return !!adjust?.raw && typeof url === 'string' && RAW_URL.test(url) && this.canDevelop; }

  #worker = null;
  #jobs = new Map();
  #jobSeq = 0;
  #idle = 0;
  #developed = new Map(); // `${id}|${half}` → Promise<{ raw, width, height, data, headroom }>

  /**
   * A raw file developed from its sensor data (16 bits, linear light made gamma 2.2, the light above white
   * kept). Half size (each side) for editing and thumbnails — four times faster; full size to save and export.
   * The developer (LibRaw in WebAssembly) runs in a worker, one photo at a time, and stops after a minute idle
   * (it takes a few hundred MB while it works). The last few results are kept.
   */
  develop(url, { half = true } = {}) {
    const id = RAW_URL.exec(url)?.[1];
    if (!id) return Promise.reject(new Error('not a raw file'));
    const key = `${id}|${half ? 1 : 0}`;
    if (!this.#developed.has(key)) {
      const p = new Promise((resolve, reject) => {
        this.#worker ||= this.#startWorker();
        const job = ++this.#jobSeq;
        this.#jobs.set(job, { resolve, reject });
        clearTimeout(this.#idle);
        this.#worker.postMessage({ id: job, url: `lionmedia://f/${id}`, half });
      });
      this.#developed.set(key, p);
      p.catch(() => this.#developed.delete(key));
      // a full-size result is big (≈ 140 MB for 24 MP): only the last one; a few at half size
      const keys = [...this.#developed.keys()];
      const full = keys.filter((k) => k.endsWith('|0'));
      for (const k of full.slice(0, -1)) this.#developed.delete(k);
      const halves = keys.filter((k) => k.endsWith('|1'));
      for (const k of halves.slice(0, -3)) this.#developed.delete(k);
    }
    return this.#developed.get(key);
  }

  #startWorker() {
    const w = new Worker(new URL('../../../../platform/raw/electron-sandbox/rawWorker.js', import.meta.url), { type: 'module' });
    w.onmessage = ({ data }) => {
      const job = this.#jobs.get(data.id);
      this.#jobs.delete(data.id);
      if (job) {
        if (data.error) job.reject(new Error(data.error));
        else job.resolve({ raw: true, width: data.width, height: data.height, data: data.data, headroom: data.headroom, model: data.model });
      }
      if (!this.#jobs.size) {
        clearTimeout(this.#idle);
        this.#idle = setTimeout(() => { if (!this.#jobs.size) { this.#worker?.terminate(); this.#worker = null; } }, 60000);
      }
    };
    w.onerror = (e) => {
      for (const job of this.#jobs.values()) job.reject(new Error(e.message || 'raw developer failed'));
      this.#jobs.clear();
      w.terminate();
      if (this.#worker === w) this.#worker = null;
    };
    return w;
  }

  /**
   * The picture to draw for `url` with `adjust`: a developed raw (develop mode on a raw file), else the
   * picture of the URL, at most `max` pixels on its longer side.
   */
  async source(url, adjust, max = 0) {
    await this.lensReady(adjust);
    if (this.develops(adjust, url)) return this.develop(url, { half: !!max && max <= 3200 });
    return this.image(url, this.#sourceMax(adjust, max));
  }

  // ------------------------------------------------------------------ the lens (its profile, from Lensfun)
  /** Whether the lens is corrected when drawn: the correction on, and the graphics card (it is drawn there). */
  corrects(adjust) { return hasLens(adjust) && this.fast; }

  /** The lens profiles loaded, when a photo's lens is corrected (read once, only then). */
  async lensReady(adjust) { if (this.corrects(adjust)) await loadLensDb().catch((err) => console.warn('[adjust] lens profiles', err)); }

  /** The picture of a URL (the camera's orientation applied), at most `max` pixels on its longer side. */
  async image(url, max = 0) {
    const key = `${url}|${max}`;
    // a picture at full size is big: only the last one is kept
    if (!max && this.#full?.key !== key) { this.#full?.p.then((b) => b.close?.(), () => {}); this.#full = { key, p: this.#load(url, 0) }; }
    if (!max) return this.#full.p;
    if (!this.#images.has(key)) {
      const p = this.#load(url, max);
      this.#images.set(key, p);
      p.catch(() => this.#images.delete(key));
      // a few pictures are kept (the one being adjusted, the ones around it)
      while (this.#images.size > 8) {
        const [k0, v0] = this.#images.entries().next().value;
        this.#images.delete(k0);
        v0.then((b) => b.close?.(), () => {});
      }
    }
    return this.#images.get(key);
  }

  async #load(url, max) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return this.bitmapOf(img, max);
  }

  /** An upright bitmap of a loaded image, at most `max` (and what the graphics card takes) on its longer side. */
  bitmapOf(img, max = 0) {
    const limit = Math.min(max || Infinity, this.#shared.maxSize);
    const k = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight));
    return createImageBitmap(img, { imageOrientation: 'from-image', resizeWidth: Math.round(img.naturalWidth * k), resizeHeight: Math.round(img.naturalHeight * k), resizeQuality: 'high' });
  }

  /** Draws a picture with adjustments on the shared canvas and returns it (valid until the next draw). */
  draw(bitmap, adjust) {
    const v = this.#shared;
    // a developed raw: its shape is drawn on the graphics card, with the tones
    if (bitmap?.raw) { v.setSource(bitmap); return v.render(adjust); }
    // the lens corrected: on the graphics card, before the shape (both drawn there)
    if (hasLens(adjust) && v.gl) { v.setSource(bitmap); return v.render(adjust); }
    if (hasGeometry(adjust)) {
      // turned, straightened, cropped first (the vignette and the detail then follow the crop)
      this.#geo ||= document.createElement('canvas');
      v.setSource(drawGeometry(this.#geo.getContext('2d'), bitmap, adjust), true);
    } else v.setSource(bitmap);
    return v.render(adjust);
  }

  /** How big a picture must be loaded for a result of `max` pixels once cropped. */
  #sourceMax(adjust, max) {
    if (!max || !hasGeometry(adjust)) return max;
    const [, , w, h] = geometryOf(adjust).crop;
    return Math.min(4096, Math.ceil(max / Math.max(0.05, Math.max(w, h))));
  }

  /**
   * The full-size photo with only its shape (turned, straightened, cropped) as a blob: URL — what the viewer
   * shows and zooms in; the tones are drawn over it. The last few are kept.
   */
  geometryUrl(url, adjust) {
    const key = `${url}|${geometryKey(adjust)}`;
    if (!this.#geoUrls.has(key)) {
      const p = (async () => {
        const bmp = await this.image(url, 0);
        let c;
        if (this.corrects(adjust)) {
          // the lens corrected, then the shape: drawn on the graphics card, copied out
          await this.lensReady(adjust);
          const drawn = this.draw(bmp, shapeOf(adjust));
          c = document.createElement('canvas');
          c.width = drawn.width; c.height = drawn.height;
          c.getContext('2d').drawImage(drawn, 0, 0);
        } else c = drawGeometry(document.createElement('canvas').getContext('2d'), bmp, adjust);
        const b = await new Promise((resolve, reject) => c.toBlob((x) => (x ? resolve(x) : reject(new Error('toBlob'))), 'image/jpeg', 0.95));
        c.width = c.height = 1;
        return URL.createObjectURL(b);
      })();
      this.#geoUrls.set(key, p);
      p.catch(() => this.#geoUrls.delete(key));
      while (this.#geoUrls.size > 3) {
        const [k0, v0] = this.#geoUrls.entries().next().value;
        this.#geoUrls.delete(k0);
        v0.then((u) => setTimeout(() => URL.revokeObjectURL(u), 5000), () => {});
      }
    }
    return this.#geoUrls.get(key);
  }

  /** Draws into a canvas of the page (the live preview while a slider moves). */
  async drawInto(target, url, adjust, max = 1200) {
    const bmp = await this.source(url, adjust, max);
    const src = this.draw(bmp, adjust);
    if (!src) return false;
    // a developed raw is drawn at its own size: brought to the size asked
    const k = Math.min(1, max / Math.max(src.width, src.height));
    target.width = Math.round(src.width * k);
    target.height = Math.round(src.height * k);
    const ctx = target.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, target.width, target.height);
    return true;
  }

  /** A picture with adjustments as a blob: URL (kept for the views that show it again). */
  adjustedUrl(url, adjust, max = 0, { store = null } = {}) {
    const key = `${url}|${keyOf(adjust)}|${max}`;
    if (!this.#cache.has(key)) {
      const p = this.blob(url, adjust, { max, quality: 0.88 }).then(async (b) => {
        // kept on disk: the grid shows it at once in the next sessions
        if (store && this.host?.thumbs?.saveAdjusted) b.arrayBuffer().then((ab) => this.host.thumbs.saveAdjusted(store, keyOf(adjust), new Uint8Array(ab))).catch(() => {});
        const u = URL.createObjectURL(b); this.#done.set(key, u); return u;
      });
      this.#cache.set(key, p);
      p.catch(() => this.#cache.delete(key));
      while (this.#cache.size > 200) {
        const [k0, v0] = this.#cache.entries().next().value;
        this.#cache.delete(k0);
        this.#done.delete(k0);
        v0.then((u) => URL.revokeObjectURL(u), () => {});
      }
    }
    return this.#cache.get(key);
  }

  /** The adjusted picture's URL if it is already made (to show it at once), else null. */
  readyUrl(url, adjust, max = 0) { return this.#done.get(`${url}|${keyOf(adjust)}|${max}`) || null; }

  /** The adjusted picture as a JPEG. @returns {Promise<Blob>} */
  async blob(url, adjust, { max = 0, quality = 0.95 } = {}) {
    const bmp = await this.source(url, adjust, max);
    let c = this.draw(bmp, adjust);
    if (c && max && Math.max(c.width, c.height) > max * 1.05) {
      // loaded bigger for the crop: brought to the size asked
      const k = max / Math.max(c.width, c.height);
      const small = document.createElement('canvas');
      small.width = Math.round(c.width * k); small.height = Math.round(c.height * k);
      const ctx = small.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(c, 0, 0, small.width, small.height);
      c = small;
    }
    if (!c) throw new Error('cannot draw');
    return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', quality));
  }

  /** The pixels (RGBA) of a small copy of a picture as it is, with only its shape: for Auto and the eyedropper. */
  async plainPixels(url, adjust = null, max = 256) {
    if (this.develops(adjust, url) || this.corrects(adjust)) {
      // a developed raw, a corrected lens: drawn with its shape only (no tones), at most `max` pixels
      const shape = shapeOf(adjust);
      const drawn = this.draw(await this.source(url, adjust, max), shape);
      const k = Math.min(1, max / Math.max(drawn.width, drawn.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(drawn.width * k)); c.height = Math.max(1, Math.round(drawn.height * k));
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(drawn, 0, 0, c.width, c.height);
      return { data: ctx.getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height };
    }
    const bmp = await this.image(url, max);
    const shape = hasGeometry(adjust) ? Object.fromEntries(GEO_KEYS.map((k) => [k, adjust[k]])) : null;
    const c = document.createElement('canvas');
    const src = shape ? drawGeometry(c.getContext('2d'), bmp, shape) : (() => { c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); return c; })();
    return { data: src.getContext('2d').getImageData(0, 0, src.width, src.height).data, width: src.width, height: src.height };
  }

  /** "Auto" for a photo: the values to set (see autoAdjust). */
  async auto(url, adjust = null) {
    const { data } = await this.plainPixels(url, adjust, 256);
    return autoAdjust(data);
  }

  /** The eyedropper: the white balance that makes the point (fractions of the picture as shown) neutral. */
  async neutralPoint(url, adjust, fx, fy) {
    const { data, width, height } = await this.plainPixels(url, adjust, 512);
    const cx = Math.round(fx * (width - 1)), cy = Math.round(fy * (height - 1));
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = Math.max(0, cy - 2); y <= Math.min(height - 1, cy + 2); y++) {
      for (let x = Math.max(0, cx - 2); x <= Math.min(width - 1, cx + 2); x++) { const i = (y * width + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    }
    return n ? neutralAt([r / n, g / n, b / n]) : null;
  }

  /** Brightness histogram (64 bins, 0–1) of a picture with adjustments, from a small copy. */
  async histogram(url, adjust) {
    let px;
    if (this.develops(adjust, url)) {
      // the developed raw with its tones, read from a small copy
      const drawn = this.draw(await this.source(url, adjust, 256), adjust);
      const c = document.createElement('canvas');
      const k = Math.min(1, 256 / Math.max(drawn.width, drawn.height));
      c.width = Math.max(1, Math.round(drawn.width * k)); c.height = Math.max(1, Math.round(drawn.height * k));
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(drawn, 0, 0, c.width, c.height);
      px = ctx.getImageData(0, 0, c.width, c.height).data;
    } else {
      await this.lensReady(adjust);
      const bmp = await this.image(url, 256);
      this.draw(bmp, adjust);
      px = this.#shared.pixels();
    }
    const bins = new Array(64).fill(0);
    for (let i = 0; i < px.length; i += 4) bins[Math.min(63, ((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 256 * 64) | 0)]++;
    const top = Math.max(...bins.slice(1, 63), 1);
    return bins.map((n) => Math.min(1, n / top));
  }
}
