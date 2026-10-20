'use strict';
/* ===== Versus: same-tablet split controls, or two devices online ===== */

let VS = null;
const VS_HP = 160, VS_TELE = .5;
const IN_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');

function vsDmg(swordId, lvl) { const ri = RAR[swordDef(swordId).r].i; return 13 * (1 + ri * .05) * (1 + (lvl || 0) * .02); }
function makeFighter(o) {
  const rig = new Samurai(lookFromOutfit(outfitDef(o.outfit)), swordDef(o.sword), {});
  rig.root.rotation.order = 'YXZ';
  return { rig, name: o.name, outfit: o.outfit, sword: o.sword, lvl: o.lvl || 0, hp: VS_HP, max: VS_HP, limbs: { armL: 80, armR: 80, legs: 80, head: 70 },
    state: 'ready', t: 0, dir: 'R', tele: VS_TELE, blocking: false, atkId: 0, dmg: vsDmg(o.sword, o.lvl), dmgMul: 1, legsPen: 1, lunge: 0, kb: 0, resolved: false, pendingRes: null };
}
function swipeDir(ux, uy) {
  if (Math.abs(uy) > Math.abs(ux) * 1.2) return uy > 0 ? 'H' : 'Low';
  return ux < 0 ? 'R' : 'L';
}

/* ---------- networking ---------- */
const NET = {
  kind: null, room: null, conn: null, peer: null, handler: null, peersCb: null,
  async openRoom(code) {
    const room = await window.claude.use('room');
    if (!room) throw new Error('Two-device play needs everyone signed in to Claude here. Use the website version for friends without accounts.');
    const r = await room.join('katana-' + code.toLowerCase());
    this.kind = 'room'; this.room = r;
    r.on('vs', msg => { if (msg.sameTab) return; if (this.handler && msg.data && typeof msg.data === 'object') this.handler(msg.data); }, e => this.fail(e.message));
    r.onPeers(ch => { if (this.peersCb) this.peersCb(ch.peers.filter(p => !p.sameTab).length); });
  },
  loadPeerJS() {
    if (window.Peer) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('Could not load the connection library. Check your internet connection.'));
      document.head.appendChild(s);
    });
  },
  async openPeer(code, host) {
    await this.loadPeerJS();
    this.kind = 'peer';
    const id = 'shep-katana-' + code.toLowerCase();
    return new Promise((res, rej) => {
      const peer = host ? new window.Peer(id) : new window.Peer();
      this.peer = peer;
      const wire = conn => {
        this.conn = conn;
        conn.on('data', d => { if (this.handler && d && typeof d === 'object') this.handler(d); });
        conn.on('open', () => { if (this.peersCb) this.peersCb(1); });
        conn.on('close', () => { if (this.peersCb) this.peersCb(0); });
      };
      peer.on('open', () => {
        if (host) { peer.on('connection', c => wire(c)); res(); }
        else { const c = peer.connect(id, { reliable: true }); wire(c); c.on('open', () => res()); setTimeout(() => rej(new Error('No game found with that code. Check the code and make sure the host is waiting.')), 12000); }
      });
      peer.on('error', e => {
        if (e.type === 'unavailable-id') rej(new Error('That code is busy. Tap Host again for a new code.'));
        else if (e.type === 'peer-unavailable') rej(new Error('No game found with that code. Check the code and make sure the host is waiting.'));
        else this.fail(e.message || 'Connection problem.');
      });
    });
  },
  send(type, data) {
    const msg = Object.assign({ type }, data || {});
    try {
      if (this.kind === 'room' && this.room) this.room.emit('vs', msg).catch(() => {});
      else if (this.kind === 'peer' && this.conn && this.conn.open) this.conn.send(msg);
    } catch (e) { /* dropped */ }
  },
  fail(msg) { if (VS && VS.online) { toast(msg || 'Connection lost'); } },
  close() {
    try { if (this.room) this.room.leave(); } catch (e) { /* */ }
    try { if (this.conn) this.conn.close(); if (this.peer) this.peer.destroy(); } catch (e) { /* */ }
    this.kind = null; this.room = null; this.conn = null; this.peer = null; this.handler = null; this.peersCb = null;
  },
};
function newCode() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += a[(Math.random() * a.length) | 0]; return s; }
function myVsProfile() { const w = eqSword(); return { name: (S.name || 'Shep').slice(0, 14), outfit: S.outfit, sword: w.id, lvl: w.lvl || 0 }; }

/* ---------- lobby (online) ---------- */
let LOBBY = null;
async function vsHost() {
  const code = newCode();
  LOBBY = { code, host: true, other: null, status: 'Opening a game…' };
  renderLobby();
  try {
    if (IN_CLAUDE) await NET.openRoom(code); else await NET.openPeer(code, true);
    LOBBY.status = 'Waiting for your friend to join…'; renderLobby();
    lobbyWire();
  } catch (e) { LOBBY.status = e.message; LOBBY.error = true; renderLobby(); }
}
async function vsJoin(code) {
  LOBBY = { code, host: false, other: null, status: 'Connecting…' };
  renderLobby();
  try {
    if (IN_CLAUDE) await NET.openRoom(code); else await NET.openPeer(code, false);
    LOBBY.status = 'Connected! Saying hello…'; renderLobby();
    lobbyWire();
  } catch (e) { LOBBY.status = e.message; LOBBY.error = true; renderLobby(); }
}
function lobbyWire() {
  const me = myVsProfile();
  NET.handler = d => {
    if (d.type === 'hi' && LOBBY && !LOBBY.other) {
      LOBBY.other = { name: String(d.name || 'Friend').slice(0, 14), outfit: OUTFITS.some(o => o.id === d.outfit) ? d.outfit : 'ronin', sword: SWORDS.some(s => s.id === d.sword) ? d.sword : 'iron', lvl: clamp(+d.lvl || 0, 0, 10) };
      NET.send('hi', me);
      LOBBY.status = `${LOBBY.other.name} joined! Get ready…`; renderLobby(); sfx.up();
      setTimeout(() => { if (LOBBY && LOBBY.other) startVersusOnline(LOBBY.code, LOBBY.host, me, LOBBY.other); }, 1600);
    } else if (VS && VS.online) vsNetMessage(d);
  };
  NET.peersCb = n => { if (n > 0) NET.send('hi', me); };
  NET.send('hi', me);
  LOBBY.hiTimer = setInterval(() => { if (LOBBY && !LOBBY.other) NET.send('hi', me); else clearInterval(LOBBY && LOBBY.hiTimer); }, 1500);
}
function renderLobby() {
  if (!LOBBY) return;
  openOverlay(`<div class="modal">
    <div class="eyebrow">Two-device duel</div>
    <h2>${LOBBY.host ? 'Your game code' : 'Joining game'}</h2>
    <div class="code">${LOBBY.code}</div>
    <p class="${LOBBY.error ? '' : 'muted'}" style="${LOBBY.error ? 'color:#ffb4a8' : ''}">${LOBBY.status}</p>
    ${LOBBY.host && !LOBBY.error ? `<p class="muted" style="font-size:14px">On the other ${IN_CLAUDE ? 'device, open this same game in Claude' : 'device, open this same game website'}, tap Versus → Join, and type <b>${LOBBY.code}</b>.</p>` : ''}
    <div class="actions"><button class="btn" data-vs="cancel">Cancel</button></div>
  </div>`);
}
function joinPad() {
  let code = '';
  const draw = () => openOverlay(`<div class="modal">
    <div class="eyebrow">Join a friend</div><h2>Type the 4-letter code</h2>
    <div class="code">${(code + '____').slice(0, 4)}</div>
    <div class="keypad">${'ABCDEFGHJKMNPQRSTUVWXYZ23456789'.split('').map(ch => `<button data-key="${ch}">${ch}</button>`).join('')}<button data-key="del">⌫</button></div>
    <div class="actions"><button class="btn" data-vs="cancel">Cancel</button><button class="btn primary" data-key="go" ${code.length === 4 ? '' : 'disabled'}>Join</button></div>
  </div>`);
  JOINPAD = k => {
    if (k === 'del') code = code.slice(0, -1);
    else if (k === 'go') { if (code.length === 4) { JOINPAD = null; vsJoin(code); } return; }
    else if (code.length < 4) code += k;
    sfx.ui(); draw();
  };
  draw();
}
let JOINPAD = null;
function cancelLobby() {
  if (LOBBY && LOBBY.hiTimer) clearInterval(LOBBY.hiTimer);
  LOBBY = null; JOINPAD = null; NET.close(); closeOverlay();
}

/* ---------- match setup ---------- */
function setupVsScene(ch, a, b) {
  clearSceneActors();
  const W = buildWorld(ch); activateWorld(W);
  const A = makeFighter(a), B = makeFighter(b);
  A.rig.root.position.set(0, 0, 0); B.rig.root.position.set(0, 0, DIST); B.rig.root.rotation.y = Math.PI;
  W.scene.add(A.rig.root, B.rig.root, A.rig.trail.mesh, B.rig.trail.mesh);
  return { W, A, B };
}
function startVersusLocal(p2) {
  transition(() => {
    const ch = (Math.random() * Math.min(4, Math.floor(S.cleared / 3) + 1)) | 0;
    const { W, A, B } = setupVsScene(ch, myVsProfile(), p2);
    VS = { online: false, W, A, B, clock: 0, intro: 2.2, over: false, endT: 0, ptrs: {}, camPos: new V3(), camLook: new V3() };
    A.rig.setHold('guard', 10); B.rig.setHold('guard', 10);
    vsHUD(A.name, B.name, 'Same tablet · left vs right');
    showHUD('vs-local');
    banner('VERSUS', `${A.name} vs ${B.name}`); sfx.taiko(1); MUSIC.start('fight');
    setMode(VsMode);
  });
}
function startVersusOnline(code, host, me, other) {
  if (LOBBY && LOBBY.hiTimer) clearInterval(LOBBY.hiTimer);
  closeOverlay();
  transition(() => {
    const ch = code.charCodeAt(0) % 4;
    const { W, A, B } = setupVsScene(ch, me, other);
    B.remote = true;
    VS = { online: true, code, host, W, A, B, clock: 0, intro: 2.4, over: false, endT: 0, view: S.view, camPos: new V3(), camLook: new V3(), nextId: 1, again: { me: false, them: false } };
    A.rig.setFP(VS.view === 'fp'); A.rig.setHold(VS.view === 'fp' ? 'fpGuard' : 'guard', 10); B.rig.setHold('guard', 10);
    vsHUD(me.name, other.name, 'Online duel · ' + code);
    showHUD('vs-online');
    $('#viewBtn').textContent = VS.view === 'fp' ? 'Behind view' : 'First person';
    banner('VERSUS', `${me.name} vs ${other.name}`); sfx.taiko(1); MUSIC.start('fight');
    LOBBY = null;
    setMode(VsMode);
  });
}
function vsHUD(a, b, lbl) {
  $('#meName').textContent = a.toUpperCase(); $('#foeName').textContent = b.toUpperCase();
  $('#stageLbl').textContent = lbl;
  dollSVG($('#dollMe'), false); dollSVG($('#dollFoe'), true);
  $('#spWrap').style.visibility = 'hidden'; $('#spFoeWrap').style.visibility = 'hidden';
  OV.draw = drawVsOverlay; OV.trailCol = '255,255,255';
}
function vsUpdateHUD() {
  if (!VS) return;
  const { A, B } = VS;
  setBar('hpMe', A.hp / A.max); setBar('hpFoe', B.hp / B.max);
  const la = {}, lb = {}; for (const k in A.limbs) { la[k] = A.limbs[k] / 80; lb[k] = B.limbs[k] / 80; }
  la.torso = A.hp / A.max; lb.torso = B.hp / B.max;
  dollUpdate($('#dollMe'), la, A.rig.det); dollUpdate($('#dollFoe'), lb, B.rig.det);
}
function endVersus() {
  if (VS && VS.online) { NET.send('bye', {}); NET.close(); }
  VS = null; OV.draw = null; hideHUD();
  $('#spWrap').style.visibility = ''; $('#spFoeWrap').style.visibility = '';
  enterHub();
}

/* ---------- combat rules ---------- */
function vsOpp(f) { return f === VS.A ? VS.B : VS.A; }
function vsStartAttack(f, dir, id) {
  f.state = 'windup'; f.t = 0; f.dir = dir; f.tele = VS_TELE * (f.rig.det.legs ? 1.25 : 1); f.resolved = false; f.atkId = id || 0;
  f.rig.seq.length = 0; f.rig.setHold('wind' + dir, 4.2 / f.tele); sfx.warn();
}
function vsStrikeAnim(f) { f.state = 'strike'; f.t = 0; f.rig.seq.length = 0; f.rig.queue('end' + dir2(f), .16, { ease: easeIn, arc: .3 }); f.lunge = 1; sfx.slash(1.2); }
function dir2(f) { return f.dir; }
function vsStagger(f, dur) { f.state = 'stagger'; f.t = 0; f.dur = dur || 1; f.rig.seq.length = 0; f.rig.setHold('stagger', 10); f.rig.jolt = .6; f.kb = .25; }
function vsCanParry(def, att) { return att.state === 'windup' && att.t >= att.tele * (1 - .55 * def.legsPen); }
function vsParryFX(att) {
  const bp = att.rig.bladePoint(.6);
  FX.sparks(bp, '#fff3b0', 40, 6, .09); FX.glowBurst(bp, '#ffe08c', 1.5);
  sfx.parry(); hitstop(100); slowmo(.4, .35); OV.flash = .3; OV.flashCol = '255,240,200';
  banner('PARRY!');
}
/* resolve an attack landing on def; returns result for the network */
function vsResolve(att, def) {
  const limb = THREAT_LIMB[att.dir], key = limb === 'head' ? 'helm' : limb;
  let dmg = att.dmg * att.dmgMul * rnd(.9, 1.1) * (att.state === 'stagger' ? 1 : 1);
  if (def.state === 'stagger') dmg *= 1.5;
  if (limb === 'head' && def.rig.det.helm) dmg *= 1.3;
  let r = 'hit';
  if (def.blocking) { r = 'block'; dmg *= def.rig.det.armL ? .55 : .3; def.limbs[limb] -= dmg * .35; }
  else def.limbs[limb] -= dmg;
  def.hp = Math.max(0, def.hp - dmg);
  let lost = null;
  if (def.limbs[limb] <= 0 && !def.rig.det[key]) lost = limb;
  return { r, dmg: Math.round(dmg), limb, lost, hp: def.hp };
}
function vsApplyResult(def, res, local) {
  const pt = def.rig.partCenter(res.limb === 'head' ? 'head' : res.limb), s = toScreen(pt);
  if (res.r === 'block') { sfx.clang(); FX.sparks(def.rig.bladePoint(.45), '#d9eeff', 20, 4); ovPop(s.x, s.y - 30, 'BLOCKED', { size: 24, color: '#bfe2ff', stroke: '#0a1a3a' }); }
  else { sfx.hit(); def.rig.hitFlash(1); FX.sparks(pt, '#ffffff', 16, 4); shake(.05); ovPop(s.x, s.y - 20, String(res.dmg), { size: 32 }); if (def === VS.A && VS.online) { OV.vig = .8; OV.vigCol = '255,40,30'; } }
  def.hp = res.hp;
  if (res.lost) vsLoseLimb(def, res.lost, s);
  if (def.hp <= 0 || (def.rig.det.armL && def.rig.det.armR)) vsKO(def);
  vsUpdateHUD();
}
function vsLoseLimb(f, limb, s) {
  const key = limb === 'head' ? 'helm' : limb;
  if (f.rig.det[key]) return;
  f.limbs[limb] = 0;
  const push = new V3(0, 0, f === VS.A ? -2 : 2);
  const g = f.rig.detach(key, VS.W.scene, push);
  if (g) g.traverse(o => { o.visible = true; });
  sfx.chop(); hitstop(90); shake(.07); FX.puff(f.rig.partCenter('torso'), 8, '#ffffff', .5);
  if (s) ovPop(s.x, s.y - 40, pick(['CHOP!', 'POW!', 'SLICE!']), { size: 42, color: '#2a1200', stroke: '#fff6d8', burst: pick(['#ffd23a', '#ff8a3a', '#7fe8ff']), rot: rnd(-.25, .25), life: 1.1, vy: -30 });
  if (limb === 'armR') f.dmgMul = .65;
  if (limb === 'legs') f.legsPen = .8;
  if (limb === 'head') vsStagger(f, 1);
}
function vsKO(loser) {
  if (VS.over) return;
  VS.over = true; VS.endT = 0; VS.loser = loser; VS.winner = vsOpp(loser);
  loser.rig.ko(); VS.winner.rig.setHold('show', 5);
  slowmo(.35, 1); hitstop(140); sfx.win();
  banner(`${VS.winner.name.toUpperCase()} WINS!`);
}
/* a fighter's swipe (local player or a same-tablet player) */
function vsSwipe(f, x0, y0, x1, y1) {
  if (!VS || VS.over || VS.intro > 0) return;
  const o = vsOpp(f);
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len;
  // parry attempt
  if (o.state === 'windup') {
    let aimed = true;
    if (VS.online) { const ring = ringInfo(o.rig); aimed = segDist(ring.x, ring.y, x0, y0, x1, y1) < ring.r * 1.4; }
    if (aimed) {
      if (vsCanParry(f, o)) {
        vsParryFX(o); vsStagger(o, 1.0);
        if (VS.online) NET.send('res', { id: o.atkId, r: 'parry' });
        return;
      } else if (f.state !== 'ready') return;
      else if (!VS.online) { f.state = 'flinch'; f.t = 0; f.rig.jolt = .3; const s = toScreen(f.rig.partCenter('head')); ovPop(s.x, s.y - 40, 'Too early!', { size: 24, color: '#ffb38a' }); return; }
    }
  }
  if (f.state !== 'ready') return;
  const id = VS.online ? VS.nextId++ : 0;
  vsStartAttack(f, swipeDir(ux, uy), id);
  if (VS.online) NET.send('atk', { id, dir: f.dir });
}
function vsNetMessage(d) {
  const { A, B } = VS;
  if (d.type === 'atk' && !VS.over) { if (['R', 'L', 'H', 'Low'].includes(d.dir)) vsStartAttack(B, d.dir, d.id | 0); }
  else if (d.type === 'res') {
    if (d.r === 'parry') { if (A.atkId === (d.id | 0) && (A.state === 'windup' || A.state === 'strike')) { vsParryFX(A); vsStagger(A, 1.0); banner('PARRIED!'); } }
    else if (['hit', 'block'].includes(d.r)) {
      if (d.limbs && typeof d.limbs === 'object') for (const k of ['armL', 'armR', 'legs', 'head']) if (typeof d.limbs[k] === 'number') B.limbs[k] = clamp(d.limbs[k], 0, 80);
      vsApplyResult(B, { r: d.r, dmg: clamp(d.dmg | 0, 0, 200), limb: ['armL', 'armR', 'legs', 'head'].includes(d.limb) ? d.limb : 'head', lost: ['armL', 'armR', 'legs', 'head'].includes(d.lost) ? d.lost : null, hp: clamp(+d.hp, 0, VS_HP) }, false);
    }
  } else if (d.type === 'blk') { B.blocking = !!d.on; if (B.state === 'ready') B.rig.setHold(B.blocking ? 'blockMid' : 'guard', 14); }
  else if (d.type === 'again') { VS.again.them = true; vsMaybeRematch(); }
  else if (d.type === 'bye') { toast('Your friend left the duel.'); }
}
function vsMaybeRematch() {
  if (!VS || !VS.again.me || !VS.again.them) return;
  const code = VS.code, host = VS.host, me = myVsProfile(), other = { name: VS.B.name, outfit: VS.B.outfit, sword: VS.B.sword, lvl: VS.B.lvl };
  closeOverlay(); startVersusOnline(code, host, me, other);
}
function vsFighterUpdate(f, dt) {
  f.t += dt;
  const o = vsOpp(f);
  if (f.state === 'windup' && f.t >= f.tele) vsStrikeAnim(f);
  else if (f.state === 'strike') {
    if (!f.resolved && f.t >= .08) {
      f.resolved = true;
      if (!VS.online) { const res = vsResolve(f, o); vsApplyResult(o, res, true); }
    }
    if (f.t > .35) { f.state = 'recover'; f.t = 0; f.rig.setHold(f === VS.A && VS.online && VS.view === 'fp' ? 'fpGuard' : 'guard', 8); }
  } else if (f.state === 'recover' && f.t > .3) f.state = 'ready';
  else if (f.state === 'stagger' && f.t > f.dur) { f.state = 'ready'; f.rig.setHold(f === VS.A && VS.online && VS.view === 'fp' ? 'fpGuard' : 'guard', 8); }
  else if (f.state === 'flinch' && f.t > .35) f.state = 'ready';
  if (f.state === 'ready' && f.blocking && !f.remote) {
    const bp = o.state === 'windup' ? THREAT_BLOCK[o.dir] : 'blockMid';
    if (f.blockPose !== bp) { f.blockPose = bp; f.rig.setHold(bp, 16); }
  }
  f.lunge = Math.max(0, f.lunge - dt * 2.6); f.kb = Math.max(0, f.kb - dt * 1.2);
}
/* online: an incoming remote strike lands on my fighter, resolved by my device */
function vsRemoteStrikeCheck() {
  const { A, B } = VS;
  if (B.state === 'strike' && !B.resolved && B.t >= .08) {
    B.resolved = true;
    if (VS.over) return;
    const res = vsResolve(B, A);
    NET.send('res', Object.assign({ id: B.atkId, limbs: A.limbs }, res));
    vsApplyResult(A, res, true);
  }
}

const VsMode = {
  name: 'vs',
  update(dt) {
    if (!VS) return;
    const { A, B } = VS;
    VS.clock += dt;
    if (VS.intro > 0) { VS.intro -= dt; if (VS.intro <= 0) { banner('FIGHT!'); sfx.taiko(1.3); } }
    if (!VS.over) {
      vsFighterUpdate(A, dt);
      if (VS.online) { const wasResolved = B.resolved; B.resolved = true; vsFighterUpdate(B, dt); B.resolved = wasResolved; vsRemoteStrikeCheck(); }
      else vsFighterUpdate(B, dt);
    } else {
      VS.endT += dt;
      if (!VS.shown && VS.endT > 2.2) { VS.shown = true; vsResult(); }
    }
    A.rig.root.position.set(0, 0, easeOut(A.lunge) * .5 - A.kb);
    B.rig.root.position.set(0, 0, DIST - easeOut(B.lunge) * .5 + B.kb);
    A.rig.update(dt); B.rig.update(dt);
    // camera
    let pos, look, fov;
    if (VS.online && !VS.over) {
      const P = A.rig; P.root.updateMatrixWorld(true); B.rig.root.updateMatrixWorld(true);
      const eChest = B.rig.chest.localToWorld(new V3(0, .18, 0));
      if (VS.view === 'fp') { pos = P.hips.localToWorld(new V3(0, .68, -.2)); fov = 70; }
      else { pos = P.root.localToWorld(new V3(-1.0, 2.15, -2.05)); fov = 55; }
      look = VS.view === 'fp' ? eChest : P.chest.getWorldPosition(new V3()).lerp(eChest, .8);
    } else {
      const asp = VW / VH, d = 4.4 * Math.max(1, 1.3 / asp);
      const a = VS.over ? -Math.PI / 2 + Math.sin(VS.endT * .4) * .5 : -Math.PI / 2;
      pos = new V3(Math.sin(a) * -d * -1, 1.85, DIST / 2 + Math.cos(a) * d); look = new V3(0, 1.15, DIST / 2); fov = 50;
      if (VS.online && VS.over) { pos = new V3(-3.5, 1.9, DIST / 2 + Math.sin(VS.endT * .4)); }
    }
    VS.camPos.lerp(pos, damp(VS.clock < .1 ? 60 : 12, dt)); VS.camLook.lerp(look, damp(VS.clock < .1 ? 60 : 12, dt));
    CAM.position.copy(VS.camPos); CAM.lookAt(VS.camLook);
    CAM.fov = lerp(CAM.fov, fov, damp(8, dt)); CAM.updateProjectionMatrix(); FX.setScale();
    applyShake(dt);
    hint(VS.intro > 0 || VS.over ? '' : VS.online ? 'Swipe to attack · swipe through the gold ring to parry · hold BLOCK' : 'Left player: left half · Right player: right half · Swipe to attack · hold still to block');
  },
  slash(x0, y0, x1, y1, id) {
    if (!VS) return;
    if (VS.online) { vsSwipe(VS.A, x0, y0, x1, y1); return; }
    const p = VS.ptrs[id]; const f = p ? p.f : (x0 < VW / 2 ? VS.A : VS.B);
    if (p) p.swiped = true;
    if (f.blocking) { f.blocking = false; f.rig.setHold('guard', 9); }
    vsSwipe(f, x0, y0, x1, y1);
  },
  down(x, y, id) {
    if (!VS || VS.online) return;
    const f = x < VW / 2 ? VS.A : VS.B;
    VS.ptrs[id] = { f, t0: performance.now(), swiped: false, timer: setTimeout(() => { const p = VS && VS.ptrs[id]; if (p && !p.swiped && f.state === 'ready') { f.blocking = true; f.blockPose = null; } }, 220) };
  },
  up(id) {
    if (!VS || VS.online) return;
    const p = VS.ptrs[id]; if (!p) return;
    clearTimeout(p.timer); if (p.f.blocking) { p.f.blocking = false; p.f.rig.setHold('guard', 9); }
    delete VS.ptrs[id];
  },
};
function drawVsOverlay(c) {
  if (!VS || VS.over) return;
  for (const f of [VS.A, VS.B]) {
    if (f.state !== 'windup') continue;
    if (VS.online && f === VS.A) continue;
    const ring = ringInfo(f.rig), w0 = f.tele * (1 - .55);
    if (f.t >= w0) drawRing(c, ring.x, ring.y, ring.r * (VS.online ? 1 : .8), Math.max(0, 1 - (f.t - w0) / (f.tele - w0)), '255,214,90', VS.online ? 'SWIPE!' : 'PARRY!');
    else { c.save(); c.globalAlpha = .35; drawRing(c, ring.x, ring.y, ring.r * .7, 0, '255,255,255'); c.restore(); }
  }
  if (!VS.online && VS.intro > 0) {
    c.save(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([12, 12]); c.lineWidth = 3;
    c.beginPath(); c.moveTo(VW / 2, VH * .18); c.lineTo(VW / 2, VH * .9); c.stroke(); c.setLineDash([]);
    c.font = "900 22px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 5;
    for (const [x, t] of [[VW * .25, VS.A.name + ' swipes here'], [VW * .75, VS.B.name + ' swipes here']]) { c.strokeText(t, x, VH * .62); c.fillText(t, x, VH * .62); }
    c.restore();
  }
}
function vsResult() {
  const w = VS.winner, iWon = !VS.online || w === VS.A;
  openOverlay(`<div class="modal ${iWon ? 'win' : ''}">
    <div class="kicker ${iWon || !VS.online ? '' : 'lose'}">${w.name} wins!</div>
    <p class="muted">${VS.online ? (iWon ? 'Great duel. Want a rematch?' : 'So close. Rematch?') : 'What a battle! Swap sides or go again.'}</p>
    <div class="actions">
      <button class="btn primary" data-vsres="again">Rematch</button>
      <button class="btn" data-vsres="home">Back to dojo</button>
    </div></div>`);
}
function vsResultAction(act) {
  if (act === 'again') {
    if (VS.online) { VS.again.me = true; NET.send('again', {}); toast('Waiting for your friend to tap Rematch…'); vsMaybeRematch(); return; }
    const p2 = { name: VS.B.name, outfit: VS.B.outfit, sword: VS.B.sword, lvl: VS.B.lvl };
    closeOverlay(); startVersusLocal(p2); return;
  }
  closeOverlay(); endVersus();
}
