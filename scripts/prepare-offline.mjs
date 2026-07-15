import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src", "data", "questions.json");
const outputPath = path.join(root, "src", "data", "questions.offline.json");
const imageDir = path.join(root, "src", "assets", "question-images");
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const questions = source.filter(isSupportedQuestion);

if (questions.length !== 2194) throw new Error(`全国通用科目一题数异常：${questions.length}`);
await mkdir(imageDir, { recursive: true });

const tasks = questions.filter((question) => question.url).map((question) => {
  const extension = imageExtension(question.url);
  return { question, fileName: `${question.id}.${extension}`, extension };
});
const expectedFiles = new Set(tasks.map((task) => task.fileName));

for (const fileName of await readdir(imageDir)) {
  if (!expectedFiles.has(fileName)) await rm(path.join(imageDir, fileName), { force: true });
}

let completed = 0;
for (let index = 0; index < tasks.length; index += 12) {
  await Promise.all(tasks.slice(index, index + 12).map(downloadImage));
  completed += Math.min(12, tasks.length - index);
  process.stdout.write(`\r离线图片：${completed}/${tasks.length}`);
}
process.stdout.write("\n");

const fileNames = new Map(tasks.map((task) => [task.question.id, task.fileName]));
const offlineQuestions = questions.map((question) => ({
  id: question.id,
  question: question.question,
  itemsTitleArray: question.itemsTitleArray,
  itemsDescArray: question.itemsDescArray,
  answer: question.answer,
  remark: question.remark,
  answerSkill: question.answerSkill || "",
  answerSkillExplain: question.answerSkillExplain || "",
  type: question.type,
  subject: question.subject,
  regionCode: question.regionCode,
  url: fileNames.has(question.id) ? `./src/assets/question-images/${fileNames.get(question.id)}` : ""
}));

await writeFile(outputPath, JSON.stringify(offlineQuestions), "utf8");
console.log(`离线题库已生成：${offlineQuestions.length}题，${tasks.length}张图片`);

async function downloadImage(task) {
  const destination = path.join(imageDir, task.fileName);
  try {
    const existing = await stat(destination);
    if (existing.size > 100) return;
  } catch {}

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(task.question.url, { redirect: "follow", signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("image/")) throw new Error(`返回类型不是图片：${contentType}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length <= 100) throw new Error("图片内容为空");
      await writeFile(destination, buffer);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw new Error(`图片下载失败 ${task.question.id}: ${lastError.message}`);
}

function imageExtension(url) {
  const extension = path.extname(new URL(url).pathname).slice(1).toLowerCase();
  if (extension === "png") return "png";
  if (extension === "jpeg") return "jpeg";
  return "jpg";
}

function isSupportedQuestion(question) {
  return question?.subject === 1
    && question.regionCode === "0"
    && (question.type === 1 || question.type === 3)
    && Array.isArray(question.itemsTitleArray)
    && Array.isArray(question.itemsDescArray)
    && question.itemsTitleArray.includes(question.answer);
}
