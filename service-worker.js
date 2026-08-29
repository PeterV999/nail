const CACHE_VERSION = "v61";
const STATIC_CACHE = `bookingnail-static-${CACHE_VERSION}`;
const PAGE_CACHE = `bookingnail-pages-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/styles.css",
  "/app-config.js",
  "/supabase-adapter.js",
  "/theme.js",
  "/customer.js",
  "/owner.js",
  "/owner-utils.js",
  "/register.js",
  "/admin.js",
  "/pwa.js",
  "/manifest.webmanifest",
  "/assets/bookingnail-icononly-pastel.png",
  "/assets/fah-nail-logo.png",
  "/assets/sea-nail-mascot.svg",
  "/assets/queue-shell-mascot.svg",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png"
];

const PAGE_ROUTES = [
  "/",
  "/index.html",
  "/fah-owner/index.html",
  "/privacy",
  "/privacy/index.html",
  "/terms",
  "/terms/index.html",
  "/register",
  "/register/",
  "/register/index.html",
  "/admin/",
  "/fah",
  "/fah-owner"
];

const OFFLINE_HTML = `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#FFDCDC">
    <title>ออฟไลน์ | BookingNail</title>
    <style>
      :root { color-scheme: light; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; color: #3f2a35; background: #fff2eb; }
      main { max-width: 420px; padding: 24px; border: 1px solid #bceaf0; border-radius: 20px; background: #fff; box-shadow: 0 20px 44px rgba(8, 127, 150, .16); }
      h1 { margin: 0 0 10px; font-size: 1.4rem; line-height: 1.25; }
      p { margin: 0; color: #637789; line-height: 1.7; }
      button { margin-top: 18px; width: 100%; min-height: 44px; border: 0; border-radius: 14px; color: #fff; background: #d85f7c; font-weight: 800; }
    </style>
  </head>
  <body>
    <main>
      <h1>ยังเปิดหน้านี้แบบออฟไลน์ไม่ได้</h1>
      <p>ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง ข้อมูลจองและหลังบ้านต้องเชื่อมต่อกับฐานข้อมูลเพื่อแสดงผลล่าสุด</p>
      <button type="button" onclick="location.reload()">ลองใหม่</button>
    </main>
  </body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cacheRequests(cache, STATIC_ASSETS)),
      caches.open(PAGE_CACHE).then((cache) => cacheRequests(cache, PAGE_ROUTES))
    ]).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const allowedCaches = new Set([STATIC_CACHE, PAGE_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => !allowedCaches.has(key))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || "/assets/app-icon-192.png",
    badge: "/assets/app-icon-192.png",
    data: { url: payload.url || "/fah-owner" },
    tag: payload.tag || "bookingnail-reminder",
    renotify: true
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/fah-owner", self.location.origin).href;
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existingClient = clientList.find((client) => client.url === targetUrl);
    if (existingClient) return existingClient.focus();
    return clients.openWindow(targetUrl);
  })());
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    return new Response(OFFLINE_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheRequests(cache, urls) {
  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    } catch {
      // Some pretty URLs are provided by Cloudflare redirects and may not exist in local static dev.
    }
  }));
}

function readPushPayload(event) {
  const fallback = {
    title: "BookingNail",
    body: "มีรายการใหม่ในหลังบ้าน",
    url: "/fah-owner"
  };

  if (!event.data) return fallback;

  try {
    return { ...fallback, ...event.data.json() };
  } catch {
    return { ...fallback, body: event.data.text() || fallback.body };
  }
}
