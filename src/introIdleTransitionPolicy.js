export function shouldDelayIdleCruiseAfterIntro({ nowMs, lastInteractionAt, delayMs }) {
  return nowMs - lastInteractionAt <= delayMs;
}

export function getIdleCruiseRamp({ nowMs, startedAt, rampMs }) {
  if (startedAt === null) return 0;
  const progress = clamp((nowMs - startedAt) / rampMs, 0, 1);
  return 1 - (1 - progress) ** 3;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
