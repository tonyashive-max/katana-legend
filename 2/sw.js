/* Katana Legend II offline store. The page is fetched fresh when there is internet and from this store when there is not. */
const V = 'kl2-2280';
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "js/three.min.js?v=147", "js/data.js?v=2280", "js/engine.js?v=2280", "js/rig.js?v=2280", "js/worlds.js?v=2280", "js/rope.js?v=2280", "js/fight.js?v=2280", "js/train.js?v=2280", "js/dragon.js?v=2280", "js/explore.js?v=2280", "js/puzzles.js?v=2280", "js/forge.js?v=2280", "js/duel.js?v=2280", "js/versus.js?v=2280", "js/story.js?v=2280", "js/backup.js?v=2280", "js/town.js?v=2280", "js/towns.js?v=2280", "js/hara.js?v=2280", "js/shimada.js?v=2280", "js/miya.js?v=2280", "js/seki.js?v=2280", "js/otsu.js?v=2280", "js/kyoto.js?v=2280", "js/gear.js?v=2280", "js/coop.js?v=2280", "js/team.js?v=2280", "js/dual.js?v=2280", "js/masters.js?v=2280", "js/more.js?v=2280", "js/road2.js?v=2280", "js/pack.js?v=2280", "js/heir.js?v=2280", "js/run.js?v=2280", "js/ui.js?v=2280"];
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
