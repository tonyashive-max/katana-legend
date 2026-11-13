'use strict';
/* ===== ROAD RUN =====
   Two samurai (or one), one life each, the whole Tokaido against the clock. Every town is its road and
   the six who guard it, fought where you stand: no duel screen. Both players are given the same strength,
   so anyone can run with anyone, and nothing in a run changes a real save.
   One tablet decides what the enemies do (the host, or whoever is left); each tablet decides its own
   cuts, blocks and parries, so a slow connection never steals a parry. */
let RUN = null;
const RUN_ROLES = ['a', 'w0', 'w1', 'myth', 'beast', 'keeper'];
const RUN_Z = { a: -46, w0: -26, w1: -8, myth: 10, beast: 28, keeper: 46 };
const RUN_HP = { a: 55, w0: 70, w1: 70, myth: 150, beast: 185, keeper: 230 };
const RUN_DMG = { a: 9, w0: 11, w1: 11, myth: 15, beast: 17, keeper: 19 };
const RUN_ME = { hp: 100, cut: 12, cd: .34, reach: 2.9, sta: 100 };
const CUT_NAME = ['HIGH', 'MID', 'LOW'], CUT_ARROW = ['⬆', '⬇', '⬌']; // the swipe that beats a HIGH / MID / LOW guard
const fmtClock = s => { s = Math.max(0, s); const m = Math.floor(s / 60); return m + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor(s * 10 % 10); };
const runMe = () => (typeof CO !== 'undefined' && CO.on ? CO.me : 'solo');
const runPeer = () => (typeof CO !== 'undefined' && CO.on ? coopPeers().find(p => p.rr) || null : null);
function runSend(o) { if (typeof CO === 'undefined' || !CO.on) return; try { NET.send('rr', Object.assign({ id: CO.me, n: nm() }, o)); } catch (e) { /* */ } }

/* ---------- starting and ending ---------- */
function runCard() {
  const b = S.runBest, p = typeof CO !== 'undefined' && CO.on ? coopPeers()[0] : null;
  return `<div class="card" style="gap:8px;margin-top:12px;border-color:#ffd27a"><b style="color:#ffd27a">⚡ Road Run</b>
    <small>Run the whole Tokaido against the clock, Hakone to Kyoto. Every enemy on the road is fought right where you stand. <b>One life each.</b> Fall, and you come back with half your health if your partner clears the town. Everyone runs with the same strength, so anyone can run with anyone, and your real save is not touched.</small>
    <small class="muted">${b ? `Best run: <b style="color:#ffd27a">${fmtClock(b.t)}</b>${b.n ? ' with ' + esc(b.n) : ' alone'}${b.town != null && b.town < 6 ? '' : ''}` : 'No run finished yet.'}${S.runFar != null ? ` · furthest: ${TOWNS[Math.min(6, S.runFar)].n}` : ''}</small>
    <button class="btn primary" data-coop="run">${p ? `Run the road with ${esc(p.n)}` : 'Run the road alone'}</button>${p ? '' : '<small class="muted">Start or join a party above to run it together.</small>'}</div>`;
}
{ const pc = packCoop; packCoop = function () { return pc.apply(this, arguments) + (RUN ? '' : runCard()); }; }
{ const cc = coopClick; coopClick = function (a) {
  if (a === 'run') { closePack(); const p = typeof CO !== 'undefined' && CO.on ? coopPeers()[0] : null; if (!p) { runBegin(true, 0); return true; }
    RUN_ASK = { pid: p.id, t: Date.now() }; runSend({ k: 'ask', to: p.id }); if (TOWN) TOWN.paused = true;
    openOverlay(`<div class="modal"><div class="eyebrow">Road Run</div><p style="font-size:17px">Asking <b style="color:#9ff0c8">${esc(p.n)}</b> to run the road with you…</p><div class="actions"><button class="btn" data-coop="runsolo">Run alone</button><button class="btn" data-coop="runcancel">Cancel</button></div></div>`);
    const ask = RUN_ASK; setTimeout(() => { if (RUN_ASK === ask) { RUN_ASK = null; closeOverlay(); if (TOWN) TOWN.paused = false; toast(`${p.n} did not answer.`); } }, 15000); return true; }
  if (a === 'runsolo') { RUN_ASK = null; closeOverlay(); runBegin(true, 0); return true; }
  if (a === 'runcancel') { RUN_ASK = null; closeOverlay(); if (TOWN) TOWN.paused = false; return true; }
  if (a === 'runyes') { const q = RUN_INV; RUN_INV = null; closeOverlay(); if (q) { runSend({ k: 'yes', to: q.pid }); runBegin(false, 0); } return true; }
  if (a === 'runno') { const q = RUN_INV; RUN_INV = null; closeOverlay(); if (TOWN) TOWN.paused = false; if (q) runSend({ k: 'no', to: q.pid }); return true; }
  if (a === 'runquit') { closeOverlay(); runEnd('quit'); return true; }
  if (a === 'runstay') { closeOverlay(); if (TOWN) TOWN.paused = false; return true; }
  if (a === 'runleave') { if (TOWN) TOWN.paused = true; openOverlay(`<div class="modal"><div class="eyebrow">Road Run</div><p>Leave the run? ${runPeer() ? 'Your partner carries on alone.' : 'The clock stops and the run is lost.'}</p><div class="actions"><button class="btn" data-coop="runquit">Leave the run</button><button class="btn primary" data-coop="runstay">Keep running</button></div></div>`); return true; }
  if (a === 'runhome') { closeOverlay(); if (TOWN) TOWN.paused = false; return true; }
  return cc.apply(this, arguments); }; }
let RUN_ASK = null, RUN_INV = null;
function runBegin(auth, i) {
  if (RUN) return; closeOverlay();
  RUN = { home: S.cur, auth, i: -1, clock: 0, hp: RUN_ME.hp, sta: RUN_ME.sta, down: false, es: [], cd: 0, block: false, lastEn: Date.now(), kills: 0, ng: window.__noGhost, nb: window.__noBeast, done: false, peer: {}, seen: {}, sendT: 0, pT: 0, clearT: -1 };
  window.__noGhost = true; window.__noBeast = true; runHud(true); runTown(i || 0);
}
function runTown(i) {
  const R = RUN; if (!R) return; R.i = i; R.es = []; R.clearT = -1; R.ready = false; R.gh = [{ on: false, used: false, x: 0, z: 0, t: 0, rig: null }, { on: false, used: false, x: 0, z: 0, t: 0, rig: null }];
  if (R.down) { R.down = false; R.hp = Math.max(R.hp, RUN_ME.hp / 2); toast('You are back on your feet, with half your health.'); } else if (i > 0) R.hp = Math.min(RUN_ME.hp, R.hp + 25);
  R.sta = RUN_ME.sta; S.cur = i; S.town = { ema: [], chests: [], jobs: { a: 0, b: 0 }, seen: true, intro: true, run: true }; startTown(false);
}
function runEnd(why, time) {
  const R = RUN; if (!R) return; RUN = null; runSend({ k: why === 'quit' ? 'quit' : 'bye' });
  window.__noGhost = R.ng; window.__noBeast = R.nb; runHud(false); S.cur = R.home; delete S.town; gearInit();
  const peer = (typeof CO !== 'undefined' && CO.on && coopPeers()[0]) || null; let best = false;
  S.runFar = Math.max(S.runFar == null ? -1 : S.runFar, why === 'win' ? 7 : R.i);
  if (why === 'win' && (!S.runBest || time < S.runBest.t)) { S.runBest = { t: +time.toFixed(1), n: peer && R.duo ? peer.n : '', d: Date.now() }; best = true; }
  save(); startTown(true);
  setTimeout(() => { if (TOWN) TOWN.paused = true; openOverlay(`<div class="modal ${why === 'win' ? 'win' : ''}"><div class="kicker ${why === 'win' ? '' : 'lose'}">${why === 'win' ? 'The road is run!' : why === 'quit' ? 'Run abandoned' : 'The run ends here'}</div>
    <p style="font-size:18px">${why === 'win' ? `Hakone to Kyoto in <b style="color:#ffd27a">${fmtClock(time)}</b>${R.duo && peer ? ' with ' + esc(peer.n) : ''}.${best ? ' <b style="color:#9ff0c8">A new best!</b>' : S.runBest ? ' Best: ' + fmtClock(S.runBest.t) + '.' : ''}` : why === 'quit' ? `You left the road at ${TOWNS[R.i].n}.` : `${R.duo ? 'Both samurai fell' : 'You fell'} at <b>${TOWNS[R.i].n}</b>, station ${R.i + 2} of 8, after ${fmtClock(R.clock)}.`}</p>
    <p class="muted">${R.kills} enemies cut down by your own hand. Your real journey is exactly as you left it.</p><div class="actions"><button class="btn primary" data-coop="runhome">Back to the road</button></div></div>`); }, 1400);
}
/* a run never writes its town into the real save */
{ const sv = save; save = function () { if (!RUN) return sv.apply(this, arguments); const c = S.cur, t = S.town; S.cur = RUN.home; S.town = S.towns[TOWNS[S.cur].id]; try { return sv.apply(this, arguments); } finally { S.cur = c; S.town = t; } }; }

/* ---------- the road and the six who guard it ---------- */
function runFoeDef(role) { if (role === 'myth' && townCfg().myth.dragon) return null; let st = null; try { st = townFoe(role); } catch (e) { st = null; } if (!st || st.dragon || !st.look) return null; return { n: st.name, look: st.look, sword: st.sword || 'iron', scale: Math.min(st.scale || 1, role === 'beast' ? 1.5 : 1.35) }; }
function runPeople(T) {
  const R = RUN, i = R.i, duo = !!runPeer() || (typeof CO !== 'undefined' && CO.on && coopPeers().length > 0); R.duo = R.duo || duo;
  RUN_ROLES.forEach((role, k) => { const D = runFoeDef(role); if (!D) return; const z = RUN_Z[role], x = townRoadX(z) + (k % 2 ? 1.6 : -1.6);
    const rig = new Samurai(D.look, swordDef(D.sword), {}); rig.root.rotation.order = 'YXZ'; rig.root.scale.setScalar(D.scale); rig.setHold('guard', 6); rig.root.position.set(x, townH(x, z), z); rig.root.rotation.y = Math.PI; T.grp.add(rig.root, rig.trail.mesh);
    const boss = role === 'keeper' || role === 'myth' || role === 'beast', max = Math.round(RUN_HP[role] * (1 + .14 * i) * (duo ? 1.6 : 1));
    R.es.push({ k: R.es.length, role, n: D.n, rig, x, z, hx: x, hz: z, ry: Math.PI, st: 'idle', t: 0, hp: max, max, g: 1, tgt: null, aq: 0, tw: 1, boss, dmg: Math.round(RUN_DMG[role] * (1 + .07 * i)), reach: 2.5 * (D.scale > 1.2 ? 1.2 : 1), spd: boss ? 4.4 : 5, sc: D.scale, vis: 'idle', tx: x, tz: z, flash: 0 }); });
  if (!R.auth) { T.pos.x += 1.9; T.lastGood.copy(T.pos); } // two samurai do not stand inside each other
  T.P.setSheathed && T.P.setSheathed(false); T.P.setHold('guard', 7); R.ready = true; R.intro = 2.2;
  hint('');
  banner(`${townCfg().n.toUpperCase()}`, `Station ${i + 2} of 8 · ${R.es.length} stand in your way`); sfx.taiko && sfx.taiko(1);
  OV.draw = c => { drawTownOverlay(c); runDraw(c); };
}
{ const tp = townPeople; townPeople = function () { if (RUN) return runPeople(TOWN); return tp.apply(this, arguments); }; }
{ const to = townObjective; townObjective = function () { if (!RUN) return to.apply(this, arguments); const left = RUN.es.filter(e => e.st !== 'dead').length; return `⚡ ROAD RUN · ${fmtClock(RUN.clock)} · ${left ? left + ' left in ' + townCfg().n : townCfg().n + ' is clear!'}`; }; }

/* ---------- what an enemy looks like in each state (every tablet) ---------- */
function runVis(e) {
  if (e.vis === e.st) return; const was = e.vis; e.vis = e.st; const G = e.rig;
  if (e.st === 'windup') { G.seq.length = 0; G.setHold(e.g === 2 ? 'windL' : 'windH', 2.6 / e.tw); sfx.whoosh && sfx.whoosh(); }
  else if (e.st === 'recover' && was === 'windup') { G.seq.length = 0; G.queue(e.g === 2 ? 'endL' : 'endH', .13, { ease: easeIn, arc: .3 }); sfx.slash && sfx.slash(.9); }
  else if (e.st === 'stagger') { G.seq.length = 0; G.setHold('stagger', 9); }
  else if (e.st === 'dead') { G.ko(); sfx.win && sfx.win(); FX.petals(G.chest.getWorldPosition(new V3()), 24, '#ffd9e6', 3); }
  else if (e.st === 'ready' || e.st === 'chase' || e.st === 'idle') G.setHold('guard', 7);
}
/* ---------- the tablet in charge moves the enemies ---------- */
function runPlayers(T) { const L = [{ id: runMe(), x: T.pos.x, z: T.pos.z, down: RUN.down }]; if (typeof CO !== 'undefined' && CO.on) coopPeers().forEach(p => { if (p.t === S.cur && p.rr && Date.now() - p.rr.at < 5000) L.push({ id: p.id, x: p.px != null ? p.px : p.x, z: p.pz != null ? p.pz : p.z, down: !!p.rr.down }); }); return L; }
function runSim(dt, T) {
  const R = RUN, P = runPlayers(T).filter(p => !p.down);
  for (const e of R.es) {
    if (e.st === 'dead') continue; e.t += dt;
    let tg = P.find(p => p.id === e.tgt) || null; const near = P.slice().sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0] || null;
    if (!tg || e.st === 'idle' || e.st === 'chase') tg = near; e.tgt = tg ? tg.id : null;
    const d = tg ? Math.hypot(tg.x - e.x, tg.z - e.z) : 99; if (tg && e.st !== 'stagger') { let a = Math.atan2(tg.x - e.x, tg.z - e.z) - e.ry; a = Math.atan2(Math.sin(a), Math.cos(a)); e.ry += a * damp(e.st === 'windup' && e.t > e.tw * .6 ? 1.5 : 9, dt); }
    if (!tg) { if (e.st !== 'idle' && e.st !== 'stagger') { e.st = 'idle'; e.t = 0; } }
    else if (e.st === 'idle') { if (d < 14 && R.intro <= 0) { e.st = 'chase'; e.t = 0; } }
    else if (e.st === 'chase') { if (d > e.reach - .5) { const v = Math.min(d - (e.reach - .6), e.spd * dt), nx = e.x + (tg.x - e.x) / d * v, nz = e.z + (tg.z - e.z) / d * v; if (townH(nx, nz) > -.2) { e.x = nx; e.z = nz; } } if (d <= e.reach - .3) { e.st = 'ready'; e.t = 0; e.wait = rnd(.35, .9) * (e.boss ? .8 : 1); e.g = (Math.random() * 3) | 0; } }
    else if (e.st === 'ready') { if (d > e.reach + .7) { e.st = 'chase'; e.t = 0; } else if (e.t >= e.wait) { e.st = 'windup'; e.t = 0; e.aq++; e.tw = Math.max(.58, (e.boss ? .92 : 1.05) - R.i * .045); } }
    else if (e.st === 'windup') { if (e.t >= e.tw) { if (e.tgt === runMe()) runStruck(e, T); e.st = 'recover'; e.t = 0; } }
    else if (e.st === 'recover') { if (e.t >= .75) { e.st = 'ready'; e.t = 0; e.wait = rnd(.5, 1.25) * (e.boss ? .75 : 1); e.g = (e.g + 1 + ((Math.random() * 2) | 0)) % 3; } }
    else if (e.st === 'stagger') { if (e.t >= 1.35) { e.st = 'ready'; e.t = 0; e.wait = rnd(.4, .8); e.g = (Math.random() * 3) | 0; } }
  }
  for (const a of R.es) for (const b of R.es) if (a.k < b.k && a.st !== 'dead' && b.st !== 'dead') { const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || .01; if (d < 1.5) { const p = (1.5 - d) / 2; a.x -= dx / d * p; a.z -= dz / d * p; b.x += dx / d * p; b.z += dz / d * p; } }
  runGhostSim(dt, T);
  R.sendT -= dt; if (R.sendT <= 0) { R.sendT = .14; runSend({ k: 'en', i: R.i, c: +R.clock.toFixed(2), gs: R.gh.map(g => [g.on ? 1 : g.lurk ? 2 : 0, +g.x.toFixed(2), +g.z.toFixed(2), +g.t.toFixed(1)]), es: R.es.map(e => [+e.x.toFixed(2), +e.z.toFixed(2), +e.ry.toFixed(2), e.st, Math.max(0, Math.round(e.hp)), e.g, e.tgt, e.aq, +e.tw.toFixed(2), +e.t.toFixed(2)]) }); }
  if (R.es.length && R.es.every(e => e.st === 'dead') && R.clearT < 0) { R.clearT = 0; runSend({ k: 'clear', i: R.i, c: +R.clock.toFixed(2) }); runCleared(); }
  if (R.clearT >= 0) { R.clearT += dt; if (R.clearT > 3.2) { if (R.i >= 6) { const t = R.clock; runSend({ k: 'fin', c: +t.toFixed(2) }); return runEnd('win', t); } runSend({ k: 'town', i: R.i + 1 }); return runTown(R.i + 1); } }
  const all = runPlayers(T); if (all.length && all.every(p => p.down) && !R.over) { R.over = 1; runSend({ k: 'over' }); setTimeout(() => runEnd('lost'), 2200); }
}
function runCleared() { const R = RUN; banner(`${townCfg().n} is clear!`, R.i >= 6 ? 'The road is run!' : `${fmtClock(R.clock)} · on to ${TOWNS[R.i + 1].n}`); sfx.win && sfx.win(); }
function runHit(k, dmg, parry) { // on the tablet in charge
  const R = RUN, e = R && R.es[k]; if (!e || e.st === 'dead') return;
  if (parry) { if (e.st === 'windup' || e.st === 'recover') { e.st = 'stagger'; e.t = 0; } return; }
  e.hp -= dmg; if (e.st === 'ready') e.wait += .12; if (e.hp <= 0) { e.hp = 0; e.st = 'dead'; e.t = 0; }
}
/* ---------- an enemy's blow lands on me: my tablet decides how it went ---------- */
function runStruck(e, T) {
  const R = RUN; if (!R || R.down || e.st === 'stagger' || e.st === 'dead') return; const d = Math.hypot(T.pos.x - e.x, T.pos.z - e.z), s = { x: VW / 2, y: VH * .62 };
  if (R.grace > 0 && d <= e.reach + .9) { ovPop(s.x, s.y - 40, 'SHAKEN OFF!', { size: 26, color: '#ffd27a', stroke: '#2a1200' }); sfx.whoosh && sfx.whoosh(); return; } // no blow lands in the moment after the Red Geisha's touch
  if (d > e.reach + .9) { ovPop(s.x, s.y - 40, 'DODGED!', { size: 28, color: '#9ff0c8', stroke: '#06261a' }); sfx.whoosh && sfx.whoosh(); return; }
  let dmg = e.dmg;
  if (R.block && R.sta >= 14) { dmg = Math.round(dmg * .28); R.sta -= 22; R.staWait = .5; sfx.clang && sfx.clang(); FX.sparks(T.P.bladePoint(.5), '#d9eeff', 18, 4); ovPop(s.x, s.y - 40, 'BLOCKED', { size: 24, color: '#bfe2ff', stroke: '#0a1a3a' }); }
  else { sfx.hurt && sfx.hurt(); T.P.hitFlash && T.P.hitFlash(1); shake(.12); OV.vig = .8; OV.vigCol = '255,60,60'; ovPop(s.x, s.y - 40, '−' + dmg, { size: 34, color: '#ff9a7a', stroke: '#2a0600' }); }
  R.hp -= dmg; if (R.hp <= 0) { R.hp = 0; R.down = true; R.block = false; T.P.ko(); banner('You are down!', runPeer() ? 'If your partner clears the town, you rise again with half your health' : ''); sfx.lose && sfx.lose(); runSend({ k: 'p', hp: 0, down: 1 }); }
}
/* ---------- my cut ---------- */
function runSlash(x0, y0, x1, y1, pid) {
  const R = RUN, T = TOWN; if (!R || !T || !R.ready || R.down || T.paused || (T.joy && T.joy.id === pid)) return;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len; if (R.cd > 0) return; if (R.sta < 11) { if (!R.puffT || Date.now() - R.puffT > 900) { R.puffT = Date.now(); ovPop(VW / 2, VH * .6, 'Out of breath!', { size: 24, color: '#7fd0ff', stroke: '#06202a' }); } return; }
  R.cd = RUN_ME.cd; R.sta -= 11; R.staWait = .55; R.block = false; rigSwing(T.P, ux, uy, .12); sfx.slash && sfx.slash(); runSend({ k: 'sw', ux: +ux.toFixed(2), uy: +uy.toFixed(2) });
  const cut = uy > .5 ? 0 : uy < -.5 ? 2 : 1; // down the screen = an overhead cut, up = a rising cut, across = a side cut
  let best = null; for (const e of R.es) { if (e.st === 'dead') continue; const d = Math.hypot(e.x - T.pos.x, e.z - T.pos.z); if (d > RUN_ME.reach * (e.sc > 1.2 ? 1.15 : 1)) continue; const h = hitTest(e.rig, x0, y0, x1, y1); if (h && (!best || d < best.d)) best = { e, h, d }; }
  if (!best) { // nothing under the blade: still turn to face the nearest enemy, so the next cut finds it
    const n = R.es.filter(e => e.st !== 'dead').sort((a, b) => Math.hypot(a.x - T.pos.x, a.z - T.pos.z) - Math.hypot(b.x - T.pos.x, b.z - T.pos.z))[0]; if (n && Math.hypot(n.x - T.pos.x, n.z - T.pos.z) < 5) T.face = Math.atan2(n.x - T.pos.x, n.z - T.pos.z); return; }
  const e = best.e, h = best.h, sx = h.sx, sy = h.sy; T.face = Math.atan2(e.x - T.pos.x, e.z - T.pos.z);
  if (e.st === 'windup' && e.tgt === runMe() && e.tw - e.t < .5) { // a cut into the blow as it falls: parry
    sfx.parry && sfx.parry(); FX.sparks(e.rig.bladePoint(.5), '#ffe08c', 34, 6); hitstop(70); ovPop(sx, sy - 60, 'PARRY!', { size: 36, color: '#2a1200', stroke: '#fff6d8', burst: '#ffd23a', life: 1 }); R.sta = Math.min(RUN_ME.sta, R.sta + 22); R.staWait = 0;
    if (R.auth) runHit(e.k, 0, true); else { runSend({ k: 'hit', e: e.k, d: 0, pr: 1, i: R.i }); R.seen[e.k + ':' + e.aq] = 2; e.st = 'stagger'; e.t = 0; } return; }
  let m = 1, tag = '';
  if (e.st === 'stagger') { m = 2; tag = 'OPEN!'; } else if (e.st === 'windup' || e.st === 'recover') m = 1.2;
  else if (cut === e.g) { sfx.clang && sfx.clang(); FX.sparks(e.rig.bladePoint(.45), '#d9eeff', 16, 4); ovPop(sx, sy - 50, 'BLOCKED', { size: 24, color: '#bfe2ff', stroke: '#0a1a3a' }); R.sta = Math.max(0, R.sta - 9); R.cd += .12; return; }
  else if (cut === [2, 0, 1][e.g]) { m = 1.6; tag = 'COUNTER!'; } else m = .7;
  const dmg = Math.round(RUN_ME.cut * m * rnd(.9, 1.1)); sfx.hit && sfx.hit(); e.rig.hitFlash(1); FX.sparks(h.world, '#ffffff', 14, 4); shake(.04);
  ovPop(sx, sy - 24, (tag ? tag + ' ' : '') + dmg, { size: tag ? 34 : 28, color: tag ? '#ffe08c' : '#fff', stroke: '#2a0600' });
  if (e.hp - dmg <= 0) R.kills++;
  if (R.auth) runHit(e.k, dmg, false); else { e.hp = Math.max(0, e.hp - dmg); runSend({ k: 'hit', e: e.k, d: dmg, i: R.i }); }
}
/* ---------- every frame ---------- */
function runTick(dt, T) {
  const R = RUN; if (!R || !R.ready) return;
  if (R.intro > 0) R.intro -= dt; if (R.clearT < 0 && !R.over) R.clock += R.auth ? dt : 0;
  R.grace = Math.max(0, (R.grace || 0) - dt); R.cd = Math.max(0, R.cd - dt); R.staWait = Math.max(0, (R.staWait || 0) - dt); if (!R.staWait) R.sta = Math.min(RUN_ME.sta, R.sta + dt * (R.block ? 5 : 15)); // breath comes back only when you stop swinging
  T.camPitch = lerp(T.camPitch, .56, damp(3, dt)); { let c = T.face - T.camYaw; c = Math.atan2(Math.sin(c), Math.cos(c)); T.camYaw += c * damp(2.2, dt); } // look down over your own shoulder, so the enemy is never hidden behind you
  // the road is the whole world now
  const rx = townRoadX(T.pos.z); T.pos.x = clamp(T.pos.x, rx - 11, rx + 11); T.pos.z = clamp(T.pos.z, -80, 56); if (R.down) { T.joy = null; T.pos.copy(T.lastGood); } else if (R.block) T.pos.lerp(T.lastGood, .55);
  // whoever is left is in charge
  if (!R.auth && (typeof CO === 'undefined' || !CO.on || Date.now() - R.lastEn > 5000)) { R.auth = true; toast('Your partner has left the run. You carry on alone.'); R.es.forEach(e => { if (e.st === 'windup') { e.st = 'ready'; e.t = 0; e.wait = .8; } }); }
  if (R.auth) runSim(dt, T); if (!RUN || RUN !== R || !R.ready) return;
  else if (!R.auth) for (const e of R.es) { // a guest draws what the host says, and answers for the blows aimed at him
    e.t += dt; e.x = lerp(e.x, e.tx, damp(12, dt)); e.z = lerp(e.z, e.tz, damp(12, dt));
    if (e.st === 'windup' && e.tgt === runMe()) { const key = e.k + ':' + e.aq; if (!R.seen[key] && e.t >= e.tw) { R.seen[key] = 1; runStruck(e, T); } } }
  runGhostVis(dt, T);
  for (const e of R.es) { runVis(e); const G = e.rig; G.root.position.set(e.x, townH(e.x, e.z), e.z); if (e.st !== 'dead') G.root.rotation.y = e.ry; G.update(dt); }
  // my partner: sword out, and the cuts and falls I am told about
  const p = runPeer(); if (p && p.rig) { if (!p.rrDrawn) { p.rrDrawn = true; p.rig.setSheathed && p.rig.setSheathed(false); p.rig.setHold('guard', 7); } if (p.rr.down && p.rig.koT < 0) p.rig.ko(); if (!p.rr.down && p.rig.koT >= 0) { p.rig.koT = -1; p.rig.root.rotation.x = 0; p.rig.setHold('guard', 7); } } else if (p) p.rrDrawn = false;
  R.pT -= dt; if (R.pT <= 0) { R.pT = .3; runSend({ k: 'p', hp: Math.round(R.hp), down: R.down ? 1 : 0, bl: R.block ? 1 : 0, i: R.i }); }
  T.P.blockPose = R.block; if (R.block && !R.wasBlock) T.P.setHold('guard', 12); R.wasBlock = R.block;
  runHudTick();
}
/* ---------- messages ---------- */
function runMsg(d) {
  if (d.to && d.to !== CO.me) return; const p = CO.peers[d.id], who = String(d.n || 'Your friend').slice(0, 14);
  if (d.k === 'ask') { if (RUN || MODE !== TownMode || !TOWN || TOWN.enc || (typeof TEAM !== 'undefined' && TEAM)) return runSend({ k: 'no', to: d.id }); RUN_INV = { pid: d.id }; TOWN.paused = true; TOWN.joy = null; sfx.taiko && sfx.taiko(.8);
    return openOverlay(`<div class="modal"><div class="eyebrow">Road Run</div><p style="font-size:18px"><b style="color:#9ff0c8">${esc(who)}</b> wants to run the road with you!</p><p class="muted">Hakone to Kyoto against the clock, fighting side by side. One life each, the same strength for both of you. Your real save is not touched.</p><div class="actions"><button class="btn primary" data-coop="runyes">Run!</button><button class="btn" data-coop="runno">Not now</button></div></div>`); }
  if (d.k === 'yes') { if (RUN_ASK && RUN_ASK.pid === d.id) { RUN_ASK = null; closeOverlay(); runBegin(true, 0); } return; }
  if (d.k === 'no') { if (RUN_ASK && RUN_ASK.pid === d.id) { RUN_ASK = null; closeOverlay(); if (TOWN) TOWN.paused = false; toast(`${who} cannot run right now.`); } return; }
  const R = RUN; if (!R) return; if (p) { p.rr = p.rr || { hp: RUN_ME.hp, down: false }; p.rr.at = Date.now(); }
  if (d.k === 'p') { if (p) { p.rr.hp = +d.hp || 0; p.rr.down = !!d.down; p.rr.bl = !!d.bl; } }
  else if (d.k === 'sw') { if (p && p.rig && !p.rr.down) rigSwing(p.rig, +d.ux || 0, +d.uy || 0, .12); }
  else if (d.k === 'hit') { if (R.auth && (d.i | 0) === R.i) runHit(d.e | 0, clamp(+d.d || 0, 0, 60), !!d.pr); }
  else if (d.k === 'en') { if (R.auth || (d.i | 0) !== R.i || !Array.isArray(d.es)) return; R.lastEn = Date.now(); R.clock = +d.c || R.clock;
    if (Array.isArray(d.gs)) d.gs.forEach((a, k) => { const g = R.gh[k]; if (!g || !Array.isArray(a)) return; const on = a[0] === 1, lurk = a[0] === 2; if ((on || lurk) && !g.on && !g.lurk) { g.x = +a[1]; g.z = +a[2]; } if (on && !g.on) { g.sent = false; runGhostHello(k); } g.on = on; g.lurk = lurk; g.tx = +a[1]; g.tz = +a[2]; g.t = +a[3] || 0; });
    d.es.forEach((a, k) => { const e = R.es[k]; if (!e || !Array.isArray(a)) return; e.tx = +a[0]; e.tz = +a[1]; e.ry = +a[2]; const st = String(a[3]), aq = a[7] | 0; if (Math.hypot(e.tx - e.x, e.tz - e.z) > 8) { e.x = e.tx; e.z = e.tz; }
      if (st === 'windup' && (e.st !== 'windup' || aq !== e.aq)) e.t = +a[9] || 0; if (!(R.seen[k + ':' + e.aq] === 2 && st === 'windup' && aq === e.aq)) e.st = st; e.aq = aq; e.hp = Math.min(e.hp, +a[4]); if (st === 'dead') e.hp = 0; e.g = a[5] | 0; e.tgt = a[6]; e.tw = +a[8] || 1; }); }
  else if (d.k === 'gc') { if (R.auth && R.gh[0].on) runGhostCatch(d.id); }
  else if (d.k === 'gd') { if (R.auth && R.gh[1].on) runGhostDrain(d.id); }
  else if (d.k === 'gh') { if (!R.auth) { R.gh[0].on = false; runHealApply(d.h || {}, String(d.by || '')); } }
  else if (d.k === 'gx') { if (!R.auth) { R.gh[1].on = false; runDrainApply(d.hit, String(d.hn || '')); } }
  else if (d.k === 'clear') { if (!R.auth && R.clearT < 0) { R.clearT = 0; R.lastEn = Date.now() + 6000; runCleared(); } }
  else if (d.k === 'town') { if (!R.auth) { R.lastEn = Date.now() + 8000; runTown(d.i | 0); } }
  else if (d.k === 'fin') { if (!R.auth) runEnd('win', +d.c || R.clock); }
  else if (d.k === 'over') { if (!R.auth && !R.over) { R.over = 1; setTimeout(() => runEnd('lost'), 1800); } }
  else if (d.k === 'quit' || d.k === 'bye') { if (p) p.rr = null; if (d.k === 'quit') toast(`${who} left the run.`); }
}
{ const cm = coopMsg; coopMsg = function (d) { if (d && d.type === 'rr') return runMsg(d); return cm.apply(this, arguments); }; }
/* ---------- what you see ---------- */
function runHud(on) {
  let el = document.getElementById('runHud');
  if (!on) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'runHud'; el.style.cssText = 'position:fixed;inset:0;z-index:30;pointer-events:none;font-family:inherit';
    el.innerHTML = `<div style="position:absolute;left:12px;top:calc(env(safe-area-inset-top,0px) + 58px);width:min(240px,34vw)"><div id="rhMe"></div><div id="rhPeer" style="margin-top:6px"></div></div>
      <button id="rhBlock" style="position:absolute;right:22px;bottom:calc(env(safe-area-inset-bottom,0px) + 26px);width:118px;height:118px;border-radius:50%;border:3px solid #bfe2ff;background:rgba(20,40,80,.55);color:#e8f4ff;font:900 17px system-ui;pointer-events:auto;touch-action:none">BLOCK<br><small style="font-weight:600;font-size:11px">hold</small></button>
      <button id="rhLeave" class="btn small" style="position:absolute;right:12px;top:calc(env(safe-area-inset-top,0px) + 96px);pointer-events:auto;opacity:.8">Leave run</button>
      <div id="rhTip" style="position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 14px);background:rgba(8,10,20,.7);color:#f4ead2;font-weight:700;font-size:13px;padding:7px 14px;border-radius:10px;max-width:60vw;text-align:center"></div>`;
    document.body.appendChild(el);
    const b = el.querySelector('#rhBlock'), set = v => e => { e.preventDefault(); e.stopPropagation(); if (RUN && !RUN.down) RUN.block = v; b.style.background = v ? 'rgba(90,150,255,.75)' : 'rgba(20,40,80,.55)'; };
    b.addEventListener('pointerdown', set(true)); ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => b.addEventListener(n, set(false)));
    el.querySelector('#rhLeave').addEventListener('click', e => { e.stopPropagation(); coopClick('runleave'); }); }
  el.hidden = false;
}
function runBar(name, hp, max, col, sta, note) { const k = clamp(hp / max, 0, 1); return `<div style="background:rgba(8,10,20,.7);border-radius:9px;padding:5px 8px"><div style="display:flex;justify-content:space-between;color:#f4ead2;font-weight:800;font-size:12px"><span>${esc(name)}</span><span>${note || Math.round(hp)}</span></div><div style="height:9px;background:#2a1414;border-radius:5px;overflow:hidden;margin-top:3px"><div style="height:100%;width:${k * 100}%;background:${col}"></div></div>${sta == null ? '' : `<div style="height:4px;background:#14202a;border-radius:3px;overflow:hidden;margin-top:3px"><div style="height:100%;width:${clamp(sta / RUN_ME.sta, 0, 1) * 100}%;background:#7fd0ff"></div></div>`}</div>`; }
function runHudTick() {
  const R = RUN, el = document.getElementById('runHud'); if (!R || !el) return; R.hudT = (R.hudT || 0) + 1; if (R.hudT % 6) return;
  if ($('#hint') && $('#hint').textContent) hint('');
  el.querySelector('#rhMe').innerHTML = runBar(nm(), R.hp, RUN_ME.hp, R.hp > 35 ? '#6fd08a' : '#ff7a5a', R.sta, R.down ? 'DOWN' : null);
  const p = runPeer(); el.querySelector('#rhPeer').innerHTML = p ? runBar(p.n, p.rr.hp, RUN_ME.hp, '#9ff0c8', null, p.rr.down ? 'DOWN' : p.t !== S.cur ? '…' : null) : '';
  el.querySelector('#rhBlock').style.display = R.down ? 'none' : '';
  const tip = el.querySelector('#rhTip'), near = R.es.filter(e => e.st !== 'dead').sort((a, b) => Math.hypot(a.x - TOWN.pos.x, a.z - TOWN.pos.z) - Math.hypot(b.x - TOWN.pos.x, b.z - TOWN.pos.z))[0];
  const gw = R.gh[0].on, gr = R.gh[1].on;
  const where = g => { const dx = g.x - TOWN.pos.x, dz = g.z - TOWN.pos.z, d = Math.hypot(dx, dz); let a = Math.atan2(dx, dz) - TOWN.camYaw; a = Math.atan2(Math.sin(a), Math.cos(a)); return `${Math.round(d)} m ${Math.abs(a) < .8 ? 'ahead' : Math.abs(a) > 2.3 ? 'BEHIND YOU' : a > 0 ? 'to your left' : 'to your right'}`; };
  tip.textContent = gr && !R.down ? `RED GEISHA, ${where(R.gh[1])}! Keep away for ${Math.max(0, Math.ceil(RUN_RED_T - R.gh[1].t))} more seconds!` : gw && !R.down ? `The Lady in White, ${where(R.gh[0])}! Catch her before she fades (${Math.max(0, Math.ceil(RUN_GHOST_T - R.gh[0].t))}s): she heals ${runPeer() ? 'you both' : 'you'}.` : R.down ? 'You are down. Cheer your partner on!' : R.clearT >= 0 ? '' : !near ? '' : Math.hypot(near.x - TOWN.pos.x, near.z - TOWN.pos.z) > 9 ? 'Walk up the road. Swipe on the right side to cut.' : near.st === 'windup' && near.tgt === runMe() ? 'Gold ring: cut into the blow to PARRY, hold BLOCK, or step back!' : `Swipe the way the arrow over its head points ${CUT_ARROW[near.g]}. The same height as its guard is blocked.`; tip.style.display = tip.textContent ? '' : 'none';
}
const _rv = new V3();
function runDraw(c) {
  const R = RUN, T = TOWN; if (!R || !T) return;
  for (const e of R.es) { if (e.st === 'dead') continue; const d = Math.hypot(e.x - T.pos.x, e.z - T.pos.z); if (d > 34) continue;
    _rv.set(e.x, townH(e.x, e.z) + 2.25 * e.sc, e.z); const s = toScreen(_rv); if (s.z > 1 || s.x < -60 || s.x > VW + 60) continue; const w = e.boss ? 120 : 84, k = clamp(e.hp / e.max, 0, 1), y = s.y - 8;
    c.save(); c.fillStyle = 'rgba(8,10,20,.72)'; c.fillRect(s.x - w / 2 - 2, y - 2, w + 4, 11); c.fillStyle = e.st === 'stagger' ? '#ffe08c' : '#e0563a'; c.fillRect(s.x - w / 2, y, w * k, 7);
    c.font = '800 12px system-ui'; c.textAlign = 'center'; c.fillStyle = '#f4ead2'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 3; c.strokeText(e.n, s.x, y - 7); c.fillText(e.n, s.x, y - 7);
    if (d < 12) { const open = e.st === 'stagger', wind = e.st === 'windup', txt = open ? 'OPEN!' : wind ? 'STRIKING' : CUT_NAME[e.g] + '  ' + CUT_ARROW[e.g]; c.font = '900 ' + (open ? 22 : 18) + 'px system-ui'; c.fillStyle = open ? '#ffe08c' : wind ? '#ff9a7a' : '#bfe2ff'; c.strokeText(txt, s.x, y - 26); c.fillText(txt, s.x, y - 26);
      if (wind) { _rv.set(e.x, townH(e.x, e.z) + 1.2 * e.sc, e.z); const m = toScreen(_rv), q = clamp(e.t / e.tw, 0, 1), mine = e.tgt === runMe(); c.beginPath(); c.arc(m.x, m.y, lerp(70, 26, q) * clamp(9 / Math.max(3, d), .5, 1.6), 0, 6.283); c.lineWidth = 5; c.strokeStyle = !mine ? 'rgba(200,200,200,.5)' : e.tw - e.t < .5 ? '#ffd23a' : 'rgba(255,120,90,.85)'; c.stroke(); } }
    c.restore(); }
}
/* ---------- input: in a run the right side of the screen is your sword ---------- */
TownMode.slashActive = () => !!(RUN && RUN.ready && !RUN.down && TOWN && !TOWN.paused);
{ const sl = TownMode.slash, dn = TownMode.down, mv = TownMode.move;
  TownMode.slash = function (a, b, c, d, id) { if (RUN) return runSlash(a, b, c, d, id); return sl.apply(this, arguments); };
  TownMode.down = function (px, py, id) { if (RUN) { const T = TOWN; if (!T || T.paused || RUN.down) return; if (px < VW * .45 && !T.joy) T.joy = { id, ox: px, oy: py, x: px, y: py }; return; } return dn.apply(this, arguments); };
  TownMode.move = function (px, py, id) { if (RUN) { const T = TOWN; if (T && T.joy && T.joy.id === id) { T.joy.x = px; T.joy.y = py; } return; } return mv.apply(this, arguments); }; }

/* ---------- two ladies on the road ----------
   The Lady in White runs from you: touch her and she shares out 100 health, the weaker samurai first.
   The Red Geisha runs AT you for fifteen seconds: if she touches a samurai he loses half his health and
   his partner a quarter. Each comes once in every town. */
const RUN_GHOST_T = 15, RUN_RED_T = 8; // the Lady can be chased for fifteen seconds; the Red Geisha hunts for eight
function runGhostHello(k) { if (k === 0) { banner('The Lady in White!', runPeer() ? 'Catch her! She heals you both, the weaker one first' : 'Catch her! She heals you'); sfx.bell && sfx.bell(); } else { banner('THE RED GEISHA!', `Run! Keep away from her for ${RUN_RED_T} seconds`); sfx.ghost && sfx.ghost(); shake(.1); } }
function runGhostSim(dt, T) {
  const R = RUN, G = R.gh, dead = R.es.filter(e => e.st === 'dead').length, n = R.es.length, P = runPlayers(T).filter(p => !p.down); if (!P.length || R.clearT >= 0) { G[0].on = G[1].on = G[1].lurk = false; return; }
  const lim = (x, z) => { const zz = clamp(z, -77, 54), rx = townRoadX(zz); return [clamp(x, rx - 10, rx + 10), zz]; };
  // she keeps to the road you have already cleared: never up among enemies who have not noticed you yet
  const alive = R.es.filter(e => e.st !== 'dead'), north = Math.min(54, ...alive.filter(e => e.st === 'idle').map(e => e.hz - 16)), limW = (x, z) => { const zz = clamp(z, -77, Math.max(-60, north)), rx = townRoadX(zz); return [clamp(x, rx - 10, rx + 10), zz]; };
  if (!G[0].used && dead >= Math.ceil(n / 2)) { const lead = P.slice().sort((a, b) => a.z - b.z)[0], z = lead.z - 17 < -74 ? lead.z + 17 : lead.z - 17, p = limW(townRoadX(z) + rnd(-5, 5), z); Object.assign(G[0], { used: true, on: true, x: p[0], z: p[1], t: 0 }); runGhostHello(0); }
  // the Red Geisha waits somewhere along the road, a faint red shimmer. Walk too close and she wakes
  if (!G[1].used) { const z = rnd(-56, 48), sd = Math.random() < .5 ? -1 : 1, p = lim(townRoadX(z) + sd * rnd(4.5, 8), z); Object.assign(G[1], { used: true, on: false, lurk: true, x: p[0], z: p[1], t: 0 }); }
  if (G[1].lurk && P.some(q => Math.hypot(q.x - G[1].x, q.z - G[1].z) < 7.5)) { G[1].lurk = false; G[1].on = true; G[1].t = 0; runGhostHello(1); }
  const me = P.find(p => p.id === runMe());
  if (G[0].on) { const g = G[0]; g.t += dt; let fx = 0, fz = 0; P.forEach(p => { const dx = g.x - p.x, dz = g.z - p.z, d = Math.hypot(dx, dz) || .01, w = 1 / Math.max(1.5, d); fx += dx / d * w; fz += dz / d * w; });
    alive.forEach(e => { const dx = g.x - e.x, dz = g.z - e.z, d = Math.hypot(dx, dz) || .01; if (d < 13) { const w = 1.6 / Math.max(1.5, d); fx += dx / d * w; fz += dz / d * w; } });
    const rx = townRoadX(g.z), top = Math.max(-60, north); fx += (rx - g.x) / 10 * .12; if (g.z > top - 8) fz -= (g.z - (top - 8)) / 8 * .5; if (g.z < -70) fz += (-70 - g.z) / 8 * .3; // she slides along the walls of the road, so two samurai can pen her in
    const l = Math.hypot(fx, fz) || 1, near = Math.min(...P.map(p => Math.hypot(p.x - g.x, p.z - g.z))), v = (P.length > 1 ? 7.5 : 6.3) * (near > 16 ? .25 : 1) * dt, q = limW(g.x + fx / l * v, g.z + fz / l * v); g.x = q[0]; g.z = q[1];
    if (me && Math.hypot(me.x - g.x, me.z - g.z) < 1.6) runGhostCatch(runMe()); else if (g.t >= RUN_GHOST_T) { g.on = false; toast('The Lady in White fades into the mist.'); } }
  if (G[1].on) { const g = G[1]; g.t += dt; const tg = P.slice().sort((a, b) => Math.hypot(a.x - g.x, a.z - g.z) - Math.hypot(b.x - g.x, b.z - g.z))[0], dx = tg.x - g.x, dz = tg.z - g.z, d = Math.hypot(dx, dz) || .01, v = Math.min(d, (g.t < 1.5 ? 1.5 : 6.1) * dt); g.x += dx / d * v; g.z += dz / d * v;
    if (me && Math.hypot(me.x - g.x, me.z - g.z) < 1.25) runGhostDrain(runMe()); else if (g.t >= RUN_RED_T) { g.on = false; banner('She is gone!', 'You outran the Red Geisha'); sfx.win && sfx.win(); runSend({ k: 'gx', hit: null }); } }
}
function runGhostCatch(by) { // on the tablet in charge: share out 100 health, the weaker samurai first
  const R = RUN, g = R.gh[0]; if (!g.on) return; g.on = false; const p = runPeer(), L = [{ id: runMe(), hp: R.down ? null : R.hp }]; if (p && p.rr && !p.rr.down) L.push({ id: p.id, hp: p.rr.hp });
  let pool = 100; const h = {}; L.filter(x => x.hp != null).sort((a, b) => a.hp - b.hp).forEach(x => { const a = Math.min(pool, Math.max(0, RUN_ME.hp - x.hp)); h[x.id] = Math.round(a); pool -= a; });
  const bn = by === runMe() ? nm() : (p ? p.n : ''); runSend({ k: 'gh', h, by: bn }); runHealApply(h, bn);
}
function runHealApply(h, by) { const R = RUN, a = +h[runMe()] || 0; if (!R.down) { R.hp = Math.min(RUN_ME.hp, R.hp + a); R.sta = RUN_ME.sta; R.staWait = 0; } sfx.up && sfx.up(); OV.flash = .35; OV.flashCol = '220,240,255'; const p = runPeer(), b = p ? +h[p.id] || 0 : 0;
  banner(`${by || 'A samurai'} caught the Lady in White!`, p ? `You +${a} health · ${p.n} +${b} health · breath restored` : `+${a} health · breath restored`); }
function runGhostDrain(hit) { const R = RUN, g = R.gh[1]; if (!g.on) return; g.on = false; const p = runPeer(), hn = hit === runMe() ? nm() : (p ? p.n : ''); runSend({ k: 'gx', hit, hn }); runDrainApply(hit, hn); }
function runDrainApply(hit, hn) { const R = RUN; if (hit == null) { banner('She is gone!', 'You outran the Red Geisha'); sfx.win && sfx.win(); return; } const mine = hit === runMe(), before = R.hp; if (!R.down) { R.hp = Math.max(1, Math.ceil(R.hp * (mine ? .5 : .75))); R.grace = 3; }
  sfx.hurt && sfx.hurt(); setTimeout(() => sfx.laugh && sfx.laugh(), 300); shake(.16); OV.vig = 1; OV.vigCol = '255,60,110'; banner(mine ? 'THE RED GEISHA HAS YOU!' : `The Red Geisha caught ${hn}!`, `She drinks your spirit: −${Math.round(before - R.hp)} health${runPeer() ? (mine ? ', and a quarter of your partner\'s' : ', a quarter of yours') : ''}`); }
function runGhostVis(dt, T) {
  const R = RUN; R.gh.forEach((g, k) => {
    if (!R.auth && g.on) { g.t += dt; g.x = lerp(g.x, g.tx == null ? g.x : g.tx, damp(10, dt)); g.z = lerp(g.z, g.tz == null ? g.z : g.tz, damp(10, dt)); const d = Math.hypot(T.pos.x - g.x, T.pos.z - g.z); if (!R.down && !g.sent && d < (k ? 1.25 : 1.6)) { g.sent = true; runSend({ k: k ? 'gd' : 'gc' }); } }
    if ((g.on || g.lurk) && !g.rig) { const rig = new Samurai(k ? SNATCH_LOOK : LADY_LOOK, swordDef('iron'), k ? { ghost: true, noSaya: true, ghostCol: '#ff1238', ghostLine: '#ffb0c0' } : { ghost: true, noSaya: true }); rig.root.rotation.order = 'YXZ'; rig.sword.visible = false; rig.setHold('show', 6); const h = halo(k ? '#ff5a7a' : '#bfe0ff', 4.5, .55); h.position.y = 1.2; rig.root.add(h); T.grp.add(rig.root); g.rig = rig; g.px = g.x; g.pz = g.z; }
    if (!g.rig) return; if (!g.on && !g.lurk) { T.grp.remove(g.rig.root); g.rig.dispose && g.rig.dispose(); g.rig = null; return; }
    const mx = g.x - g.px, mz = g.z - g.pz; if (Math.hypot(mx, mz) > .003) g.ry = Math.atan2(mx, mz); g.px = g.x; g.pz = g.z;
    g.rig.root.position.set(g.x, townH(g.x, g.z) + .15 + Math.sin(g.t * 3) * .1, g.z); g.rig.root.rotation.y = g.ry || 0; if (g.lurk) g.t += dt; g.rig.mat.opacity = g.lurk ? .1 + .06 * Math.sin(g.t * 2) : g.t > (k ? RUN_RED_T : RUN_GHOST_T) - 2 ? .2 + .3 * Math.abs(Math.sin(g.t * 9)) : .62; g.rig.update(dt);
    if (Math.random() < dt * (g.lurk ? 3 : 24)) FX.add.emit(g.x + rnd(-.4, .4), townH(g.x, g.z) + rnd(.2, 1.8), g.z + rnd(-.4, .4), 0, rnd(.3, .8), 0, rnd(.6, 1.1), .08, 0, k ? '#ff6a8a' : '#cfe8ff', .8, -.2, .3);
  });
}
