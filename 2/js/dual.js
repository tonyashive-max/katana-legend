'use strict';
/* ===== The Hermit of the Mountain: two drills for two blades, and armor forging =====
   The left half of the screen is your long blade, the right half is your short blade. */

const DUAL_COL = ['#ffd27a', '#8fe8ff'], DUAL_GLYPH = ['長', '短'], DUAL_NAME = ['Long', 'Short'];
function dualArrow(c, x, y, R, a, col, done, label) {
  c.save(); c.translate(x, y); c.globalAlpha = done ? .35 : 1;
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.stroke();
  c.fillStyle = col; c.font = `900 ${Math.round(R * .34)}px system-ui,sans-serif`; c.textAlign = 'center'; c.fillText(label, 0, -R - 14);
  if (done) { c.fillStyle = '#9ff0c8'; c.font = `900 ${Math.round(R * .9)}px system-ui,sans-serif`; c.fillText('✓', 0, R * .32); c.restore(); return; }
  c.rotate(a); c.shadowColor = col; c.shadowBlur = 22; c.fillStyle = col; c.strokeStyle = '#06203a'; c.lineWidth = 6;
  c.beginPath(); c.moveTo(R * .7, 0); c.lineTo(R * .05, -R * .45); c.lineTo(R * .05, -R * .18); c.lineTo(-R * .6, -R * .18); c.lineTo(-R * .6, R * .18); c.lineTo(R * .05, R * .18); c.lineTo(R * .05, R * .45); c.closePath(); c.stroke(); c.fill(); c.restore();
}
function dualTimer(c, k) { const w = Math.min(VW * .5, 420), x = VW / 2 - w / 2, y = VH * .2; c.save(); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x, y, w, 10); c.fillStyle = k > .5 ? '#8fe8ff' : k > .25 ? '#ffd166' : '#ff6b5b'; c.fillRect(x, y, w * clamp(k, 0, 1), 10); c.restore(); }
/* Twin Cut: both arrows at once, one for each blade */
const TwinGame = {
  init() { T.N = 16; T.i = 0; T.cur = null; T.gap = 1; T.correct = 0; T.fast = 0; hint('Left side of the screen is your LONG blade, right side is your SHORT blade. Cut both arrows!'); setTimeout(() => { if (T && T.kind === 'twin') hint(''); }, 6000); },
  next() { if (T.i >= T.N) return finishTraining(); const d = () => ((Math.random() * (T.i < 6 ? 4 : 8)) | 0) / (T.i < 6 ? 4 : 8) * Math.PI * 2; T.cur = { a: [d(), d()], done: [false, false], t: 0, lim: Math.max(1.15, 2.6 - T.i * .08) }; T.i++; sfx.tick(); },
  update(dt) {
    if (T.gap > 0) { T.gap -= dt; if (T.gap <= 0) this.next(); }
    else if (T.cur) { T.cur.t += dt; if (T.cur.t > T.cur.lim) { tPop('Too slow!', null, VH * .3, { size: 28, color: '#ff8a7a' }); T.cur = null; T.gap = .5; sfx.warn(); } }
    setTInfo(`${Math.min(T.i, T.N)} / ${T.N}`, `Both blades ${T.correct}`);
  },
  slash(x0, y0, x1, y1) {
    const q = T.cur; if (!q) return; const side = x0 < VW / 2 ? 0 : 1; if (q.done[side]) return;
    let d = Math.abs(Math.atan2(y1 - y0, x1 - x0) - q.a[side]) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
    if (d > .7) { tPop(`${DUAL_NAME[side]} blade: wrong way!`, null, VH * .3, { size: 26, color: '#ff8a7a' }); sfx.warn(); T.cur = null; T.gap = .5; return; }
    q.done[side] = true; sfx.hit();
    if (q.done[0] && q.done[1]) { T.correct++; const fast = q.t < q.lim * .55; if (fast) T.fast++; tPop(fast ? 'TWO HEAVENS!' : 'Both!', null, VH * .3, { size: fast ? 36 : 28, color: fast ? '#ffe08c' : '#d9ffb0', stroke: '#06203a' }); T.cur = null; T.gap = .4; }
  },
  draw(c) { const q = T.cur; if (!q) return; const R = Math.min(VW, VH) * .13, y = VH * .48; dualTimer(c, 1 - q.t / q.lim); for (const s of [0, 1]) dualArrow(c, VW * (s ? .7 : .3), y, R, q.a[s], DUAL_COL[s], q.done[s], DUAL_GLYPH[s] + ' ' + DUAL_NAME[s]); },
  xp() { return T.correct * 6 + T.fast * 3; },
  summary() { return `${T.correct} of ${T.N} cut with both blades, ${T.fast} in perfect time`; },
};
/* Long and Short: read the chain and cut it in order, changing blades as you go */
const FlowGame = {
  init() { T.N = 10; T.i = 0; T.cur = null; T.gap = 1; T.correct = 0; T.cuts = 0; T.lastAt = -1; hint('Read the chain left to right. 長 = cut on the LEFT side, 短 = cut on the RIGHT side.'); setTimeout(() => { if (T && T.kind === 'flow') hint(''); }, 6000); },
  next() { if (T.i >= T.N) return finishTraining(); const n = 3 + Math.min(3, (T.i / 3) | 0), seq = []; for (let i = 0; i < n; i++) seq.push(Math.random() < .5 ? 0 : 1); T.cur = { seq, k: 0, t: 0, lim: n * Math.max(.62, 1.05 - T.i * .04) }; T.i++; sfx.tick(); },
  update(dt) {
    if (T.gap > 0) { T.gap -= dt; if (T.gap <= 0) this.next(); }
    else if (T.cur) { T.cur.t += dt; if (T.cur.t > T.cur.lim) { tPop('Too slow!', null, VH * .3, { size: 28, color: '#ff8a7a' }); T.cur = null; T.gap = .5; sfx.warn(); } }
    setTInfo(`${Math.min(T.i, T.N)} / ${T.N}`, `Chains ${T.correct}`);
  },
  slash(x0) {
    const q = T.cur; if (!q || T.t - T.lastAt < .2) return; T.lastAt = T.t; const side = x0 < VW / 2 ? 0 : 1;
    if (side !== q.seq[q.k]) { tPop(`That needed the ${DUAL_NAME[q.seq[q.k]].toLowerCase()} blade!`, null, VH * .3, { size: 26, color: '#ff8a7a' }); sfx.warn(); T.cur = null; T.gap = .55; return; }
    q.k++; T.cuts++; sfx.hit();
    if (q.k >= q.seq.length) { T.correct++; tPop('Flowing!', null, VH * .3, { size: 30, color: '#d9ffb0', stroke: '#06203a' }); T.cur = null; T.gap = .45; }
  },
  draw(c) {
    const q = T.cur; if (!q) return; const n = q.seq.length, R = Math.min(VW / (n * 3), VH * .08), y = VH * .44, x0 = VW / 2 - (n - 1) * R * 1.4;
    dualTimer(c, 1 - q.t / q.lim); c.save(); c.textAlign = 'center';
    q.seq.forEach((s, i) => { const x = x0 + i * R * 2.8, done = i < q.k, now = i === q.k; c.globalAlpha = done ? .3 : 1; c.fillStyle = 'rgba(8,10,20,.75)'; c.strokeStyle = DUAL_COL[s]; c.lineWidth = now ? 8 : 4; c.beginPath(); c.arc(x, y, R * (now ? 1.15 : 1), 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = DUAL_COL[s]; c.font = `900 ${Math.round(R * 1.1)}px system-ui,sans-serif`; c.fillText(done ? '✓' : DUAL_GLYPH[s], x, y + R * .4); });
    c.globalAlpha = 1; c.font = '900 15px system-ui,sans-serif'; c.fillStyle = DUAL_COL[0]; c.fillText('◀ LONG BLADE SIDE', VW * .22, VH * .66); c.fillStyle = DUAL_COL[1]; c.fillText('SHORT BLADE SIDE ▶', VW * .78, VH * .66); c.restore();
  },
  xp() { return T.correct * 8 + T.cuts; },
  summary() { return `${T.correct} of ${T.N} chains cut in order`; },
};
TRAININGS.twin = { name: 'Twin Cut', skill: 'speed', g: '双', dual: true, desc: 'Two arrows at once, one for each blade. Cut the gold arrow on the left side and the blue arrow on the right side before time runs out.' };
TRAININGS.flow = { name: 'Long and Short', skill: 'power', g: '流', dual: true, desc: 'Read the chain and cut it in order: long blade on the left, short blade on the right. The chains grow.' };
TRAIN_KINDS.twin = TwinGame; TRAIN_KINDS.flow = FlowGame;

function townHermit() {
  if (TOWN) { TOWN.paused = true; TOWN.joy = null; }
  const ok = S.sk.power.l >= 5 && S.sk.speed.l >= 5, drill = k => { const t = TRAININGS[k], s = S.sk[t.skill], need = skillNeed(s.l); return `<div class="card" style="gap:6px"><div class="row between"><b>${t.g} ${t.name}</b><small class="muted">${SKILLS[t.skill].n} Lv ${s.l}</small></div><small>${t.desc}</small><div class="bar"><i style="width:${s.l >= 30 ? 100 : Math.round(s.x / need * 100)}%"></i></div><button class="btn small jade" data-town="train:${k}">Start drill</button></div>`; };
  openOverlay(`<div class="modal" style="text-align:left"><div class="eyebrow">Hermit of the Mountain · Two Heavens school</div>
    <p style="margin:6px 0 10px">"One sword is a question. Two swords are a conversation." <span class="muted">The swordsman Miyamoto Musashi founded a school that fights with a long and a short sword together, and wrote down its teaching in a mountain cave.</span></p>
    ${S.dual ? `<h3>二 Your two blades</h3><p class="muted" style="font-size:13px;margin:2px 0 6px">First blade: <b>${styleDef().n}</b> (change it with any sensei). Second blade:</p><div class="grid2" style="grid-template-columns:repeat(3,minmax(0,1fr));margin:0 0 14px">${Object.entries(STYLES).filter(([k]) => k !== 'both').map(([k, y]) => `<button class="card ${(S.style2 || 'kodachi') === k ? 'sel' : ''}" data-town="style2:${k}" style="text-align:left;gap:4px" ${(S.style || 'katana') === k ? 'disabled' : ''}><b>${y.jp} ${y.n}</b><small style="color:var(--jade)">${(S.style || 'katana') === k ? 'Your first blade' : (S.style2 || 'kodachi') === k ? '✓ Second blade' : 'Tap to switch'}</small></button>`).join('')}</div>`
      : `<div class="card" style="gap:6px;margin-bottom:14px"><b>二 The trial of Two Heavens</b><small>Reach <b>Power Lv 5</b> (you: ${S.sk.power.l}) and <b>Speed Lv 5</b> (you: ${S.sk.speed.l}), then beat me. My two drills below will get you there. Pass, and you may carry two blades.</small><button class="btn small ${ok ? 'primary' : ''}" data-town="fight:sensei" ${ok ? '' : 'disabled'}>⚔ Take the trial</button></div>`}
    <h3>Drills for two blades</h3><div class="grid2">${drill('twin')}${drill('flow')}</div>
    <div class="actions"><button class="btn" data-town="">Back down the mountain</button></div></div>`);
}
/* ---------- armor forging ---------- */
const ARMOR_MAX = 5;
function armorMax(id) { return (S.armor.leg || {})[PIECES[id].set] ? 8 : ARMOR_MAX; }
function armorLvl(id) { return ((S.armor.lvl || {})[id]) | 0; }
function armorCost(id) { const l = armorLvl(id), k = SETS[PIECES[id].set].k; return { gold: Math.round(50 * (l + 1) * k), steel: 3 + l * 2 }; }
function townArmorForge() {
  if (TOWN) { TOWN.paused = true; TOWN.joy = null; }
  const worn = SLOTS.map(s => S.armor.eq[s.id]).filter(Boolean);
  openOverlay(`<div class="modal" style="text-align:left"><div class="eyebrow">The armorer's forge</div><h2>Forge your armor</h2>
    <p class="muted" style="margin:6px 0 10px">Each forging makes a piece 10% stronger, up to +${ARMOR_MAX}. You forge the pieces you are wearing. You have <b>${fmt(S.gold)}</b> gold and <b>${fmt(S.steel || 0)}</b> steel.</p>
    ${worn.length ? `<div class="grid2">${worn.map(id => { const p = PIECES[id], l = armorLvl(id), c = armorCost(id), max = l >= armorMax(id); return `<div class="card" style="gap:6px;border-color:${SETS[p.set].col || '#888'}"><div class="row between"><b>${p.n}${l ? ' +' + l : ''}</b><small class="muted">${(S.armor.leg || {})[p.set] ? '★ Legendary · ' : ''}${l}/${armorMax(id)}</small></div><div class="bar"><i style="width:${l / armorMax(id) * 100}%"></i></div>${max ? '<span class="tag new">Fully forged</span>' : `<button class="btn small ${canPay(c) ? 'primary' : ''}" data-town="aforge:${id}" ${canPay(c) ? '' : 'disabled'}>🔨 +${l + 1} · ${c.gold} gold, ${c.steel} steel</button>`}</div>`; }).join('')}</div>` : '<p>You are not wearing any armor. Put some on in your Pack first.</p>'}
    <div class="actions"><button class="btn" data-town="smithback">Back</button></div></div>`);
}
function townArmorForgeDo(id) {
  const c = armorCost(id); if (!ownPiece(id) || armorLvl(id) >= armorMax(id) || !canPay(c)) return;
  pay(c); S.armor.lvl = S.armor.lvl || {}; S.armor.lvl[id] = armorLvl(id) + 1; save(); sfx.clang && sfx.clang(); sfx.up && sfx.up(); shake(.06);
  if (TOWN) { FX.sparks(TOWN.pos.clone().add(new V3(0, 1.2, 0)), '#ffb060', 40, 5); townRefreshPlayer(); }
  toast(`${PIECES[id].n} forged to +${armorLvl(id)}.`); townArmorForge();
}
