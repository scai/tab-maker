// Bump the version whenever the app shell or bundled songs change.
const CACHE_PREFIX = `tab-maker:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v14`;
const APP_SHELL = [
  './', './index.html', './styles.css', './tab-maker.js?v=pwa-14', './pwa.js', './theme.js',
  './manifest.webmanifest', './octave.svg', './vendor/svg.min.js',
  './modules/block.js', './modules/chord-util.js', './modules/chord-diagram.js',
  './modules/tab-renderer.js?v=pwa-14', './modules/tab-controller.js?v=pwa-14', './modules/tab-editor.js?v=pwa-14', './modules/tabs-menu.js',
  './assets/logo.png', './assets/favicon.ico', './assets/favicon-32.png',
  './assets/apple-touch-icon.png', './assets/icon-192.png',
  './assets/icon-512.png', './assets/icon-maskable-512.png', './tabs/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    const response = await cache.match('./tabs/manifest.json');
    const { tabs } = await response.json();
    await cache.addAll(tabs.map(tab => `./tabs/${typeof tab === 'string' ? tab : tab.id}.json`));
    // Updates wait for existing app windows to close, avoiding mixed app versions.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Fonts remain optional; do not intercept other apps or third-party requests.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (event.request.mode === 'navigate') {
      // Serve the installed shell together with its matching cached modules.
      const home = new URL('./', self.registration.scope);
      if (url.pathname === home.pathname || url.pathname === `${home.pathname}index.html`) {
        return await cache.match('./index.html');
      }
      try {
        return await fetch(event.request);
      } catch (error) {
        return await cache.match('./index.html');
      }
    }
    return await cache.match(event.request) || fetch(event.request);
  })());
});
