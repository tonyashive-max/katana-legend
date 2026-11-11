'use strict';
/* ===== Playing as a team =====
   Team duels (one enemy each, win or lose together), the twin bells that need two samurai,
   ghosts on the night road, and the Two Heavens school of two blades. */

/* ---------- team duels ---------- */
let TEAM = null;
const tmSend = (k, o) => { if (CO.on) NET.send('tm', Object.assign({ id: CO.me, n: nm(), k }, o || {})); };
function teamFoeName(role) { const c = townCfg(); return role === 'a' ? c.a.foe.n : role === 'keeper' ? c.keeper.n : c.myth.n; }
function teamInvite(role) {
  if (!CO.on || !['a', 'keeper', 'myth'].includes(role)) return false;
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
  const sb = $('#swapBtn'); if (sb) { const show = !!inFight && !F.over && !!S.dual && !!F.st.town && F.state !== 'intro'; if (sb.hidden === show) sb.hidden = !show; if (show) sb.textContent = '⇄ ' + STYLES[duelOrder()[((F.sw || 0) + 1) % 3]].n; }
  if (!inFight) STYLE_OVR = null;
  else if (F.sw === 2 && !F.over && (F.P.det.armL || F.P.det.armR)) duelSwap(0);
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
      if (S.town.duo) return toast('The twin bells of ' + townCfg().n + ' have already rung as one.');
      const now = coopNow(); DUO.mine = { i, t: now }; tmSend('bell', { i, t: S.cur });
      if (DUO.peer && DUO.peer.i !== i && now - DUO.peer.t < 5) return duoSolved();
      const fr = coopHere()[0];
      toast(fr ? `Rung! ${fr.n} has five seconds to ring the other bell.` : 'A second bell far across town stays silent. This takes two samurai: one at each bell, rung together. (Pack, then Together.)');
    } });
  });
}
function duoHeard(d, who) { if (d.t !== S.cur || S.town.duo) return; const now = coopNow(); DUO.peer = { i: d.i | 0, t: now }; if (DUO.mine && DUO.mine.i !== DUO.peer.i && now - DUO.mine.t < 5) return duoSolved(); toast(`${who} rang the ${d.i ? 'far' : 'south'} bell! Ring the other one now!`); sfx.bell && sfx.bell(); }
function duoSolved() { if (S.town.duo) return; S.town.duo = true; S.gold += 300; S.steel = (S.steel || 0) + 10; save(); virtue('chugi', 1, 'two bells rung as one'); sfx.win && sfx.win(); banner('The twin bells ring as one!', '+300 gold · +10 steel for each of you'); }

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
const LADY_LOOK = { geisha: true, cloth: '#eef4ff', armor: '#eef4ff', trim: '#bfe0ff', hem: '#9fc8ff', mask: '#ffffff', eye: '#2a3a5a', lips: '#9fb8e0', pins: '#dfeaff', bloom: '#ffffff', inner: '#ffffff', aura: '#bfe0ff' };
function ghostFoe(kind) { const st = townFoe('a'); return Object.assign(st, { town: 'ghost', name: 'Sword Thief', title: kind === 'ghost' ? 'a hungry ghost' : 'the ghost who stole a blade', look: GHOST_LOOK, sword: 'iron', weapon: null, scale: 1, teleport: .28, gold: Math.round(st.gold * .8), intro: 'It flickers from place to place. Watch for the red ring and hold BLOCK!' }); }
function ghostRestore() { const w = S.stolen && S.swords.find(x => x.u === S.stolen.u); if (w) { delete w.captured; S.eq = w.u; } S.stolen = null; save(); if (TOWN && MODE === TownMode) townRefreshPlayer(); }
function ghostRemove(T, id) { const p = T.pois.find(q => q.id === id); if (!p) return; T.grp.remove(p.rig.root); T.grp.remove(p.lab); p.rig.dispose && p.rig.dispose(); T.pois = T.pois.filter(q => q !== p); if (T.near === p) T.near = null; }
function ghostTick(dt, T) {
  if (window.__noGhost) return;
  const G = T.gh || (T.gh = { night: false, n: (S.wins | 0) % 2, r: null }), night = townClock() === 'Night', b = T.pois.find(p => p.id === 'b') || { x: townRoadX(20) + 8, z: 20 };
  // the ghost that holds a stolen blade waits near the shrine: yours, or your friend's
  const mine = !!S.stolen && S.stolen.t === S.cur, fr = coopPeers().find(p => p.gh && p.gh.t === S.cur);
  if (mine && !T.pois.find(p => p.id === 'ghost2')) { const p = townNPC('ghost2', b.x - 3.2, b.z + 3.4, GHOST_LOOK, 'iron', 'Sword Thief', 'holding your ' + swordDef(S.stolen.id).name, { col: '#bff4ff', map: 'Your stolen blade', mapCol: '#bff4ff' }); p.label = 'Face the sword thief'; p.act = () => townSay('Sword Thief', `The ghost clutches your <b>${swordDef(S.stolen.id).name}</b> and hisses.`, [['fight:ghost2', '⚔ Win it back', 'primary'], ['', 'Not yet']]); }
  if (!mine) ghostRemove(T, 'ghost2');
  if (fr && !T.pois.find(p => p.id === 'ghost3')) { const p = townNPC('ghost3', b.x + 3.4, b.z + 3.6, GHOST_LOOK, 'iron', 'Sword Thief', `holding ${fr.n}'s ${fr.gh.bn}`, { col: '#9ff0c8', map: `${fr.n}'s stolen blade`, mapCol: '#9ff0c8' }); p.label = 'Face the sword thief'; p.fr = fr.id; p.act = () => townSay('Sword Thief', `The ghost clutches <b>${esc(fr.n)}'s ${esc(fr.gh.bn)}</b>. ${esc(fr.n)} cannot fight for it twice in one night, but you can.`, [['fight:ghost3', `⚔ Win it back for ${esc(fr.n)}`, 'primary'], ['', 'Not yet']]); }
  if (!fr) ghostRemove(T, 'ghost3');
  // one ghost walks the road each night: the sword thief and the Lady in White take turns
  if (night && !G.night) { G.night = true; G.n++; const thief = G.n % 2 === 0 && !S.stolen && usableSwords().length > 0, za = clamp(T.pos.z + 26, -72, 50), zb = clamp(T.pos.z - 24, -72, 50), z = Math.abs(za - T.pos.z) >= Math.abs(zb - T.pos.z) === thief || Math.abs(zb - T.pos.z) < 13 ? (Math.abs(za - T.pos.z) < 13 ? zb : za) : zb, x = townRoadX(z) + 1;
    if (Math.abs(z - T.pos.z) > 12) { const rig = new Samurai(thief ? GHOST_LOOK : LADY_LOOK, swordDef('iron'), { ghost: true, noSaya: true }); rig.root.rotation.order = 'YXZ'; if (!thief) rig.sword.visible = false; rig.setHold(thief ? 'rest' : 'show', 6); rig.root.position.set(x, townH(x, z), z); T.grp.add(rig.root); const h = halo('#bfe0ff', 4, .5); h.position.y = 1.2; rig.root.add(h); G.r = { rig, thief, x, z, t: 0 }; toast(thief ? 'Night falls. Something pale is walking the road…' : 'Night falls. A lady in white is walking the road…'); } }
  if (!night && G.night) { G.night = false; if (G.r) { T.grp.remove(G.r.rig.root); G.r.rig.dispose && G.r.rig.dispose(); G.r = null; } }
  const r = G.r; if (!r) return;
  const dx = T.pos.x - r.x, dz = T.pos.z - r.z, d = Math.hypot(dx, dz); r.t += dt;
  if (d < 34 && d > .1) { const v = (r.thief ? 2.1 : 1.5) * dt; r.x += dx / d * v; r.z += dz / d * v; }
  r.rig.root.position.set(r.x, townH(r.x, r.z) + .12 + Math.sin(r.t * 2) * .08, r.z); r.rig.root.rotation.y = Math.atan2(dx, dz); r.rig.update(dt);
  if (d < 1.9) { T.grp.remove(r.rig.root); r.rig.dispose && r.rig.dispose(); G.r = null; S.town.at = { x: T.pos.x, z: T.pos.z, yaw: T.face };
    if (r.thief) townSay('A cold wind', 'A pale ghost reaches for your <b>blade</b>. Only you can defend it!', [['fight:ghost', '⚔ Defend your blade', 'primary']]);
    else { const q = GHOST_Q[townCfg().id], ans = [1, 2, 3].sort(() => Math.random() - .5); sfx.bell && sfx.bell(); townSay('The Lady in White', `"Answer me truly, traveler, or the road will carry you away."<br><br><b>${q[0]}</b>`, ans.map(i => ['gq:' + (i === 1 ? 'y' : 'n'), q[i]])); } }
}
function ghostClick(a) {
  if (!a.startsWith('gq:')) return false;
  if (a === 'gq:y') { S.gold += 150; save(); virtue('rei', 1, 'you answered the Lady in White'); townSay('The Lady in White', 'She smiles, bows, and is gone. Where she stood lies a small purse.<br><span class="muted">+150 gold</span>'); return true; }
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
    if (!win) return openOverlay(`<div class="modal"><div class="kicker lose">Not yet</div><p>"Two blades need two calm hands," says the sensei. "Train, and come again."</p><div class="actions"><button class="btn primary" data-town="retry">Try again</button><button class="btn" data-town="back">Back to town</button></div></div>`), true;
    S.dual = true; S.style2 = (S.style || 'katana') === 'kodachi' ? 'katana' : 'kodachi'; S.wins++; save(); virtue('meiyo', 1, 'you passed the trial of Two Heavens');
    return openOverlay(`<div class="modal win"><div class="kicker">Two Heavens</div><p>The sensei bows. "You may carry <b>two blades</b>."</p><p class="muted">In any duel, tap <b>⇄</b> to switch between your two styles, or to fight with both at once: fast and strong, but it burns stamina every second. Choose your pair at any sensei.</p>${back}</div>`), true;
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
  if (!F || F.over || !S.dual) return; duelSwap(F.sw === 0 ? 1 : 0); F.sta = 100; F.atkMul = Math.max(F.atkMul || 1, 1.3); const f = F; setTimeout(() => { if (F === f && !F.special && !(TEAM && TEAM.openUntil)) F.atkMul = 1; }, 4000);
}
(function () { const b = document.createElement('button'); b.className = 'act-btn'; b.id = 'swapBtn'; b.hidden = true; b.dataset.team = 'swap'; b.style.cssText = 'left:24px;transform:none;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);font-size:15px;padding:10px 16px;animation:none'; ($('#hud') || document.body).appendChild(b); })();
