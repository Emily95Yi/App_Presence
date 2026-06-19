import assert from "node:assert/strict";
import {
  canOpenCanvasCard,
  getForwardSliderScrollDelta,
  getPinchSuppressTapUntil,
  isCanvasTapSuppressed,
} from "../src/canvasTouchInteractionPolicy.js";

assert.equal(canOpenCanvasCard({ browseMode: false, nowMs: 1000, suppressTapUntil: 0 }), true);
assert.equal(canOpenCanvasCard({ browseMode: true, nowMs: 1000, suppressTapUntil: 0 }), false);
assert.equal(canOpenCanvasCard({ browseMode: false, nowMs: 1000, suppressTapUntil: 1200 }), false);
assert.equal(canOpenCanvasCard({ browseMode: false, nowMs: 1300, suppressTapUntil: 1200 }), true);

assert.equal(isCanvasTapSuppressed({ nowMs: 999, suppressTapUntil: 1000 }), true);
assert.equal(isCanvasTapSuppressed({ nowMs: 1000, suppressTapUntil: 1000 }), false);

assert.equal(getPinchSuppressTapUntil({ nowMs: 2000 }), 2280);
assert.equal(getPinchSuppressTapUntil({ nowMs: 2000, durationMs: 360 }), 2360);

assert.equal(getForwardSliderScrollDelta(0), 0);
assert.equal(getForwardSliderScrollDelta(0.04), 0);
assert.ok(getForwardSliderScrollDelta(0.5) < 0);
assert.equal(getForwardSliderScrollDelta(1), -0.078);
assert.equal(getForwardSliderScrollDelta(2), -0.078);
