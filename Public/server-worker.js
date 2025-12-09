// Service Worker for Royal Pomodoro
const CACHE_NAME = 'royal-pomodoro-v2';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/service-worker.js',
  
  // CSS Files
  '/src/css/main.css',
  '/src/css/timer.css',
  '/src/css/dashboard.css',
  '/src/css/modal.css',
  '/src/css/responsive.css',
  
  // JavaScript Files
  '/src/js/utils.js',
  '/src/js/storage.js',
  '/src/js/sounds.js',
  '/src/js/notifications.js',
  '/src/js/timer.js',
  '/src/js/tasks.js',
  '/src/js/analytics.js',
  '/src/js/ui.js',
  '/src/js/app.js',
  
  // Fonts and Icons
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  
  // External Libraries
  'https://cdn.jsdelivr.net/npm/chart.js',
  
  // Fallback assets
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // For all other requests, try cache first
  event.respondWith(cacheFirst(event.request));
});

// Cache First strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('Service Worker: Serving from cache', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Don't cache non-successful responses
    if (!networkResponse || networkResponse.status !== 200) {
      return networkResponse;
    }
    
    // Clone and cache the response
    const responseToCache = networkResponse.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, responseToCache);
    
    console.log('Service Worker: Caching new resource', request.url);
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, serving fallback', error);
    
    // Return a fallback response
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    return new Response('Network error happened', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network First strategy for API calls
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful API responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for API, trying cache');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return fallback for API
    return new Response(JSON.stringify({
      error: 'Network unavailable',
      cached: true,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-sessions') {
    console.log('Service Worker: Background sync for sessions');
    event.waitUntil(syncSessions());
  }
});

async function syncSessions() {
  try {
    // Get pending sessions from IndexedDB or localStorage
    // Sync with server when online
    console.log('Service Worker: Syncing sessions...');
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');
  
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Royal Pomodoro Notification',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Royal Pomodoro', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        for (const client of windowClients) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
    );
  }
});

// Periodic sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-cache') {
      console.log('Service Worker: Periodic sync triggered');
      event.waitUntil(updateCache());
    }
  });
}

async function updateCache() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  for (const request of requests) {
    // Skip external resources
    if (!request.url.startsWith(self.location.origin)) continue;
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.status === 200) {
        await cache.put(request, networkResponse);
        console.log('Service Worker: Updated cache for', request.url);
      }
    } catch (error) {
      console.log('Service Worker: Failed to update cache for', request.url, error);
    }
  }
}

// Handle messages from the main thread
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_ASSET') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.add(event.data.url))
    );
  }
});
