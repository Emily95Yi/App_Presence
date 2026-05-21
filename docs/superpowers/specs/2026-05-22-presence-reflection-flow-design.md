# Presence Reflection Flow Redesign

## Purpose

Presence is a lightweight projection-card reflection space. It helps people notice current feelings, beliefs, sensations, and unclear inner states through image-based cards, selected fragments, and gentle echoes.

The product should not feel like analysis, therapy, coaching, journaling homework, or AI advice. It should let a person slow down, be met, and stay with something unclear without needing to become positive, articulate, or resolved.

## Current Implementation Summary

The current `main` app already contains the main experiential skeleton:

- A full-window infinite canvas with projection cards and floating words.
- Card opening into a modal reflection experience.
- Three observation questions shown before the fragment stage.
- A fragment-selection stage using draggable/clickable paper pieces.
- A local echo stage with multiple preset response fragments.
- A calendar panel showing only dates with records.
- A settings panel for card deck visibility and local image upload.
- Local-first storage using `localStorage` and IndexedDB.
- A reserved `/api/openai/echo` endpoint with fallback behavior, though the front end does not yet use it as the main echo path.

The main gap is that the current echo stage does not meaningfully use the user's selected fragments or custom writing. It returns fixed gentle copy, which makes the experience feel less responsive than the intended "echo" concept.

## Product Principles

### Projection First

Cards do not represent fixed emotions. The observer decides meaning.

Card profiles must be treated as image affordances, not emotional labels. A profile can describe visual objects, color mood, composition, motion, spatial relationship, and symbolic material, but it must not imply "this card means sadness" or "this card means avoidance."

Echo generation should weight meaning in this order:

1. User custom writing.
2. User-selected fragments.
3. The observation questions shown in the session.
4. Card image/profile cues.

### Low Burden

The user should never feel they are filling out an assessment. The app should allow:

- Selecting one word.
- Writing an incomplete sentence.
- Choosing nothing and stopping.
- Returning later without penalty.
- Seeing only dates with records, without streaks or empty-day pressure.

### No Behavioral Log Feel

History is not a behavior log. It is a record of emotional stay and completed reflections.

The app may store technical events locally, but the user-facing calendar should show meaningful records:

- Card stays.
- Selected fragments.
- Custom writing.
- Echo lines.
- Related card and date.

The calendar should not emphasize:

- App opens.
- Button clicks.
- Cancel/reset actions.
- Drag/zoom behavior.
- Usage duration.
- Streaks or consecutive-day metrics.

## Target Flow

### 1. Infinite Canvas

The user enters a full-window infinite canvas containing enabled projection decks and word groups.

The canvas should adapt to the current device. On iPad or desktop, it should not render as a centered phone-sized viewport. Larger screens should reveal more world, while maintaining appropriate card density and a calm first impression.

### 2. Card Opening

Clicking a card opens a reflection modal. The card becomes the visual center of a private, phone-like stage.

On desktop and tablet, the modal background may fill the viewport, but the core interaction area should keep a mobile reading width.

Recommended modal layout rule:

- Background fills the viewport.
- Core stage width uses a fluid phone range, approximately `clamp(360px, 100vw, 430px)`.
- Stage height uses dynamic viewport units and safe-area insets.
- Short screens compress the card image first; text and actions remain reachable.
- Desktop does not switch to a wide split layout.

### 2-1. Observation Questions

The app shows three short observation questions, then automatically advances after a short dwell.

Questions should feel like ways of looking at the card, not tasks. They can refer to visual attention, distance, body sensation, weather, or ambiguity, but should avoid diagnostic or leading language.

### 2-2. Fragment Selection And Writing

The user sees suggested paper fragments related to:

- User-facing fragment pools.
- Card image/profile cues.
- The current prompt/question.
- Scene-level emotional/need examples.

The user can click or drag fragments into the selected area.

The existing "skip" path should be replaced with a stop path:

- If the user has selected or written at least one fragment, `选好了` advances to echo.
- If the user has not selected or written anything and wants to stop, the app shows a light message such as:
  "可以先停在这里。这张卡会回到画布里，等你想再靠近的时候再回来。"
- The app then returns to the canvas and saves a weak card-stay record, not an echo.

Custom writing remains part of 2-2. It should not become an extra page.

The current short paper input should become an expanded quiet writing area:

- No hard character limit.
- No character counter.
- Copy can say that it may be a sentence, a few words, or something unfinished.
- The selected area may show a compact preview such as "我写下了一段话" or the first few characters.
- Full custom text is saved and used in echo generation.

### 2-3. Echo Stream

The echo should be A+B:

- First, mirror the user's input.
- Then, offer a gentle adjacent expression.
- Finally, touch a possible underlying need or waiting place without making a conclusion.

The echo appears as three lines that surface one after another. These are not separate options for the user to choose from.

Recommended timing:

- Line 1 appears immediately.
- Line 2 appears after roughly 1.5-2 seconds.
- Line 3 appears after roughly 3-4 seconds.
- Tapping the echo area reveals all remaining lines immediately.

The echo should avoid:

- Advice.
- Diagnosis.
- Optimization.
- "You should..." language.
- Over-certainty.
- Positive reframing that erases difficulty.
- Any obvious "AI analysis" tone.

Example shape:

1. "你留下了「想躲一下」和「给自己三分钟」。"
2. "它们像是在说：先不要太快被看见。"
3. "也许此刻等着的，是一个不用马上解释的地方。"

After all lines are visible, the user can lightly save/receive the echo or return to the canvas. The default should not require choosing among multiple echo fragments.

## Mock Echo Engine

Demo stage should not call a real AI API.

Use a hybrid local mock:

- B as the main structure: profile-driven, fragment-driven, and user-input-driven generation.
- C as a quality guide: an example library organized by emotional/need scenes.

The goal is not to accurately classify the user's emotion. The goal is to place the user's chosen words into a resonant semantic field while preserving ambiguity.

### Echo Input Contract

The future API and current mock should share a similar context shape:

```json
{
  "card": {
    "id": "standard-1",
    "deckId": "standard",
    "sourceTitle": "optional source title",
    "visualTokens": ["hands", "open-space"],
    "emotionalVectors": ["waiting", "distance"],
    "energyLevel": 0.35
  },
  "questions": ["你先看到了什么？", "什么吸引了你的注意？"],
  "selectedFragments": [
    { "label": "想躲一下", "family": "boundary", "source": "suggested" }
  ],
  "customText": "optional user writing",
  "constraints": {
    "language": "zh-CN",
    "noAdvice": true,
    "noDiagnosis": true,
    "preserveAmbiguity": true,
    "output": "three_echo_lines"
  }
}
```

### Example Library

The example library should initially be organized by emotional/need scenes, not by individual cards.

Recommended first scenes:

- 想躲 / 退后
- 模糊 / 没答案
- 靠近 / 被看见
- 边界 / 保护
- 疲惫 / 停下
- 失控 / 散掉
- 等待 / 还没好
- 分离 / 放手
- 小光 / 希望
- 关系 / 拉扯

Each scene should contain two or three high-quality three-line echo examples. These examples can drive the demo and later become reference examples for a real API prompt.

Example item:

```json
{
  "id": "withdrawal-soft-001",
  "match": {
    "families": ["boundary", "feeling"],
    "vectors": ["withdrawal", "vulnerability", "waiting"],
    "energyRange": [0.15, 0.55]
  },
  "inputExample": {
    "selectedFragments": ["想躲一下", "给自己三分钟"],
    "customText": ""
  },
  "echoLines": [
    "你留下了「想躲一下」和「给自己三分钟」。",
    "它们像是在说：先不要太快被看见。",
    "也许此刻等着的，是一个不用马上解释的地方。"
  ],
  "toneNotes": ["不解释原因", "不催促行动", "允许停留"]
}
```

## Card Profile Strategy

There are currently three card sets:

- `standard`
- `round`
- `relationship`

Only `standard` currently has deeper semantic profiles. That is acceptable for the demo.

Recommended strategy:

- Continue improving `standard` deep profiles.
- Add only light deck-level or set-level profile cues for `round` and `relationship` for now.
- Do not force all cards into emotional categories.
- Do not expose card profile labels directly to users.

## History And Calendar

The calendar should continue showing only dates with records.

Record types to show:

- Card stay: user opened a card and stopped before echo.
- Completed reflection: selected fragments and/or custom writing, plus generated echo lines.

Record details can include:

- Card preview.
- Date.
- Selected fragments.
- Full custom writing.
- Three echo lines.
- Optional question text if it supports memory without clutter.

Card stays should be weakly presented. They can communicate "this card was visited" without implying an unfinished task.

## Settings And Uploaded Images

Settings can continue controlling which card sets and word groups appear on the canvas.

User-uploaded images should remain local in the demo. They can appear as user cards on the canvas, but should not be uploaded or synced without explicit future opt-in.

## Data And Backend Scope

Demo stage should remain local-first:

- No login.
- No cloud sync.
- No real AI API call.
- No remote image upload.
- Local history, settings, uploaded images, and mock echoes only.

Future cloud sync should be explicit opt-in and should include delete/export controls before launch.

The existing Express endpoint can remain reserved, but the front end should use a local mock echo engine for the demo until the product behavior is stable.

## Open Questions For Later

- How to improve `standard` profiles without making them deterministic emotion labels.
- Whether `round` and `relationship` need per-card profiles after the demo.
- How to design a real API prompt that uses examples without sounding formulaic.
- Whether calendar review should show the original three questions.
- How much custom writing preview to show in the calendar before opening detail.
- Whether to add export/delete local data controls before public testing.

## Implementation Direction

The first implementation pass should focus on:

1. Reworking the fragment stage stop path.
2. Replacing short custom fragment input with an expanded quiet writing area.
3. Creating the local hybrid echo mock engine.
4. Changing echo UI from selectable fragments to a three-line stream with tap-to-reveal.
5. Updating calendar grouping to distinguish card stay from completed reflection.
6. Applying the fluid phone-stage modal layout.

This should be done without adding real API calls, login, or cloud sync.
