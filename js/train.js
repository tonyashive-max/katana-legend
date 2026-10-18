'use strict';
/* ===== Dojo training mini-games ===== */

let T = null;

function startTraining(kind) {
  transition(() => {
    clearSceneActors();
    const W = buildWorld('dojo'); activateWorld(W);
    const P = new Samurai(lookFromOutfit(outfitDef(S.outfit)), swordDef(eqSword().id), { player: true });
    P.root.rotation.order = 'YXZ'; W.scene.add(P.root, P.trail.mesh);
    T = { kind, W, P, t: 0, score: 0, done: false, view: S.view, camPos: new V3(), camLook: new V3(), returnT: 0, cdUntil: 0, started: false, delay: 1.7, items: [], pops: 0, down: null };
    P.setFP(T.view === 'fp'); P.setHold(T.view === 'fp' ? 'fpGuard' : 'guard', 10);
    TRAIN_KINDS[kind].init();
    CAM.position.set(0, 1.7, -1.5); T.camPos.copy(CAM.position); T.camLook.set(0, 1.2, 2.5);
    showHUD('train');
    $('#viewBtn').textContent = T.view === 'fp' ? 'Behind view' : 'First person';
    OV.draw = drawTrainOverlay; OV.trailCol = hexRGB(swordDef(eqSword().id).glow || '#ffffff');
    banner(TRAININGS[kind].name, 'Get ready!');
    MUSIC.start('train'); sfx.taiko(.8);
    setMode(TrainMode);
  });
}
function endTraining() { T = null; OV.draw = null; hideHUD(); enterHub(); }
function trainSwing(x0, y0, x1, y1) {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  rigSwing(T.P, (x1 - x0) / len, (y1 - y0) / len, .12); T.returnT = .28; sfx.slash();
}
function tPop(text, x, y, o) { ovPop(x == null ? VW / 2 : x, y == null ? VH * .38 : y, text, o); }
function setTInfo(left, right) { $('#tInfo').innerHTML = `<b>${TRAININGS[T.kind].name}</b>${left}${right ? ' · ' + right : ''}`; }
function seg2(ax, ay, bx, by, cx, cy, dx, dy) {
  const r = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx); if (Math.abs(r) < 1e-6) return null;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / r, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / r;
  return (t >= 0 && t <= 1 && u >= 0 && u <= 1) ? { t, u } : null;
}

/* ---------- Bamboo cutting ---------- */
let BAMBOO_GEO = null;
function bambooGeo() {
  if (BAMBOO_GEO) return BAMBOO_GEO;
  BAMBOO_GEO = merge([P(GEO.cyl(.06, .07, 1, 9), '#78b844', [0, .5, 0])].concat([1, 2, 3, 4, 5].map(k => P(GEO.cyl(.076, .076, .025, 9), '#4a8a2a', [0, k / 6, 0]))));
  return BAMBOO_GEO;
}
const BambooGame = {
  init() { T.dur = 30; T.spawn = 0; T.mat = toon({ vertexColors: true }); T.stone = toon({ color: '#8a8a94', flatShading: true }); },
  spawn() {
    let x, z, tries = 0;
    do { x = rnd(-1.5, 1.5); z = rnd(1.8, 3.1); tries++; } while (tries < 10 && T.items.some(s => !s.cut && Math.abs(s.x - x) < .45 && Math.abs(s.z - z) < .6));
    const stone = T.t > 4 && Math.random() < .16;
    const h = stone ? rnd(1.4, 1.8) : rnd(1.6, 2.3);
    const m = stone ? new THREE.Mesh(GEO.box(.32, 1, .32), T.stone) : new THREE.Mesh(bambooGeo(), T.mat);
    if (stone) m.geometry.translate(0, .5, 0);
    m.castShadow = true; m.position.set(x, -h, z); m.scale.set(1, h, 1); T.W.scene.add(m);
    if (!stone) m.add(new THREE.Mesh(bambooGeo(), outlineMat(.008)));
    T.items.push({ m, x, z, h, age: 0, life: rnd(2.4, 3.2), cut: false, stone });
    FX.chips(new V3(x, .05, z), '#b08a5a', 6, 1.5);
  },
  update(dt) {
    T.spawn -= dt;
    if (T.spawn <= 0 && T.t < T.dur - .5) { T.spawn = Math.max(.32, .78 - T.t / 70); this.spawn(); if (T.t > 12 && Math.random() < .35) this.spawn(); }
    for (const s of T.items) {
      s.age += dt;
      if (s.cut) continue;
      const rise = easeOut(clamp(s.age / .25, 0, 1)), sink = s.age > s.life ? clamp((s.age - s.life) / .3, 0, 1) : 0;
      s.m.position.y = -s.h * (1 - rise) - s.h * sink;
      if (sink >= 1) { s.cut = true; s.m.visible = false; }
    }
    setTInfo(`${Math.max(0, Math.ceil(T.dur - T.t))}s left`, `Cuts ${T.score}`);
    if (T.t >= T.dur) finishTraining();
  },
  slash(x0, y0, x1, y1) {
    let n = 0;
    for (const s of T.items) {
      if (s.cut || s.age < .15) continue;
      const base = new V3(s.x, Math.max(0, s.m.position.y) + .05, s.z), top = new V3(s.x, s.m.position.y + s.h, s.z);
      const a = toScreen(base), b = toScreen(top);
      const hit = seg2(x0, y0, x1, y1, a.x, a.y, b.x, b.y);
      if (!hit) continue;
      const cutY = lerp(base.y, top.y, hit.u);
      s.cut = true;
      if (s.stone) {
        T.score = Math.max(0, T.score - 2); sfx.clang(1.2); shake(.05); FX.sparks(new V3(s.x, cutY, s.z), '#ffd27a', 20, 4);
        tPop('-2 STONE!', (x0 + x1) / 2, (y0 + y1) / 2, { size: 30, color: '#ff8a7a' });
        s.m.scale.y *= .98; continue;
      }
      n++;
      const lowH = cutY - s.m.position.y, upH = s.h - lowH;
      const up = new THREE.Mesh(bambooGeo(), T.mat); up.castShadow = true;
      up.add(new THREE.Mesh(bambooGeo(), outlineMat(.008)));
      const g = new THREE.Group(); g.position.set(s.x, cutY + upH / 2, s.z); T.W.scene.add(g);
      up.position.y = -upH / 2; up.scale.set(1, upH, 1); g.add(up);
      s.m.scale.y = Math.max(.05, lowH);
      const dir = Math.sign(x1 - x0) || 1;
      FX.addDebris(g, new V3(dir * rnd(1.5, 3), rnd(1.5, 3), rnd(.5, 1.5)), new V3(rnd(-3, 3), rnd(-2, 2), -dir * rnd(4, 8)), .1);
      FX.chips(new V3(s.x, cutY, s.z), '#c9e88a', 12, 3); FX.sparks(new V3(s.x, cutY, s.z), '#eaffc0', 8, 2.5);
    }
    if (n) {
      const pts = n + (n > 1 ? n - 1 : 0); T.score += pts; sfx.hit(); hitstop(25);
      tPop(n > 1 ? `${n}x COMBO +${pts}` : '+1', (x0 + x1) / 2, (y0 + y1) / 2 - 30, { size: n > 1 ? 34 : 26, color: n > 1 ? '#ffe08c' : '#d9ffb0' });
    }
  },
  xp() { return T.score * 3; },
  summary() { return `${T.score} bamboo cut`; },
};

/* ---------- Lightning reflex ---------- */
const ReflexGame = {
  init() {
    T.N = 20; T.i = 0; T.cur = null; T.gap = .4; T.correct = 0; T.fast = 0;
    const post = merge([P(GEO.cyl(.09, .1, 1.6, 8), '#7a5030', [0, .8, 0]), P(GEO.cyl(.14, .14, .6, 10), '#d9c08a', [0, 1.15, 0], null, null, (x, y) => (Math.floor((y + .3) * 22) % 2 ? new COL('#d9c08a') : new COL('#b89a5a'))), P(GEO.box(.4, .1, .4), '#5a3a20', [0, .05, 0])]);
    T.post = new THREE.Mesh(post, toon({ vertexColors: true })); T.post.position.set(0, 0, 2.2); T.post.castShadow = true; T.W.scene.add(T.post);
    T.postKick = 0;
  },
  next() {
    if (T.i >= T.N) { finishTraining(); return; }
    const dirs = T.i < 8 ? 4 : 8, k = (Math.random() * dirs) | 0;
    T.cur = { a: k / dirs * Math.PI * 2, t: 0, lim: Math.max(.62, 1.45 - T.i * .042) }; T.i++;
    sfx.tick();
  },
  update(dt) {
    if (T.gap > 0) { T.gap -= dt; if (T.gap <= 0) this.next(); }
    else if (T.cur) { T.cur.t += dt; if (T.cur.t > T.cur.lim) { tPop('Too slow!', null, VH * .3, { size: 28, color: '#ff8a7a' }); T.cur = null; T.gap = .45; sfx.warn(); } }
    T.postKick *= Math.exp(-dt * 8);
    T.post.rotation.z = Math.sin(T.t * 40) * T.postKick * .15;
    setTInfo(`${Math.min(T.i, T.N)} / ${T.N}`, `Correct ${T.correct}`);
  },
  slash(x0, y0, x1, y1) {
    if (!T.cur) return;
    const a = Math.atan2(y1 - y0, x1 - x0);
    let d = Math.abs(a - T.cur.a) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < .6) {
      T.correct++; const fast = T.cur.t < T.cur.lim * .5; if (fast) T.fast++;
      tPop(fast ? 'LIGHTNING!' : 'Good!', null, VH * .3, { size: fast ? 36 : 28, color: fast ? '#8fe8ff' : '#d9ffb0', stroke: '#06203a' });
      sfx.hit(); T.postKick = 1; FX.chips(new V3(0, 1.2, 2.1), '#e6cf90', 10, 2.5);
    } else { tPop('Wrong way!', null, VH * .3, { size: 28, color: '#ff8a7a' }); sfx.warn(); }
    T.cur = null; T.gap = .35;
  },
  draw(c) {
    if (!T.cur) return;
    const x = VW / 2, y = VH * .46, R = Math.min(VW, VH) * .17, k = 1 - T.cur.t / T.cur.lim;
    c.save(); c.translate(x, y);
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = k > .5 ? '#8fe8ff' : k > .25 ? '#ffd166' : '#ff6b5b'; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke();
    c.rotate(T.cur.a);
    c.shadowColor = '#8fe8ff'; c.shadowBlur = 24; c.fillStyle = '#ffffff'; c.strokeStyle = '#06203a'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(R * .7, 0); c.lineTo(R * .05, -R * .45); c.lineTo(R * .05, -R * .18); c.lineTo(-R * .6, -R * .18); c.lineTo(-R * .6, R * .18); c.lineTo(R * .05, R * .18); c.lineTo(R * .05, R * .45); c.closePath();
    c.stroke(); c.fill(); c.restore();
  },
  xp() { return T.correct * 4 + T.fast * 2; },
  summary() { return `${T.correct} of ${T.N} correct, ${T.fast} lightning fast`; },
};

/* ---------- Sensei parry drill ---------- */
const ParryGame = {
  init() {
    T.N = 14; T.i = 0; T.perfect = 0; T.good = 0; T.state = 'wait'; T.st = 0; T.gap = .8;
    const E = new Samurai(SENSEI_LOOK, swordDef('bokken'), {});
    E.root.rotation.order = 'YXZ'; E.root.position.set(0, 0, DIST); E.root.rotation.y = Math.PI; E.setHold('guard', 10);
    T.W.scene.add(E.root, E.trail.mesh); T.E = E; T.lunge = 0;
  },
  windup() {
    if (T.i >= T.N) { finishTraining(); return; }
    T.dir = pick(T.i > 6 ? ['R', 'L', 'H', 'Low'] : ['R', 'L', 'H']); T.tele = Math.max(.72, 1.35 - T.i * .045); T.i++;
    T.E.setHold('wind' + T.dir, 4.2 / T.tele); T.state = 'windup'; T.st = 0; sfx.warn();
  },
  update(dt) {
    const E = T.E; T.st += dt;
    if (T.state === 'wait') { T.gap -= dt; if (T.gap <= 0) this.windup(); }
    else if (T.state === 'windup' && T.st >= T.tele) {
      T.state = 'strike'; T.st = 0; E.seq.length = 0; E.queue('end' + T.dir, .17, { ease: easeIn, arc: .3 }); T.lunge = 1; sfx.slash(1.2);
    } else if (T.state === 'strike' && T.st > .12 && !T.tapped) {
      T.tapped = true; shake(.04); OV.vig = .5; OV.vigCol = '255,180,80'; tPop('Too late!', null, VH * .3, { size: 28, color: '#ffb38a' });
    } else if (T.state === 'strike' && T.st > .45) { T.tapped = false; E.setHold('guard', 7); T.state = 'wait'; T.gap = rnd(.5, .9); }
    else if (T.state === 'stagger' && T.st > .8) { E.setHold('guard', 7); T.state = 'wait'; T.gap = rnd(.4, .8); }
    T.lunge = Math.max(0, T.lunge - dt * 2.6);
    E.root.position.z = DIST - easeOut(T.lunge) * .5;
    E.update(dt);
    setTInfo(`${Math.min(T.i, T.N)} / ${T.N}`, `Perfect ${T.perfect} · Good ${T.good}`);
  },
  window() { return stats().parry; },
  slash(x0, y0, x1, y1) {
    if (T.state !== 'windup') return;
    const w0 = T.tele * (1 - this.window());
    const ring = ringInfo(T.E);
    if (segDist(ring.x, ring.y, x0, y0, x1, y1) > ring.r * 1.4) return;
    if (T.st < w0) { tPop('Too early!', ring.x, ring.y - 50, { size: 26, color: '#ffb38a' }); sfx.warn(); T.state = 'wait'; T.gap = .5; T.E.setHold('guard', 8); return; }
    const perfect = T.st >= T.tele - (T.tele - w0) * .4;
    if (perfect) T.perfect++; else T.good++;
    const bp = T.E.bladePoint(.6);
    FX.sparks(bp, '#fff3b0', perfect ? 40 : 22, 6); FX.glowBurst(bp, '#ffe08c', perfect ? 1.5 : 1);
    sfx.parry(); hitstop(perfect ? 100 : 60); if (perfect) { slowmo(.4, .35); OV.flash = .25; OV.flashCol = '255,240,200'; }
    tPop(perfect ? 'PERFECT!' : 'PARRY!', ring.x, ring.y - 50, { size: perfect ? 38 : 30, color: perfect ? '#ffe08c' : '#ffffff' });
    T.E.setHold('stagger', 10); T.E.jolt = .5; T.state = 'stagger'; T.st = 0;
  },
  draw(c) {
    if (T.state !== 'windup') return;
    const ring = ringInfo(T.E), w0 = T.tele * (1 - this.window());
    if (T.st >= w0) drawRing(c, ring.x, ring.y, ring.r, Math.max(0, 1 - (T.st - w0) / (T.tele - w0)), '255,214,90', 'SWIPE!');
    else { c.save(); c.globalAlpha = .35; drawRing(c, ring.x, ring.y, ring.r * .8, 0, '255,255,255'); c.restore(); }
  },
  xp() { return T.perfect * 9 + T.good * 5; },
  summary() { return `${T.perfect} perfect and ${T.good} good parries`; },
};

/* ---------- Lantern focus ---------- */
const StanceGame = {
  init() {
    T.dur = 25; T.inside = 0; T.hold = false; T.px = 0; T.py = 0; T.calm = 0;
    const g = new THREE.Group();
    const body = new THREE.Mesh(GEO.sph(.2, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffb35a', fog: false })); body.scale.set(1, 1.25, 1); g.add(body);
    const ribs = new THREE.Mesh(GEO.sph(.205, 16, 8), new THREE.MeshBasicMaterial({ color: '#a8341a', wireframe: true, fog: false })); ribs.scale.set(1, 1.25, 1); g.add(ribs);
    const capT = new THREE.Mesh(GEO.cyl(.09, .11, .06, 10), toon({ color: '#1a1214' })); capT.position.y = .26; g.add(capT);
    const capB = capT.clone(); capB.position.y = -.26; g.add(capB);
    T.halo = halo('#ffb35a', 1.6, .8); g.add(T.halo);
    T.light = new THREE.PointLight('#ffb35a', 1.4, 7); g.add(T.light);
    T.lantern = g; T.lbody = body; T.W.scene.add(g);
  },
  pos(t) { const s = t * (1 + t / 30); return new V3(Math.sin(s * .7) * 1.25 + Math.sin(s * 1.9) * .28, 1.45 + Math.sin(s * 1.1 + 1) * .45, 2.4 + Math.sin(s * .5) * .35); },
  update(dt) {
    const p = this.pos(T.t); T.lantern.position.copy(p); T.lantern.rotation.y += dt * .6; T.lantern.rotation.z = Math.sin(T.t * 2) * .1;
    const s = toScreen(p), r = Math.max(70, .3 * focalPx() / Math.max(.5, CAM.position.distanceTo(p)));
    T.ls = { x: s.x, y: s.y, r };
    T.on = T.hold && Math.hypot(T.px - s.x, T.py - s.y) < r * 1.2;
    if (T.on) { T.inside += dt; T.calm = Math.min(1, T.calm + dt * 2); if (Math.random() < dt * 20) FX.add.emit(p.x + rnd(-.2, .2), p.y + rnd(-.2, .2), p.z, rnd(-.2, .2), rnd(.3, .8), rnd(-.2, .2), 1, .06, 0, '#ffd27a', 1, -.1, .5); }
    else T.calm = Math.max(0, T.calm - dt * 3);
    T.halo.material.opacity = .5 + T.calm * .5; T.halo.scale.setScalar(1.4 + T.calm * 1.2); T.light.intensity = 1 + T.calm * 2;
    setTInfo(`${Math.max(0, Math.ceil(T.dur - T.t))}s left`, `Focus ${T.inside.toFixed(1)}s`);
    if (T.t >= T.dur) finishTraining();
  },
  down(x, y) { T.hold = true; T.px = x; T.py = y; },
  move(x, y) { T.px = x; T.py = y; },
  up() { T.hold = false; },
  draw(c) {
    if (!T.ls) return;
    const { x, y, r } = T.ls;
    c.save();
    c.strokeStyle = T.on ? 'rgba(255,214,120,.95)' : 'rgba(255,255,255,.45)'; c.lineWidth = T.on ? 5 : 3; c.setLineDash(T.on ? [] : [10, 10]);
    c.beginPath(); c.arc(x, y, r * 1.2, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    const phase = Math.sin(T.t * 1.3);
    c.font = "900 20px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = 'rgba(255,240,210,.9)'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 4;
    const msg = !T.hold ? 'Put your finger on the lantern' : T.on ? (phase > 0 ? 'Breathe in…' : 'Breathe out…') : 'Follow the lantern!';
    c.strokeText(msg, VW / 2, VH * .82); c.fillText(msg, VW / 2, VH * .82);
    c.restore();
  },
  xp() { return Math.round(T.inside * 5); },
  summary() { return `${T.inside.toFixed(1)} seconds of focus`; },
};

const TRAIN_KINDS = { bamboo: BambooGame, reflex: ReflexGame, parry: ParryGame, stance: StanceGame };

const TrainMode = {
  name: 'train',
  update(dt) {
    const G = TRAIN_KINDS[T.kind];
    if (T.delay > 0) { T.delay -= dt; if (T.delay <= 0) { banner('BEGIN!'); sfx.taiko(1); T.started = true; } }
    else if (!T.done) { T.t += dt; G.update(dt); }
    if (T.returnT > 0) { T.returnT -= dt; if (T.returnT <= 0) T.P.setHold(T.view === 'fp' ? 'fpGuard' : 'guard', 9); }
    T.P.update(dt);
    if (T.E && (T.done || !T.started)) T.E.update(dt);
    // camera
    const P = T.P; P.root.updateMatrixWorld(true);
    const look = new V3(0, 1.25, 2.6);
    let pos;
    if (T.view === 'fp') pos = P.chest.localToWorld(new V3(0, .46, -.12));
    else pos = P.root.localToWorld(new V3(-.72, 2.05, -2.15));
    T.camPos.lerp(pos, damp(14, dt)); T.camLook.lerp(look, damp(14, dt));
    CAM.position.copy(T.camPos); CAM.lookAt(T.camLook);
    CAM.fov = lerp(CAM.fov, T.view === 'fp' ? 70 : 55, damp(8, dt)); CAM.updateProjectionMatrix(); FX.setScale();
    applyShake(dt);
  },
  slash(x0, y0, x1, y1) {
    if (!T || !T.started || T.done) return;
    const now = performance.now() / 1000; if (now < T.cdUntil) return; T.cdUntil = now + .1;
    if (T.kind !== 'stance') trainSwing(x0, y0, x1, y1);
    const G = TRAIN_KINDS[T.kind]; if (G.slash) G.slash(x0, y0, x1, y1);
  },
  down(x, y) { const G = T && TRAIN_KINDS[T.kind]; if (G && G.down) G.down(x, y); },
  move(x, y) { const G = T && TRAIN_KINDS[T.kind]; if (G && G.move) G.move(x, y); },
  up() { const G = T && TRAIN_KINDS[T.kind]; if (G && G.up) G.up(); },
};
function drawTrainOverlay(c) { if (!T || !T.started || T.done) return; const G = TRAIN_KINDS[T.kind]; if (G.draw) G.draw(c); }

function finishTraining() {
  if (T.done) return;
  T.done = true;
  const G = TRAIN_KINDS[T.kind], info = TRAININGS[T.kind], key = info.skill;
  const xp = Math.max(5, Math.round(G.xp())), gold = Math.round(xp / 5);
  const before = S.sk[key].l;
  const ups = addSkillXP(key, xp); S.gold += gold; save();
  sfx.win(); banner('Training complete!');
  hint('');
  const s = S.sk[key], need = skillNeed(s.l);
  setTimeout(() => {
    openOverlay(`<div class="modal">
      <div class="kicker">${ups ? 'Level up!' : 'Well done!'}</div>
      <p>${G.summary()}.</p>
      <div class="panel" style="text-align:left">
        <div class="skill"><div class="glyph">${SKILLS[key].g}</div><div><div class="nm">${SKILLS[key].n} <small>+${xp} XP</small></div><div class="bar"><i style="width:${s.l >= 30 ? 100 : Math.round(s.x / need * 100)}%"></i></div></div><div class="lvl">Lv ${s.l}</div></div>
      </div>
      ${ups ? `<p><b>${SKILLS[key].n}</b> went from level ${before} to <b>${s.l}</b>! ${SKILLS[key].d}.</p>` : `<p class="muted">${s.l >= 30 ? 'Maxed out!' : `${need - s.x} XP until level ${s.l + 1}.`}</p>`}
      <div class="rewards"><span class="chip gold"><i></i>+${gold}</span></div>
      <div class="actions"><button class="btn primary" data-tres="again">Train again</button><button class="btn" data-tres="home">Back to dojo</button></div>
    </div>`);
    if (ups) sfx.up();
  }, 1300);
}
function trainResultAction(act) {
  const kind = T ? T.kind : 'bamboo';
  closeOverlay();
  if (act === 'again') { T = null; startTraining(kind); } else endTraining();
}
