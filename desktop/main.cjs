const { app, BrowserWindow, net, protocol, session } = require("electron");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const APP_ID = "com.local.c1kemuyi.assistant";
const APP_HOST = "c1";
const APP_ORIGIN = `app://${APP_HOST}`;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

app.setAppUserModelId(APP_ID);
app.setPath("userData", path.join(app.getPath("appData"), "C1KemuyiAssistant"));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.whenReady().then(async () => {
    await registerAppProtocol();
    lockDownNetwork();
    createMainWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

async function registerAppProtocol() {
  const root = app.getAppPath();
  protocol.handle("app", async (request) => {
    try {
      const requestUrl = new URL(request.url);
      if (requestUrl.hostname !== APP_HOST) return textResponse("Not Found", 404);

      const decodedPath = decodeURIComponent(requestUrl.pathname);
      const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
      const filePath = path.resolve(root, relativePath);
      if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
        return textResponse("Forbidden", 403);
      }

      const body = await readFile(filePath);
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": contentType(filePath),
          "Cache-Control": app.isPackaged ? "public, max-age=31536000, immutable" : "no-cache"
        }
      });
    } catch (error) {
      return textResponse(error?.code === "ENOENT" ? "Not Found" : "Internal Error", error?.code === "ENOENT" ? 404 : 500);
    }
  });
}

function createMainWindow() {
  const window = new BrowserWindow({
    title: "C1 手动挡科目一通关助手",
    width: 1280,
    height: 820,
    minWidth: 320,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f5f5f5",
    icon: path.join(app.getAppPath(), "build", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) event.preventDefault();
  });
  window.once("ready-to-show", () => window.show());
  window.loadURL(APP_ORIGIN);
}

function lockDownNetwork() {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["http://*/*", "https://*/*"] },
    (_details, callback) => callback({ cancel: true })
  );
}

function contentType(filePath) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon"
  };
  return types[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function textResponse(message, status) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
