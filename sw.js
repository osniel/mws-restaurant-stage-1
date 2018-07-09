var staticCacheName = 'site-static';
var contentImgsCache = 'site-content-imgs';
var allCaches = [
  staticCacheName,
  contentImgsCache
];

self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open(staticCacheName).then(function(cache) {
        return cache.addAll([
          '/',
          '/restaurant.html',
          'js/main.js',
          'js/dbhelper.js',
          'js/restaurant_info.js',
          'js/idb.js',
          'css/styles.css'
        ]);
      })
    );
  });

self.addEventListener('activate', function(event) {
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.filter(function(cacheName) {
            return cacheName.startsWith('site-') &&
                   !allCaches.includes(cacheName);
          }).map(function(cacheName) {
            return caches.delete(cacheName);
          })
        );
      })
    );
  });

  self.addEventListener('fetch', function(event) {
    var requestUrl = new URL(event.request.url);
  
    if (requestUrl.origin === location.origin) {
      if (requestUrl.pathname === '/') {
        event.respondWith(caches.match('/'));
        return;
      }
      if (requestUrl.pathname === '/restaurant.html') {
        event.respondWith(caches.match('/restaurant.html'));
        return;
      }
      if (requestUrl.pathname.startsWith('/img/')) {
        event.respondWith(servePhoto(event.request));
        return;
      }
    }
  
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
  });

  function servePhoto(request) {
    var storageUrl = request.url.replace(/-\d+px\.jpg$/, '');
  
    return caches.open(contentImgsCache).then(function(cache) {
      return cache.match(storageUrl).then(function(response) {
        if (response) return response;
  
        return fetch(request).then(function(networkResponse) {
          cache.put(storageUrl, networkResponse.clone());
          return networkResponse;
        });
      });
    });
  }