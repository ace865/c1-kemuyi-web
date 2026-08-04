import assert from "node:assert/strict";
import { createExamTaskController } from "../src/js/exam-lifecycle.js";

let nextId = 0;
const scheduled = new Map();
const cancelled = [];
const schedule = (callback, delay) => {
  const id = ++nextId;
  scheduled.set(id, { callback, delay });
  return id;
};
const cancel = (id) => {
  cancelled.push(id);
  scheduled.delete(id);
};

const controller = createExamTaskController(schedule, cancel);
const firstAdvance = controller.scheduleAutoAdvance(() => {}, 800);
const secondAdvance = controller.scheduleAutoAdvance(() => {}, 800);

assert.ok(cancelled.includes(firstAdvance), "新的自动跳题任务必须取消旧任务");
assert.ok(scheduled.has(secondAdvance), "最新自动跳题任务必须保持有效");

const timer = controller.startTimer(() => {}, 1000);
controller.clearAll();

assert.ok(cancelled.includes(secondAdvance), "离开考试时必须取消自动跳题任务");
assert.ok(cancelled.includes(timer), "离开考试时必须取消倒计时任务");
assert.equal(scheduled.size, 0, "清理后不得残留考试定时任务");

console.log("考试任务生命周期检查通过：替换和统一清理正常。");
