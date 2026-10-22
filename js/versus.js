'use strict';
/* ===== Versus: same-tablet split controls, or two devices online ===== */

let VS = null;
const VS_HP = 160, VS_TELE = .5;
const VS_BUILD = (document.currentScript && (document.currentScript.src.match(/[?&]v=(\d+)/) || [])[1]) || 'dev';
const IN_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');

/* a duelist built from a profile: training, armor and blade decide the numbers */
function makeFighter(p) {
  const st = duelStats(p);
  const rig = new Samurai(lookFromOutfit(outfitDef(p.outfit)), swordDef(p.sword.id), {});
  rig.root.rotation.order = 'YXZ';
  return { rig, prof: p, pid: p.pid, name: p.name, outfit: p.outfit, sword: p.sword.id, hp: st.hp, max: st.hp,
    limbs: { armL: st.hp * .5, armR: st.hp * .5, legs: st.hp * .5, head: st.hp * .44 }, limbMax: st.hp * .5,
    state: 'ready', t: 0, dir: 'R', tele: st.tele, teleBase: st.tele, blocking: false, atkId: 0, dmg: st.dmg, dmgMul: 1, legsPen: 1, lunge: 0, kb: 0, resolved: false,
    pass: st.pass, parryWin: st.parryWin, regen: st.regen, atkCost: st.atkCost, stepCost: st.stepCost, stepCdMax: st.stepCd, crit: st.crit,
    sta: 100, staWait: 0, bad: [], tired: false, lx: 0, px: 0, aim: 0, stepCd: 0, lean: 0 };
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
      ws.onmessage = e => { this.lastRx = performance.now(); this.feed(new Uint8Array(e.data)); };
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
      const tl = (body[0] << 8) | body[1], topic = new TextDecoder().decode(body.subarray(2, 2 + tl));
      try { this.onMsg(new TextDecoder().decode(body.subarray(2 + tl)), topic); } catch (e) { /* */ }
    }
  }
  /* after switching apps the socket can be silently dead: poke it, and redial if nothing comes back */
  check() {
    if (this.dead) return;
    if (!this.ready) { if (!this.waitOpen) { this.tries = 0; this.open().catch(() => {}); } return; }
    const t0 = this.lastRx || 0;
    try { this.ws.send(new Uint8Array([0xC0, 0])); } catch (e) { /* */ }
    setTimeout(() => { if (!this.dead && this.ready && (this.lastRx || 0) === t0) { try { this.ws.close(); } catch (e) { /* */ } } }, 2500);
  }
  pub(txt, retain, topic) {
    if (!this.ready) return false;
    try { this.ws.send(MqttLink.pkt(retain ? 0x31 : 0x30, [...MqttLink.str(topic || this.topic), ...new TextEncoder().encode(txt)])); return true; } catch (e) { return false; }
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
  wake() { if (this.kind === 'relay') this.links.forEach(l => l.check()); },
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
    if (this.handler && typeof m.d === 'object') this.handler(m.d, m.f);
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

/* ---------- lobby (online) ---------- */
let LOBBY = null;
function ssGet(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function ssSet(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
function vsInviteURL(code) { return location.origin + location.pathname + '?join=' + code; }
async function vsShare() {
  if (!LOBBY) return;
  const url = vsInviteURL(LOBBY.code), text = `Duel me in Shep's Katana Legend! Tap the link, or open the game → Versus → Join → code ${LOBBY.code}`;
  try { if (navigator.share) { await navigator.share({ title: "Katana duel", text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + '\n' + url); toast('Invite copied! Paste it in a text.'); } catch (e) { toast('Tell your friend the code: ' + LOBBY.code); }
}
/* tapping an invite link joins straight away; a host whose page got reloaded picks the same code back up */
function vsBootLinks() {
  try {
    const q = new URLSearchParams(location.search), j = (q.get('join') || '').toUpperCase();
    if (j) { history.replaceState(null, '', location.pathname); hideTitle(); if (/^[A-Z2-9]{4}$/.test(j) && !IN_CLAUDE) { vsJoin(j); return; } }
    const h = ssGet('vsHost');
    if (h && h.code && Date.now() - h.t < 15 * 60e3 && !IN_CLAUDE) vsHost(h.code, h.opts);
  } catch (e) { /* */ }
}
/* opts: { mode: 'challenge', cid, reserve: rival pid } for a challenge; nothing for an arcade duel */
async function vsHost(resume, opts) {
  opts = opts || {};
  const code = resume || newCode();
  if (!IN_CLAUDE) ssSet('vsHost', { code, t: Date.now(), opts });
  LOBBY = { code, host: true, other: null, status: 'Opening a game…', mode: opts.mode || 'arcade', cid: opts.cid || null, reserve: opts.reserve || null, rname: opts.rname || null, land: (Math.random() * NL) | 0 };
  renderLobby();
  try {
    if (IN_CLAUDE) await NET.openRoom(code); else await NET.openRelay(code);
    if (!LOBBY || LOBBY.code !== code) return;
    LOBBY.status = LOBBY.mode === 'challenge' ? `The dueling ground is open. Waiting for ${esc(LOBBY.rname || 'your rival')}…` : resume ? 'Back! Still waiting for your friend…' : 'Waiting for your friend to join…';
    renderLobby();
    lobbyWire();
    if (opts.onOpen) opts.onOpen(code);
  } catch (e) { if (LOBBY) { LOBBY.status = e.message; LOBBY.error = true; renderLobby(); } }
}
async function vsJoin(code) {
  LOBBY = { code, host: false, other: null, status: 'Connecting…' };
  renderLobby();
  try {
    if (IN_CLAUDE) await NET.openRoom(code); else await NET.openRelay(code);
    if (!LOBBY || LOBBY.code !== code) return;
    LOBBY.status = 'Looking for the host…'; renderLobby();
    lobbyWire();
    const mine = LOBBY;
    setTimeout(() => { if (LOBBY === mine && !LOBBY.other && !LOBBY.dead) { LOBBY.status = 'No game found with code ' + code + ' yet. Check the host screen says “Waiting” with the same code. Still trying…'; LOBBY.error = true; renderLobby(); } }, 12000);
  } catch (e) { if (LOBBY) { LOBBY.status = e.message; LOBBY.error = true; renderLobby(); } }
}
function myHello() {
  const L = LOBBY;
  return Object.assign(myIdent(), { v: VS_BUILD, host: !!L.host, mode: L.mode || 'arcade', cid: L.cid || null, wager: wagerBlades().length > 0, land: L.host ? L.land : undefined, lock: L.host && L.other ? L.other.pid : undefined });
}
function cleanHello(d) { return { pid: String(d.pid || '').slice(0, 8), name: String(d.name || 'Friend').slice(0, 14), seal: cleanSeal(d.seal), wager: !!d.wager }; }
function lobbyWire() {
  NET.handler = (d, from) => {
    if (VS && VS.online) {
      if (d.type === 'hi') { if (VS.host && (!from || from !== NET.peer)) NET.send('full', { to: d.pid }); return; }
      if (d.type === 'full') return;
      if (NET.peer && from && from !== NET.peer) return; // someone else on this code: ignore them
      vsNetMessage(d); return;
    }
    const L = LOBBY; if (!L || L.dead) return;
    if (d.type === 'full') {
      if (d.to === S.pid && !L.other) { L.dead = true; L.error = true; L.status = d.rsv ? 'This dueling ground is reserved for a challenge between two other samurai.' : 'That game is full: two samurai are already dueling there. Ask your friend for a new code.'; clearInterval(L.hiTimer); renderLobby(); }
      return;
    }
    if (d.type === 'hi') {
      if (L.other) { // already paired: answer our partner (they may have missed us), turn everyone else away
        if (!from || from === NET.peer) { if (!L.started) NET.send('hi', myHello()); }
        else if (L.host) NET.send('full', { to: d.pid });
        return;
      }
      if (d.v && d.v !== VS_BUILD && VS_BUILD !== 'dev') {
        NET.send('hi', myHello());
        L.status = 'Found your friend, but your two games are different versions. Close the game on BOTH devices, open it again, and try a new code.'; L.error = true; renderLobby(); return;
      }
      if (!L.host && !d.host) return; // two joiners hearing each other
      if (!L.host && d.lock && d.lock !== S.pid) { L.dead = true; L.error = true; L.status = 'That game is full: two samurai are already dueling there.'; clearInterval(L.hiTimer); renderLobby(); return; }
      if (L.host && L.reserve && d.pid !== L.reserve) { NET.send('full', { to: d.pid, rsv: 1 }); return; }
      L.other = cleanHello(d); NET.peer = from || null;
      if (!L.host) { L.mode = d.mode === 'challenge' ? 'challenge' : 'arcade'; L.cid = d.cid ? String(d.cid).slice(0, 12) : null; L.land = clamp(d.land | 0, 0, NL - 1); }
      NET.send('hi', myHello());
      addRival(L.other);
      clearInterval(L.hiTimer);
      L.error = false; L.status = `${esc(L.other.name)} is here! Choose your armor and blade…`; renderLobby(); sfx.up();
      setTimeout(() => { if (LOBBY === L && !L.dead) vsLoadoutOnline(); }, 1200);
      return;
    }
    if (NET.peer && from && from !== NET.peer) return;
    if (d.type === 'pick') { L.theirPick = cleanProfile(d.p); if (L.myPick) renderLobbyWait(); vsMaybeGo(); }
    else if (d.type === 'go') { if (!L.host && L.myPick) { if (!L.theirPick && d.p) L.theirPick = cleanProfile(d.p); if (L.theirPick) { L.land = clamp(d.land | 0, 0, NL - 1); startVersusOnline(); } } }
    else if (d.type === 'bye') { L.dead = true; L.error = true; L.status = `${esc(L.other ? L.other.name : 'Your friend')} left.`; LOADOUT = null; renderLobby(); }
  };
  NET.peersCb = n => { if (n > 0 && LOBBY && !LOBBY.other) NET.send('hi', myHello()); };
  NET.send('hi', myHello());
  LOBBY.hiTimer = setInterval(() => { if (LOBBY && !LOBBY.other && !LOBBY.dead) NET.send('hi', myHello()); else clearInterval(LOBBY && LOBBY.hiTimer); }, 1500);
}
function vsLoadoutOnline() {
  const L = LOBBY, o = L.other, chal = L.mode === 'challenge';
  const rule = !chal ? 'any' : (wagerBlades().length && o.wager ? 'wager' : 'bokken');
  L.rule = rule;
  openLoadout({
    title: chal ? `Challenge with ${o.name}` : `Duel with ${o.name}`, sub: chal ? 'Blades at stake · best of 3' : 'Arcade duel · best of 3', rule,
    bokkenWhy: wagerBlades().length ? `${o.name} has no forged or won blade to wager yet, so this is an honor duel: both fight with bokkens and no blade changes hands.` : 'You have no forged or won blade to wager yet, so this is an honor duel: both fight with bokkens and no blade changes hands. Forge a blade to fight for real!',
    cancel: () => { NET.send('bye', {}); cancelLobby(); },
    onPick: (outfit, u) => {
      if (LOBBY !== L || L.dead) return;
      L.myPick = myDuelProfile(outfit, u, rule === 'bokken');
      NET.send('pick', { p: L.myPick });
      clearInterval(L.pickTimer); L.pickTimer = setInterval(() => { if (LOBBY === L && !L.started) NET.send('pick', { p: L.myPick }); else clearInterval(L.pickTimer); }, 2000);
      renderLobbyWait(); vsMaybeGo();
    },
  });
}
function renderLobbyWait() {
  const L = LOBBY; if (!L || !L.myPick) return;
  openOverlay(`<div class="modal"><div class="eyebrow">${L.mode === 'challenge' ? 'Challenge' : 'Arcade duel'}</div>
    <h2>${L.theirPick ? 'Both samurai are ready!' : `Waiting for ${esc(L.other.name)}…`}</h2>
    <p class="muted">${L.theirPick ? 'Entering the dueling ground…' : `${esc(L.other.name)} is choosing armor and a blade.`}</p>
    <div class="actions"><button class="btn" data-vs="cancel">Cancel</button></div></div>`);
}
function vsMaybeGo() {
  const L = LOBBY;
  if (!L || !L.host || !L.myPick || !L.theirPick || L.started) return;
  NET.send('go', { land: L.land });
  startVersusOnline();
}
function renderLobby() {
  if (!LOBBY) return;
  const L = LOBBY, chal = L.mode === 'challenge' && L.host;
  openOverlay(`<div class="modal">
    <div class="eyebrow">${chal ? 'Challenge · dueling ground' : 'Two-device duel'}</div>
    <h2>${L.host ? 'Your game code' : 'Joining game'}</h2>
    <div class="code">${L.code}</div>
    <p class="${L.error ? '' : 'muted'}" style="${L.error ? 'color:#ffb4a8' : ''}">${L.status}</p>
    ${L.host && !L.error && !L.other ? `<p class="muted" style="font-size:14px">${IN_CLAUDE ? 'On the other device, open this same game in Claude' : chal ? `${esc(L.rname || 'Your rival')} gets a scroll with this code. You can also tap <b>Share invite</b> to text them` : 'Tap <b>Share invite</b> to text a link, or on the other device open this game website'}, tap Versus → Join, and type <b>${L.code}</b>.</p>` : ''}
    <div class="actions"><button class="btn" data-vs="cancel">${L.dead ? 'Close' : 'Cancel'}</button>${L.host && !IN_CLAUDE && !L.other ? '<button class="btn primary" data-vs="share">Share invite</button>' : ''}</div>
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
  ssSet('vsHost', null);
  if (LOBBY) { clearInterval(LOBBY.hiTimer); clearInterval(LOBBY.pickTimer); }
  LOBBY = null; JOINPAD = null; LOADOUT = null; NET.close(); NET.peer = null; closeOverlay();
}

/* ---------- match setup ---------- */
const VS_SHOW_SECS = 8;
function vsBuild(c) {
  clearSceneActors();
  const W = buildWorld(c.land); activateWorld(W);
  VS = Object.assign({ W, clock: 0, intro: 0, over: true, phase: 'show', showT: VS_SHOW_SECS, round: 1, wins: { A: 0, B: 0 }, endT: 0, ptrs: {}, acted: {},
    camPos: new V3(), camLook: new V3(), nextId: 1, again: { me: false, them: false }, view: S.view, debris: [] }, c);
  vsSpawn();
  vsHUD(VS.A.name, VS.B.name, '');
  showHUD(VS.online ? 'vs-online' : 'vs-local');
  $('#hud').classList.add('vs-show');
  if (VS.online) $('#viewBtn').textContent = VS.view === 'fp' ? 'Behind view' : 'First person';
  renderShowcase(VS.profA, VS.profB, VS.mode, VS.land, VS_SHOW_SECS);
  vsLabel();
  sfx.taiko(1); MUSIC.start('fight');
  setMode(VsMode);
}
function vsSpawn() {
  const sc = VS.W.scene;
  for (const f of [VS.A, VS.B]) if (f) { sc.remove(f.rig.root, f.rig.trail.mesh); if (f.rig.swordDropped && f.rig.sword.parent) sc.remove(f.rig.sword.parent); }
  VS.debris.forEach(g => sc.remove(g)); VS.debris.length = 0;
  const A = makeFighter(VS.profA), B = makeFighter(VS.profB);
  A.rig.root.position.set(0, 0, 0); B.rig.root.position.set(0, 0, DIST); B.rig.root.rotation.y = Math.PI;
  sc.add(A.rig.root, B.rig.root, A.rig.trail.mesh, B.rig.trail.mesh);
  if (VS.online) B.remote = true;
  VS.A = A; VS.B = B;
}
function startVersusLocal(p1, p2) {
  transition(() => vsBuild({ online: false, mode: 'arcade', land: (Math.random() * NL) | 0, profA: p1, profB: p2 }), true);
}
function startVersusOnline() {
  const L = LOBBY; if (!L || L.started) return;
  L.started = true;
  ssSet('vsHost', null);
  clearInterval(L.hiTimer); clearInterval(L.pickTimer);
  LOBBY = null; LOADOUT = null; closeOverlay();
  transition(() => {
    vsBuild({ online: true, code: L.code, host: L.host, mode: L.mode || 'arcade', cid: L.cid, land: L.land, profA: L.myPick, profB: L.theirPick });
    // heartbeat so a dropped connection is noticed instead of a frozen opponent
    clearInterval(NET.beat); NET.lastHeard = performance.now(); let warned = false;
    NET.beat = setInterval(() => {
      if (!VS || !VS.online) { clearInterval(NET.beat); return; }
      NET.send('png', {});
      const quiet = performance.now() - NET.lastHeard;
      if (NET.kind === 'relay' && quiet > 9000 && !warned && VS.phase !== 'done' && VS.phase !== 'cere') { warned = true; toast('Lost touch with your friend… waiting for them to come back.'); }
      if (quiet < 3000) warned = false;
      // a challenge that loses its connection for good is called off: nobody loses a blade to a dead battery
      if (NET.kind === 'relay' && quiet > 45000 && VS.mode === 'challenge' && !VS.decided) { clearInterval(NET.beat); vsInterrupted(); }
    }, 2000);
  }, true);
}
function vsInterrupted() {
  if (!VS) return;
  VS.over = true; VS.phase = 'void';
  openOverlay(`<div class="modal"><div class="kicker lose">Duel interrupted</div><p class="muted">The connection to ${esc(VS.B.name)} was lost before the duel was decided. No blades changed hands. Send a new challenge to try again.</p>
    <div class="actions"><button class="btn primary" data-vsres="home">Back to dojo</button></div></div>`);
}
function vsHUD(a, b, lbl) {
  $('#meName').textContent = a.toUpperCase(); $('#foeName').textContent = b.toUpperCase();
  $('#stageLbl').textContent = lbl;
  dollSVG($('#dollMe'), false); dollSVG($('#dollFoe'), true);
  $('#spWrap').style.visibility = 'hidden'; $('#spFoeWrap').style.visibility = 'hidden';
  OV.draw = drawVsOverlay; OV.trailCol = '255,255,255';
}
function vsLabel() {
  if (!VS) return;
  const pips = n => '●'.repeat(n) + '○'.repeat(2 - n);
  const kind = VS.mode === 'challenge' ? 'Challenge' : VS.online ? 'Online duel' : 'Same tablet';
  $('#stageLbl').textContent = `${kind} · Round ${Math.min(3, VS.round)} · ${pips(VS.wins.A)} – ${pips(VS.wins.B)}`;
}
function vsUpdateHUD() {
  if (!VS) return;
  const { A, B } = VS;
  setBar('hpMe', A.hp / A.max); setBar('hpFoe', B.hp / B.max);
  const la = {}, lb = {}; for (const k in A.limbs) { la[k] = A.limbs[k] / A.limbMax; lb[k] = B.limbs[k] / B.limbMax; }
  la.torso = A.hp / A.max; lb.torso = B.hp / B.max;
  dollUpdate($('#dollMe'), la, A.rig.det); dollUpdate($('#dollFoe'), lb, B.rig.det);
}
function endVersus() {
  if (VS && VS.online) { clearInterval(NET.beat); NET.send('bye', {}); NET.close(); NET.peer = null; }
  if (VS && VS.cere) cereEnd();
  VS = null; OV.draw = null; hideHUD(); hideShowcase(); $('#hud').classList.remove('vs-show');
  $('#spWrap').style.visibility = ''; $('#spFoeWrap').style.visibility = '';
  enterHub();
}
/* leaving a challenge before it is decided forfeits your blade */
function vsLeaveNeedsForfeit() { return VS && VS.mode === 'challenge' && VS.online && !VS.decided && ['show', 'fight', 'between'].includes(VS.phase); }
function vsForfeit() {
  if (!vsLeaveNeedsForfeit()) { endVersus(); return; }
  NET.send('forfeit', {});
  VS.winner = VS.B; VS.loser = VS.A; duelDecided(true);
  setTimeout(endVersus, 250);
}

/* ---------- rounds ---------- */
function vsBeginRound(first) {
  transition(() => {
    if (!VS) return;
    if (!first) vsSpawn();
    hideShowcase(); $('#hud').classList.remove('vs-show');
    const { A, B } = VS;
    A.rig.setFP(VS.online && VS.view === 'fp'); A.rig.setHold(VS.online && VS.view === 'fp' ? 'fpGuard' : 'guard', 10); B.rig.setHold('guard', 10);
    VS.phase = 'fight'; VS.over = false; VS.intro = 2.0; VS.acted = {}; VS.ptrs = {}; VS.clock = 0;
    if (VS.online) { A.blocking = false; $('#blockBtn').classList.remove('on'); }
    banner(VS.round === 3 ? 'FINAL ROUND' : `ROUND ${VS.round}`, `${VS.A.name} ${VS.wins.A} – ${VS.wins.B} ${VS.B.name}`); sfx.taiko(1.2);
    vsUpdateHUD(); vsLabel();
  }, true);
}
function vsNextRound() { if (!VS || VS.phase !== 'between') return; VS.phase = 'loading'; VS.round++; VS.pendingRound = 0; vsBeginRound(false); }

/* ---------- combat rules ---------- */
function vsOpp(f) { return f === VS.A ? VS.B : VS.A; }
const VS_ATK_COST = 22, VS_PARRY_COST = 10;
function vsSend(type, data) { NET.send(type, Object.assign({ rd: VS.round }, data || {})); }
function vsSpend(f, n) { f.sta = Math.max(0, f.sta - n); f.staWait = .55; }
function vsPop(f, text, col) { const s = f === VS.A && VS.online ? { x: VW / 2, y: VH * .58 } : toScreen(f.rig.partCenter('head')); ovPop(s.x, s.y - 50, text, { size: 26, color: col || '#ffd27a' }); }
/* ---------- footwork: three spots to stand in, step late and they miss ---------- */
const VS_LANE = .85, VS_STEP_COST = 12, VS_STEP_CD = .3;
function vsLaneX(f, lanes) { return (f === VS.A ? -1 : 1) * lanes * VS_LANE; }
function vsLockAt(att) { const def = vsOpp(att); return 1 - def.parryWin * def.legsPen; } // aim locks when the defender's gold ring appears
function vsStep(f, d) {
  if (!VS || VS.over || VS.intro > 0 || !f) return false;
  if (f.state !== 'ready' && f.state !== 'recover') return false;
  if (f.stepCd > 0) return false;
  const nl = f.lx + d;
  if (Math.abs(nl) > 1) { vsPop(f, 'Edge!', '#c9c2b0'); return false; }
  const cost = f.stepCost * (f.rig.det.legs ? 1.6 : 1);
  if (f.sta < cost) { vsPop(f, 'Out of breath!'); return false; }
  vsSpend(f, cost); f.staWait = .3;
  f.lx = nl; f.stepCd = f.stepCdMax * (f.rig.det.legs ? 1.7 : 1); f.lean = d;
  sfx.whoosh(); FX.puff(f.rig.root.position.clone().add(new V3(0, .08, 0)), 5, '#e8dcc4', .35);
  if (VS.online && f === VS.A) vsSend('step', { lx: nl });
  return true;
}
/* swinging at empty air leaves you wide open */
function vsWhiff(att) { if (VS.over) return; vsStagger(att, .55); att.rig.jolt = .2; vsPop(att, 'MISS!', '#cfd8ff'); }
/* swinging wildly throws you off balance: a short stagger that leaves you open */
function vsOffBalance(f) { vsStagger(f, .6); f.bad.length = 0; vsPop(f, 'OFF BALANCE!', '#ff9a7a'); }
/* hitting a held block knocks the attacker back, open for a counter */
function vsBounce(att) { if (VS.over) return; vsStagger(att, .65); vsSpend(att, 12); vsPop(att, 'BOUNCED!', '#bfe2ff'); }
function vsStartAttack(f, dir, id, tired) {
  f.state = 'windup'; f.t = 0; f.dir = dir; f.aim = vsOpp(f).lx; f.tired = !!tired; f.tele = f.teleBase * (f.rig.det.legs ? 1.25 : 1) * (tired ? 1.6 : 1); f.resolved = false; f.atkId = id || 0;
  f.rig.seq.length = 0; f.rig.setHold('wind' + dir, 4.2 / f.tele); sfx.warn();
}
function vsStrikeAnim(f) { f.state = 'strike'; f.t = 0; f.rig.seq.length = 0; f.rig.queue('end' + f.dir, .16, { ease: easeIn, arc: .3 }); f.lunge = 1; sfx.slash(1.2); }
function vsStagger(f, dur) { f.state = 'stagger'; f.t = 0; f.dur = dur || 1; f.rig.seq.length = 0; f.rig.setHold('stagger', 10); f.rig.jolt = .6; f.kb = .25; }
function vsCanParry(def, att) { return att.state === 'windup' && att.t >= att.tele * (1 - def.parryWin * def.legsPen); }
function vsParryFX(att) {
  const bp = att.rig.bladePoint(.6);
  FX.sparks(bp, '#fff3b0', 40, 6, .09); FX.glowBurst(bp, '#ffe08c', 1.5);
  sfx.parry(); hitstop(100); slowmo(.4, .35); OV.flash = .3; OV.flashCol = '255,240,200';
  banner('PARRY!');
}
/* resolve an attack landing on def; returns result for the network */
function vsResolve(att, def) {
  const limb = THREAT_LIMB[att.dir], key = limb === 'head' ? 'helm' : limb;
  if (def.lx !== att.aim) return { r: 'miss', dmg: 0, limb, lost: null, hp: def.hp };
  const crit = !att.tired && Math.random() < att.crit;
  let dmg = att.dmg * att.dmgMul * rnd(.9, 1.1) * (att.tired ? .4 : 1) * (crit ? 1.6 : 1);
  if (def.state === 'stagger') dmg *= 1.5;
  if (limb === 'head' && def.rig.det.helm) dmg *= 1.3;
  let r = 'hit';
  if (def.blocking) { r = 'block'; dmg *= Math.min(.6, def.pass * (def.rig.det.armL ? 1.8 : 1)); def.limbs[limb] -= dmg * .35; }
  else def.limbs[limb] -= dmg;
  def.hp = Math.max(0, def.hp - dmg);
  let lost = null;
  if (def.limbs[limb] <= 0 && !def.rig.det[key]) lost = limb;
  return { r, dmg: Math.round(dmg), limb, lost, hp: def.hp, crit: crit && r === 'hit' };
}
function vsApplyResult(def, res, local) {
  const pt = def.rig.partCenter(res.limb === 'head' ? 'head' : res.limb), s = def === VS.A && VS.online ? { x: VW / 2, y: VH * .66 } : toScreen(pt);
  if (res.r === 'miss') { sfx.whoosh(); ovPop(s.x, s.y - 30, 'DODGED!', { size: 30, color: '#9ff0c8', stroke: '#06261a' }); return; }
  if (res.r === 'block') { sfx.clang(); FX.sparks(def.rig.bladePoint(.45), '#d9eeff', 20, 4); ovPop(s.x, s.y - 30, 'BLOCKED', { size: 24, color: '#bfe2ff', stroke: '#0a1a3a' }); }
  else { sfx.hit(); def.rig.hitFlash(1); FX.sparks(pt, '#ffffff', 16, 4); shake(.05); ovPop(s.x, s.y - 20, (res.crit ? 'CRIT ' : '') + res.dmg, { size: res.crit ? 40 : 32, color: res.crit ? '#ffe08c' : '#ffffff' }); if (def === VS.A && VS.online) { OV.vig = .8; OV.vigCol = '255,40,30'; } }
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
  if (g) { g.traverse(o => { o.visible = true; }); VS.debris.push(g); }
  sfx.chop(); hitstop(90); shake(.07); FX.puff(f.rig.partCenter('torso'), 8, '#ffffff', .5);
  if (s) ovPop(s.x, s.y - 40, pick(['CHOP!', 'POW!', 'SLICE!']), { size: 42, color: '#2a1200', stroke: '#fff6d8', burst: pick(['#ffd23a', '#ff8a3a', '#7fe8ff']), rot: rnd(-.25, .25), life: 1.1, vy: -30 });
  if (limb === 'armR') f.dmgMul = .65;
  if (limb === 'legs') f.legsPen = .8;
  if (limb === 'head') vsStagger(f, 1);
}
/* a round ends; two round wins take the duel */
function vsKO(loser) {
  if (VS.over) return;
  VS.over = true; VS.endT = 0; VS.loser = loser; VS.winner = vsOpp(loser);
  loser.rig.ko(); VS.winner.rig.setHold('show', 5);
  slowmo(.35, 1); hitstop(140);
  const k = VS.winner === VS.A ? 'A' : 'B'; VS.wins[k]++;
  if (VS.wins[k] >= 2) {
    VS.phase = 'done'; sfx.win();
    banner(`${VS.winner.name.toUpperCase()} WINS THE DUEL!`, `${VS.A.name} ${VS.wins.A} – ${VS.wins.B} ${VS.B.name}`);
    if (VS.mode === 'challenge' && VS.online) duelDecided(false);
  } else {
    VS.phase = 'between'; VS.betweenT = 0; sfx.taiko(1.1);
    banner(`${VS.winner.name.toUpperCase()} TAKES ROUND ${VS.round}`, `${VS.A.name} ${VS.wins.A} – ${VS.wins.B} ${VS.B.name} · both samurai are healed`);
  }
  vsLabel();
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
        if (VS.online) vsSend('res', { id: o.atkId, r: 'parry' });
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
  const tired = f.sta < f.atkCost;
  if (tired) vsPop(f, 'Out of breath!');
  vsSpend(f, f.atkCost);
  const id = VS.online ? VS.nextId++ : 0;
  vsStartAttack(f, swipeDir(ux, uy), id, tired);
  if (VS.online) vsSend('atk', { id, dir: f.dir, tired });
}
const LIMBS4 = ['armL', 'armR', 'legs', 'head'];
function vsNetMessage(d) {
  const { A, B } = VS;
  if (['atk', 'res', 'step', 'blk'].includes(d.type) && (d.rd | 0) !== VS.round) return; // left over from an earlier round
  if (d.type === 'atk' && !VS.over) { if (['R', 'L', 'H', 'Low'].includes(d.dir)) vsStartAttack(B, d.dir, d.id | 0, !!d.tired); }
  else if (d.type === 'res') {
    if (d.r === 'parry') { if (A.atkId === (d.id | 0) && (A.state === 'windup' || A.state === 'strike')) { vsParryFX(A); vsStagger(A, 1.0); banner('PARRIED!'); } }
    else if (['hit', 'block', 'miss'].includes(d.r)) {
      if (d.limbs && typeof d.limbs === 'object') for (const k of LIMBS4) if (typeof d.limbs[k] === 'number') B.limbs[k] = clamp(d.limbs[k], 0, B.limbMax);
      vsApplyResult(B, { r: d.r, dmg: clamp(d.dmg | 0, 0, 999), limb: LIMBS4.includes(d.limb) ? d.limb : 'head', lost: LIMBS4.includes(d.lost) ? d.lost : null, hp: clamp(+d.hp, 0, B.max), crit: !!d.crit }, false);
      if (d.r === 'block') vsBounce(A); else if (d.r === 'miss') vsWhiff(A);
    }
  } else if (d.type === 'step') { const l = d.lx | 0; if (l >= -1 && l <= 1 && l !== B.lx) { B.lean = Math.sign(l - B.lx); B.lx = l; FX.puff(B.rig.root.position.clone().add(new V3(0, .08, 0)), 5, '#e8dcc4', .35); } }
  else if (d.type === 'blk') { B.blocking = !!d.on; if (B.state === 'ready') B.rig.setHold(B.blocking ? 'blockMid' : 'guard', 14); }
  else if (d.type === 'round') { const n = d.n | 0; if (VS.phase === 'between' && n === VS.round + 1) vsNextRound(); else if (n === VS.round + 1) VS.pendingRound = n; }
  else if (d.type === 'again') { VS.again.them = true; vsMaybeRematch(); }
  else if (d.type === 'again-go') { if (!VS.host) { VS.again.them = true; VS.again.me = true; vsRematchGo(clamp(d.land | 0, 0, NL - 1)); } }
  else if (d.type === 'forfeit') {
    if (VS.mode === 'challenge' && !VS.decided) { VS.winner = VS.A; VS.loser = VS.B; VS.over = true; VS.phase = 'done'; duelDecided(true); hideShowcase(); vsForfeitWin(); }
  }
  else if (d.type === 'bye') { if (VS.mode !== 'challenge' || VS.decided) toast('Your friend left the duel.'); }
}
function vsMaybeRematch() {
  if (!VS || !VS.again.me || !VS.again.them || !VS.host) return;
  const land = (Math.random() * NL) | 0;
  NET.send('again-go', { land }); vsRematchGo(land);
}
function vsRematchGo(land) {
  const c = { online: true, code: VS.code, host: VS.host, mode: VS.mode, cid: VS.cid, land, profA: VS.profA, profB: VS.profB };
  closeOverlay();
  transition(() => vsBuild(c), true);
}
function vsFighterUpdate(f, dt) {
  f.t += dt;
  const o = vsOpp(f);
  if (f.state === 'windup' && f.t < f.tele * vsLockAt(f)) f.aim = o.lx; // aim follows you until the gold ring shows, then it's locked
  f.stepCd = Math.max(0, f.stepCd - dt);
  f.px = lerp(f.px, f.lx, damp(f.rig.det.legs ? 9 : 16, dt)); f.lean = lerp(f.lean, 0, damp(6, dt));
  if (f.state === 'windup' && f.t >= f.tele) vsStrikeAnim(f);
  else if (f.state === 'strike') {
    if (!f.resolved && f.t >= .08) {
      f.resolved = true;
      if (!VS.online) { const res = vsResolve(f, o); vsApplyResult(o, res, true); if (res.r === 'block') vsBounce(f); else if (res.r === 'miss') vsWhiff(f); }
    }
    if (f.t > .35) { f.state = 'recover'; f.t = 0; f.rig.setHold(f === VS.A && VS.online && VS.view === 'fp' ? 'fpGuard' : 'guard', 8); }
  } else if (f.state === 'recover' && f.t > .3) f.state = 'ready';
  else if (f.state === 'stagger' && f.t > f.dur) { f.state = 'ready'; f.rig.setHold(f === VS.A && VS.online && VS.view === 'fp' ? 'fpGuard' : 'guard', 8); }
  else if (f.state === 'flinch' && f.t > .35) f.state = 'ready';
  if (f.state === 'ready' && f.blocking && !f.remote) {
    const bp = o.state === 'windup' ? THREAT_BLOCK[o.dir] : 'blockMid';
    if (f.blockPose !== bp) { f.blockPose = bp; f.rig.setHold(bp, 16); }
  }
  if (f.staWait > 0) f.staWait -= dt; else f.sta = Math.min(100, f.sta + f.regen * dt * (f.blocking ? .5 : 1));
  f.lunge = Math.max(0, f.lunge - dt * 2.6); f.kb = Math.max(0, f.kb - dt * 1.2);
}
/* online: an incoming remote strike lands on my fighter, resolved by my device */
function vsRemoteStrikeCheck() {
  const { A, B } = VS;
  if (B.state === 'strike' && !B.resolved && B.t >= .08) {
    B.resolved = true;
    if (VS.over) return;
    const res = vsResolve(B, A);
    vsSend('res', Object.assign({ id: B.atkId, limbs: A.limbs }, res));
    vsApplyResult(A, res, true);
    if (res.r === 'block') vsBounce(B); else if (res.r === 'miss') vsWhiff(B);
  }
}

const VsMode = {
  name: 'vs',
  update(dt) {
    if (!VS) return;
    if (VS.phase === 'cere') { cereUpdate(dt); return; }
    const { A, B } = VS;
    VS.clock += dt;
    if (VS.phase === 'show') {
      VS.showT -= dt;
      const c = $('#scCount'); if (c) c.textContent = Math.max(1, Math.ceil(VS.showT));
      if (VS.showT <= 0) { VS.phase = 'loading'; vsBeginRound(true); }
    }
    if (VS.intro > 0) { VS.intro -= dt; if (VS.intro <= 0) { banner('FIGHT!'); sfx.taiko(1.3); } }
    if (VS.phase === 'fight') {
      vsFighterUpdate(A, dt);
      if (VS.online) { const wasResolved = B.resolved; B.resolved = true; vsFighterUpdate(B, dt); B.resolved = wasResolved; vsRemoteStrikeCheck(); }
      else vsFighterUpdate(B, dt);
    } else if (VS.phase === 'between') {
      VS.betweenT += dt;
      if (!VS.online) { if (VS.betweenT > 3.4) vsNextRound(); }
      else if (VS.host) { if (VS.betweenT > 3.4) { NET.send('round', { n: VS.round + 1 }); vsNextRound(); } }
      else if ((VS.pendingRound === VS.round + 1 && VS.betweenT > 1) || VS.betweenT > 7.5) vsNextRound();
    } else if (VS.phase === 'done') {
      VS.endT += dt;
      if (!VS.shown && VS.endT > 2.6) {
        VS.shown = true;
        if (VS.mode === 'challenge' && VS.online && VS.decided && !VS.forfeit) cereStart(); else vsResult();
      }
    }
    const show = VS.phase === 'show' || (VS.phase === 'loading' && VS.round === 1 && !VS.intro);
    if (show) {
      // side by side for the showcase, facing the camera with blades raised
      A.rig.root.position.set(0, 0, DIST / 2 - .62); B.rig.root.position.set(0, 0, DIST / 2 + .62);
      for (const f of [A, B]) { f.rig.root.rotation.y = lerp(f.rig.root.rotation.y, -Math.PI / 2 + (f === A ? .35 : -.35), damp(6, dt)); if (!f.showing) { f.showing = true; f.rig.setFP(false); f.rig.setHold('show', 6); } }
    } else {
      A.rig.root.position.set(vsLaneX(A, A.px), 0, easeOut(A.lunge) * .5 - A.kb);
      B.rig.root.position.set(vsLaneX(B, B.px), 0, DIST - easeOut(B.lunge) * .5 + B.kb);
      for (const f of [A, B]) {
        const o = vsOpp(f), busy = f.state === 'windup' || f.state === 'strike';
        const tx = busy ? vsLaneX(o, f.aim) : o.rig.root.position.x, tz = o === B ? DIST : 0;
        const want = Math.atan2(tx - f.rig.root.position.x, tz - f.rig.root.position.z);
        let dr = want - f.rig.root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        f.rig.root.rotation.y += dr * damp(14, dt);
        f.rig.root.rotation.z = -f.lean * .12 * (f === A ? 1 : -1);
      }
    }
    A.rig.update(dt); B.rig.update(dt);
    // camera
    let pos, look, fov;
    if (show) {
      const asp = VW / VH, d = 4.6 * Math.max(1, 1.35 / asp);
      pos = new V3(-d, 1.45, DIST / 2 + Math.sin(VS.clock * .25) * .3); look = new V3(0, 1.3, DIST / 2); fov = 42;
    } else if (VS.online && VS.phase === 'fight') {
      const P = A.rig; P.root.updateMatrixWorld(true); B.rig.root.updateMatrixWorld(true);
      const eChest = B.rig.chest.localToWorld(new V3(0, .18, 0));
      if (VS.view === 'fp') { pos = P.hips.localToWorld(new V3(0, .68, -.2)); fov = 70; }
      else { pos = P.root.localToWorld(new V3(-1.0, 2.15, -2.05)); fov = 55; }
      look = VS.view === 'fp' ? eChest : P.chest.getWorldPosition(new V3()).lerp(eChest, .8);
    } else {
      const asp = VW / VH, d = 4.4 * Math.max(1, 1.3 / asp), idle = VS.phase !== 'fight';
      const a = idle ? -Math.PI / 2 + Math.sin(VS.clock * .4) * .35 : -Math.PI / 2;
      pos = new V3(Math.sin(a) * d, 2.7, DIST / 2 + Math.cos(a) * d); look = new V3(.2, 1.0, DIST / 2); fov = 50;
    }
    const snap = VS.clock < .1 || VS.snapCam; VS.snapCam = false;
    VS.camPos.lerp(pos, damp(snap ? 60 : 12, dt)); VS.camLook.lerp(look, damp(snap ? 60 : 12, dt));
    CAM.position.copy(VS.camPos); CAM.lookAt(VS.camLook);
    CAM.fov = lerp(CAM.fov, fov, damp(8, dt)); CAM.updateProjectionMatrix(); FX.setScale();
    applyShake(dt);
    hint(VS.phase !== 'fight' || VS.intro > 0 ? '' : VS.online ? 'Gold ring = their aim is locked: swipe through it to parry, or STEP aside (two-finger swipe) to make them miss!' : 'Swipe on your half · Hold still to block · ▲▼ to step: step when the gold ring shows and they miss!');
  },
  slash(x0, y0, x1, y1, id) {
    if (!VS || VS.phase !== 'fight') return;
    // one move per touch: lift your finger to make the next one
    if (VS.acted[id]) return; VS.acted[id] = true;
    if (VS.online) { vsSwipe(VS.A, x0, y0, x1, y1); return; }
    const p = VS.ptrs[id]; const f = p ? p.f : (x0 < VW / 2 ? VS.A : VS.B);
    if (p) p.swiped = true;
    if (f.blocking) { f.blocking = false; f.rig.setHold('guard', 9); }
    vsSwipe(f, x0, y0, x1, y1);
  },
  down(x, y, id) {
    if (!VS) return;
    if (VS.phase === 'show' && !VS.online && VS.showT > .4) { VS.showT = .4; return; } // same tablet: tap to skip the showcase
    VS.acted[id] = false;
    if (VS.online || VS.phase !== 'fight') return;
    const f = x < VW / 2 ? VS.A : VS.B;
    VS.ptrs[id] = { f, t0: performance.now(), swiped: false, timer: setTimeout(() => { const p = VS && VS.ptrs[id]; if (p && !p.swiped && f.state === 'ready') { f.blocking = true; f.blockPose = null; } }, 220) };
  },
  up(id) {
    if (!VS) return;
    delete VS.acted[id];
    if (VS.online) return;
    const p = VS.ptrs[id]; if (!p) return;
    clearTimeout(p.timer); if (p.f.blocking) { p.f.blocking = false; p.f.rig.setHold('guard', 9); }
    delete VS.ptrs[id];
  },
};
function drawVsOverlay(c) {
  if (!VS || VS.phase !== 'fight') return;
  // breath bars under each fighter
  for (const f of [VS.A, VS.B]) {
    if (VS.online && f === VS.B) continue;
    const p = toScreen(f.rig.root.position.clone().add(new V3(0, -.05, 0))), w = 90, x = p.x - w / 2, y = Math.min(VH - 30, p.y + 14);
    c.save(); c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - 2, y - 2, w + 4, 10);
    c.fillStyle = f.sta < f.atkCost ? '#ff8a5a' : '#ffd84a'; c.fillRect(x, y, w * f.sta / 100, 6); c.restore();
  }
  for (const f of [VS.A, VS.B]) {
    if (f.state !== 'windup') continue;
    if (VS.online && f === VS.A) continue;
    const ring = ringInfo(f.rig), w0 = f.tele * vsLockAt(f);
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
  const w = VS.winner, iWon = !VS.online || w === VS.A, chal = VS.mode === 'challenge';
  openOverlay(`<div class="modal ${iWon ? 'win' : ''}">
    <div class="kicker ${iWon || !VS.online ? '' : 'lose'}">${esc(w.name)} wins!</div>
    <p class="score-line">${esc(VS.A.name)} <b>${VS.wins.A}</b> – <b>${VS.wins.B}</b> ${esc(VS.B.name)}</p>
    <p class="muted">${chal ? 'An honor duel, fought with bokkens. Bows are exchanged; no blade changes hands.' : VS.online ? (iWon ? 'Great duel. Want a rematch?' : 'So close. Rematch?') : 'What a battle! Swap sides or go again.'}</p>
    <div class="actions">
      ${chal ? '' : '<button class="btn primary" data-vsres="again">Rematch</button>'}
      <button class="btn ${chal ? 'primary' : ''}" data-vsres="home">Back to dojo</button>
    </div></div>`);
}
function vsForfeitWin() {
  VS.forfeit = true;
  const prize = VS.prize ? swordDef(VS.prize.id) : null;
  openOverlay(`<div class="modal win"><div class="kicker">${esc(VS.B.name)} forfeits!</div>
    <p class="muted">${esc(VS.B.name)} left the dueling ground before it was decided.${prize ? ` By the code of the duel, <b>${esc(prize.name)}</b> is now yours.` : ' It was an honor duel, so no blade changes hands.'}</p>
    ${prize ? `<div class="reveal" style="--rc:${RAR[prize.r].c}44;--glow:${prize.glow || RAR[prize.r].c}"><div class="rays"></div>${bladeSVG(prize)}</div>` : ''}
    <div class="actions"><button class="btn primary" data-vsres="home">Back to dojo</button></div></div>`);
}
function vsResultAction(act) {
  if (act === 'again') {
    if (VS.online) { VS.again.me = true; NET.send('again', {}); toast('Waiting for your friend to tap Rematch…'); vsMaybeRematch(); return; }
    const a = VS.profA, b = VS.profB;
    closeOverlay(); startVersusLocal(a, b); return;
  }
  closeOverlay(); endVersus();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { NET.wake(); MAIL.wake(); if (LOBBY && !LOBBY.other && LOBBY.hiTimer) NET.send('hi', myHello()); } });
window.addEventListener('pageshow', () => NET.wake());
