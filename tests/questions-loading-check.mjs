import assert from "node:assert/strict";
import { loadQuestionsForSubject } from "../src/js/questions.js";

const validQuestion = {
  id: "test-1",
  subject: 1,
  regionCode: "0",
  type: 1,
  question: "测试题",
  itemsTitleArray: ["A", "B"],
  itemsDescArray: ["是", "否"],
  answer: "A"
};

const originalWarn = console.warn;
console.warn = () => {};
const loaded = await loadQuestionsForSubject(1, {
  force: true,
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => [validQuestion] }),
  timeoutMs: 20
});
console.warn = originalWarn;
assert.equal(loaded.length, 1, "有效 JSON 应成功加载");

await assert.rejects(
  loadQuestionsForSubject(1, {
    force: true,
    fetchImpl: async () => ({ ok: false, status: 404 }),
    timeoutMs: 20
  }),
  /HTTP 404/,
  "404 应显示明确错误"
);

await assert.rejects(
  loadQuestionsForSubject(1, {
    force: true,
    timeoutMs: 20,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      }, { once: true });
    })
  }),
  /超时/,
  "永久 pending 的请求应被超时终止"
);

console.log("题库加载检查通过：正常、404 与超时路径均可控。");
