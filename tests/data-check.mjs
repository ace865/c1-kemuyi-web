import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const subjects = [
  { subject: 1, expected: 2194, file: "questions.offline.json", types: [1, 3] },
  { subject: 4, expected: 1833, file: "questions-subject4.json", types: [1, 2, 3] }
];

for (const config of subjects) {
  const dataPath = path.join(projectRoot, "src", "data", config.file);
  const source = JSON.parse(await readFile(dataPath, "utf8"));
  assert.ok(Array.isArray(source), `${config.file} 根节点必须是数组`);

  const questions = source.filter(
    (question) => question.subject === config.subject && question.regionCode === "0" && config.types.includes(question.type)
  );

  assert.equal(questions.length, config.expected, `科目${config.subject}题数应为 ${config.expected}`);
  assert.equal(new Set(questions.map((question) => question.id)).size, questions.length, "题目 ID 必须唯一");

  for (const question of questions) {
    assert.ok(question.question, `${question.id} 缺少题干`);
    assert.equal(question.itemsTitleArray.length, question.itemsDescArray.length, `${question.id} 的选项标题与内容数量不一致`);
    const answers = question.type === 2 ? question.answer.split(",") : [question.answer];
    assert.ok(answers.every((answer) => question.itemsTitleArray.includes(answer)), `${question.id} 的答案不在选项中`);
    if (question.url) {
      const relativeImagePath = question.url.replace(/^\.\//, "");
      await access(path.join(projectRoot, relativeImagePath));
    }
  }

  assert.ok(questions.some((question) => question.type === 1), `科目${config.subject}应包含单选题`);
  assert.ok(questions.some((question) => question.type === 3), `科目${config.subject}应包含判断题`);
  assert.ok(questions.some((question) => question.url), `科目${config.subject}应包含图片题`);
  if (config.subject === 4) assert.ok(questions.some((question) => question.type === 2), "科目四应包含多选题");

  console.log(`题库检查通过：科目${config.subject} ${questions.length} 道，图片资源完整。`);
}
