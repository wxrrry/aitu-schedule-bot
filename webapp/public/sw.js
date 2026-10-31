// AITU Network Service Worker (Офлайн-кэш для колледжа)
const CACHE_NAME = 'aitu-hub-v3.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/telegram-web-app.js',
  '/bells.jpg',
  '/maket_titul_pz_lr.docx',
  '/aitu_schedule_9po43k.ics'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW pre-caching partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('SW deleting outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Пропускаем не-GET запросы и обращения к внешним API (например telegram)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Игнорируем API-запросы — они всегда идут в сеть
  if (url.pathname.startsWith('/api/')) return;

  // 1. Для навигации (HTML страниц) используем стратегию Network-First
  // Это гарантирует, что пользователь всегда сразу получает самый свежий index.html
  const isHtmlNavigation = event.request.mode === 'navigate' || 
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
              cache.put('/', copy.clone());
              cache.put('/index.html', copy.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Если сеть недоступна, возвращаем кэшированный index.html
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // 2. Для статических файлов (/assets/) используем Cache-First с проверкой типа
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Проверяем, что в кэше не лежит ошибочный HTML вместо JS/CSS
        const ct = cachedResponse.headers.get('content-type') || '';
        const isJs = url.pathname.endsWith('.js');
        const isCss = url.pathname.endsWith('.css');
        if ((isJs || isCss) && ct.includes('text/html')) {
          // Поврежденная запись в кэше — удаляем и тянем из сети
          caches.open(CACHE_NAME).then((cache) => cache.delete(event.request));
        } else {
          return cachedResponse;
        }
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const ct = networkResponse.headers.get('content-type') || '';
        const isJs = url.pathname.endsWith('.js');
        const isCss = url.pathname.endsWith('.css');

        // КРИТИЧЕСКИ ВАЖНО: никогда не кэшировать HTML как ответ на JS или CSS файл!
        if ((isJs || isCss) && ct.includes('text/html')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch((err) => {
        console.warn('Asset fetch failed offline:', url.pathname, err);
      });
    })
  );
});
