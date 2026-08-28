const { mkdir } = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { join } = require("node:path");
const { chromium } = require("./playwright-loader");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4192);
const baseUrl = `http://${host}:${port}`;
const outputDir = join(process.cwd(), "test-artifacts", "screenshots");

const pages = [
  { path: "/", name: "home", check: "BookingNail" },
  { path: "/fah", name: "customer", check: "จองคิวทำเล็บ" },
  { path: "/fah-owner", name: "owner", check: "ศูนย์จัดการคิววันนี้" },
  { path: "/admin/", name: "admin", check: "ศูนย์ดูแลร้าน" },
  { path: "/register", name: "register", check: "สร้างหน้าจองคิวของร้าน" }
];

const devices = [
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true },
  { name: "ipad", viewport: { width: 820, height: 1180 }, isMobile: true }
];

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

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  if (overflow > 4) throw new Error(`${label} has horizontal overflow: ${overflow}px`);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
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

    for (const device of devices) {
      const context = await browser.newContext({
        viewport: device.viewport,
        isMobile: device.isMobile,
        deviceScaleFactor: 1
      });
      const page = await context.newPage();
      await page.route("**/app-config.js*", (route) => route.fulfill({
        contentType: "application/javascript",
        body: 'window.FAH_NAIL_CONFIG = { shopSlug: "fah-nail", assetVersion: "test" };'
      }));

      for (const target of pages) {
        const label = `${device.name}-${target.name}`;
        await page.goto(`${baseUrl}${target.path}`, { waitUntil: "networkidle" });
        const html = await page.content();
        if (!html.includes(target.check)) throw new Error(`${label} missing ${target.check}`);
        await assertNoHorizontalOverflow(page, label);
        await page.screenshot({
          path: join(outputDir, `${label}.png`),
          fullPage: true
        });
        console.log(`Screenshot OK ${label}`);
      }

      await context.close();
    }
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
