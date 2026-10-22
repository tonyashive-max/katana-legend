'use strict';
/* ===== The smithy: bellows rhythm, hammering, quenching and sharpening ===== */

let FG = null;

function worldForge() {
  const W = newWorld('forge'), sc = W.scene;
  sc.background = new COL('#120a08'); sc.fog = new THREE.Fog('#120a08', 6, 22);
  W.sky = makeSky({ top: '#120a08', mid: '#120a08', bot: '#120a08', sunDir: new V3(0, -1, 0), sunCol: '#000000', sunDeg: 1, haze: 0 }); sc.add(W.sky);
  sc.add(new THREE.HemisphereLight('#ffb37a', '#1a0e0a', .5));
  const key = new THREE.DirectionalLight('#ffd0a0', .45); key.position.set(3, 6, -2); sc.add(key);
  W.fire = new THREE.PointLight('#ff7a2a', 2.2, 9, 1.6); W.fire.position.set(-1.6, 1.1, 1.5); W.fire.castShadow = false; sc.add(W.fire);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14, 14, 14).rotateX(-Math.PI / 2), toon({ color: '#3a2a20' })); floor.receiveShadow = true; sc.add(floor);
  const tiles = []; for (let x = -6; x <= 6; x += 1.2) for (let z = -6; z <= 6; z += 1.2) tiles.push({ p: [x + rnd(-.04, .04), .005, z], s: [1.12, .02, 1.12], c: shadeHex('#4a3828', rnd(-.15, .1)) });
  sc.add(inst(GEO.box(1, 1, 1), toon({}), tiles));
  const walls = merge([P(GEO.box(14, 5, .3), '#2a1a12', [0, 2.5, 4.5]), P(GEO.box(.3, 5, 14), '#2a1a12', [-5, 2.5, 0]), P(GEO.box(.3, 5, 14), '#2a1a12', [5, 2.5, 0]),
    ...[-4, -2, 0, 2, 4].map(x => P(GEO.box(.3, 5, .3), '#1a0e08', [x, 2.5, 4.3])), P(GEO.box(14, .35, .35), '#1a0e08', [0, 4, 4.3])]);
  sc.add(new THREE.Mesh(walls, toon({ vertexColors: true })));
  // furnace
  const furn = new THREE.Mesh(merge([
    P(GEO.box(1.8, 1.0, 1.5), '#6a5a52', [-1.6, .5, 1.6]), P(GEO.box(1.6, .2, 1.3), '#4a3a34', [-1.6, 1.05, 1.6]),
    P(GEO.cyl(.5, .7, 1.8, 8), '#5a4a44', [-1.6, 2.0, 2.0]), P(GEO.cyl(.35, .35, 2.6, 8), '#3a2a24', [-1.6, 3.6, 2.2]),
  ]), toon({ vertexColors: true, flatShading: true })); furn.castShadow = true; sc.add(furn);
  // a bed of glowing charcoal, each lump its own heat
  const lumps = []; const er = mulberry(5);
  for (let i = 0; i < 46; i++) { const hot = er(); lumps.push(P(GEO.ico(.07 + er() * .06, 0), hot > .82 ? '#ffd27a' : hot > .45 ? '#ff6a1a' : hot > .2 ? '#c0280a' : '#3a0c06', [(er() - .5) * 1.1, er() * .07, (er() - .5) * .8], [er() * 3, er() * 3, 0], [1, .7, 1])); }
  W.coals = new THREE.Mesh(merge(lumps), glowify(new THREE.MeshBasicMaterial({ vertexColors: true }))); W.coals.position.set(-1.6, 1.12, 1.5); sc.add(W.coals);
  // licking flame tongues
  W.tongues = [];
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: i % 2 ? '#ffb03a' : '#ff5a1a', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    t.userData = { x: -1.6 + (i / 5 - .5) * .9, z: 1.5 + (i % 3 - 1) * .18, ph: i * 1.9, sp: 5 + i * .7 }; sc.add(t); W.tongues.push(t);
  }
  // the sacred rope over the hearth, with zigzag paper streamers
  const ropeC = new THREE.CatmullRomCurve3([new V3(-2.9, 3.05, .78), new V3(-1.6, 2.82, .72), new V3(-.3, 3.05, .78)]);
  const ropeG = new THREE.TubeGeometry(ropeC, 60, .07, 8), rpa = ropeG.attributes.position, rcol = [];
  for (let i = 0; i < rpa.count; i++) { const k = Math.floor(i / 9), a = (i % 9) / 8; rcol.push(...(((k + a * 3) | 0) % 2 ? [.85, .75, .54] : [.66, .54, .31])); }
  ropeG.setAttribute('color', new THREE.Float32BufferAttribute(rcol, 3)); const rope = new THREE.Mesh(ropeG, toon({ vertexColors: true })); sc.add(rope); // twisted straw
  const zig = new THREE.Shape(); zig.moveTo(0, 0); zig.lineTo(.09, 0); zig.lineTo(.09, -.1); zig.lineTo(.02, -.1); zig.lineTo(.02, -.2); zig.lineTo(.11, -.2); zig.lineTo(.11, -.32); zig.lineTo(.04, -.32); zig.lineTo(.04, -.42); zig.lineTo(-.04, -.42); zig.lineTo(-.04, -.3); zig.lineTo(.03, -.3); zig.lineTo(.03, -.22); zig.lineTo(-.06, -.22); zig.lineTo(-.06, -.08); zig.lineTo(0, -.08); zig.lineTo(0, 0);
  const shideG = new THREE.ShapeGeometry(zig), shideM = new THREE.MeshBasicMaterial({ color: '#fbf6ea', side: THREE.DoubleSide });
  W.shide = [.25, .5, .75].map(u => { const m = new THREE.Mesh(shideG, shideM); m.scale.setScalar(.6); m.position.copy(ropeC.getPoint(u, new V3())).add(new V3(0, -.05, -.06)); sc.add(m); return m; });
  // a barred window on the back wall, and the dusty shaft of daylight it throws
  const win = merge([P(GEO.box(1.3, 1, .12), '#1a0e08', [2.6, 3, 4.3]), ...[-.4, -.13, .13, .4].map(dx => P(GEO.box(.05, .9, .14), '#1a0e08', [2.6 + dx, 3, 4.28]))]);
  sc.add(new THREE.Mesh(win, toon({ vertexColors: true })));
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.15, .85), new THREE.MeshBasicMaterial({ color: '#cfe0ff', fog: false })); sky.position.set(2.6, 3, 4.34); sky.rotation.y = Math.PI; sc.add(sky);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 5.2), new THREE.MeshBasicMaterial({ map: TEX.ray, color: '#ffe6c0', transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.set(2.2, 1.6, 2.6); beam.rotation.set(-.62, Math.PI + .25, 0); sc.add(beam);
  W.ambient.push(new Ambient({ n: 60, tex: TEX.glow, color: '#ffe6c0', size: .025, alpha: .6, blending: THREE.AdditiveBlending, cx: 2.1, cy: 1.8, cz: 2.4, ax: .6, ay: 1.4, az: .8, sway: .2, twinkle: 1.2, vel: r => [(r() - .5) * .05, (r() - .5) * .04, (r() - .5) * .05], seed: 77 }));
  // finished blades resting on a wall rack
  const rack = new THREE.Group(); rack.position.set(-4.82, 0, -.6); rack.rotation.y = Math.PI / 2; sc.add(rack);
  rack.add(new THREE.Mesh(merge([P(GEO.box(1.6, .08, .1), '#4a2e1a', [0, 1.5, 0]), P(GEO.box(1.6, .08, .1), '#4a2e1a', [0, 2.1, 0]), P(GEO.box(.08, 1.1, .08), '#3a2214', [-.7, 1.8, 0]), P(GEO.box(.08, 1.1, .08), '#3a2214', [.7, 1.8, 0])]), toon({ vertexColors: true })));
  ['iron', 'kanemitsu', 'kagaribi'].forEach((id, i) => { const b = buildSword(swordDef(id)); b.position.set(-.55, 1.62 + i * .22, .08); b.rotation.set(0, 0, -Math.PI / 2 + .04); if (b.userData.glow) b.userData.glow.visible = false; rack.add(b); });
  W.flame = halo('#ff8a3a', 2.2, .8); W.flame.position.set(-1.6, 1.4, 1.5); sc.add(W.flame);
  // bellows
  W.bellows = new THREE.Group(); W.bellows.position.set(-2.9, .45, 1.2); sc.add(W.bellows);
  W.bellowsTop = new THREE.Mesh(merge([P(GEO.box(.9, .06, .6), '#8a5a34', [.0, 0, 0]), P(GEO.box(.08, .08, .5), '#4a2e1a', [-.55, .05, 0])]), toon({ vertexColors: true }));
  const bBot = new THREE.Mesh(GEO.box(.9, .06, .6), toon({ color: '#8a5a34' })); bBot.position.y = -.25; W.bellows.add(bBot);
  W.leather = new THREE.Mesh(GEO.box(.8, 1, .55), toon({ color: '#5a3a24' })); W.bellows.add(W.leather, W.bellowsTop);
  const nozzle = new THREE.Mesh(GEO.cyl(.05, .08, .9, 6), toon({ color: '#3a3a40' })); nozzle.rotation.z = Math.PI / 2; nozzle.position.set(.8, -.1, 0); W.bellows.add(nozzle);
  // anvil
  const anvil = new THREE.Mesh(merge([P(GEO.cyl(.38, .45, .7, 10), '#5a3a22', [0, .35, 0]), P(GEO.box(.36, .25, .28), '#2a2a30', [0, .8, 0]), P(GEO.box(.9, .16, .36), '#3a3a42', [0, 1.0, 0]), P(GEO.cone(.16, .5, 8), '#3a3a42', [.68, 1.0, 0], [0, 0, -Math.PI / 2])]), toon({ vertexColors: true, flatShading: true }));
  anvil.position.set(0, 0, .6); anvil.castShadow = true; sc.add(anvil);
  // trough
  const trough = new THREE.Mesh(merge([P(GEO.box(1.5, .5, .7), '#5a3a22', [0, .25, 0]), P(GEO.box(1.6, .08, .8), '#3a2412', [0, .52, 0])]), toon({ vertexColors: true })); trough.position.set(1.9, 0, 1.0); sc.add(trough);
  W.water = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .5).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#2a5a7a', emissive: '#0a2030', shininess: 80, transparent: true, opacity: .9 })); W.water.position.set(1.9, .47, 1.0); sc.add(W.water);
  // whetstone
  const ws = new THREE.Mesh(merge([P(GEO.box(.8, .5, .5), '#4a2e1a', [0, .25, 0]), P(GEO.box(.9, .1, .26), '#8a8a92', [0, .55, 0]), P(GEO.box(.88, .02, .24), '#a8a8b0', [0, .61, 0])]), toon({ vertexColors: true })); ws.position.set(1.9, 0, -.6); sc.add(ws);
  // hammer
  W.hammer = new THREE.Group(); sc.add(W.hammer);
  const hm = new THREE.Mesh(merge([P(GEO.cyl(.025, .03, .6, 6), '#6a4a2a', [0, -.3, 0]), P(GEO.box(.24, .11, .11), '#3a3a42', [0, 0, 0])]), toon({ vertexColors: true })); hm.castShadow = true; W.hammer.add(hm);
  // tools on the wall
  const tools = merge([...[-1.5, -.9, -.3].map(x => P(GEO.box(.06, .7, .06), '#4a2e1a', [x, 2.4, 4.2])), ...[-1.5, -.9, -.3].map((x, i) => P(GEO.box(.2 + i * .05, .08, .08), '#3a3a42', [x, 2.75, 4.2]))]);
  sc.add(new THREE.Mesh(tools, toon({ vertexColors: true })));
  W.ambient.push(new Ambient({ n: 70, tex: TEX.glow, color: '#ffb03a', color2: '#ff5a1a', size: .05, alpha: 1, blending: THREE.AdditiveBlending, cx: -1.6, cy: 2, cz: 1.5, ax: 1.2, ay: 1.5, az: 1, sway: .3, twinkle: 3, vel: r => [(r() - .5) * .2, .4 + r() * .6, (r() - .5) * .2], seed: 41 }));
  return W;
}

function heatColor(h, out) {
  out = out || new COL();
  if (h < .25) return out.set('#000000').lerp(_ca.set('#5a0a00'), h / .25);
  if (h < .5) return out.set('#5a0a00').lerp(_ca.set('#d0200a'), (h - .25) / .25);
  if (h < .75) return out.set('#d0200a').lerp(_ca.set('#ff8a1a'), (h - .5) / .25);
  return out.set('#ff8a1a').lerp(_ca.set('#fff2a0'), (h - .75) / .25);
}

/* opts: { kind: 'upgrade' | 'recipe', w (upgrade), r (recipe), onDone(quality) } */
function startForge(opts) {
  transition(() => {
    clearSceneActors();
    const W = worldForge(); activateWorld(W);
    const def = opts.kind === 'recipe' ? swordDef(opts.r.id) : swordDef(opts.w.id);
    const blade = buildSword(def); blade.userData.mat.emissive = new COL(0); blade.userData.mat.emissiveIntensity = 1;
    if (blade.userData.glow) blade.userData.glow.visible = false;
    W.scene.add(blade);
    // tongs grip the tang while the steel is hot
    const tongs = new THREE.Group(); [-1, 1].forEach(sd => { const bar = new THREE.Mesh(GEO.box(.018, .62, .014), toon({ color: '#2a2a30' })); bar.position.set(sd * .022, -.56, 0); bar.rotation.z = sd * .05; tongs.add(bar); });
    const jaw = new THREE.Mesh(GEO.box(.07, .07, .03), toon({ color: '#2a2a30' })); jaw.position.y = -.24; tongs.add(jaw); blade.add(tongs);
    const bh = halo('#ff8a1a', 1, 0); bh.scale.set(.5, 1.25, 1); bh.position.y = .42; blade.add(bh);
    // the smith at the anvil: you, in your own armor, with a forging hammer
    const smith = new Samurai(Object.assign(lookFromOutfit(outfitDef(S.outfit)), { helm: 'band', helmCol: '#f4efe4', crest: null, banner: null }), swordDef('bokken'), { noSaya: true }); // a smith's white headband instead of a helmet
    smith.sword.visible = false; smith.root.rotation.order = 'YXZ'; smith.root.position.set(.05, 0, 1.3); smith.root.rotation.y = Math.PI;
    const ham = new THREE.Group();
    ham.add(new THREE.Mesh(merge([P(GEO.cyl(.022, .026, .46, 6), '#7a5230', [0, .2, 0]), P(GEO.box(.26, .12, .12), '#34343c', [0, .46, 0]), P(GEO.box(.04, .13, .13), '#4a4a54', [.13, .46, 0]), P(GEO.box(.04, .13, .13), '#4a4a54', [-.13, .46, 0])]), toon({ vertexColors: true })));
    smith.grip.add(ham); smith.setHold('shoulder', 6); W.scene.add(smith.root);
    W.hammer.visible = false;
    const steps = ['heat', 'hammer', 'quench'].concat(opts.kind === 'recipe' && opts.r.sharpen ? ['sharpen'] : []);
    FG = { o: opts, W, def, blade, steps, si: -1, step: null, t: 0, clock: 0, scores: [], heat: .1, smith, ham, tongs, bladeHalo: bh, camPos: new V3(-.5, 2.6, -2.8), camLook: new V3(-1.2, 1.1, 1.4), done: false };
    CAM.position.copy(FG.camPos);
    showHUD('forge');
    $('#leaveBtn').textContent = 'Leave';
    $('#stageLbl').textContent = (opts.kind === 'recipe' ? 'Forging ' : 'Upgrading ') + def.name;
    OV.draw = drawForgeOverlay; OV.trailCol = '255,220,150';
    banner('The Forge', opts.kind === 'recipe' ? def.name : def.name + ' +' + ((opts.w.lvl || 0) + 1));
    MUSIC.start('train');
    setMode(ForgeMode);
    setTimeout(() => nextForgeStep(), 900);
  });
}
function endForge() { FG = null; OV.draw = null; hideHUD(); enterHub(); }
function setForgeInfo(title, text) { $('#tInfo').innerHTML = `<b>${title}</b>${text}`; }

function nextForgeStep() {
  if (!FG) return;
  FG.si++;
  if (FG.si >= FG.steps.length) { finishForge(); return; }
  const k = FG.steps[FG.si], short = FG.o.kind === 'upgrade';
  FG.step = { k, t: 0 };
  const St = FG.step;
  if (k === 'heat') {
    Object.assign(St, { need: short ? 4 : 6, prog: 0, beat: .8, nextBeat: .8, taps: 0, onBeat: 0, inBand: 0, total: 0, lastTap: -9 });
    FG.blade.position.set(-1.6, 1.22, 1.45); FG.blade.rotation.set(0, 0, Math.PI / 2);
    banner('Heat the steel', 'Pump the bellows on the beat');
    setForgeInfo('1 · Bellows', 'Tap PUMP on the beat to keep the fire in the gold zone.');
  } else if (k === 'hammer') {
    Object.assign(St, { n: short ? 5 : 8, done: 0, pts: 0, spot: null, gap: .5 });
    FG.blade.position.set(-.35, 1.11, .6); FG.blade.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    banner('Hammer it out', 'Tap the glowing spot when the ring closes');
    setForgeInfo('2 · Hammer', 'Tap each glowing spot right as the shrinking ring reaches it.');
  } else if (k === 'quench') {
    Object.assign(St, { h: .98, rate: .3, quenched: false, plunge: 0 });
    FG.heat = 1;
    FG.blade.position.set(1.9, 1.4, 1.0); FG.blade.rotation.set(0, 0, Math.PI / 2 + .25);
    banner('Quench!', 'Swipe down when the blade glows cherry red');
    setForgeInfo('3 · Quench', 'Watch the color. Swipe down (or tap) when the marker is in the cherry red zone.');
  } else if (k === 'sharpen') {
    Object.assign(St, { good: 0, need: 6, strokes: 0, stroke: null, shine: 0, shineT: -1 });
    FG.heat = 0;
    FG.blade.position.set(1.48, .64, -.6); FG.blade.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 + .02); FG.tongs.visible = false;
    banner('Sharpen the edge', 'Smooth, steady strokes along the guide');
    setForgeInfo('4 · Sharpen', 'Swipe from the handle to the tip inside the guide lane. Keep it smooth and steady.');
  }
  sfx.taiko(.7);
}

function forgeScore(v) { FG.scores.push(clamp(v, 0, 1)); }
function finishForge() {
  if (!FG || FG.done) return;
  FG.done = true;
  const avg = FG.scores.reduce((a, b) => a + b, 0) / Math.max(1, FG.scores.length);
  const grade = avg >= .82 ? 'Masterwork' : avg >= .6 ? 'Fine' : 'Plain';
  FG.heat = 0; FG.tongs.visible = false; FG.ham.visible = false;
  // the smith lifts the finished blade into the light
  const sm = FG.smith; FG.blade.scale.set(1, 1, 1); sm.grip.add(FG.blade); FG.blade.position.set(0, 0, 0); FG.blade.quaternion.identity();
  FG.blade.userData.mat.emissive.set(0); if (FG.blade.userData.glow) FG.blade.userData.glow.visible = !!FG.def.glow;
  sm.seq.length = 0; sm.setHold({ p: [-.04, .4, .22], d: [.1, 1, .06], e: [1, 0, 0] }, 4); sm.leanAdd = 0; $('#tInfo').innerHTML = '';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.55, 1.1, 6, 24, 1, true), new THREE.MeshBasicMaterial({ map: TEX.ray, color: '#ffe8b0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  shaft.position.set(.05, 3, 1.25); FG.W.scene.add(shaft); FG.shaft = shaft;
  setTimeout(() => { if (!FG) return; const bp = FG.blade.localToWorld(new V3(0, .5, 0)); FX.sparks(bp, '#ffe08c', 70, 5); FX.glowBurst(bp, FG.def.glow || '#fff2c0', .9, .4); FX.petals && FX.petals(bp, 20, '#ffd27a', 2); sfx.win(); titleCard('鍛', grade, FG.def.name, `Forged by ${S.name || 'Shep'}`); }, 700);
  const res = FG.o.onDone ? FG.o.onDone(grade, avg) : null;
  const d = FG.def, rc = RAR[d.r];
  setTimeout(() => {
    openOverlay(`<div class="modal win">
      <div class="kicker">${grade}!</div>
      <div class="reveal" style="--rc:${rc.c}44;--glow:${d.glow || rc.c}"><div class="rays"></div>${bladeSVG(d)}</div>
      <div>${rarTag(d)}<h2 class="name ${d.r}">${d.name}${res && res.lvl ? ' +' + res.lvl : ''}</h2>${elTag(d.el)}</div>
      <p class="muted">${res && res.msg ? res.msg : ''}</p>
      <div class="rewards">${FG.steps.map((k, i) => `<span class="chip">${['Bellows', 'Hammer', 'Quench', 'Sharpen'][['heat', 'hammer', 'quench', 'sharpen'].indexOf(k)]} ${Math.round((FG.scores[i] || 0) * 100)}%</span>`).join('')}</div>
      <div class="actions"><button class="btn primary" data-forgeres="ok">${FG.o.kind === 'recipe' ? 'Wield it!' : 'Back to the forge'}</button></div>
    </div>`);
  }, 3600);
}

const _fv = new V3();
const ForgeMode = {
  name: 'forge',
  slashActive() { return !!(FG && FG.step && (FG.step.k === 'sharpen' || FG.step.k === 'quench')); },
  slash() { },
  update(dt) {
    if (!FG) return;
    FG.clock += dt;
    const W = FG.W, St = FG.step;
    // fire glow follows how hard you pump
    const fireK = St && St.k === 'heat' ? FG.heat : .35;
    W.fire.intensity = 1 + fireK * 3 + Math.sin(FG.clock * 13) * .15; W.flame.scale.setScalar(1.6 + fireK * 2.2); W.flame.material.opacity = .5 + fireK * .5;
    W.coals.material.color.setScalar(.72 + fireK * .45 + Math.sin(FG.clock * 9) * .05 + Math.sin(FG.clock * 23) * .03);
    W.tongues.forEach(t => { const u = t.userData, k = (.45 + fireK * 1.1) * (1 + .35 * Math.sin(FG.clock * u.sp + u.ph) + .15 * Math.sin(FG.clock * u.sp * 2.3 + u.ph)); t.scale.set(.32 + fireK * .2, k, 1); t.position.set(u.x + Math.sin(FG.clock * 3 + u.ph) * .04, 1.2 + k * .42, u.z); t.material.opacity = .55 + fireK * .4; });
    W.shide.forEach((m, i) => { m.rotation.y = Math.sin(FG.clock * 1.3 + i * 2) * .25; m.rotation.z = Math.sin(FG.clock * 1.7 + i) * .05; });
    if (FG.smith) forgeSmith(dt);
    if (FG.bladeHalo) { const hk = clamp((FG.heat - .35) / .5, 0, 1); FG.bladeHalo.material.opacity = hk * .55; heatColor(Math.max(.6, FG.heat), FG.bladeHalo.material.color); }
    W.bellowsTop.position.y = lerp(W.bellowsTop.position.y, .4, damp(3, dt)); W.leather.scale.y = .5 + W.bellowsTop.position.y; W.leather.position.y = (W.bellowsTop.position.y - .25) / 2;
    if (St) { St.t += dt; ({ heat: heatStep, hammer: hammerStep, quench: quenchStep, sharpen: sharpenStep })[St.k](dt); }
    // blade glow
    const bm = FG.blade.userData.mat; heatColor(FG.heat, bm.emissive); bm.emissiveIntensity = FG.heat > .05 ? 1.2 : 0;
    if (FG.heat > .5 && Math.random() < dt * 8) { FG.blade.getWorldPosition(_fv); FX.add.emit(_fv.x + rnd(-.3, .3), _fv.y, _fv.z + rnd(-.1, .1), 0, rnd(.2, .5), 0, .6, .04, 0, '#ffb03a', 1, -.3, .3); }
    // camera per step
    let pos = new V3(-.5, 2.6, -2.8), look = new V3(-1.2, 1.1, 1.4);
    if (St && St.k === 'hammer') { pos = new V3(1.25, 1.85, -.75); look = new V3(-.15, 1.2, .9); }
    if (St && St.k === 'quench') { pos = new V3(1.0, 2.0, -1.4); look = new V3(1.9, .9, 1.0); }
    if (St && St.k === 'sharpen') { pos = new V3(1.85, 1.75, -1.75); look = new V3(1.85, .62, -.6); }
    if (FG.done) { pos = new V3(1.25, 1.85, -1.15); look = new V3(.05, 2.0, 1.25); if (FG.shaft) FG.shaft.material.opacity = Math.min(.1, FG.shaft.material.opacity + dt * .5); }
    FG.camPos.lerp(pos, damp(3.5, dt)); FG.camLook.lerp(look, damp(3.5, dt));
    CAM.position.copy(FG.camPos); CAM.lookAt(FG.camLook); CAM.fov = lerp(CAM.fov, 52, damp(5, dt)); CAM.updateProjectionMatrix(); FX.setScale();
    applyShake(dt);
  },
  down(x, y, id) {
    const St = FG && FG.step; if (!St || FG.done) return;
    if (St.k === 'heat') pumpBellows();
    else if (St.k === 'hammer') hammerTap(x, y);
    else if (St.k === 'quench') St.down = { x, y };
    else if (St.k === 'sharpen') St.stroke = [{ x, y, t: performance.now() }];
  },
  move(x, y) {
    const St = FG && FG.step; if (!St) return;
    if (St.k === 'sharpen' && St.stroke) St.stroke.push({ x, y, t: performance.now() });
    if (St.k === 'quench' && St.down && y - St.down.y > 50) { St.down = null; doQuench(); }
  },
  up() {
    const St = FG && FG.step; if (!St) return;
    if (St.k === 'quench' && St.down) { St.down = null; doQuench(); }
    if (St.k === 'sharpen' && St.stroke) { const s = St.stroke; St.stroke = null; sharpenStroke(s); }
  },
};

/* --- 1: bellows --- */
const BAND = [.55, .76];
function heatStep(dt) {
  const St = FG.step; if (St.over) return;
  St.total += dt;
  FG.heat = Math.max(0, FG.heat - dt * (.1 + FG.heat * .06));
  if (St.t >= St.nextBeat) { St.nextBeat += St.beat; sfx.tick(); St.pulse = 1; }
  St.pulse = Math.max(0, (St.pulse || 0) - dt * 3);
  if (FG.heat >= BAND[0] && FG.heat <= BAND[1]) { St.prog += dt / St.need; St.inBand += dt; }
  else if (FG.heat > .86) { St.prog = Math.max(0, St.prog - dt * .25); if (Math.random() < dt * 4) { tPopF('Too hot!', '#ff8a7a'); } }
  if (St.prog >= 1) {
    St.over = true;
    forgeScore(.55 * (St.inBand / Math.max(1, St.total)) * 1.6 + .45 * (St.onBeat / Math.max(1, St.taps)));
    tPopF('Perfect heat!', '#ffe08c'); setTimeout(nextForgeStep, 700);
  }
}
let _popT = 0;
function tPopF(text, color) { const now = performance.now(); if (now - _popT < 600) return; _popT = now; ovPop(VW / 2, VH * .32, text, { size: 30, color, stroke: '#2a0c00' }); }
function pumpBellows() {
  const St = FG.step; if (St.over) return;
  const phase = (St.t % St.beat), err = Math.min(phase, St.beat - phase);
  St.taps++;
  const good = err < .14;
  if (good) St.onBeat++;
  FG.heat = Math.min(1, FG.heat + (good ? .1 : .045));
  FG.W.bellowsTop.position.y = .05;
  AUD.noise(.25, 400, .7, good ? .35 : .2, 'lowpass');
  const fp = FG.W.flame.position;
  for (let i = 0; i < (good ? 14 : 5); i++) FX.add.emit(fp.x + rnd(-.4, .4), fp.y, fp.z + rnd(-.3, .3), rnd(-.3, .3), rnd(1, 2.4), rnd(-.3, .3), rnd(.3, .6), .08, 0, good ? '#ffd27a' : '#ff6a2a', 1, -.4, .8);
  if (!good) FX.puff(new V3(fp.x, fp.y + .2, fp.z), 2, '#3a3030', .4);
  St.flash = good ? 'On beat!' : 'Off beat';
}

/* --- 2: hammer --- */
function hammerStep(dt) {
  const St = FG.step;
  FG.heat = Math.max(.35, FG.heat - dt * .02);
  if (St.done >= St.n) { if (!St.over) { St.over = true; forgeScore(St.pts / St.n); setTimeout(nextForgeStep, 700); } return; }
  if (!St.spot) { St.gap -= dt; if (St.gap <= 0) { const dur = Math.max(.62, .95 - St.done * .04); St.spot = { u: rnd(.15, .9), t: 0, dur }; } return; }
  St.spot.t += dt;
  if (St.spot.t > St.spot.dur + .22) { St.spot = null; St.done++; St.gap = .35; tPopF('Missed!', '#ff8a7a'); }
  // the smith raises the hammer over the glowing spot
  if (St.swing > 0) St.swing = Math.max(0, St.swing - dt);
  else FG.smith.setHold(smithPose(spotWorld(St.spot ? St.spot.u : .5), false), 9);
}
/* hammer poses in the smith's chest space: raised high, or with the head on the steel */
function smithPose(sp, down) {
  const sm = FG.smith; sm.root.updateMatrixWorld(true);
  const l = sm.chest.worldToLocal(sp.clone());
  if (down) { const d = new V3(0, -.42, 1).normalize(); return { p: l.clone().addScaledVector(d, -.47).add(new V3(0, .04, 0)).toArray(), d: d.toArray(), e: [1, 0, 0] }; }
  const d = new V3(0, .9, -.45).normalize(); return { p: l.clone().add(new V3(0, .44, -.34)).toArray(), d: d.toArray(), e: [1, 0, 0] };
}
function forgeSmith(dt) {
  const sm = FG.smith, St = FG.step;
  const k = St && St.k === 'hammer' ? 1 : 0;
  sm.leanAdd = lerp(sm.leanAdd, k ? .18 : 0, damp(4, dt));
  if (St && St.k !== 'hammer' && !FG.done && !sm._rest) { sm._rest = true; sm.setHold('shoulder', 5); }
  if (St && St.k === 'hammer') sm._rest = false;
  sm.update(dt);
}
function spotWorld(u) { FG.blade.updateMatrixWorld(true); const len = FG.blade.userData.len || .8; return FG.blade.localToWorld(new V3(0, .04 + u * (len - .04), 0)); }
function hammerTap(x, y) {
  const St = FG.step; if (!St.spot) return;
  const sp = spotWorld(St.spot.u), s = toScreen(sp);
  if (Math.hypot(x - s.x, y - s.y) > Math.max(90, VW * .1)) return;
  const k = St.spot.t / St.spot.dur, err = Math.abs(1 - k);
  let pts, label, col;
  if (err < .12) { pts = 1; label = 'PERFECT!'; col = '#ffe08c'; } else if (err < .3) { pts = .6; label = 'Good'; col = '#d9ffb0'; } else { pts = .15; label = 'Early'; col = '#ffb38a'; }
  St.pts += pts; St.done++; St.spot = null; St.gap = .3; St.swing = .32;
  { const sm = FG.smith; sm.seq.length = 0; sm.queue(smithPose(sp, true), .07, { ease: easeIn, arc: .05 }); sm.queue(smithPose(sp, false), .24); sm.jolt = .25; }
  ovPop(s.x, s.y - 50, label, { size: pts === 1 ? 36 : 28, color: col, stroke: '#2a0c00' });
  sfx.clang(pts === 1 ? 1.3 : .9); shake(pts === 1 ? .05 : .025); hitstop(pts === 1 ? 50 : 20);
  FX.sparks(sp, '#ffd27a', pts === 1 ? 40 : 18, 4.5, .06); FX.sparks(sp, '#2a1a12', 10, 2.6, .05); FX.glowBurst(sp, '#ffb03a', pts === 1 ? 1.2 : .7, .2);
  FG.heat = Math.min(1, FG.heat + .05);
}

/* --- 3: quench --- */
const QZONE = [.36, .5];
function quenchStep(dt) {
  const St = FG.step;
  if (St.quenched) {
    St.plunge = Math.min(1, St.plunge + dt * 4);
    FG.blade.position.y = lerp(1.4, .42, easeOut(St.plunge));
    FG.heat = Math.max(0, FG.heat - dt * 1.6);
    St.steam = (St.steam || 0) + dt;
    if (St.steam < 2.2 && Math.random() < dt * 12) FX.puff(new V3(1.9 + rnd(-.35, .35), .55 + rnd(0, .2) + St.steam * .3, 1.0 + rnd(-.15, .15)), 1, '#c8d0d8', .3 + St.steam * .18);
    if (St.steam < 1.6 && Math.random() < dt * 30) FX.add.emit(1.9 + rnd(-.5, .5), .48, 1.0 + rnd(-.2, .2), 0, rnd(.3, .7), 0, .4, .025, 0, '#ffffff', .9, 0, .2);
    if (St.rings) St.rings.forEach(r => { r.userData.t += dt; const k2 = r.userData.t / 1.2; r.scale.setScalar(.2 + k2 * 1.6); r.material.opacity = Math.max(0, .7 * (1 - k2)); });
    return;
  }
  St.h = Math.max(0, St.h - dt * St.rate); FG.heat = St.h;
  if (St.h <= .05) doQuench();
}
function doQuench() {
  const St = FG.step; if (!St || St.k !== 'quench' || St.quenched) return;
  St.quenched = true;
  const mid = (QZONE[0] + QZONE[1]) / 2, err = Math.abs(St.h - mid), half = (QZONE[1] - QZONE[0]) / 2;
  const score = err <= half ? 1 - err / half * .2 : Math.max(0, .8 - (err - half) * 3);
  forgeScore(score);
  const wp = new V3(1.9, .6, 1.0);
  St.rings = [0, .25, .5].map(dl => { const r = new THREE.Mesh(new THREE.RingGeometry(.18, .22, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0, depthWrite: false })); r.position.set(1.9, .48, 1.0); r.userData.t = -dl; FG.W.scene.add(r); return r; });
  FX.glowBurst(new V3(1.9, .6, 1.0), '#ffd8b0', .6, .25);
  for (let i = 0; i < 4; i++) setTimeout(() => FX.puff(wp.clone().add(new V3(rnd(-.4, .4), .2 + i * .15, rnd(-.2, .2))), 4, '#d4dae0', .6), i * 90);
  AUD.noise(1.4, 6000, .5, .5, 'highpass'); AUD.noise(1.0, 2000, .6, .3, 'bandpass');
  tPopF(score > .85 ? 'Perfect quench!' : score > .55 ? 'Good quench' : St.h > QZONE[1] ? 'Too hot!' : 'Too cool!', score > .85 ? '#8fe8ff' : score > .55 ? '#d9ffb0' : '#ffb38a');
  shake(.03);
  setTimeout(nextForgeStep, 1300);
}

/* --- 4: sharpen --- */
function laneScreen() {
  FG.blade.updateMatrixWorld(true);
  const len = FG.blade.userData.len || .8;
  const a = toScreen(FG.blade.localToWorld(new V3(0, .05, .01))), b = toScreen(FG.blade.localToWorld(new V3(0, len - .02, .01)));
  return { a, b };
}
function sharpenStep(dt) {
  const St = FG.step;
  if (St.shineT >= 0) { St.shineT += dt * 1.8; if (St.shineT > 1) St.shineT = -1; }
  if (!St.over && (St.good >= St.need || St.strokes >= 14)) {
    St.over = true;
    forgeScore(St.good / St.need * (St.good >= St.need ? Math.max(.6, 1 - (St.strokes - St.need) * .05) : .8));
    FG.blade.userData.mat.emissive.set('#ffffff'); tPopF('Razor sharp!', '#ffffff');
    if (FG.blade.userData.glow) FG.blade.userData.glow.visible = true;
    setTimeout(nextForgeStep, 900);
  }
}
function sharpenStroke(st) {
  const Sx = FG.step; if (Sx.over || st.length < 4) return;
  const { a, b } = laneScreen(), lx = b.x - a.x, ly = b.y - a.y, L = Math.hypot(lx, ly) || 1;
  const s0 = st[0], s1 = st[st.length - 1], dx = s1.x - s0.x, dy = s1.y - s0.y, D = Math.hypot(dx, dy) || 1;
  Sx.strokes++;
  const cos = (dx * lx + dy * ly) / (D * L), along = D / L;
  let dev = 0; st.forEach(p => dev += segDist(p.x, p.y, a.x, a.y, b.x, b.y)); dev /= st.length;
  const sp = []; for (let k = 1; k < st.length; k++) { const t = st[k].t - st[k - 1].t; if (t > 2) sp.push(Math.hypot(st[k].x - st[k - 1].x, st[k].y - st[k - 1].y) / t); }
  const mean = sp.reduce((p, q) => p + q, 0) / Math.max(1, sp.length), sd = Math.sqrt(sp.reduce((p, q) => p + (q - mean) ** 2, 0) / Math.max(1, sp.length)), cv = mean ? sd / mean : 1;
  AUD.noise(.35, 3000, .8, .25, 'bandpass');
  if (cos < .9) { tPopF('Wrong angle! Follow the lane', '#ffb38a'); return; }
  if (along < .55) { tPopF('Longer stroke!', '#ffb38a'); return; }
  if (dev > Math.max(45, L * .14)) { tPopF('Stay inside the lane', '#ffb38a'); return; }
  if (cv > .85) { tPopF('Uneven! Smooth and steady', '#ffb38a'); return; }
  Sx.good++; Sx.shineT = 0;
  tPopF(Sx.good >= Sx.need ? 'Sharp!' : `Stroke ${Sx.good} / ${Sx.need}`, '#d9f4ff');
  FX.sparks(FG.blade.localToWorld(new V3(0, .4, 0)), '#ffffff', 10, 1.5);
}

function drawForgeOverlay(c) {
  if (!FG || !FG.step || FG.done) return;
  const St = FG.step;
  if (St.k === 'heat') {
    const x = VW - 70, y0 = VH * .22, h = VH * .48, w = 30;
    c.save();
    c.fillStyle = 'rgba(0,0,0,.55)'; c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
    c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y0, w, h, 14) : c.rect(x - w / 2, y0, w, h); c.fill(); c.stroke();
    const yb = v => y0 + h * (1 - v);
    c.fillStyle = 'rgba(255,214,90,.35)'; c.fillRect(x - w / 2, yb(BAND[1]), w, yb(BAND[0]) - yb(BAND[1]));
    c.strokeStyle = '#ffe08c'; c.strokeRect(x - w / 2, yb(BAND[1]), w, yb(BAND[0]) - yb(BAND[1]));
    const g = c.createLinearGradient(0, y0 + h, 0, y0); g.addColorStop(0, '#5a0a00'); g.addColorStop(.5, '#ff5a1a'); g.addColorStop(1, '#fff2a0');
    c.fillStyle = g; c.fillRect(x - w / 2 + 5, yb(FG.heat), w - 10, y0 + h - yb(FG.heat));
    c.font = "900 14px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('HEAT', x, y0 - 10);
    // pump button
    const bx = VW / 2, by = VH * .78, r = Math.min(80, VW * .11);
    c.beginPath(); c.arc(bx, by, r * (1 + St.pulse * .12), 0, Math.PI * 2); c.fillStyle = `rgba(255,170,60,${.25 + St.pulse * .4})`; c.fill();
    c.lineWidth = 5; c.strokeStyle = '#ffe08c'; c.stroke();
    const k = (St.t % St.beat) / St.beat;
    c.beginPath(); c.arc(bx, by, r * (1.8 - k * .8), 0, Math.PI * 2); c.lineWidth = 3; c.strokeStyle = `rgba(255,255,255,${.2 + k * .6})`; c.stroke();
    c.font = "900 22px 'Zen Maru Gothic', sans-serif"; c.fillStyle = '#fff'; c.fillText('PUMP', bx, by + 8);
    // progress
    c.beginPath(); c.arc(bx, by, r + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * St.prog); c.lineWidth = 8; c.strokeStyle = '#4fd6aa'; c.stroke();
    c.restore();
  }
  if (St.k === 'hammer' && St.spot) {
    const s = toScreen(spotWorld(St.spot.u)), k = St.spot.t / St.spot.dur, r0 = 26;
    c.save(); c.shadowColor = '#ffb03a'; c.shadowBlur = 20;
    c.fillStyle = 'rgba(255,190,80,.5)'; c.beginPath(); c.arc(s.x, s.y, r0, 0, Math.PI * 2); c.fill();
    c.lineWidth = 5; c.strokeStyle = '#ffe08c'; c.beginPath(); c.arc(s.x, s.y, r0 + Math.max(0, 1 - k) * 110, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  if (St.k === 'hammer') { c.save(); c.font = "900 16px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(`Strikes ${St.done} / ${St.n}`, VW / 2, VH * .86); c.restore(); }
  if (St.k === 'quench') {
    const w = Math.min(520, VW * .8), x0 = (VW - w) / 2, y = VH * .8, h = 26;
    c.save();
    const g = c.createLinearGradient(x0, 0, x0 + w, 0);
    for (let i = 0; i <= 10; i++) g.addColorStop(i / 10, '#' + heatColor(1 - i / 10).getHexString());
    c.fillStyle = g; c.fillRect(x0, y, w, h);
    const zx = v => x0 + w * (1 - v);
    c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.strokeRect(zx(QZONE[1]), y - 6, zx(QZONE[0]) - zx(QZONE[1]), h + 12);
    c.fillStyle = '#ffffff'; c.beginPath(); const mx = zx(St.h); c.moveTo(mx, y - 8); c.lineTo(mx - 9, y - 22); c.lineTo(mx + 9, y - 22); c.closePath(); c.fill();
    c.font = "900 15px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillText('Cherry red', (zx(QZONE[0]) + zx(QZONE[1])) / 2, y + h + 22);
    if (!St.quenched) { c.font = "900 22px 'Zen Maru Gothic', sans-serif"; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 5; c.strokeText('↓ Swipe down to QUENCH ↓', VW / 2, VH * .7); c.fillText('↓ Swipe down to QUENCH ↓', VW / 2, VH * .7); }
    c.restore();
  }
  if (St.k === 'sharpen') {
    const { a, b } = laneScreen(), dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, wd = Math.max(40, L * .12);
    c.save();
    c.fillStyle = 'rgba(160,220,255,.16)'; c.strokeStyle = 'rgba(200,240,255,.7)'; c.setLineDash([10, 8]); c.lineWidth = 3;
    c.beginPath(); c.moveTo(a.x + nx * wd, a.y + ny * wd); c.lineTo(b.x + nx * wd, b.y + ny * wd); c.lineTo(b.x - nx * wd, b.y - ny * wd); c.lineTo(a.x - nx * wd, a.y - ny * wd); c.closePath(); c.fill(); c.stroke(); c.setLineDash([]);
    const ah = (x, y) => { c.save(); c.translate(x, y); c.rotate(Math.atan2(dy, dx)); c.fillStyle = '#d9f4ff'; c.beginPath(); c.moveTo(16, 0); c.lineTo(-6, -10); c.lineTo(-6, 10); c.closePath(); c.fill(); c.restore(); };
    ah(a.x + dx * .5, a.y + dy * .5); ah(a.x + dx * .8, a.y + dy * .8);
    if (St.shineT >= 0) { const px = a.x + dx * St.shineT, py = a.y + dy * St.shineT, g = c.createRadialGradient(px, py, 0, px, py, 60); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(px - 60, py - 60, 120, 120); }
    c.font = "900 16px 'Zen Maru Gothic', sans-serif"; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(`Sharp strokes ${St.good} / ${St.need}`, VW / 2, VH * .86);
    c.font = "900 14px 'Zen Maru Gothic', sans-serif"; c.fillText('handle', a.x - nx * (wd + 18), a.y - ny * (wd + 18)); c.fillText('tip', b.x - nx * (wd + 18), b.y - ny * (wd + 18));
    c.restore();
  }
}
function forgeResultAction() { closeOverlay(); endForge(); setTimeout(() => showTab('forge'), 450); }
