'use strict';
/* ===== Journey: roam a chapter's land in third person ===== */

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

function startExplore(ch, returning) {
  if (!chapterUnlocked(ch)) { toast('Defeat the mythical boss of the previous land first.'); return; }
  transition(() => {
    clearSceneActors();
    const W = buildWorld(ch); activateWorld(W);
    const L = LANDS[ch];
    const P = new Samurai(lookFromOutfit(outfitDef(S.outfit)), swordDef(eqSword().id), {});
    P.root.rotation.order = 'YXZ'; W.scene.add(P.root, P.trail.mesh); P.setHold('rest', 8);
    const pos = new V3(L.spawn[0], 0, L.spawn[1]); let yaw = 0;
    if (returning && EXPLORE_RETURN && EXPLORE_RETURN.ch === ch) { pos.set(EXPLORE_RETURN.x, 0, EXPLORE_RETURN.z); yaw = EXPLORE_RETURN.yaw; }
    X = { ch, W, L, P, pos, face: yaw, camYaw: yaw, camPitch: .3, speed: 0, phase: 0, joy: null, look: null, pois: [], near: null, clock: 0, camPos: new V3(), camLook: new V3(), orbMeshes: [], shrine: null, gate: null, warriors: [] };
    buildPOIs();
    showHUD('explore');
    $('#leaveBtn').textContent = 'Dojo';
    $('#stageLbl').textContent = `${CHAPTERS[ch].name} · ${CHAPTERS[ch].jp}`;
    OV.draw = drawExploreOverlay; OV.trailCol = '255,255,255';
    updateObjective();
    if (!returning) banner(CHAPTERS[ch].name, 'Explore the land');
    MUSIC.start('hub');
    setMode(ExploreMode);
  });
}
function endExplore() { X = null; OV.draw = null; hideHUD(); enterHub(); }
function updateObjective() { if (X) $('#tInfo').innerHTML = `<b>${CHAPTERS[X.ch].name}</b>${journeyObjective(X.ch)}`; }

function buildPOIs() {
  const { W, L, ch } = X;
  const scene = W.scene;
  // warriors
  chapterStages(ch).forEach(([st, idx], k) => {
    const [x, z] = L.warriors[k], y = W.hAt(x, z);
    const poi = { kind: 'warrior', idx, st, x, z, r: 2.8 };
    if (!S.beaten[idx]) {
      const rig = new Samurai(st.look, swordDef(st.sword), {});
      rig.root.rotation.order = 'YXZ'; rig.root.position.set(x, y, z);
      rig.root.rotation.y = Math.atan2(L.spawn[0] - x, L.spawn[1] - z);
      rig.setHold('guard', 8); scene.add(rig.root, rig.trail.mesh);
      poi.rig = rig; obs(W, x, z, .6);
      const lab = labelSprite(st.name, st.boss ? '#ffb38a' : '#fff6d8', st.boss ? 'BOSS · Power ' + st.rec : 'Power ' + st.rec); lab.position.set(x, y + 2.6, z); scene.add(lab); poi.label = lab;
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.3, 40), new THREE.MeshBasicMaterial({ color: st.boss ? '#ff6a4a' : '#ffd27a', transparent: true, opacity: .7, side: THREE.DoubleSide, fog: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, y + .04, z); scene.add(ring); poi.ring = ring;
    } else {
      const stone = new THREE.Mesh(merge([P(GEO.box(.5, 1.1, .3), '#8a8478', [0, .55, 0]), P(GEO.box(.7, .15, .5), '#6a6458', [0, .07, 0])]), toon({ vertexColors: true }));
      stone.position.set(x, y, z); stone.rotation.y = Math.atan2(-x, -z); stone.castShadow = true; scene.add(stone); obs(W, x, z, .4);
      const lab = labelSprite(st.name, '#b8e6c0', 'Defeated · rematch'); lab.position.set(x, y + 1.8, z); lab.scale.multiplyScalar(.8); scene.add(lab);
      poi.r = 2.2; poi.done = true;
    }
    X.pois.push(poi);
  });
  // orbs
  L.orbs.forEach(([x, z], k) => {
    if (S.journey[ch].orbs[k]) return;
    const y = W.hAt(x, z);
    const g = new THREE.Group(); g.position.set(x, y + 1.1, z);
    const core = new THREE.Mesh(GEO.ico(.28, 2), new THREE.MeshBasicMaterial({ color: L.orb, fog: false })); g.add(core);
    const shell = new THREE.Mesh(GEO.ico(.42, 1), glowMat(L.orb, .25)); g.add(shell);
    g.add(halo(L.orb, 2.4, .9));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color: L.orb, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.set(x, y + 7, z); scene.add(beam);
    scene.add(g);
    X.pois.push({ kind: 'orb', k, x, z, r: 1.4, g, beam, core });
  });
  // shrine
  {
    const [x, z] = L.shrine, y = W.hAt(x, z), face = Math.atan2(-x, -z);
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = face; scene.add(g);
    const base = new THREE.Mesh(merge([
      P(GEO.cyl(2.4, 2.6, .35, 24), '#8a8478', [0, .17, 0]),
      P(GEO.box(1.6, 1.4, 1.2), '#e8dcc0', [0, 1.05, -.9]),
      P(GEO.cone(1.5, .9, 4), '#2f3540', [0, 2.1, -.9], [0, Math.PI / 4, 0], [1.2, 1, .95]),
      P(GEO.box(.2, 1.4, .2), '#4a3020', [-.8, 1.05, -.3]), P(GEO.box(.2, 1.4, .2), '#4a3020', [.8, 1.05, -.3]),
      ...[-1, 0, 1].map(i => P(GEO.cyl(.18, .24, .7, 8), '#9a9488', [i * .9, .7, .9])),
    ]), toon({ vertexColors: true }));
    base.castShadow = true; g.add(base);
    const tor = new THREE.Mesh(toriiGeo('#d7372b', '#1c1416'), toon({ vertexColors: true })); tor.scale.setScalar(.5); tor.position.set(0, .3, 2.1); g.add(tor);
    const slots = [-1, 0, 1].map(i => { const m = new THREE.Mesh(GEO.ico(.18, 2), new THREE.MeshBasicMaterial({ color: L.orb, fog: false })); m.position.set(i * .9, 1.25, .9); g.add(m); const h = halo(L.orb, 1, .8); h.position.copy(m.position); g.add(h); return [m, h]; });
    const glow = halo('#ffe08c', 6, 0); glow.position.set(0, 1.6, -.4); g.add(glow);
    const lab = labelSprite('Spirit Shrine', '#ffe08c', PUZZLE_NAMES[ch]); lab.position.set(x, y + 3.6, z); scene.add(lab);
    obs(W, x, z, 2.2);
    X.shrine = { g, slots, glow };
    X.pois.push({ kind: 'shrine', x, z, r: 3.6 });
    refreshShrine();
  }
  // spirit gate
  {
    const [x, z] = L.gate, y = W.hAt(x, z), face = Math.atan2(-x, -z);
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = face; scene.add(g);
    if (ch !== 2) { const tor = new THREE.Mesh(toriiGeo('#3a1a4a', '#120a18'), toon({ vertexColors: true })); tor.scale.setScalar(1.15); g.add(tor); tor.castShadow = true; }
    const m = barrierMat(MYTHS[ch].dragon ? '#ff7a1a' : '#8a3aff', '#ff5a8a');
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.6), m); plane.position.set(0, 2.4, 0); g.add(plane);
    const lab = labelSprite('Spirit Gate', '#d9b8ff', `${MYTHS[ch].name} · Power ${MYTHS[ch].rec}`); lab.position.set(x, y + 6.6, z); scene.add(lab);
    obs(W, x - Math.cos(face) * 2.3, z + Math.sin(face) * 2.3, .4); obs(W, x + Math.cos(face) * 2.3, z - Math.sin(face) * 2.3, .4);
    X.gate = { g, m, plane };
    X.pois.push({ kind: 'gate', x, z, r: 3.8 });
  }
  W.updaters.push((dt, t) => {
    if (!X) return;
    X.pois.forEach(p => {
      if (p.kind === 'orb' && p.g) { p.g.position.y = W.hAt(p.x, p.z) + 1.1 + Math.sin(t * 2 + p.k) * .15; p.g.rotation.y += dt * 1.5; }
      if (p.ring) p.ring.material.opacity = .45 + Math.sin(t * 3) * .25;
    });
    if (X.gate) { X.gate.m.uniforms.time.value = t; X.gate.m.uniforms.open.value = S.journey[X.ch].myth ? 0 : gateOpen(X.ch) ? 1 : .15; X.gate.plane.visible = !S.journey[X.ch].myth; }
    if (X.shrine && S.journey[X.ch].puzzle) X.shrine.glow.material.opacity = .55 + Math.sin(t * 2) * .2;
  });
}
function refreshShrine() {
  if (!X || !X.shrine) return;
  X.shrine.slots.forEach(([m, h], k) => { const on = !!S.journey[X.ch].orbs[k]; m.visible = on; h.visible = on; });
}

function collectOrb(p) {
  S.journey[X.ch].orbs[p.k] = 1; save();
  const pos = p.g.position.clone();
  FX.sparks(pos, X.L.orb, 40, 5, .09); FX.glowBurst(pos, X.L.orb, 2.4, .5); FX.petals(pos, 20, X.L.orb, 3);
  X.W.scene.remove(p.g); X.W.scene.remove(p.beam);
  X.pois = X.pois.filter(q => q !== p);
  sfx.up(); banner('Spirit orb found!', `${orbsFound(X.ch)} of 3`);
  refreshShrine(); updateObjective();
}

/* ---------- interaction ---------- */
function exploreAct() {
  if (!X || !X.near) return;
  const p = X.near;
  const back = new V3(X.pos.x - p.x, 0, X.pos.z - p.z).normalize();
  EXPLORE_RETURN = { ch: X.ch, x: p.x + back.x * (p.r + .8), z: p.z + back.z * (p.r + .8), yaw: Math.atan2(-back.x, -back.z) };
  if (p.kind === 'warrior') { sfx.taiko(.8); startFight(p.idx, 'explore'); }
  else if (p.kind === 'shrine') {
    if (orbsFound(X.ch) < 3) { toast(`The shrine needs 3 spirit orbs. You have ${orbsFound(X.ch)}.`); return; }
    if (S.journey[X.ch].puzzle) { toast('The shrine is already awake.'); return; }
    openPuzzle(X.ch, () => {
      S.journey[X.ch].puzzle = true; save();
      sfx.win(); banner('Shrine awakened!', gateOpen(X.ch) ? 'The spirit gate is open!' : 'Defeat the warriors to open the gate');
      if (X) { FX.sparks(X.shrine.g.position.clone().add(new V3(0, 1.5, 0)), '#ffe08c', 60, 6); updateObjective(); }
    });
  } else if (p.kind === 'gate') {
    if (gateOpen(X.ch) || S.journey[X.ch].myth) { startMyth(X.ch, 'explore'); return; }
    const need = [];
    if (warriorsBeaten(X.ch) < 3) need.push(`defeat the warriors (${warriorsBeaten(X.ch)}/3)`);
    if (!S.journey[X.ch].puzzle) need.push('awaken the shrine');
    toast('The gate is sealed. First ' + need.join(' and ') + '.');
  }
}
function actLabel(p) {
  if (p.kind === 'warrior') return p.done ? `Rematch ${p.st.name}` : `⚔ Duel ${p.st.name}`;
  if (p.kind === 'shrine') return S.journey[X.ch].puzzle ? 'Shrine is awake ✓' : orbsFound(X.ch) < 3 ? `Shrine needs orbs (${orbsFound(X.ch)}/3)` : 'Solve the shrine puzzle';
  if (p.kind === 'gate') return S.journey[X.ch].myth ? `Rematch ${MYTHS[X.ch].name}` : gateOpen(X.ch) ? `Face ${MYTHS[X.ch].name}!` : 'Spirit gate (sealed)';
  return '';
}

/* ---------- per frame ---------- */
const ExploreMode = {
  name: 'explore',
  update(dt) {
    const x = X; if (!x) return;
    x.clock += dt;
    // input
    let ix = 0, iy = 0;
    if (x.joy) { const dx = (x.joy.x - x.joy.ox) / 60, dy = (x.joy.y - x.joy.oy) / 60; const m = Math.hypot(dx, dy); const k = m > 1 ? 1 / m : 1; ix = dx * k; iy = -dy * k; }
    if (KEYS.w || KEYS.arrowup) iy = 1; if (KEYS.s || KEYS.arrowdown) iy = -1;
    if (KEYS.a || KEYS.arrowleft) ix = -1; if (KEYS.d || KEYS.arrowright) ix = 1;
    const mag = Math.min(1, Math.hypot(ix, iy));
    const fwd = new V3(Math.sin(x.camYaw), 0, Math.cos(x.camYaw)), right = new V3(-Math.cos(x.camYaw), 0, Math.sin(x.camYaw));
    const dir = fwd.clone().multiplyScalar(iy).addScaledVector(right, ix);
    if (mag > .05) {
      dir.normalize();
      const sp = 4.8 * mag;
      x.pos.addScaledVector(dir, sp * dt);
      const target = Math.atan2(dir.x, dir.z);
      let d = target - x.face; d = Math.atan2(Math.sin(d), Math.cos(d)); x.face += d * damp(10, dt);
      if (!x.look) { let cd = x.face - x.camYaw; cd = Math.atan2(Math.sin(cd), Math.cos(cd)); if (iy > -.2) x.camYaw += cd * damp(1.1, dt) * mag; }
    }
    x.speed = lerp(x.speed, mag, damp(8, dt));
    // collisions
    for (const o of x.W.obs) {
      const dx = x.pos.x - o.x, dz = x.pos.z - o.z, rr = o.r + .4, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); x.pos.x = o.x + dx / d * rr; x.pos.z = o.z + dz / d * rr; }
    }
    const R = Math.hypot(x.pos.x, x.pos.z); if (R > x.L.bound) { x.pos.x *= x.L.bound / R; x.pos.z *= x.L.bound / R; }
    x.pos.y = x.W.hAt(x.pos.x, x.pos.z);
    // walk animation
    const P = x.P;
    x.phase += x.speed * dt * 9;
    const st = .26 * x.speed, lift = .13 * x.speed;
    P.feet.L.set(.15, .035 + Math.max(0, Math.sin(x.phase)) * lift, Math.sin(x.phase) * st - .02);
    P.feet.R.set(-.15, .035 + Math.max(0, Math.sin(x.phase + Math.PI)) * lift, Math.sin(x.phase + Math.PI) * st + .02);
    P.crouch = -Math.abs(Math.sin(x.phase)) * .035 * x.speed;
    P.leanAdd = x.speed * .12;
    P.root.position.copy(x.pos); P.root.rotation.y = x.face;
    P.update(dt);
    x.warriors = x.warriors || [];
    for (const p of x.pois) if (p.rig) {
      const d = Math.hypot(x.pos.x - p.x, x.pos.z - p.z);
      if (d < 7) { const a = Math.atan2(x.pos.x - p.x, x.pos.z - p.z); let dd = a - p.rig.root.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); p.rig.root.rotation.y += dd * damp(3, dt); }
      p.rig.update(dt);
    }
    // nearest point of interest
    let near = null, nd = 1e9;
    for (const p of x.pois.slice()) {
      const d = Math.hypot(x.pos.x - p.x, x.pos.z - p.z);
      if (p.kind === 'orb') { if (d < p.r) collectOrb(p); continue; }
      if (d < p.r && d < nd) { near = p; nd = d; }
    }
    if (near !== x.near) {
      x.near = near;
      const b = $('#actBtn');
      if (near) { b.hidden = false; b.textContent = actLabel(near); b.classList.toggle('locked', (near.kind === 'gate' && !gateOpen(x.ch) && !S.journey[x.ch].myth) || (near.kind === 'shrine' && (orbsFound(x.ch) < 3 || S.journey[x.ch].puzzle))); }
      else b.hidden = true;
    }
    // camera
    const portrait = VH > VW, dist = portrait ? 6 : 4.8;
    const tgt = x.pos.clone().add(new V3(0, 1.45, 0));
    const pos = tgt.clone().addScaledVector(fwd, -dist * Math.cos(x.camPitch)).add(new V3(0, dist * Math.sin(x.camPitch) + .3, 0));
    const look = tgt.clone().addScaledVector(fwd, 1.6);
    const kk = x.clock < .1 ? 60 : 10;
    x.camPos.lerp(pos, damp(kk, dt)); x.camLook.lerp(look, damp(kk, dt));
    const gy = x.W.hAt(x.camPos.x, x.camPos.z) + .4; if (x.camPos.y < gy) x.camPos.y = gy;
    CAM.position.copy(x.camPos); CAM.lookAt(x.camLook);
    CAM.fov = lerp(CAM.fov, 58, damp(6, dt)); CAM.updateProjectionMatrix(); FX.setScale();
    if (x.clock < 6 && !x.hintShown) hint(S.wins < 1 ? 'Drag on the left side to walk · drag on the right side to look around' : '');
    else hint('');
  },
  down(px, py, id) {
    if (!X) return;
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
  // joystick
  if (X.joy) {
    const j = X.joy, dx = j.x - j.ox, dy = j.y - j.oy, m = Math.hypot(dx, dy), k = m > 60 ? 60 / m : 1;
    c.save();
    c.fillStyle = 'rgba(255,255,255,.12)'; c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3;
    c.beginPath(); c.arc(j.ox, j.oy, 64, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,224,140,.85)'; c.beginPath(); c.arc(j.ox + dx * k, j.oy + dy * k, 28, 0, Math.PI * 2); c.fill();
    c.restore();
  } else if (X.clock < 8 || S.wins < 1) {
    c.save(); c.globalAlpha = .35 + .15 * Math.sin(X.clock * 3);
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(VW * .18, VH * .72, 56, 0, Math.PI * 2); c.stroke();
    c.font = "900 15px 'Zen Maru Gothic', sans-serif"; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('Drag to walk', VW * .18, VH * .72 + 5);
    c.restore();
  }
  // minimap (rotates so that "forward" is up)
  const R = Math.min(70, VW * .11), cx = VW - R - Math.max(16, 12) - 4, cy = (parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0) + R + 64;
  const sc = R / (X.L.bound + 4), cos = Math.cos(X.camYaw), sin = Math.sin(X.camYaw);
  const map = (wx, wz) => { const dx = wx - X.pos.x, dz = wz - X.pos.z; const rx = -(dx * cos - dz * sin), rz = dx * sin + dz * cos; return [cx + rx * sc, cy - rz * sc]; };
  c.save();
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fillStyle = 'rgba(8,10,20,.65)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(240,195,90,.6)'; c.stroke();
  c.clip();
  const bd = map(0, 0); c.beginPath(); c.arc(bd[0], bd[1], X.L.bound * sc, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,255,255,.18)'; c.stroke();
  for (const p of X.pois) {
    const [mx, my] = map(p.x, p.z);
    if (p.kind === 'orb') { c.fillStyle = X.L.orb; c.beginPath(); c.arc(mx, my, 4 + Math.sin(X.clock * 5) * 1.2, 0, Math.PI * 2); c.fill(); }
    else if (p.kind === 'warrior') { c.fillStyle = p.done ? '#7a8a7a' : p.st.boss ? '#ff6a4a' : '#ffd27a'; c.beginPath(); c.moveTo(mx, my - 6); c.lineTo(mx + 5, my + 4); c.lineTo(mx - 5, my + 4); c.closePath(); c.fill(); }
    else if (p.kind === 'shrine') { c.fillStyle = S.journey[X.ch].puzzle ? '#ffe08c' : '#e8dcc0'; c.fillRect(mx - 5, my - 5, 10, 10); }
    else if (p.kind === 'gate') { c.strokeStyle = gateOpen(X.ch) ? '#d9b8ff' : '#7a6a8a'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 6, my + 5); c.lineTo(mx - 6, my - 5); c.lineTo(mx + 6, my - 5); c.lineTo(mx + 6, my + 5); c.stroke(); }
  }
  c.restore();
  // player arrow
  c.save(); c.translate(cx, cy); c.rotate(-(X.face - X.camYaw)); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(0, 3); c.lineTo(-6, 6); c.closePath(); c.fill(); c.restore();
  c.save(); c.font = "900 11px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.75)';
  c.fillText(`Orbs ${orbsFound(X.ch)}/3 · Warriors ${warriorsBeaten(X.ch)}/3`, cx, cy + R + 16); c.restore();
}
