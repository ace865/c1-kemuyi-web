import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(path.join(root, "index.html"), "utf8");
const app = await readFile(path.join(root, "src", "js", "app.js"), "utf8");
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => toCamelCase(match[1])));
const references = [...new Set([...app.matchAll(/elements\.([A-Za-z0-9]+)/g)].map((match) => match[1]))];
const missing = references.filter((reference) => !ids.has(reference));

assert.deepEqual(missing, [], `app.js 引用了不存在的页面元素：${missing.join(", ")}`);
assert.match(html, /data-view="exam-hub"/, "底部导航应包含模考入口");
assert.match(html, /id="profile-view"/, "页面应包含本地档案选择视图");

console.log(`页面结构检查通过：${references.length} 个元素引用全部存在。`);

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
