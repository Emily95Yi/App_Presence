const defaultPinchSuppressMs = 280;
const defaultForwardMaxScrollDelta = 0.105;
const defaultForwardDeadZone = 0.08;

export function isCanvasTapSuppressed({ nowMs, suppressTapUntil = 0 }) {
  return nowMs < suppressTapUntil;
}

export function canOpenCanvasCard({ browseMode = false, nowMs, suppressTapUntil = 0 }) {
  return !browseMode && !isCanvasTapSuppressed({ nowMs, suppressTapUntil });
}

export function getPinchSuppressTapUntil({ nowMs, durationMs = defaultPinchSuppressMs }) {
  return nowMs + durationMs;
}

export function getForwardSliderScrollDelta(
  value,
  { maxScrollDelta = defaultForwardMaxScrollDelta, deadZone = defaultForwardDeadZone } = {},
) {
  const clamped = clamp(Number.isFinite(value) ? value : 0, 0, 1);
  if (clamped <= deadZone) return 0;
  const normalized = (clamped - deadZone) / (1 - deadZone);
  return Number((-normalized * maxScrollDelta).toFixed(6));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
