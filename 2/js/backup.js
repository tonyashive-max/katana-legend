'use strict';
/* ===== Save backups: a code (or a small file) that holds a whole legend, and the restore that reads it back ===== */

const BK_PREFIX = 'KATANA1:', BK_PLAIN = 'KATANA0:';
const b64e = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = str => { const s = atob(str); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; };
async function streamBytes(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }

async function makeBackupCode() {
  const json = new TextEncoder().encode(JSON.stringify({ v: 1, t: Date.now(), save: S }));
  if (typeof CompressionStream === 'function') {
    try { return BK_PREFIX + b64e(await streamBytes(json, new CompressionStream('deflate'))); } catch (e) { /* fall through */ }
  }
  return BK_PLAIN + b64e(json);
}
async function readBackupCode(text) {
  const t = String(text || '').replace(/\s+/g, '');
  let bytes;
  if (t.startsWith(BK_PREFIX)) {
    if (typeof DecompressionStream !== 'function') throw new Error('This browser is too old to open that backup. Try updating it.');
    bytes = await streamBytes(b64d(t.slice(BK_PREFIX.length)), new DecompressionStream('deflate'));
  } else if (t.startsWith(BK_PLAIN)) bytes = b64d(t.slice(BK_PLAIN.length));
  else throw new Error("That doesn't look like a Katana Legend backup.");
  const o = JSON.parse(new TextDecoder().decode(bytes)), sv = o && o.save;
  if (!sv || !Array.isArray(sv.swords) || !sv.sk || !Array.isArray(sv.journey)) throw new Error('That backup is damaged or incomplete.');
  return { t: o.t, save: sv };
}
function backupFileName() { const d = new Date(); return `katana-legend-${(S.name || 'shep').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.katana`; }

/* the code is prepared as the panel opens, so sharing happens right on the tap (Safari insists) */
let BK_CODE = null;
async function bkCode() { if (!BK_CODE) BK_CODE = await makeBackupCode(); return BK_CODE; }
function bkDone() { S.lastBackup = Date.now(); save(); BK_CODE = null; }
function openBackup(msg) {
  BK_CODE = null; makeBackupCode().then(c => { BK_CODE = c; }).catch(() => {});
  const last = S.lastBackup ? new Date(S.lastBackup).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const canShare = !!(navigator.share && navigator.canShare);
  openOverlay(`<div class="modal backup" style="text-align:left">
    <div class="row between"><h2>Back up your legend</h2><button class="btn small" data-bk="close">Done</button></div>
    <p class="muted">Your progress lives only on this device. A backup keeps your blades, trophies, training, armor, journey and wax seal safe if the browser is cleared, and moves them to another tablet or to the home-screen app.</p>
    <p class="bk-last">${last ? `Last backup: <b>${last}</b>` : '⚠ You have never made a backup.'}</p>
    ${msg ? `<p class="bk-msg">${msg}</p>` : ''}
    <div class="bk-grid">
      <button class="btn primary" data-bk="file">⬇ Save backup file</button>
      ${canShare ? '<button class="btn" data-bk="share">↗ Share backup</button>' : ''}
      <button class="btn" data-bk="copy">📋 Copy backup code</button>
    </div>
    <p class="muted" style="font-size:13px">Tip: share the backup to yourself in Notes, Messages or email, so it lives somewhere other than this browser.</p>
    <h3 class="lo-h">Restore a backup</h3>
    <div class="bk-grid">
      <button class="btn" data-bk="pick">📂 Open a backup file</button>
      <button class="btn" data-bk="paste">⌨ Paste a backup code</button>
    </div>
    <input type="file" id="bkFile" accept=".katana,.txt,text/plain" hidden>
  </div>`);
  const f = $('#bkFile');
  if (f) f.addEventListener('change', async () => { const file = f.files && f.files[0]; if (!file) return; try { bkConfirm(await readBackupCode(await file.text())); } catch (e) { openBackup('⚠ ' + esc(e.message)); } });
}
async function backupClick(d) {
  if (!d.bk) return false;
  const a = d.bk;
  if (a === 'close') { closeOverlay(); openSettings(); return true; }
  if (a === 'file') {
    const code = await bkCode(); bkDone(); const blob = new Blob([code], { type: 'text/plain' }), url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = backupFileName(); document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    openBackup('✓ Backup file saved. On an iPad it goes to the Files app (Downloads).'); return true;
  }
  if (a === 'share') {
    const code = await bkCode(), file = new File([code], backupFileName(), { type: 'text/plain' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: "Katana Legend backup" });
      else await navigator.share({ title: "Katana Legend backup", text: code });
      bkDone(); openBackup('✓ Backup shared.');
    } catch (e) { if (!e || e.name !== 'AbortError') openBackup('⚠ Sharing did not work here. Try saving the file or copying the code.'); }
    return true;
  }
  if (a === 'copy') {
    const code = await bkCode(); bkDone();
    try { await navigator.clipboard.writeText(code); openBackup('✓ Backup code copied. Paste it into Notes or a message to yourself.'); }
    catch (e) { openOverlay(`<div class="modal" style="text-align:left"><h2>Your backup code</h2><p class="muted">Select it all and copy it somewhere safe.</p><textarea class="bk-code" readonly>${esc(code)}</textarea><div class="actions"><button class="btn primary" data-bk="back">Done</button></div></div>`); const ta = document.querySelector('.bk-code'); if (ta) { ta.focus(); ta.select(); } }
    return true;
  }
  if (a === 'back') { openBackup(); return true; }
  if (a === 'pick') { const f = $('#bkFile'); if (f) f.click(); return true; }
  if (a === 'paste') {
    openOverlay(`<div class="modal" style="text-align:left"><h2>Paste a backup code</h2><p class="muted">It starts with <b>KATANA1:</b></p><textarea class="bk-code" id="bkPaste" placeholder="KATANA1:…"></textarea>
      <div class="actions"><button class="btn" data-bk="back">Cancel</button><button class="btn primary" data-bk="readpaste">Continue</button></div></div>`);
    return true;
  }
  if (a === 'readpaste') { try { bkConfirm(await readBackupCode(($('#bkPaste') || {}).value)); } catch (e) { openBackup('⚠ ' + esc(e.message)); } return true; }
  if (a === 'restore') {
    const p = BK_PENDING; if (!p) return true;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(p.save)); } catch (e) { openBackup('⚠ Could not save on this device: ' + esc(e.message)); return true; }
    BK_PENDING = null; toast('Legend restored!'); setTimeout(() => location.reload(), 500); return true;
  }
  return true;
}
let BK_PENDING = null;
function bkConfirm(b) {
  BK_PENDING = b;
  const sv = b.save, ch = (sv.journey || []).findIndex(j => !j.myth), chapter = ch < 0 ? 'Every land conquered' : `Chapter ${ch + 1} · ${(CHAPTERS[ch] || {}).name || ''}`;
  const when = b.t ? new Date(b.t).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'unknown';
  openOverlay(`<div class="modal" style="text-align:left">
    <div class="eyebrow">Backup found</div><h2>${esc(sv.name || 'Shep')}'s legend</h2>
    <div class="bk-sum">${sealSVG({ name: sv.name, seal: sv.seal }, 56)}<div><b>${esc(chapter)}</b><small>${(sv.swords || []).length} blades · ${(sv.swords || []).filter(w => w.won).length} trophies · ${sv.wins || 0} wins</small><small>Saved ${esc(when)}</small></div></div>
    <p class="lo-warn">⚠ Restoring replaces everything on this device with this backup. Back up this device first if you want to keep it.</p>
    <div class="actions"><button class="btn" data-bk="back">Cancel</button><button class="btn red" data-bk="restore">Replace my progress</button></div></div>`);
}
/* a gentle nudge in the Dojo once a legend is worth protecting */
function backupNudge() {
  const worth = (S.wins || 0) >= 5 || S.swords.some(w => w.won || w.made);
  if (!worth) return '';
  const age = S.lastBackup ? (Date.now() - S.lastBackup) / 864e5 : Infinity;
  if (age < 7) return '';
  return `<section class="panel bk-nudge"><div class="row between" style="gap:10px"><div><h3>Protect your legend</h3><p class="muted" style="margin:4px 0 0">${S.lastBackup ? `Your last backup was ${Math.floor(age)} days ago.` : 'Your blades and progress live only on this device.'} Make a backup so nothing is ever lost.</p></div><button class="btn small primary" data-bk-open="1">Back up</button></div></section>`;
}
