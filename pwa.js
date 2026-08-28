const fahNailPwaIsLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
let fahNailPwaReloading = false;

function showFahNailUpdateBanner(message = "มีเวอร์ชันใหม่") {
  if (document.getElementById("pwa-update-banner")) return;

  const banner = document.createElement("button");
  banner.type = "button";
  banner.id = "pwa-update-banner";
  banner.textContent = `${message} แตะเพื่อรีเฟรช`;
  banner.addEventListener("click", () => window.FahNailPWA.clearCacheAndReload());
  document.body.append(banner);
}

async function clearFahNailCache() {
  const registrations = await navigator.serviceWorker?.getRegistrations?.() || [];
  await Promise.all(registrations.map((registration) => registration.update().catch(() => undefined)));

  const keys = await window.caches?.keys?.() || [];
  await Promise.all(keys
    .filter((key) => key.startsWith("fah-nail-") || key.startsWith("bookingnail-"))
    .map((key) => caches.delete(key)));
}

window.FahNailPWA = {
  clearCacheAndReload: async () => {
    await clearFahNailCache().catch(() => undefined);
    window.location.reload();
  }
};

if (fahNailPwaIsLocalPreview) {
  window.addEventListener("load", () => {
    navigator.serviceWorker?.getRegistrations?.()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);

    window.caches?.keys?.()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("fah-nail-") || key.startsWith("bookingnail-"))
        .map((key) => caches.delete(key))))
      .catch(() => undefined);
  });
} else if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then((registration) => {
        registration.update().catch(() => undefined);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              showFahNailUpdateBanner();
            }
          });
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (fahNailPwaReloading) return;
    fahNailPwaReloading = true;
    window.location.reload();
  });
}
