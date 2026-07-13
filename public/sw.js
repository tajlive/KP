/**
 * Klarpakke Service Worker
 * PWA offline-støtte for dashboard og kritiske ruter
 * Cache-strategi: Network first, fallback til cache
 */

const CACHE_VERSION = "6"; // Bumped 2026-07-14: Individuell asset-caching, robust feilhåndtering
const CACHE_NAME = `klarpakke-v${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/no/handel",
  "/en/handel",
  "/offline.html",
  "/manifest.json",
  "/logo.svg",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const OFFLINE_URL = "/offline.html";

/**
 * Sjekk om URL er en navigate request (HTML-side)
 */
function isNavigateRequest(request) {
  return request.mode === "navigate";
}

/**
 * Sjekk om URL er et statisk asset fra Next.js
 */
function isNextStatic(url) {
  return url.pathname.startsWith("/_next/static/");
}

/**
 * Sjekk om URL er et eksternt kall (Supabase, Binance, etc.)
 */
function isExternalUrl(url) {
  return url.hostname !== self.location.hostname;
}

/**
 * Sjekk om URL er et RSC (React Server Component) kall
 */
function isRscRequest(url) {
  return url.searchParams.has("_rsc");
}

/**
 * Sjekk om URL er API-kall
 */
function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/");
}

// Installer service worker og cache statiske assets individuelt
// Bruker individuell caching slik at én feil ikke blokkerer resten
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[SW] Caching static assets");
      const results = await Promise.allSettled(
        STATIC_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok || response.type === "opaqueredirect" || response.redirected) {
              console.warn("[SW] Skipping", url, "— status", response.status, "type", response.type);
              return;
            }
            await cache.put(url, response);
          } catch (err) {
            console.warn("[SW] Skipping", url, "—", err instanceof Error ? err.message : err);
          }
        })
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      console.log(`[SW] Cached ${ok}/${results.length} assets`);
    })
  );

  self.skipWaiting();
});

// Aktiver og rydd opp i gamle caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );

  self.clients.claim();
});

// Fetch-håndtering
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ikke håndter ikke-GET forespørsler
  if (request.method !== "GET") {
    return;
  }

  // Hopp over eksterne kall (Supabase, Binance) — de ødelegger response.clone()
  if (isExternalUrl(url)) {
    return;
  }

  // Hopp over RSC requests — Next.js håndterer de selv
  if (isRscRequest(url)) {
    return;
  }

  // API-kall: Network-first med timeout, fallback til cache
  if (isApiRequest(url)) {
    event.respondWith(networkFirstWithTimeout(request, 3000));
    return;
  }

  // Next.js static assets: Cache-first
  if (isNextStatic(url)) {
    event.respondWith(cacheFirstWithNetwork(request));
    return;
  }

  // HTML-navigasjon: Network-first med offline-fallback
  if (isNavigateRequest(request)) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Standard: Network first
  event.respondWith(networkFirstWithCache(request));
});

async function cacheResponse(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch {
    // Ignorer cache-feil for ikke-clonbare responses
  }
}

/**
 * Network-first med timeout
 */
async function networkFirstWithTimeout(request, timeoutMs) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Network timeout")), timeoutMs);
  });

  try {
    const networkResponse = await Promise.race([
      fetch(request),
      timeoutPromise,
    ]);

    if (networkResponse.ok) {
      cacheResponse(request, networkResponse);
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Cache-first med network update
 */
async function cacheFirstWithNetwork(request) {
  const cachedResponse = await caches.match(request);

  const networkFetch = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cacheResponse(request, networkResponse);
      }
      return networkResponse;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkFetch;
  if (networkResponse) {
    return networkResponse;
  }

  throw new Error("Resource not available offline");
}

/**
 * Network-first med offline fallback (kun for navigate requests)
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cacheResponse(request, networkResponse);
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Returner offline-side for HTML-navigasjon
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }

    throw error;
  }
}

/**
 * Network-first strategi: Prøv network først, fallback til cache
 */
async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cacheResponse(request, networkResponse);
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}
