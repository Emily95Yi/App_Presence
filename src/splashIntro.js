const defaultTiming = {
  revealMs: 900,
  completeMs: 4300,
  leaveMs: 700,
};

const reducedMotionTiming = {
  revealMs: 350,
  completeMs: 900,
  leaveMs: 200,
};

export function getSplashTiming(win = globalThis.window) {
  const prefersReducedMotion =
    win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  return prefersReducedMotion ? reducedMotionTiming : defaultTiming;
}

export function createSplashIntro({
  document,
  logoSrc,
  onReveal = () => {},
  onComplete = () => {},
  waitForReady = () => Promise.resolve(),
  setTimeout = globalThis.setTimeout,
  clearTimeout = globalThis.clearTimeout,
  timing = getSplashTiming(),
}) {
  const element = document.createElement("div");
  element.classList.add("splash-intro");
  element.setAttribute("aria-hidden", "true");

  const gradient = document.createElement("div");
  gradient.classList.add("splash-intro__gradient");

  ["blue", "lavender", "teal"].forEach((tone) => {
    const blob = document.createElement("div");
    blob.classList.add("splash-intro__blob", `splash-intro__blob--${tone}`);
    gradient.appendChild(blob);
  });

  const grain = document.createElement("div");
  grain.classList.add("splash-intro__grain");

  const logoWrap = document.createElement("div");
  logoWrap.classList.add("splash-intro__logo-wrap");

  const logo = document.createElement("img");
  logo.classList.add("splash-intro__logo");
  logo.src = logoSrc;
  logo.alt = "";
  logo.decoding = "async";
  logo.draggable = false;

  logoWrap.appendChild(logo);
  element.append(gradient, grain, logoWrap);
  document.body.appendChild(element);

  let revealed = false;
  let completed = false;

  const reveal = () => {
    if (revealed) return;
    revealed = true;
    onReveal();
  };

  const finish = () => {
    if (completed) return;
    completed = true;
    reveal();
    element.remove();
    onComplete();
  };

  const timers = [];
  const queueTimer = (callback, delay) => {
    const timer = setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  };

  const complete = async () => {
    if (completed) return;
    await waitForReady();
    if (completed) return;
    reveal();
    element.classList.add("splash-intro--leaving");
    queueTimer(finish, timing.leaveMs);
  };

  queueTimer(reveal, timing.revealMs);
  queueTimer(complete, timing.completeMs);

  return {
    element,
    destroy() {
      timers.forEach((timer) => clearTimeout(timer));
      element.remove();
    },
  };
}
