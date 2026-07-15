import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const main = await readFile(path.join(root, "desktop", "main.cjs"), "utf8");
const html = await readFile(path.join(root, "index.html"), "utf8");

assert.equal(packageJson.main, "desktop/main.cjs");
assert.equal(packageJson.devDependencies.electron, "43.0.0");
assert.equal(packageJson.devDependencies["electron-builder"], "26.15.3");
assert.equal(packageJson.build.appId, "com.local.c1kemuyi.assistant");
assert.equal(packageJson.build.nsis.perMachine, false);
assert.equal(packageJson.build.nsis.deleteAppDataOnUninstall, false);
assert.match(main, /contextIsolation:\s*true/);
assert.match(main, /nodeIntegration:\s*false/);
assert.match(main, /sandbox:\s*true/);
assert.match(main, /setWindowOpenHandler\(\(\) => \(\{ action: "deny" \}\)\)/);
assert.match(main, /http:\/\/\*\/\*/);
assert.match(main, /https:\/\/\*\/\*/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /connect-src 'self'/);

console.log("桌面壳检查通过：固定协议、沙箱、网络阻断与NSIS配置正常。");
