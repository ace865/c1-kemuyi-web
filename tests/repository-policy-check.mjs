import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/pull-request-check.yml",
  "LICENSE",
  "NOTICE.md",
  "README.md",
  "README.en.md",
  "README.ja.md",
  "desktop/main.cjs",
  "src/js/motion.js",
  "src/data/questions.offline.json",
  "src/data/questions-subject4.json"
];

await Promise.all(requiredFiles.map((file) => access(path.join(root, file))));

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const packagedFiles = new Set(packageJson.build?.files || []);
assert.ok(packagedFiles.has("src/data/questions.offline.json"), "安装包必须包含科目一题库");
assert.ok(packagedFiles.has("src/data/questions-subject4.json"), "安装包必须包含科目四题库");
assert.ok(packagedFiles.has("src/assets/question-images/**/*"), "安装包必须包含题目图片");

const appSource = await readFile(path.join(root, "src/js/app.js"), "utf8");
assert.match(appSource, /from "\.\/motion\.js"/, "主应用必须保留动画系统入口");

console.log("仓库保护检查通过：Agent 规则、协作流程、关键文件与打包资源完整。");
