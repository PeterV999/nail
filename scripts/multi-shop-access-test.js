const { spawn } = require("node:child_process");
const { chromium } = require("./playwright-loader");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4194);
const baseUrl = `http://${host}:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {
      await wait(250);
    }
  }
  throw new Error("Dev server did not start in time");
}

const mockAdapter = `
const shops = {
  "salon-a": { id: "shop-a", name: "Salon A", slug: "salon-a", status: "active", tagline: "ร้าน A" },
  "salon-b": { id: "shop-b", name: "Salon B", slug: "salon-b", status: "active", tagline: "ร้าน B" }
};

function routeShopSlug() {
  const first = window.location.pathname.split("/").filter(Boolean)[0] || "salon-a";
  if (first.endsWith("-owner")) return first.replace(/-owner$/, "");
  return first === "index.html" ? "salon-a" : first;
}

window.FahNailSupabase = {
  isConfigured: () => true,
  routeShopSlug,
  shopUrls: (slug) => ({
    booking: "/" + slug,
    dashboard: "/" + slug + "-owner",
    register: "/register"
  }),
  listPublicShops: async () => Object.values(shops),
  loadPublicState: async (defaultState) => ({
    ...defaultState,
    shop: shops[routeShopSlug()],
    services: [
      { id: "gel", name: "สีเจล " + routeShopSlug(), active: true },
      { id: "spa", name: "สปา " + routeShopSlug(), active: true }
    ],
    requests: [],
    appointments: []
  }),
  ownerSession: async () => {
    const slug = routeShopSlug();
    return {
      configured: true,
      session: { user: { id: "owner-a", email: "owner-a@example.com" } },
      user: { id: "owner-a", email: "owner-a@example.com" },
      member: slug === "salon-a" ? { shop_id: "shop-a", role: "owner" } : null
    };
  },
  listMemberShops: async () => [
    { id: "shop-a", name: "Salon A", slug: "salon-a", role: "owner" }
  ],
  loadOwnerState: async (defaultState) => {
    const slug = routeShopSlug();
    if (slug !== "salon-a") throw new Error("NO_SHOP_ACCESS");
    return {
      ...defaultState,
      shop: shops["salon-a"],
      requests: [],
      appointments: [{
        id: "appt-a",
        customerName: "ลูกค้าร้าน A เท่านั้น",
        contact: "0911111111",
        services: ["สีเจล"],
        bookingDate: "2026-08-29",
        timeWindow: "16:00-18:00",
        status: "confirmed",
        source: "manual"
      }],
      customers: [],
      closedDays: []
    };
  },
  listShopMembers: async () => [
    { userId: "owner-a", email: "owner-a@example.com", role: "owner" }
  ]
};
`;

async function main() {
  const server = spawn(process.execPath, ["scripts/dev-server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, HOST: host, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
      headless: true,
      args: ["--disable-features=MachPortRendezvous"]
    });

    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await page.route("**/app-config.js*", (route) => route.fulfill({
      contentType: "application/javascript",
      body: 'window.FAH_NAIL_CONFIG = { shopSlug: "salon-a", supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "test", assetVersion: "test" };'
    }));
    await page.route("**/supabase-adapter.js*", (route) => route.fulfill({
      contentType: "application/javascript",
      body: mockAdapter
    }));

    await page.goto(`${baseUrl}/salon-a`, { waitUntil: "networkidle" });
    await page.locator(".brand strong", { hasText: "Salon A" }).waitFor({ timeout: 5000 });
    const salonAText = await page.textContent("body");
    if (!salonAText.includes("สีเจล salon-a")) throw new Error("Salon A public page did not load Salon A services");
    if (salonAText.includes("Salon B")) throw new Error("Salon A public page leaked Salon B data");

    await page.goto(`${baseUrl}/salon-b`, { waitUntil: "networkidle" });
    await page.locator(".brand strong", { hasText: "Salon B" }).waitFor({ timeout: 5000 });
    const salonBText = await page.textContent("body");
    if (!salonBText.includes("สีเจล salon-b")) throw new Error("Salon B public page did not load Salon B services");
    if (salonBText.includes("Salon A")) throw new Error("Salon B public page leaked Salon A data");

    await page.goto(`${baseUrl}/salon-a-owner?real-login=1`, { waitUntil: "networkidle" });
    await page.locator("#owner-app").waitFor({ state: "visible", timeout: 5000 });
    const ownerAText = await page.textContent("body");
    if (!ownerAText.includes("ลูกค้าร้าน A เท่านั้น")) throw new Error("Salon A owner should see Salon A appointments");
    if (ownerAText.includes("Salon B")) throw new Error("Salon A owner page leaked Salon B data");

    await page.goto(`${baseUrl}/salon-b-owner?real-login=1`, { waitUntil: "networkidle" });
    await page.locator("#owner-auth-panel").waitFor({ state: "visible", timeout: 5000 });
    const ownerBText = await page.textContent("body");
    if (ownerBText.includes("ลูกค้าร้าน A เท่านั้น")) throw new Error("Unauthorized Salon B owner page leaked Salon A appointments");
    const ownerBAppVisible = await page.locator("#owner-app:not([hidden])").count();
    if (ownerBAppVisible) throw new Error("Unauthorized Salon B owner page should not show owner app");

    console.log("Multi-shop access test passed: shop routes stay isolated and unauthorized owner access is blocked");
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  if (server.exitCode && server.exitCode !== 0) {
    throw new Error(stderr || `Dev server exited with ${server.exitCode}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
