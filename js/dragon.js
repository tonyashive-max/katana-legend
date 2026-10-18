'use strict';
/* ===== Ryujin, the Sky Dragon: a boss that speaks the same language as a Samurai rig ===== */

const DRAGON_POSES = {
  guard:   { head: [0, 2.9, .9], jaw: .12, L: [.95, .55, 1.25], R: [-.95, .55, 1.25], atk: 'head' },
  windH:   { head: [0, 3.5, -.3], jaw: .7, L: [1, .6, 1], R: [-1, .6, 1], atk: 'head' },
  endH:    { head: [0, 1.45, 2.7], jaw: .05, L: [1, .5, 1.4], R: [-1, .5, 1.4], atk: 'head' },
  windR:   { head: [.4, 2.8, .5], jaw: .3, L: [.95, .55, 1.2], R: [-1.45, 2.3, .4], atk: 'R' },
  endR:    { head: [-.2, 2.4, 1.1], jaw: .1, L: [.95, .55, 1.2], R: [.6, .95, 2.7], atk: 'R' },
  windL:   { head: [-.4, 2.8, .5], jaw: .3, L: [1.45, 2.3, .4], R: [-.95, .55, 1.2], atk: 'L' },
  endL:    { head: [.2, 2.4, 1.1], jaw: .1, L: [-.6, .95, 2.7], R: [-.95, .55, 1.2], atk: 'L' },
  windLow: { head: [0, 2.2, .6], jaw: .4, L: [1.5, .3, .3], R: [-.95, .55, 1.2], atk: 'L' },
  endLow:  { head: [0, 2.1, 1.0], jaw: .1, L: [-.9, .25, 2.7], R: [-.95, .55, 1.2], atk: 'L' },
  blockR:  { head: [0, 2.4, .5], jaw: 0, L: [.3, 2.1, 1.7], R: [-.35, 1.9, 1.7], atk: 'head' },
  blockL:  { head: [0, 2.4, .5], jaw: 0, L: [.35, 1.9, 1.7], R: [-.3, 2.1, 1.7], atk: 'head' },
  blockH:  { head: [0, 2.2, .4], jaw: 0, L: [.25, 2.6, 1.6], R: [-.25, 2.6, 1.6], atk: 'head' },
  stagger: { head: [.6, 1.9, .1], jaw: .8, L: [1.1, .3, .9], R: [-1.1, .3, .9], atk: 'head' },
  show:    { head: [0, 3.7, .3], jaw: .95, L: [1, .6, 1.1], R: [-1, .6, 1.1], atk: 'head' },
};

class DragonBoss {
  constructor(spec) {
    this.look = spec.look || { aura: '#ffb03a' };
    this.swordDef = swordDef('ryujin');
    this.root = new THREE.Group(); this.root.rotation.order = 'YXZ'; this.root.scale.setScalar(1.35);
    this.det = {}; this.flash = 0; this.jolt = 0; this.t = 0; this.koT = -1; this.seq = []; this.swordDropped = false;
    this.mats = [];
    const mk = (geo, parent, col, outline) => {
      const m = new THREE.Mesh(geo, col); m.castShadow = true; parent.add(m);
      if (outline !== false) m.add(new THREE.Mesh(geo, outlineMat(.02)));
      return m;
    };
    const body = toon({ vertexColors: true }); body.emissive = new COL(0); this.mats.push(body); this.body = body;
    const red = '#d2301a', gold = '#ffc24a', dark = '#7a120a';
    // pose state
    this.cur = { head: new V3(0, 2.6, .9), jaw: .1, L: new V3(.95, .55, 1.25), R: new V3(-.95, .55, 1.25) };
    this.tgt = JSON.parse(JSON.stringify(DRAGON_POSES.guard)); this.k = 6; this.atk = 'head';
    // chest = neck base, used by the camera and HUD overlays
    this.chest = new THREE.Group(); this.chest.position.set(0, 2.1, -.2); this.root.add(this.chest);
    // body coil (instanced segments)
    this.N = 26;
    const segGeo = merge([
      P(GEO.ico(1, 1), red, [0, 0, 0], null, [1, .92, 1.15], (x, y) => y < -.3 ? new COL(gold) : new COL(red)),
      P(GEO.cone(.32, .7, 4), gold, [0, 1.0, 0]),
    ]);
    this.coil = new THREE.InstancedMesh(segGeo, body, this.N); this.coil.castShadow = true; this.coil.frustumCulled = false; this.root.add(this.coil);
    this.coilOl = new THREE.InstancedMesh(segGeo, outlineMat(.03), this.N); this.coilOl.frustumCulled = false; this.root.add(this.coilOl);
    this.spine = []; for (let i = 0; i < this.N; i++) this.spine.push(new V3());
    // neck
    this.neckN = 7;
    this.neck = new THREE.InstancedMesh(segGeo, body, this.neckN); this.neck.castShadow = true; this.neck.frustumCulled = false; this.root.add(this.neck);
    // tail tip (detachable as "legs")
    this.tail = new THREE.Group(); this.root.add(this.tail);
    this.tailSegs = [];
    for (let i = 0; i < 6; i++) {
      const s = mk(segGeo, this.tail, body); this.tailSegs.push(s);
    }
    const fin = mk(merge([P(GEO.cone(.35, 1.1, 4), gold, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, .3])]), this.tail, body);
    this.tailFin = fin;
    // head
    this.head = new THREE.Group(); this.root.add(this.head);
    mk(merge([
      P(GEO.box(.9, .6, 1.2), red, [0, 0, .2]),
      P(GEO.box(.7, .38, .9), red, [0, -.05, .95]),
      P(GEO.box(.74, .12, .9), gold, [0, -.2, .95]),
      P(GEO.sph(.05, 6, 4), '#5a0a06', [.18, .08, 1.4]), P(GEO.sph(.05, 6, 4), '#5a0a06', [-.18, .08, 1.4]),
      P(GEO.box(.95, .12, .25), '#7a120a', [0, .28, .72]),
      P(GEO.box(1.0, .14, .5), gold, [0, .32, -.1]),
      ...[-.3, 0, .3].map(x => P(GEO.cone(.08, .45, 4), gold, [x, .45, -.35], [-.9, 0, 0])),
      P(GEO.box(.05, .05, 1.6), '#ffd27a', [.45, -.15, 1.6], [0, .45, 0]),
      P(GEO.box(.05, .05, 1.6), '#ffd27a', [-.45, -.15, 1.6], [0, -.45, 0]),
    ]), this.head, body);
    this.jaw = new THREE.Group(); this.jaw.position.set(0, -.22, .35); this.head.add(this.jaw);
    mk(merge([
      P(GEO.box(.62, .16, 1.0), gold, [0, -.05, .5]),
      ...[-.2, -.07, .07, .2].map(x => P(GEO.cone(.035, .12, 4), '#fff6e0', [x, .07, .9], [0, 0, 0])),
    ]), this.jaw, body);
    for (const sx of [-1, 1]) { const e = halo('#fff27a', 1.1, 1); e.position.set(sx * .34, .18, .74); this.head.add(e); const eb = new THREE.Mesh(GEO.box(.26, .1, .06), new THREE.MeshBasicMaterial({ color: '#fff6a0', fog: false })); eb.position.set(sx * .34, .18, .82); eb.rotation.z = sx * .25; this.head.add(eb); }
    this.mouth = new THREE.Object3D(); this.mouth.position.set(0, -.15, 1.45); this.head.add(this.mouth);
    // horns (the "helmet")
    this.helm = new THREE.Group(); this.head.add(this.helm);
    this.helmMesh = mk(merge([
      P(GEO.cone(.09, 1.1, 6), '#fff0c0', [.35, .7, -.4], [-1.0, 0, -.35]),
      P(GEO.cone(.09, 1.1, 6), '#fff0c0', [-.35, .7, -.4], [-1.0, 0, .35]),
      P(GEO.cone(.05, .5, 5), '#fff0c0', [.45, .6, -.65], [-.6, 0, -.6]),
      P(GEO.cone(.05, .5, 5), '#fff0c0', [-.45, .6, -.65], [-.6, 0, .6]),
    ]), this.helm, body);
    // forelegs (arms)
    this.arm = {};
    for (const s of ['L', 'R']) {
      const g = new THREE.Group(); this.root.add(g);
      const up = new THREE.Group(), lo = new THREE.Group(), claw = new THREE.Group(); g.add(up); g.add(lo); g.add(claw);
      mk(merge([P(GEO.cyl(.2, .26, 1, 8), red, [0, -.5, 0])]), up, body);
      mk(merge([P(GEO.cyl(.16, .2, 1, 8), red, [0, -.5, 0]), P(GEO.cyl(.17, .17, .12, 8), gold, [0, -.2, 0])]), lo, body);
      mk(merge([
        P(GEO.sph(.22, 10, 8), red, [0, 0, 0]),
        ...[-.12, 0, .12].map(x => P(GEO.cone(.05, .32, 5), '#fff6e0', [x, -.05, .25], [Math.PI / 2 + .3, 0, 0])),
      ]), claw, body);
      this.arm[s] = { g, up, lo, claw, sh: new V3(s === 'L' ? .75 : -.75, 1.55, .25), el: new V3(), hand: new V3() };
    }
    this.trail = new Trail('#ff9a3a');
    this.breathT = 0;
    this.update(0);
  }
  /* --- animation API (matches Samurai) --- */
  setHold(name, k) {
    const P0 = DRAGON_POSES[name] || DRAGON_POSES.guard;
    this.tgt = P0; this.k = k || 8; this.atk = P0.atk; this.seq.length = 0;
  }
  queue(name, dur) { this.setHold(name, 3.2 / Math.max(.05, dur)); }
  swing() { }
  hitFlash(k) { this.flash = Math.max(this.flash, k == null ? 1 : k); this.jolt = Math.max(this.jolt, .25); }
  breathe(dur) { this.breathT = dur; }
  update(dt) {
    this.t += dt;
    const k = dt ? damp(this.k, dt) : 1, c = this.cur, T = this.tgt;
    c.head.lerp(_t1.fromArray(T.head), k); c.jaw = lerp(c.jaw, T.jaw, k);
    c.L.lerp(_t1.fromArray(T.L), k); c.R.lerp(_t1.fromArray(T.R), k);
    const ko = this.koT >= 0 ? clamp(this.koT / 1.2, 0, 1) : 0;
    if (this.koT >= 0) this.koT += dt;
    const bob = Math.sin(this.t * 1.6) * .08;
    // head
    const hp = c.head.clone(); hp.y += bob - ko * 2.1; hp.z -= this.jolt * .6;
    this.head.position.copy(hp);
    this.head.rotation.set(-.15 + (c.head.z > 2 ? .35 : 0) + ko * .6, -hp.x * .25, Math.sin(this.t * 1.1) * .05 + ko * .4);
    this.jaw.rotation.x = c.jaw * .7;
    this.jolt *= Math.exp(-dt * 6);
    // spine coil: from the neck base back around, tail ending in front-left
    const base = new V3(0, 2.0 - ko * 1.2, -.3), N = this.N;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1), a = u * 4.4 + .3, R = 1.25 + u * .9;
      const wave = Math.sin(this.t * 1.4 - u * 6) * .12;
      this.spine[i].set(Math.sin(a) * R * 1.05, Math.max(.35, 1.8 - u * 1.7 + Math.sin(u * 8 + this.t) * .15 + wave) - ko * .6, -1.0 - Math.cos(a) * R * .75 + 0.4 * u);
    }
    const sc = u => .55 * (1 - u * .55);
    for (let i = 0; i < N; i++) {
      const p = this.spine[i], nx = this.spine[Math.min(N - 1, i + 1)], u = i / (N - 1);
      const pv = this.spine[Math.max(0, i - 1)]; _io.position.copy(p); _io.quaternion.setFromUnitVectors(_t2.set(0, 1, 0), i < N - 1 ? _t3.subVectors(nx, p).normalize() : _t3.subVectors(p, pv).normalize());
      const s = sc(u); _io.scale.set(s, s, s); _io.updateMatrix();
      this.coil.setMatrixAt(i, _io.matrix); this.coilOl.setMatrixAt(i, _io.matrix);
    }
    this.coil.instanceMatrix.needsUpdate = true; this.coilOl.instanceMatrix.needsUpdate = true;
    // tail tip continues from the last spine point toward the front-left ground
    if (!this.det.legs) {
      const last = this.spine[N - 1], tipDir = new V3(.9 + Math.sin(this.t * 2) * .2, -.15, 1).normalize();
      for (let i = 0; i < this.tailSegs.length; i++) {
        const p = last.clone().addScaledVector(tipDir, (i + 1) * .32); p.y = Math.max(.25, p.y + Math.sin(this.t * 3 + i) * .05);
        const m = this.tailSegs[i]; m.position.copy(p); const s = .3 * (1 - i / 7); m.scale.setScalar(s);
        m.quaternion.setFromUnitVectors(_t2.set(0, 1, 0), tipDir);
      }
      const endp = this.tailSegs[this.tailSegs.length - 1].position;
      this.tailFin.position.copy(endp).addScaledVector(tipDir, .35); this.tailFin.quaternion.setFromUnitVectors(_t2.set(0, 0, 1), tipDir);
    }
    // neck: bezier from the neck base to the head
    const n0 = base, n2 = hp.clone().add(new V3(0, -.1, -.45)), n1 = n0.clone().lerp(n2, .5).add(new V3(0, .7, -.2));
    for (let i = 0; i < this.neckN; i++) {
      const u = i / (this.neckN - 1), p = bezier3(n0, n1, n2, u, new V3()), q = bezier3(n0, n1, n2, Math.min(1, u + .1), new V3());
      _io.position.copy(p); _io.quaternion.setFromUnitVectors(_t2.set(0, 1, 0), _t3.subVectors(q, p).normalize()); const s = .5 - u * .12; _io.scale.set(s, s, s); _io.updateMatrix(); this.neck.setMatrixAt(i, _io.matrix);
    }
    this.neck.instanceMatrix.needsUpdate = true;
    this.chest.position.copy(n1);
    // forelegs: 2-bone IK from the shoulder to the claw target
    for (const s of ['L', 'R']) {
      if (this.det['arm' + s]) continue;
      const A = this.arm[s], tgt = c[s].clone(); tgt.y -= ko * .3;
      const sh = A.sh.clone(); sh.y -= ko * 1.0;
      solve2(sh, tgt, 1, 1, _t3.set(s === 'L' ? .6 : -.6, .6, -.6), A.el, A.hand);
      orientLimb(A.up, sh, A.el, _t2.set(0, 0, 1));
      orientLimb(A.lo, A.el, A.hand, _t2.set(0, 0, 1));
      A.claw.position.copy(A.hand); A.claw.rotation.set(0, s === 'L' ? -.3 : .3, 0);
    }
    // flash
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 6); this.body.emissive.setRGB(this.flash * .4, this.flash * .3, this.flash * .15); }
    else if (this.body.emissive.r) this.body.emissive.setScalar(0);
    // fire breath
    if (this.breathT > 0) {
      this.breathT -= dt;
      this.root.updateMatrixWorld(true);
      const m = this.mouth.getWorldPosition(new V3()), fwd = new V3(0, -.25, 1).applyQuaternion(this.head.getWorldQuaternion(new Q4())).normalize();
      for (let i = 0; i < 6; i++) FX.add.emit(m.x, m.y, m.z, fwd.x * rnd(5, 8) + rnd(-.6, .6), fwd.y * rnd(5, 8) + rnd(-.4, .6), fwd.z * rnd(5, 8) + rnd(-.6, .6), rnd(.35, .6), rnd(.25, .4), rnd(.7, 1.1), pick(['#ffb03a', '#ff6a1a', '#ffe08c']), 1, -1, 1.2);
    }
    // trail on the attacking part
    if (dt) {
      this.root.updateMatrixWorld(true);
      const tip = this.bladePoint(), back = tip.clone().add(new V3(0, .35, -.25));
      this.trail.sample(back, tip, dt);
    }
  }
  bladePoint() {
    this.root.updateMatrixWorld(true);
    if (this.atk === 'L' && !this.det.armL) return this.arm.L.claw.getWorldPosition(new V3());
    if (this.atk === 'R' && !this.det.armR) return this.arm.R.claw.getWorldPosition(new V3());
    return this.mouth.getWorldPosition(new V3());
  }
  worldParts() {
    this.root.updateMatrixWorld(true);
    const w = v => v.clone().applyMatrix4(this.root.matrixWorld), k = this.root.scale.x;
    const arm = s => this.det['arm' + s] ? null : [{ a: w(this.arm[s].sh), b: w(this.arm[s].el), r: .26 * k }, { a: w(this.arm[s].el), b: w(this.arm[s].hand), r: .24 * k }];
    return {
      head: { a: this.head.getWorldPosition(new V3()), r: .6 * k },
      torso: { a: w(this.spine[1]), b: this.chest.getWorldPosition(new V3()), r: .6 * k },
      armL: arm('L'), armR: arm('R'),
      legs: this.det.legs ? null : [{ a: this.tailSegs[0].getWorldPosition(new V3()), b: this.tailFin.getWorldPosition(new V3()), r: .3 * k }],
    };
  }
  partCenter(part) {
    const wp = this.worldParts();
    if (part === 'head') return wp.head.a.clone();
    if (part === 'torso') return wp.torso.a.clone().lerp(wp.torso.b, .5);
    const segs = wp[part]; if (!segs) return wp.torso.a.clone();
    const v = new V3(); segs.forEach(s => v.add(s.a).add(s.b)); return v.divideScalar(segs.length * 2);
  }
  detach(key, scene, push) {
    if (this.det[key]) return null;
    this.root.updateMatrixWorld(true);
    let objs = [];
    if (key === 'helm') objs = [this.helm];
    else if (key === 'armL' || key === 'armR') objs = [this.arm[key.slice(3)].g];
    else if (key === 'legs') objs = [this.tail];
    if (!objs.length) return null;
    this.det[key] = true;
    const center = key === 'armL' || key === 'armR' ? this.arm[key.slice(3)].claw.getWorldPosition(new V3()) : objs[0].getWorldPosition(new V3());
    if (key === 'legs') center.copy(this.tailSegs[2].getWorldPosition(new V3()));
    const g = new THREE.Group(); g.position.copy(center); scene.add(g); g.updateMatrixWorld(true);
    objs.forEach(o => g.attach(o));
    FX.addDebris(g, (push || new V3()).clone().add(new V3(rnd(-1, 1), rnd(3, 4.5), rnd(-1, 1))), new V3(rnd(-6, 6), rnd(-4, 4), rnd(-6, 6)), .1);
    return g;
  }
  dropSword(scene, vel, keep) {
    if (this.swordDropped) return null;
    this.swordDropped = true;
    const g = new THREE.Group(); this.root.updateMatrixWorld(true);
    this.head.getWorldPosition(g.position);
    g.add(buildSword(this.swordDef)); scene.add(g);
    this.trail.reset();
    if (!keep) FX.addDebris(g, vel || new V3(0, 3, 0), new V3(rnd(-8, 8), 0, rnd(-8, 8)), .05);
    return g;
  }
  ko() { if (this.koT < 0) { this.koT = 0; this.setHold('stagger', 4); } }
  setFP() { }
  dispose() { this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.mats.forEach(m => m.dispose()); }
}
