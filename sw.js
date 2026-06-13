const SHELL_CACHE = "falles360-shell-v32";
const RUNTIME_CACHE = "falles360-runtime-v32";
const APP_SHELL = [
  "./dist/",
  "./dist/index.html",
  "./dist/manifest.webmanifest",
  "./dist/icons/icon-192.png",
  "./dist/icons/icon-512.png",
  "./dist/icons/apple-touch-icon.png",
];

const ACTIVE_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

const isCacheableResponse = (response) => response && (response.ok || response.type === "opaque");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const shellAssets = await collectShellAssets();
      await cache.addAll(shellAssets);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ACTIVE_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(handleAssetRequest(event, request));
});

async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return (await caches.match("./dist/index.html")) || Response.error();
  }
}

async function handleAssetRequest(event, request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    event.waitUntil(updateRuntimeCache(request));
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.destination === "image") {
      return (await caches.match("./dist/icons/icon-192.png")) || Response.error();
    }
    return Response.error();
  }
}

async function updateRuntimeCache(request) {
  try {
    const response = await fetch(request);
    if (!isCacheableResponse(response)) {
      return;
    }

    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  } catch (error) {
    // Ignore refresh failures and keep serving the cached response.
  }
}

async function collectShellAssets() {
  try {
    const response = await fetch("./dist/index.html", { cache: "no-store" });
    const html = await response.text();
    const discoveredAssets = Array.from(
      html.matchAll(/(?:src|href)="([^"]+)"/g),
      (match) => match[1],
    )
      .filter((url) => !url.startsWith("http") && !url.startsWith("data:"))
      .map((url) => (url.startsWith("./") ? `./dist/${url.slice(2)}` : url));

    return [...new Set([...APP_SHELL, ...discoveredAssets])];
  } catch (error) {
    return APP_SHELL;
  }
}
