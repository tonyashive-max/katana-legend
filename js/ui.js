'use strict';
/* ===== Menus, hub showcase, input, main loop, boot ===== */

let MODE = null, HUB = null, lastT = 0, gameT = 0, curTab = 'dojo', transitioning = false;
function setMode(m) { MODE = m; }
function clearSceneActors() { HUB = null; }

/* ---------- small UI utilities ---------- */
let toastTimer = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400); }
function openOverlay(html) { const o = $('#overlay'); o.innerHTML = html; o.hidden = false; }
function closeOverlay() { const o = $('#overlay'); o.hidden = true; o.innerHTML = ''; }
function transition(fn) {
  if (transitioning) return; transitioning = true;
  const f = $('#fade'); f.classList.add('on');
  setTimeout(() => {
    try { fn(); } catch (e) { console.error(e); toast('Something went wrong: ' + e.message); }
    setTimeout(() => { f.classList.remove('on'); transitioning = false; }, 60);
  }, 380);
}
function showHUD(mode) {
  $('#ui').hidden = true; closeOverlay();
  const h = $('#hud'); h.hidden = false; h.className = mode === 'fight' ? '' : mode;
  $('#tInfo').innerHTML = ''; hint(''); $('#banner').classList.remove('show');
  $('#blockBtn').classList.remove('on'); $('#specialBtn').classList.remove('ready');
  $('#leaveBtn').textContent = 'Leave'; $('#leaveBtn').dataset.armed = '';
  $('#viewBtn').hidden = mode === 'vs-local';
}
function hideHUD() { $('#hud').hidden = true; $('#tInfo').innerHTML = ''; hint(''); }
function fmt(n) { return Math.round(n).toLocaleString(); }
function renderTop() { $('#gold').textContent = fmt(S.gold); $('#steel').textContent = fmt(S.steel); }

let _svgId = 0;
const BLADE_PATH = 'M78 25 C 140 24, 200 19, 252 6 C 254 9, 251 12, 246 13 C 196 26, 140 31, 78 31 Z';
function bladeSVG(def, o) {
  o = o || {}; const id = 'bs' + (++_svgId), sil = !!o.sil;
  const blade = sil ? '#2b3150' : def.blade, edge = sil ? '#394066' : def.edge, wrap = sil ? '#232842' : def.wrap, ts = sil ? '#2b3150' : def.tsuba;
  const dark = sil ? '#20253e' : '#' + shadeHex(def.blade, -.4).getHexString();
  const glow = !sil && def.glow;
  let dia = '';
  if (!sil && !def.wood) for (let i = 0; i < 7; i++) dia += `<path d="M${13 + i * 8} 28 l4 -4 l4 4 l-4 4z" fill="#ebe2cb" opacity=".85"/>`;
  return `<svg class="blade" viewBox="0 0 260 44" role="img" aria-label="${sil ? 'Undiscovered blade' : def.name}">
    <defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${edge}"/><stop offset=".45" stop-color="${blade}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    ${glow ? `<filter id="${id}f" x="-10%" y="-120%" width="120%" height="340%"><feGaussianBlur stdDeviation="3.4"/></filter>` : ''}</defs>
    ${glow ? `<path d="${BLADE_PATH}" fill="${def.glow}" filter="url(#${id}f)" opacity=".9"/>` : ''}
    <rect x="8" y="23" width="62" height="10" rx="4" fill="${wrap}"/>${dia}
    <rect x="3" y="22.5" width="8" height="11" rx="2" fill="${ts}"/>
    <ellipse cx="73" cy="28" rx="4.5" ry="11" fill="${ts}" stroke="rgba(255,255,255,.25)"/>
    <path d="${BLADE_PATH}" fill="url(#${id}g)"/>
    ${!sil && !def.wood ? `<path d="M82 27.5 C 140 26, 200 21, 249 8" stroke="${edge}" stroke-width="1.3" fill="none" opacity=".9"/>` : ''}
  </svg>`;
}
const rarTag = d => `<span class="rar ${d.r}" style="color:${RAR[d.r].c}">${RAR[d.r].n}</span>`;
function costHTML(c) { return `<span class="cost">${c.gold ? `<span><i class="g"></i> ${fmt(c.gold)}</span>` : ''}${c.steel ? `<span><i class="s"></i> ${fmt(c.steel)}</span>` : ''}</span>`; }
function canPay(c) { return S.gold >= (c.gold || 0) && S.steel >= (c.steel || 0); }
function pay(c) { S.gold -= c.gold || 0; S.steel -= c.steel || 0; }

/* ---------- screens ---------- */
function showTab(name) {
  curTab = name;
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-current', String(t.dataset.tab === name)));
  if (HUB && name !== 'outfits' && HUB.previewing) hubSetPlayer();
  const el = $('#screen');
  el.innerHTML = ({ dojo: screenDojo, quest: screenQuest, train: screenTrain, forge: screenForge, swords: screenSwords, outfits: screenOutfits, versus: screenVersus })[name]();
  el.scrollTop = 0;
  renderTop();
}
function skillRow(k) {
  const s = S.sk[k], need = skillNeed(s.l), pct = s.l >= 30 ? 100 : Math.round(s.x / need * 100);
  return `<div class="skill"><div class="glyph">${SKILLS[k].g}</div><div><div class="nm">${SKILLS[k].n}<small>${SKILLS[k].d}</small></div><div class="bar"><i style="width:${pct}%"></i></div></div><div class="lvl">Lv ${s.l}</div></div>`;
}
function screenDojo() {
  const st = stats(), w = eqSword(), d = swordDef(w.id), o = outfitDef(S.outfit);
  const allDone = S.cleared >= STAGES.length, ni = Math.min(S.cleared, STAGES.length - 1), ns = STAGES[ni], nsw = swordDef(ns.sword);
  const best = swordDef(bestSword().id);
  return `<div class="stack">
    <section class="panel hero">
      <div class="eyebrow">${allDone ? 'Every enemy defeated' : `Next battle · ${CHAPTERS[ns.ch].name}`}</div>
      <h2>${allDone ? 'Legend of the land' : ns.name}</h2>
      <p class="muted" style="margin:6px 0 12px">${allDone ? 'Replay any battle to earn more stars, gold and steel. Can you collect every blade?' : `${ns.title}. Beat them to win the <b style="color:${RAR[nsw.r].c}">${S.seen.includes(nsw.id) ? nsw.name : 'mystery blade'}</b> they carry.`}</p>
      <div class="row"><button class="btn primary" data-fight="${ni}">⚔ Fight${allDone ? ' again' : ''}</button><button class="btn" data-tab="quest">Quest map</button></div>
    </section>
    <section class="panel">
      <div class="row between"><h3>${S.name || 'Shep'}</h3><span class="muted">${o.name}</span></div>
      <div class="stats" style="margin-top:12px">
        <div class="stat"><b>${st.maxHp}</b><span>Health</span></div>
        <div class="stat"><b>${Math.round(st.atk)}</b><span>Attack</span></div>
        <div class="stat"><b>${S.swords.length}</b><span>Blades</span></div>
        <div class="stat"><b>${totalStars()}</b><span>Stars</span></div>
      </div>
    </section>
    <section class="panel">
      <div class="row between"><h3>Your blade</h3>${rarTag(d)}</div>
      <div style="margin:8px 0">${bladeSVG(d)}</div>
      <div class="row between"><b class="name ${d.r}">${d.name}${w.lvl ? ` +${w.lvl}` : ''}</b><span class="muted">${Math.round(swordDmg(w))} damage</span></div>
      <div class="row" style="margin-top:10px"><button class="btn small" data-tab="forge">Forge it stronger</button><button class="btn small" data-tab="swords">Change blade</button></div>
      <p class="muted" style="margin-top:10px;font-size:13px">Rarest blade owned: <b style="color:${RAR[best.r].c}">${best.name}</b> · ${S.seen.length} of ${SWORDS.length} discovered</p>
    </section>
    <section class="panel stack"><div class="row between"><h3>Skills</h3><button class="btn small jade" data-tab="train">Train</button></div>${Object.keys(SKILLS).map(skillRow).join('')}</section>
  </div>`;
}
function screenQuest() {
  return `<div class="stack">${CHAPTERS.map((c, ci) => `
    <section class="panel chapter">
      <div class="ch-head"><span class="eyebrow">Chapter ${ci + 1}</span><h2>${c.name}</h2><span class="jp">${c.jp}</span></div>
      <p class="muted">${c.blurb}</p>
      <div class="stages">${STAGES.map((s, i) => [s, i]).filter(([s]) => s.ch === ci).map(([s, i]) => stageCard(s, i)).join('')}</div>
    </section>`).join('')}</div>`;
}
function stageCard(s, i) {
  const locked = i > S.cleared, cleared = i < S.cleared, cur = i === S.cleared, d = swordDef(s.sword), known = S.seen.includes(d.id);
  return `<article class="stage ${s.boss ? 'boss' : ''} ${locked ? 'locked' : ''} ${cur ? 'current' : ''}">
    <div class="row between"><span class="no">Battle ${i + 1}</span>${s.boss ? '<span class="tag boss">Boss</span>' : ''}</div>
    <div><div class="nm">${locked ? '???' : s.name}</div><div class="ti">${locked ? 'Defeat the previous foe' : s.title}</div></div>
    ${bladeSVG(d, { sil: !known })}
    <div style="font-size:13px;font-weight:900;color:${known ? RAR[d.r].c : 'var(--muted)'}">${known ? d.name : 'Mystery blade'}</div>
    ${s.outfit ? `<div style="font-size:12px" class="muted">Reward: ${S.outfits.includes(s.outfit) ? '✓ ' : ''}${outfitDef(s.outfit).name} outfit</div>` : ''}
    ${starRow(S.stars[i] || 0)}
    ${locked ? '<button class="btn small" disabled>Locked</button>' : `<button class="btn small ${cur ? 'primary' : ''}" data-fight="${i}">${cleared ? 'Fight again' : 'Fight'}</button>`}
  </article>`;
}
function screenTrain() {
  return `<div class="stack">
    <section class="panel"><h2>Training Dojo</h2><p class="muted" style="margin-top:6px">Each drill grows one skill. Higher skills make you stronger in every battle.</p></section>
    ${Object.entries(TRAININGS).map(([k, t]) => {
      const s = S.sk[t.skill], need = skillNeed(s.l);
      return `<section class="panel train-card"><div class="glyph">${t.g}</div><div class="stack" style="gap:8px">
        <div class="row between"><h3>${t.name}</h3><span class="muted" style="font-weight:900">${SKILLS[t.skill].n} Lv ${s.l}</span></div>
        <p class="muted">${t.desc}</p>
        <div class="bar"><i style="width:${s.l >= 30 ? 100 : Math.round(s.x / need * 100)}%"></i></div>
        <div><button class="btn jade" data-train="${k}">Start drill</button></div></div></section>`;
    }).join('')}
  </div>`;
}
function screenForge() {
  const w = eqSword(), d = swordDef(w.id), c = forgeCost(w), max = (w.lvl || 0) >= 10;
  const nextDmg = Math.round(d.dmg * (1 + .12 * ((w.lvl || 0) + 1)));
  return `<div class="stack">
    <section class="panel">
      <div class="eyebrow">Master smith's forge</div>
      <div class="row between" style="margin-top:6px"><h2 class="name ${d.r}">${d.name}${w.lvl ? ` +${w.lvl}` : ''}</h2>${rarTag(d)}</div>
      <div class="reveal" style="--rc:${RAR[d.r].c}22;--glow:${d.glow || 'rgba(255,220,140,.4)'};margin:10px 0">${bladeSVG(d)}</div>
      <p class="muted">${d.lore}</p>
      <div class="stats" style="margin:12px 0;grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="stat"><b>${Math.round(swordDmg(w))}</b><span>Damage</span></div>
        <div class="stat"><b>${max ? 'MAX' : nextDmg}</b><span>Next level</span></div>
        <div class="stat"><b>${w.lvl || 0}/10</b><span>Forge level</span></div>
      </div>
      ${max ? '<p><b>This blade is fully forged!</b></p>' : `<button class="btn primary wide" data-upgrade="1" ${canPay(c) ? '' : 'disabled'}>🔨 Forge +${(w.lvl || 0) + 1} · ${costHTML(c)}</button>`}
      ${!max && !canPay(c) ? '<p class="muted" style="margin-top:8px;font-size:13px">Win battles for gold and steel, or smelt spare blades for steel.</p>' : ''}
    </section>
    <section class="panel">
      <div class="row between"><h3>Mystery forge</h3>${costHTML(CRAFT_COST)}</div>
      <p class="muted" style="margin:6px 0 10px">Pour steel into the fire and see what blade comes out. Legendary blades are rare, and the mythic Void Crescent almost never appears.</p>
      <div class="row" style="gap:6px;margin-bottom:10px">${CRAFT_ODDS.map(([r, p]) => `<span class="tag" style="background:rgba(255,255,255,.06);color:${RAR[r].c}">${RAR[r].n} ${p}%</span>`).join('')}</div>
      <button class="btn red wide" data-craft="1" ${canPay(CRAFT_COST) ? '' : 'disabled'}>🔥 Forge a mystery blade</button>
    </section>
  </div>`;
}
function screenSwords() {
  const carriers = {}; STAGES.forEach(s => { carriers[s.sword] = s.name; });
  return `<div class="stack">
    <section class="panel"><div class="row between"><h2>Blade collection</h2><b>${S.seen.length} / ${SWORDS.length}</b></div>
      <div class="bar" style="margin-top:10px"><i style="width:${Math.round(S.seen.length / SWORDS.length * 100)}%;background:linear-gradient(90deg,#ffb53d,#ff5fb0,#b357ff)"></i></div></section>
    <div class="grid2">${SWORDS.map(d => {
      const known = S.seen.includes(d.id), owned = S.swords.filter(w => w.id === d.id);
      return `<div class="card ${known ? '' : 'unknown'}">${bladeSVG(d, { sil: !known })}
        <div class="nm ${known ? 'name ' + d.r : ''}" style="${known && d.r !== 'mythic' ? `color:${RAR[d.r].c}` : ''}">${known ? d.name : '???'}</div>
        <small>${known ? `${RAR[d.r].n} · ${d.dmg} dmg${owned.length ? ` · owned ×${owned.length}` : ''}` : (carriers[d.id] ? `Carried by ${STAGES.findIndex(s => s.sword === d.id) <= S.cleared ? carriers[d.id] : 'a hidden foe'}` : 'Mystery forge only')}</small></div>`;
    }).join('')}</div>
    <section class="panel stack"><h3>Your blades</h3>
      ${S.swords.slice().sort((a, b) => RAR[swordDef(b.id).r].i - RAR[swordDef(a.id).r].i || swordDmg(b) - swordDmg(a)).map(w => {
        const d = swordDef(w.id), eq = w.u === S.eq;
        return `<div class="card ${eq ? 'sel' : ''}">
          <div class="row between"><b class="name ${d.r}" style="${d.r !== 'mythic' ? `color:${RAR[d.r].c}` : ''}">${d.name}${w.lvl ? ` +${w.lvl}` : ''}</b><small>${Math.round(swordDmg(w))} dmg</small></div>
          ${bladeSVG(d)}
          <div class="row">${eq ? '<span class="tag new">Equipped</span>' : `<button class="btn small primary" data-equip="${w.u}">Equip</button><button class="btn small" data-smelt="${w.u}">Smelt · +${smeltValue(w)} steel</button>`}</div>
        </div>`;
      }).join('')}
    </section>
  </div>`;
}
function outfitHow(o) {
  if (S.outfits.includes(o.id)) return null;
  if (o.how.gold) return { buy: o.how.gold };
  if (o.how.boss != null) return { lock: `Defeat ${STAGES[o.how.boss].name}` };
  return null;
}
function screenOutfits() {
  return `<div class="stack">
    <section class="panel"><h2>Outfits</h2><p class="muted" style="margin-top:6px">Tap an outfit to try it on. Bosses drop new armor, and some outfits can be bought with gold.</p></section>
    <div class="grid2">${OUTFITS.map(o => {
      const h = outfitHow(o), on = S.outfit === o.id;
      return `<button class="card ${on ? 'sel' : ''}" data-preview="${o.id}">
        <div class="swatch"><i style="background:${o.armor}"></i><i style="background:${o.cloth}"></i><i style="background:${o.trim}"></i><i style="background:${o.helmCol}"></i></div>
        <div class="nm">${o.name}</div><small>${o.desc}</small>
        <small style="color:var(--jade)">${o.hp ? `+${o.hp} health` : ''}${o.dmg ? ` · +${Math.round(o.dmg * 100)}% attack` : ''}${!o.hp && !o.dmg ? 'Starter outfit' : ''}</small>
        <small>${on ? '✓ Wearing' : h ? (h.buy ? `Buy for ${fmt(h.buy)} gold` : '🔒 ' + h.lock) : 'Owned'}</small>
      </button>`;
    }).join('')}</div>
    <div id="outfitAct"></div>
  </div>`;
}
function screenVersus() {
  const opts = S.outfits.map(id => `<option value="${id}">${outfitDef(id).name}</option>`).join('');
  const swords = [...new Set(S.swords.map(w => w.id))].map(id => `<option value="${id}">${swordDef(id).name}</option>`).join('');
  return `<div class="stack">
    <section class="panel"><h2>Versus</h2><p class="muted" style="margin-top:6px">Duel a friend. Everyone gets the same health, so skill wins. Swipe to attack, parry at the gold ring, and block to soak up hits.</p></section>
    <section class="panel stack">
      <h3>Same tablet</h3>
      <p class="muted">Two players share this screen. ${S.name || 'Shep'} swipes on the left half, Player 2 on the right half. Hold a finger still to block.</p>
      <label class="row between"><span>Player 2 name</span><input id="p2name" value="Player 2" maxlength="14" style="font:inherit;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:inherit;width:150px"></label>
      <label class="row between"><span>Player 2 outfit</span><select id="p2outfit" style="font:inherit;padding:8px;border-radius:10px;background:#1a1f36;color:inherit;border:1px solid var(--line)">${opts}</select></label>
      <label class="row between"><span>Player 2 blade</span><select id="p2sword" style="font:inherit;padding:8px;border-radius:10px;background:#1a1f36;color:inherit;border:1px solid var(--line)">${swords}</select></label>
      <button class="btn primary" data-local="1">⚔ Start same-tablet duel</button>
    </section>
    <section class="panel stack">
      <h3>Two devices</h3>
      <p class="muted">${IN_CLAUDE ? 'Both devices open this game in Claude, signed in to an account that can open it. For friends without Claude accounts, use the website version of the game.' : 'Both devices open this game website on the same wifi (or anywhere online). One hosts, the other joins with the code.'}</p>
      <div class="row"><button class="btn primary" data-vs="host">Host a game</button><button class="btn" data-vs="join">Join with a code</button></div>
    </section>
  </div>`;
}

/* ---------- hub showcase ---------- */
function enterHub(first) {
  const build = () => {
    clearSceneActors();
    const ch = Math.min(3, Math.floor(Math.min(S.cleared, STAGES.length - 1) / 3));
    const W = buildWorld(ch); activateWorld(W);
    HUB = { W, P: null, rotY: 0, ang: 0, flourishT: 4, previewing: null, camPos: new V3(), camLook: new V3(), clock: 0 };
    hubSetPlayer();
    $('#ui').hidden = false;
    MUSIC.start('hub');
    setMode(HubMode);
    showTab(curTab);
  };
  if (first) build(); else transition(build);
}
function hubSetPlayer(outfitId, flourish) {
  if (!HUB) return;
  if (HUB.P) { HUB.W.scene.remove(HUB.P.root); HUB.W.scene.remove(HUB.P.trail.mesh); HUB.P.dispose(); }
  const o = outfitDef(outfitId || S.outfit);
  const P = new Samurai(lookFromOutfit(o), swordDef(eqSword().id), {});
  P.root.rotation.order = 'YXZ'; P.root.rotation.y = HUB.rotY;
  HUB.W.scene.add(P.root, P.trail.mesh);
  P.setHold('rest', 6);
  HUB.P = P; HUB.previewing = outfitId && outfitId !== S.outfit ? outfitId : null;
  if (flourish) hubFlourish(true);
}
function hubFlourish(big) {
  const P = HUB.P; P.seq.length = 0;
  if (big) { P.queue('show', .45, { arc: .1 }); P.queue('show', .9); P.queue('rest', .6); setTimeout(() => { if (HUB && HUB.P === P) { const bp = P.bladePoint(.7); FX.sparks(bp, P.swordDef.glow || '#ffe08c', 34, 4); FX.glowBurst(bp, P.swordDef.glow || '#ffe08c', 1.4); } }, 450); }
  else { const r = Math.random(); if (r < .5) { P.queue('windR', .4); P.queue('endR', .16, { ease: easeIn, arc: .3 }); P.queue('guard', .35); P.queue('rest', .6); } else { P.queue('windH', .45); P.queue('endH', .16, { ease: easeIn, arc: .3 }); P.queue('guard', .4); P.queue('rest', .6); } }
}
const HubMode = {
  name: 'hub',
  update(dt) {
    const H = HUB; if (!H || !H.P) return;
    H.clock += dt;
    H.flourishT -= dt; if (H.flourishT <= 0) { H.flourishT = rnd(6, 9); hubFlourish(false); }
    if (!H.drag) H.rotY = lerp(H.rotY, 0, damp(1.2, dt));
    H.P.root.rotation.y = H.rotY;
    H.P.update(dt);
    auraFX(H.P, dt);
    const portrait = VH > VW;
    const a = Math.sin(H.clock * .12) * .28, R = portrait ? 4.3 : 3.3;
    const right = new V3(Math.cos(a), 0, -Math.sin(a));
    const pos = new V3(Math.sin(a) * R, portrait ? 1.35 : 1.45, Math.cos(a) * R);
    const look = new V3(0, portrait ? .55 : 1.1, 0).addScaledVector(right, portrait ? 0 : -1.05);
    H.camPos.lerp(pos, damp(H.clock < .1 ? 60 : 3, dt)); H.camLook.lerp(look, damp(H.clock < .1 ? 60 : 3, dt));
    CAM.position.copy(H.camPos); CAM.lookAt(H.camLook);
    CAM.fov = lerp(CAM.fov, 45, damp(6, dt)); CAM.updateProjectionMatrix(); FX.setScale();
  },
  down(x) { if (HUB) { HUB.drag = true; HUB.dx = x; } },
  move(x) { if (HUB && HUB.drag) { HUB.rotY += (x - HUB.dx) * .012; HUB.dx = x; } },
  up() { if (HUB) HUB.drag = false; },
};

/* ---------- actions ---------- */
function doUpgrade() {
  const w = eqSword(), c = forgeCost(w);
  if ((w.lvl || 0) >= 10 || !canPay(c)) return;
  pay(c); w.lvl = (w.lvl || 0) + 1; save();
  sfx.forge(); toast(`${swordDef(w.id).name} is now +${w.lvl}!`);
  if (HUB) hubSetPlayer(null, true);
  showTab('forge');
}
function doCraft() {
  if (!canPay(CRAFT_COST)) return;
  pay(CRAFT_COST);
  let roll = Math.random() * 100, rar = 'common';
  for (const [r, p] of CRAFT_ODDS) { if (roll < p) { rar = r; break; } roll -= p; }
  const pool = SWORDS.filter(s => s.r === rar && s.id !== 'bokken');
  const d = pick(pool), isNew = !S.seen.includes(d.id), w = addSword(d.id); save();
  sfx.forge(); setTimeout(() => { RAR[d.r].i >= 3 ? sfx.win() : sfx.coin(); }, 500);
  openOverlay(`<div class="modal ${RAR[d.r].i >= 3 ? 'win' : ''}">
    <div class="eyebrow">The forge fire roars…</div>
    <div class="reveal" style="--rc:${RAR[d.r].c}44;--glow:${d.glow || RAR[d.r].c}"><div class="rays"></div>${bladeSVG(d)}</div>
    <div>${rarTag(d)}<h2 class="name ${d.r}">${d.name}</h2></div>
    <p class="muted">${d.lore}</p>
    ${isNew ? '<p><span class="tag new">New discovery</span></p>' : ''}
    <div class="actions"><button class="btn primary" data-equip="${w.u}" data-close="1">Equip it</button><button class="btn" data-close="1">Keep it</button></div>
  </div>`);
  showTab('forge');
}
function doSmelt(u, btn) {
  if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; const w0 = S.swords.find(x => x.u === u); btn.textContent = `Tap again to smelt · +${smeltValue(w0)}`; setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ''; btn.textContent = `Smelt · +${smeltValue(w0)} steel`; } }, 2500); return; }
  const i = S.swords.findIndex(x => x.u === u); if (i < 0 || u === S.eq) return;
  const w = S.swords[i]; S.steel += smeltValue(w); S.swords.splice(i, 1); save();
  sfx.forge(); toast(`Smelted into ${smeltValue(w)} steel`); showTab(curTab);
}
function doEquip(u) {
  if (!S.swords.some(w => w.u === u)) return;
  S.eq = u; save(); sfx.ui(); toast(`Equipped ${swordDef(eqSword().id).name}`);
  if (HUB) hubSetPlayer(null, true);
  if (!$('#ui').hidden) showTab(curTab);
}
function previewOutfit(id) {
  const o = outfitDef(id), h = outfitHow(o);
  if (HUB) hubSetPlayer(id, false);
  const act = $('#outfitAct'); if (!act) return;
  act.innerHTML = `<section class="panel"><div class="row between"><h3>${o.name}</h3>${S.outfit === id ? '<span class="tag new">Wearing</span>' : ''}</div>
    <p class="muted" style="margin:6px 0 10px">${o.desc}</p>
    ${S.outfit === id ? '' : !h ? `<button class="btn primary" data-wear="${id}">Wear this outfit</button>` : h.buy ? `<button class="btn primary" data-buy="${id}" ${S.gold >= h.buy ? '' : 'disabled'}>Buy · ${costHTML({ gold: h.buy })}</button>` : `<button class="btn" disabled>🔒 ${h.lock}</button>`}
  </section>`;
  act.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function wearOutfit(id) { if (!S.outfits.includes(id)) return; S.outfit = id; save(); sfx.up(); toast(`Now wearing ${outfitDef(id).name}`); if (HUB) hubSetPlayer(null, true); showTab('outfits'); }
function buyOutfit(id) { const o = outfitDef(id); if (!o.how.gold || S.gold < o.how.gold || S.outfits.includes(id)) return; S.gold -= o.how.gold; S.outfits.push(id); wearOutfit(id); }
function openSettings() {
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-set="${key}" data-val="${v}" aria-pressed="${S[key] === v}">${l}</button>`).join('')}</div>`;
  openOverlay(`<div class="modal" style="text-align:left">
    <div class="row between"><h2>Settings</h2><button class="btn small" data-close="1">Done</button></div>
    <label class="toggle"><span>Player name</span><input id="nameInput" value="${(S.name || 'Shep').replace(/"/g, '')}" maxlength="14" style="font:inherit;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:inherit;width:150px"></label>
    <div class="toggle"><span>Sound effects</span>${seg('sound', [[true, 'On'], [false, 'Off']])}</div>
    <div class="toggle"><span>Music</span>${seg('music', [[true, 'On'], [false, 'Off']])}</div>
    <div class="toggle"><span>Battle camera</span>${seg('view', [['fp', 'First person'], ['tp', 'Behind']])}</div>
    <div class="toggle"><span>Graphics</span>${seg('quality', [['auto', 'Auto'], ['high', 'High'], ['balanced', 'Balanced'], ['fast', 'Fast']])}</div>
    <p class="muted" style="font-size:13px">If the game feels slow on an older tablet, pick Fast.</p>
    <div class="toggle" style="border:0"><span>Start over</span><button class="btn small red" id="resetBtn">Reset progress</button></div>
  </div>`);
}

/* ---------- input ---------- */
const PTR = {};
function wireInput() {
  const gl = $('#gl');
  const slashMode = () => MODE && MODE.name !== 'hub';
  gl.addEventListener('pointerdown', e => {
    AUD.init(); MUSIC.start(MODE ? (MODE.name === 'hub' ? 'hub' : MODE.name === 'train' ? 'train' : 'fight') : 'hub');
    try { gl.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    PTR[e.pointerId] = { sx: e.clientX, sy: e.clientY, x0: e.clientX, y0: e.clientY };
    if (slashMode()) OV.trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (MODE && MODE.down) MODE.down(e.clientX, e.clientY, e.pointerId);
  });
  gl.addEventListener('pointermove', e => {
    const p = PTR[e.pointerId]; if (!p) return;
    const x = e.clientX, y = e.clientY;
    if (MODE && MODE.move) MODE.move(x, y, e.pointerId);
    if (!slashMode()) return;
    OV.trail.push({ x, y, t: performance.now() });
    if (Math.hypot(x - p.sx, y - p.sy) >= 48) { if (MODE.slash) MODE.slash(p.sx, p.sy, x, y, e.pointerId); p.sx = x; p.sy = y; p.slashed = true; }
  });
  const end = e => {
    const p = PTR[e.pointerId]; if (!p) return;
    if (slashMode() && !p.slashed && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) >= 26 && MODE.slash) MODE.slash(p.sx, p.sy, e.clientX, e.clientY, e.pointerId);
    if (MODE && MODE.up) MODE.up(e.pointerId);
    delete PTR[e.pointerId];
  };
  gl.addEventListener('pointerup', end); gl.addEventListener('pointercancel', end);
  gl.addEventListener('contextmenu', e => e.preventDefault());

  const bb = $('#blockBtn');
  const setBlock = on => {
    bb.classList.toggle('on', on);
    if (MODE === FightMode && F) { F.blocking = on; F.blockPose = null; if (!on && !F.over) F.P.setHold(guardPose(), 9); }
    if (MODE === VsMode && VS && VS.online) { VS.A.blocking = on; VS.A.blockPose = null; if (!on && VS.A.state === 'ready') VS.A.rig.setHold(VS.view === 'fp' ? 'fpGuard' : 'guard', 9); NET.send('blk', { on }); }
  };
  bb.addEventListener('pointerdown', e => { e.preventDefault(); AUD.init(); try { bb.setPointerCapture(e.pointerId); } catch (er) { /* */ } setBlock(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => bb.addEventListener(ev, () => setBlock(false)));
  $('#specialBtn').addEventListener('pointerdown', e => { e.preventDefault(); useSpecial(); });
  $('#viewBtn').addEventListener('click', () => {
    const tgt = MODE === FightMode ? F : MODE === TrainMode ? T : (MODE === VsMode && VS && VS.online ? VS : null);
    if (!tgt) return;
    tgt.view = tgt.view === 'fp' ? 'tp' : 'fp'; S.view = tgt.view; save();
    const rig = tgt.P || (tgt.A && tgt.A.rig);
    rig.setFP(tgt.view === 'fp'); rig.setHold(tgt.view === 'fp' ? 'fpGuard' : 'guard', 10);
    $('#viewBtn').textContent = tgt.view === 'fp' ? 'Behind view' : 'First person';
  });
  $('#leaveBtn').addEventListener('click', () => {
    const b = $('#leaveBtn');
    if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to leave'; setTimeout(() => { b.dataset.armed = ''; b.textContent = 'Leave'; }, 2200); return; }
    if (MODE === FightMode) endFight(); else if (MODE === TrainMode) endTraining(); else if (MODE === VsMode) endVersus();
  });
  $('#settingsBtn').addEventListener('click', () => { sfx.ui(); openSettings(); });

  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    AUD.init();
    const d = b.dataset;
    if (d.tab) { sfx.ui(); showTab(d.tab); }
    else if (d.fight != null) { sfx.taiko(.7); startFight(+d.fight); }
    else if (d.train) { startTraining(d.train); }
    else if (d.upgrade) doUpgrade();
    else if (d.craft) doCraft();
    else if (d.smelt) doSmelt(+d.smelt, b);
    else if (d.equip) { doEquip(+d.equip); if (d.close) closeOverlay(); }
    else if (d.preview) { sfx.ui(); previewOutfit(d.preview); }
    else if (d.wear) wearOutfit(d.wear);
    else if (d.buy) buyOutfit(d.buy);
    else if (d.res) fightResultAction(d.res, b);
    else if (d.tres) trainResultAction(d.tres);
    else if (d.vsres) vsResultAction(d.vsres);
    else if (d.local) {
      const p2 = { name: ($('#p2name').value || 'Player 2').slice(0, 14), outfit: $('#p2outfit').value, sword: $('#p2sword').value, lvl: 0 };
      startVersusLocal(p2);
    }
    else if (d.vs === 'host') vsHost();
    else if (d.vs === 'join') joinPad();
    else if (d.vs === 'cancel') cancelLobby();
    else if (d.key && JOINPAD) JOINPAD(d.key);
    else if (d.set) {
      const k = d.set; let v = d.val; if (v === 'true') v = true; else if (v === 'false') v = false;
      S[k] = v; save(); sfx.ui();
      if (k === 'sound') AUD.setSound(v);
      if (k === 'music') AUD.setMusic(v);
      if (k === 'quality') applyQuality();
      openSettings();
    }
    else if (b.id === 'resetBtn') {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again: erase everything'; return; }
      S = freshSave(); save(); closeOverlay(); toast('Progress reset. A new legend begins!'); curTab = 'dojo'; enterHub();
    }
    else if (d.close) { closeOverlay(); }
  });
  document.addEventListener('change', e => { if (e.target.id === 'nameInput') { S.name = (e.target.value || 'Shep').slice(0, 14); save(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && AUD.ctx) AUD.ctx.suspend(); else if (AUD.ctx) AUD.ctx.resume(); });
}

/* ---------- main loop ---------- */
const PERF = { acc: 0, n: 0, t: 0, checks: 0 };
function perfCheck(raw) {
  if (S.quality !== 'auto' || !MODE) return;
  PERF.acc += raw; PERF.n++;
  if (PERF.acc > 4) {
    const fps = PERF.n / PERF.acc; PERF.acc = 0; PERF.n = 0; PERF.checks++;
    if (fps < 34 && (QUALITY.autoPr || 1.5) > 1.01) { QUALITY.autoPr = Math.max(1, (QUALITY.autoPr || 1.5) - .25); applyQuality(); }
    else if (fps < 22 && QUALITY.autoShadows !== false) { QUALITY.autoShadows = false; applyQuality(); if (CURWORLD && CURWORLD.key) CURWORLD.key.castShadow = false; }
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min(.05, lastT ? (now - lastT) / 1000 : .016); lastT = now;
  perfCheck(raw);
  let dt = raw;
  if (TIME.hitstop > 0) { TIME.hitstop -= raw; dt = raw * .06; }
  else if (TIME.slowT > 0) { TIME.slowT -= raw; dt = raw * TIME.slowTo; }
  gameT += dt;
  try {
    if (MODE && MODE.update) MODE.update(dt);
    FX.update(dt);
    updateWorld(CURWORLD, dt, gameT);
    if (CURWORLD) R.render(CURWORLD.scene, CAM);
  } catch (e) { console.error(e); if (!frame.err) { frame.err = true; toast('Error: ' + e.message); } }
  drawOverlay(raw);
}

/* ---------- boot ---------- */
function bootError(msg) { const l = $('#loading'); l.hidden = false; $('#loadMsg').innerHTML = `<span class="err">${msg}</span>`; }
function boot() {
  if (!window.THREE) { bootError('The 3D engine could not load. Check your internet connection and reload.'); return; }
  try {
    initGL(); init2D(); makeTextures(); FX.init(); wireInput();
    curTab = 'dojo';
    enterHub(true);
    renderTop();
    requestAnimationFrame(frame); setTimeout(() => { $('#loading').hidden = true; }, 400);
  } catch (e) {
    console.error(e);
    bootError('This device could not start 3D graphics (' + e.message + '). Try a newer browser.');
  }
}
boot();
