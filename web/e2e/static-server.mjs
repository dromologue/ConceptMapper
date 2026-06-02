// Minimal static file server for the built SPA (web/dist), used by Playwright's
// webServer. The e2e suite drives the *production build* — the same bundle the
// native shells embed — not the dev server (which the project forbids). SPA
// routes fall back to index.html.
import http from "http";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, "..", "dist");
const PORT = Number(process.env.E2E_PORT) || 4178;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(DIST, p);
  try {
    const data = readFileSync(fp);
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  } catch {
    try {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(readFileSync(path.join(DIST, "index.html")));
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  }
});

server.listen(PORT, () => console.log(`[e2e] serving ${DIST} on http://localhost:${PORT}`));
