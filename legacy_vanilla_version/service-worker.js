
const CACHE_NAME = 'g-network-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/chat.html',
    '/explore.html',
    '/profile.html',
    '/login.html',
    '/signup.html',
    '/css/style.css',
    '/css/social.css',
    '/css/whatsapp.css',
    '/css/components.css',
    '/css/call.css',
    '/js/firebase-compat.js',
    '/js/auth-guard.js',
    '/js/config.js',
    '/js/pwa-install.js',
    '/images/default-avatar.png',
    '/manifest.json'
];

// Install Event: Cache Core Assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting(); // Force activation
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Clearing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Smart Strategies
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. API Calls: Network Only (Never cache)
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
        return;
    }

    // 2. HTML Pages: Network First (Freshness priority), Fallback to Cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request)
                        .then((response) => {
                            if (response) return response;
                            // Fallback to offline page usually, but here index.html
                            return caches.match('/index.html');
                        });
                })
        );
        return;
    }

    // 3. Static Assets (JS/CSS): Stale-While-Revalidate
    // Serve from cache immediately, then update cache from network
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Update cache if valid
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            });

            // Return cached response if found, otherwise wait for network
            return cachedResponse || fetchPromise;
        })
    );
});
