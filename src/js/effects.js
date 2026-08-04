import { isMotionReduced } from "./motion.js";

const transientAnimations = new Set();

export function syncAmbientParticles() {
  const container = document.querySelector(".ambient-particles");
  if (!container) return;
  if (isMotionReduced() || document.hidden) {
    container.replaceChildren();
    return;
  }
  if (!container.childElementCount) {
    const particle = document.createElement("div");
    particle.className = "particle particle-1";
    container.append(particle);
  }
}

export function spawnExamConfetti() {
  if (isMotionReduced()) return;
  const colors = ["#f0b429", "#146c43", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316"];
  for (let index = 0; index < 18; index += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    document.body.append(piece);
    const drift = (Math.random() - 0.5) * 200;
    const animation = piece.animate([
      { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: 1 },
      { transform: `translateY(100vh) translateX(${drift}px) rotate(${360 + Math.random() * 720}deg)`, opacity: 0 }
    ], { duration: 1500 + Math.random() * 1000, delay: Math.random() * 300, easing: "cubic-bezier(.25,.46,.45,.94)", fill: "forwards" });
    transientAnimations.add(animation);
    const cleanup = () => {
      transientAnimations.delete(animation);
      piece.remove();
    };
    animation.addEventListener("finish", cleanup, { once: true });
    animation.addEventListener("cancel", cleanup, { once: true });
  }
}

export function clearTransientEffects() {
  for (const animation of [...transientAnimations]) animation.cancel();
  document.querySelectorAll(".celebration-particle, .confetti-piece").forEach((element) => element.remove());
}
