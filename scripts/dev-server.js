const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { extname, join, normalize } = require("node:path");

const root = process.cwd();
const port = Number(process.env.PORT || 4177);
const host = process.env.HOST || "127.0.0.1";
const staticFilePattern = /\.[a-z0-9]+$/i;
const reservedRoutes = new Set(["admin", "assets", "privacy", "register", "terms"]);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function routePath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0] || "";
  if (pathname === "/" || pathname === "") return "index.html";
  if (pathname === "/fah") return "index.html";
  if (pathname === "/fah-owner") return "owner.html";
  if (pathname === "/admin" || pathname === "/admin/") return "admin/index.html";
  if (pathname.startsWith("/b/")) return "index.html";
  if (pathname.startsWith("/o/")) return "owner.html";
  if (pathname.startsWith("/book/")) return "index.html";
  if (pathname.startsWith("/dashboard/")) return "owner.html";
  if (pathname === "/register" || pathname === "/register/") return "register.html";
  if (pathname === "/privacy" || pathname === "/privacy/") return "privacy/index.html";
  if (pathname === "/terms" || pathname === "/terms/") return "terms/index.html";
  if (parts.length === 1 && first.endsWith("-owner")) return "owner.html";
  if (parts.length === 1 && first && !reservedRoutes.has(first) && !staticFilePattern.test(first)) return "index.html";
  return pathname.replace(/^\/+/, "");
}

function safePath(filePath) {
  const resolved = normalize(join(root, filePath));
  return resolved.startsWith(root) ? resolved : "";
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const filePath = safePath(routePath(url.pathname));
    if (!filePath) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end(error.code === "ENOENT" ? "Not found" : "Server error");
  }
}).listen(port, host, () => {
  console.log(`Fah Nail dev server listening on http://${host}:${port}`);
});
