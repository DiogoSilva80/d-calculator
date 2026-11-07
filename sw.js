/* D-Calculator — guarda os ficheiros no telemóvel para a app abrir sem internet.
   Mostra logo a versão guardada e vai buscar a nova em segundo plano (fica ativa na abertura seguinte).
   Ao acrescentar ou mudar o nome de ficheiros, atualiza a lista e sobe a versão em CACHE. */
const CACHE = 'dcalc-v1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/mathcore.js', 'js/ui.js', 'js/app-run.js', 'js/app-stat.js', 'js/app-graph.js',
  'js/app-equation.js', 'js/app-matrix.js', 'js/app-system.js', 'js/pwa.js',
  'favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  url.search = '';                       // "?app" e afins abrem a mesma página
  const key = url.href;
  const net = fetch(req, { cache: 'no-cache' }).then(res =>
    res.ok ? caches.open(CACHE).then(c => c.put(key, res.clone())).then(() => res) : res);
  e.waitUntil(net.catch(() => {}));
  e.respondWith(caches.match(key).then(hit => hit || net));
});
