'use strict';
/* ===== The master smiths of the Tokaido =====
   Each region has one master with a forge of their own. A legendary blade cannot be forged from a recipe:
   the master names the materials, asks something of you, then stands at the anvil with you and teaches
   their rhythm: a bellows beat, a hammer pattern and a quench that belong to that forge alone.
   Once you carry their blade, the same master will remake the region's armor as legendary armor. */

const MASTERS = {
  hakone: { n: 'Master Gorō', forge: 'The Spring Forge of Hakone', blade: 'kanemitsu', col: '#ff8a3a', vista: 'cedar',
    say: 'My teachers\' teachers learned from the smiths of Sagami, where they say the finest blades in Japan were made. First, show me you finish what you start.',
    task: ['Own all seven pieces of the Tengu armor', () => SLOTS.every(s => ownPiece('tengu-' + s.id))],
    bel: [.8, .8], belSay: 'even, like breathing', ham: { u: [.2, .4, .6, .8], d: [.95, .9, .9, .85], g: [.35] }, hamSay: 'Handle to tip, one step at a time.', q: .26 },
  hara: { n: 'Mistress Akane', forge: 'The Black Sand Forge of Hara', blade: 'kagaribi', col: '#ff5a2a', vista: 'fuji',
    say: 'The iron in my forge is black sand washed down from the mountain. It makes a hot, proud blade. I teach only those Lady Tomoe respects.',
    task: ['Win your sunrise duel with Lady Tomoe', () => !!(S.towns.hara || {}).pass],
    bel: [.9, .45, .45], belSay: 'LONG, short, short', ham: { u: [.85, .2, .75, .3, .65, .4], d: [.8, .8, .75, .75, .7, .7], g: [.3] }, hamSay: 'Tip, then handle, closing in.', q: .42 },
  shimada: { n: 'Master Yoshisuke', forge: 'The River Forge of Shimada', blade: 'tsukikage', col: '#8fd0ff', vista: 'river',
    say: 'Shimada has had its own school of swordsmiths for three hundred years, and we quench in the Oi itself. But I cannot forge while the river is in flood.',
    task: ['Calm the kappa and stop the rain', () => ((S.towns.shimada || {}).jobs || {}).b === 2],
    bel: [.6, .6, 1.2], belSay: 'short, short, LONG', ham: { u: [.3, .4, .5, .8, .7, .6], d: [.6, .6, .6, 1, .6, .6], g: [.18, .18, .6] }, hamSay: 'Three quick, then wait for me.', q: .34 },
  miya: { n: 'Master Hōki', forge: 'The Shrine Forge of Miya', blade: 'kusanagi', col: '#7fe8d0', vista: 'sea',
    say: 'Atsuta Shrine has guarded the sword Kusanagi for longer than anyone can count. No one may see it, but I may forge in its honor. Bring me what the tide hides.',
    task: ['Open the chest on the sandbar at low tide', () => ((S.towns.miya || {}).chests || []).includes('c0')],
    bel: [1, .5, .5, 1], belSay: 'in and out, like the tide', ham: { u: [.2, .5, .8, .5, .2, .5, .8], d: [.9, .8, .7, .8, .9, .8, .7], g: [.3] }, hamSay: 'Out with the wave, back with the wave.', q: .22 },
  seki: { n: 'Old Kinjū', forge: 'The Lantern Forge of Seki', blade: 'hyoryu', col: '#bff4ff', vista: 'maple',
    say: 'A smith who is fooled by a tanuki will be fooled by his own steel. Catch all six of them and then we will talk about dragons.',
    task: ['Catch all six disguised tanuki', () => (((S.towns.seki || {}).tans) || []).length >= 6],
    bel: [.5, .5, .5, 1], belSay: 'three and a rest. Do not be tricked into a fourth', ham: { u: [.8, .25, .6, .35, .9, .5], d: [.85, .5, .85, .5, .85, .5], g: [.3, .15] }, hamSay: 'Slow, then a quick one. Every time.', q: .5 },
  otsu: { n: 'Mistress Narukami', forge: 'The Thunder Forge of Otsu', blade: 'raiden', col: '#ffe04a', vista: 'lake',
    say: 'They say the evening bell of the lake can be heard in my steel. Ring it, so the lake knows who is asking.',
    task: ['Ring the great bell on the hill', () => !!(S.towns.otsu || {}).bell],
    bel: [.35, .35, 1.1], belSay: 'da-dum… and the thunder', ham: { u: [.3, .35, .7, .75, .5, .55, .85, .9], d: [.55, .5, .55, .5, .55, .5, .55, .5], g: [.12, .5] }, hamSay: 'Twice, fast, like a drum.', q: .6 },
  kyoto: { n: 'Master Sanjō', forge: 'The Fox Forge of Kyoto', blade: 'yozakura', col: '#ff9ec4', vista: 'kyoto',
    say: 'Long ago the smith Munechika of Sanjō was ordered to forge a blade for the Emperor, and had no one to strike beside him. The old play says a fox spirit came and took the second hammer. Light the city, and I will strike beside you.',
    task: ['Relight all five great lanterns', () => (((S.towns.kyoto || {}).lit) || []).length >= 5],
    bel: [.7, .35, .35, .7, .7], belSay: 'the festival drum', ham: { u: [.2, .8, .3, .7, .4, .6, .5, .5], d: [.8, .75, .7, .65, .6, .6, .55, .9], g: [.28] }, hamSay: 'From both ends to the heart of the blade.', q: .38 },
};
const MASTER_LAST = { blade: 'amaterasu', bel: [.5, .5, 1, .5, 1], belSay: 'everything the road taught you', ham: { u: [.2, .4, .6, .8, .85, .2, .75, .3, .5, .55], d: [.9, .8, .7, .6, .75, .75, .55, .5, .5, .9], g: [.3, .18, .3, .12] }, hamSay: 'Every master\'s pattern, one after another.', q: .55 };
const RAR_W = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
function masterSt(id) { S.masters = S.masters || {}; return S.masters[id] || (S.masters[id] = {}); }
function masterMats(i, kind) { // what a master asks for: things found in their own region
  const pool = MAT_IDS.filter(m => MATERIALS[m].land === i).sort((a, b) => RAR_W[MATERIALS[a].r] - RAR_W[MATERIALS[b].r]), o = {};
  if (!pool.length) return o; const hi = pool[pool.length - 1], lo = pool[0], mid = pool[Math.min(1, pool.length - 1)];
  if (kind === 'blade') { o[lo] = 3; o[mid] = (o[mid] || 0) + 2; o[hi] = (o[hi] || 0) + 1; } else if (kind === 'armor') { o[mid] = 3; o[hi] = (o[hi] || 0) + 2; } else { o[lo] = 2; o[mid] = (o[mid] || 0) + 2; o[hi] = (o[hi] || 0) + 3; }
  return o;
}
function matsHave(o) { return Object.entries(o).every(([m, n]) => matCount(m) >= n); }
function matsList(o) { return Object.entries(o).map(([m, n]) => `<span class="chip" style="border-color:${MATERIALS[m].c};opacity:${matCount(m) >= n ? 1 : .6}">${matCount(m) >= n ? '✓' : ''} ${MATERIALS[m].n} ${Math.min(matCount(m), n)}/${n}</span>`).join(' '); }
function mastersLearned() { return TOWNS.filter(t => MASTERS[t.id] && masterSt(t.id).blade).length; }
function townMaster() {
  const c = townCfg(), M = MASTERS[c.id], st = masterSt(c.id), set = SETS[c.set]; if (!M) return;
  if (TOWN) { TOWN.paused = true; TOWN.joy = null; }
  const d = swordDef(M.blade), need = masterMats(c.i, 'blade'), done = M.task[1](), ok = done && matsHave(need);
  const hasSet = SLOTS.every(s => ownPiece(c.set + '-' + s.id)), needA = masterMats(c.i, 'armor'), okA = hasSet && matsHave(needA);
  const last = c.id === 'kyoto' && st.blade && !st.last, all = mastersLearned() >= 7, needL = masterMats(c.i, 'last'), dl = swordDef(MASTER_LAST.blade);
  let body;
  if (!st.blade) body = `<p>${M.say}</p><div class="card" style="gap:8px"><div class="row between"><b style="color:${RAR[d.r].c}">${d.name}</b><small class="muted">Legendary blade</small></div>
      <small>${done ? '✓' : '○'} <b>${M.task[0]}</b></small><div class="row" style="gap:6px;flex-wrap:wrap">${matsList(need)}</div><small class="muted">These are found in ${c.n}: win duels, open chests and banish ghosts here.</small>
      <button class="btn ${ok ? 'primary' : ''}" data-town="master:blade" ${ok ? '' : 'disabled'}>🔨 Forge it with ${M.n}</button></div>`;
  else body = `<p>"You carry my ${d.name}. Remember the rhythm: <b>${M.belSay}</b>."</p>
    ${last ? `<div class="card" style="gap:8px;margin-bottom:10px"><div class="row between"><b style="color:${RAR[dl.r].c}">${dl.name}</b><small class="muted">The last blade</small></div><small>${all ? '✓' : '○'} <b>Learn a blade from every master on the road (${mastersLearned()}/7)</b></small><div class="row" style="gap:6px;flex-wrap:wrap">${matsList(needL)}</div><button class="btn ${all && matsHave(needL) ? 'primary' : ''}" data-town="master:last" ${all && matsHave(needL) ? '' : 'disabled'}>🔨 Forge the last blade</button></div>` : ''}
    ${dynCard()}
    <div class="card" style="gap:8px"><div class="row between"><b style="color:${set.col || '#ffd27a'}">Legendary ${set.n} armor</b><small class="muted">${st.armor ? 'Forged' : 'Legendary armor'}</small></div>
      ${st.armor ? '<small>Every piece of this set is 25% stronger, its set bonus is half again as strong, and it can be forged to +8.</small>' : `<small>${hasSet ? '✓' : '○'} <b>Own all seven pieces of the ${set.n} armor</b></small><div class="row" style="gap:6px;flex-wrap:wrap">${matsList(needA)}</div><small class="muted">We remake the whole set on my anvil, to my rhythm.</small><button class="btn ${okA ? 'primary' : ''}" data-town="master:armor" ${okA ? '' : 'disabled'}>🔨 Forge it with ${M.n}</button>`}</div>`;
  openOverlay(`<div class="modal" style="text-align:left"><div class="eyebrow">${M.n} · ${M.forge}</div>${body}<div class="actions"><button class="btn" data-town="">Leave the forge</button></div></div>`);
}
function masterClick(a) {
  if (!a.startsWith('master:')) return false;
  if (a === 'master:dyn') return dynForge();
  const c = townCfg(), M = MASTERS[c.id], st = masterSt(c.id), kind = a.slice(7), i = c.i, set = SETS[c.set];
  const need = masterMats(i, kind), pay2 = () => { for (const [m, n] of Object.entries(need)) S.mats[m] -= n; };
  if (!matsHave(need) || (kind === 'blade' && (st.blade || !M.task[1]())) || (kind === 'armor' && (st.armor || !st.blade)) || (kind === 'last' && (st.last || mastersLearned() < 7))) return true;
  closeOverlay(); if (TOWN) TOWN.paused = false; $('#leaveBtn').textContent = 'Leave';
  const q = g => g === 'Masterwork' ? 1.1 : g === 'Fine' ? 1.05 : 1;
  if (kind === 'armor') startForge({ kind: 'recipe', r: { id: M.blade }, master: M, plate: set.col || '#c9a35a', title: `Legendary ${set.n} armor`, btn: 'Wear it!', onDone: g => { if (!matsHave(need)) return { msg: 'Missing materials.' }; pay2(); st.armor = true; S.armor.leg = S.armor.leg || {}; S.armor.leg[c.set] = q(g); virtue('meiyo', 1, 'you forged legendary armor'); save(); return { msg: `${M.n} bows. The ${set.n} armor is legendary now: every piece 25% stronger${q(g) > 1 ? `, and ${g.toLowerCase()} work adds ${Math.round((q(g) - 1) * 100)}% more` : ''}.` }; } });
  else { const L = kind === 'last', bid = L ? MASTER_LAST.blade : M.blade, MM = L ? Object.assign({}, M, MASTER_LAST) : M;
    startForge({ kind: 'recipe', r: { id: bid, sharpen: L }, master: MM, onDone: g => { if (!matsHave(need)) return { msg: 'Missing materials.' }; pay2(); const w = addSword(bid); w.made = 1; w.q = q(g); S.eq = w.u; st[L ? 'last' : 'blade'] = true; virtue('makoto', 1, 'you learned a master\'s blade'); save(); return { msg: `${M.n} taught you this blade. It is forged and in your hand.${w.q > 1 ? ` ${g} quality: +${Math.round((w.q - 1) * 100)}% damage.` : ''}` }; } }); }
  return true;
}
/* ---- the master at the anvil: he strikes first, you answer ---- */
function masterJoin() {
  const M = FG.o.master, m = new Samurai(TOWN_LOOKS.smith, swordDef('bokken'), { noSaya: true }); m.sword.visible = false; m.root.rotation.order = 'YXZ'; m.root.position.set(-.95, 0, 1.45); m.root.rotation.y = Math.PI * .82;
  const ham = new THREE.Group(); ham.add(new THREE.Mesh(merge([P(GEO.cyl(.022, .026, .5, 6), '#5a3a20', [0, .22, 0]), P(GEO.box(.3, .14, .14), '#2a2a30', [0, .5, 0])]), toon({ vertexColors: true }))); m.grip.add(ham); m.setHold('shoulder', 6);
  FG.W.scene.add(m.root); FG.master = m; FG.W.updaters.push(dt => { if (FG && FG.master === m) m.update(dt); });
  const lab = labelSprite(M.n, '#ffe08c', 'Master smith'); lab.position.set(-.95, 2.5, 1.45); lab.scale.multiplyScalar(.34); FG.W.scene.add(lab);
}
function masterBeat(long) { const m = FG && FG.master; if (!m) return; m.seq.length = 0; m.queue({ p: [.1, long ? .5 : .42, .3], d: [0, 1, .2], e: [1, 0, 0] }, .08); m.queue('shoulder', .25); const fp = FG.W.flame.position; FX.sparks(new V3(fp.x, fp.y + .2, fp.z), long ? '#ffe08c' : FG.o.master.col, long ? 16 : 7, 3); }
function masterStrike(spot) {
  const m = FG && FG.master; if (!m) return; const sp = spotWorld(spot.u), f = FG;
  m.seq.length = 0; m.queue(smithPose(sp, false), .1); m.queue(smithPose(sp, true), .07, { ease: easeIn, arc: .05 }); m.queue(smithPose(sp, false), .2); m.queue('shoulder', .3);
  setTimeout(() => { if (FG !== f) return; sfx.clang && sfx.clang(.7); FX.sparks(sp, FG.o.master.col, 12, 3.5, .05); }, 170);
}
/* a plate of armor on the anvil instead of a blade */
function forgePlate(col) {
  const g = new THREE.Group(), mat = toon({ color: col, flatShading: true });
  g.add(new THREE.Mesh(merge([P(GEO.box(.34, .46, .03), col, [0, .36, 0]), P(GEO.box(.3, .2, .035), shadeHex(col, -.25), [0, .7, 0]), P(GEO.box(.26, .1, .035), shadeHex(col, -.25), [0, .08, 0])].concat([[-.12, .2], [.12, .2], [-.12, .5], [.12, .5]].map(([x, y]) => P(GEO.sph(.018, 6, 4), '#c9a35a', [x, y, .02])))), mat));
  g.children[0].material = toon({ vertexColors: true, flatShading: true }); g.userData = { mat: g.children[0].material, len: .8, glow: null }; g.traverse(o => { o.castShadow = true; });
  return g;
}
/* ---- every forge on the Tokaido looks like the place it stands in ---- */
function forgeVista(kind, col) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d'), G = (a, b) => { const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const tri = (cx, by, w, h, c) => { x.fillStyle = c; x.beginPath(); x.moveTo(cx - w, by); x.lineTo(cx, by - h); x.lineTo(cx + w, by); x.fill(); };
  const sky = { cedar: ['#7fa3c4', '#dfe6ea'], fuji: ['#3f6aa8', '#ffe0b8'], river: ['#8a96a4', '#c9d4d8'], sea: ['#2f7fc0', '#bfe6f0'], maple: ['#2a2f66', '#e58a5a'], lake: ['#7fb4e0', '#ffe6f0'], kyoto: ['#060a1e', '#2a3a6a'] }[kind] || ['#7fa3c4', '#dfe6ea'];
  x.fillStyle = G(sky[0], sky[1]); x.fillRect(0, 0, 512, 256);
  if (kind === 'cedar') { tri(140, 220, 200, 150, '#5a6f96'); tri(380, 220, 220, 120, '#4d5f86'); for (let i = 0; i < 16; i++) tri(20 + i * 32, 256, 20, 110 + (i % 3) * 26, i % 2 ? '#1f4a34' : '#2a5a3e'); }
  else if (kind === 'fuji') { x.fillStyle = '#56769f'; x.beginPath(); x.moveTo(60, 230); x.quadraticCurveTo(210, 190, 236, 60); x.lineTo(276, 60); x.quadraticCurveTo(302, 190, 452, 230); x.fill(); x.fillStyle = '#f6f9ff'; x.beginPath(); x.moveTo(222, 110); x.lineTo(236, 60); x.lineTo(276, 60); x.lineTo(290, 110); x.lineTo(270, 96); x.lineTo(256, 116); x.lineTo(240, 98); x.fill(); x.fillStyle = '#c8a444'; x.fillRect(0, 222, 512, 34); }
  else if (kind === 'river') { tri(120, 190, 180, 70, '#4f6a5a'); tri(380, 190, 200, 60, '#5a7a66'); x.fillStyle = '#6f8f9c'; x.fillRect(0, 186, 512, 46); x.fillStyle = '#b9b6aa'; x.fillRect(0, 232, 512, 24); for (let i = 0; i < 5; i++) { x.fillStyle = '#6a9a4a'; x.beginPath(); x.arc(50 + i * 104, 176, 26, 0, 7); x.fill(); x.fillRect(46 + i * 104, 176, 8, 40); } }
  else if (kind === 'sea') { x.fillStyle = '#2f6a86'; x.fillRect(0, 150, 512, 106); tri(90, 150, 60, 26, '#5a7a8a'); tri(420, 150, 70, 30, '#5a7a8a'); x.fillStyle = '#f2ead6'; x.fillRect(250, 96, 40, 50); x.fillStyle = '#5a3a26'; x.fillRect(236, 146, 70, 10); x.strokeStyle = '#c4302a'; x.lineWidth = 9; x.beginPath(); x.moveTo(60, 256); x.lineTo(60, 176); x.moveTo(120, 256); x.lineTo(120, 176); x.moveTo(44, 182); x.lineTo(136, 182); x.stroke(); }
  else if (kind === 'maple') { x.fillStyle = '#fff2c8'; x.beginPath(); x.arc(390, 70, 34, 0, 7); x.fill(); tri(150, 256, 240, 130, '#5a4a52'); for (let i = 0; i < 14; i++) { x.fillStyle = ['#d8642a', '#c8442a', '#e8a23a'][i % 3]; x.beginPath(); x.arc(20 + i * 38, 200 + (i % 2) * 14, 30, 0, 7); x.fill(); } }
  else if (kind === 'lake') { x.fillStyle = '#5a94b4'; x.fillRect(0, 160, 512, 96); tri(130, 160, 160, 60, '#5a6a8a'); tri(400, 160, 140, 50, '#667896'); for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#ffb6d0' : '#ff9ec4'; x.beginPath(); x.arc(30 + i * 76, 216, 34, 0, 7); x.fill(); } }
  else { x.fillStyle = '#fff'; for (let i = 0; i < 70; i++) x.fillRect((i * 97) % 512, (i * 53) % 150, 2, 2); x.fillStyle = '#141a30'; for (let i = 0; i < 5; i++) x.fillRect(300 - i * 9, 60 + i * 34, 60 + i * 18, 10); x.fillRect(322, 60, 16, 180); x.fillStyle = '#e9f1fa'; x.fillRect(0, 226, 512, 30); for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#ff6a4a' : '#ffb060'; x.beginPath(); x.arc(20 + i * 44, 200, 8, 0, 7); x.fill(); } }
  return new THREE.CanvasTexture(cv);
}
function forgeDress(W, opts) {
  const c = typeof townCfg === 'function' && S.towns ? townCfg() : null, M = (opts && opts.master) || (c && MASTERS[c.id]) || MASTERS.hakone, sc = W.scene, col = new COL(M.col);
  // the back wall opens onto the country outside
  const view = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshBasicMaterial({ map: forgeVista(M.vista, M.col), fog: false })); view.position.set(.9, 2.75, 4.12); view.rotation.y = Math.PI; sc.add(view);
  sc.add(new THREE.Mesh(merge([P(GEO.box(5.6, .22, .2), '#1a0e08', [.9, 4.1, 4.08]), P(GEO.box(5.6, .22, .2), '#1a0e08', [.9, 1.42, 4.08]), P(GEO.box(.22, 2.9, .2), '#1a0e08', [-1.8, 2.75, 4.08]), P(GEO.box(.22, 2.9, .2), '#1a0e08', [3.6, 2.75, 4.08]), P(GEO.box(.1, 2.7, .12), '#1a0e08', [.9, 2.75, 4.06])]), toon({ vertexColors: true })));
  const day = new THREE.PointLight(M.vista === 'kyoto' || M.vista === 'maple' ? '#9fb8ff' : '#fff0d8', .9, 9, 1.6); day.position.set(.9, 2.6, 3.2); sc.add(day);
  // the master's banner, paper lanterns, and a fire the color of this forge
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; { const x = cv.getContext('2d'); x.fillStyle = '#1c2a4a'; x.fillRect(0, 0, 128, 256); x.fillStyle = M.col; x.font = '900 86px serif'; x.textAlign = 'center'; x.fillText('鍛', 64, 110); x.fillStyle = '#f4efe4'; x.font = '900 40px serif'; x.fillText('冶', 64, 190); x.strokeStyle = M.col; x.lineWidth = 6; x.strokeRect(6, 6, 116, 244); }
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })); ban.position.set(4.82, 2.6, 1.2); ban.rotation.y = -Math.PI / 2; sc.add(ban);
  [[-3.6, 3.5, 3.6], [3.9, 3.5, 3.4], [2.2, 3.6, -.6], [-3.9, 3.4, -1]].forEach(([x, y, z], i) => { const l = new THREE.Mesh(GEO.sph(.2, 10, 8), glowify(new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffb060' : M.col, fog: false }))); l.scale.y = 1.25; l.position.set(x, y, z); sc.add(l); const h = halo(i % 2 ? '#ffb060' : M.col, 2.4, .5); h.position.copy(l.position); sc.add(h); const s = new THREE.Mesh(GEO.cyl(.008, .008, 1.5, 4), toon({ color: '#1a0e08' })); s.position.set(x, y + .95, z); sc.add(s); });
  W.fire.color.copy(col).lerp(new COL('#ff7a2a'), .45); W.fire.intensity = 2.8; W.flame.material.color.copy(col).lerp(new COL('#ff8a3a'), .4);
  W.tongues.forEach((t, i) => { if (i % 2) t.material.color.copy(col); });
  // embers that drift the whole room, and a warm glow on the floor by the hearth
  W.ambient.push(new Ambient({ n: 120, tex: TEX.glow, color: M.col, color2: '#ffb03a', size: .035, alpha: .9, blending: THREE.AdditiveBlending, cx: -.4, cy: 2, cz: 1.4, ax: 3.2, ay: 2, az: 2.2, sway: .5, twinkle: 1.5, vel: r => [(r() - .5) * .3, .25 + r() * .5, (r() - .5) * .3], seed: 3 }));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.4, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TEX.glow, color: col.clone().lerp(new COL('#ff6a1a'), .5), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })); pool.position.set(-1.2, .03, 1.2); sc.add(pool);
  let t = 0; W.updaters.push(dt => { t += dt; W.fire.intensity = 2.6 + Math.sin(t * 9) * .35 + Math.sin(t * 23) * .2; pool.material.opacity = .42 + Math.sin(t * 7) * .08; });
}
