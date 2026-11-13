'use strict';
/* ===== Friends you can see: they walk with you, stand at your duels, and run down thieves ===== */
function allyDef(id) {
  const [t, r] = id.split(':'), c = TOWN_BY[t]; if (!c || !r) return null;
  if (r[0] === 'w') { const D = warDef(+r[1], c.i); return { n: D.n, look: D.look, sword: D.sword, scale: 1 }; }
  const D = r === 'a' ? c.a.foe : r === 'keeper' ? c.keeper : c.myth; if (!D || (r === 'myth' && D.dragon)) return null;
  return { n: D.n, look: D.look, sword: r === 'myth' && D.weapon === 'club' ? 'ogre' : D.sword, scale: r === 'myth' ? Math.min(D.scale || 1, 1.22) : 1 };
}
function allyRig(id) { const D = allyDef(id); if (!D) return null; const rig = new Samurai(D.look, swordDef(D.sword || 'iron'), {}); rig.root.rotation.order = 'YXZ'; if (D.scale !== 1) rig.root.scale.setScalar(D.scale); return { id, D, rig }; }
/* who walks with you: friends from the road behind you, and the duelists you spared here.
   (The bandit, keeper and spirit of this town keep their posts; in Kyoto the road's friends wait at the festival.) */
function packList() {
  const c = townCfg(), posted = a => a.startsWith(c.id + ':') && a.split(':')[1][0] !== 'w';
  let L = allies().filter(a => !posted(a) && allyDef(a)); if (c.id === 'kyoto') L = L.filter(a => a.startsWith('kyoto:'));
  return L.slice(-5);
}
const PACK_SLOTS = [[-1.9, -.5], [1.9, -.5], [-3.3, .4], [3.3, .4], [-4.7, 1.3]];
function packPeople(T) {
  T.pack = []; if (window.__noPack) return;
  packList().forEach((id, i) => { const f = allyRig(id); if (!f) return; const R = f.rig; R.setSheathed && R.hasSaya && R.setSheathed(true); R.setHold('rest', 6);
    T.grp.add(R.root);
    const a = T.face + Math.PI + (i - 2) * .5; T.pack.push(Object.assign(f, { x: T.pos.x + Math.sin(a) * 2.2, z: T.pos.z + Math.cos(a) * 2.2, ph: i * 1.7, ry: T.face, v: 0, i })); });
  platePeople(T);
}
/* one follower keeps his place beside whoever he follows: beside, never between that samurai and the camera */
function packMove(f, cx, cz, face, hide, dt) {
  const fx = Math.sin(face), fz = Math.cos(face), [side, back] = PACK_SLOTS[f.i % PACK_SLOTS.length], tx = cx - fx * back - fz * side, tz = cz - fz * back + fx * side;
  let dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz);
  if (d > 32 || hide) { f.x = tx; f.z = tz; d = 0; }
  const want = d > .45 ? Math.min(9.5, 1.6 + d * 5) : 0; f.v = lerp(f.v, want, damp(8, dt));
  if (f.v > .15 && d > .05) { const st = Math.min(d, f.v * dt), nx = f.x + dx / d * st, nz = f.z + dz / d * st, h = townH(nx, nz); if (h > -.22 && h < 9) { f.x = nx; f.z = nz; } let a = Math.atan2(dx, dz) - f.ry; a = Math.atan2(Math.sin(a), Math.cos(a)); f.ry += a * damp(9, dt); }
  else { let a = face - f.ry; a = Math.atan2(Math.sin(a), Math.cos(a)); f.ry += a * damp(2.5, dt); }
  const k = Math.min(1, f.v / 5), R = f.rig, y = townH(f.x, f.z); f.ph += dt * (5 + f.v * .9) * (k > .03 ? 1 : 0);
  R.feet.L.set(.15, .035 + Math.max(0, Math.sin(f.ph)) * .1 * k, Math.sin(f.ph) * .24 * k); R.feet.R.set(-.15, .035 + Math.max(0, -Math.sin(f.ph)) * .1 * k, -Math.sin(f.ph) * .24 * k); R.armSwing = -Math.sin(f.ph) * .7 * k; R.leanAdd = .05 + k * .08;
  R.root.position.set(f.x, y, f.z); R.root.rotation.y = f.ry; R.root.visible = !hide; R.update(dt);
}
function packTick(dt, T) {
  if (T.cine) cineStep(dt, T);
  unstick(dt, T);
  const hide = !!(T.boat || T.lift || (T.enc && T.enc.phase));
  (T.pack || []).forEach(f => packMove(f, T.pos.x, T.pos.z, T.face, hide, dt));
  coopExtra(dt, T);
  plateTick(dt, T);
}
/* ---------- friends at the duel ---------- */
function duelFriends(st) {
  if (!F || F.st !== st || F.friends || !F.P || !F.E || (typeof TEAM !== 'undefined' && TEAM && TEAM.on)) return;
  const P = F.P.root.position, E = F.E.root.position, ax = E.x - P.x, az = E.z - P.z, L = Math.hypot(ax, az) || 1, ux = ax / L, uz = az / L, W = F.E.root.parent; if (!W) return;
  F.friends = friendsHere().slice(-4).map((id, i) => { const f = allyRig(id); if (!f) return null; const sd = i % 2 ? 1 : -1, off = 2.5 + Math.floor(i / 2) * 1.7, t = L + 2.4 + Math.floor(i / 2) * 1.1; // behind the enemy, where you can see them
    f.hx = P.x + ux * t + uz * sd * off; f.hz = P.z + uz * t - ux * sd * off; f.hy = P.y; f.x = f.hx; f.z = f.hz; f.step = 0; f.ph = i;
    f.rig.setHold('show', 6); f.rig.root.position.set(f.x, f.hy, f.z); f.rig.root.rotation.y = Math.atan2(E.x - f.x, E.z - f.z); W.add(f.rig.root); return f; }).filter(Boolean);
  const myF = F; let last = performance.now();
  const loop = now => { if (F !== myF || !myF.friends) return; const dt = Math.min(.05, (now - last) / 1000); last = now;
    myF.friends.forEach(f => { const P2 = myF.P.root.position, E2 = myF.E.root.position;
      if (f.step > 0) { f.step -= dt; const k = f.step > 1.1 ? 1 - (f.step - 1.1) / .3 : f.step < .5 ? f.step / .5 : 1, sdx = (E2.z - P2.z), sdz = -(E2.x - P2.x), sl = Math.hypot(sdx, sdz) || 1, tx = lerp(P2.x, E2.x, .7) + sdx / sl * .9, tz = lerp(P2.z, E2.z, .7) + sdz / sl * .9; f.x = lerp(f.hx, tx, clamp(k, 0, 1)); f.z = lerp(f.hz, tz, clamp(k, 0, 1)); if (f.step <= 0) f.rig.setHold('show', 6); }
      f.ph += dt; f.rig.root.position.set(f.x, f.hy + (myF.over && myF.outcome === 'win' ? Math.abs(Math.sin(f.ph * 7)) * .12 : 0), f.z); f.rig.root.rotation.y = Math.atan2(E2.x - f.x, E2.z - f.z); f.rig.update(dt); });
    requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
{ const sb = startBattle; startBattle = function (st, ctx) { const r = sb.apply(this, arguments); if (ctx && ctx.kind === 'town') { let n = 0; const iv = setInterval(() => { if (++n > 40 || (F && F.st === st && F.P && F.E && F.E.root.parent)) { clearInterval(iv); if (n <= 40) duelFriends(st); } }, 150); } return r; }; }
/* the one who catches you actually runs in */
function friendStepIn() { const f = F && F.friends && F.friends[F.friends.length - 1]; if (!f) return; f.step = 1.4; f.rig.setHold('stagger', 9); setTimeout(() => { try { f.rig.setHold('show', 8); FX.sparks(f.rig.bladePoint(.5), '#d9eeff', 26, 5); sfx.clang && sfx.clang(1.2); } catch (e) { /* */ } }, 260);
  try { F.E.setHold('stagger', 10); toState('stagger', 1.1); } catch (e) { /* */ } }
/* two or more friends in town: they run the sword thief down for you */
{ const ef = townEncFail; townEncFail = function (T, e) { const had = !!S.stolen; ef(T, e); const fr = friendsHere();
  if (!had && S.stolen && fr.length >= 2) setTimeout(() => { if (!S.stolen) return; const bn = swordDef(S.stolen.id).name; ghostRestore(); sfx.win && sfx.win(); banner(`${allyName(fr[0])} and ${allyName(fr[1])} ran the thief down!`, `Your ${bn} is back in your hand`); }, 3600); }; }

/* ===== Swing: a long stroke that carries through the enemy is a heavy cut ===== */
function followThrough(x1, y1, pid) {
  const s = F.stroke; if (!s || s.done || s.id !== pid || F.over || F.clock - s.t > .6) return false;
  const dx = x1 - s.x, dy = y1 - s.y, len = Math.hypot(dx, dy); if (len < Math.min(VW, VH) * .4 || (dx * s.ux + dy * s.uy) / len < .75) return false;
  s.done = true; F.cdUntil += .24; F.sta = Math.max(0, F.sta - F.ps.staCost * .5);
  ovPop(s.sx, s.sy - 96, 'HEAVY CUT!', { size: 28, color: '#ffb07a', stroke: '#1a0800' }); sfx.slash && sfx.slash(1.3); shake(.05);
  damageEnemy(s.part, s.dmg * .5, false, s.world, s.sx, s.sy); return true;
}

/* ===== Enemy weapons fight differently ===== */
const WEAPON_FX = { 'f-yari': 'pierce', 'f-nagi': 'sweep', 'f-axe': 'crush', 'f-maul': 'crush', 'f-tetsu': 'crush', 'f-hook': 'hook' };
const WEAPON_TIP = { pierce: 'A spear thrust slips past a block. Parry it, or step aside.', sweep: 'A glaive sweeps wide: stepping aside will not save you. Parry it or block.', crush: 'Too heavy to block: it crushes your guard. Step aside, then strike.', hook: 'The hook drags at your arms and drains your breath and Spirit. Parry it.' };
function weaponFx() { return F && F.st && WEAPON_FX[F.st.weapon] || null; }

/* ===== Honor: the seven virtues make a rank, and rank makes you ===== */
const HONOR_RANKS = [[0, 'Ronin'], [15, 'Retainer'], [35, 'Samurai'], [60, 'Hatamoto'], [90, 'Blade of the Realm'], [125, 'Legend of the Tokaido']];
function honorPts() { return VIRTUES.reduce((n, [k]) => n + ((S.virt || {})[k] || 0), 0); }
function honorRank() { const p = honorPts(); let r = 0; HONOR_RANKS.forEach(([n], i) => { if (p >= n) r = i; }); return r; }
function honorHTML() { const r = honorRank(), p = honorPts(), nx = HONOR_RANKS[r + 1];
  return `<div class="card" style="margin:8px 0 2px;gap:4px"><b>名 Rank: ${HONOR_RANKS[r][1]}</b><small>${p} virtue${nx ? ` · ${nx[0] - p} more to become <b>${nx[1]}</b>` : ' · the highest rank on the road'}</small><small class="muted">Each rank: the sensei's drills teach ${r ? '<b>+' + r * 8 + '%</b>' : '8% more'}, your health grows ${r ? '<b>+' + r * 3 + '%</b>' : '3%'}, and you begin duels with ${r ? '<b>+' + r * 5 + '</b>' : '5 more'} Spirit. Virtue is earned by mercy, clean wins, bowing, truth and helping people. Robbing a beaten foe costs Mercy.</small></div>`; }
{ const st0 = stats; stats = function () { const p = st0.apply(this, arguments), r = typeof S !== 'undefined' && S.virt ? honorRank() : 0; if (r) p.maxHp = Math.round(p.maxHp * (1 + r * .03)); return p; }; }
{ const ft = finishTraining; finishTraining = function () { const k = T && !T.done ? T.kind : null, base = k ? Math.max(5, Math.round(TRAIN_KINDS[k].xp())) : 0; ft(); const r = k && S.started ? honorRank() : 0; if (r && base) { const ex = Math.round(base * r * .08); if (ex > 0) { addSkillXP(TRAININGS[k].skill, ex); save(); setTimeout(() => toast(`${HONOR_RANKS[r][1]}: the sensei teaches you more. +${ex} bonus`), 1500); } } }; }

/* ===== Readiness: every town names the level it expects, like the first legend ===== */
function townLevel(i) { return Math.round(refStats(i == null ? townCfg().i : i).L); }
function readyLine() { const c = townCfg(), L = townLevel(), b = REF_BLADE[c.i], sk = S.sk, my = swordDmg(eqSword()), ok = (v, n) => `<b style="color:${v >= n ? '#9ff0c8' : '#ff9a7a'}">${v}</b>/${n}`;
  return `<br><span class="muted">${c.n} expects: Power ${ok(sk.power.l, L)} · Vitality ${ok(sk.vital.l, L)} · Speed ${ok(sk.speed.l, Math.max(1, L - 1))} · Guard ${ok(sk.guard.l, Math.max(1, L - 1))} · blade ${ok(Math.round(my), b)}${my < Math.round(b * .7) ? ` · <b style="color:#ff9a7a">your blade will snap</b> against the masters of this town` : ''}</span>`; }

/* ===== Stone plates: the second thing only two samurai can do ===== */
function plateSpots(T) { for (const [z, w] of [[-28, 10], [-12, 10], [12, 10], [-40, 10], [22, 10], [-28, 7], [-12, 7], [12, 7], [-52, 8], [30, 8], [-60, 7], [40, 7], [0, 6], [-20, 6], [-66, 6]]) { const rx = townRoadX(z), A = [rx - w, z], B = [rx + w, z], ok = ([x, y]) => { for (let a = 0; a < 6; a++) { const h = townH(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6); if (h < .1 || h > 4) return false; } return !T.pois.some(p => Math.hypot(p.x - x, p.z - y) < 5) && !T.W.obs.some(o => Math.hypot(o.x - x, o.z - y) < o.r + 1.6); }; if (ok(A) && ok(B)) return [A, B]; } return null; }
function platePeople(T) {
  T.plates = null; const sp = plateSpots(T); if (!sp) return; const done = !!S.town.plate;
  T.plates = sp.map(([x, z]) => { const y = townH(x, z), m = new THREE.Mesh(merge([P(GEO.cyl(1.25, 1.4, .16, 8), '#8a8676', [0, .08, 0]), P(GEO.cyl(.8, .8, .04, 8), done ? '#c9a35a' : '#5d6a58', [0, .18, 0])]), toon({ vertexColors: true })); m.position.set(x, y, z); m.receiveShadow = true; T.grp.add(m); return { x, z, y, m, on: 0 }; });
  T.plateT = 0; T.plateTold = 0;
}
function plateTick(dt, T) {
  if (!T.plates || S.town.plate) return; const on = (p, x, z) => Math.hypot(p.x - x, p.z - z) < 1.3, peers = coopHere();
  const mine = T.plates.findIndex(p => on(p, T.pos.x, T.pos.z)), other = mine < 0 ? -1 : 1 - mine, held = other >= 0 && peers.some(q => on(T.plates[other], q.x, q.z));
  T.plates.forEach((p, i) => { const down = i === mine || peers.some(q => on(p, q.x, q.z)); p.on = lerp(p.on, down ? 1 : 0, damp(8, dt)); p.m.position.y = p.y - p.on * .09; });
  if (mine >= 0 && held) { T.plateT += dt; if (T.clock > T.plateTold) { T.plateTold = T.clock + 1; toast(`Both plates are down. Hold still… ${Math.max(1, Math.ceil(3 - T.plateT))}`); } if (T.plateT >= 3) plateSolved(T); }
  else { T.plateT = 0; if (mine >= 0 && T.clock > T.plateTold) { T.plateTold = T.clock + 9; toast(peers.length ? `The stone sinks under you. ${peers[0].n} must stand on the plate across the road at the same time.` : 'The stone sinks under you. A second plate waits across the road: this takes two samurai standing at once. (Pack, then Together.)'); } }
}
function plateSolved(T) { if (S.town.plate) return; S.town.plate = true; const c = townCfg(), got = rollDrops(c.i, 'myth'), mt = Object.entries(got).map(([id, n]) => `+${n} ${MATERIALS[id].n}`).join(' · '); S.steel = (S.steel || 0) + 12 + c.i * 2; ['power', 'vital'].forEach(k => addSkillXP(k, 30)); save();
  virtue('chugi', 2, 'two samurai, one weight'); sfx.win && sfx.win(); shake(.12); T.plates.forEach(p => FX.sparks(new V3(p.x, p.y + .4, p.z), '#ffe08c', 40, 5)); banner('The old storehouse opens!', `+${12 + c.i * 2} steel · Power and Vitality training${mt ? ' · ' + mt : ''}`); }

/* ===== Scenes: the camera tells the story ===== */
function cineStart(shots, then) { const T = TOWN; if (!T || window.__noTut) { then && then(); return; }
  let el = document.getElementById('cine'); if (!el) { el = document.createElement('div'); el.id = 'cine'; el.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:auto;display:flex;flex-direction:column;justify-content:space-between'; el.innerHTML = '<div style="height:11vh;background:#05060c"></div><div style="background:#05060c;min-height:15vh;display:flex;align-items:center;justify-content:center;padding:10px 60px;position:relative"><p id="cineTx" style="margin:0;color:#f4ead2;font-size:clamp(15px,2.4vw,22px);text-align:center;font-weight:600;letter-spacing:.02em;transition:opacity .5s"></p><button id="cineSkip" class="btn" style="position:absolute;right:12px;bottom:10px;font-size:12px;padding:6px 12px">Skip ▸</button></div>'; document.body.appendChild(el); el.querySelector('#cineSkip').addEventListener('click', e => { e.stopPropagation(); cineEnd(); }); }
  el.hidden = false; $('#hud').style.visibility = 'hidden'; T.cineDraw = OV.draw; OV.draw = null; T.cineNear = CAM.near; CAM.near = 1.6; CAM.updateProjectionMatrix(); T.cine = { shots, i: 0, t: 0, then, from: { p: T.camPos.clone(), l: T.camLook.clone() } }; document.getElementById('cineTx').textContent = shots[0].text || ''; }
function cineStep(dt, T) { const C = T.cine, s = C.shots[C.i]; T.joy = null; C.t += dt; const prev = C.i ? C.shots[C.i - 1] : null, a = prev ? { p: new V3(...prev.p), l: new V3(...prev.l) } : C.from, k = smooth(0, 1, Math.min(1, C.t / s.t));
  C.p = a.p.clone().lerp(new V3(...s.p), k); C.l = a.l.clone().lerp(new V3(...s.l), k); const g = townH(C.p.x, C.p.z) + 1.6; if (C.p.y < g) C.p.y = g;
  if (C.t >= s.t + (s.hold || 0)) { C.i++; C.t = 0; if (C.i >= C.shots.length) return cineEnd(); const tx = document.getElementById('cineTx'); if (C.shots[C.i].text != null) { tx.style.opacity = 0; const txt = C.shots[C.i].text; setTimeout(() => { tx.textContent = txt; tx.style.opacity = 1; }, 350); } } }
function cineCam(T) { const C = T.cine; if (C && C.p) { T.camPos.copy(C.p); T.camLook.copy(C.l); } }
function cineEnd() { const T = TOWN, el = document.getElementById('cine'); if (el) el.hidden = true; $('#hud').style.visibility = ''; if (!T || !T.cine) return; if (T.cineDraw && MODE === TownMode) OV.draw = T.cineDraw; if (T.cineNear) { CAM.near = T.cineNear; CAM.updateProjectionMatrix(); } const th = T.cine.then; T.cine = null; T.clock = Math.min(T.clock, .05); th && th(); }
function cineArrive(then) { const T = TOWN, c = townCfg(), gx = townRoadX(GATE_Z), p = T.pos, mid = townRoadX(0);
  const lines = c.i === 0 ? ['Hakone Pass, 1615. The mountain gate of the Tokaido.', 'Eight stations lie between here and Kyoto. One sealed letter could end a war.', 'It is carried by a ronin with a wooden sword and no name worth knowing. Yet.'] : [`${c.n}. Station ${c.i + 2} of 8 on the Tokaido.`, c.sub || '', 'Train. Make friends. Earn the gate.'];
  cineStart([{ p: [gx + 30, 46, GATE_Z + 34], l: [gx, 4, GATE_Z - 6], t: .01, hold: 2.6, text: lines[0] }, { p: [mid - 26, 30, 6], l: [townRoadX(-30), 2, -30], t: 4.2, hold: .6, text: lines[1] }, { p: [p.x - Math.sin(T.face) * 7, townH(p.x, p.z) + 3.4, p.z - Math.cos(T.face) * 7], l: [p.x, townH(p.x, p.z) + 1.5, p.z], t: 4.2, hold: 1.4, text: lines[2] }], then); }
function cineEnding(then) { const T = TOWN, gx = townRoadX(GATE_Z), p = T.pos, n = allies().length;
  cineStart([{ p: [p.x + 5, townH(p.x, p.z) + 2.6, p.z - 7], l: [gx, 5, GATE_Z + 6], t: 2.5, hold: 2, text: 'The palace gate opens. The letter passes from your hand.' }, { p: [gx - 22, 20, 30], l: [townRoadX(10), 2, 10], t: 5, hold: 1.2, text: n ? `Behind you stand ${n} friend${n === 1 ? '' : 's'}, every one of them once an enemy.` : 'Behind you the avenue is empty. You walked this road alone.' }, { p: [gx + 34, 58, GATE_Z + 40], l: [townRoadX(-20), 0, -20], t: 6, hold: 2.4, text: 'From Hakone to Kyoto, about 500 kilometres. The war is over. The legend is not.' }], then); }
setInterval(() => { const el = document.getElementById('cine'); if (el && !el.hidden && (typeof TOWN === 'undefined' || !TOWN || !TOWN.cine || MODE !== TownMode || TOWN.paused)) { if (TOWN && TOWN.cine && MODE === TownMode && !TOWN.paused) return; if (TOWN && TOWN.cine) { const C = TOWN.cine; C.then = null; cineEnd(); } else { el.hidden = true; $('#hud').style.visibility = ''; } } }, 400);

/* ===== Two blades, properly held: one in each hand, a pair at the hip ===== */
function secondBlade() { const w = usableSwords().filter(w => w.u !== S.eq).sort((x, y) => swordDmg(y) - swordDmg(x))[0]; return swordDef((w || eqSword()).id); }
function dualRig(P, on) {
  if (!P || !P.grip || !P.chest) return;
  if (on && !P.grip2) { P.grip2 = new THREE.Group(); P.chest.add(P.grip2); P.sword2 = buildSword(secondBlade()); P.grip2.add(P.sword2); P.grip2.position.set(.36, P.gp ? P.gp.y : .1, .3); }
  if (P.grip2) { P.grip2.visible = !!on; P.sword2.scale.setScalar(STYLES[S.style2 || 'kodachi'].len); }
  if (P.hip2Sword) P.hip2Sword.visible = !on;
  if (on) P.sword.scale.setScalar(STYLES[S.style || 'katana'].len);
}
function dualHip(P) {
  if (!P || !P.hips || !S.dual || P.hip2 || !P.saya || !P.sayaMesh) return P;
  const g = new THREE.Group(), k = .8 * STYLES[S.style2 || 'kodachi'].len, sh = P.sayaMesh.clone(), sw = buildSword(secondBlade()); if (sw.userData.glow) sw.userData.glow.visible = false;
  g.add(sh, sw); g.position.copy(P.saya.position).add(new V3(.045, -.075, .05)); g.quaternion.copy(P.saya.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.16, 0, .1))); g.scale.setScalar(k);
  P.hips.add(g); P.hip2 = g; P.hip2Sword = sw; return P;
}

/* ===== Never stranded: a samurai standing somewhere he cannot stand is put back on firm ground ===== */
function walkOk(W, x, z, T) { const h = townH(x, z); if (h > 15.5 || Math.abs(x) > TOWN_R || Math.abs(z) > TOWN_R - 2) return false; return W.canWalk ? !!W.canWalk(x, z, h, T || { pos: { x, z } }) : h >= (W.minH == null ? -.35 : W.minH); }
function spawnOk(W, sp) { try { if (W.canWalk) return true; if (!walkOk(W, sp.x, sp.z)) return false; return !(sp.z > GATE_Z - .9 && !S.town.pass); } catch (e) { return true; } }
function unstick(dt, T) {
  if (T.boat || T.cine || T.W.canWalk || (T.lift && walkOk(T.W, T.pos.x, T.pos.z, T))) return; const push = T.speed > .3, here = walkOk(T.W, T.pos.x, T.pos.z, T);
  if (T.usp && push && Math.hypot(T.pos.x - T.usp.x, T.pos.z - T.usp.z) < .02) T.ust = (T.ust || 0) + dt; else T.ust = 0; T.usp = { x: T.pos.x, z: T.pos.z };
  const edge = townH(T.pos.x, T.pos.z) < (T.W.minH == null ? -.35 : T.W.minH) + .04;
  if (here && !(edge && T.ust > 1.4)) return; if (here && T.lift) return;
  const side = T.pos.z > GATE_Z; let best = null;
  for (let r = 1; r <= 40 && !best; r += 1) for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, x = T.pos.x + Math.sin(a) * r, z = T.pos.z + Math.cos(a) * r; if ((z > GATE_Z) !== side && !S.town.pass) continue; if (townH(x, z) < (T.W.minH == null ? -.35 : T.W.minH) + .12 || !walkOk(T.W, x, z, T)) continue; if (T.W.obs.some(o => Math.hypot(o.x - x, o.z - z) < o.r + .5)) continue; best = { x, z }; break; }
  if (!best) best = { x: townRoadX(-74), z: -74 };
  T.pos.set(best.x, 0, best.z); T.lastGood.copy(T.pos); T.ust = 0; toast('You wade back to firm ground.');
}

/* ===== Travelling together: you see your friend's posse, and you share one sky ===== */
let CX_T = 0;
function posseDrop(p) { (p.posse || []).forEach(f => { const g = f.rig.root.parent; if (g) g.remove(f.rig.root); f.rig.dispose && f.rig.dispose(); }); p.posse = null; p.pkSig = null; }
function coopExtra(dt, T) {
  if (typeof CO === 'undefined' || !CO.on) return;
  CX_T -= dt; if (CX_T <= 0) { CX_T = .8; try { NET.send('cx', { id: CO.me, t: S.cur, pk: (T.pack || []).map(f => f.id), day: +T.day.toFixed(4), lp: T.lapse > 0 ? 1 : 0 }); } catch (e) { /* */ } }
  for (const p of Object.values(CO.peers)) {
    if (!p.rig || p.t !== S.cur) { if (p.posse) posseDrop(p); continue; }
    const sig = (p.pk || []).join(','); if (p.pkSig !== sig) { posseDrop(p); p.pkSig = sig; p.posse = (p.pk || []).slice(0, 5).map((id, i) => { const f = allyRig(id); if (!f) return null; f.rig.setSheathed && f.rig.hasSaya && f.rig.setSheathed(true); f.rig.setHold('rest', 6); T.grp.add(f.rig.root); return Object.assign(f, { i, x: p.px, z: p.pz, ry: p.pf, v: 0, ph: i * 1.7 }); }).filter(Boolean); }
    (p.posse || []).forEach(f => packMove(f, p.px, p.pz, p.pf, p.lf > .3, dt));
    // one sky: the guest follows the host's clock, and whoever is waiting for dawn carries the other along
    if (p.day != null && !(T.lapse > 0) && (p.lp || !CO.host)) { let d = p.day - T.day; d -= Math.round(d); if (Math.abs(d) > .002) T.day = (T.day + d * (p.lp ? 1 : damp(2.5, dt)) + 1) % 1; }
  }
}
{ const cm = coopMsg; coopMsg = function (d) { if (d && d.type === 'cx') { const p = CO.peers[d.id]; if (p && (d.t | 0) === p.t) { p.pk = Array.isArray(d.pk) ? d.pk.filter(x => typeof x === 'string' && /^[a-z]+:[a-z0-9]+$/.test(x)).slice(0, 5) : []; p.day = +d.day || 0; p.lp = !!d.lp; } return; } return cm.apply(this, arguments); }; }
{ const cd = coopDrop; coopDrop = function (p) { if (p && p.posse) posseDrop(p); return cd.apply(this, arguments); }; }
