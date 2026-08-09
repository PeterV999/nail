const fahNailPwaIsLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);

if (fahNailPwaIsLocalPreview) {
  window.addEventListener("load", () => {
    navigator.serviceWorker?.getRegistrations?.()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);

    window.caches?.keys?.()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("fah-nail-"))
        .map((key) => caches.delete(key))))
      .catch(() => undefined);
  });
} else if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
