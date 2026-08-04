import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = await readFile(path.join(root, "src", "js", "app.js"), "utf8");
const css = await readFile(path.join(root, "src", "css", "styles.css"), "utf8");
const effects = await readFile(path.join(root, "src", "js", "effects.js"), "utf8");

let mediaListener = null;
const mediaQuery = {
  matches: false,
  addEventListener(type, listener) {
    if (type === "change") mediaListener = listener;
  }
};
globalThis.window = { matchMedia: () => mediaQuery };
globalThis.document = { hidden: false };

const motionUrl = `${pathToFileURL(path.join(root, "src", "js", "motion.js")).href}?motion-test`;
const motion = await import(motionUrl);

assert.equal(motion.isMotionReduced(), false, "默认应允许运行动画");
motion.setMotionPreference(true);
assert.equal(motion.isMotionReduced(), true, "应用内减少动画应即时生效");

const counter = { textContent: "0", isConnected: true };
await motion.countTo(counter, 42, { suffix: "%" });
assert.equal(counter.textContent, "42%", "减少动画时计数器应立即显示最终值");

motion.setMotionPreference(false);
mediaQuery.matches = true;
mediaListener({ matches: true });
assert.equal(motion.isMotionReduced(), true, "系统减少动画变化应在运行中生效");

mediaQuery.matches = false;
mediaListener({ matches: false });
let cancelCount = 0;
const animationListeners = new Map();
const animation = {
  addEventListener(type, listener) { animationListeners.set(type, listener); },
  cancel() {
    cancelCount += 1;
    animationListeners.get("cancel")?.();
  }
};
const toast = {
  style: {},
  isConnected: true,
  animate() { return animation; }
};
const toastPromise = motion.toastIn(toast);
motion.setMotionPreference(true);
await toastPromise;
assert.equal(cancelCount, 1, "切换到减少动画时应取消正在运行的 WAAPI 动画");

assert.match(app, /const generation = \+\+toastGeneration/, "Toast 应使用代次令牌隔离旧回调");
assert.match(app, /generation !== toastGeneration/, "旧 Toast 退出回调不得隐藏新消息");
assert.match(app, /cancelMotion\(elements\.toast\)/, "显示新 Toast 前应取消上一轮动画");
assert.match(app, /view !== views\[name\][^\n]+getAnimations\?\.\(\{ subtree: true \}\)/, "离开页面时应取消旧视图子树动画且保留目标页新动画");
assert.match(app, /transitionGeneration === viewTransitionGeneration/, "页面转场清理应校验最新代次");
assert.match(app, /generation === viewTransitionGeneration && activeViewName === "my"/, "旧滚动计时器不得影响快速导航后的页面");
assert.match(app, /function showExamResult\(record\) \{\s*clearTransientEffects\(\)/, "重复查看考试结果前应清理旧彩纸");
assert.doesNotMatch(app, /pulse\(feedbackButton\)|shake\(feedbackButton\)/, "答题按钮不应同时运行 CSS 与 JavaScript transform 动画");
assert.doesNotMatch(app, /spawnCelebrationParticles\(feedbackButton\)/, "普通正确答题不应创建庆祝粒子");
assert.match(effects, /if \(isMotionReduced\(\) \|\| document\.hidden\) \{\s*container\.replaceChildren\(\)/, "减少动画或页面隐藏时不应保留背景粒子节点");
assert.match(effects, /index < 18/, "考试彩纸应限制为 18 片");
assert.match(app, /const minimumSplashMs = shouldAnimate\(\) \? 500 : 0/, "启动页不得保留 1.1 秒强制等待");
assert.match(await readFile(path.join(root, "src", "js", "motion.js"), "utf8"), /element\.closest\?\.\("\[hidden\]"\)/, "隐藏页面不得启动交错或 RAF 动画");

assert.equal([...css.matchAll(/@keyframes cardEnter/g)].length, 1, "cardEnter 只能定义一次");
assert.doesNotMatch(css, /premiumViewIn|premiumSlideLeft|premiumSlideRight/, "不应保留第二套页面转场");
assert.match(css, /\.view-slide-left-enter\s*\{[^}]*var\(--motion-view\)/s, "页面转场应使用统一时长令牌");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/, "系统减少动画应完全停止 CSS 动画");
assert.match(css, /\.reduce-motion \*,[\s\S]*animation: none !important/, "应用内减少动画应获得等价 CSS 行为");
assert.match(css, /\.option-button\.is-correct\s*\{\s*animation: correctPop 260ms/, "正确反馈应克制在 260ms");
assert.match(css, /\.option-button\.is-wrong\s*\{\s*animation: wrongShake 320ms/, "错误反馈应克制在 320ms");

console.log("动画系统检查通过：减少动画、取消竞态、单一控制权和统一时长正常。");
