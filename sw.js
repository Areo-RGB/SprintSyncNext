const CACHE_NAME = 'sprintsync-v2';
const STATIC_CACHE = 'sprintsync-static-v2';
const DYNAMIC_CACHE = 'sprintsync-dynamic-v2';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/_next/static/css/',
  '/android-launchericon-192-192.png',
  '/android-launchericon-512-512.png',
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  self.clients.claim();
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Clearing old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests (except for images and fonts)
  if (url.origin !== location.origin && 
      !url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|woff|woff2|ttf|eot)$/)) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Strategy 1: Cache First for static assets
  if (url.pathname.includes('/_next/static/') || 
      url.pathname.includes('/android-launchericon') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.woff2')) {
    
    return cacheFirst(request, STATIC_CACHE);
  }
  
  // Strategy 2: Network First for API requests
  if (url.pathname.includes('/api/')) {
    return networkFirst(request, DYNAMIC_CACHE);
  }
  
  // Strategy 3: Stale While Revalidate for pages and dynamic content
  return staleWhileRevalidate(request, DYNAMIC_CACHE);
}

// Cache First strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    // Return cached version immediately
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Network request failed:', error);
    
    // For navigation requests, return cached index page
    if (request.mode === 'navigate') {
      return cache.match('/') || new Response('Offline', { 
        status: 503, 
        statusText: 'Service Unavailable' 
      });
    }
    
    throw error;
  }
}

// Network First strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Network request failed:', error);
    
    // Return cached version if available
    if (cached) {
      return cached;
    }
    
    // For navigation requests, return cached index page
    if (request.mode === 'navigate') {
      return cache.match('/') || new Response('Offline', { 
        status: 503, 
        statusText: 'Service Unavailable' 
      });
    }
    
    throw error;
  }
}

// Stale While Revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Always try to fetch in background
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(error => {
      console.error('Background fetch failed:', error);
      return cached || new Response('Offline', { 
        status: 503, 
        statusText: 'Service Unavailable' 
      });
    });
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // Otherwise wait for network
  return fetchPromise;
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle background sync tasks here
  console.log('Background sync triggered');
}

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from SprintSync',
    icon: '/android-launchericon-192-192.png',
    badge: '/android-launchericon-96-96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open SprintSync',
        icon: '/android-launchericon-96-96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/android-launchericon-96-96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SprintSync', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});