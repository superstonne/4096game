/**
 * Service Worker for 4096 Game
 * Implements cache-first strategy for assets and network-first for HTML
 */

const CACHE_NAME = 'v1.0.0';
const RUNTIME_CACHE = 'runtime-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/style/main.css',
  '/style/fonts/clear-sans-optimized.css',
  '/style/fonts/ClearSans-Bold-webfont.woff',
  '/style/fonts/ClearSans-Regular-webfont.woff',
  '/style/fonts/ClearSans-Light-webfont.woff',
  '/js/bind_polyfill.js',
  '/js/classlist_polyfill.js',
  '/js/animframe_polyfill.js',
  '/js/keyboard_input_manager.js',
  '/js/html_actuator.js',
  '/js/grid.js',
  '/js/tile.js',
  '/js/local_storage_manager.js',
  '/js/game_manager.js',
  '/js/application.js',
  '/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // HTML requests: Network-first strategy
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((response) => {
            return response || caches.match('/');
          });
        })
    );
    return;
  }
  
  // Static assets: Cache-first strategy
  if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        });
      })
    );
    return;
  }
  
  // Default: Network-first for everything else
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});