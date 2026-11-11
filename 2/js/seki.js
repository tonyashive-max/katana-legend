'use strict';
/* ===== Seki: the town of inns, where nothing is quite what it seems =====
   A narrow valley of red maples and lantern-lit inns. Tanuki are loose in town: some sake cups are only leaves,
   six stone statues move when you look away, and the innkeeper who guards the gate has a tail. */

const SK_SHRINE = [40, 18], SK_MOON = [-42, 40], SK_CAMP = [-22, -36], SK_WELL = [-21, 4], SK_GROVE = [25, -46];
const SK_FAKE = [[HR(-8) - 16, -9], [HR(40) + 15, 41]];
const SK_STAT = [[HR(-44) + 5, -44], [HR(-18) - 5.2, -17], [-24, 16], [HR(12) + 5.4, 13], [22, 34], [HR(38) - 5.2, 38]];
const SK_LAY = {
  ema: [[HR(30) - 17, 30], [HR(-20) + 17, -21], [SK_SHRINE[0] - 7.5, SK_SHRINE[1] + 5]], emaCol: '#ffd98a', emaGeo: () => GEO.cyl(.24, .12, .2, 10), emaHint: ' They glow gold. Careful: in this town, not every cup is a cup.',
  chest: [SK_GROVE, SK_WELL],
  chestHint: ['In a chest in the bamboo grove behind the inns, south-east', 'By the old well. It only appears when you have caught all six disguised tanuki: stone statues that move when you look away'],
  flats: [[SK_SHRINE[0], SK_SHRINE[1], 7, 5], [SK_MOON[0], SK_MOON[1], 8, 6], [SK_CAMP[0], SK_CAMP[1], 4.5, .5], [SK_WELL[0], SK_WELL[1], 4, .4], [SK_GROVE[0], SK_GROVE[1], 4, 1.2], [HR(56), 56, 9, .3]],
  pos: {
    keeper: [HR(55) + 5, 54.5, Math.PI * 1.2], a: [HR(-2) - 6.4, -2, Math.PI / 2], friendA: [HR(4) - 6.6, 4.5, Math.PI / 2], smith: [HR(22) + 7.2, 22, -Math.PI / 2],
    b: [SK_SHRINE[0] - 4.5, SK_SHRINE[1] - 1, -Math.PI / 2], foe: [SK_CAMP[0], SK_CAMP[1], .9], myth: [SK_MOON[0], SK_MOON[1], 2.2],
  },
};
function sekiH(x, z) {
  const rd = Math.abs(x - HR(z)), ax = Math.abs(x - HR(z) * .5);
  let h = Math.max(.2, .45 + (fbm(x * .05 + 51, z * .05 + 7) - .5) * 1.1);
  h += smooth(24, 62, ax) * 19 * (.7 + .5 * fbm(x * .035 + 8, z * .035 + 51)); // the valley walls
  const edge = Math.max(-z - 86, 0); h += Math.min(edge * edge * .1, 5);
  h = lerp(h, .28, 1 - smooth(2.8, 7, rd));
  for (const f of SK_LAY.flats) { const d = Math.hypot(x - f[0], z - f[1]); if (d < f[2] + 6) h = lerp(f[3], h, smooth(f[2], f[2] + 6, d)); }
  return h;
}
const _kc = [new COL('#8a5a34'), new COL('#b8742a')];
function sekiTint(x, z, h, t) { t.lerp(_kc[0], smooth(3, 12, h) * .5); const n = fbm(x * .3, z * .3); if (n > .55 && h < 8) t.lerp(_kc[1], (n - .55) * 1.6); }
function tanukiGeo() {
  return merge([P(GEO.sph(.42, 10, 8), '#7a5634', [0, .45, 0], null, [1, 1.1, .95]), P(GEO.sph(.3, 8, 6), '#e8dcc0', [0, .4, .22], null, [1, 1.1, .6]), P(GEO.sph(.27, 10, 8), '#7a5634', [0, 1.05, .02]),
    P(GEO.sph(.12, 6, 5), '#e8dcc0', [0, .98, .22], null, [1.3, .8, .8]), P(GEO.sph(.045, 5, 4), '#1c1410', [0, 1.02, .31]), P(GEO.sph(.07, 5, 4), '#1c1410', [.11, 1.1, .21]), P(GEO.sph(.07, 5, 4), '#1c1410', [-.11, 1.1, .21]),
    P(GEO.cone(.52, .28, 10), '#c9a35a', [0, 1.36, 0]), P(GEO.cyl(.1, .13, .3, 7), '#f4efe4', [-.42, .5, .16]), P(GEO.sph(.2, 7, 5), '#5a3e26', [0, .3, -.42], null, [1, 1, 1.5]), P(GEO.sph(.1, 5, 4), '#7a5634', [.2, .06, .2], null, [1, .6, 1.6]), P(GEO.sph(.1, 5, 4), '#7a5634', [-.2, .06, .2], null, [1, .6, 1.6])]);
}
function mapleGeo(c) {
  return merge([P(GEO.cyl(.13, .24, 2.4, 6), '#3e2c22', [0, 1.2, 0], [0, 0, .08]), P(GEO.cyl(.07, .1, 1.5, 5), '#3e2c22', [.5, 2.6, 0], [0, 0, -.8]), P(GEO.dodec(1), c[0], [0, 3.4, 0], null, [2.1, 1, 2.1]), P(GEO.dodec(1), c[1], [.9, 3.9, .3], [0, 1, 0], [1.4, .8, 1.4]), P(GEO.dodec(1), c[2], [-.8, 4, -.4], [0, 2, 0], [1.3, .75, 1.3]), P(GEO.dodec(1), c[3], [.1, 4.5, 0], [0, 3, 0], [1, .6, 1])]);
}
function leafPuff(x, y, z) { const p = new V3(x, y, z); FX.sparks(p, '#e8862a', 26, 4); FX.sparks(p, '#c8442a', 18, 3); FX.sparks(p, '#f4efe4', 10, 2); sfx.coin && sfx.coin(); }

function sekiDecor(W, c) {
  const rr = mulberry(907), dark = '#3a2416', E = Math.PI / 2, J = S.town, flat = toon({ vertexColors: true, flatShading: true });
  J.tans = J.tans || []; J.fk = J.fk || [];
  const onFlat = (x, z, pad) => SK_LAY.flats.some(f => Math.hypot(x - f[0], z - f[1]) < f[2] + pad) || SK_LAY.ema.concat(SK_LAY.chest, SK_FAKE, SK_STAT).some(f => Math.hypot(x - f[0], z - f[1]) < 3.5);
  addMountains(W, { base: '#5a4a52', top: '#a0747a', snow: '#f4f8ff', snowLine: 2, r0: 150, r1: 250, h0: 24, h1: 70, a0: -3.14, a1: 3.14, n: 30, seed: 55 });
  // the moon over the western hill
  { const m = new THREE.Mesh(new THREE.CircleGeometry(26, 40), new THREE.MeshBasicMaterial({ color: '#fff2c8', fog: false })); m.position.set(-250, 150, 180); m.lookAt(0, 0, 0); m.renderOrder = -8; W.scene.add(m); W.moon = m; const h = halo('#ffe8a8', 130, .5); h.position.copy(m.position); h.material.fog = false; W.scene.add(h); W.moonHalo = h; }
  // the street of inns: tall, close together, hung with lanterns
  const taken = []; let k = 0;
  for (let z = -54; z <= 46; z += 10.2) for (const sd of [-1, 1]) {
    k++; if (sd < 0 && Math.abs(z - 4) < 6) continue; // the well's little square
    const two = k % 3 !== 0, x = HR(z) + sd * (10.2 + (k % 2) * .5), smith = sd > 0 && Math.abs(z - 22) < 5;
    townHouse(W, c, x, z, sd > 0 ? -E : E, 7 + (k % 2), 6, smith ? { roof: '#33302e', wall: '#d8c8a8', win: '#ffb86a' } : { roof: ['#3a2f2c', '#4a3630', '#33302e'][k % 3], cap: '#5a4640', wall: ['#e8dcc0', '#dccfae', '#e2d2b4'][k % 3], h: two ? 4.6 : 2.8, rh: 1.7, win: '#ffc070' }); taken.push([x, z]);
  }
  townHouse(W, c, HR(52) + 13, 51, -E, 9, 7, { roof: '#5a2f24', cap: '#7a4a30', wall: '#e8dcc0', h: 4.8, rh: 2, win: '#ffb060' }); taken.push([HR(52) + 13, 51]);
  const nearHouse = (x, z, r) => taken.some(([a, b]) => Math.hypot(x - a, z - b) < r);
  { const l = [], red = []; for (let z = -56; z <= 50; z += 3.4) for (const sd of [-1, 1]) { const x = HR(z) + sd * 6.2; (Math.round(z / 3.4) % 3 ? l : red).push({ p: [x, townH(x, z) + 2.6 + Math.sin(z) * .15, z] }); }
    W.scene.add(inst(GEO.sph(.22, 7, 6), glowify(new THREE.MeshBasicMaterial({ color: '#ffb060', fog: false })), l, false)); W.scene.add(inst(GEO.sph(.24, 7, 6), glowify(new THREE.MeshBasicMaterial({ color: '#ff6a4a', fog: false })), red, false));
    for (let z = -52; z <= 48; z += 10.2) for (const sd of [-1, 1]) { const h = halo('#ffb060', 5, 0); h.position.set(HR(z) + sd * 6.2, 2.8, z); W.scene.add(h); W.glows.push(h); } }
  addLanterns(W, [[HR(-48) - 3.6, -48], [HR(-12) + 3.6, -12], [HR(34) - 3.6, 34], [HR(54) - 3.8, 54], [SK_SHRINE[0] - 6, SK_SHRINE[1] - 4], [SK_MOON[0] + 5, SK_MOON[1] - 5], [SK_WELL[0] + 2.5, SK_WELL[1] + 2.5]], '#7a7468', '#ffb860');
  // the barrier gate and its palisade across the valley floor
  townGate(W, c, '#5a2f24');
  { const stakes = [], gx = HR(GATE_Z); for (let x = -46; x <= 46; x += .9) { if (Math.abs(x - gx) < 3.4 || townH(x, GATE_Z) > 12) continue; stakes.push({ p: [x, townH(x, GATE_Z) + 1.3, GATE_Z + Math.sin(x * .3) * .2], s: [1, 1 + hash2(x * 10 | 0, 1) * .25, 1] }); }
    W.scene.add(inst(merge([P(GEO.cyl(.11, .13, 2.6, 6), '#4a3220', [0, 0, 0]), P(GEO.cone(.13, .4, 6), dark, [0, 1.5, 0])]), toon({ vertexColors: true }), stakes, true)); }
  // maples everywhere: thick on the hills, a few in town
  const maples = [];
  for (let i = 0; i < 1500 && maples.length < 330; i++) { const x = (rr() * 2 - 1) * 100, z = (rr() * 2 - 1) * 100, h = townH(x, z); if (Math.abs(x - HR(z)) < 17 && h < 1.2 || h > 30 || onFlat(x, z, 2) || nearHouse(x, z, 6.5)) continue; const s = .9 + rr() * .9; maples.push({ p: [x, h - .1, z], r: [0, rr() * 6, 0], s }); if (Math.abs(x) < TOWN_R && h < 15) obs(W, x, z, .35 * s); }
  W.scene.add(inst(mapleGeo(c.tree), windify(flat.clone(), .02), maples, true));
  const tuft = merge([P(GEO.cone(.05, .5, 4), '#a08a44', [0, .25, 0]), P(GEO.cone(.045, .4, 4), '#8a743a', [.07, .2, .03], [0, 0, -.3]), P(GEO.cone(.045, .42, 4), '#c8862a', [-.06, .21, -.04], [0, 0, .3])]), tufts = [];
  for (let i = 0; i < 1800; i++) { const x = (rr() * 2 - 1) * 60, z = (rr() * 2 - 1) * 90, h = townH(x, z); if (h > 13 || Math.abs(x - HR(z)) < 3.4 || nearHouse(x, z, 4.2)) continue; tufts.push({ p: [x, h, z], r: [0, rr() * 6, 0], s: .8 + rr() * 1.3 }); }
  W.scene.add(inst(tuft, windify(toon({ vertexColors: true }), .22), tufts, false));
  // fallen leaves on the ground
  { const lv = []; for (let i = 0; i < 900; i++) { const x = (rr() * 2 - 1) * 50, z = (rr() * 2 - 1) * 88, h = townH(x, z); if (h > 10) continue; lv.push({ p: [x, h + .03, z], r: [-E + (rr() - .5) * .3, 0, rr() * 6], s: .7 + rr() * .8 }); } W.scene.add(inst(new THREE.CircleGeometry(.16, 5), new THREE.MeshBasicMaterial({ color: '#d8642a', side: THREE.DoubleSide }), lv, false)); }
  // bamboo grove behind the inns
  { const bam = merge([P(GEO.cyl(.06, .08, 6.5, 5), '#7a9a4a', [0, 3.25, 0], [0, 0, .04]), P(GEO.cone(.7, 1.6, 5), '#8ab25a', [.1, 6.4, 0]), P(GEO.cone(.5, 1.2, 5), '#6f9a4a', [-.2, 5.4, .1])]), b = []; for (let i = 0; i < 70; i++) { const a = rr() * 6.283, r = 4.6 + rr() * 6, x = SK_GROVE[0] + Math.cos(a) * r, z = SK_GROVE[1] + Math.sin(a) * r; if (a > 2.4 && a < 3.6 || nearHouse(x, z, 5)) continue; b.push({ p: [x, townH(x, z), z], r: [0, rr() * 6, 0], s: .8 + rr() * .5 }); obs(W, x, z, .2); } W.scene.add(inst(bam, windify(flat.clone(), .03), b, true)); }
  // the maple shrine up its steps, the moon-viewing hill, the well, the gambler's mat
  { const [x, z] = SK_SHRINE; townHouse(W, c, x + 3, z, -E, 5.5, 5, { roof: '#7a2a22', wall: '#b8322a', win: '#ffd98a', h: 2.5, rh: 2 });
    const tor = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); tor.position.set(x - 8.5, townH(x - 8.5, z), z); tor.rotation.y = E; tor.castShadow = true; W.scene.add(tor); obs(W, x - 8.5, z - 2, .4); obs(W, x - 8.5, z + 2, .4);
    const steps = []; for (let i = 0; i < 12; i++) { const sx = x - 21 + i * 1.05; steps.push({ p: [sx, townH(sx, z) + .02, z], s: [1.1, .16, 3.2] }); } W.scene.add(inst(GEO.box(1, 1, 1), toon({ color: '#8a8a84' }), steps, false)); }
  { const [x, z] = SK_MOON, y = townH(x, z); const tt = new THREE.Mesh(toriiGeo('#3a3a44', '#141418'), toon({ vertexColors: true })); tt.position.set(x + 7.5, townH(x + 7.5, z - 4), z - 4); tt.rotation.y = E + .5; tt.scale.setScalar(1.2); W.scene.add(tt);
    [[3, 3], [-4, 2], [0, -5]].forEach(([a, b]) => { const h = halo('#e8b03a', 3, .45); h.position.set(x + a, y + 1.2, z + b); W.scene.add(h); });
    W.scene.add(inst(GEO.cyl(.5, .5, .5, 12), toon({ color: '#8a5a34' }), [{ p: [x - 2.5, y + .25, z + 2.5] }, { p: [x - 3.6, y + .25, z + 1] }], true)); }
  { const [x, z] = SK_WELL, y = townH(x, z), m = new THREE.Mesh(merge([P(GEO.cyl(.9, .95, .8, 10, 1, true), '#8a8a84', [0, .4, 0]), P(GEO.cyl(.06, .06, 2.2, 5), dark, [.85, 1.1, 0]), P(GEO.cyl(.06, .06, 2.2, 5), dark, [-.85, 1.1, 0]), P(GEO.cone(1, 1, 4), '#4a3630', [0, 2.5, 0], [0, Math.PI / 4, 0], [1.5, .6, 1.2]), P(GEO.cyl(.2, .16, .3, 8), '#6a4a30', [0, 1.5, 0])]), flat); m.position.set(x - 1.8, y, z - 1.5); m.castShadow = true; W.scene.add(m); obs(W, x - 1.8, z - 1.5, 1.1); }
  { const [x, z] = SK_CAMP, y = townH(x, z); W.scene.add(inst(GEO.box(1, 1, 1), toon({ color: '#8a2a2a' }), [{ p: [x + 1.6, y + .03, z + 1], s: [2, .05, 1.4] }], false)); W.scene.add(inst(GEO.box(.14, .14, .14), toon({ color: '#f4efe4' }), [{ p: [x + 1.4, y + .13, z + .9], r: [0, .5, 0] }, { p: [x + 1.8, y + .13, z + 1.2], r: [0, 1.2, 0] }], false)); }
  // tanuki tricks: cups that are only leaves, and statues that move when no one is looking
  const fakes = SK_FAKE.map(([x, z], i) => { if (J.fk.includes(i)) return null; const m = new THREE.Mesh(GEO.cyl(.24, .12, .2, 10), toon({ color: '#ffd98a', emissive: new COL('#ffd98a'), emissiveIntensity: .25 })); m.position.set(x, townH(x, z) + .5, z); const h = halo('#ffd98a', 2.4, .55); h.position.y = .2; m.add(h); W.scene.add(m); return { i, m, x, z }; }).filter(Boolean);
  const tg = tanukiGeo(), stats = SK_STAT.map(([x, z], i) => { if (J.tans.includes(i)) return null; const m = new THREE.Mesh(tg, flat); m.position.set(x, townH(x, z), z); m.rotation.y = Math.atan2(HR(z) - x, .01); m.castShadow = true; W.scene.add(m); return { i, m, hops: 3, cd: 2 + i, wob: 0 }; }).filter(Boolean);
  W.stats = stats;
  const _f = new V3(), _d = new V3();
  W.tick = (dt, T) => {
    const lum = W.key.intensity / .72, night = 1 - smooth(.3, .6, lum); W.moon.material.color.setRGB(lerp(.75, 1, night), lerp(.8, .95, night), lerp(.9, .78, night)); W.moonHalo.material.opacity = .15 + night * .4;
    for (const f of fakes) { if (f.gone) continue; f.m.rotation.y += dt * 1.2; if (Math.hypot(T.pos.x - f.x, T.pos.z - f.z) < 1.7) { f.gone = true; W.scene.remove(f.m); J.fk.push(f.i); save(); leafPuff(f.x, f.m.position.y, f.z); banner('A leaf!', 'That cup was a tanuki trick'); } }
    CAM.getWorldDirection(_f);
    for (const s of stats) {
      if (s.gone) continue; const p = s.m.position, d = Math.hypot(T.pos.x - p.x, T.pos.z - p.z);
      _d.set(p.x - CAM.position.x, p.y + .6 - CAM.position.y, p.z - CAM.position.z).normalize(); const seen = _d.dot(_f) > .55;
      s.cd -= dt; s.wob = lerp(s.wob, seen && d < 7 ? 1 : 0, damp(4, dt)); s.m.rotation.z = Math.sin(T.clock * 14) * .07 * s.wob;
      if (d < 2.1 && !T.paused) { s.gone = true; W.scene.remove(s.m); J.tans.push(s.i); save(); leafPuff(p.x, p.y + .7, p.z); const n = J.tans.length; banner(n >= 6 ? 'All six tanuki caught!' : 'Caught a tanuki!', n >= 6 ? 'They left their treasure by the old well' : `It was never a statue. ${n} of 6`); if (n >= 6) virtue('makoto', 1, 'you saw through every trick'); continue; }
      if (!seen && d > 4 && d < 17 && s.cd <= 0 && s.hops > 0) { // hop while unobserved
        for (let k = 0; k < 6; k++) { const a = Math.random() * 6.283, r = 4 + Math.random() * 3.5, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, h = townH(x, z); if (h > 1.5 || Math.abs(x - HR(z)) > 22 || z > 54 || z < -80 || nearHouse(x, z, 5.2) || Math.hypot(x - T.pos.x, z - T.pos.z) < 5) continue; p.set(x, h, z); s.m.rotation.y = Math.atan2(T.pos.x - x, T.pos.z - z); s.hops--; s.cd = 5; break; }
      }
    }
    const c1 = T.pois.find(q => q.id === 'c1'); if (c1) { const show = J.tans.length >= 6; c1.m.visible = show; c1.r = show ? 2.6 : 0; }
  };
}

/* Seki's duels: a lantern-lit lane under the maples, and for the tanuki, the hill under a huge moon */
function sekiArena(role) {
  const W = newWorld('seki-duel'), moon = role === 'myth';
  if (moon) { addSky(W, { top: '#060a1e', mid: '#1a2a55', bot: '#3a3f6a', sunDir: new V3(-.2, .42, 1), sunCol: '#fff2c8', sunDeg: 9, fog: '#1e2848', fogNear: 18, fogFar: 130, stars: true, haze: .5 });
    addLights(W, { sky: '#9fb8ff', ground: '#3a3048', hemi: .75, key: '#cfd8ff', keyI: .7, keyDir: new V3(-.2, .8, 1), rim: '#e8b03a', rimI: 1, rimDir: new V3(.3, .5, -1) }); }
  else { addSky(W, { top: '#2a2f66', mid: '#e58a5a', bot: '#ffd0a0', sunDir: new V3(-.7, .12, .6), sunCol: '#ffe0b0', sunDeg: 4, fog: '#c99a82', fogNear: 20, fogFar: 130, stars: false, haze: .6 });
    addLights(W, { sky: '#ffd8c0', ground: '#5a4a3a', hemi: .75, key: '#ffb880', keyI: .85, keyDir: new V3(-.7, .5, .4), rim: '#ff9a6a', rimI: .8, rimDir: new V3(.3, .5, 1) }); }
  addGround(W, { a: moon ? '#6a6a52' : '#a08a5a', b: moon ? '#5a5a4a' : '#8a7448', c: moon ? '#3a3a44' : '#7a5a3a', clear: 9, hill: moon ? 2.5 : 4, pattern: (x, z, t) => { const n = fbm(x * .4, z * .4); if (n > .56) t.lerp(new COL('#c8642a'), (n - .56) * 2); } });
  addMountains(W, { base: '#5a4a52', top: '#a0747a', snow: '#f4f8ff', snowLine: 2, r0: 140, r1: 230, h0: 20, h1: 60, a0: -3.14, a1: 3.14, n: 24, seed: 57 });
  const cl = (x, z) => laneClear(x, z) || Math.hypot(x, z - 2.6) < 5.4, c = TOWN_BY.seki.tree;
  W.scene.add(inst(mapleGeo(c), windify(toon({ vertexColors: true, flatShading: true }), .02), scatter(moon ? 40 : 90, 7, 48, 93, cl).map(([x, z, k]) => ({ p: [x, W.hAt(x, z) - .1, z], r: [0, k * 6, 0], s: .9 + k * .9 })), true));
  addLanterns(W, [[-3.8, 6.4], [3.8, 6.4], [-5.6, -1], [5.6, -1]], '#7a7468', '#ffb860');
  if (moon) { const m = new THREE.Mesh(new THREE.CircleGeometry(34, 40), new THREE.MeshBasicMaterial({ color: '#fff2c8', fog: false })); m.position.set(-40, 62, 300); m.lookAt(0, 0, 0); m.renderOrder = -8; W.scene.add(m); const h = halo('#ffe8a8', 170, .5); h.position.copy(m.position); h.material.fog = false; W.scene.add(h);
    W.scene.add(inst(tanukiGeo(), toon({ vertexColors: true, flatShading: true }), [[-5.5, 5, .6], [5.6, 7.5, -.7], [-6.4, 9.5, .9], [6.5, 3, -1]].map(([x, z, r]) => ({ p: [x, 0, z], r: [0, r, 0] })), true)); }
  else { const l = []; for (let i = 0; i < 16; i++) for (const sd of [-1, 1]) l.push({ p: [sd * 6.4, 2.6 + Math.sin(i) * .15, -8 + i * 1.8] }); W.scene.add(inst(GEO.sph(.2, 7, 6), glowify(new THREE.MeshBasicMaterial({ color: '#ffb060', fog: false })), l, false)); }
  W.ambient.push(new Ambient({ n: 260, tex: TEX.petal, color: '#e8862a', color2: '#c8442a', size: .09, alpha: .9, cx: 0, cy: 4, cz: 3, ax: 14, ay: 5, az: 14, sway: .8, vel: r => [.4 + r() * .4, -.5 - r() * .5, -.1 + r() * .3], seed: 8 }));
  addClouds(W, { color: moon ? '#3a4470' : '#ffc8a8', n: 9, opacity: .5, y0: 50 });
  return W;
}

Object.assign(TOWN_BY.seki, {
  flip: 1, fuji: null, day: .47, cloud: '#e8c8b8', pal: ['#d8c8a8', '#8a7a44', '#7a5a3a', '#a89878'], lay: SK_LAY, h: sekiH, tint: sekiTint, decor: sekiDecor, arena: sekiArena,
  mapBg: (sx, sy) => { const road = []; for (let z = -90; z <= 90; z += 6) road.push(`${sx(HR(z))},${sy(z)}`);
    return `<rect x="0" y="0" width="${sx(-36)}" height="300" fill="#6a3a2a" opacity=".7"/><rect x="${sx(36)}" y="0" width="${320 - sx(36)}" height="300" fill="#6a3a2a" opacity=".7"/>
      <polyline points="${road.join(' ')}" fill="none" stroke="#c9b48c" stroke-width="5"/><line x1="${sx(-40)}" y1="${sy(60)}" x2="${sx(40)}" y2="${sy(60)}" stroke="#5a3a26" stroke-width="3"/><circle cx="${sx(SK_WELL[0])}" cy="${sy(SK_WELL[1])}" r="4" fill="#8a8a84"/><text x="${sx(SK_WELL[0]) - 6}" y="${sy(SK_WELL[1]) + 14}" font-size="9" fill="#f3e8cf" text-anchor="middle">well</text>`; },
});
Object.assign(TOWN_BY.seki.keeper, { where: 'outside the Laughing Badger inn, by the gate', win: 'Mujina bows low. "The house loses. Your road is open." As he turns away, you see that his shadow has a tail. It slips off toward the hill where the moon is rising.' });
Object.assign(TOWN_BY.seki.a, { sub: 'Maid at the Maple Inn', wait: 'Hanzo sits rolling dice on a red mat, south-west of the road.' });
Object.assign(TOWN_BY.seki.b, { ask: 'Someone, or something, stole three sake cups from the shrine and dropped them around town. Mind you: a tanuki can make a leaf look like anything.' });
Object.assign(TOWN_BY.seki.myth, { after: true, line: 'On the moon-viewing hill, the innkeeper is drumming his round belly at the moon. He was never an innkeeper at all.', tip: 'It vanishes in a puff of leaves and strikes from a new spot. Watch for the red ring and hold BLOCK!' });
TOWN_BY.seki.note[1] += ' Tanuki are real animals, a kind of wild dog that looks a little like a raccoon. In Japanese folk tales they are cheerful tricksters who change shape, drum on their bellies and pay for sake with leaves that look like coins. Stone tanuki statues still stand outside inns and restaurants for luck.';
