import { echoExampleScenes } from "./echoExamples.js";

const MAYBE_OPENINGS = ["也许", "像是", "可能"];

function normalizeLabel(value) {
  return String(value ?? "")
    .trim()
    .replace(/^[\s"'“”‘’「」『』]+|[\s"'“”‘’「」『』]+$/g, "")
    .trim();
}

function fragmentValues(selectedFragments) {
  if (!selectedFragments) return [];
  if (typeof selectedFragments.values === "function") return [...selectedFragments.values()];
  if (Array.isArray(selectedFragments)) return selectedFragments;
  if (typeof selectedFragments === "object") return Object.values(selectedFragments);
  return [];
}

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function seededIndex(seed, length) {
  if (!length) return 0;
  const numericSeed = Number.isFinite(Number(seed)) ? Number(seed) : 0;
  return Math.abs(Math.trunc(numericSeed)) % length;
}

function chooseScene(context) {
  const labels = context.selectedLabels.join(" ");

  const scoredScenes = echoExampleScenes.map((scene) => {
    const familyScore = context.selectedFragments.filter((fragment) => scene.families.includes(fragment.family)).length;
    const vectorScore = context.emotionalVectors.filter((vector) => scene.vectors.includes(vector)).length;
    const keywordScore = scene.keywords.filter((keyword) => labels.includes(keyword)).length;
    const [minEnergy, maxEnergy] = scene.energyRange;
    const energyScore = context.energyLevel >= minEnergy && context.energyLevel <= maxEnergy ? 1 : 0;

    return {
      scene,
      score: familyScore + vectorScore + keywordScore + energyScore,
    };
  });

  scoredScenes.sort((a, b) => b.score - a.score);
  return scoredScenes[0]?.score > 0 ? scoredScenes[0].scene : echoExampleScenes[seededIndex(context.seed, echoExampleScenes.length)];
}

function formatLabels(labels) {
  const quoted = labels.map((label) => `「${label}」`);
  if (quoted.length === 0) return "这一点感受";
  if (quoted.length === 1) return quoted[0];
  return `${quoted.slice(0, -1).join("、")}和${quoted.at(-1)}`;
}

function lineOne(context) {
  const labels = context.selectedLabels;
  if (labels.length === 0) {
    return "你暂时没有多放什么词，只把这张图留在这里。";
  }

  const verb = context.customText ? "写下了" : "留下了";
  return `你${verb}${formatLabels(labels)}。`;
}

function lineTwo(context, scene) {
  const visualHint = context.visualTokens.composition?.[0] || context.visualTokens.visualFeatures?.[0] || "";
  const sourceHint = context.card.sourceTitle || context.card.title || "";

  if (context.selectedFragments.some((fragment) => fragment.source === "custom")) {
    return "这句话像是先替你留住一点边界，不急着被谁完全读懂。";
  }

  if (scene.id === "tired-rest") return "它们像是身体先把声音放轻，把速度慢慢放低。";
  if (scene.id === "seen-soft") return "它们像是一种很小声的靠近，还不用说得很完整。";
  if (scene.id === "boundary-protect") return "它们像是在给自己留出一个可以呼吸的位置。";
  if (scene.id === "unclear-fog") return "它们像一片还没有散开的雾，暂时不用变成清楚的路。";
  if (visualHint || sourceHint) return "它们像是从画面边缘传来的一点轻声停顿。";

  return "它们像是在说：先让这份感觉有一个安静的位置。";
}

function lineThree(context, scene) {
  const opening = MAYBE_OPENINGS[seededIndex(context.seed + context.selectedLabels.join("").length, MAYBE_OPENINGS.length)];

  if (scene.id === "tired-rest") return `${opening}此刻等着的，不是振作，而是被允许停下。`;
  if (scene.id === "seen-soft") return `${opening}这里等着的，是一点不用证明自己的陪伴。`;
  if (scene.id === "boundary-protect") return `${opening}此刻等着的，是先确认哪里对你来说足够安全。`;
  if (scene.id === "unclear-fog") return `${opening}这份不确定也可以先待一会儿，不必马上有答案。`;

  return `${opening}此刻等着的，是一个不用马上解释的地方。`;
}

export function createEchoContext(session = {}) {
  const selectedFragments = fragmentValues(session.selectedFragments)
    .map((fragment) => {
      const label = normalizeLabel(fragment?.label ?? fragment?.draft ?? fragment?.text);
      return {
        label,
        family: String(fragment?.family ?? "related"),
        source: fragment?.custom ? "custom" : "suggested",
      };
    })
    .filter((fragment) => fragment.label);

  const customText = selectedFragments
    .filter((fragment) => fragment.source === "custom")
    .map((fragment) => fragment.label)
    .join("\n")
    .trim();

  const profile = session.card?.semanticProfile ?? {};
  const visualLayer = profile.visualLayer ?? {};
  const emotionalLayer = profile.emotionalLayer ?? {};

  return {
    card: {
      id: session.card?.id ?? profile.id ?? "",
      deck: session.card?.setId ?? session.card?.deck ?? "",
      title: session.card?.title ?? "",
      sourceTitle: session.card?.sourceTitle ?? profile.sourceTitle ?? "",
    },
    visualTokens: {
      visualFeatures: uniqueItems(visualLayer.visualFeatures ?? []),
      composition: uniqueItems(visualLayer.composition ?? []),
      motion: uniqueItems(visualLayer.motion ?? []),
      colorMood: uniqueItems(visualLayer.colorMood ?? []),
    },
    emotionalVectors: uniqueItems(emotionalLayer.emotionalVectors ?? []),
    energyLevel: Number.isFinite(Number(emotionalLayer.energyLevel)) ? Number(emotionalLayer.energyLevel) : 0.5,
    questions: Array.isArray(session.questions) ? session.questions.filter(Boolean) : [],
    selectedFragments,
    selectedLabels: selectedFragments.map((fragment) => fragment.label),
    customText,
    seed: session.ritualSeed ?? session.seed ?? 0,
  };
}

export function createEchoLines(session = {}) {
  const context = createEchoContext(session);
  const scene = chooseScene(context);

  return [lineOne(context), lineTwo(context, scene), lineThree(context, scene)];
}
