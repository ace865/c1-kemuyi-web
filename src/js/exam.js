export const EXAM_QUESTION_COUNT = 100;
export const EXAM_DURATION_MS = 45 * 60 * 1000;
export const EXAM_PASS_SCORE = 90;
export const EXAM_HISTORY_LIMIT = 20;

export function createExamSession(questions, now = Date.now(), random = Math.random) {
  if (!Array.isArray(questions) || questions.length < EXAM_QUESTION_COUNT) {
    throw new Error("题库数量不足，无法生成模拟考试");
  }

  const questionIds = questions.map((question) => question.id);
  for (let index = questionIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [questionIds[index], questionIds[swapIndex]] = [questionIds[swapIndex], questionIds[index]];
  }

  return {
    id: createId("exam"),
    status: "active",
    questionIds: questionIds.slice(0, EXAM_QUESTION_COUNT),
    answers: {},
    currentIndex: 0,
    startedAt: now,
    endAt: now + EXAM_DURATION_MS
  };
}

export function gradeExam(exam, questionMap, submittedAt = Date.now()) {
  let score = 0;
  let unanswered = 0;
  const wrongIds = [];

  for (const questionId of exam.questionIds) {
    const question = questionMap.get(questionId);
    const answer = exam.answers[questionId];
    if (!answer) unanswered += 1;
    if (question && answer === question.answer) score += 1;
    else wrongIds.push(questionId);
  }

  const durationSeconds = Math.max(
    0,
    Math.min(Math.round((submittedAt - exam.startedAt) / 1000), EXAM_DURATION_MS / 1000)
  );

  return {
    id: exam.id,
    startedAt: exam.startedAt,
    submittedAt,
    durationSeconds,
    score,
    passed: score >= EXAM_PASS_SCORE,
    unanswered,
    wrongIds,
    questionIds: [...exam.questionIds],
    answers: { ...exam.answers }
  };
}

export function addExamHistory(history, record) {
  return [record, ...history.filter((item) => item.id !== record.id)].slice(0, EXAM_HISTORY_LIMIT);
}

export function getRemainingMs(exam, now = Date.now()) {
  return Math.max(0, exam.endAt - now);
}

export function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}分${String(remainder).padStart(2, "0")}秒`;
}

export function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createId(prefix) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}
