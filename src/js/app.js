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
import {
  spring,
  staggerIn,
  countTo,
  shake,
  pulse,
  toastIn,
  toastOut,
  animate,
  PRESETS,
  easeOutExpo,
  reducedMotion
} from "./motion.js";

// 把页面上所有带id的元素收集起来，id转驼峰做key，后面直接用 elements.变量名 就能拿到对应DOM
const elements = Object.fromEntries(
  [...document.querySelectorAll("[id]")].map((element) => [toCamelCase(element.id), element])
);

// 所有视图容器的引用
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
let examAutoAdvanceId = null;
let reviewRecord = null;
let reviewIndex = 0;
let toastTimer = null;
let currentViewName = null;
let firstHomeRender = true;
let dashboardAnimated = false;
let wrongFilter = "all"; // "all" | "practice" | "exam"

// 每个视图对应的层级深度，用来判断页面切换时该往左滑还是往右滑
const VIEW_LEVEL = { home: 0, practiceHub: 1, practice: 2, wrongBook: 1, examHub: 1, exam: 2, examResult: 2, profile: -1, loading: -1, error: -1 };

bindEvents();
initialize();

// 应用启动入口：先展示loading动画，等题库加载完再进主页
async function initialize() {
  clearExamTimer();
  showView("loading");

  // 开屏逐字动画
  const splashTitle = document.getElementById("splash-title");
  const progressBar = document.getElementById("splash-progress-bar");
  const titleText = "正在加载题库";
  splashTitle.textContent = "";
  [...titleText].forEach((char, i) => {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = char;
    span.style.animationDelay = `${i * 60 + 300}ms`;
    splashTitle.append(span);
  });

  const splashMin = 1500, splashMax = 3000;
  const splashDuration = splashMin + Math.random() * (splashMax - splashMin);
  const splashStart = performance.now();

  // 进度条随时间推进
  let progress = 0;
  const progressInterval = setInterval(() => {
    const elapsed = performance.now() - splashStart;
    progress = Math.min((elapsed / splashDuration) * 100, 95);
    progressBar.style.width = `${progress}%`;
  }, 50);

  try {
    questions = await loadQuestions();
    questionMap = new Map(questions.map((question) => [question.id, question]));
    initializeProfiles();

    // 确保 splash 至少持续随机时长
    const elapsed = performance.now() - splashStart;
    if (elapsed < splashDuration) {
      await new Promise((r) => setTimeout(r, splashDuration - elapsed));
    }

    clearInterval(progressInterval);
    progressBar.style.width = "100%";

    // splash 退出动画
    const splashEl = document.getElementById("loading-view");
    splashEl.classList.add("splash-exit");
    await new Promise((r) => setTimeout(r, 500));

    renderProfileChooser();
    showView("profile");
  } catch (error) {
    clearInterval(progressInterval);
    elements.errorMessage.textContent = `${error.message}。请重新启动应用后再试。`;
    showView("error");
  }
}

// 绑定所有按钮和交互事件
function bindEvents() {
  elements.retryButton.addEventListener("click", initialize);
  elements.brandButton.addEventListener("click", () => activeProfile && navigateTo("home"));
  elements.profileSwitchButton.addEventListener("click", switchProfile);
  elements.profileForm.addEventListener("submit", handleCreateProfile);
  elements.leavePracticeButton.addEventListener("click", () => navigateTo("practice-hub"));
  elements.nextQuestionButton.addEventListener("click", goToNextQuestion);
  elements.startWrongPractice.addEventListener("click", () => startPractice("wrong"));
  elements.clearWrongBook.addEventListener("click", clearWrongBook);
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
  document.addEventListener("keydown", handleStudyShortcut);

  // 练习模式的三种按钮
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => startPractice(button.dataset.mode));
  });
  // 顶部tab导航
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.wrongFilter) {
        wrongFilter = button.dataset.wrongFilter;
      }
      navigateTo(button.dataset.view);
    });
  });

  // 首页功能卡片跟随鼠标的光效
  document.querySelectorAll(".feature-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty("--mouse-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    });
  });

  // 练习模式选项点击用事件委托，比给每个按钮单独绑定更靠谱
  elements.optionsList.addEventListener("click", (e) => {
    const btn = e.target.closest(".option-button");
    if (btn && !btn.disabled && currentMode && currentQuestion) {
      answerQuestion(btn.dataset.answer);
    }
  });

  // 错题本页面的分类tab
  document.querySelectorAll(".view-tab").forEach((tab) => {
    tab.addEventListener("click", () => navigateTo(tab.dataset.view));
  });
}

// 刷题快捷键：1/2/3/4 选择选项，空格/回车下一题，退格上一题
function handleStudyShortcut(event) {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;

  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;

  const optionIndex = { "1": 0, "2": 1, "3": 2, "4": 3 }[event.key];
  if (optionIndex !== undefined && (currentViewName === "practice" || currentViewName === "exam")) {
    const optionList = currentViewName === "practice" ? elements.optionsList : elements.examOptionsList;
    const option = optionList.querySelectorAll(".option-button")[optionIndex];
    if (option && !option.disabled) {
      event.preventDefault();
      option.click();
    }
    return;
  }

  if (event.key === " " || event.key === "Enter") {
    if (currentViewName === "practice" && answerLocked) {
      event.preventDefault();
      goToNextQuestion();
    } else if (currentViewName === "exam" && profileData?.activeExam) {
      event.preventDefault();
      moveExam(1);
    }
    return;
  }

  if (event.key === "Backspace") {
    if (currentViewName === "practice" && currentQuestion) {
      event.preventDefault();
      goToPreviousQuestion();
    } else if (currentViewName === "exam" && profileData?.activeExam) {
      event.preventDefault();
      moveExam(-1);
    }
  }
}

/* 根据当前视图动态定位tab栏下面的滑块指示器 */
function updateTabIndicator(viewName) {
  document.querySelectorAll(".view-tabs").forEach((tabsContainer) => {
    const indicator = tabsContainer.querySelector(".tab-indicator");
    if (!indicator) return;
    // 更新 active 状态
    tabsContainer.querySelectorAll(".view-tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.view === viewName);
    });
    // 定位指示器到 active tab
    const activeTab = tabsContainer.querySelector(".view-tab.is-active");
    if (activeTab && tabsContainer.offsetParent !== null) {
      const tabsRect = tabsContainer.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      indicator.style.width = `${tabRect.width}px`;
      indicator.style.transform = `translateX(${tabRect.left - tabsRect.left - 4}px)`;
    }
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

  const cards = [];
  profiles.forEach((profile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-option";
    button.innerHTML = '<span class="profile-avatar"></span><span class="profile-option-copy"><strong></strong><small>本地独立进度</small></span><span class="mode-arrow">→</span>';
    button.querySelector(".profile-avatar").textContent = [...profile.name][0]?.toUpperCase() || "用";
    button.querySelector("strong").textContent = profile.name;
    button.addEventListener("click", () => activateProfile(profile));
    elements.profileList.append(button);
    cards.push(button);
  });

  staggerIn(cards, { y: 20, opacity: 0 }, { stagger: 80, config: PRESETS.gentle });
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

  animateDashboard();
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
  // 切换档案后重置动画标记，这样进首页会重新播放入场动画
  dashboardAnimated = false;
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

  if (viewName === "home") animateDashboard();
  if (viewName === "practice-hub") renderPracticeHub();
  if (viewName === "wrong-book") renderWrongBook();
  if (viewName === "exam-hub") renderExamHub();

  const viewKey = viewName === "practice-hub" ? "practiceHub" : viewName === "wrong-book" ? "wrongBook" : viewName === "exam-hub" ? "examHub" : viewName;

  showView(viewKey);
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

// 渲染当前题目，重置答题状态，刷新UI
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

  // 题目卡片入场动画
  const card = elements.questionCard;
  card.classList.remove("anim-enter");
  void card.offsetWidth;
  card.classList.add("anim-enter");
}

function renderPracticeOptions() {
  elements.optionsList.replaceChildren();
  currentQuestion.itemsTitleArray.forEach((title, index) => {
    // 不传 handler，完全依赖 optionsList 上的事件委托
    elements.optionsList.append(createOptionButton(title, currentQuestion.itemsDescArray[index], null));
  });
}

// 处理练习模式的答题逻辑：记录答案、统计正误、触发反馈动画
function answerQuestion(selectedAnswer) {
  if (answerLocked || !currentQuestion) return;
  answerLocked = true;
  const wasWrong = profileData.wrongIds.includes(currentQuestion.id);
  const isCorrect = selectedAnswer === currentQuestion.answer;
  profileData.totalAttempts += 1;
  if (isCorrect) profileData.correctAttempts += 1;
  if (!profileData.answeredIds.includes(currentQuestion.id)) profileData.answeredIds.push(currentQuestion.id);
  if (!isCorrect && !profileData.wrongIds.includes(currentQuestion.id)) {
    profileData.wrongIds.push(currentQuestion.id);
    if (!profileData.wrongSources) profileData.wrongSources = {};
    profileData.wrongSources[currentQuestion.id] = "practice";
  }
  persistProfile();

  const optionButtons = elements.optionsList.querySelectorAll(".option-button");
  let selectedButton = null;
  let correctButton = null;

  optionButtons.forEach((button) => {
    button.disabled = true;
    if (button.dataset.answer === currentQuestion.answer) {
      button.classList.add("is-correct");
      correctButton = button;
    }
    if (button.dataset.answer === selectedAnswer && !isCorrect) {
      button.classList.add("is-wrong");
      selectedButton = button;
    }
  });

  // 回答反馈动画
  if (isCorrect && correctButton) {
    pulse(correctButton);
    spawnCelebrationParticles(correctButton);
  } else if (!isCorrect && selectedButton) {
    shake(selectedButton);
  }

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

function goToPreviousQuestion() {
  if (queueIndex <= 0) return;
  queueIndex -= 1;
  if (currentMode === "sequential") {
    profileData.sequentialIndex = queueIndex;
    persistProfile();
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

  // 模式卡片交错入场
  const modeCards = document.querySelectorAll("#practice-hub-view .mode-card");
  if (modeCards.length) {
    staggerIn([...modeCards], { y: 20, opacity: 0 }, { stagger: 80, config: PRESETS.gentle, delay: 60 });
  }
}

/* 带完整动画的首页渲染（数字计数 + 卡片交错入场） */
function animateDashboard() {
  const accuracy = profileData.totalAttempts ? Math.round((profileData.correctAttempts / profileData.totalAttempts) * 100) : 0;

  // Hero 文字逐字揭示
  const heroH1 = document.querySelector("#home-view .hero h1");
  if (heroH1 && !heroH1.querySelector(".char")) {
    const text = heroH1.textContent;
    heroH1.textContent = "";
    [...text].forEach((char, i) => {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = char === " " ? "\u00a0" : char;
      span.style.animationDelay = `${i * 60 + 120}ms`;
      heroH1.append(span);
    });
  }

  // 重置为 0
  elements.totalCount.textContent = "0";
  elements.answeredCount.textContent = "0";
  elements.accuracyValue.textContent = "0%";
  elements.wrongCount.textContent = "0";

  // 数字计数动画（更长时长，更优雅）
  requestAnimationFrame(() => {
    countTo(elements.totalCount, questions.length, { duration: 1400, easing: easeOutExpo });
    countTo(elements.answeredCount, profileData.answeredIds.length, { duration: 1400, easing: easeOutExpo, delay: 150 });
    countTo(elements.accuracyValue, accuracy, { duration: 1600, easing: easeOutExpo, suffix: "%" });
    countTo(elements.wrongCount, profileData.wrongIds.length, { duration: 1200, easing: easeOutExpo, delay: 300 });
  });

  // 卡片交错入场动画（更线性、更细腻）
  requestAnimationFrame(() => {
    const statCards = document.querySelectorAll("#home-view .stat-card");
    const featureCards = document.querySelectorAll("#home-view .feature-card");
    if (statCards.length) staggerIn([...statCards], { y: 20, opacity: 0 }, { stagger: 80, config: PRESETS.gentle, delay: 100 });
    if (featureCards.length) staggerIn([...featureCards], { y: 16, opacity: 0 }, { stagger: 100, config: PRESETS.gentle, delay: 300 });
  });

  dashboardAnimated = true;
  renderPracticeHub();
  updateWrongBadge();
}

function renderDashboard() {
  if (dashboardAnimated) {
    updateDashboardStats();
    return;
  }
  animateDashboard();
}

/* 只更新统计数字文本，不重置不播放动画 */
function updateDashboardStats() {
  if (!profileData) return;
  const accuracy = profileData.totalAttempts ? Math.round((profileData.correctAttempts / profileData.totalAttempts) * 100) : 0;
  elements.totalCount.textContent = questions.length.toLocaleString("zh-CN");
  elements.answeredCount.textContent = profileData.answeredIds.length.toLocaleString("zh-CN");
  elements.accuracyValue.textContent = `${accuracy}%`;
  elements.wrongCount.textContent = profileData.wrongIds.length.toLocaleString("zh-CN");
  renderPracticeHub();
  updateWrongBadge();
}

function renderWrongBook() {
  if (!profileData.wrongSources) profileData.wrongSources = {};
  let wrongIds = profileData.wrongIds;
  if (wrongFilter === "practice") {
    wrongIds = wrongIds.filter((id) => profileData.wrongSources[id] === "practice");
  } else if (wrongFilter === "exam") {
    wrongIds = wrongIds.filter((id) => profileData.wrongSources[id] === "exam");
  }
  const wrongQuestions = wrongIds.map((id) => questionMap.get(id)).filter(Boolean);
  const totalCount = profileData.wrongIds.length;
  const practiceCount = profileData.wrongIds.filter((id) => profileData.wrongSources[id] === "practice").length;
  const examCount = profileData.wrongIds.filter((id) => profileData.wrongSources[id] === "exam").length;

  // 更新标签计数 + active 状态
  const badgePractice = document.getElementById("tab-badge-practice");
  const badgeExam = document.getElementById("tab-badge-exam");
  const badgeAll = document.getElementById("tab-badge-all");
  if (badgePractice) badgePractice.textContent = practiceCount || "";
  if (badgeExam) badgeExam.textContent = examCount || "";
  if (badgeAll) badgeAll.textContent = totalCount || "";

  // 更新错题本内部标签 active 状态
  document.querySelectorAll("#view-tabs .view-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.wrongFilter === wrongFilter);
  });
  updateTabIndicator("wrong-book");

  const filterLabel = wrongFilter === "practice" ? "刷题" : wrongFilter === "exam" ? "模拟考试" : "";
  elements.wrongBookSummary.textContent = wrongQuestions.length
    ? `${filterLabel ? `来自${filterLabel}的` : ""}共 ${wrongQuestions.length} 道错题，答对后可选择移除。`
    : "做错的题会自动保存在这里。";
  elements.startWrongPractice.disabled = !wrongQuestions.length;
  elements.clearWrongBook.disabled = !totalCount;
  elements.wrongBookContent.replaceChildren();
  if (!wrongQuestions.length) {
    const empty = createElement("div", "state-panel compact-state wrong-empty");
    empty.innerHTML = `<div class="state-icon">✓</div><h2>${wrongFilter !== "all" ? "该分类下没有错题" : "目前没有错题"}</h2><p>去练几道题，保持这个好状态。</p>`;
    elements.wrongBookContent.append(empty);
    return;
  }
  const list = createElement("ol", "wrong-list");
  const items = [];
  wrongQuestions.slice(0, 20).forEach((question, index) => {
    const item = createElement("li", "wrong-item");
    const source = profileData.wrongSources[question.id] || "practice";
    const sourceClass = source === "exam" ? "wrong-source-tag exam-tag" : "wrong-source-tag practice-tag";
    const sourceTag = createElement("span", sourceClass, source === "exam" ? "模考" : "刷题");
    const deleteBtn = createElement("button", "wrong-delete-btn", "×");
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", `删除错题 ${index + 1}`);
    deleteBtn.addEventListener("click", () => deleteWrongQuestion(question.id, item));
    item.append(createElement("span", "wrong-item-number", String(index + 1).padStart(2, "0")), createElement("p", "", question.question), sourceTag, deleteBtn);
    list.append(item);
    items.push(item);
  });
  elements.wrongBookContent.append(list);
  staggerIn(items, { y: 16, opacity: 0 }, { stagger: 40, config: PRESETS.gentle, delay: 100 });
  if (wrongQuestions.length > 20) elements.wrongBookContent.append(createElement("p", "list-remainder", `另有 ${wrongQuestions.length - 20} 道错题，请进入错题练习继续复习。`));
}

function deleteWrongQuestion(questionId, itemElement) {
  itemElement.classList.add("removing");
  itemElement.addEventListener("animationend", () => {
    profileData.wrongIds = profileData.wrongIds.filter((id) => id !== questionId);
    delete profileData.wrongSources[questionId];
    persistProfile();
    renderWrongBook();
    showToast("已从错题本移除");
  }, { once: true });
}

function clearWrongBook() {
  if (!profileData.wrongIds.length) return;
  if (!window.confirm(`确定要清空全部 ${profileData.wrongIds.length} 道错题吗？此操作不可撤销。`)) return;
  profileData.wrongIds = [];
  profileData.wrongSources = {};
  persistProfile();
  renderWrongBook();
  showToast("错题本已清空");
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
  renderExamQuestion(true);
  startExamTimer();
  window.scrollTo({ top: 0 });
}

function renderExamQuestion(fullNavigatorRebuild = false) {
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

  // 只在需要时重建答题卡，否则只更新当前题标记
  if (fullNavigatorRebuild) {
    renderExamNavigator();
  } else {
    updateExamNavigatorCurrent(exam.currentIndex);
  }
  updateExamProgress();

  // 题目卡片入场动画
  const card = document.querySelector(".exam-question-card");
  if (card) {
    card.classList.remove("anim-enter");
    void card.offsetWidth;
    card.classList.add("anim-enter");
  }

  // 选项交错入场
  const optionButtons = elements.examOptionsList.querySelectorAll(".option-button");
  staggerIn([...optionButtons], { y: 16, opacity: 0 }, { stagger: 40, config: PRESETS.gentle, delay: 100 });
}

// 考试模式答题：保存答案、高亮选项、更新答题卡颜色、延迟自动跳转
function selectExamAnswer(questionId, answer) {
  const exam = profileData.activeExam;
  const question = questionMap.get(questionId);
  const isCorrect = answer === question.answer;

  // 清除上一个自动跳转定时器（防止跳题）
  if (examAutoAdvanceId) {
    clearTimeout(examAutoAdvanceId);
    examAutoAdvanceId = null;
  }

  // 保存答案
  exam.answers[questionId] = answer;
  persistProfile();

  // 高亮选中的选项
  const optionButtons = elements.examOptionsList.querySelectorAll(".option-button");
  optionButtons.forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.answer === question.answer) btn.classList.add("is-correct");
    if (btn.dataset.answer === answer && !isCorrect) btn.classList.add("is-wrong");
    if (btn.dataset.answer === answer) btn.classList.add("is-selected");
  });

  // 智能更新答题卡当前题的颜色（不重建整个网格）
  updateExamNavigatorButton(exam.currentIndex, isCorrect);

  // 延迟后自动跳转下一题
  examAutoAdvanceId = setTimeout(() => {
    examAutoAdvanceId = null;
    if (exam.currentIndex < 99) {
      moveExam(1);
    }
  }, 800);
}

// 智能更新答题卡单个按钮的颜色
function updateExamNavigatorButton(index, isCorrect) {
  const buttons = elements.examNumberGrid.querySelectorAll(".number-button");
  const btn = buttons[index];
  if (!btn) return;
  btn.classList.remove("is-answered");
  btn.classList.add(isCorrect ? "is-correct" : "is-wrong");
}


// 智能更新答题卡当前题的标记
function updateExamNavigatorCurrent(newIndex) {
  const buttons = elements.examNumberGrid.querySelectorAll(".number-button");
  buttons.forEach((btn, i) => {
    btn.classList.toggle("is-current", i === newIndex);
  });
}

function moveExam(offset) {
  const exam = profileData.activeExam;
  if (examAutoAdvanceId) {
    clearTimeout(examAutoAdvanceId);
    examAutoAdvanceId = null;
  }
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
  const buttons = [];
  exam.questionIds.forEach((questionId, index) => {
    const button = createElement("button", "number-button", String(index + 1));
    button.type = "button";
    const question = questionMap.get(questionId);
    const answer = exam.answers[questionId];
    if (answer) {
      if (question && answer === question.answer) {
        button.classList.add("is-correct");
      } else {
        button.classList.add("is-wrong");
      }
    }
    if (index === exam.currentIndex) button.classList.add("is-current");
    button.addEventListener("click", () => {
      exam.currentIndex = index;
      persistProfile();
      closeExamNavigator();
      renderExamQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    elements.examNumberGrid.append(button);
    buttons.push(button);
  });
  staggerIn(buttons, { y: 8, opacity: 0 }, { stagger: 15, config: PRESETS.snappy, delay: 60 });
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

// 交卷处理：评分、记录历史、合并错题、清空考试状态
function submitExam(automatic) {
  const exam = profileData?.activeExam;
  if (!exam) return;
  const unanswered = exam.questionIds.length - Object.keys(exam.answers).length;
  if (!automatic && !window.confirm(unanswered ? `还有 ${unanswered} 题未作答，确定交卷吗？` : "已完成全部题目，确定交卷吗？")) return;

  const record = gradeExam(exam, questionMap);
  profileData.examHistory = addExamHistory(profileData.examHistory, record);
  profileData.wrongIds = [...new Set([...profileData.wrongIds, ...record.wrongIds])];
  if (!profileData.wrongSources) profileData.wrongSources = {};
  record.wrongIds.forEach((id) => { profileData.wrongSources[id] = "exam"; });
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
  const items = [];
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
    items.push(button);
  });
  staggerIn(items, { y: 16, opacity: 0 }, { stagger: 50, config: PRESETS.gentle, delay: 80 });
}

function showExamResult(record) {
  reviewRecord = record;
  reviewIndex = Math.max(0, record.questionIds.findIndex((id) => record.wrongIds.includes(id)));
  elements.resultSummary.innerHTML = `<div><p class="eyebrow">模拟考试成绩</p><h1><span id="result-score-value">0</span><small>分</small></h1><strong class="result-status ${record.passed ? "passed" : "failed"}">${record.passed ? "考试通过" : "未达到90分"}</strong></div><div class="result-metrics"><span><small>正确</small><strong>${record.score}</strong></span><span><small>错误</small><strong>${record.wrongIds.length - record.unanswered}</strong></span><span><small>未答</small><strong>${record.unanswered}</strong></span><span><small>用时</small><strong>${formatDuration(record.durationSeconds)}</strong></span></div>`;

  // 分数计数器动画
  const scoreValue = document.getElementById("result-score-value");
  if (scoreValue) {
    requestAnimationFrame(() => {
      countTo(scoreValue, record.score, { duration: 1500, easing: easeOutExpo });
    });
  }

  // 考试通过庆祝 confetti
  if (record.passed) {
    setTimeout(() => spawnConfetti(), 600);
  }

  renderReviewNavigator();
  renderReviewQuestion();
  showView("examResult");
  updateNavigation(null);
  window.scrollTo({ top: 0 });
}

function renderReviewNavigator() {
  elements.reviewNumberGrid.replaceChildren();
  const buttons = [];
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
    buttons.push(button);
  });
  staggerIn(buttons, { y: 6, opacity: 0 }, { stagger: 12, config: PRESETS.snappy, delay: 80 });
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
  updateDashboardStats();
}

// 核心视图切换：隐藏所有section，只显示目标section，同时播放入场动画
function showView(name) {
  const viewKey = name === "practice-hub" ? "practiceHub" : name === "wrong-book" ? "wrongBook" : name === "exam-hub" ? "examHub" : name;
  const targetElement = views[viewKey];
  if (!targetElement) return;

  const shouldAnimate = !(viewKey === "home" && firstHomeRender);
  const fromLevel = VIEW_LEVEL[currentViewName] ?? -1;
  const toLevel = VIEW_LEVEL[viewKey] ?? -1;

  // 同一视图不重复切换（只更新标签指示器）
  if (currentViewName === viewKey) {
    updateTabIndicator(name);
    return;
  }

  // 隐藏所有视图
  Object.entries(views).forEach(([viewName, element]) => {
    element.hidden = viewName !== viewKey;
  });

  // 方向感知入场动画
  if (shouldAnimate && currentViewName && currentViewName !== viewKey) {
    const enterClass = toLevel > fromLevel ? "view-slide-left-enter" : "view-slide-right-enter";
    targetElement.classList.remove("view-slide-left-enter", "view-slide-right-enter", "view-enter");
    void targetElement.offsetWidth;
    targetElement.classList.add(enterClass);
    setTimeout(() => targetElement.classList.remove(enterClass), 600);
  } else if (shouldAnimate) {
    targetElement.classList.remove("view-enter");
    void targetElement.offsetWidth;
    targetElement.classList.add("view-enter");
  }

  if (viewKey === "home") firstHomeRender = false;

  currentViewName = viewKey;
  const navViews = ["home", "practiceHub", "examHub", "wrongBook"];
  elements.bottomNav.hidden = !activeProfile || !navViews.includes(name);
  // 更新顶部标签栏指示器
  updateTabIndicator(name);
}

function updateNavigation(activeView) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    const becomingActive = button.dataset.view === activeView;
    button.classList.toggle("is-active", becomingActive);
    // 切换时触发点击弹跳动画
    if (becomingActive) {
      button.classList.remove("nav-click");
      void button.offsetWidth;
      button.classList.add("nav-click");
    }
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
  elements.toast.classList.remove("is-visible");
  toastIn(elements.toast).then(() => {
    elements.toast.classList.add("is-visible");
  });
  toastTimer = window.setTimeout(() => {
    toastOut(elements.toast).then(() => {
      elements.toast.classList.remove("is-visible");
      elements.toast.hidden = true;
    });
  }, 2200);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// 答对题目时从按钮位置爆出小圆点粒子
function spawnCelebrationParticles(element) {
  if (reducedMotion) return;
  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ["#146c43", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];

  for (let i = 0; i < 10; i++) {
    const dot = document.createElement("div");
    dot.className = "celebration-particle";
    dot.style.left = `${cx}px`;
    dot.style.top = `${cy}px`;
    dot.style.background = colors[i % colors.length];
    dot.style.width = `${4 + Math.random() * 6}px`;
    dot.style.height = dot.style.width;
    document.body.append(dot);

    const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.5;
    const distance = 40 + Math.random() * 60;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    dot.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 }
    ], { duration: 600 + Math.random() * 300, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "forwards" })
    .onfinish = () => dot.remove();
  }
}

// 模拟考试通过时从顶部掉落彩色纸片
function spawnConfetti() {
  if (reducedMotion) return;
  const colors = ["#f0b429", "#146c43", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316"];
  const container = document.createDocumentFragment();

  for (let i = 0; i < 30; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${8 + Math.random() * 10}px`;
    piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    container.append(piece);

    const duration = 2000 + Math.random() * 2000;
    const delay = Math.random() * 800;
    const drift = (Math.random() - 0.5) * 200;

    piece.animate([
      { transform: `translateY(0) translateX(0) rotate(0deg)`, opacity: 1 },
      { transform: `translateY(100vh) translateX(${drift}px) rotate(${360 + Math.random() * 720}deg)`, opacity: 0 }
    ], { duration, delay, easing: "cubic-bezier(.25,.46,.45,.94)", fill: "forwards" })
    .onfinish = () => piece.remove();
  }
  document.body.append(container);
}

/* ══════════════════════════════════════════════════
   高级交互系统 — Premium Interactions
   ══════════════════════════════════════════════════ */

/* ── 滚动触发动画 ── */
(function initScrollReveal() {
  if (reducedMotion) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  function observe() {
    document.querySelectorAll(".scroll-reveal:not(.is-visible)").forEach((el) => observer.observe(el));
  }

  // 初始观察 + 视图切换时重新观察
  observe();
  const mutationObserver = new MutationObserver(observe);
  mutationObserver.observe(document.getElementById("app"), { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
})();
