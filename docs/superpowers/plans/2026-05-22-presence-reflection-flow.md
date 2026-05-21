# Presence Reflection Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the current Presence card flow so selected fragments and custom writing drive a local three-line echo stream, while preserving low-burden stopping, local-first history, and a fluid phone-like modal.

**Architecture:** Keep the existing Vite/Three.js front end and local-first storage. Add small data/logic modules for echo examples and mock echo generation, then integrate them into the existing `src/main.js` ritual state machine. Avoid real API calls, login, cloud sync, or broad app refactors.

**Tech Stack:** Vite 6, vanilla JavaScript ES modules, Three.js, CSS, localStorage, IndexedDB, Node assert-based tests.

---

## File Structure

- Create `src/echoExamples.js`: scene-based three-line echo examples and matching metadata.
- Create `src/echoEngine.js`: pure mock echo generation helpers that accept a session-like context and return three echo lines.
- Create `tests/echoEngine.test.mjs`: fast Node tests for echo generation behavior.
- Modify `src/main.js`: import the echo engine, update fragment/custom writing state, stop path, echo stream rendering, and calendar record shape.
- Modify `src/styles.css`: style expanded custom writing, stop notice, echo stream, and fluid phone-stage modal.
- Optionally modify `docs/superpowers/specs/2026-05-22-presence-reflection-flow-design.md` only if implementation uncovers a spec mismatch; otherwise leave it untouched.

## Task 1: Local Echo Engine And Example Library

**Files:**
- Create: `src/echoExamples.js`
- Create: `src/echoEngine.js`
- Create: `tests/echoEngine.test.mjs`

- [ ] **Step 1: Create the failing tests**

Create `tests/echoEngine.test.mjs`:

```js
import assert from "node:assert/strict";
import { createEchoLines, createEchoContext } from "../src/echoEngine.js";

const baseSession = {
  card: {
    id: "standard-43",
    setId: "standard",
    title: "标准 43",
    semanticProfile: {
      id: "standard-43",
      visualLayer: {
        visualFeatures: ["corner", "small-human-figure", "soft-boundaries"],
        composition: ["figure-at-edge"],
        motion: ["stillness"],
        colorMood: ["muted-shadow"],
      },
      emotionalLayer: {
        emotionalVectors: ["withdrawal", "vulnerability", "waiting"],
        energyLevel: 0.32,
        emotionalTemperature: "cool-heavy",
        socialFeeling: "withdrawal",
      },
    },
  },
  questions: ["你先看到了什么？", "有没有什么地方让你有点想离开？"],
  selectedFragments: new Map([
    ["a", { label: "想躲一下", family: "boundary", custom: false }],
    ["b", { label: "给自己三分钟", family: "need", custom: false }],
  ]),
  ritualSeed: 1107,
};

const context = createEchoContext(baseSession);
assert.equal(context.selectedLabels.length, 2);
assert.equal(context.customText, "");
assert.equal(context.card.id, "standard-43");

const lines = createEchoLines(baseSession);
assert.equal(lines.length, 3);
assert.match(lines[0], /想躲一下/);
assert.match(lines[0], /给自己三分钟/);
assert.ok(lines.every((line) => !/应该|建议|诊断|因为你/.test(line)));

const customLines = createEchoLines({
  ...baseSession,
  selectedFragments: new Map([["c", { label: "我其实只是想先不要回答任何人", family: "custom", custom: true }]]),
});
assert.equal(customLines.length, 3);
assert.match(customLines[0], /我其实只是想先不要回答任何人/);
assert.ok(customLines[2].includes("也许") || customLines[2].includes("像是") || customLines[2].includes("可能"));

const fallbackLines = createEchoLines({
  ...baseSession,
  selectedFragments: new Map([["x", { label: "蓝色", family: "related", custom: false }]]),
});
assert.equal(fallbackLines.length, 3);
assert.match(fallbackLines[0], /蓝色/);

console.log("echoEngine tests passed");
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node tests/echoEngine.test.mjs
```

Expected: FAIL with an import error because `src/echoEngine.js` does not exist.

- [ ] **Step 3: Add the example library**

Create `src/echoExamples.js`:

```js
export const echoExampleScenes = [
  {
    id: "withdrawal-soft",
    scene: "想躲 / 退后",
    families: ["boundary", "feeling", "need", "custom"],
    vectors: ["withdrawal", "vulnerability", "waiting", "distance"],
    keywords: ["躲", "退", "藏", "不想", "三分钟", "空间", "角落"],
    energyRange: [0.1, 0.58],
    examples: [
      {
        selectedFragments: ["想躲一下", "给自己三分钟"],
        echoLines: [
          "你留下了「想躲一下」和「给自己三分钟」。",
          "它们像是在说：先不要太快被看见。",
          "也许此刻等着的，是一个不用马上解释的地方。",
        ],
      },
      {
        selectedFragments: ["不必解释", "保留距离"],
        echoLines: [
          "你把「不必解释」和「保留距离」放在了一起。",
          "这里像是有一小块只属于自己的安静。",
          "也许它正在等一个可以不用立刻回应的空间。",
        ],
      },
    ],
  },
  {
    id: "unclear-fog",
    scene: "模糊 / 没答案",
    families: ["related", "feeling"],
    vectors: ["uncertainty", "wandering", "stillness", "waiting"],
    keywords: ["模糊", "不确定", "没答案", "雾", "乱", "还没"],
    energyRange: [0.12, 0.66],
    examples: [
      {
        selectedFragments: ["还没想好", "没答案"],
        echoLines: [
          "你留下了「还没想好」和「没答案」。",
          "它们像一片还没有散开的雾，不急着变成清楚的路。",
          "也许此刻需要的，只是允许这份不确定先待一会儿。",
        ],
      },
    ],
  },
  {
    id: "seen-soft",
    scene: "靠近 / 被看见",
    families: ["relation", "need", "body"],
    vectors: ["contact", "longing", "openness", "vulnerability"],
    keywords: ["靠近", "被看见", "抱", "陪", "支持", "柔软"],
    energyRange: [0.18, 0.78],
    examples: [
      {
        selectedFragments: ["想被抱住", "被看见一点"],
        echoLines: [
          "你留下了「想被抱住」和「被看见一点」。",
          "它们像是一种很小声的靠近，不一定要说得完整。",
          "也许这里等着的，是一点不用证明自己的陪伴。",
        ],
      },
    ],
  },
  {
    id: "boundary-protect",
    scene: "边界 / 保护",
    families: ["boundary", "relation"],
    vectors: ["constraint", "tension", "quiet-assessment", "distance"],
    keywords: ["边界", "保护", "距离", "危险", "控制", "束缚"],
    energyRange: [0.22, 0.82],
    examples: [
      {
        selectedFragments: ["照顾边界", "离远一点"],
        echoLines: [
          "你留下了「照顾边界」和「离远一点」。",
          "它们像是在给自己留出一个可以呼吸的位置。",
          "也许此刻等着的，是先确认哪里对你来说足够安全。",
        ],
      },
    ],
  },
  {
    id: "tired-rest",
    scene: "疲惫 / 停下",
    families: ["feeling", "body", "need"],
    vectors: ["exhaustion", "stillness", "surrender-to-rest", "withdrawal"],
    keywords: ["累", "疲", "困", "停", "休息", "沉"],
    energyRange: [0.05, 0.45],
    examples: [
      {
        selectedFragments: ["很累", "慢一点"],
        echoLines: [
          "你留下了「很累」和「慢一点」。",
          "它们像是身体先替你把速度放低了。",
          "也许此刻等着的，不是振作，而是被允许停下。",
        ],
      },
    ],
  },
];
```

- [ ] **Step 4: Add the mock echo engine**

Create `src/echoEngine.js`:

```js
import { echoExampleScenes } from "./echoExamples.js";

export function createEchoContext(session) {
  const selected = [...(session.selectedFragments?.values?.() ?? [])]
    .map((fragment) => ({
      label: String(fragment.label ?? fragment.draft ?? "").trim(),
      family: String(fragment.family ?? "related"),
      source: fragment.custom ? "custom" : "suggested",
    }))
    .filter((fragment) => fragment.label);

  const customText = selected
    .filter((fragment) => fragment.source === "custom")
    .map((fragment) => fragment.label)
    .join("\n")
    .trim();

  const profile = session.card?.semanticProfile ?? {};
  const visualLayer = profile.visualLayer ?? {};
  const emotionalLayer = profile.emotionalLayer ?? {};

  return {
    card: {
      id: session.card?.id ?? "",
      deckId: session.card?.setId ?? "",
      title: session.card?.title ?? "",
      sourceTitle: profile.sourceTitle ?? "",
      visualTokens: uniqueStrings([
        ...(visualLayer.visualFeatures ?? []),
        ...(visualLayer.composition ?? []),
        ...(visualLayer.motion ?? []),
        ...(visualLayer.colorMood ?? []),
      ]),
      emotionalVectors: uniqueStrings([
        ...(emotionalLayer.emotionalVectors ?? []),
        emotionalLayer.emotionalTemperature,
        emotionalLayer.socialFeeling,
      ].filter(Boolean)),
      energyLevel: typeof emotionalLayer.energyLevel === "number" ? emotionalLayer.energyLevel : 0.4,
    },
    questions: session.questions ?? [],
    selectedFragments: selected,
    selectedLabels: selected.map((fragment) => fragment.label),
    customText,
    seed: session.ritualSeed ?? hashString(session.card?.id ?? "presence"),
  };
}

export function createEchoLines(session) {
  const context = createEchoContext(session);
  const scene = selectExampleScene(context);
  const example = selectExample(scene.examples, context);
  return [
    createMirrorLine(context, example),
    createAdjacentLine(context, example),
    createWaitingLine(context, example),
  ].map(cleanEchoLine);
}

function selectExampleScene(context) {
  const scored = echoExampleScenes.map((scene) => ({
    scene,
    score: scoreScene(scene, context),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.scene ?? echoExampleScenes[0];
}

function scoreScene(scene, context) {
  const text = context.selectedLabels.join(" ");
  const familyScore = context.selectedFragments.filter((fragment) => scene.families.includes(fragment.family)).length * 3;
  const keywordScore = scene.keywords.filter((keyword) => text.includes(keyword)).length * 4;
  const vectorScore = scene.vectors.filter((vector) => context.card.emotionalVectors.includes(vector)).length * 2;
  const [minEnergy, maxEnergy] = scene.energyRange;
  const energyScore = context.card.energyLevel >= minEnergy && context.card.energyLevel <= maxEnergy ? 1.5 : 0;
  return familyScore + keywordScore + vectorScore + energyScore;
}

function selectExample(examples, context) {
  if (!examples?.length) return null;
  const index = Math.abs(hashString(`${context.selectedLabels.join("|")}:${context.seed}`)) % examples.length;
  return examples[index];
}

function createMirrorLine(context, example) {
  const labels = formatLabels(context.selectedLabels);
  if (labels) return `你留下了${labels}。`;
  return example?.echoLines?.[0] ?? "你把一些还没有完全成形的东西放在了这里。";
}

function createAdjacentLine(context, example) {
  const labelText = context.selectedLabels.join(" ");
  if (/躲|退|距离|边界|不想/.test(labelText)) return "它们像是在说：先不要太快被看见。";
  if (/雾|模糊|不确定|没答案|还没/.test(labelText)) return "它们像一片还没有散开的雾，不急着变成清楚的路。";
  if (/抱|陪|支持|靠近|看见/.test(labelText)) return "它们像是一种很小声的靠近，不一定要说得完整。";
  if (/累|困|疲|慢|停/.test(labelText)) return "它们像是身体先替你把速度放低了。";
  return example?.echoLines?.[1] ?? "它们像是把此刻轻轻放在了一个可以停留的位置。";
}

function createWaitingLine(context, example) {
  const labelText = context.selectedLabels.join(" ");
  if (/躲|退|不想|解释/.test(labelText)) return "也许此刻等着的，是一个不用马上解释的地方。";
  if (/边界|保护|危险|控制|束缚/.test(labelText)) return "也许此刻等着的，是先确认哪里对你来说足够安全。";
  if (/抱|陪|支持|靠近|看见/.test(labelText)) return "也许这里等着的，是一点不用证明自己的陪伴。";
  if (/累|困|疲|停|休息/.test(labelText)) return "也许此刻等着的，不是振作，而是被允许停下。";
  return example?.echoLines?.[2] ?? "也许它还不需要答案，只是在等你多看见它一点。";
}

function formatLabels(labels) {
  if (!labels.length) return "";
  if (labels.length === 1) return `「${labels[0]}」`;
  const visible = labels.slice(0, 3).map((label) => `「${label}」`);
  return `${visible.slice(0, -1).join("、")}和${visible.at(-1)}`;
}

function cleanEchoLine(line) {
  return String(line)
    .replace(/[“”]/g, "「")
    .replace(/「([^」]*)「/g, "「$1」")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(items) {
  return [...new Set(items.filter(Boolean))];
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < String(value).length; index += 1) {
    hash = (hash << 5) - hash + String(value).charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run:

```bash
node tests/echoEngine.test.mjs
```

Expected: PASS and prints `echoEngine tests passed`.

- [ ] **Step 6: Commit**

```bash
git add src/echoExamples.js src/echoEngine.js tests/echoEngine.test.mjs
git commit -m "feat: add local echo engine"
```

## Task 2: Fragment Stop Path And Expanded Custom Writing

**Files:**
- Modify: `src/main.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Add session fields for stop and custom writing**

In `createCardSession()` in `src/main.js`, add these fields to the returned object:

```js
    stopNoticeVisible: false,
    completedReflectionSaved: false,
    cardStaySaved: false,
```

Expected location: next to `echoConfirmed`, `inputExpanded`, and `openRecordSaved`.

- [ ] **Step 2: Replace the old skip button with a stop button**

In `renderFragmentStage(session)`, replace the third action button:

```html
<button class="secondary-button stop-button" id="stopFragments" type="button">
  <span class="action-icon arrow-icon" aria-hidden="true"></span>
  <span>先停在这里</span>
</button>
```

Replace the event binding:

```js
responseDock.querySelector("#stopFragments")?.addEventListener("click", () => stopFragments(session));
```

Remove the old `#skipFragments` binding from this function.

- [ ] **Step 3: Add an inline stop notice**

Inside the fragment stage template, after `fragment-guide`, add:

```js
      ${
        session.stopNoticeVisible
          ? `<p class="fragment-stop-notice" role="status">可以先停在这里。这张卡会回到画布里，等你想再靠近的时候再回来。</p>`
          : ""
      }
```

- [ ] **Step 4: Replace `skipFragments` with `stopFragments`**

Delete the old `skipFragments(session)` function and add:

```js
function stopFragments(session) {
  if (session.ritualStage !== "fragments") return;
  session.stopNoticeVisible = true;
  record("card_stay", {
    mode: "presence",
    action: "stop_without_echo",
    cardId: session.card.id,
    setId: session.card.setId,
    questionText: session.question,
    thumbnail: cardThumbnail(session.card),
    photoBatchId: state.activeBatchId,
  });
  renderRitualMode();
  const timer = window.setTimeout(() => {
    if (!cardModal.classList.contains("open") || getActiveSession() !== session) return;
    closeModal();
  }, 1800);
  state.modalTimers.push(timer);
}
```

- [ ] **Step 5: Guard `handleSendBottle` so empty selection stops instead of echoing**

At the top of `handleSendBottle(session, options = {})`, after the stage check, add:

```js
  if (!session.selectedFragments.size) {
    stopFragments(session);
    return;
  }
```

- [ ] **Step 6: Change custom writing from input paper to expanded writing panel**

In `renderFragmentPiece()`, replace the `fragment.writing` branch with:

```js
  if (fragment.writing) {
    piece.classList.add("custom-writing-panel");
    piece.innerHTML = `
      <label>
        <span>这里可以是一句话，也可以是一段还没整理好的东西。</span>
        <textarea placeholder="慢慢写下，不需要完整。" aria-label="自己写下"></textarea>
      </label>
      <button class="custom-writing-save" type="button">放进来</button>
    `;
    const textarea = piece.querySelector("textarea");
    const saveButton = piece.querySelector(".custom-writing-save");
    textarea.value = fragment.draft ?? "";
    textarea.addEventListener("click", (event) => event.stopPropagation());
    textarea.addEventListener("input", () => {
      fragment.draft = textarea.value;
    });
    saveButton.addEventListener("click", (event) => {
      event.stopPropagation();
      handleFragmentClick(session, fragment, piece);
    });
    window.setTimeout(() => textarea.focus(), 40);
  } else {
```

Keep the existing non-writing branch after this.

- [ ] **Step 7: Prevent writing panels from being draggable**

In `makeFragmentDraggable(piece, fragment, field)`, replace the first guard with:

```js
  if (!field || fragment.customAdd || fragment.writing) return;
```

- [ ] **Step 8: Use compact preview for custom writing in the selected area**

Add this helper near `renderBottleContents()`:

```js
function fragmentPreviewLabel(fragment) {
  if (!fragment.custom) return fragment.label;
  const text = fragment.label.trim();
  return text.length > 10 ? `${text.slice(0, 10)}...` : text || "我写下了一段话";
}
```

In `renderBottleContents()`, replace:

```js
chip.textContent = fragment.label;
```

with:

```js
chip.textContent = fragmentPreviewLabel(fragment);
chip.title = fragment.custom ? fragment.label : "";
```

- [ ] **Step 9: Add styles for stop notice and custom writing**

Add to `src/styles.css` near the fragment styles:

```css
.fragment-stop-notice {
  max-width: min(360px, 86vw);
  margin: -2px 0 0;
  color: rgba(31, 54, 60, 0.58);
  font-size: 14px;
  line-height: 1.7;
  text-align: center;
}

.paper-fragment.custom-writing-panel {
  width: min(320px, 82vw);
  min-width: min(320px, 82vw);
  min-height: 170px;
  padding: 22px 24px 18px;
  text-align: left;
}

.custom-writing-panel label {
  display: grid;
  gap: 10px;
  width: 100%;
}

.custom-writing-panel label span {
  color: rgba(31, 38, 34, 0.52);
  font-family: "Yuanti SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  line-height: 1.55;
}

.custom-writing-panel textarea {
  width: 100%;
  min-height: 86px;
  resize: vertical;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 252, 245, 0.44);
  color: rgba(31, 38, 34, 0.76);
  font: inherit;
  outline: 0;
}

.custom-writing-save {
  justify-self: end;
  min-height: 32px;
  margin-top: 8px;
  border: 0;
  background: transparent;
  color: rgba(31, 54, 60, 0.58);
  cursor: pointer;
  font-size: 13px;
}
```

- [ ] **Step 10: Run build**

Run:

```bash
npm run build
```

Expected: PASS. Existing bundle-size warning is acceptable.

- [ ] **Step 11: Commit**

```bash
git add src/main.js src/styles.css
git commit -m "feat: refine fragment stop and writing flow"
```

## Task 3: Integrate Three-Line Echo Stream

**Files:**
- Modify: `src/main.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Import the echo engine**

At the top of `src/main.js`, add:

```js
import { createEchoLines } from "./echoEngine.js";
```

- [ ] **Step 2: Add echo stream state**

In `createCardSession()`, add:

```js
    echoLines: [],
    echoLinesVisible: 0,
    echoRevealedAll: false,
```

- [ ] **Step 3: Create a helper to reveal echo lines**

Add near `createEchoMessages()`:

```js
function revealEchoLine(session, count) {
  if (session.ritualStage !== "echoes") return;
  session.echoLinesVisible = Math.max(session.echoLinesVisible, count);
  renderRitualMode();
}

function revealAllEchoLines(session) {
  if (session.ritualStage !== "echoes") return;
  session.echoRevealedAll = true;
  session.echoLinesVisible = session.echoLines.length;
  renderRitualMode();
}
```

- [ ] **Step 4: Replace local echo fragment generation**

In `handleSendBottle()`, replace:

```js
    session.echoMessages = createEchoMessages(session);
```

with:

```js
    session.echoLines = createEchoLines(session);
    session.echoLinesVisible = 1;
    session.echoRevealedAll = false;
    scheduleEchoLineReveal(session);
```

Add this helper:

```js
function scheduleEchoLineReveal(session) {
  const secondTimer = window.setTimeout(() => {
    if (!cardModal.classList.contains("open") || getActiveSession() !== session || session.echoRevealedAll) return;
    revealEchoLine(session, 2);
  }, 1800);
  const thirdTimer = window.setTimeout(() => {
    if (!cardModal.classList.contains("open") || getActiveSession() !== session || session.echoRevealedAll) return;
    revealEchoLine(session, 3);
  }, 3600);
  state.modalTimers.push(secondTimer, thirdTimer);
}
```

- [ ] **Step 5: Render the echo stream instead of selectable echo fragments**

In `renderEchoStage(session)`, replace the non-sending body with:

```js
          : `<div class="sea-message echo-message-cycle" aria-live="polite">
              <span>海面上飘回了一点回声</span>
              <span>它会慢慢浮上来</span>
              <span>点一下也可以直接看完</span>
            </div>`
```

Replace the `echoCloud` markup with:

```js
          ? `<button class="echo-stream" id="echoStream" type="button" aria-label="展开全部回声">
              ${session.echoLines
                .map((line, index) => `
                  <span class="echo-line${index < session.echoLinesVisible ? " visible" : ""}" style="--echo-line-delay:${index * 180}ms">
                    ${escapeHtml(line)}
                  </span>
                `)
                .join("")}
             </button>
             <div class="echo-actions">
              <button class="primary-button echo-save-button${session.echoConfirmed ? " confirmed" : ""}" id="confirmEchoSave" type="button">
                <span>${session.echoConfirmed ? "已收下" : "收下这张回声"}</span>
              </button>
             </div>`
```

Remove the old loop that renders `.echo-fragment` buttons.

Add this event binding:

```js
  responseDock.querySelector("#echoStream")?.addEventListener("click", () => revealAllEchoLines(session));
```

Keep the existing `#confirmEchoSave` behavior, but it should call `flushSessionExitRecords(session)` and mark `echoConfirmed`.

- [ ] **Step 6: Stop saving individual collected echoes**

In `flushSessionExitRecords(session)`, remove the loop over `session.echoMessages.filter(...)` and replace it with one reflection record:

```js
  if (session.echoLines.length && !session.completedReflectionSaved) {
    session.completedReflectionSaved = true;
    const prompt = getSessionPrompt(session);
    record("reflection", {
      mode: "presence",
      action: "complete",
      cardId: session.card.id,
      setId: session.card.setId,
      promptId: prompt?.id,
      questionId: prompt?.id,
      questionText: session.question,
      labels: [...session.selectedFragments.values()].map((fragment) => fragment.label),
      echoLines: session.echoLines,
      thumbnail: cardThumbnail(session.card),
      photoBatchId: state.activeBatchId,
    });
  }
```

Keep the existing tag and answer saving for now so calendar migration can be incremental, but ensure the calendar prefers `reflection` records in Task 4.

- [ ] **Step 7: Add echo stream styles**

Add near the echo styles:

```css
.echo-stream {
  display: grid;
  gap: 12px;
  width: min(420px, 88vw);
  min-height: 190px;
  padding: 22px 24px;
  border: 1px solid rgba(255, 252, 245, 0.58);
  border-radius: 18px 22px 18px 24px;
  background:
    linear-gradient(145deg, rgba(255, 253, 246, 0.9), rgba(219, 236, 230, 0.58)),
    rgba(255, 252, 245, 0.76);
  color: rgba(31, 38, 34, 0.74);
  cursor: pointer;
  font-size: 15px;
  line-height: 1.7;
  text-align: left;
}

.echo-line {
  opacity: 0;
  transform: translateY(8px);
}

.echo-line.visible {
  animation: echo-line-rise 520ms ease var(--echo-line-delay) both;
}

.echo-actions {
  display: flex;
  justify-content: center;
  width: min(420px, 88vw);
}

.echo-save-button.confirmed {
  background: linear-gradient(180deg, rgba(219, 236, 230, 0.96), rgba(199, 215, 234, 0.8));
  color: rgba(31, 54, 60, 0.72);
}

@keyframes echo-line-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 8: Run tests and build**

Run:

```bash
node tests/echoEngine.test.mjs
npm run build
```

Expected: both pass. Existing bundle-size warning is acceptable.

- [ ] **Step 9: Commit**

```bash
git add src/main.js src/styles.css
git commit -m "feat: show generated echo stream"
```

## Task 4: Calendar Review For Card Stays And Reflections

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Update calendar record filter**

In `isCalendarRecord(entry)`, replace the current body with:

```js
function isCalendarRecord(entry) {
  if (entry.type === "card_stay") return Boolean(entry.payload.cardId);
  if (entry.type === "card_open") return Boolean(entry.payload.cardId);
  if (entry.type === "reflection") return entry.payload.action === "complete" && Array.isArray(entry.payload.echoLines);
  if (entry.type === "tag") return ["bottle_fragment_select", "custom_fragment_select"].includes(entry.payload.action);
  if (entry.type === "answer") return entry.payload.action === "exit_save" && Boolean(entry.payload.text?.trim());
  return false;
}
```

Do not include old individual `echo` records in the user-facing calendar once `reflection` exists.

- [ ] **Step 2: Prefer reflection titles in calendar groups**

In `calendarEntryTitle(entry)`, add:

```js
  if (entry.type === "reflection") return "回声";
  if (entry.type === "card_stay") return "停留";
```

before the existing `echo`/`tag` cases.

- [ ] **Step 3: Include reflection lines in review details**

In `getCalendarReviewTexts(entries)`, add:

```js
  const reflectionLines = uniqueRecordValues(
    entries
      .filter((entry) => entry.type === "reflection" && Array.isArray(entry.payload.echoLines))
      .flatMap((entry) => entry.payload.echoLines)
      .filter(Boolean),
  );
```

Then return:

```js
  return uniqueRecordValues([...questions, ...labels, ...answers, ...reflectionLines]);
```

Remove the old `echoes` constant from the return order.

- [ ] **Step 4: Include selected labels from reflection records**

In `collectRecordLabels(entries)`, add:

```js
    if (entry.type === "reflection" && Array.isArray(entry.payload.labels)) {
      labels.push(...entry.payload.labels);
    }
```

before the tag case.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: PASS. Existing bundle-size warning is acceptable.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: refine reflection calendar records"
```

## Task 5: Fluid Phone-Stage Modal Layout

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add modal sizing variables**

At the top of `:root`, add:

```css
  --reflection-stage-width: clamp(360px, 100vw, 430px);
  --reflection-stage-height: min(900px, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 24px));
```

- [ ] **Step 2: Update modal stage geometry**

Replace the `.modal-stage` rule's inset, grid, width, and centering pieces with:

```css
.modal-stage {
  position: absolute;
  top: max(12px, env(safe-area-inset-top));
  left: 50%;
  width: var(--reflection-stage-width);
  max-width: calc(100vw - 24px);
  height: var(--reflection-stage-height);
  max-height: calc(100dvh - max(12px, env(safe-area-inset-top)) - max(12px, env(safe-area-inset-bottom)));
  display: grid;
  grid-template-rows: minmax(260px, 42%) auto minmax(0, 1fr);
  align-items: center;
  justify-items: center;
  gap: 8px;
  overflow: hidden;
  transform: translateX(-50%);
}
```

- [ ] **Step 3: Let the modal background breathe on wide screens**

In `.card-modal .modal-stage::before`, keep it inside the stage. Add a wide-screen atmosphere behind it:

```css
.card-modal::after {
  position: absolute;
  inset: 0;
  z-index: 0;
  content: "";
  pointer-events: none;
  background: radial-gradient(circle at 50% 30%, rgba(255, 252, 245, 0.28), transparent 46%);
}
```

Ensure `.modal-stage` has `z-index: 1`.

- [ ] **Step 4: Adjust card canvas sizing**

Replace `#focusCard` height sizing with:

```css
#focusCard {
  position: relative;
  z-index: 2;
  width: auto;
  max-width: min(88vw, 360px);
  height: min(38dvh, 330px);
  max-height: 38dvh;
  margin-top: 34px;
  object-fit: contain;
  border-radius: 16px;
  box-shadow: none;
  align-self: start;
}
```

- [ ] **Step 5: Update mobile media overrides**

In the existing mobile media query, remove hard-coded `.modal-stage` and `#focusCard` widths that fight the new variables. Keep only overrides that reduce heights on very small screens:

```css
  :root {
    --reflection-stage-width: min(100vw, 430px);
    --reflection-stage-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px);
  }

  #focusCard {
    height: min(36dvh, 300px);
    max-height: 36dvh;
  }
```

- [ ] **Step 6: Run build**

Run:

```bash
npm run build
```

Expected: PASS. Existing bundle-size warning is acceptable.

- [ ] **Step 7: Commit**

```bash
git add src/styles.css
git commit -m "style: add fluid reflection stage"
```

## Task 6: End-To-End Browser Verification

**Files:**
- Modify only if verification finds defects: `src/main.js`, `src/styles.css`

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, normally `http://127.0.0.1:5173/`.

- [ ] **Step 2: Verify the selected-fragment echo path**

In the browser:

1. Open `http://127.0.0.1:5173/`.
2. Wait until cards are visible.
3. Click a card.
4. Wait for questions to finish.
5. Select at least two fragments.
6. Click `选好了`.
7. Confirm the echo stage shows three lines, one by one.
8. Click the echo area before all lines are visible.
9. Confirm all lines appear immediately.
10. Click `收下这张回声`.

Expected:

- Echo line 1 includes at least one selected fragment label.
- No selectable echo chips appear.
- Save button changes to confirmed state.
- Closing and opening calendar shows the date with the selected card/reflection.

- [ ] **Step 3: Verify the custom writing path**

In the browser:

1. Open a card.
2. Wait for the fragment stage.
3. Click `自己写下`.
4. Write `我想先不要回答任何人，只是待一会儿`.
5. Click `放进来`.
6. Click `选好了`.

Expected:

- The writing area accepts the full sentence.
- The selected preview is compact.
- Echo line 1 includes the custom writing content.
- Calendar detail can show the custom writing after saving.

- [ ] **Step 4: Verify the stop path**

In the browser:

1. Open a card.
2. Wait for the fragment stage.
3. Do not select any fragment.
4. Click `先停在这里`.

Expected:

- A gentle stop notice appears.
- The modal closes automatically.
- No echo stage appears.
- Calendar shows a weak card stay for the date.

- [ ] **Step 5: Verify responsive modal layout**

Use browser viewport overrides or manual resizing:

- Mobile-ish: 390x844.
- Small mobile-ish: 360x640.
- Tablet-ish: 768x1024.
- Desktop: 1280x720.

Expected:

- Infinite canvas fills the full viewport on all sizes.
- Reflection modal core remains phone-like, centered on tablet/desktop.
- Text/actions remain reachable on short mobile.
- No obvious overlap between card, questions, fragments, echo lines, and buttons.

- [ ] **Step 6: Run final verification**

Run:

```bash
node tests/echoEngine.test.mjs
npm run build
git status --short
```

Expected:

- Echo engine tests pass.
- Build passes with only the existing bundle-size warning.
- `git status --short` shows only intentional changes before final commit.

- [ ] **Step 7: Fix defects if found**

If a defect appears, make the smallest targeted change in the file that owns the behavior:

- Echo wording/generation: `src/echoEngine.js` or `src/echoExamples.js`.
- Fragment/echo state: `src/main.js`.
- Layout/overlap: `src/styles.css`.
- Calendar detail: `src/main.js`.

Then repeat the specific failed browser check and rerun:

```bash
node tests/echoEngine.test.mjs
npm run build
```

- [ ] **Step 8: Final commit**

```bash
git add src/main.js src/styles.css src/echoExamples.js src/echoEngine.js tests/echoEngine.test.mjs
git commit -m "feat: implement presence reflection flow"
```

## Plan Self-Review

- Spec coverage: The plan covers the stop path, expanded writing, profile-driven mock echo, three-line echo stream, calendar records, local-first scope, and fluid modal layout.
- Placeholder scan: No task relies on "TBD", "TODO", or "implement later"; each task lists exact files, snippets, commands, and expected outcomes.
- Type consistency: The plan consistently uses `selectedFragments`, `echoLines`, `reflection`, `card_stay`, `completedReflectionSaved`, and `stopNoticeVisible` across tasks.
- Scope check: Real API calls, login, cloud sync, and full card-profile expansion are explicitly out of scope.
