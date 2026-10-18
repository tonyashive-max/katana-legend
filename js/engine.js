'use strict';
/* ===== Engine: renderer, materials, geometry helpers, particles, trails, overlay, audio ===== */

const V3 = THREE.Vector3, Q4 = THREE.Quaternion, COL = THREE.Color;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
function fbm(x, y) { return vnoise(x, y) * .55 + vnoise(x * 2.1 + 7, y * 2.1 + 3) * .3 + vnoise(x * 4.3 + 1, y * 4.3 + 9) * .15; }
function shadeHex(hex, amt) { const c = new COL(hex); if (amt < 0) c.multiplyScalar(1 + amt); else c.lerp(new COL(1, 1, 1), amt); return c; }

/* ---------- renderer ---------- */
let R = null, CAM = null, VW = 1, VH = 1;
const QUALITY = { pr: 1.5, shadows: true, autoPr: null, autoShadows: true };
function applyQuality() {
  const dpr = window.devicePixelRatio || 1, lv = S.quality;
  if (lv === 'high') { QUALITY.pr = Math.min(dpr, 2); QUALITY.shadows = true; }
  else if (lv === 'balanced') { QUALITY.pr = Math.min(dpr, 1.3); QUALITY.shadows = true; }
  else if (lv === 'fast') { QUALITY.pr = 1; QUALITY.shadows = false; }
  else { QUALITY.pr = Math.min(dpr, QUALITY.autoPr || 1.5); QUALITY.shadows = QUALITY.autoShadows !== false; }
  if (R) { R.shadowMap.enabled = QUALITY.shadows; resizeGL(); }
}
function initGL() {
  const cv = document.getElementById('gl');
  R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.setClearColor(0x0b0d18, 1);
  CAM = new THREE.PerspectiveCamera(62, 1, 0.04, 900);
  applyQuality();
  resizeGL();
  window.addEventListener('resize', resizeGL);
}
function resizeGL() {
  VW = window.innerWidth; VH = window.innerHeight;
  if (!R) return;
  R.setPixelRatio(QUALITY.pr);
  R.setSize(VW, VH, false);
  CAM.aspect = VW / VH;
  CAM.updateProjectionMatrix();
  resize2D();
  FX.setScale();
}
function focalPx() { return VH / (2 * Math.tan(CAM.fov * Math.PI / 360)); }
const _proj = new V3();
function toScreen(v, out) {
  _proj.copy(v).project(CAM);
  out = out || { x: 0, y: 0, z: 0 };
  out.x = (_proj.x + 1) / 2 * VW; out.y = (1 - _proj.y) / 2 * VH; out.z = _proj.z;
  return out;
}

/* ---------- materials ---------- */
let GRAD = null;
function toonGrad() {
  const d = new Uint8Array([78, 78, 92, 255, 160, 160, 170, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
function toon(o) {
  if (!GRAD) GRAD = toonGrad();
  o = o || {};
  if (o.flatShading) return new THREE.MeshPhongMaterial(Object.assign({ shininess: 0, specular: 0x000000 }, o));
  return new THREE.MeshToonMaterial(Object.assign({ gradientMap: GRAD }, o));
}
const _olCache = {};
function outlineMat(th, color) {
  const key = th + ':' + (color || 0);
  if (_olCache[key]) return _olCache[key];
  const m = new THREE.ShaderMaterial({
    uniforms: { th: { value: th }, col: { value: new COL(color || 0x0a0910) } },
    vertexShader: 'uniform float th; void main(){ vec3 p = position + normal * th; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col, 1.0); }',
    side: THREE.BackSide,
  });
  _olCache[key] = m;
  return m;
}
function glowMat(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity == null ? .5 : opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
}

/* ---------- geometry helpers ---------- */
const GEO = {
  box: (w, h, d, ws, hs, ds) => new THREE.BoxGeometry(w, h, d, ws || 1, hs || 1, ds || 1),
  cyl: (rt, rb, h, s, hs, open, ts, tl) => new THREE.CylinderGeometry(rt, rb, h, s || 12, hs || 1, !!open, ts || 0, tl == null ? Math.PI * 2 : tl),
  sph: (r, ws, hs, ps, pl, ts, tl) => new THREE.SphereGeometry(r, ws || 14, hs || 10, ps || 0, pl == null ? Math.PI * 2 : pl, ts || 0, tl == null ? Math.PI : tl),
  cone: (r, h, s, hs) => new THREE.ConeGeometry(r, h, s || 10, hs || 1),
  ico: (r, d) => new THREE.IcosahedronGeometry(r, d || 0),
  dodec: r => new THREE.DodecahedronGeometry(r, 0),
  oct: r => new THREE.OctahedronGeometry(r, 0),
  tor: (r, t, rs, ts, arc) => new THREE.TorusGeometry(r, t, rs || 8, ts || 20, arc == null ? Math.PI * 2 : arc),
};
function P(geo, color, pos, rot, scl, cf) { return { geo, color, pos, rot, scl, cf }; }
const _mm = new THREE.Matrix4(), _mq = new Q4(), _me = new THREE.Euler(), _mv = new V3(), _ms = new V3();
function merge(items) {
  const parts = []; let total = 0;
  for (const it of items) {
    const g = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
    const n = g.attributes.position.count;
    const cols = new Float32Array(n * 3);
    const base = new COL(it.color);
    const pa = g.attributes.position.array;
    for (let k = 0; k < n; k++) {
      let c = base;
      if (it.cf) { const r = it.cf(pa[k * 3], pa[k * 3 + 1], pa[k * 3 + 2]); c = r.isColor ? r : (typeof r === 'string' || typeof r === 'number' ? new COL(r) : base); }
      cols[k * 3] = c.r; cols[k * 3 + 1] = c.g; cols[k * 3 + 2] = c.b;
    }
    const r = it.rot || [0, 0, 0];
    _me.set(r[0] || 0, r[1] || 0, r[2] || 0, r[3] || 'XYZ');
    _mq.setFromEuler(_me);
    _mv.fromArray(it.pos || [0, 0, 0]);
    const s = it.scl == null ? [1, 1, 1] : (typeof it.scl === 'number' ? [it.scl, it.scl, it.scl] : it.scl);
    _ms.fromArray(s);
    _mm.compose(_mv, _mq, _ms);
    g.applyMatrix4(_mm);
    parts.push({ g, cols, n }); total += n;
    it.geo.dispose && it.geo.dispose();
  }
  const Pp = new Float32Array(total * 3), N = new Float32Array(total * 3), C = new Float32Array(total * 3);
  let o = 0;
  for (const p of parts) {
    Pp.set(p.g.attributes.position.array, o * 3);
    N.set(p.g.attributes.normal.array, o * 3);
    C.set(p.cols, o * 3);
    o += p.n; p.g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(Pp, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  out.computeBoundingSphere();
  return out;
}
const _io = new THREE.Object3D(), _ic = new COL();
function inst(geo, mat, list, cast) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach((it, i) => {
    _io.position.fromArray(it.p);
    const r = it.r || [0, 0, 0];
    _io.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0, r[3] || 'XYZ');
    const s = it.s == null ? 1 : it.s;
    if (typeof s === 'number') _io.scale.setScalar(s); else _io.scale.fromArray(s);
    _io.updateMatrix();
    m.setMatrixAt(i, _io.matrix);
    if (it.c != null) m.setColorAt(i, _ic.set(it.c));
  });
  m.count = list.length;
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = !!cast; m.receiveShadow = true; m.frustumCulled = false;
  return m;
}

/* ---------- canvas textures ---------- */
const TEX = {};
function ctex(s, fn, h) {
  const c = document.createElement('canvas'); c.width = s; c.height = h || s;
  fn(c.getContext('2d'), s, h || s);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}
function radial(x, s, stops) { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, s, s); }
function makeTextures() {
  TEX.glow = ctex(64, (x, s) => radial(x, s, [[0, 'rgba(255,255,255,1)'], [.18, 'rgba(255,255,255,.8)'], [.45, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]));
  TEX.dot = ctex(32, (x, s) => radial(x, s, [[0, 'rgba(255,255,255,1)'], [.55, 'rgba(255,255,255,.95)'], [1, 'rgba(255,255,255,0)']]));
  TEX.smoke = ctex(64, (x, s) => {
    const rr = mulberry(7);
    for (let i = 0; i < 16; i++) {
      const px = s / 2 + (rr() - .5) * 24, py = s / 2 + (rr() - .5) * 24, r = 10 + rr() * 12;
      const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.32)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s);
    }
  });
  TEX.petal = ctex(32, (x, s) => { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(s / 2, s / 2, s * .42, s * .22, .6, 0, Math.PI * 2); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(s / 2 + 3, s / 2 - 2, s * .2, s * .1, .6, 0, Math.PI * 2); x.fill(); });
  TEX.flake = ctex(32, (x, s) => { radial(x, s, [[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]); });
  TEX.ray = ctex(64, (x, s) => {
    const g = x.createLinearGradient(0, 0, s, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, s); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = v; x.fillRect(0, 0, s, s);
  });
  TEX.ring = ctex(128, (x, s) => { x.strokeStyle = '#fff'; x.lineWidth = 10; x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 10, 0, Math.PI * 2); x.stroke(); });
}
function halo(color, size, opacity) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color, transparent: true, opacity: opacity == null ? .9 : opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(size);
  return s;
}

/* ---------- sky ---------- */
function makeSky(o) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new COL(o.top) }, mid: { value: new COL(o.mid) }, bot: { value: new COL(o.bot) },
      sunDir: { value: o.sunDir.clone().normalize() }, sunCol: { value: new COL(o.sunCol) }, sunSize: { value: Math.cos((o.sunDeg || 4) * Math.PI / 180) },
      stars: { value: o.stars ? 1 : 0 }, time: { value: 0 }, haze: { value: o.haze == null ? .35 : o.haze },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 top, mid, bot, sunCol, sunDir; uniform float stars, time, sunSize, haze; varying vec3 vP;',
      'float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }',
      'void main(){ float y = vP.y;',
      ' vec3 c = y > 0.0 ? mix(mid, top, pow(clamp(y * 1.25, 0.0, 1.0), 0.65)) : mix(mid, bot, clamp(-y * 4.0, 0.0, 1.0));',
      ' float s = max(dot(vP, sunDir), 0.0);',
      ' c = mix(c, sunCol * 1.15, smoothstep(sunSize - 0.0012, sunSize + 0.0004, s));',
      ' c += sunCol * (pow(s, 60.0) * 0.5 + pow(s, 8.0) * haze * 0.35);',
      ' if (stars > 0.5 && y > 0.04) { vec3 q = floor(vP * 210.0); float r = h(q); if (r > 0.9965) { float tw = 0.55 + 0.45 * sin(time * 2.5 + r * 300.0); c += vec3(tw) * smoothstep(0.04, 0.35, y) * (r - 0.9965) * 260.0; } }',
      ' gl_FragColor = vec4(c, 1.0); }',
    ].join('\n'),
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat);
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

/* ---------- particles ---------- */
const PV = 'attribute float size; attribute vec4 col; varying vec4 vC; uniform float scale; void main(){ vC = col; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / max(0.05, -mv.z); gl_Position = projectionMatrix * mv; }';
const PF = 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); float a = vC.a * t.a; if (a < 0.01) discard; gl_FragColor = vec4(vC.rgb * t.rgb, a); }';
function pointsMat(tex, blending) {
  return new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, scale: { value: 500 } }, vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false, blending, fog: false });
}
class PSys {
  constructor(n, tex, blending) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 4); this.size = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.s0 = new Float32Array(n); this.s1 = new Float32Array(n); this.a0 = new Float32Array(n);
    this.rgb = new Float32Array(n * 3); this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.spin = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('col', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo = g; this.mat = pointsMat(tex, blending);
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5;
  }
  emit(x, y, z, vx, vy, vz, life, s0, s1, color, alpha, grav, drag, spin) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1;
    const c = color.isColor ? color : _ic.set(color);
    this.rgb[i * 3] = c.r; this.rgb[i * 3 + 1] = c.g; this.rgb[i * 3 + 2] = c.b;
    this.a0[i] = alpha == null ? 1 : alpha; this.grav[i] = grav || 0; this.drag[i] = drag || 0; this.spin[i] = spin || 0;
  }
  update(dt) {
    const n = this.n;
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) { if (this.size[i] !== 0) { this.size[i] = 0; this.col[i * 4 + 3] = 0; } continue; }
      this.life[i] -= dt;
      const t = 1 - Math.max(0, this.life[i]) / this.max[i];
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= dr; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * dr - this.grav[i] * dt; this.vel[i * 3 + 2] *= dr;
      if (this.spin[i]) { const sx = Math.sin(this.life[i] * 6 + i) * this.spin[i]; this.vel[i * 3] += sx * dt; }
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      const a = this.a0[i] * Math.min(1, t * 10) * (1 - t);
      this.col[i * 4] = this.rgb[i * 3]; this.col[i * 4 + 1] = this.rgb[i * 3 + 1]; this.col[i * 4 + 2] = this.rgb[i * 3 + 2]; this.col[i * 4 + 3] = a;
      if (this.life[i] <= 0) { this.size[i] = 0; this.col[i * 4 + 3] = 0; }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.col.needsUpdate = true; this.geo.attributes.size.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.size.fill(0); }
}

/* Persistent ambient particles (petals, snow, embers, fireflies) that wrap in a box. */
class Ambient {
  constructor(o) {
    const n = Math.round(o.n * (QUALITY.pr < 1.2 ? .6 : 1));
    this.n = n; this.o = o;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 4); this.size = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.ph = new Float32Array(n);
    const c = new COL(o.color), c2 = new COL(o.color2 || o.color);
    const rr = mulberry(o.seed || 3);
    for (let i = 0; i < n; i++) {
      this.pos[i * 3] = o.cx + (rr() * 2 - 1) * o.ax; this.pos[i * 3 + 1] = o.cy + (rr() * 2 - 1) * o.ay; this.pos[i * 3 + 2] = o.cz + (rr() * 2 - 1) * o.az;
      const v = o.vel(rr); this.vel[i * 3] = v[0]; this.vel[i * 3 + 1] = v[1]; this.vel[i * 3 + 2] = v[2];
      this.ph[i] = rr() * 100;
      const k = rr(), cc = c.clone().lerp(c2, k);
      this.col[i * 4] = cc.r; this.col[i * 4 + 1] = cc.g; this.col[i * 4 + 2] = cc.b; this.col[i * 4 + 3] = o.alpha == null ? .9 : o.alpha;
      this.size[i] = o.size * (0.6 + rr() * 0.8);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('col', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo = g; this.mat = pointsMat(o.tex, o.blending || THREE.NormalBlending);
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 4;
  }
  update(dt, t) {
    const o = this.o, n = this.n, P = this.pos;
    for (let i = 0; i < n; i++) {
      const ph = this.ph[i];
      P[i * 3] += (this.vel[i * 3] + Math.sin(t * 1.3 + ph) * (o.sway || 0)) * dt;
      P[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      P[i * 3 + 2] += (this.vel[i * 3 + 2] + Math.cos(t * 1.1 + ph) * (o.sway || 0)) * dt;
      if (P[i * 3 + 1] < o.cy - o.ay) P[i * 3 + 1] += o.ay * 2; else if (P[i * 3 + 1] > o.cy + o.ay) P[i * 3 + 1] -= o.ay * 2;
      if (P[i * 3] < o.cx - o.ax) P[i * 3] += o.ax * 2; else if (P[i * 3] > o.cx + o.ax) P[i * 3] -= o.ax * 2;
      if (P[i * 3 + 2] < o.cz - o.az) P[i * 3 + 2] += o.az * 2; else if (P[i * 3 + 2] > o.cz + o.az) P[i * 3 + 2] -= o.az * 2;
      if (o.twinkle) this.col[i * 4 + 3] = Math.max(0, Math.sin(t * o.twinkle + ph)) * (o.alpha == null ? 1 : o.alpha);
    }
    this.geo.attributes.position.needsUpdate = true;
    if (o.twinkle) this.geo.attributes.col.needsUpdate = true;
  }
}

/* Sword swing ribbon: follows blade base & tip; brightness from tip speed. */
class Trail {
  constructor(color, n) {
    this.n = n || 16; this.samples = [];
    const g = new THREE.BufferGeometry();
    this.posA = new Float32Array(this.n * 6); this.colA = new Float32Array(this.n * 8);
    g.setAttribute('position', new THREE.BufferAttribute(this.posA, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.colA, 4));
    const idx = []; for (let i = 0; i < this.n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.c = new COL(color); this.geo = g; this.boost = 0;
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
    this.lastTip = null;
  }
  sample(base, tip, dt) {
    let speed = 0;
    if (this.lastTip && dt > 0) speed = this.lastTip.distanceTo(tip) / dt;
    this.lastTip = (this.lastTip || new V3()).copy(tip);
    const a = clamp((speed - 2.2) / 6, 0, 1) + this.boost;
    this.samples.unshift({ b: base.clone(), t: tip.clone(), a: clamp(a, 0, 1.4) });
    if (this.samples.length > this.n) this.samples.pop();
    this.boost = Math.max(0, this.boost - dt * 2);
    const n = this.n, last = this.samples[this.samples.length - 1];
    for (let i = 0; i < n; i++) {
      const s = this.samples[i] || last;
      const k = i / (n - 1), fade = this.samples[i] ? s.a * Math.pow(1 - k, 1.4) : 0;
      this.posA[i * 6] = s.b.x; this.posA[i * 6 + 1] = s.b.y; this.posA[i * 6 + 2] = s.b.z;
      this.posA[i * 6 + 3] = s.t.x; this.posA[i * 6 + 4] = s.t.y; this.posA[i * 6 + 5] = s.t.z;
      this.colA[i * 8] = this.c.r; this.colA[i * 8 + 1] = this.c.g; this.colA[i * 8 + 2] = this.c.b; this.colA[i * 8 + 3] = fade * .15;
      this.colA[i * 8 + 4] = lerp(this.c.r, 1, .35); this.colA[i * 8 + 5] = lerp(this.c.g, 1, .35); this.colA[i * 8 + 6] = lerp(this.c.b, 1, .35); this.colA[i * 8 + 7] = fade * .85;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
  reset() { this.samples.length = 0; this.lastTip = null; this.colA.fill(0); this.geo.attributes.color.needsUpdate = true; }
}

/* ---------- FX manager ---------- */
const FX = {
  add: null, norm: null, petal: null, debris: [], scene: null,
  init() {
    this.add = new PSys(900, TEX.glow, THREE.AdditiveBlending);
    this.norm = new PSys(420, TEX.smoke, THREE.NormalBlending);
    this.petal = new PSys(420, TEX.petal, THREE.NormalBlending);
    this.setScale();
  },
  attach(scene) {
    if (!this.add) return;
    [this.add, this.norm, this.petal].forEach(p => { if (p.pts.parent) p.pts.parent.remove(p.pts); p.clear(); scene.add(p.pts); });
    this.debris = []; this.scene = scene;
  },
  setScale() {
    if (!this.add || !CAM) return;
    const s = VH * QUALITY.pr / (2 * Math.tan(CAM.fov * Math.PI / 360));
    [this.add, this.norm, this.petal].forEach(p => { p.mat.uniforms.scale.value = s; });
    if (CURWORLD && CURWORLD.ambient) CURWORLD.ambient.forEach(a => { a.mat.uniforms.scale.value = s; });
  },
  sparks(p, color, n, spd, size) {
    n = n || 14; spd = spd || 4;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.acos(rnd(-1, 1)), sp = spd * rnd(.4, 1.2);
      this.add.emit(p.x, p.y, p.z, Math.sin(b) * Math.cos(a) * sp, Math.cos(b) * sp + 1.2, Math.sin(b) * Math.sin(a) * sp, rnd(.25, .55), (size || .07) * rnd(.7, 1.3), 0, color, 1, 7, 1.5);
    }
  },
  glowBurst(p, color, size, life) { this.add.emit(p.x, p.y, p.z, 0, 0, 0, life || .35, size * .4, size, color, 1, 0, 0); },
  puff(p, n, color, size) {
    n = n || 8; size = size || .5;
    for (let i = 0; i < n; i++) this.norm.emit(p.x + rnd(-.1, .1), p.y + rnd(-.1, .1), p.z + rnd(-.1, .1), rnd(-.8, .8), rnd(.2, 1.1), rnd(-.8, .8), rnd(.6, 1.1), size * .5, size * rnd(1.3, 2), color || '#ffffff', .75, -.3, 2.5);
  },
  petals(p, n, color, spd) {
    n = n || 20; spd = spd || 2.5;
    for (let i = 0; i < n; i++) this.petal.emit(p.x, p.y, p.z, rnd(-1, 1) * spd, rnd(.2, 1.4) * spd, rnd(-1, 1) * spd, rnd(1.2, 2.4), .09, .07, color || '#ffb3d1', 1, .9, 1.8, 3);
  },
  chips(p, color, n, spd) {
    n = n || 10; spd = spd || 3;
    for (let i = 0; i < n; i++) this.petal.emit(p.x, p.y, p.z, rnd(-1, 1) * spd, rnd(.3, 1.3) * spd, rnd(-1, 1) * spd, rnd(.5, 1.0), .06, .05, color, 1, 9, .6, 0);
  },
  addDebris(obj, vel, spin, floor) { this.debris.push({ o: obj, v: vel, w: spin, f: floor == null ? .07 : floor, rest: false, t: 0 }); },
  update(dt) {
    this.add.update(dt); this.norm.update(dt); this.petal.update(dt);
    for (const d of this.debris) {
      d.t += dt;
      if (d.rest) continue;
      d.v.y -= 9.8 * dt;
      d.o.position.addScaledVector(d.v, dt);
      d.o.rotation.x += d.w.x * dt; d.o.rotation.y += d.w.y * dt; d.o.rotation.z += d.w.z * dt;
      if (d.o.position.y < d.f) {
        d.o.position.y = d.f;
        if (Math.abs(d.v.y) > 1.2) this.puff(d.o.position, 2, '#d9cdb8', .25);
        d.v.y = Math.abs(d.v.y) * .32; d.v.x *= .55; d.v.z *= .55; d.w.multiplyScalar(.5);
        if (d.v.length() < .35) d.rest = true;
      }
    }
  },
};

/* ---------- 2D overlay (swipe trail, rings, popups, flashes) ---------- */
const OV = { cv: null, c: null, dpr: 1, trail: [], pops: [], flash: 0, flashCol: '255,255,255', vig: 0, vigCol: '255,40,30', draw: null, trailCol: '255,255,255' };
function init2D() { OV.cv = document.getElementById('fx2d'); OV.c = OV.cv.getContext('2d'); resize2D(); }
function resize2D() {
  if (!OV.cv) return;
  OV.dpr = Math.min(2, window.devicePixelRatio || 1);
  OV.cv.width = Math.round(VW * OV.dpr); OV.cv.height = Math.round(VH * OV.dpr);
}
function ovPop(x, y, text, o) {
  o = o || {};
  OV.pops.push({ x, y, text, t: 0, life: o.life || .9, size: o.size || 30, color: o.color || '#fff', stroke: o.stroke || '#2a0c00', vy: o.vy == null ? -60 : o.vy, burst: o.burst, rot: o.rot || 0, font: o.font || 'Shojumaru' });
}
function drawOverlay(dt) {
  const c = OV.c; if (!c) return;
  c.setTransform(OV.dpr, 0, 0, OV.dpr, 0, 0);
  c.clearRect(0, 0, VW, VH);
  if (OV.draw) OV.draw(c, dt);
  // swipe trail
  const now = performance.now();
  OV.trail = OV.trail.filter(p => now - p.t < 170);
  if (OV.trail.length > 1) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < OV.trail.length; i++) {
        const a = OV.trail[i - 1], b = OV.trail[i];
        const k = 1 - (now - b.t) / 170;
        c.strokeStyle = pass === 0 ? `rgba(${OV.trailCol},${k * .35})` : `rgba(255,255,255,${k * .9})`;
        c.lineWidth = (pass === 0 ? 22 : 6) * k + 1;
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
    }
  }
  // popups
  for (const p of OV.pops) {
    p.t += dt;
    const k = p.t / p.life;
    const sc = k < .15 ? lerp(1.8, 1, k / .15) : 1;
    const al = k > .7 ? 1 - (k - .7) / .3 : 1;
    c.save(); c.globalAlpha = Math.max(0, al);
    c.translate(p.x, p.y + p.vy * p.t); c.rotate(p.rot); c.scale(sc, sc);
    if (p.burst) {
      c.fillStyle = p.burst; c.beginPath();
      const n = 12, r1 = p.size * 1.9, r2 = p.size * 1.15;
      for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1; c.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * .8); }
      c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = '#1a0800'; c.stroke();
    }
    c.font = `${p.size}px ${p.font}, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(4, p.size * .16); c.strokeStyle = p.stroke; c.strokeText(p.text, 0, 0);
    c.fillStyle = p.color; c.fillText(p.text, 0, 0);
    c.restore();
  }
  OV.pops = OV.pops.filter(p => p.t < p.life);
  if (OV.flash > 0) { c.fillStyle = `rgba(${OV.flashCol},${OV.flash})`; c.fillRect(0, 0, VW, VH); OV.flash = Math.max(0, OV.flash - dt * 3.5); }
  if (OV.vig > 0) {
    const g = c.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .3, VW / 2, VH / 2, Math.max(VW, VH) * .75);
    g.addColorStop(0, `rgba(${OV.vigCol},0)`); g.addColorStop(1, `rgba(${OV.vigCol},${OV.vig * .75})`);
    c.fillStyle = g; c.fillRect(0, 0, VW, VH); OV.vig = Math.max(0, OV.vig - dt * 1.6);
  }
}
function drawRing(c, x, y, r, approach, color, label) {
  c.save();
  if (approach > 0) { c.strokeStyle = `rgba(${color},.6)`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r * (1 + approach * 1.6), 0, Math.PI * 2); c.stroke(); }
  c.shadowColor = `rgba(${color},1)`; c.shadowBlur = 20;
  c.strokeStyle = `rgba(${color},1)`; c.lineWidth = 6; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  c.shadowBlur = 0; c.fillStyle = `rgba(${color},.16)`; c.fill();
  if (label) { c.font = `900 ${Math.round(r * .34)}px 'Zen Maru Gothic', sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(label, x, y); c.fillStyle = '#fff'; c.fillText(label, x, y); }
  c.restore();
}

/* ---------- camera shake / time ---------- */
const TIME = { scale: 1, slowT: 0, slowTo: 1, hitstop: 0 };
function slowmo(scale, dur) { TIME.slowTo = scale; TIME.slowT = dur; }
function hitstop(ms) { TIME.hitstop = Math.max(TIME.hitstop, ms / 1000); }
const SHAKE = { a: 0, fov: 0 };
function shake(a) { SHAKE.a = Math.max(SHAKE.a, a); }
function applyShake(dt) {
  if (SHAKE.a > 0.0005) {
    CAM.position.x += rnd(-1, 1) * SHAKE.a; CAM.position.y += rnd(-1, 1) * SHAKE.a; CAM.position.z += rnd(-1, 1) * SHAKE.a * .5;
    SHAKE.a *= Math.exp(-dt * 9);
  }
}

/* ---------- audio ---------- */
const AUD = {
  ctx: null, master: null, sfxG: null, musG: null, noiseBuf: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const a = this.ctx;
    this.master = a.createGain(); this.master.gain.value = .9; this.master.connect(a.destination);
    this.sfxG = a.createGain(); this.sfxG.gain.value = S.sound ? 1 : 0; this.sfxG.connect(this.master);
    this.musG = a.createGain(); this.musG.gain.value = S.music ? .55 : 0; this.musG.connect(this.master);
    const len = a.sampleRate * 1.2, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    if (MUSIC.want) { const w = MUSIC.want; MUSIC.mode = null; MUSIC.start(w); }
  },
  setSound(on) { if (this.sfxG) this.sfxG.gain.value = on ? 1 : 0; },
  setMusic(on) { if (this.musG) this.musG.gain.value = on ? .55 : 0; },
  noise(dur, freq, q, vol, type, when, out) {
    const a = this.ctx; if (!a) return;
    const t = when || a.currentTime;
    const s = a.createBufferSource(); s.buffer = this.noiseBuf;
    const f = a.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out || this.sfxG); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
    return f;
  },
  tone(freq, dur, vol, type, slide, when, out, attack) {
    const a = this.ctx; if (!a) return;
    const t = when || a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(out || this.sfxG); o.start(t); o.stop(t + dur + .05);
  },
};
const sfx = {
  slash(k) { const f = AUD.noise(.2, 2600, .9, .35 * (k || 1), 'bandpass'); if (f && AUD.ctx) f.frequency.exponentialRampToValueAtTime(700, AUD.ctx.currentTime + .18); },
  whoosh() { const f = AUD.noise(.35, 500, .7, .25, 'bandpass'); if (f && AUD.ctx) f.frequency.exponentialRampToValueAtTime(1800, AUD.ctx.currentTime + .3); },
  clang(k) { k = k || 1; AUD.tone(1500 * rnd(.95, 1.05), .5, .16 * k, 'triangle'); AUD.tone(2250, .32, .1 * k); AUD.tone(3400, .2, .05 * k); AUD.noise(.07, 5000, 1.5, .25 * k, 'highpass'); },
  hit() { AUD.noise(.14, 380, 1, .6, 'lowpass'); AUD.tone(130, .16, .35, 'square', .45); },
  chop() { AUD.noise(.3, 300, .7, .7, 'lowpass'); AUD.tone(90, .35, .45, 'sine', .4); setTimeout(() => AUD.tone(620, .18, .14, 'triangle', 2), 60); },
  poof() { AUD.noise(.4, 260, .6, .45, 'lowpass'); AUD.tone(420, .28, .12, 'triangle', 2.2); },
  hurt() { AUD.tone(170, .3, .3, 'sawtooth', .45); AUD.noise(.16, 700, 1, .3); },
  parry() { sfx.clang(1.4); [1320, 1760, 2640].forEach((f, i) => AUD.tone(f, .5, .07, 'sine', 1, AUD.ctx ? AUD.ctx.currentTime + i * .05 : 0)); },
  taiko(v) { AUD.tone(78, .55, .7 * (v || 1), 'sine', .5); AUD.noise(.12, 160, .8, .5 * (v || 1), 'lowpass'); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => AUD.tone(f, .5, .14, 'triangle'), i * 110)); setTimeout(() => sfx.taiko(1.2), 0); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => AUD.tone(f, .55, .13, 'triangle'), i * 170)); },
  coin() { AUD.tone(1320, .12, .12, 'square'); setTimeout(() => AUD.tone(1760, .2, .1, 'square'), 70); },
  up() { [660, 880, 1320, 1760].forEach((f, i) => setTimeout(() => AUD.tone(f, .3, .12, 'triangle'), i * 85)); },
  tick() { AUD.tone(900, .05, .07, 'square'); },
  warn() { AUD.tone(440, .14, .07, 'triangle', 1.5); },
  special() { [392, 523, 659, 784, 1047, 1568].forEach((f, i) => setTimeout(() => AUD.tone(f, .45, .1, 'sawtooth'), i * 45)); sfx.whoosh(); },
  forge() { sfx.clang(.9); setTimeout(() => sfx.clang(.7), 160); setTimeout(() => { AUD.noise(.5, 1200, .5, .2, 'highpass'); }, 320); },
  ui() { AUD.tone(720, .06, .06, 'triangle'); },
};

/* Procedural music: koto plucks on a pentatonic scale over taiko drums. */
const MUSIC = {
  mode: null, timer: null, next: 0, step: 0, rng: null,
  want: null,
  start(mode) {
    this.want = mode;
    if (!AUD.ctx) return;
    if (this.mode === mode) return;
    this.mode = mode; this.step = 0; this.next = AUD.ctx.currentTime + .15; this.rng = mulberry(mode === 'fight' ? 11 : mode === 'train' ? 5 : 2);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 90);
  },
  stop() { this.mode = null; },
  tick() {
    const a = AUD.ctx; if (!a || !this.mode) return;
    const bpm = this.mode === 'fight' ? 132 : this.mode === 'train' ? 104 : 78;
    const st = 60 / bpm / 2;
    const root = this.mode === 'fight' ? 146.83 : 130.81;
    const scale = [0, 3, 5, 7, 10, 12, 15, 17];
    while (this.next < a.currentTime + .3) {
      const s = this.step % 32, t = this.next, out = AUD.musG;
      const bar = Math.floor(this.step / 32) % 4;
      if (this.mode === 'fight') {
        if (s % 8 === 0) { AUD.tone(70, .5, .5, 'sine', .5, t, out); AUD.noise(.1, 150, .8, .35, 'lowpass', t, out); }
        if (s % 8 === 6 || s === 30 || s === 31) { AUD.tone(110, .25, .22, 'sine', .55, t, out); }
        if (s % 4 === 2) AUD.noise(.04, 6000, 2, .05, 'highpass', t, out);
      } else if (s % 16 === 0) { AUD.tone(65, .9, .32, 'sine', .55, t, out); }
      if (s % 32 === 0) AUD.tone(root / 2 * Math.pow(2, [0, 0, -2, 3][bar] / 12), st * 30, .045, 'sawtooth', 1, t, out, .4);
      const dens = this.mode === 'fight' ? .55 : .38;
      if (this.rng() < dens && (s % 2 === 0 || this.mode === 'fight')) {
        const deg = scale[(this.rng() * scale.length) | 0], f = root * 2 * Math.pow(2, deg / 12);
        AUD.tone(f, .7, .07, 'triangle', 1, t, out, .004); AUD.tone(f * 2, .35, .025, 'sine', 1, t, out, .004);
      }
      this.next += st; this.step++;
    }
  },
};

/* ---------- active world ---------- */
let CURWORLD = null;
function disposeWorld(w) {
  if (!w) return;
  w.scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && !Object.values(TEX).includes(m.map)) m.map.dispose(); if (!Object.values(_olCache).includes(m)) m.dispose(); }); }
  });
}
