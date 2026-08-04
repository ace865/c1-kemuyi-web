const QUESTION_DATA_URL = "./src/data/questions.offline.json";
const EXPECTED_QUESTION_COUNT = 2194;

// 加载题库JSON文件并过滤出支持的题目类型
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

// fetch题库，不用缓存确保拿到最新数据
async function fetchQuestionData() {
  const response = await fetch(QUESTION_DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`题库请求失败（${response.status}）`);
  return response;
}

// Fisher-Yates洗牌算法，保证均匀随机
export function shuffleQuestions(questions) {
  const result = [...questions];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

// 把HTML格式的解析文本转成纯文本（去掉<br>、<p>等标签）
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

// 只保留科目一的单选题和判断题，其他题型暂不支持
function isSupportedQuestion(question) {
  if (!question || question.subject !== 1 || question.regionCode !== "0") return false;
  if (question.type !== 1 && question.type !== 3) return false;
  if (typeof question.id !== "string" || typeof question.question !== "string") return false;
  if (!Array.isArray(question.itemsTitleArray) || !Array.isArray(question.itemsDescArray)) return false;
  if (question.itemsTitleArray.length !== question.itemsDescArray.length) return false;
  return question.itemsTitleArray.includes(question.answer);
}
