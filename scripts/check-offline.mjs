import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "src", "data", "questions.offline.json");
const questions = JSON.parse(await readFile(dataPath, "utf8"));
if (!Array.isArray(questions) || questions.length !== 2194) throw new Error("离线题库必须包含2194题");

const serialized = JSON.stringify(questions);
if (/https?:\/\//i.test(serialized)) throw new Error("离线题库仍包含远程地址");

const imageQuestions = questions.filter((question) => question.url);
if (imageQuestions.length !== 787) throw new Error(`离线图片映射数量异常：${imageQuestions.length}`);
if (new Set(imageQuestions.map((question) => question.url)).size !== 787) throw new Error("离线图片路径存在重复");

let bytes = 0;
for (const question of imageQuestions) {
  if (!question.url.startsWith("./src/assets/question-images/")) throw new Error(`非法图片路径：${question.url}`);
  const filePath = path.resolve(root, question.url.slice(2));
  if (!filePath.startsWith(root + path.sep)) throw new Error(`图片越过项目目录：${question.url}`);
  const file = await stat(filePath);
  if (file.size <= 100) throw new Error(`图片文件为空：${question.url}`);
  bytes += file.size;
}

console.log(`离线资源检查通过：2194题，787张图片，${(bytes / 1048576).toFixed(1)} MiB。`);
