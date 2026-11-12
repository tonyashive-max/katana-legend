'use strict';
/* ===== Everything the first legend had, on the road =====
   Backups and settings, duels against a friend, the blade collection, shrine puzzles, roaming beasts
   with weapons you cannot collect, the opening story, the first lesson, and two swords that move as two. */

/* ---------- weapons only enemies carry ---------- */
function foeWeapon(id, name, pole, o) { FOE_WEAPONS[id] = Object.assign({}, SWORDS.find(s => s.id === 'ogre'), { id, name, pole, club: false, foe: true, lore: '' }, o || {}); }
foeWeapon('f-yari', 'Hunting Spear', 'yari', { blade: '#d8dde6', edge: '#ffffff', wrap: '#4a2e1c', tsuba: '#c9a35a', glow: '#bfe0ff' });
foeWeapon('f-nagi', 'War Glaive', 'nagi', { blade: '#cfd6e0', edge: '#ffffff', wrap: '#3a1a1a', tsuba: '#c4302a', glow: '#ff9a7a' });
foeWeapon('f-axe', 'Ox Axe', 'axe', { blade: '#8a8f9a', edge: '#e8eef6', wrap: '#3a2416', tsuba: '#5a3a26', glow: '#7fd0ff' });
foeWeapon('f-maul', 'Great Mallet', 'maul', { blade: '#6a4a30', edge: '#c9a35a', wrap: '#3a2416', tsuba: '#c9a35a', glow: '#e8b03a' });
foeWeapon('f-hook', 'Centipede Hook', 'hook', { blade: '#4a5a3a', edge: '#b8e06a', wrap: '#1c2414', tsuba: '#8a2a2a', glow: '#a8ff6a' });
foeWeapon('f-tetsu', 'Iron Tetsubo', 'tetsu', { blade: '#3a3a44', edge: '#8a8a96', wrap: '#1c1410', tsuba: '#8a1d12', glow: '#ff5a3a' });
function buildPole(def) {
  const g = new THREE.Group(), k = def.pole, it = [P(GEO.cyl(.024, .028, k === 'axe' || k === 'maul' ? 1.1 : 1.5, 8), def.wrap, [0, k === 'axe' || k === 'maul' ? .3 : .5, 0]), P(GEO.cyl(.036, .036, .04, 8), def.tsuba, [0, 0, 0])];
  let len = 1.5;
  if (k === 'yari') { it.push(P(GEO.cone(.05, .46, 4), def.blade, [0, 1.48, 0]), P(GEO.cyl(.04, .05, .08, 6), def.tsuba, [0, 1.25, 0]), P(GEO.box(.3, .03, .03), def.edge, [0, 1.3, 0])); len = 1.7; }
  else if (k === 'nagi') { it.push(P(GEO.box(.09, .62, .022), def.blade, [.03, 1.52, 0], [0, 0, -.12]), P(GEO.box(.03, .6, .026), def.edge, [.08, 1.54, 0], [0, 0, -.16]), P(GEO.cone(.05, .2, 4), def.blade, [.09, 1.9, 0], [0, 0, -.3]), P(GEO.cyl(.06, .06, .03, 10), def.tsuba, [0, 1.2, 0])); len = 1.95; }
  else if (k === 'axe') { it.push(P(GEO.box(.42, .34, .04), def.blade, [.2, .82, 0]), P(GEO.box(.06, .4, .05), def.edge, [.42, .82, 0]), P(GEO.box(.14, .16, .06), def.tsuba, [-.06, .82, 0])); len = 1.05; }
  else if (k === 'maul') { it.push(P(GEO.cyl(.17, .17, .5, 10), def.blade, [0, .9, 0], [0, 0, Math.PI / 2]), P(GEO.cyl(.18, .18, .05, 10), def.edge, [.24, .9, 0], [0, 0, Math.PI / 2]), P(GEO.cyl(.18, .18, .05, 10), def.edge, [-.24, .9, 0], [0, 0, Math.PI / 2])); len = 1.1; }
  else if (k === 'hook') { it.push(P(GEO.box(.05, .5, .02), def.blade, [0, 1.42, 0]), P(GEO.box(.3, .05, .02), def.blade, [.13, 1.66, 0]), P(GEO.cone(.04, .26, 4), def.edge, [.28, 1.54, 0], [0, 0, Math.PI]), P(GEO.cone(.03, .2, 4), def.edge, [-.08, 1.3, 0], [0, 0, 1.2])); len = 1.7; }
  else { it.push(P(GEO.cyl(.1, .06, .9, 6), def.blade, [0, 1.0, 0])); for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) { const a = j / 6 * 6.283 + i * .5; it.push(P(GEO.cone(.02, .07, 5), def.edge, [Math.cos(a) * .08, .68 + i * .15, Math.sin(a) * .08], [0, -a, Math.PI / 2, 'YXZ'])); } len = 1.5; }
  const geo = merge(it), mat = toon({ vertexColors: true }), mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.add(new THREE.Mesh(geo, outlineMat(.005)));
  g.add(mesh); g.userData.len = len; g.userData.mat = mat; return g;
}
/* ---------- roaming beasts: one hunts each town ---------- */
const BEASTS2 = {
  hakone: { n: 'Yamawaro', title: 'the Wild One of the Cedars', w: 'f-maul', look: 0, tint: { armor: '#6a4a2a', skin: '#8a6a3a', aura: '#e8b03a' }, tip: 'A mallet is slow but breaks a block. When the ring is red, step aside!' },
  hara: { n: 'Ōkami', title: 'Wolf of the Golden Plain', w: 'f-yari', look: 1, tint: { armor: '#c9c2b0', skin: '#e8e2d0', aura: '#bfe0ff' }, tip: 'A spear strikes from far away and fast. Parry the thrust, then answer.' },
  shimada: { n: 'Ushi-oni', title: 'the Ox Demon of the Oi', w: 'f-axe', look: 0, tint: { armor: '#3a4a5a', skin: '#5a6a7a', aura: '#7fd0ff' }, tip: 'Its axe comes in wide arcs. Read HIGH or LOW over its head.' },
  miya: { n: 'Isonade', title: 'Raider of the Tide', w: 'f-nagi', look: 3, tint: { armor: '#2a4a7a', skin: '#7fb0c8', aura: '#7fe8d0' }, tip: 'A glaive sweeps low. Change your lead foot and keep moving.' },
  seki: { n: 'Nurikabe', title: 'the Wall That Walks', w: 'f-tetsu', look: 4, tint: { armor: '#8a8a84', skin: '#b8b4aa', aura: '#e8e2d0' }, tip: 'It hardly feels a cut. Break its stance: HIGH beats LOW, LOW beats MID, MID beats HIGH.' },
  otsu: { n: 'Ōmukade', title: 'Great Centipede of the Lake', w: 'f-hook', look: 5, tint: { armor: '#3a4a2a', skin: '#6a8a3a', aura: '#a8ff6a' }, tip: 'Its hook drags your guard open. Two blades answer it best.' },
  kyoto: { n: 'Ibaraki', title: 'Ogre of the Capital Gate', w: 'f-tetsu', look: 0, tint: { armor: '#7a1a1a', skin: '#c8321e', aura: '#ff5a2a' }, tip: 'The strongest thing on the road that is not a dragon. Everything you have learned.' },
};
function beastFoe() {
  const c = townCfg(), B = BEASTS2[c.id], st = townFoe('myth');
  return Object.assign(st, { town: 'beast', name: B.n, title: B.title, look: Object.assign({}, MYTHS[B.look].look, B.tint), sword: B.w, weapon: B.w, scale: 1.55, hp: Math.round(st.hp * .8), dragon: false, orochi: false, teleport: 0, freeze: false, shock: false, bowWeak: false, fury: .35, gold: 260 + c.i * 40, intro: B.tip });
}
function beastSpot(T) { for (const [x, z] of [[-24, -62], [24, -62], [-26, -20], [26, -20], [-26, 24], [28, 26], [0, -70]]) { let ok = true; for (let a = 0; a < 8 && ok; a++) { const h = townH(x + Math.cos(a * .785) * 7, z + Math.sin(a * .785) * 7); if (h < .12 || h > 5) ok = false; } if (ok && !T.W.obs.some(o => Math.hypot(o.x - x, o.z - z) < 4 && o.r > 1.4)) return [x, z]; } return null; }
function beastPeople(T) {
  const c = townCfg(), B = BEASTS2[c.id]; T.beast = null; if (!B || S.town.beast) return; const sp = beastSpot(T); if (!sp) return;
  const rig = new Samurai(Object.assign({}, MYTHS[B.look].look, B.tint), swordDef(B.w), { noSaya: true }); rig.root.rotation.order = 'YXZ'; rig.root.scale.setScalar(1.5); rig.setHold('shoulder', 6); T.grp.add(rig.root);
  const lab = labelSprite(B.n, '#ff9a7a', 'Roaming beast'); T.grp.add(lab);
  T.beast = { rig, lab, cx: sp[0], cz: sp[1], x: sp[0] + 6, z: sp[1], a: 0, state: 'roam', t: 0, ph: 0, nap: 0 };
}
function beastTick(dt, T) {
  const b = T.beast; if (!b || T.enc || window.__noBeast) return; b.t += dt; if (b.nap > 0) b.nap -= dt;
  const d = Math.hypot(T.pos.x - b.x, T.pos.z - b.z); let tx, tz, v;
  if (b.state === 'roam') { b.a += dt * .22; tx = b.cx + Math.cos(b.a) * 6; tz = b.cz + Math.sin(b.a) * 6; v = 1.6; if (d < 15 && b.nap <= 0 && isArmed() && !T.boat && !T.lift) { b.state = 'notice'; b.t = 0; sfx.taiko && sfx.taiko(1.2); shake(.12); banner(`${BEASTS2[townCfg().id].n} has seen you!`, 'Fight it or run'); } }
  else if (b.state === 'notice') { tx = b.x; tz = b.z; v = 0; if (b.t > 1.1) b.state = 'chase'; }
  else { tx = T.pos.x; tz = T.pos.z; v = 4.3; if (d > 34 || T.boat || T.lift) { b.state = 'roam'; banner('You escaped!', 'It lost your trail'); } else if (d < 2.2 && !T.paused) { b.state = 'roam'; b.nap = 60; S.town.at = { x: T.pos.x, z: T.pos.z, yaw: T.face }; S.town.day = T.day; sfx.taiko && sfx.taiko(1.5); if (!teamInvite('beast')) startBattle(beastFoe(), { kind: 'town', idx: 'beast', ch: 1, from: 'town' }); return; } }
  const dx = tx - b.x, dz = tz - b.z, l = Math.hypot(dx, dz), R = b.rig, k = Math.min(1, v / 3);
  if (l > .05 && v > 0) { const nx = b.x + dx / l * v * dt, nz = b.z + dz / l * v * dt, h = townH(nx, nz); if (h > (T.W.minH == null ? -.35 : T.W.minH) && h < 15) { b.x = nx; b.z = nz; } R.root.rotation.y = Math.atan2(dx, dz); } else if (b.state === 'notice') R.root.rotation.y = Math.atan2(T.pos.x - b.x, T.pos.z - b.z);
  b.ph += k * dt * 8; R.root.position.set(b.x, townH(b.x, b.z), b.z);
  R.feet.L.set(.15, .035 + Math.max(0, Math.sin(b.ph)) * .14 * k, Math.sin(b.ph) * .3 * k); R.feet.R.set(-.15, .035 + Math.max(0, -Math.sin(b.ph)) * .14 * k, -Math.sin(b.ph) * .3 * k); R.leanAdd = k * .12; R.update(dt);
  b.lab.position.set(b.x, townH(b.x, b.z) + 3.6, b.z);
}
/* ---------- shrine puzzles, solved alone or together ---------- */
function puzzlePeople(T) {
  const c = townCfg(), b = T.pois.find(p => p.id === 'b'); if (!b) return; const x = b.x - 3.6, z = b.z - 3.2, y = townH(x, z);
  const m = new THREE.Mesh(merge([P(GEO.box(1, .5, 1), '#8a8a84', [0, .25, 0]), P(GEO.box(.7, .9, .7), '#7a7a74', [0, .95, 0]), P(GEO.box(.5, .4, .1), S.town.pz ? '#ffd27a' : '#2a2a30', [0, 1, .36]), P(GEO.cone(1, 1, 4), '#6a6a66', [0, 1.7, 0], [0, Math.PI / 4, 0], [.75, .5, .75])]), toon({ vertexColors: true, flatShading: true })); m.position.set(x, y, z); m.castShadow = true; T.grp.add(m); T.W.obs.push({ x, z, r: .7 });
  T.pois.push({ id: 'pz', kind: 'spot', x: x + .9, z: z + .9, r: 2.6, map: S.town.pz ? null : 'Shrine puzzle', col: '#ffd27a', label: 'Study the shrine puzzle', act: () => {
    if (S.town.pz) return toast('You have already solved the shrine puzzle of ' + c.n + '.');
    T.paused = true; T.joy = null; openPuzzle(c.i, () => puzzleSolved(true)); } });
}
function puzzleSolved(mine) {
  if (S.town.pz) return; S.town.pz = true; S.gold += 200; const got = rollDrops(townCfg().i, 'myth'), mt = Object.entries(got).map(([id, n]) => `+${n} ${MATERIALS[id].n}`).join(' · '); save();
  virtue('makoto', 1, 'you solved a shrine puzzle'); if (mine) tmSend('pz', { t: S.cur });
  setTimeout(() => { banner(mine ? 'Shrine puzzle solved!' : 'Your friend solved the shrine puzzle!', `+200 gold · ${mt}`); if (TOWN) TOWN.paused = false; }, mine ? 900 : 0);
}
/* ---------- the Pack's last page: backups, settings, the collection, duels with a friend ---------- */
function packMore() {
  const own = new Set(S.swords.map(w => w.id)).size, sets = Object.keys(SETS).filter(k => SLOTS.every(s => ownPiece(k + '-' + s.id))).length;
  return `<h2>Legend</h2>
    <div class="grid2" style="margin-top:8px">
      <div class="card" style="gap:6px"><b>刀 Blade collection</b><div style="font-size:26px;font-weight:900;color:var(--gold-2,#ffd27a)">${S.seen.length} / ${SWORDS.length}</div><small>You carry ${own} of them now. Blades come from duels, master smiths, the mystery forge and wagers.</small><button class="btn small" data-more="rack">Open the blade rack</button></div>
      <div class="card" style="gap:6px"><b>鎧 Armor</b><div style="font-size:26px;font-weight:900;color:var(--gold-2,#ffd27a)">${S.armor.owned.length} / ${Object.keys(PIECES).length}</div><small>${sets} of 8 sets complete · ${Object.keys(S.armor.leg || {}).length} legendary · ${mastersLearned()} of 8 master blades learned.</small></div>
      <div class="card" style="gap:6px"><b>⚔ Duel a friend</b><small><b>Arcade:</b> two tablets, or two players on this one, just for fun. <b>Wager duel:</b> each samurai stakes a blade, and the winner keeps both.</small><button class="btn small primary" data-more="versus">Open the duelling ground</button></div>
      <div class="card" style="gap:6px"><b>💾 Keep your legend safe</b><small>${S.lastBackup ? 'Last backup ' + new Date(S.lastBackup).toLocaleDateString() : 'Never backed up'}. A backup moves your legend to another tablet or saves it if the browser is cleared.</small><div class="row" style="gap:6px"><button class="btn small primary" data-more="backup">Back up</button><button class="btn small" data-more="settings">Settings</button></div></div>
    </div>`;
}
function moreClick(a) {
  if (a === 'rack') { closePack(); townWorkshop('swords'); return true; }
  if (a === 'versus') { closePack(); if (CO.on) { coopClose(true); toast('You stopped travelling together so the duelling ground can connect.'); } townWorkshop('versus'); return true; }
  if (a === 'backup') { PACK_SLOT = null; openBackup(); return true; }
  if (a === 'settings') { openSettings(); return true; }
  if (a === 'tut') { townCloseTalk(); tutStart(); return true; }
  if (a === 'story') { storyOpen(+1); return true; }
  if (a === 'card') { const q = STORY_Q; if (q) storyCards(q.list, q.then, q.i + 1); return true; }
  if (a.startsWith('walk:')) { const to = +a.slice(5); closeOverlay(); if (TOWN) TOWN.paused = false; const go = () => townTravel(to, true); if (TOWNS[to].id === 'otsu') storyCards(STORY_OTSU, go); else go(); return true; }
  return true;
}
/* ---------- the opening ---------- */
const STORY2 = [['和', 'Peace, almost', 'The Eternal Shogun has fallen. For the first time in a hundred years the roads of Japan are quiet, and people are learning to sleep without a sword beside the bed.'],
  ['文', 'One letter', 'But peace is only a promise until it is written down. Princess Hana has sealed a letter to the Emperor in Kyoto. If it is in his hands before the lantern festival, the war is over for good.'],
  ['道', 'The Tokaido', 'The Shogun\'s last captains want that letter burned. So it will not ride with an army. It will walk: sewn into the sleeve of one ronin, eight stations down the great eastern road, from the mountains of Hakone to Sanjo Bridge.']];
let STORY_I = -1;
function storyOpen(d) {
  STORY_I = d ? STORY_I + d : 0; if (TOWN) { TOWN.paused = true; TOWN.joy = null; }
  if (STORY_I >= STORY2.length) { STORY_I = -1; S.town.intro = true; save();
    return townSay('Princess Hana\'s letter', `${nm()}, the peace letter is sealed with the cherry crest and sewn into your sleeve. Carry it west along the Tokaido to Kyoto before the lantern festival.<br><br>${TOWNS[0].intro}`, S.tut2 || window.__noTut ? null : [['', 'I know how to fight'], ['tut', '🎓 Teach me first (5 minutes)', 'primary']]); }
  const p = STORY2[STORY_I];
  openOverlay(`<div class="modal" style="background:linear-gradient(180deg,#1c2444,#0e1226);border:1px solid rgba(240,195,90,.5)"><div style="font-size:96px;line-height:1.1;color:#f0c35a;font-family:serif;text-shadow:0 0 30px rgba(240,195,90,.5)">${p[0]}</div><div class="eyebrow" style="margin-top:6px">${p[1]}</div><p style="font-size:17px;line-height:1.55;margin:12px 0">${p[2]}</p><div class="actions"><button class="btn primary" data-more="story">${STORY_I + 1 < STORY2.length ? 'Next' : 'Take the letter'}</button></div></div>`);
}
/* ---------- the first lesson: old Genba at the roadside ---------- */
let TUT = null;
const TUT_STEPS = [
  ['Swipe out of the gold hilt in the corner to DRAW your sword.', f => f.drawn],
  ['Swipe across Genba to CUT. Land three cuts.', (f, t) => t.cuts >= 3],
  ['He hits back! When he swings, hold the BLOCK button.', (f, t) => t.block >= 1],
  ['Even better: swipe through the gold ring just as it closes to PARRY.', (f, t) => f.parries > t.p0 || t.age > 22],
  ['Tap HIGH, MID or LOW. HIGH beats LOW, LOW beats MID, MID beats HIGH. Match the tag over his head, then cut.', (f, t) => t.stances >= 2],
  ['Tap a STEP arrow to slide aside. Double-tap it to change your lead foot.', (f, t) => f.plx !== 0 || f.lead !== 'R'],
  ['Your purple Spirit bar is full. Press SPIRIT STRIKE!', (f, t) => f.spirit < 60],
];
function tutStart() {
  const st = townFoe('a'), ps = stats();
  Object.assign(st, { town: 'tut', name: 'Old Genba', title: 'Retired gate soldier', look: TOWN_LOOKS.guard, sword: 'bokken', weapon: null, hp: Math.round(ps.atk * 400), dmg: Math.max(1, Math.round(ps.maxHp * .012)), tele: 1700, guard: 0, react: 0, combo: 0, feint: 0, low: 0, fury: 0, gold: 60, intro: 'A lesson, not a fight. Follow the words at the bottom of the screen.' });
  if (TOWN) { TOWN.paused = false; S.town.day = TOWN.day; S.town.at = { x: TOWN.pos.x, z: TOWN.pos.z, yaw: TOWN.face }; }
  TUT = { i: 0, cuts: 0, block: 0, stances: 0, p0: 0, age: 0, eh: -1, st: null }; startBattle(st, { kind: 'town', idx: 'tut', ch: 1, from: 'town' });
}
setInterval(() => {
  if (!TUT) return; const f = typeof F !== 'undefined' && F; if (!f || MODE === TownMode || f.ctx.idx !== 'tut') { if (TUT.t0 && performance.now() - TUT.t0 > 6000) TUT = null; else if (!TUT.t0) TUT.t0 = performance.now(); return; }
  if (f.over || f.state === 'intro') return; const t = TUT; t.age += .25; f.php = f.pmax;
  if (t.eh < 0) t.eh = f.ehp; if (f.ehp < t.eh - 1) { t.cuts++; t.eh = f.ehp; } if (f.blocking) t.block += .25; if (t.st !== f.stance) { if (t.st) t.stances++; t.st = f.stance; }
  if (t.i === 6 && f.spirit < 100 && !t.fed) { f.spirit = 100; t.fed = true; updateFightHUD(); }
  if (TUT_STEPS[t.i][1](f, t)) { t.i++; t.age = 0; t.p0 = f.parries; t.fed = false; sfx.up && sfx.up(); ovPop(VW / 2, VH * .3, 'Good!', { size: 34, color: '#d9ffb0', stroke: '#06203a' }); if (t.i >= TUT_STEPS.length) { TUT = null; setTimeout(() => { if (F === f && !f.over) win('Lesson learned'); }, 2600); return; } }
  f.hintMsg = `Lesson ${t.i + 1} of ${TUT_STEPS.length}: ${TUT_STEPS[t.i][0]}`; f.hintT = 1; hint(f.hintMsg);
}, 250);
/* ---------- two swords that move as two ---------- */
const _d2q = new THREE.Quaternion(), _d2m = new THREE.Quaternion(), _d2v = new V3();
function dualRig(P, on) {
  if (!P || !P.grip) return;
  if (on && !P.sword2) { const second = usableSwords().filter(w => w.u !== S.eq).sort((x, y) => swordDmg(y) - swordDmg(x))[0]; P.sword2 = buildSword(swordDef((second || eqSword()).id)); P.grip.add(P.sword2); P.sword2.position.set(-.3, 0, 0); }
  if (P.sword2) { P.sword2.visible = !!on; P.sword2.scale.setScalar(STYLES[S.style2 || 'kodachi'].len); }
  if (P.hip2) P.hip2.visible = !on;
  if (on) { P.sword.scale.setScalar(STYLES[S.style || 'katana'].len);
    if (typeof F !== 'undefined' && F && F.P === P && !F.dualUpd) { F.dualUpd = true; F.W.updaters.push(dt => { const s = P.sword2; if (!s || !s.visible) return; const g = P.grip; _d2q.copy(g.quaternion).invert(); _d2m.set(g.quaternion.x, -g.quaternion.y, -g.quaternion.z, g.quaternion.w); _d2m.premultiply(_d2q); s.quaternion.slerp(_d2m, damp(11, dt)); _d2v.set(-g.position.x * 2 - .34, -.05, .02).applyQuaternion(_d2q); s.position.lerp(_d2v, damp(11, dt)); }); } }
}
/* the second blade rides at the other hip when you walk */
function dualHip(P) {
  if (!P || !P.hips || !S.dual || P.hip2) return P; const second = usableSwords().filter(w => w.u !== S.eq).sort((x, y) => swordDmg(y) - swordDmg(x))[0];
  const s = buildSword(swordDef((second || eqSword()).id)); s.scale.setScalar(.82 * STYLES[S.style2 || 'kodachi'].len); s.position.set(-.21, .02, -.02); s.rotation.set(2.25, 0, -.18); if (s.userData.glow) s.userData.glow.visible = false; P.hips.add(s); P.hip2 = s; return P;
}
/* results for the lesson and for beasts */
function moreResult() {
  const k = F.ctx.idx, win = F.outcome === 'win', c = townCfg(), back = '<div class="actions"><button class="btn primary" data-town="back">Back to town</button></div>';
  if (k === 'tut') { hint(''); TUT = null; S.tut2 = true; S.gold += 60; save(); setTimeout(() => { if (TOWN && MODE === TownMode && !TOWN.enc) { toast('One more thing: ghosts on this road steal swords. Draw from the hilt and cut it down!'); setTimeout(() => { if (TOWN && MODE === TownMode) townEncStart('practice'); }, 2600); } }, 5200);
    return openOverlay(`<div class="modal win"><div class="kicker">Lesson learned</div><p>Old Genba lowers his practice sword and laughs. "Draw, cut, block, parry, stance, step, spirit. That is all of it. The rest is the road."</p><p class="muted">Your <b>Pack</b> (top left) holds your map, armor, journal and friends. Follow the gold arrow at the edge of the screen when you are lost.</p><div class="rewards"><span class="chip gold"><i></i>+60</span></div>${back}</div>`), true; }
  if (k !== 'beast') return false; hint('');
  if (!win) return openOverlay(`<div class="modal"><div class="kicker lose">Driven off</div><p>${BEASTS2[c.id].n} roars and lumbers away. It will be back.</p><div class="actions"><button class="btn primary" data-town="retry">Fight it again</button><button class="btn" data-town="back">Back to town</button></div></div>`), true;
  const gold = F.st.gold, steel = 6 + c.i, mats = Object.entries(rollDrops(c.i, 'myth')).map(([m, n]) => `<span class="chip">+${n} ${MATERIALS[m].n}</span>`).join('');
  S.town.beast = true; S.gold += gold; S.steel = (S.steel || 0) + steel; S.wins++; S.beasts2 = (S.beasts2 || 0) + 1; virtue('yu', 1, 'you faced a beast of the road'); coopEvent('win', { foe: F.st.name }); save();
  return openOverlay(`<div class="modal win"><div class="kicker">Beast defeated</div><p><b>${BEASTS2[c.id].n}</b>, ${BEASTS2[c.id].title}, will trouble ${c.n} no more. Its ${swordDef(BEASTS2[c.id].w).name.toLowerCase()} is too heavy for any samurai to carry.</p><div class="rewards"><span class="chip gold"><i></i>+${gold}</span><span class="chip steel"><i></i>+${steel} steel</span>${mats}</div>${back}</div>`), true;
}

/* ---------- story scenes: cards, and the walk between stations ---------- */
function storyCards(list, then, i) {
  i = i | 0; if (TOWN) { TOWN.paused = true; TOWN.joy = null; }
  if (i >= list.length) { closeOverlay(); if (TOWN) TOWN.paused = false; return then && then(); }
  const p = list[i]; STORY_Q = { list, then, i };
  openOverlay(`<div class="modal" style="background:linear-gradient(180deg,${p[3] || '#1c2444'},#0e1226);border:1px solid rgba(240,195,90,.5)"><div style="font-size:92px;line-height:1.1;color:#f0c35a;font-family:serif;text-shadow:0 0 30px rgba(240,195,90,.5)">${p[0]}</div><div class="eyebrow" style="margin-top:6px">${p[1]}</div><p style="font-size:17px;line-height:1.55;margin:12px 0">${p[2]}</p><div class="actions"><button class="btn primary" data-more="card">${i + 1 < list.length ? 'Next' : 'Go on'}</button></div></div>`);
}
let STORY_Q = null;
const ROAD_DAYS = [0, 2, 4, 6, 3, 4, 1];
const STORY_OTSU = [['裏', 'The traitor', 'Kagemori was the captain of Princess Hana\'s own guard. It was he who rode beside her the night the Eternal Shogun fell, and he who swore to see the letter safely to Kyoto.'],
  ['橋', 'The bridge at Seta', 'Instead he took the Shogun\'s gold, and the long bridge with it. Every road to the capital crosses that bridge. He is waiting on it now, with two swords, for the ronin who carries the letter.', '#3a1c2a']];
const STORY_END = [['門', 'The palace gate', 'The Shadow falls, and the great gate of the palace opens for the first time in three nights. Snow drifts through it. Behind you, the whole avenue has gone quiet.', '#2a2444'],
  ['姫', 'The traveler in the hood', 'A small figure steps out of the crowd and lowers her hood. Princess Hana has walked the last mile beside you without a word. She takes the letter from your sleeve with both hands.', '#3a1c3a'],
  ['和', 'Peace', 'The Emperor reads it by lantern light. In the morning, criers carry the news down every road in Japan: the war is over. On the Tokaido, eight stations of people you spared, helped and fought beside will tell the story of the ronin who carried it.', '#1c3a2a']];
/* a woodblock map of the road: the samurai walks from one station to the next */
function roadScene(to) {
  const from = S.cur; if (to !== from + 1 || (S.towns[TOWNS[to].id] || {}).seen || window.__noTut) return false;
  if (TOWN) { TOWN.paused = true; TOWN.joy = null; }
  const days = ROAD_DAYS[to] || 2; S.days = (S.days || 0) + days;
  openOverlay(`<div class="modal" style="background:#efe3c8;color:#2a1c12;border:6px double #6a3a22;max-width:560px"><div class="eyebrow" style="color:#8a2a1a">東海道 · The Tokaido</div><canvas id="roadCv" width="520" height="200" style="width:100%;border-radius:8px;margin:8px 0"></canvas><p style="font-size:16px;margin:4px 0"><b>${TOWNS[from].n} → ${TOWNS[to].n}</b> · ${days} day${days === 1 ? '' : 's'} on foot · day ${S.days} of the journey</p><div class="actions"><button class="btn primary" data-more="walk:${to}">Arrive in ${TOWNS[to].n}</button></div></div>`);
  const cv = document.getElementById('roadCv'), x = cv.getContext('2d'), N = TOWNS.length, px = i => 40 + i * 440 / (N - 1), py = i => 120 + Math.sin(i * 1.3) * 34; let t0 = performance.now();
  const draw = () => { if (!document.body.contains(cv)) return; const k = Math.min(1, (performance.now() - t0) / 2600);
    x.fillStyle = '#efe3c8'; x.fillRect(0, 0, 520, 200); x.fillStyle = '#3f6a8a'; x.fillRect(0, 168, 520, 32); x.fillStyle = '#56769f'; x.beginPath(); x.moveTo(60, 110); x.lineTo(118, 30); x.lineTo(176, 110); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(104, 50); x.lineTo(118, 30); x.lineTo(132, 50); x.lineTo(118, 44); x.fill();
    x.strokeStyle = '#6a3a22'; x.lineWidth = 4; x.setLineDash([8, 6]); x.beginPath(); for (let i = 0; i < N; i++) (i ? x.lineTo(px(i), py(i)) : x.moveTo(px(i), py(i))); x.stroke(); x.setLineDash([]);
    for (let i = 0; i < N; i++) { x.fillStyle = i <= from ? '#8a2a1a' : i === to ? '#c9a35a' : '#b8a888'; x.beginPath(); x.arc(px(i), py(i), 8, 0, 7); x.fill(); x.fillStyle = '#2a1c12'; x.font = '700 12px serif'; x.textAlign = 'center'; x.fillText(TOWNS[i].jp, px(i), py(i) - 14); x.font = '10px sans-serif'; x.fillText(TOWNS[i].n, px(i), py(i) + 24); }
    const sx = lerp(px(from), px(to), k), sy = lerp(py(from), py(to), k) - 6 - Math.abs(Math.sin(k * 30)) * 3; x.fillStyle = '#1c1410'; x.beginPath(); x.arc(sx, sy - 12, 5, 0, 7); x.fill(); x.fillRect(sx - 4, sy - 8, 8, 12); x.fillStyle = '#c9a35a'; x.beginPath(); x.moveTo(sx - 9, sy - 13); x.lineTo(sx, sy - 20); x.lineTo(sx + 9, sy - 13); x.fill();
    requestAnimationFrame(draw); }; draw();
  return true;
}
