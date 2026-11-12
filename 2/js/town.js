'use strict';
/* ===== Katana Legend II · Hakone: an open town on the Tokaido road =====
   x runs east, z runs north. The road climbs north to the checkpoint; Lake Ashi lies to the west. */

let TOWN = null;
const TOWN_R = 92, GATE_Z = 60;
function townRoadX(z) { return Math.sin(z * .045) * 7 + Math.sin(z * .017 + 1) * 4; }
const ROAD_OPEN = 7; // how many towns are finished and open to play; the rest are being built one at a time
let TCFG = null;
function townCfg() { return TOWNS[S.cur] || TOWNS[0]; }
function townH(x, z) {
  const c = TCFG || TOWNS[0]; if (c.h) return c.h(x, z);
  const X = x * c.flip, rd = Math.abs(x - townRoadX(z));
  let h = (fbm(x * .05 + 3 + c.seed, z * .05 + c.seed) - .45) * 2.2;
  h += smooth(22, 80, X) * 13 * (.25 + .75 * c.mtn) * (.7 + .6 * fbm(x * .03 + c.seed, z * .03 + 9));
  if (c.water) h -= smooth(-38, -56, X) * 3.2;
  const edge = Math.max(Math.abs(z) - 78, X - 80, c.water ? 0 : -X - 80, 0); h += edge * edge * .12;
  h = lerp(h, Math.min(h, .15 + smooth(30, 70, X) * 2), 1 - smooth(2.6, 7, rd));
  for (const f of tl().flats) { const d = Math.hypot(X - f[0], z - f[1]); if (d < f[2] + 5) h = lerp(f[3], h, smooth(f[2], f[2] + 5, d)); }
  return h;
}
const TOWN_SPOTS = { ema: [[-31, 31], [14, -52], [49, -4]], chest: [[-9, 51], [57, 31]] };
const TOWN_FLATS = [[-14, 6, 7, .2], [17, 13, 7, .5], [15, -12, 7, .3], [42, 20, 8, 5], [62, 50, 10, 8], [-36, -30, 8, .1], [0, 56, 12, .4], [0, -72, 9, .2]];
/* a town may bring its own layout (lay), terrain (h), ground tint and scenery (decor); Hakone's is the default */
const LAY0 = { ema: TOWN_SPOTS.ema, chest: TOWN_SPOTS.chest, flats: TOWN_FLATS, pos: {}, chestHint: ['In a chest by the palisade, near the gate', 'In a chest up on the hill path'] };
function tl() { return (TCFG || townCfg()).lay || LAY0; }
function windify(mat, amp) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = TOWN_WIND; sh.uniforms.uAmp = { value: amp };
    sh.vertexShader = 'uniform float uTime; uniform float uAmp;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n#ifdef USE_INSTANCING\n vec4 wp = instanceMatrix * vec4(position, 1.0);\n#else\n vec4 wp = vec4(position, 1.0);\n#endif\n float wy = max(0.0, position.y); float g = sin(uTime * .7 + wp.x * .05) * .5 + .8;\n transformed.x += sin(uTime * 1.7 + wp.x * .33 + wp.z * .27) * wy * uAmp * g;\n transformed.z += cos(uTime * 1.3 + wp.x * .21 - wp.z * .3) * wy * uAmp * .6 * g;');
  };
  mat.customProgramCacheKey = () => 'wind' + amp;
  return mat;
}
const TOWN_WIND = { value: 0 };

function townGround(W, c) {
  const hm = c.hMesh || townH;
  const seg = 150, size = 230, g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), tmp = new COL();
  const cSnow = new COL(c.pal[0]), cGrass = new COL(c.pal[1]), cDirt = new COL(c.pal[2]), cRoad = new COL(c.pal[3]), cRock = new COL('#5d6470'), cShore = new COL('#cfc4a4');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = hm(x, z); pos.setY(i, h);
    const n = fbm(x * .13 + 5, z * .13), rd = Math.abs(x - townRoadX(z));
    tmp.copy(cGrass).lerp(cDirt, smooth(.35, .7, n)).lerp(cSnow, (smooth(.42, .62, fbm(x * .07, z * .07 + 4)) * .85 + smooth(4, 12, h) * .5) * c.snow);
    tmp.lerp(cRock, smooth(14, 22, h) * .8).lerp(cSnow, smooth(22, 30, h) * Math.max(.3, c.snow));
    if (h < .1) tmp.lerp(cShore, smooth(.1, -.5, h));
    if (c.tint) c.tint(x, z, h, tmp);
    tmp.lerp(cRoad, (1 - smooth(1.9, 3.1, rd)) * (.85 + .15 * hash2(Math.round(x * 2), Math.round(z * 2))) * (c.roadK ? c.roadK(x, z) : 1));
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, toon({ vertexColors: true })); ground.receiveShadow = true; W.scene.add(ground);
}
function buildTown(c) {
  TCFG = c; const W = newWorld(c.id);
  addSky(W, { top: '#16335c', mid: '#7fa3c4', bot: '#dfe6ea', sunDir: new V3(-.5, .35, .2), sunCol: '#fff2dc', sunDeg: 3.5, fog: '#b9c9dc', fogNear: 30, fogFar: 170, stars: true, haze: .5 });
  addLights(W, { sky: '#dbe8ff', ground: '#5a5a6a', hemi: .75, key: '#fff0dc', keyI: .85, keyDir: new V3(-.5, 1, .35), rim: '#9fd0ff', rimI: .7, rimDir: new V3(.4, .5, -1) });
  { const sc = W.key.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.far = 90; sc.updateProjectionMatrix(); }
  W.hAt = townH; W.glows = []; W.water = null;
  townGround(W, c);
  (c.decor || townDecor0)(W, c);
  // what drifts in the air: snow, petals, leaves
  const air = { snow: ['#ffffff', '#cfe6ff', TEX.flake, 1400, -.9], petal: ['#ffc2da', '#ffe0ec', TEX.petal, 500, -.45], leaf: ['#e8862a', '#c8442a', TEX.petal, 420, -.5], none: ['#fff6d8', '#ffe8b0', TEX.flake, 120, -.1] }[c.amb] || null;
  const snowA = new Ambient({ n: air[3], tex: air[2], color: air[0], color2: air[1], size: c.amb === 'snow' ? .055 : .09, alpha: .9, cx: 0, cy: 6, cz: 0, ax: 22, ay: 8, az: 22, sway: .8, vel: r => [.4 + r() * .4, air[4] - r() * .5, -.1 + r() * .3] });
  W.ambient.push(snowA); W.snow = snowA;
  addClouds(W, { color: c.cloud || '#c9d6e6', n: 12, opacity: .6, y0: 60 });
  W.keep = false;
  return W;
}
function townHouse(W, c, x, z, ry, w, d, o) {
  o = o || {}; const y = townH(x, z), hh = o.h || 2.6;
  const m = new THREE.Mesh(merge([
    P(GEO.box(w, hh, d), o.wall || '#e8dcc0', [0, hh / 2, 0]), P(GEO.box(w + .1, .18, d + .1), '#3a2a1e', [0, hh, 0]), P(GEO.box(w + .1, .18, d + .1), '#3a2a1e', [0, .12, 0]),
    P(GEO.box(.16, hh, .16), '#3a2a1e', [w / 2, hh / 2, d / 2]), P(GEO.box(.16, hh, .16), '#3a2a1e', [-w / 2, hh / 2, d / 2]), P(GEO.box(.16, hh, .16), '#3a2a1e', [w / 2, hh / 2, -d / 2]), P(GEO.box(.16, hh, .16), '#3a2a1e', [-w / 2, hh / 2, -d / 2]),
    P(GEO.box(1.1, 1.9, .1), '#2a1d16', [0, .95, d / 2 + .02]), P(GEO.box(1.2, .9, .08), o.win || '#ffd98a', [w * .3, 1.5, d / 2 + .02]), P(GEO.box(1.2, .9, .08), o.win || '#ffd98a', [-w * .3, 1.5, d / 2 + .02]),
    P(GEO.cone(1, 1, 4), o.roof || '#4a3a30', [0, hh + (o.rh || 1.8) / 2, 0], [0, Math.PI / 4, 0], [w * .86, o.rh || 1.8, d * .86]), P(GEO.cone(1, 1, 4), o.cap || (c.snow > .3 ? '#f4f8ff' : '#b8a06a'), [0, hh + (o.rh || 1.8) * .83, 0], [0, Math.PI / 4, 0], [w * .5, (o.rh || 1.8) * .42, d * .5]),
  ]), toon({ vertexColors: true, flatShading: true }));
  m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; W.scene.add(m);
  const r = Math.max(w, d) * .5; for (let k = -1; k <= 1; k++) obs(W, x + Math.cos(ry) * k * w * .3, z - Math.sin(ry) * k * w * .3, r * .62);
  const hl = halo('#ffc978', 3.2, 0); hl.position.set(x + Math.sin(ry) * (d / 2 + .5), y + 1.6, z + Math.cos(ry) * (d / 2 + .5)); W.scene.add(hl); W.glows.push(hl);
}
function townGate(W, c, cap) {
  const gx = townRoadX(GATE_Z), gy = townH(gx, GATE_Z - .5);
  const gate = new THREE.Mesh(merge([P(GEO.box(.5, 5.2, .5), '#3a2416', [-3, 2.6, 0]), P(GEO.box(.5, 5.2, .5), '#3a2416', [3, 2.6, 0]), P(GEO.box(8.4, .5, .7), '#3a2416', [0, 4.6, 0]), P(GEO.box(9.6, .35, 1.6), '#5a3a26', [0, 5.3, 0]), P(GEO.box(8.8, .3, 1.2), cap || '#f4f8ff', [0, 5.6, 0])]), toon({ vertexColors: true, flatShading: true }));
  gate.position.set(gx, gy, GATE_Z); gate.castShadow = true; W.scene.add(gate); obs(W, gx - 3, GATE_Z, .5); obs(W, gx + 3, GATE_Z, .5);
  const doors = new THREE.Mesh(merge([P(GEO.box(2.7, 3.6, .2), '#4a2e1c', [-1.4, 1.8, 0]), P(GEO.box(2.7, 3.6, .2), '#4a2e1c', [1.4, 1.8, 0]), P(GEO.box(5.6, .2, .26), '#1c1410', [0, 2.6, 0]), P(GEO.box(5.6, .2, .26), '#1c1410', [0, 1, 0])]), toon({ vertexColors: true }));
  doors.position.set(gx, gy, GATE_Z); W.scene.add(doors); W.doors = doors;
}
function townDecor0(W, c) {
  const fl = c.flip;
  // water on one side, and sometimes Fuji
  if (c.water) { const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshBasicMaterial({ color: '#4f86a8', transparent: true, opacity: .86 })); water.rotation.x = -Math.PI / 2; water.position.set(-300 * fl, -.75, 0); W.scene.add(water); W.water = water;
    const tor = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); tor.position.set(-56 * fl, -.8, 12); tor.rotation.y = Math.PI / 2; tor.scale.setScalar(1.5); tor.castShadow = true; W.scene.add(tor); }
  if (c.fuji) { const fuji = new THREE.Mesh(merge([P(GEO.cone(1, 1, 24, 6), '#5d7ea6', [0, .5, 0], null, null, (x, y) => y > .22 ? new COL('#f6f9ff') : new COL('#56779f').lerp(new COL('#7f9cc0'), y + .5))]), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    fuji.scale.set(250 * c.fuji[2], 150 * c.fuji[2], 250 * c.fuji[2]); fuji.position.set(c.fuji[0], -6, c.fuji[1]); W.scene.add(fuji); }
  addMountains(W, { base: '#4d6188', top: '#8aa2c8', snow: '#f4f8ff', snowLine: .42, r0: 150, r1: 260, h0: 14 + 26 * c.mtn, h1: 30 + 65 * c.mtn, a0: fl > 0 ? -.6 : -3.9, a1: fl > 0 ? 3.9 : .6, n: 26, seed: 5 + c.seed });
  // trees: the cedar avenue along the road, pines on the slopes
  const cedar = merge([P(GEO.cyl(.22, .34, 5.5, 7), '#5a3a26', [0, 2.75, 0]), P(GEO.cone(1.7, 3.2, 8), c.tree[0], [0, 6, 0]), P(GEO.cone(1.4, 3, 8), c.tree[1], [0, 8, 0]), P(GEO.cone(1.05, 2.8, 8), c.tree[2], [0, 9.9, 0]), P(GEO.cone(.9, .5, 8), c.tree[3], [0, 11.3, 0])]);
  const pine = merge([P(GEO.cyl(.12, .2, 1.4, 6), '#4a3428', [0, .7, 0]), P(GEO.cone(1.6, 2.2, 8), c.tree[0], [0, 2.2, 0]), P(GEO.cone(1.45, .5, 8), c.tree[3], [0, 2.95, 0]), P(GEO.cone(1.25, 1.9, 8), c.tree[1], [0, 3.5, 0]), P(GEO.cone(1.1, .45, 8), c.tree[3], [0, 4.15, 0]), P(GEO.cone(.85, 1.6, 8), c.tree[2], [0, 4.7, 0]), P(GEO.cone(.55, .5, 8), c.tree[3], [0, 5.35, 0])]);
  const nearFlat = (x, z, pad) => tl().flats.some(f => Math.hypot(x * fl - f[0], z - f[1]) < f[2] + pad) || tl().ema.concat(tl().chest).some(f => Math.hypot(x * fl - f[0], z - f[1]) < 4.5 + Math.max(0, pad));
  const cedars = [];
  for (let z = -88; z <= 88; z += c.trees >= .7 ? 6.5 : 19.5) for (const sd of [-1, 1]) {
    if (Math.abs(z - GATE_Z) < 5 || nearFlat(townRoadX(z) + sd * 5, z, -4)) continue;
    const x = townRoadX(z) + sd * (5 + hash2(z | 0, sd) * 1.2); cedars.push({ p: [x, townH(x, z) - .1, z], r: [0, hash2(z | 0, 3) * 6, 0], s: .9 + hash2(z | 0, sd + 5) * .5 }); obs(W, x, z, .55);
  }
  W.scene.add(inst(cedar, windify(toon({ vertexColors: true, flatShading: true }), .012), cedars, true));
  const rr = mulberry(77 + c.seed), pines = [];
  for (let i = 0; i < 520 * c.trees; i++) {
    const x = (rr() * 2 - 1) * 108, z = (rr() * 2 - 1) * 108, h = townH(x, z), rd = Math.abs(x - townRoadX(z));
    if (rd < 9 || h < .3 || h > 26 || nearFlat(x, z, 2) || (Math.abs(x) < 34 && z > -30 && z < 36 && rr() < .8)) continue;
    const k = rr(); pines.push({ p: [x, h - .1, z], r: [0, k * 6, 0], s: 1 + k * 1.5 }); if (Math.abs(x) < TOWN_R && Math.abs(z) < TOWN_R) obs(W, x, z, .5 + k * .4);
  }
  W.scene.add(inst(pine, windify(toon({ vertexColors: true, flatShading: true }), .02), pines, true));
  const tuft = merge([P(GEO.cone(.05, .5, 4), '#a8a468', [0, .25, 0]), P(GEO.cone(.045, .4, 4), '#8f8c58', [.07, .2, .03], [0, 0, -.3]), P(GEO.cone(.045, .42, 4), '#b8b47a', [-.06, .21, -.04], [0, 0, .3])]);
  const tufts = [];
  for (let i = 0; i < 1500; i++) { const x = (rr() * 2 - 1) * 70 - 5, z = (rr() * 2 - 1) * 88, h = townH(x, z); if (h < .15 || h > 12 || Math.abs(x - townRoadX(z)) < 3.2) continue; tufts.push({ p: [x, h, z], r: [0, rr() * 6, 0], s: .8 + rr() * 1.3 }); }
  W.scene.add(inst(tuft, windify(toon({ vertexColors: true }), .22), tufts, false));
  const rock = merge([P(GEO.dodec(1), '#6b7890', [0, 0, 0], null, null, (x, y) => y > .35 ? new COL('#f4f8ff') : new COL('#6b7890'))]), rocks = [];
  for (let i = 0; i < 70; i++) { const x = (rr() * 2 - 1) * 88, z = (rr() * 2 - 1) * 88, h = townH(x, z); if (Math.abs(x - townRoadX(z)) < 6 || h < 0 || nearFlat(x, z, 1)) continue; const k = rr(); rocks.push({ p: [x, h + .1, z], r: [k * 3, k * 5, 0], s: [.6 + k * 1.6, .4 + k, .6 + k * 1.4] }); obs(W, x, z, .7 + k * 1.2); }
  W.scene.add(inst(rock, toon({ vertexColors: true, flatShading: true }), rocks, true));
  // houses of the post town
  const house = (x, z, ry, w, d, o) => townHouse(W, c, x, z, ry, w, d, o);
  const E = Math.PI / 2;
  [[-11, -34, E, 6, 5], [11, -30, -E, 6, 5], [-12, -18, E, 7, 5], [-16, 6, E, 8, 6, { roof: '#5a2f24', win: '#ffb86a' }], [18, 13, -E, 7, 6, { wall: '#d8c8a8', roof: '#33302e' }], [16, -12, -E, 9, 6.5, { h: 3.4, roof: '#3a2a30' }],
    [-13, 24, E, 6, 5], [13, 30, -E, 6, 5], [-11, 40, E, 5.5, 5], [12, 44, -E, 6, 5]].forEach(a => house(a[0] * fl + townRoadX(a[1]), a[1], a[2] * fl, a[3], a[4], a[5]));
  addLanterns(W, [[townRoadX(-40) - 3.4, -40], [townRoadX(-8) + 3.4, -8], [townRoadX(18) - 3.4, 18], [townRoadX(36) + 3.4, 36], [townRoadX(52) - 3.6, 52], [40 * fl, 14], [-14 * fl, 12]], '#7a8496', '#ffb860');
  // the checkpoint: a gate across the road and a palisade from the lake to the mountain
  townGate(W, c); const gx = townRoadX(GATE_Z);
  const stakes = [];
  for (let x = -52; x <= 52; x += .9) { if (Math.abs(x - gx) < 3.4) continue; stakes.push({ p: [x, townH(x, GATE_Z) + 1.3, GATE_Z + Math.sin(x * .3) * .2], s: [1, 1 + hash2(x * 10 | 0, 1) * .25, 1] }); }
  W.scene.add(inst(merge([P(GEO.cyl(.11, .13, 2.6, 6), '#4a3220', [0, 0, 0]), P(GEO.cone(.13, .4, 6), '#3a2416', [0, 1.5, 0])]), toon({ vertexColors: true }), stakes, true));
  // shrine on the hill, and the beast's clearing above it
  const st = new THREE.Mesh(toriiGeo('#c4302a', '#141418'), toon({ vertexColors: true })); st.position.set(35 * fl, townH(35 * fl, 18), 18); st.rotation.y = Math.PI / 2 + .25 * fl; st.castShadow = true; W.scene.add(st);
  house(44 * fl, 22, -E * fl, 5, 4.5, { roof: '#7a2a22', wall: '#b8322a', win: '#ffd98a', h: 2.4 });
  const tt = new THREE.Mesh(toriiGeo('#3a3a44', '#141418'), toon({ vertexColors: true })); tt.position.set(55 * fl, townH(55 * fl, 43), 43); tt.rotation.y = .8 * fl; tt.scale.setScalar(1.3); W.scene.add(tt);
  [[58, 56], [68, 52], [70, 46]].forEach(([x, z]) => { const h = halo(SETS[c.set].aura || '#ffb03a', 3, .5); h.position.set(x * fl, townH(x * fl, z) + 1.2, z); W.scene.add(h); });
  if (c.last) for (let z = -84; z < GATE_Z; z += 4) for (const sd of [-1, 1]) { const x = townRoadX(z) + sd * 3.6, h = halo(z % 8 ? '#ffb86a' : '#ff8a6a', 1.6, 0); h.position.set(x, townH(x, z) + 2.4 + Math.sin(z) * .3, z); W.scene.add(h); W.glows.push(h); }
}

/* ---------- the town's people and places ---------- */
const TOWN_LOOKS = {
  guard: { cloth: '#2a2a32', armor: '#4a4a56', trim: '#c9a35a', helm: 'kasa', helmCol: '#2a2420', crest: null, eye: '#ffe6a0' },
  captain: { cloth: '#1a2a4a', armor: '#2f4a7a', trim: '#f0d27a', helm: 'kabuto', helmCol: '#1a2a4a', crest: 'moon', crestCol: '#f0d27a', eye: '#ffe6a0', banner: '#2f4a7a' },
  bandit: { cloth: '#3a2a22', armor: '#5a4030', trim: '#8a3324', helm: 'hood', helmCol: '#2a1c16', crest: null, eye: '#ffcf8a', scarf: '#8a3324' },
  tea: { geisha: true, cloth: '#7a9a6a', armor: '#7a9a6a', trim: '#f2dc8a', hem: '#3a4a2a', mask: '#ffe6da', eye: '#3a2020', lips: '#d0405a', pins: '#ffd27a', bloom: '#ffb0c8', inner: '#ffffff' },
  hermit: { cloth: '#5a5a4a', armor: '#3a3a32', trim: '#c9b48c', helm: 'kasa', helmCol: '#b89a5a', crest: null, eye: '#ffe6a0', scarf: '#8a8a7a' },
  sensei: { cloth: '#f2f2ee', armor: '#2a2a32', trim: '#c9a35a', helm: 'band', helmCol: '#c4302a', crest: null, eye: '#ffe6a0' },
  smith: { cloth: '#3a2a22', armor: '#6a4a32', trim: '#f4efe4', helm: 'band', helmCol: '#f4efe4', crest: null, eye: '#ffd890' },
  priest: { cloth: '#f2f2ee', armor: '#f2f2ee', trim: '#b8322a', helm: 'band', helmCol: '#1c1c22', crest: null, eye: '#ffe6a0' },
  walker: [{ cloth: '#5a4a6a', armor: '#6a5a7a', trim: '#d6b878', helm: 'kasa', helmCol: '#c9a35a', crest: null, eye: '#ffe6a0' }, { cloth: '#3f5a4a', armor: '#4f6a5a', trim: '#e8dcc0', helm: 'kasa', helmCol: '#b8944a', crest: null, eye: '#ffe6a0' }, { cloth: '#6a3a2a', armor: '#7a4a3a', trim: '#e8dcc0', helm: 'band', helmCol: '#e8dcc0', crest: null, eye: '#ffe6a0' }],
};
/* foes are sized to the samurai who walks in, and get sharper town by town */
function townFoe(role) {
  if (role === 'ghost' || role === 'ghost2' || role === 'ghost3') return ghostFoe(role);
  if (role === 'beast') return beastFoe();
  if (role === 'w0' || role === 'w1') return warFoe(+role[1]);
  if (role === 'sensei') { const s = townFoe('keeper'); return Object.assign(s, { town: 'sensei', name: 'Hermit of the Mountain', title: 'Trial of Two Heavens', look: TOWN_LOOKS.hermit, sword: 'bokken', weapon: null, scale: 1, teleport: 0, fury: .2, freeze: false, shock: false, dragon: false, orochi: false, bowWeak: false, arena: null, gold: 0, intro: 'He switches between a long blade and a short one. Read his stance!' }); }
  const ps = stats(), c = townCfg(), i = c.i, D = role === 'a' ? c.a.foe : role === 'keeper' ? c.keeper : c.myth;
  const B = role === 'a' ? { hits: 13 + i, hit: .085 + .004 * i, tele: 1150 - 70 * i, guard: .2 + .02 * i, react: .2 + .03 * i, combo: .15 + .03 * i, feint: .05 + .03 * i, low: .15, gold: 120 }
    : role === 'keeper' ? { boss: 1, hits: 20 + 2 * i, hit: .1 + .005 * i, tele: 950 - 60 * i, guard: .34 + .02 * i, react: .32 + .03 * i, combo: .3 + .03 * i, feint: .15 + .03 * i, low: .2, gold: 260 }
    : { myth: true, hits: (D.dragon ? 28 : 24) + 2 * i, hit: .11 + .005 * i, tele: D.dragon ? 880 : 820 - 40 * i, guard: .28, react: .4, combo: .4 + .02 * i, feint: .3, low: .2, gold: 400 };
  const st = Object.assign({ ch: [1, 0, 4, 5, 2, 4, 6][i], town: role, name: D.n, title: D.title || D.sub, look: D.look, sword: D.sword, weapon: D.weapon, scale: D.scale, teleport: D.teleport, fury: D.fury, freeze: D.freeze, shock: D.shock, dragon: D.dragon, orochi: D.orochi, bowWeak: D.bowWeak, intro: D.tip, arena: c.arena ? () => c.arena(role) : null,
    stances: role === 'a' ? ['high', 'high', 'low'] : role === 'keeper' ? ['mid', 'mid', 'high', 'low'] : ['high', 'low', 'low', 'mid'], steel: 0, rec: playerPower() }, B);
  foeFix(st, i, role !== 'a'); friendEdge(st, role); st.gold = Math.round(st.gold * (.5 + .2 * i));
  return st;
}
function gateGuard() { return (townCfg().gate || {}).guard || 'Gate Guard'; }
function gatePlace() { return (townCfg().gate || {}).place || 'gate'; }
function isDawn() { return !!TOWN && townClock() === 'Dawn'; }
function allyName(id) { const [t, r] = id.split(':'), c = TOWN_BY[t]; if (c && r[0] === 'w') return warDef(+r[1], c.i).n; return c ? (r === 'a' ? c.a.foe.n : r === 'keeper' ? c.keeper.n : c.myth.n) : id; }
function needDual() { return townCfg().i >= 5 && !S.dual; }
function dualMsg() { const c = townCfg(); return `${c.keeper.n} fights with two blades, and no samurai with a single sword has ever touched ${c.i === 5 ? 'him' : 'it'}. Learn the Two Heavens from the Hermit of the Mountain, by the shrine above Hakone${c.id === 'hakone' ? '' : ' (walk back down the road from the south end of each town)'}: train Power and Speed to level 4, then pass his trial.`; }
function keeperReady() { const c = townCfg(); if (needDual() || warsLeft().length) return false; return c.keeper.need ? wornPieces().length >= c.keeper.need : S.town.jobs.a === 2 && (!c.keeper.also || c.keeper.also()); }
function townJobs() {
  const T = S.town, c = townCfg(), own = S.armor.owned.filter(id => PIECES[id].set === c.set).length;
  return [
    { t: `Speak with the ${gateGuard().toLowerCase()} at the ${gatePlace()}`, done: !!T.guard },
    c.keeper.need ? { t: `Dress for the road: wear at least 3 pieces of armor (${wornPieces().length}/3)`, done: wornPieces().length >= 3 } : null,
    { t: `${c.a.n}: deal with ${c.a.foe.n}, ${c.a.foe.title}`, done: T.jobs.a === 2 },
    { t: `${c.b.n}: find the three ${c.b.thing} (${T.ema.length}/3)`, done: T.jobs.b === 2 },
    c.i >= 5 ? { t: 'Earn the Two Heavens from the Hermit above Hakone: carry two blades', done: !!S.dual } : null,
    { t: 'Beat both road warriors', done: !warsLeft().length },
    { t: `Duel ${c.keeper.n} ${c.keeper.where || 'at the gate'}${c.keeper.dawn ? ', at sunrise' : ''}`, done: !!T.pass },
    { t: c.myth.after && !T.pass ? 'Optional: something is not what it seems…' : `Optional: face ${c.myth.n}, ${c.myth.title}`, done: !!T.myth },
    { t: `Optional: complete the ${SETS[c.set].n} armor set (${own}/7)`, done: own === 7 },
    { t: 'Together: ring the twin bells with a friend', done: !!T.duo },
    BEASTS2[c.id] ? { t: `Hunt: defeat ${BEASTS2[c.id].n}, ${BEASTS2[c.id].title}`, done: !!T.beast } : null,
    { t: 'Solve the shrine puzzle', done: !!T.pz },
    MASTERS[c.id] ? { t: `Legend: learn the ${swordDef(MASTERS[c.id].blade).name} from ${MASTERS[c.id].n}`, done: !!masterSt(c.id).blade } : null,
    { t: c.last ? 'Carry the letter through the palace gate' : `Pass the ${gatePlace()}, on toward ${TOWNS[c.i + 1].n}`, done: !!T.done },
  ].filter(Boolean);
}
function townObjective() {
  const T = S.town, c = townCfg();
  if (T.track && !ownPiece(T.track)) return `Looking for the ${PIECES[T.track].n}: ${pieceHint(T.track).t}.`;
  if (!T.guard) return `Follow the road north to the ${gatePlace()}.`;
  if (T.pass) return T.done ? `${c.n} is complete. Roam freely, finish the ${SETS[c.set].n} set, or travel on from the Map.` : `The ${gatePlace()} is open. Walk ${c.gate ? c.gate.verb || 'across' : 'through'} it.`;
  if (T.jobs.a === 2 && warsLeft().length) return `${c.keeper.n} only faces a ronin who has beaten every duelist on this road. ${warsLeft().length === 2 ? 'Two are' : 'One is'} still waiting: look for the red "Duelist" marks on your map.`;
  if (T.jobs.a === 2 && needDual() && (!c.keeper.also || c.keeper.also())) return dualMsg();
  if (!keeperReady()) return c.keeper.need ? `${c.keeper.n} only duels samurai dressed for the road. Find 3 pieces of armor: the armorer sells some, and the townsfolk need help.` : c.keeper.also && S.town.jobs.a === 2 ? c.keeper.alsoMsg : `${c.keeper.n} will only face someone this town trusts. Help ${c.a.n} first.`;
  if (c.keeper.dawn && !isDawn()) return `${c.keeper.n} duels only at sunrise. Speak with her ${c.keeper.where} to wait for dawn.`;
  return `Challenge ${c.keeper.n} ${c.keeper.where || 'at the gate'}.`;
}
function townTarget() {
  if (!TOWN) return null; const T = S.town, P = k => TOWN.pois.find(p => p.id === k);
  if (T.track) { if (ownPiece(T.track)) { delete T.track; save(); } else { const h = pieceHint(T.track).at(); if (h) return h; } }
  if (!T.guard) return P('guard');
  if (T.pass) return T.done ? null : townCfg().doneZ ? { x: townRoadX(townCfg().doneZ + 2), z: townCfg().doneZ + 2 } : { x: townRoadX(GATE_Z + 6), z: GATE_Z + 6 };
  if (T.jobs.a === 2 && warsLeft().length) return P('w' + warsLeft()[0]) || P('keeper');
  if (T.jobs.a === 2 && needDual() && (!townCfg().keeper.also || townCfg().keeper.also())) return P('hermit') || P('sensei');
  if (!keeperReady() && T.jobs.a === 2 && townCfg().keeper.alsoAt) { const q = townCfg().keeper.alsoAt(); if (q) return q; }
  if (!keeperReady()) return !T.jobs.a ? P('a') : T.jobs.a === 1 ? P('foe') : !T.jobs.b ? P('b') : townCfg().keeper.also ? (T.ema.length < 3 ? TOWN.pois.filter(q => q.kind === 'ema').sort((x, y) => Math.hypot(x.x - TOWN.pos.x, x.z - TOWN.pos.z) - Math.hypot(y.x - TOWN.pos.x, y.z - TOWN.pos.z))[0] : P('b')) : P('smith');
  return P('keeper');
}

function startTown(back) {
  transition(() => {
    clearSceneActors();
    const c = townCfg(), W = buildTown(c); activateWorld(W);
    let sp = back && S.town.at ? S.town.at : { x: townRoadX(-74), z: -74, yaw: 0 };
    if (!spawnOk(W, sp)) sp = { x: townRoadX(-74), z: -74, yaw: 0 }; // never wake up in the river
    TOWN = { W, pos: new V3(sp.x, 0, sp.z), face: sp.yaw || 0, camYaw: sp.yaw || 0, camPitch: .22, speed: 0, phase: 0, joy: null, look: null, pois: [], near: null, clock: 0, camPos: new V3(), camLook: new V3(), lastGood: new V3(sp.x, 0, sp.z), day: S.town.day == null ? c.day : S.town.day, walkers: [], grp: new THREE.Group(), paused: false, saveT: 0 };
    W.scene.add(TOWN.grp);
    townRefreshPlayer(); townPeople();
    showHUD('explore'); $('#hud').classList.add('town');
    $('#leaveBtn').textContent = 'Pack'; OV.draw = drawTownOverlay; OV.trailCol = '255,255,255';
    MUSIC.start('hub'); setMode(TownMode);
    if (!S.town.seen) { S.town.seen = true; save(); setTimeout(() => { if (TOWN) titleCard(c.jp, c.n, c.sub, `Station ${c.i + 2} of 8`); }, 500); if (c.i > 0) setTimeout(() => { if (TOWN && !TOWN.paused) cineArrive(() => { if (TOWN) townSay('The Tokaido road', c.intro); }); }, 2400); }
  });
}
function townTravel(i, shown) {
  if (!TOWNS[i] || i > (S.far || 0) || i >= ROAD_OPEN) return;
  if (!shown && roadScene(i)) return;
  const from = S.cur;
  if (TOWN) { S.town.at = { x: TOWN.pos.x, z: TOWN.pos.z, yaw: TOWN.face }; }
  S.cur = i; delete S.town; gearInit();
  // you arrive on the road, never where you last stood: from the south at the town's entrance, from the north just inside its gate
  S.town.at = i < from ? { x: townRoadX(GATE_Z - 4.5) + 1.2, z: GATE_Z - 4.5, yaw: Math.PI } : null;
  save(); startTown(true);
}
function townRefreshPlayer() {
  const T = TOWN; if (!T) return;
  if (T.P) { T.grp.remove(T.P.root); T.grp.remove(T.P.trail.mesh); T.P.dispose(); }
  const P = styleRig(new Samurai(lookFromOutfit(outfitDef(S.outfit)), swordDef(eqSword().id), {})); P.root.rotation.order = 'YXZ'; P.setSheathed(true);
  T.grp.add(P.root, P.trail.mesh); T.P = P;
}
function townNPC(id, x, z, look, sword, name, sub, o) {
  o = o || {}; const T = TOWN, y = townH(x, z);
  const rig = new Samurai(look, swordDef(sword || 'iron'), { noSaya: !!o.unarmed, boss: !!o.boss }); rig.root.rotation.order = 'YXZ'; rig.root.position.set(x, y, z); rig.root.rotation.y = o.ry || 0;
  if (o.scale) rig.root.scale.setScalar(o.scale);
  if (o.unarmed) rig.sword.visible = false; else rig.setSheathed && rig.hasSaya && rig.setSheathed(true);
  rig.setHold(o.unarmed ? 'show' : 'rest', 6); T.grp.add(rig.root);
  const lab = labelSprite(name, o.col || '#fff6d8', sub); lab.position.set(x, y + 2.7 * (o.scale || 1), z); T.grp.add(lab);
  const p = { id, kind: 'npc', x, z, r: 3.4, rig, lab, map: o.map, col: o.mapCol }; T.pois.push(p); T.W.obs.push({ x, z, r: .5 });
  return p;
}
function townPeople() {
  const T = TOWN, J = S.town, c = townCfg(), fl = c.flip, gx = townRoadX(GATE_Z), al = r => allies().includes(c.id + ':' + r), GRN = '#9ff0c8', L = tl(), at = (k, d) => L.pos[k] || d, G = c.gate || {};
  const npc = (id, k, d, look, sword, name, sub, o) => { const p = at(k, d); if (p[2] != null) o.ry = p[2]; return townNPC(id, p[0], p[1], look, sword, name, sub, o); };
  npc('guard', 'guard', [gx - 1.6, GATE_Z - 2.2], TOWN_LOOKS.guard, 'iron', G.guard || 'Gate Guard', c.n + ' ' + (G.place || 'gate'), { ry: Math.PI, map: G.map || 'Gate', mapCol: '#ff9a7a' });
  if (!J.pass) npc('keeper', 'keeper', [gx + 4.5, GATE_Z - 6], c.keeper.look, c.keeper.sword, c.keeper.n, c.keeper.sub, { ry: Math.PI * 1.15, boss: true, col: '#ffb38a' });
  else if (al('keeper')) npc('friend:keeper', 'keeper', [gx + 4.5, GATE_Z - 6], c.keeper.look, c.keeper.sword, c.keeper.n, 'Friend', { ry: Math.PI * 1.15, col: GRN });
  npc('a', 'a', [townRoadX(6) - 10.5 * fl, 6], c.a.look, 'iron', c.a.n, c.a.sub, { ry: Math.PI / 2 * fl, unarmed: true, map: c.a.sub });
  npc('smith', 'smith', [townRoadX(13) + 13 * fl, 13.5], TOWN_LOOKS.smith, 'bokken', 'The Armorer', 'Armor for sale', { ry: -Math.PI / 2 * fl, unarmed: true, map: 'Armorer' });
  npc('b', 'b', [40.5 * fl, 19], c.b.look || (c.b.n === 'Princess Hana' ? PRINCESS_LOOK : TOWN_LOOKS.priest), 'bokken', c.b.n, c.b.sub, { ry: -Math.PI / 2 * fl, unarmed: true, map: c.b.sub });
  { const sp = at('smith', [townRoadX(13) + 13 * fl, 13.5]), sd = Math.sign(sp[0] - townRoadX(sp[1])) || 1; const q = townNPC('sensei', sp[0] - sd * .4, sp[1] + 3.8, TOWN_LOOKS.sensei, 'bokken', 'Sensei', 'Road dojo: training', { ry: sp[2] != null ? sp[2] : -Math.PI / 2 * fl, map: 'Dojo' }); q.act = townDojo; q.label = 'Train with the sensei'; }
  if (MASTERS[c.id]) { const sp = at('smith', [townRoadX(13) + 13 * fl, 13.5]), sd = Math.sign(sp[0] - townRoadX(sp[1])) || 1, M = MASTERS[c.id]; const q = townNPC('master', sp[0] - sd * .4, sp[1] - 4.2, Object.assign({}, TOWN_LOOKS.smith, { trim: M.col, helmCol: M.col }), 'bokken', M.n, 'Master smith · legendary blades', { ry: sp[2] != null ? sp[2] : -Math.PI / 2 * fl, map: 'Master smith', mapCol: M.col, col: M.col }); q.act = townMaster; q.label = 'Speak with ' + M.n;
    const fx = sp[0] + sd * 1.6, fz = sp[1] - 5.4, fy = townH(fx, fz), m = new THREE.Mesh(merge([P(GEO.box(1.2, .8, 1), '#6a5a52', [0, .4, 0]), P(GEO.cyl(.28, .4, 1.3, 8), '#4a3a34', [0, 1.4, 0]), P(GEO.box(.9, .1, .7), '#ff6a1a', [0, .82, 0]), P(GEO.cyl(.2, .26, .5, 8), '#5a3a22', [1.1, .25, .3]), P(GEO.box(.6, .14, .26), '#3a3a42', [1.1, .6, .3]), P(GEO.cyl(.04, .04, 2.6, 5), '#3a2416', [-.9, 1.3, -.4]), P(GEO.box(.06, 1.3, .7), M.col, [-.9, 1.9, -.05])]), toon({ vertexColors: true, flatShading: true })); m.position.set(fx, fy, fz); m.castShadow = true; T.grp.add(m); T.W.obs.push({ x: fx, z: fz, r: 1 }); const h = halo(M.col, 2.6, .6); h.position.set(fx, fy + 1.1, fz); T.grp.add(h); }
  if (c.id === 'hakone') { const q = townNPC('hermit', 37 * fl, 26.5, TOWN_LOOKS.hermit, 'bokken', 'Hermit of the Mountain', 'Two Heavens school', { ry: Math.PI * (fl > 0 ? 1.25 : .75), map: 'Hermit', mapCol: '#ffd27a' }); q.act = townHermit; q.label = 'Speak with the hermit'; }
  if (J.jobs.a !== 2) npc('foe', 'foe', [-36 * fl, -30], c.a.foe.look, c.a.foe.sword, c.a.foe.n, c.a.foe.title, { ry: fl, map: c.a.foe.n, mapCol: '#ff9a7a', col: '#ffb38a' });
  else if (al('a')) npc('friend:a', 'friendA', [townRoadX(6) - 8.5 * fl, 9.5], c.a.foe.look, 'bokken', c.a.foe.n, 'Friend · ' + c.a.foe.job.toLowerCase(), { ry: Math.PI / 2 * fl, unarmed: true, col: GRN });
  const thing = (id, kind, x, z, col, geo, r) => { const y = townH(x, z), m = new THREE.Mesh(geo, toon({ color: col, emissive: new COL(col), emissiveIntensity: .25 })); m.position.set(x, y + .5, z); m.castShadow = true; const h = halo(col, 2.4, .55); h.position.y = .2; m.add(h); T.grp.add(m); const p = { id, kind, x, z, r: r || (kind === 'ema' ? 1.6 : 2.6), m }; T.pois.push(p); return p; };
  const mcol = SETS[c.set].aura || '#ffb03a', [MX, MZ] = at('myth', [62 * fl, 50]);
  if (c.myth.after && !J.pass) { /* this one shows itself later */ }
  else if (!J.myth) { if (c.myth.dragon) { const p = thing('myth', 'mark', MX, MZ, mcol, GEO.oct(.7), 4); p.map = c.myth.n; p.col = mcol; const lab = labelSprite(c.myth.n, mcol, c.myth.title); lab.position.set(MX, townH(MX, MZ) + 3.4, MZ); T.grp.add(lab); }
    else npc('myth', 'myth', [MX, MZ], c.myth.look, c.myth.weapon === 'club' ? 'ogre' : c.myth.sword, c.myth.n, c.myth.title, { ry: -2.2 * fl, scale: c.myth.scale, boss: true, map: c.myth.n, mapCol: mcol, col: mcol }); }
  else if (al('myth') && !c.myth.dragon) npc('friend:myth', 'myth', [MX, MZ], c.myth.look, c.myth.weapon === 'club' ? 'ogre' : c.myth.sword, c.myth.n, 'Friend', { ry: -2.2 * fl, scale: c.myth.scale, col: GRN });
  L.ema.forEach(([x, z], k) => { if (!J.ema.includes(k)) thing('ema' + k, 'ema', x * fl, z, L.emaCol || '#ffd98a', L.emaGeo ? L.emaGeo() : GEO.box(.5, .38, .06)); });
  [['c0', 'haidate'], ['c1', 'suneate']].forEach(([id, slot], k) => { if (!J.chests.includes(id)) { const p = thing(id, 'chest', L.chest[k][0] * fl, L.chest[k][1], '#b8843a', GEO.box(.9, .6, .6)); p.piece = c.set + '-' + slot; } });
  { const s = labelSprite('Tokaido Road', '#fff6d8', `North: ${c.n} ${G.place || 'gate'}` + (c.last ? '' : ' · ' + TOWNS[c.i + 1].n)); s.position.set(townRoadX(-66) + 3.4, townH(townRoadX(-66) + 3.4, -66) + 3, -66); T.grp.add(s); }
  { // the road itself: walk out the south end to go back a town, or on past the gate to the next
    const sign = (x, z, ry) => { const m = new THREE.Mesh(merge([P(GEO.cyl(.07, .09, 2.2, 6), '#3a2416', [0, 1.1, 0]), P(GEO.box(1.5, .5, .08), '#e8dcc0', [0, 1.9, 0]), P(GEO.box(1.6, .08, .12), '#3a2416', [0, 2.18, 0])]), toon({ vertexColors: true })); m.position.set(x, townH(x, z), z); m.rotation.y = ry; m.castShadow = true; T.grp.add(m); };
    if (c.i > 0) { const z = -83, x = townRoadX(z); sign(x + 2.6, z, 0); T.pois.push({ id: 'south', kind: 'spot', x, z, r: 3.4, map: 'Road south', label: 'Walk back to ' + TOWNS[c.i - 1].n, act: () => townTravel(c.i - 1) }); }
    if (c.i + 1 < ROAD_OPEN) { const z = (c.doneZ || GATE_Z + 5) + 2.2, x = c.exitX != null ? c.exitX : townRoadX(z); T.pois.push({ id: 'north', kind: 'spot', x, z, r: 3.2, label: 'Walk on to ' + TOWNS[c.i + 1].n, act: () => { if (S.town.done) townTravel(c.i + 1); } }); }
  }
  if (c.people) c.people(T, npc);
  duoPeople(T); puzzlePeople(T); beastPeople(T); warPeople(T); packPeople(T);
  for (let i = 0; i < 5; i++) {
    const rig = new Samurai(TOWN_LOOKS.walker[i % 3], swordDef('bokken'), { noSaya: true }); rig.sword.visible = false; rig.root.rotation.order = 'YXZ'; rig.setHold('rest', 6); T.grp.add(rig.root);
    T.walkers.push({ rig, z: -80 + i * 31, dir: i % 2 ? 1 : -1, side: i % 2 ? 1.3 : -1.3, spd: 1.1 + (i % 3) * .25, ph: i * 2 });
  }
}
function townSay(who, text, btns) {
  if (TOWN) { TOWN.paused = true; TOWN.joy = null; }
  openOverlay(`<div class="modal talk"><div class="eyebrow">${esc(who)}</div><p style="font-size:17px;line-height:1.5">${text}</p><div class="actions">${(btns || [['', 'Continue']]).map(([a, l, cls]) => `<button class="btn ${cls || ''}" data-town="${a}">${l}</button>`).join('')}</div></div>`);
}
function townCloseTalk() { closeOverlay(); if (TOWN) TOWN.paused = false; }
function townGive(ids) {
  const got = ids.filter(id => givePiece(id, true)); if (!got.length) return;
  sfx.win(); setTimeout(() => banner('New armor!', got.map(id => PIECES[id].n).join(' · ')), 300);
  if (fullSet()) setTimeout(() => banner('Full set!', SETS[fullSet()].bonus), 2600);
  townRefreshPlayer();
}
function townAct() {
  const T = TOWN; if (!T || !T.near || T.paused) return;
  const p = T.near, J = S.town, c = townCfg();
  S.town.at = { x: T.pos.x, z: T.pos.z, yaw: T.face }; save();
  if (p.act) return p.act(p);
  if (p.kind === 'chest') { J.chests.push(p.id); { const got = rollDrops(c.i, 'ghost'), mt = Object.entries(got).map(([id, n]) => `+${n} ${MATERIALS[id].n}`).join(' · '); if (mt) setTimeout(() => toast('Forge materials: ' + mt), 2600); } save(); T.grp.remove(p.m); T.pois = T.pois.filter(q => q !== p); FX.sparks(p.m.position, '#ffe08c', 40, 5); townGive([p.piece]); return; }
  if (p.id.startsWith('friend:')) {
    const r = p.id.slice(7), left = SLOTS.map(s => c.set + '-' + s.id).filter(id => !ownPiece(id)), tip = left.length ? `<br><br>Still hunting the ${SETS[c.set].n} armor? ${pieceHint(left[0]).t}.` : '';
    return townSay(allyName(c.id + ':' + r), ({ a: `You could have ended me. ${c.a.n} gave me honest work instead. Whenever you duel, I will be shouting for you.`, keeper: 'You fought with honor and offered your hand. This gate remembers its friends.', myth: 'You showed mercy. Few humans do. Fight well, small one.' })[r] + tip + '<br><span class="muted">Friends you spared fill your Spirit at the start of every duel.</span>');
  }
  if (p.id === 'guard') {
    if (J.pass) return townSay(gateGuard(), c.last ? 'The palace gate stands open. Go on, samurai.' : `Your way is clear. The road runs on to ${TOWNS[c.i + 1].n}. Travel safely.`);
    if (!J.guard) return townSay(gateGuard(), (c.gate && c.gate.halt) || `Halt. This is the ${c.n} gate. No one passes without leave. What is your business on the Tokaido?`, [['truth', `I carry Princess Hana's letter to Kyoto`, 'primary'], ['lie', 'I am only a rice merchant']]);
    return townSay(gateGuard(), keeperReady() ? `${c.keeper.n} is ${c.keeper.where || 'by the gate'}. Bow before you draw.` : townObjective());
  }
  if (p.id === 'keeper') {
    if (J.jobs.a === 2 && warsLeft().length) return townSay(c.keeper.n, `There ${warsLeft().length === 2 ? 'are two duelists' : 'is a duelist'} on my road you have not faced. Beat them, then come to me.`);
    if (J.jobs.a === 2 && needDual() && (!c.keeper.also || c.keeper.also())) return townSay(c.keeper.n, c.i === 5 ? 'One sword? I carry two, ronin. Come back when you can do the same, or do not come back.' : 'One blade against the Shadow of the Shogun. No. Learn to carry two, and then we end this.');
    if (!keeperReady()) return townSay(c.keeper.n, c.keeper.need ? `A samurai in ${wornPieces().length ? 'half his armor' : 'travel clothes'}? I do not duel the unprepared. Come back wearing three pieces.` : c.keeper.also && J.jobs.a === 2 ? c.keeper.alsoMsg : `I do not know you, and neither does this town. Help ${c.a.n}, then we will talk.`);
    if (c.keeper.dawn && !isDawn()) return townSay(c.keeper.n, c.keeper.notYet, [['dawn', '☀ Wait for sunrise', 'primary'], ['', 'Not yet']]);
    return townSay(c.keeper.n, c.keeper.ask + readyLine(), [['fight:keeper', '⚔ Accept the duel', 'primary'], ['', 'Not yet']]);
  }
  if (p.id === 'a') {
    if (!J.jobs.a) { J.jobs.a = 1; save(); return townSay(c.a.n, c.a.ask); }
    return townSay(c.a.n, J.jobs.a === 1 ? c.a.wait : c.a.thanks);
  }
  if (p.id === 'foe') return townSay(c.a.foe.n, c.a.foe.line, [['fight:a', '⚔ Fight', 'primary'], ['', 'Walk away']]);
  if (p.id === 'myth') return townSay(c.myth.n, c.myth.line, [['fight:myth', '⚔ Face it', 'primary'], ['', 'Back away slowly']]);
  if (p.id === 'b') {
    if (J.jobs.b === 2) return townSay(c.b.n, 'Thank you again. May the road be kind to you.');
    if (J.ema.length >= 3) { J.jobs.b = 2; save(); virtue('gi', 1, `you helped ${c.b.n}`); townSay(c.b.n, c.b.thanks); townGive([c.set + '-sode']); if (c.onJob) c.onJob('b'); return; }
    J.jobs.b = 1; save(); return townSay(c.b.n, c.b.ask + (J.ema.length ? ` You have found ${J.ema.length}.` : tl().emaHint || ' They glow gold where they fell.'));
  }
  if (p.id === 'smith') {
    const stock = ['do', 'kabuto', 'kote', 'sode', 'haidate', 'suneate', 'menpo'].map(x => 'ashigaru-' + x).filter(id => !ownPiece(id));
    return townSay('The Armorer', `I do not sell armor. Nobody on this road does: armor is earned. The <b>sensei</b> next to me hands out foot-soldier pieces to those who train${stock.length ? ` (you still lack ${stock.length})` : ''}, and every town's own set is won by helping it. What I do is <b>forge</b>: bring gold and steel and I will make what you carry stronger.`, [['smithy', '🔨 Forge my blade', 'primary'], ['aforge', '🛡 Forge my armor'], ['', 'Done']]);
  }
}
function townClick(d) {
  if (d.town == null && d.title2 == null) return false;
  if (d.title2 != null) return title2Click(d.title2);
  const a = d.town, J = S.town, c = townCfg();
  if (c.click && c.click(a)) return true;
  if (ghostClick(a)) return true;
  if (masterClick(a)) return true;
  if (a === 'tut') { townCloseTalk(); tutStart(); return true; }
  if (a === 'truth' || a === 'lie') {
    J.guard = true; J.note = true; save();
    const next = keeperReady() ? `${c.keeper.n} waits ${c.keeper.where || 'by the gate'}.` : c.keeper.need ? `You need ${c.keeper.n}'s stamp, and he only duels samurai dressed for the road: three pieces of armor at least.` : c.keeper.first || `${c.keeper.n} decides who passes, and will only face someone this town trusts. Help ${c.a.n} first.`;
    if (a === 'truth') { virtue('makoto', 1, 'you told the truth'); townSay(gateGuard(), `The princess's letter? ${next}<br><span class="muted">A Road Note was added to your journal.</span>`); }
    else { virtue('makoto', -1, 'the guard does not believe you'); townSay(gateGuard(), `A rice merchant with a sword like that? Hm. ${next}`); }
    return true;
  }
  if (a.startsWith('fight:') && teamInvite(a.slice(6))) return true;
  if (a.startsWith('fight:')) { const id = a.slice(6); closeOverlay(); if (TOWN) TOWN.paused = false; if (TOWN) S.town.day = TOWN.day; startBattle(townFoe(id), { kind: 'town', idx: id, ch: 1, from: 'town' }); return true; }
  if (a.startsWith('buy:')) { const id = a.slice(4); if (S.gold >= 60 && !ownPiece(id)) { S.gold -= 60; givePiece(id); townRefreshPlayer(); toast(`Bought ${PIECES[id].n}`); } TOWN.near = TOWN.pois.find(p => p.id === 'smith'); TOWN.paused = false; townAct(); return true; }
  if (a === 'spare' || a === 'finish') { townAfterFight(a); return true; }
  if (a === 'wspare' || a === 'wfinish') { road2After(a); return true; }
  if (a === 'retry') { const ctx = F.ctx; closeOverlay(); F = null; startBattle(townFoe(ctx.idx), ctx); return true; }
  if (a === 'back') { closeOverlay(); endFight(); return true; }
  if (a === 'aforge') { townArmorForge(); return true; }
  if (a.startsWith('aforge:')) { townArmorForgeDo(a.slice(7)); return true; }
  if (a === 'smithback') { closeOverlay(); if (TOWN) TOWN.paused = false; return true; }
  if (a === 'smithy') { townWorkshop('forge'); return true; }
  if (a === 'forge') { const w = eqSword(), cst = forgeCost(w); if ((w.lvl || 0) >= 10 || !canPay(cst) || !isArmed()) return true; closeOverlay(); if (TOWN) TOWN.paused = false; $('#leaveBtn').textContent = 'Leave'; doUpgrade(); return true; }
  if (a.startsWith('style2:')) { const k = a.slice(7); if (STYLES[k] && k !== 'both' && k !== (S.style || 'katana')) { S.style2 = k; save(); sfx.up && sfx.up(); } townHermit(); return true; }
  if (a.startsWith('style:')) { const k = a.slice(6); if (STYLES[k] && k !== 'both') { S.style = k; if (S.style2 === k) S.style2 = k === 'kodachi' ? 'katana' : 'kodachi'; save(); sfx.up && sfx.up(); townRefreshPlayer(); toast(`${STYLES[k].n} style: ${STYLES[k].d}`); } townDojo(); return true; }
  if (a.startsWith('train:')) { closeOverlay(); if (TOWN) TOWN.paused = false; $('#leaveBtn').textContent = 'Leave'; startTraining(a.slice(6)); return true; }
  if (a === 'dawn') { townCloseTalk(); if (TOWN) { TOWN.lapse = ((1 - TOWN.day) % 1) + .012; TOWN.joy = null; hint('The night passes…'); TOWN.lapseThen = () => { const k = TOWN.pois.find(p => p.id === 'keeper'); if (k) { TOWN.near = k; townAct(); } }; } return true; }
  if (a === 'next') { closeOverlay(); townTravel(c.i + 1); return true; }
  townCloseTalk(); return true;
}
/* a town fight ends with a choice */
/* the armorer's forge is the first game's whole smithy: forging, infusing, fusing, recipes and the blade rack */
function townWorkshop(tab) {
  if (TOWN) { TOWN.paused = true; TOWN.joy = null; } closeOverlay();
  const ui = $('#ui'); ui.classList.add('road'); ui.classList.toggle('vs', tab === 'versus'); const bn = ui.querySelector('.brand-name'); if (bn) bn.textContent = tab === 'versus' ? 'The Duelling Ground' : tab === 'swords' ? 'The Blade Rack' : "The Armorer's Forge";
  if (!$('#roadBack')) { const b = document.createElement('button'); b.className = 'tab'; b.id = 'roadBack'; b.innerHTML = '<b>道</b><span>Back to the road</span>'; b.addEventListener('click', townWorkshopClose); ui.querySelector('.tabs').appendChild(b);
    const st = document.createElement('style'); st.textContent = '#ui.road .tab{display:none}#ui.road:not(.vs) .tab[data-tab=forge],#ui.road:not(.vs) .tab[data-tab=swords],#ui.road.vs .tab[data-tab=versus],#ui.road #roadBack{display:grid}#ui.road .tabs{grid-template-columns:repeat(3,minmax(0,1fr))}#ui.road.vs .tabs{grid-template-columns:repeat(2,minmax(0,1fr))}#ui:not(.road) #roadBack{display:none}'; document.head.appendChild(st); }
  ui.hidden = false; $('#hud').hidden = true; if (!showTab.road) { const orig = showTab; showTab = function (n) { orig(n); if ($('#ui').classList.contains('road')) { const secs = new Set(); document.querySelectorAll('#screen [data-recipe]').forEach(b => { const s = b.closest('section'); if (s) secs.add(s); }); secs.forEach(s => { s.innerHTML = '<h3>Legendary blades</h3><p class="muted" style="margin-top:6px">A legendary blade cannot be forged from a recipe. Each one is taught by a master smith in a town on the road, at their own forge and to their own rhythm. Look for the <b>Master smith</b> on each town\'s map.</p>'; }); } }; showTab.road = true; }
  showTab(tab || 'forge');
}
function townWorkshopClose() { $('#ui').hidden = true; $('#hud').hidden = false; if (TOWN && MODE === TownMode) { TOWN.paused = false; townRefreshPlayer(); } }
function townSmithy() {
  const w = eqSword(), d = swordDef(w.id), cst = forgeCost(w), max = (w.lvl || 0) >= 10, next = Math.round(swordDmg(Object.assign({}, w, { lvl: (w.lvl || 0) + 1 })));
  if (TOWN) { TOWN.paused = true; TOWN.joy = null; }
  openOverlay(`<div class="modal" style="text-align:left"><div class="eyebrow">The armorer's forge</div><div class="row between" style="margin-top:6px"><h2 style="color:${RAR[d.r].c}">${d.name}${w.lvl ? ' +' + w.lvl : ''}</h2><span class="muted">Forge level ${w.lvl || 0}/10</span></div>
    <div class="stats" style="margin:12px 0;grid-template-columns:repeat(2,minmax(0,1fr))"><div class="stat"><b>${Math.round(swordDmg(w))}</b><span>Damage now</span></div><div class="stat"><b>${max ? 'MAX' : next}</b><span>After forging</span></div></div>
    <p class="muted" style="font-size:13px">Forging is hands-on: pump the bellows, hammer the steel and quench it. A Masterwork adds bonus damage. You earn steel by winning duels.</p>
    <p>You have <b>${fmt(S.gold)}</b> gold and <b>${fmt(S.steel)}</b> steel.</p>
    <div class="actions"><button class="btn" data-town="">Not now</button>${max ? '<span class="tag new">Fully forged</span>' : `<button class="btn primary" data-town="forge" ${canPay(cst) ? '' : 'disabled'}>🔨 Forge +${(w.lvl || 0) + 1} · ${cst.gold} gold, ${cst.steel} steel</button>`}</div></div>`);
}
function townDojo() {
  if (TOWN) { TOWN.paused = true; TOWN.joy = null; }
  openOverlay(`<div class="modal" style="text-align:left"><div class="eyebrow">Sensei · road dojo</div><h2>How do you carry your blade?</h2>
    <div class="grid2" style="grid-template-columns:repeat(3,minmax(0,1fr));margin:8px 0 14px">${Object.entries(STYLES).filter(([k]) => k !== 'both').map(([k, y]) => `<button class="card ${(S.style || 'katana') === k ? 'sel' : ''}" data-town="style:${k}" style="text-align:left;gap:4px"><b>${y.jp} ${y.n}</b><small>${y.d}</small><small style="color:var(--jade)">${(S.style || 'katana') === k ? '✓ Your style' : 'Tap to switch'}</small></button>`).join('')}</div>
    <p class="muted" style="font-size:13px;margin:0 0 12px">二 Two blades at once? That is not mine to teach. Climb to the <b>Hermit of the Mountain</b>, by the shrine above Hakone.</p>
    <h2>What will you practise?</h2><p class="muted" style="margin:6px 0 10px">Each drill grows one skill, and skills are what win duels on this road. The first time you finish each drill I give you a piece of foot-soldier armor (${SLOTS.filter(s => ownPiece('ashigaru-' + s.id)).length}/7; the hermit's two-blade drills count too). For ${townCfg().n} you are: <b style="color:${readyWord()[1]}">${readyWord()[0]}</b>. ${readyWord()[2]}</p>
    <div class="grid2">${Object.entries(TRAININGS).filter(([k, t]) => !t.dual).map(([k, t]) => { const s = S.sk[t.skill], need = skillNeed(s.l); return `<div class="card" style="gap:6px"><div class="row between"><b>${t.g} ${t.name}</b><small class="muted">${SKILLS[t.skill].n} Lv ${s.l}</small></div><div class="bar"><i style="width:${s.l >= 30 ? 100 : Math.round(s.x / need * 100)}%"></i></div><button class="btn small jade" data-town="train:${k}">Start drill</button></div>`; }).join('')}</div>
    <div class="actions"><button class="btn" data-town="">Back to the road</button></div></div>`);
}
function townFightResult() {
  if (road2Result()) return;
  if (moreResult()) return;
  if (specialResult()) return;
  if (teamResult()) return;
  hint('');
  const st = F.st;
  if (F.outcome !== 'win') return openOverlay(`<div class="modal"><div class="kicker lose">${F.broken ? 'Your blade snapped!' : 'Defeated'}</div><p>${F.broken ? `Your <b>${F.broken.name}</b> broke against ${st.name} and is gone for good. You now carry the ${F.broken.next}. A blade must be strong enough for its town: train, then forge or earn a better one.` : `<b>${st.name}</b> was too strong this time. Read the stance over their head: HIGH beats MID, MID beats LOW, LOW beats HIGH.`}${readyLine()}</p><div class="actions"><button class="btn primary" data-town="retry">Try again</button><button class="btn" data-town="back">Back to town</button></div></div>`);
  openOverlay(`<div class="modal win"><div class="kicker">Victory!</div><p><b>${st.name}</b> ${st.dragon ? 'sinks low, beaten' : 'drops to one knee'}.</p><p class="muted">What does a samurai do now?</p>
    <div class="choice2">
      <button class="card" data-town="spare"><b>Sheathe your blade</b><small>${st.name} becomes a <b>friend on the road</b>. Friends stand with you: they make the big duels of their town easier, catch you once when you fall, and each one adds 10% Spirit at the start of every duel.</small><small style="color:var(--jade)">Mercy +1 · friends: ${allies().length} → ${allies().length + 1}</small></button>
      <button class="card" data-town="finish"><b>Press your advantage</b><small>Take everything they carry and send them running. You will not see them again.</small><small style="color:var(--gold-2,#ffd27a)">+${Math.round(st.gold * .5)} extra gold, once · Mercy −1</small></button>
    </div></div>`);
}
function townAfterFight(choice) {
  const id = F.ctx.idx, st = F.st, J = S.town, c = townCfg(), clean = !F.lostLimb, bowed = !!F.bowed, key = c.id + ':' + id;
  let gold = st.gold;
  if (choice === 'spare') { virtue('jin', 1, `you spared ${st.name}`); if (!allies().includes(key)) allies().push(key); } else { gold += Math.round(st.gold * .5); virtue('jin', -1, `you robbed ${st.name}`); }
  let blade = null; if (!ownsSword(st.sword)) { const w = addSword(st.sword); blade = swordDef(st.sword); if (swordDmg(w) > swordDmg(eqSword())) S.eq = w.u; }
  if (bowed && clean) virtue('meiyo', 1, 'a clean, honorable win');
  const steel = ({ a: 3, keeper: 5, myth: 8 }[id] || 3) + c.i; S.steel = (S.steel || 0) + steel;
  const xpUp = ['power', 'speed', 'guard', 'vital'].filter(k => addSkillXP(k, id === 'a' ? 10 : 14)); // every duel on the road teaches a little of everything
  const mats = Object.entries(rollDrops(c.i, id === 'myth' ? 'myth' : id === 'keeper' ? 'boss' : 'fight')).map(([m, n]) => `<span class="chip">+${n} ${MATERIALS[m].n}</span>`).join('');
  S.gold += gold; S.wins++; coopEvent('win', { foe: st.name });
  const gifts = [];
  if (id === 'a') { J.jobs.a = 2; gifts.push(c.set + '-kote'); virtue('gi', 1, `you helped ${c.a.n}`); }
  if (id === 'keeper') { J.pass = true; gifts.push(c.set + '-do'); }
  if (id === 'myth') { J.myth = true; gifts.push(c.set + '-kabuto', c.set + '-menpo'); virtue('yu', 1, `you faced ${st.name}`); }
  save();
  const got = gifts.filter(g => givePiece(g, true));
  const line = id === 'keeper' ? c.keeper.win : id === 'a' ? (choice === 'spare' ? `${st.name} swears to do better. You will find them near ${c.a.n}: ${c.a.foe.job.toLowerCase()}.` : `${st.name} runs, empty-handed.`) : (choice === 'spare' ? `${st.name} bows its head. It will remember your mercy.` : `${st.name} fades back into the wild.`);
  openOverlay(`<div class="modal win"><div class="kicker">${choice === 'spare' ? 'Mercy' : 'Victory'}</div><p>${line}</p>
    <div class="rewards"><span class="chip gold"><i></i>+${gold}</span><span class="chip steel"><i></i>+${steel} steel</span>${mats}${xpUp.length ? `<span class="chip">${xpUp.map(k => SKILLS[k].n).join(', ')} level up!</span>` : ''}${blade ? `<span class="chip" style="color:${RAR[blade.r].c}">刀 ${blade.name}</span>` : ''}${got.map(g => `<span class="chip" style="color:${RAR[SETS[PIECES[g].set].r].c}">${PIECES[g].n}</span>`).join('')}</div>
    ${blade ? `<p class="muted">You won their blade, the <b>${blade.name}</b>. Your blades are in the Pack: tap the 刀 card.</p>` : ''}${got.length ? '<p class="muted">New armor went straight on. Open your Pack to see it.</p>' : ''}${choice === 'spare' ? `<p style="color:var(--jade)">${st.name} is now a friend. You will start every duel with ${Math.min(100, allies().length * 25)}% Spirit.</p>` : ''}${fullSet() ? `<p><span class="tag new">Full set</span> ${SETS[fullSet()].bonus}</p>` : ''}
    <div class="actions"><button class="btn primary" data-town="back">Back to town</button></div></div>`);
}

/* ---------- walking the town ---------- */
const TownMode = {
  name: 'explore',
  update(dt) {
    const T = TOWN; if (!T) return;
    TOWN_WIND.value += dt;
    coopTick(dt, T);
    if (T.paused && $('#overlay').hidden && $('#ui').hidden && !TITLE_UP) { T.stuck = (T.stuck || 0) + dt; if (T.stuck > 2.5) { T.paused = false; T.stuck = 0; } } else T.stuck = 0;
    if (T.paused) { T.P.update(dt); return; }
    if (T.W.doors) T.W.doors.visible = !S.town.pass;
    if (T.W.tick) T.W.tick(dt, T);
    ghostTick(dt, T); beastTick(dt, T);
    if (T.lapse) { // the night passes in a few seconds while the samurai waits
      const st = Math.min(T.lapse, dt * .28); T.day = (T.day + st) % 1; T.lapse -= st; T.joy = null; T.speed = 0; T.camYaw += dt * .12;
      if (T.lapse <= 1e-4) { T.lapse = 0; hint(''); sfx.taiko(1); S.town.day = T.day; save(); const f = T.lapseThen; T.lapseThen = null; if (f) f(); }
    }
    T.clock += dt; T.day = (T.day + dt / 300) % 1;
    let ix = 0, iy = 0;
    if (T.joy) { const dx = (T.joy.x - T.joy.ox) / 60, dy = (T.joy.y - T.joy.oy) / 60, m = Math.hypot(dx, dy), k = m > 1 ? 1 / m : 1; ix = dx * k; iy = -dy * k; }
    if (KEYS.w || KEYS.arrowup) iy = 1; if (KEYS.s || KEYS.arrowdown) iy = -1; if (KEYS.a || KEYS.arrowleft) ix = -1; if (KEYS.d || KEYS.arrowright) ix = 1;
    const mag = Math.min(1, Math.hypot(ix, iy)), fwd = new V3(Math.sin(T.camYaw), 0, Math.cos(T.camYaw)), right = new V3(-Math.cos(T.camYaw), 0, Math.sin(T.camYaw));
    if (mag > .05) {
      const dir = fwd.clone().multiplyScalar(iy).addScaledVector(right, ix).normalize();
      T.pos.addScaledVector(dir, (2.6 + 4.4 * mag) * mag * dt);
      let d = Math.atan2(dir.x, dir.z) - T.face; d = Math.atan2(Math.sin(d), Math.cos(d)); T.face += d * damp(10, dt);
      if (!T.look && iy > -.2) { let cd = T.face - T.camYaw; cd = Math.atan2(Math.sin(cd), Math.cos(cd)); T.camYaw += cd * damp(1.2, dt) * mag; }
    }
    T.speed = lerp(T.speed, mag, damp(8, dt));
    for (const o of T.W.obs) { const dx = T.pos.x - o.x, dz = T.pos.z - o.z, rr = o.r + .38, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); T.pos.x = o.x + dx / d * rr; T.pos.z = o.z + dz / d * rr; } }
    // the palisade, the lake, the peaks and the edge of the map
    const h = townH(T.pos.x, T.pos.z), gx = townRoadX(GATE_Z), wall = T.lastGood.z < GATE_Z - .5 && T.pos.z > GATE_Z - .9 && !(S.town.pass && Math.abs(T.pos.x - gx) < 2.6);
    const wallBack = T.lastGood.z > GATE_Z + .5 && T.pos.z < GATE_Z + .9 && !(Math.abs(T.pos.x - gx) < 2.6);
    if ((T.W.canWalk ? !T.W.canWalk(T.pos.x, T.pos.z, h, T) : h < (T.W.minH == null ? -.35 : T.W.minH)) || h > 15.5 || Math.abs(T.pos.x) > TOWN_R || Math.abs(T.pos.z) > TOWN_R - 2 || wall || wallBack) T.pos.copy(T.lastGood); else T.lastGood.copy(T.pos);
    T.pos.y = townH(T.pos.x, T.pos.z);
    if (S.town.pass && !S.town.done && T.pos.z > (townCfg().doneZ || GATE_Z + 5)) { S.town.done = true; S.far = Math.min(ROAD_OPEN - 1, Math.max(S.far || 0, S.cur + 1)); save(); virtue('chugi', 1, 'the letter moves on'); townDone(); }
    // walk animation
    const P = T.P; T.phase += T.speed * dt * (7 + 3 * T.speed);
    const st = .3 * T.speed * (T.lift > .3 ? 0 : 1), lift = .14 * T.speed * (T.lift > .3 ? 0 : 1);
    P.feet.L.set(.15, .035 + Math.max(0, Math.sin(T.phase)) * lift, Math.sin(T.phase) * st - .02); P.feet.R.set(-.15, .035 + Math.max(0, Math.sin(T.phase + Math.PI)) * lift, Math.sin(T.phase + Math.PI) * st + .02);
    P.crouch = -Math.abs(Math.sin(T.phase)) * .035 * T.speed; P.leanAdd = T.speed * .1; P.armSwing = -Math.sin(T.phase) * T.speed;
    P.root.position.copy(T.pos); if (T.lift) P.root.position.y += T.lift; P.root.rotation.y = T.face; P.update(dt);
    // travelers walk the road
    for (const w of T.walkers) {
      w.z += w.dir * w.spd * dt; if (w.z > GATE_Z - 6) w.dir = -1; if (w.z < -84) w.dir = 1;
      const x = townRoadX(w.z) + w.side, dP = Math.hypot(x - T.pos.x, w.z - T.pos.z), stop = dP < 1.6;
      if (stop) w.z -= w.dir * w.spd * dt;
      w.ph += dt * 6.5 * (stop ? 0 : 1); const R = w.rig, k = stop ? 0 : 1;
      R.root.position.set(x, townH(x, w.z), w.z); R.root.rotation.y = stop ? Math.atan2(T.pos.x - x, T.pos.z - w.z) : (w.dir > 0 ? Math.atan2(townRoadX(w.z + 1) - townRoadX(w.z), 1) : Math.atan2(townRoadX(w.z - 1) - townRoadX(w.z), -1));
      R.feet.L.set(.15, .035 + Math.max(0, Math.sin(w.ph)) * .1 * k, Math.sin(w.ph) * .22 * k); R.feet.R.set(-.15, .035 + Math.max(0, -Math.sin(w.ph)) * .1 * k, -Math.sin(w.ph) * .22 * k); R.armSwing = -Math.sin(w.ph) * .7 * k; R.leanAdd = stop ? .25 : .06;
      R.root.visible = dP < 110; if (dP < 70) R.update(dt);
    }
    packTick(dt, T);
    // people turn to face you; things glow and bob
    let near = null, nd = 1e9;
    for (const p of T.pois.slice()) {
      const d = Math.hypot(T.pos.x - p.x, T.pos.z - p.z);
      if (p.rig) { if (d < 9) { let dd = Math.atan2(T.pos.x - p.x, T.pos.z - p.z) - p.rig.root.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); p.rig.root.rotation.y += dd * damp(3, dt); } if (d < 70) p.rig.update(dt); p.lab.material.opacity = smooth(3, 7, d) * (1 - smooth(45, 60, d)); }
      if (p.m) { p.m.rotation.y += dt * 1.2; p.m.position.y = townH(p.x, p.z) + .55 + Math.sin(T.clock * 2 + p.x) * .08; }
      if (p.kind === 'ema' && d < p.r) { S.town.ema.push(+p.id.slice(3)); save(); T.grp.remove(p.m); T.pois = T.pois.filter(q => q !== p); FX.sparks(p.m.position, '#ffd98a', 30, 4); sfx.coin(); banner('Found!', `${townCfg().b.thing}: ${S.town.ema.length} of 3`); continue; }
      if (p.kind !== 'ema' && d < p.r && d < nd) { near = p; nd = d; }
    }
    if (near !== T.near) { T.near = near; const b = $('#actBtn'); if (near) { b.hidden = false; b.classList.remove('locked'); b.textContent = near.label ? near.label : near.kind === 'chest' ? 'Open the chest' : near.kind === 'mark' ? 'Face ' + townCfg().myth.n : 'Talk to ' + ((c => ({ guard: 'the ' + gateGuard().toLowerCase().replace('gate ', ''), keeper: c.keeper.n, a: c.a.n, smith: 'the armorer', b: c.b.n, foe: c.a.foe.n, myth: c.myth.n, 'friend:a': c.a.foe.n, 'friend:myth': c.myth.n, 'friend:keeper': c.keeper.n }[near.id] || ''))(townCfg())); } else b.hidden = true; }
    T.saveT += dt; if (T.saveT > 3) { T.saveT = 0; S.town.at = { x: T.pos.x, z: T.pos.z, yaw: T.face }; S.town.day = T.day; save(); }
    townSkyAndLight(dt); if (T.W.post) T.W.post(dt, T);
    $('#tInfo').innerHTML = `<b>${townCfg().n} · ${townClock()}</b>${esc(townObjective())}${coopLine()}`;
    // camera
    const tgt = T.pos.clone().add(new V3(0, 1.5, 0)), dist = VH > VW ? 6.2 : 5.2;
    let pos = tgt.clone().addScaledVector(fwd, -dist * Math.cos(T.camPitch)).add(new V3(0, dist * Math.sin(T.camPitch) + .4, 0));
    for (let k = 1; k <= 4; k++) { const pp = tgt.clone().lerp(pos, k / 4); if (townH(pp.x, pp.z) > pp.y - .4) { pos = tgt.clone().lerp(pos, (k - 1) / 4 + .05); pos.y = Math.max(pos.y, townH(pos.x, pos.z) + 1.2); break; } }
    const kk = T.clock < .1 ? 60 : 9; T.camPos.lerp(pos, damp(kk, dt)); T.camLook.lerp(tgt.clone().addScaledVector(fwd, 1.8), damp(kk, dt));
    const gy = Math.max(townH(T.camPos.x, T.camPos.z), -.75) + .5; if (T.camPos.y < gy) T.camPos.y = gy;
    if (T.cine) cineCam(T);
    CAM.position.copy(T.camPos); CAM.lookAt(T.camLook); CAM.fov = lerp(CAM.fov, 58, damp(6, dt)); CAM.updateProjectionMatrix(); FX.setScale(); applyShake(dt);
    hint(T.clock < 8 && !S.town.guard ? 'Drag on the left side to walk · drag on the right side to look around' : '');
  },
  drawStart() { return townEncDraw(); },
  slash(a, b, c, d) { townEncSlash(a, b, c, d); },
  down(px, py, id) { const T = TOWN; if (!T || T.paused) return; if (T.enc) return townEncPointer('down', px, py, id); if (px < VW * .45 && !T.joy) T.joy = { id, ox: px, oy: py, x: px, y: py }; else if (!T.look) T.look = { id, x: px, y: py }; },
  move(px, py, id) { const T = TOWN; if (!T) return; if (T.enc) return townEncPointer('move', px, py, id); if (T.joy && T.joy.id === id) { T.joy.x = px; T.joy.y = py; } else if (T.look && T.look.id === id) { T.camYaw -= (px - T.look.x) * .006; T.camPitch = clamp(T.camPitch + (py - T.look.y) * .003, .06, .8); T.look.x = px; T.look.y = py; } },
  up(id) { const T = TOWN; if (!T) return; if (T.enc) townEncPointer('up', 0, 0, id); if (T.joy && T.joy.id === id) T.joy = null; if (T.look && T.look.id === id) T.look = null; },
};
function townClock() { const h = (TOWN.day * 24 + 6) % 24; return h < 5 ? 'Night' : h < 8 ? 'Dawn' : h < 16 ? 'Day' : h < 19 ? 'Dusk' : 'Night'; }
const SKY_KEYS = [ // time of day: sky top / middle / horizon, fog, key light colour and strength, hemisphere strength
  [0, '#16335c', '#f2b98a', '#ffe0b8', '#e3c4b0', '#ffd0a0', .6, .7], [.12, '#1f4f8c', '#8fb4d6', '#e6eef2', '#b9c9dc', '#fff0dc', .95, .9], [.45, '#1f4f8c', '#8fb4d6', '#e6eef2', '#b9c9dc', '#fff0dc', .95, .9],
  [.56, '#2a2f66', '#e58a5a', '#ffd0a0', '#d9a892', '#ffb070', .6, .65], [.66, '#060a1e', '#1a2a55', '#2f3f6a', '#1e2848', '#9fb8ff', .32, .42], [.92, '#060a1e', '#1a2a55', '#2f3f6a', '#1e2848', '#9fb8ff', .32, .42], [1, '#16335c', '#f2b98a', '#ffe0b8', '#e3c4b0', '#ffd0a0', .6, .7]];
const _sk = [new COL(), new COL(), new COL(), new COL(), new COL(), new COL()];
function townSkyAndLight() {
  const T = TOWN, W = T.W, d = T.day; let i = 0; while (i < SKY_KEYS.length - 2 && d > SKY_KEYS[i + 1][0]) i++;
  const A = SKY_KEYS[i], B = SKY_KEYS[i + 1], t = smooth(A[0], B[0], d), u = W.sky.material.uniforms;
  u.top.value.set(A[1]).lerp(_sk[0].set(B[1]), t); u.mid.value.set(A[2]).lerp(_sk[1].set(B[2]), t); u.bot.value.set(A[3]).lerp(_sk[2].set(B[3]), t);
  W.scene.fog.color.set(A[4]).lerp(_sk[3].set(B[4]), t); W.scene.background.copy(W.scene.fog.color);
  W.key.color.set(A[5]).lerp(_sk[4].set(B[5]), t); W.key.intensity = lerp(A[6], B[6], t) * .72; W.hemi.intensity = lerp(A[7], B[7], t) * .56;
  const night = 1 - smooth(.3, .6, lerp(A[6], B[6], t)); u.stars.value = night > .5 ? 1 : 0;
  const ang = d * Math.PI * 2 - .3, sun = new V3(-Math.cos(ang) * .8, Math.max(.12, Math.sin(ang)) , .35).normalize(); u.sunDir.value.copy(night > .5 ? new V3(.5, .5, .3).normalize() : sun);
  W.key.position.copy(T.pos).addScaledVector(night > .5 ? new V3(.5, .8, .3).normalize() : new V3(sun.x, Math.max(.45, sun.y), sun.z).normalize(), 40); W.key.target.position.copy(T.pos); W.key.target.updateMatrixWorld();
  W.glows.forEach(g => { g.material.opacity = night * .75; });
  if (W.water) W.water.material.color.set(W.waterCol || '#4f86a8').lerp(_sk[5].set('#16284a'), night);
  W.snow.pts.position.set(CAM.position.x, CAM.position.y - 5, CAM.position.z);
}
function drawTownOverlay(c) {
  const T = TOWN; if (!T) return;
  if (T.joy) { const j = T.joy, dx = j.x - j.ox, dy = j.y - j.oy, m = Math.hypot(dx, dy), k = m > 60 ? 60 / m : 1; c.save(); c.fillStyle = 'rgba(255,255,255,.12)'; c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3; c.beginPath(); c.arc(j.ox, j.oy, 64, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,224,140,.85)'; c.beginPath(); c.arc(j.ox + dx * k, j.oy + dy * k, 28, 0, Math.PI * 2); c.fill(); c.restore(); }
  // a compass arrow toward the next thing to do
  const tg = townTarget(); if (!tg || T.paused) return;
  const dx = tg.x - T.pos.x, dz = tg.z - T.pos.z, dist = Math.hypot(dx, dz), a = Math.atan2(dx, dz) - T.camYaw, cx = VW - 70, cy = (parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0) + 96;
  c.save(); c.translate(cx, cy); c.beginPath(); c.arc(0, 0, 44, 0, Math.PI * 2); c.fillStyle = 'rgba(8,10,20,.6)'; c.fill(); c.strokeStyle = 'rgba(240,195,90,.6)'; c.lineWidth = 2; c.stroke();
  c.rotate(-a); c.beginPath(); c.moveTo(0, -30); c.lineTo(13, 8); c.lineTo(0, 0); c.lineTo(-13, 8); c.closePath(); c.fillStyle = '#ff7a5a'; c.fill(); c.restore();
  c.save(); c.font = "900 13px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 4; c.strokeText(Math.round(dist) + ' m', cx, cy + 62); c.fillText(Math.round(dist) + ' m', cx, cy + 62); c.restore();
}
function townDone() {
  const c = townCfg(), own = S.armor.owned.filter(id => PIECES[id].set === c.set).length, petals = `<div class="virt">${VIRTUES.map(([k, nm2, g]) => `<div class="petal ${S.virt[k] ? 'on' : ''}"><span>${g}</span><b>${nm2}</b><small>${S.virt[k] || 0}</small></div>`).join('')}</div>`;
  if (TOWN) TOWN.paused = true;
  if (c.last && !S.endSeen && !window.__noTut) { S.endSeen = true; save(); if (TOWN) TOWN.paused = false; return cineEnding(() => { if (TOWN) TOWN.paused = true; storyCards(STORY_END, () => townDone()); }); }
  if (c.last && TOWN) TOWN.W.fw = 30;
  if (c.last) return openOverlay(`<div class="modal win ending"><div class="eyebrow">Katana Legend II · The Tokaido Road</div><div class="kicker">The letter is delivered</div>
    <p>The palace gate closes behind you. In a hall of gold screens, Princess Hana places the letter in the Emperor's hands. Outside, every lantern in Kyoto is burning, and the first snow falls on Sanjo Bridge.</p>
    <p>${nm()} walked the whole Tokaido, about 500 km, with ${allies().length} friend${allies().length === 1 ? '' : 's'} made along the way. The war is over.</p>${petals}
    <p class="credits">A legend imagined by <b>Shep</b></p>
    <p class="muted" style="font-size:13px">Every town is still open from the Map: finish armor sets, face the beasts you skipped, and make more friends.</p>
    <div class="actions"><button class="btn primary" data-town="">Keep exploring</button></div></div>`);
  openOverlay(`<div class="modal win ending"><div class="eyebrow">${c.n} · station ${c.i + 2} of 8</div><div class="kicker">${c.n} is behind you</div>
    <p>${c.gate ? 'The ' + c.gate.place + ' is behind you' : 'The gate closes at your back'}. The road runs on toward <b>${TOWNS[c.i + 1].n}</b>: ${TOWNS[c.i + 1].sub.toLowerCase()}.</p>${petals}
    <p class="muted" style="font-size:13px">${SETS[c.set].n} set: ${own}/7 pieces${S.town.myth ? '' : ` · ${c.myth.n} still waits here`}. You can come back any time from the Map.</p>
    ${c.i + 1 < ROAD_OPEN ? '' : `<p class="muted">The road to ${TOWNS[c.i + 1].n} is still being built. It will open here when it is ready, and your samurai, armor and friends will be waiting.</p>`}
    <div class="actions">${c.i + 1 < ROAD_OPEN ? `<button class="btn primary" data-town="next">Travel on to ${TOWNS[c.i + 1].n}</button>` : ''}<button class="btn ${c.i + 1 < ROAD_OPEN ? '' : 'primary'}" data-town="">${c.i + 1 < ROAD_OPEN ? 'Stay in ' + c.n : 'Keep exploring ' + c.n}</button></div></div>`);
}

/* ---------- title: a new ronin, or a legend from the first game ---------- */
function showTitle2() {
  TITLE_UP = true; $('#ui').hidden = true;
  const t = $('#title');
  t.innerHTML = `<div class="ttl-inner"><div class="ttl-mark">道</div><h1>Katana Legend II</h1><div class="ttl-sub">The Tokaido Road · Hakone to Kyoto</div>
    ${S.started ? `<button class="btn primary ttl-go" data-title2="go">Continue as ${nm()}</button>` : `<button class="btn primary ttl-go" data-title2="${firstGameSave() ? 'bring' : 'import'}">${firstGameSave() ? 'Continue the legend of ' + esc(String(firstGameSave().name || 'Shep').slice(0, 14)) : 'Bring my legend from the first game'}</button><button class="btn ttl-go" data-title2="new" style="margin-top:10px">Start as a new ronin</button>`}
    <div class="ttl-who" style="margin-top:14px"><span><small>${ROAD_OPEN >= TOWNS.length ? 'The whole road is open, from Hakone to Kyoto.' : 'Early build: the road is open as far as ' + TOWNS[ROAD_OPEN - 1].n + '. The rest is being built.'} A legend imagined by Shep.</small></span></div></div>`;
  t.hidden = false; t.classList.remove('out');
}
function title2Click(a) {
  if (a === 'go' || a === 'new') {
    if (a === 'new' && !S.started) { const w = addSword('iron'); S.eq = w.u; S.gold = 150; }
    S.started = true; save(); closeOverlay(); TITLE_UP = false; sfx.taiko(1); const t = $('#title'); t.classList.add('out'); setTimeout(() => { t.hidden = true; }, 600);
    if (!S.town.intro) setTimeout(() => cineArrive(() => storyOpen(0)), 900);
    return true;
  }
  if (a === 'import') { $('#title').hidden = true; openOverlay(`<div class="modal" style="text-align:left"><h2>Bring your legend</h2><p class="muted">In the first game, open Settings, then Backup &amp; restore, then Copy backup code. Paste it here. Your name, wax seal, training and best blade come with you. The first game is not changed.</p><textarea class="bk-code" id="imp2" placeholder="KATANA1:…"></textarea><p class="bk-msg" id="imp2msg"></p><div class="actions"><button class="btn" data-title2="cancel">Cancel</button><button class="btn primary" data-title2="read">Bring my legend</button></div></div>`); return true; }
  if (a === 'bring') { const o = firstGameSave(); if (!o) return title2Click('import'); const r = importLegendSave(o); S.gold = 150; S.started = false; save(); $('#title').hidden = true;
    openOverlay(`<div class="modal win"><div class="kicker">Welcome back, ${esc(r.name)}</div><p>${r.blade ? `Your whole rack crosses over from the first game: <b>${r.blades}</b> blade${r.blades === 1 ? '' : 's'}${r.dyn ? `, ${r.dyn} of them <b style="color:#ffd27a">Dynasty</b> blades` : ''}. Your <b>${esc(r.blade)}</b> is in your hand, with ${r.lands} of seven lands engraved on its tang.` : 'Your name and seal cross over from the first game.'}</p><p class="muted">Heirloom blades are a little stronger than the same blade made here. On the Tokaido they wake as you travel and forge, always a little stronger than the best blade you have made here, never far beyond it. Your training begins again: this road has to be earned. Against a friend they fight at full strength. The first game is not changed.</p><div class="actions"><button class="btn primary" data-title2="go">Walk the Tokaido</button></div></div>`); return true; }
  if (a === 'cancel') { closeOverlay(); showTitle2(); return true; }
  if (a === 'read') {
    importLegend(($('#imp2') || {}).value).then(r => { S.gold = 150; S.started = false; save(); openOverlay(`<div class="modal win"><div class="kicker">Welcome back, ${esc(r.name)}</div><p>${r.blade ? `Your <b>${esc(r.blade)}</b> crosses over as an heirloom, with ${r.lands} of seven lands engraved on its tang.` : 'Your name and seal cross over.'}</p><div class="actions"><button class="btn primary" data-title2="go">Walk the Tokaido</button></div></div>`); })
      .catch(e => { const m = $('#imp2msg'); if (m) m.textContent = '⚠ ' + e.message; });
    return true;
  }
  return true;
}
function townBoot() {
  gearInit();
  $('#ui').hidden = true;
  startTown(true); showTitle2();
}
