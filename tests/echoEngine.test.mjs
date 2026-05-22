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
assert.equal(context.card.deck, "standard");
assert.equal(context.card.title, "标准 43");
assert.deepEqual(context.visualTokens.visualFeatures, ["corner", "small-human-figure", "soft-boundaries"]);
assert.deepEqual(context.emotionalVectors, ["withdrawal", "vulnerability", "waiting"]);
assert.equal(context.energyLevel, 0.32);
assert.deepEqual(context.questions, ["你先看到了什么？", "有没有什么地方让你有点想离开？"]);
assert.equal(context.seed, 1107);

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

const normalizedLines = createEchoLines({
  ...baseSession,
  selectedFragments: new Map([["q", { label: "\"不用马上解释\"", family: "need", custom: false }]]),
});
assert.match(normalizedLines[0], /「不用马上解释」/);
assert.ok(!normalizedLines[0].includes("「\""));

console.log("echoEngine tests passed");
