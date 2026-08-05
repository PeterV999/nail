const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { extname, join, normalize } = require("node:path");

const root = process.cwd();
const port = Number(process.env.PORT || 4177);

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
  if (pathname === "/" || pathname === "") return "index.html";
  if (pathname === "/admin" || pathname === "/admin/") return "admin/index.html";
  if (pathname.startsWith("/book/")) return "index.html";
  if (pathname.startsWith("/dashboard/")) return "owner.html";
  if (pathname === "/register" || pathname === "/register/") return "register.html";
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
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end(error.code === "ENOENT" ? "Not found" : "Server error");
  }
}).listen(port, () => {
  console.log(`Fah Nail dev server listening on http://localhost:${port}`);
});
