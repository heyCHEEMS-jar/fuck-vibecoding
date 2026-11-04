"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { build, output } = require("./build");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".wav": "audio/wav",
  ".png": "image/png"
};

function safeFile(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(output, relative);
  return file === output || file.startsWith(output + path.sep) ? file : null;
}

function createServer() {
  return http.createServer((request, response) => {
    let file;
    try { file = safeFile(request.url); } catch (_) { file = null; }
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "Cross-Origin-Opener-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    });
    fs.createReadStream(file).pipe(response);
  });
}

function start() {
  build();
  const host = process.env.HOST || "127.0.0.1";
  const port = Number.parseInt(process.env.PORT || "4173", 10);
  const server = createServer();
  server.listen(port, host, () => {
    const address = server.address();
    console.log(`Worry Recycler preview: http://${host}:${address.port}`);
  });
  return server;
}

if (require.main === module) start();

module.exports = { createServer, start };
