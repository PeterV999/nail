const { spawn } = require("node:child_process");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is required for this test. Install it or run with NODE_PATH pointing to a Playwright bundle.");
  process.exit(1);
}

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
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });

    await page.route("**/app-config.js*", (route) => route.fulfill({
      contentType: "application/javascript",
      body: 'window.FAH_NAIL_CONFIG = { shopSlug: "fah-nail", assetVersion: "test" };'
    }));

    await page.goto(`${baseUrl}/fah`, { waitUntil: "networkidle" });

    await page.locator(".service-choice").nth(1).click();
    const selectedServices = await page.locator(".service-choice.active").count();
    if (selectedServices !== 2) throw new Error(`Expected 2 selected services, got ${selectedServices}`);

    await page.locator(".service-choice").nth(2).click();
    const cappedServices = await page.locator(".service-choice.active").count();
    if (cappedServices !== 2) throw new Error(`Service selection cap failed, got ${cappedServices}`);

    const beforeDate = await page.locator("#booking-date-display").textContent();
    await page.locator(".date-quick-chip").nth(1).click();
    const afterDate = await page.locator("#booking-date-display").textContent();
    if (beforeDate === afterDate) throw new Error("Quick date did not update the selected date");

    await page.locator("#booking-next-button").click();
    await page.locator('input[name="customerName"]').fill("test01");
    await page.locator('input[name="contact"]').fill("0912223333");
    await page.locator('textarea[name="note"]').fill("automated flow");
    await page.locator("#privacy-consent").check();
    await page.locator("#booking-submit-button").click();

    await page.locator("#booking-success-dialog").waitFor({ state: "visible", timeout: 5000 });
    const summary = await page.locator("#booking-success-summary").textContent();
    if (!summary || !summary.includes(",")) throw new Error(`Expected two services in summary, got: ${summary}`);

    console.log("Booking flow test passed: 2 services, quick date, and submit success");
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
