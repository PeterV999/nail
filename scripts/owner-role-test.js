const { spawn } = require("node:child_process");
const { chromium } = require("./playwright-loader");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4193);
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
window.FahNailSupabase = {
  isConfigured: () => true,
  ownerSession: async () => ({
    configured: true,
    session: { user: { email: "staff@example.com" } },
    user: { email: "staff@example.com" },
    member: { shop_id: "shop-1", role: "staff" }
  }),
  listMemberShops: async () => [
    { id: "shop-1", name: "Fah Nail", slug: "fah-nail", role: "staff" }
  ],
  listShopMembers: async () => [
    { userId: "staff-1", email: "staff@example.com", role: "staff" }
  ],
  loadOwnerState: async (defaultState) => ({
    ...defaultState,
    shop: {
      ...defaultState.shop,
      id: "shop-1",
      name: "Fah Nail",
      slug: "fah-nail",
      status: "active"
    },
    requests: [],
    appointments: [],
    customers: [],
    closedDays: []
  }),
  shopUrls: () => ({
    booking: "/fah",
    dashboard: "/fah-owner",
    register: "/register/"
  })
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
      body: 'window.FAH_NAIL_CONFIG = { shopSlug: "fah-nail", supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "test", assetVersion: "test" };'
    }));
    await page.route("**/supabase-adapter.js*", (route) => route.fulfill({
      contentType: "application/javascript",
      body: mockAdapter
    }));

    await page.goto(`${baseUrl}/fah-owner?real-login=1`, { waitUntil: "networkidle" });
    await page.locator("#owner-app").waitFor({ state: "visible", timeout: 5000 });

    const hiddenTabs = await page.evaluate(() => (
      ["settings", "shop", "team"].map((tab) => ({
        tab,
        hidden: document.querySelector(`[data-owner-tab="${tab}"]`)?.hidden ?? false
      }))
    ));
    const visibleRestrictedTab = hiddenTabs.find((item) => !item.hidden);
    if (visibleRestrictedTab) {
      throw new Error(`Staff should not see ${visibleRestrictedTab.tab} tab`);
    }

    const hiddenActions = await page.evaluate(() => (
      ["settings", "shop", "team"].map((tab) => ({
        tab,
        hidden: document.querySelector(`[data-owner-action-tab="${tab}"]`)?.hidden ?? false
      }))
    ));
    const visibleRestrictedAction = hiddenActions.find((item) => !item.hidden);
    if (visibleRestrictedAction) {
      throw new Error(`Staff should not see ${visibleRestrictedAction.tab} shortcut`);
    }

    const visibleDailyTabs = await page.evaluate(() => (
      ["queue", "calendar", "manual"].every((tab) => {
        const element = document.querySelector(`[data-owner-tab="${tab}"]`);
        return element && !element.hidden;
      })
    ));
    if (!visibleDailyTabs) throw new Error("Staff should still see daily queue tabs");

    const bodyLimited = await page.locator("body.owner-role-limited").count();
    if (!bodyLimited) throw new Error("Staff session should use limited owner UI");

    const manualControlsEnabled = await page.evaluate(() => (
      Array.from(document.querySelectorAll("#manual-form input, #manual-form select, #manual-form textarea, #manual-form button"))
        .every((control) => !control.disabled)
    ));
    if (!manualControlsEnabled) throw new Error("Staff should be able to use manual queue form");

    const restrictedControlsDisabled = await page.evaluate(() => (
      [
        ...document.querySelectorAll("#team-form input, #team-form select, #team-form textarea, #team-form button"),
        ...document.querySelectorAll("#shop-form input, #shop-form select, #shop-form textarea, #shop-form button"),
        ...document.querySelectorAll("#service-form input, #service-form select, #service-form textarea, #service-form button"),
        ...document.querySelectorAll("#slot-form input, #slot-form select, #slot-form textarea, #slot-form button")
      ].every((control) => control.disabled)
    ));
    if (!restrictedControlsDisabled) throw new Error("Staff should not be able to edit team, shop, services, or time slots");

    await page.evaluate(() => window.location.hash = "#team");
    await page.waitForTimeout(200);
    const teamPanelVisible = await page.locator('#owner-panel-team:not([hidden])').count();
    if (teamPanelVisible) throw new Error("Staff should not be able to open team panel with a direct hash");

    console.log("Owner role test passed: staff sees daily queue tools only and restricted controls stay locked");
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
