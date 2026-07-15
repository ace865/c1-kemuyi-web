import { explanationToText, loadQuestions, shuffleQuestions } from "./questions.js";
import {
  addExamHistory,
  createExamSession,
  formatDuration,
  formatRemaining,
  getRemainingMs,
  gradeExam
} from "./exam.js";
import {
  createProfile,
  initializeProfiles,
  listProfiles,
  loadProfileData,
  sanitizeProfileData,
  saveProfileData
} from "./storage.js";

const elements = Object.fromEntries(
  [...document.querySelectorAll("[id]")].map((element) => [toCamelCase(element.id), element])
);

const views = {
  loading: elements.loadingView,
  error: elements.errorView,
  profile: elements.profileView,
  home: elements.homeView,
  practiceHub: elements.practiceHubView,
  wrongBook: elements.wrongBookView,
  practice: elements.practiceView,
  examHub: elements.examHubView,
  exam: elements.examView,
  examResult: elements.examResultView
};

const modeNames = { sequential: "顺序练习", random: "随机练习", wrong: "错题练习" };
let questions = [];
let questionMap = new Map();
let activeProfile = null;
let profileData = null;
let currentMode = null;
let currentQueue = [];
let queueIndex = 0;
let currentQuestion = null;
let answerLocked = false;
let examTimerId = null;
let reviewRecord = null;
let reviewIndex = 0;
let toastTimer = null;
let pendingResetType = null;

const resetLabels = {
  wrong:        { title: "清空错题本",       desc: "将清空当前档案的所有错题记录。答题统计和考试记录不受影响。" },
  examHistory:  { title: "清空考试记录",     desc: "将删除当前档案的所有模拟考试记录。错题本和练习进度不受影响。" },
  progress:     { title: "清空练习进度",     desc: "将重置已做题数、正确率和顺序练习进度。错题本和考试记录不受影响。" },
  activeExam:   { title: "放弃进行中的考试", desc: "将清除当前未完成的考试。已完成的考试记录不受影响。" },
  all:          { title: "清空全部数据",     desc: "将清空当前档案的所有数据，包括错题本、考试记录和练习进度。此操作不可恢复！" },
};

bindEvents();
initialize();

async function initialize() {
  clearExamTimer();
  showView("loading");
  try {
    questions = await loadQuestions();
    questionMap = new Map(questions.map((question) => [question.id, question]));
    initializeProfiles();
    renderProfileChooser();
    showView("profile");
  } catch (error) {
    elements.errorMessage.textContent = `${error.message}。请运行 npm.cmd run dev 后再访问页面。`;
    showView("error");
  }
}

function bindEvents() {
  elements.retryButton.addEventListener("click", initialize);
  elements.brandButton.addEventListener("click", () => activeProfile && navigateTo("home"));
  elements.profileSwitchButton.addEventListener("click", switchProfile);
  elements.profileForm.addEventListener("submit", handleCreateProfile);
  elements.leavePracticeButton.addEventListener("click", () => navigateTo("practice-hub"));
  elements.nextQuestionButton.addEventListener("click", goToNextQuestion);
  elements.startWrongPractice.addEventListener("click", () => startPractice("wrong"));
  elements.removeWrongButton.addEventListener("click", () => resolveWrongQuestion(true));
  elements.keepWrongButton.addEventListener("click", () => resolveWrongQuestion(false));
  elements.newExamButton.addEventListener("click", handleNewExam);
  elements.resumeExamButton.addEventListener("click", enterExam);
  elements.leaveExamButton.addEventListener("click", () => navigateTo("exam-hub"));
  elements.submitExamButton.addEventListener("click", () => submitExam(false));
  elements.examPreviousButton.addEventListener("click", () => moveExam(-1));
  elements.examNextButton.addEventListener("click", () => moveExam(1));
  elements.examNavigatorToggle.addEventListener("click", openExamNavigator);
  elements.examNavigatorClose.addEventListener("click", closeExamNavigator);
  elements.examBackdrop.addEventListener("click", closeExamNavigator);
  elements.backToExamHubButton.addEventListener("click", () => navigateTo("exam-hub"));

  elements.dataManageToggle.addEventListener("click", () => {
    const body = elements.dataManageBody;
    const isOpen = !body.hidden;
    body.hidden = isOpen;
    elements.dataManageToggle.classList.toggle("is-open", !isOpen);
  });
  document.querySelectorAll("[data-reset]").forEach((btn) => {
    btn.addEventListener("click", () => openResetDialog(btn.dataset.reset));
  });
  elements.resetCancelButton.addEventListener("click", closeResetDialog);
  elements.resetConfirmButton.addEventListener("click", executeReset);
  elements.resetOverlay.addEventListener("click", (e) => {
    if (e.target === elements.resetOverlay) closeResetDialog();
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => startPractice(button.dataset.mode));
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.view));
  });
}

function renderProfileChooser() {
  const profiles = listProfiles();
  elements.profileList.replaceChildren();
  elements.profileFormError.textContent = "";
  if (!profiles.length) {
    const empty = document.createElement("p");
    empty.className = "profile-empty";
    empty.textContent = "这台电脑还没有本地档案，请先创建一个。";
    elements.profileList.append(empty);
    return;
  }

  profiles.forEach((profile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-option";
    button.innerHTML = '<span class="profile-avatar"></span><span class="profile-option-copy"><strong></strong><small>本地独立进度</small></span><span class="mode-arrow">→</span>';
    button.querySelector(".profile-avatar").textContent = [...profile.name][0]?.toUpperCase() || "用";
    button.querySelector("strong").textContent = profile.name;
    button.addEventListener("click", () => activateProfile(profile));
    elements.profileList.append(button);
  });
}

function handleCreateProfile(event) {
  event.preventDefault();
  try {
    const profile = createProfile(elements.profileNameInput.value);
    elements.profileNameInput.value = "";
    elements.profileFormError.textContent = "";
    activateProfile(profile);
  } catch (error) {
    elements.profileFormError.textContent = error.message;
  }
}

function activateProfile(profile) {
  activeProfile = profile;
  profileData = sanitizeProfileData(loadProfileData(profile.id), questions);
  persistProfile();
  elements.activeProfileName.textContent = profile.name;
  elements.profileSwitchButton.hidden = false;

  if (profileData.activeExam && getRemainingMs(profileData.activeExam) === 0) {
    submitExam(true);
    showToast("上次考试已到时，系统已自动交卷");
    return;
  }

  renderDashboard();
  showView("home");
  updateNavigation("home");
}

function switchProfile() {
  clearExamTimer();
  closeExamNavigator();
  activeProfile = null;
  profileData = null;
  currentQuestion = null;
  reviewRecord = null;
  elements.profileSwitchButton.hidden = true;
  renderProfileChooser();
  showView("profile");
  window.scrollTo({ top: 0 });
}

function navigateTo(viewName) {
  if (!activeProfile) return;
  if (viewName !== "exam") clearExamTimer();
  currentMode = null;
  currentQuestion = null;

  if (viewName === "home") renderDashboard();
  if (viewName === "practice-hub") renderPracticeHub();
  if (viewName === "wrong-book") renderWrongBook();
  if (viewName === "exam-hub") renderExamHub();
  showView(viewName === "practice-hub" ? "practiceHub" : viewName === "wrong-book" ? "wrongBook" : viewName === "exam-hub" ? "examHub" : viewName);
  updateNavigation(viewName);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startPractice(mode) {
  currentMode = mode;
  queueIndex = 0;
  if (mode === "sequential") {
    currentQueue = questions;
    queueIndex = Math.min(profileData.sequentialIndex, questions.length - 1);
  } else if (mode === "random") currentQueue = shuffleQuestions(questions);
  else currentQueue = profileData.wrongIds.map((id) => questionMap.get(id)).filter(Boolean);

  showView("practice");
  updateNavigation(null);
  elements.practiceModeTitle.textContent = modeNames[mode];
  if (!currentQueue.length) {
    renderPracticeEmpty("错题本还是空的", "继续保持，做错的题会自动收录到这里。", "返回刷题模式");
    return;
  }
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  currentQuestion = currentQueue[queueIndex];
  answerLocked = false;
  elements.practiceWorkspace.hidden = false;
  elements.practiceEmpty.hidden = true;
  elements.nextQuestionButton.hidden = true;
  elements.answerPanel.hidden = true;
  elements.answerPlaceholder.hidden = false;
  elements.wrongResolution.hidden = true;
  elements.practicePosition.textContent = `${queueIndex + 1} / ${currentQueue.length}`;
  elements.questionNumber.textContent = `第 ${queueIndex + 1} 题`;
  elements.questionType.textContent = currentQuestion.type === 3 ? "判断题" : "单选题";
  elements.questionText.textContent = currentQuestion.question;
  renderMedia(elements.questionMedia, currentQuestion.url);
  renderPracticeOptions();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPracticeOptions() {
  elements.optionsList.replaceChildren();
  currentQuestion.itemsTitleArray.forEach((title, index) => {
    elements.optionsList.append(createOptionButton(title, currentQuestion.itemsDescArray[index], () => answerQuestion(title)));
  });
}

function answerQuestion(selectedAnswer) {
  if (answerLocked || !currentQuestion) return;
  answerLocked = true;
  const wasWrong = profileData.wrongIds.includes(currentQuestion.id);
  const isCorrect = selectedAnswer === currentQuestion.answer;
  profileData.totalAttempts += 1;
  if (isCorrect) profileData.correctAttempts += 1;
  if (!profileData.answeredIds.includes(currentQuestion.id)) profileData.answeredIds.push(currentQuestion.id);
  if (!isCorrect && !profileData.wrongIds.includes(currentQuestion.id)) profileData.wrongIds.push(currentQuestion.id);
  persistProfile();

  elements.optionsList.querySelectorAll(".option-button").forEach((button) => {
    button.disabled = true;
    if (button.dataset.answer === currentQuestion.answer) button.classList.add("is-correct");
    if (button.dataset.answer === selectedAnswer && !isCorrect) button.classList.add("is-wrong");
  });
  renderAnswerPanel(currentQuestion, isCorrect, wasWrong);
}

function renderAnswerPanel(question, isCorrect, wasWrong) {
  elements.answerResult.className = `answer-result ${isCorrect ? "is-success" : "is-error"}`;
  elements.answerResult.textContent = isCorrect ? "回答正确" : "回答错误";
  elements.correctAnswer.textContent = `正确答案：${formatAnswer(question)}`;
  elements.answerAnalysis.textContent = explanationToText(question.remark);
  const tip = [question.answerSkill, question.answerSkillExplain].filter(Boolean).filter((value, index, items) => items.indexOf(value) === index).join("\n");
  elements.answerTip.textContent = tip;
  elements.answerTipBlock.hidden = !tip;
  elements.wrongResolution.hidden = !(isCorrect && wasWrong);
  elements.answerPlaceholder.hidden = true;
  elements.answerPanel.hidden = false;
  elements.nextQuestionButton.hidden = false;
  if (window.innerWidth < 1024) elements.answerColumn.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resolveWrongQuestion(shouldRemove) {
  if (shouldRemove && currentQuestion) {
    profileData.wrongIds = profileData.wrongIds.filter((id) => id !== currentQuestion.id);
    persistProfile();
    showToast("已移出错题本");
  } else showToast("已暂时保留在错题本");
  elements.wrongResolution.hidden = true;
}

function goToNextQuestion() {
  if (!answerLocked) return;
  if (currentMode === "sequential") {
    if (queueIndex + 1 >= currentQueue.length) {
      profileData.sequentialIndex = 0;
      persistProfile();
      renderPracticeEmpty("顺序练习已完成", "全国通用题已经完整练习一轮。", "重新开始");
      return;
    }
    queueIndex += 1;
    profileData.sequentialIndex = queueIndex;
    persistProfile();
  } else {
    queueIndex += 1;
    if (queueIndex >= currentQueue.length) {
      const random = currentMode === "random";
      renderPracticeEmpty(random ? "随机练习已完成" : "本轮错题练习已完成", random ? "本轮题目没有重复，可以开始新一轮。" : "回到错题本查看剩余题目。", random ? "再来一轮" : "查看错题本");
      return;
    }
  }
  renderCurrentQuestion();
}

function renderPracticeEmpty(title, copy, actionLabel) {
  currentQuestion = null;
  elements.practiceWorkspace.hidden = true;
  elements.practiceEmpty.hidden = false;
  elements.practiceEmpty.replaceChildren();
  const icon = createElement("div", "state-icon", "✓");
  const heading = createElement("h1", "", title);
  const paragraph = createElement("p", "", copy);
  const action = createElement("button", "button button-primary", actionLabel);
  action.type = "button";
  action.addEventListener("click", () => {
    if (currentMode === "random") startPractice("random");
    else if (currentMode === "sequential") startPractice("sequential");
    else navigateTo(profileData.wrongIds.length ? "wrong-book" : "practice-hub");
  });
  elements.practiceEmpty.append(icon, heading, paragraph, action);
}

function renderPracticeHub() {
  elements.sequenceProgress.textContent = `从第 ${profileData.sequentialIndex + 1} 题继续`;
  elements.wrongModeCopy.textContent = profileData.wrongIds.length ? `当前 ${profileData.wrongIds.length} 道错题` : "当前没有错题";
}

function renderDashboard() {
  const accuracy = profileData.totalAttempts ? Math.round((profileData.correctAttempts / profileData.totalAttempts) * 100) : 0;
  elements.totalCount.textContent = questions.length.toLocaleString("zh-CN");
  elements.answeredCount.textContent = profileData.answeredIds.length.toLocaleString("zh-CN");
  elements.accuracyValue.textContent = `${accuracy}%`;
  elements.wrongCount.textContent = profileData.wrongIds.length.toLocaleString("zh-CN");
  renderPracticeHub();
  updateWrongBadge();
  renderDataManage();
}

function renderWrongBook() {
  const wrongQuestions = profileData.wrongIds.map((id) => questionMap.get(id)).filter(Boolean);
  elements.wrongBookSummary.textContent = wrongQuestions.length ? `共 ${wrongQuestions.length} 道错题，答对后可选择移除。` : "做错的题会自动保存在这里。";
  elements.startWrongPractice.disabled = !wrongQuestions.length;
  elements.wrongBookContent.replaceChildren();
  if (!wrongQuestions.length) {
    const empty = createElement("div", "state-panel compact-state wrong-empty");
    empty.innerHTML = '<div class="state-icon">✓</div><h2>目前没有错题</h2><p>去练几道题，保持这个好状态。</p>';
    elements.wrongBookContent.append(empty);
    return;
  }
  const list = createElement("ol", "wrong-list");
  wrongQuestions.slice(0, 20).forEach((question, index) => {
    const item = createElement("li", "wrong-item");
    item.append(createElement("span", "wrong-item-number", String(index + 1).padStart(2, "0")), createElement("p", "", question.question));
    list.append(item);
  });
  elements.wrongBookContent.append(list);
  if (wrongQuestions.length > 20) elements.wrongBookContent.append(createElement("p", "list-remainder", `另有 ${wrongQuestions.length - 20} 道错题，请进入错题练习继续复习。`));
}

function renderExamHub() {
  const exam = profileData.activeExam;
  elements.resumeExamCard.hidden = !exam;
  elements.newExamButton.textContent = exam ? "放弃并开始新考试" : "开始新考试";
  if (exam) {
    const answered = Object.keys(exam.answers).length;
    elements.resumeExamCopy.textContent = `已答 ${answered}/100，剩余 ${formatRemaining(getRemainingMs(exam))}`;
  }
  renderExamHistory();
}

function handleNewExam() {
  if (profileData.activeExam && !window.confirm("当前有未完成的考试。放弃它并开始新考试吗？")) return;
  profileData.activeExam = createExamSession(questions);
  persistProfile();
  enterExam();
}

function enterExam() {
  if (!profileData.activeExam) return;
  if (getRemainingMs(profileData.activeExam) === 0) {
    submitExam(true);
    return;
  }
  showView("exam");
  updateNavigation(null);
  renderExamQuestion();
  startExamTimer();
  window.scrollTo({ top: 0 });
}

function renderExamQuestion() {
  const exam = profileData.activeExam;
  const question = questionMap.get(exam.questionIds[exam.currentIndex]);
  elements.examQuestionNumber.textContent = `第 ${exam.currentIndex + 1} 题`;
  elements.examQuestionText.textContent = question.question;
  renderMedia(elements.examQuestionMedia, question.url);
  elements.examOptionsList.replaceChildren();
  question.itemsTitleArray.forEach((title, index) => {
    const button = createOptionButton(title, question.itemsDescArray[index], () => selectExamAnswer(question.id, title));
    if (exam.answers[question.id] === title) button.classList.add("is-selected");
    elements.examOptionsList.append(button);
  });
  elements.examPreviousButton.disabled = exam.currentIndex === 0;
  elements.examNextButton.textContent = exam.currentIndex === 99 ? "检查答题卡" : "下一题";
  renderExamNavigator();
  updateExamProgress();
}

function selectExamAnswer(questionId, answer) {
  profileData.activeExam.answers[questionId] = answer;
  persistProfile();
  renderExamQuestion();
}

function moveExam(offset) {
  const exam = profileData.activeExam;
  const next = exam.currentIndex + offset;
  if (offset > 0 && next >= exam.questionIds.length) {
    openExamNavigator();
    return;
  }
  exam.currentIndex = Math.max(0, Math.min(next, exam.questionIds.length - 1));
  persistProfile();
  renderExamQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderExamNavigator() {
  const exam = profileData.activeExam;
  elements.examNumberGrid.replaceChildren();
  exam.questionIds.forEach((questionId, index) => {
    const button = createElement("button", "number-button", String(index + 1));
    button.type = "button";
    if (exam.answers[questionId]) button.classList.add("is-answered");
    if (index === exam.currentIndex) button.classList.add("is-current");
    button.addEventListener("click", () => {
      exam.currentIndex = index;
      persistProfile();
      closeExamNavigator();
      renderExamQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    elements.examNumberGrid.append(button);
  });
}

function updateExamProgress() {
  const answered = Object.keys(profileData.activeExam.answers).length;
  elements.examProgress.textContent = `已答 ${answered} / 100`;
}

function startExamTimer() {
  clearExamTimer();
  updateTimer();
  examTimerId = window.setInterval(updateTimer, 1000);
}

function updateTimer() {
  if (!profileData?.activeExam) return clearExamTimer();
  const remaining = getRemainingMs(profileData.activeExam);
  elements.examTimer.textContent = formatRemaining(remaining);
  elements.examTimer.classList.toggle("is-urgent", remaining <= 5 * 60 * 1000);
  if (remaining === 0) submitExam(true);
}

function clearExamTimer() {
  if (examTimerId) window.clearInterval(examTimerId);
  examTimerId = null;
}

function submitExam(automatic) {
  const exam = profileData?.activeExam;
  if (!exam) return;
  const unanswered = exam.questionIds.length - Object.keys(exam.answers).length;
  if (!automatic && !window.confirm(unanswered ? `还有 ${unanswered} 题未作答，确定交卷吗？` : "已完成全部题目，确定交卷吗？")) return;

  const record = gradeExam(exam, questionMap);
  profileData.examHistory = addExamHistory(profileData.examHistory, record);
  profileData.wrongIds = [...new Set([...profileData.wrongIds, ...record.wrongIds])];
  profileData.activeExam = null;
  persistProfile();
  clearExamTimer();
  closeExamNavigator();
  showExamResult(record);
}

function renderExamHistory() {
  elements.examHistoryList.replaceChildren();
  if (!profileData.examHistory.length) {
    const empty = createElement("div", "history-empty", "还没有考试记录，完成第一场模拟考试后会显示在这里。");
    elements.examHistoryList.append(empty);
    return;
  }
  profileData.examHistory.forEach((record) => {
    const button = createElement("button", "history-item");
    button.type = "button";
    button.innerHTML = '<span class="history-score"></span><span class="history-copy"><strong></strong><small></small></span><span class="status-pill"></span>';
    button.querySelector(".history-score").textContent = String(record.score);
    button.querySelector("strong").textContent = formatDate(record.submittedAt);
    button.querySelector("small").textContent = `用时 ${formatDuration(record.durationSeconds)} · 错 ${record.wrongIds.length} 题`;
    button.querySelector(".status-pill").textContent = record.passed ? "通过" : "未通过";
    button.addEventListener("click", () => showExamResult(record));
    elements.examHistoryList.append(button);
  });
}

function showExamResult(record) {
  reviewRecord = record;
  reviewIndex = Math.max(0, record.questionIds.findIndex((id) => record.wrongIds.includes(id)));
  elements.resultSummary.innerHTML = `<div><p class="eyebrow">模拟考试成绩</p><h1>${record.score}<small>分</small></h1><strong class="result-status ${record.passed ? "passed" : "failed"}">${record.passed ? "考试通过" : "未达到90分"}</strong></div><div class="result-metrics"><span><small>正确</small><strong>${record.score}</strong></span><span><small>错误</small><strong>${record.wrongIds.length - record.unanswered}</strong></span><span><small>未答</small><strong>${record.unanswered}</strong></span><span><small>用时</small><strong>${formatDuration(record.durationSeconds)}</strong></span></div>`;
  renderReviewNavigator();
  renderReviewQuestion();
  showView("examResult");
  updateNavigation(null);
  window.scrollTo({ top: 0 });
}

function renderReviewNavigator() {
  elements.reviewNumberGrid.replaceChildren();
  reviewRecord.questionIds.forEach((questionId, index) => {
    const question = questionMap.get(questionId);
    const selected = reviewRecord.answers[questionId];
    const button = createElement("button", "number-button", String(index + 1));
    button.type = "button";
    button.classList.add(!selected ? "is-unanswered" : selected === question.answer ? "is-correct" : "is-wrong");
    if (index === reviewIndex) button.classList.add("is-current");
    button.addEventListener("click", () => {
      reviewIndex = index;
      renderReviewNavigator();
      renderReviewQuestion();
      window.scrollTo({ top: elements.resultSummary.offsetHeight, behavior: "smooth" });
    });
    elements.reviewNumberGrid.append(button);
  });
}

function renderReviewQuestion() {
  const questionId = reviewRecord.questionIds[reviewIndex];
  const question = questionMap.get(questionId);
  const selected = reviewRecord.answers[questionId];
  const isCorrect = selected === question.answer;
  elements.reviewQuestionNumber.textContent = `第 ${reviewIndex + 1} 题`;
  elements.reviewQuestionText.textContent = question.question;
  renderMedia(elements.reviewQuestionMedia, question.url);
  elements.reviewOptionsList.replaceChildren();
  question.itemsTitleArray.forEach((title, index) => {
    const button = createOptionButton(title, question.itemsDescArray[index], null);
    button.disabled = true;
    if (title === question.answer) button.classList.add("is-correct");
    if (title === selected && !isCorrect) button.classList.add("is-wrong");
    elements.reviewOptionsList.append(button);
  });
  elements.reviewAnswerResult.className = `answer-result ${isCorrect ? "is-success" : "is-error"}`;
  elements.reviewAnswerResult.textContent = !selected ? "未作答" : isCorrect ? "回答正确" : "回答错误";
  elements.reviewCorrectAnswer.textContent = `正确答案：${formatAnswer(question)}`;
  elements.reviewAnswerAnalysis.textContent = explanationToText(question.remark);
}

function openExamNavigator() {
  elements.examNavigator.classList.add("is-open");
  elements.examBackdrop.hidden = false;
}

function closeExamNavigator() {
  elements.examNavigator.classList.remove("is-open");
  elements.examBackdrop.hidden = true;
}

function persistProfile() {
  if (!activeProfile || !profileData) return;
  if (!saveProfileData(activeProfile.id, profileData)) showToast("本地保存失败，请检查浏览器存储空间");
  renderDashboard();
}

function showView(name) {
  Object.entries(views).forEach(([viewName, element]) => { element.hidden = viewName !== name; });
  const navViews = ["home", "practiceHub", "examHub", "wrongBook"];
  elements.bottomNav.hidden = !activeProfile || !navViews.includes(name);
}

function updateNavigation(activeView) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === activeView);
  });
}

function updateWrongBadge() {
  const count = profileData?.wrongIds.length ?? 0;
  elements.navWrongBadge.hidden = count === 0;
  elements.navWrongBadge.textContent = count > 99 ? "99+" : String(count);
}

function renderMedia(container, url) {
  container.hidden = true;
  container.classList.remove("media-error");
  container.replaceChildren();
  if (!url) return;
  const image = new Image();
  image.alt = "题目配图";
  image.loading = "eager";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("load", () => { container.hidden = false; });
  image.addEventListener("error", () => {
    container.classList.add("media-error");
    container.textContent = "题目图片加载失败，请检查网络后重试。";
    container.hidden = false;
  });
  image.src = url;
  container.append(image);
}

function createOptionButton(title, description, handler) {
  const button = createElement("button", "option-button");
  button.type = "button";
  button.dataset.answer = title;
  button.innerHTML = '<span class="option-letter"></span><span class="option-text"></span>';
  button.querySelector(".option-letter").textContent = title;
  button.querySelector(".option-text").textContent = description;
  if (handler) button.addEventListener("click", handler);
  return button;
}

function formatAnswer(question) {
  const index = question.itemsTitleArray.indexOf(question.answer);
  return `${question.answer}. ${question.itemsDescArray[index] ?? ""}`.trim();
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  requestAnimationFrame(() => elements.toast.classList.add("is-visible"));
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
    window.setTimeout(() => { elements.toast.hidden = true; }, 180);
  }, 2200);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function openResetDialog(type) {
  pendingResetType = type;
  const info = resetLabels[type];
  elements.resetDialogTitle.textContent = info.title;
  elements.resetDialogDesc.textContent = info.desc;
  elements.resetOverlay.hidden = false;
}

function closeResetDialog() {
  elements.resetOverlay.hidden = true;
  pendingResetType = null;
}

function executeReset() {
  if (!pendingResetType) return;
  switch (pendingResetType) {
    case "wrong":
      profileData.wrongIds = [];
      break;
    case "examHistory":
      profileData.examHistory = [];
      break;
    case "progress":
      profileData.answeredIds = [];
      profileData.totalAttempts = 0;
      profileData.correctAttempts = 0;
      profileData.sequentialIndex = 0;
      break;
    case "activeExam":
      profileData.activeExam = null;
      clearExamTimer();
      break;
    case "all":
      profileData = sanitizeProfileData(createEmptyProfileData(), questions);
      clearExamTimer();
      closeExamNavigator();
      break;
  }
  persistProfile();
  renderDashboard();
  renderDataManage();
  closeResetDialog();
  showToast(`${resetLabels[pendingResetType].title} 完成`);
}

function renderDataManage() {
  elements.manageWrongCount.textContent = `${profileData.wrongIds.length} 道`;
  elements.manageExamCount.textContent = `${profileData.examHistory.length} 次`;
  elements.manageProgressCount.textContent = `已做 ${profileData.answeredIds.length} 题`;
  elements.manageActiveExamCount.textContent = profileData.activeExam ? "1 场" : "无";
}
