'use strict';
/* ===== Blades from the first legend =====
   Every blade a samurai made or won in the first game crosses over. They are HEIRLOOMS; the legendary
   and mythic ones are DYNASTY blades. They are a little stronger than the same blade made on this road,
   they are marked wherever a blade can be wagered, and on the road they wake town by town, so the
   Tokaido still has to be earned. In a duel between friends they fight at full strength. */
const HEIR_BONUS = { Dynasty: 1.10, Heirloom: 1.05 };
let HEIR_FULL = 0;
function heirClass(w) { if (!w || !w.heir) return null; const d = swordDef(w.id); return d && RAR[d.r].i >= RAR.legendary.i ? 'Dynasty' : 'Heirloom'; }
function heirTag(w, long) { const c = heirClass(w); if (!c) return ''; const col = c === 'Dynasty' ? '#ffd27a' : '#bfe0ff';
  return `<span class="tag" style="border-color:${col};color:${col};white-space:nowrap">${c === 'Dynasty' ? '王 DYNASTY' : '家 HEIRLOOM'}</span>${long ? `<small style="color:${col}">${c === 'Dynasty' ? 'A legendary blade from the first legend.' : 'A blade from the first legend.'} ${heirSleeps(w) ? 'On the road it is still waking. It grows with every town you reach and every blade you forge here, and stays a tenth stronger than the best of them.' : ''}</small>` : ''}`; }
/* an old blade is as awake as the road you have walked, or as the best blade you have made on it, whichever is more */
let _sd0 = null;
function heirCap() { const far = S.far || 0, road = S.swords.reduce((m, w) => w.heir && w.id !== 'nidai' || w.captured ? m : Math.max(m, _sd0(w)), 0); return Math.max(REF_BLADE[far] * 1.25, road); }
function heirSleeps(w) { HEIR_FULL++; const full = swordDmg(w); HEIR_FULL--; return swordDmg(w) < full - .5; }
{ const sd = _sd0 = swordDmg; swordDmg = function (w) { let d = sd(w); const c = heirClass(w); if (c) { if (w.id !== 'nidai' && !HEIR_FULL && !(typeof VsMode !== 'undefined' && MODE === VsMode)) d = Math.min(d, heirCap()); d *= HEIR_BONUS[c]; } return d; }; }
{ const ds = duelStats; duelStats = function (p) { HEIR_FULL++; try { return ds(p); } finally { HEIR_FULL--; } }; }
{ const dl = drawLoadout; drawLoadout = function () { HEIR_FULL++; try { return dl.apply(this, arguments); } finally { HEIR_FULL--; } }; }

/* bring every blade across; training starts again */
function heirBlades(o) { return (o.swords || []).filter(w => w && !w.captured && SWORDS.some(d => d.id === w.id && !d.wood && d.dmg > 0) && w.id !== 'iron'); }
function heirAdd(o, b) { const w = addSword(b.id); w.lvl = clamp(b.lvl | 0, 0, 10); if (Array.isArray(b.inf)) w.inf = b.inf.filter(m => MATERIALS[m]).slice(0, 8); if (b.q) w.q = Math.min(1.15, b.q); w.made = 1; if (b.won) w.won = b.won; if (b.maker) w.maker = b.maker;
  w.heir = { wins: o.wins | 0, parries: o.parries | 0, lands: (o.journey || []).filter(j => j && j.myth).length }; return w; }
importLegendSave = function (o) {
  S.name = String(o.name || 'Shep').slice(0, 14);
  if (o.seal && typeof o.seal === 'object') S.seal = cleanSeal(o.seal);
  if (o.pid) S.pid = String(o.pid).slice(0, 8);
  const got = heirBlades(o).map(b => heirAdd(o, b)); HEIR_FULL++; const best = got.slice().sort((x, y) => swordDmg(y) - swordDmg(x))[0]; HEIR_FULL--;
  if (best) S.eq = best.u;
  S.legend = { from: 1, v: 2, wins: o.wins | 0, lands: (o.journey || []).filter(j => j && j.myth).length, blades: got.length, dyn: got.filter(w => heirClass(w) === 'Dynasty').length };
  save();
  return { name: S.name, blade: best ? swordDef(best.id).name : null, lands: S.legend.lands, blades: got.length, dyn: S.legend.dyn };
};
/* a save imported before this rule: fetch the rest of the rack, and bring training back to what the road allows */
function heirMigrate() {
  if (typeof S === 'undefined' || !S.legend || S.legend.v === 2) return; const o = firstGameSave(), L = townLevel(S.far || 0) + 1;
  for (const k in S.sk) if (S.sk[k].l > L) S.sk[k] = { l: L, x: 0 };
  let n = S.swords.filter(w => w.heir).length; S.swords.forEach(w => { if (w.heir) w.made = 1; });
  if (o) { const have = S.swords.filter(w => w.heir).map(w => w.id + ':' + (w.lvl | 0)); heirBlades(o).forEach(b => { const k = b.id + ':' + clamp(b.lvl | 0, 0, 10), i = have.indexOf(k); if (i >= 0) { have.splice(i, 1); return; } heirAdd(o, b); n++; }); }
  S.legend.v = 2; S.legend.blades = n; S.legend.dyn = S.swords.filter(w => heirClass(w) === 'Dynasty').length; save(); S.legend.note = 1;
}
heirMigrate();
setInterval(() => { if (typeof S !== 'undefined' && S.legend && S.legend.note && typeof TOWN !== 'undefined' && TOWN && MODE === TownMode && !TOWN.paused && !TITLE_UP && !TOWN.cine) { delete S.legend.note;
  townSay('The first legend', `Your whole rack has crossed over from the first game: <b>${S.legend.blades}</b> blade${S.legend.blades === 1 ? '' : 's'}${S.legend.dyn ? `, ${S.legend.dyn} of them <b style="color:#ffd27a">Dynasty</b> blades` : ''}. They are marked in your blade rack and wherever a blade is wagered.<br><br>On the Tokaido an old blade wakes as you travel and as you forge: it is always a little stronger than the best blade you have made on this road, never far beyond it. Your training begins again: this road has to be earned. In a duel against a friend your blades fight at full strength.`); } }, 2000);

/* ===== The secret: a Dynasty blade, reforged by every master's hand ===== */
newBlade('nidai', 'Nidai, Blade of Two Legends', 'mythic', 128, '#fff4d6', '#ffd27a', 'A blade from the first legend, folded again on the Tokaido by the last master. No other sword has walked two roads.', 'all');
const DYN_COST = { gold: 5000, steel: 80 };
function dynBlade() { HEIR_FULL++; const w = S.swords.filter(x => heirClass(x) === 'Dynasty' && x.id !== 'nidai' && !x.captured).sort((a, b) => swordDmg(b) - swordDmg(a))[0]; HEIR_FULL--; return w || null; }
function dynNeed() { const o = Object.assign({}, masterMats(6, 'last')); for (const [m, n] of Object.entries(masterMats(3, 'blade'))) o[m] = (o[m] || 0) + n; return o; }
function dynCard() {
  const c = townCfg(), w = dynBlade(), st = masterSt('kyoto'); if (st.dyn || !w) return '';
  if (c.id !== 'kyoto') return `<small class="muted" style="display:block;margin-top:8px">The master's eyes stop on your <b style="color:#ffd27a">${swordDef(w.id).name}</b>. "That steel walked another road. Old Sanjō in Kyoto once spoke of folding two ages into one blade. Ask him, when you have learned from all of us."</small>`;
  const all = mastersLearned() >= 7, need = dynNeed(), ok = all && matsHave(need) && S.gold >= DYN_COST.gold && (S.steel || 0) >= DYN_COST.steel, d = swordDef('nidai');
  return `<div class="card" style="gap:8px;margin-bottom:10px;border-color:#ff5fb0"><div class="row between"><b class="name mythic">${d.name}</b><small class="muted">A secret</small></div>
    <small>"Give me your <b style="color:#ffd27a">${swordDef(w.id).name}${w.lvl ? ' +' + w.lvl : ''}</b>. I will not make you a new blade. I will fold this one again, with everything this road has taught you. It keeps its history and half its old forging, and becomes something no one else can own. You can forge it higher here."</small>
    <small>${all ? '✓' : '○'} <b>Learn a blade from every master on the road (${mastersLearned()}/7)</b></small>
    <small>${S.gold >= DYN_COST.gold ? '✓' : '○'} ${fmt(DYN_COST.gold)} gold (you have ${fmt(S.gold)}) · ${(S.steel || 0) >= DYN_COST.steel ? '✓' : '○'} ${DYN_COST.steel} steel (you have ${S.steel || 0})</small>
    <div class="row" style="gap:6px;flex-wrap:wrap">${matsList(need)}</div>
    <button class="btn ${ok ? 'primary' : ''}" data-town="master:dyn" ${ok ? '' : 'disabled'}>🔨 Reforge the Dynasty blade</button></div>`;
}
function dynForge() {
  const c = townCfg(), M = MASTERS[c.id], st = masterSt('kyoto'), w = dynBlade(), need = dynNeed();
  if (c.id !== 'kyoto' || st.dyn || !w || mastersLearned() < 7 || !matsHave(need) || S.gold < DYN_COST.gold || (S.steel || 0) < DYN_COST.steel) return true;
  closeOverlay(); if (TOWN) TOWN.paused = false; $('#leaveBtn').textContent = 'Leave';
  startForge({ kind: 'recipe', r: { id: 'nidai', sharpen: true }, master: Object.assign({}, M, MASTER_LAST), title: 'Nidai, Blade of Two Legends', onDone: g => {
    if (!matsHave(need) || S.gold < DYN_COST.gold || (S.steel || 0) < DYN_COST.steel || !S.swords.includes(w)) return { msg: 'Something is missing.' };
    for (const [m, n] of Object.entries(need)) S.mats[m] -= n; S.gold -= DYN_COST.gold; S.steel -= DYN_COST.steel;
    const old = swordDef(w.id).name; w.heir.was = w.id; w.id = 'nidai'; w.lvl = Math.ceil((w.lvl | 0) / 2); w.made = 1; w.q = Math.max(w.q || 1, g === 'Masterwork' ? 1.1 : g === 'Fine' ? 1.05 : 1); S.eq = w.u; st.dyn = true;
    if (S.seen && !S.seen.includes('nidai')) S.seen.push('nidai'); virtue('meiyo', 3, 'you forged the blade of two legends'); save();
    return { msg: `${M.n} lays down his hammer. Your ${old} is now Nidai, the Blade of Two Legends. It keeps its history and half its old forging, and wakes fully at once. There is no other like it.` }; } });
  return true;
}

/* ===== Full screen ===== */
function fsCan() { const d = document.documentElement, alone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone; return !alone && !!(d.requestFullscreen || d.webkitRequestFullscreen); }
function fsEnter(quiet) { const d = document.documentElement; if (!fsCan() || fsActive()) return; try { const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d, { navigationUI: 'hide' }); if (r && r.then) r.then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* */ } }).catch(() => { if (!quiet) toast('Full screen was blocked. Try Add to Home Screen.'); }); } catch (e) { if (!quiet) toast('Full screen is not available here. Try Add to Home Screen.'); } }
function fsSet(on) { S.fs = !!on; save(); if (on) fsEnter(false); else if (fsActive()) try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* */ } }
function fsCard() { if (!fsCan()) return ''; const on = fsActive(); return `<div class="card" style="gap:6px"><b>⛶ Full screen</b><small>${on ? 'The game fills the whole tablet.' : 'Hide the browser bars so the game fills the whole tablet.'} On a tablet it turns on by itself when you tap Continue.</small><button class="btn small ${on ? '' : 'primary'}" data-more="fs">${on ? 'Leave full screen' : 'Go full screen'}</button></div>`; }
{ const t2 = title2Click; title2Click = function (a) { if ((a === 'go' || a === 'bring') && S.fs !== false && matchMedia('(pointer: coarse)').matches) fsEnter(true); return t2.apply(this, arguments); }; }
{ // a button on the title screen too
  const b = document.createElement('button'); b.id = 'fs2'; b.className = 'btn small'; b.style.cssText = 'position:fixed;right:10px;bottom:8px;z-index:60'; b.hidden = true; document.body.appendChild(b);
  b.addEventListener('click', e => { e.stopPropagation(); fsSet(!fsActive()); });
  setInterval(() => { const show = fsCan() && typeof TITLE_UP !== 'undefined' && TITLE_UP; b.hidden = !show; if (show) b.textContent = fsActive() ? '🗗 Leave full screen' : '⛶ Full screen'; }, 500);
}
