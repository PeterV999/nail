const { spawn } = require("node:child_process");
const { chromium } = require("./playwright-loader");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4191);
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
    await page.addInitScript(() => {
      const RealDate = Date;
      const fixedNow = new RealDate(2026, 7, 29, 15, 30, 0);
      class MockDate extends RealDate {
        constructor(...args) {
          super(...(args.length ? args : [fixedNow.getTime()]));
        }
        static now() {
          return fixedNow.getTime();
        }
      }
      MockDate.parse = RealDate.parse;
      MockDate.UTC = RealDate.UTC;
      window.Date = MockDate;
    });

    await page.route("**/app-config.js*", (route) => route.fulfill({
      contentType: "application/javascript",
      body: 'window.FAH_NAIL_CONFIG = { shopSlug: "fah-nail", assetVersion: "test" };'
    }));

    await page.goto(`${baseUrl}/fah`, { waitUntil: "networkidle" });

    await page.locator("#service-search").fill("ต่อ");
    const filteredServices = await page.locator(".service-choice").count();
    if (filteredServices !== 1) throw new Error(`Expected service search to narrow to 1 service, got ${filteredServices}`);
    await page.locator("#service-search").fill("ไม่มีบริการนี้");
    const emptySearchText = await page.locator(".service-choice-list .empty-state").textContent();
    if (!emptySearchText?.includes("ไม่พบบริการ")) throw new Error(`Expected service search empty state, got: ${emptySearchText}`);
    await page.locator("#service-search").fill("");

    const expiredSlots = await page.locator(".time-options .choice.expired").count();
    if (expiredSlots < 4) throw new Error(`Expected at least 4 expired slots, got ${expiredSlots}`);
    const expiredText = await page.locator(".time-options .choice.expired").first().textContent();
    if (!expiredText?.includes("เลยเวลา")) throw new Error(`Expected expired slot label, got: ${expiredText}`);

    await page.locator(".service-choice").nth(1).click();
    await page.locator(".service-choice").nth(2).click();
    await page.locator(".service-choice").nth(3).click();
    const selectedServices = await page.locator(".service-choice.active").count();
    if (selectedServices !== 4) throw new Error(`Expected 4 selected services, got ${selectedServices}`);

    await page.locator(".service-choice").nth(4).click();
    const cappedServices = await page.locator(".service-choice.active").count();
    if (cappedServices !== 4) throw new Error(`Service selection cap failed, got ${cappedServices}`);
    const serviceError = await page.locator("#service-error").textContent();
    if (!serviceError?.includes("4")) throw new Error(`Expected service limit error for 4 services, got: ${serviceError}`);

    const beforeDate = await page.locator("#booking-date-display").textContent();
    await page.locator(".date-quick-chip.available").nth(1).click();
    const afterQuickDate = await page.locator("#booking-date-display").textContent();
    if (beforeDate === afterQuickDate) throw new Error("Quick date did not update the selected date");

    await page.locator("#calendar-open-button").click();
    await page.locator("#calendar-sheet").waitFor({ state: "visible", timeout: 5000 });
    await page.locator(".calendar-day-cell.available:not(.active)").first().click();
    await page.locator("#calendar-confirm-button").click();
    await page.waitForFunction(() => !document.querySelector("#calendar-sheet")?.open);
    const afterCalendarDate = await page.locator("#booking-date-display").textContent();
    if (afterCalendarDate === afterQuickDate) throw new Error("Calendar sheet date did not update the selected date");

    await page.locator("#booking-next-button").click();
    await page.locator('input[name="customerName"]').fill("test01");
    await page.locator('input[name="contact"]').fill("09122");
    await page.locator("#booking-submit-button").click();
    const phoneError = await page.locator("#contact-phone-error").textContent();
    if (!phoneError?.includes("10")) throw new Error(`Expected 10 digit phone error, got: ${phoneError}`);
    const phoneErrorVisible = await page.locator("#contact-phone-error").isVisible();
    if (!phoneErrorVisible) throw new Error("Expected phone error to be visible for incomplete phone");

    await page.locator('input[name="contact"]').fill("0912223333");
    await page.locator('textarea[name="note"]').fill("automated flow");
    await page.locator("#privacy-consent").check();
    await page.locator("#booking-submit-button").click();

    await page.locator("#booking-success-dialog").waitFor({ state: "visible", timeout: 5000 });
    const summary = await page.locator("#booking-success-summary").textContent();
    if (!summary || !summary.includes(",")) throw new Error(`Expected selected services in summary, got: ${summary}`);

    console.log("Booking flow test passed: 4 services, quick date, calendar sheet, and submit success");
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
