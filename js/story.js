'use strict';
/* ===== Story mode: the kidnapped princess, and the title screen.
   The whole princess story lives in this file and can be switched off per player in Settings
   (S.storyOff). With it off, the game plays exactly as before: no cutscenes, scrolls or story panel. ===== */

const PRINCESS = 'Princess Hana';
function storyOn() { return !S.storyOff; }
const nm = () => esc(S.name || 'Shep');

/* ---------- the words ---------- */
const STORY = {
  prologue: [
    { t: 'Every spring, Princess Hana came to the Bamboo Village for the lantern festival.', shot: 'festival' },
    { t: 'But one night, the sky turned dark. The Eternal Shogun had come.', shot: 'dark' },
    { t: 'He wanted to rule every land forever, and he needed the princess to do it.', shot: 'menace' },
    { t: 'His shadow riders carried her away into the night, leaving only a trail of cherry petals.', shot: 'vanish' },
    { t: 'A young ronin named {name} found her ribbon lying on the road.', shot: 'ribbon' },
    { t: '{name} drew a sword and faced the seven lands. "I will bring her home."', shot: 'vow' },
  ],
  rescue: [
    { t: "With the great serpent's spirit broken, the Eternal Shogun's dark magic faded away.", shot: 'cage' },
    { t: 'Behind the spirit gate, Princess Hana was free at last.', shot: 'free' },
    { t: '"You followed my petals across seven lands," she said, and bowed low.', shot: 'bow' },
    { t: 'Together they returned to the Bamboo Village, and every lantern was lit again.', shot: 'fireworks' },
  ],
  arrive: [
    'The festival lanterns lie broken across the road. Captain Haru, the Crimson Fang, rode with the kidnappers. Defeat the warriors of this village and find out where they took Princess Hana.',
    "Snow hides the kidnappers' tracks, but pink petals glow on the ice. The princess is leaving you a trail! Yuki, the Frost Blade, guards the pass.",
    "Under a purple moon, one lantern burns in Lord Kuro's tower. Was the princess held there? The Shadow Lord's warriors wait in the dark.",
    "The Dragon Shogun serves the Eternal Shogun. Smoke rises where the kidnappers' carriage climbed, high above the rivers of lava.",
    'Villagers whisper about a princess who sang to the weeping cherries as she was carried past. General Shidare of the Black Fences knows where she went.',
    "Thunder shakes the golden tower. On the wind you hear a flute playing Princess Hana's song. She is close!",
    'The Eternal Shogun sits on a stolen throne. Princess Hana is locked behind the spirit gate, guarded by the great serpent Orochi. This is the final battle.',
  ],
  done: [
    { keep: 'ribbon', name: "Hana's ribbon", t: "Among Captain Haru's things you find a note: \"Take the princess north, over the Frozen Pass.\" Tied to it is Princess Hana's pink ribbon. The trail leads north." },
    { keep: 'comb', name: "Hana's comb", t: 'Deep in the ice you find the princess\'s lacquered comb, and words scratched into the frost: "They take me to the Shadow Castle. Be brave. H."' },
    { keep: 'crane', name: 'Paper crane', t: 'The tower is empty, but a paper crane sits on the windowsill. You unfold it: a map, with a red line climbing Dragon Peak.' },
    { keep: 'kanzashi', name: 'Golden hairpin', t: "From the peak you see the carriage far below, rolling toward the woodland village of Kakunodate. At your feet glints the princess's golden hairpin." },
    { keep: 'charm', name: 'Cherry charm', t: 'General Shidare kneels. "She was taken to Azuchi Castle, to the Golden Warlord." He hands you a cherry charm the princess gave to a crying child.' },
    { keep: 'flute', name: "Hana's flute", t: 'At the top of the tower lies the princess\'s flute, still warm. "Too late," gasps the Golden Warlord. "The Eternal Shogun has taken her to the Imperial Palace!"' },
    { keep: 'crest', name: 'Cherry crest', t: 'Princess Hana is free! She gives you her crest, the cherry blossom of the imperial family. "Wherever you go, you will always be welcome at the palace."' },
  ],
};
const fill = t => esc(t).replace(/\{name\}/g, nm());

/* ---------- keepsakes: little paintings of the things she left behind ---------- */
function keepSVG(k, size) {
  const sz = size || 96, g = {
    ribbon: `<path d="M50 50 C30 28 12 30 14 46 C16 60 34 58 50 50Z" fill="#ff8fb8" stroke="#b83a6a" stroke-width="2.5"/><path d="M50 50 C70 28 88 30 86 46 C84 60 66 58 50 50Z" fill="#ff8fb8" stroke="#b83a6a" stroke-width="2.5"/><path d="M46 52 L34 84 L42 80 L46 88 L50 54Z M54 52 L66 84 L58 80 L54 88 L50 54Z" fill="#ff6fa0" stroke="#b83a6a" stroke-width="2"/><circle cx="50" cy="50" r="7" fill="#ffb3cf" stroke="#b83a6a" stroke-width="2.5"/>`,
    comb: `<path d="M14 54 Q50 14 86 54 Z" fill="#7a1a24" stroke="#3a0a10" stroke-width="2.5"/>${Array.from({ length: 15 }, (_, i) => `<rect x="${17 + i * 4.6}" y="54" width="2.6" height="22" rx="1.2" fill="#5a1018"/>`).join('')}<circle cx="50" cy="40" r="7" fill="#ffd27a"/>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="33" rx="3.2" ry="5" fill="#ffe7a8" transform="rotate(${a} 50 40)"/>`).join('')}<circle cx="50" cy="40" r="2.6" fill="#c8901f"/>`,
    crane: `<path d="M50 30 L78 58 L50 52 Z" fill="#fff" stroke="#9a8a9a" stroke-width="1.8"/><path d="M50 30 L22 58 L50 52 Z" fill="#f2e6f0" stroke="#9a8a9a" stroke-width="1.8"/><path d="M50 52 L60 74 L50 68 L40 74 Z" fill="#ffd6e6" stroke="#9a8a9a" stroke-width="1.8"/><path d="M40 74 L28 40 L24 34 L30 36 Z" fill="#fff" stroke="#9a8a9a" stroke-width="1.6"/><path d="M60 74 L80 46 L86 44 L82 50 Z" fill="#fff" stroke="#9a8a9a" stroke-width="1.6"/><path d="M50 52 L50 68" stroke="#d04a6a" stroke-width="1.5"/>`,
    kanzashi: `<rect x="47" y="10" width="5" height="62" rx="2.5" fill="#d8a63e" stroke="#7a5410" stroke-width="1.5" transform="rotate(18 50 40)"/>${[[40, 18], [30, 26], [42, 30]].map(([x, y], i) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-5" rx="3.6" ry="5.4" fill="${i === 1 ? '#ffb3cf' : '#ff8fb8'}" transform="rotate(${a})"/>`).join('')}<circle r="2.4" fill="#ffd27a"/></g>`).join('')}${[0, 1, 2].map(i => `<line x1="${30 + i * 6}" y1="34" x2="${28 + i * 6}" y2="${56 + i * 6}" stroke="#d8a63e" stroke-width="1.4"/><circle cx="${28 + i * 6}" cy="${58 + i * 6}" r="3" fill="#ffd27a" stroke="#7a5410" stroke-width="1"/>`).join('')}`,
    charm: `<path d="M50 8 C44 14 44 20 50 24 C56 20 56 14 50 8Z" fill="none" stroke="#c0281e" stroke-width="2.5"/><rect x="30" y="24" width="40" height="58" rx="8" fill="#d42a35" stroke="#7a0c14" stroke-width="2.5"/><rect x="34" y="28" width="32" height="50" rx="6" fill="none" stroke="#ffd27a" stroke-width="1.5"/><text x="50" y="58" text-anchor="middle" font-size="22" font-family="'Yuji Syuku',serif" fill="#ffd27a">守</text>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="66" rx="2.6" ry="4" fill="#ffb3cf" transform="rotate(${a} 50 70)"/>`).join('')}`,
    flute: `<rect x="8" y="44" width="84" height="11" rx="5.5" fill="#c8a25a" stroke="#6a4a1a" stroke-width="2"/>${[24, 44, 58, 70].map(x => `<rect x="${x}" y="44" width="2.4" height="11" fill="#8a6a2a"/>`).join('')}${[32, 50, 64, 78].map(x => `<circle cx="${x}" cy="49.5" r="2.4" fill="#3a2410"/>`).join('')}<path d="M88 55 Q92 70 86 84 M88 55 Q96 68 94 82" stroke="#d42a35" stroke-width="2.5" fill="none"/><circle cx="88" cy="56" r="3" fill="#d42a35"/>`,
    crest: `<circle cx="50" cy="50" r="40" fill="#7a0c14" stroke="#d8a63e" stroke-width="4"/>${[0, 72, 144, 216, 288].map(a => `<path d="M50 50 C40 38 40 22 50 16 C60 22 60 38 50 50Z" fill="#ffd27a" stroke="#a87a1a" stroke-width="1.2" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="6" fill="#7a0c14" stroke="#ffd27a" stroke-width="2"/>`,
  }[k];
  return `<svg class="keep" width="${sz}" height="${sz}" viewBox="0 0 100 100" aria-hidden="true">${g || ''}</svg>`;
}
function landEmblem(ch, size) {
  const sz = size || 96;
  return `<svg class="keep" width="${sz}" height="${sz}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#7a1010" stroke-width="5" stroke-dasharray="250 30" transform="rotate(-70 50 50)"/>
    <text x="50" y="${CHAPTERS[ch].jp.length > 2 ? 60 : 64}" text-anchor="middle" font-size="${CHAPTERS[ch].jp.length > 2 ? 26 : 38}" font-family="'Yuji Syuku',serif" fill="#2a160a">${CHAPTERS[ch].jp}</text></svg>`;
}

/* ---------- saved story progress ---------- */
(function storyInit() {
  if (!S.story || typeof S.story !== 'object') {
    // players from before the story: what they've already done counts as already read
    const st = { pro: false, seen: {}, q: [] }, cur = currentChapter();
    if (S.tutDone) { for (let c = 0; c < cur; c++) st.seen['a' + c] = 1; S.journey.forEach((j, c) => { if (j.myth) st.seen['c' + c] = 1; }); }
    S.story = st; save();
  }
  if (!Array.isArray(S.story.q)) S.story.q = [];
  if (S.storyOff == null) S.storyOff = false;
})();
function storyQueue(key) { if (!storyOn() || S.story.seen[key] || S.story.q.includes(key)) return; S.story.q.push(key); save(); }
function storyArrive(ch) { if (S.tutDone) storyQueue('a' + ch); }
function storyChapterDone(ch) { storyQueue('c' + ch); }
/* show queued story moments when the player is free: walking the road or in the dojo, not mid-fight */
function storyTick() {
  if (!storyOn() || !S.story.q.length || transitioning || STORYCUT || TITLE_UP || !$('#overlay').hidden) return;
  const inExplore = MODE === ExploreMode && X && !X.enc && !X.hunt, inHub = MODE === HubMode && !$('#ui').hidden;
  if (!inExplore && !inHub) return;
  const key = S.story.q[0];
  if (key === 'c6') { S.story.q.shift(); S.story.seen.c6 = 1; save(); playCutscene('rescue', () => storyCard('c6')); return; }
  S.story.q.shift(); save();
  storyCard(key);
}
function storyCard(key, replay) {
  const arrive = key[0] === 'a', ch = +key.slice(1), D = arrive ? null : STORY.done[ch];
  if (!replay) { S.story.seen[key] = 1; save(); }
  if (X && MODE === ExploreMode) X.paused = true;
  sfx.taiko(.6);
  openOverlay(`<div class="scroll-stage story-stage">
    <div class="scroll-kicker">${arrive ? `Chapter ${ch + 1} · ${CHAPTERS[ch].name}` : `${CHAPTERS[ch].name} · the trail continues`}</div>
    <div class="scroll story-scroll" id="scrollEl">
      <div class="roll top"></div>
      <div class="paper"><div class="ink">
        <div class="story-art">${arrive ? landEmblem(ch, 92) : keepSVG(D.keep, 96)}</div>
        <p>${fill(arrive ? STORY.arrive[ch] : D.t)}</p>
        ${!arrive ? `<p class="keep-found">Keepsake found: <b>${esc(D.name)}</b></p>` : ''}
      </div></div>
      <div class="roll bottom"></div>
    </div>
    <div class="scroll-actions"><button class="btn primary" data-story-close="1">${arrive ? 'Onward' : 'Continue'}</button></div>
  </div>`);
  setTimeout(() => { const el = $('#scrollEl'); if (el) el.classList.add('open'); }, 300);
}
function storyClose() { closeOverlay(); if (X) X.paused = false; }

/* ---------- cutscenes: little 3D plays with narration ---------- */
let STORYCUT = null;
const PRINCESS_LOOK = { geisha: true, cloth: '#f7b8cf', armor: '#f7b8cf', trim: '#d8a63e', hem: '#8a1f4a', mask: '#ffe6da', eye: '#3a2020', lips: '#d0405a', pins: '#ffd27a', bloom: '#ff6fa0', inner: '#ffffff' };
const PRINCESS_FAN = { id: 'hanafan', name: 'Hana\'s fan', r: 'rare', dmg: 0, fan: true, blade: '#fff0f6', edge: '#ff8fb8', tsuba: '#8a1f4a', wrap: '#8a1f4a' };
function playCutscene(which, onDone) {
  const lines = STORY[which], C = STORYCUT = { which, lines, i: -1, t: 0, lt: 0, onDone, actors: {}, fx: 0 };
  closeOverlay(); $('#ui').hidden = true; hideHUD();
  transition(() => {
    clearSceneActors();
    const W = buildWorld(which === 'rescue' ? 6 : 0); activateWorld(W); C.W = W;
    const add = (look, sword, opt, x, z, ry) => { const r = new Samurai(look, sword, opt || {}); r.root.rotation.order = 'YXZ'; r.root.position.set(x, 0, z); r.root.rotation.y = ry || 0; W.scene.add(r.root); if (r.trail) W.scene.add(r.trail.mesh); return r; };
    const hero = add(lookFromOutfit(outfitDef(S.outfit)), swordDef(eqSword().id), {}, which === 'rescue' ? 0 : -5.5, which === 'rescue' ? -3.2 : 1.2, which === 'rescue' ? 0 : Math.PI / 2);
    hero.setSheathed(true); hero.setHold('rest', 6); C.actors.hero = hero;
    const hana = add(PRINCESS_LOOK, PRINCESS_FAN, { noSaya: true }, 0, which === 'rescue' ? 2.2 : 0, which === 'rescue' ? Math.PI : 0);
    hana.setHold('show', 4); hana.breath = .5; C.actors.hana = hana;
    if (which === 'prologue') {
      const st = STAGES.find(s => s.ch === NL - 1 && s.boss);
      const shogun = add(st.look, swordDef(st.sword), { boss: true }, 0, 3.2, Math.PI); shogun.root.visible = false; shogun.setHold('guard', 6);
      shogun.mat.emissive = new COL(st.look.aura).multiplyScalar(.22); shogun.baseEmissive = shogun.mat.emissive.clone();
      const rl = lookFromOutfit(outfitDef('shadow'));
      C.actors.riders = [add(rl, swordDef('iron'), {}, -1.8, 2.4, Math.PI * .85), add(rl, swordDef('iron'), {}, 1.8, 2.4, -Math.PI * .85)];
      C.actors.riders.forEach(r => { r.root.visible = false; r.setHold('guard', 6); });
      C.actors.shogun = shogun;
      // the ribbon left on the road
      const rib = new THREE.Mesh(new THREE.TorusGeometry(.07, .025, 6, 12), glowify(new THREE.MeshBasicMaterial({ color: '#ff8fc0' })));
      rib.position.set(0, .06, .3); rib.rotation.x = Math.PI / 2; rib.visible = false; W.scene.add(rib); C.actors.ribbon = rib;
    }
    C.cam = new V3(); C.look = new V3(); C.snap = true;
    $('#storyBox').hidden = false; $('#storySkip').hidden = false;
    MUSIC.start(which === 'rescue' ? 'hub' : 'fight');
    setMode(StoryMode);
    cutNext();
  }, true);
}
function cutNext() {
  const C = STORYCUT; if (!C) return;
  C.i++; C.lt = 0;
  if (C.i >= C.lines.length) { cutEnd(); return; }
  const L = C.lines[C.i];
  const box = $('#storyBox'); box.classList.remove('show'); void box.offsetWidth;
  box.innerHTML = `<p>${fill(L.t)}</p><small>Tap to continue</small>`; box.classList.add('show');
  cutShot(L.shot, true);
}
function cutEnd() {
  const C = STORYCUT; if (!C) return;
  STORYCUT = null;
  $('#storyBox').hidden = true; $('#storySkip').hidden = true; $('#storyTint').style.opacity = 0;
  if (C.which === 'prologue') { S.story.pro = true; save(); }
  const done = C.onDone;
  if (C.which === 'rescue') { storyEnding(done); return; }
  if (done) done(); else enterHub();
}
function storyEnding(then) {
  enterHub();
  setTimeout(() => {
    openOverlay(`<div class="modal win ending"><div class="eyebrow">The Rescue of Princess Hana</div><div class="kicker">The End</div>
      <p class="muted">${nm()} crossed seven lands, defeated the Eternal Shogun and brought Princess Hana home.</p>
      <p class="credits">A legend imagined by <b>Shep</b></p>
      <p class="muted" style="font-size:13px">Your journey isn't over: rematch any warrior for stars and rare blades, forge legends, and challenge your rivals.</p>
      <div class="actions"><button class="btn primary" data-close="1">Continue</button></div></div>`);
    if (then) { const t = then; setTimeout(() => { const b = document.querySelector('.ending [data-close]'); if (b) b.addEventListener('click', () => setTimeout(t, 200), { once: true }); }, 50); }
  }, 900);
}
/* each shot sets up what happens during one line of narration */
function cutShot(shot) {
  const C = STORYCUT, A = C.actors, tint = $('#storyTint');
  C.shot = shot;
  if (shot === 'dark') { tint.style.background = 'radial-gradient(ellipse at 50% 40%, rgba(40,10,60,.25), rgba(10,0,20,.75))'; tint.style.opacity = 1;
    A.shogun.root.visible = true; A.riders.forEach(r => { r.root.visible = true; }); [A.shogun, ...A.riders].forEach(r => FX.puff(r.root.position.clone().add(new V3(0, 1, 0)), 7, '#4a2a5a', .55)); sfx.taiko(1.3); }
  if (shot === 'menace') { A.hana.setHold('blockMid', 4); sfx.warn(); }
  if (shot === 'vanish') { const at = A.hana.root.position.clone().add(new V3(0, 1, 0)); FX.puff(at, 12, '#5a3a6a', .7); FX.petals(at, 50, '#ffb7d0', 3.2); sfx.whoosh();
    [A.hana, A.shogun, ...A.riders].forEach(r => { r.root.visible = false; }); A.ribbon.visible = true; }
  if (shot === 'ribbon') tint.style.opacity = .55;
  if (shot === 'vow') { A.hero.drawSword({ to: ['endL', 'show'], durs: [.18, .6] }); tint.style.opacity = .25; sfx.slash(1); }
  if (shot === 'cage') { tint.style.background = 'radial-gradient(ellipse at 50% 40%, rgba(60,30,90,.1), rgba(10,0,30,.6))'; tint.style.opacity = 1; }
  if (shot === 'free') { FX.glowBurst(A.hana.root.position.clone().add(new V3(0, 1, 0)), '#ffd6f0', 1.4, .6); FX.petals(A.hana.root.position.clone().add(new V3(0, 1.2, 0)), 30, '#ffb7d0', 2.5); tint.style.opacity = .5; sfx.win(); }
  if (shot === 'bow') { tint.style.opacity = .35; }
  if (shot === 'fireworks') { tint.style.opacity = .2; }
}
function cutUpdate(dt) {
  const C = STORYCUT; if (!C) return;
  C.t += dt; C.lt += dt;
  const A = C.actors, s = C.shot, k = C.lt;
  let pos, look;
  const hp = A.hana.root.position, hero = A.hero;
  if (C.which === 'prologue') {
    if (s === 'festival') { const a = -0.6 + k * .08; pos = new V3(Math.sin(a) * 4.2, 1.6, Math.cos(a) * 4.2); look = new V3(0, 1.2, 0); if (Math.random() < dt * 3) FX.petals(new V3(rnd(-3, 3), 3.5, rnd(-2, 3)), 2, '#ffc2da', .6); }
    else if (s === 'dark' || s === 'menace') {
      pos = new V3(2.6, 1.5, -3.2); look = new V3(0, 1.4, 1.6);
      if (s === 'menace') { A.shogun.root.position.z = Math.max(1.3, 3.2 - k * .45); A.riders.forEach((r, i) => { r.root.position.z = Math.max(1.2, 2.4 - k * .3); r.root.position.x = (i ? 1 : -1) * Math.max(1.1, 1.8 - k * .2); }); }
    }
    else if (s === 'vanish') { pos = new V3(0, 2.2, -4.5); look = new V3(0, .8, 0); if (k < 1.2 && Math.random() < dt * 20) FX.petals(new V3(rnd(-.5, .5), 1, rnd(-.5, .5)), 2, '#ffb7d0', 2); }
    else if (s === 'ribbon') {
      hero.root.position.x = Math.min(-.55, -5.5 + k * 1.8); hero.root.rotation.y = Math.PI / 2;
      const walking = hero.root.position.x < -.56; hero.crouch = walking ? 0 : -.3 * Math.min(1, (k - 2.7) * 2); hero.leanAdd = walking ? .08 : .5 * Math.min(1, (k - 2.7) * 2);
      const ph = k * 9; if (walking) { hero.feet.L.set(.15, .035 + Math.max(0, Math.sin(ph)) * .12, Math.sin(ph) * .25); hero.feet.R.set(-.15, .035 + Math.max(0, -Math.sin(ph)) * .12, -Math.sin(ph) * .25); }
      if (!walking && k > 3.4 && A.ribbon.visible) { A.ribbon.visible = false; FX.glowBurst(A.ribbon.position, '#ff8fc0', 1.2); sfx.coin(); }
      pos = new V3(-1.6, 1.3, -2.6); look = new V3(-.6, .7, .3);
    }
    else if (s === 'vow') { hero.crouch = lerp(hero.crouch, 0, damp(4, dt)); hero.leanAdd = lerp(hero.leanAdd, 0, damp(4, dt)); hero.root.rotation.y = lerp(hero.root.rotation.y, 0, damp(2, dt));
      const hx = hero.root.position.x, hz = hero.root.position.z; pos = new V3(hx + .9 + Math.sin(k * .3) * .4, 1.05, hz + 3.1); look = new V3(hx, 1.35, hz); }
  } else {
    if (s === 'cage') { pos = new V3(0, 3.2, -7); look = new V3(0, 1, 1.5); if (Math.random() < dt * 8) FX.sparks(hp.clone().add(new V3(rnd(-.8, .8), rnd(.3, 2), rnd(-.8, .8))), '#b88aff', 3, 1.5); }
    else if (s === 'free' || s === 'bow') {
      hero.root.position.z = Math.min(1.0, -3.2 + C.t * .9); const walking = hero.root.position.z < .98, ph = C.t * 9;
      if (walking) { hero.feet.L.set(.15, .035 + Math.max(0, Math.sin(ph)) * .12, Math.sin(ph) * .25); hero.feet.R.set(-.15, .035 + Math.max(0, -Math.sin(ph)) * .12, -Math.sin(ph) * .25); }
      if (s === 'bow') { const b = Math.min(1, k / .8) * (k < 3.2 ? 1 : Math.max(0, 1 - (k - 3.2) / .8)); A.hana.leanAdd = b * .65; hero.leanAdd = Math.max(0, Math.min(1, (k - .9) / .8)) * (k < 3.6 ? 1 : Math.max(0, 1 - (k - 3.6) / .8)) * .6; }
      pos = s === 'free' ? new V3(2.8, 1.6, -1.2) : new V3(-2.4, 1.5, 1.6); look = new V3(0, 1.2, 1.5);
    }
    else if (s === 'fireworks') {
      pos = new V3(Math.sin(k * .15) * 1.5, 1.2, -2.2); look = new V3(0, 3.5, 6);
      C.fx -= dt; if (C.fx <= 0) { C.fx = rnd(.45, .9); const p = new V3(rnd(-10, 10), rnd(9, 14), rnd(16, 26)), col = pick(['#ffd27a', '#ff8fc0', '#7fe8ff', '#b8ff8a', '#ff7a5a']); FX.glowBurst(p, col, 1.8, .45); FX.sparks(p, col, 36, 6, .1); sfx.clang(.35); }
    }
  }
  if (pos) { C.cam.lerp(pos, C.snap ? 1 : damp(2.5, dt)); C.look.lerp(look, C.snap ? 1 : damp(2.5, dt)); C.snap = false; }
  CAM.position.copy(C.cam); CAM.lookAt(C.look); CAM.fov = lerp(CAM.fov, 48, damp(4, dt)); CAM.updateProjectionMatrix(); FX.setScale();
  for (const r of [A.hero, A.hana, A.shogun, ...(A.riders || [])]) if (r) r.update(dt);
  if (C.lt > 9) cutNext(); // gentle auto-advance if nobody taps
}
const StoryMode = {
  name: 'story',
  update(dt) { cutUpdate(dt); },
  down() { if (STORYCUT && STORYCUT.lt > .5) cutNext(); },
  move() {}, up() {},
};

/* ---------- the title screen ---------- */
let TITLE_UP = false;
function showTitle() {
  TITLE_UP = true; $('#ui').hidden = true;
  const t = $('#title'), ch = currentChapter(), fresh = !S.tutDone && !Object.keys(S.beaten).length;
  t.innerHTML = `<div class="ttl-inner">
    <div class="ttl-mark">刀</div>
    <h1>Shep's Katana Legend</h1>
    ${storyOn() ? '<div class="ttl-sub">The Rescue of Princess Hana</div>' : '<div class="ttl-sub">A Samurai Legend</div>'}
    <button class="btn primary ttl-go" data-title-go="1">${fresh ? 'Begin' : 'Continue'}</button>
    <div class="ttl-who">${sealSVG({ name: S.name, seal: S.seal }, 40)}<span><b>${nm()}</b><small>${fresh ? 'A new legend' : S.journey[NL - 1].myth ? 'Legend of the seven lands' : `Chapter ${ch + 1} · ${CHAPTERS[ch].name}`}</small></span></div>
  </div>`;
  t.hidden = false; t.classList.remove('out');
}
function hideTitle() {
  if (!TITLE_UP) return;
  TITLE_UP = false; AUD.init(); sfx.taiko(1);
  const t = $('#title'); t.classList.add('out'); setTimeout(() => { t.hidden = true; }, 600);
  if (MODE === HubMode) $('#ui').hidden = false;
}

/* ---------- the princess's trail, in the Quest tab ---------- */
function storyPanel() {
  if (!storyOn()) return '';
  const got = STORY.done.map((d, i) => !!S.story.seen['c' + i]);
  const n = got.filter(Boolean).length, cur = currentChapter();
  return `<section class="panel story-panel">
    <div class="row between"><h3>The princess's trail</h3><span class="muted">${n} / 7 keepsakes</span></div>
    <p class="muted">${S.journey[NL - 1].myth ? 'You rescued Princess Hana! Relive the story any time.' : `Princess Hana was taken by the Eternal Shogun. Her trail leads through <b>${CHAPTERS[cur].name}</b>.`}</p>
    <div class="keeps">${STORY.done.map((d, i) => got[i] ? `<button class="keep-slot" data-story-read="c${i}" title="${esc(d.name)}">${keepSVG(d.keep, 54)}<small>${esc(d.name)}</small></button>` : `<div class="keep-slot locked"><span>?</span><small>${CHAPTERS[i].name}</small></div>`).join('')}</div>
    <div class="row"><button class="btn small" data-story-play="prologue">▶ Watch the beginning</button>${S.journey[NL - 1].myth ? '<button class="btn small" data-story-play="rescue">▶ Watch the rescue</button>' : ''}</div>
  </section>`;
}
function storyClick(d) {
  if (d.titleGo) { hideTitle(); return true; }
  if (d.storyClose) { storyClose(); return true; }
  if (d.storyRead) { storyCard(d.storyRead, true); return true; }
  if (d.storyPlay) { playCutscene(d.storyPlay, () => { enterHub(); setTimeout(() => showTab('quest'), 500); }); return true; }
  if (d.storyBegin) { // a brand new player: the prologue, then out onto the road
    if (storyOn() && !S.story.pro) playCutscene('prologue', () => startExplore(null)); else startExplore(null);
    return true;
  }
  if (d.storySkip) { cutEnd(); return true; }
  return false;
}
