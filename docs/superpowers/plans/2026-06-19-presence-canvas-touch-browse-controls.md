# Presence Canvas Touch Browse Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in browse mode and compact touch forward slider so mobile and iPad users can explore the infinite canvas without accidental card opens.

**Architecture:** Keep DOM-heavy event wiring in `src/main.js`, but extract small pure interaction helpers into `src/canvasTouchInteractionPolicy.js` for testable decisions. Add minimal markup in `index.html` and styling in `src/styles.css`, reusing the existing glass control language and camera velocity system.

**Tech Stack:** Vite, Three.js, browser Pointer Events, CSS safe-area env vars, Node ESM assertion tests.

---

## File Structure

- Create `src/canvasTouchInteractionPolicy.js`: pure helpers for card-open gating, pinch tap suppression, and forward slider motion.
- Create `tests/canvasTouchInteractionPolicy.test.mjs`: Node assertion coverage for the helpers.
- Modify `index.html`: add the browse-mode top button and the bottom forward slider control.
- Modify `src/main.js`: import helpers, add state, wire toggle and slider events, guard card opening.
- Modify `src/styles.css`: style the active browse button and touch-only forward slider.

---

### Task 1: Add Tested Interaction Policy Helpers

**Files:**
- Create: `src/canvasTouchInteractionPolicy.js`
- Create: `tests/canvasTouchInteractionPolicy.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/canvasTouchInteractionPolicy.test.mjs`:

```js
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
assert.ok(getForwardSliderScrollDelta(0.5) > 0);
assert.equal(getForwardSliderScrollDelta(1), 0.034);
assert.equal(getForwardSliderScrollDelta(2), 0.034);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node tests/canvasTouchInteractionPolicy.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/canvasTouchInteractionPolicy.js`.

- [ ] **Step 3: Implement the minimal helper module**

Create `src/canvasTouchInteractionPolicy.js`:

```js
const defaultPinchSuppressMs = 280;
const defaultForwardMaxScrollDelta = 0.034;
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
  return Number((normalized * maxScrollDelta).toFixed(6));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node tests/canvasTouchInteractionPolicy.test.mjs
```

Expected: command exits with code 0 and no assertion output.

- [ ] **Step 5: Commit**

```bash
git add src/canvasTouchInteractionPolicy.js tests/canvasTouchInteractionPolicy.test.mjs
git commit -m "Add canvas touch interaction policy"
```

---

### Task 2: Add Browse Mode UI and Card-Open Guard

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/styles.css`
- Test: `tests/canvasTouchInteractionPolicy.test.mjs`

- [ ] **Step 1: Verify the existing helper test still passes**

Run:

```bash
node tests/canvasTouchInteractionPolicy.test.mjs
```

Expected: command exits with code 0.

- [ ] **Step 2: Add the browse button markup**

In `index.html`, inside `<nav class="top-actions" aria-label="工具">`, insert this button between `calendarToggle` and `cardSetToggle`:

```html
<button id="browseModeToggle" class="icon-button browse-mode-button" type="button" aria-label="开启浏览模式" aria-pressed="false">
  <span class="ph-duotone ph-hand-palm" aria-hidden="true"></span>
</button>
```

- [ ] **Step 3: Import the policy helpers**

In `src/main.js`, add this import after the existing local imports:

```js
import { canOpenCanvasCard } from "./canvasTouchInteractionPolicy.js";
```

- [ ] **Step 4: Store and sync browse mode state**

In `src/main.js`, add the DOM reference near the existing top-level element constants:

```js
const browseModeToggle = document.getElementById("browseModeToggle");
```

Add this property to the `state` object:

```js
browseMode: false,
pinchSuppressTapUntil: 0,
```

Add these functions near the panel/toggle helpers:

```js
function setBrowseMode(enabled) {
  state.browseMode = enabled;
  syncBrowseModeToggle();
  setHoveredMeshId(null);
}

function syncBrowseModeToggle() {
  browseModeToggle.classList.toggle("active", state.browseMode);
  browseModeToggle.setAttribute("aria-pressed", String(state.browseMode));
  browseModeToggle.setAttribute("aria-label", state.browseMode ? "关闭浏览模式" : "开启浏览模式");
}
```

Add this event listener near the existing top-action listeners:

```js
browseModeToggle.addEventListener("click", () => {
  hideIntroWhisper();
  setBrowseMode(!state.browseMode);
});
```

- [ ] **Step 5: Guard card opening while preserving keyword taps**

Replace the hit selection and card-opening tail of `handleTap` in `src/main.js` with:

```js
const hit = state.browseMode
  ? visibleHits.find((entry) => entry.object.userData.kind === "word") ?? visibleHits[0]
  : visibleHits.find((entry) => entry.object.userData.kind === "card") ?? visibleHits[0];
if (!hit) return;
const item = hit.object.userData;
if (item.kind === "word") {
  item.lit = true;
  hit.object.material.map = makeWordTexture(item.text, true, item.seed);
  hit.object.material.needsUpdate = true;
  record("keyword", { wordId: item.word?.id ?? item.id, text: item.text, groupId: item.groupId });
  return;
}
if (!canOpenCanvasCard({
  browseMode: state.browseMode,
  nowMs: performance.now(),
  suppressTapUntil: state.pinchSuppressTapUntil,
})) {
  return;
}
openCardExperience([item.card], 0, null);
```

- [ ] **Step 6: Add active button styles**

In `src/styles.css`, after `.help-button`, add:

```css
.browse-mode-button.active {
  border-color: rgba(143, 184, 165, 0.46);
  background: rgba(232, 247, 240, 0.78);
  color: rgba(27, 70, 54, 0.9);
  box-shadow: 0 14px 36px rgba(84, 120, 102, 0.16);
}
```

- [ ] **Step 7: Run tests and build**

Run:

```bash
node tests/canvasTouchInteractionPolicy.test.mjs
npm run build
```

Expected: helper test exits with code 0; Vite build completes successfully.

- [ ] **Step 8: Commit**

```bash
git add index.html src/main.js src/styles.css
git commit -m "Add canvas browse mode"
```

---

### Task 3: Suppress Pinch-Release Card Taps

**Files:**
- Modify: `src/main.js`
- Test: `tests/canvasTouchInteractionPolicy.test.mjs`

- [ ] **Step 1: Verify the helper test still passes**

Run:

```bash
node tests/canvasTouchInteractionPolicy.test.mjs
```

Expected: command exits with code 0.

- [ ] **Step 2: Add pinch state**

In the `state` object in `src/main.js`, add:

```js
isPinching: false,
```

- [ ] **Step 3: Import the pinch suppression helper**

Extend the `src/main.js` policy import:

```js
import {
  canOpenCanvasCard,
  getPinchSuppressTapUntil,
} from "./canvasTouchInteractionPolicy.js";
```

- [ ] **Step 4: Mark pinch activity during two-pointer movement**

Inside `onPointerMove`, in the `if (state.pointers.size === 2)` branch, add these lines before `return`:

```js
state.isPinching = true;
state.pinchSuppressTapUntil = getPinchSuppressTapUntil({ nowMs: performance.now() });
```

The branch should still keep the existing distance calculation and `state.scrollAccum += (state.lastTouchDist - dist) * 0.0065;` behavior.

- [ ] **Step 5: Prevent tap handling after pinch end**

Replace `onPointerUp` with:

```js
function onPointerUp(event) {
  markCanvasInteraction();
  const nowMs = performance.now();
  const last = state.lastPointer;
  const wasPinching = state.isPinching || state.pointers.size > 1;
  state.pointers.delete(event.pointerId);
  state.lastTouchDist = 0;
  state.isDragging = state.pointers.size > 0;
  if (wasPinching) {
    state.pinchSuppressTapUntil = getPinchSuppressTapUntil({ nowMs });
    state.isPinching = state.pointers.size > 1;
    state.lastPointer = null;
    return;
  }
  state.isPinching = false;
  if (last && last.moved < 9 && nowMs - last.t < 360) handleTap(event.clientX, event.clientY);
}
```

- [ ] **Step 6: Run tests and build**

Run:

```bash
node tests/canvasTouchInteractionPolicy.test.mjs
npm run build
```

Expected: helper test exits with code 0; Vite build completes successfully.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "Suppress card taps after pinch gestures"
```

---

### Task 4: Add the Touch Forward Slider

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/styles.css`
- Test: `tests/canvasTouchInteractionPolicy.test.mjs`

- [ ] **Step 1: Verify the slider policy test still passes**

Run:

```bash
node tests/canvasTouchInteractionPolicy.test.mjs
```

Expected: command exits with code 0.

- [ ] **Step 2: Add slider markup**

In `index.html`, add this element after the `cardModal` section and before `introWhisper`:

```html
<div id="forwardSlider" class="forward-slider" role="slider" aria-label="向前推进画布" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
  <span class="forward-slider__track" aria-hidden="true">
    <span id="forwardSliderFill" class="forward-slider__fill"></span>
    <span id="forwardSliderThumb" class="forward-slider__thumb">
      <span class="ph-duotone ph-caret-right" aria-hidden="true"></span>
    </span>
  </span>
</div>
```

- [ ] **Step 3: Import the slider policy helper**

Extend the `src/main.js` policy import:

```js
import {
  canOpenCanvasCard,
  getForwardSliderScrollDelta,
  getPinchSuppressTapUntil,
} from "./canvasTouchInteractionPolicy.js";
```

- [ ] **Step 4: Add slider DOM references and state**

Add these top-level constants near the existing DOM constants:

```js
const forwardSlider = document.getElementById("forwardSlider");
const forwardSliderFill = document.getElementById("forwardSliderFill");
const forwardSliderThumb = document.getElementById("forwardSliderThumb");
```

Add these properties to `state`:

```js
forwardControlValue: 0,
forwardPointerId: null,
```

- [ ] **Step 5: Feed slider value into camera motion**

In `animate`, after `state.targetVel.z += state.scrollAccum;`, add:

```js
state.targetVel.z += getForwardSliderScrollDelta(state.forwardControlValue);
```

- [ ] **Step 6: Add slider update helpers**

Add these functions near the pointer handlers:

```js
function setForwardControlValue(value) {
  state.forwardControlValue = clamp(value, 0, 1);
  const percentage = Math.round(state.forwardControlValue * 100);
  forwardSlider.style.setProperty("--forward-value", String(state.forwardControlValue));
  forwardSliderFill.style.transform = `scaleX(${state.forwardControlValue})`;
  forwardSliderThumb.style.left = `${state.forwardControlValue * 100}%`;
  forwardSlider.setAttribute("aria-valuenow", String(percentage));
}

function updateForwardControlFromClientX(clientX) {
  const rect = forwardSlider.getBoundingClientRect();
  setForwardControlValue((clientX - rect.left) / rect.width);
}

function resetForwardControl() {
  state.forwardPointerId = null;
  setForwardControlValue(0);
}
```

- [ ] **Step 7: Wire pointer and keyboard slider events**

Add these listeners near the other event listeners:

```js
forwardSlider.addEventListener("pointerdown", (event) => {
  hideIntroWhisper();
  markCanvasInteraction();
  state.forwardPointerId = event.pointerId;
  forwardSlider.setPointerCapture(event.pointerId);
  updateForwardControlFromClientX(event.clientX);
});

forwardSlider.addEventListener("pointermove", (event) => {
  if (state.forwardPointerId !== event.pointerId) return;
  markCanvasInteraction();
  updateForwardControlFromClientX(event.clientX);
});

forwardSlider.addEventListener("pointerup", resetForwardControl);
forwardSlider.addEventListener("pointercancel", resetForwardControl);

forwardSlider.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    event.preventDefault();
    setForwardControlValue(state.forwardControlValue + 0.12);
  }
  if (event.key === "ArrowLeft" || event.key === "Escape") {
    event.preventDefault();
    resetForwardControl();
  }
});

forwardSlider.addEventListener("keyup", (event) => {
  if (event.key === "ArrowRight") resetForwardControl();
});
```

Call `setForwardControlValue(0);` once after startup initialization or after event listener registration.

- [ ] **Step 8: Add slider CSS**

In `src/styles.css`, after `.intro-whisper.visible`, add:

```css
.forward-slider {
  position: fixed;
  left: 50%;
  bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px));
  z-index: 6;
  display: none;
  width: min(220px, calc(100vw - 72px));
  height: 44px;
  padding: 15px 18px;
  border: 1px solid rgba(31, 38, 34, 0.1);
  border-radius: 999px;
  background: rgba(247, 252, 253, 0.58);
  box-shadow: 0 18px 46px rgba(70, 90, 84, 0.12);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transform: translateX(-50%);
  touch-action: none;
}

.forward-slider__track {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: rgba(31, 38, 34, 0.1);
}

.forward-slider__fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(143, 184, 165, 0.7);
  transform: scaleX(0);
  transform-origin: left center;
}

.forward-slider__thumb {
  position: absolute;
  top: 50%;
  left: 0;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: rgba(31, 38, 34, 0.62);
  box-shadow: 0 8px 20px rgba(52, 76, 67, 0.2);
  transform: translate(-50%, -50%);
}

.forward-slider__thumb .ph-duotone {
  font-size: 16px;
}

@media (pointer: coarse), (max-width: 720px) {
  .forward-slider {
    display: block;
  }
}
```

- [ ] **Step 9: Run tests and build**

Run:

```bash
node tests/canvasTouchInteractionPolicy.test.mjs
npm run build
```

Expected: helper test exits with code 0; Vite build completes successfully.

- [ ] **Step 10: Commit**

```bash
git add index.html src/main.js src/styles.css
git commit -m "Add touch forward slider"
```

---

### Task 5: Browser Verification and Final Cleanup

**Files:**
- Modify only if verification reveals a defect: `index.html`, `src/main.js`, `src/styles.css`, `src/canvasTouchInteractionPolicy.js`, `tests/canvasTouchInteractionPolicy.test.mjs`

- [ ] **Step 1: Run all project tests**

Run:

```bash
for file in tests/*.test.mjs; do node "$file"; done
```

Expected: each test file exits with code 0 and the command prints no assertion failures.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: Vite build completes successfully.

- [ ] **Step 3: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Vite prints a local URL such as `http://localhost:5173/`.

- [ ] **Step 4: Manually verify desktop defaults**

Open the local Vite URL in a browser at a desktop viewport. Verify:

- Cards still open when browse mode is off.
- The browse button toggles active styling and `aria-pressed`.
- Cards do not open when browse mode is on.
- Words still light up in browse mode.
- The forward slider is not visible on a pointer-only desktop viewport wider than 720px.

- [ ] **Step 5: Manually verify mobile viewport**

Use a mobile-sized viewport such as 390 x 844. Verify:

- The forward slider is visible near the bottom safe area.
- Dragging the slider right moves the canvas along the same direction as the existing wheel/pinch forward movement.
- Releasing the slider returns the thumb and fill to 0.
- Dragging the canvas and pinching still work with the slider present.
- Releasing a pinch does not open a nearby card.

- [ ] **Step 6: Fix any verification defects with focused tests first**

If a defect is in pure behavior, add or update an assertion in `tests/canvasTouchInteractionPolicy.test.mjs` before changing implementation. If the defect is layout-only, fix `src/styles.css` and rerun `npm run build`.

- [ ] **Step 7: Final status check**

Run:

```bash
git status --short
```

Expected: no unstaged implementation changes remain except intentional final edits.

- [ ] **Step 8: Commit final verification fixes if any were made**

If Step 6 changed files, run:

```bash
git add index.html src/main.js src/styles.css src/canvasTouchInteractionPolicy.js tests/canvasTouchInteractionPolicy.test.mjs
git commit -m "Polish touch canvas controls"
```

If Step 6 made no changes, skip this commit.

---

## Self-Review

- Spec coverage: Task 2 covers the top-right browse mode and card-open prevention; Task 3 covers pinch-release suppression; Task 4 covers the bottom forward slider and touch/narrow display behavior; Task 5 covers desktop, mobile, keyword, pinch, and build verification.
- Red-flag scan: The plan contains no deferred implementation or unspecified tests.
- Type consistency: Helper names, state fields, DOM IDs, and CSS classes are consistent across tasks.
