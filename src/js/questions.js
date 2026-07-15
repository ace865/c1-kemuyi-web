const QUESTION_DATA_URLS = [
  "./src/data/questions.offline.json",
  "./src/data/questions.json"
];
const EXPECTED_QUESTION_COUNT = 2194;

export async function loadQuestions() {
  const response = await fetchQuestionData();

  const source = await response.json();
  if (!Array.isArray(source)) {
    throw new Error("题库格式错误：根节点应为数组");
  }

  const questions = source.filter(isSupportedQuestion);
  if (!questions.length) {
    throw new Error("没有找到全国通用的科目一单选题或判断题");
  }

  if (questions.length !== EXPECTED_QUESTION_COUNT) {
    console.warn(`全国通用科目一题数发生变化：预期 ${EXPECTED_QUESTION_COUNT}，实际 ${questions.length}`);
  }

  return questions;
}

async function fetchQuestionData() {
  let lastStatus = "未知";
  for (const url of QUESTION_DATA_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return response;
      lastStatus = response.status;
    } catch (error) {
      lastStatus = error.message;
    }
  }
  throw new Error(`题库请求失败（${lastStatus}）`);
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
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSupportedQuestion(question) {
  if (!question || question.subject !== 1 || question.regionCode !== "0") return false;
  if (question.type !== 1 && question.type !== 3) return false;
  if (typeof question.id !== "string" || typeof question.question !== "string") return false;
  if (!Array.isArray(question.itemsTitleArray) || !Array.isArray(question.itemsDescArray)) return false;
  if (question.itemsTitleArray.length !== question.itemsDescArray.length) return false;
  return question.itemsTitleArray.includes(question.answer);
}
