'use strict';
/* ===== Otsu: the shore of Lake Biwa =====
   Cherry blossom, the biggest lake in Japan, and a boat you can row: out to an island shrine and to the
   Floating Hall on its stilts. The traitor Kagemori waits on the long bridge at Seta. */

const OT_ISLE = [-72, -30], OT_HALL = [-60, 34], OT_BELL = [44, -20], OT_DRUM = [46, 30], OT_CAMP = [-29, -46], OT_PIER = [-34, 0];
const OT_DOCK = [{ n: 'the pier', land: [-45.6, 0], water: [-50.5, 0] }, { n: 'the island', land: [-65.6, -30], water: [-61.4, -30] }, { n: 'the Floating Hall', land: [-60, 32.2], water: [-60, 28.6] }];
const OT_LAY = {
  ema: [[OT_HALL[0], OT_HALL[1] + .6], [HR(-30) + 18, -30], [26, 46]], emaCol: '#fff4d8', emaGeo: () => GEO.box(.18, .6, .04), emaHint: ' They are pale slips of paper. One blew all the way out to the Floating Hall on the lake.',
  chest: [[OT_ISLE[0] - 2, OT_ISLE[1]], [OT_BELL[0] + 3.5, OT_BELL[1] - 3]],
  chestHint: ['In a chest on the island in the lake. Row out from the pier', 'In a chest beside the great bell, on the hill south-east of town'],
  flats: [[OT_BELL[0], OT_BELL[1], 6.5, 5], [OT_DRUM[0], OT_DRUM[1], 8.5, 6], [OT_CAMP[0], OT_CAMP[1], 4, .35], [HR(57), 57, 6, .4], [-28, 24, 4.5, .4], [OT_PIER[0] + 3, OT_PIER[1], 4, .45]],
  pos: {
    guard: [HR(GATE_Z) - 1.9, GATE_Z - 2.4, Math.PI], keeper: [HR(56) + 4.8, 55.5, Math.PI * 1.2],
    a: [OT_PIER[0] + 3, 2.6, -Math.PI / 2], friendA: [OT_PIER[0] + 1, -3, -Math.PI / 2], smith: [HR(18) + 7.2, 18, -Math.PI / 2],
    b: [-27, 24.5, -Math.PI / 2], foe: [OT_CAMP[0], OT_CAMP[1], .9], myth: [OT_DRUM[0], OT_DRUM[1], -2.2],
  },
};
function otBridgeX(z) { return lerp(HR(59.5), HR(84), clamp((z - 59.5) / 24.5, 0, 1)); }
function otsuH(x, z, mesh) {
  const rd = Math.abs(x - HR(z));
  let h = Math.max(.2, .45 + (fbm(x * .05 + 67, z * .05 + 3) - .5) * 1);
  h += smooth(30, 70, x) * 13 * (.7 + .5 * fbm(x * .035 + 3, z * .035 + 67)) * (1 - smooth(50, 60, z)); // the hills east of town
  const edge = Math.max(-z - 86, 0); h += Math.min(edge * edge * .1, 5);
  h = lerp(h, .28, 1 - smooth(2.8, 6.5, rd));
  for (const f of OT_LAY.flats) { const d = Math.hypot(x - f[0], z - f[1]); if (d < f[2] + 5) h = lerp(f[3], h, smooth(f[2], f[2] + 5, d)); }
  const lk = smooth(-35.5, -40, x);
  if (lk > 0) {
    h = lerp(h, -.9, lk);
    h = lerp(.6, h, smooth(6, 8.5, Math.hypot(x - OT_ISLE[0], z - OT_ISLE[1])));
    if (!mesh && x > -47.6 && x < -33 && Math.abs(z - OT_PIER[1]) < 2.3) h = .5;
    if (!mesh && Math.abs(x - OT_HALL[0]) < 3 && Math.abs(z - OT_HALL[1]) < 3) h = .6;
  }
  const rv = smooth(61, 62.4, z) * (1 - smooth(81, 82.6, z));
  if (rv > 0) { h = lerp(h, -1.6, rv); if (!mesh && Math.abs(x - otBridgeX(z)) < 2.7) h = .75; }
  return h;
}
const _oc = [new COL('#d8c8a0'), new COL('#6a8a5a'), new COL('#f2c8d8')];
function otsuTint(x, z, h, t) {
  if (x < -30 || (z > 59 && z < 84)) t.lerp(_oc[0], smooth(.5, .1, h) * .8);
  if (x > 30) t.lerp(_oc[1], smooth(30, 44, x) * .4);
  const n = fbm(x * .25 + 9, z * .25); if (n > .6 && h > .2 && h < 9) t.lerp(_oc[2], (n - .6) * 1.5); // fallen petals
}
function cherryGeo(c) {
  return merge([P(GEO.cyl(.14, .26, 2.2, 6), '#3e2c26', [0, 1.1, 0], [0, 0, .1]), P(GEO.cyl(.08, .12, 1.6, 5), '#3e2c26', [.55, 2.5, 0], [0, 0, -.8]), P(GEO.cyl(.08, .12, 1.5, 5), '#3e2c26', [-.5, 2.5, .2], [.2, 0, .8]),
    P(GEO.dodec(1), c[0], [0, 3.5, 0], null, [2.3, 1.2, 2.3]), P(GEO.dodec(1), c[1], [1.2, 3.3, .3], [0, 1, 0], [1.5, 1, 1.5]), P(GEO.dodec(1), c[2], [-1.1, 3.4, -.4], [0, 2, 0], [1.5, 1, 1.5]), P(GEO.dodec(1), c[3], [.1, 4.3, 0], [0, 3, 0], [1.3, .8, 1.3])]);
}
function otsuRails(len, w, red) {
  const parts = [P(GEO.box(w, .25, len), '#7a5a3a', [0, 0, 0]), P(GEO.box(.16, .16, len), red, [w / 2 - .15, 1.05, 0]), P(GEO.box(.16, .16, len), red, [-w / 2 + .15, 1.05, 0]), P(GEO.box(.1, .1, len), red, [w / 2 - .15, .6, 0]), P(GEO.box(.1, .1, len), red, [-w / 2 + .15, .6, 0])];
  for (let z = -len / 2 + .3; z <= len / 2; z += 3.2) for (const sd of [-1, 1]) { parts.push(P(GEO.cyl(.13, .13, 1.5, 6), red, [sd * (w / 2 - .15), .6, z])); parts.push(P(GEO.cone(.2, .36, 8), '#c9a35a', [sd * (w / 2 - .15), 1.5, z])); parts.push(P(GEO.cyl(.2, .2, 4.4, 6), '#3a2416', [sd * (w / 2 - .5), -2.3, z])); }
  return merge(parts);
}

function otsuDecor(W, c) {
  const rr = mulberry(1103), dark = '#3a2416', E = Math.PI / 2, flat = toon({ vertexColors: true, flatShading: true });
  const onFlat = (x, z, pad) => OT_LAY.flats.some(f => Math.hypot(x - f[0], z - f[1]) < f[2] + pad) || OT_LAY.ema.concat(OT_LAY.chest).some(f => Math.hypot(x - f[0], z - f[1]) < 3.5);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({ color: '#5a94b4', transparent: true, opacity: .86 })); water.rotation.x = -Math.PI / 2; water.position.set(-200, -.3, 0); W.scene.add(water); W.water = water; W.waterCol = '#5a94b4';
  W.canWalk = (x, z, h, T) => T.boat ? (h < -.55 && x < -37 && z < 59) : h >= -.35;
  addMountains(W, { base: '#5a6a8a', top: '#a0aec8', snow: '#f4f8ff', snowLine: .6, r0: 230, r1: 300, h0: 26, h1: 60, a0: -2.5, a1: -.6, n: 14, seed: 71 }); // the far shore of the lake
  addMountains(W, { base: '#56705a', top: '#9ab49a', snow: '#f4f8ff', snowLine: 2, r0: 150, r1: 240, h0: 22, h1: 60, a0: -.4, a1: 3.3, n: 20, seed: 72 });
  // the town
  const taken = []; let k = 0;
  for (let z = -54; z <= 46; z += 11) for (const sd of [-1, 1]) { k++; if (sd < 0 && Math.abs(z) < 7) continue; const x = HR(z) + sd * (10.6 + (k % 3) * .4), smith = sd > 0 && Math.abs(z - 18) < 5.5;
    townHouse(W, c, x, z, sd > 0 ? -E : E, 7 + (k % 2), 6, smith ? { roof: '#33302e', wall: '#d8c8a8', win: '#ffb86a' } : { roof: ['#3a3a42', '#44403c', '#33363e'][k % 3], cap: '#55555e', wall: ['#f0e8d8', '#e8dcc0', '#efe6d0'][k % 3], h: k % 4 === 1 ? 4.4 : 2.8, rh: 1.6, win: '#ffcf86' }); taken.push([x, z]); }
  townHouse(W, c, -31, 28.5, E, 4.5, 4, { roof: '#a8884a', cap: '#c8a860', rh: 2, wall: '#d8c8a8' }); taken.push([-31, 28.5]);
  const nearHouse = (x, z, r) => taken.some(([a, b]) => Math.hypot(x - a, z - b) < r);
  addLanterns(W, [[HR(-46) - 3.4, -46], [HR(-20) + 3.4, -20], [HR(8) - 3.4, 8], [HR(32) + 3.4, 32], [HR(54) - 3.6, 54], [OT_PIER[0] + 1, -2.6], [OT_BELL[0] - 5, OT_BELL[1] + 3]], '#8a8478', '#ffb860');
  // cherry trees along the road, the shore and the hills
  const ch = [], add = (x, z, s) => { ch.push({ p: [x, townH(x, z) - .1, z], r: [0, rr() * 6, 0], s }); if (Math.abs(x) < TOWN_R) obs(W, x, z, .38 * s); };
  for (let z = -86; z <= 54; z += 7.8) for (const sd of [-1, 1]) { const x = HR(z) + sd * (5.4 + rr()); if (!onFlat(x, z, 1) && !nearHouse(x, z, 5.6)) add(x, z, .9 + rr() * .3); }
  for (let z = -84; z <= 56; z += 6.5) { const x = -32.5 + rr() * 2, zz = z + rr() * 2; if (Math.abs(zz) > 6 && !onFlat(x, zz, 1.5) && !nearHouse(x, zz, 5)) add(x, zz, 1 + rr() * .5); }
  for (let i = 0; i < 900 && ch.length < 240; i++) { const x = 16 + rr() * 80, z = -92 + rr() * 150, h = townH(x, z); if (h > 26 || onFlat(x, z, 2) || nearHouse(x, z, 6) || Math.abs(x - HR(z)) < 16) continue; add(x, z, 1 + rr() * .8); }
  for (let i = 0; i < 20; i++) add(-30 + rr() * 110, 85 + rr() * 6, 1.1 + rr() * .6);
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, x = OT_ISLE[0] + Math.cos(a) * 5.6, z = OT_ISLE[1] + Math.sin(a) * 5.6; if (Math.abs(a - 0) > .7 && Math.abs(a - 6.283) > .7) add(x, z, .8 + rr() * .3); }
  W.scene.add(inst(cherryGeo(c.tree), windify(flat.clone(), .02), ch, true));
  const tuft = merge([P(GEO.cone(.05, .5, 4), '#7fa25a', [0, .25, 0]), P(GEO.cone(.045, .4, 4), '#6a904a', [.07, .2, .03], [0, 0, -.3]), P(GEO.cone(.045, .42, 4), '#f0a8c0', [-.06, .21, -.04], [0, 0, .3])]), tufts = [];
  for (let i = 0; i < 2200; i++) { const x = -34 + rr() * 100, z = (rr() * 2 - 1) * 90, h = townH(x, z); if (h < .15 || h > 12 || Math.abs(x - HR(z)) < 3.4 || nearHouse(x, z, 4.2) || z > 60 && z < 83) continue; tufts.push({ p: [x, h, z], r: [0, rr() * 6, 0], s: .8 + rr() * 1.3 }); }
  W.scene.add(inst(tuft, windify(toon({ vertexColors: true }), .22), tufts, false));
  const reed = merge([P(GEO.cone(.03, 1.7, 4), '#6a8a44', [0, .85, 0]), P(GEO.cone(.03, 1.4, 4), '#7a9a50', [.08, .7, .05], [0, 0, -.12]), P(GEO.cone(.03, 1.5, 4), '#5a7a3a', [-.07, .75, -.04], [0, 0, .14])]), reeds = [];
  for (let i = 0; i < 900 && reeds.length < 260; i++) { const x = -34 - rr() * 7, z = -90 + rr() * 150; if (Math.abs(z) < 5 || Math.abs(z - 24) < 4) continue; reeds.push({ p: [x, Math.max(otsuH(x, z, true), -.5), z], r: [0, rr() * 6, 0], s: .8 + rr() * .8 }); }
  W.scene.add(inst(reed, windify(toon({ vertexColors: true }), .08), reeds, false));
  // the pier, the island shrine and the Floating Hall
  { const pier = new THREE.Mesh(merge([P(GEO.box(14.6, .2, 4.6), "#8a6a44", [-40.3, .4, 0])].concat([...Array(6)].flatMap((_, i) => [P(GEO.cyl(.11, .11, 2.4, 6), dark, [-47 + i * 2.6, -.5, 2.3]), P(GEO.cyl(.11, .11, 2.4, 6), dark, [-47 + i * 2.6, -.5, -2.3])]))), flat); pier.castShadow = true; pier.receiveShadow = true; W.scene.add(pier);
    const tor = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); tor.position.set(OT_ISLE[0] + 5.2, .55, OT_ISLE[1]); tor.rotation.y = E; tor.scale.setScalar(.85); tor.castShadow = true; W.scene.add(tor);
    const sh = new THREE.Mesh(merge([P(GEO.box(1.4, .6, 1.4), '#8a8a84', [0, .3, 0]), P(GEO.box(1, 1, .9), '#b8322a', [0, 1.1, 0]), P(GEO.cone(1, 1, 4), '#3a5a4a', [0, 1.95, 0], [0, Math.PI / 4, 0], [1.1, .7, 1])]), flat); sh.position.set(OT_ISLE[0] - 4.6, .6, OT_ISLE[1] + 2.2); sh.rotation.y = E; sh.castShadow = true; W.scene.add(sh); obs(W, OT_ISLE[0] - 4.6, OT_ISLE[1] + 2.2, 1);
    const [hx, hz] = OT_HALL, hall = new THREE.Mesh(merge([P(GEO.box(6.4, .3, 6.4), '#7a5a3a', [0, .45, 0]), P(GEO.box(3.2, 2.2, 3.2), '#e8dcc0', [0, 1.7, 1.2]), P(GEO.cone(1, 1, 4), '#3a3a42', [0, 3.7, 1.2], [0, Math.PI / 4, 0], [3.6, 1.8, 3.6]), P(GEO.sph(.2, 8, 6), '#c9a35a', [0, 4.7, 1.2]), P(GEO.box(6.4, .1, .1), '#b8322a', [0, 1.3, 3.15]), P(GEO.box(.1, .1, 6.4), '#b8322a', [3.15, 1.3, 0]), P(GEO.box(.1, .1, 6.4), '#b8322a', [-3.15, 1.3, 0])]
      .concat([[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]].map(([a, b]) => P(GEO.cyl(.14, .14, 2.6, 6), dark, [a * 2.9, -.7, b * 2.9])))), flat); hall.position.set(hx, 0, hz); hall.castShadow = true; hall.receiveShadow = true; W.scene.add(hall);
    [[1.6, 1.2], [-1.6, 1.2], [0, 2.8]].forEach(([a, b]) => obs(W, hx + a, hz + b, .9)); }
  // the long bridge at Seta
  townGate(W, c, '#b8322a');
  { const x0 = HR(59.5), x1 = HR(84), len = Math.hypot(x1 - x0, 24.5) + 1, br = new THREE.Mesh(otsuRails(len, 5.6, '#b8322a'), flat); br.position.set((x0 + x1) / 2, .62, 71.75); br.rotation.y = Math.atan2(x1 - x0, 24.5); br.castShadow = true; br.receiveShadow = true; W.scene.add(br); }
  // the great bell on its hill
  { const [x, z] = OT_BELL, y = townH(x, z), m = new THREE.Mesh(merge([P(GEO.cone(1, 1, 4), '#3a3a42', [0, 4.4, 0], [0, Math.PI / 4, 0], [3.4, 1.5, 3.4]), P(GEO.cyl(.7, .85, 1.6, 12), '#5a7a6a', [0, 2.5, 0]), P(GEO.sph(.7, 12, 6, 0, 6.283, 0, 1.57), '#5a7a6a', [0, 3.3, 0]), P(GEO.cyl(.12, .12, 3, 6), dark, [2.2, 1.9, 0], [0, 0, 1.57]), P(GEO.box(4.6, .3, 4.6), '#8a8a84', [0, .15, 0])]
      .concat([[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => P(GEO.cyl(.16, .16, 3.8, 6), dark, [a * 2, 2, b * 2])))), flat); m.position.set(x, y, z); m.castShadow = true; W.scene.add(m); [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => obs(W, x + a * 2, z + b * 2, .3)); }
  // the thunder drummer's hill: a ring of drums
  { const [x, z] = OT_DRUM, y = townH(x, z), dr = []; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + .4; if (a > 3.3 && a < 4.6) continue; dr.push({ p: [x + Math.cos(a) * 7.4, y + .9, z + Math.sin(a) * 7.4], r: [0, -a, 1.57] }); obs(W, x + Math.cos(a) * 7.4, z + Math.sin(a) * 7.4, .9); }
    W.scene.add(inst(merge([P(GEO.cyl(.8, .8, 1, 14), '#8a3a2a', [0, 0, 0]), P(GEO.cyl(.82, .82, .06, 14), '#f2e6c8', [0, .52, 0]), P(GEO.cyl(.82, .82, .06, 14), '#f2e6c8', [0, -.52, 0])]), flat, dr, true));
    [[3, 3], [-4, 2], [0, -5]].forEach(([a, b]) => { const h = halo('#a8ff6a', 3.2, .45); h.position.set(x + a, y + 1.4, z + b); W.scene.add(h); }); }
  // sails far out on the lake
  const sails = [...Array(6)].map((_, i) => { const m = new THREE.Mesh(merge([P(GEO.box(1.6, .5, 5), '#5a3a26', [0, .25, 0]), P(GEO.cyl(.07, .07, 5, 5), dark, [0, 2.8, 0]), P(GEO.box(.06, 3.6, 2.6), '#f6f2e6', [0, 3.2, .1])]), flat); m.userData = { x: -110 - i * 22, z: -80 + i * 31, v: .8 + (i % 3) * .3 }; m.position.set(m.userData.x, -.4, m.userData.z); W.scene.add(m); return m; });
  // the rowing boat
  const boat = new THREE.Group(); boat.add(new THREE.Mesh(boatGeo('#6a4a30'), flat));
  const oars = [1, -1].map(sd => { const o = new THREE.Mesh(merge([P(GEO.cyl(.035, .035, 2.6, 5), '#c9b48c', [sd * 1.3, 0, 0], [0, 0, 1.57]), P(GEO.box(.5, .04, .22), '#c9b48c', [sd * 2.6, 0, 0])]), flat); o.position.set(sd * .7, .62, -.2); boat.add(o); return o; });
  boat.traverse(o => { o.castShadow = true; }); W.scene.add(boat); W.boat = boat; W.boatAt = S.town.boatAt == null ? 0 : S.town.boatAt;
  const moor = i => { const d = OT_DOCK[i]; boat.position.set(d.water[0], -.62, d.water[1]); boat.rotation.y = i === 0 ? -E : i === 1 ? E : 0; };
  moor(W.boatAt);
  let flash = 0, next = 4;
  W.tick = (dt, T) => {
    for (const m of sails) { const u = m.userData; u.z += dt * u.v; if (u.z > 120) u.z = -120; m.position.z = u.z; m.rotation.z = Math.sin(T.clock * .6 + u.x) * .03; }
    if (T.boat) { T.lift = -.14 - T.pos.y; boat.position.set(T.pos.x, -.62 + Math.sin(T.clock * 1.6) * .03, T.pos.z); boat.rotation.y = T.face; const a = Math.sin(T.phase * .8) * .5 * Math.min(1, T.speed * 2); oars[0].rotation.y = a; oars[1].rotation.y = -a; oars[0].rotation.z = -.12; oars[1].rotation.z = .12; }
    else { T.lift = 0; boat.position.y = -.62 + Math.sin(T.clock * 1.6) * .03; }
    const dd = Math.hypot(T.pos.x - OT_DRUM[0], T.pos.z - OT_DRUM[1]);
    if (!S.town.myth && dd < 60) { next -= dt; if (next <= 0) { next = 3 + Math.random() * 5; flash = 1; if (dd < 30) shake(.12); } }
    flash = Math.max(0, flash - dt * 3.2); W.flash = flash;
  };
  W.post = () => { if (W.flash > 0) { W.hemi.intensity += W.flash * 1.3; W.scene.fog.color.lerp(_oc[2].clone().set('#e8f4ff'), W.flash * .5); W.scene.background.copy(W.scene.fog.color); } };
  W.moor = moor;
}
function otsuPeople(T) {
  const W = T.W;
  T.boat = false;
  if (townH(T.pos.x, T.pos.z) < -.35) { const d = OT_DOCK[W.boatAt]; T.pos.set(d.land[0], 0, d.land[1]); T.lastGood.copy(T.pos); }
  OT_DOCK.forEach((d, i) => {
    T.pois.push({ id: 'dock' + i, kind: 'spot', x: (d.land[0] + d.water[0]) / 2, z: (d.land[1] + d.water[1]) / 2, r: 4.6, map: i === 0 ? 'Boat' : null,
      get label() { return T.boat ? 'Tie up at ' + d.n : W.boatAt === i ? 'Row out onto the lake' : 'The boat is moored elsewhere'; },
      act: () => {
        if (T.boat) { T.boat = false; T.lift = 0; W.boatAt = i; S.town.boatAt = i; W.moor(i); T.pos.set(d.land[0], 0, d.land[1]); T.lastGood.copy(T.pos); save(); toast('You tie up at ' + d.n + '.'); T.near = null; return; }
        if (W.boatAt !== i) return;
        if (S.town.jobs.a !== 2) return townSay('The boat', `Boatman Sazanami will not lend a boat while the Shadow Rider is sinking them. ${S.town.jobs.a ? 'Deal with the rider on the shore first.' : 'Speak with the boatman.'}`);
        T.boat = true; T.pos.set(d.water[0], 0, d.water[1]); T.lastGood.copy(T.pos); T.near = null; hint('Rowing: steer just like walking. Tie up at the island, the Floating Hall or the pier.'); setTimeout(() => hint(''), 6000);
      } });
  });
  T.pois.push({ id: 'bell', kind: 'spot', x: OT_BELL[0] + 2.6, z: OT_BELL[1], r: 2.6, label: 'Ring the great bell', act: () => { sfx.bell ? sfx.bell() : sfx.taiko(1); shake(.08); banner('BONG', 'The evening bell rolls out across the lake'); if (!S.town.bell) { S.town.bell = true; save(); virtue('rei', 1, 'you rang the evening bell'); } } });
}

/* Otsu's duels: the lake shore under the blossom, the thunder hill, and the bridge at Seta at sunset */
function otsuArena(role) {
  const W = newWorld('otsu-duel'), bridge = role === 'keeper', storm = role === 'myth', flat = toon({ vertexColors: true, flatShading: true }), c = TOWN_BY.otsu.tree;
  if (bridge) { addSky(W, { top: '#2a2f66', mid: '#e58a5a', bot: '#ffd0a0', sunDir: new V3(-.75, .1, .65), sunCol: '#ffe0b0', sunDeg: 5, fog: '#d9a892', fogNear: 30, fogFar: 200, stars: false, haze: .7 });
    addLights(W, { sky: '#ffd8c0', ground: '#5a4a4a', hemi: .75, key: '#ffb070', keyI: .9, keyDir: new V3(-.75, .45, .4), rim: '#ff9a7a', rimI: .8, rimDir: new V3(.3, .5, 1) }); }
  else if (storm) { addSky(W, { top: '#1a2030', mid: '#3f4a5c', bot: '#7a8694', sunDir: new V3(-.4, .5, .6), sunCol: '#aab4c4', sunDeg: 2, fog: '#56626e', fogNear: 16, fogFar: 120, stars: false, haze: .2 });
    addLights(W, { sky: '#a8c0a0', ground: '#2a3a3a', hemi: .8, key: '#d8f0c8', keyI: .6, keyDir: new V3(-.4, 1, .5), rim: '#a8ff6a', rimI: 1, rimDir: new V3(.3, .5, 1) }); }
  else { addSky(W, { top: '#1f4f8c', mid: '#8fb4d6', bot: '#f4e6ea', sunDir: new V3(-.5, .5, .4), sunCol: '#fff2dc', sunDeg: 3.5, fog: '#d6d0d8', fogNear: 26, fogFar: 170, stars: false, haze: .5 });
    addLights(W, { sky: '#f0e8ff', ground: '#6a6a5a', hemi: .85, key: '#fff0dc', keyI: .9, keyDir: new V3(-.5, 1, .35), rim: '#ffc0d8', rimI: .7, rimDir: new V3(.4, .5, 1) }); }
  if (bridge) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: '#7a6a8a' })); pl.rotation.x = -Math.PI / 2; pl.position.y = -3.2; W.scene.add(pl);
    const br = new THREE.Mesh(otsuRails(90, 7.4, '#b8322a'), flat); br.position.set(0, -.125, 10); br.castShadow = true; br.receiveShadow = true; W.scene.add(br);
    addMountains(W, { base: '#5a4a6a', top: '#c08a8a', snow: '#f4f8ff', snowLine: 2, r0: 190, r1: 270, h0: 20, h1: 56, a0: -3.14, a1: 3.14, n: 22, seed: 74 });
    W.scene.add(inst(cherryGeo(c), windify(flat.clone(), .02), [...Array(14)].map((_, i) => ({ p: [(i % 2 ? 1 : -1) * (16 + (i % 5) * 5), -3, 60 + (i % 4) * 6], r: [0, i, 0], s: 2.2 })), false));
  } else {
    addGround(W, { a: storm ? '#5f7a52' : '#8aa862', b: storm ? '#506a48' : '#a8b878', c: storm ? '#44584a' : '#d8c8a0', clear: 9, hill: storm ? 3 : 1.2, pattern: (x, z, t) => { const n = fbm(x * .3, z * .3); if (n > .56) t.lerp(new COL('#f2c8d8'), (n - .56) * 2); } });
    addMountains(W, { base: '#56705a', top: '#9ab49a', snow: '#f4f8ff', snowLine: 2, r0: 160, r1: 240, h0: 20, h1: 56, a0: -3.14, a1: 3.14, n: 22, seed: 75 });
    const cl = (x, z) => laneClear(x, z) || Math.hypot(x, z - 2.6) < 5.4;
    W.scene.add(inst(cherryGeo(c), windify(flat.clone(), .02), scatter(storm ? 36 : 70, 7.5, 46, 95, (x, z) => cl(x, z) || (!storm && z > 12)).map(([x, z, k]) => ({ p: [x, W.hAt(x, z) - .1, z], r: [0, k * 6, 0], s: .9 + k * .8 })), true));
    if (storm) { const dr = [[-5.6, 6], [5.6, 6.5], [-6.6, 1], [6.6, 1.5], [0, 11.5]]; W.scene.add(inst(merge([P(GEO.cyl(.8, .8, 1, 14), '#8a3a2a', [0, 0, 0]), P(GEO.cyl(.82, .82, .06, 14), '#f2e6c8', [0, .52, 0]), P(GEO.cyl(.82, .82, .06, 14), '#f2e6c8', [0, -.52, 0])]), flat, dr.map(([x, z]) => ({ p: [x, .9, z], r: [0, Math.atan2(x, z - 2.6), 1.57] })), true));
      let next = 2.5; W.updaters.push((dt, t) => { if (t > next) { next = t + 2.5 + Math.random() * 4; W.flash = 1; } W.flash = Math.max(0, (W.flash || 0) - dt * 3.5); W.hemi.intensity = .58 + W.flash * 1.7; }); }
    else { const lake = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), new THREE.MeshBasicMaterial({ color: '#5a94b4' })); lake.rotation.x = -Math.PI / 2; lake.position.set(0, .12, 170); W.scene.add(lake); const b = new THREE.Mesh(boatGeo('#6a4a30'), flat); b.position.set(-6, 0, 16); b.rotation.set(0, .8, .2); W.scene.add(b); }
  }
  W.ambient.push(new Ambient({ n: 420, tex: TEX.petal, color: '#ffc2da', color2: '#ffe0ec', size: .09, alpha: .9, cx: 0, cy: 4, cz: 3, ax: 14, ay: 5, az: 14, sway: .8, vel: r => [.5 + r() * .5, -.45 - r() * .4, -.1 + r() * .3], seed: 8 }));
  addClouds(W, { color: bridge ? '#ffb8a0' : storm ? '#3a4452' : '#ffffff', n: storm ? 16 : 10, opacity: storm ? .9 : .6, y0: 45 });
  return W;
}

Object.assign(TOWN_BY.otsu, {
  flip: 1, fuji: null, day: .3, cloud: '#ffffff', pal: ['#e8dcd8', '#7fa25a', '#8a8a5a', '#c8bc9c'], lay: OT_LAY, h: otsuH, hMesh: (x, z) => otsuH(x, z, true), tint: otsuTint, decor: otsuDecor, arena: otsuArena, people: otsuPeople, doneZ: 83,
  roadK: (x, z) => 1 - smooth(60.5, 62, z) * (1 - smooth(81.5, 83, z)),
  gate: { map: 'Bridge', guard: 'Bridge Warden', place: 'Seta bridge', halt: 'Hold. This is the long bridge at Seta, the last crossing before Kyoto. They say whoever holds this bridge holds the capital. What is your business on the Tokaido?' },
  mapBg: (sx, sy) => { const road = []; for (let z = -90; z <= 90; z += 6) road.push(`${sx(HR(z))},${sy(z)}`);
    return `<rect x="0" y="0" width="${sx(-38)}" height="300" fill="#3f7a9a"/><rect x="0" y="${sy(82)}" width="320" height="${sy(62) - sy(82)}" fill="#3f7a9a"/><rect x="${sx(34)}" y="${sy(56)}" width="${320 - sx(34)}" height="${300 - sy(56)}" fill="#3f5a3a" opacity=".6"/>
      <circle cx="${sx(OT_ISLE[0])}" cy="${sy(OT_ISLE[1])}" r="11" fill="#7fa25a"/><rect x="${sx(OT_HALL[0]) - 5}" y="${sy(OT_HALL[1]) - 5}" width="10" height="10" fill="#8a6a44"/><line x1="${sx(-47)}" y1="${sy(0)}" x2="${sx(-34)}" y2="${sy(0)}" stroke="#8a6a44" stroke-width="4"/>
      <polyline points="${road.join(' ')}" fill="none" stroke="#c9b48c" stroke-width="5"/><text x="6" y="${sy(60)}" font-size="9" fill="#cfe6ee">Lake Biwa</text><text x="${sx(OT_HALL[0]) + 8}" y="${sy(OT_HALL[1]) + 3}" font-size="8" fill="#f3e8cf">Floating Hall</text><text x="${sx(OT_ISLE[0])}" y="${sy(OT_ISLE[1]) + 22}" font-size="8" fill="#f3e8cf" text-anchor="middle">island</text>`; },
});
Object.assign(TOWN_BY.otsu.keeper, { where: 'at the foot of the Seta bridge' });
Object.assign(TOWN_BY.otsu.a, { sub: 'At the pier', ask: 'One of the traitor\'s riders guards the shore and sinks every boat that leaves. Beat him and these sleeves are yours. And my boat is yours to row, any time.', wait: 'The rider waits on the shore, south of the pier.', thanks: 'The lake is ours again. Take my boat from the end of the pier whenever you like.' });
Object.assign(TOWN_BY.otsu.b, { look: { cloth: '#5a5a4a', armor: '#5a5a4a', trim: '#d8d0b8', helm: 'kasa', helmCol: '#c9a35a', crest: null, eye: '#ffe6a0' }, sub: 'Hut by the lake' });
TOWN_BY.otsu.note[1] += ' The long bridge at Seta crossed the river that drains the lake, and for a thousand years armies fought over it: whoever held the bridge held the road to Kyoto. Out over the water at Katata stands the Floating Hall, a small temple on stilts, and the evening bell of Mii-dera temple was counted among the Eight Views of the lake.';
