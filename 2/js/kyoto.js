'use strict';
/* ===== Kyoto: Sanjo Bridge and the lantern festival =====
   The end of the road. You cross Sanjo Bridge into a dark, snowy capital: the masked duelist has smashed the
   festival lanterns. Stop him, relight the five great lanterns, and the city comes alive, with every friend
   you spared along the Tokaido waiting on the avenue. Then the Shogun's Shadow has nowhere left to hide. */

const KY_PAG = [38, 8], KY_TEMPLE = [-38, 32], KY_ALLEY = [23, -35], KY_BANK = [HR(-59) + 13, -50.5];
const KY_LAN = [[HR(-44) + 5, -44, 'Sanjo'], [-27, 0, 'the west market'], [27, -1, 'the east market'], [KY_PAG[0] - 8, KY_PAG[1] - 6, 'the pagoda'], [HR(44) - 5, 44, 'the palace avenue']];
const KY_LAY = {
  ema: [[HR(-59) - 1.6, -59], [KY_PAG[0] + 1, KY_PAG[1] - 7.5], [KY_TEMPLE[0] + 7, KY_TEMPLE[1] - 6]], emaCol: '#ffffff', emaGeo: () => GEO.cone(.3, .3, 4), emaHint: ' They are white paper cranes. The first is on Sanjo Bridge.',
  chest: [[KY_PAG[0] + 7.5, KY_PAG[1] + 3], [KY_TEMPLE[0] - 6, KY_TEMPLE[1] + 4]],
  chestHint: ['In a chest behind the five-story pagoda, east of the avenue', 'In a chest in the temple garden, north-west of the avenue'],
  flats: [[KY_PAG[0], KY_PAG[1], 10, 2.2], [KY_TEMPLE[0], KY_TEMPLE[1], 10, .8], [KY_ALLEY[0], KY_ALLEY[1], 4, .35], [HR(57), 57, 8, .4]],
  pos: {
    guard: [HR(GATE_Z) - 2.6, GATE_Z - 2.6, Math.PI], keeper: [HR(55), 54, Math.PI],
    a: [HR(-34) - 6.6, -34, Math.PI / 2], friendA: [HR(-28) - 6.6, -28, Math.PI / 2], smith: [HR(-14) + 7.2, -14, -Math.PI / 2],
    b: [-17, -19, .6], foe: [KY_ALLEY[0], KY_ALLEY[1], -1], myth: KY_BANK,
  },
};
function kyotoH(x, z, mesh) {
  const rd = Math.abs(x - HR(z));
  let h = Math.max(.25, .4 + (fbm(x * .05 + 83, z * .05 + 1) - .5) * .5);
  h += smooth(52, 88, x) * 12 * (.7 + .5 * fbm(x * .035 + 1, z * .035 + 83)) + smooth(-66, -92, x) * 8;
  const edge = Math.max(-z - 86, 0); h += Math.min(edge * edge * .1, 5);
  h = lerp(h, .3, 1 - smooth(4, 8, rd));
  for (const f of KY_LAY.flats) { const d = Math.hypot(x - f[0], z - f[1]); if (d < f[2] + 5) h = lerp(f[3], h, smooth(f[2], f[2] + 5, d)); }
  const rv = smooth(-49, -51.5, z) * (1 - smooth(-66.5, -69, z)); // the Kamo River
  if (rv > 0) { h = lerp(h, lerp(-1.3, -.05, smooth(-55.5, -51, z)), rv); if (!mesh && Math.abs(x - HR(z)) < 3.1) h = .8; }
  if (z > 61) h = .35;
  return h;
}
const _yc = [new COL('#b8b4aa'), new COL('#f4f6fa'), new COL('#a89a82')];
function kyotoTint(x, z, h, t) {
  if (z < -48 && z > -70) t.lerp(_yc[0], .8);
  for (const zz of [-30, 0, 30]) if (Math.abs(x) < 46) t.lerp(_yc[2], (1 - smooth(1.6, 2.8, Math.abs(z - zz))) * .8);
  if (z > 61) t.copy(_yc[1]);
}
function pagodaMesh() {
  const parts = [P(GEO.box(7, .6, 7), '#8a8a84', [0, .3, 0])];
  for (let i = 0; i < 5; i++) { const w = 4.6 - i * .55, y = .6 + i * 2.5; parts.push(P(GEO.box(w, 1.7, w), '#b8322a', [0, y + .85, 0]), P(GEO.box(w + .1, .16, w + .1), '#f4efe4', [0, y + 1.1, 0]), P(GEO.cone(1, 1, 4), '#33363e', [0, y + 2.15, 0], [0, Math.PI / 4, 0], [(w + 2.6) * .72, .9, (w + 2.6) * .72]), P(GEO.cone(1, 1, 4), '#f4f8ff', [0, y + 2.3, 0], [0, Math.PI / 4, 0], [(w + 1.2) * .72, .6, (w + 1.2) * .72])); }
  parts.push(P(GEO.cyl(.08, .12, 3, 6), '#c9a35a', [0, 15, 0]), P(GEO.sph(.22, 8, 6), '#c9a35a', [0, 16.5, 0]));
  return new THREE.Mesh(merge(parts), toon({ vertexColors: true, flatShading: true }));
}
function greatLanternGeo() { return merge([P(GEO.box(1.2, .4, 1.2), '#6a6a66', [0, .2, 0]), P(GEO.cyl(.14, .18, 2, 6), '#3a2416', [0, 1.4, 0]), P(GEO.box(1.1, .12, 1.1), '#3a2416', [0, 2.45, 0]), P(GEO.cone(1, 1, 4), '#33363e', [0, 4.25, 0], [0, Math.PI / 4, 0], [1.1, .6, 1.1]), P(GEO.cone(1, 1, 4), '#f4f8ff', [0, 4.42, 0], [0, Math.PI / 4, 0], [.7, .4, .7])]); }
function kyFirework(p) { const col = pick(['#ff6a9a', '#ffd84a', '#7ad8ff', '#b88aff', '#7affb0']); FX.glowBurst(p, col, 12, .45); FX.sparks(p, col, 90, 16, .42); setTimeout(() => FX.sparks(p, '#ffffff', 26, 9, .3), 120); sfx.taiko && sfx.taiko(.5); }

function kyotoDecor(W, c) {
  const rr = mulberry(1301), dark = '#3a2416', E = Math.PI / 2, J = S.town, flat = toon({ vertexColors: true, flatShading: true });
  J.lit = J.lit || [];
  const onFlat = (x, z, pad) => KY_LAY.flats.some(f => Math.hypot(x - f[0], z - f[1]) < f[2] + pad) || KY_LAY.ema.concat(KY_LAY.chest, KY_LAN).some(f => Math.hypot(x - f[0], z - f[1]) < 3.5);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 22), new THREE.MeshBasicMaterial({ color: '#4a6a8a', transparent: true, opacity: .88 })); water.rotation.x = -Math.PI / 2; water.position.set(0, -.3, -59.5); W.scene.add(water); W.water = water; W.waterCol = '#4a6a8a';
  addMountains(W, { base: '#3e5078', top: '#7088b0', snow: '#f4f8ff', snowLine: .4, r0: 150, r1: 250, h0: 26, h1: 66, a0: -3.14, a1: 3.14, n: 30, seed: 85 });
  // Sanjo Bridge
  { const br = new THREE.Mesh(otsuRails(19, 6.4, '#5a3a26'), flat), x0 = HR(-68), x1 = HR(-50); br.position.set((x0 + x1) / 2, .68, -59); br.rotation.y = Math.atan2(x1 - x0, 18); br.castShadow = true; br.receiveShadow = true; W.scene.add(br); }
  // the city: an avenue and three cross streets of town houses
  const taken = []; let k = 0;
  const hs = k => ({ roof: ['#33363e', '#3a3a42', '#2e3038'][k % 3], cap: '#f4f8ff', wall: ['#e8dcc0', '#dccfae', '#efe6d0'][k % 3], h: k % 3 === 1 ? 4.4 : 2.8, rh: 1.5, win: '#ffcf86' });
  for (let z = -44; z <= 46; z += 10) for (const sd of [-1, 1]) { k++; if ([-30, 0, 30].some(q => Math.abs(z - q) < 4.5)) continue; const x = HR(z) + sd * 12, smith = sd > 0 && Math.abs(z + 14) < 5; townHouse(W, c, x, z, sd > 0 ? -E : E, 7.5, 6, smith ? { roof: '#33302e', cap: '#f4f8ff', wall: '#d8c8a8', win: '#ffb86a' } : hs(k)); taken.push([x, z]); }
  for (const zz of [-30, 0, 30]) for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) for (const ns of [-1, 1]) { k++; const x = sd * (20 + i * 9.5), z = zz + ns * 7.4; if (onFlat(x, z, 4) || zz === 30 && sd < 0 && i > 0 || zz === 0 && sd > 0 && i > 1 && ns > 0) continue; townHouse(W, c, x, z, ns > 0 ? Math.PI : 0, 7.5, 6, hs(k)); taken.push([x, z]); }
  const nearHouse = (x, z, r) => taken.some(([a, b]) => Math.hypot(x - a, z - b) < r);
  // the pagoda and the temple
  { const p = pagodaMesh(); p.position.set(KY_PAG[0], townH(KY_PAG[0], KY_PAG[1]), KY_PAG[1]); p.castShadow = true; W.scene.add(p); for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 0]]) obs(W, KY_PAG[0] + a * 1.6, KY_PAG[1] + b * 1.6, 1.7);
    townHouse(W, c, KY_TEMPLE[0] - 1, KY_TEMPLE[1] + 1, E, 11, 8, { roof: '#33363e', cap: '#f4f8ff', wall: '#e8dcc0', h: 3.6, rh: 3.2, win: '#ffd98a' }); taken.push([KY_TEMPLE[0] - 1, KY_TEMPLE[1] + 1]);
    const tor = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); tor.position.set(KY_TEMPLE[0] + 10, townH(KY_TEMPLE[0] + 10, KY_TEMPLE[1] - 3), KY_TEMPLE[1] - 3); tor.rotation.y = E; tor.scale.setScalar(1.3); tor.castShadow = true; W.scene.add(tor); }
  // the palace wall and its gate
  townGate(W, c, '#f4f8ff');
  { const gx = HR(GATE_Z), wall = []; for (let x = -92; x <= 92; x += 4) { if (Math.abs(x - gx) < 5.4) continue; wall.push({ p: [x, 0, GATE_Z] }); }
    W.scene.add(inst(merge([P(GEO.box(4.02, 3.4, .8), '#f4f0e6', [0, 1.9, 0]), P(GEO.box(4.02, .5, 1), '#8a8a84', [0, .25, 0]), P(GEO.box(4.02, .12, .84), '#c9a35a', [0, 2.9, 0]), P(GEO.box(4.1, .3, 1.7), '#33363e', [0, 3.75, 0]), P(GEO.box(4.1, .2, 1.1), '#f4f8ff', [0, 3.98, 0])]), flat, wall, true));
    const g2 = new THREE.Mesh(merge([P(GEO.box(1, 6.4, 1), '#c4302a', [-4.4, 3.2, 0]), P(GEO.box(1, 6.4, 1), '#c4302a', [4.4, 3.2, 0]), P(GEO.cone(1, 1, 4), '#33363e', [0, 7.6, 0], [0, Math.PI / 4, 0], [8.6, 1.8, 3.2]), P(GEO.cone(1, 1, 4), '#f4f8ff', [0, 7.95, 0], [0, Math.PI / 4, 0], [6, 1.1, 2.2]), P(GEO.cyl(.6, .6, .1, 16), '#c9a35a', [0, 5.9, .4], [1.57, 0, 0])]), flat); g2.position.set(gx, .3, GATE_Z); g2.castShadow = true; W.scene.add(g2); obs(W, gx - 4.4, GATE_Z, .8); obs(W, gx + 4.4, GATE_Z, .8);
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(blackPineGeo(), flat); p.position.set(gx + sd * 14, .3, GATE_Z + 9); p.scale.setScalar(1.3); W.scene.add(p); } }
  // snowy pines and bare cherry trees
  const pine = merge([P(GEO.cyl(.12, .2, 1.4, 6), '#4a3428', [0, .7, 0]), P(GEO.cone(1.6, 2.2, 8), c.tree[0], [0, 2.2, 0]), P(GEO.cone(1.45, .5, 8), c.tree[3], [0, 2.95, 0]), P(GEO.cone(1.25, 1.9, 8), c.tree[1], [0, 3.5, 0]), P(GEO.cone(1.1, .45, 8), c.tree[3], [0, 4.15, 0]), P(GEO.cone(.85, 1.6, 8), c.tree[2], [0, 4.7, 0]), P(GEO.cone(.55, .5, 8), c.tree[3], [0, 5.35, 0])]), pines = [];
  for (let i = 0; i < 1400 && pines.length < 240; i++) { const x = (rr() * 2 - 1) * 104, z = -48 + rr() * 150, h = townH(x, z); if (z > 56 || Math.abs(x - HR(z)) < 9 || h > 24 || onFlat(x, z, 2.5) || nearHouse(x, z, 6.5) || [-30, 0, 30].some(q => Math.abs(z - q) < 3.4 && Math.abs(x) < 48) || (Math.abs(x) < 50 && rr() < .7)) continue; const s = 1 + rr() * 1.2; pines.push({ p: [x, h - .1, z], r: [0, rr() * 6, 0], s }); if (Math.abs(x) < TOWN_R) obs(W, x, z, .5 * s); }
  for (let i = 0; i < 26; i++) { const x = (rr() * 2 - 1) * 90, z = -78 - rr() * 14; if (Math.abs(x - HR(z)) > 7) pines.push({ p: [x, townH(x, z) - .1, z], r: [0, rr() * 6, 0], s: 1.2 + rr() }); }
  W.scene.add(inst(pine, windify(flat.clone(), .02), pines, true));
  { const drift = []; for (let i = 0; i < 160; i++) { const x = (rr() * 2 - 1) * 60, z = -46 + rr() * 104, h = townH(x, z); if (Math.abs(x - HR(z)) < 5 || nearHouse(x, z, 4.6) || onFlat(x, z, 0)) continue; const q = rr(); drift.push({ p: [x, h - .05, z], s: [.6 + q * 1.4, .25 + q * .4, .6 + q * 1.2] }); } W.scene.add(inst(GEO.sph(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: '#f2f7fd' }), drift, false)); }
  // festival lanterns, district by district: dark until their great lantern is lit
  const where = [[], [], [], [], []];
  for (let z = -48; z <= 56; z += 3.6) for (const sd of [-1, 1]) where[z < -15 ? 0 : z < 20 ? 3 : 4].push([HR(z) + sd * 4.4, 2.5 + Math.sin(z) * .2, z]);
  for (const zz of [-30, 0, 30]) for (let x = 8; x <= 46; x += 3.6) for (const ns of [-1, 1]) { where[1].push([-x, 2.5 + Math.sin(x) * .2, zz + ns * 3.2]); where[2].push([x, 2.5 + Math.sin(x) * .2, zz + ns * 3.2]); }
  for (let i = 0; i < 10; i++) where[3].push([KY_PAG[0] + Math.cos(i * .63) * 6.5, townH(KY_PAG[0], KY_PAG[1]) + 2.3, KY_PAG[1] + Math.sin(i * .63) * 6.5]);
  const strings = where.map(list => { const m = inst(GEO.sph(.24, 7, 6), new THREE.MeshBasicMaterial({ color: '#3a2a26', fog: false }), list.map(p => ({ p: [p[0], townH(p[0], p[2]) + p[1], p[2]] })), false); W.scene.add(m); m.k = 0; return m; });
  const great = KY_LAN.map(([x, z], i) => { const y = townH(x, z), m = new THREE.Mesh(greatLanternGeo(), flat); m.position.set(x, y, z); m.castShadow = true; W.scene.add(m); obs(W, x, z, .7);
    const l = new THREE.Mesh(GEO.box(.9, 1.2, .9), new THREE.MeshBasicMaterial({ color: '#2a2220', fog: false })); l.position.set(x, y + 3.2, z); W.scene.add(l); const h = halo('#ffb860', 7, 0); h.position.copy(l.position); W.scene.add(h); return { l, h }; });
  const _a = new COL('#3a2a26'), _b = new COL('#ffb060'), _r = new COL('#ff6a4a');
  W.fw = 0; let fwT = 0;
  W.tick = (dt, T) => {
    strings.forEach((m, i) => { const on = J.lit.includes(i) ? 1 : 0; m.k = lerp(m.k, on, damp(1.5, dt)); m.material.color.copy(_a).lerp(i % 2 ? _r : _b, m.k); if (m.k > .5) glowify(m); });
    great.forEach((g, i) => { const on = J.lit.includes(i); g.l.material.color.set(on ? '#ffc070' : '#2a2220'); g.h.material.opacity = on ? .75 : 0; if (on) glowify(g.l); });
    if (W.fw > 0) { W.fw -= dt; fwT -= dt; if (fwT <= 0) { fwT = .45 + Math.random() * .5; kyFirework(new V3(T.pos.x + rnd(-40, 40), rnd(26, 42), T.pos.z + rnd(20, 60))); } }
  };
  W.post = () => { const n = J.lit.length; if (n) { W.hemi.intensity += n * .035; W.scene.fog.color.lerp(_b, n * .02); W.scene.background.copy(W.scene.fog.color); } };
}
function kyotoPeople(T, npc) {
  const J = S.town, W = T.W;
  KY_LAN.forEach(([x, z, nm2], i) => {
    T.pois.push({ id: 'lan' + i, kind: 'spot', x: x + 1.2, z: z + .4, r: 3, map: J.lit.includes(i) ? null : 'Great lantern', col: '#ffb860',
      get label() { return J.lit.includes(i) ? 'The great lantern burns' : 'Light the great lantern'; },
      act: () => {
        if (J.lit.includes(i)) return;
        if (J.jobs.a !== 2) return townSay('A smashed lantern', `Its paper is torn and its candle is out. ${J.jobs.a ? 'The masked duelist will only smash it again. Stop Hannya first.' : 'Lantern Maker Akari, south on the avenue, will know who did this.'}`);
        J.lit.push(i); save(); sfx.win && sfx.win(); FX.sparks(new V3(x, townH(x, z) + 3.2, z), '#ffd08a', 60, 6); T.near = null;
        if (J.lit.length >= 5) { banner('The festival lives!', 'Ten thousand lanterns burn across Kyoto'); W.fw = 9; virtue('chugi', 1, 'you relit the festival'); }
        else banner('Lit!', `The lanterns of ${nm2} burn again: ${J.lit.length} of 5`);
      } });
  });
  // every friend you spared on the road has come to see the festival
  const list = allies().filter(id => { const [t, r] = id.split(':'), c = TOWN_BY[t]; return c && t !== 'kyoto' && !(r === 'myth' && c.myth.dragon); }).slice(0, 14);
  list.forEach((id, i) => {
    const [t, r] = id.split(':'), c = TOWN_BY[t], D = r === 'a' ? c.a.foe : r === 'keeper' ? c.keeper : c.myth, sd = i % 2 ? 1 : -1, z = 20 + Math.floor(i / 2) * 4.6, x = HR(z) + sd * 6;
    const p = townNPC('ally' + i, x, z, D.look, r === 'myth' && D.weapon === 'club' ? 'ogre' : D.sword, D.n, 'Friend from ' + c.n, { ry: -sd * Math.PI / 2, scale: r === 'myth' ? Math.min(D.scale || 1, 1.3) : 1, col: '#9ff0c8' });
    p.label = 'Talk to ' + D.n; p.r = 2.6;
    p.act = () => townSay(D.n, [`You sheathed your blade at ${c.n}. I have walked the whole road since, to stand here tonight.`, `From ${c.n} to Kyoto, to watch you carry that letter home. Finish it.`, `Mercy at ${c.n}. I did not understand it then. I do now.`][i % 3] + '<br><span class="muted">Friends you spared fill your Spirit at the start of every duel.</span>');
  });
}

/* Kyoto's duels: a lantern alley, the river bank under Sanjo Bridge, and the snow before the palace gate */
function kyotoArena(role) {
  const W = newWorld('kyoto-duel'), gate = role === 'keeper', river = role === 'myth', flat = toon({ vertexColors: true, flatShading: true }), lit = (S.town.lit || []).length;
  addSky(W, { top: '#060a1e', mid: '#1a2a55', bot: '#3a466a', sunDir: new V3(-.35, .42, 1), sunCol: '#e8f2ff', sunDeg: 3, fog: lit >= 5 ? '#3a3448' : '#1e2848', fogNear: 18, fogFar: 120, stars: true, haze: .3 });
  addLights(W, { sky: '#b8c8ff', ground: '#4a4a6a', hemi: .8 + lit * .03, key: '#dfe6ff', keyI: .75, keyDir: new V3(-.4, 1, .6), rim: gate || lit >= 5 ? '#ffb060' : '#7fb0ff', rimI: 1, rimDir: new V3(.2, .6, 1) });
  addGround(W, { a: '#e9f1fa', b: '#cddcef', c: '#9aa8c6', clear: 60, hill: 0, flat: true, pattern: river ? (x, z, t) => { if (z > 9) t.lerp(new COL('#4a6a8a'), smooth(9, 11, z)); else t.lerp(new COL('#b8b4aa'), .5); } : null });
  addMountains(W, { base: '#3e5078', top: '#7088b0', snow: '#f4f8ff', snowLine: .4, r0: 150, r1: 240, h0: 24, h1: 60, a0: -3.14, a1: 3.14, n: 24, seed: 87 });
  const lan = (list, col) => W.scene.add(inst(GEO.sph(.22, 7, 6), glowify(new THREE.MeshBasicMaterial({ color: col, fog: false })), list.map(p => ({ p })), false));
  if (gate) {
    const wall = []; for (let x = -60; x <= 60; x += 4) if (Math.abs(x) > 5) wall.push({ p: [x, 0, 16] });
    W.scene.add(inst(merge([P(GEO.box(4.02, 3.4, .8), '#f4f0e6', [0, 1.9, 0]), P(GEO.box(4.02, .5, 1), '#8a8a84', [0, .25, 0]), P(GEO.box(4.1, .3, 1.7), '#33363e', [0, 3.75, 0]), P(GEO.box(4.1, .2, 1.1), '#f4f8ff', [0, 3.98, 0])]), flat, wall, true));
    W.scene.add(new THREE.Mesh(merge([P(GEO.box(1, 6.4, 1), '#c4302a', [-4.4, 3.2, 16]), P(GEO.box(1, 6.4, 1), '#c4302a', [4.4, 3.2, 16]), P(GEO.box(8, 5, .3), '#4a2e1c', [0, 2.5, 16]), P(GEO.cone(1, 1, 4), '#33363e', [0, 7.6, 16], [0, Math.PI / 4, 0], [8.6, 1.8, 3.2]), P(GEO.cone(1, 1, 4), '#f4f8ff', [0, 7.95, 16], [0, Math.PI / 4, 0], [6, 1.1, 2.2]), P(GEO.cyl(.6, .6, .1, 16), '#c9a35a', [0, 5.9, 15.6], [1.57, 0, 0])]), flat));
    const l = []; for (let i = 0; i < 14; i++) for (const sd of [-1, 1]) l.push([sd * 6.6, 2.5 + Math.sin(i) * .2, -8 + i * 1.7]); lan(l, '#ffb060'); addLanterns(W, [[-4, 9], [4, 9]], '#7a8496', '#ffb860');
  } else if (river) {
    const br = new THREE.Mesh(otsuRails(60, 6.4, '#5a3a26'), flat); br.position.set(0, 4.6, 15); br.rotation.y = Math.PI / 2; W.scene.add(br);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), new THREE.MeshBasicMaterial({ color: '#2a3f5c', transparent: true, opacity: .9 })); water.rotation.x = -Math.PI / 2; water.position.set(0, .05, 161); W.scene.add(water);
    const rock = merge([P(GEO.dodec(1), '#8a8a84', [0, 0, 0], null, null, (x, y) => new COL(y > .3 ? '#f4f8ff' : '#74746e'))]); W.scene.add(inst(rock, flat, scatter(40, 5.6, 14, 97, (x, z) => laneClear(x, z) || z > 9).map(([x, z, k]) => ({ p: [x, .1, z], r: [k * 3, k * 5, 0], s: [.3 + k * .7, .25 + k * .4, .3 + k * .6] })), true));
  } else {
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(merge([P(GEO.box(6, 3, 7), ['#e8dcc0', '#dccfae'][i % 2], [0, 1.5, 0]), P(GEO.cone(1, 1, 4), '#33363e', [0, 3.8, 0], [0, Math.PI / 4, 0], [5.2, 1.5, 6]), P(GEO.cone(1, 1, 4), '#f4f8ff', [0, 4.05, 0], [0, Math.PI / 4, 0], [3.4, 1, 4]), P(GEO.box(.1, 1, 1.4), '#ffcf86', [-sd * 3.02, 1.6, 1])]), flat); m.position.set(sd * 9.5, 0, -6 + i * 8); m.castShadow = true; W.scene.add(m); }
    const l = []; for (let i = 0; i < 14; i++) for (const sd of [-1, 1]) l.push([sd * 6.2, 2.5 + Math.sin(i) * .2, -8 + i * 1.9]); lan(l, lit ? '#ffb060' : '#4a3a36');
  }
  W.ambient.push(new Ambient({ n: 1200, tex: TEX.flake, color: '#ffffff', color2: '#cfe6ff', size: .055, alpha: .9, cx: 0, cy: 5, cz: 3, ax: 16, ay: 7, az: 16, sway: .8, vel: r => [.4 + r() * .4, -.9 - r() * .5, -.1 + r() * .3], seed: 5 }));
  if (gate && lit >= 5) { let t0 = 2; W.updaters.push((dt, t) => { if (t > t0) { t0 = t + 1.2 + Math.random() * 1.8; kyFirework(new V3(rnd(-45, 45), rnd(30, 46), rnd(70, 120))); } }); }
  addClouds(W, { color: '#3a4470', n: 10, opacity: .5, y0: 50 });
  return W;
}

Object.assign(TOWN_BY.kyoto, {
  flip: 1, fuji: null, day: .7, cloud: '#3a4470', pal: ['#eef3fa', '#8a9a8a', '#8a8680', '#b8b4b0'], snow: .9, lay: KY_LAY, h: kyotoH, hMesh: (x, z) => kyotoH(x, z, true), tint: kyotoTint, decor: kyotoDecor, arena: kyotoArena, people: kyotoPeople,
  roadK: (x, z) => 1 - smooth(-50, -51.5, z) * (1 - smooth(-67, -68.5, z)),
  gate: { map: 'Palace gate', guard: 'Palace Guard', place: 'palace gate', verb: 'through', halt: 'Halt, in the name of the Emperor. This is the gate of the Imperial Palace, and a shadow has stood before it for three nights. What is your business in Kyoto?' },
  mapBg: (sx, sy) => { const road = []; for (let z = -90; z <= 60; z += 6) road.push(`${sx(HR(z))},${sy(z)}`);
    return `<rect x="0" y="${sy(-51)}" width="320" height="${sy(-67) - sy(-51)}" fill="#3f5f80"/><rect x="0" y="0" width="320" height="${sy(60)}" fill="#e8e4da" opacity=".5"/>
      ${[-30, 0, 30].map(z => `<line x1="${sx(-46)}" y1="${sy(z)}" x2="${sx(46)}" y2="${sy(z)}" stroke="#a89a82" stroke-width="3"/>`).join('')}<polyline points="${road.join(' ')}" fill="none" stroke="#c9b48c" stroke-width="5"/>
      <line x1="0" y1="${sy(60)}" x2="320" y2="${sy(60)}" stroke="#f4f0e6" stroke-width="4"/><rect x="${sx(KY_PAG[0]) - 5}" y="${sy(KY_PAG[1]) - 5}" width="10" height="10" fill="#b8322a"/><text x="${sx(KY_PAG[0]) + 8}" y="${sy(KY_PAG[1]) + 3}" font-size="8" fill="#f3e8cf">pagoda</text><text x="6" y="${sy(-56)}" font-size="9" fill="#cfe6ee">Kamo River</text><text x="160" y="${sy(72)}" font-size="9" fill="#3a2a1e" text-anchor="middle">Imperial Palace</text>`; },
});
Object.assign(TOWN_BY.kyoto.keeper, { where: 'before the palace gate', also: () => (S.town.lit || []).length >= 5,
  alsoAt: () => TOWN && TOWN.pois.filter(q => q.id.startsWith('lan') && !S.town.lit.includes(+q.id.slice(3))).sort((x, y) => Math.hypot(x.x - TOWN.pos.x, x.z - TOWN.pos.z) - Math.hypot(y.x - TOWN.pos.x, y.z - TOWN.pos.z))[0],
  first: 'A shadow stands before this gate and will not fight where it cannot hide. The festival lanterns are smashed and the city is dark. Lantern Maker Akari, south on the avenue, can tell you more.',
  ask: 'So. Every lantern burns, and the whole road stands behind you. The Eternal Shogun is gone, but I remain. That letter ends his war forever. You will not carry it one step further.' });
Object.defineProperty(TOWN_BY.kyoto.keeper, 'alsoMsg', { get() { return `The Shogun's Shadow will not fight where it cannot hide. Relight the five great lanterns of the festival (${(S.town.lit || []).length}/5) and it will have nowhere left.`; } });
Object.assign(TOWN_BY.kyoto.a, { sub: 'Lantern maker', ask: 'A masked duelist smashed the five great lanterns so the festival would fail. Stop him, then relight them: a great lantern lights every lantern on its street. And these sleeves are yours.', wait: 'The masked duelist lurks in an alley east of the avenue.', thanks: 'Now light the five great lanterns. Each one wakes a whole street.' });
Object.assign(TOWN_BY.kyoto.b, { sub: 'A traveler in a deep hood', ask: 'You came! I rode ahead in secret to be sure the palace would open its gate. I left three paper cranes as signs for you: one on Sanjo Bridge, one by the pagoda, one at the temple. Find them, so I know it is truly you.' });
TOWN_BY.kyoto.myth.line = 'Under Sanjo Bridge, eight pairs of eyes open in the dark water. The serpent you met in the first legend has followed you to the end of the road.';
TOWN_BY.kyoto.note[1] += ' The streets of Kyoto were laid out in a neat grid more than a thousand years ago, copied from the great Chinese capital of the time. The Kamo River runs down its east side, and tall pagodas marked its temples from far away.';
