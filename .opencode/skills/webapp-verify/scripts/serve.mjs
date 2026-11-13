#!/usr/bin/env node
/**
 * Minimal static server for previewing the app locally.
 *
 *   node .opencode/skills/webapp-verify/scripts/serve.mjs [port]
 *
 * Serves public/ (the built single-file app) and binds to 127.0.0.1 only.
 * Run `npm run build` first. No dependencies, no file watching.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const WEB_ROOT = path.join(ROOT, "public");
const PORT = Number(process.argv[2] || 8099);

if (!fs.existsSync(path.join(WEB_ROOT, "index.html"))) {
  console.error("public/index.html not found — run `npm run build` first.");
  process.exit(1);
}
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/favicon.ico") {
      res.writeHead(204).end();
      return;
    }
    const file = path.resolve(WEB_ROOT, urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, ""));
    if (file !== WEB_ROOT && !file.startsWith(WEB_ROOT + path.sep)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404, { "content-type": "text/plain" }).end("not found");
        return;
      }
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }).end(body);
    });
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`Flip Clock Radio: http://127.0.0.1:${PORT}/  (Ctrl+C to stop)`);
  });
