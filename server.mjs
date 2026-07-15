import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "4173", 10);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || host}`);
    const decodedPath = decodeURIComponent(requestUrl.pathname);
    const relativePath = decodedPath === "/" ? "index.html" : `.${decodedPath}`;
    let filePath = path.resolve(root, relativePath);

    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 500;
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "Not Found" : "Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`C1 科目一通关助手已启动：http://${host}:${port}`);
  console.log("按 Ctrl+C 停止服务");
});
