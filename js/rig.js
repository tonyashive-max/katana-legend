'use strict';
/* ===== Procedural cel-shaded samurai: modeling, IK animation, limb detachment ===== */

const _t1 = new V3(), _t2 = new V3(), _t3 = new V3(), _t4 = new V3(), _tm = new THREE.Matrix4();
const _qa = new V3(), _qb = new V3(), _qc = new V3();
function quatFromDir(dir, edge, out) {
  const y = _qa.copy(dir).normalize();
  const z = _qb.copy(edge); z.addScaledVector(y, -z.dot(y));
  if (z.lengthSq() < 1e-6) { z.set(0, 0, 1).addScaledVector(y, -y.z); if (z.lengthSq() < 1e-6) z.set(1, 0, 0); }
  z.normalize();
  const x = _qc.crossVectors(y, z).normalize();
  _tm.makeBasis(x, y, z);
  return (out || new Q4()).setFromRotationMatrix(_tm);
}
function orientLimb(obj, from, to, hint) {
  obj.position.copy(from);
  const y = _t1.subVectors(from, to); const len = y.length(); if (len < 1e-5) return; y.divideScalar(len);
  const x = _t2.crossVectors(hint, y); if (x.lengthSq() < 1e-4) x.crossVectors(_t3.set(1, 0, 0), y); if (x.lengthSq() < 1e-4) x.crossVectors(_t3.set(0, 0, 1), y);
  x.normalize();
  const z = _t3.crossVectors(x, y);
  _tm.makeBasis(x, y, z); obj.quaternion.setFromRotationMatrix(_tm);
}
const _sd = new V3(), _sp = new V3();
function solve2(S, T, a, b, pole, outE, outT) {
  const d = _sd.subVectors(T, S); let dist = d.length(); d.divideScalar(dist || 1);
  dist = clamp(dist, 0.03, a + b - 0.003);
  const cosA = clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const po = _sp.copy(pole).addScaledVector(d, -pole.dot(d)); if (po.lengthSq() < 1e-6) po.set(0, -1, 0); po.normalize();
  outE.copy(S).addScaledVector(d, a * cosA).addScaledVector(po, a * sinA);
  outT.copy(S).addScaledVector(d, dist);
}
function bezier3(a, c, b, t, out) { const u = 1 - t; return out.set(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y, u * u * a.z + 2 * u * t * c.z + t * t * b.z); }

/* Grip poses in chest space (+z toward the opponent, character's right is -x).
   p = grip point, d = blade direction, e = which way the cutting edge faces. */
const POSES = {
  guard:   { p: [-0.04, -0.12, 0.34], d: [0.06, 0.75, 0.66], e: [0, -1, 0.3] },
  fpGuard: { p: [-0.27, 0.02, 0.4], d: [0.12, 0.93, 0.32], e: [0.3, -0.3, 0.9] },
  rest:    { p: [-0.22, -0.36, 0.14], d: [-0.12, -0.45, 0.9], e: [0, -1, 0] },
  show:    { p: [-0.12, 0.48, 0.12], d: [0.05, 1, 0.08], e: [0, 0, 1] },
  windR:   { p: [-0.32, 0.22, 0.12], d: [-0.35, 0.8, -0.45], e: [0.6, 0, 0.8] },
  windL:   { p: [0.32, 0.22, 0.12], d: [0.35, 0.8, -0.45], e: [-0.6, 0, 0.8] },
  windH:   { p: [0, 0.4, 0.1], d: [0, 0.55, -0.85], e: [0, 0.4, 1] },
  windLow: { p: [-0.36, -0.28, 0.05], d: [-0.8, -0.35, -0.45], e: [0.4, 0, 1] },
  endR:    { p: [0.28, -0.32, 0.42], d: [0.7, -0.35, 0.6], e: [0.5, -0.6, 0.3] },
  endL:    { p: [-0.28, -0.32, 0.42], d: [-0.7, -0.35, 0.6], e: [-0.5, -0.6, 0.3] },
  endH:    { p: [0, -0.3, 0.48], d: [0, -0.25, 0.97], e: [0, -1, 0.1] },
  endLow:  { p: [0.34, -0.36, 0.4], d: [0.85, -0.2, 0.45], e: [0.5, 0, -0.3] },
  blockR:  { p: [-0.28, -0.02, 0.3], d: [-0.15, 0.95, 0.25], e: [0, 0, 1] },
  blockL:  { p: [0.28, -0.02, 0.3], d: [0.15, 0.95, 0.25], e: [0, 0, 1] },
  blockH:  { p: [-0.25, 0.34, 0.3], d: [1, 0.12, 0.1], e: [0, 1, 0] },
  blockLow:{ p: [-0.22, -0.3, 0.36], d: [0.55, -0.78, 0.2], e: [0, 0, 1] },
  blockMid:{ p: [-0.18, 0.06, 0.36], d: [1, 0.3, 0.25], e: [0, 0, 1] },
  stagger: { p: [-0.1, -0.38, 0.2], d: [0.3, -0.8, 0.5], e: [0, -0.2, 1] },
  chiburi: { p: [-0.34, 0.08, 0.32], d: [-0.5, 0.25, 0.83], e: [-0.2, -1, 0] },
  chiburi2:{ p: [-0.42, -0.2, 0.3], d: [-0.62, -0.45, 0.64], e: [0, -1, -0.2] },
  iaiHigh: { p: [-0.3, 0.3, 0.3], d: [-0.6, 0.6, 0.5], e: [0.3, 0.4, 0.86] },
};
const SLIDE_OUT = .45, SLIDE_IN = .55;
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _dv = new V3(), _dq = new Q4(), _ds = new V3();
const _pv = new V3(), _pe = new V3();
function poseQuat(P, out) { return quatFromDir(_pv.fromArray(P.d), _pe.fromArray(P.e), out); }

/* ---------- sword model ---------- */
function bladeShape(L, w, c) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.quadraticCurveTo(w / 2 - c * 0.3, L * 0.6, -c + w * 0.18, L);
  s.lineTo(-c - w * 0.32, L * 0.94);
  s.quadraticCurveTo(-w / 2 - c * 0.35, L * 0.55, -w / 2, 0);
  return s;
}
function buildClub(def) {
  const g = new THREE.Group();
  const items = [
    P(GEO.cyl(.02, .022, .28, 8), def.wrap, [0, -.14, 0]),
    P(GEO.cyl(.032, .032, .03, 8), def.tsuba, [0, 0, 0]),
    P(GEO.cyl(.085, .045, .92, 8, 4), def.blade, [0, .48, 0]),
    P(GEO.cyl(.09, .09, .04, 8), def.edge, [0, .9, 0]),
  ];
  for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + i * .5, y = .2 + i * .13, r = .05 + i * .006;
    items.push(P(GEO.cone(.016, .05, 5), def.edge, [Math.cos(a) * r, y, Math.sin(a) * r], [0, -a, Math.PI / 2, 'YXZ']));
  }
  const geo = merge(items), mat = toon({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.add(new THREE.Mesh(geo, outlineMat(.005)));
  g.add(mesh); g.userData.len = .95; g.userData.mat = mat;
  return g;
}
function buildSword(def, opt) {
  opt = opt || {};
  if (def.club) return buildClub(def);
  const g = new THREE.Group();
  const L = def.id === 'rusty' ? .58 : .78, w = def.wood ? .036 : .033, c = def.wood ? .02 : .036;
  const bladeCol = new COL(def.blade), edgeCol = new COL(def.edge), spine = shadeHex(def.blade, -.35);
  const depth = .0075;
  const bg = new THREE.ExtrudeGeometry(bladeShape(L, w, c), { depth, bevelEnabled: true, bevelThickness: .0018, bevelSize: .0016, bevelSegments: 1, curveSegments: 10 });
  const cf = (x, y) => {
    const t = (x + w / 2 + c * Math.pow(y / L, 2)) / w;
    if (def.wood) return bladeCol.clone().lerp(edgeCol, clamp(t, 0, 1) * .5);
    return t > .62 ? edgeCol : (t < .18 ? spine : bladeCol);
  };
  const handleLight = def.wood ? shadeHex(def.wrap, .1) : new COL('#e9e0c8');
  const items = [
    P(GEO.cyl(.017, .019, .25, 8, 12), def.wrap, [0, -.135, 0], null, [1, 1, .82], (x, y, z) => {
      if (def.wood) return new COL(def.wrap);
      const a = Math.atan2(x, z); const k = Math.floor(y * 46 + a * 1.27) % 2;
      return k ? new COL(def.wrap) : handleLight;
    }),
    P(GEO.cyl(.021, .02, .026, 10), def.tsuba, [0, -.272, 0], null, [1, 1, .82]),
    P(GEO.cyl(.046, .046, .009, 18), def.tsuba, [0, 0, 0], null, [1, 1, .78]),
    P(GEO.box(.012, .03, .036), def.wood ? def.tsuba : '#d9b25a', [0, .02, 0]),
    P(bg, def.blade, [depth / 2, .035, 0], [0, -Math.PI / 2, 0], null, cf),
  ];
  if (def.wood) items.splice(2, 2, P(GEO.cyl(.03, .03, .012, 14), def.tsuba, [0, 0, 0]));
  const geo = merge(items);
  const mat = toon({ vertexColors: true });
  if (def.glow) { mat.emissive = new COL(def.glow); mat.emissiveIntensity = def.r === 'mythic' ? .45 : .22; }
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true;
  mesh.add(new THREE.Mesh(geo, outlineMat(opt.outline || .0035)));
  g.add(mesh);
  g.userData.len = L + .035; g.userData.mat = mat;
  if (def.glow) {
    const gg = new THREE.ExtrudeGeometry(bladeShape(L, w, c), { depth: .004, bevelEnabled: false, curveSegments: 10 });
    gg.translate(0, 0, -.002); gg.rotateY(-Math.PI / 2); gg.translate(0, .035, 0);
    const glow = new THREE.Mesh(gg, glowMat(def.glow, def.r === 'mythic' || def.r === 'legendary' ? .55 : .38));
    glow.scale.set(5, 1.02, 2.4); glow.renderOrder = 7;
    g.add(glow); g.userData.glow = glow;
  }
  return g;
}

/* ---------- banner (sashimono) texture ---------- */
function bannerTex(color, mark) {
  return ctex(64, (x, s, h) => {
    x.fillStyle = color; x.fillRect(0, 0, s, h);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 0, s, 8);
    x.fillStyle = '#fff6e0'; x.beginPath(); x.arc(s / 2, h * .42, s * .26, 0, Math.PI * 2); x.fill();
    x.fillStyle = color; x.font = 'bold 30px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(mark || '刀', s / 2, h * .43);
  }, 112);
}

/* ---------- Samurai ---------- */
class Samurai {
  constructor(look, sword, opt) {
    opt = opt || {};
    this.look = look; this.swordDef = sword; this.opt = opt;
    this.root = new THREE.Group();
    this.ghost = !!opt.ghost;
    if (this.ghost) {
      this.mat = toon({ vertexColors: true, transparent: true, opacity: .5, depthWrite: false });
      this.mat.emissive = new COL('#2a7cff'); this.baseEmissive = this.mat.emissive.clone();
      this.ol = outlineMat(.014, '#bff4ff');
    } else { this.mat = toon({ vertexColors: true }); this.mat.emissive = new COL(0x000000); this.ol = outlineMat(.011); }
    this.sheathed = false; this.drawAnim = null; this.lFreeT = 0; this.armSwing = 0;
    this.rCur = new V3(); this.lCur = new V3(); this.handInit = false;
    this.det = {}; this.flash = 0; this.t = Math.random() * 10;
    this.hipsY = .92; this.crouch = 0; this.leanAdd = 0; this.twistAdd = 0; this.sideLean = 0; this.jolt = 0; this.breath = 1;
    this.hipOff = new V3();
    this.seq = []; this.hold = { p: new V3(), q: new Q4(), k: 10 };
    this.gp = new V3().fromArray(POSES.guard.p); this.gq = poseQuat(POSES.guard);
    this.hold.p.copy(this.gp); this.hold.q.copy(this.gq);
    this.koT = -1; this.fp = false; this.swordDropped = false; this.wingFlare = 0;
    this.sh = { L: new V3(.25, .34, 0), R: new V3(-.25, .34, 0) };
    this.jE = { L: new V3(), R: new V3() }; this.jH = { L: new V3(), R: new V3() };
    this.jK = { L: new V3(), R: new V3() }; this.jA = { L: new V3(), R: new V3() };
    this.feet = { L: new V3(.17, .035, -.12), R: new V3(-.17, .035, .15) };
    this.build();
  }
  mk(geo, parent, outline) {
    const m = new THREE.Mesh(geo, this.mat); m.castShadow = true; m.receiveShadow = false;
    if (outline !== false) m.add(new THREE.Mesh(geo, outline === 'thin' ? outlineMat(.006) : this.ol));
    parent.add(m); return m;
  }
  build() {
    const L = this.look, cl = L.cloth, ar = L.armor, tr = L.trim;
    const arD = shadeHex(ar, -.28), clD = shadeHex(cl, -.22), arC = new COL(ar), trC = new COL(tr);
    const lam = (top, bot, step, base, dark, trimBelow) => (x, y) => {
      if (trimBelow != null && y < trimBelow) return trC;
      return (Math.floor((y - bot) / step) % 2) ? base : dark;
    };
    /* hips: obi + armored skirt plates */
    this.hips = new THREE.Group(); this.hips.position.y = .92; this.root.add(this.hips);
    const hi = [P(GEO.cyl(.2, .205, .08, 16), tr, [0, .02, 0], null, [1, 1, .68]), P(GEO.cyl(.19, .225, .14, 16), cl, [0, -.07, 0], null, [1, 1, .72])];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      hi.push(P(GEO.box(.16, .25, .028, 1, 7, 1), ar, [Math.sin(a) * .22, -.16, Math.cos(a) * .16], [-.24, a, 0, 'YXZ'], null, lam(.125, -.125, .036, arC, arD, -.1)));
    }
    this.hipsMesh = this.mk(merge(hi), this.hips);
    /* chest */
    this.chest = new THREE.Group(); this.chest.position.y = .22; this.hips.add(this.chest);
    const ci = [
      P(GEO.cyl(.24, .205, .42, 16, 10), ar, [0, .18, 0], null, [1, 1, .64], (x, y) => (Math.floor((y + .21) / .052) % 2 ? arC : arD)),
      P(GEO.box(.32, .07, .05), tr, [0, .37, .12]),
      P(GEO.cyl(.086, .1, .08, 12), cl, [0, .42, 0]),
      P(GEO.box(.2, .03, .2), tr, [0, -.02, 0]),
    ];
    if (L.crestCol || L.crest) ci.push(P(GEO.cyl(.04, .04, .012, 18), L.crestCol || tr, [0, .22, .152], [Math.PI / 2, 0, 0]));
    if (L.banner) ci.push(P(GEO.cyl(.012, .012, 1.15, 6), '#2a1d12', [0, .62, -.17]));
    this.chestMesh = this.mk(merge(ci), this.chest);
    /* shoulder plates */
    this.sode = {};
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1;
      const grp = new THREE.Group(); grp.position.set(sg * .28, .36, 0); this.chest.add(grp);
      const m = this.mk(merge([
        P(GEO.box(.18, .23, .05, 1, 6, 1), ar, [sg * .035, -.11, 0], [0, 0, sg * .2], null, lam(.115, -.115, .038, arC, arD, -.09)),
        P(GEO.box(.12, .04, .1), tr, [0, .0, 0]),
      ]), grp);
      this.sode[s] = grp; grp.userData.mesh = m;
    }
    /* head */
    this.head = new THREE.Group(); this.head.position.y = .52; this.chest.add(this.head);
    const maskCol = L.mask || '#1d1d24';
    this.headMesh = this.mk(merge([
      P(GEO.cyl(.055, .062, .12, 10), maskCol, [0, -.1, 0]),
      P(GEO.sph(.115, 16, 12), maskCol, [0, 0, 0]),
      P(GEO.sph(.122, 14, 8, Math.PI / 2 - 1.1, 2.2, 1.5, 1.0), shadeHex(maskCol, -.2), [0, 0, 0]),
      P(GEO.box(.09, .012, .02), shadeHex(maskCol, .25), [0, -.045, .115]),
    ]), this.head);
    const eyeMat = new THREE.MeshBasicMaterial({ color: L.eye || '#ffe6a0', fog: false });
    this.eyes = [];
    for (const sg of [-1, 1]) {
      const e = new THREE.Mesh(GEO.box(.046, .014, .012), eyeMat); e.position.set(sg * .042, .022, .108); e.rotation.z = -sg * .18; this.head.add(e);
      const h = halo(L.eye || '#ffe6a0', .11, .85); h.position.set(sg * .042, .022, .118); this.head.add(h);
      this.eyes.push(e, h);
    }
    this.hair = this.mk(merge([
      P(GEO.sph(.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#141418', [0, .005, -.005], null, [1, .85, 1]),
      P(GEO.cyl(.022, .03, .1, 8), '#141418', [0, .13, -.035], [-.5, 0, 0]),
    ]), this.head);
    this.helm = new THREE.Group(); this.head.add(this.helm);
    this.buildHelm();
    this.hair.visible = (L.helm === 'band' || !L.helm);
    /* scarf */
    if (L.scarf) {
      this.scarf = [];
      let parent = this.chest; let off = [0, .4, -.1];
      const sm = toon({ color: L.scarf, side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) {
        const seg = new THREE.Group(); seg.position.fromArray(off); parent.add(seg);
        const m = new THREE.Mesh(GEO.box(.09 - i * .008, .012, .16), sm); m.position.z = -.08; m.castShadow = true; seg.add(m);
        this.scarf.push(seg); parent = seg; off = [0, 0, -.16];
      }
    }
    /* banner */
    if (L.banner) {
      const bg = new THREE.PlaneGeometry(.34, .58, 4, 6);
      const bm = toon({ map: bannerTex(L.banner, '刀'), side: THREE.DoubleSide });
      this.banner = new THREE.Mesh(bg, bm); this.banner.position.set(.17, .9, -.17); this.banner.castShadow = true;
      this.chest.add(this.banner); this.bannerBase = Float32Array.from(bg.attributes.position.array);
    }
    /* arms (children of chest, solved by IK every frame) */
    this.up = {}; this.fo = {}; this.caps = {};
    for (const s of ['L', 'R']) {
      const upG = new THREE.Group(), foG = new THREE.Group(); this.chest.add(upG); this.chest.add(foG);
      this.mk(merge([
        P(GEO.cyl(.072, .088, .3, 10, 1), cl, [0, -.15, 0]),
        P(GEO.cyl(.09, .095, .05, 10), clD, [0, -.28, 0]),
      ]), upG);
      this.mk(merge([
        P(GEO.cyl(.053, .046, .25, 10), ar, [0, -.125, 0]),
        P(GEO.cyl(.057, .057, .014, 10), tr, [0, -.04, 0]),
        P(GEO.cyl(.052, .052, .014, 10), tr, [0, -.21, 0]),
        P(GEO.box(.068, .085, .062), '#2a221d', [0, -.29, 0]),
      ]), foG);
      this.up[s] = upG; this.fo[s] = foG;
      const cap = this.mk(merge([P(GEO.sph(.078, 12, 8), ar, [0, 0, 0]), P(GEO.cyl(.08, .08, .02, 12), tr, [0, -.02, 0])]), this.chest);
      cap.position.copy(this.sh[s]); cap.visible = false; this.caps[s] = cap;
    }
    /* legs (children of root) */
    this.th = {}; this.sn = {}; this.ft = {};
    const legLam = (x, y, z) => (Math.floor((Math.atan2(x, z) + Math.PI) * 2.2) % 2 ? new COL(cl) : clD);
    for (const s of ['L', 'R']) {
      const thG = new THREE.Group(), snG = new THREE.Group(), ftG = new THREE.Group();
      this.root.add(thG); this.root.add(snG); this.root.add(ftG);
      this.mk(merge([P(GEO.cyl(.11, .155, .44, 10, 3), cl, [0, -.22, 0], null, null, legLam)]), thG);
      this.mk(merge([
        P(GEO.cyl(.152, .175, .38, 10, 2), cl, [0, -.19, 0], null, null, legLam),
        P(GEO.box(.11, .25, .03, 1, 5, 1), ar, [0, -.24, .165], [-.08, 0, 0], null, lam(.125, -.125, .05, arC, arD)),
        P(GEO.box(.115, .022, .034), tr, [0, -.115, .17]),
      ]), snG);
      this.mk(merge([
        P(GEO.cyl(.058, .062, .07, 8), '#ece6da', [0, -.0, 0]),
        P(GEO.box(.1, .06, .22), '#ece6da', [0, -.04, .05]),
        P(GEO.box(.112, .02, .245), '#5a4632', [0, -.075, .05]),
      ]), ftG, 'thin');
      this.th[s] = thG; this.sn[s] = snG; this.ft[s] = ftG;
    }
    this.hipCaps = this.mk(merge([P(GEO.sph(.12, 12, 8), ar, [.1, -.05, 0], null, [1, .6, 1]), P(GEO.sph(.12, 12, 8), ar, [-.1, -.05, 0], null, [1, .6, 1])]), this.hips);
    this.hipCaps.visible = false;
    /* sword */
    this.grip = new THREE.Group(); this.chest.add(this.grip);
    this.sword = buildSword(this.swordDef); this.grip.add(this.sword);
    this.trail = new Trail(this.swordDef.glow || '#ffffff');
    this.hasSaya = !this.swordDef.club && !this.opt.noSaya;
    if (this.hasSaya) this.buildSaya();
    if (this.ghost) { this.ft.L.visible = this.ft.R.visible = false; if (this.saya) this.saya.visible = false; }
    this.solveAll(0);
  }
  buildSaya() {
    const d = this.swordDef, len = this.sword.userData.len + .02;
    this.sayaLen = len;
    const lac = d.saya || '#17121c', lacL = shadeHex(lac, .12), trim = d.tsuba || '#8a6a2a';
    this.saya = new THREE.Group();
    this.saya.position.set(.17, .06, .12);
    this.saya.quaternion.copy(quatFromDir(new V3(.45, -.3, -1), new V3(0, 1, 0)));
    this.hips.add(this.saya);
    const geo = merge([
      P(GEO.cyl(.021, .017, len, 10, 10), lac, [0, len / 2, 0], null, [.62, 1, 1.08], (x, y) => (Math.floor((y + len / 2) * 6) % 2 ? lacL : new COL(lac))),
      P(GEO.cyl(.024, .024, .03, 10), '#e8dcc8', [0, .015, 0], null, [.66, 1, 1.1]),
      P(GEO.box(.012, .026, .022), lac, [0, .12, .032]),
      P(GEO.cyl(.019, .014, .05, 10), trim, [0, len - .02, 0], null, [.66, 1, 1.05]),
      P(GEO.box(.008, .16, .008), '#c0392b', [.004, .2, .05], [.35, 0, 0]),
    ]);
    const pa = geo.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) pa[i + 2] -= .05 * Math.pow(Math.max(0, pa[i + 1]) / len, 2);
    geo.computeBoundingSphere();
    this.sayaMesh = this.mk(geo, this.saya, 'thin');
  }
  setSheathed(on) {
    this.drawAnim = null;
    if (!this.hasSaya || this.swordDropped) { this.sheathed = false; return; }
    if (on) this.saya.add(this.sword); else this.grip.add(this.sword);
    this.sword.position.set(0, 0, 0); this.sword.quaternion.identity();
    this.sheathed = !!on; this.trail.reset();
  }
  /* Draw: right hand reaches for the hilt, the blade slides out, then flows into the given poses. */
  drawSword(o) {
    o = o || {};
    if (this.drawAnim) return false;
    if (!this.hasSaya || !this.sheathed) { if (o.onOut) o.onOut(); this.afterDraw(o); return false; }
    this.drawAnim = { mode: 'draw', t: 0, reach: o.reach == null ? .08 : o.reach, slide: o.slide || .13, o };
    this.seq.length = 0;
    return true;
  }
  afterDraw(o) {
    const to = o.to || 'guard', list = Array.isArray(to) ? to : [to], durs = o.durs || [];
    this.seq.length = 0;
    list.forEach((pz, i) => this.queue(pz, durs[i] || (i === 0 ? .14 : .3), { ease: i === 0 ? easeOut : null, arc: i === 0 ? .3 : .15, cb: i === list.length - 1 ? o.onDone : null }));
  }
  finishDraw() {
    const o = this.drawAnim.o;
    this.root.updateMatrixWorld(true);
    _m1.copy(this.chest.matrixWorld).invert().multiply(this.sword.matrixWorld);
    _m1.decompose(_dv, _dq, _ds);
    this.grip.add(this.sword); this.sword.position.set(0, 0, 0); this.sword.quaternion.identity();
    this.gp.copy(_dv); this.gq.copy(_dq); this.hold.p.copy(_dv); this.hold.q.copy(_dq);
    this.grip.position.copy(_dv); this.grip.quaternion.copy(_dq);
    this.sheathed = false; this.drawAnim = null; this.lFreeT = o.oneHand == null ? .3 : o.oneHand;
    this.trail.boost = 1.2;
    if (o.onOut) o.onOut();
    this.afterDraw(o);
  }
  sayaEntryPose(off) {
    this.root.updateMatrixWorld(true);
    _m2.makeTranslation(0, -off, 0);
    _m1.copy(this.chest.matrixWorld).invert().multiply(this.saya.matrixWorld).multiply(_m2);
    _m1.decompose(_dv, _dq, _ds);
    return { p: _dv.clone(), q: _dq.clone() };
  }
  /* Sheathe: optional chiburi flick, guide the blade to the scabbard mouth, slide it home. */
  sheatheSword(o) {
    o = o || {};
    if (!this.hasSaya || this.swordDropped || this.sheathed) { if (o.onDone) o.onDone(); return; }
    if (this.drawAnim) return;
    const start = () => { this.drawAnim = { mode: 'approach', t: 0, dur: o.approach || .36, p0: this.gp.clone(), q0: this.gq.clone(), o }; this.seq.length = 0; };
    if (o.chiburi) { this.seq.length = 0; this.queue('chiburi', .18, { ease: easeOut, arc: .08 }); this.queue('chiburi2', .13, { cb: start }); }
    else start();
  }
  stepDraw(dt) {
    const a = this.drawAnim; if (!a) return false;
    a.t += dt;
    if (a.mode === 'draw') {
      const k = clamp((a.t - a.reach) / a.slide, 0, 1);
      this.sword.position.set(0, -k * k * SLIDE_OUT, 0);
      if (k >= 1) this.finishDraw();
      return false;
    }
    if (a.mode === 'approach') {
      const T = this.sayaEntryPose(SLIDE_IN), k = clamp(a.t / a.dur, 0, 1), e = ease(k);
      const ctrl = a.p0.clone().lerp(T.p, .5).add(_t1.set(0, .08, .1));
      bezier3(a.p0, ctrl, T.p, e, this.gp); this.gq.copy(a.q0).slerp(T.q, e);
      this.hold.p.copy(this.gp); this.hold.q.copy(this.gq);
      if (k >= 1) {
        this.saya.add(this.sword); this.sword.quaternion.identity(); this.sword.position.set(0, -SLIDE_IN, 0);
        a.mode = 'slide'; a.t = 0; a.dur = a.o.slide || .3;
        if (a.o.onEnter) a.o.onEnter();
      }
      return true;
    }
    if (a.mode === 'slide') {
      const k = clamp(a.t / a.dur, 0, 1);
      this.sword.position.set(0, -(1 - easeOut(k)) * SLIDE_IN, 0);
      if (k >= 1) { this.sword.position.set(0, 0, 0); this.sheathed = true; this.drawAnim = null; this.trail.reset(); if (a.o.onDone) a.o.onDone(); }
      return false;
    }
    return false;
  }
  buildHelm() {
    const L = this.look, hc = L.helmCol || L.armor, cc = L.crestCol || L.trim, tr = L.trim;
    const H = this.helm, items = [];
    const hcC = new COL(hc), hcD = shadeHex(hc, -.25), hcL = shadeHex(hc, .15);
    switch (L.helm) {
      case 'kabuto': {
        items.push(P(GEO.sph(.138, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), hc, [0, .02, 0], null, null, (x, y, z) => (Math.floor((Math.atan2(x, z) + Math.PI) / (Math.PI / 8)) % 2 ? hcC : hcL)));
        items.push(P(GEO.cyl(.165, .172, .014, 22), shadeHex(hc, -.3), [0, .022, 0]));
        items.push(P(GEO.cyl(.15, .225, .13, 18, 4, true, Math.PI - 2.05, 4.1), hc, [0, -.045, 0], null, null, (x, y) => (Math.floor((y + .065) / .032) % 2 ? hcC : hcD)));
        for (const sg of [-1, 1]) items.push(P(GEO.box(.075, .08, .016), tr, [sg * .158, .0, .08], [0, sg * .75, 0]));
        items.push(P(GEO.cyl(.024, .024, .014, 10), tr, [0, .16, 0]));
        this.crest(items, L.crest, cc);
        break;
      }
      case 'kasa':
        items.push(P(GEO.cone(.43, .19, 24, 2), hc, [0, .125, 0], null, null, (x, y, z) => (Math.floor((Math.atan2(x, z) + Math.PI) / (Math.PI / 12)) % 2 ? hcC : shadeHex(hc, -.12))));
        items.push(P(GEO.sph(.03, 8, 6), shadeHex(hc, -.2), [0, .22, 0]));
        items.push(P(GEO.cyl(.122, .122, .03, 14), tr, [0, .03, 0]));
        break;
      case 'hood':
        items.push(P(GEO.sph(.135, 16, 12, Math.PI / 2 + .95, Math.PI * 2 - 1.9, 0, 2.3), hc, [0, .01, 0], null, [1.1, 1.08, 1.1]));
        items.push(P(GEO.cyl(.1, .13, .1, 12), hc, [0, -.1, -.01]));
        break;
      case 'band':
        items.push(P(GEO.tor(.118, .015, 6, 22), hc, [0, .045, 0], [Math.PI / 2, 0, 0]));
        items.push(P(GEO.box(.026, .14, .01), hc, [.03, -.02, -.125], [.6, 0, .25]));
        items.push(P(GEO.box(.026, .12, .01), hc, [-.02, -.03, -.125], [.7, 0, -.2]));
        break;
      case 'tengu':
        items.push(P(GEO.cone(.045, .26, 8), hc, [0, .0, .21], [Math.PI / 2 - .12, 0, 0]));
        items.push(P(GEO.cyl(.05, .07, .07, 6), '#141418', [0, .13, .06], [-.3, 0, 0]));
        for (const sg of [-1, 1]) items.push(P(GEO.box(.05, .02, .02), '#141418', [sg * .045, .06, .11], [0, 0, sg * .25]));
        items.push(P(GEO.sph(.125, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#e8e2d6', [0, .01, -.02], null, [1.05, 1, 1.1]));
        break;
      default: break;
    }
    if (L.crest && L.helm !== 'kabuto') this.crest(items, L.crest, cc);
    if (L.crest === 'oni' && L.skin) for (const sg of [-1, 1]) items.push(P(GEO.cone(.014, .05, 5), '#f2ead8', [sg * .04, -.06, .1], [Math.PI, 0, 0]));
    if (items.length) this.helmMesh = this.mk(merge(items), H);
    if (L.wings) this.buildWings(L.wings);
  }
  crest(items, type, cc) {
    const ex = (shape, d) => new THREE.ExtrudeGeometry(shape, { depth: d || .012, bevelEnabled: false, curveSegments: 10 });
    if (type === 'horns') {
      for (const sg of [-1, 1]) {
        const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(sg * .06, .1, sg * .12, .25); s.lineTo(sg * .098, .255); s.quadraticCurveTo(sg * .02, .13, -sg * .014, .016); s.closePath();
        items.push(P(ex(s), cc, [sg * .012, .07, .128], [-.25, 0, 0]));
      }
      items.push(P(GEO.cyl(.03, .03, .012, 16), cc, [0, .075, .142], [Math.PI / 2, 0, 0]));
    } else if (type === 'moon') {
      const s = new THREE.Shape(); s.absarc(0, 0, .12, .25, Math.PI - .25, false); s.absarc(0, -.045, .1, Math.PI - .42, .42, true);
      items.push(P(ex(s), cc, [0, .07, .13], [-.2, 0, 0]));
    } else if (type === 'sun') {
      items.push(P(GEO.cyl(.075, .075, .014, 24), cc, [0, .13, .13], [Math.PI / 2 - .2, 0, 0]));
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; items.push(P(GEO.box(.016, .05, .01), cc, [Math.cos(a) * .1, .13 + Math.sin(a) * .1, .125], [-.2, 0, a - Math.PI / 2, 'XYZ'])); }
    } else if (type === 'flower') {
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 2; items.push(P(GEO.sph(.034, 8, 6), cc, [Math.cos(a) * .045, .12 + Math.sin(a) * .045, .135], null, [1, 1, .4])); }
      items.push(P(GEO.sph(.022, 8, 6), '#ffd24a', [0, .12, .145]));
    } else if (type === 'dragon') {
      for (const sg of [-1, 1]) {
        items.push(P(GEO.cone(.03, .36, 6), cc, [sg * .12, .2, -.02], [-.55, 0, -sg * .55]));
        items.push(P(GEO.cone(.018, .15, 5), cc, [sg * .06, .17, .1], [.3, 0, -sg * .3]));
      }
      items.push(P(GEO.cyl(.035, .035, .014, 16), '#e7e0ff', [0, .08, .14], [Math.PI / 2, 0, 0]));
    } else if (type === 'crystal') {
      for (let i = 0; i < 7; i++) { const a = (i - 3) * .32, h = .12 + (3 - Math.abs(i - 3)) * .06; items.push(P(GEO.oct(1), cc, [Math.sin(a) * .11, .13 + h * .4, Math.cos(a) * .06], [0, a, 0], [.025, h, .025])); }
    } else if (type === 'oni') {
      for (const sg of [-1, 1]) items.push(P(GEO.cone(.032, .17, 6), cc, [sg * .075, .2, .03], [0, 0, -sg * .28]));
    }
  }
  buildWings(col) {
    this.wings = [];
    const feather = new THREE.Shape();
    feather.moveTo(0, 0); feather.quadraticCurveTo(.25, .15, .62, .32); feather.lineTo(.7, .2); feather.lineTo(.6, .12); feather.lineTo(.66, .02); feather.lineTo(.52, -.04);
    feather.lineTo(.56, -.14); feather.lineTo(.4, -.16); feather.lineTo(.42, -.28); feather.lineTo(.26, -.22); feather.quadraticCurveTo(.1, -.12, 0, 0);
    const wg = new THREE.ExtrudeGeometry(feather, { depth: .02, bevelEnabled: false, curveSegments: 6 });
    const wm = toon({ color: col, side: THREE.DoubleSide });
    for (const sg of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(sg * .1, .3, -.16); this.chest.add(pivot);
      const m = new THREE.Mesh(wg, wm); m.scale.set(sg * 1.25, 1.25, 1); m.castShadow = true; pivot.add(m);
      m.add(new THREE.Mesh(wg, outlineMat(.008)));
      pivot.userData.sg = sg; this.wings.push(pivot);
    }
  }
  setFP(on) {
    this.fp = on;
    const vis = !on;
    this.head.visible = vis; this.chestMesh.visible = vis; this.hipsMesh.visible = vis;
    this.sode.L.visible = vis; this.sode.R.visible = vis;
    for (const s of ['L', 'R']) { if (!this.det['arm' + s]) this.up[s].visible = vis; this.th[s].visible = vis && !this.det.legs; this.sn[s].visible = vis && !this.det.legs; this.ft[s].visible = vis && !this.det.legs; this.caps[s].visible = vis && !!this.det['arm' + s]; }
    if (this.banner) this.banner.visible = vis;
    if (this.scarf) this.scarf[0].visible = vis;
    this.hipCaps.visible = vis && !!this.det.legs;
  }
  /* --- animation API --- */
  setHold(pose, k) {
    const Pp = typeof pose === 'string' ? POSES[pose] : pose;
    this.hold.p.fromArray(Pp.p); poseQuat(Pp, this.hold.q); this.hold.k = k || 10; this.seq.length = 0;
  }
  queue(pose, dur, o) {
    o = o || {};
    const Pp = typeof pose === 'string' ? POSES[pose] : pose;
    this.seq.push({ p1: new V3().fromArray(Pp.p), q1: poseQuat(Pp), dur, ctrl: o.ctrl, cb: o.cb, ease: o.ease, arc: o.arc == null ? .22 : o.arc, started: false });
  }
  swing(from, to, d1, d2, o) { this.seq.length = 0; this.queue(from, d1, { ease: easeOut, arc: .05 }); this.queue(to, d2, o); }
  /* --- per frame --- */
  update(dt) {
    this.t += dt;
    if (this.lFreeT > 0) this.lFreeT = Math.max(0, this.lFreeT - dt);
    const driving = this.stepDraw(dt);
    if (driving) { /* grip driven by the sheathing motion */ }
    else if (this.seq.length) {
      const s = this.seq[0];
      if (!s.started) {
        s.started = true; s.p0 = this.gp.clone(); s.q0 = this.gq.clone(); s.t = 0;
        if (!s.ctrl) s.ctrl = s.p0.clone().lerp(s.p1, .5).add(new V3(0, .03, s.arc));
      }
      s.t += dt;
      const u = clamp(s.t / s.dur, 0, 1), e = s.ease ? s.ease(u) : ease(u);
      bezier3(s.p0, s.ctrl, s.p1, e, this.gp); this.gq.copy(s.q0).slerp(s.q1, e);
      if (u >= 1) { this.seq.shift(); this.hold.p.copy(s.p1); this.hold.q.copy(s.q1); if (s.cb) s.cb(); }
    } else {
      const k = damp(this.hold.k, dt); this.gp.lerp(this.hold.p, k); this.gq.slerp(this.hold.q, k);
    }
    this.solveAll(dt);
    // flash
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 7); this.mat.emissive.setRGB(this.flash * .32, this.flash * .26, this.flash * .18); }
    else if (this.ghost) this.mat.emissive.copy(this.baseEmissive);
    else if (this.mat.emissive.r !== 0) this.mat.emissive.setScalar(0);
    // cloth motion
    if (this.banner) {
      const pa = this.banner.geometry.attributes.position, b = this.bannerBase;
      for (let i = 0; i < pa.count; i++) {
        const x = b[i * 3], y = b[i * 3 + 1];
        pa.array[i * 3 + 2] = Math.sin(this.t * 4 + x * 9 + y * 3) * .035 * (x + .17) * 4;
      }
      pa.needsUpdate = true;
    }
    if (this.wings) this.wings.forEach(w => { const sg = w.userData.sg; w.rotation.y = sg * (.5 + Math.sin(this.t * 3.2) * .35 + this.wingFlare); w.rotation.z = sg * .15; });
    if (this.scarf) this.scarf.forEach((s, i) => { s.rotation.x = .25 + Math.sin(this.t * 5 - i * .9) * .25; s.rotation.y = Math.sin(this.t * 3.4 - i * .7) * .3; });
    // KO fall
    if (this.koT >= 0) {
      this.koT += dt;
      const k = clamp(this.koT / .7, 0, 1);
      const b = k < 1 ? easeIn(k) : 1;
      this.root.rotation.x = -1.42 * b + (k >= 1 ? Math.sin(Math.min(1, (this.koT - .7) * 3) * Math.PI) * -.08 : 0);
    }
    // trail
    if (!this.swordDropped) {
      this.root.updateMatrixWorld(true);
      const len = this.sword.userData.len;
      _t4.set(0, .12, 0); this.sword.localToWorld(_t4);
      const tip = new V3(0, len, 0); this.sword.localToWorld(tip);
      this.trail.sample(_t4, tip, dt);
    }
  }
  solveAll(dt) {
    const legless = !!this.det.legs;
    const bob = Math.sin(this.t * 2.2) * .012 * this.breath;
    const targetY = (legless ? .36 : .92) + this.crouch;
    this.hipsY = dt ? lerp(this.hipsY, targetY, damp(9, dt)) : targetY;
    this.hips.position.set(this.hipOff.x, this.hipsY + bob, this.hipOff.z);
    const inSaya = this.hasSaya && (this.sheathed || (this.drawAnim && this.drawAnim.mode !== 'approach'));
    const drawing = !!this.drawAnim;
    let twistT, leanT;
    if (inSaya || drawing) { twistT = this.twistAdd + (drawing ? .38 : 0); leanT = this.leanAdd + (drawing ? .16 : 0); }
    else { twistT = clamp(this.gp.x * 1.05, -.7, .7) + this.twistAdd; leanT = clamp((this.gp.z - .3) * .5, -.2, .35) + this.leanAdd; }
    const kk = dt ? damp(10, dt) : 1;
    this.chest.rotation.y = lerp(this.chest.rotation.y, twistT, kk);
    this.chest.rotation.x = lerp(this.chest.rotation.x, leanT - this.jolt, kk);
    this.chest.rotation.z = lerp(this.chest.rotation.z, this.sideLean, kk);
    if (dt) this.jolt *= Math.exp(-dt * 8);
    this.head.rotation.y = -this.chest.rotation.y * .6;
    this.head.rotation.x = -this.chest.rotation.x * .5;
    this.grip.position.copy(this.gp); this.grip.quaternion.copy(this.gq);
    // arms
    const dir = _t4.set(0, 1, 0).applyQuaternion(this.gq);
    let rT = new V3().copy(this.gp).addScaledVector(dir, -.06);
    let lT = new V3().copy(this.gp).addScaledVector(dir, -.18);
    if (this.hasSaya && !this.swordDropped && (inSaya || drawing || this.lFreeT > 0)) {
      this.root.updateMatrixWorld(true);
      const mouth = this.chest.worldToLocal(this.saya.localToWorld(new V3(0, .07, 0)));
      lT = mouth;
      if (inSaya) {
        const hang = new V3(-.28, -.24 + Math.abs(this.armSwing) * .05, .05 + this.armSwing * .14);
        if (drawing) {
          const handle = this.chest.worldToLocal(this.sword.localToWorld(new V3(0, -.12, 0)));
          const a = this.drawAnim, kk = a.mode === 'draw' ? ease(clamp(a.t / Math.max(.01, a.reach), 0, 1)) : 1;
          rT = hang.lerp(handle, kk);
        } else rT = hang;
      }
      const k = dt ? damp(inSaya && !drawing ? 12 : 40, dt) : 1;
      if (!this.handInit) { this.rCur.copy(rT); this.lCur.copy(lT); this.handInit = true; }
      this.rCur.lerp(rT, k); this.lCur.lerp(lT, dt ? damp(18, dt) : 1);
      rT = this.rCur.clone(); lT = this.lCur.clone();
    } else { this.rCur.copy(rT); this.lCur.copy(lT); this.handInit = true; }
    for (const s of ['L', 'R']) {
      if (this.det['arm' + s]) continue;
      let T;
      if (this.swordDropped) T = new V3(this.sh[s].x * 1.25, -.25, .12);
      else T = s === 'R' ? rT : (this.det.armR && !inSaya ? rT : lT);
      const sg = s === 'L' ? 1 : -1;
      solve2(this.sh[s], T, .3, .29, _t3.set(sg * .75, -.55, -.35), this.jE[s], this.jH[s]);
      orientLimb(this.up[s], this.sh[s], this.jE[s], _t2.set(.25 * sg, .2, 1));
      orientLimb(this.fo[s], this.jE[s], this.jH[s], _t2.set(.25 * sg, .2, 1));
    }
    // legs
    if (!legless) {
      for (const s of ['L', 'R']) {
        const sg = s === 'L' ? 1 : -1;
        const hip = new V3(this.hips.position.x + sg * .11, this.hips.position.y - .04, this.hips.position.z);
        solve2(hip, this.feet[s], .44, .44, _t3.set(sg * .18, 0, 1), this.jK[s], this.jA[s]);
        orientLimb(this.th[s], hip, this.jK[s], _t2.set(0, 0, 1));
        orientLimb(this.sn[s], this.jK[s], this.jA[s], _t2.set(0, 0, 1));
        this.ft[s].position.copy(this.jA[s]);
      }
    }
  }
  /* world positions for hit testing / effects */
  worldParts() {
    this.root.updateMatrixWorld(true);
    const c = this.chest, r = this.root, w = v => v.clone().applyMatrix4(c.matrixWorld), wr = v => v.clone().applyMatrix4(r.matrixWorld);
    const k = this.root.scale.x;
    const out = {
      head: { a: this.head.getWorldPosition(new V3()), r: .17 * k },
      torso: { a: wr(new V3(0, this.hipsY - .05, 0)), b: w(new V3(0, .38, 0)), r: .25 * k },
      armL: this.det.armL ? null : [{ a: w(this.sh.L), b: w(this.jE.L), r: .09 * k }, { a: w(this.jE.L), b: w(this.jH.L), r: .085 * k }],
      armR: this.det.armR ? null : [{ a: w(this.sh.R), b: w(this.jE.R), r: .09 * k }, { a: w(this.jE.R), b: w(this.jH.R), r: .085 * k }],
      legs: this.det.legs ? null : ['L', 'R'].flatMap(s => {
        const sg = s === 'L' ? 1 : -1; const hip = wr(new V3(this.hips.position.x + sg * .11, this.hips.position.y - .04, 0));
        return [{ a: hip, b: wr(this.jK[s]), r: .15 * k }, { a: wr(this.jK[s]), b: wr(this.jA[s]), r: .15 * k }];
      }),
    };
    return out;
  }
  bladePoint(f) { const v = new V3(0, this.sword.userData.len * (f == null ? .6 : f), 0); this.root.updateMatrixWorld(true); return this.sword.localToWorld(v); }
  partCenter(part) {
    const wp = this.worldParts();
    if (part === 'head') return wp.head.a.clone();
    if (part === 'torso') return wp.torso.a.clone().lerp(wp.torso.b, .55);
    const segs = wp[part]; if (!segs) return wp.torso.a.clone();
    const v = new V3(); segs.forEach(s => v.add(s.a).add(s.b)); return v.divideScalar(segs.length * 2);
  }
  /* --- damage visuals --- */
  hitFlash(k) { this.flash = Math.max(this.flash, k == null ? 1 : k); this.jolt = Math.max(this.jolt, .25); }
  detach(part, scene, push) {
    if (this.det[part]) return null;
    this.root.updateMatrixWorld(true);
    let objs = [];
    if (part === 'armL' || part === 'armR') { const s = part.slice(3); objs = [this.up[s], this.fo[s]]; }
    else if (part === 'legs') objs = ['L', 'R'].flatMap(s => [this.th[s], this.sn[s], this.ft[s]]);
    else if (part === 'helm') { if (!this.helmMesh) { this.det.helm = true; return null; } objs = [this.helm]; }
    this.det[part] = true;
    const center = new V3(); objs.forEach(o => center.add(o.getWorldPosition(new V3()))); center.divideScalar(objs.length);
    const g = new THREE.Group(); g.position.copy(center); scene.add(g); g.updateMatrixWorld(true);
    objs.forEach(o => g.attach(o));
    if (part === 'armL') this.caps.L.visible = !this.fp;
    if (part === 'armR') this.caps.R.visible = !this.fp;
    if (part === 'legs') this.hipCaps.visible = !this.fp;
    if (part === 'helm') this.hair.visible = true;
    const v = (push || new V3(0, 0, 0)).clone().add(new V3(rnd(-1, 1), rnd(3, 4.5), rnd(-1, 1)));
    if (part === 'legs') v.set(push ? push.x * .4 : 0, 1.2, push ? push.z * .3 : 0);
    FX.addDebris(g, v, new V3(rnd(-9, 9), rnd(-6, 6), rnd(-9, 9)), part === 'legs' ? .45 : .07);
    if (this.det.armL && this.det.armR) this.dropSword(scene);
    return g;
  }
  dropSword(scene, vel, keep) {
    if (this.swordDropped) return null;
    this.swordDropped = true;
    this.root.updateMatrixWorld(true);
    const g = new THREE.Group(); this.grip.getWorldPosition(g.position); scene.add(g); g.updateMatrixWorld(true);
    g.attach(this.sword);
    this.trail.reset();
    if (!keep) FX.addDebris(g, vel || new V3(rnd(-1, 1), 3.5, rnd(-1, 1)), new V3(rnd(-12, 12), rnd(-4, 4), rnd(-12, 12)), .05);
    return g;
  }
  ko() { if (this.koT < 0) { this.koT = 0; this.setHold('stagger', 6); } }
  dispose() {
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.mat.dispose();
    if (this.trail) { this.trail.geo.dispose(); this.trail.mesh.material.dispose(); if (this.trail.mesh.parent) this.trail.mesh.parent.remove(this.trail.mesh); }
  }
}
