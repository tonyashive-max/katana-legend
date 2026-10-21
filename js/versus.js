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
    state: 'ready', t: 0, dir: 'R', tele: VS_TELE, blocking: false, atkId: 0, dmg: vsDmg(o.sword, o.lvl), dmgMul: 1, legsPen: 1, lunge: 0, kb: 0, resolved: false, pendingRes: null,
    sta: 100, staWait: 0, bad: [], tired: false };
}
function swipeDir(ux, uy) {
  if (Math.abs(uy) > Math.abs(ux) * 1.2) return uy > 0 ? 'H' : 'Low';
  return ux < 0 ? 'R' : 'L';
}

/* ---------- relay (MQTT 3.1.1 over WebSocket, QoS 0) ---------- */
const VS_RELAYS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
class MqttLink {
  constructor(url, topic, onMsg) { this.url = url; this.topic = topic; this.onMsg = onMsg; this.ready = false; this.dead = false; this.buf = new Uint8Array(0); this.pid = 1; this.tries = 0; }
  static str(s) { const b = new TextEncoder().encode(s); return [b.length >> 8, b.length & 255, ...b]; }
  static pkt(type, body) {
    const len = []; let n = body.length;
    do { let x = n % 128; n = Math.floor(n / 128); if (n > 0) x |= 128; len.push(x); } while (n > 0);
    return new Uint8Array([type, ...len, ...body]);
  }
  open() {
    return new Promise((res, rej) => {
      let ws; try { ws = new WebSocket(this.url, ['mqtt']); } catch (e) { rej(e); return; }
      ws.binaryType = 'arraybuffer'; this.ws = ws; this.waitOpen = { res, rej };
      const t = setTimeout(() => { if (!this.ready) { try { ws.close(); } catch (e) { /* */ } rej(new Error('timeout')); } }, 8000);
      ws.onopen = () => {
        const id = 'sk' + Math.random().toString(36).slice(2, 12);
        ws.send(MqttLink.pkt(0x10, [...MqttLink.str('MQTT'), 4, 0x02, 0, 30, ...MqttLink.str(id)]));
      };
      ws.onmessage = e => this.feed(new Uint8Array(e.data));
      ws.onerror = () => {};
      ws.onclose = () => {
        clearTimeout(t); clearInterval(this.ping);
        const was = this.ready; this.ready = false;
        if (this.waitOpen) { this.waitOpen.rej(new Error('closed')); this.waitOpen = null; }
        // phones drop sockets when the screen sleeps or Wi-Fi hiccups: quietly redial
        if (was && !this.dead && this.tries < 20) { this.tries++; setTimeout(() => { if (!this.dead) this.open().catch(() => {}); }, 800); }
      };
    });
  }
  feed(chunk) {
    const b = new Uint8Array(this.buf.length + chunk.length); b.set(this.buf); b.set(chunk, this.buf.length); this.buf = b;
    for (;;) {
      if (this.buf.length < 2) return;
      let mul = 1, len = 0, i = 1, byte;
      do { if (i >= this.buf.length) return; byte = this.buf[i++]; len += (byte & 127) * mul; mul *= 128; } while (byte & 128);
      if (this.buf.length < i + len) return;
      const type = this.buf[0] >> 4, body = this.buf.subarray(i, i + len);
      this.buf = this.buf.slice(i + len);
      this.handle(type, body);
    }
  }
  handle(type, body) {
    if (type === 2) { // CONNACK
      if (body[1] !== 0) { try { this.ws.close(); } catch (e) { /* */ } return; }
      const p = this.pid++;
      this.ws.send(MqttLink.pkt(0x82, [p >> 8, p & 255, ...MqttLink.str(this.topic), 0]));
    } else if (type === 9) { // SUBACK
      this.ready = true; this.tries = 0;
      clearInterval(this.ping); this.ping = setInterval(() => { try { this.ws.send(new Uint8Array([0xC0, 0])); } catch (e) { /* */ } }, 20000);
      if (this.waitOpen) { this.waitOpen.res(); this.waitOpen = null; }
    } else if (type === 3) { // PUBLISH (QoS 0)
      const tl = (body[0] << 8) | body[1];
      try { this.onMsg(new TextDecoder().decode(body.subarray(2 + tl))); } catch (e) { /* */ }
    }
  }
  pub(txt) {
    if (!this.ready) return;
    try { this.ws.send(MqttLink.pkt(0x30, [...MqttLink.str(this.topic), ...new TextEncoder().encode(txt)])); } catch (e) { /* */ }
  }
  close() { this.dead = true; clearInterval(this.ping); try { if (this.ready) this.ws.send(new Uint8Array([0xE0, 0])); this.ws.close(); } catch (e) { /* */ } }
}

/* ---------- networking ---------- */
const NET = {
  kind: null, room: null, handler: null, peersCb: null,
  async openRoom(code) {
    const room = await window.claude.use('room');
    if (!room) throw new Error('Two-device play needs everyone signed in to Claude here. Use the website version for friends without accounts.');
    const r = await room.join('katana-' + code.toLowerCase());
    this.kind = 'room'; this.room = r;
    r.on('vs', msg => { if (msg.sameTab) return; if (this.handler && msg.data && typeof msg.data === 'object') this.handler(msg.data); }, e => this.fail(e.message));
    r.onPeers(ch => { if (this.peersCb) this.peersCb(ch.peers.filter(p => !p.sameTab).length); });
  },
  /* website version: a tiny MQTT-over-WebSocket client talking to free public relays.
     Both devices dial OUT to the relay, so home routers / phone networks can't block it.
     We connect to every relay that answers and send on all of them; duplicates are dropped. */
  links: [], me: '', seq: 0, seen: null, lastHeard: 0,
  async openRelay(code) {
    this.kind = 'relay'; this.me = Math.random().toString(36).slice(2, 10); this.seq = 0; this.seen = new Map(); this.lastHeard = 0;
    this.topic = 'shepkatana/v2/' + code.toLowerCase();
    const urls = window.VS_RELAYS || VS_RELAYS;
    this.links = urls.map(u => new MqttLink(u, this.topic, txt => this.onRelay(txt)));
    const ok = await new Promise(res => {
      let left = this.links.length, done = false;
      const fin = v => { if (!done) { done = true; res(v); } };
      this.links.forEach(l => l.open().then(() => fin(true), () => { if (--left === 0) fin(false); }));
      setTimeout(() => fin(this.links.some(l => l.ready)), 9000);
    });
    if (!ok) { this.close(); throw new Error('Could not reach the game relay. Check that this device is online (try opening another website), then try again.'); }
  },
  onRelay(txt) {
    let m; try { m = JSON.parse(txt); } catch (e) { return; }
    if (!m || m.f === this.me || typeof m.s !== 'number' || !m.d) return;
    const last = this.seen.get(m.f);
    if (last && last.has(m.s)) return;
    const set = last || new Set(); set.add(m.s); if (set.size > 400) set.delete(set.values().next().value); this.seen.set(m.f, set);
    this.lastHeard = performance.now();
    if (this.handler && typeof m.d === 'object') this.handler(m.d);
  },
  send(type, data) {
    const msg = Object.assign({ type }, data || {});
    try {
      if (this.kind === 'room' && this.room) this.room.emit('vs', msg).catch(() => {});
      else if (this.kind === 'relay') { const txt = JSON.stringify({ f: this.me, s: ++this.seq, d: msg }); this.links.forEach(l => l.pub(txt)); }
    } catch (e) { /* dropped */ }
  },
  fail(msg) { if (VS && VS.online) { toast(msg || 'Connection lost'); } },
  close() {
    try { if (this.room) this.room.leave(); } catch (e) { /* */ }
    this.links.forEach(l => l.close()); this.links = [];
    this.kind = null; this.room = null; this.handler = null; this.peersCb = null;
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
    if (IN_CLAUDE) await NET.openRoom(code); else await NET.openRelay(code);
    LOBBY.status = 'Waiting for your friend to join…'; renderLobby();
    lobbyWire();
  } catch (e) { LOBBY.status = e.message; LOBBY.error = true; renderLobby(); }
}
async function vsJoin(code) {
  LOBBY = { code, host: false, other: null, status: 'Connecting…' };
  renderLobby();
  try {
    if (IN_CLAUDE) await NET.openRoom(code); else await NET.openRelay(code);
    LOBBY.status = 'Looking for the host…'; renderLobby();
    lobbyWire();
    const mine = LOBBY;
    setTimeout(() => { if (LOBBY === mine && !LOBBY.other) { LOBBY.status = 'No game found with code ' + code + ' yet. Check the host screen says “Waiting for your friend” with the same code. Still trying…'; LOBBY.error = true; renderLobby(); } }, 12000);
  } catch (e) { LOBBY.status = e.message; LOBBY.error = true; renderLobby(); }
}
function lobbyWire() {
  const me = myVsProfile();
  NET.handler = d => {
    if (d.type === 'hi' && LOBBY && !LOBBY.other) {
      LOBBY.other = { name: String(d.name || 'Friend').slice(0, 14), outfit: OUTFITS.some(o => o.id === d.outfit) ? d.outfit : 'ronin', sword: SWORDS.some(s => s.id === d.sword) ? d.sword : 'iron', lvl: clamp(+d.lvl || 0, 0, 10) };
      NET.send('hi', me);
      LOBBY.error = false; LOBBY.status = `${LOBBY.other.name} joined! Get ready…`; renderLobby(); sfx.up();
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
    const ch = (Math.random() * Math.min(NL, currentChapter() + 1)) | 0;
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
    const ch = code.charCodeAt(0) % NL;
    const { W, A, B } = setupVsScene(ch, me, other);
    B.remote = true;
    VS = { online: true, code, host, W, A, B, clock: 0, intro: 2.4, over: false, endT: 0, view: S.view, camPos: new V3(), camLook: new V3(), nextId: 1, again: { me: false, them: false } };
    A.rig.setFP(VS.view === 'fp'); A.rig.setHold(VS.view === 'fp' ? 'fpGuard' : 'guard', 10); B.rig.setHold('guard', 10);
    vsHUD(me.name, other.name, 'Online duel · ' + code);
    showHUD('vs-online');
    $('#viewBtn').textContent = VS.view === 'fp' ? 'Behind view' : 'First person';
    banner('VERSUS', `${me.name} vs ${other.name}`); sfx.taiko(1); MUSIC.start('fight');
    LOBBY = null;
    // heartbeat so a dropped connection is noticed instead of a frozen opponent
    clearInterval(NET.beat); NET.lastHeard = performance.now(); let warned = false;
    NET.beat = setInterval(() => {
      if (!VS || !VS.online) { clearInterval(NET.beat); return; }
      NET.send('png', {});
      const quiet = performance.now() - NET.lastHeard;
      if (NET.kind === 'relay' && quiet > 9000 && !warned && !VS.over) { warned = true; toast('Lost touch with your friend… waiting for them to come back.'); }
      if (quiet < 3000) warned = false;
    }, 2000);
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
  if (VS && VS.online) { clearInterval(NET.beat); NET.send('bye', {}); NET.close(); }
  VS = null; OV.draw = null; hideHUD();
  $('#spWrap').style.visibility = ''; $('#spFoeWrap').style.visibility = '';
  enterHub();
}

/* ---------- combat rules ---------- */
function vsOpp(f) { return f === VS.A ? VS.B : VS.A; }
const VS_ATK_COST = 22, VS_PARRY_COST = 10;
function vsSpend(f, n) { f.sta = Math.max(0, f.sta - n); f.staWait = .55; }
function vsPop(f, text, col) { const s = toScreen(f.rig.partCenter('head')); ovPop(s.x, s.y - 50, text, { size: 26, color: col || '#ffd27a' }); }
/* swinging wildly throws you off balance: a short stagger that leaves you open */
function vsOffBalance(f) { vsStagger(f, .6); f.bad.length = 0; vsPop(f, 'OFF BALANCE!', '#ff9a7a'); }
/* hitting a held block knocks the attacker back, open for a counter */
function vsBounce(att) { if (VS.over) return; vsStagger(att, .65); vsSpend(att, 12); vsPop(att, 'BOUNCED!', '#bfe2ff'); }
function vsStartAttack(f, dir, id, tired) {
  f.state = 'windup'; f.t = 0; f.dir = dir; f.tired = !!tired; f.tele = VS_TELE * (f.rig.det.legs ? 1.25 : 1) * (tired ? 1.6 : 1); f.resolved = false; f.atkId = id || 0;
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
  let dmg = att.dmg * att.dmgMul * rnd(.9, 1.1) * (att.tired ? .4 : 1);
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
  const o = vsOpp(f), now = VS.clock;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len;
  const free = f.state === 'ready' || f.state === 'recover';
  // parry attempt: only when you're not mid-swing yourself, and it costs breath
  if (o.state === 'windup' && free) {
    let aimed = true;
    if (VS.online) { const ring = ringInfo(o.rig); aimed = segDist(ring.x, ring.y, x0, y0, x1, y1) < ring.r * 1.4; }
    if (aimed) {
      if (f.sta < VS_PARRY_COST) { vsPop(f, 'Out of breath!'); return; }
      vsSpend(f, VS_PARRY_COST);
      if (vsCanParry(f, o)) {
        vsParryFX(o); vsStagger(o, 1.0); f.state = 'ready';
        if (VS.online) NET.send('res', { id: o.atkId, r: 'parry' });
        return;
      }
      f.state = 'flinch'; f.t = 0; f.rig.jolt = .3; vsPop(f, 'Too early!', '#ffb38a'); return;
    }
  }
  if (f.state !== 'ready') {
    // swiping while busy: twice in a row and you lose your footing
    f.bad = f.bad.filter(t => now - t < 1.2); f.bad.push(now);
    if (f.bad.length >= 2 && (f.state === 'windup' || f.state === 'recover' || f.state === 'strike')) vsOffBalance(f);
    return;
  }
  const tired = f.sta < VS_ATK_COST;
  if (tired) vsPop(f, 'Out of breath!');
  vsSpend(f, VS_ATK_COST);
  const id = VS.online ? VS.nextId++ : 0;
  vsStartAttack(f, swipeDir(ux, uy), id, tired);
  if (VS.online) NET.send('atk', { id, dir: f.dir, tired });
}
function vsNetMessage(d) {
  const { A, B } = VS;
  if (d.type === 'atk' && !VS.over) { if (['R', 'L', 'H', 'Low'].includes(d.dir)) vsStartAttack(B, d.dir, d.id | 0, !!d.tired); }
  else if (d.type === 'res') {
    if (d.r === 'parry') { if (A.atkId === (d.id | 0) && (A.state === 'windup' || A.state === 'strike')) { vsParryFX(A); vsStagger(A, 1.0); banner('PARRIED!'); } }
    else if (['hit', 'block'].includes(d.r)) {
      if (d.limbs && typeof d.limbs === 'object') for (const k of ['armL', 'armR', 'legs', 'head']) if (typeof d.limbs[k] === 'number') B.limbs[k] = clamp(d.limbs[k], 0, 80);
      vsApplyResult(B, { r: d.r, dmg: clamp(d.dmg | 0, 0, 200), limb: ['armL', 'armR', 'legs', 'head'].includes(d.limb) ? d.limb : 'head', lost: ['armL', 'armR', 'legs', 'head'].includes(d.lost) ? d.lost : null, hp: clamp(+d.hp, 0, VS_HP) }, false);
      if (d.r === 'block') vsBounce(A);
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
      if (!VS.online) { const res = vsResolve(f, o); vsApplyResult(o, res, true); if (res.r === 'block') vsBounce(f); }
    }
    if (f.t > .35) { f.state = 'recover'; f.t = 0; f.rig.setHold(f === VS.A && VS.online && VS.view === 'fp' ? 'fpGuard' : 'guard', 8); }
  } else if (f.state === 'recover' && f.t > .3) f.state = 'ready';
  else if (f.state === 'stagger' && f.t > f.dur) { f.state = 'ready'; f.rig.setHold(f === VS.A && VS.online && VS.view === 'fp' ? 'fpGuard' : 'guard', 8); }
  else if (f.state === 'flinch' && f.t > .35) f.state = 'ready';
  if (f.state === 'ready' && f.blocking && !f.remote) {
    const bp = o.state === 'windup' ? THREAT_BLOCK[o.dir] : 'blockMid';
    if (f.blockPose !== bp) { f.blockPose = bp; f.rig.setHold(bp, 16); }
  }
  if (f.staWait > 0) f.staWait -= dt; else f.sta = Math.min(100, f.sta + 30 * dt * (f.blocking ? .5 : 1));
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
    if (res.r === 'block') vsBounce(B);
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
    hint(VS.intro > 0 || VS.over ? '' : VS.online ? 'One swipe per touch · Swipe through the gold ring to parry · Hold BLOCK: blocks bounce attackers!' : 'Left player: left half · Right player: right half · One swipe per touch · Hold still to block: blocks bounce attackers!');
  },
  slash(x0, y0, x1, y1, id) {
    if (!VS) return;
    // one move per touch: lift your finger to make the next one
    VS.acted = VS.acted || {}; if (VS.acted[id]) return; VS.acted[id] = true;
    if (VS.online) { vsSwipe(VS.A, x0, y0, x1, y1); return; }
    const p = VS.ptrs[id]; const f = p ? p.f : (x0 < VW / 2 ? VS.A : VS.B);
    if (p) p.swiped = true;
    if (f.blocking) { f.blocking = false; f.rig.setHold('guard', 9); }
    vsSwipe(f, x0, y0, x1, y1);
  },
  down(x, y, id) {
    if (!VS) return;
    VS.acted = VS.acted || {}; VS.acted[id] = false;
    if (VS.online) return;
    const f = x < VW / 2 ? VS.A : VS.B;
    VS.ptrs[id] = { f, t0: performance.now(), swiped: false, timer: setTimeout(() => { const p = VS && VS.ptrs[id]; if (p && !p.swiped && f.state === 'ready') { f.blocking = true; f.blockPose = null; } }, 220) };
  },
  up(id) {
    if (!VS) return;
    if (VS.acted) delete VS.acted[id];
    if (VS.online) return;
    const p = VS.ptrs[id]; if (!p) return;
    clearTimeout(p.timer); if (p.f.blocking) { p.f.blocking = false; p.f.rig.setHold('guard', 9); }
    delete VS.ptrs[id];
  },
};
function drawVsOverlay(c) {
  if (!VS || VS.over) return;
  // breath bars under each fighter
  for (const f of [VS.A, VS.B]) {
    if (VS.online && f === VS.B) continue;
    const p = toScreen(f.rig.root.position.clone().add(new V3(0, -.05, 0))), w = 90, x = p.x - w / 2, y = Math.min(VH - 30, p.y + 14);
    c.save(); c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - 2, y - 2, w + 4, 10);
    c.fillStyle = f.sta < VS_ATK_COST ? '#ff8a5a' : '#ffd84a'; c.fillRect(x, y, w * f.sta / 100, 6); c.restore();
  }
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
