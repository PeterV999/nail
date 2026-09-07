const { readFileSync } = require("node:fs");

const baseUrl = normalizeBaseUrl(process.env.PRODUCTION_URL || "https://bookingnail.pages.dev");
const appConfigText = readFileSync("app-config.js", "utf8");
const serviceWorkerText = readFileSync("service-worker.js", "utf8");
const assetVersion = readConstant(appConfigText, "assetVersion");
const cacheVersion = readConstant(serviceWorkerText, "CACHE_VERSION");

const routes = [
  { path: "/", includes: ["home-preview", "BookingNail"] },
  { path: "/fah", includes: ["customer-title", "จองคิวทำเล็บ"] },
  { path: "/fah-owner/", includes: ["owner-auth-panel", "เข้าสู่ระบบหลังบ้าน"] },
  { path: "/demo-salon", includes: ["customer-title", "จองคิวทำเล็บ"] },
  { path: "/demo-salon-owner", includes: ["owner-auth-panel", "เข้าสู่ระบบหลังบ้าน"] },
  { path: "/register/", includes: ["register-panel", "สร้างหน้าจองคิวของร้าน"] },
  { path: "/admin/", includes: ["admin-auth-panel", "ศูนย์ดูแลร้าน"] },
  { path: "/privacy/", includes: ["นโยบายความเป็นส่วนตัว"] },
  { path: "/terms/", includes: ["ข้อตกลงการใช้งาน"] }
];

const staticFiles = [
  { path: `/app-config.js?v=${assetVersion}`, includes: [`assetVersion: "${assetVersion}"`] },
  { path: "/service-worker.js", includes: [`CACHE_VERSION = "${cacheVersion}"`, "notificationclick"] },
  { path: "/manifest.webmanifest", includes: ["BookingNail", "app-icon-192.png"] }
];

const legacyRoutes = [
  "/b/fah-nail",
  "/book/fah-nail",
  "/o/fah-nail",
  "/dashboard/fah-nail",
  "/owner.html"
];

async function main() {
  if (!assetVersion) throw new Error("Could not read assetVersion from app-config.js");
  if (!cacheVersion) throw new Error("Could not read CACHE_VERSION from service-worker.js");

  for (const route of routes) {
    await assertRoute(route);
  }
  for (const file of staticFiles) {
    await assertRoute(file);
  }
  for (const legacyRoute of legacyRoutes) {
    await assertLegacyRouteClosed(legacyRoute);
  }

  console.log(`Production health check passed for ${baseUrl}`);
  console.log(`Verified assetVersion ${assetVersion} and service worker ${cacheVersion}`);
}

async function assertRoute(route) {
  const response = await fetchUrl(route.path);
  if (!response.ok) {
    throw new Error(`${route.path} returned ${response.status}`);
  }

  const text = await response.text();
  const missing = route.includes.filter((snippet) => !text.includes(snippet));
  if (missing.length) {
    throw new Error(`${route.path} missing: ${missing.join(", ")}`);
  }

  console.log(`Production OK ${route.path}`);
}

async function assertLegacyRouteClosed(path) {
  const response = await fetchUrl(path, { redirect: "manual" });
  if (response.ok) {
    throw new Error(`${path} should be closed but returned ${response.status}`);
  }

  const status = response.status;
  if (status === 404 || status === 410 || (status >= 300 && status < 400)) {
    console.log(`Legacy route closed ${path} (${status})`);
    return;
  }

  throw new Error(`${path} returned unexpected status ${status}`);
}

async function fetchUrl(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: options.redirect || "follow",
    headers: {
      "User-Agent": "BookingNail production health check"
    }
  });
}

function readConstant(source, key) {
  const match = source.match(new RegExp(`${key}:?\\s*=\\s*["']([^"']+)["']|${key}:\\s*["']([^"']+)["']`));
  return match?.[1] || match?.[2] || "";
}

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
