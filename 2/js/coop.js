'use strict';
/* ===== Travel together: two samurai on the same road, each on their own tablet =====
   Share a four-letter code. You see each other walking the town, on the map, and when your
   friend is in a duel you can cheer: it gives them Spirit and a little health. Each samurai keeps their own save. */

const CO = { on: false, code: null, host: false, me: Math.random().toString(36).slice(2, 8), peers: {}, sendT: 0, status: '', cheerAt: 0, err: '' };
const CO_STALE = 7;
function coopNow() { return performance.now() / 1000; }
function coopPeers() { const t = coopNow(); return Object.values(CO.peers).filter(p => t - p.at < CO_STALE); }
function coopHere() { return coopPeers().filter(p => p.t === S.cur); }
async function coopOpen(code, host) {
  coopClose(true);
  CO.code = code.toUpperCase(); CO.host = host; CO.status = 'Connecting…'; CO.err = ''; if (PACK_TAB === 'co') openPack('co');
  try {
    if (IN_CLAUDE) await NET.openRoom('tk' + CO.code); else await NET.openRelay('tk' + CO.code);
    NET.handler = coopMsg; CO.on = true; CO.status = host ? 'Waiting for your friend to join…' : 'Looking for your friend…'; coopSend(true);
  } catch (e) { CO.err = e.message || 'Could not connect.'; CO.code = null; CO.status = ''; }
  if (PACK_TAB === 'co' && !$('#overlay').hidden) openPack('co');
}
function coopClose(quiet) {
  if (CO.on) { try { NET.send('cx', { id: CO.me }); } catch (e) { /* */ } NET.close(); }
  Object.values(CO.peers).forEach(coopDrop); CO.peers = {}; CO.on = false; CO.code = null; CO.status = '';
  const b = $('#cheerBtn'); if (b) b.hidden = true;
  if (!quiet && PACK_TAB === 'co' && !$('#overlay').hidden) openPack('co');
}
function coopDrop(p) { if (p.rig) { const g = p.rig.root.parent; if (g) { g.remove(p.rig.root); g.remove(p.lab); } p.rig.dispose && p.rig.dispose(); p.rig = null; } }
function coopSend(force) {
  if (!CO.on) return;
  const T = TOWN, inFight = typeof F !== 'undefined' && F && !F.over && MODE !== TownMode;
  NET.send('cp', { id: CO.me, n: nm(), t: S.cur, x: T ? +T.pos.x.toFixed(2) : 0, z: T ? +T.pos.z.toFixed(2) : 0, f: T ? +T.face.toFixed(2) : 0, sp: T && !inFight ? +T.speed.toFixed(2) : 0,
    lf: T ? +(T.lift || 0).toFixed(2) : 0, o: S.outfit, eq: S.armor.eq, sw: eqSword().id, gh: S.stolen ? { t: S.stolen.t, bn: swordDef(S.stolen.id).name } : null, fi: inFight ? F.st.name : null, hp: inFight ? Math.round(F.php / F.pmax * 100) : null });
}
function coopMsg(d) {
  if (!d || !d.id || d.id === CO.me) return;
  if (d.type === 'cx') { const p = CO.peers[d.id]; if (p) { toast(`${p.n} left the road.`); coopDrop(p); delete CO.peers[d.id]; } return; }
  if (d.type === 'cp') {
    let p = CO.peers[d.id];
    if (!p) { p = CO.peers[d.id] = { id: d.id, px: d.x, pz: d.z, pf: d.f, ph: 0 }; toast(`${String(d.n).slice(0, 14)} joined you on the road!`); sfx.win && sfx.win(); CO.status = ''; coopSend(true); if (PACK_TAB === 'co' && !$('#overlay').hidden) openPack('co'); }
    const sig = JSON.stringify([d.o, d.eq, d.sw]); if (p.sig && p.sig !== sig) coopDrop(p);
    Object.assign(p, { n: String(d.n || 'Friend').slice(0, 14), t: d.t | 0, x: +d.x || 0, z: +d.z || 0, f: +d.f || 0, sp: +d.sp || 0, lf: +d.lf || 0, o: d.o, eq: d.eq && typeof d.eq === 'object' ? d.eq : {}, sw: d.sw, gh: d.gh && typeof d.gh === 'object' ? { t: d.gh.t | 0, bn: String(d.gh.bn || 'blade').slice(0, 30) } : null, fi: d.fi ? String(d.fi).slice(0, 30) : null, hp: d.hp, sig, at: coopNow() });
    return;
  }
  if (d.type === 'tm') return teamMsg(d);
  if (d.type === 'ce') {
    const who = String(d.n || 'Your friend').slice(0, 14);
    if (d.k === 'cheer' && typeof F !== 'undefined' && F && !F.over && MODE !== TownMode) { F.spirit = Math.min(100, F.spirit + 20); F.php = Math.min(F.pmax, F.php + F.pmax * .05); banner(`${who} cheers!`, 'Spirit and health rise'); sfx.taiko && sfx.taiko(.8); FX.sparks(F.P.root.position.clone().add(new V3(0, 1.6, 0)), '#9ff0c8', 40, 5); }
    else if (d.k === 'win') toast(`${who} beat ${String(d.foe).slice(0, 30)}!`);
    else if (d.k === 'bow') { toast(`${who} bows to you.`); sfx.bell && sfx.bell(); }
  }
}
function coopEvent(k, extra) { if (CO.on) NET.send('ce', Object.assign({ id: CO.me, n: nm(), k }, extra || {})); }
/* called every frame while walking a town */
function coopTick(dt, T) {
  if (!CO.on) return;
  CO.sendT -= dt; if (CO.sendT <= 0) { CO.sendT = .16; coopSend(); }
  const now = coopNow(); let fighting = null;
  for (const p of Object.values(CO.peers)) {
    const here = p.t === S.cur && now - p.at < CO_STALE && !p.fi;
    if (now - p.at > 20) { toast(`${p.n} left the road.`); coopDrop(p); delete CO.peers[p.id]; continue; }
    if (p.fi && p.t === S.cur && now - p.at < CO_STALE) fighting = p;
    if (!here) { if (p.rig) coopDrop(p); continue; }
    if (!p.rig) {
      const keep = S.armor.eq; let look; try { S.armor.eq = p.eq; look = lookFromOutfit(outfitDef(p.o)); } finally { S.armor.eq = keep; }
      let sd; try { sd = swordDef(p.sw); } catch (e) { sd = null; }
      p.rig = new Samurai(look, sd || swordDef('iron'), {}); p.rig.root.rotation.order = 'YXZ'; p.rig.setSheathed && p.rig.setSheathed(true); p.rig.setHold('rest', 6);
      p.lab = labelSprite(p.n, '#9ff0c8', 'Travelling with you'); T.grp.add(p.rig.root, p.lab); p.px = p.x; p.pz = p.z; p.pf = p.f;
    }
    if (Math.hypot(p.x - p.px, p.z - p.pz) > 12) { p.px = p.x; p.pz = p.z; }
    p.px = lerp(p.px, p.x, damp(9, dt)); p.pz = lerp(p.pz, p.z, damp(9, dt)); let df = p.f - p.pf; df = Math.atan2(Math.sin(df), Math.cos(df)); p.pf += df * damp(9, dt);
    const y = townH(p.px, p.pz) + p.lf, R = p.rig, k = p.lf > .3 ? 0 : p.sp; p.ph += k * dt * (7 + 3 * k);
    R.root.position.set(p.px, y, p.pz); R.root.rotation.y = p.pf;
    R.feet.L.set(.15, .035 + Math.max(0, Math.sin(p.ph)) * .14 * k, Math.sin(p.ph) * .3 * k - .02); R.feet.R.set(-.15, .035 + Math.max(0, Math.sin(p.ph + Math.PI)) * .14 * k, Math.sin(p.ph + Math.PI) * .3 * k + .02);
    R.crouch = -Math.abs(Math.sin(p.ph)) * .035 * k; R.leanAdd = k * .1; R.armSwing = -Math.sin(p.ph) * k; R.update(dt);
    p.lab.position.set(p.px, y + 2.7, p.pz); const d = Math.hypot(T.pos.x - p.px, T.pos.z - p.pz); p.lab.material.opacity = smooth(1.5, 4, d);
  }
  const b = $('#cheerBtn'); if (b) { const show = !!fighting && !T.paused; if (b.hidden === show) b.hidden = !show; if (show) { const cd = Math.max(0, CO.cheerAt - now); b.textContent = cd > 0 ? `Cheering… ${Math.ceil(cd)}` : `📣 Cheer for ${fighting.n}! (fighting ${fighting.fi}${fighting.hp != null ? ', ' + fighting.hp + '% health' : ''})`; b.classList.toggle('locked', cd > 0); } }
}
function coopLine() {
  if (!CO.on) return '';
  const ps = coopPeers(); if (!ps.length) return `<small style="display:block;color:#9ff0c8">Together · code ${CO.code} · waiting for a friend</small>`;
  return `<small style="display:block;color:#9ff0c8">With ${ps.map(p => esc(p.n) + (p.t === S.cur ? (p.fi ? ' (duelling ' + esc(p.fi) + ')' : '') : ' (in ' + TOWNS[p.t].n + ')')).join(', ')}</small>`;
}
function packCoop() {
  const ps = coopPeers();
  return `<h2>Travel together</h2>
    <p class="muted" style="margin:6px 0 12px">Two samurai, two tablets, one road. Share a code and you will see each other walking the town and on the map. When your friend is in a duel, tap <b>Cheer</b> to send them Spirit and health. Each of you keeps your own save, armor and friends.</p>
    ${CO.err ? `<p style="color:#ff9a7a">⚠ ${esc(CO.err)}</p>` : ''}
    ${CO.code ? `<div class="card" style="gap:8px;text-align:center"><small class="muted">${CO.host ? 'Tell your friend this code' : 'Joined with code'}</small><div style="font-size:44px;font-weight:900;letter-spacing:.3em;color:var(--gold-2,#ffd27a)">${CO.code}</div>
        <small class="muted">${ps.length ? '' : esc(CO.status)}</small>${ps.map(p => `<b style="color:#9ff0c8">✓ ${esc(p.n)} · ${p.t === S.cur ? 'here in ' + townCfg().n : 'in ' + TOWNS[p.t].n}${p.t !== S.cur && p.t <= (S.far || 0) ? ` <button class="btn small" data-travel="${p.t}" data-friend="1">Go to them</button>` : ''}</b>`).join('')}
        ${ps.some(p => p.t !== S.cur && p.t > (S.far || 0)) ? '<small class="muted">Your friend is further down the road than you have reached. They can travel back to you from their Map.</small>' : ''}
        <button class="btn small" data-coop="leave">Stop travelling together</button></div>`
      : `<div class="grid2"><div class="card" style="gap:8px"><b>Start a party</b><small>You get a code to tell your friend.</small><button class="btn primary" data-coop="host">Get a code</button></div>
        <div class="card" style="gap:8px"><b>Join a friend</b><small>Type the code on their screen.</small><input id="coCode" maxlength="4" autocapitalize="characters" autocomplete="off" placeholder="CODE" style="font-size:22px;font-weight:900;letter-spacing:.3em;text-align:center;padding:8px;border-radius:10px;border:2px solid rgba(255,255,255,.25);background:rgba(0,0,0,.3);color:#fff;width:100%;text-transform:uppercase"><button class="btn primary" data-coop="join">Join</button></div></div>`}`;
}
function coopClick(a) {
  if (a === 'host') { sfx.ui && sfx.ui(); coopOpen(newCode(), true); return true; }
  if (a === 'join') { const v = (($('#coCode') || {}).value || '').replace(/[^a-z0-9]/gi, '').toUpperCase(); if (v.length !== 4) { CO.err = 'The code has four letters or numbers.'; openPack('co'); return true; } coopOpen(v, false); return true; }
  if (a === 'leave') { coopClose(); return true; }
  if (a === 'cheer') { const now = coopNow(); if (now < CO.cheerAt) return true; CO.cheerAt = now + 6; coopEvent('cheer'); sfx.taiko && sfx.taiko(.6); toast('You cheer!'); return true; }
  return true;
}
(function () { const b = document.createElement('button'); b.className = 'act-btn'; b.id = 'cheerBtn'; b.hidden = true; b.dataset.coop = 'cheer'; b.style.cssText = 'bottom:auto;top:calc(env(safe-area-inset-top,0px) + 120px);font-size:15px;max-width:80vw'; ($('#hud') || document.body).appendChild(b); })();
setInterval(() => { if (CO.on && MODE !== TownMode) coopSend(); }, 700);
document.addEventListener('visibilitychange', () => { if (!document.hidden && CO.on) NET.wake && NET.wake(); });
