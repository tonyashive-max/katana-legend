'use strict';
/* ===== The Journey Road: four lands strung like beads along one winding trail ===== */

const ROPE_W = 3.3, BRANCH_W = 2.3, NOOK_R = 3.8, CELL = 8, REACH = 24;

const BIOMES = [
  { name: 'Bamboo Village',
    sky: { top: '#2c2160', mid: '#ff9566', bot: '#ffcf8a', sunDir: [.18, .1, 1], sunCol: '#ffd9a0', sunDeg: 5.5, haze: .7, stars: 0 },
    fog: '#f0a07e', fogNear: 26, fogFar: 125,
    hemi: ['#ffd6b0', '#4a3a5a', .55], key: ['#ffe2c0', .76, [-.6, 1, -.4]], rim: ['#ff8a4a', .66, [.1, .5, 1]],
    g: { a: '#6f8a3c', b: '#8a9a48', path: '#c9a874', bead: '#d9c39a', rock: '#7a6a5a', rockAmt: .55, wall: 3.4, slope: .32 } },
  { name: 'Frozen Pass',
    sky: { top: '#0a1534', mid: '#5f84bf', bot: '#c2d6f0', sunDir: [-.35, .42, 1], sunCol: '#e8f2ff', sunDeg: 3, haze: .3, stars: 1 },
    fog: '#9fb8d8', fogNear: 22, fogFar: 115,
    hemi: ['#b8d4ff', '#4a5a7a', .58], key: ['#e6f0ff', .68, [-.5, 1, .6]], rim: ['#7fd8ff', .6, [.2, .6, 1]],
    g: { a: '#e9f1fa', b: '#cddcef', path: '#aebfd6', bead: '#d3e6f6', rock: '#6b7890', rockAmt: .5, wall: 5.5, slope: .42, snowCap: 1 } },
  { name: 'Shadow Castle',
    sky: { top: '#05030e', mid: '#3c1c62', bot: '#5b2a6c', sunDir: [-.4, .32, 1], sunCol: '#e3b8ff', sunDeg: 7, haze: .5, stars: 1 },
    fog: '#2b1842', fogNear: 18, fogFar: 100,
    hemi: ['#9a7acc', '#2a1a3a', .52], key: ['#d6c2ff', .56, [-.5, 1, .8]], rim: ['#ff7a4a', .54, [.3, .4, -1]],
    g: { a: '#3a3446', b: '#2c2838', path: '#5a5266', bead: '#5a5266', rock: '#24202c', rockAmt: .6, wall: 1.6, slope: .3, tiles: 1 } },
  { name: 'Dragon Peak',
    sky: { top: '#1a0507', mid: '#c2331a', bot: '#ff8a3a', sunDir: [-.25, .14, 1], sunCol: '#ffb070', sunDeg: 7, haze: .9, stars: 0 },
    fog: '#6a2010', fogNear: 20, fogFar: 115,
    hemi: ['#ff9a6a', '#3a0e08', .55], key: ['#ffd0a0', .64, [.6, 1, -.3]], rim: ['#ff5a1a', .78, [-.2, .3, 1]],
    g: { a: '#3a2a26', b: '#2a1e1c', path: '#4a3a36', bead: '#2a2026', rock: '#1e1416', rockAmt: .7, wall: 4.6, slope: .4, cracks: 1 } },
];

/* ---------- layout (deterministic) ---------- */
const dirv = h => new V3(Math.sin(h), 0, Math.cos(h));
const perpv = h => new V3(Math.cos(h), 0, -Math.sin(h));
function buildRopeLayout() {
  const rr = mulberry(20261019);
  const PLAN = ['entry', 'warrior', 'shrine', 'warrior', 'warrior', 'gate'];
  const RAD = { entry: 8.5, warrior: 9.5, shrine: 9.5, gate: 10.5, summit: 10, dojo: 9, training: 9.5 };
  const ctrl = [new V3(0, 0, -18), new V3(0, 0, -9)], beads = [];
  let pos = new V3(0, 0, 0), heading = 0, side = 1;
  ctrl.push(pos.clone());
  const step = (len) => {
    let nh = clamp(heading + (rr() * 2 - 1) * .95, -1.15, 1.15);
    if (Math.abs(nh - heading) < .25) nh = clamp(heading + (nh >= heading ? .35 : -.35), -1.15, 1.15);
    side = -side;
    const avg = (heading + nh) / 2, end = pos.clone().addScaledVector(dirv(avg), len);
    ctrl.push(pos.clone().lerp(end, .5).addScaledVector(perpv(avg), side * (2.5 + rr() * 4.5)));
    ctrl.push(end); pos = end; heading = nh;
  };
  beads.push({ ch: 0, kind: 'dojo', k: -2, wi: -1, x: pos.x, z: pos.z, r: RAD.dojo });
  step(28); beads.push({ ch: 0, kind: 'training', k: -1, wi: -1, x: pos.x, z: pos.z, r: RAD.training });
  for (let ch = 0; ch < 4; ch++) {
    let wi = 0;
    PLAN.forEach((kind, k) => {
      step(kind === 'entry' ? (ch === 0 ? 34 : 40) : 31 + rr() * 9);
      beads.push({ ch, kind, k, wi: kind === 'warrior' ? wi++ : -1, x: pos.x, z: pos.z, r: RAD[kind] });
    });
  }
  step(30); beads.push({ ch: 3, kind: 'summit', k: 6, wi: -1, x: pos.x, z: pos.z, r: RAD.summit });
  ctrl.push(pos.clone().addScaledVector(dirv(heading), 9));
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal', .5);
  const total = curve.getLength(), N = Math.ceil(total);
  const P = curve.getSpacedPoints(N), ds = total / N;
  const pts = P.map((p, i) => ({ x: p.x, z: p.z, s: i * ds }));
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
    p.tx = tx / l; p.tz = tz / l; p.nx = p.tz; p.nz = -p.tx;
  });
  const nearestI = (x, z) => { let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
  beads.forEach(b => { b.i = nearestI(b.x, b.z); b.s = pts[b.i].s; });
  const landBeads = ch => beads.filter(b => b.ch === ch && b.kind !== 'summit' && b.kind !== 'dojo' && b.kind !== 'training');
  const dojoBead = beads.find(b => b.kind === 'dojo'), trainBead = beads.find(b => b.kind === 'training');
  const bound = [0, 1, 2].map(ch => { const g = landBeads(ch)[5], e = landBeads(ch + 1)[0]; return (g.s + e.s) / 2; });
  const landStart = [0, bound[0], bound[1], bound[2]], landEnd = [bound[0], bound[1], bound[2], total];
  const gates = [0, 1, 2, 3].map(ch => {
    const g = landBeads(ch)[5], i = Math.min(N, Math.round((g.s + g.r - 1.6) / ds)), p = pts[i];
    return { ch, i, s: p.s, x: p.x, z: p.z, tx: p.tx, tz: p.tz, nx: p.nx, nz: p.nz };
  });
  const tutGate = (() => { const i = Math.min(N, Math.round((trainBead.s + trainBead.r - 1.4) / ds)), p = pts[i]; return { s: p.s, x: p.x, z: p.z, tx: p.tx, tz: p.tz, nx: p.nx, nz: p.nz }; })();
  const sAt = (b1, b2, f) => b1.s + (b2.s - b1.s) * f;
  const pAt = s => pts[clamp(Math.round(s / ds), 0, N)];
  // orb branches
  const branches = [], usedS = [];
  const farFromTrail = (x, z, baseS, len) => pts.every(p => Math.abs(p.s - baseS) < len + 10 || (p.x - x) ** 2 + (p.z - z) ** 2 > 13 * 13);
  const farFromBeads = (x, z) => beads.every(b => Math.hypot(b.x - x, b.z - z) > b.r + 9);
  for (let ch = 0; ch < 4; ch++) {
    const B = landBeads(ch), segs = [0, 1, 2, 3], skip = (rr() * 4) | 0;
    let made = 0, sd = rr() < .5 ? 1 : -1;
    for (const k of segs.filter(q => q !== skip).concat([skip])) {
      if (made >= 3) break;
      const baseS = sAt(B[k], B[k + 1], .42 + rr() * .16), p = pAt(baseS);
      let ok = null;
      for (const tryLen of [19, 15, 12]) for (const sgn of [sd, -sd]) {
        if (ok) break;
        const a = Math.PI / 2 - .35;
        const dirx = p.nx * sgn * Math.sin(a) + p.tx * Math.cos(a), dirz = p.nz * sgn * Math.sin(a) + p.tz * Math.cos(a);
        const ex = p.x + dirx * tryLen, ez = p.z + dirz * tryLen;
        if (farFromTrail(ex, ez, baseS, tryLen) && farFromBeads(ex, ez) && branches.every(b => Math.hypot(b.ex - ex, b.ez - ez) > 14)) ok = { ex, ez, sgn };
      }
      if (!ok) continue;
      const mx = (p.x + ok.ex) / 2 + p.tx * 3, mz = (p.z + ok.ez) / 2 + p.tz * 3;
      const path = []; for (let t = 0; t <= 1.0001; t += 1 / 14) { const u = 1 - t; path.push({ x: u * u * p.x + 2 * u * t * mx + t * t * ok.ex, z: u * u * p.z + 2 * u * t * mz + t * t * ok.ez }); }
      branches.push({ ch, k: made, baseS, bx: p.x, bz: p.z, ex: ok.ex, ez: ok.ez, path });
      usedS.push(baseS); made++; sd = -ok.sgn;
    }
  }
  const awayFrom = (s, list, gap) => list.every(u => Math.abs(u - s) > gap);
  // water / lava crossings with bridges
  const crossings = [];
  const addCross = (ch, b1, b2, f, kind) => {
    let s = sAt(b1, b2, f);
    for (let tries = 0; tries < 6 && !awayFrom(s, usedS, 10); tries++) s += 4;
    const p = pAt(s); crossings.push({ ch, kind, s, x: p.x, z: p.z, tx: p.tx, tz: p.tz, nx: p.nx, nz: p.nz }); usedS.push(s);
  };
  { const B = landBeads(0); addCross(0, B[2], B[3], .5, 'water'); }
  { const B = landBeads(2); addCross(2, B[0], B[1], .5, 'moat'); }
  { const B = landBeads(3); addCross(3, B[0], B[1], .55, 'lava'); addCross(3, B[3], B[4], .45, 'lava'); }
  // ghost spots
  const ghosts = [];
  for (let ch = 0; ch < 4; ch++) {
    const B = landBeads(ch);
    // two ghosts per land: a samurai who steals blades and a geisha who whisks you back down the road
    [[1, 2, .62], [3, 4, .5]].forEach(([a, b, f], k) => {
      let s = sAt(B[a], B[b], f);
      for (let tries = 0; tries < 6 && !awayFrom(s, usedS, 9); tries++) s += 3;
      const type = (ch % 2 === 0) === (k === 0) ? 'samurai' : 'geisha';
      const p = pAt(s); ghosts.push({ ch, k, s, x: p.x, z: p.z, type }); usedS.push(s);
    });
  }
  // torii gates spanning the trail
  const toriis = [];
  [[0, 0, 1, .7], [0, 3, 4, .3], [0, 4, 5, .72], [1, 0, 1, .35], [1, 3, 4, .7], [3, 5, 5, 0]].forEach(([ch, a, b, f]) => {
    const B = landBeads(ch); if (a === b) return;
    let s = sAt(B[a], B[b], f);
    for (let tries = 0; tries < 6 && !awayFrom(s, usedS, 8); tries++) s += 3;
    const p = pAt(s); toriis.push({ ch, s, x: p.x, z: p.z, tx: p.tx, tz: p.tz, nx: p.nx, nz: p.nz }); usedS.push(s);
  });
  // material nodes: common ones along the trail edges, rare ones in the orb nooks
  const nodes = [];
  const POOLS = [['ironsand', 'charcoal'], ['pineresin', 'frostcrystal'], ['lacquer', 'obsidian'], ['dragonscale', 'dragonscale']];
  const RARE = [['sakura', 'sakura', 'sakura'], ['stariron', 'frostcrystal', 'stariron'], ['moonsilver', 'obsidian', 'moonsilver'], ['embercore', 'phoenixash', 'embercore']];
  for (let ch = 0; ch < 4; ch++) {
    const B = landBeads(ch); let made = 0, guard = 0;
    while (made < 9 && guard++ < 200) {
      const s = B[0].s + rr() * (B[5].s - B[0].s), p = pAt(s), sd = rr() < .5 ? 1 : -1;
      if (!awayFrom(s, usedS, 5) || nodes.some(n => Math.abs(n.s - s) < 9)) continue;
      const x = p.x + p.nx * sd * (ROPE_W - .9), z = p.z + p.nz * sd * (ROPE_W - .9);
      nodes.push({ ch, k: made, s, x, z, mat: POOLS[ch][made % 2] }); made++;
    }
    branches.filter(b => b.ch === ch).forEach((b, i) => {
      const dx = b.ex - b.bx, dz = b.ez - b.bz, l = Math.hypot(dx, dz) || 1;
      nodes.push({ ch, k: 20 + i, s: b.baseS, x: b.ex + dx / l * 2.2, z: b.ez + dz / l * 2.2, mat: RARE[ch][i % 3], rare: true });
    });
  }
  { const p = pAt(dojoBead.s + 10); nodes.push({ ch: 0, k: 40, s: p.s, x: p.x + p.nx * (ROPE_W - .9), z: p.z + p.nz * (ROPE_W - .9), mat: 'ironsand', tut: true }); }
  const tutGhost = { ch: 0, k: 99, s: trainBead.s, x: trainBead.x, z: trainBead.z, tut: true };
  return { pts, ds, N, total, beads, bound, landStart, landEnd, gates, branches, crossings, ghosts, toriis, landBeads, nodes, dojoBead, trainBead, tutGate, tutGhost };
}

let ROPE = null;
function rope() {
  if (!ROPE) { ROPE = buildRopeLayout(); ropeIndex(); }
  return ROPE;
}

/* ---------- spatial index & distance queries ---------- */
function ropeIndex() {
  const R = ROPE, grid = new Map(), shapes = [];
  const reg = (sh, x0, z0, x1, z1) => {
    const ix0 = Math.floor((x0 - REACH) / CELL), ix1 = Math.floor((x1 + REACH) / CELL), iz0 = Math.floor((z0 - REACH) / CELL), iz1 = Math.floor((z1 + REACH) / CELL);
    for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) { const k = ix * 100003 + iz; let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(sh); }
    shapes.push(sh);
  };
  for (let i = 0; i < R.N; i++) {
    const a = R.pts[i], b = R.pts[i + 1];
    reg({ t: 0, ax: a.x, az: a.z, bx: b.x, bz: b.z, hw: ROPE_W, s0: a.s, s1: b.s, main: true }, Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z));
  }
  R.beads.forEach(b => reg({ t: 1, x: b.x, z: b.z, r: b.r, s0: b.s, s1: b.s, bead: b }, b.x - b.r, b.z - b.r, b.x + b.r, b.z + b.r));
  R.branches.forEach(br => {
    for (let i = 0; i < br.path.length - 1; i++) {
      const a = br.path[i], b = br.path[i + 1];
      reg({ t: 0, ax: a.x, az: a.z, bx: b.x, bz: b.z, hw: BRANCH_W, s0: br.baseS, s1: br.baseS, main: false, br }, Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z));
    }
    reg({ t: 1, x: br.ex, z: br.ez, r: NOOK_R, s0: br.baseS, s1: br.baseS, br }, br.ex - NOOK_R, br.ez - NOOK_R, br.ex + NOOK_R, br.ez + NOOK_R);
  });
  R.grid = grid; R.shapes = shapes;
}
const RQ = { d: 99, s: 0, dc: 99, cx: 0, cz: 0, rad: 0, sh: null, main: false };
function ropeQuery(x, z, limitS) {
  const R = ROPE, a = R.grid.get(Math.floor(x / CELL) * 100003 + Math.floor(z / CELL));
  RQ.d = 99; RQ.dc = 99; RQ.sh = null; RQ.main = false;
  let bestMain = 1e9, sBest = -1;
  if (a) for (let k = 0; k < a.length; k++) {
    const sh = a[k];
    if (limitS != null && sh.s0 > limitS) continue;
    let cx, cz, dist, rad, sv;
    if (sh.t === 0) {
      const dx = sh.bx - sh.ax, dz = sh.bz - sh.az, l = dx * dx + dz * dz;
      let t = l ? ((x - sh.ax) * dx + (z - sh.az) * dz) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      cx = sh.ax + dx * t; cz = sh.az + dz * t; rad = sh.hw; sv = sh.s0 + (sh.s1 - sh.s0) * t;
    } else { cx = sh.x; cz = sh.z; rad = sh.r; sv = sh.s0; }
    dist = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
    const sd = dist - rad;
    if (sd < RQ.d) { RQ.d = sd; RQ.cx = cx; RQ.cz = cz; RQ.rad = rad; RQ.sh = sh; RQ.main = !!sh.main; }
    if (sh.t === 0 && sh.main && dist < bestMain) { bestMain = dist; RQ.dc = dist; sBest = sv; }
    else if (sBest < 0 && sd < 1e9) sBest = sBest < 0 ? sv : sBest;
  }
  RQ.s = sBest < 0 ? 0 : sBest;
  return RQ;
}
function landWeights(s) {
  const B = ROPE.bound;
  for (let k = 0; k < 3; k++) if (Math.abs(s - B[k]) < 18) return { a: k, b: k + 1, t: smooth(B[k] - 18, B[k] + 18, s) };
  let L = 0; for (let k = 0; k < 3; k++) if (s > B[k]) L = k + 1;
  return { a: L, b: L, t: 0 };
}
function landOf(s) { const w = landWeights(s); return w.t < .5 ? w.a : w.b; }
const _ca = new COL(), _cb = new COL();
function blendHex(h1, h2, t, out) { return (out || new COL()).set(h1).lerp(_cb.set(h2), t); }
function crossInfo(x, z, c) { const dx = x - c.x, dz = z - c.z; return { along: dx * c.tx + dz * c.tz, lat: dx * c.nx + dz * c.nz }; }
function ropeHeight(x, z, q) {
  q = q || ropeQuery(x, z);
  let h;
  if (q.d <= 0) h = (q.sh && q.sh.t === 1) ? 0 : Math.sin(x * .21 + z * .17) * .03 + Math.sin(x * .07 - z * .11) * .03;
  else {
    const w = landWeights(q.s), A = BIOMES[w.a].g, B = BIOMES[w.b].g;
    const H = lerp(A.wall, B.wall, w.t), sl = lerp(A.slope, B.slope, w.t);
    h = smooth(0, 7, q.d) * H * (.6 + .8 * fbm(x * .06, z * .06)) + Math.min(Math.max(q.d - 7, 0), 17) * sl;
  }
  for (const c of ROPE.crossings) {
    const ci = crossInfo(x, z, c);
    if (Math.abs(ci.lat) < 70 && Math.abs(ci.along) < 3) h -= 1.05 * (1 - smooth(1.1, 2.5, Math.abs(ci.along)));
  }
  return h;
}
function ropeWalkHeight(x, z) {
  for (const c of ROPE.crossings) {
    const ci = crossInfo(x, z, c);
    if (Math.abs(ci.along) < 3.3 && Math.abs(ci.lat) < 2.2) return .1 + .42 * (1 - (ci.along / 3.3) ** 2);
  }
  return ropeHeight(x, z);
}

/* ---------- shared prop geometry ---------- */
let RG = null;
function ropeGeos() {
  if (RG) return RG;
  RG = {};
  RG.stalk = merge([P(GEO.cyl(.06, .07, 1, 7), '#6aa83a', [0, .5, 0])].concat([1, 2, 3, 4, 5, 6, 7].map(k => P(GEO.cyl(.074, .074, .018, 7), '#3f7a24', [0, k / 8, 0]))));
  RG.leaf = GEO.ico(1, 0);
  RG.blob = GEO.ico(1, 1);
  RG.cherryTrunk = merge([P(GEO.cyl(.16, .3, 3.2, 8), '#4a2c22', [0, 1.6, 0]), P(GEO.cyl(.08, .14, 2, 6), '#4a2c22', [.6, 3.2, 0], [0, 0, -.7]), P(GEO.cyl(.08, .14, 2, 6), '#4a2c22', [-.5, 3.3, .2], [.2, 0, .8])]);
  const blade = (rot, h, lean) => P(GEO.cone(.035, h, 4), '#3f6a22', [Math.sin(rot) * .05, h / 2, Math.cos(rot) * .05], [lean * Math.cos(rot), rot, -lean * Math.sin(rot)], null, (x, y) => new COL('#3f6a22').lerp(new COL('#b8d84a'), clamp((y + h / 2) / h, 0, 1)));
  RG.grass = merge([blade(0, .42, .25), blade(2.1, .34, .3), blade(4.2, .38, .2), blade(1.2, .3, .35), blade(3.3, .36, .28)]);
  RG.rock = GEO.dodec(1);
  RG.lantern = stoneLanternGeo('#9a9488');
  RG.lanternLight = GEO.box(.3, .26, .3);
  RG.house = merge([
    P(GEO.box(4, 2.2, 3), '#eadfc6', [0, 1.1, 0]), P(GEO.box(4.1, .18, 3.1), '#4a3020', [0, .09, 0]), P(GEO.box(4.06, .14, 3.06), '#4a3020', [0, 1.2, 0]),
    ...[-1.9, -.65, .65, 1.9].map(x => P(GEO.box(.14, 2.2, 3.06), '#4a3020', [x, 1.1, 0])),
    P(GEO.cone(3.5, 1.7, 4), '#2f3540', [0, 3.0, 0], [0, Math.PI / 4, 0], [1.35, 1, 1]), P(GEO.box(5.2, .16, .3), '#1e2228', [0, 3.82, 0]),
  ]);
  RG.pine = merge([
    P(GEO.cyl(.12, .2, 1.4, 6), '#4a3428', [0, .7, 0]),
    P(GEO.cone(1.6, 2.2, 8), '#1f4a3a', [0, 2.2, 0]), P(GEO.cone(1.45, .5, 8), '#f4f8ff', [0, 2.95, 0]),
    P(GEO.cone(1.25, 1.9, 8), '#235642', [0, 3.5, 0]), P(GEO.cone(1.1, .45, 8), '#f4f8ff', [0, 4.15, 0]),
    P(GEO.cone(.85, 1.6, 8), '#2a6048', [0, 4.7, 0]), P(GEO.cone(.55, .5, 8), '#f4f8ff', [0, 5.35, 0]),
  ]);
  RG.snowRock = merge([P(GEO.dodec(1), '#6b7890', [0, 0, 0], null, null, (x, y) => y > .35 ? new COL('#f4f8ff') : new COL('#6b7890'))]);
  RG.crystal = GEO.oct(1);
  RG.mound = GEO.sph(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  RG.wall = merge([P(GEO.box(4.4, 1.1, .9), '#5e5a66', [0, .55, 0]), P(GEO.box(4.2, 2, .5), '#ece4d4', [0, 2.1, 0]), P(GEO.box(4.8, .3, 1.3), '#1e2230', [0, 3.2, 0]), P(GEO.box(4.6, .25, .9), '#1e2230', [0, 3.45, 0])]);
  RG.darkHouse = merge([
    P(GEO.box(4, 2.4, 3.2), '#2a2430', [0, 1.2, 0]), ...[-1.8, 0, 1.8].map(x => P(GEO.box(.16, 2.4, 3.24), '#120e16', [x, 1.2, 0])),
    P(GEO.cone(3.4, 1.6, 4), '#15141c', [0, 3.1, 0], [0, Math.PI / 4, 0], [1.35, 1, 1]),
  ]);
  RG.mapleTrunk = merge([P(GEO.cyl(.14, .26, 2.8, 7), '#3a241c', [0, 1.4, 0]), P(GEO.cyl(.07, .12, 1.6, 6), '#3a241c', [.5, 2.8, 0], [0, 0, -.8])]);
  RG.post = merge([P(GEO.cyl(.07, .09, 3, 6), '#2a1d16', [0, 1.5, 0]), P(GEO.box(.7, .08, .08), '#2a1d16', [.3, 2.9, 0]), P(GEO.cyl(.18, .18, .4, 10), '#ff5a3a', [.6, 2.45, 0])]);
  RG.dead = merge([P(GEO.cyl(.08, .18, 2.6, 6), '#2a1a14', [0, 1.3, 0]), P(GEO.cyl(.04, .08, 1.3, 5), '#2a1a14', [.35, 2.2, 0], [0, 0, -.9]), P(GEO.cyl(.04, .07, 1.1, 5), '#2a1a14', [-.3, 1.8, .1], [.2, 0, .8])]);
  RG.spike = GEO.cone(1, 1, 5);
  RG.mountain = merge([P(GEO.cone(1, 1, 7, 4), '#ffffff', [0, .5, 0])]);
  RG.reed = merge([0, 1, 2, 3].map(i => P(GEO.cyl(.015, .02, .9, 4), '#6a8a3a', [Math.cos(i * 1.6) * .08, .45, Math.sin(i * 1.6) * .08], [Math.cos(i) * .15, 0, Math.sin(i) * .15])));
  return RG;
}
function waterMat(c1, c2) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, c1: { value: new COL(c1) }, c2: { value: new COL(c2) } }, fog: false, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform float time; uniform vec3 c1, c2; void main(){ float w = sin(vUv.y * 3.0 - time * 2.0 + sin(vUv.x * 9.0) * .8) * .5 + .5; float sp = step(.985, fract(sin(dot(floor(vUv * vec2(18.0, 6.0) + vec2(0.0, time * 1.5)), vec2(12.9, 78.2))) * 43758.5)); vec3 c = mix(c1, c2, w * .6) + sp * .6; float edge = smoothstep(0.0, .15, vUv.x) * smoothstep(1.0, .85, vUv.x); gl_FragColor = vec4(c, .88 * edge + .1); }',
  });
}

/* ---------- world construction ---------- */
let ROPE_WORLD = null;
function getRopeWorld() {
  if (ROPE_WORLD) return ROPE_WORLD;
  const R = rope(), G = ropeGeos();
  const W = newWorld('rope'); W.keep = true; W.chunks = []; W.tiles = []; W.obs = [];
  const scene = W.scene;
  W.hAt = ropeWalkHeight;
  // sky, fog, lights (blended every frame)
  W.sky = makeSky({ top: BIOMES[0].sky.top, mid: BIOMES[0].sky.mid, bot: BIOMES[0].sky.bot, sunDir: new V3().fromArray(BIOMES[0].sky.sunDir), sunCol: BIOMES[0].sky.sunCol, sunDeg: 5, stars: true, haze: .7 });
  scene.add(W.sky);
  scene.fog = new THREE.Fog(BIOMES[0].fog, 26, 125); scene.background = new COL(BIOMES[0].fog);
  W.hemi = new THREE.HemisphereLight('#ffffff', '#444444', .6); scene.add(W.hemi);
  W.key = new THREE.DirectionalLight('#ffffff', .8); W.key.castShadow = QUALITY.shadows;
  W.key.shadow.mapSize.set(QUALITY.pr > 1.4 ? 2048 : 1024, QUALITY.pr > 1.4 ? 2048 : 1024);
  const sc = W.key.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 2; sc.far = 60;
  W.key.shadow.bias = -.0006; W.key.shadow.normalBias = .02;
  scene.add(W.key, W.key.target);
  W.rim = new THREE.DirectionalLight('#ffffff', .6); scene.add(W.rim, W.rim.target);
  // chunks along the trail
  const CHL = 40, nCh = Math.ceil(R.total / CHL) + 1;
  for (let i = 0; i < nCh; i++) { const g = new THREE.Group(); scene.add(g); const p = R.pts[Math.min(R.N, Math.round((i + .5) * CHL / R.ds))]; W.chunks.push({ g, x: p.x, z: p.z }); }
  const chunkOf = s => W.chunks[clamp(Math.floor(s / CHL), 0, nCh - 1)];
  const buckets = new Map();
  const put = (type, s, item) => { const c = chunkOf(s); const key = type + '|' + W.chunks.indexOf(c); let b = buckets.get(key); if (!b) buckets.set(key, b = { type, c, list: [] }); b.list.push(item); };
  buildTerrain(W);
  const rr = mulberry(77);
  const land = ch => ({ s0: R.landStart[ch] - 18, s1: R.landEnd[ch] + 18 });
  const wOf = (ch, s) => { const w = landWeights(s); return (w.a === ch ? 1 - w.t : 0) + (w.b === ch ? w.t : 0); };
  // scatter props at a distance band (outside = positive d) from the walkable shape
  const scat = (ch, n, d0, d1, cb, opt) => {
    opt = opt || {};
    const L = land(ch); let made = 0, guard = 0;
    while (made < n && guard++ < n * 25) {
      const s = L.s0 + rr() * (L.s1 - L.s0); if (s < 0 || s > R.total) continue;
      if (rr() > wOf(ch, s)) continue;
      const p = R.pts[clamp(Math.round(s / R.ds), 0, R.N)], sd = rr() < .5 ? 1 : -1, off = rr() * (d1 + ROPE_W + 10);
      const x = p.x + p.nx * sd * off + (rr() - .5) * 6, z = p.z + p.nz * sd * off + (rr() - .5) * 6;
      const q = ropeQuery(x, z);
      if (q.d < d0 || q.d > d1) continue;
      if (opt.noPath && q.main && q.dc < 2) continue;
      if (R.crossings.some(c => { const ci = crossInfo(x, z, c); return Math.abs(ci.along) < 3 && Math.abs(ci.lat) < 40; })) continue;
      cb(x, z, rr(), q.s, q.d); made++;
    }
  };
  const hy = (x, z) => ropeHeight(x, z);
  const C = {
    stalkGreens: ['#7bc043', '#5e9e34', '#8fd14f', '#4f8f2c', '#a4c65a'], pinks: ['#ffb7d0', '#ff9ec4', '#ffd0e0', '#ff8fbf'],
    maples: ['#d6341f', '#ff5a2a', '#e8451f', '#ff8a2a', '#b8241a'],
  };
  /* --- Land 0: bamboo village --- */
  scat(0, 1150, .6, 17, (x, z, k, s) => {
    const h = 6 + k * 6; put('stalk', s, { p: [x, hy(x, z), z], r: [(k - .5) * .12, k * 9, (rr() - .5) * .12], s: [1 + rr() * .6, h, 1 + rr() * .6], c: pick(C.stalkGreens) });
    if (rr() < .4) put('leaf', s, { p: [x + (rr() - .5) * 1.2, hy(x, z) + h * (.75 + rr() * .3), z + (rr() - .5) * 1.2], r: [0, rr() * 6, 0], s: [1.1 + rr(), .35 + rr() * .2, 1.1 + rr()], c: pick(['#3f7a24', '#5a9a30', '#2f6a20']) });
  });
  scat(0, 34, 1.2, 9, (x, z, k, s) => cherry(x, z, k, s));
  function cherry(x, z, k, s) {
    const sc = .8 + k * .6, y = hy(x, z);
    put('cherryTrunk', s, { p: [x, y, z], r: [0, k * 6, 0], s: sc });
    for (let i = 0; i < 6; i++) put('blob', s, { p: [x + (rr() - .5) * 3.2 * sc, y + (3.6 + rr() * 1.4 - .3) * sc, z + (rr() - .5) * 3.2 * sc], r: [rr() * 3, rr() * 3, 0], s: (1.1 + rr() * .7) * sc, c: pick(C.pinks) });
  }
  scat(0, 3200, -2.6, 5, (x, z, k, s) => put('grass', s, { p: [x, hy(x, z), z], r: [0, k * 6, 0], s: .7 + k * .9 }), { noPath: true });
  scat(0, 520, -2.4, 4, (x, z, k, s) => put('flower', s, { p: [x, hy(x, z) + .32, z], s: .05 + k * .03, c: pick(['#ffffff', '#ffd6e8', '#ffe27a', '#ff9ec4']) }), { noPath: true });
  scat(0, 80, .4, 10, (x, z, k, s) => put('rock', s, { p: [x, hy(x, z), z], r: [k * 3, k * 5, 0], s: [.4 + k * 1.1, .3 + k * .7, .4 + k], c: shadeHex('#8a8478', (rr() - .5) * .2) }));
  { const B = R.landBeads(0); [B[0], B[1]].forEach(b => { for (let i = 0; i < 4; i++) { const a = rr() * 6.28; const x = b.x + Math.cos(a) * (b.r + 6 + rr() * 5), z = b.z + Math.sin(a) * (b.r + 6 + rr() * 5); const q = ropeQuery(x, z); if (q.d < 3) continue; put('house', b.s, { p: [x, hy(x, z), z], r: [0, Math.atan2(b.x - x, b.z - z), 0], s: 1.15 }); } }); }
  /* --- Land 1: frozen pass --- */
  scat(1, 700, .8, 19, (x, z, k, s) => put('pine', s, { p: [x, hy(x, z), z], r: [0, k * 6, 0], s: .9 + k * 1.1 }));
  scat(1, 110, .2, 12, (x, z, k, s) => put('snowRock', s, { p: [x, hy(x, z) + .1, z], r: [k * 3, k * 5, 0], s: [.5 + k * 1.4, .35 + k * .8, .5 + k * 1.2] }));
  scat(1, 60, .8, 9, (x, z, k, s) => { for (let i = 0; i < 3; i++) put('crystal', s, { p: [x + rnd(-.5, .5), hy(x, z) + .3, z + rnd(-.5, .5)], r: [rnd(-.4, .4), rnd(0, 3), rnd(-.4, .4)], s: [.25 + k * .2, .8 + k * 1.6, .25 + k * .2] }); });
  scat(1, 110, -1.8, 6, (x, z, k, s) => put('mound', s, { p: [x, hy(x, z) - .05, z], s: [.5 + k * 1.2, .2 + k * .35, .5 + k] }), { noPath: true });
  /* --- Land 2: shadow castle town --- */
  for (let i = 0; i < R.N; i += 4) {
    const p = R.pts[i]; if (wOf(2, p.s) < .5) continue;
    if (R.beads.some(b => Math.hypot(b.x - p.x, b.z - p.z) < b.r + 3.5)) continue;
    if (R.branches.some(b => Math.abs(b.baseS - p.s) < 5)) continue;
    if (R.crossings.some(c => Math.abs(c.s - p.s) < 6)) continue;
    for (const sd of [-1, 1]) {
      const x = p.x + p.nx * sd * (ROPE_W + 1.4), z = p.z + p.nz * sd * (ROPE_W + 1.4);
      if (ropeQuery(x, z).d < .6) continue;
      put('wall', p.s, { p: [x, hy(x, z) - .1, z], r: [0, Math.atan2(p.tx, p.tz) + Math.PI / 2, 0] });
    }
  }
  scat(2, 34, 6, 15, (x, z, k, s) => put('darkHouse', s, { p: [x, hy(x, z), z], r: [0, k * 6, 0], s: 1.1 }));
  scat(2, 46, 1, 9, (x, z, k, s) => {
    const sc = .9 + k * .5, y = hy(x, z); put('mapleTrunk', s, { p: [x, y, z], r: [0, k * 6, 0], s: sc });
    for (let i = 0; i < 6; i++) put('blob', s, { p: [x + (rr() - .5) * 2.8 * sc, y + (3.2 + rr() * 1.2 - .2) * sc, z + (rr() - .5) * 2.8 * sc], r: [rr() * 3, rr() * 3, 0], s: (1 + rr() * .6) * sc, c: pick(C.maples) });
  });
  scat(2, 60, .3, 11, (x, z, k, s) => put('rock', s, { p: [x, hy(x, z), z], r: [k * 3, k * 5, 0], s: [.4 + k, .3 + k * .6, .4 + k], c: shadeHex('#3a3446', (rr() - .5) * .3) }));
  /* --- Land 3: dragon peak --- */
  scat(3, 150, .8, 15, (x, z, k, s) => put('dead', s, { p: [x, hy(x, z), z], r: [0, k * 6, rnd(-.1, .1)], s: .8 + k * .7 }));
  scat(3, 220, .4, 17, (x, z, k, s) => put('spike', s, { p: [x, hy(x, z) + .5 * (1 + k * 2), z], r: [rnd(-.2, .2), k * 4, rnd(-.2, .2)], s: [.3 + k * .6, 1 + k * 2, .3 + k * .6], c: shadeHex('#1e1424', (rr() - .5) * .3) }));
  scat(3, 150, .2, 12, (x, z, k, s) => put('rock', s, { p: [x, hy(x, z), z], r: [k * 3, k * 4, 0], s: [.5 + k * 1.6, .4 + k * 1.1, .5 + k * 1.4], c: shadeHex('#2a1e1c', (rr() - .5) * .3) }));
  /* --- distant mountains along the whole road --- */
  for (let ch = 0; ch < 4; ch++) {
    const cols = [['#6a4a7a', '#b06a7a'], ['#4d6188', '#f4f8ff'], ['#1c1430', '#3a2650'], ['#2a1210', '#5a1e14']][ch];
    let made = 0, guard = 0;
    while (made < 30 && guard++ < 600) {
      const s = R.landStart[ch] + rr() * (R.landEnd[ch] - R.landStart[ch]), p = R.pts[clamp(Math.round(s / R.ds), 0, R.N)], sd = rr() < .5 ? 1 : -1, off = 55 + rr() * 60;
      const x = p.x + p.nx * sd * off, z = p.z + p.nz * sd * off;
      if (R.pts.some(q => (q.x - x) ** 2 + (q.z - z) ** 2 < 40 * 40)) continue;
      const k = rr(), h = 18 + k * 34;
      put('mountain', s, { p: [x, -2, z], r: [0, k * 6, 0], s: [h * (.8 + rr() * .5), h, h * (.8 + rr() * .5)], c: pick(cols) }); made++;
    }
  }
  /* --- stone lanterns along the trail edges --- */
  let lside = 1;
  for (let s = 6; s < R.total - 6; s += 15) {
    const p = R.pts[Math.round(s / R.ds)], ch = landOf(s);
    if (ch === 2 || R.beads.some(b => Math.hypot(b.x - p.x, b.z - p.z) < b.r + 2)) continue;
    if (R.crossings.some(c => Math.abs(c.s - s) < 6) || R.branches.some(b => Math.abs(b.baseS - s) < 4) || R.toriis.some(t => Math.abs(t.s - s) < 4)) continue;
    lside = -lside;
    const x = p.x + p.nx * lside * (ROPE_W - .45), z = p.z + p.nz * lside * (ROPE_W - .45), y = hy(x, z);
    put('lantern', s, { p: [x, y, z], r: [0, rr() * 3, 0] });
    put('lanternLight', s, { p: [x, y + 1.36, z], s: 1.02, c: ch === 1 ? '#ffb860' : ch === 3 ? '#ff8a3a' : '#ffcf7a' });
    const h = halo(ch === 1 ? '#ffb860' : '#ffcf7a', 2, .6); h.position.set(x, y + 1.36, z); chunkOf(s).g.add(h);
    W.obs.push({ x, z, r: .45 });
  }
  /* castle lantern posts */
  for (let s = 4; s < R.total; s += 9) {
    if (wOf(2, s) < .6) continue;
    const p = R.pts[Math.round(s / R.ds)];
    if (R.beads.some(b => Math.hypot(b.x - p.x, b.z - p.z) < b.r + 1) || R.crossings.some(c => Math.abs(c.s - s) < 5)) continue;
    for (const sd of [-1, 1]) {
      const x = p.x + p.nx * sd * (ROPE_W - .3), z = p.z + p.nz * sd * (ROPE_W - .3), y = hy(x, z);
      put('post', s, { p: [x, y, z], r: [0, Math.atan2(-p.nx * sd, -p.nz * sd) + Math.PI / 2, 0] });
      const lx = x - p.nx * sd * .6, lz = z - p.nz * sd * .6;
      const h = halo('#ff6a3a', 1.4, .7); h.position.set(lx, y + 2.45, lz); chunkOf(s).g.add(h);
      W.obs.push({ x, z, r: .3 });
    }
  }
  /* torii gates spanning the trail */
  R.toriis.forEach(t => {
    const m = new THREE.Mesh(toriiGeo(t.ch === 3 ? '#b8221a' : '#d7372b', '#1c1416'), toon({ vertexColors: true }));
    const sc = (ROPE_W + .7) / 2;
    m.position.set(t.x, ropeHeight(t.x, t.z) - .05, t.z); m.rotation.y = Math.atan2(t.nx, t.nz) + Math.PI / 2; m.scale.setScalar(sc); m.castShadow = true;
    chunkOf(t.s).g.add(m);
    for (const sd of [-1, 1]) W.obs.push({ x: t.x + t.nx * sd * 2 * sc, z: t.z + t.nz * sd * 2 * sc, r: .32 * sc });
  });
  /* crossings: water, moat, lava, with bridges */
  R.crossings.forEach(c => {
    const g = chunkOf(c.s).g, lava = c.kind === 'lava';
    const pts = [-60, 0, 60].map(l => new V3(c.x + c.nx * l, -.42, c.z + c.nz * l));
    const mat = lava ? lavaMat() : c.kind === 'moat' ? waterMat('#1a1430', '#4a3a7a') : waterMat('#2f8fc8', '#8fe0ff');
    const rib = new THREE.Mesh(ribbon(pts, 2.9), mat); g.add(rib);
    W.updaters.push((dt, t) => { mat.uniforms.time.value = t; });
    if (lava) for (let l = -24; l <= 24; l += 12) { const h = halo('#ff6a1a', 5, .35); h.position.set(c.x + c.nx * l, .1, c.z + c.nz * l); g.add(h); }
    // arched bridge deck along the trail
    const deck = new THREE.BoxGeometry(4.2, .16, 6.8, 1, 1, 14), pa = deck.attributes.position;
    for (let i = 0; i < pa.count; i++) { const zz = pa.getZ(i); pa.setY(i, pa.getY(i) + .1 + .42 * (1 - (zz / 3.4) ** 2) - .08); }
    deck.computeVertexNormals();
    const wood = lava ? '#4a3a36' : c.kind === 'moat' ? '#3a2a22' : '#8a5a34';
    const bridge = new THREE.Group(); bridge.position.set(c.x, 0, c.z); bridge.rotation.y = Math.atan2(c.tx, c.tz); g.add(bridge);
    const dm = new THREE.Mesh(deck, toon({ color: wood })); dm.castShadow = true; dm.receiveShadow = true; bridge.add(dm);
    dm.add(new THREE.Mesh(deck, outlineMat(.02)));
    const rail = [];
    for (const sx of [-2, 2]) for (let k = -3; k <= 3; k += 1.5) { const yy = .1 + .42 * (1 - (k / 3.4) ** 2); rail.push(P(GEO.box(.14, .7, .14), lava ? '#2a1e1c' : '#c0392b', [sx, yy + .3, k])); }
    for (const sx of [-2, 2]) rail.push(P(GEO.box(.1, .1, 6.6), lava ? '#2a1e1c' : '#c0392b', [sx, .95, 0]));
    const rm = new THREE.Mesh(merge(rail), toon({ vertexColors: true })); rm.castShadow = true; bridge.add(rm);
    // banks: rocks and reeds that keep you on the bridge
    for (const sd of [-1, 1]) for (const l of [2.7, 3.6, 4.5]) {
      const x = c.x + c.nx * sd * l, z = c.z + c.nz * sd * l;
      W.obs.push({ x, z, r: .62 });
      put(lava ? 'spike' : 'reed', c.s, lava ? { p: [x, .2, z], r: [0, rr() * 3, 0], s: [.4, 1.1, .4], c: '#2a1a1c' } : { p: [x, -.3, z], r: [0, rr() * 3, 0], s: 1.2 });
      put('rock', c.s, { p: [x + c.tx * (rr() - .5), -.1, z + c.tz * (rr() - .5)], r: [rr() * 3, rr() * 3, 0], s: [.55, .45, .55], c: lava ? '#2a1e1c' : '#7a7468' });
    }
  });
  /* warrior bead arenas */
  R.beads.forEach(b => {
    const g = chunkOf(b.s).g, B = BIOMES[b.ch].g;
    if (b.kind === 'warrior' || b.kind === 'gate' || b.kind === 'summit' || b.kind === 'training') {
      const disc = new THREE.CircleGeometry(b.r - .4, 64); disc.rotateX(-Math.PI / 2);
      const pa = disc.attributes.position, col = new Float32Array(pa.count * 3), ca = new COL(B.bead), cb = shadeHex(B.bead, -.12), tt = new COL();
      for (let i = 0; i < pa.count; i++) { const rr2 = Math.hypot(pa.getX(i), pa.getZ(i)); tt.copy(ca).lerp(cb, (Math.sin(rr2 * 4) * .5 + .5) * .7); col[i * 3] = tt.r; col[i * 3 + 1] = tt.g; col[i * 3 + 2] = tt.b; }
      disc.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(disc, toon({ vertexColors: true })); m.position.set(b.x, .03, b.z); m.receiveShadow = true; g.add(m);
    }
    // stone ring with gaps where the trail enters and leaves
    const gaps = [];
    R.pts.forEach(p => { const d = Math.hypot(p.x - b.x, p.z - b.z); if (Math.abs(d - b.r) < .8) gaps.push(Math.atan2(p.z - b.z, p.x - b.x)); });
    R.branches.forEach(br => br.path.forEach(p => { const d = Math.hypot(p.x - b.x, p.z - b.z); if (Math.abs(d - b.r) < 1.2) gaps.push(Math.atan2(p.z - b.z, p.x - b.x)); }));
    const gw = (ROPE_W + .4) / b.r;
    const stoneC = b.ch === 1 ? '#5d6b80' : b.ch === 2 ? '#4a4356' : b.ch === 3 ? '#2a2026' : '#8a8478';
    const n = Math.round(b.r * 5.2);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      if (gaps.some(gA => Math.abs(Math.atan2(Math.sin(a - gA), Math.cos(a - gA))) < gw)) continue;
      const x = b.x + Math.cos(a) * (b.r + .3), z = b.z + Math.sin(a) * (b.r + .3);
      put('rock', b.s, { p: [x, hy(x, z) + .05, z], r: [rr() * 3, rr() * 3, 0], s: [.32 + rr() * .1, .2 + rr() * .1, .32 + rr() * .1], c: shadeHex(stoneC, (rr() - .5) * .25) });
    }
    if ((b.ch === 2 || b.ch === 3) && (b.kind === 'warrior' || b.kind === 'gate')) {
      [[.7, .45], [-.7, .45], [.7, -.45], [-.7, -.45]].forEach(([u, v]) => {
        const p = R.pts[b.i]; const x = b.x + (p.nx * u + p.tx * v) * b.r, z = b.z + (p.nz * u + p.tz * v) * b.r;
        brazier(W, x, z, b.ch === 3 ? '#ff6a1a' : '#ff8a2a');
      });
    }
    if (b.kind === 'shrine' && b.ch === 1) {
      const ice = new THREE.Mesh(new THREE.CircleGeometry(b.r - .6, 48).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#cfefff', emissive: '#2a6a9a', emissiveIntensity: .25, shininess: 90, specular: '#ffffff', transparent: true, opacity: .9 }));
      ice.position.set(b.x, .07, b.z); ice.receiveShadow = true; g.add(ice);
    }
  });
  /* the dojo at the start of the road, and the training grounds */
  {
    const db = R.dojoBead, p0 = R.pts[0], dx = p0.x - db.x, dz = p0.z - db.z, l = Math.hypot(dx, dz) || 1;
    const x = db.x + dx / l * (db.r + 3.5), z = db.z + dz / l * (db.r + 3.5), face = Math.atan2(db.x - x, db.z - z);
    const dojo = merge([
      P(GEO.box(9, .5, 7), '#6a5a52', [0, .25, 0]), P(GEO.box(8, 3.2, 6), '#eadfc6', [0, 2.1, 0]),
      ...[-3.8, -1.3, 1.3, 3.8].map(xx => P(GEO.box(.3, 3.2, 6.1), '#4a2e1a', [xx, 2.1, 0])),
      P(GEO.box(2.4, 2.6, .2), '#3a2214', [0, 1.8, 3.02]),
      P(GEO.cone(6.4, 2.6, 4), '#2f3540', [0, 4.9, 0], [0, Math.PI / 4, 0], [1.45, 1, 1.1]),
      P(GEO.box(10, .3, .5), '#1e2228', [0, 6.2, 0]), P(GEO.box(1.8, .9, .15), '#f2e6c8', [0, 3.6, 3.08]),
    ]);
    const m = new THREE.Mesh(dojo, toon({ vertexColors: true })); m.position.set(x, ropeHeight(x, z), z); m.rotation.y = face; m.castShadow = true;
    chunkOf(0).g.add(m); R.dojoPos = { x, z, face };
    const sign = labelSprite('DOJO', '#2a1200'); sign.position.set(x + Math.sin(face) * 3.2, m.position.y + 3.6, z + Math.cos(face) * 3.2); sign.scale.set(1.6, .5, 1); chunkOf(0).g.add(sign);
    W.obs.push({ x, z, r: 3.6 });
    const tb = R.trainBead, tp = R.pts[tb.i];
    [[.62, .4], [-.62, .4], [.62, -.4], [-.62, -.4]].forEach(([u, v]) => {
      const px = tb.x + (tp.nx * u + tp.tx * v) * tb.r, pz = tb.z + (tp.nz * u + tp.tz * v) * tb.r;
      const d = new THREE.Mesh(merge([P(GEO.cyl(.03, .03, 1.1, 6), '#4a2e1a', [0, .55, 0]), P(GEO.cyl(.09, .09, .9, 10), '#d8c48a', [0, 1.4, 0]), P(GEO.box(.6, .07, .07), '#4a2e1a', [0, 1.55, 0])]), toon({ vertexColors: true }));
      d.position.set(px, ropeHeight(px, pz), pz); d.castShadow = true; chunkOf(tb.s).g.add(d); W.obs.push({ x: px, z: pz, r: .3 });
    });
  }
  /* landmarks: castle keep, volcano, summit pagoda, the sky dragon */
  {
    const gb = R.landBeads(2)[5], p = R.pts[gb.i];
    let best = null;
    for (const sd of [-1, 1]) { const x = gb.x + p.nx * sd * 30 + p.tx * 6, z = gb.z + p.nz * sd * 30 + p.tz * 6, q = ropeQuery(x, z); if (!best || q.d > best.d) best = { x, z, d: q.d }; }
    const wall = '#ece4d4', roof = '#1e2230', gold = '#e0b440', stone = '#5e5a66', keep = [P(GEO.cyl(9, 11, 5, 4, 1), stone, [0, 2.5, 0], [0, Math.PI / 4, 0])];
    let y = 5;
    [[12, 3.4], [9.6, 3], [7.4, 2.8], [5.2, 2.6]].forEach(([w, h]) => { keep.push(P(GEO.box(w * .8, h, w * .7), wall, [0, y + h / 2, 0])); keep.push(P(GEO.cyl(w * .25, w * .8, 1.3, 4), roof, [0, y + h + .5, 0], [0, Math.PI / 4, 0], [1, 1, .9])); for (const sx of [-1, 1]) keep.push(P(GEO.box(.5, .5, .5), gold, [sx * w * .32, y + h + 1.15, 0])); y += h + 1.1; });
    keep.push(P(GEO.box(1.2, .9, .5), gold, [0, y + .3, 0]));
    const km = new THREE.Mesh(merge(keep), toon({ vertexColors: true })); km.position.set(best.x, ropeHeight(best.x, best.z) - 1, best.z); km.rotation.y = Math.atan2(gb.x - best.x, gb.z - best.z); km.scale.setScalar(1.2); chunkOf(gb.s).g.add(km);
    const wins = []; for (let k = 0; k < 18; k++) wins.push({ p: [best.x + rnd(-3, 3), km.position.y + rnd(7, 19), best.z + rnd(-3, 3)], s: [.6, .7, .6] });
    chunkOf(gb.s).g.add(inst(GEO.box(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffb35a' }), wins));
  }
  const summit = R.beads.find(b => b.kind === 'summit');
  {
    const p = R.pts[summit.i], vx = summit.x + p.tx * 120 + p.nx * 40, vz = summit.z + p.tz * 120 + p.nz * 40;
    const volc = new THREE.Mesh(merge([P(GEO.cyl(8, 60, 70, 12, 4, false), '#2a1410', [0, 35, 0], null, null, (x, y) => y > 30 ? new COL('#ff5a1a') : new COL('#2a1410').lerp(new COL('#4a1a12'), (y + 35) / 70))]), toon({ vertexColors: true, flatShading: true }));
    volc.position.set(vx, -4, vz); scene.add(volc); W.volcano = volc;
    const vg = halo('#ff7a2a', 70, .8); vg.position.set(vx, 70, vz); scene.add(vg);
    W.updaters.push((dt, t) => { if (X && X.land < 2) return; vg.material.opacity = .7 + Math.sin(t * 1.7) * .1; if (Math.random() < dt * 6) FX.norm.emit(vx + rnd(-4, 4), 68, vz + rnd(-4, 4), rnd(-.5, 1.5), rnd(4, 7), rnd(-.5, .5), rnd(6, 9), 8, 26, '#3a2222', .55, -.2, .2); });
    const pag = [];
    [[6, 1.6], [4.6, 1.4], [3.4, 1.3], [2.2, 1.2]].forEach(([w, h], i) => { const y = i * 2.4; pag.push(P(GEO.box(w * .55, 2, w * .55), '#c0392b', [0, y + 1, 0])); pag.push(P(GEO.cone(w * .75, h, 4), '#1a1218', [0, y + 2.3, 0], [0, Math.PI / 4, 0])); });
    pag.push(P(GEO.cyl(.08, .08, 2.4, 6), '#e0b440', [0, 11, 0]));
    const pm = new THREE.Mesh(merge(pag), toon({ vertexColors: true })); const ang = Math.atan2(p.tx, p.tz);
    pm.position.set(summit.x + p.tx * 5, 0, summit.z + p.tz * 5); pm.rotation.y = ang; pm.castShadow = true; chunkOf(summit.s).g.add(pm);
    W.obs.push({ x: pm.position.x, z: pm.position.z, r: 2.4 });
    // the sky dragon circles the summit
    const N = 34, segGeo = merge([P(GEO.ico(1, 1), '#d2301a', [0, 0, 0], null, [1, .9, 1.25], (x, y) => y < -.35 ? new COL('#ffc24a') : new COL('#d2301a')), P(GEO.cone(.35, 1, 4), '#ffb21a', [0, 1.05, 0])]);
    const dragon = new THREE.InstancedMesh(segGeo, toon({ vertexColors: true, flatShading: true }), N); dragon.frustumCulled = false; scene.add(dragon);
    const cx = summit.x + p.tx * 60, cz = summit.z + p.tz * 60;
    const dpos = (t, i) => new V3(cx + Math.sin(t * .2 - i * .09) * 55, 38 + Math.sin(t * .5 - i * .25) * 7, cz + Math.cos(t * .2 - i * .09) * 40);
    const dp = [];
    W.updaters.push((dt, t) => {
      dragon.visible = !X || X.land >= 2; if (!dragon.visible) return;
      for (let i = 0; i < N; i++) dp[i] = dpos(t, i);
      for (let i = 0; i < N; i++) { _io.position.copy(dp[i]); _io.quaternion.setFromUnitVectors(_t2.set(0, 1, 0), _t3.subVectors(i ? dp[i - 1] : dpos(t + .1, 0), dp[i]).normalize()); const s = 2.4 * (1 - i / N * .75); _io.scale.set(s, s, s); _io.updateMatrix(); dragon.setMatrixAt(i, _io.matrix); }
      dragon.instanceMatrix.needsUpdate = true;
    });
  }
  /* clouds over each land */
  for (let ch = 0; ch < 4; ch++) {
    const col = ['#ffb59a', '#8fa6d6', '#4a2a6a', '#5a1a12'][ch], list = [];
    for (let i = 0; i < 9; i++) {
      const s = R.landStart[ch] + rr() * (R.landEnd[ch] - R.landStart[ch]), p = R.pts[clamp(Math.round(s / R.ds), 0, R.N)], sd = rr() < .5 ? 1 : -1, off = 70 + rr() * 90;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, color: col, transparent: true, opacity: .75, depthWrite: false, fog: false }));
      sp.position.set(p.x + p.nx * sd * off, 45 + rr() * 35, p.z + p.nz * sd * off); sp.scale.set(90 + rr() * 100, 40 + rr() * 35, 1); sp.renderOrder = -5;
      scene.add(sp); list.push(sp);
    }
  }
  /* aurora over the frozen pass */
  {
    const am = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { time: { value: 0 }, fade: { value: 0 }, c1: { value: new COL('#3dffb0') }, c2: { value: new COL('#a46bff') } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec2 vUv; uniform float time, fade; uniform vec3 c1, c2; void main(){ float w = sin(vUv.x * 11.0 + time * .5) * .5 + .5; float w2 = sin(vUv.x * 29.0 - time * 1.2) * .5 + .5; float a = smoothstep(0.0, .25, vUv.y) * smoothstep(1.0, .35, vUv.y) * (.3 + .7 * w) * (.55 + .45 * w2) * fade; vec3 c = mix(c1, c2, vUv.y); gl_FragColor = vec4(c * a, a * .8); }',
    });
    const B = R.landBeads(1), mid = B[2];
    for (let k = 0; k < 2; k++) {
      const g = new THREE.PlaneGeometry(320, 50, 60, 1), pa = g.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * .025 + k * 2) * 30);
      const m = new THREE.Mesh(g, am); m.position.set(mid.x + 60 + k * 40, 75 + k * 12, mid.z + 120 + k * 30); m.rotation.x = -.35; scene.add(m);
    }
    W.aurora = am; W.updaters.push((dt, t) => { am.uniforms.time.value = t; });
  }
  /* ambient particles that follow the traveller */
  W.amb = [
    new Ambient({ n: 360, tex: TEX.petal, color: '#ffb7d0', color2: '#ff8fbf', size: .085, cx: 0, cy: 4, cz: 0, ax: 13, ay: 4.5, az: 13, sway: .7, vel: r => [.4 + r() * .5, -.5 - r() * .4, -.1 + r() * .2] }),
    new Ambient({ n: 700, tex: TEX.flake, color: '#ffffff', color2: '#cfe6ff', size: .05, alpha: .9, cx: 0, cy: 5, cz: 0, ax: 14, ay: 6, az: 14, sway: .5, vel: r => [.2 + r() * .3, -.8 - r() * .7, -.1 + r() * .2] }),
    new Ambient({ n: 160, tex: TEX.petal, color: '#ff4a2a', color2: '#ffa02a', size: .1, cx: 0, cy: 4, cz: 0, ax: 12, ay: 4, az: 12, sway: .8, vel: r => [.3 + r() * .4, -.6 - r() * .4, (r() - .5) * .2], seed: 19 }),
    new Ambient({ n: 320, tex: TEX.glow, color: '#ffb03a', color2: '#ff4a1a', size: .07, alpha: 1, blending: THREE.AdditiveBlending, cx: 0, cy: 4, cz: 0, ax: 12, ay: 5, az: 12, sway: .6, twinkle: 3, vel: r => [(r() - .5) * .4, .6 + r() * 1.1, (r() - .5) * .4], seed: 23 }),
  ];
  W.fireflies = new Ambient({ n: 120, tex: TEX.glow, color: '#d8ff7a', color2: '#ffe27a', size: .09, alpha: 1, blending: THREE.AdditiveBlending, cx: 0, cy: 2, cz: 0, ax: 12, ay: 2, az: 12, sway: .5, twinkle: 2.2, vel: r => [(r() - .5) * .3, (r() - .5) * .15, (r() - .5) * .3], seed: 17 });
  W.ambient = W.amb.concat([W.fireflies]);
  // build instanced meshes per chunk
  const MATS = {};
  const mat = (k, f) => MATS[k] || (MATS[k] = f());
  const spec = {
    stalk: [G.stalk, () => toon({ vertexColors: true }), true], leaf: [G.leaf, () => toon({ flatShading: true }), false],
    cherryTrunk: [G.cherryTrunk, () => toon({ vertexColors: true }), true], blob: [G.blob, () => toon({ flatShading: true }), true],
    grass: [G.grass, () => toon({ vertexColors: true }), false], flower: [GEO.ico(1, 0), () => new THREE.MeshBasicMaterial({ color: '#ffffff' }), false],
    rock: [G.rock, () => toon({ flatShading: true }), true], house: [G.house, () => toon({ vertexColors: true }), true],
    pine: [G.pine, () => toon({ vertexColors: true, flatShading: true }), true], snowRock: [G.snowRock, () => toon({ vertexColors: true, flatShading: true }), true],
    crystal: [G.crystal, () => toon({ color: '#9fe8ff', emissive: new COL('#2a7fa8'), emissiveIntensity: .6, transparent: true, opacity: .9, flatShading: true }), false],
    mound: [G.mound, () => toon({ color: '#f2f7fd' }), false], wall: [G.wall, () => toon({ vertexColors: true }), true],
    darkHouse: [G.darkHouse, () => toon({ vertexColors: true }), true], mapleTrunk: [G.mapleTrunk, () => toon({ vertexColors: true }), true],
    post: [G.post, () => toon({ vertexColors: true }), true], dead: [G.dead, () => toon({ vertexColors: true }), true],
    spike: [G.spike, () => toon({ flatShading: true }), true], mountain: [G.mountain, () => toon({ flatShading: true }), false],
    lantern: [G.lantern, () => toon({ vertexColors: true, flatShading: true }), true], lanternLight: [G.lanternLight, () => new THREE.MeshBasicMaterial({ color: '#ffffff' }), false],
    reed: [G.reed, () => toon({ vertexColors: true }), false],
  };
  buckets.forEach(b => {
    const sp = spec[b.type]; if (!sp) return;
    const m = inst(sp[0], mat(b.type, sp[1]), b.list, sp[2] && QUALITY.shadows);
    if (b.type === 'mountain') { m.receiveShadow = false; }
    cullable(m, sp[0], b.list);
    b.c.g.add(m);
  });
  ROPE_WORLD = W;
  return W;
}

/* Give an instanced mesh a bounding sphere around all of its instances so the camera and shadow passes can skip it. */
function cullable(m, geo, list) {
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const g = new THREE.BufferGeometry();
  for (const k in geo.attributes) g.setAttribute(k, geo.attributes[k]);
  if (geo.index) g.setIndex(geo.index);
  const c = new V3(); list.forEach(it => c.add(_t1.fromArray(it.p))); c.divideScalar(Math.max(1, list.length));
  let r = 0; const gr = geo.boundingSphere.radius + geo.boundingSphere.center.length();
  list.forEach(it => { const sc = it.s == null ? 1 : typeof it.s === 'number' ? it.s : Math.max(it.s[0], it.s[1], it.s[2]); r = Math.max(r, c.distanceTo(_t1.fromArray(it.p)) + gr * sc); });
  g.boundingSphere = new THREE.Sphere(c, r);
  m.geometry = g; m.frustumCulled = true;
}

/* ---------- terrain tiles ---------- */
function buildTerrain(W) {
  const R = ROPE, T = 40, RES = 1.25, n = Math.round(T / RES);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  R.pts.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
  R.branches.forEach(b => { x0 = Math.min(x0, b.ex); x1 = Math.max(x1, b.ex); z0 = Math.min(z0, b.ez); z1 = Math.max(z1, b.ez); });
  x0 -= 56; x1 += 56; z0 -= 56; z1 += 56;
  const mat = toon({ vertexColors: true, flatShading: true });
  const tmp = new COL(), c2 = new COL(), white = new COL('#ffffff'), crack = new COL('#7a2a10');
  for (let tx = Math.floor(x0 / T) * T; tx < x1; tx += T) for (let tz = Math.floor(z0 / T) * T; tz < z1; tz += T) {
    let near = false;
    for (let i = 0; i <= 4 && !near; i++) for (let j = 0; j <= 4 && !near; j++) if (ropeQuery(tx + i * T / 4, tz + j * T / 4).d < REACH) near = true;
    if (!near) continue;
    const g = new THREE.PlaneGeometry(T, T, n, n); g.rotateX(-Math.PI / 2); g.translate(tx + T / 2, 0, tz + T / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), q = ropeQuery(x, z), d = q.d, dc = q.dc, main = q.main, s = q.s;
      const h = ropeHeight(x, z, q); pos.setY(i, h);
      const w = landWeights(s), A = BIOMES[w.a].g, B = BIOMES[w.b].g;
      const nz = fbm(x * .11 + 10, z * .11);
      tmp.set(A.a).lerp(c2.set(A.b), smooth(.3, .7, nz));
      if (w.t > 0) { _ca.set(B.a).lerp(c2.set(B.b), smooth(.3, .7, nz)); tmp.lerp(_ca, w.t); }
      if (d <= .2) {
        const tiles = lerp(A.tiles ? 1 : 0, B.tiles ? 1 : 0, w.t);
        if (tiles > .5) tmp.multiplyScalar(((Math.floor(x / 1.6) + Math.floor(z / 1.6)) & 1) ? 1.1 : .9);
        if (main && dc < 2.1) { blendHex(A.path, B.path, w.t, _ca); tmp.lerp(_ca, (1 - smooth(1.3, 2.1, dc)) * .9); }
        else if (q.sh && q.sh.t === 1 && q.sh.bead) { blendHex(A.bead, B.bead, w.t, _ca); tmp.lerp(_ca, .5); }
        else if (q.sh && !q.main && q.sh.br) { blendHex(A.path, B.path, w.t, _ca); tmp.lerp(_ca, .45); }
      } else {
        blendHex(A.rock, B.rock, w.t, _ca);
        tmp.lerp(_ca, smooth(2.5, 10, d) * lerp(A.rockAmt, B.rockAmt, w.t) * (.6 + .5 * nz));
        const snow = lerp(A.snowCap ? 1 : 0, B.snowCap ? 1 : 0, w.t);
        if (snow > 0 && h > 3) tmp.lerp(white, smooth(3, 6, h) * snow);
        const cr = lerp(A.cracks ? 1 : 0, B.cracks ? 1 : 0, w.t);
        if (cr > 0 && nz > .66) tmp.lerp(crack, (nz - .66) * 2.4 * cr);
      }
      for (const c of R.crossings) { const ci = crossInfo(x, z, c); if (Math.abs(ci.along) < 2.6 && Math.abs(ci.lat) < 70) tmp.lerp(c2.set(c.kind === 'lava' ? '#2a120c' : '#5a5040'), .6); }
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; W.scene.add(m);
    W.tiles.push({ m, x: tx + T / 2, z: tz + T / 2 });
  }
}

/* ---------- per-frame blending of sky, light, fog and weather ---------- */
const _sv = new V3(), _sv2 = new V3();
/* per-land colour grade for the post pass: warm sunset, crisp snow (less bloom on white), moody castle, hot volcano */
const LAND_GRADE = [
  { bloom: .9, th: .6, sat: 1.14, con: 1.05, vig: .3, tint: [1.03, 1, .96] },
  { bloom: .55, th: .78, sat: 1.08, con: 1.06, vig: .28, tint: [.97, 1, 1.04] },
  { bloom: 1.1, th: .5, sat: 1.18, con: 1.08, vig: .42, tint: [1, .97, 1.05] },
  { bloom: 1.05, th: .55, sat: 1.15, con: 1.07, vig: .38, tint: [1.05, .98, .94] },
];
function updateRopeWorld(W, px, pz, s) {
  const w = landWeights(s), A = BIOMES[w.a], B = BIOMES[w.b], t = w.t, U = W.sky.material.uniforms;
  { const ga = LAND_GRADE[w.a], gb = LAND_GRADE[w.b], g = W.grade || (W.grade = { tint: [1, 1, 1] });
    for (const k of ['bloom', 'th', 'sat', 'con', 'vig']) g[k] = lerp(ga[k], gb[k], t);
    for (let i = 0; i < 3; i++) g.tint[i] = lerp(ga.tint[i], gb.tint[i], t); }
  U.top.value.set(A.sky.top).lerp(_cb.set(B.sky.top), t);
  U.mid.value.set(A.sky.mid).lerp(_cb.set(B.sky.mid), t);
  U.bot.value.set(A.sky.bot).lerp(_cb.set(B.sky.bot), t);
  U.sunCol.value.set(A.sky.sunCol).lerp(_cb.set(B.sky.sunCol), t);
  U.sunDir.value.fromArray(A.sky.sunDir).lerp(_sv.fromArray(B.sky.sunDir), t).normalize();
  U.sunSize.value = Math.cos(lerp(A.sky.sunDeg, B.sky.sunDeg, t) * Math.PI / 180);
  U.stars.value = lerp(A.sky.stars, B.sky.stars, t) > .5 ? 1 : 0;
  U.haze.value = lerp(A.sky.haze, B.sky.haze, t);
  W.scene.fog.color.set(A.fog).lerp(_cb.set(B.fog), t); W.scene.background.copy(W.scene.fog.color);
  W.scene.fog.near = lerp(A.fogNear, B.fogNear, t); W.scene.fog.far = lerp(A.fogFar, B.fogFar, t);
  W.hemi.color.set(A.hemi[0]).lerp(_cb.set(B.hemi[0]), t); W.hemi.groundColor.set(A.hemi[1]).lerp(_cb.set(B.hemi[1]), t); W.hemi.intensity = lerp(A.hemi[2], B.hemi[2], t);
  W.key.color.set(A.key[0]).lerp(_cb.set(B.key[0]), t); W.key.intensity = lerp(A.key[1], B.key[1], t);
  _sv.fromArray(A.key[2]).lerp(_sv2.fromArray(B.key[2]), t).normalize();
  W.key.position.set(px + _sv.x * 25, _sv.y * 25, pz + _sv.z * 25); W.key.target.position.set(px, 0, pz);
  W.rim.color.set(A.rim[0]).lerp(_cb.set(B.rim[0]), t); W.rim.intensity = lerp(A.rim[1], B.rim[1], t);
  _sv.fromArray(A.rim[2]).lerp(_sv2.fromArray(B.rim[2]), t).normalize(); W.rim.position.set(px + _sv.x * 20, _sv.y * 20, pz + _sv.z * 20); W.rim.target.position.set(px, 0, pz);
  const wl = ch => (w.a === ch ? 1 - t : 0) + (w.b === ch ? t : 0);
  W.amb.forEach((a, i) => { a.o.cx = px; a.o.cz = pz; a.mat.uniforms.fade.value = wl(i); a.pts.visible = wl(i) > .02; });
  W.fireflies.o.cx = px; W.fireflies.o.cz = pz; W.fireflies.mat.uniforms.fade.value = wl(2); W.fireflies.pts.visible = wl(2) > .02;
  if (W.aurora) W.aurora.uniforms.fade.value = wl(1);
  const R2 = 155 * 155;
  W.chunks.forEach(c => { c.g.visible = (c.x - px) ** 2 + (c.z - pz) ** 2 < R2; });
  W.tiles.forEach(c => { c.m.visible = (c.x - px) ** 2 + (c.z - pz) ** 2 < 175 * 175; });
}
