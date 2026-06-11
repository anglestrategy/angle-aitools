// Mimics GitHub Pages locally: serves ./out under the /angle-aitools base
// path, with trailing-slash index resolution and 404.html fallback.
import http from "http";
import fs from "fs";
import path from "path";

const ROOT = path.resolve("./out");
const BASE = "/angle-aitools";
const PORT = process.env.PORT ? Number(process.env.PORT) : 3200;

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let rel = url.startsWith(BASE) ? url.slice(BASE.length) : null;
    if (rel === null) {
      res.writeHead(404).end("outside base path");
      return;
    }
    if (rel === "" || rel === "/") rel = "/index.html";
    let file = path.join(ROOT, rel);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      const fourOhFour = path.join(ROOT, "404.html");
      res.writeHead(404, { "content-type": "text/html" });
      res.end(fs.existsSync(fourOhFour) ? fs.readFileSync(fourOhFour) : "not found");
      return;
    }
    res.writeHead(200, { "content-type": mime[path.extname(file)] ?? "application/octet-stream" });
    res.end(fs.readFileSync(file));
  })
  .listen(PORT, () => console.log(`gh-pages mimic on http://localhost:${PORT}${BASE}/`));
