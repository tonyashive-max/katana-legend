'use strict';
/* ===== Journey: roam the winding road through every land ===== */

let X = null;
let EXPLORE_RETURN = null;
const _lp = new V3();
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
  sp.scale.set(2.6, .82, 1); sp.renderOrder = 8; sp.userData.label = true;
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

function firstLockedLand() { for (let ch = 0; ch < NL; ch++) if (!S.journey[ch].myth) return ch; return -1; }
function limitS() { if (!S.tutDone) return rope().tutGate.s + .1; const L = firstLockedLand(); return L < 0 ? Infinity : rope().gates[L].s + .1; }
function blockGate() { if (!S.tutDone) return rope().tutGate; const L = firstLockedLand(); return L < 0 ? null : rope().gates[L]; }
function dojoSpawn() { const R = rope(), b = R.dojoBead, p = R.pts[b.i]; return { x: b.x - p.tx * 2, z: b.z - p.tz * 2, yaw: Math.atan2(p.tx, p.tz) }; }
function sampleAt(x, z) { const q = ropeQuery(x, z); return rope().pts[clamp(Math.round(q.s / rope().ds), 0, rope().N)]; }
function landEntry(ch) { const R = rope(), b = R.landBeads(ch)[0], p = R.pts[b.i]; return { x: b.x - p.tx * 3, z: b.z - p.tz * 3, yaw: Math.atan2(p.tx, p.tz) }; }

function startExplore(ch, returning) {
  if (typeof ch === 'number' && !chapterUnlocked(ch)) { toast('Defeat the mythical boss of the previous land first.'); return; }
  transition(() => {
    clearSceneActors();
    const W = getRopeWorld(); activateWorld(W);
    if (X && X.poi) disposePoi();
    const lim = limitS();
    let sp = null;
    if (returning && EXPLORE_RETURN) sp = EXPLORE_RETURN;
    else if (ch === 'dojo') sp = dojoSpawn();
    else if (!S.tutDone && (ch == null || ch === 0)) sp = (S.roam && ropeQuery(S.roam.x, S.roam.z, lim).d < .5) ? S.roam : dojoSpawn();
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
  if (!S.tutDone) { $('#tInfo').innerHTML = `<b>Training Grounds</b>${!isArmed() ? 'Take a practice sword from the Dojo building.' : 'Walk down the path and defeat the practice ghost.'}`; return; }
  $('#tInfo').innerHTML = `<b>${CHAPTERS[ch].name}</b>${!isArmed() ? 'Your hands are empty. Walk back to the Dojo at the start of the road for a practice sword, or equip a blade from the menu.' : journeyObjective(ch) + cap}`;
}

/* ---------- points of interest ---------- */
function buildPOIs() {
  const R = rope(), g = X.poi;
  for (let ch = 0; ch < NL; ch++) {
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
        rig.setSheathed(true); g.add(rig.root);
        poi.rig = rig;
        if (st.duo) { // the twin waits beside, already drawn
          const tw = new Samurai(st.look2 || st.look, swordDef(st.sword), {}); tw.root.rotation.order = 'YXZ';
          const px = R.pts[b.i]; tw.root.position.set(b.x + px.nx * 1.6, y, b.z + px.nz * 1.6); tw.root.rotation.y = rig.root.rotation.y; tw.setHold('guard', 8);
          g.add(tw.root); poi.twin = tw;
        }
        if (st.train) { // a training banner: this warrior only duels samurai who have trained
          const px = R.pts[b.i], fx = b.x - px.nx * 1.8, fz = b.z - px.nz * 1.8;
          const tex = ctex(128, (x, s, h) => { x.fillStyle = trainMet(st) ? '#1f6a45' : '#8a1d12'; x.fillRect(0, 0, s, h); x.strokeStyle = '#ffd27a'; x.lineWidth = 6; x.strokeRect(6, 6, s - 12, h - 12); x.fillStyle = '#fff4d0'; x.font = "900 72px 'Zen Maru Gothic', serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('修', s / 2, h * .36); x.font = "900 22px 'Zen Maru Gothic', sans-serif"; x.fillText(SKILLS[st.train.sk].n.toUpperCase(), s / 2, h * .66); x.fillText('LV ' + st.train.l, s / 2, h * .8); }, 256);
          const flag = new THREE.Group(); flag.position.set(fx, y, fz); flag.rotation.y = rig.root.rotation.y; g.add(flag);
          flag.add(new THREE.Mesh(GEO.cyl(.04, .05, 3.4, 6), toon({ color: '#2a1a12' }))).position.y = 1.7;
          for (const back of [0, 1]) { const cloth = new THREE.Mesh(new THREE.PlaneGeometry(.75, 1.5), toon({ map: tex })); cloth.position.set(.4, 2.45, back ? -.01 : .01); cloth.rotation.y = back ? Math.PI : 0; flag.add(cloth); }
          X.W.obs.push({ x: fx, z: fz, r: .25, poi: true });
        }
        const sub = (st.boss ? 'BOSS · ' : st.duo ? '2 VS 1 · ' : '') + (st.train && !trainMet(st) ? `🔒 ${SKILLS[st.train.sk].n} Lv ${st.train.l} · ` : '') + 'Power ' + st.rec;
        const lab = labelSprite(st.name, st.boss ? '#ffb38a' : st.train ? '#ffd27a' : '#fff6d8', sub); lab.position.set(b.x, y + 2.6, b.z); g.add(lab);
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
      og.add(new THREE.Mesh(GEO.ico(.28, 2), glowify(new THREE.MeshBasicMaterial({ color: col, fog: false }))));
      og.add(new THREE.Mesh(GEO.ico(.42, 1), glowMat(col, .25)));
      og.add(halo(col, 2.4, .9));
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.12, .3, 18, 10, 1, true), glowify(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
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
      const slots = [-1, 0, 1].map(i => { const m = new THREE.Mesh(GEO.ico(.18, 2), glowify(new THREE.MeshBasicMaterial({ color: col, fog: false }))); m.position.set(i * .9, 1.25, .9); sg.add(m); const h = halo(col, 1, .8); h.position.copy(m.position); sg.add(h); return [m, h]; });
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
      const lab = labelSprite('Spirit Gate', '#d9b8ff', `Spirit Warrior · Power ${SPIRITS[ch].rec}`); lab.position.set(G.x, y + 5.6 * sc, G.z); g.add(lab);
      // the lock seal on the barrier and the Spirit Key that opens it
      const seal = new THREE.Group(); seal.position.set(0, 2.2 * sc, 0); gg.add(seal);
      const sealMat = toon({ vertexColors: true }); sealMat.emissive = new COL('#ffb03a').multiplyScalar(.15);
      seal.add(new THREE.Mesh(merge([
        P(GEO.cyl(.62, .62, .08, 28), '#2a1030', [0, 0, 0], [Math.PI / 2, 0, 0]),
        P(GEO.tor(.62, .07, 6, 28), '#ffc24a', [0, 0, 0]),
        P(GEO.tor(.46, .025, 5, 24), '#ffc24a', [0, 0, 0]),
        P(GEO.cyl(.1, .1, .1, 12), '#0a0408', [0, .1, 0], [Math.PI / 2, 0, 0]),
        P(GEO.box(.09, .26, .1), '#0a0408', [0, -.06, 0]),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => P(GEO.cone(.05, .14, 4), '#ffc24a', [Math.cos(i * Math.PI / 4) * .74, Math.sin(i * Math.PI / 4) * .74, 0], [0, 0, i * Math.PI / 4 - Math.PI / 2])),
      ]), sealMat));
      const key = buildSpiritKey(ORB_COLS[ch]); gg.add(key);
      X.pois.push({ kind: 'gate', ch, x: G.x - G.tx * 2, z: G.z - G.tz * 2, r: 4.2, m, plane, seal, sealMat, key, sc });
    }
  }
  // the dojo, the training gate and the signs
  {
    const D = R.dojoPos, fx = D.x + Math.sin(D.face) * 4.6, fz = D.z + Math.cos(D.face) * 4.6;
    X.pois.push({ kind: 'dojo', x: fx, z: fz, r: 3.2 });
    const T = R.tutGate;
    if (!S.tutDone) {
      const gg = new THREE.Group(); gg.position.set(T.x, ropeWalkHeight(T.x, T.z), T.z); gg.rotation.y = Math.atan2(T.nx, T.nz) + Math.PI / 2; g.add(gg);
      const rope = new THREE.Mesh(GEO.cyl(.07, .07, ROPE_W * 2 + .6, 8), toon({ color: '#e8d49a' })); rope.rotation.z = Math.PI / 2; rope.position.y = 2.4; gg.add(rope);
      for (let k = -2; k <= 2; k++) { const pz = new THREE.Mesh(GEO.box(.12, .5, .02), new THREE.MeshBasicMaterial({ color: '#ffffff' })); pz.position.set(k * 1.1, 2.05, 0); gg.add(pz); }
      for (const sd of [-1, 1]) { const post = new THREE.Mesh(GEO.cyl(.1, .12, 2.6, 8), toon({ color: '#4a2e1a' })); post.position.set(sd * (ROPE_W + .3), 1.3, 0); gg.add(post); }
      const m = barrierMat('#ffe08c', '#9fe8ff'); const pl = new THREE.Mesh(new THREE.PlaneGeometry(ROPE_W * 2, 2.4), m); pl.position.y = 1.2; gg.add(pl);
      const lab = labelSprite('Training Gate', '#ffe08c', 'Beat the practice ghost'); lab.position.set(T.x, gg.position.y + 3.4, T.z); g.add(lab);
      X.pois.push({ kind: 'tgate', x: T.x - T.tx * 1.5, z: T.z - T.tz * 1.5, r: 3, m, grp: gg, lab });
    }
    const signs = [[R.dojoBead, 'Welcome, samurai!', 'Drag left side to walk'], [R.trainBead, 'Ghosts!', 'Swipe from the hilt to draw, then slash']];
    const midS = (R.dojoBead.s + R.trainBead.s) / 2, mp = R.pts[Math.round(midS / R.ds)];
    signs.push([{ x: mp.x, z: mp.z, i: Math.round(midS / R.ds) }, 'Lost your sword?', 'Get a new one at the Dojo']);
    signs.push([R.landBeads(0)[0], 'Two ghosts per land', 'Blue samurai steal swords · Pink geisha send you back']);
    signs.forEach(([b, t1, t2], k) => {
      const p = R.pts[b.i], sd = k % 2 ? -1 : 1, off = b.r ? b.r - 1.2 : ROPE_W - .5, x = b.x + p.nx * sd * off, z = b.z + p.nz * sd * off;
      const st = new THREE.Mesh(merge([P(GEO.box(.16, 1.6, .16), '#4a3020', [0, .8, 0]), P(GEO.box(1.3, .7, .1), '#e8dcc0', [0, 1.5, 0])]), toon({ vertexColors: true }));
      st.position.set(x, ropeWalkHeight(x, z), z); st.rotation.y = Math.atan2(-p.nx * sd, -p.nz * sd); g.add(st);
      const lab = labelSprite(t1, '#fff6d8', t2); lab.position.set(x, st.position.y + 2.5, z); g.add(lab);
      X.W.obs.push({ x, z, r: .3, poi: true });
    });
  }
  // material nodes
  R.nodes.forEach(n => {
    if (!chapterUnlocked(n.ch)) return;
    const key = n.ch + '-' + n.k; if (Date.now() - (S.nodeT[key] || 0) < 5 * 60e3) return;
    const M = MATERIALS[n.mat], y = ropeWalkHeight(n.x, n.z);
    const ng = new THREE.Group(); ng.position.set(n.x, y, n.z);
    const rock = new THREE.Mesh(GEO.dodec(.42), toon({ color: ['#6a6458', '#7a8496', '#6a6458', '#2a1e1c', '#5a5a48', '#7a7468', '#8a8690'][n.ch], flatShading: true })); rock.scale.set(1, .6, 1); rock.position.y = .15; rock.castShadow = true; ng.add(rock);
    const cm = glowify(new THREE.MeshBasicMaterial({ color: M.c }));
    for (let i = 0; i < (n.rare ? 5 : 3); i++) { const cr = new THREE.Mesh(GEO.oct(1), cm); cr.scale.set(.07, .22 + Math.random() * .16, .07); cr.position.set(Math.cos(i * 2.1) * .18, .4, Math.sin(i * 2.1) * .18); cr.rotation.set(rnd(-.4, .4), 0, rnd(-.4, .4)); ng.add(cr); }
    const h = halo(M.c, n.rare ? 1.8 : 1.2, .75); h.position.y = .5; ng.add(h);
    g.add(ng);
    X.pois.push({ kind: 'node', n, key, x: n.x, z: n.z, r: 1.6, g: ng, halo: h });
  });
  // summit
  if (S.journey[NL - 1].myth) {
    const sb = R.beads.find(b => b.kind === 'summit'), y = ropeWalkHeight(sb.x, sb.z);
    const lab = labelSprite('Summit of Legends', '#ffe08c', 'You made it!'); lab.position.set(sb.x, y + 4, sb.z); lab.scale.multiplyScalar(1.3); X.poi.add(lab);
    X.pois.push({ kind: 'summit', x: sb.x, z: sb.z, r: 6 });
  }
  // ghosts holding captured blades
  S.captured.forEach(c => addThief(c));
  buildBeasts();
  X.W.updaters = X.W.updaters.filter(f => !f.poiUpdater);
  const up = (dt, t) => {
    if (!X) return;
    X.pois.forEach(p => {
      if (p.kind === 'orb') { p.g.position.y = p.baseY + Math.sin(t * 2 + p.k) * .15; p.g.rotation.y += dt * 1.5; }
      if (p.ring) p.ring.material.opacity = .45 + Math.sin(t * 3) * .25;
      if (p.kind === 'gate') {
        p.m.uniforms.time.value = t; const open = gateOpen(p.ch), j = S.journey[p.ch];
        p.m.uniforms.open.value = open ? 1 : .15;
        p.seal.visible = !j.myth; p.key.visible = !!j.key && !j.myth;
        if (open) { p.key.position.set(0, 2.2 * p.sc, .08); p.key.rotation.set(0, 0, Math.PI / 2); p.sealMat.emissive.setRGB(.6 + Math.sin(t * 4) * .2, .4, .1); p.seal.rotation.z = Math.sin(t * .8) * .1; }
        else { p.key.position.set(0, 2.2 * p.sc + .1 + Math.sin(t * 2) * .12, 1.5); p.key.rotation.set(0, t * 1.6, 0); }
      }
      if (p.kind === 'shrine' && S.journey[p.ch].puzzle) p.glow.material.opacity = .55 + Math.sin(t * 2) * .2;
      if (p.kind === 'node') { p.halo.material.opacity = .45 + Math.sin(t * 3 + p.x) * .3; if (Math.random() < dt * 2) FX.add.emit(p.x + rnd(-.3, .3), p.g.position.y + .5, p.z + rnd(-.3, .3), 0, rnd(.3, .8), 0, .8, .06, 0, MATERIALS[p.n.mat].c, 1, 0, .2); }
      if (p.kind === 'tgate') { p.m.uniforms.time.value = t; p.m.uniforms.open.value = .5; }
      if (p.kind === 'thief') { p.icon.rotation.y += dt * 2; p.icon.position.y = p.baseY + Math.sin(t * 2.5) * .2; p.beam.material.opacity = .25 + Math.sin(t * 4) * .1; }
    });
  };
  up.poiUpdater = true; X.W.updaters.push(up);
}
/* the Spirit Key: an ornate gold key with a crest in the land's colour and a red tassel */
function buildSpiritKey(col) {
  const g = new THREE.Group(), mt = toon({ vertexColors: true }); mt.emissive = new COL('#ffb03a').multiplyScalar(.35);
  const items = [
    P(GEO.tor(.26, .065, 8, 24), '#ffc24a', [0, .62, 0]),
    P(GEO.cyl(.13, .13, .05, 5), col, [0, .62, 0], [Math.PI / 2, 0, 0]),
    P(GEO.cyl(.05, .05, .95, 8), '#ffc24a', [0, .02, 0]),
    P(GEO.cyl(.075, .075, .06, 10), '#ffe08c', [0, .28, 0]),
    P(GEO.cyl(.075, .075, .06, 10), '#ffe08c', [0, .18, 0]),
    P(GEO.box(.2, .07, .05), '#ffc24a', [.1, -.32, 0]),
    P(GEO.box(.14, .07, .05), '#ffc24a', [.07, -.18, 0]),
    P(GEO.box(.06, .12, .05), '#ffc24a', [.17, -.36, 0]),
  ];
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; items.push(P(GEO.sph(.06, 6, 5), col, [Math.cos(a) * .1, .62 + Math.sin(a) * .1, .03])); }
  const mesh = new THREE.Mesh(merge(items), mt); mesh.add(new THREE.Mesh(mesh.geometry, outlineMat(.012))); g.add(mesh);
  const tas = new THREE.Mesh(merge([P(GEO.cyl(.015, .015, .3, 5), '#c0281e', [-.18, .75, 0], [0, 0, .9]), P(GEO.cone(.06, .22, 8), '#c0281e', [-.32, .62, 0], [0, 0, 0]), P(GEO.sph(.04, 6, 5), '#ffc24a', [-.32, .74, 0])]), toon({ vertexColors: true }));
  g.add(tas);
  const h = halo('#ffe08c', 1.6, .55); h.position.y = .3; g.add(h);
  g.scale.setScalar(1.3);
  return g;
}
/* ---------- each land's mythical beast roams the road and hunts you ---------- */
const BEAST_NAP = 75e3, BEAST_WALK = 1.7, BEAST_RUN = 5.5, BEAST_SEE = 20, BEAST_LOSE = 42;
function buildBeasts() {
  X.beasts = []; X.hunt = null;
  const R = rope(), ps = ropeQuery(X.pos.x, X.pos.z).s;
  for (let ch = 0; ch < NL; ch++) {
    if (!chapterUnlocked(ch) || S.journey[ch].key) continue;
    const B = R.landBeads(ch), m = MYTHS[ch], s0 = B[1].s, s1 = B[4].s;
    const rig = m.orochi ? new RoamOrochi() : m.dragon ? new RoamDragon() : new Samurai(m.look, m.weapon === 'club' ? CLUB_DEF : swordDef(m.weapon || m.sword), { boss: true, noSaya: true });
    if (!m.dragon) { rig.root.scale.setScalar(m.scale || 1); rig.root.rotation.order = 'YXZ'; rig.setHold('shoulder', 6); rig.carry = true; }
    X.poi.add(rig.root);
    const lab = labelSprite(m.name, '#ff8a6a', m.title); X.poi.add(lab);
    const s = Math.abs(ps - s0) > Math.abs(ps - s1) ? s0 : s1;
    const p = R.pts[clamp(Math.round(s / R.ds), 0, R.N)];
    const b = { ch, m, rig, lab, s0, s1, s, dir: s === s0 ? 1 : -1, state: 'roam', t: 0, pos: new V3(p.x, ropeWalkHeight(p.x, p.z), p.z), face: 0, phase: 0, speed: 0, fly: m.dragon && !m.orochi ? 3.2 : 0, size: m.orochi ? 4.6 : m.dragon ? 3.6 : 1.4 + (m.scale || 1) * .9 };
    if (m.dragon && !m.orochi) rig.place(b.pos.clone().add(new V3(0, 5, 0)), new V3(p.tx, 0, p.tz).multiplyScalar(b.dir));
    X.beasts.push(b);
  }
  X.rings = [];
}
const BEAST_DUST = ['#e8d2a8', '#ffffff', '#6a5a7a', '#5a3a2a', '#c8d8b0', '#c8c0a8', '#d8d4c8'];
function beastRing(p, col, size) {
  const m = new THREE.Mesh(new THREE.RingGeometry(.7, 1, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.copy(p); m.position.y += .15; X.poi.add(m);
  X.rings.push({ m, t: 0, size: size || 8 });
}
function beastRoar(b) {
  b.state = 'notice'; b.t = 0; X.hunt = b;
  const top = b.m.dragon ? b.rig.headPos().clone() : b.pos.clone().add(new V3(0, 2.3 * (b.m.scale || 1), 0));
  if (b.m.dragon) { b.rig.roar = 1.3; if (b.rig.isOrochi) b.roarT = 1.1; }
  else { b.rig.carry = false; b.rig.setHold('windH', 5); b.rig.leanAdd = -.35; b.roarT = 1.1; }
  beastRing(b.pos, b.m.look.aura || '#ff8a3a', 14); setTimeout(() => X && X.beasts && beastRing(b.pos, '#ffffff', 9), 200);
  FX.glowBurst(top, b.m.look.aura || '#ff8a3a', 3, .6); FX.puff(b.pos.clone().add(new V3(0, .3, 0)), 22, BEAST_DUST[b.ch], 1.6);
  sfx.taiko(1.4); setTimeout(() => sfx.taiko(1.1), 220); shake(.12); OV.vig = .7; OV.vigCol = '255,60,30';
  banner(`${b.m.name} has seen you!`, 'Run, or stand and fight!');
}
function beastCatch(b) {
  X.hunt = null; b.state = 'caught';
  EXPLORE_RETURN = { x: X.pos.x, z: X.pos.z, yaw: X.face };
  S.roam = { x: X.pos.x, z: X.pos.z, yaw: X.face }; save();
  sfx.taiko(1.5); shake(.2);
  startBeast(b.ch, 'explore');
}
/* Ryujin swims through the sky above the road, then dives at you */
function dragonRoam(b, dt, dP, napping) {
  const R = rope(), ptAt = s => R.pts[clamp(Math.round(s / R.ds), 0, R.N)];
  const D = b.rig, hp = D.headPos();
  const vis = dP < 160; D.root.visible = vis; b.lab.visible = vis && b.state === 'roam';
  if (!vis) return;
  let target, spd = 7;
  if (X.enc) target = hp.clone();
  else if (b.state === 'roam') {
    if (b.s >= b.s1 - .5) b.dir = -1; else if (b.s <= b.s0 + .5) b.dir = 1;
    b.s += b.dir * 3.2 * dt;
    const p = ptAt(b.s); b.pos.set(p.x, ropeWalkHeight(p.x, p.z), p.z);
    const a = b.t * .55;
    target = b.pos.clone().add(new V3(Math.cos(a) * 9, 7 + Math.sin(b.t * 1.1) * 2, Math.sin(a) * 9));
    if (!napping && isArmed() && X.land === b.ch && dP < BEAST_SEE + 6 && !X.hunt) beastRoar(b);
  } else if (b.state === 'notice') {
    target = b.pos.clone().add(new V3(0, 10, 0)); spd = 5;
    if (Math.random() < dt * 40) FX.add.emit(hp.x, hp.y, hp.z, rnd(-2, 2), rnd(1, 3), rnd(-2, 2), rnd(.6, 1), .25, 0, pick(['#ffb03a', '#ff6a1a', '#ffe08c']), 1, -.3, .4);
    if (b.t > 1.3) { b.state = 'chase'; b.t = 0; }
  } else if (b.state === 'chase') {
    // the ground anchor chases along the road; the head dives at the player
    const ps = X.s; let tg;
    if (Math.abs(ps - b.s) > 6) { const p = ptAt(b.s + Math.sign(ps - b.s) * 8); tg = { x: p.x, z: p.z }; } else tg = { x: X.pos.x, z: X.pos.z };
    const dx = tg.x - b.pos.x, dz = tg.z - b.pos.z, l = Math.hypot(dx, dz);
    if (l > .05) { b.pos.x += dx / l * BEAST_RUN * dt; b.pos.z += dz / l * BEAST_RUN * dt; }
    b.s = ropeQuery(b.pos.x, b.pos.z).s;
    const near = Math.hypot(X.pos.x - b.pos.x, X.pos.z - b.pos.z);
    target = new V3(X.pos.x, X.pos.y + 1.4 + Math.min(6, near * .25), X.pos.z); spd = 11;
    const hd = Math.hypot(hp.x - X.pos.x, hp.z - X.pos.z);
    if (hd < 2.6 || near < 2) { beastCatch(b); return; }
    if (dP > BEAST_LOSE + 8 || X.land !== b.ch || !isArmed()) { b.state = 'roam'; X.hunt = null; banner('You escaped!', `${b.m.name} lost your trail`); }
  }
  D.step(dt, target, spd);
  b.lab.position.copy(hp).add(new V3(0, 3, 0));
  if (Math.random() < dt * 16) { const k = Math.random(); FX.add.emit(hp.x + rnd(-.5, .5), hp.y + rnd(-.3, .5), hp.z + rnd(-.5, .5), 0, rnd(.2, .6), 0, rnd(.6, 1), .1, 0, k < .5 ? '#ffb03a' : '#ff6a1a', 1, -.2, .3); }
  if (b.state === 'chase' && Math.random() < dt * 25) FX.add.emit(hp.x, hp.y - .2, hp.z, rnd(-1, 1), rnd(-.5, .5), rnd(-1, 1), .5, .18, 0, '#ff7a1a', 1, 0, .3);
}
function beastsUpdate(dt) {
  if (!X.beasts || !X.beasts.length) return;
  X.rings = (X.rings || []).filter(r => { r.t += dt; const k = r.t / .9; r.m.scale.setScalar(1 + k * r.size); r.m.material.opacity = .8 * (1 - k); if (k >= 1) { X.poi.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); return false; } return true; });
  const R = rope(), ptAt = s => R.pts[clamp(Math.round(s / R.ds), 0, R.N)];
  for (const b of X.beasts) {
    const dP = Math.hypot(X.pos.x - b.pos.x, X.pos.z - b.pos.z);
    const vis = dP < 130; b.rig.root.visible = vis; b.lab.visible = vis && b.state !== 'chase';
    if (!vis || b.state === 'caught') continue;
    b.t += dt;
    const napping = Date.now() - (S.beastNap[b.ch] || 0) < BEAST_NAP;
    let tgt = null, spd = 0;
    if (b.m.dragon && !b.m.orochi) { dragonRoam(b, dt, dP, napping); continue; }
    if (X.enc) { /* everything holds still while a ghost appears */ }
    else if (b.state === 'roam') {
      if (b.s >= b.s1 - .5) b.dir = -1; else if (b.s <= b.s0 + .5) b.dir = 1;
      const p = ptAt(b.s + b.dir * 6), lat = Math.sin(b.t * .35) * 1.4;
      tgt = { x: p.x + p.nx * lat, z: p.z + p.nz * lat }; spd = BEAST_WALK;
      if (!napping && isArmed() && X.land === b.ch && dP < BEAST_SEE && !X.hunt) beastRoar(b);
    } else if (b.state === 'notice') {
      tgt = null; if (b.t > 1.2) { b.state = 'chase'; b.t = 0; if (b.rig.setHold) b.rig.setHold('windR', 6); }
    } else if (b.state === 'chase') {
      const ps = X.s;
      if (Math.abs(ps - b.s) > 6) { const p = ptAt(b.s + Math.sign(ps - b.s) * 8); tgt = { x: p.x, z: p.z }; } else tgt = { x: X.pos.x, z: X.pos.z };
      spd = BEAST_RUN;
      if (dP < b.size) { beastCatch(b); return; }
      if (dP > BEAST_LOSE || X.land !== b.ch || !isArmed()) { b.state = 'roam'; X.hunt = null; if (b.rig.setHold) { b.rig.carry = true; b.rig.setHold('shoulder', 5); } banner('You escaped!', `${b.m.name} lost your trail`); }
    }
    // move and stay on the road
    const want = b.state === 'notice' || b.state === 'chase' ? Math.atan2(X.pos.x - b.pos.x, X.pos.z - b.pos.z) : null;
    if (tgt) {
      const dx = tgt.x - b.pos.x, dz = tgt.z - b.pos.z, l = Math.hypot(dx, dz);
      if (l > .05) { b.pos.x += dx / l * spd * dt; b.pos.z += dz / l * spd * dt; }
      const q = ropeQuery(b.pos.x, b.pos.z, X.limit);
      if (q.sh && q.d > -.4) { const ex = b.pos.x - q.cx, ez = b.pos.z - q.cz, el = Math.hypot(ex, ez) || 1, rr = q.rad - .4; b.pos.x = q.cx + ex / el * rr; b.pos.z = q.cz + ez / el * rr; }
      b.s = ropeQuery(b.pos.x, b.pos.z).s;
      let d = (want != null ? want : Math.atan2(dx, dz)) - b.face; d = Math.atan2(Math.sin(d), Math.cos(d)); b.face += d * damp(5, dt);
    } else if (want != null) { let d = want - b.face; d = Math.atan2(Math.sin(d), Math.cos(d)); b.face += d * damp(6, dt); }
    b.speed = lerp(b.speed, tgt ? spd / BEAST_RUN : 0, damp(5, dt));
    const flyTo = b.m.dragon ? (b.state === 'chase' ? .6 : 3.2) : 0; b.fly = lerp(b.fly, flyTo, damp(1.5, dt));
    b.rig.root.position.set(b.pos.x, ropeWalkHeight(b.pos.x, b.pos.z) + b.fly, b.pos.z);
    b.rig.root.rotation.y = b.face;
    if (b.rig.isOrochi) {
      b.rig.step(dt, b.speed * 2);
      if (b.speed > .1 && Math.random() < dt * 3) { FX.puff(b.pos.clone().add(new V3(rnd(-2, 2), .2, rnd(-2, 2))), 5, BEAST_DUST[b.ch] || '#c8c4b8', 1.2); if (dP < 30) shake(Math.max(0, .05 - dP * .0016)); }
    } else {
      // a heavy, swaying stride: big steps, a dip on every footfall, dust and tremors
      const P = b.rig, sc = b.m.scale || 1, mv = Math.min(1, b.speed * 3), run = b.state === 'chase';
      const prevPh = b.phase;
      b.phase += dt * (2.2 + b.speed * 6) * mv / Math.sqrt(sc) * 1.6;
      const st = (run ? .42 : .3) * mv, lift = (run ? .2 : .13) * mv;
      P.feet.L.set(.18, .035 + Math.max(0, Math.sin(b.phase)) * lift, Math.sin(b.phase) * st - .02);
      P.feet.R.set(-.18, .035 + Math.max(0, Math.sin(b.phase + Math.PI)) * lift, Math.sin(b.phase + Math.PI) * st + .02);
      P.crouch = -Math.abs(Math.cos(b.phase)) * .07 * mv - (run ? .05 : 0);
      P.sideLean = Math.sin(b.phase) * .07 * mv;
      P.twistAdd = Math.sin(b.phase) * .1 * mv;
      P.armSwing = -Math.sin(b.phase) * mv;
      if (b.roarT > 0) { b.roarT -= dt; P.leanAdd = -.35; } else P.leanAdd = lerp(P.leanAdd, run ? .3 : .08 * mv, damp(4, dt));
      if (P.wings) P.wingFlare = run ? .6 + Math.sin(b.t * 9) * .4 : Math.sin(b.t * 2) * .15;
      // footfalls
      const hit = Math.floor(prevPh / Math.PI) !== Math.floor(b.phase / Math.PI);
      if (hit && mv > .2) {
        const side = Math.floor(b.phase / Math.PI) % 2 ? 1 : -1, fw = new V3(Math.sin(b.face), 0, Math.cos(b.face)), rt = new V3(fw.z, 0, -fw.x);
        const fp = b.rig.root.position.clone().addScaledVector(rt, side * .2 * sc).addScaledVector(fw, .15 * sc);
        FX.puff(fp.add(new V3(0, .1, 0)), run ? 7 : 4, BEAST_DUST[b.ch], .5 * sc);
        if (sc > 1.4) { shake(Math.max(0, (run ? .07 : .04) - dP * .0018)); if (dP < 30) sfx.taiko(.35); }
      }
      // breath: frosty for the giant, hot snorts for the ogre
      if (Math.random() < dt * (run ? 3 : 1.2)) {
        const hp = P.head.getWorldPosition(new V3()), fw = new V3(Math.sin(b.face), 0, Math.cos(b.face));
        hp.addScaledVector(fw, .25 * sc);
        if (b.m.freeze) FX.puff(hp, 3, '#e8fbff', .35 * sc); else if (b.ch === 0) FX.puff(hp, 2, '#ffd8c8', .25 * sc);
        else if (b.m.teleport) FX.petals(hp, 2, '#15151c', 1.2);
      }
    }
    if (b.rig.update) b.rig.update(dt);
    const top = b.m.orochi ? 8.5 : b.m.dragon ? 5.5 : 2.4 * (b.m.scale || 1);
    b.lab.position.set(b.pos.x, b.rig.root.position.y + top, b.pos.z);
    if (b.m.look.aura && Math.random() < dt * 12) FX.add.emit(b.pos.x + rnd(-.6, .6), b.rig.root.position.y + rnd(.2, top - .4), b.pos.z + rnd(-.6, .6), 0, rnd(.3, .9), 0, rnd(.7, 1.2), .08, 0, b.m.look.aura, .8, -.2, .3);
  }
}
function addThief(c) {
  const w = S.swords.find(v => v.u === c.u); if (!w) return;
  const q = ropeQuery(c.x, c.z, X.limit);
  if (!q.sh || q.d > -.3) { if (q.sh) { const dx = c.x - q.cx, dz = c.z - q.cz, l = Math.hypot(dx, dz) || 1; c.x = q.cx + dx / l * (q.rad - 1); c.z = q.cz + dz / l * (q.rad - 1); } else { const e = landEntry(c.ch); c.x = e.x; c.z = e.z; } save(); }
  const y = ropeWalkHeight(c.x, c.z);
  const icon = new THREE.Group(); icon.position.set(c.x, y + 2.2, c.z);
  const sw = buildSword(swordDef(w.id)); sw.rotation.z = Math.PI; sw.position.y = .4; icon.add(sw); icon.add(halo('#ff5a5a', 2.6, .7));
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.2, .45, 22, 10, 1, true), glowify(new THREE.MeshBasicMaterial({ color: '#ff5a5a', transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  beam.position.set(c.x, y + 11, c.z);
  const lab = labelSprite('Ghost Thief', '#ffb4a8', 'Reclaim your ' + swordDef(w.id).name); lab.position.set(c.x, y + 4.4, c.z);
  X.poi.add(icon, beam, lab);
  X.pois.push({ kind: 'thief', entry: c, x: c.x, z: c.z, r: 0, icon, beam, lab, baseY: y + 2.2 });
}
function refreshShrine(p) { p.slots.forEach(([m, h], k) => { const on = !!S.journey[p.ch].orbs[k]; m.visible = on; h.visible = on; }); }
function collectNode(p) {
  const M = MATERIALS[p.n.mat], n = p.n.rare ? 1 + (Math.random() < .3) : M.r === 'common' ? 2 : 1 + (Math.random() < .5);
  addMat(p.n.mat, n); S.nodeT[p.key] = Date.now(); save();
  FX.sparks(p.g.position.clone().add(new V3(0, .4, 0)), M.c, 26, 3.5); sfx.coin();
  X.poi.remove(p.g); X.pois = X.pois.filter(q => q !== p);
  const s = toScreen(p.g.position.clone().add(new V3(0, 1, 0)));
  ovPop(s.x, s.y, `+${n} ${M.n}`, { size: 26, color: M.c, stroke: '#1a0e00', vy: -50, life: 1.3 });
  if (!S.matTip) { S.matTip = true; save(); setTimeout(() => banner('Materials!', 'Use them at the Forge to power up your blades'), 400); }
}
function giveBokken() {
  const free = usableSwords().sort((a, b) => swordDmg(b) - swordDmg(a));
  let w = free[0], practice = false;
  if (!w) { w = addSword('bokken'); practice = true; }
  S.eq = w.u; save(); makePlayer(); sfx.up();
  banner(practice ? 'Practice sword!' : 'Blade ready!', practice ? 'Sensei hands you a bokken' : `Sensei hands you your ${swordDef(w.id).name}`); updateObjective();
}
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
  if ((p.kind === 'warrior' || p.kind === 'gate') && !isArmed()) { toast('You have no blade! Walk back to the Dojo at the start of the road for a practice sword.'); return; }
  const back = new V3(X.pos.x - p.x, 0, X.pos.z - p.z); if (back.lengthSq() < .01) back.set(0, 0, -1); back.normalize();
  EXPLORE_RETURN = { x: p.x + back.x * (p.r + .6), z: p.z + back.z * (p.r + .6), yaw: Math.atan2(-back.x, -back.z) };
  if (ropeQuery(EXPLORE_RETURN.x, EXPLORE_RETURN.z, X.limit).d > -.2) EXPLORE_RETURN = { x: X.pos.x, z: X.pos.z, yaw: X.face };
  S.roam = { x: X.pos.x, z: X.pos.z, yaw: X.face }; save();
  if (p.kind === 'warrior') { if (!trainMet(p.st)) { toast(`${p.st.name} bows: "Come back when your ${SKILLS[p.st.train.sk].n} reaches level ${p.st.train.l}." Train in the Dojo (you are level ${S.sk[p.st.train.sk].l}).`); return; } sfx.taiko(.8); startFight(p.idx, 'explore'); }
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
    if (!S.journey[p.ch].key) need.push(`win the Spirit Key from ${MYTHS[p.ch].name}`);
    if (warriorsBeaten(p.ch) < warriorCount(p.ch)) need.push(`defeat the warriors (${warriorsBeaten(p.ch)}/${warriorCount(p.ch)})`);
    if (!S.journey[p.ch].puzzle) need.push('awaken the shrine');
    toast('The gate is sealed. First ' + need.join(' and ') + '.');
  } else if (p.kind === 'dojo') {
    if (!isArmed()) giveBokken(); else endExplore();
  } else if (p.kind === 'tgate') {
    toast('Beat the practice ghost first. Walk into the training ring!');
  } else if (p.kind === 'summit') {
    sfx.win(); banner('Katana Legend!', 'Every land is yours');
    for (let i = 0; i < 5; i++) setTimeout(() => X && FX.sparks(new V3(p.x + rnd(-3, 3), 3 + rnd(0, 3), p.z + rnd(-3, 3)), pick(['#ffe08c', '#ff8fc0', '#7fe8ff']), 50, 6), i * 250);
  }
}
function actLabel(p) {
  if (p.kind === 'warrior' && !p.done && !trainMet(p.st)) return `🔒 Train ${trainNeed(p.st)} first`;
  if (p.kind === 'warrior') return !isArmed() ? 'No blade! Go to the Dojo' : (p.done ? `Rematch ${p.st.name}` : `⚔ Duel ${p.st.name}`) + (bladeAtRisk(p.st) ? ' ⚠ blade may snap' : '');
  if (p.kind === 'shrine') return S.journey[p.ch].puzzle ? 'Shrine is awake ✓' : orbsFound(p.ch) < 3 ? `Shrine needs orbs (${orbsFound(p.ch)}/3)` : 'Solve the shrine puzzle';
  if (p.kind === 'gate') return !isArmed() ? 'No blade! Go to the Dojo' : S.journey[p.ch].myth ? `Rematch ${MYTHS[p.ch].name}` : gateOpen(p.ch) ? `Face the Spirit Warrior!${bladeAtRisk(SPIRITS[p.ch]) ? ' ⚠ blade may snap' : ''}` : S.journey[p.ch].key ? 'Spirit gate (sealed)' : 'Spirit gate (needs the Spirit Key)';
  if (p.kind === 'summit') return 'Ring the summit bell';
  if (p.kind === 'dojo') return isArmed() ? 'Enter the Dojo' : 'Take a practice sword';
  if (p.kind === 'tgate') return 'Training gate (beat the ghost)';
  return '';
}

/* ---------- objective guide ---------- */
function objectiveTarget() {
  if (!X || X.land < 0) return null;
  const R = rope(), ch = X.land, j = S.journey[ch];
  const near = list => list.reduce((b, p) => (!b || Math.hypot(p.x - X.pos.x, p.z - X.pos.z) < Math.hypot(b.x - X.pos.x, b.z - X.pos.z)) ? p : b, null);
  if (!isArmed()) return X.pois.find(p => p.kind === 'dojo') || null;
  if (!S.tutDone) return { x: R.tutGhost.x, z: R.tutGhost.z };
  const thieves = X.pois.filter(p => p.kind === 'thief');
  if (thieves.length) return near(thieves);
  if (orbsFound(ch) < 3) return near(X.pois.filter(p => p.kind === 'orb' && p.ch === ch));
  if (!j.puzzle) return X.pois.find(p => p.kind === 'shrine' && p.ch === ch);
  if (warriorsBeaten(ch) < warriorCount(ch)) return near(X.pois.filter(p => p.kind === 'warrior' && p.ch === ch && !p.done));
  if (!j.key) { const b = (X.beasts || []).find(v => v.ch === ch); return b ? { x: b.pos.x, z: b.pos.z } : null; }
  if (!j.myth) return X.pois.find(p => p.kind === 'gate' && p.ch === ch);
  if (ch < 3) { const b = R.landBeads(ch + 1)[0]; return { x: b.x, z: b.z }; }
  return X.pois.find(p => p.kind === 'summit') || null;
}

/* ---------- ghost samurai ---------- */
function ghostCheck() {
  if (!X || X.enc || !isArmed() || X.clock < X.encCool || X.hunt) return;
  if (!S.tutDone) { const T = rope().tutGhost; if (Math.hypot(T.x - X.pos.x, T.z - X.pos.z) < 6) startEncounter({ spot: T, tut: true }); return; }
  for (const p of X.pois) if (p.kind === 'thief' && Math.hypot(p.x - X.pos.x, p.z - X.pos.z) < 7.5) { startEncounter({ thief: p }); return; }
  for (const gsp of rope().ghosts) {
    if (X.ghostDone.has(gsp) || !chapterUnlocked(gsp.ch)) continue;
    if (gsp.type === 'geisha' && !isArmed()) continue;
    if ((X.beasts || []).some(b => b.rig.root.visible && Math.hypot(b.pos.x - gsp.x, b.pos.z - gsp.z) < 35)) continue;
    if (Date.now() - ((S.ghostClear || {})[gsp.ch + '-' + gsp.k] || 0) < 8 * 60e3) continue;
    if (Math.hypot(gsp.x - X.pos.x, gsp.z - X.pos.z) < 6.5) { X.ghostDone.add(gsp); startEncounter({ spot: gsp }); return; }
  }
}
function startEncounter(o) {
  const ch = o.thief ? o.thief.entry.ch : o.spot.ch;
  const tw = o.thief ? S.swords.find(v => v.u === o.thief.entry.u) : null;
  const geisha = !!(o.spot && o.spot.type === 'geisha');
  const def = tw ? swordDef(tw.id) : geisha ? GEISHA_FAN : GHOST_BLADE;
  const ghost = geisha ? new Samurai(GEISHA_LOOK, def, { ghost: true, noSaya: true, ghostCol: '#ff3fa8', ghostLine: '#ffc4ec' })
    : new Samurai(GHOST_LOOK, def, { ghost: true, noSaya: true });
  ghost.root.rotation.order = 'YXZ';
  const f = new V3(Math.sin(X.face), 0, Math.cos(X.face));
  let gx = X.pos.x + f.x * 5.4, gz = X.pos.z + f.z * 5.4;
  if (ropeQuery(gx, gz, X.limit).d > -.5) { const pt = sampleAt(X.pos.x, X.pos.z), dir = (pt.tx * f.x + pt.tz * f.z) >= 0 ? 1 : -1; gx = X.pos.x + pt.tx * dir * 5.4; gz = X.pos.z + pt.tz * dir * 5.4; }
  const gy = ropeWalkHeight(gx, gz);
  ghost.root.position.set(gx, gy + .3, gz); ghost.setHold('guard', 8); ghost.mat.opacity = 0;
  X.poi.add(ghost.root, ghost.trail.mesh);
  const win = o.tut ? 3.6 : ([1.6, 1.35, 1.15, .95][ch] + stats().drawBonus) * (o.thief ? .85 : 1);
  X.enc = { ghost, ch, phase: 'appear', t: 0, t0: 0, win: geisha ? win * 1.1 : win, o, def, sx: gx, sz: gz, gy, drawnAt: -1, op: 0, iai: false, geisha, col: geisha ? '#ffb0e0' : '#9fe8ff' };
  X.joy = null; X.look = null; $('#actBtn').hidden = true; X.near = null;
  if (o.thief) { o.thief.icon.visible = false; o.thief.beam.visible = false; o.thief.lab.visible = false; }
  banner(o.tut ? 'PRACTICE GHOST' : o.thief ? 'GHOST THIEF!' : geisha ? 'GEISHA GHOST!' : 'GHOST SAMURAI!', o.tut ? 'Swipe out of the gold hilt to draw!' : o.thief ? 'It holds your ' + def.name + '!' : geisha ? 'Strike before her fan sends you back!' : 'Draw and strike!');
  sfx.ghost();
  FX.puff(new V3(gx, gy + 1, gz), 12, geisha ? '#ffc4ec' : '#bfe8ff', .7);
  if (geisha) FX.petals(new V3(gx, gy + 1.4, gz), 24, '#ffb0e0', 2.5);
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
  const gc = e.geisha ? ['#ffd6f0', '#ff7fd0', '#ffb0e0'] : ['#bff4ff', '#7fe8ff', '#bfe8ff'];
  FX.sparks(gp, gc[0], 70, 6, .09); FX.glowBurst(gp, gc[1], 2.6, .5); FX.petals(gp, 30, gc[2], 3.5); FX.puff(gp, 14, '#e8f8ff', .9);
  sfx.banish(); hitstop(120); slowmo(.35, .5); OV.flash = .4; OV.flashCol = '200,240,255';
  const s = toScreen(gp); ovPop(s.x, s.y - 30, e.iai ? 'IAI!' : 'BANISHED!', { size: e.iai ? 52 : 40, color: '#2a1200', stroke: '#e8fbff', burst: e.iai ? '#ffe08c' : '#9fe8ff', rot: rnd(-.2, .2), life: 1.2, vy: -30 });
  const gold = (e.iai ? 30 : 15) + e.ch * 12;
  S.gold += gold; S.steel += 1 + (e.iai ? 1 : 0); S.ghosts = (S.ghosts || 0) + 1;
  const ups = addSkillXP('iai', e.o.thief ? 24 : e.iai ? 16 : 10); save();
  banner(e.iai ? 'IAI STRIKE!' : 'Ghost banished!', `+${gold} gold${ups ? ' · Iai level up!' : ''}`);
  if (ups) sfx.up();
  if (e.o.tut) {
    S.tutDone = true; addMat('ironsand', 2); save(); X.limit = limitS(); storyArrive(0);
    const tg = X.pois.find(p => p.kind === 'tgate'); if (tg) { X.poi.remove(tg.grp); X.poi.remove(tg.lab); X.pois = X.pois.filter(p => p !== tg); }
    setTimeout(() => { if (X) banner('Training complete!', 'The road to Bamboo Village is open'); }, 1300);
    e.ghost.root.visible = false; return;
  }
  if (e.o.spot) { S.ghostClear = S.ghostClear || {}; S.ghostClear[e.o.spot.ch + '-' + e.o.spot.k] = Date.now(); save(); }
  if (e.o.spot) { const got = rollDrops(e.ch, 'ghost'); setTimeout(() => { if (!X) return; const t = Object.entries(got).map(([id, n]) => `+${n} ${MATERIALS[id].n}`).join(' · '); ovPop(VW / 2, VH * .36, t, { size: 24, color: '#ffe08c', vy: -30, life: 1.6 }); }, 700); save(); }
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
  if (e.o.tut) { banner('The ghost got you!', 'Out on the road it would steal your sword. Try again!'); e.tutLost = true; return; }
  if (e.o.spot) { S.ghostClear = S.ghostClear || {}; S.ghostClear[e.o.spot.ch + '-' + e.o.spot.k] = Date.now(); }
  if (e.geisha) { geishaWhisk(e); return; }
  // a ghost can hold only one of your blades at a time, never takes a practice bokken,
  // and a thief that already has your blade just knocks you back
  const eqW = S.swords.find(v => v.u === S.eq);
  if (e.o.thief || S.captured.length > 0 || !eqW || eqW.id === 'bokken') {
    e.knock = true;
    banner(e.o.thief ? 'The thief got away!' : 'Knocked back!', e.o.thief ? 'It still holds your blade. Draw faster and try again!' : 'The ghost laughs and fades away');
    setTimeout(() => sfx.laugh(), 400);
    X.pos.addScaledVector(new V3(Math.sin(X.face), 0, Math.cos(X.face)), -3);
    if (!X.P.sheathed) X.P.sheatheSword({ onEnter: () => sfx.sheathe() });
    return;
  }
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
/* the geisha's fan whisks you back to a land you already finished (or the dojo from the first land) */
function geishaWhisk(e) {
  const back = []; for (let c = 0; c < e.ch; c++) back.push(c);
  const dest = back.length ? pick(back) : 'dojo';
  e.whisk = true;
  X.P.sheatheSword && !X.P.sheathed && X.P.sheatheSword({});
  OV.vigCol = '255,120,210';
  const pp = X.P.root.position.clone().add(new V3(0, 1, 0));
  FX.petals(pp, 60, '#ffb0e0', 5); FX.glowBurst(pp, '#ff7fd0', 3, .8);
  setTimeout(() => sfx.laugh(), 300);
  banner('WHISKED AWAY!', dest === 'dojo' ? 'Her fan sends you back to the Dojo' : `Her fan sends you back to ${CHAPTERS[dest].name}`);
  setTimeout(() => {
    if (!X || MODE !== ExploreMode) return;
    S.ghostClear = {}; // every ghost on the road wakes up again
    const sp = dest === 'dojo' ? dojoSpawn() : landEntry(dest);
    S.roam = { x: sp.x, z: sp.z, yaw: sp.yaw }; save();
    X.enc = null;
    startExplore(dest === 'dojo' ? 'dojo' : dest);
    setTimeout(() => { if (X && MODE === ExploreMode) banner('The ghosts have risen!', 'Fight your way back up the road'); }, 1700);
  }, 1500);
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
  if (Math.random() < dt * 30) { const p = G.root.position; FX.add.emit(p.x + rnd(-.4, .4), p.y + rnd(0, 1.8), p.z + rnd(-.4, .4), 0, rnd(.3, .8), 0, rnd(.6, 1.1), .08, 0, e.col, .8, -.2, .3); }
  if (e.geisha && Math.random() < dt * 6) { const p = G.root.position; FX.petals(new V3(p.x, p.y + 1.6, p.z), 1, '#ffb0e0', 1.2); }
  if (e.phase === 'appear' && e.t > .75) { e.phase = 'draw'; e.t0 = e.t; G.setHold('windH', 3 / e.win); $('#hiltBtn').hidden = false; }
  if (e.phase === 'draw' || e.phase === 'drawn') {
    const k = clamp((e.t - e.t0) / e.win, 0, 1), dir = toP.clone().normalize(), endD = 1.5;
    const sx = e.sx, sz = e.sz, tx = X.pos.x - dir.x * endD, tz = X.pos.z - dir.z * endD;
    G.root.position.set(lerp(sx, tx, easeIn(k)), e.gy + .3 + Math.sin(e.t * 3) * .08, lerp(sz, tz, easeIn(k)));
    if (e.geisha) { // she dances side to side as she glides in, twirling her fan
      const sw = Math.sin(e.t * 5.2) * 1.1 * (1 - k * .6);
      G.root.position.x += -dir.z * sw; G.root.position.z += dir.x * sw;
      G.root.rotation.y += Math.sin(e.t * 2.6) * .5;
    }
    if (k >= 1) ghostStrike();
  }
  if (e.phase === 'lost') {
    const u = e.t - e.t1;
    if (u > .8) G.root.position.y += dt * 1.2;
    if (u > (e.tutLost ? 1.6 : 2.4) && !e.whisk) endEncounter();
  }
  if (e.phase === 'won' && e.t - e.t1 > 1.1) endEncounter();
  G.update(dt);
}
function endEncounter() {
  const e = X.enc; if (!e) return;
  X.poi.remove(e.ghost.root); X.poi.remove(e.ghost.trail.mesh); e.ghost.dispose();
  if (e.newThief) { e.newThief.icon.visible = true; e.newThief.beam.visible = true; e.newThief.lab.visible = true; }
  if (e.o.thief && X.pois.includes(e.o.thief)) { e.o.thief.icon.visible = true; e.o.thief.beam.visible = true; e.o.thief.lab.visible = true; }
  X.enc = null; X.encCool = X.clock + (e.tutLost ? 2.5 : 6); $('#hiltBtn').hidden = true;
  if (e.tutLost && !X.P.sheathed) X.P.sheatheSword({ onEnter: () => sfx.sheathe() });
  if (e.phase === 'won' && !e.o.thief && isArmed()) X.P.sheatheSword({ chiburi: true, onEnter: () => sfx.sheathe() });
  if (e.phase === 'lost' && !e.geisha && !e.knock) { X.P.sword.visible = false; }
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
    if (x.paused) { x.P.update(dt); return; } // a story scroll is open
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
    const G0 = blockGate();
    if (G0) { const G = G0, dx = x.pos.x - G.x, dz = x.pos.z - G.z, along = dx * G.tx + dz * G.tz; if (along > -.6 && Math.hypot(dx, dz) < 14) { x.pos.x -= G.tx * (along + .6); x.pos.z -= G.tz * (along + .6); } }
    for (const o of x.W.obs) {
      const dx = x.pos.x - o.x, dz = x.pos.z - o.z, rr = o.r + .38, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); x.pos.x = o.x + dx / d * rr; x.pos.z = o.z + dz / d * rr; }
    }
    x.lastGood.copy(x.pos);
    x.pos.y = ropeWalkHeight(x.pos.x, x.pos.z);
    // where on the road are we?
    const sq = ropeQuery(x.pos.x, x.pos.z); x.s = sq.s;
    const land = landOf(x.s);
    if (land !== x.land) { const first = x.land >= 0; x.land = land; updateObjective(); if (first) banner(CHAPTERS[land].name, CHAPTERS[land].jp); storyArrive(land); }
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
    for (const p of x.pois) if (p.twin && Math.hypot(x.pos.x - p.x, x.pos.z - p.z) < 60) p.twin.update(dt);
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
    beastsUpdate(dt);
    if (MODE !== ExploreMode || !X) return;
    // labels fade as you walk up to them so they never fill the screen
    if (!x.labels || (x.labelT = (x.labelT || 0) - 1) <= 0) { x.labels = []; x.poi.traverse(o => { if (o.isSprite && o.userData.label) x.labels.push(o); }); x.labelT = 30; }
    for (const l of x.labels) { const d = CAM.position.distanceTo(l.getWorldPosition(_lp)); l.material.opacity = smooth(3.5, 8, d) * (1 - smooth(60, 80, d)); }
    if (x.enc) encounterUpdate(dt);
    else {
      ghostCheck();
      let near = null, nd = 1e9;
      for (const p of x.pois.slice()) {
        if (p.kind === 'thief') continue;
        const d = Math.hypot(x.pos.x - p.x, x.pos.z - p.z);
        if (p.kind === 'orb') { if (d < p.r) collectOrb(p); continue; }
        if (p.kind === 'node') { if (d < p.r) collectNode(p); continue; }
        if (d < p.r && d < nd) { near = p; nd = d; }
      }
      if (near !== x.near) {
        x.near = near;
        const b = $('#actBtn');
        if (near) { b.hidden = false; b.textContent = actLabel(near); b.classList.toggle('locked', (near.kind === 'warrior' && !near.done && !trainMet(near.st)) || !isArmed() && near.kind !== 'shrine' || (near.kind === 'gate' && !gateOpen(near.ch) && !S.journey[near.ch].myth) || (near.kind === 'shrine' && (orbsFound(near.ch) < 3 || S.journey[near.ch].puzzle))); }
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
    if (x.enc) hint(x.enc.phase === 'draw' ? (x.enc.o.tut ? 'Touch the gold DRAW button and swipe outward to pull your sword!' : 'Swipe from the gold hilt to DRAW, then slash the ghost!') : x.enc.phase === 'drawn' ? 'Now swipe across the ghost to slash it!' : '');
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
  const BG = blockGate(); if (BG) { const G = BG, [mx, my] = map(G.x, G.z); c.strokeStyle = '#b48aff'; c.lineWidth = 3; c.beginPath(); c.arc(mx, my, 5, 0, Math.PI * 2); c.stroke(); }
  for (const p of X.pois) {
    const [mx, my] = map(p.x, p.z);
    if (p.kind === 'orb') { c.fillStyle = ORB_COLS[p.ch]; c.beginPath(); c.arc(mx, my, 4 + Math.sin(X.clock * 5) * 1.2, 0, Math.PI * 2); c.fill(); }
    else if (p.kind === 'warrior') { c.fillStyle = p.done ? '#7a8a7a' : p.st.boss ? '#ff6a4a' : '#ffd27a'; c.beginPath(); c.moveTo(mx, my - 6); c.lineTo(mx + 5, my + 4); c.lineTo(mx - 5, my + 4); c.closePath(); c.fill(); }
    else if (p.kind === 'shrine') { c.fillStyle = S.journey[p.ch].puzzle ? '#ffe08c' : '#e8dcc0'; c.fillRect(mx - 5, my - 5, 10, 10); }
    else if (p.kind === 'gate') { c.strokeStyle = gateOpen(p.ch) ? '#d9b8ff' : '#7a6a8a'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 6, my + 5); c.lineTo(mx - 6, my - 5); c.lineTo(mx + 6, my - 5); c.lineTo(mx + 6, my + 5); c.stroke(); }
    else if (p.kind === 'node') { c.fillStyle = MATERIALS[p.n.mat].c; c.save(); c.translate(mx, my); c.rotate(Math.PI / 4); c.fillRect(-2.5, -2.5, 5, 5); c.restore(); }
    else if (p.kind === 'dojo') { c.fillStyle = '#ffe08c'; c.font = "900 12px serif"; c.textAlign = 'center'; c.fillText('道', mx, my + 4); }
    else if (p.kind === 'thief') { c.strokeStyle = '#ff5a5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 5, my + 5); c.lineTo(mx + 5, my - 5); c.moveTo(mx - 5, my - 5); c.lineTo(mx + 5, my + 5); c.stroke(); }
  }
  for (const b of X.beasts || []) {
    if (!b.rig.root.visible) continue;
    const [mx, my] = map(b.pos.x, b.pos.z), hunt = b.state === 'chase' || b.state === 'notice';
    c.fillStyle = hunt ? '#ff3b2a' : '#ff8a6a'; c.beginPath(); c.arc(mx, my, (hunt ? 7 : 5.5) + (hunt ? Math.sin(X.clock * 10) * 1.5 : 0), 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = "900 10px sans-serif"; c.textAlign = 'center'; c.fillText(hunt ? '!' : '鬼', mx, my + 3.5);
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
  if (X.land >= 0) { c.save(); c.font = "900 11px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText(`Orbs ${orbsFound(X.land)}/3 · Warriors ${warriorsBeaten(X.land)}/${warriorCount(X.land)}`, cx, cy + Rm + 16); c.restore(); }
}
