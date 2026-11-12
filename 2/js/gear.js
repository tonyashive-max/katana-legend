'use strict';
/* ===== Katana Legend II: armor that matters, the seven virtues, and bringing a legend over from the first game ===== */

const SLOTS = [
  { id: 'kabuto', n: 'Helmet', jp: '兜', guards: 'Head', tip: 'Protects against head hits' },
  { id: 'menpo', n: 'Face mask', jp: '面', guards: 'Face', tip: 'Unsettles foes: they guard less well' },
  { id: 'do', n: 'Chest', jp: '胴', guards: 'Body', tip: 'Most of your health' },
  { id: 'sode', n: 'Shoulders', jp: '袖', guards: 'Arms', tip: 'Harder to lose an arm' },
  { id: 'kote', n: 'Sleeves', jp: '籠', guards: 'Forearms', tip: 'Stronger blocks' },
  { id: 'haidate', n: 'Thigh guards', jp: '佩', guards: 'Legs', tip: 'Harder to lose your legs' },
  { id: 'suneate', n: 'Shin guards', jp: '脛', guards: 'Shins', tip: 'Quicker steps' },
];
/* every town on the road has its own set; tonight's build holds the first two */
const SETS = {
  ashigaru: { n: 'Foot Soldier', r: 'common', col: '#6a5a44', trim: '#c9a35a', helm: 'kasa', helmCol: '#3a3026', town: 'Any armorer', bonus: 'Full set: +10% health', k: 1 },
  tengu: { n: 'Tengu', r: 'rare', col: '#2a2230', trim: '#ffb03a', helm: 'kabuto', helmCol: '#c0281e', crest: 'horns', crestCol: '#ffb03a', aura: '#ffb03a', town: 'Hakone', bonus: 'Full set: steps cost no stamina, +12% attack', k: 2.1 },
  fuji: { n: 'Fuji', r: 'rare', col: '#e5eef8', trim: '#5fb0ff', helm: 'kabuto', helmCol: '#d8e6f4', crest: 'moon', crestCol: '#8fd0ff', aura: '#bff4ff', town: 'Hara', bonus: 'Full set: cannot be frozen or shocked, +15% health', k: 2.6 },
  kappa: { n: 'Kappa', r: 'epic', col: '#3c8c6b', trim: '#f2dc8a', helm: 'kabuto', helmCol: '#2a6a4a', crest: 'crystal', crestCol: '#bfe2ee', aura: '#7fe8d0', town: 'Shimada', bonus: 'Full set: slowly heals during a fight', k: 3.1 },
  storm: { n: 'Storm Sailor', r: 'epic', col: '#2a3a7a', trim: '#fff27a', helm: 'kabuto', helmCol: '#1a2450', crest: 'moon', crestCol: '#fff27a', aura: '#8ab8ff', town: 'Miya', bonus: 'Full set: Spirit fills 30% faster', k: 3.6 },
  tanuki: { n: 'Tanuki', r: 'epic', col: '#8a6a3a', trim: '#e8dcc0', helm: 'kabuto', helmCol: '#6a4a2a', crest: 'flower', crestCol: '#e8b03a', aura: '#e8b03a', town: 'Seki', bonus: 'Full set: the first hit of every fight misses you', k: 4.1 },
  dragon: { n: 'Lake Dragon', r: 'legendary', col: '#1c1e2a', trim: '#7fd0ff', helm: 'kabuto', helmCol: '#12131b', crest: 'dragon', crestCol: '#7fd0ff', aura: '#7fd0ff', town: 'Otsu', bonus: 'Full set: parry window 20% wider', k: 4.7 },
  imperial: { n: 'Imperial', r: 'mythic', col: '#2a1a4a', trim: '#ffd84a', helm: 'kabuto', helmCol: '#120a22', crest: 'sun', crestCol: '#ffd84a', aura: '#ffd84a', town: 'Kyoto', bonus: 'Full set: every other set bonus at half strength', k: 5.4 },
};
const BASE = { kabuto: { hp: 6, head: .5, wt: 3 }, menpo: { hp: 3, fear: .06, wt: 1 }, do: { hp: 22, wt: 6 }, sode: { hp: 5, arms: .45, wt: 3 }, kote: { hp: 4, block: .05, wt: 2 }, haidate: { hp: 6, legs: .45, wt: 3 }, suneate: { hp: 4, step: .12, wt: 2 } };
const PIECES = {};
for (const set in SETS) for (const sl of SLOTS) {
  const b = BASE[sl.id], k = SETS[set].k, o = { id: set + '-' + sl.id, set, slot: sl.id, n: SETS[set].n + ' ' + sl.n.toLowerCase(), wt: set === 'ashigaru' ? b.wt : Math.max(1, b.wt - 1) };
  for (const key of ['hp', 'head', 'fear', 'arms', 'block', 'legs', 'step']) if (b[key]) o[key] = key === 'hp' ? Math.round(b[key] * k) : +(b[key] * (.6 + .4 * k)).toFixed(3);
  PIECES[o.id] = o;
}
const VIRTUES = [['gi', 'Justice', '義'], ['yu', 'Courage', '勇'], ['jin', 'Mercy', '仁'], ['rei', 'Respect', '礼'], ['makoto', 'Honesty', '誠'], ['meiyo', 'Honor', '名'], ['chugi', 'Loyalty', '忠']];

function gearInit() {
  if (!S.armor || typeof S.armor !== 'object') S.armor = { owned: [], eq: {} };
  if (!S.virt || typeof S.virt !== 'object') S.virt = {};
  VIRTUES.forEach(([k]) => { if (S.virt[k] == null) S.virt[k] = 0; });
  const fresh = () => ({ ema: [], chests: [], jobs: {} });
  if (!S.towns || typeof S.towns !== 'object') S.towns = { hakone: S.town && typeof S.town === 'object' ? S.town : fresh() };
  if (S.cur == null || !TOWNS[S.cur] || S.cur >= ROAD_OPEN) S.cur = 0;
  if (!S.towns[TOWNS[S.cur].id]) S.towns[TOWNS[S.cur].id] = fresh();
  S.town = S.towns[TOWNS[S.cur].id];
  { const h = S.towns.hakone; if (h) { if (h.tengu && !h.myth) h.myth = true; if (h.jobs.tea != null && h.jobs.a == null) h.jobs.a = h.jobs.tea; if (h.jobs.ema != null && h.jobs.b == null) h.jobs.b = h.jobs.ema; } }
  TOWNS.forEach((t, i) => { if ((S.towns[t.id] || {}).done) S.far = Math.max(S.far || 0, Math.min(ROAD_OPEN - 1, i + 1)); });
  if (!Array.isArray(S.allies)) S.allies = [];
  S.allies = S.allies.map(a => a.includes(':') ? a : 'hakone:' + ({ bandit: 'a', captain: 'keeper', tengu: 'myth' }[a] || a));
  if (S.started == null) S.started = false;
}
function virtue(k, n, why) {
  S.virt[k] = Math.max(0, (S.virt[k] || 0) + n); save();
  const v = VIRTUES.find(x => x[0] === k);
  setTimeout(() => toast(`${v[2]} ${v[1]} ${n > 0 ? '+' + n : n}${why ? ' · ' + why : ''}`), 500);
}
function ownPiece(id) { return S.armor.owned.includes(id); }
function givePiece(id, quiet) {
  if (!PIECES[id] || ownPiece(id)) return false;
  S.armor.owned.push(id);
  const p = PIECES[id], cur = PIECES[S.armor.eq[p.slot]];
  if (!cur || (cur.hp || 0) < (p.hp || 0)) S.armor.eq[p.slot] = id; // better piece goes straight on
  save(); if (!quiet) sfx.up();
  return true;
}
function wornPieces() { return SLOTS.map(s => PIECES[S.armor.eq[s.id]]).filter(Boolean); }
function setCount(set) { return wornPieces().filter(p => p.set === set).length; }
function fullSet() { for (const s in SETS) if (setCount(s) === 7) return s; return null; }
function armorTotals() {
  const t = { hp: 0, head: 0, fear: 0, arms: 0, block: 0, legs: 0, step: 0, wt: 0, n: 0 };
  wornPieces().forEach(p => { t.n++; const lg = (S.armor.leg || {})[p.set], f = (1 + .1 * (((S.armor.lvl || {})[p.id]) | 0)) * (lg ? 1.25 * lg : 1); for (const k in t) if (k !== 'n' && p[k]) t[k] += k === 'wt' ? p[k] : p[k] * f; });
  t.set = fullSet();
  return t;
}
/* three ways to carry a blade: the sensei in any town teaches them */
const STYLES = {
  katana: { n: 'Katana', jp: '刀', d: 'The balanced way. No weakness, no surprise.', atk: 1, cd: 1, sta: 1, parry: 1, len: 1 },
  nodachi: { n: 'Nodachi', jp: '野', d: 'A great sword on a long grip. Every cut hits 30% harder, but swings are slower and cost more stamina.', atk: 1.3, cd: 1.3, sta: 1.3, parry: .9, len: 1.3 },
  both: { n: 'Two Heavens', jp: '二', d: 'Both blades at once. Fast and strong, but it burns stamina every second.', atk: 1.4, cd: .7, sta: 1.5, parry: .8, len: 1 },
  kodachi: { n: 'Kodachi', jp: '小', d: 'A short, quick blade. Swings are 30% faster and parries are easier, but each cut does less.', atk: .78, cd: .7, sta: .8, parry: 1.2, len: .76 },
};
let STYLE_OVR = null;
function styleDef() { return STYLES[STYLE_OVR || S.style] || STYLES.katana; }
function styleRig(rig) { try { if (rig && rig.sword) rig.sword.scale.setScalar(styleDef().len); if (typeof dualHip === 'function') dualHip(rig); } catch (e) { /* */ } return rig; }
/* armor joins the numbers every fight already uses */
const baseStats = stats;
stats = function () {
  const st = baseStats(), a = armorTotals();
  const B = setBonus(a.set); st.bonus = B;
  st.maxHp = Math.round((st.maxHp + a.hp) * (1 + B.hp));
  st.atk *= 1 + B.atk; st.parry = Math.min(.8, st.parry * (1 + B.parry)); st.spiritGain *= 1 + B.spirit;
  st.block = Math.min(.92, st.block + a.block);
  st.staCost = st.staCost * (1 + a.wt * .012);
  { const y = styleDef(); st.atk *= y.atk; st.cd *= y.cd; st.staCost *= y.sta; st.parry = Math.min(.82, st.parry * y.parry); }
  st.armor = a;
  return st;
};
/* what you wear is what you look like */
const baseLook = lookFromOutfit;
lookFromOutfit = function (o) {
  const L = baseLook(o), eq = S.armor ? S.armor.eq : {};
  const chest = PIECES[eq.do], helm = PIECES[eq.kabuto], mask = PIECES[eq.menpo];
  if (chest) { const s = SETS[chest.set]; L.armor = s.col; L.trim = s.trim; if (fullSet() === chest.set && s.aura) L.aura = s.aura; }
  if (helm) { const s = SETS[helm.set]; L.helm = s.helm; L.helmCol = s.helmCol; L.crest = s.crest || null; L.crestCol = s.crestCol; }
  if (mask) L.mask = SETS[mask.set].helmCol;
  return L;
};
function setBonus(set) { const z = setBonus0(set); if ((S.armor.leg || {})[set]) for (const k of ['hp', 'atk', 'parry', 'spirit', 'regen']) z[k] *= 1.5; return z; }
function setBonus0(set) {
  const z = { hp: 0, atk: 0, parry: 0, spirit: 0, stepFree: 0, noFreeze: 0, regen: 0, dodge1: 0 };
  const one = { ashigaru: { hp: .1 }, tengu: { stepFree: 1, atk: .12 }, fuji: { noFreeze: 1, hp: .15 }, kappa: { regen: .012 }, storm: { spirit: .3 }, tanuki: { dodge1: 1 }, dragon: { parry: .2 } };
  if (set === 'imperial') { for (const k of ['tengu', 'fuji', 'kappa', 'storm', 'tanuki', 'dragon']) for (const q in one[k]) z[q] += one[k][q] * .5; z.stepFree = 1; z.noFreeze = 1; z.dodge1 = 1; return z; }
  return Object.assign(z, one[set] || {});
}
function applyArmorToFight() {
  const a = F.ps.armor || armorTotals();
  F.plimb.head *= 1 + a.head; F.plimb.armL *= 1 + a.arms; F.plimb.armR *= 1 + a.arms; F.plimb.legs *= 1 + a.legs;
  F.plimbMax = Math.max(F.plimbMax, F.plimb.armL, F.plimb.legs, F.plimb.head);
  const B = F.ps.bonus || setBonus(a.set);
  F.gear = { stepFree: !!B.stepFree, stepK: 1 - Math.min(.5, a.step), fear: a.fear, noFreeze: !!B.noFreeze, regen: B.regen, dodge1: !!B.dodge1 };
}

/* ---------- stances ---------- */
const STANCES = { high: { n: 'HIGH', g: '▲', beats: 'mid', tip: 'Heavy cuts. Beats MID.' }, mid: { n: 'MID', g: '●', beats: 'low', tip: 'Wide parry. Beats LOW.' }, low: { n: 'LOW', g: '▼', beats: 'high', tip: 'Quick cuts. Beats HIGH.' } };
function setStance(s) {
  if (!F || F.over || !STANCES[s]) return;
  F.stance = s; sfx.ui();
  document.querySelectorAll('#stanceBar button').forEach(b => b.classList.toggle('on', b.dataset.stance === s));
  if (F.drawn && !F.blocking && F.returnT <= 0) F.P.setHold(s === 'high' ? 'windH' : s === 'low' ? 'blockLow' : guardPose(), 8);
}
function stanceMul() {
  if (!F || !F.estance) return 1;
  if (STANCES[F.stance].beats === F.estance) return 1.35;
  if (STANCES[F.estance].beats === F.stance) return .8;
  return 1;
}
function foeStance() { if (F && F.st.town) { F.estance = pick(F.st.stances || ['high', 'mid', 'low']); } }

/* ---------- bring a legend over from the first game ---------- */
/* the first game's save, when both games are played on the same site */
function firstGameSave() { try { const o = JSON.parse(localStorage.getItem('shep-katana-legend-3d-v2')); return o && Array.isArray(o.swords) && o.sk && Array.isArray(o.journey) && (o.wins | 0) > 0 ? o : null; } catch (e) { return null; } }
async function importLegend(code) { return importLegendSave((await readBackupCode(code)).save); }
function importLegendSave(o) {
  const best = (o.swords || []).filter(w => !w.captured && SWORDS.some(d => d.id === w.id)).sort((x, y) => swordDmg(y) - swordDmg(x))[0];
  S.name = String(o.name || 'Shep').slice(0, 14);
  if (o.seal && typeof o.seal === 'object') S.seal = cleanSeal(o.seal);
  if (o.pid) S.pid = String(o.pid).slice(0, 8);
  if (o.sk) for (const k in S.sk) if (o.sk[k]) S.sk[k] = { l: clamp(o.sk[k].l | 0, 1, 30), x: 0 };
  if (best) {
    const w = addSword(best.id); w.lvl = clamp(best.lvl | 0, 0, 10); if (best.inf) w.inf = best.inf.slice(0, 8); if (best.q) w.q = Math.min(1.15, best.q);
    w.heir = { wins: o.wins | 0, parries: o.parries | 0, lands: (o.journey || []).filter(j => j && j.myth).length };
    S.eq = w.u;
  }
  S.legend = { from: 1, wins: o.wins | 0, lands: (o.journey || []).filter(j => j && j.myth).length };
  save();
  return { name: S.name, blade: best ? swordDef(best.id).name : null, lands: S.legend.lands };
}

/* ---------- where every piece comes from ---------- */
function mythHint(tw, J) { return tw.myth.after && !J.pass ? `Something in ${tw.n} is not what it seems. Win your duel with ${tw.keeper.n} first` : `Beat ${tw.myth.n}, ${tw.myth.title}`; }
function pieceHint(id) {
  const p = PIECES[id], poi = k => TOWN && TOWN.pois.find(q => q.id === k);
  if (p.set === 'ashigaru') return { t: 'The armorer in any town sells it for 60 gold', at: () => poi('smith') };
  const tw = TOWNS.find(t => t.set === p.set), here = tw === townCfg(), J = S.towns[tw.id] || { ema: [], jobs: {} };
  if (!here) return { t: `Found in ${tw.n}${tw.i > (S.far || 0) ? ', further down the road' : ': travel there from the Map'}`, at: () => null };
  return {
    kote: { t: !J.jobs.a ? `${tw.a.n} needs help` : `Beat ${tw.a.foe.n}, ${tw.a.foe.title}`, at: () => !J.jobs.a ? poi('a') : poi('foe') },
    sode: { t: J.ema.length >= 3 ? `Bring the ${tw.b.thing} to ${tw.b.n}` : !J.jobs.b ? `${tw.b.n} needs help` : `Find the glowing ${tw.b.thing} (${J.ema.length}/3)`, at: () => J.ema.length >= 3 || !J.jobs.b ? poi('b') : TOWN && TOWN.pois.filter(q => q.kind === 'ema').sort((x, y) => Math.hypot(x.x - TOWN.pos.x, x.z - TOWN.pos.z) - Math.hypot(y.x - TOWN.pos.x, y.z - TOWN.pos.z))[0] },
    do: { t: `Win your duel with ${tw.keeper.n} ${tw.keeper.where || 'at the gate'}`, at: () => poi('keeper') },
    kabuto: { t: mythHint(tw, J), at: () => poi('myth') || poi('keeper') }, menpo: { t: mythHint(tw, J), at: () => poi('myth') || poi('keeper') },
    haidate: { t: (tw.lay || LAY0).chestHint[0], at: () => poi('c0') }, suneate: { t: (tw.lay || LAY0).chestHint[1], at: () => poi('c1') },
  }[p.slot];
}
function allies() { return S.allies || (S.allies = []); }

/* ---------- the travel pack: three scrolls ---------- */
let PACK_TAB = 'sam', PACK_SLOT = null;
function openPack(tab) {
  if (tab) PACK_TAB = tab;
  if (TOWN) { TOWN.paused = true; TOWN.joy = null; TOWN.look = null; }
  const tabs = [['map', 'Map', '図'], ['sam', 'Samurai', '侍'], ['jour', 'Journal', '記'], ['co', 'Together', '友'], ['more', 'Legend', '伝']];
  const body = PACK_TAB === 'map' ? packMap() : PACK_TAB === 'jour' ? packJournal() : PACK_TAB === 'co' ? packCoop() : PACK_TAB === 'more' ? packMore() : packSamurai();
  openOverlay(`<div class="modal pack" style="text-align:left">
    <div class="pack-tabs">${tabs.map(([k, n, g]) => `<button class="pack-tab ${PACK_TAB === k ? 'on' : ''}" data-pack="${k}"><b>${g}</b>${n}</button>`).join('')}<button class="btn small" data-pack="close" style="margin-left:auto">Back to the road</button></div>
    ${body}</div>`);
}
function closePack() { closeOverlay(); PACK_SLOT = null; if (TOWN) { TOWN.paused = false; townRefreshPlayer(); } }
function pieceLine(p) {
  const bits = [`+${p.hp} health`]; if (p.head) bits.push('head guard'); if (p.arms) bits.push('arm guard'); if (p.legs) bits.push('leg guard'); if (p.block) bits.push(`+${Math.round(p.block * 100)}% block`); if (p.step) bits.push('quicker steps'); if (p.fear) bits.push('unsettles foes');
  return bits.join(' · ') + ` · weight ${p.wt}`;
}
function packSamurai() {
  const st = stats(), a = st.armor, w = eqSword(), d = swordDef(w.id);
  if (PACK_SLOT === 'blade') {
    const mine = usableSwords().slice().sort((x, y) => swordDmg(y) - swordDmg(x));
    return `<div class="eyebrow">刀 Your blades</div><p class="muted" style="margin:4px 0 10px">Every warrior you beat on the road hands over their blade. ${mine.length < 2 ? 'You have only the one you started with so far: win duels to earn more.' : 'Tap one to carry it.'}</p>
      <div class="stack">${mine.map(x => { const dd = swordDef(x.id); return `<button class="card ${x.u === S.eq ? 'sel' : ''}" data-carry-blade="${x.u}" style="text-align:left"><div class="row between"><b class="name ${dd.r}" style="${dd.r !== 'mythic' ? `color:${RAR[dd.r].c}` : ''}">${dd.name}${x.lvl ? ' +' + x.lvl : ''}</b><small>${RAR[dd.r].n} · ${Math.round(swordDmg(x))} damage</small></div>${bladeSVG(dd)}<small>${x.u === S.eq ? '✓ Carrying' : 'Tap to carry'}${x.heir ? ' · heirloom from the first game' : ''}</small></button>`; }).join('')}
      <button class="btn small" data-pack-slot="">◀ Back</button></div>`;
  }
  if (PACK_SLOT) {
    const sl = SLOTS.find(s => s.id === PACK_SLOT), mine = S.armor.owned.map(id => PIECES[id]).filter(p => p.slot === PACK_SLOT);
    return `<div class="eyebrow">${sl.jp} ${sl.n} · guards your ${sl.guards.toLowerCase()}</div><p class="muted" style="margin:4px 0 10px">${sl.tip}.</p>
      <div class="stack">${mine.length ? mine.map(p => `<button class="card ${S.armor.eq[p.slot] === p.id ? 'sel' : ''}" data-wear-piece="${p.id}" style="text-align:left"><b style="color:${RAR[SETS[p.set].r].c}">${p.n}</b><small>${pieceLine(p)}</small><small>${S.armor.eq[p.slot] === p.id ? '✓ Wearing' : 'Tap to wear'}</small></button>`).join('') : '<p class="muted">You have no piece for this slot yet.</p>'}
      ${Object.keys(SETS).map(k => PIECES[k + '-' + PACK_SLOT]).filter(p => !ownPiece(p.id)).map(p => `<div class="card" style="gap:6px"><b style="color:${RAR[SETS[p.set].r].c}">${p.n}</b><small>${pieceHint(p.id).t}.</small><button class="btn small primary" data-track="${p.id}">Guide me there</button></div>`).join('')}
      ${S.armor.eq[PACK_SLOT] ? `<button class="btn small" data-wear-piece="none">Take it off</button>` : ''}<button class="btn small" data-pack-slot="">◀ All armor</button></div>`;
  }
  return `<div class="row between"><h2>${esc(S.name || 'Shep')}</h2><span class="muted">Power ${playerPower()}</span></div>
    <div class="stats" style="margin:10px 0;grid-template-columns:repeat(4,minmax(0,1fr))"><div class="stat"><b>${st.maxHp}</b><span>Health</span></div><div class="stat"><b>${Math.round(st.atk)}</b><span>Attack</span></div><div class="stat"><b>${Math.round(st.block * 100)}%</b><span>Block</span></div><div class="stat"><b>${a.wt}</b><span>Weight</span></div></div>
    <p class="muted" style="font-size:13px;margin:0 0 8px">Tap a piece to change it. Heavier armor makes every swing cost more stamina.</p>
    <div class="slot-grid">${SLOTS.map(s => { const p = PIECES[S.armor.eq[s.id]]; return `<button class="slot-card ${p ? 'full' : ''}" data-pack-slot="${s.id}"><span class="kj">${s.jp}</span><b>${s.n}</b><small style="${p ? `color:${RAR[SETS[p.set].r].c}` : ''}">${p ? SETS[p.set].n : 'Empty'}</small></button>`; }).join('')}
      <button class="slot-card full blade" data-pack-slot="blade"><span class="kj">刀</span><b>${d.name}${w.lvl ? ' +' + w.lvl : ''}</b><small>${Math.round(swordDmg(w) * styleDef().atk)} damage · ${styleDef().n}${S.dual ? ' + ' + STYLES[S.style2 || 'kodachi'].n : ''} · ${usableSwords().length} blade${usableSwords().length === 1 ? '' : 's'}</small></button></div>
    ${w.heir ? `<p class="muted" style="font-size:13px;margin-top:8px">Engraved on the tang: carried through ${w.heir.lands} of seven lands and ${w.heir.wins} victories in the rescue of Princess Hana.</p>` : ''}
    <h3 style="margin-top:14px">Sets</h3>
    <div class="stack" style="gap:8px">${Object.keys(SETS).map(k => { const n = setCount(k), own = S.armor.owned.filter(id => PIECES[id].set === k).length; return `<div class="card" style="gap:4px"><div class="row between"><b style="color:${RAR[SETS[k].r].c}">${SETS[k].n}</b><span class="muted">wearing ${n}/7 · own ${own}/7</span></div><div class="bar"><i style="width:${n / 7 * 100}%"></i></div><small class="${n === 7 ? '' : 'muted'}" style="${n === 7 ? 'color:var(--jade)' : ''}">${n === 7 ? '✓ ' : ''}${SETS[k].bonus}</small>
      ${own < 7 ? `<div class="hints">${SLOTS.map(s => { const p = PIECES[k + '-' + s.id]; return ownPiece(p.id) ? `<div class="hint-row got"><span class="kj">${s.jp}</span><span>${s.n}</span><b>✓</b></div>` : `<div class="hint-row"><span class="kj">${s.jp}</span><span>${s.n}: ${pieceHint(p.id).t}</span><button class="btn small primary" data-track="${p.id}">Guide me</button></div>`; }).join('')}</div>` : ''}</div>`; }).join('')}</div>`;
}
function packJournal() {
  const T = S.town, jobs = townJobs();
  return `<h2>Journal</h2>
    <h3 style="margin-top:10px">The seven virtues</h3>
    <div class="virt">${VIRTUES.map(([k, n, g]) => `<div class="petal ${S.virt[k] ? 'on' : ''}"><span>${g}</span><b>${n}</b><small>${S.virt[k] || 0}</small></div>`).join('')}</div>
    <h3 style="margin-top:14px">Friends on the road</h3>
    <p class="muted">${allies().length ? `<b style="color:var(--jade)">${allies().map(allyName).join(', ')}</b>. Each friend you spared cheers you on: you start every duel with ${Math.min(100, allies().length * 25)}% Spirit.` : 'None yet. A foe you spare becomes a friend, and each friend fills a quarter of your Spirit at the start of every duel.'}</p>
    <h3 style="margin-top:14px">${townCfg().n}</h3>
    <ul class="checks">${jobs.map(j => `<li class="${j.done ? 'ok' : ''}"><span>${j.done ? '✓' : '○'}</span>${j.t}</li>`).join('')}</ul>
    <h3 style="margin-top:14px">Road Notes</h3>
    ${TOWNS.filter(t => (S.towns[t.id] || {}).note).map(t => `<p class="muted"><b style="color:var(--gold-2,#ffd27a)">${t.note[0][0].toUpperCase() + t.note[0].slice(1)}.</b> ${t.note[1]}</p>`).join('') || '<p class="muted">Road Notes appear here as you learn the true history of each town.</p>'}`;
}
function packMap() {
  const sx = x => 160 + x * 1.5, sy = z => 150 - z * 1.5, tg = townTarget();
  const dots = TOWN ? TOWN.pois.filter(p => p.map).map(p => `<circle cx="${sx(p.x)}" cy="${sy(p.z)}" r="5" fill="${p.col || '#ffd27a'}"/><text x="${sx(p.x) + 8}" y="${sy(p.z) + 4}" font-size="10" fill="#f3e8cf">${p.map}</text>`).join('') : '';
  const road = []; for (let z = -90; z <= 90; z += 6) road.push(`${sx(townRoadX(z))},${sy(z)}`);
  const cf = townCfg(), fx = cf.flip;
  return `<h2>${cf.n}</h2><p class="muted" style="margin:4px 0 8px">${esc(townObjective())}</p>
    <svg viewBox="0 0 320 300" style="width:100%;max-width:520px;display:block;margin:0 auto;background:#1b2a3a;border-radius:12px" role="img" aria-label="Map of ${cf.n}">
      ${cf.mapBg ? cf.mapBg(sx, sy) : `${cf.water ? `<path d="M0 0 H70 Q96 90 78 170 Q66 240 84 300 H0 Z" fill="#2f5f7a" transform="${fx < 0 ? 'translate(320 0) scale(-1 1)' : ''}"/>` : ''}
      <polyline points="${road.join(' ')}" fill="none" stroke="#c9b48c" stroke-width="5"/>
      <line x1="${sx(-30)}" y1="${sy(60)}" x2="${sx(30)}" y2="${sy(60)}" stroke="#5a3a26" stroke-width="3"/>`}
      ${dots}
      ${tg ? `<circle cx="${sx(tg.x)}" cy="${sy(tg.z)}" r="9" fill="none" stroke="#ff7a5a" stroke-width="2"/>` : ''}
      ${TOWN ? coopHere().map(p => `<circle cx="${sx(p.x)}" cy="${sy(p.z)}" r="5" fill="#9ff0c8" stroke="#0b0d18"/><text x="${sx(p.x) + 8}" y="${sy(p.z) + 4}" font-size="10" fill="#9ff0c8">${esc(p.n)}</text>`).join('') : ''}
      ${TOWN ? `<path d="M0 -8 L6 7 L0 3 L-6 7 Z" fill="#fff" transform="translate(${sx(TOWN.pos.x)} ${sy(TOWN.pos.z)}) rotate(${-TOWN.face * 180 / Math.PI + 180})"/>` : ''}
    </svg>
    <p class="muted" style="font-size:13px;margin-top:8px">White arrow: you. Red ring: where to go next.</p>
    <h3 style="margin-top:12px">The Tokaido road</h3>
    <div class="stack" style="gap:6px">${TOWNS.map((t, i) => { const open = i <= (S.far || 0), J = S.towns[t.id] || {}, own = S.armor.owned.filter(id => PIECES[id].set === t.set).length; return `<div class="row between" style="gap:8px;opacity:${open ? 1 : .5}"><span><b>${t.jp} ${t.n}</b> <small class="muted">· ${SETS[t.set].n} set ${own}/7${J.done ? ' · ✓ passed' : ''}</small></span>${i === S.cur ? '<span class="tag new">You are here</span>' : open && own >= 7 ? `<button class="btn small" data-travel="${i}">Travel</button>` : open ? `<small class="muted">Walk the road · travel opens at 7/7</small>` : `<small class="muted">${i >= ROAD_OPEN ? 'Being built' : 'Not reached yet'}</small>`}</div>`; }).join('')}</div>`;
}
function packClick(d) {
  if (d.coop) return coopClick(d.coop);
  if (d.team) return teamClick(d.team);
  if (d.more) return moreClick(d.more);
  if (d.pack) { if (d.pack === 'close') closePack(); else { PACK_SLOT = null; openPack(d.pack); } return true; }
  if (d.packSlot != null) { PACK_SLOT = d.packSlot || null; openPack('sam'); return true; }
  if (d.wearPiece) { if (d.wearPiece === 'none') delete S.armor.eq[PACK_SLOT]; else { const p = PIECES[d.wearPiece]; if (p && ownPiece(p.id)) S.armor.eq[p.slot] = p.id; } save(); sfx.up(); PACK_SLOT = null; openPack('sam'); return true; }
  if (d.carryBlade) { const x = S.swords.find(v => v.u === +d.carryBlade); if (x && !x.captured) { S.eq = x.u; save(); sfx.up(); } PACK_SLOT = null; openPack('sam'); return true; }
  if (d.track) { S.town.track = d.track; save(); closePack(); toast(`Follow the red arrow: ${PIECES[d.track].n}`); return true; }
  if (d.travel != null) { const i = +d.travel, t = TOWNS[i]; if (!t || (!d.friend && S.armor.owned.filter(id => PIECES[id].set === t.set).length < 7)) return true; closeOverlay(); PACK_SLOT = null; townTravel(i); return true; }
  if (d.stance) { setStance(d.stance); return true; }
  return false;
}
gearInit();
