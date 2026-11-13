'use strict';
/* ===== The road rewards training =====
   Enemies have a fixed strength for their town, set for a ronin who trains as he travels.
   Keep training and the road is fair; neglect it and blades snap and duels end fast.
   Gold only buys growth (forging). Armor and blades are earned. */

/* what a well-prepared ronin looks like on arriving in town i */
const REF_BLADE = [13, 19, 27, 36, 48, 62, 80];
function refStats(i) { const L = 1 + 1.1 * i; return { L, atk: REF_BLADE[i] * (1 + (L - 1) * .08), hp: 100 + (L - 1) * 12 + 40 + 18 * i }; }
function foeFix(st, i, boss) { const r = refStats(i); st.hp = Math.round(r.atk * st.hits); st.dmg = Math.round(r.hp * st.hit * 10) / 10; if (boss) st.breakAt = Math.round(REF_BLADE[i] * .7); st.rec = Math.round(r.atk); return st; }
function readyWord() { const c = townCfg(), r = refStats(c.i), p = stats(), k = (p.atk / styleDef().atk) / r.atk * .6 + p.maxHp / r.hp * .4; return k >= 1 ? ['Ready', '#9ff0c8', 'You are as strong as this town expects.'] : k >= .8 ? ['Nearly ready', '#ffd27a', 'Train a little more and forge your blade.'] : ['Not ready', '#ff9a7a', 'This town will break you. Train with the sensei and forge your blade.']; }

/* ---------- road warriors: two more duelists in every town ---------- */
const WARRIORS = [['Matasaburo', 'the Boaster'], ['Onatsu', 'the Quiet Blade'], ['Heihachi', 'of the Long Road'], ['Sayo', 'the Crane'], ['Gennosuke', 'the Debt Collector'], ['Tsuru', 'the Winter Wind'], ['Bunta', 'the Wrestler'], ['Okiyo', 'of the Ferry'], ['Shinza', 'the Left Hand'], ['Riku', 'the Fox Cub'], ['Daigoro', 'the Bell Ringer'], ['Ume', 'the Lantern'], ['Kanbei', 'the Gate Breaker'], ['Yae', 'the Last Petal']];
const WAR_WEAPON = [null, null, null, null, 'f-yari', 'f-nagi', 'f-axe', 'f-hook', 'f-nagi', 'f-yari'];
function warDef(k, ti) { const c = ti == null ? townCfg() : TOWNS[ti], n = c.i * 2 + k, w = c.i >= 4 ? WAR_WEAPON[(n - 4) % WAR_WEAPON.length] || 'f-yari' : null; return { id: 'w' + k, n: WARRIORS[n][0], title: WARRIORS[n][1], look: STAGES[(n * 5 + 3) % STAGES.length].look, sword: w || STAGES[(n * 5 + 3) % STAGES.length].sword, weapon: w }; }
function warFoe(k) { const D = warDef(k), st = townFoe('a'); return Object.assign(st, { town: D.id, name: D.n, title: D.title, look: D.look, sword: D.sword, weapon: D.weapon, hp: Math.round(st.hp * 1.12), gold: Math.round(st.gold * .6), stances: k ? ['low', 'mid', 'high', 'low'] : ['mid', 'high', 'mid'], intro: D.weapon ? `${D.n} wields the ${swordDef(D.weapon).name.toLowerCase()}, not a sword. ${WEAPON_TIP[WEAPON_FX[D.weapon]]}` : 'A wandering duelist. Read the stance over their head.' }); }
function warDone(k) { return ((S.town.war || []).includes(k)); }
function warsLeft() { return [0, 1].filter(k => !warDone(k)); }
function warPeople(T) {
  const used = [], ok = (x, z) => { const h = townH(x, z); return h > .12 && h < 3 && !T.pois.some(p => Math.hypot(p.x - x, p.z - z) < 5) && !T.W.obs.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 1) && !used.some(u => Math.hypot(u[0] - x, u[1] - z) < 14); };
  [0, 1].forEach(k => { if (warDone(k)) return; const D = warDef(k);
    for (const z of k ? [34, 24, 44, 8, -8] : [-46, -58, -34, -20, -66]) { const sd = k ? -1 : 1, x = townRoadX(z) + sd * 4.7; if (!ok(x, z)) continue; used.push([x, z]);
      const p = townNPC(D.id, x, z, D.look, D.sword, D.n, D.title + ' · road warrior', { ry: -sd * Math.PI / 2, map: 'Duelist', mapCol: '#ff9a7a' }); p.label = 'Challenge ' + D.n;
      p.act = () => townSay(D.n, [`No one walks past ${D.n} ${D.title} without crossing blades.`, 'The gate keeper sent word: he will only face a ronin who has beaten every duelist on this road. That includes me.'][k], [['fight:' + D.id, '⚔ Duel', 'primary'], ['', 'Not yet']]); break; } });
}
/* ---------- blades you can only earn ---------- */
function newBlade(id, name, r, dmg, blade, glow, lore, el) { if (SWORDS.find(s => s.id === id)) return; const b = SWORDS.find(s => s.id === 'sakura'); SWORDS.push(Object.assign({}, b, { id, name, r, dmg, blade, edge: '#ffffff', glow, lore, el: el || null, myth: 9, forged: true })); }
newBlade('t-bell0', 'Twin Bell of Hakone', 'rare', 24, '#d9c08a', '#ffe08c', 'Two samurai rang the cedar bells as one.');
newBlade('t-bell1', 'Twin Bell of Hara', 'rare', 32, '#e8d2a8', '#ffb07a', 'Rung at both ends of the golden plain.');
newBlade('t-bell2', 'Twin Bell of Shimada', 'epic', 42, '#bcd4e0', '#8fd0ff', 'Rung across the falling river.');
newBlade('t-bell3', 'Twin Bell of Miya', 'epic', 52, '#a8d8d0', '#7fe8d0', 'Rung over the turning tide.');
newBlade('t-bell4', 'Twin Bell of Seki', 'epic', 64, '#e8a878', '#e8862a', 'Rung under the maples, and no tanuki laughed.');
newBlade('t-bell5', 'Twin Bell of Otsu', 'legendary', 78, '#f2c8d8', '#ff9ec4', 'Rung from the hill and the shore of the lake.');
newBlade('t-bell6', 'Twin Bell of Kyoto', 'legendary', 96, '#f4f0e6', '#ffd27a', 'Rung by two friends at the end of the road.');
newBlade('t-niten', 'Two Heavens', 'legendary', 70, '#e6e6f0', '#bfe0ff', 'The hermit\'s own short sword, given to the ronin who passed his trial.');
newBlade('t-ghost', 'Ghost Cutter', 'epic', 54, '#cfeaff', '#9fe8ff', 'It has cut ten thieves that were never there.', 'spirit');
newBlade('t-lady', 'White Lady\'s Mercy', 'legendary', 74, '#ffffff', '#dfeaff', 'Left on the road by the Lady in White for one who answered her seven questions.', 'frost');
newBlade('t-leaf', 'Leaf That Is a Blade', 'epic', 58, '#8ab25a', '#b8e06a', 'Six tanuki, caught. This time the leaf was real.');
newBlade('t-fest', 'Ten Thousand Lanterns', 'legendary', 92, '#ffcf86', '#ffb060', 'Forged from the light of a festival that almost never happened.', 'fire');
function earnBlade(id, why) { if (!SWORDS.find(s => s.id === id) || S.swords.some(w => w.id === id) || (S.earned || []).includes(id)) return null; (S.earned = S.earned || []).push(id); const w = addSword(id); save(); setTimeout(() => { banner('New blade: ' + swordDef(id).name, why || ''); sfx.up && sfx.up(); }, 1800); return w; }
/* blades from the first legend that nothing else on the road hands out: one for each beast and each shrine puzzle */
function spareBlades() { const used = new Set(['bokken', 'iron']); TOWNS.forEach(t => { used.add(t.a.foe.sword); used.add(t.keeper.sword); used.add(t.myth.sword); }); Object.values(MASTERS).forEach(m => used.add(m.blade)); used.add(MASTER_LAST.blade); return SWORDS.filter(s => s.dmg > 0 && !used.has(s.id) && !s.foe && s.myth !== 9).sort((a, b) => a.dmg - b.dmg); }
function townBlade(i, kind) { const p = spareBlades(), n = p.length; if (!n) return null; const k = Math.min(n - 1, Math.round((i * 2 + (kind === 'beast' ? 1 : 0)) * (n - 1) / 13)); return p[k].id; }
/* ---------- the first armor is earned in the dojo ---------- */
function drillReward(kind) { S.drilled = S.drilled || {}; if (S.drilled[kind]) return; S.drilled[kind] = 1; const left = SLOTS.map(s => 'ashigaru-' + s.id).filter(id => !ownPiece(id)); if (left.length) { givePiece(left[0]); setTimeout(() => toast(`First ${TRAININGS[kind].name} drill: the sensei gives you ${PIECES[left[0]].n.toLowerCase()}.`), 2600); } save(); }
{ const ft = finishTraining; finishTraining = function () { const k = T && !T.done ? T.kind : null; ft(); if (k && typeof S !== 'undefined' && S.started) drillReward(k); }; }
/* ---------- results for road warriors, and milestone blades ---------- */
function road2Result() {
  const k = F.ctx.idx; if (k !== 'w0' && k !== 'w1') return false; hint('');
  const D = warDef(+k[1]), c = townCfg(), win = F.outcome === 'win';
  if (!win) return openOverlay(`<div class="modal"><div class="kicker lose">${F.broken ? 'Your blade snapped!' : 'Defeated'}</div><p>${F.broken ? `A weak blade cannot stand against ${D.n}. Forge a stronger one.` : `${D.n} was too strong this time.`} <b style="color:${readyWord()[1]}">${readyWord()[0]}</b>: ${readyWord()[2]}</p><div class="actions"><button class="btn primary" data-town="retry">Try again</button><button class="btn" data-town="back">Back to town</button></div></div>`), true;
  return openOverlay(`<div class="modal win"><div class="kicker">Victory!</div><p><b>${D.n}</b> ${D.title} drops to one knee.</p><p class="muted">What does a samurai do now?</p>
    <div class="choice2">
      <button class="card" data-town="wspare"><b>Sheathe your blade</b><small>${D.n} becomes a <b>friend on the road</b>, and will stand with you when the beast of ${c.n} comes.</small><small style="color:var(--jade)">Mercy +1 · friends: ${allies().length} → ${allies().length + 1}</small></button>
      <button class="card" data-town="wfinish"><b>Press your advantage</b><small>Take everything they carry and send them running. You will not see them again.</small><small style="color:var(--gold-2,#ffd27a)">+${Math.round(F.st.gold * .5)} extra gold, once</small></button>
    </div></div>`), true;
}
function road2After(choice) {
  const k = +F.ctx.idx[1], D = warDef(k), c = townCfg(), key = c.id + ':w' + k; let gold = F.st.gold;
  if (choice === 'wspare') { virtue('jin', 1, `you spared ${D.n}`); if (!allies().includes(key)) allies().push(key); } else { gold += Math.round(F.st.gold * .5); virtue('jin', -1, `you robbed ${D.n}`); }
  const steel = 3 + c.i, mats = Object.entries(rollDrops(c.i, 'fight')).map(([m, n]) => `<span class="chip">+${n} ${MATERIALS[m].n}</span>`).join(''), ups = ['power', 'speed', 'guard', 'vital'].filter(s => addSkillXP(s, 12));
  if (!warDone(k)) (S.town.war = S.town.war || []).push(k); S.gold += gold; S.steel = (S.steel || 0) + steel; S.wins++; coopEvent('win', { foe: F.st.name }); virtue('yu', 1, 'you answered a challenge'); save();
  openOverlay(`<div class="modal win"><div class="kicker">${choice === 'wspare' ? 'Mercy' : 'Victory'}</div><p><b>${D.n}</b> ${D.title} ${choice === 'wspare' ? 'bows low. "When the beast comes, call my name."' : 'runs and does not look back.'} ${warsLeft().length ? 'One duelist still bars the way.' : `Every duelist in ${c.n} has been faced. ${c.keeper.n} will hear of it.`}</p><div class="rewards"><span class="chip gold"><i></i>+${gold}</span><span class="chip steel"><i></i>+${steel} steel</span>${mats}${ups.length ? `<span class="chip">${ups.map(s => SKILLS[s].n).join(', ')} level up!</span>` : ''}</div><div class="actions"><button class="btn primary" data-town="back">Back to town</button></div></div>`);
}
setInterval(() => { // blades for deeds
  if (typeof S === 'undefined' || !S.started || typeof TOWN === 'undefined' || !TOWN || MODE !== TownMode || TOWN.paused) return;
  const c = townCfg(), J = S.town;
  if (J.duo) earnBlade('t-bell' + c.i, 'Two samurai rang the bells as one');
  if (S.dual) earnBlade('t-niten', 'The hermit\'s gift');
  if ((S.ghosts || 0) >= 10) earnBlade('t-ghost', 'Ten sword thieves banished');
  if ((S.ladies || []).length >= 7) earnBlade('t-lady', 'All seven of the Lady\'s questions answered');
  if (((S.towns.seki || {}).tans || []).length >= 6) earnBlade('t-leaf', 'Six tanuki caught');
  if (((S.towns.kyoto || {}).lit || []).length >= 5) earnBlade('t-fest', 'The festival relit');
  if (J.beast) { const b = townBlade(c.i, 'beast'); if (b) earnBlade(b, 'Taken from the beast\'s hoard'); }
  if (J.pz) { const b = townBlade(c.i, 'pz'); if (b) earnBlade(b, 'Hidden inside the shrine puzzle'); }
}, 1500);

/* ---------- twin bells: every town asks two samurai for something different ---------- */
const DUO_RULE = [
  ['Ring both bells within five seconds of each other.', 'together'],
  ['Call and answer: the south bell first. Let it fade for two seconds, then the far bell answers.', 'echo'],
  ['Four strokes: south, far, south, far. Take turns, and never wait more than four seconds.', 'four']];
function duoRule() { return DUO_RULE[S.cur % 3]; }
function duoRing(i, who) {
  const now = coopNow(), me = who === 'me', L = DUO.log = (DUO.log || []).filter(e => now - e.t < 14); L.push({ i, me, t: now });
  const n = L.length, a = L[n - 2], b = L[n - 1], pair = a && a.me !== b.me && a.i !== b.i, kind = duoRule()[1], fr = coopHere()[0];
  if (!fr && me) return toast('This takes two samurai, one at each bell. ' + duoRule()[0] + ' (Pack, then Together.)');
  if (kind === 'together') { if (pair && b.t - a.t < 5) return duoSolved(); return toast(me ? `Rung! ${fr.n} has five seconds to ring the other bell.` : `${who} rang the ${i ? 'far' : 'south'} bell! Ring the other one now!`); }
  if (kind === 'echo') {
    if (i === 0) return toast(me ? 'The south bell calls. Now your friend waits two seconds, then answers on the far bell.' : `${who} rang the south bell. Count two seconds, then answer on the far bell!`);
    if (pair && a.i === 0) { const d = b.t - a.t; if (d >= 2 && d < 7) return duoSolved(); DUO.log = []; return toast(d < 2 ? 'Too soon! Let the first bell fade for two seconds. Start again from the south bell.' : 'Too late, the call has faded. Start again from the south bell.'); }
    DUO.log = []; return toast('The south bell must call first.');
  }
  
  let run = 0; for (let k = Math.min(4, L.length); k >= 1; k--) { const s = L.slice(-k); if (s.every((e, j) => e.i === j % 2 && (!j || (e.me !== s[j - 1].me && e.t - s[j - 1].t < 4)))) { run = k; break; } }
  if (run >= 4) return duoSolved();
  if (!run) { DUO.log = []; return toast('The rhythm broke. Start again: south, far, south, far.'); }
  toast(`Stroke ${run} of 4. ${run % 2 ? 'Far' : 'South'} bell next!`);
}
/* ---------- friends: who you spared decides how hard the big duels are ----------
   The man you spared warns you about the keeper. The keeper you spared holds the spirit's gaze.
   The road warriors you spared stand with you against the beast. And every keeper on the road
   matters at the last gate in Kyoto. Without them those duels are much harder. */
const isFriend = (t, r) => allies().includes(t + ':' + r);
function friendNeed(role) { const c = townCfg(); return role === 'keeper' ? [['a', c.a.foe.n]] : role === 'myth' ? [['keeper', c.keeper.n]] : role === 'beast' ? [['w0', warDef(0).n], ['w1', warDef(1).n]] : []; }
function friendEdge(st, role) {
  if (window._rawFoe) return st;
  const c = townCfg(), help = [], miss = []; let hard = 0;
  friendNeed(role).forEach(([r, n]) => { if (isFriend(c.id, r)) help.push(n); else { miss.push(n); hard += role === 'beast' ? .16 : .32; } });
  if (role === 'keeper' && c.i === 6) { const k = TOWNS.slice(0, 6).filter(t => !isFriend(t.id, 'keeper')).length; hard += k * .06; if (k) miss.push(k === 1 ? 'one gate keeper' : k + ' gate keepers'); else help.push('every gate keeper on the Tokaido'); }
  st.hp = Math.round(st.hp * (1 + hard)); st.dmg = Math.round(st.dmg * (1 + hard * .5) * 10) / 10;
  st.friendMsg = miss.length ? `You face ${st.name} alone, and it will be much harder. ${miss.join(' and ')} would have stood with you, had you shown mercy.` : help.length ? `${help.join(' and ')} ${help.length > 1 || c.i === 6 && role === 'keeper' ? 'stand' : 'stands'} with you and call${help.length > 1 ? '' : 's'} out every trick. ${st.name} is weaker for it.` : '';
  return st;
}
function friendsHere() { return S.crew ? [] : allies().filter(a => a.startsWith(townCfg().id + ':')); } // friends the Red Geisha parted you from cannot help until you find them
{ const sb = startBattle; startBattle = function (st, ctx) { const r = sb.apply(this, arguments); if (ctx && ctx.kind === 'town') { const m = st.friendMsg || st.intro; if (m) setTimeout(() => { if (F && !F.over && F.st === st) toast(m); }, 3200); } return r; }; }
/* a friend from this town steps in, once per duel, when you would fall */
{ const df = defeat; defeat = function (reason) {
  if (reason === 'Defeated' && F && !F.over && !F.saved && F.ctx && F.ctx.kind === 'town' && !(typeof TEAM !== 'undefined' && TEAM && TEAM.on)) { const fr = friendsHere();
    if (fr.length) { F.saved = true; F.php = Math.round(F.ps.maxHp * .3); banner(allyName(fr[fr.length - 1]) + ' steps in!', 'Your friend turns the blow aside. Get up and finish it!'); sfx.parry && sfx.parry(); slowmo(.3, .9); friendStepIn(); return; } }
  df(reason); }; }
