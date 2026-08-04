import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "127.0.0.1";
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(root, relativePath);
    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) return send(response, 403, "Forbidden");

    const info = await stat(filePath);
    if (!info.isFile()) return send(response, 404, "Not Found");
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") return response.end();
    createReadStream(filePath).pipe(response);
  } catch (error) {
    send(response, error?.code === "ENOENT" ? 404 : 500, error?.code === "ENOENT" ? "Not Found" : "Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`C1 科目一通关助手已启动：http://${host}:${port}`);
});

function send(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}
