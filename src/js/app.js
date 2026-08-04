import { explanationToText, loadQuestionsForSubject, shuffleQuestions, SUBJECT_CONFIG } from "./questions.js";
import {
  addExamHistory,
  createExamSession,
  EXAM_CONFIG,
  formatDuration,
  formatRemaining,
  getRemainingMs,
  gradeExam,
  isAnswerCorrect
} from "./exam.js";
import {
  createProfile,
  ensureDefaultProfile,
  listProfiles,
  loadProfileData,
  sanitizeProfileData,
  saveProfileData
} from "./storage.js";
import {
  staggerIn,
  countTo,
  shake,
  pulse,
  toastIn,
  toastOut,
  PRESETS,
  easeOutExpo
} from "./motion.js";

const elements = Object.fromEntries(
  [...document.querySelectorAll("[id]")].map((element) => [toCamelCase(element.id), element])
);

const views = {
  loading: elements.loadingView,
  error: elements.errorView,
  profile: elements.profileView,
  home: elements.homeView,
  practiceHub: elements.practiceHubView,
  specialHub: elements.specialHubView,
  wrongBook: elements.wrongBookView,
  practice: elements.practiceView,
  examHub: elements.examHubView,
  exam: elements.examView,
  examResult: elements.examResultView,
  my: elements.myView
};

const modeNames = {
  sequential: "顺序练习",
  random: "随机练习",
  wrong: "错题练习"
};

const specialCategories = [
  { id: "image", title: "图片题", copy: "集中练习看图判断", match: (q) => Boolean(q.url) },
  { id: "judge", title: "判断题", copy: "快速巩固基础判断", match: (q) => q.type === 3 },
  { id: "choice", title: "单选题", copy: "完整练习基础知识", match: (q) => q.type === 1 },
  { id: "multi", title: "多选题", copy: "安全文明多选专项", match: (q) => q.type === 2 },
  { id: "lights", title: "灯光题", copy: "远光、近光、雾灯、转向灯", match: (q) => hasKeyword(q, ["灯光", "远光", "近光", "示廓灯", "雾灯", "危险报警闪光", "转向灯", "前照灯", "夜间"]) },
  { id: "signs", title: "标志标线题", copy: "交通标志和路面标线", match: (q) => hasKeyword(q, ["标志", "标线", "指示标志", "警告标志", "禁令标志", "路面标记", "导向箭头", "停止线", "网状线", "实线", "虚线"]) },
  { id: "penalty", title: "罚款扣分题", copy: "记分、罚款、处罚", match: (q) => hasKeyword(q, ["罚款", "扣分", "记分", "满分", "12分", "9分", "6分", "3分", "1分", "200元", "500元", "1000元", "2000元", "二百元", "五百元", "一千元", "二千元"]) }
];

const helpSections = [
  ["快速开始", ["第一次打开 App 会自动进入默认本地档案。", "首页顶部可切换科目一/科目四，各自学习进度独立保存。", "首页会显示当前科目的学习状态、错题数、正确率和最近模考成绩。", "建议新用户先进入“刷题”，从顺序练习开始。", "做错的题会自动进入错题本。"]],
  ["科目一与科目四", ["科目一：道路交通安全法律法规，100题/45分钟考试。", "科目四：安全文明驾驶常识，50题/30分钟考试。", "科目四包含多选题，需要选择所有正确答案。", "两个科目的学习进度互不影响，可以分别追踪。"]],
  ["推荐学习路线", ["第 1 步：顺序练习，完整过一遍题库。", "第 2 步：错题本复习，优先处理做错过的题。", "第 3 步：专项练习，集中补图片题、灯光题、标志标线题、多选题等薄弱点。", "第 4 步：模拟考试，科目一按100题/45分钟，科目四按50题/30分钟。", "第 5 步：考前复盘，重点看错题和最近模考错题。"]],
  ["刷题说明", ["顺序练习适合第一次完整学习。", "随机练习适合复习阶段，避免只记住题目顺序。", "答题后会立即显示对错、正确答案和解析。", "多选题需要选择全部正确答案后点击“提交答案”。", "建议答错后先看解析，再进入下一题。", "刷题数据会计入已做题数和刷题正确率。"]],
  ["专项练习说明", ["图片题：集中练习看图判断。", "判断题：适合快速巩固基础。", "单选题：适合完整练习知识点。", "多选题：科目四专项，集中练习安全文明多选题。", "灯光题：集中练远光灯、近光灯、雾灯、转向灯等规则。", "标志标线题：集中练交通标志和路面标线。", "罚款扣分题：集中练记分、罚款、处罚相关题。", "专项分类根据题目内容关键词自动整理，可能不是百分百精确，但可用于集中复习。"]],
  ["错题本说明", ["答错的题会自动保存到错题本。", "错题会记录错误次数和连续答对次数。", "错误次数多的题会优先显示。", "连续答对 2 次后，App 会建议移出错题本。", "这样做是为了避免只答对一次或蒙对一次就过早移除。", "考前建议优先复习错题本。"]],
  ["模拟考试说明", ["科目一：每次随机抽取 100 题，限时 45 分钟，90 分及格。", "科目四：每次随机抽取 50 题，限时 30 分钟，90 分及格。", "未答题按错误计算。", "考试过程中不显示答案和解析。", "多选题需选择全部正确选项。", "交卷后显示分数、是否通过、正确数、错误数、未答数和逐题复盘。", "考试错题会加入错题本，但考试作答不计入刷题正确率。", "如果中途退出或关闭 App，回到模考页可以继续未完成考试。"]],
  ["什么时候适合约考", ["建议连续 3 次模拟考试 92 分以上。", "错题本数量明显减少。", "灯光题、标志标线题、罚款扣分题不再频繁出错。", "考前一天建议少刷生题，多复习错题和最近模考错题。"]],
  ["考前速记：扣分罚款", ["先抓关键词：证、牌、酒、逃、假、超、占、逆，这些通常是高频处罚题。", "遇到金额、分值、期限类题，不要靠感觉选，优先回到题目解析和错题本复盘。", "同一类违法行为经常换说法，复习时看关键词，不只背选项位置。", "考前优先复盘自己做错过的扣分罚款题，比临时刷生题更稳。"]],
  ["考前速记：灯光题", ["夜间会车、跟车、通过照明良好路段时，优先想到近光灯。", "雾天行车重点记住雾灯和危险报警闪光灯，不要只看一个灯光名。", "转弯、变更车道、靠边停车，先想到提前开启转向灯。", "题目出现“远光灯”时要特别谨慎，很多题考的是不能乱用远光。"]],
  ["学习节奏示例", ["3 天冲刺：第 1 天顺序练习 + 图片题专项；第 2 天错题本 + 罚款扣分题 + 标志标线题；第 3 天连续做模拟考试，考后只复盘错题。", "7 天稳妥：第 1-2 天顺序练习；第 3 天错题本；第 4 天专项练习；第 5 天模考 1-2 次；第 6 天错题本 + 最近模考错题；第 7 天轻量复习，不建议熬夜刷题。"]],
  ["本地数据说明", ["所有档案、刷题进度、错题和考试记录只保存在当前手机。", "App 不需要账号，不上传成绩或答题数据。", "换手机后，数据不会自动同步。", "卸载 App 后，安卓系统会清除本地数据。", "多人共用同一台手机时，可以在“我的”页切换档案。"]],
  ["删除数据说明", ["可以分别清空错题本、考试记录、刷题进度。", "也可以清空当前档案全部学习数据。", "删除只影响当前档案的当前科目，不影响其他科目。", "删除前会二次确认。", "删除后不能恢复。"]],
  ["常见问题", ["换手机后数据还在吗？不在，数据只保存在当前手机。", "卸载后数据还在吗？不在，卸载会清除本地数据。", "考试中退出怎么办？重新打开 App 后可以继续未完成考试。", "为什么专项分类有时不完全准确？因为首版按关键词自动分类，不是人工逐题标注。", "为什么错题答对一次没有自动删除？为了避免蒙对一次就移除，连续答对 2 次更稳。", "为什么模考错题会进错题本，但不影响刷题正确率？模考用于检测水平，刷题正确率只统计练习模式。"]]
];

let questions = [];
let questionMap = new Map();
let currentSubject = 1;
let activeProfile = null;
let profileData = null;
let currentMode = null;
let currentQueue = [];
let queueIndex = 0;
let currentQuestion = null;
let answerLocked = false;
let multiSelected = new Set();
let examTimerId = null;
let reviewRecord = null;
let reviewIndex = 0;
let toastTimer = null;
let activeViewName = "loading";
let lastBackPressAt = 0;
let firstHomeRender = true;
let dashboardAnimated = false;

const VIEW_LEVEL = {
  loading: -1,
  error: -1,
  profile: -1,
  home: 0,
  practiceHub: 1,
  specialHub: 1,
  wrongBook: 1,
  examHub: 1,
  my: 1,
  practice: 2,
  exam: 2,
  examResult: 2
};

bindEvents();
setupNativeBackButton();
initialize();

async function initialize() {
  clearExamTimer();
  showView("loading");

  const splashTitle = elements.splashTitle;
  const progressBar = elements.splashProgressBar;
  const splashStartedAt = performance.now();
  const minimumSplashMs = 1100;
  let progressTimer = null;

  if (splashTitle) {
    splashTitle.textContent = "";
    [..."正在加载题库"].forEach((character, index) => {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = character;
      span.style.animationDelay = `${index * 60 + 180}ms`;
      splashTitle.append(span);
    });
  }
  if (progressBar) {
    progressBar.style.width = "0%";
    progressTimer = window.setInterval(() => {
      const progress = Math.min(((performance.now() - splashStartedAt) / minimumSplashMs) * 92, 92);
      progressBar.style.width = `${progress}%`;
    }, 50);
  }

  try {
    currentSubject = restoreLastSubject();
    questions = await loadQuestionsForSubject(currentSubject);
    questionMap = new Map(questions.map((q) => [q.id, q]));
    updateSubjectUI();
    const remaining = minimumSplashMs - (performance.now() - splashStartedAt);
    if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
    if (progressTimer) window.clearInterval(progressTimer);
    if (progressBar) progressBar.style.width = "100%";
    elements.loadingView.classList.add("splash-exit");
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    elements.loadingView.classList.remove("splash-exit");
    activateProfile(ensureDefaultProfile());
  } catch (error) {
    if (progressTimer) window.clearInterval(progressTimer);
    elements.errorMessage.textContent = `${error.message}。请确认题库文件存在，或运行 npm.cmd run dev 后再访问页面。`;
    showView("error");
  }
}

function applySubject() {
  questionMap = new Map(questions.map((q) => [q.id, q]));
  updateSubjectUI();
}

function updateSubjectUI() {
  const cfg = SUBJECT_CONFIG[currentSubject];
  const toggle = elements.subjectToggle;
  if (toggle) {
    toggle.textContent = currentSubject === 1 ? "科目一" : "科目四";
    toggle.setAttribute("data-subject", currentSubject);
  }
  const brandSpan = document.querySelector(".brand-button > span:last-child");
  if (brandSpan) {
    brandSpan.textContent = `C1 ${cfg.name}通关助手`;
  }
  const brandMark = document.querySelector(".brand-mark");
  if (brandMark) {
    brandMark.textContent = currentSubject === 1 ? "C1" : "C4";
  }
  // Dynamic exam hub text
  const examCfg = EXAM_CONFIG[currentSubject];
  const examDesc = document.querySelector("#exam-hub-view .page-heading p");
  if (examDesc) {
    examDesc.textContent = `${examCfg.questionCount}题，${examCfg.durationMs / 60000}分钟，${examCfg.passScore}分及格。考试中不显示答案。`;
  }
  // Feature card text
  const examCard = document.querySelector("[data-view='exam-hub'] strong");
  if (examCard) {
    examCard.textContent = `${examCfg.questionCount}题 · ${examCfg.durationMs / 60000}分钟 · ${examCfg.passScore}分及格`;
  }
  document.title = `C1 ${cfg.name}通关助手`;
}

function restoreLastSubject() {
  try {
    const raw = localStorage.getItem("c1-kemuyi-last-subject");
    const val = parseInt(raw);
    return [1, 4].includes(val) ? val : 1;
  } catch {
    return 1;
  }
}

function saveLastSubject() {
  try {
    localStorage.setItem("c1-kemuyi-last-subject", String(currentSubject));
  } catch { /* ignore */ }
}

async function switchSubject(newSubject) {
  if (newSubject === currentSubject) return;
  // Save current progress
  if (activeProfile && profileData) {
    saveProfileData(activeProfile.id, profileData, currentSubject);
  }
  // Clear exam timer
  clearExamTimer();
  closeExamNavigator();
  // Switch and load new subject data
  currentSubject = newSubject;
  saveLastSubject();
  showView("loading");
  try {
    questions = await loadQuestionsForSubject(newSubject);
    questionMap = new Map(questions.map((q) => [q.id, q]));
    updateSubjectUI();
    // Reload profile data for new subject
    if (activeProfile) {
      profileData = sanitizeProfileData(loadProfileData(activeProfile.id, currentSubject), questions);
      persistProfile(false);
      if (profileData.activeExam && getRemainingMs(profileData.activeExam) === 0) {
        submitExam(true);
        showToast("上次考试已到时，系统已自动交卷");
        return;
      }
    }
    currentMode = null;
    currentQuestion = null;
    reviewRecord = null;
    multiSelected = new Set();
    answerLocked = false;
    dashboardAnimated = false;
    renderDashboard();
    showView("home");
    updateNavigation("home");
    window.scrollTo({ top: 0 });
    showToast(`已切换到${SUBJECT_CONFIG[currentSubject].name}`);
  } catch (error) {
    elements.errorMessage.textContent = `${error.message}。请确认题库文件存在。`;
    showView("error");
  }
}

function bindEvents() {
  elements.retryButton.addEventListener("click", initialize);
  elements.brandButton.addEventListener("click", () => activeProfile && navigateTo("home"));
  elements.topMyButton.addEventListener("click", () => activeProfile && navigateTo("my"));
  elements.subjectToggle.addEventListener("click", () => {
    switchSubject(currentSubject === 1 ? 4 : 1);
  });
  elements.switchProfileFromMy.addEventListener("click", switchProfile);
  elements.profileForm.addEventListener("submit", handleCreateProfile);
  elements.homeHelpButton.addEventListener("click", () => navigateTo("my", { help: true }));
  elements.memoryMoreButton.addEventListener("click", () => navigateTo("my", { memory: true }));
  elements.leavePracticeButton.addEventListener("click", () => navigateTo(currentMode?.startsWith("special:") ? "special-hub" : "practice-hub"));
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
  elements.reduceMotionToggle.addEventListener("change", () => {
    profileData.preferences.reduceMotion = elements.reduceMotionToggle.checked;
    applyMotionPreference();
    persistProfile(false);
    showToast(elements.reduceMotionToggle.checked ? "已减少动画" : "已开启动画");
  });
  document.addEventListener("keydown", handleStudyShortcut);

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => startPractice(button.dataset.mode));
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.view));
  });
  document.querySelectorAll("[data-delete-action]").forEach((button) => {
    button.addEventListener("click", () => handleDeleteAction(button.dataset.deleteAction));
  });
}

function handleStudyShortcut(event) {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;

  const optionIndex = { "1": 0, "2": 1, "3": 2, "4": 3 }[event.key];
  if (optionIndex !== undefined && ["practice", "exam"].includes(activeViewName)) {
    const optionList = activeViewName === "practice" ? elements.optionsList : elements.examOptionsList;
    const option = optionList.querySelectorAll(".option-button")[optionIndex];
    if (option && !option.disabled) {
      event.preventDefault();
      option.click();
    }
    return;
  }

  if (event.key === " " || event.key === "Enter") {
    if (activeViewName === "practice" && answerLocked) {
      event.preventDefault();
      goToNextQuestion();
    } else if (activeViewName === "exam" && profileData?.activeExam) {
      event.preventDefault();
      moveExam(1);
    }
    return;
  }

  if (event.key === "Backspace") {
    if (activeViewName === "practice" && currentQuestion) {
      event.preventDefault();
      goToPreviousQuestion();
    } else if (activeViewName === "exam" && profileData?.activeExam) {
      event.preventDefault();
      moveExam(-1);
    }
  }
}

function activateProfile(profile) {
  activeProfile = profile;
  profileData = sanitizeProfileData(loadProfileData(profile.id, currentSubject), questions);
  persistProfile(false);
  elements.myProfileName.textContent = profile.name;
  applyMotionPreference();
  dashboardAnimated = false;

  if (profileData.activeExam && getRemainingMs(profileData.activeExam) === 0) {
    submitExam(true);
    showToast("上次考试已到时，系统已自动交卷");
    return;
  }

  renderDashboard();
  showView("home");
  updateNavigation("home");
}

function renderProfileChooser() {
  const profiles = listProfiles();
  elements.profileList.replaceChildren();
  elements.profileFormError.textContent = "";

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

  if (shouldAnimate()) {
    staggerIn([...elements.profileList.children], { y: 16, opacity: 0 }, { stagger: 70, config: PRESETS.gentle });
  }
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

function switchProfile() {
  clearExamTimer();
  closeExamNavigator();
  activeProfile = null;
  profileData = null;
  currentQuestion = null;
  reviewRecord = null;
  multiSelected = new Set();
  dashboardAnimated = false;
  renderProfileChooser();
  showView("profile");
  window.scrollTo({ top: 0 });
}

function navigateTo(viewName, options = {}) {
  if (!activeProfile) return;
  if (viewName !== "exam") clearExamTimer();
  currentMode = null;
  currentQuestion = null;
  multiSelected = new Set();
  answerLocked = false;

  if (viewName === "home") renderDashboard();
  if (viewName === "practice-hub") renderPracticeHub();
  if (viewName === "special-hub") renderSpecialHub();
  if (viewName === "wrong-book") renderWrongBook();
  if (viewName === "exam-hub") renderExamHub();
  if (viewName === "my") renderMyPage();
  showView(toViewKey(viewName));
  updateNavigation(viewName);
  window.scrollTo({ top: 0, behavior: shouldAnimate() ? "smooth" : "auto" });
  if (options.help) setTimeout(() => document.querySelector(".help-list")?.scrollIntoView({ behavior: shouldAnimate() ? "smooth" : "auto" }), 80);
  if (options.memory) setTimeout(() => document.querySelector(".memory-help")?.scrollIntoView({ behavior: shouldAnimate() ? "smooth" : "auto" }), 80);
}

function startPractice(mode) {
  currentMode = mode;
  queueIndex = 0;
  multiSelected = new Set();
  answerLocked = false;

  if (mode === "sequential") {
    currentQueue = questions;
    queueIndex = Math.min(profileData.sequentialIndex, questions.length - 1);
  } else if (mode === "random") {
    currentQueue = shuffleQuestions(questions);
  } else if (mode === "wrong") {
    currentQueue = getSortedWrongQuestions();
  } else if (mode.startsWith("special:")) {
    const categoryId = mode.replace("special:", "");
    const category = specialCategories.find((item) => item.id === categoryId);
    currentQueue = shuffleQuestions(questions.filter(category.match));
  }

  showView("practice");
  updateNavigation(mode.startsWith("special:") ? "special-hub" : null);
  elements.practiceModeTitle.textContent = getPracticeTitle(mode);
  if (!currentQueue.length) {
    renderPracticeEmpty("暂无可练习题目", "这个分类暂时没有筛选到题目，可以先练其他模式。", "返回");
    return;
  }
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  currentQuestion = currentQueue[queueIndex];
  answerLocked = false;
  multiSelected = new Set();
  elements.practiceWorkspace.hidden = false;
  elements.practiceEmpty.hidden = true;
  elements.nextQuestionButton.hidden = true;
  elements.answerPanel.hidden = true;
  elements.answerPlaceholder.hidden = false;
  elements.wrongResolution.hidden = true;
  elements.practicePosition.textContent = `${queueIndex + 1} / ${currentQueue.length}`;
  elements.questionNumber.textContent = `第 ${queueIndex + 1} 题`;
  elements.questionType.textContent = currentQuestion.type === 3 ? "判断题" : currentQuestion.type === 2 ? "多选题" : "单选题";
  elements.questionText.textContent = currentQuestion.question;
  renderMiniStats();
  renderMedia(elements.questionMedia, currentQuestion.url);
  renderPracticeOptions();
  window.scrollTo({ top: 0, behavior: shouldAnimate() ? "smooth" : "auto" });
}

function renderPracticeOptions() {
  elements.optionsList.replaceChildren();
  const isMulti = currentQuestion.type === 2;
  currentQuestion.itemsTitleArray.forEach((title, index) => {
    const desc = currentQuestion.itemsDescArray[index];
    if (isMulti) {
      elements.optionsList.append(createMultiOptionButton(title, desc));
    } else {
      elements.optionsList.append(createOptionButton(title, desc, () => answerQuestion(title)));
    }
  });
  if (isMulti) {
    const submitBtn = createElement("button", "button button-primary multi-submit-button", "提交答案");
    submitBtn.type = "button";
    submitBtn.addEventListener("click", () => submitMultiAnswer());
    elements.optionsList.append(submitBtn);
  }
}

function submitMultiAnswer() {
  if (answerLocked || !currentQuestion || currentQuestion.type !== 2) return;
  if (!multiSelected.size) return;
  const selected = [...multiSelected].sort().join(",");
  answerQuestion(selected);
}

function answerQuestion(selectedAnswer) {
  if (answerLocked || !currentQuestion) return;
  answerLocked = true;
  const wasWrong = profileData.wrongIds.includes(currentQuestion.id);
  const isCorrect = isAnswerCorrect(selectedAnswer, currentQuestion);
  const now = Date.now();
  const stat = ensureWrongStat(currentQuestion.id);

  profileData.totalAttempts += 1;
  if (isCorrect) profileData.correctAttempts += 1;
  if (!profileData.answeredIds.includes(currentQuestion.id)) profileData.answeredIds.push(currentQuestion.id);
  stat.lastPracticedAt = now;

  if (isCorrect) {
    if (wasWrong) stat.correctStreak += 1;
  } else {
    stat.wrongCount += 1;
    stat.correctStreak = 0;
    stat.lastWrongAt = now;
    if (!profileData.wrongIds.includes(currentQuestion.id)) profileData.wrongIds.push(currentQuestion.id);
  }
  persistProfile();

  // Highlight all option buttons
  let feedbackButton = null;
  elements.optionsList.querySelectorAll(".option-button").forEach((button) => {
    button.disabled = true;
    const ans = button.dataset.answer;
    if (currentQuestion.type === 2) {
      const correctAnswers = currentQuestion.answer.split(",");
      const selectedAnswers = selectedAnswer.split(",");
      if (correctAnswers.includes(ans)) button.classList.add("is-correct");
      if (selectedAnswers.includes(ans) && !correctAnswers.includes(ans)) button.classList.add("is-wrong");
      if (selectedAnswers.includes(ans)) feedbackButton ??= button;
    } else {
      if (ans === currentQuestion.answer) button.classList.add("is-correct");
      if (ans === selectedAnswer && !isCorrect) button.classList.add("is-wrong");
      if (ans === selectedAnswer) feedbackButton = button;
    }
  });
  // Hide multi-submit button
  const submitBtn = elements.optionsList.querySelector(".multi-submit-button");
  if (submitBtn) submitBtn.hidden = true;

  if (shouldAnimate() && feedbackButton) {
    if (isCorrect) {
      pulse(feedbackButton);
      spawnCelebrationParticles(feedbackButton);
    } else {
      shake(feedbackButton);
    }
  }

  renderAnswerPanel(currentQuestion, isCorrect, wasWrong);
}

function renderAnswerPanel(question, isCorrect, wasWrong) {
  const stat = profileData.wrongStats[question.id];
  const mastered = isCorrect && wasWrong && stat?.correctStreak >= 2;
  elements.answerResult.className = `answer-result ${isCorrect ? "is-success" : "is-error"}`;
  elements.answerResult.textContent = isCorrect ? "回答正确" : "回答错误";
  elements.correctAnswer.textContent = `正确答案：${formatAnswer(question)}`;
  elements.answerAnalysis.textContent = explanationToText(question.remark);
  const tip = [question.answerSkill, question.answerSkillExplain].filter(Boolean).filter((value, index, items) => items.indexOf(value) === index).join("\n");
  elements.answerTip.textContent = tip;
  elements.answerTipBlock.hidden = !tip;
  elements.wrongResolution.hidden = !(isCorrect && wasWrong);
  elements.wrongResolutionCopy.textContent = mastered ? "这道错题已经连续答对 2 次，建议移出错题本。" : "这道错题已经答对，要从错题本移除吗？";
  elements.answerPlaceholder.hidden = true;
  elements.answerPanel.hidden = false;
  elements.nextQuestionButton.hidden = false;
  if (window.innerWidth < 1024) elements.answerColumn.scrollIntoView({ behavior: shouldAnimate() ? "smooth" : "auto", block: "start" });
}

function resolveWrongQuestion(shouldRemove) {
  if (shouldRemove && currentQuestion) {
    profileData.wrongIds = profileData.wrongIds.filter((id) => id !== currentQuestion.id);
    delete profileData.wrongStats[currentQuestion.id];
    persistProfile();
    showToast("已移出错题本");
  } else {
    showToast("已暂时保留在错题本");
  }
  elements.wrongResolution.hidden = true;
}

function goToNextQuestion() {
  if (!answerLocked) return;
  if (currentMode === "sequential") {
    if (queueIndex + 1 >= currentQueue.length) {
      profileData.sequentialIndex = 0;
      persistProfile();
      renderPracticeEmpty("顺序练习已完成", "当前科目题目已经完整练习一轮。", "重新开始");
      return;
    }
    queueIndex += 1;
    profileData.sequentialIndex = queueIndex;
    persistProfile();
  } else {
    queueIndex += 1;
    if (queueIndex >= currentQueue.length) {
      renderPracticeEmpty("本轮练习已完成", "本轮题目没有重复，可以开始新一轮。", "再来一轮");
      return;
    }
  }
  renderCurrentQuestion();
}

function goToPreviousQuestion() {
  if (!currentQueue.length || queueIndex <= 0) return;
  queueIndex -= 1;
  if (currentMode === "sequential") {
    profileData.sequentialIndex = queueIndex;
    persistProfile(false);
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
    if (currentMode === "sequential") startPractice("sequential");
    else if (currentMode === "random") startPractice("random");
    else if (currentMode === "wrong") navigateTo(profileData.wrongIds.length ? "wrong-book" : "practice-hub");
    else if (currentMode?.startsWith("special:")) startPractice(currentMode);
    else navigateTo("home");
  });
  elements.practiceEmpty.append(icon, heading, paragraph, action);
}

function renderPracticeHub() {
  elements.sequenceProgress.textContent = `从第 ${profileData.sequentialIndex + 1} 题继续`;
  elements.wrongModeCopy.textContent = profileData.wrongIds.length ? `当前 ${profileData.wrongIds.length} 道错题` : "当前没有错题";
  if (shouldAnimate()) {
    const cards = document.querySelectorAll("#practice-hub-view .mode-card");
    staggerIn([...cards], { y: 20, opacity: 0 }, { stagger: 80, config: PRESETS.gentle, delay: 60 });
  }
}

function renderSpecialHub() {
  elements.specialCategoryList.replaceChildren();
  specialCategories.forEach((category, index) => {
    const count = questions.filter(category.match).length;
    const button = createElement("button", "mode-card special-card");
    button.type = "button";
    button.innerHTML = `<span class="mode-index">${String(index + 1).padStart(2, "0")}</span><span class="mode-copy"><strong></strong><small></small></span><span class="mode-arrow">→</span>`;
    button.querySelector("strong").textContent = category.title;
    button.querySelector("small").textContent = `${category.copy} · ${count} 题`;
    button.addEventListener("click", () => startPractice(`special:${category.id}`));
    elements.specialCategoryList.append(button);
  });
  if (shouldAnimate()) {
    staggerIn([...elements.specialCategoryList.children], { y: 18, opacity: 0 }, { stagger: 55, config: PRESETS.gentle });
  }
}

function renderDashboard() {
  if (!profileData) return;
  const accuracy = profileData.totalAttempts ? Math.round((profileData.correctAttempts / profileData.totalAttempts) * 100) : 0;
  if (shouldAnimate() && !dashboardAnimated) {
    const heroTitle = elements.homeTitle;
    if (heroTitle && !heroTitle.querySelector(".char")) {
      const text = heroTitle.textContent;
      heroTitle.textContent = "";
      [...text].forEach((character, index) => {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = character;
        span.style.animationDelay = `${index * 45 + 100}ms`;
        heroTitle.append(span);
      });
    }

    elements.totalCount.textContent = "0";
    elements.answeredCount.textContent = "0";
    elements.accuracyValue.textContent = "0%";
    elements.wrongCount.textContent = "0";
    requestAnimationFrame(() => {
      countTo(elements.totalCount, questions.length, { duration: 1300, easing: easeOutExpo });
      countTo(elements.answeredCount, profileData.answeredIds.length, { duration: 1200, easing: easeOutExpo });
      countTo(elements.accuracyValue, accuracy, { duration: 1400, easing: easeOutExpo, suffix: "%" });
      countTo(elements.wrongCount, profileData.wrongIds.length, { duration: 1100, easing: easeOutExpo });
      staggerIn([...document.querySelectorAll("#home-view .stat-card")], { y: 20, opacity: 0 }, { stagger: 75, config: PRESETS.gentle });
      staggerIn([...document.querySelectorAll("#home-view .feature-card")], { y: 16, opacity: 0 }, { stagger: 90, config: PRESETS.gentle, delay: 240 });
    });
    dashboardAnimated = true;
  } else {
    elements.totalCount.textContent = questions.length.toLocaleString("zh-CN");
    elements.answeredCount.textContent = profileData.answeredIds.length.toLocaleString("zh-CN");
    elements.accuracyValue.textContent = `${accuracy}%`;
    elements.wrongCount.textContent = profileData.wrongIds.length.toLocaleString("zh-CN");
  }
  elements.homeAdvice.textContent = getHomeAdvice(accuracy);
  renderRecentScores();
  renderPracticeHub();
  updateSubjectUI();
}

function renderRecentScores() {
  const scores = profileData.examHistory.slice(0, 3).map((record) => record.score);
  elements.recentScores.replaceChildren();
  if (!scores.length) {
    elements.recentScores.append(createElement("span", "score-empty", "还没有模考记录"));
    return;
  }
  scores.forEach((score, index) => {
    const item = createElement("span", `score-pill ${score >= 92 ? "is-good" : score >= 90 ? "is-pass" : ""}`, `第${index + 1}近：${score}分`);
    elements.recentScores.append(item);
  });
}

function getHomeAdvice(accuracy) {
  const scores = profileData.examHistory.slice(0, 3).map((record) => record.score);
  if (scores.length >= 3 && scores.every((score) => score >= 92)) {
    return "状态不错，可以考虑约考，考前继续复习错题更稳。";
  }
  if (profileData.wrongIds.length > 0) return `今日建议：先练 ${profileData.wrongIds.length} 道错题，再做一组专项练习。`;
  if (profileData.examHistory.length === 0 && profileData.answeredIds.length >= 100) return "今日建议：可以做一次模拟考试，检测当前水平。";
  if (accuracy < 85 && profileData.totalAttempts > 20) return "今日建议：先做专项练习，优先补薄弱题型。";
  return "连续 3 次模拟考试 92 分以上，再去约考更稳。";
}

function renderWrongBook() {
  const wrongQuestions = getSortedWrongQuestions();
  elements.wrongBookSummary.textContent = wrongQuestions.length ? `共 ${wrongQuestions.length} 道错题，连续答对 2 次后建议移出。` : "做错的题会自动保存在这里。";
  elements.startWrongPractice.disabled = !wrongQuestions.length;
  elements.wrongBookContent.replaceChildren();
  if (!wrongQuestions.length) {
    const empty = createElement("div", "state-panel compact-state wrong-empty");
    empty.innerHTML = '<div class="state-icon">✓</div><h2>目前没有错题</h2><p>去练几道题，保持这个好状态。</p>';
    elements.wrongBookContent.append(empty);
    return;
  }
  const list = createElement("ol", "wrong-list");
  wrongQuestions.slice(0, 50).forEach((question, index) => {
    const stat = profileData.wrongStats[question.id] || {};
    const item = createElement("li", "wrong-item");
    item.innerHTML = '<span class="wrong-item-number"></span><div><p></p><div class="wrong-meta"></div></div>';
    item.querySelector(".wrong-item-number").textContent = String(index + 1).padStart(2, "0");
    item.querySelector("p").textContent = question.question;
    item.querySelector(".wrong-meta").textContent = `错误 ${stat.wrongCount || 1} 次 · 连续答对 ${stat.correctStreak || 0} 次`;
    list.append(item);
  });
  elements.wrongBookContent.append(list);
  if (wrongQuestions.length > 50) elements.wrongBookContent.append(createElement("p", "list-remainder", `另有 ${wrongQuestions.length - 50} 道错题，请进入错题练习继续复习。`));
}

function renderExamHub() {
  const exam = profileData.activeExam;
  const examCfg = EXAM_CONFIG[currentSubject];
  elements.resumeExamCard.hidden = !exam;
  elements.newExamButton.textContent = exam ? "放弃并开始新考试" : "开始新考试";
  if (exam) {
    const answered = Object.keys(exam.answers).length;
    elements.resumeExamCopy.textContent = `已答 ${answered}/${examCfg.questionCount}，剩余 ${formatRemaining(getRemainingMs(exam))}`;
  }
  renderExamHistory();
}

function handleNewExam() {
  if (profileData.activeExam && !window.confirm("当前有未完成的考试。放弃它并开始新考试吗？")) return;
  profileData.activeExam = createExamSession(questions, currentSubject);
  persistProfile();
  enterExam();
}

function enterExam() {
  if (!profileData.activeExam) return;
  if (getRemainingMs(profileData.activeExam) === 0) {
    submitExam(true);
    return;
  }
  multiSelected = new Set();
  showView("exam");
  updateNavigation(null);
  renderExamQuestion();
  startExamTimer();
  window.scrollTo({ top: 0 });
}

function renderExamQuestion() {
  const exam = profileData.activeExam;
  const question = questionMap.get(exam.questionIds[exam.currentIndex]);
  const examCfg = EXAM_CONFIG[currentSubject];
  elements.examQuestionNumber.textContent = `第 ${exam.currentIndex + 1} 题`;
  elements.examQuestionText.textContent = question.question;
  renderMedia(elements.examQuestionMedia, question.url);
  elements.examOptionsList.replaceChildren();
  const isMulti = question.type === 2;
  question.itemsTitleArray.forEach((title, index) => {
    if (isMulti) {
      const button = createMultiOptionButton(title, question.itemsDescArray[index]);
      const saved = exam.answers[question.id];
      if (saved && saved.split(",").includes(title)) {
        multiSelected.add(title);
        button.classList.add("is-selected");
      }
      elements.examOptionsList.append(button);
    } else {
      const button = createOptionButton(title, question.itemsDescArray[index], () => selectExamAnswer(question.id, title));
      if (exam.answers[question.id] === title) button.classList.add("is-selected");
      elements.examOptionsList.append(button);
    }
  });
  elements.examPreviousButton.disabled = exam.currentIndex === 0;
  const maxIdx = examCfg.questionCount - 1;
  elements.examNextButton.textContent = exam.currentIndex === maxIdx ? "检查答题卡" : "下一题";
  renderExamNavigator();
  updateExamProgress();
}

function selectExamAnswer(questionId, answer) {
  const exam = profileData.activeExam;
  const question = questionMap.get(questionId);
  if (question?.type === 2) {
    // Multi-select toggle
    if (multiSelected.has(answer)) {
      multiSelected.delete(answer);
    } else {
      multiSelected.add(answer);
    }
    if (multiSelected.size) {
      exam.answers[questionId] = [...multiSelected].sort().join(",");
    } else {
      delete exam.answers[questionId];
    }
  } else {
    exam.answers[questionId] = answer;
  }
  persistProfile(false);
  renderExamQuestion();
}

function moveExam(offset) {
  const exam = profileData.activeExam;
  const examCfg = EXAM_CONFIG[currentSubject];
  const maxIdx = examCfg.questionCount - 1;
  const next = exam.currentIndex + offset;
  if (offset > 0 && next > maxIdx) {
    openExamNavigator();
    return;
  }
  exam.currentIndex = Math.max(0, Math.min(next, maxIdx));
  persistProfile(false);
  renderExamQuestion();
  window.scrollTo({ top: 0, behavior: shouldAnimate() ? "smooth" : "auto" });
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
      persistProfile(false);
      closeExamNavigator();
      renderExamQuestion();
      window.scrollTo({ top: 0, behavior: shouldAnimate() ? "smooth" : "auto" });
    });
    elements.examNumberGrid.append(button);
  });
}

function updateExamProgress() {
  const exam = profileData.activeExam;
  const examCfg = EXAM_CONFIG[currentSubject];
  const answered = Object.keys(exam.answers).length;
  elements.examProgress.textContent = `已答 ${answered} / ${examCfg.questionCount}`;
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
  const examCfg = EXAM_CONFIG[currentSubject];
  const unanswered = exam.questionIds.length - Object.keys(exam.answers).length;
  if (!automatic && !window.confirm(unanswered ? `还有 ${unanswered} 题未作答，确定交卷吗？` : "已完成全部题目，确定交卷吗？")) return;

  const record = gradeExam(exam, questionMap);
  profileData.examHistory = addExamHistory(profileData.examHistory, record);
  for (const id of record.wrongIds) {
    if (!profileData.wrongIds.includes(id)) profileData.wrongIds.push(id);
    const stat = ensureWrongStat(id);
    stat.wrongCount += 1;
    stat.correctStreak = 0;
    stat.lastWrongAt = Date.now();
  }
  profileData.activeExam = null;
  persistProfile();
  clearExamTimer();
  closeExamNavigator();
  multiSelected = new Set();
  showExamResult(record);
}

function renderExamHistory() {
  elements.examHistoryList.replaceChildren();
  if (!profileData.examHistory.length) {
    elements.examHistoryList.append(createElement("div", "history-empty", "还没有考试记录，完成第一场模拟考试后会显示在这里。"));
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
  const examCfg = EXAM_CONFIG[record.subject] || EXAM_CONFIG[1];
  const wrongCount = record.wrongIds.length - record.unanswered;
  reviewIndex = Math.max(0, record.questionIds.findIndex((id) => record.wrongIds.includes(id)));
  elements.resultSummary.innerHTML = `<div><p class="eyebrow">模拟考试成绩</p><h1><span id="result-score-value">0</span><small>分</small></h1><strong class="result-status ${record.passed ? "passed" : "failed"}">${record.passed ? "考试通过" : `未达到${examCfg.passScore}分`}</strong></div><div class="result-metrics"><span><small>正确</small><strong>${record.score}</strong></span><span><small>错误</small><strong>${wrongCount}</strong></span><span><small>未答</small><strong>${record.unanswered}</strong></span><span><small>用时</small><strong>${formatDuration(record.durationSeconds)}</strong></span></div>`;
  renderReviewNavigator();
  renderReviewQuestion();
  showView("examResult");
  updateNavigation(null);
  window.scrollTo({ top: 0 });
  const scoreElement = document.getElementById("result-score-value");
  if (scoreElement) {
    if (shouldAnimate()) countTo(scoreElement, record.score, { duration: 1200, easing: easeOutExpo });
    else scoreElement.textContent = String(record.score);
  }
  if (record.passed && shouldAnimate()) spawnConfetti();
}

function renderReviewNavigator() {
  elements.reviewNumberGrid.replaceChildren();
  reviewRecord.questionIds.forEach((questionId, index) => {
    const question = questionMap.get(questionId);
    const selected = reviewRecord.answers[questionId];
    const button = createElement("button", "number-button", String(index + 1));
    button.type = "button";
    const isCorrect = isAnswerCorrect(selected, question);
    button.classList.add(!selected ? "is-unanswered" : isCorrect ? "is-correct" : "is-wrong");
    if (index === reviewIndex) button.classList.add("is-current");
    button.addEventListener("click", () => {
      reviewIndex = index;
      renderReviewNavigator();
      renderReviewQuestion();
      window.scrollTo({ top: elements.resultSummary.offsetHeight, behavior: shouldAnimate() ? "smooth" : "auto" });
    });
    elements.reviewNumberGrid.append(button);
  });
}

function renderReviewQuestion() {
  const questionId = reviewRecord.questionIds[reviewIndex];
  const question = questionMap.get(questionId);
  const selected = reviewRecord.answers[questionId];
  const isCorrect = isAnswerCorrect(selected, question);
  elements.reviewQuestionNumber.textContent = `第 ${reviewIndex + 1} 题`;
  elements.reviewQuestionText.textContent = question.question;
  renderMedia(elements.reviewQuestionMedia, question.url);
  elements.reviewOptionsList.replaceChildren();
  const isMulti = question.type === 2;
  question.itemsTitleArray.forEach((title, index) => {
    const button = createOptionButton(title, question.itemsDescArray[index], null);
    button.disabled = true;
    if (isMulti) {
      button.classList.add("multi-option");
      const correctAnswers = question.answer.split(",");
      const selectedAnswers = selected ? selected.split(",") : [];
      if (correctAnswers.includes(title)) button.classList.add("is-correct");
      if (selectedAnswers.includes(title) && !correctAnswers.includes(title)) button.classList.add("is-wrong");
    } else {
      if (title === question.answer) button.classList.add("is-correct");
      if (title === selected && !isCorrect) button.classList.add("is-wrong");
    }
    elements.reviewOptionsList.append(button);
  });
  elements.reviewAnswerResult.className = `answer-result ${isCorrect ? "is-success" : "is-error"}`;
  elements.reviewAnswerResult.textContent = !selected ? "未作答" : isCorrect ? "回答正确" : "回答错误";
  elements.reviewCorrectAnswer.textContent = `正确答案：${formatAnswer(question)}`;
  elements.reviewAnswerAnalysis.textContent = explanationToText(question.remark);
}

function renderMyPage() {
  elements.myProfileName.textContent = activeProfile.name;
  elements.reduceMotionToggle.checked = Boolean(profileData.preferences.reduceMotion);
  renderHelpContent();
}

function renderHelpContent() {
  if (elements.helpContent.childElementCount) return;
  helpSections.forEach(([title, items], index) => {
    const details = createElement("details", title.startsWith("考前速记") ? "help-section memory-help" : "help-section");
    if (index < 3 || title.startsWith("考前速记")) details.open = true;
    const summary = createElement("summary", "", title);
    const list = createElement("ul");
    items.forEach((item) => list.append(createElement("li", "", item)));
    details.append(summary, list);
    elements.helpContent.append(details);
  });
}

function handleDeleteAction(action) {
  if (!profileData) return;
  const labels = {
    wrong: "清空错题本",
    history: "清空考试记录",
    progress: "清空刷题进度和正确率",
    all: "清空当前档案全部学习数据"
  };
  if (action === "history" && profileData.activeExam) {
    showToast("有进行中的考试，请先交卷或放弃后再清空考试记录");
    return;
  }
  if (!window.confirm(`确定要${labels[action]}吗？`)) return;
  if (!window.confirm("删除后不能恢复。请再次确认是否继续。")) return;

  if (action === "wrong") {
    profileData.wrongIds = [];
    profileData.wrongStats = {};
  } else if (action === "history") {
    profileData.examHistory = [];
  } else if (action === "progress") {
    profileData.answeredIds = [];
    profileData.totalAttempts = 0;
    profileData.correctAttempts = 0;
    profileData.sequentialIndex = 0;
  } else if (action === "all") {
    const preferences = profileData.preferences;
    profileData.answeredIds = [];
    profileData.totalAttempts = 0;
    profileData.correctAttempts = 0;
    profileData.wrongIds = [];
    profileData.wrongStats = {};
    profileData.sequentialIndex = 0;
    profileData.activeExam = null;
    profileData.examHistory = [];
    profileData.preferences = preferences;
  }
  persistProfile();
  renderMyPage();
  showToast("已完成删除");
}

function openExamNavigator() {
  elements.examNavigator.classList.add("is-open");
  elements.examBackdrop.hidden = false;
}

function closeExamNavigator() {
  elements.examNavigator.classList.remove("is-open");
  elements.examBackdrop.hidden = true;
}

function persistProfile(render = true) {
  if (!activeProfile || !profileData) return;
  if (!saveProfileData(activeProfile.id, profileData, currentSubject)) showToast("本地保存失败，请检查浏览器存储空间");
  if (render) renderDashboard();
}

function showView(name) {
  const previousViewName = activeViewName;
  if (previousViewName === name) return;
  const previousLevel = VIEW_LEVEL[previousViewName] ?? -1;
  const nextLevel = VIEW_LEVEL[name] ?? -1;
  Object.entries(views).forEach(([viewName, element]) => { element.hidden = viewName !== name; });
  const navViews = ["home", "practiceHub", "specialHub", "examHub", "wrongBook", "my"];
  elements.bottomNav.hidden = !activeProfile || !navViews.includes(name);
  if (shouldAnimate() && !(name === "home" && firstHomeRender)) {
    const active = views[name];
    const enterClass = nextLevel > previousLevel ? "view-slide-left-enter" : "view-slide-right-enter";
    active?.classList.remove("view-enter", "view-slide-left-enter", "view-slide-right-enter");
    void active?.offsetWidth;
    active?.classList.add(previousViewName ? enterClass : "view-enter");
    window.setTimeout(() => active?.classList.remove(enterClass, "view-enter"), 650);
  }
  if (name === "home") firstHomeRender = false;
  activeViewName = name;
}

function setupNativeBackButton() {
  const nativeApp = globalThis.Capacitor?.Plugins?.App;
  if (!nativeApp?.addListener) return;
  nativeApp.addListener("backButton", () => {
    if (elements.examNavigator.classList.contains("is-open")) {
      closeExamNavigator();
      return;
    }
    if (activeViewName === "practice") return navigateTo(currentMode?.startsWith("special:") ? "special-hub" : "practice-hub");
    if (activeViewName === "exam") return navigateTo("exam-hub");
    if (activeViewName === "examResult") return navigateTo("exam-hub");
    if (["practiceHub", "specialHub", "examHub", "wrongBook", "my"].includes(activeViewName)) return navigateTo("home");

    const now = Date.now();
    if (now - lastBackPressAt <= 2000) nativeApp.exitApp();
    else {
      lastBackPressAt = now;
      showToast("再按一次返回键退出应用");
    }
  });
}

function updateNavigation(activeView) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    const isActive = button.dataset.view === activeView;
    button.classList.toggle("is-active", isActive);
    if (isActive && shouldAnimate()) {
      button.classList.remove("nav-click");
      void button.offsetWidth;
      button.classList.add("nav-click");
    }
  });
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
    container.textContent = "题目图片加载失败，请稍后重试。";
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

function createMultiOptionButton(title, description) {
  const button = createElement("button", "option-button multi-option");
  button.type = "button";
  button.dataset.answer = title;
  button.innerHTML = '<span class="option-check"></span><span class="option-letter"></span><span class="option-text"></span>';
  button.querySelector(".option-letter").textContent = title;
  button.querySelector(".option-text").textContent = description;
  return button;
}

function renderMiniStats() {
  const accuracy = profileData.totalAttempts ? Math.round((profileData.correctAttempts / profileData.totalAttempts) * 100) : 0;
  elements.practiceMiniStats.replaceChildren(
    createElement("span", "", `已做 ${profileData.answeredIds.length}`),
    createElement("span", "", `正确率 ${accuracy}%`),
    createElement("span", "", `错题 ${profileData.wrongIds.length}`)
  );
}

function getSortedWrongQuestions() {
  return profileData.wrongIds
    .map((id) => questionMap.get(id))
    .filter(Boolean)
    .sort((a, b) => {
      const statA = profileData.wrongStats[a.id] || {};
      const statB = profileData.wrongStats[b.id] || {};
      return (statB.wrongCount || 0) - (statA.wrongCount || 0) || (statB.lastWrongAt || 0) - (statA.lastWrongAt || 0);
    });
}

function ensureWrongStat(questionId) {
  if (!profileData.wrongStats[questionId]) {
    profileData.wrongStats[questionId] = { wrongCount: 0, correctStreak: 0, lastWrongAt: 0, lastPracticedAt: 0 };
  }
  return profileData.wrongStats[questionId];
}

function applyMotionPreference() {
  document.documentElement.classList.toggle("reduce-motion", Boolean(profileData?.preferences?.reduceMotion));
}

function shouldAnimate() {
  return !profileData?.preferences?.reduceMotion;
}

function hasKeyword(question, keywords) {
  const text = [question.question, question.remark, question.answerSkill, question.answerSkillExplain, ...(question.itemsDescArray || [])].join(" ");
  return keywords.some((keyword) => text.includes(keyword));
}

function getPracticeTitle(mode) {
  if (modeNames[mode]) return modeNames[mode];
  if (mode?.startsWith("special:")) {
    const category = specialCategories.find((item) => item.id === mode.replace("special:", ""));
    return category ? `${category.title}专项` : "专项练习";
  }
  return "练习";
}

function toViewKey(viewName) {
  return viewName === "practice-hub" ? "practiceHub"
    : viewName === "special-hub" ? "specialHub"
      : viewName === "wrong-book" ? "wrongBook"
        : viewName === "exam-hub" ? "examHub"
          : viewName;
}

function formatAnswer(question) {
  if (question.type === 2) {
    const answers = question.answer.split(",");
    return answers.map((a) => {
      const idx = question.itemsTitleArray.indexOf(a);
      return `${a}. ${question.itemsDescArray[idx] ?? ""}`;
    }).join("；");
  }
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
  elements.toast.classList.remove("is-visible");
  if (shouldAnimate()) toastIn(elements.toast).then(() => elements.toast.classList.add("is-visible"));
  else elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    const finish = () => {
      elements.toast.classList.remove("is-visible");
      elements.toast.hidden = true;
    };
    if (shouldAnimate()) toastOut(elements.toast).then(finish);
    else finish();
  }, 2200);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function spawnCelebrationParticles(element) {
  if (!shouldAnimate()) return;
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const colors = ["#146c43", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];

  for (let index = 0; index < 10; index += 1) {
    const dot = document.createElement("div");
    dot.className = "celebration-particle";
    dot.style.left = `${centerX}px`;
    dot.style.top = `${centerY}px`;
    dot.style.background = colors[index % colors.length];
    document.body.append(dot);
    const angle = (Math.PI * 2 * index) / 10 + (Math.random() - 0.5) * 0.5;
    const distance = 40 + Math.random() * 60;
    dot.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`, opacity: 0 }
    ], { duration: 600 + Math.random() * 300, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "forwards" }).onfinish = () => dot.remove();
  }
}

function spawnConfetti() {
  if (!shouldAnimate()) return;
  const colors = ["#f0b429", "#146c43", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316"];
  for (let index = 0; index < 30; index += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    document.body.append(piece);
    const drift = (Math.random() - 0.5) * 200;
    piece.animate([
      { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: 1 },
      { transform: `translateY(100vh) translateX(${drift}px) rotate(${360 + Math.random() * 720}deg)`, opacity: 0 }
    ], { duration: 2000 + Math.random() * 2000, delay: Math.random() * 800, easing: "cubic-bezier(.25,.46,.45,.94)", fill: "forwards" }).onfinish = () => piece.remove();
  }
}
