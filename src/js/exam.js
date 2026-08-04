export const EXAM_CONFIG = {
  1: { questionCount: 100, durationMs: 45 * 60 * 1000, passScore: 90 },
  4: { questionCount: 50,  durationMs: 30 * 60 * 1000, passScore: 90 }
};

export const EXAM_QUESTION_COUNT = EXAM_CONFIG[1].questionCount;
export const EXAM_DURATION_MS = EXAM_CONFIG[1].durationMs;
export const EXAM_PASS_SCORE = EXAM_CONFIG[1].passScore;

export const EXAM_HISTORY_LIMIT = 20;

export function createExamSession(questions, subjectOrNow = 1, nowOrRandom = Date.now(), random = Math.random) {
  const usesLegacyArguments = !EXAM_CONFIG[subjectOrNow];
  const subject = usesLegacyArguments ? 1 : subjectOrNow;
  const now = usesLegacyArguments ? subjectOrNow : nowOrRandom;
  if (usesLegacyArguments && typeof nowOrRandom === "function") random = nowOrRandom;
  const config = EXAM_CONFIG[subject];
  if (!config) throw new Error(`不支持的科目：${subject}`);
  if (!Array.isArray(questions) || questions.length < config.questionCount) {
    throw new Error("题库数量不足，无法生成模拟考试");
  }

  const questionIds = shuffleForExam(questions, random).map((q) => q.id);

  return {
    id: createId("exam"),
    status: "active",
    subject,
    questionIds: questionIds.slice(0, config.questionCount),
    answers: {},
    currentIndex: 0,
    startedAt: now,
    endAt: now + config.durationMs
  };
}

export function gradeExam(exam, questionMap, submittedAt = Date.now()) {
  const config = EXAM_CONFIG[exam.subject] || EXAM_CONFIG[1];
  let score = 0;
  let unanswered = 0;
  const wrongIds = [];

  for (const questionId of exam.questionIds) {
    const question = questionMap.get(questionId);
    const answer = exam.answers[questionId];
    if (!answer) {
      unanswered += 1;
      wrongIds.push(questionId);
    } else if (isAnswerCorrect(answer, question)) {
      score += 1;
    } else {
      wrongIds.push(questionId);
    }
  }

  const durationSeconds = Math.max(
    0,
    Math.min(Math.round((submittedAt - exam.startedAt) / 1000), config.durationMs / 1000)
  );

  return {
    id: exam.id,
    subject: exam.subject,
    startedAt: exam.startedAt,
    submittedAt,
    durationSeconds,
    score,
    passed: score >= config.passScore,
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

export function isAnswerCorrect(userAnswer, question) {
  if (!question || !userAnswer) return false;
  if (question.type === 2) {
    const correct = question.answer.split(",").map(s => s.trim()).sort().join(",");
    const user = userAnswer.split(",").map(s => s.trim()).sort().join(",");
    return correct === user;
  }
  return userAnswer === question.answer;
}

function shuffleForExam(questions, random) {
  const result = [...questions];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createId(prefix) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}
