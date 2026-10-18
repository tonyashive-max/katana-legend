'use strict';
/* ===== Single-player duel ===== */

const DIST = 2.55;
const PARTMUL = { head: 1.3, torso: 1, armL: .9, armR: .95, legs: .9 };
const THREAT_BLOCK = { R: 'blockL', L: 'blockR', H: 'blockH', Low: 'blockLow' };
const THREAT_LIMB = { R: 'armL', L: 'armR', H: 'head', Low: 'legs' };
let F = null;

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = clamp(t, 0, 1);
  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
}

/* ---------- screen-space hit testing ---------- */
function screenParts(rig) {
  const wp = rig.worldParts(), f = focalPx(), out = {};
  const seg = s => {
    const a = toScreen(s.a), b = s.b ? toScreen(s.b) : a;
    const d = Math.max(.3, CAM.position.distanceTo(s.a));
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y, r: Math.max(16, s.r * f / d), wa: s.a, wb: s.b || s.a };
  };
  out.head = [seg(wp.head)]; out.torso = [seg(wp.torso)];
  for (const k of ['armL', 'armR', 'legs']) if (wp[k]) out[k] = wp[k].map(seg);
  return out;
}
function hitTest(rig, x0, y0, x1, y1) {
  const sp = screenParts(rig), order = ['head', 'armR', 'armL', 'legs', 'torso'], tally = {}, pts = {};
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, x = lerp(x0, x1, t), y = lerp(y0, y1, t);
    for (const k of order) {
      const segs = sp[k]; if (!segs) continue;
      const s = segs.find(q => segDist(x, y, q.ax, q.ay, q.bx, q.by) < q.r);
      if (s) { tally[k] = (tally[k] || 0) + 1; if (!pts[k]) pts[k] = { s, t }; break; }
    }
  }
  let best = null; for (const k in tally) if (!best || tally[k] > tally[best]) best = k;
  if (!best || tally[best] < 2) return null;
  const s = pts[best].s;
  return { part: best, world: s.wa.clone().lerp(s.wb, .5), sx: (x0 + x1) / 2, sy: (y0 + y1) / 2 };
}

/* ---------- HUD helpers ---------- */
const $ = s => document.querySelector(s);
function dollSVG(el, mirror) {
  const L = mirror ? 'R' : 'L', Rr = mirror ? 'L' : 'R';
  el.innerHTML = `<circle data-p="head" cx="23" cy="8" r="7"/><rect data-p="torso" x="15" y="16.5" width="16" height="20" rx="4"/>`
    + `<rect data-p="arm${L}" x="5.5" y="17" width="7.5" height="21" rx="3.5"/><rect data-p="arm${Rr}" x="33" y="17" width="7.5" height="21" rx="3.5"/>`
    + `<rect data-p="legs" x="14.5" y="38.5" width="17" height="22" rx="4"/>`;
}
function dollUpdate(el, hp, det) {
  el.querySelectorAll('[data-p]').forEach(n => {
    const p = n.dataset.p, gone = p === 'head' ? det.helm : det[p];
    const r = hp[p] == null ? 1 : hp[p];
    n.setAttribute('fill', gone ? 'rgba(30,32,46,.9)' : r > .6 ? '#7fe0a0' : r > .3 ? '#ffd166' : '#ff6b5b');
    n.setAttribute('stroke', gone ? '#ff6b5b' : 'rgba(0,0,0,.7)');
    n.setAttribute('stroke-width', '1.5');
    n.setAttribute('stroke-dasharray', gone ? '2 2' : '');
  });
}
let bannerTimer = 0;
function banner(text, sub) {
  const b = $('#banner'); b.classList.remove('show'); void b.offsetWidth;
  b.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); b.classList.add('show');
}
function hint(t) { const h = $('#hint'); if (h.textContent !== (t || '')) h.textContent = t || ''; }
function setBar(id, ratio) { const r = clamp(ratio, 0, 1) * 100 + '%'; $('#' + id).style.width = r; const g = $('#' + id + 'Ghost'); if (g) g.style.width = r; }

/* ---------- start / end ---------- */
function startFight(idx) {
  const st = STAGES[idx];
  transition(() => {
    clearSceneActors();
    const W = buildWorld(st.ch); activateWorld(W);
    const ps = stats();
    const P = new Samurai(lookFromOutfit(outfitDef(S.outfit)), swordDef(eqSword().id), { player: true });
    const E = new Samurai(st.look, swordDef(st.sword), { boss: !!st.boss });
    E.root.rotation.order = 'YXZ'; P.root.rotation.order = 'YXZ';
    E.root.position.set(0, 0, DIST); E.root.rotation.y = Math.PI;
    W.scene.add(P.root, E.root, P.trail.mesh, E.trail.mesh);
    F = {
      st, idx, W, P, E, ps, view: S.view,
      pmax: ps.maxHp, php: ps.maxHp, emax: st.hp, ehp: st.hp,
      plimb: { armL: ps.maxHp * .5, armR: ps.maxHp * .5, legs: ps.maxHp * .5, head: ps.maxHp * .45 },
      plimbMax: ps.maxHp * .5,
      elimb: { head: st.hp * .3, armR: st.hp * .38, armL: st.hp * .3, legs: st.hp * .4 },
      elimbMax: { head: st.hp * .3, armR: st.hp * .38, armL: st.hp * .3, legs: st.hp * .4 },
      spirit: 0, blocking: false, cdUntil: 0, clock: 0,
      state: 'intro', t: 0, dur: 0, tele: 1, dir: 'R', chained: false, resolved: false, feinted: false,
      guardDir: 'R', guardHits: 0, over: false, outcome: null, introT: 0, endT: 0,
      combo: 0, comboT: 0, parries: 0, lostLimb: false, special: null, trophy: null, atkMul: 1, legsPenalty: 1,
      ex: 0, lunge: 0, kb: 0, returnT: 0, camPos: new V3(), camLook: new V3(), camK: 30, blockPose: null, leaveArm: 0,
      tutorial: S.wins < 2,
    };
    P.setFP(F.view === 'fp');
    P.setHold(guardPose(), 10);
    E.setHold('guard', 10);
    // initial camera
    CAM.position.set(Math.sin(1) * 3 + 0, 1.8, DIST + Math.cos(1) * 3); F.camPos.copy(CAM.position); F.camLook.set(0, 1.3, DIST);
    // HUD
    showHUD('fight');
    $('#meName').innerHTML = (S.name || 'Shep').toUpperCase() + `<small>${outfitDef(S.outfit).name}</small>`;
    $('#foeName').innerHTML = st.name.toUpperCase() + `<small>${st.title}</small>`;
    $('#stageLbl').textContent = `${CHAPTERS[st.ch].name} · ${idx + 1} / ${STAGES.length}`;
    dollSVG($('#dollMe'), false); dollSVG($('#dollFoe'), true);
    $('#viewBtn').textContent = F.view === 'fp' ? 'Behind view' : 'First person';
    OV.draw = drawFightOverlay; OV.trailCol = hexRGB(swordDef(eqSword().id).glow || '#ffffff');
    updateFightHUD();
    banner(st.name, st.title);
    sfx.taiko(1); MUSIC.start('fight');
    setMode(FightMode);
  });
}
function guardPose() { return F && F.view === 'fp' ? 'fpGuard' : 'guard'; }
function hexRGB(h) { const c = new COL(h); return `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`; }

function endFight() {
  F = null; OV.draw = null; hideHUD();
  enterHub();
}

/* ---------- enemy AI ---------- */
function toState(s, dur) { F.state = s; F.t = 0; F.dur = dur || 0; }
function aiDecide() {
  const st = F.st, g = st.guard * (F.E.det.armL ? .5 : 1);
  if (Math.random() < g) {
    F.guardDir = pick(['R', 'L', 'H']); F.guardHits = 0;
    F.E.setHold('block' + F.guardDir, 12); toState('guard', rnd(1.0, 1.7));
  } else windup(false);
}
function windup(chain) {
  const st = F.st;
  const dirs = ['R', 'L', 'H'];
  let dir = pick(dirs); if (st.low && Math.random() < st.low) dir = 'Low';
  F.dir = dir; F.chained = !!chain; F.feinted = false;
  F.tele = st.tele / 1000 * (chain ? .72 : 1) * (F.E.det.legs ? 1.3 : 1);
  F.E.seq.length = 0; F.E.setHold('wind' + dir, 4.2 / F.tele);
  toState('windup');
  sfx.warn();
}
function strike() {
  toState('strike'); F.resolved = false;
  F.E.seq.length = 0; F.E.queue('end' + F.dir, .17, { ease: easeIn, arc: .3 });
  F.lunge = 1; sfx.slash(1.3);
}
function aiUpdate(dt) {
  F.t += dt;
  const st = F.st, E = F.E;
  switch (F.state) {
    case 'idle': if (F.t > F.dur) aiDecide(); break;
    case 'guard': if (F.t > F.dur) toIdle(); break;
    case 'windup':
      if (!F.feinted && st.feint && F.t > F.tele * .35) {
        F.feinted = true;
        if (Math.random() < st.feint) {
          const nd = pick(['R', 'L', 'H'].filter(d => d !== F.dir)); F.dir = nd;
          E.setHold('wind' + nd, 10); F.t = F.tele * .2;
          const s = toScreen(E.bladePoint(.5)); ovPop(s.x, s.y - 40, 'FEINT!', { size: 26, color: '#c9b6ff' });
        }
      }
      if (F.t >= F.tele) strike();
      break;
    case 'strike':
      if (!F.resolved && F.t >= .09) { F.resolved = true; enemyHitsPlayer(); }
      if (F.t >= .34 && !F.over) {
        if (!F.chained && Math.random() < st.combo) windup(true);
        else { E.setHold('guard', 7); toState('recover', .65); }
      }
      break;
    case 'recover': case 'stagger': if (F.t > F.dur) toIdle(); break;
    default: break;
  }
  // footwork
  const strafe = (F.state === 'idle' || F.state === 'guard') && !E.det.legs && !F.over;
  F.ex = lerp(F.ex, strafe ? Math.sin(F.clock * .7) * .38 : F.ex * .6, damp(2.2, dt));
  F.lunge = Math.max(0, F.lunge - dt * 2.6);
  F.kb = Math.max(0, F.kb - dt * 1.2);
  if (!F.over || F.outcome !== 'win') {
    E.root.position.set(F.ex, 0, DIST - easeOut(F.lunge) * .5 + F.kb);
    E.root.rotation.y = Math.atan2(F.P.root.position.x - E.root.position.x, F.P.root.position.z - E.root.position.z);
  }
  F.P.root.rotation.y = Math.atan2(E.root.position.x - F.P.root.position.x, E.root.position.z - F.P.root.position.z);
}
function toIdle() { F.E.setHold('guard', 8); toState('idle', rnd(.55, 1.3) * clamp(F.st.tele / 1300, .5, 1.2)); }

/* ---------- enemy hits player ---------- */
function enemyHitsPlayer() {
  if (F.over) return;
  const st = F.st, P = F.P, E = F.E;
  const limb = THREAT_LIMB[F.dir];
  let d = st.dmg * rnd(.9, 1.1) * (E.det.armR ? .6 : 1) * (E.det.legs ? .85 : 1);
  if (limb === 'head' && P.det.helm) d *= 1.3;
  const sc = { x: VW / 2, y: VH * .72 };
  if (F.blocking) {
    const red = F.ps.block * (P.det.armL ? .5 : 1);
    d *= 1 - red; F.plimb[limb] -= d * .35;
    sfx.clang(1.1); FX.sparks(P.bladePoint(.45), '#d9eeff', 22, 4.5); shake(.025); P.jolt = .25;
    ovPop(sc.x, sc.y - 30, 'BLOCKED', { size: 26, color: '#bfe2ff', stroke: '#0a1a3a' });
  } else {
    F.plimb[limb] -= d;
    sfx.hurt(); shake(.09); OV.vig = 1; OV.vigCol = '255,40,30'; P.hitFlash(1);
    FX.sparks(P.partCenter(limb === 'head' ? 'head' : limb), '#ffffff', 16, 3.5);
    F.combo = 0;
    ovPop(sc.x + rnd(-60, 60), sc.y, '-' + Math.round(d), { size: 34, color: '#ff8a7a' });
  }
  F.php -= d;
  const key = limb === 'head' ? 'helm' : limb;
  if (F.plimb[limb] <= 0 && !P.det[key]) playerLoseLimb(limb);
  if (F.php <= 0 && !F.over) defeat('Defeated');
  updateFightHUD();
}
function playerLoseLimb(limb) {
  const P = F.P, key = limb === 'head' ? 'helm' : limb;
  const g = P.detach(key, F.W.scene, new V3(rnd(-1, 1), 0, -2));
  if (g) g.traverse(o => { o.visible = true; });
  F.lostLimb = true;
  sfx.chop(); shake(.12); OV.vig = 1;
  const msg = { armR: ['Sword arm lost!', 'Fighting with your left hand'], armL: ['Left arm lost!', 'Your blocks are weaker'], legs: ['Legs lost!', 'You are fighting on your knees'], head: ['Helmet knocked off!', 'Protect your head'] }[limb];
  banner(msg[0], msg[1]);
  if (limb === 'armR') F.atkMul = .65;
  if (limb === 'legs') F.legsPenalty = .8;
  if (P.det.armL && P.det.armR) defeat('Disarmed!');
}

/* ---------- player attacks ---------- */
function slashPoses(ux, uy) {
  const v = new V3(-ux, -uy, 0).normalize();
  const C = new V3(-.02, .2, .4);
  const p0 = C.clone().addScaledVector(v, -.42); p0.z -= .08;
  const p1 = C.clone().addScaledVector(v, .42); p1.z += .06;
  const d0 = v.clone().multiplyScalar(-.9).add(new V3(0, .18, .35)).normalize();
  const d1 = v.clone().multiplyScalar(.9).add(new V3(0, -.05, .45)).normalize();
  return [{ p: p0.toArray(), d: d0.toArray(), e: v.toArray() }, { p: p1.toArray(), d: d1.toArray(), e: v.toArray() }];
}
function rigSwing(rig, ux, uy, d2) { const [a, b] = slashPoses(ux, uy); rig.swing(a, b, .05, d2 || .13, { arc: .26 }); }
function parryWindow() { return F.ps.parry * F.legsPenalty; }
function ringInfo(rig, f) {
  const bp = rig.bladePoint(f || .55), s = toScreen(bp);
  const d = Math.max(.4, CAM.position.distanceTo(bp));
  return { x: s.x, y: s.y, r: Math.max(48, .2 * focalPx() / d) };
}
function fightSlash(x0, y0, x1, y1) {
  if (!F || F.state === 'intro' || F.over || F.special) return;
  if (F.clock < F.cdUntil) return;
  F.cdUntil = F.clock + F.ps.cd / 1000 * (F.P.det.armR ? 1.25 : 1);
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len;
  rigSwing(F.P, ux, uy); F.returnT = .3; sfx.slash();
  // parry
  if (F.state === 'windup' && F.t >= F.tele * (1 - parryWindow())) {
    const ring = ringInfo(F.E);
    if (segDist(ring.x, ring.y, x0, y0, x1, y1) < ring.r * 1.4) { doParry(); return; }
  }
  const hit = hitTest(F.E, x0, y0, x1, y1);
  if (!hit) return;
  if (F.state === 'guard' && guardBlocks(hit)) {
    sfx.clang(); const bp = F.E.bladePoint(.5); FX.sparks(bp, '#cfe6ff', 18, 4);
    const s = toScreen(bp); ovPop(s.x, s.y - 30, 'BLOCKED', { size: 24, color: '#bfe2ff', stroke: '#0a1a3a' });
    F.guardHits++; F.E.jolt = .2;
    if (F.guardHits >= 3) { banner('GUARD BREAK!'); F.E.setHold('stagger', 10); toState('stagger', .95); sfx.taiko(.8); F.spirit = Math.min(100, F.spirit + 10); }
    return;
  }
  let dmg = F.ps.atk * F.atkMul * rnd(.9, 1.1) * (1 + Math.min(.5, F.combo * .05)) * PARTMUL[hit.part];
  let crit = false;
  if (F.state === 'stagger') { dmg *= 1.6; crit = true; } else if (F.state === 'recover') dmg *= 1.2;
  damageEnemy(hit.part, dmg, crit, hit.world, hit.sx, hit.sy);
}
function guardBlocks(hit) {
  const c = toScreen(F.E.chest.getWorldPosition(new V3()));
  if (hit.part === 'legs') return false;
  if (F.guardDir === 'R') return hit.sx < c.x + 24;
  if (F.guardDir === 'L') return hit.sx > c.x - 24;
  return hit.part === 'head' || hit.part === 'armL' || hit.part === 'armR' || hit.sy < c.y - 20;
}
function damageEnemy(part, dmg, crit, world, sx, sy) {
  const E = F.E, glow = swordDef(eqSword().id).glow || '#ffffff';
  F.ehp -= dmg; E.hitFlash(1); F.kb = Math.min(.3, F.kb + .1);
  FX.sparks(world, glow, 14, 4); FX.sparks(world, '#ffffff', 8, 3);
  FX.glowBurst(world, glow, .7);
  sfx.hit(); shake(crit ? .05 : .025); hitstop(crit ? 70 : 35);
  F.combo++; F.comboT = 1.3;
  F.spirit = Math.min(100, F.spirit + 7);
  ovPop(sx + rnd(-30, 30), sy - 20, (crit ? 'CRIT ' : '') + Math.round(dmg), { size: crit ? 40 : 32, color: crit ? '#ffe08c' : '#ffffff' });
  if (F.combo >= 3 && F.combo % 3 === 0) ovPop(VW / 2, VH * .32, F.combo + ' HIT COMBO', { size: 28, color: '#8fe8ff', stroke: '#06203a', vy: -20 });
  if (F.elimb[part] != null) {
    const key = part === 'head' ? 'helm' : part;
    F.elimb[part] -= dmg;
    if (F.elimb[part] <= 0 && !E.det[key]) enemyLoseLimb(part, sx, sy);
  }
  if (S.swords && swordDef(eqSword().id).id === 'sakura') FX.petals(world, 14, '#ffb7d0', 2.5);
  if (F.ehp <= 0) win('VICTORY!');
  else if (E.det.armL && E.det.armR) win('DISARMED!');
  updateFightHUD();
}
function enemyLoseLimb(part, sx, sy) {
  const E = F.E, key = part === 'head' ? 'helm' : part;
  const at = E.partCenter(part === 'head' ? 'head' : part);
  if (key === 'helm' && !E.helmMesh) { E.det.helm = true; }
  else E.detach(key, F.W.scene, new V3(rnd(-1.5, 1.5), 0, 2.2));
  FX.puff(at, 10, '#ffffff', .6); FX.sparks(at, '#ffe08c', 26, 5.5); FX.glowBurst(at, '#fff2c0', 1.6, .3);
  sfx.chop(); hitstop(110); shake(.07);
  F.spirit = Math.min(100, F.spirit + 12);
  F.ehp -= F.emax * .05;
  ovPop(sx, sy - 40, pick(['CHOP!', 'POW!', 'SLICE!', 'WHAM!']), { size: 44, color: '#2a1200', stroke: '#fff6d8', burst: pick(['#ffd23a', '#ff8a3a', '#7fe8ff', '#ff7ab8']), rot: rnd(-.25, .25), life: 1.1, vy: -30 });
  const msg = { armR: ['Sword arm chopped!', 'Their attacks are weaker'], armL: ['Arm chopped!', 'They can barely guard'], legs: ['Legs chopped!', 'They are slower now'], head: ['Helmet knocked off!', 'They are dazed'] }[part];
  banner(msg[0], msg[1]);
  if (part === 'head') { E.setHold('stagger', 10); toState('stagger', 1.1); }
}
function doParry() {
  F.parries++; S.parries++;
  const E = F.E, bp = E.bladePoint(.6);
  E.seq.length = 0; E.setHold('stagger', 10); E.jolt = .6; F.kb = .28;
  toState('stagger', 1.25);
  FX.sparks(bp, '#fff3b0', 44, 6.5, .09); FX.glowBurst(bp, '#ffe08c', 1.6, .35);
  sfx.parry(); hitstop(110); slowmo(.35, .45); shake(.05); OV.flash = .35; OV.flashCol = '255,240,200'; SHAKE.fov = 7;
  banner('PARRY!');
  F.spirit = Math.min(100, F.spirit + 22);
  updateFightHUD();
}
function useSpecial() {
  if (!F || F.spirit < 100 || F.over || F.state === 'intro' || F.special) return;
  F.spirit = 0; F.special = { t: 0, hits: 0 };
  const glow = swordDef(eqSword().id).glow || '#ffe08c';
  slowmo(.42, 1.4); sfx.special(); OV.flash = .55; OV.flashCol = hexRGB(glow); SHAKE.fov = 10;
  banner('SPIRIT STRIKE!', swordDef(eqSword().id).name);
  F.E.seq.length = 0; F.E.setHold('stagger', 8); toState('stagger', 2.2);
  updateFightHUD();
}
const SPECIAL_SWINGS = [[.85, .5], [-1, -.05], [.1, 1]];
function specialUpdate(dt) {
  const sp = F.special; sp.t += dt;
  const at = [.05, .32, .6];
  while (sp.hits < 3 && sp.t >= at[sp.hits]) {
    const [ux, uy] = SPECIAL_SWINGS[sp.hits];
    rigSwing(F.P, ux, uy, .11); F.P.trail.boost = 1.5; sfx.slash(1.4);
    const intact = ['armL', 'legs', 'armR', 'head'].filter(p => !F.E.det[p === 'head' ? 'helm' : p]);
    const part = intact.length ? pick(intact) : 'torso';
    if (sp.hits === 2 && F.elimb[part] != null) F.elimb[part] = Math.min(F.elimb[part], 1);
    const w = F.E.partCenter(part), s = toScreen(w);
    FX.petals(w, 18, swordDef(eqSword().id).glow || '#ffe08c', 3);
    damageEnemy(part, F.ps.atk * F.atkMul * 2.6, true, w, s.x, s.y);
    sp.hits++;
    if (F.over) break;
  }
  if (sp.hits >= 3 && sp.t > .9) { F.special = null; F.returnT = .1; }
}

/* ---------- win / lose ---------- */
function win(reason) {
  if (F.over) return;
  F.over = true; F.outcome = 'win'; F.endT = 0;
  toState('ko'); slowmo(.3, 1.1); hitstop(140);
  F.E.ko(); F.P.setHold('show', 5);
  const g = F.E.dropSword(F.W.scene, null, true);
  if (g) {
    const rc = RAR[swordDef(F.st.sword).r].c;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 30, 16, 1, true), new THREE.MeshBasicMaterial({ color: rc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    F.W.scene.add(beam);
    const h = halo(rc, 2.2, 0); F.W.scene.add(h);
    F.trophy = { g, beam, h, from: g.position.clone(), q0: g.quaternion.clone(), t: 0 };
  }
  banner(reason); sfx.win(); OV.flash = .5; OV.flashCol = '255,240,210';
  updateFightHUD();
}
function defeat(reason) {
  if (F.over) return;
  F.over = true; F.outcome = 'lose'; F.endT = 0;
  F.P.ko(); F.E.setHold('show', 4);
  banner(reason); sfx.lose(); slowmo(.4, .8);
  F.state = 'idle';
}
function trophyUpdate(dt) {
  const T = F.trophy; if (!T) return;
  T.t += dt;
  const target = new V3(F.E.root.position.x * .5, 1.5, DIST * .5 + .2);
  const k = easeOut(clamp(T.t / 1.3, 0, 1));
  T.g.position.copy(T.from).lerp(target, k); T.g.position.y += Math.sin(k * Math.PI) * .8 + Math.sin(T.t * 2) * .04 * k;
  T.g.quaternion.copy(T.q0);
  T.g.rotation.set(0, T.t * 3, 0); T.g.rotateZ(Math.PI * .5 * k);
  T.beam.position.set(target.x, 15, target.z); T.beam.material.opacity = Math.min(.35, k * .35) * (.8 + Math.sin(T.t * 6) * .2);
  T.h.position.copy(T.g.position); T.h.material.opacity = k * .8;
  if (Math.random() < dt * 30) FX.add.emit(target.x + rnd(-.4, .4), rnd(0, 2.4), target.z + rnd(-.4, .4), 0, rnd(.5, 1.5), 0, 1, .06, 0, RAR[swordDef(F.st.sword).r].c, 1, 0, .3);
}

/* ---------- per-frame ---------- */
const FightMode = {
  name: 'fight',
  update(dt) {
    const P = F.P, E = F.E;
    F.clock += dt;
    if (F.state === 'intro') {
      F.introT += dt;
      if (F.introT > 2.3 && !F.fightShown) { F.fightShown = true; banner('FIGHT!'); sfx.taiko(1.3); }
      if (F.introT > 2.8) { F.camK = 5; toIdle(); }
    } else if (!F.over) aiUpdate(dt);
    else if (F.outcome === 'lose' && F.state !== 'ko') { F.ex *= .98; }
    if (F.over) {
      F.endT += dt;
      if (F.outcome === 'win') trophyUpdate(dt);
      if (!F.resultShown && F.endT > (F.outcome === 'win' ? 2.6 : 2.1)) { F.resultShown = true; showFightResult(); }
    }
    // player pose control
    if (F.special) specialUpdate(dt);
    if (!F.over && !F.special) {
      if (F.returnT > 0) { F.returnT -= dt; if (F.returnT <= 0 && !F.blocking) P.setHold(guardPose(), 9); }
      if (F.blocking && F.returnT <= 0) {
        const bp = (F.state === 'windup' || F.state === 'strike') ? THREAT_BLOCK[F.dir] : 'blockMid';
        if (bp !== F.blockPose) { F.blockPose = bp; P.setHold(bp, 16); }
      }
    }
    if (F.comboT > 0) { F.comboT -= dt; if (F.comboT <= 0) F.combo = 0; }
    P.update(dt); E.update(dt);
    auraFX(P, dt); auraFX(E, dt);
    fightCamera(dt);
    // hints
    if (!F.over && F.state !== 'intro') {
      if (F.spirit >= 100) hint('Spirit is full! Tap SPIRIT STRIKE!');
      else if (F.tutorial) {
        if (F.state === 'windup') hint('Gold ring! Swipe through it to PARRY, or hold BLOCK.');
        else if (F.state === 'guard') hint('Blue shield is blocking that side. Hit the other side or the legs!');
        else hint('Swipe across the enemy to slash. Chop off armor and limbs!');
      } else hint('');
    } else hint('');
  },
  slash: fightSlash,
};
function auraFX(rig, dt) {
  if (rig.koT > .8) return;
  const a = rig.look && rig.look.aura;
  if (a && Math.random() < dt * 26) {
    const p = rig.root.position;
    FX.add.emit(p.x + rnd(-.45, .45), rnd(.1, 1.9), p.z + rnd(-.45, .45), rnd(-.1, .1), rnd(.3, .9), rnd(-.1, .1), rnd(.7, 1.2), .07, 0, a, .9, -.2, .4);
  }
  const d = rig.swordDef;
  if ((d.r === 'legendary' || d.r === 'mythic') && !rig.swordDropped && Math.random() < dt * 14) {
    const bp = rig.bladePoint(rnd(.15, 1)); FX.add.emit(bp.x, bp.y, bp.z, rnd(-.1, .1), rnd(.1, .4), rnd(-.1, .1), .6, .05, 0, d.glow, 1, 0, .5);
  }
}
function fightCamera(dt) {
  const P = F.P, E = F.E;
  P.root.updateMatrixWorld(true); E.root.updateMatrixWorld(true);
  const eChest = E.chest.localToWorld(new V3(0, .18, 0));
  let pos, look, fov, k;
  if (F.state === 'intro') {
    const kk = clamp(F.introT / 2.5, 0, 1), a = lerp(.9, 2.85, ease(kk));
    pos = E.root.position.clone().add(new V3(Math.sin(a) * 3.1, 1.15 + .7 * (1 - kk), Math.cos(a) * 3.1));
    look = eChest; fov = 48; k = 40;
  } else if (F.over && F.outcome === 'win') {
    const c = F.trophy ? F.trophy.g.position.clone() : eChest;
    const a = 3.4 + F.endT * .35;
    pos = new V3(c.x + Math.sin(a) * 2.6, 1.7, c.z + Math.cos(a) * 2.6); look = c; fov = 52; k = 3;
  } else if (F.over && F.outcome === 'lose') {
    pos = P.root.localToWorld(new V3(.9, .6 + Math.max(0, 1 - F.endT) * 1.2, -1.2)); look = eChest; fov = 55; k = 3;
  } else if (F.view === 'fp') {
    pos = P.hips.localToWorld(new V3(0, .68, -.12)); look = eChest; fov = 70; k = F.camK;
  } else {
    pos = P.root.localToWorld(new V3(-.72, 2.05, -2.15));
    look = P.chest.getWorldPosition(new V3()).lerp(eChest, .72); fov = 55; k = F.camK;
  }
  F.camK = Math.min(30, F.camK + dt * 14);
  F.camPos.lerp(pos, damp(k, dt)); F.camLook.lerp(look, damp(k, dt));
  CAM.position.copy(F.camPos); CAM.lookAt(F.camLook);
  CAM.fov = lerp(CAM.fov, fov + SHAKE.fov, damp(9, dt)); SHAKE.fov *= Math.exp(-dt * 6);
  CAM.updateProjectionMatrix(); FX.setScale();
  applyShake(dt);
}
function drawFightOverlay(c) {
  if (!F || F.over || F.state === 'intro') return;
  if (F.state === 'windup') {
    const ring = ringInfo(F.E), win0 = F.tele * (1 - parryWindow());
    if (F.t >= win0) {
      const ap = 1 - (F.t - win0) / (F.tele - win0);
      drawRing(c, ring.x, ring.y, ring.r, Math.max(0, ap), '255,214,90', F.tutorial ? 'SWIPE!' : '');
    } else {
      c.save(); c.globalAlpha = .35 + .2 * Math.sin(F.t * 20); drawRing(c, ring.x, ring.y, ring.r * .8, 0, '255,255,255'); c.restore();
    }
  }
  if (F.state === 'guard') {
    const ch = toScreen(F.E.chest.localToWorld(new V3(0, .15, 0))), hd = toScreen(F.E.head.getWorldPosition(new V3())), lg = toScreen(F.E.root.localToWorld(new V3(0, .5, 0)));
    const w = Math.abs(lg.y - hd.y) * .55, x = ch.x;
    c.save(); c.globalAlpha = .28 + .1 * Math.sin(F.clock * 10);
    const g = c.createLinearGradient(0, hd.y - w * .4, 0, lg.y);
    g.addColorStop(0, 'rgba(140,200,255,.9)'); g.addColorStop(1, 'rgba(140,200,255,.15)');
    c.fillStyle = g; c.strokeStyle = 'rgba(200,235,255,1)'; c.lineWidth = 3;
    c.beginPath();
    if (F.guardDir === 'R') c.roundRect ? c.roundRect(x - w * 1.05, hd.y - w * .4, w, (lg.y - hd.y) * .8, 18) : c.rect(x - w * 1.05, hd.y - w * .4, w, (lg.y - hd.y) * .8);
    else if (F.guardDir === 'L') c.roundRect ? c.roundRect(x + w * .05, hd.y - w * .4, w, (lg.y - hd.y) * .8, 18) : c.rect(x + w * .05, hd.y - w * .4, w, (lg.y - hd.y) * .8);
    else c.roundRect ? c.roundRect(x - w, hd.y - w * .55, w * 2, (ch.y - hd.y) + w * .4, 18) : c.rect(x - w, hd.y - w * .55, w * 2, (ch.y - hd.y) + w * .4);
    c.fill(); c.globalAlpha = .7; c.stroke(); c.restore();
  }
}
function updateFightHUD() {
  if (!F) return;
  setBar('hpMe', F.php / F.pmax); setBar('hpFoe', F.ehp / F.emax);
  $('#spMe').style.width = F.spirit + '%';
  $('#spWrap').classList.toggle('full', F.spirit >= 100);
  $('#specialBtn').classList.toggle('ready', F.spirit >= 100 && !F.over);
  const pl = {}; for (const k in F.plimb) pl[k] = F.plimb[k] / F.plimbMax;
  const el = {}; for (const k in F.elimb) el[k] = F.elimb[k] / F.elimbMax[k];
  pl.torso = F.php / F.pmax; el.torso = F.ehp / F.emax;
  dollUpdate($('#dollMe'), pl, F.P.det); dollUpdate($('#dollFoe'), el, F.E.det);
  $('#spFoeWrap').style.visibility = 'hidden';
}

/* ---------- results ---------- */
function grantWin() {
  const st = F.st, idx = F.idx, first = idx >= S.cleared;
  const r = { first, gold: Math.round(st.gold * (first ? 1 : .6)), steel: Math.round(st.steel * (first ? 1 : .6)), sword: st.sword, newSword: false, smelt: 0, outfit: null, newStars: 0, stars: 0, swordU: null };
  if (first) S.cleared = Math.max(S.cleared, idx + 1);
  if (!ownsSword(st.sword)) { const w = addSword(st.sword); r.newSword = true; r.swordU = w.u; }
  else { r.smelt = smeltValue({ id: st.sword, lvl: 0 }); r.steel += r.smelt; }
  if (st.outfit && !S.outfits.includes(st.outfit)) { S.outfits.push(st.outfit); r.outfit = st.outfit; }
  const stars = 1 + (F.lostLimb ? 0 : 1) + (F.parries >= 3 ? 1 : 0);
  const prev = S.stars[idx] || 0;
  if (stars > prev) { r.newStars = stars - prev; S.stars[idx] = stars; r.gold += r.newStars * 40; }
  r.stars = stars;
  S.gold += r.gold; S.steel += r.steel; S.wins++;
  save();
  return r;
}
function starRow(n, max) { let s = ''; for (let i = 0; i < (max || 3); i++) s += i < n ? '<b>★</b>' : '★'; return `<span class="stars">${s}</span>`; }
function showFightResult() {
  hint('');
  if (F.outcome === 'win') {
    const r = grantWin(), d = swordDef(r.sword), rc = RAR[d.r];
    const next = F.idx + 1 < STAGES.length ? F.idx + 1 : null;
    openOverlay(`<div class="modal win">
      <div class="kicker">Victory!</div>
      <p><b>${F.st.name}</b> is defeated. ${starRow(r.stars)}</p>
      <div class="reveal" style="--rc:${rc.c}33;--glow:${d.glow || rc.c}">${'<div class="rays"></div>'}${bladeSVG(d)}</div>
      <div><div class="rar ${d.r}" style="color:${rc.c}">${rc.n}</div><h3 class="name ${d.r}">${d.name}</h3></div>
      <p class="muted">${r.newSword ? 'You won their sword! It is in your collection now.' : `You already own this blade, so it was smelted into ${r.smelt} steel.`}</p>
      <div class="rewards"><span class="chip gold"><i></i>+${r.gold}</span><span class="chip steel"><i></i>+${r.steel}</span>${r.newStars ? `<span class="chip">+${r.newStars} ★</span>` : ''}</div>
      ${r.outfit ? `<p><span class="tag new">New outfit</span> <b>${outfitDef(r.outfit).name}</b> unlocked!</p>` : ''}
      <p class="muted" style="font-size:13px">Stars: win · keep all your limbs · parry 3 times</p>
      <div class="actions">
        ${r.newSword ? `<button class="btn primary" data-res="equip" data-u="${r.swordU}">Equip new blade</button>` : ''}
        ${next != null ? `<button class="btn ${r.newSword ? '' : 'primary'}" data-res="next">Next battle</button>` : ''}
        <button class="btn" data-res="retry">Fight again</button>
        <button class="btn" data-res="home">Back to dojo</button>
      </div></div>`);
  } else {
    openOverlay(`<div class="modal">
      <div class="kicker lose">Defeated</div>
      <p><b>${F.st.name}</b> was too strong this time. Your wounds heal after every battle.</p>
      <p class="muted">Tips: train in the dojo to level up your skills, forge your blade at the forge, and swipe through the gold ring to parry.</p>
      <div class="actions">
        <button class="btn primary" data-res="retry">Try again</button>
        <button class="btn jade" data-res="train">Go train</button>
        <button class="btn" data-res="home">Back to dojo</button>
      </div></div>`);
  }
}
function fightResultAction(act, el) {
  const idx = F ? F.idx : 0;
  closeOverlay();
  if (act === 'equip') { S.eq = +el.dataset.u; save(); toast('Equipped ' + swordDef(eqSword().id).name + '!'); }
  if (act === 'next' || (act === 'equip' && idx + 1 < STAGES.length && false)) { F = null; startFight(idx + 1); return; }
  if (act === 'retry') { F = null; startFight(idx); return; }
  if (act === 'train') { endFight(); setTimeout(() => showTab('train'), 450); return; }
  endFight();
}
