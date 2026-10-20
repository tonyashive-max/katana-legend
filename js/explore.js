'use strict';
/* ===== Journey: roam the winding road through every land ===== */

let X = null;
let EXPLORE_RETURN = null;
const KEYS = {};
window.addEventListener('keydown', e => { KEYS[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { KEYS[e.key.toLowerCase()] = false; });

function labelSprite(text, color, sub) {
  const t = ctex(256, (x, s, h) => {
    x.clearRect(0, 0, s, h);
    x.font = "34px Shojumaru, 'Zen Maru Gothic', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 8; x.strokeStyle = 'rgba(10,8,16,.9)'; x.strokeText(text, s / 2, sub ? 26 : h / 2);
    x.fillStyle = color || '#fff6d8'; x.fillText(text, s / 2, sub ? 26 : h / 2);
    if (sub) { x.font = "900 22px 'Zen Maru Gothic', sans-serif"; x.lineWidth = 6; x.strokeText(sub, s / 2, 62); x.fillStyle = '#ffe08c'; x.fillText(sub, s / 2, 62); }
  }, 80);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  sp.scale.set(2.6, .82, 1); sp.renderOrder = 8;
  return sp;
}
function barrierMat(c1, c2) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { time: { value: 0 }, c1: { value: new COL(c1) }, c2: { value: new COL(c2) }, open: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform float time, open; uniform vec3 c1, c2; void main(){ vec2 p = vUv - .5; float r = length(p); float a = atan(p.y, p.x); float sw = sin(a * 5.0 + r * 18.0 - time * 3.0) * .5 + .5; float edge = smoothstep(.5, .2, abs(p.x)) * smoothstep(.5, .3, abs(p.y)); float k = (.25 + .75 * sw) * edge * (.35 + .65 * open); gl_FragColor = vec4(mix(c1, c2, sw) * k, k); }',
  });
}

function firstLockedLand() { for (let ch = 0; ch < 4; ch++) if (!S.journey[ch].myth) return ch; return -1; }
function limitS() { const L = firstLockedLand(); return L < 0 ? Infinity : rope().gates[L].s + .1; }
function sampleAt(x, z) { const q = ropeQuery(x, z); return rope().pts[clamp(Math.round(q.s / rope().ds), 0, rope().N)]; }
function landEntry(ch) { const R = rope(), b = R.landBeads(ch)[0], p = R.pts[b.i]; return { x: b.x - p.tx * 3, z: b.z - p.tz * 3, yaw: Math.atan2(p.tx, p.tz) }; }

function startExplore(ch, returning) {
  if (ch != null && !chapterUnlocked(ch)) { toast('Defeat the mythical boss of the previous land first.'); return; }
  transition(() => {
    clearSceneActors();
    const W = getRopeWorld(); activateWorld(W);
    if (X && X.poi) disposePoi();
    const lim = limitS();
    let sp = null;
    if (returning && EXPLORE_RETURN) sp = EXPLORE_RETURN;
    else if (ch == null && S.roam && ropeQuery(S.roam.x, S.roam.z, lim).d < .5) sp = S.roam;
    else sp = landEntry(ch == null ? currentChapter() : ch);
    const pos = new V3(sp.x, 0, sp.z);
    X = { W, pos, face: sp.yaw || 0, camYaw: sp.yaw || 0, camPitch: .3, speed: 0, phase: 0, joy: null, look: null, pois: [], near: null, clock: 0,
      camPos: new V3(), camLook: new V3(), land: -1, s: 0, enc: null, encCool: 4, ghostDone: new Set(), saveT: 0, lastGood: pos.clone(), limit: lim, flyers: [], poi: new THREE.Group() };
    W.scene.add(X.poi);
    W.obs = W.obs.filter(o => !o.poi);
    makePlayer();
    buildPOIs();
    showHUD('explore');
    $('#leaveBtn').textContent = 'Dojo';
    OV.draw = drawExploreOverlay; OV.trailCol = '255,255,255';
    if (!isArmed()) setTimeout(() => { if (X) { banner('No blade!', 'Return to the Dojo and equip one'); } }, 600);
    MUSIC.start('hub');
    setMode(ExploreMode);
  });
}
function makePlayer() {
  if (X.P) { X.poi.remove(X.P.root); X.poi.remove(X.P.trail.mesh); X.P.dispose(); }
  const P = new Samurai(lookFromOutfit(outfitDef(S.outfit)), swordDef(eqSword().id), {});
  P.root.rotation.order = 'YXZ'; X.poi.add(P.root, P.trail.mesh);
  P.setSheathed(true);
  if (!isArmed()) P.sword.visible = false;
  P.root.position.copy(X.pos); P.root.rotation.y = X.face;
  X.P = P;
}
function disposePoi() {
  if (!X || !X.poi) return;
  X.poi.traverse(o => { if (o.material && o.material.map && !Object.values(TEX).includes(o.material.map)) o.material.map.dispose(); });
  X.poi.parent && X.poi.parent.remove(X.poi);
}
function endExplore() {
  if (X) { S.roam = { x: X.pos.x, z: X.pos.z, yaw: X.face }; save(); disposePoi(); }
  X = null; OV.draw = null; hideHUD(); $('#hiltBtn').hidden = true; enterHub();
}
function updateObjective() {
  if (!X || X.land < 0) return;
  const ch = X.land, cap = S.captured.length && isArmed() ? ' · A ghost holds your blade nearby!' : '';
  $('#tInfo').innerHTML = `<b>${CHAPTERS[ch].name}</b>${!isArmed() ? 'Your hands are empty. Return to the Dojo and equip a blade.' : journeyObjective(ch) + cap}`;
}

/* ---------- points of interest ---------- */
function buildPOIs() {
  const R = rope(), g = X.poi;
  for (let ch = 0; ch < 4; ch++) {
    if (!chapterUnlocked(ch)) continue;
    const B = R.landBeads(ch);
    // land sign at the entry
    { const b = B[0], p = R.pts[b.i], sx = b.x + p.nx * (b.r - 1.5), sz = b.z + p.nz * (b.r - 1.5);
      const st = new THREE.Mesh(merge([P(GEO.box(.25, 2.2, .25), '#4a3020', [0, 1.1, 0]), P(GEO.box(1.6, .9, .12), '#e8dcc0', [0, 1.9, 0]), P(GEO.box(1.75, .14, .2), '#2a1d16', [0, 2.42, 0])]), toon({ vertexColors: true }));
      st.position.set(sx, ropeWalkHeight(sx, sz), sz); st.rotation.y = Math.atan2(-p.nx, -p.nz); st.castShadow = true; g.add(st);
      const lab = labelSprite(CHAPTERS[ch].name, '#fff6d8', CHAPTERS[ch].jp); lab.position.set(sx, st.position.y + 3.3, sz); lab.scale.multiplyScalar(1.15); g.add(lab);
      X.W.obs.push({ x: sx, z: sz, r: .35, poi: true }); }
    // warriors
    B.filter(b => b.kind === 'warrior').forEach(b => {
      const [st, idx] = chapterStages(ch)[b.wi], y = ropeWalkHeight(b.x, b.z);
      const prev = R.pts[Math.max(0, b.i - 12)];
      const poi = { kind: 'warrior', ch, idx, st, x: b.x, z: b.z, r: 3.2 };
      if (!S.beaten[idx]) {
        const rig = new Samurai(st.look, swordDef(st.sword), {});
        rig.root.rotation.order = 'YXZ'; rig.root.position.set(b.x, y, b.z); rig.root.rotation.y = Math.atan2(prev.x - b.x, prev.z - b.z);
        rig.setSheathed(true); g.add(rig.root, rig.trail.mesh);
        poi.rig = rig;
        const lab = labelSprite(st.name, st.boss ? '#ffb38a' : '#fff6d8', (st.boss ? 'BOSS · ' : '') + 'Power ' + st.rec); lab.position.set(b.x, y + 2.6, b.z); g.add(lab);
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 40), new THREE.MeshBasicMaterial({ color: st.boss ? '#ff6a4a' : '#ffd27a', transparent: true, opacity: .7, side: THREE.DoubleSide, fog: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(b.x, y + .06, b.z); g.add(ring); poi.ring = ring;
      } else {
        const stone = new THREE.Mesh(merge([P(GEO.box(.5, 1.1, .3), '#8a8478', [0, .55, 0]), P(GEO.box(.7, .15, .5), '#6a6458', [0, .07, 0])]), toon({ vertexColors: true }));
        stone.position.set(b.x, y, b.z); stone.rotation.y = Math.atan2(prev.x - b.x, prev.z - b.z); stone.castShadow = true; g.add(stone);
        const lab = labelSprite(st.name, '#b8e6c0', 'Defeated · rematch'); lab.position.set(b.x, y + 1.8, b.z); lab.scale.multiplyScalar(.8); g.add(lab);
        poi.r = 2.4; poi.done = true;
      }
      X.W.obs.push({ x: b.x, z: b.z, r: .55, poi: true });
      X.pois.push(poi);
    });
    // orbs at the end of side trails
    R.branches.filter(br => br.ch === ch).forEach(br => {
      if (S.journey[ch].orbs[br.k]) return;
      const col = ORB_COLS[ch], y = ropeWalkHeight(br.ex, br.ez);
      const og = new THREE.Group(); og.position.set(br.ex, y + 1.1, br.ez);
      og.add(new THREE.Mesh(GEO.ico(.28, 2), new THREE.MeshBasicMaterial({ color: col, fog: false })));
      og.add(new THREE.Mesh(GEO.ico(.42, 1), glowMat(col, .25)));
      og.add(halo(col, 2.4, .9));
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, 18, 10, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.set(br.ex, y + 9, br.ez); g.add(beam, og);
      X.pois.push({ kind: 'orb', ch, k: br.k, x: br.ex, z: br.ez, r: 1.5, g: og, beam, baseY: y + 1.1 });
    });
    // shrine
    {
      const b = B[2], p = R.pts[b.i], side = ropeQuery(b.x + p.nx * 6, b.z + p.nz * 6).d < ropeQuery(b.x - p.nx * 6, b.z - p.nz * 6).d ? 1 : -1;
      const x = b.x + p.nx * side * (b.r - 3.4), z = b.z + p.nz * side * (b.r - 3.4), y = ropeWalkHeight(x, z), face = Math.atan2(b.x - x, b.z - z);
      const sg = new THREE.Group(); sg.position.set(x, y, z); sg.rotation.y = face; g.add(sg);
      const base = new THREE.Mesh(merge([
        P(GEO.cyl(2.2, 2.4, .35, 24), '#8a8478', [0, .17, 0]),
        P(GEO.box(1.6, 1.4, 1.2), '#e8dcc0', [0, 1.05, -.9]),
        P(GEO.cone(1.5, .9, 4), '#2f3540', [0, 2.1, -.9], [0, Math.PI / 4, 0], [1.2, 1, .95]),
        P(GEO.box(.2, 1.4, .2), '#4a3020', [-.8, 1.05, -.3]), P(GEO.box(.2, 1.4, .2), '#4a3020', [.8, 1.05, -.3]),
        ...[-1, 0, 1].map(i => P(GEO.cyl(.18, .24, .7, 8), '#9a9488', [i * .9, .7, .9])),
      ]), toon({ vertexColors: true }));
      base.castShadow = true; sg.add(base);
      const col = ORB_COLS[ch];
      const slots = [-1, 0, 1].map(i => { const m = new THREE.Mesh(GEO.ico(.18, 2), new THREE.MeshBasicMaterial({ color: col, fog: false })); m.position.set(i * .9, 1.25, .9); sg.add(m); const h = halo(col, 1, .8); h.position.copy(m.position); sg.add(h); return [m, h]; });
      const glow = halo('#ffe08c', 6, 0); glow.position.set(0, 1.6, -.4); sg.add(glow);
      const lab = labelSprite('Spirit Shrine', '#ffe08c', PUZZLE_NAMES[ch]); lab.position.set(x, y + 3.6, z); g.add(lab);
      X.W.obs.push({ x, z, r: 2.1, poi: true });
      const poi = { kind: 'shrine', ch, x, z, r: 3.8, slots, glow };
      X.pois.push(poi); refreshShrine(poi);
    }
    // spirit gate
    {
      const G = R.gates[ch], y = ropeWalkHeight(G.x, G.z), face = Math.atan2(G.nx, G.nz) + Math.PI / 2;
      const gg = new THREE.Group(); gg.position.set(G.x, y, G.z); gg.rotation.y = face; g.add(gg);
      const sc = (ROPE_W + .9) / 2;
      const tor = new THREE.Mesh(toriiGeo(MYTHS[ch].dragon ? '#2a0a0a' : '#3a1a4a', '#120a18'), toon({ vertexColors: true })); tor.scale.setScalar(sc); tor.castShadow = true; gg.add(tor);
      for (const sd of [-1, 1]) X.W.obs.push({ x: G.x + G.nx * sd * 2 * sc, z: G.z + G.nz * sd * 2 * sc, r: .3 * sc, poi: true });
      const m = barrierMat(MYTHS[ch].dragon ? '#ff7a1a' : '#8a3aff', '#ff5a8a');
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(4 * sc, 4.4 * sc), m); plane.position.set(0, 2.2 * sc, 0); gg.add(plane);
      plane.visible = !S.journey[ch].myth;
      const lab = labelSprite('Spirit Gate', '#d9b8ff', `${MYTHS[ch].name} · Power ${MYTHS[ch].rec}`); lab.position.set(G.x, y + 5.6 * sc, G.z); g.add(lab);
      X.pois.push({ kind: 'gate', ch, x: G.x - G.tx * 2, z: G.z - G.tz * 2, r: 4.2, m, plane });
    }
  }
  // summit
  if (S.journey[3].myth) {
    const sb = R.beads.find(b => b.kind === 'summit'), y = ropeWalkHeight(sb.x, sb.z);
    const lab = labelSprite('Summit of Legends', '#ffe08c', 'You made it!'); lab.position.set(sb.x, y + 4, sb.z); lab.scale.multiplyScalar(1.3); X.poi.add(lab);
    X.pois.push({ kind: 'summit', x: sb.x, z: sb.z, r: 6 });
  }
  // ghosts holding captured blades
  S.captured.forEach(c => addThief(c));
  X.W.updaters = X.W.updaters.filter(f => !f.poiUpdater);
  const up = (dt, t) => {
    if (!X) return;
    X.pois.forEach(p => {
      if (p.kind === 'orb') { p.g.position.y = p.baseY + Math.sin(t * 2 + p.k) * .15; p.g.rotation.y += dt * 1.5; }
      if (p.ring) p.ring.material.opacity = .45 + Math.sin(t * 3) * .25;
      if (p.kind === 'gate') { p.m.uniforms.time.value = t; p.m.uniforms.open.value = gateOpen(p.ch) ? 1 : .15; }
      if (p.kind === 'shrine' && S.journey[p.ch].puzzle) p.glow.material.opacity = .55 + Math.sin(t * 2) * .2;
      if (p.kind === 'thief') { p.icon.rotation.y += dt * 2; p.icon.position.y = p.baseY + Math.sin(t * 2.5) * .2; p.beam.material.opacity = .25 + Math.sin(t * 4) * .1; }
    });
  };
  up.poiUpdater = true; X.W.updaters.push(up);
}
function addThief(c) {
  const w = S.swords.find(v => v.u === c.u); if (!w) return;
  const y = ropeWalkHeight(c.x, c.z);
  const icon = new THREE.Group(); icon.position.set(c.x, y + 2.2, c.z);
  const sw = buildSword(swordDef(w.id)); sw.rotation.z = Math.PI; sw.position.y = .4; icon.add(sw); icon.add(halo('#ff5a5a', 2.6, .7));
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.2, .45, 22, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ff5a5a', transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.set(c.x, y + 11, c.z);
  const lab = labelSprite('Ghost Thief', '#ffb4a8', 'Reclaim your ' + swordDef(w.id).name); lab.position.set(c.x, y + 4.4, c.z);
  X.poi.add(icon, beam, lab);
  X.pois.push({ kind: 'thief', entry: c, x: c.x, z: c.z, r: 0, icon, beam, lab, baseY: y + 2.2 });
}
function refreshShrine(p) { p.slots.forEach(([m, h], k) => { const on = !!S.journey[p.ch].orbs[k]; m.visible = on; h.visible = on; }); }
function collectOrb(p) {
  S.journey[p.ch].orbs[p.k] = 1; save();
  const pos = p.g.position.clone(), col = ORB_COLS[p.ch];
  FX.sparks(pos, col, 40, 5, .09); FX.glowBurst(pos, col, 2.4, .5); FX.petals(pos, 20, col, 3);
  X.poi.remove(p.g); X.poi.remove(p.beam);
  X.pois = X.pois.filter(q => q !== p);
  sfx.up(); banner('Spirit orb found!', `${orbsFound(p.ch)} of 3`);
  X.pois.filter(q => q.kind === 'shrine' && q.ch === p.ch).forEach(refreshShrine);
  updateObjective();
}

/* ---------- interaction ---------- */
function exploreAct() {
  if (!X || !X.near || X.enc) return;
  const p = X.near;
  if ((p.kind === 'warrior' || p.kind === 'gate') && !isArmed()) { toast('You have no blade! Return to the Dojo and equip one.'); return; }
  const back = new V3(X.pos.x - p.x, 0, X.pos.z - p.z); if (back.lengthSq() < .01) back.set(0, 0, -1); back.normalize();
  EXPLORE_RETURN = { x: p.x + back.x * (p.r + .6), z: p.z + back.z * (p.r + .6), yaw: Math.atan2(-back.x, -back.z) };
  if (ropeQuery(EXPLORE_RETURN.x, EXPLORE_RETURN.z, X.limit).d > -.2) EXPLORE_RETURN = { x: X.pos.x, z: X.pos.z, yaw: X.face };
  S.roam = { x: X.pos.x, z: X.pos.z, yaw: X.face }; save();
  if (p.kind === 'warrior') { sfx.taiko(.8); startFight(p.idx, 'explore'); }
  else if (p.kind === 'shrine') {
    if (orbsFound(p.ch) < 3) { toast(`The shrine needs 3 spirit orbs. You have ${orbsFound(p.ch)}. Look for glowing beams down the side trails.`); return; }
    if (S.journey[p.ch].puzzle) { toast('The shrine is already awake.'); return; }
    openPuzzle(p.ch, () => {
      S.journey[p.ch].puzzle = true; save();
      sfx.win(); banner('Shrine awakened!', gateOpen(p.ch) ? 'The spirit gate is open!' : 'Defeat the warriors to open the gate');
      if (X) { FX.sparks(new V3(p.x, 1.5, p.z), '#ffe08c', 60, 6); updateObjective(); }
    });
  } else if (p.kind === 'gate') {
    if (gateOpen(p.ch) || S.journey[p.ch].myth) { startMyth(p.ch, 'explore'); return; }
    const need = [];
    if (warriorsBeaten(p.ch) < 3) need.push(`defeat the warriors (${warriorsBeaten(p.ch)}/3)`);
    if (!S.journey[p.ch].puzzle) need.push('awaken the shrine');
    toast('The gate is sealed. First ' + need.join(' and ') + '.');
  } else if (p.kind === 'summit') {
    sfx.win(); banner('Katana Legend!', 'Every land is yours');
    for (let i = 0; i < 5; i++) setTimeout(() => X && FX.sparks(new V3(p.x + rnd(-3, 3), 3 + rnd(0, 3), p.z + rnd(-3, 3)), pick(['#ffe08c', '#ff8fc0', '#7fe8ff']), 50, 6), i * 250);
  }
}
function actLabel(p) {
  if (p.kind === 'warrior') return !isArmed() ? 'No blade! Go to the Dojo' : p.done ? `Rematch ${p.st.name}` : `⚔ Duel ${p.st.name}`;
  if (p.kind === 'shrine') return S.journey[p.ch].puzzle ? 'Shrine is awake ✓' : orbsFound(p.ch) < 3 ? `Shrine needs orbs (${orbsFound(p.ch)}/3)` : 'Solve the shrine puzzle';
  if (p.kind === 'gate') return !isArmed() ? 'No blade! Go to the Dojo' : S.journey[p.ch].myth ? `Rematch ${MYTHS[p.ch].name}` : gateOpen(p.ch) ? `Face ${MYTHS[p.ch].name}!` : 'Spirit gate (sealed)';
  if (p.kind === 'summit') return 'Ring the summit bell';
  return '';
}

/* ---------- objective guide ---------- */
function objectiveTarget() {
  if (!X || X.land < 0) return null;
  const R = rope(), ch = X.land, j = S.journey[ch];
  const near = list => list.reduce((b, p) => (!b || Math.hypot(p.x - X.pos.x, p.z - X.pos.z) < Math.hypot(b.x - X.pos.x, b.z - X.pos.z)) ? p : b, null);
  if (!isArmed()) return null;
  const thieves = X.pois.filter(p => p.kind === 'thief');
  if (thieves.length) return near(thieves);
  if (orbsFound(ch) < 3) return near(X.pois.filter(p => p.kind === 'orb' && p.ch === ch));
  if (!j.puzzle) return X.pois.find(p => p.kind === 'shrine' && p.ch === ch);
  if (warriorsBeaten(ch) < 3) return near(X.pois.filter(p => p.kind === 'warrior' && p.ch === ch && !p.done));
  if (!j.myth) return X.pois.find(p => p.kind === 'gate' && p.ch === ch);
  if (ch < 3) { const b = R.landBeads(ch + 1)[0]; return { x: b.x, z: b.z }; }
  return X.pois.find(p => p.kind === 'summit') || null;
}

/* ---------- ghost samurai ---------- */
function ghostCheck() {
  if (!X || X.enc || !isArmed() || X.clock < X.encCool) return;
  for (const p of X.pois) if (p.kind === 'thief' && Math.hypot(p.x - X.pos.x, p.z - X.pos.z) < 7.5) { startEncounter({ thief: p }); return; }
  for (const gsp of rope().ghosts) {
    if (X.ghostDone.has(gsp) || !chapterUnlocked(gsp.ch)) continue;
    if (Date.now() - ((S.ghostClear || {})[gsp.ch + '-' + gsp.k] || 0) < 8 * 60e3) continue;
    if (Math.hypot(gsp.x - X.pos.x, gsp.z - X.pos.z) < 6.5) { X.ghostDone.add(gsp); startEncounter({ spot: gsp }); return; }
  }
}
function startEncounter(o) {
  const ch = o.thief ? o.thief.entry.ch : o.spot.ch;
  const tw = o.thief ? S.swords.find(v => v.u === o.thief.entry.u) : null;
  const def = tw ? swordDef(tw.id) : GHOST_BLADE;
  const ghost = new Samurai(GHOST_LOOK, def, { ghost: true, noSaya: true });
  ghost.root.rotation.order = 'YXZ';
  const f = new V3(Math.sin(X.face), 0, Math.cos(X.face));
  let gx = X.pos.x + f.x * 5.4, gz = X.pos.z + f.z * 5.4;
  if (ropeQuery(gx, gz, X.limit).d > -.5) { const pt = sampleAt(X.pos.x, X.pos.z), dir = (pt.tx * f.x + pt.tz * f.z) >= 0 ? 1 : -1; gx = X.pos.x + pt.tx * dir * 5.4; gz = X.pos.z + pt.tz * dir * 5.4; }
  const gy = ropeWalkHeight(gx, gz);
  ghost.root.position.set(gx, gy + .3, gz); ghost.setHold('guard', 8); ghost.mat.opacity = 0;
  X.poi.add(ghost.root, ghost.trail.mesh);
  const win = ([1.6, 1.35, 1.15, .95][ch] + stats().drawBonus) * (o.thief ? .85 : 1);
  X.enc = { ghost, ch, phase: 'appear', t: 0, t0: 0, win, o, def, sx: gx, sz: gz, gy, drawnAt: -1, op: 0, iai: false };
  X.joy = null; X.look = null; $('#actBtn').hidden = true; X.near = null;
  if (o.thief) { o.thief.icon.visible = false; o.thief.beam.visible = false; o.thief.lab.visible = false; }
  banner(o.thief ? 'GHOST THIEF!' : 'GHOST SAMURAI!', o.thief ? 'It holds your ' + def.name + '!' : 'Draw and strike!');
  sfx.ghost();
  FX.puff(new V3(gx, gy + 1, gz), 12, '#bfe8ff', .7);
}
function ghostGesture(kind) {
  const e = X && X.enc; if (!e) return false;
  if (kind === 'draw') {
    if (e.phase !== 'draw') return false;
    if (!X.P.drawSword({ to: ['endL', 'guard'], durs: [.14, .3] })) return false;
    sfx.draw(); e.phase = 'drawn'; e.drawnAt = e.t; $('#hiltBtn').hidden = true;
    return true;
  }
  return false;
}
function ghostSlash(x0, y0, x1, y1) {
  const e = X && X.enc; if (!e || e.phase !== 'drawn' || e.t - e.drawnAt < .1) return;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  if (e.t - e.drawnAt > .3) { rigSwing(X.P, (x1 - x0) / len, (y1 - y0) / len, .12); sfx.slash(); }
  const hit = hitTest(e.ghost, x0, y0, x1, y1);
  if (hit) { e.iai = e.t - e.drawnAt < .5; banishGhost(hit); }
}
function banishGhost(hit) {
  const e = X.enc, gp = e.ghost.chest.getWorldPosition(new V3());
  e.phase = 'won'; e.t1 = e.t;
  FX.sparks(gp, '#bff4ff', 70, 6, .09); FX.glowBurst(gp, '#7fe8ff', 2.6, .5); FX.petals(gp, 30, '#bfe8ff', 3.5); FX.puff(gp, 14, '#e8f8ff', .9);
  sfx.banish(); hitstop(120); slowmo(.35, .5); OV.flash = .4; OV.flashCol = '200,240,255';
  const s = toScreen(gp); ovPop(s.x, s.y - 30, e.iai ? 'IAI!' : 'BANISHED!', { size: e.iai ? 52 : 40, color: '#2a1200', stroke: '#e8fbff', burst: e.iai ? '#ffe08c' : '#9fe8ff', rot: rnd(-.2, .2), life: 1.2, vy: -30 });
  const gold = (e.iai ? 30 : 15) + e.ch * 12;
  S.gold += gold; S.steel += 1 + (e.iai ? 1 : 0); S.ghosts = (S.ghosts || 0) + 1;
  const ups = addSkillXP('iai', e.o.thief ? 24 : e.iai ? 16 : 10); save();
  banner(e.iai ? 'IAI STRIKE!' : 'Ghost banished!', `+${gold} gold${ups ? ' · Iai level up!' : ''}`);
  if (ups) sfx.up();
  if (e.o.spot) { S.ghostClear = S.ghostClear || {}; S.ghostClear[e.o.spot.ch + '-' + e.o.spot.k] = Date.now(); save(); }
  if (e.o.thief) {
    const w = reclaimSword(e.o.thief.entry);
    X.pois = X.pois.filter(p => p !== e.o.thief); [e.o.thief.icon, e.o.thief.beam, e.o.thief.lab].forEach(o => X.poi.remove(o));
    setTimeout(() => { if (!X) return; flySword(swordDef(w.id), gp, () => X.P.root.localToWorld(new V3(.2, 1, .2)), () => { if (!X) return; makePlayer(); banner('Blade reclaimed!', swordDef(w.id).name + ' is back in your hands'); sfx.up(); updateObjective(); }); }, 450);
  }
  e.ghost.root.visible = false;
}
function ghostStrike() {
  const e = X.enc; e.phase = 'lost'; e.t1 = e.t;
  e.ghost.seq.length = 0; e.ghost.queue('endH', .14, { ease: easeIn, arc: .3 });
  sfx.slash(1.3); setTimeout(() => sfx.hurt(), 90);
  X.P.hitFlash(1); X.P.jolt = .8; shake(.12); OV.vig = 1; OV.vigCol = '120,200,255';
  if (e.o.spot) { S.ghostClear = S.ghostClear || {}; S.ghostClear[e.o.spot.ch + '-' + e.o.spot.k] = Date.now(); }
  const w = captureEquipped(e.ch, X.pos.x, X.pos.z);
  const from = X.P.sword.getWorldPosition(new V3());
  X.P.sword.visible = false;
  if (!X.P.sheathed) X.P.setSheathed(true);
  X.P.sword.visible = false;
  if (w) {
    flySword(swordDef(w.id), from, () => e.ghost.grip.getWorldPosition(new V3()), () => { if (X && X.enc) { e.ghost.sword.visible = true; } });
    e.ghost.sword.visible = false;
    banner('BLADE CAPTURED!', 'Equip another blade at the Dojo, then hunt this ghost down');
    setTimeout(() => sfx.laugh(), 500);
    addThief(S.captured[S.captured.length - 1]);
    const th = X.pois[X.pois.length - 1]; th.icon.visible = false; th.beam.visible = false; th.lab.visible = false; e.newThief = th;
  }
}
function flySword(def, from, toFn, done) {
  const g = new THREE.Group(); g.add(buildSword(def)); g.position.copy(from); X.poi.add(g);
  X.flyers.push({ g, from: from.clone(), toFn, t: 0, dur: .7, done });
}
function encounterUpdate(dt) {
  const e = X.enc, G = e.ghost;
  e.t += dt;
  e.op = Math.min(.5, e.op + dt * 1.1); G.mat.opacity = e.phase === 'lost' && e.t - e.t1 > 1.2 ? Math.max(0, .5 - (e.t - e.t1 - 1.2) * .6) : e.op;
  const toP = new V3(X.pos.x - G.root.position.x, 0, X.pos.z - G.root.position.z);
  G.root.rotation.y = Math.atan2(toP.x, toP.z);
  if (e.phase !== 'lost') { const want = Math.atan2(-toP.x, -toP.z); let d = want - X.face; d = Math.atan2(Math.sin(d), Math.cos(d)); X.face += d * damp(10, dt); }
  if (Math.random() < dt * 30) { const p = G.root.position; FX.add.emit(p.x + rnd(-.4, .4), p.y + rnd(0, 1.8), p.z + rnd(-.4, .4), 0, rnd(.3, .8), 0, rnd(.6, 1.1), .08, 0, '#9fe8ff', .8, -.2, .3); }
  if (e.phase === 'appear' && e.t > .75) { e.phase = 'draw'; e.t0 = e.t; G.setHold('windH', 3 / e.win); $('#hiltBtn').hidden = false; }
  if (e.phase === 'draw' || e.phase === 'drawn') {
    const k = clamp((e.t - e.t0) / e.win, 0, 1), dir = toP.clone().normalize(), endD = 1.5;
    const sx = e.sx, sz = e.sz, tx = X.pos.x - dir.x * endD, tz = X.pos.z - dir.z * endD;
    G.root.position.set(lerp(sx, tx, easeIn(k)), e.gy + .3 + Math.sin(e.t * 3) * .08, lerp(sz, tz, easeIn(k)));
    if (k >= 1) ghostStrike();
  }
  if (e.phase === 'lost') {
    const u = e.t - e.t1;
    if (u > .8) G.root.position.y += dt * 1.2;
    if (u > 2.4) endEncounter();
  }
  if (e.phase === 'won' && e.t - e.t1 > 1.1) endEncounter();
  G.update(dt);
}
function endEncounter() {
  const e = X.enc; if (!e) return;
  X.poi.remove(e.ghost.root); X.poi.remove(e.ghost.trail.mesh); e.ghost.dispose();
  if (e.newThief) { e.newThief.icon.visible = true; e.newThief.beam.visible = true; e.newThief.lab.visible = true; }
  if (e.o.thief && X.pois.includes(e.o.thief)) { e.o.thief.icon.visible = true; e.o.thief.beam.visible = true; e.o.thief.lab.visible = true; }
  X.enc = null; X.encCool = X.clock + 6; $('#hiltBtn').hidden = true;
  if (e.phase === 'won' && !e.o.thief && isArmed()) X.P.sheatheSword({ chiburi: true, onEnter: () => sfx.sheathe() });
  if (e.phase === 'lost') { X.P.sword.visible = false; }
  updateObjective();
}

/* ---------- per frame ---------- */
const ExploreMode = {
  name: 'explore',
  slashActive() { return !!(X && X.enc && X.enc.phase === 'drawn'); },
  drawStart() { return ghostGesture('draw'); },
  slash(x0, y0, x1, y1) { ghostSlash(x0, y0, x1, y1); },
  update(dt) {
    const x = X; if (!x) return;
    x.clock += dt;
    const R = rope();
    let ix = 0, iy = 0;
    if (!x.enc) {
      if (x.joy) { const dx = (x.joy.x - x.joy.ox) / 60, dy = (x.joy.y - x.joy.oy) / 60; const m = Math.hypot(dx, dy); const k = m > 1 ? 1 / m : 1; ix = dx * k; iy = -dy * k; }
      if (KEYS.w || KEYS.arrowup) iy = 1; if (KEYS.s || KEYS.arrowdown) iy = -1;
      if (KEYS.a || KEYS.arrowleft) ix = -1; if (KEYS.d || KEYS.arrowright) ix = 1;
    }
    const mag = Math.min(1, Math.hypot(ix, iy));
    const fwd = new V3(Math.sin(x.camYaw), 0, Math.cos(x.camYaw)), right = new V3(-Math.cos(x.camYaw), 0, Math.sin(x.camYaw));
    const dir = fwd.clone().multiplyScalar(iy).addScaledVector(right, ix);
    if (mag > .05) {
      dir.normalize();
      x.pos.addScaledVector(dir, (2.5 + 4.2 * mag) * mag * dt);
      const target = Math.atan2(dir.x, dir.z);
      let d = target - x.face; d = Math.atan2(Math.sin(d), Math.cos(d)); x.face += d * damp(10, dt);
      if (!x.look) { let cd = x.face - x.camYaw; cd = Math.atan2(Math.sin(cd), Math.cos(cd)); if (iy > -.2) x.camYaw += cd * damp(1.2, dt) * mag; }
    }
    x.speed = lerp(x.speed, mag, damp(8, dt));
    // stay on the road
    const q = ropeQuery(x.pos.x, x.pos.z, x.limit);
    if (!q.sh) x.pos.copy(x.lastGood);
    else if (q.d > -.15) { const dx = x.pos.x - q.cx, dz = x.pos.z - q.cz, l = Math.hypot(dx, dz) || 1, rr = q.rad - .15; x.pos.x = q.cx + dx / l * rr; x.pos.z = q.cz + dz / l * rr; }
    const L = firstLockedLand();
    if (L >= 0) { const G = R.gates[L], dx = x.pos.x - G.x, dz = x.pos.z - G.z, along = dx * G.tx + dz * G.tz; if (along > -.6 && Math.hypot(dx, dz) < 14) { x.pos.x -= G.tx * (along + .6); x.pos.z -= G.tz * (along + .6); } }
    for (const o of x.W.obs) {
      const dx = x.pos.x - o.x, dz = x.pos.z - o.z, rr = o.r + .38, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); x.pos.x = o.x + dx / d * rr; x.pos.z = o.z + dz / d * rr; }
    }
    x.lastGood.copy(x.pos);
    x.pos.y = ropeWalkHeight(x.pos.x, x.pos.z);
    // where on the road are we?
    const sq = ropeQuery(x.pos.x, x.pos.z); x.s = sq.s;
    const land = landOf(x.s);
    if (land !== x.land) { const first = x.land >= 0; x.land = land; updateObjective(); if (first) banner(CHAPTERS[land].name, CHAPTERS[land].jp); }
    updateRopeWorld(x.W, x.pos.x, x.pos.z, x.s);
    // walk animation
    const P = x.P;
    x.phase += x.speed * dt * (7 + 3 * x.speed);
    const st = .3 * x.speed, lift = .14 * x.speed;
    P.feet.L.set(.15, .035 + Math.max(0, Math.sin(x.phase)) * lift, Math.sin(x.phase) * st - .02);
    P.feet.R.set(-.15, .035 + Math.max(0, Math.sin(x.phase + Math.PI)) * lift, Math.sin(x.phase + Math.PI) * st + .02);
    P.crouch = -Math.abs(Math.sin(x.phase)) * .035 * x.speed;
    P.leanAdd = x.speed * .1; P.armSwing = -Math.sin(x.phase) * x.speed;
    P.root.position.copy(x.pos); P.root.rotation.y = x.face;
    P.update(dt);
    for (const p of x.pois) if (p.rig) {
      const d = Math.hypot(x.pos.x - p.x, x.pos.z - p.z);
      if (d < 8) { const a = Math.atan2(x.pos.x - p.x, x.pos.z - p.z); let dd = a - p.rig.root.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); p.rig.root.rotation.y += dd * damp(3, dt); }
      if (d < 60) p.rig.update(dt);
    }
    // flying blades
    x.flyers = x.flyers.filter(f => {
      f.t += dt; const k = clamp(f.t / f.dur, 0, 1), to = f.toFn();
      f.g.position.copy(f.from).lerp(to, ease(k)); f.g.position.y += Math.sin(k * Math.PI) * 1.2; f.g.rotation.set(k * 9, k * 4, 0);
      if (Math.random() < .5) FX.add.emit(f.g.position.x, f.g.position.y, f.g.position.z, 0, 0, 0, .4, .12, 0, '#ffe08c', 1, 0, 0);
      if (k >= 1) { x.poi.remove(f.g); if (f.done) f.done(); return false; }
      return true;
    });
    // encounters, pickups and the action button
    if (x.enc) encounterUpdate(dt);
    else {
      ghostCheck();
      let near = null, nd = 1e9;
      for (const p of x.pois.slice()) {
        if (p.kind === 'thief') continue;
        const d = Math.hypot(x.pos.x - p.x, x.pos.z - p.z);
        if (p.kind === 'orb') { if (d < p.r) collectOrb(p); continue; }
        if (d < p.r && d < nd) { near = p; nd = d; }
      }
      if (near !== x.near) {
        x.near = near;
        const b = $('#actBtn');
        if (near) { b.hidden = false; b.textContent = actLabel(near); b.classList.toggle('locked', !isArmed() && near.kind !== 'shrine' || (near.kind === 'gate' && !gateOpen(near.ch) && !S.journey[near.ch].myth) || (near.kind === 'shrine' && (orbsFound(near.ch) < 3 || S.journey[near.ch].puzzle))); }
        else b.hidden = true;
      }
    }
    x.saveT += dt; if (x.saveT > 2 && !x.enc) { x.saveT = 0; S.roam = { x: x.pos.x, z: x.pos.z, yaw: x.face }; save(); }
    // camera
    const portrait = VH > VW, tgt = x.pos.clone().add(new V3(0, 1.45, 0));
    let pos, look, fov = 58;
    if (x.enc) {
      const gp = x.enc.ghost.root.position, f2 = new V3(Math.sin(x.face), 0, Math.cos(x.face)), lft = new V3(Math.cos(x.face), 0, -Math.sin(x.face));
      pos = tgt.clone().addScaledVector(f2, -2.7).addScaledVector(lft, 1.2).add(new V3(0, .35, 0));
      look = tgt.clone().lerp(new V3(gp.x, gp.y + 1.2, gp.z), .6); fov = 55;
    } else {
      const dist = portrait ? 6 : 4.8;
      pos = tgt.clone().addScaledVector(fwd, -dist * Math.cos(x.camPitch)).add(new V3(0, dist * Math.sin(x.camPitch) + .3, 0));
      look = tgt.clone().addScaledVector(fwd, 1.6);
      // keep the camera out of the hillsides
      for (let k = 1; k <= 4; k++) {
        const pp = tgt.clone().lerp(pos, k / 4);
        if (ropeHeight(pp.x, pp.z) > pp.y - .4) { pos = tgt.clone().lerp(pos, (k - 1) / 4 + .05); pos.y = Math.max(pos.y, ropeHeight(pos.x, pos.z) + 1.2); break; }
      }
    }
    const kk = x.clock < .1 ? 60 : x.enc ? 6 : 10;
    x.camPos.lerp(pos, damp(kk, dt)); x.camLook.lerp(look, damp(kk, dt));
    const gy = ropeHeight(x.camPos.x, x.camPos.z) + .5; if (x.camPos.y < gy) x.camPos.y = gy;
    CAM.position.copy(x.camPos); CAM.lookAt(x.camLook);
    CAM.fov = lerp(CAM.fov, fov, damp(6, dt)); CAM.updateProjectionMatrix(); FX.setScale();
    applyShake(dt);
    if (x.enc) hint(x.enc.phase === 'draw' ? 'Swipe from the gold hilt to DRAW, then slash the ghost!' : x.enc.phase === 'drawn' ? 'Slash the ghost now!' : '');
    else if (x.clock < 7 && S.wins < 2) hint('Drag on the left side to walk · drag on the right side to look around');
    else hint('');
  },
  down(px, py, id) {
    if (!X || X.enc) return;
    if (px < VW * .45 && !X.joy) X.joy = { id, ox: px, oy: py, x: px, y: py };
    else if (!X.look) X.look = { id, x: px, y: py };
  },
  move(px, py, id) {
    if (!X) return;
    if (X.joy && X.joy.id === id) { X.joy.x = px; X.joy.y = py; }
    else if (X.look && X.look.id === id) { X.camYaw -= (px - X.look.x) * .006; X.camPitch = clamp(X.camPitch + (py - X.look.y) * .003, .08, .75); X.look.x = px; X.look.y = py; }
  },
  up(id) {
    if (!X) return;
    if (X.joy && X.joy.id === id) X.joy = null;
    if (X.look && X.look.id === id) X.look = null;
  },
};

function drawExploreOverlay(c) {
  if (!X) return;
  const R = rope();
  // ghost timer ring
  if (X.enc && (X.enc.phase === 'draw' || X.enc.phase === 'drawn')) {
    const e = X.enc, k = clamp((e.t - e.t0) / e.win, 0, 1), gp = e.ghost.chest.getWorldPosition(new V3()), s = toScreen(gp);
    const r = Math.max(60, .5 * focalPx() / Math.max(1, CAM.position.distanceTo(gp)));
    c.save(); c.lineWidth = 7; c.strokeStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(s.x, s.y, r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = k < .5 ? '#9fe8ff' : k < .8 ? '#ffd166' : '#ff5a4e'; c.shadowColor = c.strokeStyle; c.shadowBlur = 14;
    c.beginPath(); c.arc(s.x, s.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)); c.stroke(); c.restore();
  }
  // joystick
  if (X.joy) {
    const j = X.joy, dx = j.x - j.ox, dy = j.y - j.oy, m = Math.hypot(dx, dy), k = m > 60 ? 60 / m : 1;
    c.save();
    c.fillStyle = 'rgba(255,255,255,.12)'; c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3;
    c.beginPath(); c.arc(j.ox, j.oy, 64, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,224,140,.85)'; c.beginPath(); c.arc(j.ox + dx * k, j.oy + dy * k, 28, 0, Math.PI * 2); c.fill();
    c.restore();
  } else if (!X.enc && (X.clock < 8 && S.wins < 2)) {
    c.save(); c.globalAlpha = .35 + .15 * Math.sin(X.clock * 3);
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(VW * .18, VH * .72, 56, 0, Math.PI * 2); c.stroke();
    c.font = "900 15px 'Zen Maru Gothic', sans-serif"; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('Drag to walk', VW * .18, VH * .72 + 5);
    c.restore();
  }
  // minimap: the road around you, rotated so "forward" is up
  const Rm = Math.min(74, VW * .12), cx = VW - Rm - 18, cy = (parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0) + Rm + 64;
  const sc = Rm / 42, cos = Math.cos(X.camYaw), sin = Math.sin(X.camYaw);
  const map = (wx, wz) => { const dx = wx - X.pos.x, dz = wz - X.pos.z; const rx = -(dx * cos - dz * sin), rz = dx * sin + dz * cos; return [cx + rx * sc, cy - rz * sc]; };
  c.save();
  c.beginPath(); c.arc(cx, cy, Rm, 0, Math.PI * 2); c.fillStyle = 'rgba(8,10,20,.68)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(240,195,90,.6)'; c.stroke();
  c.clip();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(232,214,170,.55)'; c.lineWidth = ROPE_W * 2 * sc; c.beginPath();
  let started = false;
  for (let i = 0; i <= R.N; i += 2) { const p = R.pts[i]; if (Math.abs(p.x - X.pos.x) > 70 || Math.abs(p.z - X.pos.z) > 70) { started = false; continue; } const [mx, my] = map(p.x, p.z); if (!started) { c.moveTo(mx, my); started = true; } else c.lineTo(mx, my); }
  c.stroke();
  c.lineWidth = BRANCH_W * 2 * sc; c.strokeStyle = 'rgba(232,214,170,.4)';
  R.branches.forEach(br => { if (Math.hypot(br.bx - X.pos.x, br.bz - X.pos.z) > 80) return; c.beginPath(); br.path.forEach((p, i) => { const [mx, my] = map(p.x, p.z); i ? c.lineTo(mx, my) : c.moveTo(mx, my); }); c.stroke(); });
  R.beads.forEach(b => { if (Math.hypot(b.x - X.pos.x, b.z - X.pos.z) > 80) return; const [mx, my] = map(b.x, b.z); c.fillStyle = 'rgba(232,214,170,.4)'; c.beginPath(); c.arc(mx, my, b.r * sc, 0, Math.PI * 2); c.fill(); });
  const L = firstLockedLand(); if (L >= 0) { const G = R.gates[L], [mx, my] = map(G.x, G.z); c.strokeStyle = '#b48aff'; c.lineWidth = 3; c.beginPath(); c.arc(mx, my, 5, 0, Math.PI * 2); c.stroke(); }
  for (const p of X.pois) {
    const [mx, my] = map(p.x, p.z);
    if (p.kind === 'orb') { c.fillStyle = ORB_COLS[p.ch]; c.beginPath(); c.arc(mx, my, 4 + Math.sin(X.clock * 5) * 1.2, 0, Math.PI * 2); c.fill(); }
    else if (p.kind === 'warrior') { c.fillStyle = p.done ? '#7a8a7a' : p.st.boss ? '#ff6a4a' : '#ffd27a'; c.beginPath(); c.moveTo(mx, my - 6); c.lineTo(mx + 5, my + 4); c.lineTo(mx - 5, my + 4); c.closePath(); c.fill(); }
    else if (p.kind === 'shrine') { c.fillStyle = S.journey[p.ch].puzzle ? '#ffe08c' : '#e8dcc0'; c.fillRect(mx - 5, my - 5, 10, 10); }
    else if (p.kind === 'gate') { c.strokeStyle = gateOpen(p.ch) ? '#d9b8ff' : '#7a6a8a'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 6, my + 5); c.lineTo(mx - 6, my - 5); c.lineTo(mx + 6, my - 5); c.lineTo(mx + 6, my + 5); c.stroke(); }
    else if (p.kind === 'thief') { c.strokeStyle = '#ff5a5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 5, my + 5); c.lineTo(mx + 5, my - 5); c.moveTo(mx - 5, my - 5); c.lineTo(mx + 5, my + 5); c.stroke(); }
  }
  c.restore();
  // guide arrow toward the next objective
  const tgt = !X.enc && objectiveTarget();
  if (tgt) {
    const [mx, my] = map(tgt.x, tgt.z), dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy), dist = Math.round(Math.hypot(tgt.x - X.pos.x, tgt.z - X.pos.z));
    if (d > Rm - 8) {
      const a = Math.atan2(dy, dx), ax = cx + Math.cos(a) * (Rm + 4), ay = cy + Math.sin(a) * (Rm + 4);
      c.save(); c.translate(ax, ay); c.rotate(a); c.fillStyle = '#ffe08c'; c.shadowColor = '#ffe08c'; c.shadowBlur = 10;
      c.beginPath(); c.moveTo(10, 0); c.lineTo(-6, -8); c.lineTo(-2, 0); c.lineTo(-6, 8); c.closePath(); c.fill(); c.restore();
    } else { c.save(); c.strokeStyle = '#ffe08c'; c.lineWidth = 2; c.beginPath(); c.arc(mx, my, 9 + Math.sin(X.clock * 4) * 2, 0, Math.PI * 2); c.stroke(); c.restore(); }
    c.save(); c.font = "900 11px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = '#ffe08c'; c.fillText(`Next: ${dist} m`, cx, cy + Rm + 30); c.restore();
  }
  c.save(); c.translate(cx, cy); c.rotate(-(X.face - X.camYaw)); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(0, 3); c.lineTo(-6, 6); c.closePath(); c.fill(); c.restore();
  if (X.land >= 0) { c.save(); c.font = "900 11px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText(`Orbs ${orbsFound(X.land)}/3 · Warriors ${warriorsBeaten(X.land)}/3`, cx, cy + Rm + 16); c.restore(); }
}
