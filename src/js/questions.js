const QUESTION_DATA_FILES = {
  1: [new URL("../data/questions.offline.json", import.meta.url).href],
  4: [new URL("../data/questions-subject4.json", import.meta.url).href]
};

const QUESTION_REQUEST_TIMEOUT_MS = 15000;

export const SUBJECT_CONFIG = {
  1: { name: "科目一", expectedCount: 2194 },
  4: { name: "科目四", expectedCount: 1833 }
};

const loadedCache = {};

export async function loadQuestionsForSubject(subject, options = {}) {
  const { force = false, fetchImpl = fetch, timeoutMs = QUESTION_REQUEST_TIMEOUT_MS } = options;
  if (!force && loadedCache[subject]) return loadedCache[subject];

  const urls = QUESTION_DATA_FILES[subject] || QUESTION_DATA_FILES[1];
  const response = await fetchQuestionData(urls, fetchImpl, timeoutMs);
  const source = await response.json();
  if (!Array.isArray(source)) {
    throw new Error("题库格式错误：根节点应为数组");
  }

  const questions = source.filter(isSupportedQuestion);
  if (!questions.length) {
    throw new Error(`没有找到${SUBJECT_CONFIG[subject]?.name || "驾考"}的有效题目`);
  }

  const config = SUBJECT_CONFIG[subject];
  if (config && questions.length !== config.expectedCount) {
    console.warn(`${config.name}题数发生变化：预期 ${config.expectedCount}，实际 ${questions.length}`);
  }

  loadedCache[subject] = questions;
  return questions;
}

export function loadQuestions() {
  return loadQuestionsForSubject(1);
}

export function getCachedQuestions(subject) {
  return loadedCache[subject] || [];
}

async function fetchQuestionData(urls, fetchImpl, timeoutMs) {
  const failures = [];
  for (const url of urls) {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { cache: "no-store", signal: controller.signal });
      if (response.ok) return response;
      failures.push(`${url}：HTTP ${response.status}`);
    } catch (error) {
      const reason = error?.name === "AbortError" ? `${timeoutMs / 1000} 秒超时` : (error?.message || "未知错误");
      failures.push(`${url}：${reason}`);
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }
  throw new Error(`题库请求失败（${failures.join("；")}）`);
}

export function shuffleQuestions(questions) {
  const result = [...questions];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function explanationToText(value) {
  if (!value) return "暂无解析。";
  const documentFragment = new DOMParser().parseFromString(value, "text/html");
  documentFragment.querySelectorAll("br").forEach((element) => element.replaceWith("\n"));
  documentFragment.querySelectorAll("p").forEach((element) => element.append("\n"));
  return (documentFragment.body.textContent || value)
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSupportedQuestion(question) {
  if (!question || question.regionCode !== "0") return false;
  if (![1, 2, 3].includes(question.type)) return false;
  if (![1, 4].includes(question.subject)) return false;
  if (typeof question.id !== "string" || typeof question.question !== "string") return false;
  if (!Array.isArray(question.itemsTitleArray) || !Array.isArray(question.itemsDescArray)) return false;
  if (question.itemsTitleArray.length !== question.itemsDescArray.length) return false;
  if (question.type === 2) {
    return question.answer.split(",").every((a) => question.itemsTitleArray.includes(a));
  }
  return question.itemsTitleArray.includes(question.answer);
}
