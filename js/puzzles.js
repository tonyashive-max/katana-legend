'use strict';
/* ===== Shrine puzzles (one per chapter) ===== */

let PZ = null;
function openPuzzle(ch, onSolve) {
  PZ = { ch, onSolve, kind: PUZZLES[ch] };
  ({ lanterns: pzLanterns, seals: pzSeals, moonpath: pzMoon, scales: pzScales })[PZ.kind]();
}
function pzShell(title, intro, body, extra) {
  openOverlay(`<div class="modal puzzle">
    <div class="eyebrow">Spirit Shrine · ${CHAPTERS[PZ.ch].name}</div>
    <h2>${title}</h2>
    <p class="muted" id="pzMsg">${intro}</p>
    <div class="pz-body">${body}</div>
    <div class="actions">${extra || ''}<button class="btn" data-pz="leave">Leave the shrine</button></div>
  </div>`);
}
function pzMsg(t, good) { const m = $('#pzMsg'); if (m) { m.textContent = t; m.style.color = good ? 'var(--jade)' : ''; } }
function pzSolved(text) {
  pzMsg(text || 'Solved! The shrine awakens…', true); sfx.up();
  const p = PZ; PZ = null;
  setTimeout(() => { closeOverlay(); if (p && p.onSolve) p.onSolve(); }, 1300);
}
function puzzleAction(act, el) {
  if (act === 'leave') { PZ = null; closeOverlay(); return; }
  if (!PZ || !PZ.handle) return;
  PZ.handle(act, el);
}

/* ---- Chapter 1: Lantern Song (memory) ---- */
function pzLanterns() {
  const cols = ['#ff5a4e', '#ffb53d', '#ffe27a', '#4fd6aa', '#5fb0ff', '#c886ff'];
  const notes = [392, 440, 523, 587, 659, 784];
  const body = `<div class="lantern-ring">${cols.map((c, i) => {
    const a = i / 6 * Math.PI * 2 - Math.PI / 2;
    return `<button class="lantern" data-pz="lamp" data-i="${i}" style="--c:${c};left:calc(50% + ${Math.cos(a) * 38}% - 32px);top:calc(50% + ${Math.sin(a) * 38}% - 40px)" aria-label="Lantern ${i + 1}"></button>`;
  }).join('')}<div class="ring-center" id="pzRound">Round 1 / 4</div></div>`;
  pzShell('The Lantern Song', 'Watch the lanterns light up, then tap them in the same order.', body, '<button class="btn primary" data-pz="start">Play the song</button>');
  const st = { seq: [], round: 0, input: 0, busy: false, lens: [3, 4, 5, 6] };
  const flash = (i, t) => {
    const b = document.querySelector(`.lantern[data-i="${i}"]`); if (!b) return;
    b.classList.add('lit'); AUD.tone(notes[i], .5, .14, 'triangle'); setTimeout(() => b.classList.remove('lit'), t || 380);
  };
  const play = () => {
    st.busy = true; st.input = 0;
    while (st.seq.length < st.lens[st.round]) st.seq.push((Math.random() * 6) | 0);
    $('#pzRound').textContent = `Round ${st.round + 1} / 4`;
    pzMsg('Watch closely…');
    st.seq.forEach((i, k) => setTimeout(() => flash(i), 600 + k * 620));
    setTimeout(() => { st.busy = false; pzMsg('Your turn! Tap the lanterns in order.'); }, 600 + st.seq.length * 620);
  };
  PZ.handle = (act, el) => {
    if (act === 'start') { if (!st.busy) play(); return; }
    if (act !== 'lamp' || st.busy || !st.seq.length) return;
    const i = +el.dataset.i; flash(i, 220);
    if (i !== st.seq[st.input]) { st.busy = true; sfx.warn(); pzMsg('Wrong lantern! Listen again…'); setTimeout(play, 1100); return; }
    st.input++;
    if (st.input >= st.seq.length) {
      st.round++;
      if (st.round >= 4) { pzSolved('The lanterns sing! The shrine awakens…'); return; }
      st.busy = true; st.seq = []; pzMsg('Perfect! Next song…'); sfx.coin(); setTimeout(play, 1100);
    }
  };
}

/* ---- Chapter 2: Frozen Seals (lights out) ---- */
function pzSeals() {
  const N = 4; let grid = Array(N * N).fill(1), moves = 0;
  const press = (g, i) => { const r = (i / N) | 0, c = i % N; [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) g[rr * N + cc] ^= 1; }); };
  const used = new Set(); while (used.size < 7) used.add((Math.random() * N * N) | 0); used.forEach(i => press(grid, i));
  if (grid.every(v => v)) press(grid, 5);
  const start = grid.slice();
  const draw = () => { const el = $('#pzGrid'); if (!el) return; el.innerHTML = grid.map((v, i) => `<button class="seal ${v ? 'on' : ''}" data-pz="seal" data-i="${i}" aria-label="Seal ${i + 1}"></button>`).join(''); $('#pzMoves').textContent = moves + ' moves'; };
  pzShell('The Frozen Seals', 'Tapping a seal flips it and its neighbors. Make every seal glow blue.', `<div class="seal-grid" id="pzGrid"></div><p class="muted" id="pzMoves">0 moves</p>`, '<button class="btn" data-pz="reset">Reset</button>');
  draw();
  PZ.handle = (act, el) => {
    if (act === 'reset') { grid = start.slice(); moves = 0; draw(); return; }
    if (act !== 'seal') return;
    press(grid, +el.dataset.i); moves++; AUD.tone(880 + (+el.dataset.i) * 40, .15, .08, 'sine'); draw();
    if (grid.every(v => v)) pzSolved('All seals glow! The ice cracks open…');
  };
}

/* ---- Chapter 3: Moon Path (rotate the tiles) ---- */
function pzMoon() {
  const N = 5, D = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // up right down left
  let path;
  for (let tries = 0; tries < 200; tries++) {
    const r0 = (Math.random() * N) | 0, seen = new Set([r0 * N]), p = [[r0, 0]];
    const walk = () => {
      const [r, c] = p[p.length - 1];
      if (c === N - 1 && p.length >= 7) return true;
      const opts = [0, 1, 2, 3].sort(() => Math.random() - .5).sort((a, b) => (b === 1) - (a === 1) + (Math.random() - .5) * .8);
      for (const d of opts) {
        const rr = r + D[d][0], cc = c + D[d][1]; if (rr < 0 || rr >= N || cc < 0 || cc >= N || seen.has(rr * N + cc) || d === 3) continue;
        seen.add(rr * N + cc); p.push([rr, cc]); if (walk()) return true; p.pop(); seen.delete(rr * N + cc);
      }
      return false;
    };
    if (walk() && p.length <= 13) { path = p; break; }
  }
  if (!path) path = [[2, 0], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [2, 4]];
  // tile connections: bitmask up=1 right=2 down=4 left=8
  const conn = Array(N * N).fill(0);
  path.forEach(([r, c], k) => {
    const link = (a, b) => { const d = D.findIndex(([dr, dc]) => dr === b[0] - a[0] && dc === b[1] - a[1]); conn[a[0] * N + a[1]] |= 1 << d; };
    if (k === 0) conn[r * N + c] |= 8; else link([r, c], path[k - 1]);
    if (k === path.length - 1) conn[r * N + c] |= 2; else link([r, c], path[k + 1]);
  });
  for (let i = 0; i < N * N; i++) if (!conn[i]) conn[i] = Math.random() < .5 ? 5 : 3;
  const rotMask = (m, k) => { for (let i = 0; i < k; i++) m = ((m << 1) | (m >> 3)) & 15; return m; };
  const rot = conn.map(() => (Math.random() * 4) | 0);
  const startR = path[0][0], endR = path[path.length - 1][0];
  const cur = i => rotMask(conn[i], rot[i]);
  const lit = () => {
    const on = new Set(); let r = startR, c = 0, from = 3, guard = 0;
    while (guard++ < 40) {
      const m = cur(r * N + c); if (!(m & (1 << from))) return { on, done: false };
      on.add(r * N + c);
      const outs = [0, 1, 2, 3].filter(d => d !== from && (m & (1 << d)));
      if (!outs.length) return { on, done: false };
      const d = outs[0];
      if (c === N - 1 && d === 1 && r === endR) return { on, done: true };
      const rr = r + D[d][0], cc = c + D[d][1]; if (rr < 0 || rr >= N || cc < 0 || cc >= N) return { on, done: false };
      r = rr; c = cc; from = (d + 2) % 4;
    }
    return { on, done: false };
  };
  const svgTile = (m, on) => {
    const col = on ? '#ffe08c' : '#5a6488', w = on ? 14 : 11;
    let s = `<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="1" y="1" width="58" height="58" rx="10" fill="${on ? 'rgba(255,224,140,.16)' : 'rgba(255,255,255,.05)'}"/>`;
    const ends = [[30, 0], [60, 30], [30, 60], [0, 30]];
    for (let d = 0; d < 4; d++) if (m & (1 << d)) s += `<line x1="30" y1="30" x2="${ends[d][0]}" y2="${ends[d][1]}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
    s += `<circle cx="30" cy="30" r="${w / 2 + 1}" fill="${col}"/></svg>`;
    return s;
  };
  const draw = () => {
    const L = lit(), el = $('#pzGrid'); if (!el) return L;
    el.innerHTML = conn.map((_, i) => `<button class="tile" data-pz="tile" data-i="${i}">${svgTile(cur(i), L.on.has(i))}</button>`).join('');
    $('#pzEnds').style.setProperty('--sr', startR); $('#pzEnds').style.setProperty('--er', endR);
    return L;
  };
  for (let g = 0; g < 8 && lit().done; g++) { const [pr, pc] = path[Math.min(1, path.length - 1)]; rot[pr * N + pc] = (rot[pr * N + pc] + 1) % 4; }
  pzShell('The Moon Path', 'Tap tiles to turn them. Guide the moonlight from the moon on the left to the gate on the right.',
    `<div class="moon-wrap" id="pzEnds"><span class="moon-icon">●</span><div class="moon-grid" id="pzGrid"></div><span class="gate-icon">⛩</span></div>`);
  draw();
  PZ.handle = (act, el) => {
    if (act !== 'tile') return;
    const i = +el.dataset.i; rot[i] = (rot[i] + 1) % 4; AUD.tone(520 + (i % 5) * 60, .1, .07, 'triangle');
    if (draw().done) pzSolved('The moonlight reaches the gate!');
  };
}

/* ---- Chapter 4: Dragon Scales (sliding puzzle) ---- */
function pzScales() {
  const glyphs = ['一', '二', '三', '四', '五', '六', '七', '八'];
  let t = [1, 2, 3, 4, 5, 6, 7, 8, 0], moves = 0;
  const nb = i => [i - 3, i + 3, i % 3 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1].filter(j => j >= 0 && j < 9);
  let blank = 8, last = -1;
  for (let k = 0; k < 70; k++) { const opts = nb(blank).filter(j => j !== last); const j = pick(opts); t[blank] = t[j]; t[j] = 0; last = blank; blank = j; }
  if (t.join() === '1,2,3,4,5,6,7,8,0') { const j = nb(8)[0]; t[8] = t[j]; t[j] = 0; }
  const draw = () => {
    const el = $('#pzGrid'); if (!el) return;
    el.innerHTML = t.map((v, i) => v ? `<button class="scale-tile" data-pz="slide" data-i="${i}" style="--h:${v * 40}"><b>${glyphs[v - 1]}</b><small>${v}</small></button>` : '<div class="scale-blank"></div>').join('');
    $('#pzMoves').textContent = moves + ' moves';
  };
  pzShell('The Dragon Scales', 'Slide the scales into order, 1 to 8, with the empty space at the bottom right.', `<div class="scale-grid" id="pzGrid"></div><p class="muted" id="pzMoves">0 moves</p>`);
  draw();
  PZ.handle = (act, el) => {
    if (act !== 'slide') return;
    const i = +el.dataset.i, b = t.indexOf(0);
    if (!nb(b).includes(i)) { sfx.warn(); return; }
    t[b] = t[i]; t[i] = 0; moves++; AUD.tone(300 + t[b] * 50, .12, .08, 'triangle'); draw();
    if (t.join() === '1,2,3,4,5,6,7,8,0') pzSolved('The dragon scales align! The shrine awakens…');
  };
}
