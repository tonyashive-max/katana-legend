/* Katana Legend II offline store. The page is fetched fresh when there is internet and from this store when there is not. */
const V = 'kl2-2250';
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "js/three.min.js?v=147", "js/data.js?v=2250", "js/engine.js?v=2250", "js/rig.js?v=2250", "js/worlds.js?v=2250", "js/rope.js?v=2250", "js/fight.js?v=2250", "js/train.js?v=2250", "js/dragon.js?v=2250", "js/explore.js?v=2250", "js/puzzles.js?v=2250", "js/forge.js?v=2250", "js/duel.js?v=2250", "js/versus.js?v=2250", "js/story.js?v=2250", "js/backup.js?v=2250", "js/town.js?v=2250", "js/towns.js?v=2250", "js/hara.js?v=2250", "js/shimada.js?v=2250", "js/miya.js?v=2250", "js/seki.js?v=2250", "js/otsu.js?v=2250", "js/kyoto.js?v=2250", "js/gear.js?v=2250", "js/coop.js?v=2250", "js/team.js?v=2250", "js/dual.js?v=2250", "js/masters.js?v=2250", "js/more.js?v=2250", "js/road2.js?v=2250", "js/pack.js?v=2250", "js/heir.js?v=2250", "js/ui.js?v=2250"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(FILES.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kl2-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || !r.url.startsWith('http')) return;
  const u = new URL(r.url), mine = u.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!mine && !font) return; // multiplayer and everything else goes straight to the network
  const page = mine && (r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html'));
  const put = res => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; };
  if (page) e.respondWith(fetch(r).then(put).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
  else e.respondWith(caches.match(r).then(m => m || fetch(r).then(put).catch(() => caches.match(r, { ignoreSearch: true }))));
});
