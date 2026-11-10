'use strict';
/* ===== Hara: the golden plain beneath Mount Fuji =====
   A wide open town: pampas grass, rice paddies to the east, the floating marsh to the west,
   and one bridge north across the marsh, held by Lady Tomoe's dojo. She duels only at sunrise. */

const HR = z => townRoadX(z);
const HARA_PAD = { x0: 17, z0: -46, cw: 11.5, cd: 11, nx: 4, nz: 6, b: 1.1 };
const HARA_RISE = [-20, 34], HARA_ISLE = [-62, 10], HARA_FROST = [46, 44], HARA_STAGE = [HR(49) + 10.5, 49], HARA_CAMP = [-24, -44];
const HARA_LAY = {
  ema: [[-31, -12], [40.55, -20], [HR(-62) + 6.5, -60]],
  chest: [HARA_ISLE, [66.5, -12]],
  chestHint: ['In a chest on the island in the marsh. Cross the boardwalk west of town', 'In a chest beyond the rice fields, at the foot of the dunes'],
  flats: [[HR(-8) + 10.5, -8, 6, .25], [HR(-24) - 11, -24, 6, .25], [HR(10) - 12, 10, 6, .25], [HR(16) + 10.5, 16, 5.5, .25], [HR(-42) - 11, -42, 5.5, .25], [HR(32) + 11, 32, 5.5, .25], [HR(27) - 12, 27, 5.5, .25],
    [HARA_CAMP[0], HARA_CAMP[1], 5, .22], [HARA_FROST[0], HARA_FROST[1], 10, .3], [HARA_STAGE[0], HARA_STAGE[1], 7.5, .22], [HR(57), 57, 5, .22], [HARA_RISE[0], HARA_RISE[1], 3, 3.6]],
  pos: {
    guard: [HR(GATE_Z) - 1.8, GATE_Z - 2.4, Math.PI], keeper: [HARA_STAGE[0], HARA_STAGE[1], Math.PI * 1.25],
    a: [HR(-4) + 5.6, -3, -Math.PI / 2], friendA: [HR(-12) + 6.5, -12, -Math.PI / 2], smith: [HR(10) - 7.2, 10.5, Math.PI / 2],
    b: [HARA_RISE[0] + 1.4, HARA_RISE[1] - 1.2, 0], foe: [HARA_CAMP[0], HARA_CAMP[1], .9], myth: [HARA_FROST[0], HARA_FROST[1], -2.4],
  },
};
function haraBridgeX(z) { return lerp(HR(59.5), HR(73), clamp((z - 59.5) / 13.5, 0, 1)); }
/* inside the paddies: true on a bund (the raised path), false in the water, null outside */
function haraPaddy(x, z) {
  const p = HARA_PAD, u = x - p.x0, v = z - p.z0, w = p.nx * p.cw + p.b, d = p.nz * p.cd + p.b;
  if (u < 0 || v < 0 || u > w || v > d) return null;
  return (u % p.cw) < p.b || (v % p.cd) < p.b;
}
function haraH(x, z, mesh) {
  const rd = Math.abs(x - HR(z));
  let h = Math.max(.14, .32 + (fbm(x * .045 + 11, z * .045 + 3) - .5) * 1.1);
  h += 3.4 * (1 - smooth(3.5, 13, Math.hypot(x - HARA_RISE[0], z - HARA_RISE[1])));
  h += smooth(68, 92, x) * 7 * (.6 + .6 * fbm(x * .04, z * .04 + 5));
  const edge = Math.max(-z - 86, 0); h += Math.min(edge * edge * .1, 5);
  h = lerp(h, .2, 1 - smooth(2.6, 6.5, rd));
  for (const f of HARA_LAY.flats) { const d = Math.hypot(x - f[0], z - f[1]); if (d < f[2] + 5) h = lerp(f[3], h, smooth(f[2], f[2] + 5, d)); }
  const pd = haraPaddy(x, z); if (pd != null) h = mesh ? .02 : pd ? .34 : -.1;
  if (!mesh) { const sx = Math.abs(x - HARA_STAGE[0]), sz = Math.abs(z - HARA_STAGE[1]); if (sx < 4.6 && sz < 4.6) h = .62; }
  const m = smooth(-35, -41, x);
  if (m > 0) { // the floating marsh
    h = lerp(h, -1.05 + smooth(.6, .72, fbm(x * .11 + 2, z * .11 + 7)) * 1.3, m);
    h = lerp(.5, h, smooth(5, 8, Math.hypot(x - HARA_ISLE[0], z - HARA_ISLE[1])));
    if (!mesh && x > -58 && x < -33 && Math.abs(z - 10) < (x > -37.5 ? 3 : 1.8)) h = .34;
  }
  const ch = smooth(60.6, 62.2, z) * (1 - smooth(70, 72, z));
  if (ch > 0) { h = lerp(h, -1.1, ch); if (!mesh && Math.abs(x - haraBridgeX(z)) < 2.3) h = .5; }
  return h;
}
const _hc = [new COL('#eaf4ff'), new COL('#6f7a48'), new COL('#3f5a4c'), new COL('#6a5a3a'), new COL('#c9b078')];
function haraTint(x, z, h, t) {
  if (x < -30 || (z > 59 && z < 73)) { t.lerp(_hc[1], smooth(.3, .05, h) * .8); t.lerp(_hc[2], smooth(-.1, -.6, h)); }
  if (haraPaddy(x, z) != null) t.copy(_hc[3]);
  const dc = Math.hypot(x - HARA_CAMP[0], z - HARA_CAMP[1]); if (dc < 6) t.lerp(_hc[4], 1 - smooth(3, 6, dc));
  const d = Math.hypot(x - HARA_FROST[0], z - HARA_FROST[1]); if (d < 14) t.lerp(_hc[0], 1 - smooth(8, 14, d + (fbm(x * .5, z * .5) - .5) * 4));
}

/* Mount Fuji with its long concave slopes; `red` is the dawn mountain */
function fujiGeo(red) {
  const g = new THREE.LatheGeometry([[1, 0], [.74, .1], [.54, .24], [.38, .4], [.26, .57], [.17, .73], [.11, .86], [.075, .95], [.065, 1], [.03, .985]].map(p => new THREE.Vector2(p[0], p[1])), 56);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), t = new COL();
  const lo = new COL(red ? '#7a2a1e' : '#56769f'), hi = new COL(red ? '#e0603c' : '#98b2d2'), sn = new COL(red ? '#ffd9c0' : '#f6f9ff');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), a = Math.atan2(pos.getZ(i), pos.getX(i));
    const line = .68 + .05 * Math.sin(a * 7) + .035 * Math.sin(a * 17 + 1) + .02 * Math.sin(a * 31 + 2);
    const snow = y > line || (y > line - .13 && Math.sin(a * 26 + 1) > .7);
    t.copy(lo).lerp(hi, clamp(y * 1.25, 0, 1)); if (snow) t.copy(sn);
    col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function addFuji(W, x, z, R, H) {
  const base = new THREE.Mesh(fujiGeo(false), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
  const red = new THREE.Mesh(fujiGeo(true), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  for (const m of [base, red]) { m.scale.set(R, H, R); m.position.set(x, -8, z); W.scene.add(m); }
  red.scale.multiplyScalar(1.003); red.renderOrder = -6;
  W.fuji = base; W.fujiRed = red;
}
function pampasGeo(a, b, plume) {
  const parts = [];
  for (let i = 0; i < 6; i++) { const an = i * 1.05, l = .22 + (i % 3) * .05; parts.push(P(GEO.cone(.035, 1.25, 4), i % 2 ? a : b, [Math.cos(an) * .1, .6, Math.sin(an) * .1], [Math.sin(an) * l, 0, -Math.cos(an) * l])); }
  for (let i = 0; i < 3; i++) { const an = i * 2.1 + .4; parts.push(P(GEO.cone(.05, .4, 5), plume, [Math.cos(an) * .22, 1.42, Math.sin(an) * .22], [Math.sin(an) * .5, 0, -Math.cos(an) * .5])); }
  return merge(parts);
}
function haraCrane() {
  const g = new THREE.Group(), mat = toon({ vertexColors: true });
  g.add(new THREE.Mesh(merge([P(GEO.sph(.34, 8, 6), '#f8f8f4', [0, .98, 0], null, [.8, .7, 1.5]), P(GEO.cone(.2, .5, 6), '#1c1c22', [0, 1.0, -.6], [-1.9, 0, 0]),
    P(GEO.cyl(.035, .055, .8, 5), '#f8f8f4', [0, 1.42, .42], [.38, 0, 0]), P(GEO.cyl(.036, .036, .3, 5), '#1c1c22', [0, 1.6, .49], [.38, 0, 0]), P(GEO.sph(.09, 6, 5), '#f8f8f4', [0, 1.82, .58]), P(GEO.sph(.055, 5, 4), '#d0302a', [0, 1.9, .57]),
    P(GEO.cone(.03, .28, 4), '#4a4a38', [0, 1.8, .78], [1.57, 0, 0]), P(GEO.cyl(.018, .018, .9, 4), '#2a2a2a', [.08, .45, 0]), P(GEO.cyl(.018, .018, .9, 4), '#2a2a2a', [-.08, .45, 0])]), mat));
  const wg = merge([P(GEO.box(.8, .04, .5), '#f8f8f4', [.4, 0, 0]), P(GEO.box(.45, .035, .42), '#1c1c22', [1.0, 0, -.03])]);
  g.wings = [1, -1].map(sd => { const w = new THREE.Mesh(wg, mat); w.position.set(.14 * sd, 1.12, 0); w.scale.x = sd; g.add(w); return w; });
  g.traverse(o => { o.castShadow = true; });
  return g;
}

function haraDecor(W, c) {
  const p = HARA_PAD, rr = mulberry(311), wood = '#5a3a26', dark = '#3a2416';
  const flat = toon({ vertexColors: true, flatShading: true });
  const onFlat = (x, z, pad) => HARA_LAY.flats.some(f => Math.hypot(x - f[0], z - f[1]) < f[2] + pad) || HARA_LAY.ema.concat(HARA_LAY.chest).some(f => Math.hypot(x - f[0], z - f[1]) < 3.5);
  // the marsh and the channel are one sheet of still water
  const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshBasicMaterial({ color: '#5f9494', transparent: true, opacity: .84 })); water.rotation.x = -Math.PI / 2; water.position.y = -.32; W.scene.add(water); W.water = water; W.waterCol = '#5f9494';
  addFuji(W, -30, 440, 255, 138);
  addMountains(W, { base: '#5a6f96', top: '#93a8c8', snow: '#f4f8ff', snowLine: 2, r0: 170, r1: 260, h0: 12, h1: 34, a0: .75, a1: 2.7, n: 12, seed: 16 });
  addMountains(W, { base: '#5a6f96', top: '#93a8c8', snow: '#f4f8ff', snowLine: 2, r0: 170, r1: 260, h0: 12, h1: 30, a0: -2.7, a1: -.75, n: 12, seed: 17 });
  // black pines: tall bare trunks with flat crowns, a windbreak along the road and the lone pine on the painter's rise
  const pine = merge([P(GEO.cyl(.16, .3, 5.4, 6), '#4a3428', [0, 2.7, 0], [0, 0, .06]), P(GEO.cyl(.08, .12, 1.8, 5), '#4a3428', [.6, 4.6, 0], [0, 0, -.9]),
    P(GEO.dodec(1), '#2f5a34', [0, 5.9, 0], null, [2.3, .55, 2.0]), P(GEO.dodec(1), '#3a6a3c', [.5, 6.7, .2], [0, 1, 0], [1.6, .5, 1.5]), P(GEO.dodec(1), '#46784a', [1.5, 5.2, .1], [0, 2, 0], [1.3, .42, 1.1]), P(GEO.dodec(1), '#2f5a34', [-.9, 5.1, -.5], [0, 3, 0], [1.2, .4, 1.2])]);
  const pines = [], addPine = (x, z, s) => { pines.push({ p: [x, townH(x, z) - .1, z], r: [0, rr() * 6, 0], s }); obs(W, x, z, .4 * s); };
  for (let z = -86; z <= 54; z += 15.5) { const sd = (Math.round(z / 15.5) % 2) ? 1 : -1, x = HR(z) + sd * (5.2 + rr()); if (!onFlat(x, z, 1.5)) addPine(x, z, 1 + rr() * .4); }
  for (let i = 0; i < 26; i++) { const x = -34 + rr() * 100, z = -90 + rr() * 9; addPine(x, z, 1 + rr() * .6); }
  for (let i = 0; i < 16; i++) { const x = HR(80) + (rr() * 2 - 1) * 60, z = 76 + rr() * 12; if (Math.abs(x - HR(z)) > 5) addPine(x, z, 1 + rr() * .6); }
  addPine(HARA_RISE[0] - 2.6, HARA_RISE[1] + 1.2, 1.7);
  W.scene.add(inst(pine, windify(flat.clone(), .01), pines, true));
  // pampas grass over the whole plain
  const veg = (x, z) => { const h = townH(x, z); return h > .1 && h < 6 && Math.abs(x - HR(z)) > 3.6 && haraPaddy(x, z) == null && !onFlat(x, z, -.5) && !(z > 58 && z < 74); };
  const pam = [], frost = [];
  for (let i = 0; i < 5200 && pam.length < 2600; i++) {
    const x = -44 + rr() * 134, z = (rr() * 2 - 1) * 90; if (!veg(x, z) || fbm(x * .06 + 2, z * .06) < .36) continue;
    (Math.hypot(x - HARA_FROST[0], z - HARA_FROST[1]) < 15 ? frost : pam).push({ p: [x, townH(x, z) - .04, z], r: [0, rr() * 6, 0], s: .65 + rr() * .6 });
  }
  W.scene.add(inst(pampasGeo('#c8a444', '#a8862e', '#e6d6a6'), windify(toon({ vertexColors: true }), .16), pam, false));
  W.scene.add(inst(pampasGeo('#dfeaf2', '#b8ccdc', '#ffffff'), windify(toon({ vertexColors: true }), .05), frost, false));
  const tuft = merge([P(GEO.cone(.05, .5, 4), '#c2a850', [0, .25, 0]), P(GEO.cone(.045, .4, 4), '#a08a3c', [.07, .2, .03], [0, 0, -.3]), P(GEO.cone(.045, .42, 4), '#d6c070', [-.06, .21, -.04], [0, 0, .3])]), tufts = [];
  for (let i = 0; i < 1500; i++) { const x = -44 + rr() * 134, z = (rr() * 2 - 1) * 90; if (veg(x, z)) tufts.push({ p: [x, townH(x, z), z], r: [0, rr() * 6, 0], s: .8 + rr() * 1.3 }); }
  W.scene.add(inst(tuft, windify(toon({ vertexColors: true }), .22), tufts, false));
  // reeds in the marsh shallows
  const reed = merge([P(GEO.cone(.03, 1.9, 4), '#5a7a3a', [0, .95, 0]), P(GEO.cone(.03, 1.6, 4), '#6a8a44', [.08, .8, .05], [0, 0, -.12]), P(GEO.cone(.03, 1.7, 4), '#4a6a34', [-.07, .85, -.04], [0, 0, .14]), P(GEO.cyl(.04, .04, .3, 5), '#5a3a22', [0, 1.75, 0]), P(GEO.cyl(.04, .04, .28, 5), '#5a3a22', [.2, 1.5, .05])]), reeds = [];
  for (let i = 0; i < 2600 && reeds.length < 560; i++) {
    const west = rr() < .7, x = west ? -34 - rr() * 60 : (rr() * 2 - 1) * 90, z = west ? (rr() * 2 - 1) * 90 : 60 + rr() * 13, h = haraH(x, z, true);
    if (h > .3 || h < -.75 || (Math.abs(z - 10) < 3.6 && x > -60) || Math.abs(x - haraBridgeX(z)) < 4) continue;
    reeds.push({ p: [x, Math.max(h, -.45), z], r: [0, rr() * 6, 0], s: .8 + rr() * .8 });
  }
  W.scene.add(inst(reed, windify(toon({ vertexColors: true }), .07), reeds, false));
  // rice paddies: bunds to walk on, shallow water, golden rice, a few cells already harvested
  const pw = p.nx * p.cw + p.b, pdp = p.nz * p.cd + p.b, bunds = [];
  for (let i = 0; i <= p.nx; i++) bunds.push({ p: [p.x0 + i * p.cw + p.b / 2, .17, p.z0 + pdp / 2], s: [p.b, .36, pdp] });
  for (let j = 0; j <= p.nz; j++) bunds.push({ p: [p.x0 + pw / 2, .168, p.z0 + j * p.cd + p.b / 2], s: [pw, .36, p.b] });
  W.scene.add(inst(GEO.box(1, 1, 1), toon({ color: '#8a7448' }), bunds, false)); W.scene.children[W.scene.children.length - 1].receiveShadow = true;
  const pwater = new THREE.Mesh(new THREE.PlaneGeometry(pw, pdp), new THREE.MeshBasicMaterial({ color: '#8fb4b0', transparent: true, opacity: .78 })); pwater.rotation.x = -Math.PI / 2; pwater.position.set(p.x0 + pw / 2, .07, p.z0 + pdp / 2); W.scene.add(pwater); W.paddy = pwater;
  const rice = merge([P(GEO.cone(.05, .7, 4), '#c8b03a', [0, .35, 0]), P(GEO.cone(.045, .62, 4), '#a8a030', [.08, .3, .03], [0, 0, -.28]), P(GEO.cone(.045, .64, 4), '#d8c04a', [-.07, .31, -.04], [0, 0, .28]), P(GEO.sph(.05, 4, 3), '#e8d060', [.17, .56, .03], null, [1, 1.8, 1]), P(GEO.sph(.05, 4, 3), '#e8d060', [-.16, .58, -.04], null, [1, 1.8, 1])]);
  const stub = GEO.cone(.05, .16, 4), rices = [], stubs = [], racks = [];
  for (let i = 0; i < p.nx; i++) for (let j = 0; j < p.nz; j++) {
    const cut = (i * 3 + j * 5) % 7 === 2, x0 = p.x0 + i * p.cw + p.b, z0 = p.z0 + j * p.cd + p.b;
    for (let a = .7; a < p.cw - p.b - .4; a += 1.15) for (let b = .7; b < p.cd - p.b - .4; b += 1.25) (cut ? stubs : rices).push({ p: [x0 + a + (rr() - .5) * .2, cut ? .07 : .02, z0 + b + (rr() - .5) * .2], r: [0, rr() * 6, 0], s: .9 + rr() * .4 });
    if (cut) racks.push([x0 + (p.cw - p.b) / 2, z0 + (p.cd - p.b) / 2]);
  }
  W.scene.add(inst(rice, windify(toon({ vertexColors: true }), .1), rices, false));
  W.scene.add(inst(stub, toon({ color: '#b8a460' }), stubs, false));
  const rack = merge([P(GEO.cyl(.05, .05, 1.9, 5), wood, [-2.2, .9, 0], [0, 0, .12]), P(GEO.cyl(.05, .05, 1.9, 5), wood, [2.2, .9, 0], [0, 0, -.12]), P(GEO.cyl(.045, .045, 4.8, 5), wood, [0, 1.7, 0], [0, 0, Math.PI / 2])].concat([-1.8, -1.2, -.6, 0, .6, 1.2, 1.8].map(x => P(GEO.cone(.3, 1.2, 6), '#d8c04a', [x, 1.1, 0], [Math.PI, 0, 0]))));
  W.scene.add(inst(rack, flat, racks.map(([x, z]) => ({ p: [x, 0, z], r: [0, .3, 0] })), true)); racks.forEach(([x, z]) => obs(W, x, z, 1.2));
  // the post town: thatched farmhouses strung along the road
  const E = Math.PI / 2, th = { roof: '#a8884a', cap: '#c8a860', rh: 2.5, wall: '#e2d4b4' };
  [[10.5, -8, -E, 7, 6, th], [-11, -24, E, 8, 6, Object.assign({}, th, { h: 3 })], [-12, 10, E, 7, 6, { roof: '#33302e', wall: '#d8c8a8', win: '#ffb86a' }], [10.5, 16, -E, 6, 5, th], [-11, -42, E, 6, 5, th], [11, 32, -E, 6, 5, th], [-12, 27, E, 5.5, 5, { roof: '#2a2a30', cap: '#44444c', wall: '#f4f0e6', win: '#3a2a1e' }]]
    .forEach(a => townHouse(W, c, a[0] + HR(a[1]), a[1], a[2], a[3], a[4], a[5]));
  addLanterns(W, [[HR(-34) - 3.4, -34], [HR(-2) + 3.4, -2], [HR(22) - 3.4, 22], [HR(44) + 3.4, 44], [HR(56) - 3.6, 56]], '#8a8474', '#ffb860');
  // persimmon trees, bare and bright with fruit
  const kaki = merge([P(GEO.cyl(.1, .2, 2.2, 6), '#3e2c22', [0, 1.1, 0]), P(GEO.cyl(.05, .09, 1.6, 5), '#3e2c22', [.5, 2.5, 0], [0, 0, -.7]), P(GEO.cyl(.05, .09, 1.5, 5), '#3e2c22', [-.45, 2.5, .2], [.3, 0, .7]), P(GEO.cyl(.04, .07, 1.3, 5), '#3e2c22', [0, 2.7, -.4], [-.6, 0, 0])]
    .concat([[.9, 2.9, 0], [1.1, 2.5, .2], [-.8, 2.9, .3], [-1, 2.6, .1], [.1, 3.1, -.7], [0, 2.7, -.9], [.4, 3.2, .1], [-.3, 3.2, .3], [.7, 2.3, -.2]].map(q => P(GEO.sph(.13, 6, 5), '#f08a2a', q))));
  const kakis = [[HR(-8) + 15, -13], [HR(-24) - 16, -19], [HR(16) + 15, 21], [HR(-42) - 6, -47], [HR(32) + 6, 36]];
  W.scene.add(inst(kaki, flat, kakis.map(([x, z]) => ({ p: [x, townH(x, z), z], r: [0, rr() * 6, 0], s: 1.1 + rr() * .4 })), true)); kakis.forEach(([x, z]) => obs(W, x, z, .4));
  // six Jizo statues watch the road into town
  const jizo = merge([P(GEO.cyl(.2, .26, .7, 8), '#8a8a84', [0, .35, 0]), P(GEO.sph(.19, 8, 6), '#9a9a94', [0, .86, 0]), P(GEO.cyl(.24, .24, .12, 8), '#c4302a', [0, .66, 0]), P(GEO.box(.6, .12, .5), '#6a6a66', [0, .02, 0])]);
  W.scene.add(inst(jizo, flat, [0, 1, 2, 3, 4, 5].map(i => ({ p: [HR(-62) + 4.6, townH(HR(-62) + 4.6, -66 + i * .85), -66 + i * .85], r: [0, -E, 0] })), true)); obs(W, HR(-62) + 4.6, -64, 1.4);
  // the marsh bridge, its gate, and the boardwalk to the island
  townGate(W, c, '#b8322a');
  const bx0 = HR(59.5), bx1 = HR(73), ba = Math.atan2(bx1 - bx0, 13.5), bl = Math.hypot(bx1 - bx0, 13.5) + 1;
  const bridge = new THREE.Mesh(merge([P(GEO.box(4.8, .2, bl), '#7a5a3a', [0, .4, 0]), P(GEO.box(.14, .14, bl), dark, [2.3, 1.25, 0]), P(GEO.box(.14, .14, bl), dark, [-2.3, 1.25, 0])]
    .concat([-1, -.5, 0, .5, 1].flatMap(k => [P(GEO.cyl(.11, .11, 2.6, 6), dark, [2.3, .1, k * (bl / 2 - .3)]), P(GEO.cyl(.11, .11, 2.6, 6), dark, [-2.3, .1, k * (bl / 2 - .3)]), P(GEO.cone(.16, .3, 6), '#c9a35a', [2.3, 1.55, k * (bl / 2 - .3)]), P(GEO.cone(.16, .3, 6), '#c9a35a', [-2.3, 1.55, k * (bl / 2 - .3)])]))), flat);
  bridge.position.set((bx0 + bx1) / 2, 0, 66.25); bridge.rotation.y = ba; bridge.castShadow = true; bridge.receiveShadow = true; W.scene.add(bridge);
  const walk = new THREE.Mesh(merge([P(GEO.box(25.5, .14, 3.5), '#8a6a44', [0, .26, 0]), P(GEO.box(4.6, .14, 6), '#8a6a44', [10.5, .258, 0])].concat([...Array(9)].flatMap((_, i) => [P(GEO.cyl(.09, .09, 1.6, 5), dark, [-12 + i * 3, -.3, 1.7]), P(GEO.cyl(.09, .09, 1.6, 5), dark, [-12 + i * 3, -.3, -1.7])]))), flat);
  walk.position.set(-45.5, 0, 10); walk.receiveShadow = true; W.scene.add(walk);
  const isleT = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); isleT.position.set(-56.5, townH(-56.5, 10), 10); isleT.rotation.y = E; isleT.scale.setScalar(.8); isleT.castShadow = true; W.scene.add(isleT);
  // Lady Tomoe's dojo: an open duelling stage beside the bridge
  const [sx, sz] = HARA_STAGE, stage = new THREE.Mesh(merge([P(GEO.box(9.2, .5, 9.2), '#6a4a30', [0, .37, 0]), P(GEO.box(9.6, .12, 9.6), dark, [0, .12, 0]), P(GEO.box(2.4, .2, 1), '#6a4a30', [-5.1, .2, 0])]
    .concat([[1, 1], [1, -1], [-1, 1], [-1, -1]].flatMap(([a, b]) => [P(GEO.cyl(.1, .1, 4.4, 6), dark, [a * 4.4, 2.6, b * 4.4]), P(GEO.box(.06, 2.6, .9), a * b > 0 ? '#b8322a' : '#f4f0e6', [a * 4.4, 3.3, b * 4.4 - .5]), P(GEO.box(.08, .1, 1), dark, [a * 4.4, 4.62, b * 4.4 - .5])]))), flat);
  stage.position.set(sx, 0, sz); stage.castShadow = true; stage.receiveShadow = true; W.scene.add(stage);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => obs(W, sx + a * 4.4, sz + b * 4.4, .3));
  // the painter's easel, facing the mountain
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96; { const x = cv.getContext('2d'); x.fillStyle = '#f2ead6'; x.fillRect(0, 0, 128, 96); x.fillStyle = '#e0563a'; x.beginPath(); x.arc(98, 24, 9, 0, 7); x.fill(); x.fillStyle = '#5a7aa8'; x.beginPath(); x.moveTo(8, 86); x.quadraticCurveTo(46, 70, 58, 30); x.lineTo(70, 30); x.quadraticCurveTo(82, 70, 120, 86); x.fill(); x.fillStyle = '#c9b06a'; x.fillRect(0, 84, 128, 12); }
  const er = HARA_RISE, ex = er[0] - .4, ez = er[1] + 1.6, ey = townH(ex, ez);
  const easel = new THREE.Mesh(merge([P(GEO.cyl(.03, .03, 1.9, 4), wood, [-.4, .93, 0], [-.18, 0, .12]), P(GEO.cyl(.03, .03, 1.9, 4), wood, [.4, .93, 0], [-.18, 0, -.12]), P(GEO.cyl(.03, .03, 1.9, 4), wood, [0, .9, -.5], [.4, 0, 0]), P(GEO.box(1.05, .05, .1), wood, [0, .82, .12])]), flat); easel.position.set(ex, ey, ez); easel.rotation.y = Math.PI; easel.castShadow = true; W.scene.add(easel);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(.96, .72), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) })); art.position.set(ex, ey + 1.24, ez - .17); art.rotation.set(.18, Math.PI, 0); W.scene.add(art); obs(W, ex, ez, .6);
  // where the Frost Giant stands, the plain has frozen
  const ice = toon({ color: '#bfeaff', emissive: new COL('#2a7fa8'), emissiveIntensity: .5, transparent: true, opacity: .9, flatShading: true }), spikes = [];
  for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283 + rr() * .2, r = 9.5 + rr() * 3, x = HARA_FROST[0] + Math.cos(a) * r, z = HARA_FROST[1] + Math.sin(a) * r; if (a > 2.7 && a < 3.9) continue; obs(W, x, z, .7); for (let k = 0; k < 3; k++) spikes.push({ p: [x + rr() - .5, townH(x, z) + .3, z + rr() - .5], r: [rr() * .8 - .4, rr() * 3, rr() * .8 - .4], s: [.25 + rr() * .2, .9 + rr() * 1.8, .25 + rr() * .2] }); }
  W.scene.add(inst(GEO.oct(1), ice, spikes, false));
  [[5, 3], [-4, 5], [0, -6]].forEach(([a, b]) => { const h = halo('#bff4ff', 3.4, .45); h.position.set(HARA_FROST[0] + a, townH(HARA_FROST[0] + a, HARA_FROST[1] + b) + 1.2, HARA_FROST[1] + b); W.scene.add(h); });
  const fsnow = new Ambient({ n: 260, tex: TEX.flake, color: '#ffffff', color2: '#cfe6ff', size: .06, alpha: .9, cx: HARA_FROST[0], cy: 4, cz: HARA_FROST[1], ax: 12, ay: 5, az: 12, sway: .6, vel: r => [.2 + r() * .2, -.7 - r() * .4, 0], seed: 9 }); W.ambient.push(fsnow);
  // red-crowned cranes feed in the shallows and take off when you come close
  const cranes = [[-37.5, 4], [-38.5, 16], [-37, -22], [-39, -26], [-38, 40], [-36.5, 52], [-37.6, -52]].map(([x, z], i) => { const g = haraCrane(); g.home = new V3(x, Math.max(haraH(x, z, true), -.5), z); g.position.copy(g.home); g.rotation.y = i * 1.7; g.st = 0; g.t = i; W.scene.add(g); return g; });
  const _d = new V3();
  W.tick = (dt, T) => {
    const lum = W.key.intensity / .72, night = 1 - smooth(.3, .6, lum), d = T.day, dawn = Math.max(0, 1 - Math.min(d, 1 - d) / .1), dusk = Math.max(0, 1 - Math.abs(d - .56) / .07) * .65;
    W.fuji.material.color.setRGB(lerp(1, .2, night), lerp(1, .24, night), lerp(1, .42, night)); W.fujiRed.material.opacity = Math.max(dawn, dusk) * (1 - night * .5);
    W.paddy.material.color.set('#8fb4b0').lerp(_hc[2], night * .7);
    for (const g of cranes) {
      g.t += dt;
      if (g.st === 0) { // feeding
        const peck = Math.max(0, Math.sin(g.t * .7 + g.home.x)) > .92 ? .5 : 0; g.rotation.x = lerp(g.rotation.x, peck, damp(5, dt)); g.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * 1.35; w.scale.y = 1; });
        if (Math.hypot(T.pos.x - g.home.x, T.pos.z - g.home.z) < 8.5 && !T.paused) { g.st = 1; g.t = 0; _d.set(g.home.x - T.pos.x, 0, g.home.z - T.pos.z).normalize(); g.dir = new V3(_d.x - .7, 0, _d.z).normalize(); g.rotation.x = 0; }
      } else {
        const out = g.t < 9, k = out ? g.t : 18 - g.t, u = Math.max(0, k);
        g.position.set(g.home.x + g.dir.x * u * 6.5, g.home.y + Math.min(11, u * 2.1) + Math.sin(g.t * 2) * .3, g.home.z + g.dir.z * u * 6.5 + Math.sin(u * .5) * 6);
        g.rotation.y = Math.atan2(g.dir.x, g.dir.z) + (out ? 0 : Math.PI); g.rotation.x = -.15;
        g.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(g.t * 8) * .75; });
        if (g.t >= 18) { g.st = 0; g.t = 0; g.position.copy(g.home); g.rotation.x = 0; }
      }
    }
  };
}

/* duels in Hara are fought in the open grass under the mountain: at sunrise for Lady Tomoe, in a frozen ring for the giant */
function haraArena(role) {
  const W = newWorld('hara-duel'), frost = role === 'myth', dawn = role === 'keeper';
  if (dawn) { addSky(W, { top: '#1c3a6a', mid: '#f2a878', bot: '#ffe2b4', sunDir: new V3(.8, .09, .6), sunCol: '#fff0c0', sunDeg: 4.5, fog: '#e8c4a8', fogNear: 22, fogFar: 150, stars: false, haze: .65 });
    addLights(W, { sky: '#ffd8b8', ground: '#6a5a4a', hemi: .75, key: '#ffc890', keyI: .9, keyDir: new V3(.8, .45, .3), rim: '#ff9a7a', rimI: .8, rimDir: new V3(-.3, .5, 1) }); }
  else if (frost) { addSky(W, { top: '#0a1534', mid: '#4f74af', bot: '#b8d0f0', sunDir: new V3(-.35, .42, 1), sunCol: '#e8f2ff', sunDeg: 3, fog: '#9fb8d8', fogNear: 16, fogFar: 110, stars: true, haze: .3 });
    addLights(W, { sky: '#b8d4ff', ground: '#4a5a7a', hemi: .8, key: '#e6f0ff', keyI: .85, keyDir: new V3(-.5, 1, .6), rim: '#7fd8ff', rimI: 1, rimDir: new V3(.2, .6, 1) }); }
  else { addSky(W, { top: '#1f4f8c', mid: '#8fb4d6', bot: '#f2ead0', sunDir: new V3(-.5, .5, .4), sunCol: '#fff2dc', sunDeg: 3.5, fog: '#d6d6c0', fogNear: 26, fogFar: 160, stars: false, haze: .5 });
    addLights(W, { sky: '#e8ecff', ground: '#6a6a4a', hemi: .8, key: '#fff0dc', keyI: .9, keyDir: new V3(-.5, 1, .35), rim: '#ffe0a0', rimI: .7, rimDir: new V3(.4, .5, 1) }); }
  const straw = new COL(frost ? '#dfeaf2' : '#b8a070'), far = new COL(frost ? '#a8c0dc' : '#8a7a4a');
  addGround(W, { a: frost ? '#e9f1fa' : '#c2ac62', b: frost ? '#cddcef' : '#a8924c', c: frost ? '#b8c9e6' : '#8a7a4a', clear: 9, hill: 1.4, pattern: (x, z, t) => { const r = Math.hypot(x, z - 2.6); if (r < 7.5) t.lerp(straw, 1 - smooth(4.6, 7.5, r)); else if (frost && r > 16) t.lerp(new COL('#c8a850'), smooth(16, 26, r)); } });
  addFuji(W, 0, 430, 250, 150); if (dawn) W.fujiRed.material.opacity = 1; if (frost) W.fuji.material.color.setRGB(.5, .58, .8);
  addMountains(W, { base: far.getStyle(), top: '#93a8c8', snow: '#f4f8ff', snowLine: 2, r0: 170, r1: 250, h0: 10, h1: 28, a0: 1, a1: 5.28, n: 16, seed: 21 });
  const clear = (x, z) => laneClear(x, z) || Math.hypot(x, z - 2.6) < 5.4;
  const gold = scatter(700, 5.6, 46, 71, (x, z) => clear(x, z) || (frost && Math.hypot(x, z - 2.6) < 17));
  W.scene.add(inst(pampasGeo('#c8a444', '#a8862e', '#e6d6a6'), windify(toon({ vertexColors: true }), .16), gold.map(([x, z, k]) => ({ p: [x, W.hAt(x, z) - .04, z], r: [0, k * 6, 0], s: .8 + k * .9 })), false));
  if (frost) {
    const white = scatter(260, 5.6, 17, 72, clear);
    W.scene.add(inst(pampasGeo('#dfeaf2', '#b8ccdc', '#ffffff'), windify(toon({ vertexColors: true }), .05), white.map(([x, z, k]) => ({ p: [x, W.hAt(x, z) - .04, z], r: [0, k * 6, 0], s: .8 + k * .9 })), false));
    const ice = toon({ color: '#bfeaff', emissive: new COL('#2a7fa8'), emissiveIntensity: .5, transparent: true, opacity: .9, flatShading: true }), sp = [];
    scatter(22, 6.5, 15, 73, clear).forEach(([x, z, k]) => { for (let i = 0; i < 3; i++) sp.push({ p: [x + rnd(-.5, .5), .3, z + rnd(-.5, .5)], r: [rnd(-.4, .4), rnd(0, 3), rnd(-.4, .4)], s: [.25 + k * .2, .9 + k * 1.8, .25 + k * .2] }); });
    W.scene.add(inst(GEO.oct(1), ice, sp, false));
    W.ambient.push(new Ambient({ n: 700, tex: TEX.flake, color: '#ffffff', color2: '#cfe6ff', size: .055, alpha: .9, cx: 0, cy: 5, cz: 3, ax: 16, ay: 7, az: 16, sway: .8, vel: r => [.4 + r() * .4, -.9 - r() * .5, -.1 + r() * .3], seed: 5 }));
  } else {
    W.ambient.push(new Ambient({ n: 140, tex: TEX.flake, color: '#fff6d8', color2: '#ffe8b0', size: .08, alpha: .8, cx: 0, cy: 3, cz: 3, ax: 14, ay: 4, az: 14, sway: .8, vel: r => [.5 + r() * .4, -.05 - r() * .1, r() * .2], seed: 6 }));
  }
  if (dawn) { // the dojo's stage posts and banners frame the duel
    const dark = '#3a2416';
    W.scene.add(new THREE.Mesh(merge([[1, 1], [1, -1], [-1, 1], [-1, -1]].flatMap(([a, b]) => [P(GEO.cyl(.1, .1, 4.6, 6), dark, [a * 5, 2.3, 2.6 + b * 6]), P(GEO.box(.9, 2.6, .06), a * b > 0 ? '#b8322a' : '#f4f0e6', [a * 5 - a * .5, 3.2, 2.6 + b * 6]), P(GEO.box(1, .1, .08), dark, [a * 5 - a * .5, 4.55, 2.6 + b * 6])])), toon({ vertexColors: true, flatShading: true })));
    W.scene.children[W.scene.children.length - 1].castShadow = true;
  }
  addClouds(W, { color: dawn ? '#ffc8a8' : frost ? '#8fa6d6' : '#e6e6dc', n: 10, opacity: .55, y0: 50 });
  return W;
}

Object.assign(TOWN_BY.hara, {
  flip: 1, fuji: null, pal: ['#e8e2c8', '#b8a25e', '#a48c54', '#d6c8a2'], day: .3, cloud: '#e6e2d2', lay: HARA_LAY, h: haraH, hMesh: (x, z) => haraH(x, z, true), tint: haraTint, decor: haraDecor, arena: haraArena,
  mapBg: (sx, sy) => { const p = HARA_PAD, road = []; for (let z = -90; z <= 90; z += 6) road.push(`${sx(HR(z))},${sy(z)}`);
    return `<rect x="0" y="0" width="${sx(-37)}" height="300" fill="#2f6a6a"/><rect x="0" y="${sy(71)}" width="320" height="${sy(61) - sy(71)}" fill="#2f6a6a"/>
      <rect x="${sx(p.x0)}" y="${sy(p.z0 + 67)}" width="${47 * 1.5}" height="${67 * 1.5}" fill="#6a7a4a" stroke="#8a7448"/><circle cx="${sx(HARA_ISLE[0])}" cy="${sy(HARA_ISLE[1])}" r="9" fill="#8a8a4a"/>
      <line x1="${sx(-56)}" y1="${sy(10)}" x2="${sx(-34)}" y2="${sy(10)}" stroke="#8a6a44" stroke-width="3"/><circle cx="${sx(HARA_FROST[0])}" cy="${sy(HARA_FROST[1])}" r="14" fill="#dfeaf2" opacity=".5"/>
      <polyline points="${road.join(' ')}" fill="none" stroke="#c9b48c" stroke-width="5"/><text x="6" y="150" font-size="9" fill="#bfe0d8">marsh</text>`; },
  roadK: (x, z) => 1 - smooth(60, 61.5, z) * (1 - smooth(71, 72.5, z)),
  gate: { guard: 'Bridge Keeper', place: 'marsh bridge', halt: "Hold, traveler. This bridge is the only way across the floating marsh, and it belongs to Lady Tomoe's dojo. What is your business on the Tokaido?" },
});
Object.assign(TOWN_BY.hara.keeper, { where: 'on the dojo stage', dawn: true, notYet: 'I duel only at sunrise, when the mountain turns red. Wait with me, ronin. The night is short on this plain.', ask: 'The mountain is red. Read my stance, ronin, and show me the road has taught you something.' });
Object.assign(TOWN_BY.hara.b, { look: { cloth: '#3a4a6a', armor: '#3a4a6a', trim: '#e8dcc0', helm: 'band', helmCol: '#e8dcc0', crest: null, eye: '#ffe6a0' }, sub: 'On the rise, painting Fuji', ask: 'The wind off the mountain scattered my three best brushes across the plain. I cannot finish Fuji without them.' });
TOWN_BY.hara.a.wait = 'Daigo lounges in the tall grass south-west of town, near the marsh.';
TOWN_BY.hara.note[1] += ' At sunrise the snow and rock can glow red for a few minutes, a sight called Red Fuji. Hara was also the birthplace, in 1686, of the Zen teacher Hakuin. People said the province had two things too great for it: Mount Fuji, and Hakuin of Hara.';
