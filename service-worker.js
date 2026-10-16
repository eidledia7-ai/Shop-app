/* ==========================================================
   Service Worker - إدارة المحل
   ========================================================== */

const CACHE_NAME = 'idaret-shop-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// تثبيت Service Worker
self.addEventListener('install', function(event) {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching files');
      return cache.addAll(URLS_TO_CACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// اعتراض الطلبات
self.addEventListener('fetch', function(event) {
  // تجاهل طلبات Supabase و APIs
  if (event.request.url.indexOf('supabase.co') !== -1) {
    return;
  }
  
  // تجاهل طلبات CDN
  if (event.request.url.indexOf('cdn.jsdelivr.net') !== -1) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(function(response) {
      // رجّع من الكاش لو موجود
      if (response) {
        // حاول تحديث من الشبكة في الخلفية
        fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(function() {});
        
        return response;
      }
      
      // لو مش موجود في الكاش، جيب من الشبكة
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      });
    })
  );
});

// استقبال رسائل من التطبيق (لتحديث الكاش)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(function() {
      console.log('[SW] Cache cleared');
    });
  }
});