import assert from "node:assert/strict";
import {
  getIdleCruiseRamp,
  shouldDelayIdleCruiseAfterIntro,
} from "../src/introIdleTransitionPolicy.js";

assert.equal(shouldDelayIdleCruiseAfterIntro({ nowMs: 8000, lastInteractionAt: 8000, delayMs: 2000 }), true);
assert.equal(shouldDelayIdleCruiseAfterIntro({ nowMs: 10001, lastInteractionAt: 8000, delayMs: 2000 }), false);

assert.equal(getIdleCruiseRamp({ nowMs: 5000, startedAt: null, rampMs: 1600 }), 0);
assert.equal(getIdleCruiseRamp({ nowMs: 5000, startedAt: 5000, rampMs: 1600 }), 0);
assert.ok(getIdleCruiseRamp({ nowMs: 5800, startedAt: 5000, rampMs: 1600 }) > 0.5);
assert.equal(getIdleCruiseRamp({ nowMs: 7000, startedAt: 5000, rampMs: 1600 }), 1);
