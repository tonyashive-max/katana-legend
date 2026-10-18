'use strict';
/* ===== Worlds: four chapter battlefields + the training dojo ===== */

function smooth(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
let POI_CLEAR = null;
function newWorld(kind) {
  const scene = new THREE.Scene();
  return { kind, scene, ambient: [], updaters: [], hAt: () => 0, rays: [], obs: [] };
}
function obs(W, x, z, r) { W.obs.push({ x, z, r }); }
const clearOK = (x, z) => !(POI_CLEAR && POI_CLEAR(x, z));
function makePoiClear(kind) {
  const L = typeof kind === 'number' ? LANDS[kind] : null;
  if (!L) return null;
  const big = [L.spawn, L.shrine, L.gate].concat(L.warriors), small = L.orbs;
  return (x, z) => big.some(([px, pz]) => (x - px) * (x - px) + (z - pz) * (z - pz) < 4.4 * 4.4) || small.some(([px, pz]) => (x - px) * (x - px) + (z - pz) * (z - pz) < 2.2 * 2.2);
}
function addLights(W, o) {
  const h = new THREE.HemisphereLight(o.sky, o.ground, o.hemi * .72);
  W.scene.add(h);
  const k = new THREE.DirectionalLight(o.key, o.keyI * .8);
  k.position.copy(o.keyDir).normalize().multiplyScalar(22).add(new V3(0, 0, 1.3));
  k.target.position.set(0, 0, 1.3);
  k.castShadow = QUALITY.shadows;
  k.shadow.mapSize.set(QUALITY.pr > 1.4 ? 2048 : 1024, QUALITY.pr > 1.4 ? 2048 : 1024);
  const sc = k.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 2; sc.far = 50;
  k.shadow.bias = -0.0006; k.shadow.normalBias = 0.02;
  W.scene.add(k, k.target);
  const r = new THREE.DirectionalLight(o.rim, o.rimI * .6);
  r.position.copy(o.rimDir).normalize().multiplyScalar(20);
  W.scene.add(r);
  W.key = k; W.rim = r; W.hemi = h;
}
function addSky(W, o) {
  W.sky = makeSky(o); W.scene.add(W.sky);
  W.scene.fog = new THREE.Fog(o.fog, o.fogNear, o.fogFar);
  W.scene.background = new COL(o.fog);
  W.sunDir = o.sunDir.clone().normalize();
}
function addGround(W, o) {
  const seg = 110, size = o.size || 240;
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const ca = new COL(o.a), cb = new COL(o.b), cc = new COL(o.c || o.b), tmp = new COL();
  const hf = (x, z) => {
    const r = Math.hypot(x, z);
    const hills = smooth(o.clear || 7, (o.clear || 7) + 14, r) * (fbm(x * .05, z * .05) - .3) * (o.hill || 3);
    const rim = r > 45 ? (r - 45) * (o.rise || .18) : 0;
    return Math.max(0, hills + rim);
  };
  W.hAt = hf;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, hf(x, z));
    const n = fbm(x * .11 + 10, z * .11);
    tmp.copy(ca).lerp(cb, smooth(.3, .7, n));
    if (o.pattern) o.pattern(x, z, tmp, n);
    const r = Math.hypot(x, z); if (r > 30) tmp.lerp(cc, smooth(30, 80, r) * .7);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, toon({ vertexColors: true, flatShading: !!o.flat }));
  m.receiveShadow = true; W.scene.add(m); W.ground = m;
}
function addArena(W, o) {
  const disc = new THREE.CircleGeometry(o.r || 4.6, 72); disc.rotateX(-Math.PI / 2);
  const pos = disc.attributes.position, col = new Float32Array(pos.count * 3);
  const a = new COL(o.a), b = new COL(o.b), t = new COL();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    t.copy(a).lerp(b, (Math.sin(r * (o.rings || 9)) * .5 + .5) * .7);
    col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b;
  }
  disc.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(disc, toon({ vertexColors: true })); m.position.y = .015; m.receiveShadow = true; W.scene.add(m);
  if (o.stone) {
    const list = []; const n = 46, R = (o.r || 4.6) + .25;
    for (let i = 0; i < n; i++) { const ang = i / n * Math.PI * 2; list.push({ p: [Math.cos(ang) * R, .05, Math.sin(ang) * R], r: [rnd(0, 3), rnd(0, 3), 0], s: [rnd(.28, .38), rnd(.16, .24), rnd(.28, .38)], c: shadeHex(o.stone, rnd(-.15, .1)) }); }
    W.scene.add(inst(GEO.dodec(1), toon({ flatShading: true }), list));
  }
  if (o.glowRing) {
    const ring = new THREE.Mesh(GEO.tor((o.r || 4.6) + .05, .04, 6, 96), new THREE.MeshBasicMaterial({ color: o.glowRing, fog: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = .03; W.scene.add(ring);
    const ring2 = new THREE.Mesh(GEO.tor((o.r || 4.6) * .55, .025, 6, 72), new THREE.MeshBasicMaterial({ color: o.glowRing, fog: false }));
    ring2.rotation.x = Math.PI / 2; ring2.position.y = .03; W.scene.add(ring2);
    W.updaters.push((dt, tt) => { const k = .75 + Math.sin(tt * 2.2) * .25; ring.material.color.set(o.glowRing).multiplyScalar(k); ring2.material.color.set(o.glowRing).multiplyScalar(k); });
  }
}
function addMountains(W, o) {
  const g = merge([P(GEO.cone(1, 1, 7, 4), o.base, [0, .5, 0], null, null, (x, y) => {
    const k = y + .5; return k > (o.snowLine || 2) ? new COL(o.snow) : new COL(o.base).lerp(new COL(o.top || o.base), k);
  })]);
  const pa = g.attributes.position.array;
  for (let i = 0; i < pa.length; i += 3) { if (pa[i + 1] > .02 && pa[i + 1] < .98) { const n = hash2(Math.round(pa[i] * 50), Math.round(pa[i + 2] * 50 + pa[i + 1] * 30)); pa[i] *= .85 + n * .3; pa[i + 2] *= .85 + n * .3; } }
  const list = [], rr = mulberry(o.seed || 9);
  for (let i = 0; i < (o.n || 22); i++) {
    const ang = (o.a0 == null ? -1.3 : o.a0) + rr() * ((o.a1 == null ? 1.3 : o.a1) - (o.a0 == null ? -1.3 : o.a0));
    const R = lerp(o.r0 || 90, o.r1 || 170, rr()), h = lerp(o.h0 || 25, o.h1 || 60, rr());
    list.push({ p: [Math.sin(ang) * R, -2, Math.cos(ang) * R], r: [0, rr() * 6, 0], s: [h * lerp(.8, 1.3, rr()), h, h * lerp(.8, 1.3, rr())] });
  }
  W.scene.add(inst(g, toon({ vertexColors: true, flatShading: true }), list));
}
function addRays(W, color, n, z) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(rnd(2.5, 5), 46), new THREE.MeshBasicMaterial({ map: TEX.ray, color, transparent: true, opacity: rnd(.08, .16), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.position.set(rnd(-16, 16), 14, z + rnd(-4, 6)); m.rotation.z = rnd(-.35, -.15);
    m.userData.base = m.material.opacity; m.userData.ph = rnd(0, 9);
    W.scene.add(m); W.rays.push(m);
  }
  W.updaters.push((dt, t) => W.rays.forEach(r => { r.rotation.y = Math.atan2(CAM.position.x - r.position.x, CAM.position.z - r.position.z); r.material.opacity = r.userData.base * (.6 + .4 * Math.sin(t * .5 + r.userData.ph)); }));
}
function scatter(n, r0, r1, seed, avoid) {
  const out = [], rr = mulberry(seed || 1); let guard = 0;
  while (out.length < n && guard++ < n * 30) {
    const ang = rr() * Math.PI * 2, r = lerp(r0, r1, Math.sqrt(rr()));
    const x = Math.sin(ang) * r, z = Math.cos(ang) * r;
    if (avoid && avoid(x, z)) continue;
    if (!clearOK(x, z)) continue;
    out.push([x, z, rr()]);
  }
  return out;
}
/* lane between the fighters and behind the player camera stays clear */
const laneClear = (x, z) => (Math.abs(x) < 3.2 && z > -9 && z < 9);

/* ---- ground cover & sky dressing ---- */
function addGrass(W, o) {
  const blade = (rot, h, lean) => P(GEO.cone(.035, h, 4), o.base, [Math.sin(rot) * .05, h / 2, Math.cos(rot) * .05], [lean * Math.cos(rot), rot, lean * Math.sin(rot) * -1], null,
    (x, y) => new COL(o.base).lerp(new COL(o.tip), clamp((y + h / 2) / h, 0, 1)));
  const g = merge([blade(0, .42, .25), blade(2.1, .34, .3), blade(4.2, .38, .2), blade(1.2, .3, .35), blade(3.3, .36, .28)]);
  const list = scatter(o.n || 1400, o.r0 || 5.2, o.r1 || 32, o.seed || 77, o.avoid).map(([x, z, k]) => ({ p: [x, W.hAt(x, z), z], r: [0, k * 6, 0], s: .7 + k * .9, c: pick(o.tints || ['#ffffff']) }));
  W.scene.add(inst(g, toon({ vertexColors: true }), list));
  if (o.flowers) {
    const fl = scatter(o.flowers, (o.r0 || 5.2) + .3, o.r1 || 28, (o.seed || 77) + 5, o.avoid).map(([x, z, k]) => ({ p: [x, W.hAt(x, z) + .32, z], s: .05 + k * .03, c: pick(o.flowerCols || ['#ffffff', '#ffe27a', '#ff9ec4']) }));
    W.scene.add(inst(GEO.ico(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), fl));
  }
}
function addClouds(W, o) {
  const rr = mulberry(o.seed || 41), list = [];
  for (let i = 0; i < (o.n || 14); i++) {
    const a = (o.a0 == null ? -1.4 : o.a0) + rr() * ((o.a1 == null ? 1.4 : o.a1) - (o.a0 == null ? -1.4 : o.a0)), R = 180 + rr() * 120;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, color: o.color, transparent: true, opacity: o.opacity || .8, depthWrite: false, fog: false }));
    sp.position.set(Math.sin(a) * R, (o.y0 || 35) + rr() * (o.y1 || 45), Math.cos(a) * R); sp.scale.set(90 + rr() * 110, 45 + rr() * 40, 1);
    sp.userData.v = (rr() - .5) * .02; sp.renderOrder = -5; W.scene.add(sp); list.push(sp);
  }
  W.updaters.push(dt => list.forEach(sp => { const a = Math.atan2(sp.position.x, sp.position.z) + sp.userData.v * dt, R = Math.hypot(sp.position.x, sp.position.z); sp.position.x = Math.sin(a) * R; sp.position.z = Math.cos(a) * R; }));
}

/* ---- shared props ---- */
function stoneLanternGeo(stone) {
  return merge([
    P(GEO.box(.6, .18, .6), stone, [0, .09, 0]),
    P(GEO.cyl(.13, .16, .9, 8), stone, [0, .63, 0]),
    P(GEO.box(.5, .12, .5), stone, [0, 1.12, 0]),
    P(GEO.box(.42, .36, .42), shadeHex(stone, -.15), [0, 1.36, 0]),
    P(GEO.cone(.52, .32, 4), stone, [0, 1.7, 0], [0, Math.PI / 4, 0]),
    P(GEO.sph(.07, 8, 6), stone, [0, 1.9, 0]),
  ]);
}
function addLanterns(W, spots, stone, light) {
  spots = spots.filter(([x, z]) => clearOK(x, z));
  spots.forEach(([x, z, sc]) => obs(W, x, z, .45 * (sc || 1)));
  W.scene.add(inst(stoneLanternGeo(stone), toon({ vertexColors: true, flatShading: true }), spots.map(([x, z, s]) => ({ p: [x, W.hAt(x, z), z], r: [0, rnd(0, 3), 0], s: s || 1 })), true));
  const lights = inst(GEO.box(.3, .26, .3), new THREE.MeshBasicMaterial({ color: light, fog: false }), spots.map(([x, z, s]) => ({ p: [x, W.hAt(x, z) + 1.36 * (s || 1), z], s: [(s || 1) * 1.02, (s || 1) * 1.02, (s || 1) * 1.02] })));
  W.scene.add(lights);
  spots.forEach(([x, z, s]) => { const h = halo(light, 2.2 * (s || 1), .7); h.position.set(x, W.hAt(x, z) + 1.36 * (s || 1), z); W.scene.add(h); });
}
function toriiGeo(red, black) {
  return merge([
    P(GEO.cyl(.22, .26, 5, 12), red, [-2, 2.5, 0]),
    P(GEO.cyl(.22, .26, 5, 12), red, [2, 2.5, 0]),
    P(GEO.box(.6, .5, .6), black, [-2, .25, 0]),
    P(GEO.box(.6, .5, .6), black, [2, .25, 0]),
    P(GEO.box(5.2, .32, .36), red, [0, 4.1, 0]),
    P(GEO.box(6.4, .34, .55), red, [0, 4.85, 0], [0, 0, 0]),
    P(GEO.box(6.9, .22, .62), black, [0, 5.1, 0]),
    P(GEO.box(.32, .8, .3), red, [0, 4.5, 0]),
  ]);
}
function addCherryTrees(W, spots, pinks) {
  const trunk = merge([
    P(GEO.cyl(.16, .3, 3.2, 8), '#4a2c22', [0, 1.6, 0]),
    P(GEO.cyl(.08, .14, 2, 6), '#4a2c22', [.6, 3.2, 0], [0, 0, -.7]),
    P(GEO.cyl(.08, .14, 2, 6), '#4a2c22', [-.5, 3.3, .2], [.2, 0, .8]),
  ]);
  const trunks = [], blobs = [];
  spots = spots.filter(([x, z]) => clearOK(x, z));
  spots.forEach(([x, z, k]) => {
    obs(W, x, z, .7);
    const s = .8 + k * .6, y = W.hAt(x, z);
    trunks.push({ p: [x, y, z], r: [0, k * 6, 0], s });
    for (let i = 0; i < 6; i++) blobs.push({ p: [x + rnd(-1.6, 1.6) * s, y + (3.6 + rnd(-.3, 1.1)) * s, z + rnd(-1.6, 1.6) * s], r: [rnd(0, 3), rnd(0, 3), 0], s: rnd(1.1, 1.8) * s, c: pick(pinks) });
  });
  W.scene.add(inst(trunk, toon({ vertexColors: true }), trunks, true));
  W.scene.add(inst(GEO.ico(1, 1), toon({ flatShading: true }), blobs, true));
  const patches = spots.map(([x, z, k]) => ({ p: [x, W.hAt(x, z) + .03, z], r: [-Math.PI / 2, 0, 0], s: 2.6 + k * 1.5, c: pick(pinks) }));
  W.scene.add(inst(new THREE.CircleGeometry(1, 14), toon({ transparent: true, opacity: .55 }), patches));
}
function brazier(W, x, z, flameCol) {
  const y = W.hAt(x, z); obs(W, x, z, .45);
  const m = new THREE.Mesh(merge([
    P(GEO.cyl(.08, .1, 1.1, 8), '#2a2420', [0, .55, 0]),
    P(GEO.cyl(.36, .2, .3, 10), '#3a2e26', [0, 1.2, 0]),
    P(GEO.tor(.36, .04, 6, 14), '#6a5236', [0, 1.35, 0], [Math.PI / 2, 0, 0]),
  ]), toon({ vertexColors: true }));
  m.position.set(x, y, z); m.castShadow = true; W.scene.add(m);
  const h = halo(flameCol, 2.6, .8); h.position.set(x, y + 1.55, z); W.scene.add(h);
  W.updaters.push((dt, t) => {
    h.material.opacity = .65 + Math.sin(t * 13 + x) * .1 + Math.sin(t * 7.3) * .08;
    if (Math.random() < dt * 30) FX.add.emit(x + rnd(-.15, .15), y + 1.35, z + rnd(-.15, .15), rnd(-.2, .2), rnd(1.2, 2.2), rnd(-.2, .2), rnd(.35, .6), rnd(.25, .4), .05, flameCol, .9, -.5, 1);
    if (Math.random() < dt * 6) FX.add.emit(x, y + 1.6, z, rnd(-.3, .3), rnd(1.5, 2.5), rnd(-.3, .3), rnd(1, 1.6), .05, .03, '#ffd27a', 1, -.2, .5);
  });
}

/* ================= Chapter 0: Bamboo Village (sunset) ================= */
function worldBamboo() {
  const W = newWorld(0);
  const sun = new V3(.18, .1, 1);
  addSky(W, { top: '#2c2160', mid: '#ff9566', bot: '#ffcf8a', sunDir: sun, sunCol: '#ffd9a0', sunDeg: 5.5, fog: '#f0a07e', fogNear: 22, fogFar: 140, haze: .7 });
  addLights(W, { sky: '#ffd6b0', ground: '#4a3a5a', hemi: .75, key: '#ffe2c0', keyI: .95, keyDir: new V3(-.6, 1, -.4), rim: '#ff8a4a', rimI: 1.1, rimDir: new V3(.1, .5, 1) });
  addGround(W, { a: '#6f8a3c', b: '#8a9a48', c: '#c08a6a', clear: 7, hill: 2.5, flat: true });
  addArena(W, { a: '#c9b080', b: '#b0965f', rings: 10, stone: '#7a7468' });
  addMountains(W, { base: '#6a4a7a', top: '#b06a7a', snow: '#ffd0c0', snowLine: .82, r0: 80, r1: 160, h0: 22, h1: 55 });
  addMountains(W, { base: '#5a4070', top: '#8a5a7a', snow: '#ffd0c0', snowLine: .9, r0: 70, r1: 120, h0: 16, h1: 30, a0: 1.8, a1: 4.5, seed: 4, n: 14 });
  // bamboo groves
  const stalk = merge([P(GEO.cyl(.06, .07, 1, 7), '#6aa83a', [0, .5, 0])].concat([1, 2, 3, 4, 5, 6, 7].map(k => P(GEO.cyl(.074, .074, .018, 7), '#3f7a24', [0, k / 8, 0]))));
  const stalks = [], leaves = [];
  const greens = ['#7bc043', '#5e9e34', '#8fd14f', '#4f8f2c', '#a4c65a'];
  const groves = [[-9, 6, 40], [9, 9, 40], [-7, 22, 34], [8, 24, 34], [0, 34, 40], [-14, -4, 30], [14, -6, 30], [-4, -14, 24], [5, -15, 24]];
  scatter(14, 17, 38, 101).forEach(([x, z]) => groves.push([x, z, 16]));
  groves.forEach(([gx, gz, n], gi) => {
    const rr = mulberry(gi * 13 + 5);
    for (let i = 0; i < n; i++) {
      const x = gx + (rr() - .5) * 9, z = gz + (rr() - .5) * 9;
      if (laneClear(x, z) || Math.hypot(x, z) < 6 || !clearOK(x, z)) continue;
      obs(W, x, z, .2);
      const h = 6 + rr() * 6, y = W.hAt(x, z);
      stalks.push({ p: [x, y, z], r: [(rr() - .5) * .12, rr() * 6, (rr() - .5) * .12], s: [1 + rr() * .6, h, 1 + rr() * .6], c: pick(greens) });
      if (rr() < .7) leaves.push({ p: [x + (rr() - .5) * 1.2, y + h * (.75 + rr() * .3), z + (rr() - .5) * 1.2], r: [0, rr() * 6, 0], s: [1.1 + rr(), .35 + rr() * .2, 1.1 + rr()], c: pick(['#3f7a24', '#5a9a30', '#2f6a20']) });
    }
  });
  W.scene.add(inst(stalk, toon({ vertexColors: true }), stalks, true));
  W.scene.add(inst(GEO.ico(1, 0), toon({ flatShading: true }), leaves, false));
  addCherryTrees(W, [[-6, 12, .5], [6.5, 14, .8], [-12, 18, .3], [12, 2, .6], [-11, -10, .7], [10, -11, .4], [3, 26, .9]].concat(scatter(12, 15, 38, 103)), ['#ffb7d0', '#ff9ec4', '#ffd0e0', '#ff8fbf']);
  W.scene.add(inst(GEO.dodec(1), toon({ color: '#8a8478', flatShading: true }), scatter(45, 9, 38, 105, laneClear).map(([x, z, k]) => { obs(W, x, z, .4 + k * .9); return { p: [x, W.hAt(x, z), z], r: [k * 3, k * 5, 0], s: [.4 + k * 1.1, .3 + k * .7, .4 + k * 1] }; }), true));
  // village houses
  const house = merge([
    P(GEO.box(4, 2.2, 3), '#eadfc6', [0, 1.1, 0]),
    P(GEO.box(4.1, .18, 3.1), '#4a3020', [0, .09, 0]),
    P(GEO.box(4.06, .14, 3.06), '#4a3020', [0, 1.2, 0]),
    ...[-1.9, -.65, .65, 1.9].map(x => P(GEO.box(.14, 2.2, 3.06), '#4a3020', [x, 1.1, 0])),
    P(GEO.cone(3.5, 1.7, 4), '#2f3540', [0, 3.0, 0], [0, Math.PI / 4, 0], [1.35, 1, 1]),
    P(GEO.box(5.2, .16, .3), '#1e2228', [0, 3.82, 0]),
  ]);
  const houses = [[-12, 26, .3], [13, 30, -.4], [-18, 8, .9], [19, 12, -1.1], [0, 44, 0]].filter(([x, z]) => clearOK(x, z)).map(([x, z, ry]) => { obs(W, x, z, 3.1); return { p: [x, W.hAt(x, z), z], r: [0, ry, 0], s: 1.2 }; });
  W.scene.add(inst(house, toon({ vertexColors: true }), houses, true));
  houses.forEach(hh => { const h = halo('#ffc070', 1.6, .55); const a = hh.r[1]; h.position.set(hh.p[0] - Math.sin(a) * 1.9, hh.p[1] + 1.2, hh.p[2] - Math.cos(a) * 1.9); W.scene.add(h); });
  const torii = new THREE.Mesh(toriiGeo('#d7372b', '#1c1416'), toon({ vertexColors: true })); torii.position.set(0, 0, 17); torii.scale.setScalar(1.25); torii.castShadow = true; W.scene.add(torii); obs(W, -2.5, 17, .45); obs(W, 2.5, 17, .45);
  addLanterns(W, [[-3.6, 6.2], [3.6, 6.2], [-6, 1], [6, 1], [-3.8, -4.5], [3.8, -4.5]], '#9a9488', '#ffcf7a');
  addRays(W, '#ffd2a0', 6, 22);
  addGrass(W, { base: '#3f6a22', tip: '#b8d84a', tints: ['#ffffff', '#e8ffd0', '#fff2c0'], n: 1600, flowers: 240, flowerCols: ['#ffffff', '#ffd6e8', '#ffe27a', '#ff9ec4'] });
  addClouds(W, { color: '#ffb59a', n: 16, opacity: .85 });
  // floating petals & sun motes
  W.ambient.push(new Ambient({ n: 420, tex: TEX.petal, color: '#ffb7d0', color2: '#ff8fbf', size: .085, cx: 0, cy: 4, cz: 2, ax: 12, ay: 4.5, az: 12, sway: .7, vel: r => [.4 + r() * .5, -.5 - r() * .4, -.1 + r() * .2] }));
  W.ambient.push(new Ambient({ n: 70, tex: TEX.glow, color: '#ffd9a0', size: .06, alpha: .7, blending: THREE.AdditiveBlending, cx: 0, cy: 2.5, cz: 2, ax: 6, ay: 2.5, az: 6, sway: .2, twinkle: 1.3, vel: r => [r() * .1, r() * .06, r() * .1], seed: 8 }));
  return W;
}

/* ================= Chapter 1: Frozen Pass (moonlit) ================= */
function worldSnow() {
  const W = newWorld(1);
  const moon = new V3(-.35, .42, 1);
  addSky(W, { top: '#0a1534', mid: '#5f84bf', bot: '#c2d6f0', sunDir: moon, sunCol: '#e8f2ff', sunDeg: 3, fog: '#9fb8d8', fogNear: 18, fogFar: 120, stars: true, haze: .3 });
  addLights(W, { sky: '#b8d4ff', ground: '#4a5a7a', hemi: .8, key: '#e6f0ff', keyI: .85, keyDir: new V3(-.5, 1, .6), rim: '#7fd8ff', rimI: 1.0, rimDir: new V3(.2, .6, 1) });
  addGround(W, { a: '#e9f1fa', b: '#cddcef', c: '#b8c9e6', clear: 7, hill: 3.2, flat: true });
  addArena(W, { a: '#d3e6f6', b: '#a9c8e6', rings: 8, stone: '#5d6b80' });
  addMountains(W, { base: '#4d6188', top: '#8aa2c8', snow: '#f4f8ff', snowLine: .45, r0: 80, r1: 170, h0: 30, h1: 70 });
  addMountains(W, { base: '#3e5078', top: '#7088b0', snow: '#f4f8ff', snowLine: .5, r0: 70, r1: 120, h0: 18, h1: 40, a0: 1.6, a1: 4.6, seed: 12, n: 14 });
  const pine = merge([
    P(GEO.cyl(.12, .2, 1.4, 6), '#4a3428', [0, .7, 0]),
    P(GEO.cone(1.6, 2.2, 8), '#1f4a3a', [0, 2.2, 0]), P(GEO.cone(1.45, .5, 8), '#f4f8ff', [0, 2.95, 0]),
    P(GEO.cone(1.25, 1.9, 8), '#235642', [0, 3.5, 0]), P(GEO.cone(1.1, .45, 8), '#f4f8ff', [0, 4.15, 0]),
    P(GEO.cone(.85, 1.6, 8), '#2a6048', [0, 4.7, 0]), P(GEO.cone(.55, .5, 8), '#f4f8ff', [0, 5.35, 0]),
  ]);
  const pines = scatter(150, 8, 60, 21, laneClear).map(([x, z, k]) => { obs(W, x, z, .5 + k * .5); return { p: [x, W.hAt(x, z), z], r: [0, k * 6, 0], s: .9 + k * 1.1 }; });
  W.scene.add(inst(pine, toon({ vertexColors: true, flatShading: true }), pines, true));
  const rock = merge([P(GEO.dodec(1), '#6b7890', [0, 0, 0], null, null, (x, y) => y > .35 ? new COL('#f4f8ff') : new COL('#6b7890'))]);
  W.scene.add(inst(rock, toon({ vertexColors: true, flatShading: true }), scatter(40, 6, 40, 31, laneClear).map(([x, z, k]) => { obs(W, x, z, .6 + k * 1.3); return { p: [x, W.hAt(x, z) + .1, z], r: [k * 3, k * 5, 0], s: [.6 + k * 1.6, .4 + k, .6 + k * 1.4] }; }), true));
  const crystalMat = toon({ color: '#9fe8ff', emissive: new COL('#2a7fa8'), emissiveIntensity: .6, transparent: true, opacity: .9, flatShading: true });
  const crystals = [];
  scatter(26, 6, 22, 41, laneClear).forEach(([x, z, k]) => { obs(W, x, z, .8); for (let i = 0; i < 3; i++) crystals.push({ p: [x + rnd(-.5, .5), W.hAt(x, z) + .3, z + rnd(-.5, .5)], r: [rnd(-.4, .4), rnd(0, 3), rnd(-.4, .4)], s: [.25 + k * .2, .8 + k * 1.6, .25 + k * .2] }); });
  W.scene.add(inst(GEO.oct(1), crystalMat, crystals, false));
  scatter(10, 6, 18, 51, laneClear).forEach(([x, z]) => { const h = halo('#7fe0ff', 2.2, .35); h.position.set(x, W.hAt(x, z) + .8, z); W.scene.add(h); });
  addLanterns(W, [[-3.6, 6.2], [3.6, 6.2], [-6, -1], [6, -1]], '#7a8496', '#ffb860');
  addClouds(W, { color: '#8fa6d6', n: 10, opacity: .55, y0: 45 });
  W.scene.add(inst(GEO.sph(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: '#f2f7fd' }), scatter(70, 5.3, 30, 91, laneClear).map(([x, z, k]) => ({ p: [x, W.hAt(x, z) - .05, z], s: [.6 + k * 1.4, .25 + k * .4, .6 + k * 1.2] }))));
  const torii = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); torii.position.set(0, 0, 18); torii.castShadow = true; W.scene.add(torii); obs(W, -2, 18, .4); obs(W, 2, 18, .4);
  // aurora ribbons
  const auroraMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { time: { value: 0 }, c1: { value: new COL('#3dffb0') }, c2: { value: new COL('#a46bff') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform float time; uniform vec3 c1, c2; void main(){ float w = sin(vUv.x * 11.0 + time * .5) * .5 + .5; float w2 = sin(vUv.x * 29.0 - time * 1.2) * .5 + .5; float a = smoothstep(0.0, .25, vUv.y) * smoothstep(1.0, .35, vUv.y) * (.3 + .7 * w) * (.55 + .45 * w2); vec3 c = mix(c1, c2, vUv.y); gl_FragColor = vec4(c * a, a * .8); }',
  });
  for (let k = 0; k < 2; k++) {
    const g = new THREE.PlaneGeometry(260, 50, 60, 1);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setZ(i, Math.sin(x * .025 + k * 2) * 30); }
    const m = new THREE.Mesh(g, auroraMat); m.position.set(k * 40 - 20, 70 + k * 12, 170 + k * 30); m.rotation.x = -.35; W.scene.add(m);
  }
  W.updaters.push((dt, t) => { auroraMat.uniforms.time.value = t; });
  W.ambient.push(new Ambient({ n: 800, tex: TEX.flake, color: '#ffffff', color2: '#cfe6ff', size: .05, alpha: .9, cx: 0, cy: 5, cz: 2, ax: 14, ay: 6, az: 14, sway: .5, vel: r => [.2 + r() * .3, -.8 - r() * .7, -.1 + r() * .2] }));
  return W;
}

/* ================= Chapter 2: Shadow Castle (night, purple moon) ================= */
function worldCastle() {
  const W = newWorld(2);
  const moon = new V3(-.4, .32, 1);
  addSky(W, { top: '#05030e', mid: '#3c1c62', bot: '#5b2a6c', sunDir: moon, sunCol: '#e3b8ff', sunDeg: 7, fog: '#2b1842', fogNear: 14, fogFar: 95, stars: true, haze: .5 });
  addLights(W, { sky: '#9a7acc', ground: '#2a1a3a', hemi: .7, key: '#d6c2ff', keyI: .7, keyDir: new V3(-.5, 1, .8), rim: '#ff7a4a', rimI: .9, rimDir: new V3(.3, .4, -1) });
  addGround(W, { a: '#3a3446', b: '#2c2838', c: '#221d2c', clear: 9, hill: 1.5, pattern: (x, z, c, n) => { const k = (Math.floor(x / 1.6) + Math.floor(z / 1.6)) & 1; c.multiplyScalar(k ? 1.08 : .9); } });
  addArena(W, { a: '#5a5266', b: '#4a4356', rings: 6, glowRing: '#ffb347' });
  addMountains(W, { base: '#1c1430', top: '#3a2650', snow: '#6a4a8a', snowLine: .92, r0: 90, r1: 170, h0: 25, h1: 50 });
  // castle keep
  const wall = '#ece4d4', roof = '#1e2230', gold = '#e0b440', stone = '#5e5a66';
  const keep = [P(GEO.cyl(9, 11, 5, 4, 1), stone, [0, 2.5, 0], [0, Math.PI / 4, 0])];
  let y = 5;
  [[12, 3.4], [9.6, 3], [7.4, 2.8], [5.2, 2.6]].forEach(([w, h], i) => {
    keep.push(P(GEO.box(w * .8, h, w * .7), wall, [0, y + h / 2, 0]));
    keep.push(P(GEO.cyl(w * .25, w * .8, 1.3, 4), roof, [0, y + h + .5, 0], [0, Math.PI / 4, 0], [1, 1, .9]));
    for (const sx of [-1, 1]) keep.push(P(GEO.box(.5, .5, .5), gold, [sx * w * .32, y + h + 1.15, 0]));
    y += h + 1.1;
  });
  keep.push(P(GEO.box(1.2, .9, .5), gold, [0, y + .3, 0]));
  const castle = new THREE.Mesh(merge(keep), toon({ vertexColors: true })); castle.position.set(0, W.hAt(0, 46), 46); castle.castShadow = true; W.scene.add(castle);
  const wins = [];
  for (let k = 0; k < 18; k++) wins.push({ p: [rnd(-4, 4), castle.position.y + rnd(6, 16), 46 - 4.3], s: [rnd(.4, .7), rnd(.5, .8), .2] });
  W.scene.add(inst(GEO.box(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffb35a', fog: false }), wins));
  // courtyard walls
  const seg = merge([
    P(GEO.box(4.2, 1.1, .9), stone, [0, .55, 0]),
    P(GEO.box(4, 2, .5), wall, [0, 2.1, 0]),
    P(GEO.box(4.6, .3, 1.3), roof, [0, 3.2, 0]),
    P(GEO.box(4.4, .25, .9), roof, [0, 3.45, 0]),
  ]);
  const walls = [];
  for (let i = -9; i <= 9; i++) { const a = i * .17; const R = 19; if (Math.abs(i) < 1) continue; walls.push({ p: [Math.sin(a) * R, 0, Math.cos(a) * R], r: [0, a, 0] }); obs(W, Math.sin(a) * R, Math.cos(a) * R, 2.1); }
  for (let i = -6; i <= 6; i++) { const a = Math.PI + i * .2; walls.push({ p: [Math.sin(a) * 17, 0, Math.cos(a) * 17], r: [0, a, 0] }); obs(W, Math.sin(a) * 17, Math.cos(a) * 17, 2.1); }
  W.scene.add(inst(seg, toon({ vertexColors: true }), walls, true));
  const gate = new THREE.Mesh(toriiGeo('#2a2236', '#120e18'), toon({ vertexColors: true })); gate.position.set(0, 0, 19); gate.scale.setScalar(1.1); W.scene.add(gate);
  // red maples
  const trunkM = merge([P(GEO.cyl(.14, .26, 2.8, 7), '#3a241c', [0, 1.4, 0]), P(GEO.cyl(.07, .12, 1.6, 6), '#3a241c', [.5, 2.8, 0], [0, 0, -.8])]);
  const mt = [], mb = [];
  [[-8, 10], [8.5, 12], [-12, 2], [12, -2], [-9, -9], [10, -10], [-5, 15], [5, 16]].filter(([x, z]) => clearOK(x, z)).forEach(([x, z], i) => {
    obs(W, x, z, .6);
    const s = .9 + (i % 3) * .2; mt.push({ p: [x, 0, z], r: [0, i, 0], s });
    for (let k = 0; k < 6; k++) mb.push({ p: [x + rnd(-1.4, 1.4) * s, (3.2 + rnd(-.2, 1.1)) * s, z + rnd(-1.4, 1.4) * s], r: [rnd(0, 3), rnd(0, 3), 0], s: rnd(1, 1.6) * s, c: pick(['#d6341f', '#ff5a2a', '#e8451f', '#ff8a2a', '#b8241a']) });
  });
  W.scene.add(inst(trunkM, toon({ vertexColors: true }), mt, true));
  W.scene.add(inst(GEO.ico(1, 1), toon({ flatShading: true }), mb, true));
  // hanging paper lanterns on ropes
  const lanternGroup = new THREE.Group(); W.scene.add(lanternGroup);
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#ff5a3a', fog: false });
  const capMat = toon({ color: '#1a1214' });
  const lanterns = [];
  for (const side of [-1, 1]) {
    const px = side * 5.6;
    const postG = new THREE.Mesh(GEO.cyl(.08, .1, 3.6, 6), toon({ color: '#2a1d16' }));
    [-6, 10].forEach(z => { const p = postG.clone(); p.position.set(px, 1.8, z); W.scene.add(p); obs(W, px, z, .3); });
    for (let i = 0; i < 8; i++) {
      const z = -5 + i * 2.1, sag = Math.sin((i + .5) / 8 * Math.PI) * .6;
      const l = new THREE.Group(); l.position.set(px, 3.2 - sag, z);
      const body = new THREE.Mesh(GEO.cyl(.17, .17, .38, 10), lanternMat); body.position.y = -.25; l.add(body);
      const c1 = new THREE.Mesh(GEO.cyl(.1, .12, .05, 8), capMat); c1.position.y = -.04; l.add(c1);
      const c2 = c1.clone(); c2.position.y = -.46; l.add(c2);
      const h = halo('#ff6a3a', 1.3, .7); h.position.y = -.25; l.add(h);
      lanternGroup.add(l); lanterns.push(l);
    }
  }
  W.updaters.push((dt, t) => lanterns.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.3 + i) * .08; l.rotation.x = Math.cos(t * 1.1 + i * .7) * .06; }));
  addClouds(W, { color: '#4a2a6a', n: 12, opacity: .6, y0: 40 });
  brazier(W, -4, 5, '#ff8a2a'); brazier(W, 4, 5, '#ff8a2a'); brazier(W, -4, -3.5, '#ff8a2a'); brazier(W, 4, -3.5, '#ff8a2a');
  W.ambient.push(new Ambient({ n: 140, tex: TEX.glow, color: '#d8ff7a', color2: '#ffe27a', size: .09, alpha: 1, blending: THREE.AdditiveBlending, cx: 0, cy: 2, cz: 4, ax: 12, ay: 2, az: 12, sway: .5, twinkle: 2.2, vel: r => [(r() - .5) * .3, (r() - .5) * .15, (r() - .5) * .3], seed: 17 }));
  W.ambient.push(new Ambient({ n: 160, tex: TEX.petal, color: '#ff4a2a', color2: '#ffa02a', size: .1, cx: 0, cy: 4, cz: 2, ax: 12, ay: 4, az: 12, sway: .8, vel: r => [.3 + r() * .4, -.6 - r() * .4, (r() - .5) * .2], seed: 19 }));
  return W;
}

/* ================= Chapter 3: Dragon Peak (volcanic) ================= */
function lavaMat() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'varying vec2 vUv; uniform float time;',
      'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }',
      'void main(){ vec2 p = vec2(vUv.x * 2.0, vUv.y * .9 - time * .35); float v = n(p * 3.0) * .6 + n(p * 7.0 + 3.0) * .4;',
      ' float edge = smoothstep(0.0, .28, vUv.x) * smoothstep(1.0, .72, vUv.x);',
      ' vec3 c = mix(vec3(.75, .08, .0), vec3(1.0, .55, .05), v); c = mix(c, vec3(1.0, .95, .55), smoothstep(.72, .92, v));',
      ' c = mix(vec3(.12, .02, .0), c, edge); gl_FragColor = vec4(c, 1.0); }',
    ].join('\n'),
  });
}
function ribbon(points, width) {
  const curve = new THREE.CatmullRomCurve3(points), N = 80;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = curve.getPoint(t), tan = curve.getTangent(t);
    const side = new V3(-tan.z, 0, tan.x).normalize().multiplyScalar(width / 2 * (0.7 + .3 * Math.sin(t * 17)));
    pos.push(p.x - side.x, p.y, p.z - side.z, p.x + side.x, p.y, p.z + side.z);
    uv.push(0, t * 8, 1, t * 8);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function worldVolcano() {
  const W = newWorld(3);
  const sun = new V3(-.25, .14, 1);
  addSky(W, { top: '#1a0507', mid: '#c2331a', bot: '#ff8a3a', sunDir: sun, sunCol: '#ffb070', sunDeg: 7, fog: '#6a2010', fogNear: 16, fogFar: 120, haze: .9 });
  addLights(W, { sky: '#ff9a6a', ground: '#3a0e08', hemi: .75, key: '#ffd0a0', keyI: .8, keyDir: new V3(.6, 1, -.3), rim: '#ff5a1a', rimI: 1.3, rimDir: new V3(-.2, .3, 1) });
  addGround(W, { a: '#3a2a26', b: '#2a1e1c', c: '#4a221a', clear: 8, hill: 3, flat: true, pattern: (x, z, c, n) => { if (n > .66) c.lerp(new COL('#6a2a14'), (n - .66) * 2); } });
  addArena(W, { a: '#2a2026', b: '#1e171c', rings: 7, glowRing: '#ff7a1a' });
  addMountains(W, { base: '#2a1210', top: '#5a1e14', snow: '#ff7a3a', snowLine: .96, r0: 80, r1: 160, h0: 25, h1: 55 });
  // volcano
  const volc = new THREE.Mesh(merge([P(GEO.cyl(8, 60, 70, 12, 4, false), '#2a1410', [0, 35, 0], null, null, (x, y) => y > 30 ? new COL('#ff5a1a') : new COL('#2a1410').lerp(new COL('#4a1a12'), (y + 35) / 70))]), toon({ vertexColors: true, flatShading: true }));
  volc.position.set(-40, -4, 175); W.scene.add(volc);
  const vg = halo('#ff7a2a', 70, .8); vg.position.set(-40, 70, 175); W.scene.add(vg);
  W.updaters.push((dt, t) => {
    vg.material.opacity = .7 + Math.sin(t * 1.7) * .1;
    if (Math.random() < dt * 8) FX.norm.emit(-40 + rnd(-4, 4), 68, 175 + rnd(-4, 4), rnd(-.5, 1.5), rnd(4, 7), rnd(-.5, .5), rnd(6, 9), 8, 26, '#3a2222', .55, -.2, .2);
  });
  // lava rivers
  const lm = lavaMat();
  [[[-30, .04, 40], [-14, .04, 22], [-9, .04, 12], [-12, .04, 0], [-22, .04, -14]], [[34, .04, 46], [16, .04, 26], [10, .04, 14], [14, .04, -2], [28, .04, -18]], [[-8, .04, 60], [-2, .04, 40], [8, .04, 30], [30, .04, 22]]].forEach(pts => {
    const g = ribbon(pts.map(p => new V3(p[0], W.hAt(p[0], p[2]) + .05, p[2])), 2.6);
    const m = new THREE.Mesh(g, lm); W.scene.add(m);
    pts.forEach(p => { const h = halo('#ff6a1a', 6, .35); h.position.set(p[0], W.hAt(p[0], p[2]) + .4, p[2]); W.scene.add(h); });
  });
  W.updaters.push((dt, t) => { lm.uniforms.time.value = t; });
  const torii = new THREE.Mesh(toriiGeo('#b8221a', '#120c0c'), toon({ vertexColors: true })); torii.position.set(0, 0, 14); torii.scale.setScalar(2.2); torii.castShadow = true; W.scene.add(torii); obs(W, -4.4, 14, .7); obs(W, 4.4, 14, .7);
  const pillar = merge([P(GEO.cyl(.5, .6, 1, 10), '#4a3a36', [0, .5, 0]), P(GEO.box(1.4, .3, 1.4), '#3a2c28', [0, 0, 0])]);
  const pillars = [];
  [[-7, 4], [7, 4], [-7, -3], [7, -3], [-9, 10], [9, 10]].filter(([x, z]) => clearOK(x, z)).forEach(([x, z], i) => obs(W, x, z, .7) || pillars.push({ p: [x, W.hAt(x, z), z], r: [0, i, 0], s: [1, 2 + (i % 3) * 1.6, 1] }));
  W.scene.add(inst(pillar, toon({ vertexColors: true, flatShading: true }), pillars, true));
  W.scene.add(inst(GEO.dodec(1), toon({ color: '#2a1e1c', flatShading: true }), scatter(60, 7, 50, 61, laneClear).map(([x, z, k]) => { obs(W, x, z, .5 + k * 1.6); return { p: [x, W.hAt(x, z), z], r: [k * 3, k * 4, 0], s: [.5 + k * 2, .4 + k * 1.4, .5 + k * 1.8] }; }), true));
  addClouds(W, { color: '#5a1a12', n: 14, opacity: .7, y0: 40 });
  const dead = merge([P(GEO.cyl(.08, .18, 2.6, 6), '#2a1a14', [0, 1.3, 0]), P(GEO.cyl(.04, .08, 1.3, 5), '#2a1a14', [.35, 2.2, 0], [0, 0, -.9]), P(GEO.cyl(.04, .07, 1.1, 5), '#2a1a14', [-.3, 1.8, .1], [.2, 0, .8])]);
  W.scene.add(inst(dead, toon({ vertexColors: true }), scatter(32, 10, 40, 107, laneClear).map(([x, z, k]) => { obs(W, x, z, .35); return { p: [x, W.hAt(x, z), z], r: [0, k * 6, rnd(-.1, .1)], s: .8 + k * .7 }; }), true));
  W.scene.add(inst(GEO.cone(1, 1, 5), toon({ color: '#1e1424', flatShading: true }), scatter(40, 9, 40, 109, laneClear).map(([x, z, k]) => { obs(W, x, z, .3 + k * .5); return { p: [x, W.hAt(x, z) + .5 * (1 + k * 2), z], r: [rnd(-.2, .2), k * 4, rnd(-.2, .2)], s: [.3 + k * .6, 1 + k * 2, .3 + k * .6] }; }), true));
  brazier(W, -4.2, 5.5, '#ff6a1a'); brazier(W, 4.2, 5.5, '#ff6a1a'); brazier(W, -4.2, -3.6, '#ff6a1a'); brazier(W, 4.2, -3.6, '#ff6a1a');
  // the sky dragon
  const N = 36;
  const segGeo = merge([P(GEO.ico(1, 1), '#d2301a', [0, 0, 0], null, [1, .9, 1.25], (x, y) => y < -.35 ? new COL('#ffc24a') : new COL('#d2301a')), P(GEO.cone(.35, 1, 4), '#ffb21a', [0, 1.05, 0])]);
  const dragon = new THREE.InstancedMesh(segGeo, toon({ vertexColors: true, flatShading: true }), N); dragon.frustumCulled = false; W.scene.add(dragon);
  const head = new THREE.Group(); W.scene.add(head);
  const hm = new THREE.Mesh(merge([
    P(GEO.box(1.6, 1.2, 2.4), '#d2301a', [0, 0, .6]),
    P(GEO.box(1.3, .5, 1.6), '#ffc24a', [0, -.65, 1.0]),
    P(GEO.cone(.18, 1.8, 5), '#fff0c0', [.5, .9, -.4], [-1.0, 0, -.3]),
    P(GEO.cone(.18, 1.8, 5), '#fff0c0', [-.5, .9, -.4], [-1.0, 0, .3]),
    P(GEO.box(.06, .06, 3), '#ffd27a', [.75, -.2, 2.4], [0, .35, 0]),
    P(GEO.box(.06, .06, 3), '#ffd27a', [-.75, -.2, 2.4], [0, -.35, 0]),
    P(GEO.cone(.4, 1.2, 5), '#ffb21a', [0, .8, 0], [-.6, 0, 0]),
  ]), toon({ vertexColors: true, flatShading: true }));
  head.add(hm); head.scale.setScalar(2.2);
  for (const sx of [-1, 1]) { const e = halo('#fff27a', 1.4, 1); e.position.set(sx * .55, .25, 1.75); head.add(e); }
  const pts = [];
  const dpos = (t, i) => new V3(Math.sin(t * .22 - i * .09) * 70, 42 + Math.sin(t * .5 - i * .25) * 7 + Math.sin(t * .17) * 6, 120 + Math.cos(t * .22 - i * .09) * 28);
  W.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) pts[i] = dpos(t, i);
    for (let i = 0; i < N; i++) {
      const p = pts[i], nx = pts[Math.max(0, i - 1)];
      _io.position.copy(p); _io.lookAt(i === 0 ? dpos(t + .1, 0) : nx); _io.rotateX(Math.PI / 2);
      const s = 2.2 * (1 - i / N * .75); _io.scale.set(s, s, s); _io.updateMatrix(); dragon.setMatrixAt(i, _io.matrix);
    }
    dragon.instanceMatrix.needsUpdate = true;
    head.position.copy(pts[0]); head.lookAt(dpos(t + .15, 0));
    if (Math.random() < dt * 3) FX.add.emit(pts[0].x, pts[0].y, pts[0].z, rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), 1.2, 1.5, 4, '#ffb03a', .7, 0, .5);
  });
  W.ambient.push(new Ambient({ n: 360, tex: TEX.glow, color: '#ffb03a', color2: '#ff4a1a', size: .07, alpha: 1, blending: THREE.AdditiveBlending, cx: 0, cy: 4, cz: 3, ax: 12, ay: 5, az: 12, sway: .6, twinkle: 3, vel: r => [(r() - .5) * .4, .6 + r() * 1.1, (r() - .5) * .4], seed: 23 }));
  W.ambient.push(new Ambient({ n: 90, tex: TEX.smoke, color: '#3a2420', size: 1.6, alpha: .25, cx: 0, cy: 3, cz: 8, ax: 18, ay: 3, az: 14, sway: .3, vel: r => [.3 + r() * .3, .05, (r() - .5) * .2], seed: 29 }));
  return W;
}

/* ================= Training dojo ================= */
function scrollTex(text) {
  return ctex(64, (x, s, h) => {
    x.fillStyle = '#f2e6c8'; x.fillRect(0, 0, s, h);
    x.fillStyle = '#5a3a1a'; x.fillRect(0, 0, s, 8); x.fillRect(0, h - 8, s, 8);
    x.fillStyle = '#16120e'; x.font = 'bold 44px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text[0], s / 2, h * .33); if (text[1]) x.fillText(text[1], s / 2, h * .66);
    x.fillStyle = '#c0392b'; x.fillRect(s - 18, h - 26, 10, 10);
  }, 160);
}
function worldDojo() {
  const W = newWorld('dojo');
  const sun = new V3(.15, .12, 1);
  addSky(W, { top: '#3a2a6a', mid: '#ff9a6a', bot: '#ffd29a', sunDir: sun, sunCol: '#ffe0b0', sunDeg: 5, fog: '#e8a080', fogNear: 30, fogFar: 160, haze: .7 });
  addLights(W, { sky: '#ffe2c0', ground: '#6a4a3a', hemi: .9, key: '#ffd8b0', keyI: .75, keyDir: new V3(.3, 1, 1), rim: '#ffb070', rimI: .8, rimDir: new V3(0, .4, 1) });
  // garden outside
  addGround(W, { a: '#7a9a44', b: '#5e8a3a', c: '#b08a6a', clear: 12, hill: 2, flat: true });
  addMountains(W, { base: '#6a4a7a', top: '#b06a7a', snow: '#ffd8c8', snowLine: .82, r0: 70, r1: 140, h0: 20, h1: 45, a0: -1, a1: 1 });
  addCherryTrees(W, [[-5, 13, .9], [6, 15, .6], [0, 20, 1], [-10, 18, .5], [11, 19, .7]], ['#ffb7d0', '#ff9ec4', '#ffd0e0']);
  addLanterns(W, [[-3, 11], [3, 11]], '#9a9488', '#ffcf7a');
  addGrass(W, { base: '#3f6a22', tip: '#b8d84a', n: 900, r0: 8, r1: 30, avoid: (x, z) => z < 7.5, flowers: 120 });
  addClouds(W, { color: '#ffb59a', n: 10, opacity: .8, a0: -1, a1: 1 });
  const wood = '#7a4f2e', woodD = '#4a2e1a', paper = '#fff0d0';
  // floor planks
  const planks = [];
  for (let i = -16; i <= 16; i++) planks.push({ p: [i * .4, .0, .5], s: [.39, .08, 15], c: (i % 3 === 0) ? '#a8774a' : (i % 3 === 1 ? '#9a6a40' : '#b07e50') });
  W.scene.add(inst(GEO.box(1, 1, 1), toon({}), planks));
  // structure: pillars, beams, side shoji walls
  const frame = [];
  for (const sx of [-1, 1]) {
    for (let z = -6; z <= 7; z += 2.6) frame.push(P(GEO.box(.3, 4.2, .3), woodD, [sx * 6.5, 2.1, z]));
    frame.push(P(GEO.box(.3, .3, 14), woodD, [sx * 6.5, 4.1, .5]));
    frame.push(P(GEO.box(.3, .25, 14), woodD, [sx * 6.5, .9, .5]));
  }
  for (let z = -6; z <= 7; z += 2.6) frame.push(P(GEO.box(13.3, .3, .3), woodD, [0, 4.25, z]));
  frame.push(P(GEO.box(13.3, 4.2, .3), wood, [0, 2.1, -6.6]));
  frame.push(P(GEO.box(13.6, .4, 14.4), '#5a3a22', [0, 4.6, .5]));
  frame.push(P(GEO.box(2.2, 4.2, .3), woodD, [-5.6, 2.1, 7.2])); frame.push(P(GEO.box(2.2, 4.2, .3), woodD, [5.6, 2.1, 7.2]));
  frame.push(P(GEO.box(13.3, .6, .3), woodD, [0, 4.0, 7.2]));
  W.scene.add(new THREE.Mesh(merge(frame), toon({ vertexColors: true })));
  const shoji = new THREE.MeshBasicMaterial({ color: paper, fog: false });
  for (const sx of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 3), shoji); pane.position.set(sx * 6.6, 2.4, .5); pane.rotation.y = -sx * Math.PI / 2; W.scene.add(pane);
    const grid = [];
    for (let z = -6; z <= 7; z += .65) grid.push({ p: [sx * 6.55, 2.4, z], s: [.04, 3, .05] });
    for (let yy = 1.1; yy <= 3.9; yy += .7) grid.push({ p: [sx * 6.55, yy, .5], s: [.04, .05, 13.6] });
    W.scene.add(inst(GEO.box(1, 1, 1), toon({ color: woodD }), grid));
  }
  // scrolls
  [['武', '道'], ['心', '技']].forEach((t, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.8, 2), toon({ map: scrollTex(t) })); m.position.set(i ? 2.2 : -2.2, 2.4, -6.42); W.scene.add(m);
  });
  // hanging lanterns
  for (const [x, z] of [[-3, -2], [3, -2], [-3, 4], [3, 4]]) {
    const l = new THREE.Mesh(GEO.sph(.28, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffd9a0', fog: false })); l.scale.set(1, 1.3, 1); l.position.set(x, 3.4, z); W.scene.add(l);
    const h = halo('#ffc070', 2.4, .6); h.position.copy(l.position); W.scene.add(h);
  }
  // weapon rack
  const rack = [P(GEO.box(.12, 1.6, .12), woodD, [-.9, .8, 0]), P(GEO.box(.12, 1.6, .12), woodD, [.9, .8, 0]), P(GEO.box(2, .1, .14), woodD, [0, .9, 0]), P(GEO.box(2, .1, .14), woodD, [0, 1.4, 0])];
  for (let i = 0; i < 4; i++) rack.push(P(GEO.cyl(.025, .025, 1.5, 6), '#c9a06a', [-.6 + i * .4, 1.15, .08], [0, 0, Math.PI / 2 - .1]));
  const rackM = new THREE.Mesh(merge(rack), toon({ vertexColors: true })); rackM.position.set(-6.0, 0, -3); rackM.rotation.y = Math.PI / 2; W.scene.add(rackM);
  const rack2 = rackM.clone(); rack2.position.set(6.0, 0, -3); rack2.rotation.y = -Math.PI / 2; W.scene.add(rack2);
  W.ambient.push(new Ambient({ n: 90, tex: TEX.glow, color: '#ffe0b0', size: .05, alpha: .7, blending: THREE.AdditiveBlending, cx: 0, cy: 2, cz: 1, ax: 5, ay: 2, az: 5, sway: .15, twinkle: 1.1, vel: r => [r() * .05, r() * .04, r() * .05], seed: 33 }));
  W.ambient.push(new Ambient({ n: 140, tex: TEX.petal, color: '#ffb7d0', color2: '#ff8fbf', size: .08, cx: 0, cy: 3, cz: 12, ax: 10, ay: 3, az: 6, sway: .7, vel: r => [.4 + r() * .4, -.4 - r() * .3, -.2 - r() * .4] }));
  return W;
}

function buildWorld(kind) {
  POI_CLEAR = makePoiClear(kind);
  if (kind === 'dojo') return worldDojo();
  return [worldBamboo, worldSnow, worldCastle, worldVolcano][kind]();
}
function activateWorld(W) {
  if (CURWORLD && CURWORLD !== W) disposeWorld(CURWORLD);
  CURWORLD = W;
  W.ambient.forEach(a => W.scene.add(a.pts));
  FX.attach(W.scene);
  FX.setScale();
}
function updateWorld(W, dt, t) {
  if (!W) return;
  W.sky.position.copy(CAM.position);
  W.sky.material.uniforms.time.value = t;
  W.ambient.forEach(a => a.update(dt, t));
  W.updaters.forEach(f => f(dt, t));
}
