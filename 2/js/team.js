'use strict';
/* ===== Playing as a team =====
   Team duels (one enemy each, win or lose together), the twin bells that need two samurai,
   ghosts on the night road, and the Two Heavens school of two blades. */

/* ---------- team duels ---------- */
let TEAM = null;
const tmSend = (k, o) => { if (CO.on) NET.send('tm', Object.assign({ id: CO.me, n: nm(), k }, o || {})); };
function teamFoeName(role) { const c = townCfg(); if (role === 'beast') return BEASTS2[c.id].n; if (role[0] === 'w') return warDef(+role[1]).n; return role === 'a' ? c.a.foe.n : role === 'keeper' ? c.keeper.n : c.myth.n; }
function teamInvite(role) {
  if (!CO.on || !['a', 'keeper', 'myth', 'beast', 'w0', 'w1'].includes(role)) return false;
  const p = coopHere().find(q => !q.fi); if (!p) return false;
  CO.inv = { role, pid: p.id, t: coopNow() }; tmSend('inv', { to: p.id, role, foe: teamFoeName(role), t: S.cur });
  if (TOWN) TOWN.paused = true;
  openOverlay(`<div class="modal"><div class="eyebrow">Team duel</div><p style="font-size:17px">Asking <b style="color:#9ff0c8">${esc(p.n)}</b> to fight beside you…</p><p class="muted">In a team duel you each face an enemy. You win or lose together.</p><div class="actions"><button class="btn" data-team="alone">Fight alone</button></div></div>`);
  const inv = CO.inv; setTimeout(() => { if (CO.inv === inv) { toast(`${p.n} did not answer.`); teamStart(role, null); } }, 12000);
  return true;
}
function teamStart(role, pid) {
  CO.inv = null; CO.ask = null; closeOverlay(); if (TOWN) { TOWN.paused = false; S.town.day = TOWN.day; }
  const st = townFoe(role);
  if (pid) { TEAM = { t0: coopNow(), pid, role, st: 'fight', eh: 1, peer: { st: 'fight', eh: 1, at: coopNow() }, parries: 0, strikeAt: 0, openUntil: 0, view: '' }; st.hp = Math.round(st.hp * 1.2); } else TEAM = null;
  startBattle(st, { kind: 'town', idx: role, ch: 1, from: 'town' });
}
function teamLine(txt) { let e = $('#teamLine'); if (!e) { e = document.createElement('div'); e.id = 'teamLine'; e.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 64px);background:rgba(8,10,20,.72);color:#9ff0c8;font-weight:900;font-size:14px;padding:6px 14px;border-radius:999px;border:1px solid rgba(159,240,200,.5);pointer-events:none;white-space:nowrap;z-index:5'; ($('#hud') || document.body).appendChild(e); } e.hidden = !txt; e.textContent = txt || ''; }
function teamMsg(d) {
  if (d.to && d.to !== CO.me) return;
  const who = String(d.n || 'Your friend').slice(0, 14), now = coopNow();
  if (d.k === 'inv') {
    if (MODE !== TownMode || !TOWN || d.t !== S.cur || TEAM || CO.inv || !$('#overlay').hidden && !TOWN.paused) return tmSend('dec', { to: d.id });
    CO.ask = { pid: d.id, role: d.role, t: now }; const ask = CO.ask; TOWN.paused = true; TOWN.joy = null; sfx.taiko && sfx.taiko(.8);
    openOverlay(`<div class="modal"><div class="eyebrow">Team duel</div><p style="font-size:18px"><b style="color:#9ff0c8">${esc(who)}</b> is challenging <b>${esc(String(d.foe).slice(0, 30))}</b>!</p><p class="muted">Fight beside them? You each face an enemy, and you win or lose together.</p><div class="actions"><button class="btn" data-team="dec">Let them go alone</button><button class="btn primary" data-team="acc">⚔ Fight together</button></div></div>`);
    setTimeout(() => { if (CO.ask === ask) { CO.ask = null; closeOverlay(); if (TOWN) TOWN.paused = false; } }, 11000);
  } else if (d.k === 'acc') { if (CO.inv && CO.inv.pid === d.id) teamStart(CO.inv.role, d.id); }
  else if (d.k === 'dec') { if (CO.inv && CO.inv.pid === d.id) { toast(`${who} lets you go alone.`); teamStart(CO.inv.role, null); } }
  else if (d.k === 'st') { if (TEAM && d.id === TEAM.pid) { TEAM.peer = { st: d.st, eh: +d.eh || 0, hp: d.hp, at: now }; teamResolve(); } }
  else if (d.k === 'open') { if (TEAM && d.id === TEAM.pid && F && !F.over) { TEAM.openUntil = now + 2.5; F.atkMul = Math.max(F.atkMul || 1, 1.5); ovPop(VW / 2, VH * .3, 'OPENING!', { size: 34, color: '#9ff0c8', stroke: '#06281c' }); sfx.bell && sfx.bell(); } }
  else if (d.k === 'strike') { if (!TEAM || d.id !== TEAM.pid) return; if (F && !F.over) { F.ehp = Math.max(1, F.ehp - F.emax * .1); banner(`${who} strikes from the side!`); FX.sparks(F.E.root.position.clone().add(new V3(0, 1.4, 0)), '#9ff0c8', 30, 5); } else if (TEAM.st === 'down') { TEAM.eh -= .2; sfx.slash && sfx.slash(); teamResolve(); } }
  else if (d.k === 'bell') duoHeard(d, who);
  else if (d.k === 'pz') { if (d.t === S.cur && TOWN && MODE === TownMode) puzzleSolved(false); }
  else if (d.k === 'whisk') { if (MODE === TownMode && TOWN && !TEAM) { const to = Math.min(d.town | 0, S.far || 0); banner('Whisked away!', `${who} failed the Lady in White. You are both carried off`); if (to !== S.cur) setTimeout(() => { closeOverlay(); townTravel(to); }, 1800); } }
  else if (d.k === 'rescued') { if (S.stolen) { ghostRestore(); banner(`${who} won your blade back!`, 'It is in your hands again'); sfx.win && sfx.win(); } }
}
/* my own duel has ended: decide what the team sees */
function teamResult() {
  if (!TEAM) return false;
  if (F.outcome === 'win') { TEAM.st = 'won'; TEAM.eh = 0; } else { TEAM.st = 'down'; TEAM.eh = Math.max(.05, F.ehp / F.emax); }
  tmSend('st', { to: TEAM.pid, st: TEAM.st, eh: +TEAM.eh.toFixed(2) });
  teamResolve(); return true;
}
function teamFinish(win) { const was = TEAM; TEAM = null; teamLine(''); if (win) F.outcome = 'win'; if (win && was.st === 'down') banner('Saved!', 'Your friend finished your enemy'); townFightResult(); }
function teamResolve() {
  if (!TEAM || !F || !F.over) return;
  const p = TEAM.peer, pn = (CO.peers[TEAM.pid] || {}).n || 'Your friend', gone = p.st === 'gone';
  if (TEAM.st === 'won') {
    if (gone || p.st === 'won' || p.eh <= 0) return teamFinish(true);
    const v = 'help' + p.st + Math.round(p.eh * 20); if (TEAM.view === v) return; TEAM.view = v;
    openOverlay(`<div class="modal win"><div class="kicker">Your enemy is down!</div><p><b style="color:#9ff0c8">${esc(pn)}</b> ${p.st === 'down' ? 'has fallen. Finish their enemy for them!' : 'is still fighting.'}</p><div class="bar" style="margin:10px 0"><i style="width:${Math.round(p.eh * 100)}%;background:#d0453a"></i></div><p class="muted">Their enemy: ${Math.round(p.eh * 100)}% health</p><div class="actions"><button class="btn primary" data-team="strike">⚔ Strike from the side!</button></div></div>`);
  } else if (TEAM.st === 'down') {
    if (TEAM.eh <= 0) return teamFinish(true);
    if (gone || p.st === 'down') return teamFinish(false);
    const v = 'down' + p.st + Math.round(TEAM.eh * 20); if (TEAM.view === v) return; TEAM.view = v;
    openOverlay(`<div class="modal"><div class="kicker lose">You are down!</div><p><b style="color:#9ff0c8">${esc(pn)}</b> ${p.st === 'won' ? 'has won and is finishing your enemy.' : 'is still fighting. If they win, they can finish your enemy.'}</p><div class="bar" style="margin:10px 0"><i style="width:${Math.round(TEAM.eh * 100)}%;background:#d0453a"></i></div><p class="muted">Your enemy: ${Math.round(TEAM.eh * 100)}% health</p></div>`);
  }
}
function teamClick(a) {
  if (a === 'alone') { if (CO.inv) teamStart(CO.inv.role, null); return true; }
  if (a === 'acc') { const k = CO.ask; if (!k) { closeOverlay(); if (TOWN) TOWN.paused = false; return true; } tmSend('acc', { to: k.pid }); teamStart(k.role, k.pid); return true; }
  if (a === 'dec') { const k = CO.ask; CO.ask = null; if (k) tmSend('dec', { to: k.pid }); closeOverlay(); if (TOWN) TOWN.paused = false; return true; }
  if (a === 'strike') { const now = coopNow(); if (!TEAM || now < TEAM.strikeAt) return true; TEAM.strikeAt = now + .9; tmSend('strike', { to: TEAM.pid }); sfx.slash && sfx.slash(); shake(.1); return true; }
  if (a === 'swap') { duelSwap(); return true; }
  return true;
}
setInterval(() => {
  const now = coopNow(), inFight = typeof F !== 'undefined' && F && typeof MODE !== 'undefined' && MODE !== TownMode;
  // two blades: the swap button, and the cost of using both at once
  const sb = $('#swapBtn'); if (sb) { const show = !!inFight && !F.over && !!S.dual && !!F.st.town && F.state !== 'intro' && F.dualLost == null; if (sb.hidden === show) sb.hidden = !show; if (show) sb.textContent = '⇄ ' + STYLES[duelOrder()[((F.sw || 0) + 1) % 3]].n; }
  if (inFight && F.st.town && !F.leadInit && typeof leadPose === 'function') { F.leadInit = true; leadPose(); }
  if (!inFight) STYLE_OVR = null;
  else if (S.dual && F.st.town && !F.over && F.dualLost == null && (F.P.det.armL || F.P.det.armR) && !(F.P.det.armL && F.P.det.armR)) { // an arm is gone: its blade falls, the other is already in your remaining hand
    const lost = F.P.det.armR ? 0 : 1, keep = 1 - lost, o = duelOrder(); F.dualLost = lost; duelSwap(keep);
    banner(`Your ${STYLES[o[lost]].n.toLowerCase()} falls!`, `${STYLES[o[keep]].n} in your remaining hand`); }
  else if (F.sw === 2 && !F.over && F.drawn) { F.staWait = .5; F.sta = Math.max(0, F.sta - .9); if (F.sta <= 1) { duelSwap(0); ovPop(VW / 2, VH * .4, 'Too tired for two blades!', { size: 24, color: '#ffd27a', stroke: '#2a1200' }); } }
  if (!TEAM) return;
  if (!inFight) { if (now - TEAM.t0 < 5) return; tmSend('st', { to: TEAM.pid, st: 'gone', eh: 1 }); TEAM = null; teamLine(''); return; }
  if (now - TEAM.peer.at > 6 && TEAM.peer.st !== 'gone') { TEAM.peer.st = 'gone'; toast(`${(CO.peers[TEAM.pid] || {}).n || 'Your friend'} left the fight. You fight on alone.`); teamResolve(); if (!TEAM) return; }
  if (!F.over) {
    TEAM.eh = F.ehp / F.emax;
    if (F.parries > TEAM.parries) { TEAM.parries = F.parries; tmSend('open', { to: TEAM.pid }); }
    if (TEAM.openUntil && now > TEAM.openUntil) { TEAM.openUntil = 0; if (!F.special) F.atkMul = 1; }
  }
  tmSend('st', { to: TEAM.pid, st: TEAM.st, eh: +TEAM.eh.toFixed(2), hp: Math.round(F.php / F.pmax * 100) });
  const p = TEAM.peer, pn = (CO.peers[TEAM.pid] || {}).n || 'Friend';
  teamLine(p.st === 'gone' ? '' : `${pn}: ${p.st === 'fight' ? `♥ ${p.hp == null ? '…' : p.hp + '%'} · enemy ${Math.round(p.eh * 100)}%` : p.st === 'won' ? 'enemy down!' : 'DOWN'}  ·  parry to give them an opening`);
}, 250);

/* ---------- the twin bells: one puzzle in every town that takes two samurai ---------- */
const DUO = { mine: null, peer: null };
function duoSpots(T) { const b = T.pois.find(p => p.id === 'b'); return [[townRoadX(-70) + 5.5, -70], b ? [b.x + 3.4, b.z - 3] : [townRoadX(30) - 6, 30]]; }
function duoPeople(T) {
  DUO.mine = DUO.peer = null;
  duoSpots(T).forEach(([x, z], i) => {
    const y = townH(x, z), m = new THREE.Mesh(merge([P(GEO.cyl(.09, .11, 2.6, 6), '#3a2416', [-.7, 1.3, 0]), P(GEO.cyl(.09, .11, 2.6, 6), '#3a2416', [.7, 1.3, 0]), P(GEO.box(1.9, .16, .3), '#3a2416', [0, 2.6, 0]), P(GEO.cyl(.3, .42, .7, 10), S.town.duo ? '#c9a35a' : '#7a8a6a', [0, 1.95, 0]), P(GEO.sph(.3, 10, 6, 0, 6.283, 0, 1.57), S.town.duo ? '#c9a35a' : '#7a8a6a', [0, 2.3, 0])]), toon({ vertexColors: true, flatShading: true }));
    m.position.set(x, y, z); m.castShadow = true; T.grp.add(m); T.W.obs.push({ x, z, r: .5 });
    T.pois.push({ id: 'tbell' + i, kind: 'spot', x: x + .9, z: z + .9, r: 2.6, map: S.town.duo ? null : 'Twin bell', col: '#9ff0c8', label: 'Ring the twin bell', act: () => {
      sfx.bell && sfx.bell(); shake(.05); FX.sparks(new V3(x, y + 2, z), '#ffe08c', 24, 4);
      tmSend('bell', { i, t: S.cur }); // a samurai who has already rung these bells can still ring them for a friend
      if (S.town.duo) return toast(coopHere().length ? 'You have rung these bells before. You ring this one for your friend.' : 'The twin bells of ' + townCfg().n + ' have already rung as one.');
      duoRing(i, 'me');
    } });
  });
}
function duoHeard(d, who) { if (d.t !== S.cur || S.town.duo) return; sfx.bell && sfx.bell(); duoRing(d.i | 0, who); }
function duoSolved() { if (S.town.duo) return; S.town.duo = true; S.gold += 300; S.steel = (S.steel || 0) + 10; save(); virtue('chugi', 1, 'two bells rung as one'); sfx.win && sfx.win(); banner('The twin bells ring as one!', '+300 gold · +10 steel · a Twin Bell blade for each of you'); }

/* ---------- ghosts on the night road ---------- */
const GHOST_Q = {
  hakone: ['Why did every traveler have to stop at Hakone?', 'To show a travel permit', 'To pay for the cedar trees', 'To climb Mount Fuji'],
  hara: ['What is Mount Fuji?', 'A volcano', 'The tallest castle in Japan', 'An island'],
  shimada: ['Why was there never a bridge over the Oi River?', 'So no army could cross it quickly', 'The river was too small to need one', 'Nobody knew how to build one'],
  miya: ['How did the Tokaido go on from Miya?', 'By boat across the bay', 'Through a tunnel', 'Over a mountain pass'],
  seki: ['In the old tales, what does a tanuki pay with?', 'Leaves that look like coins', 'Gold dust', 'Rice cakes'],
  otsu: ['What is special about Lake Biwa?', 'It is the biggest lake in Japan', 'It is full of salt water', 'It dries up every summer'],
  kyoto: ['Where did the Tokaido road end?', 'At Sanjo Bridge in Kyoto', 'At Edo Castle', 'At the top of Mount Fuji'],
};
const GHOST_Q2 = {
  hakone: [['What was the Tokaido?', 'The great road between Edo and Kyoto', 'A river that floods every spring', 'A castle in the mountains'], ['What were the guards at Hakone watching for most of all?', 'Guns being carried toward Edo', 'Stolen horses', 'Travelers without sandals']],
  hara: [['How many stations did the Tokaido have?', 'Fifty-three', 'Seven', 'One thousand'], ['Which artist made Mount Fuji famous in woodblock prints?', 'Hokusai', 'Musashi', 'Basho']],
  shimada: [['How did travelers cross the Oi River?', 'On the shoulders of porters', 'By ferry boat', 'Over a stone bridge'], ['In the old tales, where does a kappa keep its strength?', 'In a dish of water on its head', 'In its shell', 'In its tail']],
  miya: [['What famous shrine stands at Miya?', 'Atsuta Shrine', 'Itsukushima Shrine', 'Toshogu Shrine'], ['Which legendary sword is said to rest at Atsuta Shrine?', 'Kusanagi, the Grass-Cutter', 'Masamune, the Moon Blade', 'Muramasa, the Thirsty One']],
  seki: [['What does the name Seki mean?', 'A barrier, a checkpoint', 'A maple leaf', 'A sleeping fox'], ['What is a tanuki?', 'A raccoon dog that plays tricks in the old tales', 'A river dragon', 'A kind of short sword']],
  otsu: [['What is Lake Biwa named after?', 'A lute, because of its shape', 'A giant catfish', 'A lord who drowned there'], ['Otsu was the last station before which city?', 'Kyoto', 'Edo', 'Osaka']],
  kyoto: [['Who lived in Kyoto in the days of the samurai?', 'The Emperor', 'The Shogun', 'Nobody, it was a ruin'], ['What is the city of Edo called today?', 'Tokyo', 'Osaka', 'Nagoya']],
};
const SNATCH_LOOK = { geisha: true, cloth: '#7a0f1e', armor: '#5a0a16', trim: '#1a0508', hem: '#2a0a10', mask: '#f4e8e8', eye: '#ff2a4a', lips: '#c0102a', pins: '#ffd27a', bloom: '#ff5a7a', inner: '#1a0508', aura: '#ff5a7a' };
/* she takes you somewhere else on the road. Your friends stay where you were taken until you walk back for them */
function snatchAway(T) {
  const open = TOWNS.map((t, i) => i).filter(i => i <= (S.far || 0) && i < ROAD_OPEN && i !== S.cur), to = open.length ? open[(Math.random() * open.length) | 0] : -1;
  S.crew = { t: S.cur, x: +T.pos.x.toFixed(1), z: +T.pos.z.toFixed(1), n: (T.pack || []).length, at: Date.now() }; save();
  if (to >= 0) { T.paused = true; setTimeout(() => { if (TOWN === T) { T.paused = false; townTravel(to, true); setTimeout(() => toast(`You are alone in ${TOWNS[to].n}. Your friends are waiting in ${TOWNS[S.crew ? S.crew.t : 0].n}: walk back for them.`), 2600); } }, 900); return; }
  S.crew.here = 1; S.town.at = null; save(); startTown(false); setTimeout(() => toast('She dropped you at the edge of town, alone. Your friends are waiting where she took you: walk back for them.'), 2600);
}
const LADY_LOOK = { geisha: true, cloth: '#eef4ff', armor: '#eef4ff', trim: '#bfe0ff', hem: '#9fc8ff', mask: '#ffffff', eye: '#2a3a5a', lips: '#9fb8e0', pins: '#dfeaff', bloom: '#ffffff', inner: '#ffffff', aura: '#bfe0ff' };
function ghostFoe(kind) { const st = townFoe('a'); return Object.assign(st, { town: 'ghost', name: 'Sword Thief', title: kind === 'ghost' ? 'a hungry ghost' : 'the ghost who stole a blade', look: GHOST_LOOK, sword: 'iron', weapon: null, scale: 1, teleport: .28, gold: Math.round(st.gold * .8), intro: 'It flickers from place to place. Watch for the red ring and hold BLOCK!' }); }
function ghostRestore() { const w = S.stolen && S.swords.find(x => x.u === S.stolen.u); if (w) { delete w.captured; S.eq = w.u; } S.stolen = null; save(); if (TOWN && MODE === TownMode) townRefreshPlayer(); }
function ghostRemove(T, id) { const p = T.pois.find(q => q.id === id); if (!p) return; T.grp.remove(p.rig.root); T.grp.remove(p.lab); p.rig.dispose && p.rig.dispose(); T.pois = T.pois.filter(q => q !== p); if (T.near === p) T.near = null; }
function ghostTick(dt, T) {
  if (T.enc) return townEncUpdate(dt, T);
  if (window.__noGhost) return;
  const G = T.gh || (T.gh = { night: false, r: null, wait: rnd(50, 110) }), night = townClock() === 'Night', b = T.pois.find(p => p.id === 'b') || { x: townRoadX(20) + 8, z: 20 };
  // the ghost that holds a stolen blade waits near the shrine: yours, or your friend's
  const mine = !!S.stolen && S.stolen.t === S.cur, fr = coopPeers().find(p => p.gh && p.gh.t === S.cur);
  if (mine && !T.pois.find(p => p.id === 'ghost2')) { const p = townNPC('ghost2', b.x - 3.2, b.z + 3.4, GHOST_LOOK, S.stolen.id, 'Sword Thief', 'holding your ' + swordDef(S.stolen.id).name, { col: '#bff4ff', map: 'Your stolen blade', mapCol: '#bff4ff' }); p.label = 'Hunt the sword thief'; p.r = 4.2; p.act = () => townEncStart('held', p); }
  if (!mine) ghostRemove(T, 'ghost2');
  if (fr && !T.pois.find(p => p.id === 'ghost3')) { const p = townNPC('ghost3', b.x + 3.4, b.z + 3.6, GHOST_LOOK, 'iron', 'Sword Thief', `holding ${fr.n}'s ${fr.gh.bn}`, { col: '#9ff0c8', map: `${fr.n}'s stolen blade`, mapCol: '#9ff0c8' }); p.label = `Win back ${fr.n}'s blade`; p.r = 4.2; p.fr = fr.id; p.act = () => townEncStart('heldFr', p); }
  if (!fr) ghostRemove(T, 'ghost3');
  // the sword thief: no warning, any time you are walking with a real blade at your hip
  const w = eqSword();
  if (T.speed > .3 && !T.boat && !T.lift && !T.lapse && w && w.id !== 'bokken' && !S.stolen) { G.wait -= dt * (night ? 2 : 1); if (G.wait <= 0) { G.wait = rnd(80, 170); return townEncStart('thief'); } }
  // the Red Geisha: rarer and faster. She only comes for a samurai who has friends to lose
  if (T.speed > .3 && !T.boat && !T.lift && !T.lapse && !S.crew && (T.pack || []).length) { if (G.sn == null) G.sn = rnd(110, 220); G.sn -= dt * (night ? 2 : 1); if (G.sn <= 0) { G.sn = rnd(150, 280); return townEncStart('snatch'); } }
  // the Lady in White walks the road once each night
  if (night && !S.town.inNight) { S.town.inNight = true; S.town.nightN = (S.town.nightN || 0) + 1; } if (!night && S.town.inNight) S.town.inNight = false;
  if (night && !G.night && S.town.ladyAt !== S.town.nightN) { G.night = true; S.town.ladyAt = S.town.nightN; const za = clamp(T.pos.z + 26, -72, 50), zb = clamp(T.pos.z - 24, -72, 50), z = Math.abs(za - T.pos.z) >= Math.abs(zb - T.pos.z) ? za : zb, x = townRoadX(z) + 1;
    if (Math.abs(z - T.pos.z) > 12) { const rig = new Samurai(LADY_LOOK, swordDef('iron'), { ghost: true, noSaya: true }); rig.root.rotation.order = 'YXZ'; rig.sword.visible = false; rig.setHold('show', 6); rig.root.position.set(x, townH(x, z), z); T.grp.add(rig.root); const h = halo('#bfe0ff', 4, .5); h.position.y = 1.2; rig.root.add(h); G.r = { rig, x, z, t: 0 }; toast('Night falls. A lady in white is walking the road…'); } }
  if (!night && (G.night || G.r)) { G.night = false; if (G.r) { T.grp.remove(G.r.rig.root); G.r.rig.dispose && G.r.rig.dispose(); G.r = null; } }
  const r = G.r; if (!r) return;
  const dx = T.pos.x - r.x, dz = T.pos.z - r.z, d = Math.hypot(dx, dz); r.t += dt;
  if (d < 34 && d > .1) { const v = 1.5 * dt; r.x += dx / d * v; r.z += dz / d * v; }
  r.rig.root.position.set(r.x, townH(r.x, r.z) + .12 + Math.sin(r.t * 2) * .08, r.z); r.rig.root.rotation.y = Math.atan2(dx, dz); r.rig.update(dt);
  if (d < 1.9) { T.grp.remove(r.rig.root); r.rig.dispose && r.rig.dispose(); G.r = null; S.town.at = { x: T.pos.x, z: T.pos.z, yaw: T.face };
    const qs = [GHOST_Q[townCfg().id]].concat(GHOST_Q2[townCfg().id] || []), q = qs[(S.town.ladyQ || 0) % qs.length], ans = [1, 2, 3].sort(() => Math.random() - .5); S.town.ladyQ = ((S.town.ladyQ || 0) + 1) % qs.length; sfx.bell && sfx.bell(); townSay('The Lady in White', `"Answer me truly, traveler, or the road will carry you away."<br><br><b>${q[0]}</b>`, ans.map(i => ['gq:' + (i === 1 ? 'y' : 'n'), q[i]])); }
}
/* ----- the sword thief: a sudden ghost on the road. Draw from the hilt and cut it down before it reaches you ----- */
function townEncStart(kind, poi) {
  const T = TOWN; if (!T || T.enc || T.paused) return;
  const held = kind === 'held' || kind === 'heldFr', def = kind === 'held' && S.stolen ? swordDef(S.stolen.id) : swordDef('iron');
  const snatch = kind === 'snatch';
  const ghost = new Samurai(snatch ? SNATCH_LOOK : GHOST_LOOK, def, snatch ? { ghost: true, noSaya: true, ghostCol: '#ff1238', ghostLine: '#ffb0c0' } : { ghost: true, noSaya: true }); ghost.root.rotation.order = 'YXZ'; if (snatch) { ghost.sword.visible = false; }
  let f = new V3(Math.sin(T.face), 0, Math.cos(T.face)), gx = T.pos.x + f.x * 5.4, gz = T.pos.z + f.z * 5.4;
  if (poi) { const dx = poi.x - T.pos.x, dz = poi.z - T.pos.z, l = Math.hypot(dx, dz) || 1; gx = T.pos.x + dx / l * 5.4; gz = T.pos.z + dz / l * 5.4; poi.rig.root.visible = false; poi.lab.visible = false; }
  else { const h = townH(gx, gz); if (h < (T.W.minH == null ? -.35 : T.W.minH) || h > 15) { f = new V3(-f.x, 0, -f.z); gx = T.pos.x + f.x * 5.4; gz = T.pos.z + f.z * 5.4; } }
  const gy = Math.max(townH(gx, gz), -.3); ghost.root.position.set(gx, gy + .3, gz); ghost.setHold('guard', 8); ghost.mat.opacity = 0; T.grp.add(ghost.root, ghost.trail.mesh);
  const win = kind === 'practice' ? 3.6 : (Math.max(.95, 1.65 - townCfg().i * .1) + (stats().drawBonus || 0)) * (held ? .88 : 1) * (snatch ? .72 : 1);
  T.enc = { ghost, kind, poi, phase: 'appear', t: 0, t0: 0, win, sx: gx, sz: gz, gy, drawnAt: -1, op: 0, iai: false, sw: null };
  T.joy = null; T.look = null; T.near = null; $('#actBtn').hidden = true;
  banner(snatch ? 'THE RED GEISHA!' : held ? 'THE THIEF LUNGES!' : 'GHOST THIEF!', snatch ? 'Draw and strike, NOW, or she takes you!' : held ? 'Draw and strike!' : 'Swipe out of the gold hilt to draw, then cut it down!');
  sfx.ghost && sfx.ghost(); shake(.1); FX.puff(new V3(gx, gy + 1, gz), 12, '#bfe8ff', .7);
}
function townEncDraw() { const T = TOWN, e = T && T.enc; if (!e || e.phase !== 'draw') return false; if (!T.P.drawSword({ to: ['endL', 'guard'], durs: [.14, .3] })) return false; sfx.draw && sfx.draw(); e.phase = 'drawn'; e.drawnAt = e.t; $('#hiltBtn').hidden = true; return true; }
function townEncSlash(x0, y0, x1, y1) {
  const T = TOWN, e = T && T.enc; if (!e || e.phase !== 'drawn' || e.t - e.drawnAt < .1) return;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1; if (e.t - e.drawnAt > .3) { rigSwing(T.P, (x1 - x0) / len, (y1 - y0) / len, .12); sfx.slash && sfx.slash(); }
  if (!hitTest(e.ghost, x0, y0, x1, y1)) return;
  e.iai = e.t - e.drawnAt < .5; e.phase = 'won'; e.t1 = e.t;
  const gp = e.ghost.chest.getWorldPosition(new V3()), s = toScreen(gp), c = townCfg();
  FX.sparks(gp, '#bff4ff', 70, 6, .09); FX.glowBurst(gp, '#7fe8ff', 2.6, .5); FX.petals(gp, 30, '#bfe8ff', 3.5); FX.puff(gp, 14, '#e8f8ff', .9);
  sfx.banish && sfx.banish(); hitstop(120); slowmo(.35, .5); OV.flash = .4; OV.flashCol = '200,240,255';
  ovPop(s.x, s.y - 30, e.iai ? 'IAI!' : 'BANISHED!', { size: e.iai ? 52 : 40, color: '#2a1200', stroke: '#e8fbff', burst: e.iai ? '#ffe08c' : '#9fe8ff', rot: rnd(-.2, .2), life: 1.2, vy: -30 });
  const gold = (e.iai ? 40 : 20) + c.i * 12; S.gold += gold; S.steel = (S.steel || 0) + 1 + (e.iai ? 1 : 0); S.ghosts = (S.ghosts || 0) + 1;
  const ups = addSkillXP('iai', e.kind === 'thief' ? (e.iai ? 16 : 10) : 24), got = rollDrops(c.i, 'ghost'), mt = Object.entries(got).map(([id, n]) => `+${n} ${MATERIALS[id].n}`).join(' · ');
  if (e.kind === 'held') { const d = swordDef(S.stolen.id); ghostRestore(); banner('Blade reclaimed!', d.name + ' is back in your hands'); }
  else if (e.kind === 'heldFr') { const fr = CO.peers[e.poi.fr]; if (fr) tmSend('rescued', { to: fr.id }); virtue('chugi', 1, "you won back a friend's blade"); banner('Blade rescued!', fr ? `${fr.n}'s ${fr.gh ? fr.gh.bn : 'blade'} flies back to its owner` : ''); if (fr) fr.gh = null; }
  else banner(e.iai ? 'IAI STRIKE!' : 'Ghost banished!', `+${gold} gold${mt ? ' · ' + mt : ''}${ups ? ' · Iai level up!' : ''}`);
  if (ups) sfx.up && sfx.up(); save(); e.ghost.root.visible = false;
}
function townEncFail(T, e) {
  e.phase = 'lost'; e.t1 = e.t; e.ghost.seq.length = 0; e.ghost.queue('endH', .14, { ease: easeIn, arc: .3 });
  sfx.slash && sfx.slash(1.3); setTimeout(() => sfx.hurt && sfx.hurt(), 90); T.P.hitFlash && T.P.hitFlash(1); shake(.14); OV.vig = 1; OV.vigCol = '120,200,255';
  if (e.kind === 'snatch') { e.snatched = true; OV.vigCol = '255,80,120'; banner('SNATCHED!', 'The Red Geisha carries you off, and your friends are left behind'); setTimeout(() => sfx.laugh && sfx.laugh(), 400); return; }
  const w = eqSword();
  if (e.kind !== 'thief' || S.stolen || !w || w.id === 'bokken') { e.knock = true; banner(e.kind === 'practice' ? 'Too slow!' : e.kind === 'thief' ? 'Knocked back!' : 'The thief got away!', e.kind === 'practice' ? 'Out on the road it would have taken your sword. It will come when you least expect it' : e.kind === 'thief' ? 'The ghost laughs and fades away' : 'It still holds the blade. Draw faster and try again!'); setTimeout(() => sfx.laugh && sfx.laugh(), 400); return; }
  const d = swordDef(w.id); w.captured = 'tokaido'; S.stolen = { u: w.u, id: w.id, t: S.cur };
  const next = usableSwords().sort((x, y) => swordDmg(y) - swordDmg(x))[0] || addSword('bokken'); S.eq = next.u; save();
  banner('BLADE STOLEN!', `The ghost flees with your ${d.name} toward ${townCfg().b.n}. Hunt it down, or a friend can`); setTimeout(() => sfx.laugh && sfx.laugh(), 500);
}
function townEncUpdate(dt, T) {
  const e = T.enc, G = e.ghost; e.t += dt; T.joy = null; T.speed = 0;
  e.op = Math.min(.5, e.op + dt * 1.1); G.mat.opacity = e.phase === 'lost' && e.t - e.t1 > 1.2 ? Math.max(0, .5 - (e.t - e.t1 - 1.2) * .6) : e.op;
  const tx = T.pos.x - G.root.position.x, tz = T.pos.z - G.root.position.z, l = Math.hypot(tx, tz) || 1;
  G.root.rotation.y = Math.atan2(tx, tz);
  if (e.phase !== 'lost') { let d = Math.atan2(-tx, -tz) - T.face; d = Math.atan2(Math.sin(d), Math.cos(d)); T.face += d * damp(10, dt); let c = Math.atan2(-tx, -tz) - T.camYaw; c = Math.atan2(Math.sin(c), Math.cos(c)); T.camYaw += c * damp(4, dt); }
  if (Math.random() < dt * 30) { const p = G.root.position; FX.add.emit(p.x + rnd(-.4, .4), p.y + rnd(0, 1.8), p.z + rnd(-.4, .4), 0, rnd(.3, .8), 0, rnd(.6, 1.1), .08, 0, e.kind === 'snatch' ? '#ff6a8a' : '#9fe8ff', .8, -.2, .3); }
  if (e.phase === 'appear' && e.t > .6) { e.phase = 'draw'; e.t0 = e.t; G.setHold('windH', 3 / e.win); $('#hiltBtn').hidden = false; }
  if (e.phase === 'draw' || e.phase === 'drawn') {
    const k = clamp((e.t - e.t0) / e.win, 0, 1), ex = T.pos.x - tx / l * 1.5, ez = T.pos.z - tz / l * 1.5;
    G.root.position.set(lerp(e.sx, ex, easeIn(k)), e.gy + .3 + Math.sin(e.t * 3) * .08, lerp(e.sz, ez, easeIn(k)));
    if (k >= 1) townEncFail(T, e);
  }
  G.update(dt);
  const over = (e.phase === 'won' && e.t - e.t1 > 1.1) || (e.phase === 'lost' && e.t - e.t1 > 2.3);
  if (e.phase === 'lost' && e.t - e.t1 > .8) G.root.position.y += dt * 1.2;
  if (over) {
    T.grp.remove(G.root); T.grp.remove(G.trail.mesh); G.dispose && G.dispose(); $('#hiltBtn').hidden = true; T.enc = null;
    if (e.snatched) return snatchAway(T);
    if (e.knock) T.pos.addScaledVector(new V3(Math.sin(T.face), 0, Math.cos(T.face)), -2.5), T.pos.copy(T.lastGood);
    if (e.poi && T.pois.includes(e.poi) && e.phase === 'lost') { e.poi.rig.root.visible = true; e.poi.lab.visible = true; }
    if (e.poi && e.phase === 'won') ghostRemove(T, e.poi.id);
    townRefreshPlayer();
  }
}
function townEncPointer(ev, px, py, id) {
  const e = TOWN.enc; if (!e) return;
  if (ev === 'down') e.sw = { id, x: px, y: py };
  else if (ev === 'move' && e.sw && e.sw.id === id) { OV.trail.push({ x: px, y: py, t: performance.now() }); if (Math.hypot(px - e.sw.x, py - e.sw.y) >= 44) { if (e.phase === 'draw') townEncDraw(); else townEncSlash(e.sw.x, e.sw.y, px, py); e.sw.x = px; e.sw.y = py; } }
  else if (ev === 'up') e.sw = null;
}
function ghostClick(a) {
  if (!a.startsWith('gq:')) return false;
  if (a === 'gq:y') { S.gold += 150; S.ladies = S.ladies || []; if (!S.ladies.includes(townCfg().id)) S.ladies.push(townCfg().id); save(); virtue('rei', 1, 'you answered the Lady in White'); townSay('The Lady in White', 'She smiles, bows, and is gone. Where she stood lies a small purse.<br><span class="muted">+150 gold</span>'); return true; }
  const open = TOWNS.map((t, i) => i).filter(i => i <= (S.far || 0) && i < ROAD_OPEN && i !== S.cur), to = open.length ? open[(Math.random() * open.length) | 0] : -1, T = TOWN;
  if (to < 0) { S.gold = Math.max(0, S.gold - 50); save(); townSay('The Lady in White', 'She sighs. A cold wind turns you around three times and empties your purse a little.<br><span class="muted">−50 gold</span>'); return true; }
  townCloseTalk(); banner('Whisked away!', `The Lady in White carries you off to ${TOWNS[to].n}`); tmSend('whisk', { town: to }); if (T) T.paused = true; setTimeout(() => { if (TOWN === T) { T.paused = false; townTravel(to); } }, 1800); return true;
}
/* duels that are not part of a town's story: ghosts, and the sensei's trial */
function specialResult() {
  const k = F.ctx.idx, win = F.outcome === 'win', back = '<div class="actions"><button class="btn primary" data-town="back">Back to town</button></div>';
  if (!['ghost', 'ghost2', 'ghost3', 'sensei'].includes(k)) return false;
  hint('');
  if (k === 'sensei') {
    if (!win) return openOverlay(`<div class="modal"><div class="kicker lose">Not yet</div><p>"Two blades need two calm hands," says the hermit. "Train, and come again."</p><div class="actions"><button class="btn primary" data-town="retry">Try again</button><button class="btn" data-town="back">Back to town</button></div></div>`), true;
    S.dual = true; S.style2 = (S.style || 'katana') === 'kodachi' ? 'katana' : 'kodachi'; S.wins++; save(); virtue('meiyo', 1, 'you passed the trial of Two Heavens');
    return openOverlay(`<div class="modal win"><div class="kicker">Two Heavens</div><p>The hermit bows. "You may carry <b>two blades</b>."</p><p class="muted">In any duel, tap <b>⇄</b> to switch between your two styles, or to fight with both at once: fast and strong, but it burns stamina every second. Choose your second blade with the hermit, and your first with any sensei.</p>${back}</div>`), true;
  }
  if (k === 'ghost') {
    if (win) { S.gold += F.st.gold; S.wins++; save(); return openOverlay(`<div class="modal win"><div class="kicker">Blade defended</div><p>The ghost wails and blows away like smoke. Your blade is safe.</p><div class="rewards"><span class="chip gold"><i></i>+${F.st.gold}</span></div>${back}</div>`), true; }
    const w = eqSword(), d = swordDef(w.id); w.captured = 'tokaido'; S.stolen = { u: w.u, id: w.id, t: S.cur };
    const next = usableSwords().sort((x, y) => swordDmg(y) - swordDmg(x))[0] || addSword('bokken'); S.eq = next.u; save();
    return openOverlay(`<div class="modal"><div class="kicker lose">Stolen!</div><p>The ghost tears your <b>${d.name}</b> from your hands and drifts off toward ${esc(townCfg().b.n)}.</p><p class="muted">You carry your ${swordDef(next.id).name} for now. Face the ghost again to win your blade back, or a friend travelling with you can win it back for you.</p>${back}</div>`), true;
  }
  if (!win) return openOverlay(`<div class="modal"><div class="kicker lose">Defeated</div><p>The ghost keeps the blade. For now.</p><div class="actions"><button class="btn primary" data-town="retry">Try again</button><button class="btn" data-town="back">Back to town</button></div></div>`), true;
  S.gold += F.st.gold; S.wins++;
  if (k === 'ghost2') { const d = swordDef(S.stolen.id); ghostRestore(); return openOverlay(`<div class="modal win"><div class="kicker">Blade reclaimed</div><p>The ghost lets go. Your <b>${d.name}</b> is back in your hands.</p>${back}</div>`), true; }
  const fr = coopPeers().find(p => p.gh && p.gh.t === S.cur); save(); if (fr) tmSend('rescued', { to: fr.id }); virtue('chugi', 1, 'you won back a friend\'s blade');
  return openOverlay(`<div class="modal win"><div class="kicker">Blade rescued</div><p>The ghost lets go${fr ? `, and <b style="color:#9ff0c8">${esc(fr.n)}'s ${esc(fr.gh.bn)}</b> flies back to its owner` : ''}.</p><div class="rewards"><span class="chip gold"><i></i>+${F.st.gold}</span></div>${back}</div>`), true;
}

/* ---------- Two Heavens: carrying two blades ---------- */
function duelOrder() { return [S.style || 'katana', S.style2 || 'kodachi', 'both']; }
function duelSwap(to) {
  if (typeof F === 'undefined' || !F || F.over || !S.dual) return;
  if (F.dualLost != null && to !== 1 - F.dualLost) { if (to == null) ovPop(VW / 2, VH * .46, 'Only one blade left!', { size: 22, color: '#ffd27a', stroke: '#2a1200' }); return; }
  const now = coopNow(); if (to == null && now < (F.swAt || 0)) return; F.swAt = now + .7;
  F.sw = to == null ? ((F.sw || 0) + 1) % 3 : to; STYLE_OVR = duelOrder()[F.sw];
  if (F.sw === 2 && (F.P.det.armL || F.P.det.armR)) { F.sw = 0; STYLE_OVR = duelOrder()[0]; ovPop(VW / 2, VH * .46, 'Two blades need two hands!', { size: 22, color: '#ffd27a', stroke: '#2a1200' }); }
  const n = stats(); Object.assign(F.ps, { atk: n.atk, cd: n.cd, staCost: n.staCost, parry: n.parry }); styleRig(F.P); dualRig(F.P, F.sw === 2);
  const y = styleDef(); ovPop(VW / 2, VH * .4, y.jp + ' ' + y.n, { size: 30, color: F.sw === 2 ? '#ffd27a' : '#ffffff', stroke: '#1a1020' }); sfx.whoosh && sfx.whoosh();
}
/* the second blade, held beside the first when both are out */
function dualRig(P, on) {
  if (!P || !P.grip) return;
  if (on && !P.sword2) { const second = usableSwords().filter(w => w.u !== S.eq).sort((x, y) => swordDmg(y) - swordDmg(x))[0]; P.sword2 = buildSword(swordDef((second || eqSword()).id)); P.sword2.position.set(DUAL_POSE[0], DUAL_POSE[1], DUAL_POSE[2]); P.sword2.rotation.set(DUAL_POSE[3], DUAL_POSE[4], DUAL_POSE[5]); P.grip.add(P.sword2); }
  if (P.sword2) { P.sword2.visible = !!on; P.sword2.scale.setScalar(STYLES[S.style2 || 'kodachi'].len); }
  if (on) P.sword.scale.setScalar(STYLES[S.style || 'katana'].len);
}
const DUAL_POSE = [-.3, 0, 0, 0, 0, .55];
/* the dual wielder's single-blade spirit strike ends by flowing into the other blade, rested and sharp */
function flowChange() {
  if (!F || F.over || !S.dual || F.dualLost != null) return; duelSwap(F.sw === 0 ? 1 : 0); F.sta = 100; F.atkMul = Math.max(F.atkMul || 1, 1.3); const f = F; setTimeout(() => { if (F === f && !F.special && !(TEAM && TEAM.openUntil)) F.atkMul = 1; }, 4000);
}
(function () { const b = document.createElement('button'); b.className = 'act-btn'; b.id = 'swapBtn'; b.hidden = true; b.dataset.team = 'swap'; b.style.cssText = 'left:24px;transform:none;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);font-size:15px;padding:10px 16px;animation:none'; ($('#hud') || document.body).appendChild(b); })();
