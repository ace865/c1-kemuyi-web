import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(projectRoot, "src", "data", "questions.offline.json");
const source = JSON.parse(await readFile(dataPath, "utf8"));

assert.ok(Array.isArray(source), "题库根节点必须是数组");

const questions = source.filter(
  (question) => question.subject === 1 && question.regionCode === "0" && [1, 3].includes(question.type)
);

assert.equal(questions.length, 2194, "全国通用科目一题数应为 2194");
assert.equal(new Set(questions.map((question) => question.id)).size, questions.length, "题目 ID 必须唯一");

for (const question of questions) {
  assert.ok(question.question, `${question.id} 缺少题干`);
  assert.equal(
    question.itemsTitleArray.length,
    question.itemsDescArray.length,
    `${question.id} 的选项标题与内容数量不一致`
  );
  assert.ok(question.itemsTitleArray.includes(question.answer), `${question.id} 的答案不在选项中`);
  assert.ok(question.remark, `${question.id} 缺少解析`);
}

assert.ok(questions.some((question) => question.type === 1), "题库应包含单选题");
assert.ok(questions.some((question) => question.type === 3), "题库应包含判断题");
assert.ok(questions.some((question) => question.url), "题库应包含图片题");

console.log(`题库检查通过：${questions.length} 道全国通用科目一题。`);
