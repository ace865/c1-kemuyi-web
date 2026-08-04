import assert from "node:assert/strict";
import {
  EXAM_CONFIG,
  EXAM_DURATION_MS,
  addExamHistory,
  createExamSession,
  formatRemaining,
  getRemainingMs,
  gradeExam,
  isAnswerCorrect
} from "../src/js/exam.js";

const questions = Array.from({ length: 120 }, (_, index) => ({ id: `q${index}`, answer: "A" }));
const questionMap = new Map(questions.map((question) => [question.id, question]));
const startedAt = 1_000_000;
const exam = createExamSession(questions, startedAt, () => 0.42);

assert.equal(exam.questionIds.length, 100);
assert.equal(new Set(exam.questionIds).size, 100, "考试抽题不得重复");
assert.equal(exam.endAt - exam.startedAt, EXAM_DURATION_MS, "考试时长应为45分钟");

exam.questionIds.slice(0, 90).forEach((id) => { exam.answers[id] = "A"; });
const passed = gradeExam(exam, questionMap, startedAt + 20 * 60 * 1000);
assert.equal(passed.score, 90);
assert.equal(passed.passed, true, "90分应判定通过");
assert.equal(passed.unanswered, 10);
assert.equal(passed.wrongIds.length, 10, "未答题应计入考试错题");

exam.answers[exam.questionIds[89]] = "B";
const failed = gradeExam(exam, questionMap, startedAt + EXAM_DURATION_MS + 5000);
assert.equal(failed.score, 89);
assert.equal(failed.passed, false);
assert.equal(failed.durationSeconds, 2700, "考试用时不得超过45分钟");
assert.equal(getRemainingMs(exam, exam.endAt + 1), 0);
assert.equal(formatRemaining(65_000), "01:05");

let history = [];
for (let index = 0; index < 25; index += 1) history = addExamHistory(history, { ...passed, id: `exam-${index}` });
assert.equal(history.length, 20, "每个档案最多保留20次考试");
assert.equal(history[0].id, "exam-24");

const subject4Questions = Array.from({ length: 60 }, (_, index) => ({
  id: `s4-${index}`,
  subject: 4,
  type: 2,
  answer: "A,C"
}));
const subject4Map = new Map(subject4Questions.map((question) => [question.id, question]));
const subject4Exam = createExamSession(subject4Questions, 4, startedAt, () => 0.42);
assert.equal(subject4Exam.questionIds.length, 50, "科目四应抽取50题");
assert.equal(subject4Exam.endAt - subject4Exam.startedAt, EXAM_CONFIG[4].durationMs, "科目四应限时30分钟");
subject4Exam.questionIds.forEach((id) => { subject4Exam.answers[id] = "C,A"; });
assert.equal(gradeExam(subject4Exam, subject4Map).score, 50, "多选答案顺序不应影响判分");
assert.equal(isAnswerCorrect("A,C", subject4Questions[0]), true);
assert.equal(isAnswerCorrect("A", subject4Questions[0]), false);

console.log("模拟考试检查通过：双科目抽题、计时、多选判分与历史上限正常。");
