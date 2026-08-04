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
assert.match(app, /<span id="result-score-value">0<\/span><small>分<\/small>/, "考试分数的数字和单位应使用独立元素");
assert.doesNotMatch(app, /scoreEl\.prepend\(/, "考试分数动画不应在原始占位数字前重复插入数字");
assert.match(app, /document\.addEventListener\("keydown", handleStudyShortcut\)/, "页面应注册刷题快捷键");
assert.match(app, /"1": 0, "2": 1, "3": 2, "4": 3/, "数字键应依次映射到前四个选项");
assert.match(app, /event\.key === "Backspace"/, "退格键应支持返回上一题");
assert.match(html, /aria-keyshortcuts="Space Enter"/, "下一题按钮应声明键盘快捷键");
assert.match(app, /function animateHelpSection\(/, "帮助说明卡片应使用自定义展开动画");
assert.match(app, /cubic-bezier\(\.34,1\.56,\.64,1\)/, "展开动画应使用非线性弹性曲线");

console.log(`页面结构检查通过：${references.length} 个元素引用全部存在。`);

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
