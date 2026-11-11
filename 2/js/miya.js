'use strict';
/* ===== Miya: the harbor and the Seven-Ri sea crossing =====
   The road ends at a pier. The sea breathes in and out: at low tide the flats west of town
   open up, with shells, a sandbar and a chest. Captain Isana duels on the rolling deck of the ferry. */

const MI_BAR = [-72, 8], MI_SPIT = [-62, 48], MI_SHRINE = [50, 20], MI_CAMP = [-29, -50], MI_POST = [-31, 6];
const MI_LAY = {
  ema: [[-44, -20], [-58, 30], [-66, -34]], emaCol: '#ffd0e0', emaGeo: () => GEO.sph(.26, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), emaHint: ' They shine pink on the tidal flats. Some are under water until the tide goes out.',
  chest: [MI_BAR, [57, 27]],
  chestHint: ['In a chest on the sandbar far out on the flats. Wait for low tide at the tide post', 'In a chest behind Atsuta shrine, under the great trees'],
  flats: [[MI_SHRINE[0], MI_SHRINE[1], 9, 2.2], [57, 27, 3, 2.4], [MI_CAMP[0], MI_CAMP[1], 4, .3], [HR(57), 57, 6, .5], [MI_POST[0], MI_POST[1], 3, .35]],
  pos: {
    guard: [HR(GATE_Z) - 1.9, GATE_Z - 2.4, Math.PI], keeper: [HR(56) + 4.8, 55.5, Math.PI * 1.2],
    a: [HR(46) + 6.4, 46, -Math.PI / 2], friendA: [HR(50) + 6.6, 50.5, -Math.PI / 2], smith: [HR(0) - 7.2, 0, Math.PI / 2],
    b: [MI_SHRINE[0] - 6.5, MI_SHRINE[1] - 1.5, -Math.PI / 2], foe: [MI_CAMP[0], MI_CAMP[1], .9], myth: MI_SPIT,
  },
};
const miTide = d => .5 + .5 * Math.cos((d - .28) * 4 * Math.PI); // 1 is high water; two tides a day
function miyaH(x, z, mesh) {
  const rd = Math.abs(x - HR(z)), px = HR(60);
  let h = Math.max(.2, .42 + (fbm(x * .05 + 37, z * .05 + 9) - .5) * .9);
  h += smooth(30, 60, x) * 2.2 * (1 - smooth(48, 60, z)) + smooth(70, 92, x) * 5;
  const edge = Math.max(-z - 86, 0); h += Math.min(edge * edge * .1, 5);
  h = lerp(h, .25, 1 - smooth(2.8, 6.5, rd));
  for (const f of MI_LAY.flats) { const d = Math.hypot(x - f[0], z - f[1]); if (d < f[2] + 5) h = lerp(f[3], h, smooth(f[2], f[2] + 5, d)); }
  // the tidal flats, west
  const fw = smooth(-33, -40, x);
  if (fw > 0) {
    let b = Math.max(-1.3, .28 - (-x - 38) * .03 + (fbm(x * .2, z * .2 + 3) - .5) * .16);
    b = lerp(b, -.95, (1 - smooth(1.5, 4, Math.abs(x + 62))) * smooth(40, 34, z) * .9);
    b = lerp(-.3, b, smooth(4.5, 8, Math.hypot(x - MI_BAR[0], z - MI_BAR[1])));
    if (x > -64.5 && Math.abs(z - MI_SPIT[1]) < (mesh ? 2.6 : 1.9)) b = lerp(.95, b, mesh ? smooth(1.2, 2.6, Math.abs(z - MI_SPIT[1])) : 0);
    h = lerp(h, b, fw);
  }
  // the harbor: a stone quay, then deep water, and one pier
  const sea = smooth(61, 61.6, z);
  if (sea > 0) { h = lerp(h, -2.3, sea); if (!mesh && Math.abs(x - px) < 2.3 && z < 84.5) h = .7; }
  return h;
}
const _mc = [new COL('#dccba2'), new COL('#a89a7a'), new COL('#3f6a44'), new COL('#8a8a84')];
function miyaTint(x, z, h, t) {
  const b = smooth(-30, -38, x); if (b > 0) { t.lerp(_mc[0], b); t.lerp(_mc[1], smooth(.1, -.6, h) * b); if (Math.abs(z - MI_SPIT[1]) < 2.6 && x > -65) t.lerp(_mc[3], .8); }
  if (x > 30 && z < 58) t.lerp(_mc[2], smooth(30, 42, x) * .5);
  if (z > 58) t.lerp(_mc[3], smooth(58, 60, z) * .7);
}
function blackPineGeo() {
  return merge([P(GEO.cyl(.16, .3, 5.4, 6), '#4a3428', [0, 2.7, 0], [0, 0, .06]), P(GEO.cyl(.08, .12, 1.8, 5), '#4a3428', [.6, 4.6, 0], [0, 0, -.9]),
    P(GEO.dodec(1), '#2f5a34', [0, 5.9, 0], null, [2.3, .55, 2.0]), P(GEO.dodec(1), '#3a6a3c', [.5, 6.7, .2], [0, 1, 0], [1.6, .5, 1.5]), P(GEO.dodec(1), '#46784a', [1.5, 5.2, .1], [0, 2, 0], [1.3, .42, 1.1]), P(GEO.dodec(1), '#2f5a34', [-.9, 5.1, -.5], [0, 3, 0], [1.2, .4, 1.2])]);
}
function boatGeo(col) {
  return merge([P(GEO.box(1.5, .5, 4.2), col || '#6a4a30', [0, .25, 0]), P(GEO.box(1.1, .5, 1.2), col || '#6a4a30', [0, .32, 2.5], [-.3, 0, 0]), P(GEO.box(1.2, .45, .9), col || '#6a4a30', [0, .3, -2.4], [.2, 0, 0]), P(GEO.box(1.3, .06, 3.8), '#8a6a44', [0, .5, 0]), P(GEO.box(1.6, .08, .3), '#3a2416', [0, .56, .6]), P(GEO.box(1.6, .08, .3), '#3a2416', [0, .56, -1])]);
}
function ferryMesh() {
  const g = new THREE.Group(), flat = toon({ vertexColors: true, flatShading: true });
  g.add(new THREE.Mesh(merge([P(GEO.box(5, 1.8, 15), '#5a3a26', [0, .5, 0]), P(GEO.box(4, 1.8, 3), '#5a3a26', [0, .9, 8.4], [-.35, 0, 0]), P(GEO.box(4.4, 2.2, 2.4), '#5a3a26', [0, 1.1, -8.2], [.25, 0, 0]), P(GEO.box(4.8, .15, 14.6), '#8a6a44', [0, 1.45, 0]),
    P(GEO.box(3.4, 1.6, 3.6), '#e8dcc0', [0, 2.3, -4.6]), P(GEO.cone(1, 1, 4), '#3a3a42', [0, 3.5, -4.6], [0, Math.PI / 4, 0], [3, .9, 3.2]), P(GEO.cyl(.16, .2, 10, 8), '#3a2416', [0, 6.4, 1.5]), P(GEO.cyl(.08, .08, 6.4, 6), '#3a2416', [0, 10.4, 1.5], [0, 0, 1.57]), P(GEO.cyl(.08, .08, 6.4, 6), '#3a2416', [0, 4, 1.5], [0, 0, 1.57])]), flat));
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; { const x = cv.getContext('2d'); x.fillStyle = '#f2ead6'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#d8ccb0'; for (let i = 1; i < 6; i++) x.fillRect(i * 21, 0, 2, 128); x.fillStyle = '#2a4a7a'; x.beginPath(); x.arc(64, 64, 30, 0, 7); x.fill(); x.fillStyle = '#f2ead6'; x.beginPath(); x.arc(64, 64, 17, 0, 7); x.fill(); }
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(6, 6.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })); sail.position.set(0, 7.2, 1.62); g.add(sail);
  g.traverse(o => { o.castShadow = true; });
  return g;
}

function miyaDecor(W, c) {
  const rr = mulberry(709), dark = '#3a2416', E = Math.PI / 2, px = HR(60);
  const flat = toon({ vertexColors: true, flatShading: true });
  const onFlat = (x, z, pad) => MI_LAY.flats.some(f => Math.hypot(x - f[0], z - f[1]) < f[2] + pad) || MI_LAY.ema.concat(MI_LAY.chest).some(f => Math.hypot(x - f[0], z - f[1]) < 3.5);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: '#3f7f9a', transparent: true, opacity: .86 })); water.rotation.x = -Math.PI / 2; water.position.y = .15; W.scene.add(water); W.water = water; W.waterCol = '#3f7f9a'; W.minH = -.27;
  addMountains(W, { base: '#5a7a8a', top: '#9ab4c0', snow: '#f4f8ff', snowLine: 2, r0: 210, r1: 280, h0: 8, h1: 22, a0: -1.1, a1: 1.1, n: 12, seed: 41 }); // islands across the bay
  addMountains(W, { base: '#4f6a5a', top: '#8aa890', snow: '#f4f8ff', snowLine: 2, r0: 160, r1: 250, h0: 12, h1: 32, a0: 1.9, a1: 4.4, n: 14, seed: 42 });
  // the quay and the pier
  { const q = new THREE.Mesh(merge([P(GEO.box(140, 2.8, 1.2), '#8a8a84', [20, -.9, 61.3]), P(GEO.box(4.8, .25, 25), '#7a5a3a', [px, .58, 72.3])].concat([...Array(7)].flatMap((_, i) => [P(GEO.cyl(.16, .16, 4, 6), dark, [px + 2.3, -.9, 61.5 + i * 3.8]), P(GEO.cyl(.16, .16, 4, 6), dark, [px - 2.3, -.9, 61.5 + i * 3.8])]))), flat); q.castShadow = true; q.receiveShadow = true; W.scene.add(q); }
  townGate(W, c, '#2a4a7a');
  const ferry = ferryMesh(); ferry.position.set(px + 5.4, 0, 76); W.scene.add(ferry);
  // the night lantern of the ferry landing
  { const x = px - 8, z = 57.5, y = townH(x, z), t = new THREE.Mesh(merge([P(GEO.box(2.6, .6, 2.6), '#8a8a84', [0, .3, 0]), P(GEO.box(2, .5, 2), '#9a9a94', [0, .85, 0]), P(GEO.cyl(.5, .75, 3.4, 8), '#8a8a84', [0, 2.8, 0]), P(GEO.box(1.6, .2, 1.6), '#7a7a74', [0, 4.6, 0]), P(GEO.cone(1, 1, 4), '#6a6a66', [0, 6.1, 0], [0, Math.PI / 4, 0], [1.5, .8, 1.5])]), flat); t.position.set(x, y, z); t.castShadow = true; W.scene.add(t); obs(W, x, z, 1.5);
    const l = new THREE.Mesh(GEO.box(1, 1, 1), glowify(new THREE.MeshBasicMaterial({ color: '#ffb860', fog: false }))); l.position.set(x, y + 5.2, z); W.scene.add(l); const h = halo('#ffb860', 6, 0); h.position.copy(l.position); W.scene.add(h); W.glows.push(h); }
  // houses along the road, and the fish market by the harbor
  const st = k => ({ roof: ['#3a3a42', '#44403c', '#33363e'][k % 3], cap: '#55555e', wall: ['#e8dcc0', '#dccfae', '#efe6d0'][k % 3], h: 2.8, rh: 1.6, win: '#ffcf86' }), taken = []; let k = 0;
  for (let z = -52; z <= 50; z += 12.5) for (const sd of [-1, 1]) { k++; if (sd > 0 && z > 34) continue; const x = HR(z) + sd * (11 + (k % 3) * .4); townHouse(W, c, x, z, sd > 0 ? -E : E, 7 + (k % 2), 6, Math.abs(z) < 5 && sd < 0 ? { roof: '#33302e', wall: '#d8c8a8', win: '#ffb86a' } : st(k)); taken.push([x, z]); }
  const nearHouse = (x, z, r) => taken.some(([a, b]) => Math.hypot(x - a, z - b) < r);
  { const stall = merge([P(GEO.box(3, .12, 2.2), '#8a6a44', [0, .8, 0]), P(GEO.box(3.4, .08, 2.8), '#2a4a7a', [0, 2.3, .2], [.18, 0, 0]), P(GEO.box(.6, .3, .5), '#bcd4e0', [-.8, 1, .2]), P(GEO.box(.6, .3, .5), '#d0e0e8', [0, 1, -.2]), P(GEO.box(.6, .3, .5), '#e08a6a', [.8, 1, .3])].concat([[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => P(GEO.cyl(.06, .06, 2.4, 5), dark, [a * 1.4, 1.2, b * 1]))));
    const sp = [40, 44.5, 49, 53.5].map(z => [HR(z) + 9, z]); W.scene.add(inst(stall, flat, sp.map(([x, z]) => ({ p: [x, townH(x, z), z], r: [0, -E, 0] })), true)); sp.forEach(([x, z]) => { obs(W, x, z, 1.5); taken.push([x, z]); }); }
  addLanterns(W, [[HR(-46) - 3.4, -46], [HR(-20) + 3.4, -20], [HR(6) - 3.4, 6], [HR(30) + 3.4, 30], [HR(52) - 3.6, 52]], '#7a8478', '#ffb860');
  // Atsuta shrine in its grove of great trees
  { const tor = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); tor.position.set(33, townH(33, 20), 20); tor.rotation.y = E; tor.scale.setScalar(1.7); tor.castShadow = true; W.scene.add(tor); obs(W, 33, 16.6, .5); obs(W, 33, 23.4, .5);
    townHouse(W, c, MI_SHRINE[0] + 3, MI_SHRINE[1], -E, 8, 6, { roof: '#3a5a4a', cap: '#c9a35a', wall: '#b8322a', win: '#ffd98a', h: 3, rh: 2.6 });
    const big = merge([P(GEO.cyl(.5, .8, 5, 8), '#4a3a2c', [0, 2.5, 0]), P(GEO.dodec(1), '#2a5a34', [0, 6.5, 0], null, [4, 2.6, 4]), P(GEO.dodec(1), '#34703e', [1.6, 8, .6], [0, 1, 0], [2.6, 1.8, 2.6]), P(GEO.dodec(1), '#245030', [-1.8, 7.2, -1], [0, 2, 0], [2.4, 1.6, 2.4])]), list = [];
    for (let i = 0; i < 300 && list.length < 30; i++) { const x = 26 + rr() * 60, z = -30 + rr() * 78, h = townH(x, z); if (onFlat(x, z, 3) || Math.abs(z - 20) < 7.5 && x < 48 || nearHouse(x, z, 8) || list.some(l => Math.hypot(l.p[0] - x, l.p[2] - z) < 6)) continue; const s = .8 + rr() * .6; list.push({ p: [x, h - .1, z], r: [0, rr() * 6, 0], s }); obs(W, x, z, .7 * s); }
    W.scene.add(inst(big, windify(flat.clone(), .008), list, true)); }
  // pines along the shore, grass inland
  const pines = [];
  for (let z = -84; z <= 56; z += 10.5) { const x = -30 + rr() * 3, zz = z + rr() * 3; if (onFlat(x, zz, 2) || nearHouse(x, zz, 6)) continue; const s = 1 + rr() * .5; pines.push({ p: [x, townH(x, zz) - .1, zz], r: [0, rr() * 6, 0], s }); obs(W, x, zz, .4 * s); }
  for (let i = 0; i < 26; i++) { const x = -34 + rr() * 120, z = -92 + rr() * 6; pines.push({ p: [x, townH(x, z) - .1, z], r: [0, rr() * 6, 0], s: 1.1 + rr() * .6 }); }
  W.scene.add(inst(blackPineGeo(), windify(flat.clone(), .01), pines, true));
  const tuft = merge([P(GEO.cone(.05, .5, 4), '#8aa25a', [0, .25, 0]), P(GEO.cone(.045, .4, 4), '#74904a', [.07, .2, .03], [0, 0, -.3]), P(GEO.cone(.045, .42, 4), '#a0b86a', [-.06, .21, -.04], [0, 0, .3])]), tufts = [];
  for (let i = 0; i < 2000; i++) { const x = -32 + rr() * 120, z = -90 + rr() * 148, h = townH(x, z); if (h < .15 || Math.abs(x - HR(z)) < 3.4 || nearHouse(x, z, 4.2) || onFlat(x, z, -1)) continue; tufts.push({ p: [x, h, z], r: [0, rr() * 6, 0], s: .8 + rr() * 1.3 }); }
  W.scene.add(inst(tuft, windify(toon({ vertexColors: true }), .22), tufts, false));
  // the breakwater, and rocks on the flats
  const rock = merge([P(GEO.dodec(1), '#8a8a84', [0, 0, 0], null, null, (x, y) => new COL(y > .3 ? '#a4a49c' : '#74746e'))]), rocks = [];
  for (let x = -65; x <= -37; x += 1.5) for (const sd of [-1, 1]) { const q = rr(); rocks.push({ p: [x + rr(), .35 + q * .2, MI_SPIT[1] + sd * (2.1 + q * .7)], r: [q * 3, q * 5, 0], s: [.8 + q * .6, .6 + q * .4, .8 + q * .5] }); }
  for (let i = 0; i < 60; i++) { const x = -42 - rr() * 46, z = -88 + rr() * 130, h = miyaH(x, z, true), q = rr(); if (onFlat(x, z, 2) || Math.abs(z - MI_SPIT[1]) < 5) continue; rocks.push({ p: [x, h + .05, z], r: [q * 3, q * 5, 0], s: [.2 + q * .5, .15 + q * .25, .2 + q * .4] }); }
  W.scene.add(inst(rock, flat, rocks, true));
  [[2, 2], [-2, -1], [0, 0]].forEach(([a, b]) => { const h = halo('#7fd0ff', 3.4, .45); h.position.set(MI_SPIT[0] + a, 2, MI_SPIT[1] + b); W.scene.add(h); });
  // fishing boats that float at high water and lie on the sand at low
  const boats = [[-46, -8, .5], [-52, 18, 2.2], [-48, -36, 1.2], [-60, -14, 4], [-44, 32, 3.2]].map(([x, z, ry], i) => { const m = new THREE.Mesh(boatGeo(i % 2 ? '#6a4a30' : '#4a5a6a'), flat); m.position.set(x, 0, z); m.rotation.y = ry; m.castShadow = true; m.g = miyaH(x, z, true); W.scene.add(m); obs(W, x, z, 1.6); return m; });
  // the tide post
  { const [x, z] = MI_POST, y = townH(x, z), m = new THREE.Mesh(merge([P(GEO.cyl(.14, .16, 2.8, 6), dark, [0, 1.4, 0]), P(GEO.box(.9, .7, .08), '#f4efe4', [0, 2.3, .14])].concat([0, 1, 2, 3, 4].map(i => P(GEO.box(.34, .05, .05), '#c4302a', [.16, .5 + i * .35, .14])))), flat); m.position.set(x, y, z); m.rotation.y = -E; m.castShadow = true; W.scene.add(m); obs(W, x, z, .3); }
  // gulls over the harbor
  const gull = merge([P(GEO.box(.9, .04, .3), '#f4f4f0', [.45, 0, 0], [0, 0, .25]), P(GEO.box(.9, .04, .3), '#f4f4f0', [-.45, 0, 0], [0, 0, -.25]), P(GEO.box(.18, .14, .5), '#e8e8e4', [0, -.04, 0])]);
  const gulls = [...Array(7)].map((_, i) => { const m = new THREE.Mesh(gull, toon({ vertexColors: true })); m.userData = { r: 14 + i * 4, s: .25 + (i % 3) * .06, p: i * 1.3, y: 9 + (i % 4) * 2.2, cx: i % 2 ? px + 6 : -50, cz: i % 2 ? 74 : 10 }; W.scene.add(m); return m; });
  let warned = 0;
  W.tick = (dt, T) => {
    const y = lerp(-1.15, .15, miTide(T.day)); water.position.y = y; W.minH = y - .42; W.low = y < -.75;
    ferry.position.y = y - .35 + Math.sin(T.clock * .9) * .06; ferry.rotation.z = Math.sin(T.clock * .7) * .02;
    for (const b of boats) { const fl = Math.max(y - .12, b.g + .02); b.position.y = fl; b.rotation.z = lerp(b.rotation.z, fl > y ? .24 : Math.sin(T.clock * 1.1 + b.g * 9) * .05, damp(2, dt)); }
    for (const g of gulls) { const u = g.userData, a = T.clock * u.s + u.p; g.position.set(u.cx + Math.cos(a) * u.r, u.y + Math.sin(a * 2.3) * .8, u.cz + Math.sin(a) * u.r); g.rotation.set(0, -a, Math.sin(T.clock * 5 + u.p) * .25); }
    // if the tide comes in around you, it carries you gently back toward the beach
    if (townH(T.pos.x, T.pos.z) < W.minH && T.pos.x < -34 && T.pos.z < 60) { T.pos.x += dt * 5; T.lastGood.copy(T.pos); if (T.clock - warned > 12) { warned = T.clock; toast('The tide is coming in. It carries you back toward the beach.'); } }
  };
}
function miyaPeople(T) {
  const [x, z] = MI_POST;
  T.pois.push({ id: 'tide', kind: 'spot', x: x + 1.2, z, r: 3, label: 'Read the tide post', map: 'Tide post', act: () => {
    const y = lerp(-1.15, .15, miTide(T.day)), rising = miTide(T.day + .01) > miTide(T.day);
    townSay('The tide post', y < -.75 ? 'The water is far out. <b>Low tide</b>: the flats are open all the way to the sandbar.' : `The water stands ${y > -.2 ? 'high on' : 'halfway up'} the post and is ${rising ? 'rising' : 'falling'}. The sea here goes out twice a day, and at low tide you can walk the flats to the sandbar.`, y < -.75 ? [['', 'Good']] : [['tide', '🌊 Wait for low tide', 'primary'], ['', 'Not now']]);
  } });
}

/* Miya's duels: the pirate on the beach, the captain on his rolling deck, the dragon in a storm on the breakwater */
function miyaArena(role) {
  const W = newWorld('miya-duel'), deck = role === 'keeper', storm = role === 'myth';
  if (storm) { addSky(W, { top: '#1a2030', mid: '#3f4a5c', bot: '#6a7684', sunDir: new V3(-.4, .5, .6), sunCol: '#aab4c4', sunDeg: 2, fog: '#4a5666', fogNear: 14, fogFar: 110, stars: false, haze: .2 });
    addLights(W, { sky: '#9ab0d0', ground: '#2a3a4a', hemi: .8, key: '#c8d8f0', keyI: .6, keyDir: new V3(-.4, 1, .5), rim: '#7fd0ff', rimI: 1.1, rimDir: new V3(.3, .5, 1) }); }
  else { addSky(W, { top: '#1f4f8c', mid: '#8fb4d6', bot: '#e6f0f4', sunDir: new V3(-.5, .45, .5), sunCol: '#fff2dc', sunDeg: 3.5, fog: '#c2d6e0', fogNear: 30, fogFar: 190, stars: false, haze: .5 });
    addLights(W, { sky: '#e0f0ff', ground: '#5a6a7a', hemi: .85, key: '#fff0dc', keyI: .9, keyDir: new V3(-.5, 1, .35), rim: '#a0d8ff', rimI: .7, rimDir: new V3(.4, .5, 1) }); }
  const sea = new THREE.Group(); W.scene.add(sea);
  const seaCol = storm ? '#2f4a5c' : '#3f7f9a';
  if (deck) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: seaCol })); pl.rotation.x = -Math.PI / 2; pl.position.y = -2.2; sea.add(pl);
    addMountains({ scene: sea }, { base: '#5a7a8a', top: '#9ab4c0', snow: '#f4f8ff', snowLine: 2, r0: 200, r1: 270, h0: 8, h1: 24, a0: -3.14, a1: 3.14, n: 16, seed: 44 });
    const dark = '#3a2416', flat = toon({ vertexColors: true, flatShading: true });
    const ship = new THREE.Mesh(merge([P(GEO.box(9.6, .3, 22), '#8a6a44', [0, -.15, 3]), P(GEO.box(10.2, 2.4, 22.6), '#5a3a26', [0, -1.5, 3]), P(GEO.box(.2, 1, 22), dark, [4.8, .5, 3]), P(GEO.box(.2, 1, 22), dark, [-4.8, .5, 3]), P(GEO.box(9.6, 1, .2), dark, [0, .5, 14]),
      P(GEO.cyl(.22, .28, 12, 8), dark, [0, 6, 11]), P(GEO.cyl(.1, .1, 8.6, 6), dark, [0, 11.4, 11], [0, 0, 1.57]), P(GEO.box(8, 6.6, .08), '#f2ead6', [0, 7.9, 11.1]), P(GEO.cyl(1.9, 1.9, .1, 20), '#2a4a7a', [0, 7.9, 11.02], [1.57, 0, 0]), P(GEO.cyl(1.1, 1.1, .12, 20), '#f2ead6', [0, 7.9, 11.0], [1.57, 0, 0])]
      .concat([-3.2, 3.2].flatMap(x => [P(GEO.box(1.2, .9, 1.2), '#6a4a30', [x, .45, 9]), P(GEO.cyl(.4, .4, 1, 10), '#7a5a3a', [x * .9, .5, -3.5])]))), flat); ship.castShadow = true; ship.receiveShadow = true; W.scene.add(ship);
    W.updaters.push((dt, t) => { sea.rotation.z = Math.sin(t * .8) * .05; sea.rotation.x = Math.sin(t * .55 + 1) * .022; sea.position.y = Math.sin(t * .8 + 1.2) * .25; });
  } else {
    addGround(W, { a: storm ? '#7a7a74' : '#dccba2', b: storm ? '#6a6a66' : '#cdb98c', c: storm ? '#5a6068' : '#b8a888', clear: 60, hill: 0, flat: true, pattern: (x, z, t) => { const r = Math.hypot(x, z - 2.6); if (r > 10) t.lerp(new COL(storm ? '#3a4a54' : '#a89a7a'), smooth(10, 13, r)); } });
    const ring = new THREE.Mesh(new THREE.RingGeometry(storm ? 9.5 : 12, 500, 48, 1), new THREE.MeshBasicMaterial({ color: seaCol, transparent: true, opacity: .9 })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, .04, 2.6); W.scene.add(ring);
    addMountains(W, { base: '#5a7a8a', top: '#9ab4c0', snow: '#f4f8ff', snowLine: 2, r0: 200, r1: 270, h0: 8, h1: 24, a0: -3.14, a1: 3.14, n: 16, seed: 44 });
    const clear = (x, z) => laneClear(x, z) || Math.hypot(x, z - 2.6) < 5.2, flat = toon({ vertexColors: true, flatShading: true });
    const rock = merge([P(GEO.dodec(1), '#8a8a84', [0, 0, 0], null, null, (x, y) => new COL(y > .3 ? '#a4a49c' : '#74746e'))]);
    W.scene.add(inst(rock, flat, scatter(storm ? 70 : 24, 5.6, storm ? 9.5 : 11, 91, clear).map(([x, z, k]) => ({ p: [x, .1, z], r: [k * 3, k * 5, 0], s: storm ? [.6 + k, .5 + k * .6, .6 + k] : [.2 + k * .4, .15 + k * .2, .2 + k * .4] })), true));
    if (!storm) { W.scene.add(inst(boatGeo('#4a5a6a'), flat, [{ p: [-7.5, 0, 6], r: [0, .6, .22] }, { p: [8, 0, 9], r: [0, 2.4, -.2] }], true)); const f = ferryMesh(); f.position.set(-26, -.4, 44); f.rotation.y = .5; W.scene.add(f); }
  }
  if (storm) {
    W.ambient.push(new Ambient({ n: 1300, tex: TEX.flake, color: '#b8cce0', color2: '#8fa8c4', size: .075, alpha: .8, cx: 0, cy: 5, cz: 3, ax: 14, ay: 7, az: 14, sway: .1, vel: r => [2.4 + r() * .6, -12 - r() * 4, .4], seed: 4 }));
    let next = 3; W.updaters.push((dt, t) => { if (t > next) { next = t + 3 + Math.random() * 5; W.flash = 1; } W.flash = Math.max(0, (W.flash || 0) - dt * 3.5); W.hemi.intensity = .58 + W.flash * 1.6; });
  }
  addClouds(W, { color: storm ? '#3a4452' : '#f0f4f6', n: storm ? 16 : 10, opacity: storm ? .9 : .6, y0: 45 });
  return W;
}

Object.assign(TOWN_BY.miya, {
  flip: 1, fuji: null, day: .28, amb: 'none', cloud: '#f0f4f6', pal: ['#e8dcb8', '#8aa25a', '#a09866', '#cfc4a0'], lay: MI_LAY, h: miyaH, hMesh: (x, z) => miyaH(x, z, true), tint: miyaTint, decor: miyaDecor, arena: miyaArena, people: miyaPeople, doneZ: 81,
  roadK: (x, z) => 1 - smooth(59, 60.5, z),
  click: a => { if (a !== 'tide') return false; townCloseTalk(); const T = TOWN; let d = ((.53 - T.day) % .5 + .5) % .5; T.lapse = d + .004; T.joy = null; T.lapseThen = () => toast('Low tide. The flats are open.'); hint('The tide goes out…'); return true; },
  gate: { verb: 'down', map: 'Pier', guard: 'Harbor Master', place: 'ferry pier', halt: 'Hold there. This is the Miya ferry landing. From here the Tokaido goes by sea, seven ri across the bay to Kuwana. What is your business on the Tokaido?' },
  mapBg: (sx, sy) => { const road = []; for (let z = -90; z <= 60; z += 6) road.push(`${sx(HR(z))},${sy(z)}`);
    return `<rect x="0" y="0" width="320" height="${sy(61)}" fill="#2f6a86"/><rect x="0" y="0" width="${sx(-38)}" height="300" fill="#b8a880"/><rect x="0" y="0" width="${sx(-60)}" height="300" fill="#2f6a86" opacity=".55"/>
      <rect x="${sx(30)}" y="${sy(48)}" width="${320 - sx(30)}" height="${sy(-30) - sy(48)}" fill="#2f5a34" opacity=".7"/><line x1="${sx(-64)}" y1="${sy(48)}" x2="${sx(-36)}" y2="${sy(48)}" stroke="#8a8a84" stroke-width="4"/><circle cx="${sx(MI_BAR[0])}" cy="${sy(MI_BAR[1])}" r="9" fill="#dccba2"/>
      <line x1="${sx(HR(60))}" y1="${sy(60)}" x2="${sx(HR(60))}" y2="${sy(84)}" stroke="#7a5a3a" stroke-width="5"/><polyline points="${road.join(' ')}" fill="none" stroke="#c9b48c" stroke-width="5"/><text x="${sx(-36)}" y="${sy(-70)}" font-size="9" fill="#5a4a2a" text-anchor="end">tidal flats</text><text x="${sx(40)}" y="${sy(75)}" font-size="9" fill="#cfe6ee">Ise Bay</text>`; },
});
Object.assign(TOWN_BY.miya.keeper, { where: 'at the head of the pier' });
Object.assign(TOWN_BY.miya.a, { wait: 'Shiranami struts along the shore, south-west of town.' });
Object.assign(TOWN_BY.miya.b, { look: { geisha: true, cloth: '#f4f0ea', armor: '#f4f0ea', trim: '#c4302a', hem: '#c4302a', mask: '#ffe6da', eye: '#3a2020', lips: '#d0405a', pins: '#ffd27a', bloom: '#ffffff', inner: '#c4302a' },
  ask: 'Three sacred shells washed off the altar in last night\'s storm and out onto the tidal flats. The sea hides them when the tide is in. The tide post on the beach will tell you when to look.' });
TOWN_BY.miya.myth.tip = 'Parry its bites and claws, and hold BLOCK when it breathes. The storm is its home, not yours.';
TOWN_BY.miya.note[1] += ' Sailors watched the tide closely: the bay is shallow, and at low water boats could not reach the landing. A tall stone lantern burned at the pier all night to guide ferries in.';
