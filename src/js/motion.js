/* motion.js — 基于弹簧物理的UI动画引擎，不依赖任何第三方库 */

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const reducedMotion = reducedMotionQuery.matches;
let applicationReducedMotion = false;
let systemReducedMotion = reducedMotionQuery.matches;
const preferenceListeners = new Set();
const activeAnimations = new Set();

export function isMotionReduced() {
  return applicationReducedMotion || systemReducedMotion;
}

export function setMotionPreference(reduceMotion) {
  const previous = isMotionReduced();
  applicationReducedMotion = Boolean(reduceMotion);
  notifyPreferenceChange(previous);
}

export function onMotionPreferenceChange(listener) {
  preferenceListeners.add(listener);
  return () => preferenceListeners.delete(listener);
}

function notifyPreferenceChange(previous) {
  const current = isMotionReduced();
  if (previous === current) return;
  if (current) {
    for (const animation of [...activeAnimations]) animation.cancel();
  }
  for (const listener of preferenceListeners) listener(current);
}

function handleSystemPreferenceChange(event) {
  const previous = isMotionReduced();
  systemReducedMotion = event.matches;
  notifyPreferenceChange(previous);
}

if (reducedMotionQuery.addEventListener) reducedMotionQuery.addEventListener("change", handleSystemPreferenceChange);
else reducedMotionQuery.addListener?.(handleSystemPreferenceChange);

// 弹簧求解器：用欧拉积分模拟弹簧阻尼运动
// F = -k*x - c*v（胡克定律 + 阻尼力）
function springStep(current, target, velocity, config) {
  const { stiffness, damping, mass } = config;
  const displacement = current - target;
  const springForce = -stiffness * displacement;
  const dampingForce = -damping * velocity;
  const acceleration = (springForce + dampingForce) / mass;
  const newVelocity = velocity + acceleration * (1 / 60); // 60fps 时间步长
  const newValue = current + newVelocity * (1 / 60);
  return { value: newValue, velocity: newVelocity };
}

function isSettled(current, target, velocity, config) {
  return (
    Math.abs(current - target) < config.restDelta &&
    Math.abs(velocity) < config.restSpeed
  );
}

// 五组预设弹簧参数，适用于不同的交互场景
const PRESETS = {
  enter: { stiffness: 180, damping: 18, mass: 1, restDelta: 0.01, restSpeed: 0.01 },    // 元素入场
  exit: { stiffness: 300, damping: 24, mass: 0.8, restDelta: 0.01, restSpeed: 0.01 },   // 元素退出
  micro: { stiffness: 400, damping: 15, mass: 0.5, restDelta: 0.01, restSpeed: 0.01 },  // 微交互
  gentle: { stiffness: 120, damping: 20, mass: 1, restDelta: 0.01, restSpeed: 0.01 },   // 柔和缓动
  snappy: { stiffness: 350, damping: 25, mass: 0.6, restDelta: 0.01, restSpeed: 0.01 }  // 快速干脆
};

// 缓动函数集合
// easeOutExpo: 指数衰减，开头快结尾慢，适合数字计数器
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// easeOutCubic: 三次方衰减，比expo稍缓
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// easeInOutCubic: 先加速后减速，适合滑动转场
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 弹簧动画核心：对指定CSS属性执行弹簧物理动画
// 支持的属性：opacity / y / x / scale / rotate
export function spring(element, targetProps, config = PRESETS.enter) {
  if (reducedMotion) {
    Object.assign(element.style, targetProps);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // 等一帧确保浏览器已应用内联样式，再读取真实渲染值
    requestAnimationFrame(() => {
      const from = {};
      const to = {};
      const velocity = {};

      for (const [prop, value] of Object.entries(targetProps)) {
        const current = getComputedProp(element, prop);
        from[prop] = current;
        to[prop] = value;
        velocity[prop] = 0;
      }

      let raf;
      function tick() {
        let allSettled = true;

        for (const prop of Object.keys(targetProps)) {
          const step = springStep(from[prop], to[prop], velocity[prop], config);
          from[prop] = step.value;
          velocity[prop] = step.velocity;

          if (!isSettled(from[prop], to[prop], velocity[prop], config)) {
            allSettled = false;
          }

          setComputedProp(element, prop, from[prop]);
        }

        if (allSettled) {
          for (const [prop, value] of Object.entries(targetProps)) {
            setComputedProp(element, prop, value);
          }
          resolve();
        } else {
          raf = requestAnimationFrame(tick);
        }
      }

      raf = requestAnimationFrame(tick);
      element._springRaf = raf;
    });
  });
}

function runKeyframes(element, keyframes, options) {
  if (isMotionReduced() || !element?.animate || element.closest?.("[hidden]")) return Promise.resolve();
  cancelMotion(element);
  return new Promise((resolve) => {
    const animation = element.animate(keyframes, options);
    activeAnimations.add(animation);
    element._motionAnimation = animation;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      activeAnimations.delete(animation);
      if (element._motionAnimation === animation) delete element._motionAnimation;
      resolve();
    };
    if (animation.addEventListener) {
      animation.addEventListener("finish", finish, { once: true });
      animation.addEventListener("cancel", finish, { once: true });
    } else {
      animation.onfinish = finish;
      animation.oncancel = finish;
    }
  });
}

export function cancelMotion(element) {
  const animation = element?._motionAnimation;
  if (!animation) return;
  delete element._motionAnimation;
  animation.cancel();
}

// 从元素的inline style或computed style中读取当前属性值
// TODO: matrix解析可能在某些浏览器上有兼容性问题，后续考虑改用getBoundingClientRect
function getComputedProp(element, prop) {
  const style = element.style;
  if (prop === "opacity") {
    const val = parseFloat(style.opacity);
    if (!isNaN(val)) return val;
    return parseFloat(getComputedStyle(element).opacity) || 1;
  }
  if (prop === "scale") {
    const match = style.transform?.match(/scale\(([^)]+)\)/);
    if (match) return parseFloat(match[1]);
    const cs = getComputedStyle(element).transform;
    const csMatch = cs?.match(/matrix\(([^,]+),\s*[^,]+,\s*[^,]+,\s*([^,]+)/);
    return csMatch ? parseFloat(csMatch[1]) : 1;
  }
  if (prop === "y") {
    const match = style.transform?.match(/translateY\(([^)]+)px\)/);
    if (match) return parseFloat(match[1]);
    const cs = getComputedStyle(element).transform;
    const csMatch = cs?.match(/matrix\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^)]+)\)/);
    return csMatch ? parseFloat(csMatch[1]) : 0;
  }
  if (prop === "x") {
    const match = style.transform?.match(/translateX\(([^)]+)px\)/);
    if (match) return parseFloat(match[1]);
    const cs = getComputedStyle(element).transform;
    const csMatch = cs?.match(/matrix\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+)/);
    return csMatch ? parseFloat(csMatch[1]) : 0;
  }
  if (prop === "rotate") {
    const match = style.transform?.match(/rotate\(([^)]+)deg\)/);
    return match ? parseFloat(match[1]) : 0;
  }
  return 0;
}

function setComputedProp(element, prop, value) {
  if (prop === "opacity") {
    element.style.opacity = value;
    return;
  }
  // 构建 transform
  const y = prop === "y" ? value : getComputedProp(element, "y");
  const x = prop === "x" ? value : getComputedProp(element, "x");
  const s = prop === "scale" ? value : getComputedProp(element, "scale");
  const r = prop === "rotate" ? value : getComputedProp(element, "rotate");
  const parts = [];
  if (x !== 0) parts.push(`translateX(${x}px)`);
  if (y !== 0) parts.push(`translateY(${y}px)`);
  if (s !== 1) parts.push(`scale(${s})`);
  if (r !== 0) parts.push(`rotate(${r}deg)`);
  element.style.transform = parts.length ? parts.join(" ") : "none";
}

// 多元素交错入场动画，每个元素间隔stagger毫秒依次执行弹簧动画
export function staggerIn(elements, fromProps = {}, opts = {}) {
  if (isMotionReduced()) return Promise.resolve();
  const { stagger = 45, delay = 0, duration = 240 } = opts;
  const transforms = [];
  if (fromProps.x) transforms.push(`translateX(${fromProps.x}px)`);
  if (fromProps.y) transforms.push(`translateY(${fromProps.y}px)`);
  if (fromProps.scale && fromProps.scale !== 1) transforms.push(`scale(${fromProps.scale})`);
  if (fromProps.rotate) transforms.push(`rotate(${fromProps.rotate}deg)`);
  return Promise.all(elements.map((element, index) => runKeyframes(element, [
    { opacity: fromProps.opacity ?? 0, transform: transforms.join(" ") || "none" },
    { opacity: 1, transform: "none" }
  ], {
    duration,
    delay: delay + index * stagger,
    easing: "cubic-bezier(.16,1,.3,1)"
  })));
}

// 基于缓动函数的补间动画（非弹簧），适用于需要精确时长控制的场景
export function animate(element, targetProps, opts = {}) {
  if (reducedMotion) {
    Object.assign(element.style, targetProps);
    return Promise.resolve();
  }

  const { duration = 300, easing = easeOutCubic, onComplete } = opts;

  return new Promise((resolve) => {
    const from = {};
    for (const prop of Object.keys(targetProps)) {
      from[prop] = getComputedProp(element, prop);
    }

    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const t = easing(progress);

      for (const [prop, target] of Object.entries(targetProps)) {
        const current = from[prop] + (target - from[prop]) * t;
        setComputedProp(element, prop, current);
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        for (const [prop, value] of Object.entries(targetProps)) {
          setComputedProp(element, prop, value);
        }
        onComplete?.();
        resolve();
      }
    }

    requestAnimationFrame(tick);
  });
}

// 数字计数器：从0递增到目标值，支持前缀/后缀/小数位
export function countTo(element, targetValue, opts = {}) {
  if (isMotionReduced()) {
    element.textContent = formatCountValue(targetValue, opts);
    return Promise.resolve();
  }

  const { duration = 1200, easing = easeOutExpo, prefix = "", suffix = "", decimals = 0 } = opts;
  const startValue = 0;

  return new Promise((resolve) => {
    const startTime = performance.now();

    function tick(now) {
      if (isMotionReduced() || document.hidden || !element.isConnected || element.closest?.("[hidden]")) {
        element.textContent = formatCountValue(targetValue, opts);
        resolve();
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const t = easing(progress);
      const current = startValue + (targetValue - startValue) * t;

      element.textContent = prefix + current.toFixed(decimals) + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        element.textContent = prefix + targetValue.toFixed(decimals) + suffix;
        resolve();
      }
    }

    requestAnimationFrame(tick);
  });
}

function formatCountValue(value, opts) {
  const { prefix = "", suffix = "", decimals = 0 } = opts;
  return prefix + value.toFixed(decimals) + suffix;
}

/* ── 页面转场 ── */
export function transitionView(fromView, toView) {
  if (reducedMotion) {
    if (fromView) fromView.hidden = true;
    toView.hidden = false;
    toView.style.opacity = "1";
    toView.style.transform = "none";
    return Promise.resolve();
  }

  return new Promise(async (resolve) => {
    if (fromView && fromView !== toView) {
      await spring(fromView, { opacity: 0, y: -20, scale: 0.98 }, PRESETS.exit);
      fromView.hidden = true;
      fromView.style.opacity = "";
      fromView.style.transform = "";
    }

    toView.hidden = false;
    toView.style.opacity = "0";
    toView.style.transform = "translateY(24px) scale(0.98)";

    await spring(toView, { opacity: 1, y: 0, scale: 1 }, PRESETS.enter);
    resolve();
  });
}

// 答错时的水平抖动反馈
export function shake(element) {
  if (reducedMotion) return Promise.resolve();

  return new Promise((resolve) => {
    const keyframes = [
      { transform: "translateX(0)" },
      { transform: "translateX(-8px)" },
      { transform: "translateX(8px)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(6px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(3px)" },
      { transform: "translateX(0)" }
    ];
    const anim = element.animate(keyframes, { duration: 500, easing: "ease-out" });
    anim.onfinish = resolve;
  });
}

// 答对时的脉冲弹跳反馈
export function pulse(element) {
  if (reducedMotion) return Promise.resolve();

  return new Promise((resolve) => {
    const keyframes = [
      { transform: "scale(1)" },
      { transform: "scale(1.04)" },
      { transform: "scale(0.98)" },
      { transform: "scale(1.01)" },
      { transform: "scale(1)" }
    ];
    const anim = element.animate(keyframes, { duration: 400, easing: "ease-out" });
    anim.onfinish = resolve;
  });
}

// Toast弹入动画
export function toastIn(element) {
  if (isMotionReduced()) {
    element.style.opacity = "1";
    element.style.transform = "translate(50%, 0)";
    return Promise.resolve();
  }
  return runKeyframes(element, [
    { opacity: 0, transform: "translate(50%, 8px)" },
    { opacity: 1, transform: "translate(50%, 0)" }
  ], { duration: 200, easing: "cubic-bezier(.16,1,.3,1)" });
}

export function toastOut(element) {
  if (isMotionReduced()) {
    element.style.opacity = "0";
    return Promise.resolve();
  }
  return runKeyframes(element, [
    { opacity: 1, transform: "translate(50%, 0)" },
    { opacity: 0, transform: "translate(50%, 6px)" }
  ], { duration: 140, easing: "ease-in" });
}

export { PRESETS, easeOutExpo, easeOutCubic, easeInOutCubic };
