'use strict';
/* ===== Duels: wax seals, loadouts, duel stats, the pre-fight showcase, challenge scrolls,
   and the blade ceremony. Loaded before versus.js. ===== */

/* ---------- wax seals ---------- */
const SEAL_WAX = [['#d42a35', '#7a0c14'], ['#a8193a', '#4a0612'], ['#3456b8', '#101f55'], ['#2f8a52', '#0f3220'], ['#4a4352', '#0d0b10'], ['#d8a63e', '#7a5410'], ['#8640b0', '#33114a']];
let _sealN = 0;
function seededRng(seed) { let a = (seed | 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function sealSVG(p, size) {
  const st = (p && p.seal) || { c: 0, m: 0, s: 1 }, rng = seededRng(st.s + 7), id = 'sl' + (++_sealN);
  const [hi, lo] = SEAL_WAX[st.c % SEAL_WAX.length];
  const kj = SEAL_KANJI[Math.abs(st.k == null ? st.s : st.k) % SEAL_KANJI.length], letter = kj[0];
  // a lumpy wax blob with a couple of runs at the edge
  const N = 30, bulge = [0, 1, 2].map(() => ({ a: rng() * Math.PI * 2, s: 3 + rng() * 5 }));
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2; let r = 43 + rng() * 3.2;
    for (const b of bulge) { const d = Math.atan2(Math.sin(a - b.a), Math.cos(a - b.a)); r += b.s * Math.exp(-d * d * 18); }
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  let path = '';
  for (let i = 0; i < N; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % N], m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    path += (i ? ' Q' : `M${((pts[N - 1][0] + p0[0]) / 2).toFixed(1)} ${((pts[N - 1][1] + p0[1]) / 2).toFixed(1)} Q`) + `${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  let motif = '';
  const m = st.m % 4;
  if (m === 0) for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; motif += `<circle cx="${(Math.cos(a) * 36.5).toFixed(1)}" cy="${(Math.sin(a) * 36.5).toFixed(1)}" r="1.9"/>`; }
  else if (m === 1) for (let i = 0; i < 12; i++) { const a = i / 12 * 360; motif += `<ellipse cx="0" cy="-36.5" rx="2.2" ry="4.2" transform="rotate(${a})"/>`; }
  else if (m === 2) for (let i = 0; i < 16; i++) { const a = i / 16 * 360; motif += `<path d="M-3 -35 Q0 -39 3 -35" fill="none" stroke-width="1.6" transform="rotate(${a})"/>`; }
  else for (let i = 0; i < 8; i++) { const a = i / 8 * 360 + 22.5; motif += `<path d="M0 -40 L2.6 -36.5 L0 -33 L-2.6 -36.5Z" transform="rotate(${a})"/>`; }
  const sz = size || 64;
  return `<svg class="wseal" width="${sz}" height="${sz}" viewBox="-52 -52 104 104" role="img" aria-label="${kj[1]} seal">
    <defs><radialGradient id="${id}w" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${hi}"/><stop offset=".7" stop-color="${lo}"/><stop offset="1" stop-color="${lo}"/></radialGradient>
    <radialGradient id="${id}p" cx="60%" cy="65%" r="70%"><stop offset="0" stop-color="${hi}" stop-opacity=".85"/><stop offset="1" stop-color="${lo}"/></radialGradient></defs>
    <path d="${path}" fill="url(#${id}w)" transform="translate(1.5 2.5)" opacity=".35" style="fill:#000"/>
    <path d="${path}" fill="url(#${id}w)"/>
    <circle r="31.5" fill="url(#${id}p)" stroke="${lo}" stroke-width="2.4"/>
    <circle r="31.5" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1" transform="translate(-.8 -.8)"/>
    <g fill="${lo}" stroke="${lo}" opacity=".9">${motif}</g>
    <text y="13" text-anchor="middle" font-family="'Yuji Syuku','Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" font-weight="700" font-size="38" fill="#fff" fill-opacity=".3" transform="translate(-1 -1)">${letter}</text>
    <text y="13" text-anchor="middle" font-family="'Yuji Syuku','Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" font-weight="700" font-size="38" fill="${lo}">${letter}</text>
    <ellipse cx="-16" cy="-24" rx="13" ry="6" fill="#fff" opacity=".18" transform="rotate(-30 -16 -24)"/>
  </svg>`;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- profiles: everything the other device needs to rebuild you ---------- */
const SK_KEYS = ['power', 'speed', 'guard', 'vital', 'iai'];
function swordPack(w) {
  if (!w) return { u: -1, id: 'bokken', lvl: 0, q: 1, inf: [] };
  return { u: w.u, id: w.id, lvl: w.lvl || 0, q: w.q || 1, inf: (w.inf || []).slice(0, 8), made: !!w.made, maker: w.maker || null, won: w.won || null };
}
function myIdent() { return { pid: S.pid, name: (S.name || 'Shep').slice(0, 14), seal: S.seal }; }
function myDuelProfile(outfit, swordU, bokken) {
  const w = bokken ? null : (S.swords.find(x => x.u === swordU && !x.captured) || eqSword());
  const sk = {}; SK_KEYS.forEach(k => { sk[k] = S.sk[k].l; });
  return Object.assign(myIdent(), { outfit: S.outfits.includes(outfit) ? outfit : S.outfit, sk, sword: swordPack(w), v: VS_BUILD });
}
function cleanSeal(o) { return o && typeof o === 'object' ? { c: clamp(o.c | 0, 0, 6), m: clamp(o.m | 0, 0, 3), s: o.s | 0, k: clamp(o.k == null ? Math.abs(o.s | 0) % SEAL_KANJI.length : o.k | 0, 0, SEAL_KANJI.length - 1) } : { c: 0, m: 0, s: 1, k: 0 }; }
function cleanWho(o) { return o && typeof o === 'object' ? { n: String(o.n || '').slice(0, 14), pid: String(o.pid || '').slice(0, 8), seal: cleanSeal(o.seal) } : null; }
/* never trust what comes over the wire */
function cleanProfile(p) {
  p = p && typeof p === 'object' ? p : {};
  const sk = {}; SK_KEYS.forEach(k => { sk[k] = clamp((p.sk && p.sk[k]) | 0, 1, 30); });
  const w = p.sword && typeof p.sword === 'object' ? p.sword : {};
  const id = SWORDS.some(s => s.id === w.id) ? w.id : 'bokken';
  return {
    pid: String(p.pid || 'guest').slice(0, 8), name: String(p.name || 'Friend').slice(0, 14), seal: cleanSeal(p.seal),
    outfit: OUTFITS.some(o => o.id === p.outfit) ? p.outfit : 'ronin', sk,
    sword: { u: w.u | 0, id, lvl: clamp(w.lvl | 0, 0, 12), q: clamp(+w.q || 1, 1, 1.15), inf: Array.isArray(w.inf) ? w.inf.filter(m => MATERIALS[m]).slice(0, 8) : [], made: !!w.made, maker: cleanWho(w.maker), won: cleanWho(w.won) },
    v: p.v,
  };
}
/* Training, armor and blade all count, squashed with square roots so a newer player can still land blows. */
function duelStats(p) {
  const o = outfitDef(p.outfit), k = p.sk, fx = swordFx(p.sword);
  const maxHp0 = 100 + (k.vital - 1) * 12 + (o.hp || 0);
  const atk0 = swordDmg(p.sword) * (1 + (k.power - 1) * 0.08 + (o.dmg || 0));
  return {
    hp: Math.round(120 * Math.sqrt(maxHp0 / 100)),
    dmg: 11 * Math.sqrt(atk0 / 7),
    pass: clamp(.3 * (1 - (k.guard - 1) * .02) - fx.guard * .5, .08, .3),
    parryWin: Math.min(.72, .55 + (k.guard - 1) * .006),
    tele: VS_TELE * (1 - (k.speed - 1) * .006),
    regen: 30 + (k.speed - 1) * 1.2, atkCost: Math.max(14, 22 - (k.speed - 1) * .3),
    stepCost: VS_STEP_COST * (1 - (k.iai - 1) * .012), stepCd: VS_STEP_CD * (1 - (k.iai - 1) * .01),
    crit: Math.min(.4, .05 + fx.crit),
  };
}
function duelPower(p) { const s = duelStats(p); return Math.round(s.dmg * Math.sqrt(s.hp / 120) * (1 + (.3 - s.pass))); }

/* ---------- loadout picker: armor + blade before every duel ---------- */
let LOADOUT = null;
function loadoutBlades(rule) { return rule === 'wager' ? wagerBlades() : rule === 'bokken' ? [] : usableSwords(); }
function openLoadout(o) {
  // o: { title, sub, rule: 'any'|'wager'|'bokken', onPick(outfit, swordU), guest: bool, cancel: fn }
  const blades = loadoutBlades(o.rule);
  const cur = blades.find(w => w.u === S.eq) || blades.slice().sort((a, b) => swordDmg(b) - swordDmg(a))[0];
  LOADOUT = Object.assign({ outfit: S.outfit, u: cur ? cur.u : -1 }, o);
  drawLoadout();
}
function drawLoadout() {
  const L = LOADOUT; if (!L) return;
  const blades = loadoutBlades(L.rule);
  const prof = myDuelProfile(L.outfit, L.u, L.rule === 'bokken'), st = duelStats(prof);
  openOverlay(`<div class="modal loadout" style="text-align:left">
    <div class="eyebrow">${esc(L.sub || 'Prepare for the duel')}</div>
    <h2>${esc(L.title || 'Choose your armor and blade')}</h2>
    <h3 class="lo-h">Armor</h3>
    <div class="lo-row">${S.outfits.map(id => { const d = outfitDef(id); return `<button class="lo-chip ${L.outfit === id ? 'sel' : ''}" data-lo-outfit="${id}">
      <span class="swatch"><i style="background:${d.armor}"></i><i style="background:${d.cloth}"></i><i style="background:${d.trim}"></i></span>
      <b>${esc(d.name)}</b><small>${d.hp ? '+' + d.hp + ' health' : ''}${d.dmg ? ' +' + Math.round(d.dmg * 100) + '% attack' : ''}${!d.hp && !d.dmg ? 'No bonus' : ''}</small></button>`; }).join('')}</div>
    <h3 class="lo-h">Blade${L.rule === 'wager' ? ' <small class="muted">· blades you forged or won</small>' : ''}</h3>
    ${L.rule === 'bokken' ? `<p class="lo-note">${esc(L.bokkenWhy || 'One of you has no forged or won blade to wager yet, so this is an honor duel: both fight with bokkens and no blade changes hands.')}</p>` : `
    <div class="lo-blades">${blades.map(w => { const d = swordDef(w.id); return `<button class="lo-blade ${L.u === w.u ? 'sel' : ''}" data-lo-sword="${w.u}" style="--rc:${RAR[d.r].c}">
      ${bladeSVG(d)}<span class="nm">${esc(d.name)}${w.lvl ? ' +' + w.lvl : ''}</span><small>${rarTag(d)} · ${Math.round(swordDmg(w))} dmg${w.won ? ' · 🏆 won from ' + esc(w.won.n) : ''}</small></button>`; }).join('')}</div>`}
    <div class="lo-stats">${[['Health', st.hp], ['Attack', Math.round(st.dmg)], ['Guard', Math.round((1 - st.pass) * 100) + '%'], ['Speed', Math.round(VS_TELE / st.tele * 100) + '%']].map(([n, v]) => `<div><b>${v}</b><span>${n}</span></div>`).join('')}</div>
    ${L.rule === 'wager' ? '<p class="lo-warn">⚠ The blade you choose is at stake. Lose, and it belongs to your rival.</p>' : ''}
    <div class="actions">${L.cancel ? '<button class="btn" data-lo-cancel="1">Cancel</button>' : ''}<button class="btn primary" data-lo-ready="1">Ready ⚔</button></div>
  </div>`);
}
function loadoutClick(d) {
  const L = LOADOUT; if (!L) return false;
  if (d.loOutfit) { L.outfit = d.loOutfit; sfx.ui(); drawLoadout(); return true; }
  if (d.loSword) { L.u = +d.loSword; sfx.ui(); drawLoadout(); return true; }
  if (d.loCancel) { LOADOUT = null; closeOverlay(); if (L.cancel) L.cancel(); return true; }
  if (d.loReady) { LOADOUT = null; sfx.taiko(.8); L.onPick(L.outfit, L.rule === 'bokken' ? -1 : L.u); return true; }
  return false;
}

/* ---------- pre-fight showcase: the blades are the stars ---------- */
function showCard(p, side) {
  const d = swordDef(p.sword.id), o = outfitDef(p.outfit), st = duelStats(p), w = p.sword;
  const hist = w.won ? `🏆 Won from ${esc(w.won.n)}` : w.made ? `⚒ Forged by ${esc(w.maker ? w.maker.n : p.name)}` : d.wood ? 'Practice blade' : '';
  const skills = SK_KEYS.map(k => `<div class="sk"><span>${SKILLS[k].n}</span><i><em style="width:${Math.round(p.sk[k] / 30 * 100)}%"></em></i><b>${p.sk[k]}</b></div>`).join('');
  return `<div class="sc-card ${side}" style="--rc:${RAR[d.r].c};--glow:${d.glow || RAR[d.r].c}">
    <div class="sc-who">${sealSVG(p, 46)}<div><div class="sc-name">${esc(p.name)}</div><small>${esc(o.name)}${o.hp ? ' · +' + o.hp + ' hp' : ''}${o.dmg ? ' · +' + Math.round(o.dmg * 100) + '% atk' : ''}</small></div></div>
    <div class="sc-blade"><div class="rays"></div>${bladeSVG(d)}</div>
    <div class="sc-bname ${d.r}">${esc(d.name)}${w.lvl ? ` <span>+${w.lvl}</span>` : ''}</div>
    <div class="sc-btags">${rarTag(d)}${d.el ? ' ' + elTag(d.el) : ''}${hist ? ` <span class="hist">${hist}</span>` : ''}</div>
    <div class="sc-nums"><div><b>${st.hp}</b><span>Health</span></div><div><b>${Math.round(st.dmg)}</b><span>Attack</span></div><div><b>${Math.round((1 - st.pass) * 100)}%</b><span>Guard</span></div><div><b>${Math.round(st.crit * 100)}%</b><span>Crit</span></div></div>
    <div class="sc-skills">${skills}</div>
  </div>`;
}
function renderShowcase(a, b, mode, land, secs) {
  const el = $('#vsShow');
  el.innerHTML = `<div class="sc-top"><div class="sc-mode ${mode}">${mode === 'challenge' ? (a.sword.id === 'bokken' && b.sword.id === 'bokken' ? 'Honor duel' : 'Challenge · blades at stake') : 'Arcade duel'} · best of 3</div>
    <div class="sc-land">${esc(CHAPTERS[land].name)} <span>${CHAPTERS[land].jp}</span></div></div>
    ${showCard(a, 'left')}${showCard(b, 'right')}
    <div class="sc-vs">VS</div><div class="sc-count" id="scCount">${secs}</div>`;
  el.hidden = false;
}
function hideShowcase() { const el = $('#vsShow'); if (el) { el.hidden = true; el.innerHTML = ''; } }

/* ---------- rivals: anyone you've met on the dueling ground ---------- */
function addRival(h) {
  if (!h || !h.pid || h.pid === 'guest' || h.pid === S.pid || !/^[A-Z2-9]{8}$/.test(h.pid)) return null;
  let r = S.rivals.find(x => x.pid === h.pid);
  if (!r) { r = { pid: h.pid, n: h.name || h.n || 'Samurai ' + h.pid.slice(0, 4), seal: cleanSeal(h.seal), t: Date.now(), w: 0, l: 0 }; S.rivals.unshift(r); if (S.rivals.length > 40) S.rivals.length = 40; }
  else { if (h.name || h.n) r.n = String(h.name || h.n).slice(0, 14); if (h.seal) r.seal = cleanSeal(h.seal); r.t = Date.now(); }
  save(); return r;
}
const rivalFace = r => ({ name: r.n, seal: r.seal });

/* ---------- the duel is decided: blades change hands (both devices apply it at once) ---------- */
function duelDecided(forfeit) {
  if (!VS || VS.decided) return; VS.decided = true; VS.forfeit = !!forfeit;
  const iWon = VS.winner === VS.A, mine = VS.profA.sword, theirs = VS.profB.sword, them = VS.profB;
  const honor = mine.id === 'bokken' || theirs.id === 'bokken';
  VS.honor = honor;
  S.duels = S.duels || { w: 0, l: 0 }; S.duels[iWon ? 'w' : 'l']++;
  const r = addRival(them); if (r) r[iWon ? 'w' : 'l'] = (r[iWon ? 'w' : 'l'] || 0) + 1;
  if (!honor) {
    if (iWon) {
      const w = addSword(theirs.id); w.lvl = theirs.lvl; w.q = theirs.q; if (theirs.inf.length) w.inf = theirs.inf.slice();
      w.maker = theirs.maker || (theirs.made ? { n: them.name, pid: them.pid, seal: them.seal } : null);
      w.won = { n: them.name, pid: them.pid, seal: them.seal, t: Date.now() };
      VS.prize = w;
    } else {
      const i = S.swords.findIndex(w => w.u === mine.u);
      if (i >= 0) {
        const [gone] = S.swords.splice(i, 1);
        S.given = (S.given || []).concat([{ id: gone.id, who: them.name, t: Date.now() }]).slice(-30);
        if (S.eq === gone.u) { const b = bestSword(); S.eq = b ? b.u : -1; }
        ensureArmedFallback();
      }
      VS.lostBlade = mine;
    }
  }
  if (VS.cid && S.chal[VS.cid]) { const c = S.chal[VS.cid]; c.st = 'done'; c.res = iWon ? 'won' : 'lost'; c.blade = honor ? null : (iWon ? theirs.id : mine.id); c.t = Date.now(); }
  save();
}

/* ---------- the blade ceremony, seen in first person on each device ---------- */
const CERE_POSE = {
  present: { p: [-0.2, -0.1, 0.4], d: [1, 0.04, 0], e: [0, 1, 0] },
  offer: { p: [-0.2, -0.22, 0.5], d: [1, 0, 0], e: [0, 1, 0] },
  hold: { p: [-0.2, 0.0, 0.36], d: [1, 0.06, 0], e: [0, 1, 0] },
  raise: { p: [-0.16, 0.3, 0.3], d: [1, 0.1, 0], e: [0, 1, 0] },
  rest: { p: [-0.22, -0.36, 0.14], d: [-0.12, -0.45, 0.9], e: [0, -1, 0] },
};
function poseFromObject(rig, obj) {
  rig.root.updateMatrixWorld(true);
  const p = rig.chest.worldToLocal(obj.getWorldPosition(new V3()));
  const qc = rig.chest.getWorldQuaternion(new Q4()).invert(), qo = obj.getWorldQuaternion(new Q4());
  const q = qc.multiply(qo), d = new V3(0, 1, 0).applyQuaternion(q), e = new V3(0, 0, 1).applyQuaternion(q);
  return { p: p.toArray(), d: d.toArray(), e: e.toArray() };
}
/* the receiving grip: right hand near the scabbard's far end, left hand at its mouth, so the arms never cross */
function receivePose(rig, saya) {
  rig.root.updateMatrixWorld(true);
  const qc = rig.chest.getWorldQuaternion(new Q4()).invert(), qs = saya.getWorldQuaternion(new Q4());
  const dirW = new V3(0, 1, 0).applyQuaternion(qs), at = saya.getWorldPosition(new V3()).addScaledVector(dirW, .34);
  const q = qc.multiply(qs), d = new V3(0, -1, 0).applyQuaternion(q), e = new V3(0, 0, 1).applyQuaternion(q);
  return { p: rig.chest.worldToLocal(at).toArray(), d: d.toArray(), e: e.toArray() };
}
function cereStart() {
  const C = VS.cere = { t: 0, honor: VS.honor, iWon: VS.winner === VS.A, steps: {} };
  VS.phase = 'cere'; closeOverlay();
  $('#hud').classList.add('vs-cere'); document.body.classList.add('cine');
  transition(() => {
    vsSpawn(); // both samurai healed and whole again (fresh objects: decide roles from C.iWon, not VS.winner)
    const { A, B } = VS, W = C.iWon ? A : B, L = W === A ? B : A;
    C.W = W; C.L = L; VS.winner = W; VS.loser = L;
    const gap = C.honor ? 1.8 : 1.5; C.gap = gap;
    A.rig.root.position.set(0, 0, 0); A.rig.root.rotation.set(0, 0, 0);
    B.rig.root.position.set(0, 0, gap); B.rig.root.rotation.set(0, Math.PI, 0);
    for (const f of [A, B]) { f.rig.setSheathed(true); f.rig.cere = true; f.rig.setHold(CERE_POSE.present, 6); f.rig.relaxW = 1; f.rig.breath = .6; }
    A.rig.setFP(true);
    C.blade = swordDef((C.iWon ? VS.profB : VS.profA).sword.id);
    banner(C.honor ? 'BOW TO YOUR RIVAL' : `${L.name.toUpperCase()} SURRENDERS THE BLADE`, C.honor ? 'An honor duel ends with respect' : C.blade.name);
    sfx.taiko(.8);
  }, true);
}
function cereStep(key, at) { const C = VS.cere; if (C.t >= at && !C.steps[key]) { C.steps[key] = true; return true; } return false; }
function cereUpdate(dt) {
  const C = VS.cere, { A, B } = VS; if (!C || !C.W) { if (A) { A.rig.update(dt); B.rig.update(dt); } return; }
  C.t += dt; VS.clock += dt;
  const W = C.W, L = C.L, bow = (f, from, to, deep) => { const k = C.t < from ? 0 : C.t < from + .7 ? easeOut((C.t - from) / .7) : C.t < to ? 1 : C.t < to + .7 ? 1 - ease((C.t - to) / .7) : 0; f.rig.leanAdd = k * deep; f.rig.crouch = -k * .05; return k; };
  let bowA = 0;
  if (C.honor) {
    const ka = bow(A, 1.2, 2.8, .7), kb = bow(B, 1.4, 2.9, .7); bowA = ka;
    if (cereStep('s', 1.2)) sfx.taiko(.6);
    if (C.t > 4.6 && !C.done) { C.done = true; cereResult(); }
  } else {
    const ramp = (a, b) => clamp((C.t - a) / (b - a), 0, 1);
    L.rig.relaxW = 1 - ramp(.9, 1.5) + ramp(7.0, 7.8);
    W.rig.relaxW = 1 - ramp(5.8, 6.4);
    // a respectful step forward to offer the blade, and back again after
    const step = ease(ramp(5.4, 6.0)) - ease(ramp(7.6, 8.3));
    L.rig.root.position.z = L === A ? step * .38 : C.gap - step * .38;
    // the fallen samurai unties the sheathed blade from the hip…
    if (cereStep('reach', 1.1)) { L.rig.setHold(poseFromObject(L.rig, L.rig.saya), 5); }
    if (cereStep('untie', 2.1)) { L.rig.grip.add(L.rig.saya); L.rig.saya.position.set(0, 0, 0); L.rig.saya.quaternion.identity(); L.rig.cereSpread = .36; L.rig.queue(CERE_POSE.present, .9); sfx.whoosh(); }
    // …presents it with both hands and bows
    if (cereStep('offer', 3.3)) L.rig.queue(CERE_POSE.offer, .6);
    const kl = bow(L, 3.4, 6.6, .75);
    // the winner bows in return, then receives it
    const kw = bow(W, 4.0, 5.0, .55);
    if (cereStep('reach2', 6.0)) { W.rig.cereSpread = .32; W.rig.queue(receivePose(W.rig, L.rig.saya), .8); }
    if (cereStep('take', 7.0)) { W.rig.grip.add(L.rig.saya); L.rig.saya.position.set(0, .34, 0); L.rig.saya.quaternion.setFromAxisAngle(new V3(0, 0, 1), Math.PI); L.rig.cereSpread = 0; W.rig.queue(CERE_POSE.hold, .7); sfx.clang(.6); }
    if (cereStep('raise', 8.2)) { W.rig.queue(CERE_POSE.raise, .8); banner(`${C.blade.name.toUpperCase()}`, `now belongs to ${W.name}`); sfx.win(); }
    bowA = A === L ? kl : kw;
    if (C.t > 11 && !C.done) { C.done = true; cereResult(); }
  }
  A.rig.update(dt); B.rig.update(dt);
  // first person: my own eyes, looking at my rival, down at my hands while they work, and down at the floor while I bow
  A.rig.root.updateMatrixWorld(true); B.rig.root.updateMatrixWorld(true);
  const eye = A.rig.head.getWorldPosition(new V3()).add(new V3(0, .04, .06));
  const face = B.rig.head.getWorldPosition(new V3());
  const hands = A.rig.grip.getWorldPosition(new V3()).lerp(B.rig.grip.getWorldPosition(new V3()), .5);
  const handsW = C.honor ? 0 : clamp((C.t - 1.6) / .8, 0, 1) * (C.t > 9.8 ? clamp(1 - (C.t - 9.8) / .8, 0, 1) : 1) * .55;
  const look = face.clone().lerp(hands, handsW); look.y -= bowA * 1.3; look.z += bowA * .2;
  VS.camPos.lerp(eye, damp(14, dt)); VS.camLook.lerp(look, damp(6, dt));
  CAM.position.copy(VS.camPos); CAM.lookAt(VS.camLook); CAM.fov = lerp(CAM.fov, 62, damp(6, dt)); CAM.updateProjectionMatrix(); FX.setScale();
}
function cereEnd() { $('#hud').classList.remove('vs-cere'); document.body.classList.remove('cine'); }
function cereResult() {
  document.body.classList.remove('cine');
  const C = VS.cere, iWon = C.iWon, d = C.blade, them = VS.B.name;
  const body = C.honor ? `<p class="muted">An honor duel, fought with bokkens. You bowed to each other and parted with respect.</p>`
    : iWon ? `<p class="muted">By the code of the duel, ${esc(them)} has surrendered their blade. Find it among your <b>trophy blades</b> in the Swords tab. You can wield it in battle, or wager it in your next challenge.</p>`
    : `<p class="muted">You fought with honor, but ${esc(d.name)} now belongs to ${esc(them)}. Train, forge a new blade, and challenge them to win it back.</p>`;
  openOverlay(`<div class="modal ${iWon ? 'win' : ''}">
    <div class="kicker ${iWon ? '' : 'lose'}">${iWon ? 'Victory' : 'Defeat'} · ${VS.wins.A} – ${VS.wins.B}</div>
    ${C.honor ? '' : `<div class="reveal" style="--rc:${RAR[d.r].c}44;--glow:${d.glow || RAR[d.r].c}"><div class="rays"></div>${bladeSVG(d)}</div><h2 class="name ${d.r}">${esc(d.name)}</h2>`}
    ${body}
    <div class="actions"><button class="btn primary" data-vsres="home">Back to dojo</button></div></div>`);
}

/* ---------- the mailbox: scrolls wait on the relay until the rival opens the game ---------- */
const MAIL_ROOT = 'shepkatana/v2/mail/';
const MAIL = {
  links: [], seen: {},
  open() {
    if (IN_CLAUDE || this.links.length) return;
    const urls = window.VS_RELAYS || VS_RELAYS;
    this.links = urls.map(u => new MqttLink(u, MAIL_ROOT + S.pid + '/+', (txt, topic) => this.onMail(txt, topic)));
    this.links.forEach(l => l.open().then(() => { this.flush(); }).catch(() => {}));
  },
  wake() { this.links.forEach(l => l.check()); },
  queue: [],
  post(toPid, msg) {
    this.queue = this.queue.filter(q => q.to !== toPid).concat([{ to: toPid, msg }]);
    this.flush();
  },
  flush() {
    if (!this.links.some(l => l.ready)) return;
    const q = this.queue; this.queue = [];
    q.forEach(({ to, msg }) => { const topic = MAIL_ROOT + to + '/' + S.pid, txt = msg ? JSON.stringify(msg) : ''; let ok = false; this.links.forEach(l => { ok = l.pub(txt, true, topic) || ok; }); if (!ok) this.queue.push({ to, msg }); });
  },
  clear(fromPid) { const topic = MAIL_ROOT + S.pid + '/' + fromPid; this.links.forEach(l => l.pub('', true, topic)); },
  onMail(txt, topic) {
    const from = topic.split('/').pop();
    if (!txt) return;
    let m; try { m = JSON.parse(txt); } catch (e) { return; }
    if (!m || typeof m !== 'object' || !m.cid || !m.from || m.from.pid !== from) return;
    chalIncoming(m, from);
  },
};
const CH_RANK = { sent: 1, new: 1, accepted: 2, declined: 2, withdrawn: 2, open: 3, done: 4 };
function chalMsg(c, st, extra) { return Object.assign({ cid: c.cid, st, t: Date.now(), from: { pid: S.pid, n: (S.name || 'Shep').slice(0, 14), seal: S.seal } }, extra || {}); }
function chalIncoming(m, fromPid) {
  const cid = String(m.cid).slice(0, 12), st = String(m.st);
  const rival = addRival({ pid: fromPid, name: m.from.n, seal: m.from.seal });
  if (!rival) return;
  let c = S.chal[cid];
  if (!c) {
    if (st !== 'sent') { MAIL.clear(fromPid); return; } // replies about a challenge we no longer have
    c = S.chal[cid] = { cid, dir: 'in', st: 'new', rival: fromPid, t: Date.now(), note: String(m.note || '').slice(0, 80) };
    // one open challenge per rival: an older unanswered scroll from them is replaced
    Object.values(S.chal).forEach(o => { if (o !== c && o.rival === fromPid && o.dir === 'in' && o.st === 'new') o.st = 'withdrawn'; });
    save(); MAIL.clear(fromPid); chalNotify(c, 'arrived'); return;
  }
  const incomingRank = CH_RANK[st] || 0, mineRank = CH_RANK[c.st] || 0;
  if (st === 'withdrawn' && c.dir === 'in' && c.st === 'new') { c.st = 'withdrawn'; save(); MAIL.clear(fromPid); refreshVersusTab(); return; }
  if (c.dir === 'out' && incomingRank >= mineRank) {
    if (st === 'accepted') { c.st = 'accepted'; chalNotify(c, 'accepted'); }
    else if (st === 'declined') { c.st = 'declined'; chalNotify(c, 'declined'); }
    else if (st === 'open' && /^[A-Z2-9]{4}$/.test(m.code || '')) { c.st = 'open'; c.code = m.code; c.openT = +m.t || Date.now(); chalNotify(c, 'open'); }
    c.t = Date.now(); save();
  }
  MAIL.clear(fromPid);
  refreshVersusTab();
}
function newCid() { return newPid().slice(0, 8); }
function chalFor(pid) { return Object.values(S.chal).filter(c => c.rival === pid && c.st !== 'done' && c.st !== 'declined' && c.st !== 'withdrawn').sort((a, b) => b.t - a.t)[0]; }
function chalSend(pid) {
  const r = S.rivals.find(x => x.pid === pid); if (!r || chalFor(pid)) return;
  const c = { cid: newCid(), dir: 'out', st: 'sent', rival: pid, t: Date.now() };
  S.chal[c.cid] = c; save();
  MAIL.post(pid, chalMsg(c, 'sent'));
  sfx.taiko(.9); toast(`Your scroll is on its way to ${r.n}.`); refreshVersusTab();
}
function chalWithdraw(cid) { const c = S.chal[cid]; if (!c) return; c.st = 'withdrawn'; save(); MAIL.post(c.rival, chalMsg(c, 'withdrawn')); refreshVersusTab(); }
function chalAnswer(cid, yes) {
  const c = S.chal[cid]; if (!c) return;
  c.st = yes ? 'accepted' : 'declined'; c.t = Date.now(); save();
  MAIL.post(c.rival, chalMsg(c, c.st));
  closeOverlay();
  const r = S.rivals.find(x => x.pid === c.rival) || { n: 'your rival' };
  if (yes) { sfx.taiko(1.2); openOverlay(`<div class="modal"><div class="eyebrow">Challenge accepted</div><h2>You will face ${esc(r.n)}</h2>
    <p class="muted">You host this duel. When you are both ready to fight, open the dueling ground. ${esc(r.n)} receives the code by scroll, or you can share it yourself.</p>
    <div class="actions"><button class="btn" data-close="1">Later</button><button class="btn primary" data-ch-host="${cid}">Open the dueling ground</button></div></div>`); }
  else toast(`You declined. ${r.n} will receive your answer.`);
  refreshVersusTab();
}
function chalHost(cid) {
  const c = S.chal[cid]; if (!c) return;
  const r = S.rivals.find(x => x.pid === c.rival) || { n: 'your rival' };
  closeOverlay();
  vsHost(null, { mode: 'challenge', cid, reserve: c.rival, rname: r.n, onOpen: code => { c.st = 'open'; c.code = code; c.openT = Date.now(); save(); MAIL.post(c.rival, chalMsg(c, 'open', { code })); } });
}
function chalJoin(cid) { const c = S.chal[cid]; if (!c || !c.code) return; closeOverlay(); vsJoin(c.code); }

/* ---------- arrival: a scroll sealed with the sender's wax ---------- */
let SCROLL_Q = [];
function chalNotify(c, what) {
  const r = S.rivals.find(x => x.pid === c.rival) || { n: 'A rival' };
  if (what === 'arrived') { SCROLL_Q.push(c.cid); maybeShowScroll(); }
  else if (what === 'accepted') toast(`📜 ${r.n} accepted your challenge! They will open the dueling ground.`);
  else if (what === 'declined') toast(`📜 ${r.n} declined your challenge.`);
  else if (what === 'open') { if (!VS && !LOBBY && !$('#ui').hidden) chalReadyModal(c); else toast(`📜 ${r.n} awaits you at the dueling ground!`); }
  refreshVersusTab();
}
function maybeShowScroll() {
  if (VS || LOBBY || $('#ui').hidden || !$('#overlay').hidden) return;
  const cid = SCROLL_Q.shift(); const c = cid && S.chal[cid];
  if (c && c.st === 'new') scrollArrival(c);
}
function chalReadyModal(c) {
  const r = S.rivals.find(x => x.pid === c.rival) || { n: 'Your rival' }, mins = Math.round((Date.now() - (c.openT || Date.now())) / 60000);
  openOverlay(`<div class="modal"><div class="scroll-mini">${sealSVG(rivalFace(r), 56)}</div><div class="eyebrow">The dueling ground is open</div>
    <h2>${esc(r.n)} awaits you</h2><p class="muted">${mins > 15 ? `They opened it ${mins} minutes ago and may have left. You can try, or wait for a new scroll.` : 'Bring your blade. Code <b>' + esc(c.code) + '</b>.'}</p>
    <div class="actions"><button class="btn" data-close="1">Not now</button><button class="btn primary" data-ch-join="${c.cid}">Enter the dueling ground</button></div></div>`);
}
function scrollArrival(c) {
  const r = S.rivals.find(x => x.pid === c.rival) || { n: 'A rival', seal: { c: 0, m: 0, s: 1 } };
  sfx.taiko(.7);
  openOverlay(`<div class="scroll-stage" data-cid="${c.cid}">
    <div class="scroll-kicker">A scroll has arrived from <b>${esc(r.n)}</b></div>
    <div class="scroll closed" id="scrollEl">
      <div class="roll top"></div>
      <div class="paper"><div class="ink">
        <p class="sc-to">To ${esc(S.name || 'Shep')},</p>
        <p>I, <b>${esc(r.n)}</b>, challenge you to a duel of blades.</p>
        <p>Three rounds. Each of us carries a blade we forged or won. The one who falls surrenders their blade, untied from the hip and offered with a bow.</p>
        <p>Do you accept?</p>
        <div class="sc-sign">${sealSVG(rivalFace(r), 54)}<span>${esc(r.n)}</span></div>
      </div></div>
      <div class="roll bottom"></div>
      <button class="wax" data-ch-break="${c.cid}" aria-label="Break the wax seal">${sealSVG(rivalFace(r), 92)}</button>
    </div>
    <div class="scroll-actions" hidden>
      <button class="btn" data-ch-answer="no" data-cid="${c.cid}">Decline</button>
      <button class="btn primary" data-ch-answer="yes" data-cid="${c.cid}">Accept the challenge</button>
    </div>
    <button class="btn small scroll-later" data-close="1">Open later</button>
  </div>`);
}
function scrollBreak() {
  const el = $('#scrollEl'); if (!el || !el.classList.contains('closed')) return;
  sfx.chop(); setTimeout(() => sfx.whoosh(), 250);
  el.classList.remove('closed'); el.classList.add('broken');
  setTimeout(() => { el.classList.add('open'); }, 380);
  setTimeout(() => { const a = document.querySelector('.scroll-actions'); if (a) a.hidden = false; const l = document.querySelector('.scroll-later'); if (l) l.hidden = true; }, 1300);
}
function chalClick(d, b) {
  if (d.chBreak) { scrollBreak(); return true; }
  if (d.chAnswer) { chalAnswer(d.cid, d.chAnswer === 'yes'); return true; }
  if (d.chSend) { chalSend(d.chSend); return true; }
  if (d.chWithdraw) { chalWithdraw(d.chWithdraw); return true; }
  if (d.chHost) { chalHost(d.chHost); return true; }
  if (d.chJoin) { chalJoin(d.chJoin); return true; }
  if (d.chOpen) { const c = S.chal[d.chOpen]; if (c) scrollArrival(c); return true; }
  if (d.chReady) { const c = S.chal[d.chReady]; if (c) chalReadyModal(c); return true; }
  if (d.chAdd) { const i = $('#rivalCode'); const v = (i && i.value || '').toUpperCase().replace(/[^A-Z2-9]/g, ''); if (v.length !== 8) { toast('A dueling code has 8 letters and numbers.'); return true; } if (v === S.pid) { toast("That's your own dueling code!"); return true; } addRival({ pid: v }); toast('Rival added. Send them a challenge!'); refreshVersusTab(); return true; }
  if (d.chShare) { const text = `Add me as a rival in Shep's Katana Legend! My dueling code: ${fmtPid(S.pid)}`; (async () => { try { if (navigator.share) { await navigator.share({ title: 'My dueling code', text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; } try { await navigator.clipboard.writeText(text); toast('Dueling code copied!'); } catch (e) { toast('Your dueling code: ' + fmtPid(S.pid)); } })(); return true; }
  return false;
}
function refreshVersusTab() { try { if (typeof curTab !== 'undefined' && curTab === 'versus' && !$('#ui').hidden && $('#overlay').hidden) showTab('versus'); } catch (e) { /* */ } updateScrollBadge(); }
function pendingScrolls() { return Object.values(S.chal).filter(c => c.dir === 'in' && c.st === 'new').length; }
function updateScrollBadge() { const t = document.querySelector('.tab[data-tab="versus"]'); if (!t) return; const n = pendingScrolls() + Object.values(S.chal).filter(c => c.dir === 'out' && c.st === 'open').length; t.dataset.badge = n ? String(n) : ''; }

/* ---------- the Challenges panel in the Versus tab ---------- */
function challengePanel() {
  if (IN_CLAUDE) return `<section class="panel stack"><h3>Challenges</h3><p class="muted">Challenge scrolls travel through the website version of the game. Open the game website to send and receive them.</p></section>`;
  const rivals = S.rivals.slice(0, 20);
  const row = r => {
    const c = chalFor(r.pid); let act = '';
    if (!c) act = `<button class="btn small primary" data-ch-send="${r.pid}">📜 Challenge</button>`;
    else if (c.dir === 'out' && c.st === 'sent') act = `<span class="ch-st">Scroll sent…</span><button class="btn small" data-ch-withdraw="${c.cid}">Withdraw</button>`;
    else if (c.dir === 'out' && c.st === 'accepted') act = `<span class="ch-st">Accepted! Waiting for them to open the dueling ground</span>`;
    else if (c.dir === 'out' && c.st === 'open') act = `<button class="btn small primary" data-ch-ready="${c.cid}">⚔ Enter the dueling ground</button>`;
    else if (c.dir === 'in' && c.st === 'new') act = `<button class="btn small primary glow" data-ch-open="${c.cid}">📜 Open their scroll</button>`;
    else if (c.dir === 'in' && (c.st === 'accepted' || c.st === 'open')) act = `<button class="btn small primary" data-ch-host="${c.cid}">⚔ Open the dueling ground</button>`;
    return `<div class="rival">${sealSVG(rivalFace(r), 44)}<div class="rv-n"><b>${esc(r.n)}</b><small>${fmtPid(r.pid)} · ${r.w || 0}W ${r.l || 0}L</small></div><div class="rv-act">${act}</div></div>`;
  };
  return `<section class="panel stack challenge-panel">
    <div class="row between"><h3>Challenges</h3><span class="tag">Blades at stake</span></div>
    <div class="my-seal">${sealSVG({ name: S.name, seal: S.seal }, 70)}<div><b>${esc(S.name || 'Shep')}</b><small>Your dueling code</small><div class="pid">${fmtPid(S.pid)}</div></div><button class="btn small" data-ch-share="1">Share code</button></div>
    <p class="muted">Send a sealed scroll to a rival, even when they're offline. If they accept, they open the dueling ground when you're both ready. Each of you fights with a blade you forged or won, and the loser surrenders it.</p>
    ${rivals.length ? `<div class="rivals">${rivals.map(row).join('')}</div>` : '<p class="muted"><i>No rivals yet. Duel someone online and they are added here, or add a friend by their dueling code.</i></p>'}
    <div class="row add-rival"><input id="rivalCode" placeholder="Friend's dueling code" maxlength="9" autocapitalize="characters" autocomplete="off"><button class="btn small" data-ch-add="1">Add rival</button></div>
  </section>`;
}

/* ---------- trophy blades in the Swords tab ---------- */
function trophyCards(onEquip) {
  const t = S.swords.filter(w => w.won && !w.captured);
  if (!t.length) return '';
  return `<section class="panel stack trophies"><div class="row between"><h3>Trophy blades</h3><span class="muted">${t.length} won in challenges</span></div>
    <div class="trophy-grid">${t.map(w => { const d = swordDef(w.id), on = S.eq === w.u, dt = new Date(w.won.t || Date.now());
      return `<div class="trophy" style="--rc:${RAR[d.r].c};--glow:${d.glow || RAR[d.r].c}">
        <div class="tr-seal">${sealSVG({ name: w.won.n, seal: w.won.seal }, 50)}</div>
        <div class="tr-blade">${bladeSVG(d)}</div>
        <div class="tr-name ${d.r}">${esc(d.name)}${w.lvl ? ' +' + w.lvl : ''}</div>
        <small>${rarTag(d)} · ${Math.round(swordDmg(w))} dmg</small>
        <small class="tr-hist">Won from <b>${esc(w.won.n)}</b> · ${dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${w.maker && w.maker.n !== w.won.n ? `<br>Forged by ${esc(w.maker.n)}` : ''}</small>
        ${on ? '<span class="tag">✓ Equipped</span>' : `<button class="btn small" data-equip="${w.u}">Equip</button>`}
      </div>`; }).join('')}</div></section>`;
}
