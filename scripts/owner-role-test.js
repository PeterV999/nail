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
    await page.locator("#owner-fast-lane-title", { hasText: "สิ่งที่ต้องทำต่อ" }).waitFor({ timeout: 5000 });
    const fastLaneText = await page.locator("#owner-fast-lane-list").textContent();
    if (!fastLaneText?.includes("วันนี้ยังโล่ง")) throw new Error(`Expected fast lane empty state, got: ${fastLaneText}`);

    const lockedTabs = await page.evaluate(() => (
      ["settings", "shop", "team"].every((tab) => {
        const element = document.querySelector(`[data-owner-tab="${tab}"]`);
        return element && element.classList.contains("is-locked") && element.getAttribute("aria-disabled") === "true";
      })
    ));
    if (!lockedTabs) throw new Error("Staff restricted tabs should stay visible in the DOM as locked controls");

    const lockedActions = await page.evaluate(() => (
      ["settings", "shop", "team"].every((tab) => {
        const element = document.querySelector(`#owner-add-menu [data-owner-action-tab="${tab}"]`);
        return element && element.classList.contains("is-locked") && element.getAttribute("aria-disabled") === "true";
      })
    ));
    if (!lockedActions) throw new Error("Staff restricted plus-menu actions should stay visible as locked controls");

    const mobileSettingsVisible = await page.locator('[data-owner-tab="settings"]').evaluate((element) => (
      window.getComputedStyle(element).display !== "none"
    ));
    if (mobileSettingsVisible) throw new Error("Mobile staff navigation should not show the More/settings tab");

    await page.locator("#owner-add-toggle").click();
    const mobilePlusItems = await page.locator("#owner-add-menu [data-owner-action-tab]").evaluateAll((items) => (
      items
        .filter((item) => window.getComputedStyle(item).display !== "none")
        .map((item) => item.dataset.ownerActionTab)
    ));
    if (mobilePlusItems.join(",") !== "manual,settings,shop,team") {
      throw new Error(`Mobile plus menu should show 4 actions, got: ${mobilePlusItems.join(",")}`);
    }
    await page.locator('#owner-add-menu [data-owner-action-tab="settings"]').click();
    await page.locator("#owner-dialog").waitFor({ state: "visible", timeout: 5000 });
    const mobileDialog = await page.locator("#owner-dialog-message").textContent();
    if (!mobileDialog?.includes("บัญชีทีมงาน")) throw new Error(`Expected mobile restricted popup, got: ${mobileDialog}`);
    await page.locator("#owner-dialog-cancel").click();

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.locator("#owner-add-toggle").click();
    const desktopPlusItems = await page.locator("#owner-add-menu [data-owner-action-tab]").evaluateAll((items) => (
      items
        .filter((item) => window.getComputedStyle(item).display !== "none")
        .map((item) => item.dataset.ownerActionTab)
    ));
    if (desktopPlusItems.join(",") !== "manual") {
      throw new Error(`Desktop plus menu should show manual only, got: ${desktopPlusItems.join(",")}`);
    }
    await page.locator("#owner-add-toggle").click();
    await page.locator('[data-owner-tab="settings"]').click();
    await page.locator("#owner-dialog").waitFor({ state: "visible", timeout: 5000 });
    const desktopDialog = await page.locator("#owner-dialog-message").textContent();
    if (!desktopDialog?.includes("บัญชีทีมงาน")) throw new Error(`Expected desktop restricted popup, got: ${desktopDialog}`);
    await page.locator("#owner-dialog-cancel").click();

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

    console.log("Owner role test passed: staff sees locked controls, gets restricted popups, and editing stays locked");
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
