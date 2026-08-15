const { spawn } = require("node:child_process");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4188);
const baseUrl = `http://${host}:${port}`;

const routes = [
  { path: "/", includes: ["home-preview", "BookingNail"] },
  { path: "/fah", includes: ["customer-title", "จองคิวทำเล็บ"] },
  { path: "/fah-owner", includes: ["owner-auth-panel", "เข้าสู่ระบบหลังบ้าน"] },
  { path: "/privacy", includes: ["นโยบายความเป็นส่วนตัว"] },
  { path: "/terms", includes: ["ข้อตกลงการใช้งาน"] },
  { path: "/admin/", includes: ["admin-auth-panel", "ศูนย์ดูแลร้าน"] },
];

const legacyRoutes = [
  "/demo-shop",
  "/demo-shop-owner",
  "/b/fah-nail",
  "/o/fah-nail",
  "/book/fah-nail",
  "/dashboard/fah-nail"
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {
      await wait(250);
    }
  }
  throw new Error("Dev server did not start in time");
}

async function assertRoute(route) {
  const response = await fetch(`${baseUrl}${route.path}`);
  if (!response.ok) throw new Error(`${route.path} returned ${response.status}`);
  const html = await response.text();
  const missing = route.includes.filter((text) => !html.includes(text));
  if (missing.length) {
    throw new Error(`${route.path} missing: ${missing.join(", ")}`);
  }
}

async function assertLegacyRouteClosed(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (response.ok) throw new Error(`${path} should be closed but returned ${response.status}`);
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

  try {
    await waitForServer();
    for (const route of routes) {
      await assertRoute(route);
    }
    for (const legacyRoute of legacyRoutes) {
      await assertLegacyRouteClosed(legacyRoute);
    }
    console.log(`Smoke test passed for ${routes.length} routes and ${legacyRoutes.length} closed legacy routes`);
  } finally {
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
