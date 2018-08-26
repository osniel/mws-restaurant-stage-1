var staticCacheName = 'site-static';
var contentImgsCache = 'site-content-imgs';
var otherCacheName = 'site-other';
var allCaches = [
  staticCacheName,
  contentImgsCache,
  otherCacheName
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

self.addEventListener('sync', function (event) {
  console.log(event);
  if (event.tag === 'reviews-post') {
    console.log('sync fired');
  }
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
        event.respondWith(caches.match('/').then(response => {
          response.headers.append('Cache-Control', 'max-age=31536000');
          return response;
        }));
        return;
      }
      if (requestUrl.pathname === '/restaurant.html') {
        event.respondWith(caches.match('/restaurant.html', {
          ignoreSearch : true
        }));
        return;
      }
      if (requestUrl.pathname.startsWith('/img/')) {
        event.respondWith(servePhoto(event.request));
        return;
      }
    }
  
    var fetchRequest = event.request.clone();
    event.respondWith(serveRequest(fetchRequest));
  });

  function serveRequest(request) {
    var requestUrl = new URL(request.url);
  
    return caches.open(otherCacheName).then(function(cache) {
      return cache.match(requestUrl).then(function(response) {
        if (response) {
          response.headers.append('Cache-Control', 'max-age=31536000');
          return response;
        }
  
        return fetch(request).then(function(networkResponse) {
          cache.put(requestUrl, networkResponse.clone());
          return networkResponse;
        });
      });
    });
  }

  function servePhoto(request) {
    var storageUrl = request.url.replace(/-\d+px\.jpg$/, '');
  
    return caches.open(contentImgsCache).then(function(cache) {
      return cache.match(storageUrl).then(function(response) {
        if (response) {
          response.headers.append('Cache-Control', 'max-age=31536000');
          return response;
        }
  
        return fetch(request).then(function(networkResponse) {
          cache.put(storageUrl, networkResponse.clone());
          return networkResponse;
        });
      });
    });
  }