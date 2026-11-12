'use strict';
/* ===== Shimada: the Oi River crossing =====
   A town of inns packed behind a levee, waiting on a river with no bridge. It is raining and the Oi is high:
   the fords are drowned and nobody crosses. Calm the kappa and the rain stops, the river falls,
   the fords open, and Boss Gonta's porters will carry you over on their shoulders. */

const SH_ISLE = [-64, 20], SH_BAR = [-60, -30], SH_SHRINE = [-27, 38], SH_STATION = [HR(55) + 8, 51], SH_TEA = [62, 8], SH_CAMP = [34, 49];
const SH_LAY = {
  ema: [[HR(-34) + 17, -31], [HR(10) - 19, 14], [24, 40]],
  emaCol: '#7fd24a', emaGeo: () => GEO.cyl(.1, .08, .7, 7), emaHint: ' They are bright green. You cannot miss them.',
  chest: [SH_BAR, SH_TEA],
  chestHint: ['In a chest on a gravel bar in the river, west of town. You can only wade out when the river is low', 'In a chest up in the tea fields on the eastern hill'],
  flats: [[SH_SHRINE[0], SH_SHRINE[1], 4.5, .25], [SH_STATION[0], SH_STATION[1], 5.5, .25], [HR(57), 57, 5.5, .22], [SH_CAMP[0], SH_CAMP[1], 4.5, .25], [SH_TEA[0], SH_TEA[1], 3, 7.2], [HR(-34) + 17, -31, 5, .25]],
  pos: {
    guard: [HR(GATE_Z) - 1.9, GATE_Z - 2.4, Math.PI], keeper: [HR(55) + 4.6, 55.5, Math.PI * 1.2],
    a: [HR(40) - 5.2, 41, Math.PI / 2], friendA: [HR(46) - 5.4, 46.5, Math.PI / 2], smith: [HR(-6) + 7.2, -6, -Math.PI / 2],
    b: [SH_SHRINE[0] + 2.2, SH_SHRINE[1] - 1.6, -.6], foe: [SH_CAMP[0], SH_CAMP[1], -1.2], myth: [SH_ISLE[0], SH_ISLE[1], 1.57],
  },
};
function shCrossX(z) { return lerp(HR(59.5), HR(84), clamp((z - 59.5) / 24.5, 0, 1)); }
function shimadaH(x, z) {
  const rd = Math.abs(x - HR(z));
  let h = Math.max(.15, .35 + (fbm(x * .05 + 23, z * .05 + 5) - .5) * .9);
  h += smooth(36, 82, x) * 11 * (.7 + .5 * fbm(x * .03 + 4, z * .03)); // the tea hill
  const edge = Math.max(-z - 86, 0); h += Math.min(edge * edge * .1, 5);
  // the levee: along the river's south bank and down its east bank
  const lv = Math.max((1 - smooth(1.6, 4.6, Math.abs(z - 54.5))) * smooth(-37, -33, x), (1 - smooth(1.6, 4.6, Math.abs(x + 34))) * (1 - smooth(52, 56, z)));
  h = Math.max(h, .2 + 2.3 * lv);
  h = lerp(h, .2, 1 - smooth(2.8, 6.5, rd));
  for (const f of SH_LAY.flats) { const d = Math.hypot(x - f[0], z - f[1]); if (d < f[2] + 5) h = lerp(f[3], h, smooth(f[2], f[2] + 5, d)); }
  // the Oi: across the north, and bending down the west side
  const rn = smooth(61, 63.5, z) * (1 - smooth(81, 83.5, z)), rw = smooth(-38.5, -42.5, x) * (1 - smooth(81, 83.5, z));
  if (rw > 0) {
    let bed = -1.25 + smooth(.62, .72, fbm(x * .09 + 6, z * .09 + 2)) * 1.55 * smooth(-46, -52, x);
    bed = lerp(.45, bed, smooth(6.5, 9.5, Math.hypot(x - SH_ISLE[0], z - SH_ISLE[1])));
    bed = lerp(.38, bed, smooth(4.5, 7.5, Math.hypot(x - SH_BAR[0], z - SH_BAR[1])));
    if (x > -60 && x < -36) bed = lerp(-.3, bed, smooth(2.2, 4.2, Math.abs(z - SH_ISLE[1])));
    if (x > -57 && x < -36) bed = lerp(-.3, bed, smooth(2.2, 4.2, Math.abs(z - SH_BAR[1])));
    h = lerp(h, bed, rw);
  }
  if (rn > 0 && x > -44) h = lerp(h, lerp(-.5, -1.25, smooth(3.2, 5.6, Math.abs(x - shCrossX(z)))), rn);
  return h;
}
const _sc = [new COL('#b9b6aa'), new COL('#5f7078'), new COL('#4f7a3c'), new COL('#5a6a3a')];
function shimadaTint(x, z, h, t) {
  const river = Math.max(smooth(60, 62.5, z) * (1 - smooth(82, 84.5, z)), smooth(-37.5, -41, x) * (1 - smooth(82, 84.5, z)));
  if (river > 0) { t.lerp(_sc[0], river * (.75 + .25 * hash2(Math.round(x * 3), Math.round(z * 3)))); t.lerp(_sc[1], smooth(-.55, -1.1, h) * river); }
  else if (h > 1 && x < 34) t.lerp(_sc[2], smooth(1, 2.2, h) * .7);
  if (x > 38) t.lerp(_sc[3], smooth(38, 50, x) * .6);
}
function willowGeo() {
  const parts = [P(GEO.cyl(.16, .3, 3.4, 6), '#4a3a2a', [0, 1.7, 0], [0, 0, .08]), P(GEO.dodec(1), '#6a9a4a', [.2, 4.1, 0], null, [1.9, .9, 1.9])];
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, r = 1.3 + (i % 3) * .3; parts.push(P(GEO.cone(.16, 2.6 + (i % 4) * .4, 4), i % 2 ? '#7fae54' : '#93bf62', [.2 + Math.cos(a) * r, 2.9 - (i % 4) * .2, Math.sin(a) * r], [Math.PI, 0, 0])); }
  return merge(parts);
}
const SH_PORTER = { cloth: '#c89a6a', armor: '#c89a6a', trim: '#2a4a7a', helm: 'band', helmCol: '#f4efe4', crest: null, eye: '#ffe6a0', scarf: '#2a4a7a' };

function shimadaDecor(W, c) {
  const rr = mulberry(523), wood = '#5a3a26', dark = '#3a2416', E = Math.PI / 2;
  const flat = toon({ vertexColors: true, flatShading: true });
  const onFlat = (x, z, pad) => SH_LAY.flats.some(f => Math.hypot(x - f[0], z - f[1]) < f[2] + pad) || SH_LAY.ema.concat(SH_LAY.chest).some(f => Math.hypot(x - f[0], z - f[1]) < 3.5);
  const rain0 = S.town.jobs.b === 2 ? 0 : 1;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshBasicMaterial({ color: '#6f8f9c', transparent: true, opacity: .86 })); water.rotation.x = -Math.PI / 2; water.position.y = rain0 ? .06 : -.22; W.scene.add(water); W.water = water; W.waterCol = '#6f8f9c';
  W.rainAmt = rain0; W.minH = rain0 ? 0 : -.56;
  addMountains(W, { base: '#4f6a5a', top: '#8aa890', snow: '#f4f8ff', snowLine: 2, r0: 150, r1: 250, h0: 16, h1: 48, a0: -3.6, a1: 2.2, n: 24, seed: 31 });
  // the town of inns: two tight rows along the road, full of travellers waiting on the river
  const inn = (k) => ({ roof: ['#3a3a42', '#44403c', '#33363e'][k % 3], cap: '#55555e', wall: ['#e8dcc0', '#dccfae', '#efe6d0'][k % 3], h: k % 3 === 1 ? 4.4 : 2.8, rh: 1.6, win: '#ffcf86' });
  let k = 0; const taken = [];
  for (let z = -52; z <= 44; z += 11.5) for (const sd of [-1, 1]) {
    k++; if ((sd > 0 && Math.abs(z + 6) < 6)) { townHouse(W, c, HR(z) + 12, z, -E, 7, 6, { roof: '#33302e', wall: '#d8c8a8', win: '#ffb86a' }); taken.push([HR(z) + 12, z]); continue; }
    if (sd < 0 && z > 36) continue;
    const w = 7 + (k % 2), x = HR(z) + sd * (10.5 + (k % 3) * .4); townHouse(W, c, x, z, sd > 0 ? -E : E, w, 6, inn(k)); taken.push([x, z]);
  }
  const nearHouse = (x, z, r) => taken.some(([a, b]) => Math.hypot(x - a, z - b) < r);
  addLanterns(W, [[HR(-46) - 3.4, -46], [HR(-22) + 3.4, -22], [HR(2) - 3.4, 2], [HR(24) + 3.4, 24], [HR(46) - 3.4, 46], [HR(57) + 3.8, 57.5]], '#7a8478', '#ffb860');
  // paper lanterns strung along the eaves
  { const l = []; for (let z = -50; z <= 46; z += 5.75) for (const sd of [-1, 1]) l.push({ p: [HR(z) + sd * 6.6, townH(HR(z) + sd * 6.6, z) + 2.5, z] }); W.scene.add(inst(GEO.sph(.2, 7, 6), glowify(new THREE.MeshBasicMaterial({ color: '#ffb060', fog: false })), l, false)); }
  // willows on the levee
  const wl = [];
  for (let x = -30; x <= 84; x += 8.5) { const xx = x + rr() * 3; if (Math.abs(xx - HR(54.5)) < 9 || onFlat(xx, 54.5, 2)) continue; wl.push({ p: [xx, townH(xx, 54.5) - .1, 54.5 + rr() - .5], r: [0, rr() * 6, 0], s: 1 + rr() * .4 }); obs(W, xx, 54.5, .4); }
  for (let z = -84; z <= 46; z += 9.5) { const zz = z + rr() * 3; if (Math.abs(zz - SH_ISLE[1]) < 5 || Math.abs(zz - SH_BAR[1]) < 5 || onFlat(-34, zz, 2)) continue; wl.push({ p: [-34 + rr() - .5, townH(-34, zz) - .1, zz], r: [0, rr() * 6, 0], s: 1 + rr() * .4 }); obs(W, -34, zz, .4); }
  for (let i = 0; i < 14; i++) { const x = -40 + rr() * 110, z = 85 + rr() * 6; if (Math.abs(x - HR(z)) > 5) wl.push({ p: [x, townH(x, z) - .1, z], r: [0, rr() * 6, 0], s: 1.1 + rr() * .5 }); }
  W.scene.add(inst(willowGeo(), windify(toon({ vertexColors: true, flatShading: true }), .045), wl, true));
  // garden trees and bamboo behind the inns
  const tree = merge([P(GEO.cyl(.14, .22, 1.8, 6), '#4a3428', [0, .9, 0]), P(GEO.dodec(1), c.tree[0], [0, 2.6, 0], null, [1.5, 1.2, 1.5]), P(GEO.dodec(1), c.tree[2], [.5, 3.3, .2], [0, 1, 0], [1, .8, 1])]), trees = [];
  for (let i = 0; i < 260 && trees.length < 70; i++) { const x = -30 + rr() * 64, z = -88 + rr() * 138, h = townH(x, z); if (Math.abs(x - HR(z)) < 15 || h > 1.6 || onFlat(x, z, 2) || nearHouse(x, z, 6)) continue; const s = .9 + rr() * .7; trees.push({ p: [x, h - .1, z], r: [0, rr() * 6, 0], s }); obs(W, x, z, .35 * s); }
  for (let i = 0; i < 30; i++) { const x = -34 + rr() * 110, z = -92 + rr() * 6; trees.push({ p: [x, townH(x, z) - .1, z], r: [0, rr() * 6, 0], s: 1.2 + rr() }); }
  W.scene.add(inst(tree, windify(toon({ vertexColors: true, flatShading: true }), .02), trees, true));
  const tuft = merge([P(GEO.cone(.05, .5, 4), '#6f9a4a', [0, .25, 0]), P(GEO.cone(.045, .4, 4), '#5a8a3e', [.07, .2, .03], [0, 0, -.3]), P(GEO.cone(.045, .42, 4), '#8ab25a', [-.06, .21, -.04], [0, 0, .3])]), tufts = [];
  for (let i = 0; i < 2400; i++) { const x = -38 + rr() * 76, z = (rr() * 2 - 1) * 90, h = townH(x, z); if (h < .12 || z > 60 && z < 84 || Math.abs(x - HR(z)) < 3.4 || nearHouse(x, z, 4.2)) continue; tufts.push({ p: [x, h, z], r: [0, rr() * 6, 0], s: .8 + rr() * 1.3 }); }
  W.scene.add(inst(tuft, windify(toon({ vertexColors: true }), .22), tufts, false));
  // tea fields: clipped rows that follow the eastern hill
  const rows = [];
  for (let x = 41; x <= 86; x += 2.7) for (let z = -62; z <= 46; z += 2.9) { const zz = z + Math.sin(x * .4) * .6, h = townH(x, zz); if (h < 1 || onFlat(x, zz, 1)) continue; rows.push({ p: [x, h + .15, zz], r: [0, Math.atan2(townH(x, zz + 1.5) - h, 1.5) * 0, 0], s: [1.05, .62 + hash2(x * 7 | 0, z | 0) * .12, 1.6] }); }
  W.scene.add(inst(merge([P(GEO.sph(1, 7, 5), '#2f6a3a', [0, 0, 0], null, null, (x, y) => y > .35 ? new COL('#5aa04e') : new COL('#2a5e36'))]), toon({ vertexColors: true, flatShading: true }), rows, false));
  W.scene.children[W.scene.children.length - 1].receiveShadow = true;
  { const hut = SH_TEA; townHouse(W, c, hut[0] + 5.5, hut[1] + 3, -E, 4.5, 4, { roof: '#a8884a', cap: '#c8a860', rh: 2, wall: '#d8c8a8' }); }
  // river stones on the bars and banks
  const rock = merge([P(GEO.dodec(1), '#9a988e', [0, 0, 0], null, null, (x, y) => new COL(y > .3 ? '#b8b6ac' : '#84827a'))]), rocks = [];
  for (let i = 0; i < 900 && rocks.length < 230; i++) {
    const west = rr() < .55, x = west ? -40 - rr() * 50 : -44 + rr() * 134, z = west ? -90 + rr() * 172 : 61 + rr() * 22, h = townH(x, z);
    if (h < -.25 || h > .7 || Math.abs(x - shCrossX(z)) < 4 && !west || onFlat(x, z, 1.5) || (west && (Math.abs(z - SH_ISLE[1]) < 3.5 || Math.abs(z - SH_BAR[1]) < 3.5) && x > -58)) continue;
    const q = rr(), big = q > .9; rocks.push({ p: [x, h + .05, z], r: [q * 3, q * 5, 0], s: big ? [.9 + q, .6 + q * .4, .8 + q] : [.25 + q * .4, .16 + q * .2, .25 + q * .35] }); if (big) obs(W, x, z, .9 + q * .5);
  }
  W.scene.add(inst(rock, flat, rocks, true));
  const reed = merge([P(GEO.cone(.03, 1.7, 4), '#5a7a3a', [0, .85, 0]), P(GEO.cone(.03, 1.4, 4), '#6a8a44', [.08, .7, .05], [0, 0, -.12]), P(GEO.cone(.03, 1.5, 4), '#4a6a34', [-.07, .75, -.04], [0, 0, .14])]), reeds = [];
  for (let i = 0; i < 1600 && reeds.length < 380; i++) { const x = -40 - rr() * 50, z = -90 + rr() * 172, h = townH(x, z); if (h < -.1 || h > .6 || Math.abs(z - SH_ISLE[1]) < 4 || Math.abs(z - SH_BAR[1]) < 4 || Math.hypot(x - SH_ISLE[0], z - SH_ISLE[1]) < 5) continue; reeds.push({ p: [x, h, z], r: [0, rr() * 6, 0], s: .8 + rr() * .8 }); }
  W.scene.add(inst(reed, windify(toon({ vertexColors: true }), .08), reeds, false));
  // the crossing: a gate at the bank, the porters' station, and a line of poles and rope over the ford
  townGate(W, c, '#44444c');
  { const [sx, sz] = SH_STATION, st = new THREE.Mesh(merge([P(GEO.box(8, .25, 6), '#6a4a30', [0, .32, 0]), P(GEO.cone(1, 1, 4), '#3a3a42', [0, 3.9, 0], [0, Math.PI / 4, 0], [6.6, 1.6, 5.2]), P(GEO.box(6, 1.5, .08), '#2a4a7a', [0, 2.4, 2.9]), P(GEO.box(1.6, 1.6, .1), '#f4efe4', [0, 2.4, 2.95])]
      .concat([[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => P(GEO.cyl(.12, .12, 3, 6), dark, [a * 3.7, 1.7, b * 2.7])))), flat); st.position.set(sx, townH(sx, sz) - .1, sz); st.rotation.y = Math.PI; st.castShadow = true; W.scene.add(st);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => obs(W, sx + a * 3.7, sz + b * 2.7, .3)); }
  { const poles = [], ropes = []; for (let z = 62.5; z <= 82; z += 3.9) for (const sd of [-1, 1]) { const x = shCrossX(z) + sd * 3.4; poles.push({ p: [x, .4, z] }); if (z + 3.9 <= 82) { const x2 = shCrossX(z + 3.9) + sd * 3.4; ropes.push({ p: [(x + x2) / 2, 1.5, z + 1.95], r: [0, Math.atan2(x2 - x, 3.9), 0], s: [1, 1, Math.hypot(x2 - x, 3.9)] }); } }
    W.scene.add(inst(merge([P(GEO.cyl(.09, .11, 3.2, 6), dark, [0, 0, 0]), P(GEO.box(.3, .4, .04), '#f4efe4', [0, 1.3, .1])]), flat, poles, true)); W.scene.add(inst(GEO.box(.05, .05, 1), toon({ color: '#c9b48c' }), ropes, false)); }
  // the kappa's shrine on the bank, and its island out in the river
  { const [x, z] = SH_SHRINE, y = townH(x, z), sh = new THREE.Mesh(merge([P(GEO.box(1.4, .8, 1.4), '#8a8a84', [0, .4, 0]), P(GEO.box(1, 1, .9), wood, [0, 1.3, 0]), P(GEO.cone(1, 1, 4), '#3a5a3a', [0, 2.15, 0], [0, Math.PI / 4, 0], [1.1, .7, 1]), P(GEO.box(.5, .6, .06), '#1c1410', [0, 1.25, .46]), P(GEO.cyl(.5, .5, .08, 12), '#bfe2ee', [0, .84, .95]), P(GEO.cyl(.07, .07, .5, 6), '#7fd24a', [.15, .9, .95], [0, 0, 1.57])]), flat); sh.position.set(x, y, z); sh.rotation.y = -.6; sh.castShadow = true; W.scene.add(sh); obs(W, x, z, 1);
    const tor = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); tor.position.set(SH_ISLE[0] + 6, townH(SH_ISLE[0] + 6, SH_ISLE[1]), SH_ISLE[1]); tor.rotation.y = E; tor.scale.setScalar(.9); tor.castShadow = true; W.scene.add(tor);
    [[3, 3], [-4, 2], [0, -5]].forEach(([a, b]) => { const h = halo('#7fe8d0', 3, .4); h.position.set(SH_ISLE[0] + a, 1.4, SH_ISLE[1] + b); W.scene.add(h); }); }
  // Kurozo's camp by the water: cut ropes and a small fire
  { const [x, z] = SH_CAMP, h = halo('#ff9a4a', 2.6, .6); h.position.set(x + 1.6, townH(x, z) + .5, z + 1); W.scene.add(h); W.scene.add(inst(GEO.cyl(.06, .06, 1, 5), toon({ color: '#c9b48c' }), [0, 1, 2, 3].map(i => ({ p: [x - 1.5 + i * .5, townH(x, z) + .06, z + 1.8 + (i % 2) * .4], r: [0, i, 1.57] })), false)); }
  // vegetable patch where the first cucumber fell
  { const [x, z] = SH_LAY.ema[0], g = []; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i || j) g.push({ p: [x + i * 1.1, townH(x, z) + .1, z + j * 1.1], r: [0, (i + j) * 1.3, 0], s: .8 + ((i * 3 + j) & 1) * .3 }); W.scene.add(inst(merge([P(GEO.sph(.3, 6, 4), '#4f8a3c', [0, .1, 0], null, [1, .6, 1]), P(GEO.cone(.1, .5, 4), '#6faa4a', [0, .4, 0])]), flat, g, false)); }
  // rain, and streaks of current on the river
  const rain = new Ambient({ n: 1300, tex: TEX.flake, color: '#b8cce0', color2: '#8fa8c4', size: .075, alpha: .8, cx: 0, cy: 5, cz: 0, ax: 16, ay: 7, az: 16, sway: .1, vel: r => [1.2 + r() * .4, -12 - r() * 4, .2], seed: 4 }); W.ambient.push(rain); W.rain = rain;
  const streaks = []; for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4 + rr() * 3, .12), new THREE.MeshBasicMaterial({ color: '#e8f2f6', transparent: true, opacity: .35, depthWrite: false })); m.rotation.x = -E; m.userData = { north: i < 36, t: rr() * 100, v: 2.4 + rr() * 2.2, o: (rr() * 2 - 1) }; W.scene.add(m); streaks.push(m); }
  // the porters and their carrying platform
  const carry = new THREE.Group(); carry.visible = false; W.scene.add(carry);
  const litter = new THREE.Mesh(merge([P(GEO.box(1.5, .08, 1.9), '#8a6a44', [0, 0, 0]), P(GEO.cyl(.05, .05, 3.6, 6), dark, [.7, -.06, 0], [1.57, 0, 0]), P(GEO.cyl(.05, .05, 3.6, 6), dark, [-.7, -.06, 0], [1.57, 0, 0]), P(GEO.box(1.5, .3, .05), '#8a6a44', [0, .18, .93]), P(GEO.box(1.5, .3, .05), '#8a6a44', [0, .18, -.93])]), flat); litter.castShadow = true; carry.add(litter);
  const porters = [[.72, 1.35], [-.72, 1.35], [.72, -1.35], [-.72, -1.35]].map(o => { const r = new Samurai(SH_PORTER, swordDef('bokken'), { noSaya: true }); r.sword.visible = false; r.root.rotation.order = 'YXZ'; r.setHold('rest', 6); r.off = o; r.root.visible = false; W.scene.add(r.root); return r; });
  const _g = [new COL('#8a96a4'), new COL('#5f6b78'), new COL('#9aa6b0'), new COL('#b4bec6')];
  W.tick = (dt, T) => {
    const dry = S.town.jobs.b === 2;
    W.rainAmt = clamp(W.rainAmt + (dry ? -dt / 7 : dt / 7), 0, 1); const r = W.rainAmt;
    W.minH = r > .45 ? 0 : -.56; water.position.y = lerp(-.22, .06, smooth(.1, .9, r));
    for (const m of streaks) { const u = m.userData; u.t += dt * u.v * (1 + r); if (u.north) { const z = 71.5 + u.o * 8.5; m.position.set(88 - (u.t % 132), water.position.y + .02, z); m.rotation.z = 0; } else { m.position.set(-62 + u.o * 19, water.position.y + .02, 60 - (u.t % 150)); m.rotation.z = E; } }
    const on = !!S.town.pass && T.pos.z > 62.3 && T.pos.z < 82.2;
    if (on) { const rx = townRoadX(T.pos.z), k = damp(3.2, dt); T.pos.x = lerp(T.pos.x, rx, k); if (townH(T.pos.x, T.pos.z) >= W.minH) T.lastGood.copy(T.pos); } // the porters know the ford: they keep to it whatever you steer
    T.lift = lerp(T.lift || 0, on ? 1.42 : 0, damp(5, dt)); if (T.lift < .02) T.lift = 0;
    carry.visible = T.lift > .05;
    if (carry.visible) {
      const sn = Math.sin(T.face), cs = Math.cos(T.face), bob = Math.sin(T.phase * 2) * .025 * T.speed;
      carry.position.set(T.pos.x, T.pos.y + T.lift - .06 + bob, T.pos.z); carry.rotation.y = T.face;
      porters.forEach((p, i) => { const x = T.pos.x + p.off[0] * cs + p.off[1] * sn, z = T.pos.z - p.off[0] * sn + p.off[1] * cs, ph = T.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 1 : 0), k = T.speed;
        p.root.visible = true; p.root.position.set(x, townH(x, z) - (1.42 - T.lift) * .2, z); p.root.rotation.y = T.face;
        p.feet.L.set(.15, .035 + Math.max(0, Math.sin(ph)) * .1 * k, Math.sin(ph) * .22 * k); p.feet.R.set(-.15, .035 + Math.max(0, -Math.sin(ph)) * .1 * k, -Math.sin(ph) * .22 * k); p.armSwing = 0; p.leanAdd = .08; p.update(dt); });
    } else porters.forEach(p => { p.root.visible = false; });
  };
  W.post = (dt, T) => {
    const r = W.rainAmt, u = W.sky.material.uniforms;
    rain.pts.visible = r > .03; rain.pts.position.set(CAM.position.x, CAM.position.y - 3, CAM.position.z);
    if (r > 0) { u.top.value.lerp(_g[1], r * .8); u.mid.value.lerp(_g[0], r * .8); u.bot.value.lerp(_g[2], r * .8); W.scene.fog.color.lerp(_g[0], r * .75); W.scene.background.copy(W.scene.fog.color); W.key.intensity *= 1 - .45 * r; W.hemi.intensity *= 1 - .15 * r; water.material.color.lerp(_g[1], r * .5); }
    W.scene.fog.far = lerp(170, 105, r);
  };
}

/* duels in Shimada are fought on a gravel bar with the river running past on every side */
function shimadaArena(role) {
  const W = newWorld('shimada-duel'), rainy = S.town.jobs.b !== 2, myth = role === 'myth';
  if (rainy) { addSky(W, { top: '#5f6b78', mid: '#8a96a4', bot: '#a4aeb8', sunDir: new V3(-.4, .5, .6), sunCol: '#c8d0d8', sunDeg: 2, fog: '#8a96a4', fogNear: 14, fogFar: 95, stars: false, haze: .2 });
    addLights(W, { sky: '#c8d4e0', ground: '#4a5a5a', hemi: .8, key: '#d0dae4', keyI: .55, keyDir: new V3(-.4, 1, .5), rim: '#9fc0d8', rimI: .6, rimDir: new V3(.3, .5, 1) }); }
  else if (myth) { addSky(W, { top: '#2a2f66', mid: '#e58a5a', bot: '#ffd0a0', sunDir: new V3(-.7, .12, .7), sunCol: '#ffe0b0', sunDeg: 4, fog: '#c9a892', fogNear: 20, fogFar: 140, stars: false, haze: .6 });
    addLights(W, { sky: '#ffd8c0', ground: '#4a5a4a', hemi: .7, key: '#ffb880', keyI: .8, keyDir: new V3(-.7, .5, .4), rim: '#7fe8d0', rimI: .9, rimDir: new V3(.3, .5, 1) }); }
  else { addSky(W, { top: '#1f4f8c', mid: '#8fb4d6', bot: '#e6eef2', sunDir: new V3(-.5, .5, .4), sunCol: '#fff2dc', sunDeg: 3.5, fog: '#c2d0d8', fogNear: 26, fogFar: 160, stars: false, haze: .5 });
    addLights(W, { sky: '#e0ecff', ground: '#5a6a5a', hemi: .8, key: '#fff0dc', keyI: .9, keyDir: new V3(-.5, 1, .35), rim: '#a0d8ff', rimI: .7, rimDir: new V3(.4, .5, 1) }); }
  addGround(W, { a: '#b9b6aa', b: '#a4a298', c: '#8a968e', clear: 60, hill: 0, flat: true, pattern: (x, z, t) => { const r = Math.hypot(x, z - 2.6); if (r > 10) t.lerp(new COL('#6a7a80'), smooth(10, 13, r)); } });
  const ring = new THREE.Mesh(new THREE.RingGeometry(11.5 + (rainy ? -1 : 0), 400, 48, 1), new THREE.MeshBasicMaterial({ color: rainy ? '#62757f' : '#6f8f9c', transparent: true, opacity: .88 })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, .04, 2.6); W.scene.add(ring);
  addMountains(W, { base: '#4f6a5a', top: '#8aa890', snow: '#f4f8ff', snowLine: 2, r0: 150, r1: 240, h0: 16, h1: 44, n: 22, a0: -3.14, a1: 3.14, seed: 33 });
  const clear = (x, z) => laneClear(x, z) || Math.hypot(x, z - 2.6) < 5.2;
  const rock = merge([P(GEO.dodec(1), '#9a988e', [0, 0, 0], null, null, (x, y) => new COL(y > .3 ? '#b8b6ac' : '#84827a'))]);
  W.scene.add(inst(rock, toon({ vertexColors: true, flatShading: true }), scatter(90, 5.4, 11, 81, clear).map(([x, z, k]) => ({ p: [x, .05, z], r: [k * 3, k * 5, 0], s: k > .85 ? [.8 + k, .6, .8 + k] : [.2 + k * .4, .14 + k * .2, .2 + k * .35] })), true));
  const reed = merge([P(GEO.cone(.03, 1.7, 4), '#5a7a3a', [0, .85, 0]), P(GEO.cone(.03, 1.4, 4), '#6a8a44', [.08, .7, .05], [0, 0, -.12]), P(GEO.cone(.03, 1.5, 4), '#4a6a34', [-.07, .75, -.04], [0, 0, .14])]);
  W.scene.add(inst(reed, windify(toon({ vertexColors: true }), .08), scatter(myth ? 260 : 120, 7.5, 12.5, 82, clear).map(([x, z, k]) => ({ p: [x, 0, z], r: [0, k * 6, 0], s: .8 + k * .8 })), false));
  // the far bank: a line of willows
  W.scene.add(inst(willowGeo(), windify(toon({ vertexColors: true, flatShading: true }), .045), [...Array(18)].map((_, i) => ({ p: [-70 + i * 8.4, 0, 36 + (i % 3) * 3], r: [0, i, 0], s: 1.6 + (i % 4) * .2 })), false));
  const bank = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), toon({ color: '#5f8a4a' })); bank.rotation.x = -Math.PI / 2; bank.position.set(0, .08, 62); W.scene.add(bank);
  if (myth) { const tor = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); tor.position.set(0, 0, 10.5); tor.castShadow = true; W.scene.add(tor); [[-5, 6], [5, 7], [0, 11]].forEach(([x, z]) => { const h = halo('#7fe8d0', 3, .4); h.position.set(x, 1.2, z); W.scene.add(h); }); }
  else { const dark = '#3a2416'; W.scene.add(new THREE.Mesh(merge([-1, 1].flatMap(a => [0, 1, 2].flatMap(i => [P(GEO.cyl(.09, .11, 3.2, 6), dark, [a * 5.2, 1.6, -1 + i * 4.5]), P(GEO.box(.3, .4, .04), '#f4efe4', [a * 5.2, 2.9, -1 + i * 4.5 + .1])]))), toon({ vertexColors: true, flatShading: true }))); }
  if (rainy) W.ambient.push(new Ambient({ n: 1100, tex: TEX.flake, color: '#b8cce0', color2: '#8fa8c4', size: .075, alpha: .8, cx: 0, cy: 5, cz: 3, ax: 14, ay: 7, az: 14, sway: .1, vel: r => [1.2 + r() * .4, -12 - r() * 4, .2], seed: 4 }));
  addClouds(W, { color: rainy ? '#7a8590' : myth ? '#ffc8a8' : '#dfe6ea', n: 12, opacity: rainy ? .8 : .55, y0: 45 });
  return W;
}

Object.assign(TOWN_BY.shimada, {
  flip: 1, fuji: null, day: .28, amb: 'none', cloud: '#c9d0d6', pal: ['#cfd8b8', '#6f9a50', '#7a7a4c', '#b8ad8c'], lay: SH_LAY, h: shimadaH, tint: shimadaTint, decor: shimadaDecor, arena: shimadaArena, doneZ: 83.5,
  roadK: (x, z) => 1 - smooth(60.5, 62, z) * (1 - smooth(82, 83.5, z)),
  gate: { map: 'Crossing', guard: 'River Official', place: 'river crossing', halt: 'Halt. This is the Oi River crossing. There is no bridge and no boat, by order of the Shogun: you cross on the shoulders of the porters or not at all. What is your business on the Tokaido?' },
  onJob: j => { if (j === 'b') setTimeout(() => banner('The rain stops', 'The Oi is falling. The fords are opening.'), 2600); },
  mapBg: (sx, sy) => { const road = []; for (let z = -90; z <= 90; z += 6) road.push(`${sx(HR(z))},${sy(z)}`);
    return `<rect x="0" y="${sy(82)}" width="${sx(-40)}" height="${300 - sy(82)}" fill="#3f6a7c"/><rect x="0" y="${sy(82)}" width="320" height="${sy(62) - sy(82)}" fill="#3f6a7c"/>
      <rect x="${sx(40)}" y="${sy(46)}" width="${320 - sx(40)}" height="${sy(-62) - sy(46)}" fill="#2f5a34" opacity=".8"/><circle cx="${sx(SH_ISLE[0])}" cy="${sy(SH_ISLE[1])}" r="11" fill="#9a988e"/><circle cx="${sx(SH_BAR[0])}" cy="${sy(SH_BAR[1])}" r="8" fill="#9a988e"/>
      <line x1="${sx(-58)}" y1="${sy(20)}" x2="${sx(-38)}" y2="${sy(20)}" stroke="#9fc0cc" stroke-width="3" stroke-dasharray="3 3"/><line x1="${sx(-55)}" y1="${sy(-30)}" x2="${sx(-38)}" y2="${sy(-30)}" stroke="#9fc0cc" stroke-width="3" stroke-dasharray="3 3"/>
      <polyline points="${road.join(' ')}" fill="none" stroke="#c9b48c" stroke-width="5"/><text x="6" y="${sy(60)}" font-size="9" fill="#cfe6ee">Oi River</text><text x="${sx(52)}" y="${sy(-20)}" font-size="9" fill="#cfe8c0">tea fields</text>`; },
});
Object.assign(TOWN_BY.shimada.keeper, { where: 'at the porters\' station', also: () => S.town.jobs.b === 2,
  alsoMsg: 'Boss Gonta will not send porters into a river this high. They say the kappa of the Oi brings the rain when it is angry. Grandmother Fuki at the river shrine knows what it wants.',
  first: 'Boss Gonta runs the porters, and nobody crosses without him. He only deals with people this town trusts, and nobody crosses at all while the river is this high. Help Ferryman Tasuke first.',
  ask: 'The river is down and you have done right by this town. Now show me you are worth carrying. Win, and my porters take you over on their shoulders.' });
Object.assign(TOWN_BY.shimada.a, { sub: 'Keeper of the crossing ropes', ask: 'I string the guide ropes across the ford. A swordsman called Kurozo cuts them for sport. Stop him and these sleeves are yours.', wait: 'Kurozo camps by the water, east along the levee.' });
Object.assign(TOWN_BY.shimada.b, { look: { geisha: true, cloth: '#6a5a7a', armor: '#6a5a7a', trim: '#d8d0e0', hem: '#3a3048', mask: '#f0dcc8', eye: '#3a2020', lips: '#b05a5a', pins: '#c8c8d0', bloom: '#e8e8f0', inner: '#ffffff' },
  ask: 'This rain is the kappa\'s doing. It is sulking because nobody leaves it cucumbers any more. I was bringing three and dropped them on the way, my hands are not what they were. Find them, dear, and the river will calm.',
  thanks: 'There. Three cucumbers on the shrine, and listen: the rain is stopping already. A kappa loves cucumbers above all things. Take these shoulder guards.' });
Object.assign(TOWN_BY.shimada.myth, { bowWeak: true, weapon: null, sword: 'jade', line: 'A green shape rises from the reeds, water brimming in the dish on its head. In the old tales a kappa loves sumo, cucumbers and good manners.',
  tip: 'A kappa cannot refuse good manners. BOW before the duel: it must bow back, and the water that gives it strength spills from its head.' });
TOWN_BY.shimada.note[1] += ' Officials measured the water every morning: the deeper it was, the more the porters charged, and when it rose too high the crossing was closed. In folk tales a river spirit called a kappa lived in rivers like this one. It carried its strength as water in a dish on its head, so the trick was to bow politely. The kappa had to bow back, and the water spilled.';
