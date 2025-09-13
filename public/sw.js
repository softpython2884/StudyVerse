// A basic service worker for PWA functionality and offline caching

const CACHE_NAME = 'studyverse-cache-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/globals.css', // Caching main styles
  // We can't easily cache Next.js chunks as their names are hashed.
  // The service worker will cache them dynamically as they are requested.
];

// Install event: opens a cache and adds main assets to it.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell', error);
      })
  );
});

// Activate event: clean up old caches.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: serve cached content when offline.
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request)
        .then((response) => {
          // If we have a match in the cache, return it.
          if (response) {
            // Fetch a fresh version in the background for next time.
            fetch(event.request).then((networkResponse) => {
              cache.put(event.request, networkResponse.clone());
            });
            return response;
          }

          // If no match, fetch from the network.
          return fetch(event.request).then((networkResponse) => {
            // Cache the new response for future use.
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // If both cache and network fail (e.g., offline and not in cache),
          // you could return a fallback page here if you had one.
          // For now, we just let the browser handle the error.
        });
    })
  );
});
