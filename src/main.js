import * as THREE from "three";
import "@phosphor-icons/web/duotone";
import { createEchoLines } from "./echoEngine.js";
import "./styles.css";

const root = document.getElementById("sceneRoot");
const cardModal = document.getElementById("cardModal");
const focusCard = document.getElementById("focusCard");
const focusCtx = focusCard.getContext("2d");
const promptLayer = document.getElementById("promptLayer");
const responseDock = document.getElementById("responseDock");
const cardSetPanel = document.getElementById("cardSetPanel");
const calendarPanel = document.getElementById("calendarPanel");
const calendarReview = document.getElementById("calendarReview");
const calendarReviewDate = document.getElementById("calendarReviewDate");
const calendarReviewDeck = document.getElementById("calendarReviewDeck");
const calendarReviewDetail = document.getElementById("calendarReviewDetail");
const photoInput = document.getElementById("photoInput");
const prevCardButton = document.getElementById("prevCard");
const nextCardButton = document.getElementById("nextCard");
const introWhisper = document.getElementById("introWhisper");

const recordStoreKey = "presence.records.v1";
const visibilityStoreKey = "presence.contentVisibility.v1";
const userStoreKey = "presence.localUserId.v1";
const recentSemanticPromptStoreKey = "presence.recentSemanticPrompts.v1";
const introStoreKey = "presence.intro.v1";
const dbName = "presence.db.v1";
const dbVersion = 1;
const canvasGenerationConfig = {
  chunkSize: 76,
  clusterRadius: 42,
  minDistanceBetweenCards: 104,
  minDistanceBetweenBubbles: 60,
  minDistanceCardToBubble: 88,
};

const chunkSize = canvasGenerationConfig.chunkSize;
const renderDistance = 2.2;
const chunkFadeMargin = 1.35;
const depthFadeStart = 150;
const depthFadeEnd = 390;
const lookaheadChunkSteps = 3;
const maxVelocity = 2.9;
const velocityLerp = 0.16;
const velocityDecay = 0.9;
const initialCameraZ = 92;
const maxPromptsPerCard = 3;
const maxItemsPerChunk = 7;
const poissonPlacementAttempts = 36;
const cardCenterMinDistancePx = canvasGenerationConfig.minDistanceBetweenCards;
const wordCenterMinDistancePx = canvasGenerationConfig.minDistanceBetweenBubbles;
const idleCruiseDelayMs = 2000;
const idleCruiseScreenSeconds = 25;
const interactionBoostDecaySeconds = 1;
const interactionFloatBoostAmount = 0.18;
const cardFloatAmplitude = { x: 0.45, y: 0.85 };
const ambientFloatAmplitude = { x: 0.28, y: 0.54 };
const wordFloatAmplitude = { x: 0.34, y: 0.62 };
const floatSpeeds = {
  standard: 0.15,
  round: 0.22,
  relationship: 0.18,
  word: 0.3,
};
const hoverLift = {
  enterMs: 200,
  leaveMs: 300,
  scale: 1.04,
  yOffset: -4,
};

const angelPairs = `
Abundance|丰盛
Acceptance|接受
Adventure|冒险
Authenticity|真实
Awakening|觉醒
Balance|平衡
Beauty|美丽
Birth|新生
Celebration|庆祝
Clarity|清晰
Commitment|承诺
Communication|沟通
Compassion|慈悲
Contentment|知足
Courage|勇气
Creativity|创造力
Delight|喜悦
Depth|深度
Discernment|悟性
Education|教育
Enthusiasm|热忱
Expansiveness|扩展
Expectancy|期望
Exploration|探索
Faith|信念
Flexibility|灵活
Forgiveness|宽恕
Freedom|自由
Grace|恩典
Gratitude|感恩
Harmony|和谐
Healing|疗愈
Honesty|诚实
Humour|幽默
Inspiration|启发
Integrity|正直
Intention|意向
Joy|欢乐
Kindness|善良
Light|光
Love|爱
Obedience|服从
Openness|开放
Patience|耐心
Peace|和平
Play|游戏
Power|力量
Presence|存在
Purification|净化
Purpose|目标
Relaxation|放松
Release|释放
Resilience|弹性
Respect|尊重
Responsibility|责任
Risk|风险
Simplicity|单纯
Sisterhood/Brotherhood|情谊
Spontaneity|随兴
Strength|坚强
Support|支持
Surrender|臣服
Synthesis|融合
Tenderness|温柔
Transformation|蜕变
Trust|信任
Truth|真相
Understanding|领悟
Vision|愿景
Willingness|意愿
Wisdom|智慧
`;

const angelTranslationMap = new Map(
  [
    ...angelPairs
      .trim()
      .split("\n")
      .map((line) => {
        const [en, zh] = line.split("|");
        return [en.toLowerCase(), zh];
      }),
    ["boredom", "有点空"],
    ["alert-neutral", "轻轻警觉"],
    ["alert", "警觉"],
    ["neutral", "中性"],
  ].map(([en, zh]) => [en.toLowerCase(), zh]),
);

const relationshipWords = `
获得正能量
无言
可持续
想去支持/被支持
避免不了
难以解释
难受却一直维持着
没关系
留恋
无私
一辈子
有深度
想要进步
感恩
渴望
束缚
互相依靠
神奇
太用力
想要改变
有趣
脆弱
健康
无边界
有毒
浅薄
想简化
想建立
不靠谱
重要
先要变的更亲密
微妙
想修复
想用钱买
无价
愿以日夜相互陪伴
折腾
遥远
想变得成熟
不能替代
难维系
临时
矛盾
想放弃
闪闪发光
难掌控
又爱又恨
想重启
想变得坦然
危险
`;

const currentWords = [
  { text: "有点空", tags: ["低能量"] },
  { text: "雾蒙蒙", tags: ["模糊状态", "天气隐喻"] },
  { text: "还没想好", tags: ["模糊状态"] },
  { text: "慢一点", tags: ["允许停留"] },
  { text: "靠近", tags: ["靠近/被看见"] },
  { text: "不解释", tags: ["允许停留"] },
  { text: "轻轻地", tags: ["允许停留"] },
  { text: "今天像雨", tags: ["天气隐喻"] },
  { text: "被看见", tags: ["靠近/被看见"] },
  { text: "困住", tags: ["低能量"] },
  { text: "松一口气", tags: ["允许停留"] },
  { text: "隐隐发亮", tags: ["靠近/被看见"] },
  { text: "没关系", tags: ["允许停留"] },
  { text: "沉默也算", tags: ["允许停留"] },
  { text: "在路上", tags: ["模糊状态"] },
  { text: "酸涩", tags: ["低能量"] },
  { text: "漂浮", tags: ["模糊状态"] },
  { text: "想躲起来", tags: ["低能量"] },
  { text: "想被抱住", tags: ["靠近/被看见"] },
  { text: "一点点亮", tags: ["靠近/被看见"] },
  { text: "模糊", tags: ["模糊状态"] },
  { text: "不确定", tags: ["模糊状态"] },
  { text: "不积极", tags: ["低能量"] },
  { text: "没答案", tags: ["模糊状态"] },
  { text: "停留片刻", tags: ["允许停留"] },
  { text: "像傍晚", tags: ["天气隐喻"] },
  { text: "心里有风", tags: ["天气隐喻"] },
];

const wordGroups = [
  {
    id: "angel",
    name: "天使",
    enabled: true,
    words: angelPairs
      .trim()
      .split("\n")
      .map((line, index) => {
        const [en, zh] = line.split("|");
        return { id: `angel-zh-${index}`, text: zh, language: "zh", sourceText: en, tags: ["天使"] };
      }),
  },
  {
    id: "relationship",
    name: "关系",
    enabled: true,
    words: relationshipWords
      .trim()
      .split("\n")
      .map((text, index) => ({ id: `relationship-${index}`, text, language: "zh", tags: ["关系"] })),
  },
  {
    id: "present",
    name: "此刻",
    enabled: true,
    words: currentWords.map((word, index) => ({
      id: `present-${index}`,
      text: word.text,
      language: "zh",
      tags: word.tags,
    })),
  },
];

const promptBank = [
  { id: "g-where", text: "你第一眼停在哪里？", scope: "generic", tags: ["停留", "第一眼"] },
  { id: "g-weather", text: "如果它是一种天气，会是什么？", scope: "generic", tags: ["天气", "颜色"] },
  { id: "g-unsaid", text: "它像哪句没说出口的话？", scope: "generic", tags: ["没说出口", "关系"] },
  { id: "g-body", text: "身体里哪个地方和它有一点像？", scope: "generic", tags: ["身体", "感受"] },
  { id: "g-distance", text: "你想离它近一点，还是远一点？", scope: "generic", tags: ["距离", "靠近"] },
  { id: "standard-soft", text: "这张卡里，有什么还不需要马上清楚？", scope: "set", setId: "standard", tags: ["模糊", "不确定"] },
  { id: "standard-card-1", text: "你第一眼停住的地方，像什么感受？", scope: "card", cardId: "standard-1", tags: ["停住", "感受"] },
  { id: "round-small", text: "这个圆里，什么正在慢慢靠近？", scope: "set", setId: "round", tags: ["圆", "靠近"] },
  { id: "round-card-2", text: "如果只保留一点亮，它在哪里？", scope: "card", cardId: "round-2", tags: ["亮", "保留"] },
  { id: "relationship-quiet", text: "这段关系里，什么声音变小了？", scope: "set", setId: "relationship", tags: ["安静", "关系"] },
  { id: "relationship-card-3", text: "这张卡想让你靠近一点，还是退后一点？", scope: "card", cardId: "relationship-3", tags: ["靠近", "退后"] },
];

const introWhispers = [
  "最近有些话，或许可以轻轻放进图片里。",
  "不用急着说清，先靠近一张图。",
  "这里可以只是停一会儿。",
];

const observingQuestions = [
  "你先看到了什么？",
  "什么吸引了你的注意？",
  "有没有什么地方让你想靠近？",
  "有没有什么地方让你有点想离开？",
  "如果停留久一点，你又会注意到什么？",
];

const dwellingCopies = [
  "拾起引起你共鸣的词语",
  "海面慢慢漂来一些词语",
  "不用选对，只是把贴近的留下",
  "哪些纸片让你有感觉或是有了启发？",
];

const softTagPool = [
  { family: "feeling", label: "有点雾" },
  { family: "relation", label: "靠近一点" },
  { family: "related", label: "还没说完" },
  { family: "body", label: "轻轻警觉" },
  { family: "feeling", label: "心里有风" },
  { family: "boundary", label: "想躲一下" },
  { family: "relation", label: "被看见一点" },
  { family: "action", label: "暂时放着" },
  { family: "feeling", label: "像傍晚" },
  { family: "shift", label: "慢慢回来" },
  { family: "body", label: "有点酸" },
  { family: "related", label: "不必解释" },
];

const localEchoFragments = [
  "有些感受，不急着解释。",
  "你已经听见了自己的一部分。",
  "也许此刻，只需要被轻轻放下。",
  "不是所有答案都要马上出现。",
  "这份感觉，已经被好好接住了。",
  "有些沉默，也会被温柔地听见。",
  "海面没有催促，它只是托住了一点点。",
  "你留下的不是答案，是一小片此刻。",
  "那一点不确定，也可以先漂在这里。",
  "有些靠近，是很小声的。",
  "你没有急着离开，这已经算回应。",
  "世界轻轻收下了这句话。",
  "有一点光，没有被拿走。",
  "没有说清的部分，也被安静地放好了。",
  "这不是结论，只是一点回声。",
];

const supplementalObservationPerspectives = [
  {
    id: "semantic-nearest",
    text: "这里离你最近的是什么？",
    compatibleVectors: ["distance", "openness", "contact", "vulnerability", "waiting"],
    compatibleVisualFeatures: ["open-space", "hands", "center-focus", "small-human-figure", "close-up"],
    intensity: 0.35,
    tone: "gentle-attention",
    avoidRecentKey: "nearest",
    displayTags: ["距离", "靠近", "看见"],
  },
  {
    id: "semantic-edge",
    text: "好像有什么停在边缘",
    compatibleVectors: ["waiting", "uncertainty", "distance", "hesitation", "quiet-assessment"],
    compatibleVisualFeatures: ["figure-at-edge", "open-space", "soft-boundaries", "narrow-space", "corner"],
    intensity: 0.28,
    tone: "ambiguous",
    avoidRecentKey: "edge",
    displayTags: ["边缘", "等待", "留白"],
  },
  {
    id: "semantic-slower",
    text: "如果这里慢一点，会发生什么？",
    compatibleVectors: ["stillness", "wandering", "waiting", "repetition", "deliberation"],
    compatibleVisualFeatures: ["slow-rotation", "drifting", "stillness", "open-surface", "soft-boundaries"],
    intensity: 0.3,
    tone: "soft-imaginal",
    avoidRecentKey: "slower",
    displayTags: ["慢一点", "停留", "流动"],
  },
  {
    id: "semantic-first-look",
    text: "你会先看向哪里？",
    compatibleVectors: ["overview", "distance", "uncertainty", "openness", "direction"],
    compatibleVisualFeatures: ["center-focus", "light-from-above", "grid-pattern", "back-facing", "open-field"],
    intensity: 0.22,
    tone: "observational",
    avoidRecentKey: "first-look",
    displayTags: ["第一眼", "位置", "观察"],
  },
  {
    id: "semantic-light",
    text: "哪一点光还在留着？",
    compatibleVectors: ["warmth", "carrying-light", "direction", "openness", "stillness"],
    compatibleVisualFeatures: ["warm-light", "bright-flame", "light-from-above", "golden-yellow", "white-light"],
    intensity: 0.36,
    tone: "gentle-attention",
    avoidRecentKey: "light",
    displayTags: ["光线", "保留", "靠近"],
  },
  {
    id: "semantic-complete",
    text: "这里还有什么是完整的？",
    compatibleVectors: ["rupture", "aftermath", "uncertainty", "tension", "stillness"],
    compatibleVisualFeatures: ["broken-object", "scattered-fragments", "fragmented-objects", "fragmentation", "debris"],
    intensity: 0.48,
    tone: "quiet-precise",
    avoidRecentKey: "complete",
    displayTags: ["完整", "碎片", "停留"],
  },
];

const tagRules = [
  { family: "feeling", match: ["累", "疲", "困", "闷", "难过"], tags: ["很累", "有点闷"] },
  { family: "feeling", match: ["开心", "喜悦", "欢乐"], tags: ["轻微喜悦", "有一点亮"] },
  { family: "need", match: ["需要", "抱", "支持", "陪", "渴望"], tags: ["被支持", "被接住", "一点陪伴"] },
  { family: "boundary", match: ["边界", "有毒", "危险", "束缚", "控制"], tags: ["需要边界", "离远一点", "保护自己"] },
  { family: "relation", match: ["关系", "亲密", "爱", "恨", "依靠", "修复"], tags: ["互相依靠", "微妙距离", "想修复"] },
  { family: "body", match: ["身体", "心", "胸", "胃", "肩", "呼吸"], tags: ["身体在说话", "呼吸慢一点", "肩膀松开"] },
  { family: "action", match: ["做", "开始", "走", "放下", "释放"], tags: ["只做一小步", "先放在这里", "慢慢展开"] },
  { family: "related", match: ["雾", "模糊", "不清楚", "乱"], tags: ["还不清楚", "像雾一样", "不用马上整理"] },
  { family: "shift", match: ["光", "亮", "清晰"], tags: ["保留一点亮", "给它一个角落", "看见一点"] },
  { family: "related", match: ["一样", "像", "相似"], tags: ["原来不只我", "同一片天气", "有人也在这里"] },
  { family: "shift", match: ["想", "希望", "可以", "改变"], tags: ["换个角度", "先做一点", "明天再说"] },
];

const defaultTags = [
  { family: "related", label: "没有答案" },
  { family: "related", label: "慢慢靠近" },
  { family: "feeling", label: "柔软的停顿" },
  { family: "need", label: "给自己三分钟" },
  { family: "action", label: "只做一小步" },
  { family: "shift", label: "先放在这里" },
];

const oppositeTagRules = [
  { match: ["累", "疲", "困", "闷"], tags: ["一点轻盈", "慢慢醒来"] },
  { match: ["乱", "模糊", "不清楚"], tags: ["留一条线", "稍微清楚"] },
  { match: ["爱", "亲密", "靠近"], tags: ["保留距离", "照顾边界"] },
  { match: ["危险", "有毒", "控制"], tags: ["回到安全", "收回自己"] },
  { match: ["放弃", "躲"], tags: ["再看一眼", "小小出来"] },
];

const resonanceTagRules = [
  { match: ["需要", "支持", "抱", "陪"], tags: ["想被接住", "需要陪伴"] },
  { match: ["身体", "胸", "胃", "肩", "呼吸"], tags: ["身体有话", "放慢呼吸"] },
  { match: ["关系", "爱", "恨", "依靠"], tags: ["关系牵动", "想被看见"] },
  { match: ["光", "亮", "开始"], tags: ["一点希望", "微小开始"] },
  { match: ["雾", "雨", "风", "傍晚"], tags: ["天气一样", "情绪在流动"] },
];

const cardImageManifest = {
  standard: createNumberedCardImages("standard", 58, "png"),
  round: createNumberedCardImages("round", 68, "png"),
  relationship: createNumberedCardImages("relationship", 30, "png"),
};

const standardSemanticProfiles = await loadStandardSemanticProfiles();
const observationPerspectiveBank = createObservationPerspectiveBank(standardSemanticProfiles);
const searchablePromptBank = [...promptBank, ...observationPerspectiveBank];

const projectionSets = [
  makeCardSet("standard", "标准", "标准投射卡，58 张", ["#dbece6", "#c7d7ea", "#efd77e", "#dfa28f"], 1100),
  makeCardSet("round", "圆", "圆形意象卡，68 张", ["#f3df91", "#cfe5db", "#f2b9a1", "#fff4c2"], 2200),
  makeCardSet("relationship", "关系", "关系投射卡，30 张", ["#d7c4d7", "#b9c5d9", "#e6d8c7", "#a8b5aa"], 3300),
];

const localUserId = getOrCreateLocalUserId();
const presenceDb = await openPresenceDb();
await ensureLocalUser();
await seedQuestionSchema();
const photoSet = {
  id: "photos",
  name: "Photos",
  description: "上传/拍照的图片",
  enabled: true,
  cards: await loadPhotoCards(),
};

const contentGroups = [
  { id: "photos", name: "Photos", enabled: true, children: [photoSet] },
  { id: "projection", name: "投射", enabled: true, children: projectionSets },
  { id: "words", name: "Words", enabled: true, children: wordGroups },
];

const palette = {
  ink: "#16201b",
  paper: "#fffaf1",
};

const savedVisibility = readJson(visibilityStoreKey, null);
if (savedVisibility) {
  [...projectionSets, ...wordGroups, photoSet].forEach((item) => {
    item.enabled = savedVisibility[item.id] ?? item.enabled;
  });
}

const records = readJson(recordStoreKey, []);
const planeCache = new Map();
const textureCache = new Map();
const activeMeshes = new Map();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const reusableVector = new THREE.Vector3();
const calendarState = {
  month: new Date(),
  selectedDay: formatRecordDay(new Date().toISOString()),
  reviewGroups: [],
  reviewActiveKey: null,
  footerCopy: "",
};
const calendarFooterCopies = ["选择一天，回看曾经的停留", "选择一天，回顾收藏的记忆", "选择一天，打开那一瞬间的感受"];

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setClearColor(0xeef5f7, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xeef5f7, depthFadeStart, depthFadeEnd);

const camera = new THREE.PerspectiveCamera(58, 1, 1, 760);
camera.position.set(0, 0, initialCameraZ);

const planeGeometry = new THREE.PlaneGeometry(1, 1);
const state = {
  targetVel: new THREE.Vector3(0, 0, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  basePos: new THREE.Vector3(0, 0, initialCameraZ),
  drift: new THREE.Vector2(0, 0),
  mouse: new THREE.Vector2(0, 0),
  isDragging: false,
  pointers: new Map(),
  lastPointer: null,
  lastTouchDist: 0,
  scrollAccum: 0,
  activeCards: [],
  activeCardIndex: 0,
  activeBatchId: null,
  cardSessions: new Map(),
  touchStartX: 0,
  selectedCard: null,
  selectedTags: new Set(),
  lastChunkKey: "",
  hoveredMeshId: null,
  introTimer: null,
  activeDwellTimer: null,
  modalTimers: [],
  lastInteractionAt: performance.now(),
  lastFrameAt: performance.now(),
  interactionFloatBoost: 0,
};

const chunkOffsets = makeChunkOffsets();
resize();
renderContentPanel();
renderCalendar();
recordAppVisit();
updateChunks(true);
animate();
scheduleIntroWhisper();

function createNumberedCardImages(setId, count, extension) {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return `/assets/cards/${setId}/${setId}-${number}.${extension}`;
  });
}

async function loadStandardSemanticProfiles() {
  try {
    const response = await fetch("/assets/cards/standard/semantic-profiles.json");
    if (!response.ok) throw new Error(`Semantic profile fetch failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn("Standard semantic profiles are unavailable; falling back to fixed prompts.", error);
    return {};
  }
}

function createObservationPerspectiveBank(profiles) {
  const profileTemplates = Object.values(profiles).flatMap((profile) => {
    const visualTokens = getProfileVisualTokens(profile);
    const vectorTokens = getProfileVectorTokens(profile);
    const intensity = clamp(profile.emotionalLayer?.energyLevel ?? 0.35, 0.15, 0.85);
    return (profile.observationPerspectives ?? []).map((text, index) => ({
      id: `semantic-${profile.id}-${index + 1}`,
      text,
      compatibleVectors: vectorTokens,
      compatibleVisualFeatures: visualTokens,
      intensity,
      tone: inferPerspectiveTone(text, profile),
      avoidRecentKey: normalizePerspectiveKey(text),
      sourceProfileId: profile.id,
      displayTags: createDisplayTagsForPerspective(text, profile),
      tags: createDisplayTagsForPerspective(text, profile),
    }));
  });
  return [...supplementalObservationPerspectives, ...profileTemplates];
}

function getProfileVisualTokens(profile) {
  const layer = profile?.visualLayer ?? {};
  return uniqueStrings([
    ...(layer.visualFeatures ?? []),
    ...(layer.composition ?? []),
    ...(layer.motion ?? []),
    ...(layer.colorMood ?? []),
  ]);
}

function getProfileVectorTokens(profile) {
  const layer = profile?.emotionalLayer ?? {};
  return uniqueStrings([
    ...(layer.emotionalVectors ?? []),
    layer.emotionalTemperature,
    layer.socialFeeling,
  ]);
}

function uniqueStrings(items) {
  return [...new Set(items.filter(Boolean).map((item) => String(item)))];
}

function inferPerspectiveTone(text, profile) {
  const temperature = profile?.emotionalLayer?.emotionalTemperature ?? "";
  if (/光|亮|温|抱|手|火/.test(text) || temperature.includes("warm")) return "gentle-attention";
  if (/碎|断|接住|完整|发生/.test(text)) return "quiet-precise";
  if (/哪里|什么|先看/.test(text)) return "observational";
  return "ambiguous";
}

function normalizePerspectiveKey(text) {
  return text.replace(/[？?，,。！!：“”"、\s]/g, "").slice(0, 18);
}

function createDisplayTagsForPerspective(text, profile) {
  const tokens = [...getProfileVectorTokens(profile), ...getProfileVisualTokens(profile)];
  const translated = tokens.map(translateSemanticToken).filter(Boolean);
  const textTags = inferDisplayTagsFromText(text);
  return uniqueStrings([...textTags, ...translated]).slice(0, 4);
}

function inferDisplayTagsFromText(text) {
  const tags = [];
  if (/光|亮|火/.test(text)) tags.push("光线");
  if (/手|碰|托|接住|握/.test(text)) tags.push("手势");
  if (/门|锁|钥匙|入口/.test(text)) tags.push("入口");
  if (/边缘|角落|远|近|距离/.test(text)) tags.push("距离");
  if (/慢|等|停|还没/.test(text)) tags.push("停留");
  if (/碎|散|完整/.test(text)) tags.push("碎片");
  if (/水|海|浪|雨/.test(text)) tags.push("水面");
  if (/路|方向|走|离开/.test(text)) tags.push("方向");
  if (/看|镜|脸|面具/.test(text)) tags.push("被看见");
  return tags;
}

function translateSemanticToken(token) {
  const dictionary = {
    distance: "距离",
    waiting: "等待",
    uncertainty: "不确定",
    warmth: "温度",
    wandering: "游移",
    stillness: "静止",
    tension: "张力",
    openness: "打开",
    vulnerability: "柔软",
    longing: "靠近",
    direction: "方向",
    solitude: "独自",
    agency: "行动",
    overview: "俯看",
    detachment: "距离",
    deliberation: "斟酌",
    exchange: "交换",
    value: "价值",
    transfer: "传递",
    rupture: "断裂",
    aftermath: "余波",
    witnessing: "看见",
    loss: "空缺",
    repetition: "重复",
    immersion: "沉入",
    depth: "深处",
    contact: "接触",
    hands: "手势",
    "open-palms": "掌心",
    "warm-light": "暖光",
    "small-human-figure": "小小的人",
    "open-space": "开阔",
    "enclosed-space": "封闭",
    "fragmented-objects": "碎片",
    "scattered-fragments": "碎片",
    "broken-object": "破碎",
    "light-from-above": "上方的光",
    water: "水面",
    ocean: "海面",
    shoreline: "岸边",
    fog: "雾",
    door: "门",
    key: "钥匙",
    mirror: "镜面",
    mask: "面具",
    flame: "火光",
    torch: "火把",
    "center-focus": "中心",
    "figure-at-edge": "边缘人物",
    "back-facing": "背影",
    "close-up": "近处",
    "cool-neutral": "冷静",
    "warm-intense": "温热",
  };
  if (dictionary[token]) return dictionary[token];
  if (/light|flame|yellow|golden|bright/.test(token)) return "光线";
  if (/hand|palm|gesture|reaching/.test(token)) return "手势";
  if (/water|sea|ocean|shore|wave|rain/.test(token)) return "水面";
  if (/edge|corner|distance|outside/.test(token)) return "距离";
  if (/door|lock|key|entrance/.test(token)) return "入口";
  if (/broken|fragment|scattered|shatter|debris/.test(token)) return "碎片";
  if (/path|road|direction|forward|depart/.test(token)) return "方向";
  if (/still|quiet|slow|waiting/.test(token)) return "停留";
  if (/warm|red|orange|fire/.test(token)) return "温度";
  return "";
}

function makeCardSet(id, name, description, colors, seedBase) {
  const imagePaths = cardImageManifest[id] ?? [];
  return {
    id,
    name,
    description,
    colors,
    enabled: true,
    cards: imagePaths.map((src, index) => ({
      id: `${id}-${index + 1}`,
      setId: id,
      title: `${name} ${index + 1}`,
      semanticProfile: id === "standard" ? standardSemanticProfiles[`standard-${index + 1}`] ?? null : null,
      seed: seedBase + index * 137,
      kind: "projection",
      src,
      imageStatus: "idle",
      width: null,
      height: null,
      promptIds: index === 0 ? [`${id}-card-1`] : [],
    })),
  };
}

function getOrCreateLocalUserId() {
  const saved = localStorage.getItem(userStoreKey);
  if (saved) return saved;
  const id = `local-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  localStorage.setItem(userStoreKey, id);
  return id;
}

function openPresenceDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("users")) db.createObjectStore("users", { keyPath: "id" });
      if (!db.objectStoreNames.contains("cards")) {
        const store = db.createObjectStore("cards", { keyPath: "id" });
        store.createIndex("source", "source", { unique: false });
        store.createIndex("createdByUserId", "createdByUserId", { unique: false });
      }
      if (!db.objectStoreNames.contains("prompts")) db.createObjectStore("prompts", { keyPath: "id" });
      if (!db.objectStoreNames.contains("cardPrompts")) {
        const store = db.createObjectStore("cardPrompts", { keyPath: "id" });
        store.createIndex("cardId", "cardId", { unique: false });
        store.createIndex("promptId", "promptId", { unique: false });
      }
      if (!db.objectStoreNames.contains("events")) {
        const store = db.createObjectStore("events", { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("dateKey", "dateKey", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }
      if (!db.objectStoreNames.contains("dailyCounts")) {
        const store = db.createObjectStore("dailyCounts", { keyPath: "id" });
        store.createIndex("userDate", ["userId", "dateKey"], { unique: false });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function dbRequest(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function ensureLocalUser() {
  const readTx = presenceDb.transaction("users", "readonly");
  const existing = await dbRequest(readTx.objectStore("users").get(localUserId));
  await waitForTransaction(readTx);
  if (existing) return;
  const writeTx = presenceDb.transaction("users", "readwrite");
  writeTx.objectStore("users").put({ id: localUserId, createdAt: new Date().toISOString(), displayName: "Local user" });
  await waitForTransaction(writeTx);
}

async function seedQuestionSchema() {
  const tx = presenceDb.transaction(["cards", "prompts", "cardPrompts"], "readwrite");
  const cardStore = tx.objectStore("cards");
  const promptStore = tx.objectStore("prompts");
  const relationStore = tx.objectStore("cardPrompts");
  const now = new Date().toISOString();
  projectionSets.forEach((set) => {
    set.cards.forEach((card) => {
      cardStore.put({ ...card, source: "projection", createdAt: now });
    });
  });
  searchablePromptBank.forEach((prompt) => {
    promptStore.put({ id: prompt.id, text: prompt.text, tags: prompt.tags ?? [], scope: prompt.scope, createdAt: now });
  });
  promptBank.forEach((prompt) => {
    if (prompt.scope === "card") {
      relationStore.put({ id: `${prompt.cardId}|${prompt.id}`, cardId: prompt.cardId, promptId: prompt.id, weight: 3 });
    }
    if (prompt.scope === "set") {
      projectionSets
        .find((set) => set.id === prompt.setId)
        ?.cards.forEach((card) => {
          relationStore.put({ id: `${card.id}|${prompt.id}`, cardId: card.id, promptId: prompt.id, weight: 2 });
        });
    }
    if (prompt.scope === "generic") {
      projectionSets.forEach((set) => {
        set.cards.forEach((card) => {
          relationStore.put({ id: `${card.id}|${prompt.id}`, cardId: card.id, promptId: prompt.id, weight: 1 });
        });
      });
    }
  });
  await waitForTransaction(tx);
}

function waitForTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.addEventListener("complete", resolve);
    tx.addEventListener("abort", () => reject(tx.error));
    tx.addEventListener("error", () => reject(tx.error));
  });
}

async function loadPhotoCards() {
  const tx = presenceDb.transaction("cards", "readonly");
  const cards = await dbRequest(tx.objectStore("cards").getAll());
  await waitForTransaction(tx);
  const photoCards = cards.filter((card) => card.source === "photo");
  return Promise.all(photoCards.map(hydratePhotoCard));
}

async function hydratePhotoCard(card) {
  const imageUrl = URL.createObjectURL(card.imageBlob);
  const imageElement = await loadImage(imageUrl);
  return {
    ...card,
    kind: "photo",
    setId: "photos",
    width: card.width ?? imageElement.naturalWidth,
    height: card.height ?? imageElement.naturalHeight,
    seed: card.seed ?? hashString(card.id),
    imageUrl,
    imageElement,
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = src;
  });
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function record(type, payload) {
  const at = new Date().toISOString();
  const entry = {
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    payload,
    userId: localUserId,
    dateKey: formatRecordDay(at),
    at,
  };
  records.push(entry);
  writeJson(recordStoreKey, records);
  persistEvent(entry);
  renderCalendar();
}

function recordAppVisit() {
  const today = formatRecordDay(new Date().toISOString());
  const visitedToday = records.some((entry) => entry.type === "app_visit" && (entry.dateKey ?? formatRecordDay(entry.at)) === today);
  if (!visitedToday) record("app_visit", { action: "open" });
}

async function persistEvent(entry) {
  const event = {
    id: entry.id,
    userId: entry.userId,
    type: entry.type,
    cardId: entry.payload.cardId,
    promptId: entry.payload.promptId,
    questionId: entry.payload.questionId,
    mode: entry.payload.mode,
    action: entry.payload.action,
    photoBatchId: entry.payload.photoBatchId,
    label: entry.payload.label ?? entry.payload.tag,
    text: entry.payload.text,
    dateKey: entry.dateKey,
    createdAt: entry.at,
  };
  const tx = presenceDb.transaction(["events", "dailyCounts"], "readwrite");
  tx.objectStore("events").put(event);
  const target = event.cardId ?? event.label ?? entry.payload.wordId ?? entry.payload.text ?? "unknown";
  const targetType = event.cardId ? "card" : event.label ? "tag" : entry.payload.wordId ? "word" : "event";
  const countId = [event.userId, event.dateKey, targetType, target, event.type].join("|");
  const countStore = tx.objectStore("dailyCounts");
  const existing = await dbRequest(countStore.get(countId));
  countStore.put({
    id: countId,
    userId: event.userId,
    dateKey: event.dateKey,
    targetType,
    targetId: target,
    eventType: event.type,
    count: (existing?.count ?? 0) + 1,
  });
  await waitForTransaction(tx);
}

function makeChunkOffsets() {
  const offsets = [];
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dz = -4; dz <= 2; dz += 1) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
        offsets.push({ dx, dy, dz, dist });
      }
    }
  }
  return offsets;
}

function getEnabledProjectionSets() {
  return projectionSets.filter((set) => set.enabled);
}

function getEnabledCards() {
  const photoCards = photoSet.enabled ? photoSet.cards : [];
  return [...getEnabledProjectionSets().flatMap((set) => set.cards), ...photoCards];
}

function getEnabledWords() {
  return wordGroups.filter((group) => group.enabled).flatMap((group) => group.words.map((word) => ({ ...word, groupId: group.id })));
}

function translateEnglishDisplayText(value = "") {
  const text = String(value).trim();
  if (!/^[A-Za-z][A-Za-z /-]*$/.test(text)) return text;
  return angelTranslationMap.get(text.toLowerCase()) ?? "";
}

function updateChunks(force = false) {
  const cx = Math.floor(state.basePos.x / chunkSize);
  const cy = Math.floor(state.basePos.y / chunkSize);
  const cz = Math.floor(state.basePos.z / chunkSize);
  const sceneKey = getSceneKey();
  const lookaheadKey = getLookaheadKey();
  const key = `${cx},${cy},${cz},${lookaheadKey},${sceneKey}`;
  if (!force && key === state.lastChunkKey) return;
  state.lastChunkKey = key;

  const needed = new Set();
  mergeChunkOffsets(chunkOffsets, getLookaheadChunkOffsets()).forEach((offset) => {
    addChunkMeshes(cx + offset.dx, cy + offset.dy, cz + offset.dz, needed);
  });

  activeMeshes.forEach((mesh, id) => {
    if (!needed.has(id)) {
      removeMeshById(id);
    }
  });
}

function addChunkMeshes(cx, cy, cz, needed) {
  generateChunkPlanesCached(cx, cy, cz).forEach((item) => {
    needed.add(item.id);
    if (!activeMeshes.has(item.id)) {
      const mesh = createMesh(item);
      activeMeshes.set(item.id, mesh);
      scene.add(mesh);
    }
  });
}

function getSceneKey() {
  const enabledKey =
    [...getEnabledProjectionSets(), ...wordGroups.filter((group) => group.enabled), ...(photoSet.enabled ? [photoSet] : [])]
      .map((item) => item.id)
      .join("|") || "none";
  return enabledKey;
}

function mergeChunkOffsets(...groups) {
  const byKey = new Map();
  groups.flat().forEach((offset) => {
    const key = `${offset.dx}:${offset.dy}:${offset.dz}`;
    if (!byKey.has(key)) byKey.set(key, offset);
  });
  return [...byKey.values()];
}

function getLookaheadChunkOffsets() {
  const direction = getCameraTravelDirection();
  if (direction.lengthSq() < 0.01) return [];
  const offsets = [];
  const horizontal = new THREE.Vector2(direction.x, direction.y);
  const hasHorizontal = horizontal.lengthSq() > 0.01;
  const side = hasHorizontal ? new THREE.Vector2(-horizontal.y, horizontal.x).normalize() : new THREE.Vector2(0, 0);
  const baseStart = 4;

  for (let step = baseStart; step < baseStart + lookaheadChunkSteps; step += 1) {
    const base = {
      dx: Math.round(direction.x * step),
      dy: Math.round(direction.y * step),
      dz: Math.round(direction.z * step),
    };
    for (let spread = -1; spread <= 1; spread += 1) {
      offsets.push({
        dx: base.dx + Math.round(side.x * spread),
        dy: base.dy + Math.round(side.y * spread),
        dz: base.dz,
        dist: step,
      });
    }
  }
  return offsets;
}

function getCameraTravelDirection() {
  reusableVector.copy(state.velocity);
  if (reusableVector.lengthSq() < 0.0025) reusableVector.copy(state.targetVel);
  if (reusableVector.lengthSq() < 0.0025) {
    reusableVector.set(state.mouse.x * 0.12, state.mouse.y * 0.12, state.scrollAccum);
  }
  return reusableVector.lengthSq() > 0 ? reusableVector.normalize().clone() : new THREE.Vector3(0, 0, 0);
}

function getLookaheadKey() {
  const source = state.velocity.lengthSq() >= 0.0025 ? state.velocity : state.targetVel;
  const x = Math.abs(source.x) > 0.12 ? Math.sign(source.x) : 0;
  const y = Math.abs(source.y) > 0.12 ? Math.sign(source.y) : 0;
  const z = Math.abs(source.z) > 0.12 ? Math.sign(source.z) : 0;
  return `${x}:${y}:${z}`;
}

function removeMeshById(id) {
  const mesh = activeMeshes.get(id);
  if (!mesh) return;
  if (state.hoveredMeshId === id) setHoveredMeshId(null);
  scene.remove(mesh);
  mesh.material.dispose();
  activeMeshes.delete(id);
}

function generateChunkPlanesCached(cx, cy, cz) {
  const key = `${cx},${cy},${cz},${getSceneKey()}`;
  if (planeCache.has(key)) return planeCache.get(key);

  const cards = getEnabledCards();
  const enabledWords = getEnabledWords();
  const items = [];
  const seed = hashString(key);
  const clusters = makeChunkClusters(cx, cy, cz, seed);
  const clusterRadius = screenPixelsToWorldUnits(canvasGenerationConfig.clusterRadius);
  let itemIndex = 0;

  const desiredCards = cards.length ? 2 + (seededRandom(seed + 11) > 0.54 ? 1 : 0) + (isNearInitialView(cx, cy, cz) ? 1 : 0) : 0;
  const desiredWords = enabledWords.length ? 1 + (seededRandom(seed + 13) > 0.58 ? 1 : 0) : 0;
  const itemKinds = [
    ...Array.from({ length: desiredCards }, () => "card"),
    ...Array.from({ length: desiredWords }, () => "word"),
  ];

  itemKinds.forEach((kind, index) => {
    if (items.length >= maxItemsPerChunk) return;
    const itemSeed = seed + index * 997;
    const item = makePoissonClusterItem(
      {
        cards,
        enabledWords,
        clusters,
        clusterRadius,
        key,
        itemIndex,
        itemSeed,
        kind,
      },
      items,
    );
    if (item) {
      items.push(item);
      itemIndex += 1;
    }
  });

  if (!items.length) {
    const fallbackKind = cards.length ? "card" : enabledWords.length ? "word" : null;
    if (fallbackKind) {
      const item = makePoissonClusterItem(
        {
          cards,
          enabledWords,
          clusters,
          clusterRadius,
          key,
          itemIndex: 0,
          itemSeed: seed + 4049,
          kind: fallbackKind,
        },
        items,
      );
      if (item) items.push(item);
    }
  }

  planeCache.set(key, items);
  if (planeCache.size > 260) planeCache.delete(planeCache.keys().next().value);
  return items;
}

function makeChunkClusters(cx, cy, cz, seed) {
  const count = 1 + (seededRandom(seed + 31) > 0.34 ? 1 : 0) + (seededRandom(seed + 37) > 0.78 ? 1 : 0);
  return Array.from({ length: count }, (_, index) => makeChunkCluster(cx, cy, cz, seed + index * 2017, index));
}

function makeChunkCluster(cx, cy, cz, seed, index) {
  const r = (n) => seededRandom(seed + n);
  const center = new THREE.Vector3(
    cx * chunkSize + (r(1) - 0.5) * chunkSize * 0.68,
    cy * chunkSize + (r(2) - 0.5) * chunkSize * 0.68,
    cz * chunkSize + (r(3) - 0.5) * chunkSize * 0.42,
  );
  const semanticKeys = ["standard", "round", "relationship", "photos", "present", "angel"];
  return {
    id: `${cx}:${cy}:${cz}:cluster:${index}`,
    center,
    semanticKey: semanticKeys[Math.floor(r(4) * semanticKeys.length) % semanticKeys.length],
    flowRotation: (r(5) - 0.5) * 0.32,
    seed,
  };
}

function placeAroundCluster(cluster, radius, seed) {
  const r = (n) => seededRandom(seed + n);
  const angle = r(1) * Math.PI * 2;
  const distance = Math.sqrt(r(2)) * radius;
  const depth = (r(3) - 0.5) * chunkSize * 0.22;
  return new THREE.Vector3(
    cluster.center.x + Math.cos(angle) * distance,
    cluster.center.y + Math.sin(angle) * distance,
    cluster.center.z + depth,
  );
}

function makePoissonClusterItem(args, placedItems) {
  for (let attempt = 0; attempt < poissonPlacementAttempts; attempt += 1) {
    const itemSeed = args.itemSeed + attempt * 7919;
    const cluster = args.clusters[Math.floor(seededRandom(itemSeed + 5) * args.clusters.length) % args.clusters.length];
    const item = makeClusterItem({
      ...args,
      cluster,
      itemSeed,
      position: placeAroundCluster(cluster, args.clusterRadius, itemSeed),
      attempt,
    });
    if (item && isPoissonPlacementValid(item, placedItems)) return item;
  }
  return null;
}

function makeClusterItem({ cards, enabledWords, cluster, key, itemIndex, itemSeed, kind, position, attempt }) {
  const base = {
    id: `${key}-${cluster.id}-${kind}-${itemIndex}-${attempt}`,
    chunkKey: key,
    clusterId: cluster.id,
    semanticKey: cluster.semanticKey,
    flowRotation: cluster.flowRotation,
    floatPhase: seededRandom(itemSeed + 3) * Math.PI * 2,
    floatAmp: 0.45 + seededRandom(itemSeed + 4) * 1.4,
    position,
    seed: itemSeed,
    lit: false,
  };
  if (kind === "card") return makeCardClusterItem(base, cards, cluster.semanticKey, itemSeed);
  if (kind === "word") return makeWordClusterItem(base, enabledWords, cluster.semanticKey, itemSeed);
  return null;
}

function isPoissonPlacementValid(candidate, placedItems) {
  return placedItems.every((item) => {
    const distance = getPoissonPairDistance(candidate, item);
    if (!distance) return true;
    return centerDistance2d(candidate.position, item.position) >= distance;
  });
}

function getPoissonMinDistance(item) {
  if (item.kind === "card") return screenPixelsToWorldUnits(cardCenterMinDistancePx);
  if (item.kind === "word") return screenPixelsToWorldUnits(wordCenterMinDistancePx);
  return 0;
}

function getPoissonPairDistance(a, b) {
  if (a.kind === "card" && b.kind === "card") {
    const baseDistance = Math.max(getPoissonMinDistance(a), getPoissonMinDistance(b));
    const widthGuard = (a.scale.x + b.scale.x) * 0.56;
    const heightGuard = (a.scale.y + b.scale.y) * 0.62;
    return Math.max(baseDistance, widthGuard, heightGuard);
  }
  if (a.kind === "word" && b.kind === "word") {
    return Math.max(getPoissonMinDistance(a), getPoissonMinDistance(b));
  }
  if ((a.kind === "card" && b.kind === "word") || (a.kind === "word" && b.kind === "card")) {
    const card = a.kind === "card" ? a : b;
    const word = a.kind === "word" ? a : b;
    const baseDistance = screenPixelsToWorldUnits(canvasGenerationConfig.minDistanceCardToBubble);
    const widthGuard = card.scale.x * 0.42 + word.scale.x * 0.55;
    const heightGuard = card.scale.y * 0.44 + word.scale.y * 0.6;
    return Math.max(baseDistance, widthGuard, heightGuard);
  }
  return 0;
}

function screenPixelsToWorldUnits(pixels) {
  const viewportHeight = Math.max(window.innerHeight || 800, 1);
  const initialViewHeight = 2 * initialCameraZ * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  return (initialViewHeight / viewportHeight) * pixels;
}

function centerDistance2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makeCardClusterItem(base, cards, semanticKey, seed) {
  const matching = cards.filter((card) => getCardSemanticKey(card) === semanticKey);
  const pool = matching.length ? matching : cards;
  const card = pool[Math.floor(seededRandom(seed + 31) * pool.length) % pool.length];
  const set = [...projectionSets, photoSet].find((candidate) => candidate.id === card.setId) ?? photoSet;
  const cardHeight = 16 + seededRandom(seed + 37) * 16;
  const cardAspect = getCardAspect(card);
  return {
    ...base,
    id: `${base.id}-${card.id}`,
    kind: "card",
    card,
    set,
    semanticKey: getCardSemanticKey(card),
    floatSpeed: getCardFloatSpeed(card),
    scale: new THREE.Vector3(clamp(cardHeight * cardAspect, 10, 35), cardHeight, 1),
  };
}

function makeWordClusterItem(base, enabledWords, semanticKey, seed) {
  const matching = enabledWords.filter((word) => getWordSemanticKey(word) === semanticKey);
  const pool = matching.length ? matching : enabledWords;
  const word = pool[Math.floor(seededRandom(seed + 41) * pool.length) % pool.length];
  const displayText = getWordDisplayText(word);
  const wordScale = getWordPlaneScale(displayText);
  return {
    ...base,
    id: `${base.id}-${word.id}`,
    kind: "word",
    word,
    text: displayText,
    groupId: word.groupId,
    semanticKey: getWordSemanticKey(word),
    floatSpeed: floatSpeeds.word,
    scale: new THREE.Vector3(wordScale.width, wordScale.height, 1),
  };
}

function getWordDisplayText(word) {
  const text = word?.text ?? "";
  if (word?.language === "zh" || !/^[A-Za-z][A-Za-z /-]*$/.test(text)) return text;
  return translateEnglishDisplayText(text) || "轻轻停留";
}

function getCardSemanticKey(card) {
  return card?.setId ?? "card";
}

function getCardFloatSpeed(card) {
  if (card?.setId === "round") return floatSpeeds.round;
  if (card?.setId === "relationship") return floatSpeeds.relationship;
  return floatSpeeds.standard;
}

function getWordSemanticKey(word) {
  return word?.groupId ?? word?.tags?.[0] ?? "word";
}

function isNearInitialView(cx, cy, cz) {
  return Math.abs(cx) <= 1 && Math.abs(cy) <= 1 && cz >= 0 && cz <= 2;
}

function createMesh(item) {
  const texture =
    item.kind === "card"
      ? makeCardTexture(item.card)
      : makeWordTexture(item.text, false, item.seed);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(planeGeometry, material);
  mesh.position.copy(item.position);
  mesh.scale.copy(item.scale);
  mesh.rotation.z = item.flowRotation ?? 0;
  mesh.userData = item;
  mesh.visible = false;
  return mesh;
}

function makeCardTexture(card) {
  const key = `card-${card.id}`;
  if (textureCache.has(key)) return textureCache.get(key);
  ensureCardImage(card);
  if (card.kind === "projection" && card.imageElement) {
    const texture = new THREE.Texture(card.imageElement);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    texture.needsUpdate = true;
    textureCache.set(key, texture);
    return texture;
  }
  const canvas = document.createElement("canvas");
  const size = getCardCanvasSize(card);
  canvas.width = size.width;
  canvas.height = size.height;
  drawCardCanvas(canvas.getContext("2d"), canvas.width, canvas.height, card);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  textureCache.set(key, texture);
  return texture;
}

function makeWordTexture(text, lit, seed) {
  const key = `word-${text}-${lit}-${seed % 6}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  const size = getWordTextureSize(text);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  const colors = ["#dbece6", "#efd77e", "#c7d7ea", "#dfa28f", "#d7c4d7", "#e9e1c7"];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.shadowColor = lit ? "rgba(52, 125, 112, 0.34)" : "rgba(22, 32, 27, 0.14)";
  ctx.shadowBlur = lit ? 24 : 16;
  roundedRect(ctx, 28, 26, canvas.width - 56, canvas.height - 52, 32);
  ctx.fillStyle = lit ? "#f3d56e" : colors[Math.abs(seed) % colors.length];
  ctx.fill();
  ctx.strokeStyle = lit ? "rgba(52, 125, 112, 0.52)" : "rgba(22, 32, 27, 0.14)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.ink;
  const fontSize = size.lines.length > 1 ? 32 : 39;
  ctx.font = `${text.length > 18 ? "680" : "740"} ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = fontSize * 1.22;
  const startY = canvas.height / 2 - ((size.lines.length - 1) * lineHeight) / 2;
  size.lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + index * lineHeight, canvas.width - 92);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

function getWordTextureSize(text) {
  const chars = [...text];
  const lines = chars.length > 15 ? splitTextLines(chars, 2) : [text];
  const longest = Math.max(...lines.map((line) => [...line].length), 6);
  const width = clamp(260 + longest * 30, 430, 820);
  const height = lines.length > 1 ? 240 : 178;
  return { width, height, lines };
}

function splitTextLines(chars, maxLines) {
  const midpoint = Math.ceil(chars.length / maxLines);
  const lines = [];
  for (let i = 0; i < chars.length; i += midpoint) {
    lines.push(chars.slice(i, i + midpoint).join(""));
  }
  return lines.slice(0, maxLines);
}

function getWordPlaneScale(text) {
  const size = getWordTextureSize(text);
  const height = size.lines.length > 1 ? 8.6 : 6.6;
  return { width: height * (size.width / size.height), height };
}

function drawCardCanvas(ctx, width, height, card) {
  if (card.kind === "photo") {
    drawPhotoCardCanvas(ctx, width, height, card);
    return;
  }
  ensureCardImage(card);
  if (card.imageElement) {
    drawProjectionImageCardCanvas(ctx, width, height, card);
    return;
  }
  const set = projectionSets.find((candidate) => candidate.id === card.setId) ?? projectionSets[0];
  const colors = set.colors;
  const seed = card.seed;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.shadowColor = "rgba(22, 32, 27, 0.22)";
  ctx.shadowBlur = 34;
  roundedRect(ctx, 34, 28, width - 68, height - 56, 34);
  ctx.fillStyle = palette.paper;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(22, 32, 27, 0.14)";
  ctx.lineWidth = 3;
  ctx.stroke();
  const gradient = ctx.createLinearGradient(70, 60, width - 70, height - 80);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.42, colors[(Math.abs(seed) + 1) % colors.length]);
  gradient.addColorStop(1, colors[(Math.abs(seed) + 2) % colors.length]);
  roundedRect(ctx, 68, 68, width - 136, height - 136, 20);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.globalAlpha = set.id === "relationship" ? 0.42 : 0.48;
  ctx.fillStyle = "rgba(22, 32, 27, 0.82)";
  for (let i = 0; i < 6; i += 1) {
    const px = width / 2 + Math.sin(seed * (i + 1)) * width * 0.24;
    const py = height / 2 + Math.cos(seed + i * 1.7) * height * 0.24;
    ctx.beginPath();
    ctx.ellipse(px, py, width * (0.08 + i * 0.01), height * 0.035, i * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function getCardAspect(card) {
  const image = card.imageElement;
  const width = card.width ?? image?.naturalWidth ?? 512;
  const height = card.height ?? image?.naturalHeight ?? 680;
  return clamp(width / Math.max(1, height), 0.42, 2.4);
}

function getCardCanvasSize(card) {
  const aspect = getCardAspect(card);
  const longSide = 720;
  return aspect >= 1
    ? { width: longSide, height: Math.round(longSide / aspect) }
    : { width: Math.round(longSide * aspect), height: longSide };
}

function ensureCardImage(card) {
  if (card.kind !== "projection" || !card.src || card.imageElement || card.imageStatus === "loading" || card.imageStatus === "failed") {
    return;
  }
  card.imageStatus = "loading";
  const image = new Image();
  image.addEventListener("load", () => {
    card.imageElement = image;
    card.width = image.naturalWidth;
    card.height = image.naturalHeight;
    card.imageStatus = "loaded";
    textureCache.delete(`card-${card.id}`);
    refreshActiveCardVisual(card);
    rebuildScene();
  });
  image.addEventListener("error", () => {
    card.imageStatus = "failed";
  });
  image.src = card.src;
}

function refreshActiveCardVisual(card) {
  if (state.selectedCard?.id !== card.id) return;
  const size = getCardCanvasSize(card);
  focusCard.width = size.width;
  focusCard.height = size.height;
  focusCard.style.aspectRatio = `${size.width} / ${size.height}`;
  drawCardCanvas(focusCtx, focusCard.width, focusCard.height, card);
}

function drawProjectionImageCardCanvas(ctx, width, height, card) {
  ctx.clearRect(0, 0, width, height);
  if (card.setId === "round") {
    drawImageContain(ctx, card.imageElement, 0, 0, width, height, { fill: false });
    return;
  }
  ctx.save();
  ctx.shadowColor = "rgba(22, 32, 27, 0.24)";
  ctx.shadowBlur = 24;
  roundedRect(ctx, 10, 10, width - 20, height - 20, 28);
  ctx.fillStyle = palette.paper;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(22, 32, 27, 0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();
  const pad = Math.max(10, Math.min(width, height) * 0.028);
  roundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 22);
  ctx.clip();
  ctx.fillStyle = palette.paper;
  ctx.fillRect(pad, pad, width - pad * 2, height - pad * 2);
  drawImageContain(ctx, card.imageElement, pad, pad, width - pad * 2, height - pad * 2);
  ctx.restore();
}

function drawPhotoCardCanvas(ctx, width, height, card) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.shadowColor = "rgba(22, 32, 27, 0.24)";
  ctx.shadowBlur = 22;
  roundedRect(ctx, 10, 10, width - 20, height - 20, 28);
  ctx.fillStyle = palette.paper;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(22, 32, 27, 0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();
  const pad = Math.max(12, Math.min(width, height) * 0.035);
  roundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 22);
  ctx.clip();
  if (card.imageElement) {
    drawImageContain(ctx, card.imageElement, pad, pad, width - pad * 2, height - pad * 2);
  } else if (card.thumbDataUrl) {
    ctx.fillStyle = "#dbece6";
    ctx.fillRect(pad, pad, width - pad * 2, height - pad * 2);
  }
  ctx.restore();
}

function drawImageContain(ctx, image, x, y, width, height, options = {}) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  const dx = x + (width - dw) / 2;
  const dy = y + (height - dh) / 2;
  if (options.fill !== false) {
    ctx.fillStyle = palette.paper;
    ctx.fillRect(x, y, width, height);
  }
  ctx.drawImage(image, dx, dy, dw, dh);
}

function drawImageCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function cardThumbnail(card) {
  if (!card) return "";
  if (card.thumbDataUrl) return card.thumbDataUrl;
  if (card.kind === "projection" && card.src) return card.src;
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 128;
  drawCardCanvas(canvas.getContext("2d"), canvas.width, canvas.height, card);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

async function handlePhotoUpload(event) {
  const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  const uploadedCards = [];
  for (const file of files) {
    const card = await createPhotoCard(file);
    photoSet.cards.unshift(card);
    uploadedCards.push(card);
  }
  photoSet.enabled = true;
  saveVisibility();
  renderContentPanel();
  rebuildScene();
  event.target.value = "";
  openCardExperience(uploadedCards, 0, `batch-${Date.now()}`);
}

async function createPhotoCard(file) {
  const { imageBlob, thumbDataUrl, imageElement, width, height } = await compressImageFile(file);
  const id = `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = new Date().toISOString();
  const card = {
    id,
    source: "photo",
    kind: "photo",
    setId: "photos",
    title: file.name.replace(/\.[^.]+$/, "") || "Photo",
    imageBlob,
    thumbDataUrl,
    width,
    height,
    createdByUserId: localUserId,
    createdAt: now,
    seed: hashString(id),
  };
  const imageUrl = URL.createObjectURL(imageBlob);
  const hydrated = { ...card, imageUrl, imageElement };
  const tx = presenceDb.transaction(["cards", "cardPrompts"], "readwrite");
  tx.objectStore("cards").put(card);
  promptBank
    .filter((prompt) => prompt.scope === "generic")
    .forEach((prompt) => {
      tx.objectStore("cardPrompts").put({ id: `${id}|${prompt.id}`, cardId: id, promptId: prompt.id, weight: 1 });
    });
  await waitForTransaction(tx);
  record("photo_upload", { cardId: id, setId: "photos", thumbnail: thumbDataUrl });
  return hydrated;
}

async function compressImageFile(file) {
  const sourceUrl = URL.createObjectURL(file);
  const image = await loadImage(sourceUrl);
  URL.revokeObjectURL(sourceUrl);
  const imageCanvas = document.createElement("canvas");
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  imageCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  imageCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const imageCtx = imageCanvas.getContext("2d");
  imageCtx.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
  const imageBlob = await canvasToBlob(imageCanvas, "image/jpeg", 0.86);

  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = 192;
  thumbCanvas.height = 256;
  const thumbCtx = thumbCanvas.getContext("2d");
  drawImageCover(thumbCtx, image, 0, 0, thumbCanvas.width, thumbCanvas.height);
  const thumbDataUrl = thumbCanvas.toDataURL("image/jpeg", 0.76);
  const imageElement = await loadImage(URL.createObjectURL(imageBlob));
  return { imageBlob, thumbDataUrl, imageElement, width: imageCanvas.width, height: imageCanvas.height };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function animate() {
  requestAnimationFrame(animate);
  const nowMs = performance.now();
  const deltaSeconds = Math.min((nowMs - state.lastFrameAt) / 1000, 0.08);
  state.lastFrameAt = nowMs;
  state.targetVel.z += state.scrollAccum;
  state.scrollAccum *= 0.78;
  state.targetVel.x = clamp(state.targetVel.x, -maxVelocity, maxVelocity);
  state.targetVel.y = clamp(state.targetVel.y, -maxVelocity, maxVelocity);
  state.targetVel.z = clamp(state.targetVel.z, -maxVelocity * 0.86, maxVelocity * 0.86);
  state.velocity.lerp(state.targetVel, velocityLerp);
  state.basePos.add(state.velocity);
  updateIdleCruise(nowMs, deltaSeconds);
  state.interactionFloatBoost = Math.max(0, state.interactionFloatBoost - deltaSeconds / interactionBoostDecaySeconds);
  state.targetVel.multiplyScalar(velocityDecay);
  const driftAmount = clamp(Math.abs(state.basePos.z) / 70, 0.5, 2.4) * 5.5;
  if (!state.isDragging && state.pointers.size === 0) {
    state.drift.x += (state.mouse.x * driftAmount - state.drift.x) * 0.12;
    state.drift.y += (state.mouse.y * driftAmount - state.drift.y) * 0.12;
  }
  camera.position.set(state.basePos.x + state.drift.x, state.basePos.y + state.drift.y, state.basePos.z);
  camera.lookAt(state.basePos.x + state.drift.x * 0.2, state.basePos.y + state.drift.y * 0.2, state.basePos.z - 126);
  updateChunks();
  updateMeshVisibility(deltaSeconds);
  renderer.render(scene, camera);
}

function updateMeshVisibility(deltaSeconds = 1 / 60) {
  const cx = Math.floor(state.basePos.x / chunkSize);
  const cy = Math.floor(state.basePos.y / chunkSize);
  const cz = Math.floor(state.basePos.z / chunkSize);
  const nowMs = performance.now();
  const now = nowMs * 0.001;
  activeMeshes.forEach((mesh) => {
    const item = mesh.userData;
    const floatSpeed = item.floatSpeed ?? getItemFloatSpeed(item);
    const phaseOffset = item.floatPhase ?? 0;
    const amplitude = getFloatAmplitude(item);
    const interactionMultiplier = item.kind === "card" ? 1 + state.interactionFloatBoost * interactionFloatBoostAmount : 1;
    const floatY = Math.sin(now * floatSpeed + phaseOffset) * amplitude.y * interactionMultiplier;
    const floatX = Math.cos(now * floatSpeed * 0.7 + phaseOffset) * amplitude.x * interactionMultiplier;
    const hover = updateCardHoverLift(item, nowMs);
    mesh.position.set(
      item.position.x + floatX,
      item.position.y + floatY + hover.yOffset,
      item.position.z,
    );
    mesh.rotation.z = (item.flowRotation ?? 0) + Math.sin((now * floatSpeed + phaseOffset) * 0.5) * 0.035;
    reusableVector.copy(mesh.position);
    const dist = Math.max(
      Math.abs(Math.floor(reusableVector.x / chunkSize) - cx),
      Math.abs(Math.floor(reusableVector.y / chunkSize) - cy),
      Math.abs(Math.floor(reusableVector.z / chunkSize) - cz),
    );
    const relativeDepth = state.basePos.z - reusableVector.z;
    const absDepth = Math.abs(relativeDepth);
    const gridFade = dist <= renderDistance ? 1 : Math.max(0, 1 - (dist - renderDistance) / chunkFadeMargin);
    const farDepthFade =
      absDepth <= depthFadeStart ? 1 : Math.max(0, 1 - (absDepth - depthFadeStart) / (depthFadeEnd - depthFadeStart));
    const nearDepthFade = clamp((relativeDepth - 10) / 34, 0, 1);
    const depthFade = nearDepthFade * farDepthFade;
    const depthRatio = clamp(relativeDepth / depthFadeEnd, 0, 1);
    reusableVector.copy(mesh.position).project(camera);
    const edgeDistance = Math.max(Math.abs(reusableVector.x), Math.abs(reusableVector.y));
    const edgeFade = edgeDistance < 0.74 ? 1 : clamp(1 - (edgeDistance - 0.74) / 0.5, 0, 1);
    const tooCloseWord = item.kind === "word" && relativeDepth < 24;
    const depthSoftness = depthFade * depthFade;
    const observable = relativeDepth > 0 && !tooCloseWord && gridFade > 0 && depthSoftness > 0 && edgeFade > 0;
    const distanceDimming = 1 - depthRatio * 0.2;
    const rawTarget = observable ? Math.min(gridFade, depthSoftness, edgeFade) * distanceDimming : 0;
    const target = rawTarget;
    const isHovered = state.hoveredMeshId === item.id;
    const hoverBoost = isHovered ? 0.16 : 0;
    const targetOpacity = Math.min(1, target + hoverBoost);
    const fadeSeconds = targetOpacity > mesh.material.opacity ? getFadeInSeconds(item) : getFadeOutSeconds(item);
    const fadeStep = 1 - Math.exp(-deltaSeconds / fadeSeconds);
    mesh.material.opacity += (targetOpacity - mesh.material.opacity) * fadeStep;
    mesh.material.color.setHex(0xffffff);
    const breatheAmp = item.kind === "card" ? 0.018 : 0.012;
    const zoomSoftness = 1 - depthRatio * 0.18;
    const hoverScale = hover.scale;
    const presenceScale = 0.94 + easeOutCubic(clamp(mesh.material.opacity, 0, 1)) * 0.06;
    const breathe = (1 + Math.sin((now * floatSpeed + phaseOffset) * 0.82) * breatheAmp) * zoomSoftness * hoverScale * presenceScale;
    mesh.scale.set(item.scale.x * breathe, item.scale.y * breathe, item.scale.z);
    mesh.renderOrder = Math.round((1 - depthRatio) * 1000) + (item.kind === "card" ? 20 : item.kind === "word" ? 10 : 0);
    mesh.material.depthWrite = false;
    mesh.visible = mesh.material.opacity > 0.004;
  });
}

function getFadeInSeconds(item) {
  return lerp(item.kind === "card" ? 0.72 : 0.6, 1.08, seededRandom(item.seed + 501));
}

function getFadeOutSeconds(item) {
  return lerp(item.kind === "card" ? 0.92 : 0.8, 1.38, seededRandom(item.seed + 907));
}

function updateIdleCruise(nowMs, deltaSeconds) {
  const isIdle = nowMs - state.lastInteractionAt > idleCruiseDelayMs && !state.isDragging && state.pointers.size === 0 && !cardModal.classList.contains("open");
  if (!isIdle || deltaSeconds <= 0) return;
  const visibleWidth = getVisibleWorldWidth();
  const speed = visibleWidth / idleCruiseScreenSeconds;
  const angle = nowMs * 0.000035;
  const directionX = Math.cos(angle) * 0.94;
  const directionY = Math.sin(angle * 0.73) * 0.34;
  state.basePos.x += directionX * speed * deltaSeconds;
  state.basePos.y += directionY * speed * deltaSeconds;
}

function getVisibleWorldWidth() {
  return getVisibleWorldHeight() * camera.aspect;
}

function getVisibleWorldHeight() {
  return 2 * initialCameraZ * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
}

function getFloatAmplitude(item) {
  if (item.kind === "card") return cardFloatAmplitude;
  if (item.kind === "word") return wordFloatAmplitude;
  return ambientFloatAmplitude;
}

function markCanvasInteraction() {
  state.lastInteractionAt = performance.now();
  state.interactionFloatBoost = 1;
}

function updateHover(clientX, clientY) {
  pointerNdc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects([...activeMeshes.values()].filter((mesh) => mesh.visible), false);
  const hit = hits.find((entry) => entry.object.material.opacity > 0.18);
  setHoveredMeshId(hit?.object.userData.id ?? null);
}

function setHoveredMeshId(nextId) {
  if (state.hoveredMeshId === nextId) return;
  const nowMs = performance.now();
  triggerCardHoverLift(activeMeshes.get(state.hoveredMeshId), false, nowMs);
  state.hoveredMeshId = nextId;
  triggerCardHoverLift(activeMeshes.get(nextId), true, nowMs);
}

function triggerCardHoverLift(mesh, isEntering, nowMs) {
  const item = mesh?.userData;
  if (!item || item.kind !== "card") return;
  const current = getCardHoverLift(item, nowMs);
  item.hoverLift = {
    startedAt: nowMs,
    duration: isEntering ? hoverLift.enterMs : hoverLift.leaveMs,
    fromScale: current.scale,
    toScale: isEntering ? hoverLift.scale : 1,
    fromYOffset: current.yOffset,
    toYOffset: isEntering ? hoverLift.yOffset : 0,
    easing: isEntering ? easeOutCubic : easeInOutCubic,
  };
}

function updateCardHoverLift(item, nowMs) {
  if (item.kind !== "card") return { scale: 1, yOffset: 0 };
  const current = getCardHoverLift(item, nowMs);
  item.hoverScale = current.scale;
  item.hoverYOffset = current.yOffset;
  if (current.done) item.hoverLift = null;
  return current;
}

function getCardHoverLift(item, nowMs) {
  const animation = item.hoverLift;
  if (!animation) {
    return {
      scale: item.hoverScale ?? 1,
      yOffset: item.hoverYOffset ?? 0,
      done: false,
    };
  }
  const progress = clamp((nowMs - animation.startedAt) / animation.duration, 0, 1);
  const eased = animation.easing(progress);
  return {
    scale: lerp(animation.fromScale, animation.toScale, eased),
    yOffset: lerp(animation.fromYOffset, animation.toYOffset, eased),
    done: progress >= 1,
  };
}

function getItemFloatSpeed(item) {
  if (item.kind === "word") return floatSpeeds.word;
  if (item.kind === "card") return getCardFloatSpeed(item.card);
  return floatSpeeds.standard;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function onPointerDown(event) {
  if (closeCalendarPanelFromOutsideTap(event)) return;
  markCanvasInteraction();
  hideIntroWhisper();
  renderer.domElement.setPointerCapture(event.pointerId);
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  state.lastPointer = { x: event.clientX, y: event.clientY, t: performance.now(), moved: 0 };
  state.isDragging = true;
  state.targetVel.multiplyScalar(0.35);
}

function onPointerMove(event) {
  markCanvasInteraction();
  const previous = state.pointers.get(event.pointerId);
  if (!previous) return;
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  state.mouse.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  if (state.pointers.size === 2) {
    const points = [...state.pointers.values()];
    const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    if (state.lastTouchDist > 0) state.scrollAccum += (state.lastTouchDist - dist) * 0.0065;
    state.lastTouchDist = dist;
    return;
  }
  const dx = event.clientX - previous.x;
  const dy = event.clientY - previous.y;
  state.targetVel.x -= dx * 0.022;
  state.targetVel.y += dy * 0.022;
  if (state.lastPointer) state.lastPointer.moved += Math.abs(dx) + Math.abs(dy);
}

function onPointerUp(event) {
  markCanvasInteraction();
  const last = state.lastPointer;
  state.pointers.delete(event.pointerId);
  state.lastTouchDist = 0;
  state.isDragging = state.pointers.size > 0;
  if (last && last.moved < 9 && performance.now() - last.t < 360) handleTap(event.clientX, event.clientY);
}

function handleTap(x, y) {
  if (calendarPanel.classList.contains("open")) return;
  pointerNdc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects([...activeMeshes.values()].filter((mesh) => mesh.visible), false);
  const visibleHits = hits.filter((entry) => entry.object.material.opacity > 0.24);
  const hit = visibleHits.find((entry) => entry.object.userData.kind === "card") ?? visibleHits[0];
  if (!hit) return;
  const item = hit.object.userData;
  if (item.kind === "word") {
    item.lit = true;
    hit.object.material.map = makeWordTexture(item.text, true, item.seed);
    hit.object.material.needsUpdate = true;
    record("keyword", { wordId: item.word?.id ?? item.id, text: item.text, groupId: item.groupId });
    return;
  }
  openCardExperience([item.card], 0, null);
}

function openCardExperience(cards, initialIndex = 0, batchId = null) {
  state.activeCards = cards;
  state.activeCardIndex = initialIndex;
  state.activeBatchId = batchId;
  state.cardSessions = new Map();
  cards.forEach((card) => {
    state.cardSessions.set(card.id, createCardSession(card));
  });
  syncActiveCard();
  cardModal.classList.add("open");
  cardModal.setAttribute("aria-hidden", "false");
}

function createCardSession(card) {
  const set = [...projectionSets, photoSet].find((candidate) => candidate.id === card.setId) ?? photoSet;
  const seed = (card.seed ?? hashString(card.id)) + Date.now();
  const questions = selectRitualQuestions(card, set, seed);
  return {
    card,
    set,
    prompts: selectPrompts(card, set, card.seed ?? hashString(card.id)),
    currentPromptIndex: 0,
    question: questions[0],
    questions,
    ritualStage: "observing",
    ritualSeed: seed,
    questionStartedAt: performance.now(),
    openedAt: performance.now(),
    selectedTags: new Set(),
    selectedFragments: new Map(),
    collectedEchoes: new Set(),
    savedFragmentIds: new Set(),
    savedEchoIds: new Set(),
    customFragmentCount: 0,
    answerText: "",
    fragments: [],
    echoMessages: [],
    echoLines: [],
    echoLinesVisible: 0,
    echoRevealedAll: false,
    animatedEchoLineIndexes: new Set(),
    echoStatus: "idle",
    echoConfirmed: false,
    inputExpanded: false,
    stopNoticeVisible: false,
    observationTimer: null,
    sendTimer: null,
    returnTimer: null,
    echoRevealTimers: new Map(),
    stopCloseTimer: null,
    completedReflectionSaved: false,
    cardStaySaved: false,
    hasOpened: false,
    openRecordSaved: false,
  };
}

function syncActiveCard() {
  const card = state.activeCards[state.activeCardIndex];
  if (!card) return;
  const session = getActiveSession();
  state.selectedCard = card;
  state.selectedTags = session.selectedTags;
  const size = getCardCanvasSize(card);
  focusCard.width = size.width;
  focusCard.height = size.height;
  focusCard.style.aspectRatio = `${size.width} / ${size.height}`;
  drawCardCanvas(focusCtx, focusCard.width, focusCard.height, card);
  renderModalByMode();
  scheduleObservationFlow(session);
  updateBatchNav();
  session.hasOpened = true;
  if (!session.openRecordSaved) {
    session.openRecordSaved = true;
    const prompt = getSessionPrompt(session);
    record("card_open", {
      cardId: card.id,
      setId: card.setId,
      title: card.title,
      mode: "presence",
      promptId: prompt?.id,
      questionId: prompt?.id,
      questionText: session.question,
      openedAt: new Date().toISOString(),
      photoBatchId: state.activeBatchId,
      thumbnail: cardThumbnail(card),
    });
  }
}

function scheduleObservationFlow(session) {
  if (session.ritualStage !== "observing") return;
  clearSessionTimer(session, "observationTimer");
  const timer = window.setTimeout(() => {
    if (session.observationTimer === timer) session.observationTimer = null;
    if (!cardModal.classList.contains("open") || getActiveSession() !== session) return;
    session.ritualStage = "fragments";
    session.fragments = createRitualFragments(session);
    renderModalByMode();
  }, 8000);
  session.observationTimer = timer;
  state.activeDwellTimer = timer;
  state.modalTimers.push(timer);
}

function closeModal() {
  const session = getActiveSession();
  clearModalTimers();
  if (session) {
    captureAnswerTextFromDom(session);
  }
  state.cardSessions.forEach((cardSession) => {
    if (!cardSession.hasOpened) return;
    flushSessionExitRecords(cardSession);
  });
  cardModal.classList.remove("open");
  cardModal.setAttribute("aria-hidden", "true");
  state.activeCards = [];
  state.activeCardIndex = 0;
  state.activeBatchId = null;
}

function captureAnswerTextFromDom(session) {
  const textarea = responseDock.querySelector("#answerInput");
  if (textarea) session.answerText = textarea.value;
}

function clearModalTimers() {
  window.clearTimeout(state.activeDwellTimer);
  state.modalTimers.forEach((timer) => window.clearTimeout(timer));
  state.modalTimers = [];
  state.cardSessions.forEach((cardSession) => {
    cardSession.observationTimer = null;
    cardSession.sendTimer = null;
    cardSession.returnTimer = null;
    cardSession.echoRevealTimers?.clear();
    cardSession.stopCloseTimer = null;
  });
}

function clearSessionTimer(session, key) {
  if (!session?.[key]) return;
  window.clearTimeout(session[key]);
  session[key] = null;
}

function clearEchoRevealTimers(session) {
  session.echoRevealTimers?.forEach((timer) => window.clearTimeout(timer));
  session.echoRevealTimers?.clear();
}

function getActiveSession() {
  const card = state.activeCards[state.activeCardIndex] ?? state.selectedCard;
  if (!card) return null;
  if (!state.cardSessions.has(card.id)) state.cardSessions.set(card.id, createCardSession(card));
  return state.cardSessions.get(card.id);
}

function getCurrentPrompt() {
  const session = getActiveSession();
  return getSessionPrompt(session);
}

function getSessionPrompt(session) {
  return session?.prompts?.[session.currentPromptIndex] ?? null;
}

function selectRitualQuestions(card, set, seed) {
  const first = pickOne(observingQuestions, seed + 13) || observingQuestions[0];
  const semantic = card.semanticProfile ? selectPrompts(card, set, seed + 41).map((prompt) => softenQuestionText(prompt.text)) : [];
  const generic = stableShuffle(observingQuestions, seed + 73).filter((text) => text !== first);
  const rest = uniqueStrings([...semantic, ...generic])
    .filter((text) => text && text !== first)
    .slice(0, 2);
  return [first, ...rest, ...generic].slice(0, 3);
}

function softenQuestionText(text = "") {
  return String(text)
    .replace(/如果它是一种天气，会是什么？/g, "它像哪一种天气？")
    .replace(/身体里哪个地方和它有一点像？/g, "身体里有没有一点点相似的地方？")
    .replace(/这里还有什么是完整的？/g, "这里还有什么安静地留着？")
    .replace(/会发生什么/g, "会看见什么")
    .replace(/？?$/, "？");
}

function selectPrompts(card, set, seed) {
  if (card.setId === "standard" && card.semanticProfile && observationPerspectiveBank.length) {
    const semanticPrompts = selectSemanticPrompts(card, seed);
    if (semanticPrompts.length) return semanticPrompts;
  }
  return selectFallbackPrompts(card, set, seed);
}

function selectFallbackPrompts(card, set, seed) {
  const cardPrompts = promptBank.filter((prompt) => prompt.scope === "card" && prompt.cardId === card.id);
  const setPrompts = promptBank.filter((prompt) => prompt.scope === "set" && prompt.setId === set.id);
  const genericPrompts = promptBank.filter((prompt) => prompt.scope === "generic");
  const ordered = [
    ...stableShuffle(cardPrompts, seed + 11),
    ...stableShuffle(setPrompts, seed + 23),
    ...stableShuffle(genericPrompts, seed + 37),
  ];
  return [...new Map(ordered.map((prompt) => [prompt.id, prompt])).values()].slice(0, maxPromptsPerCard);
}

function selectSemanticPrompts(card, seed) {
  const recentKeys = readRecentSemanticPromptKeys();
  const profile = card.semanticProfile;
  const visualTokens = getProfileVisualTokens(profile);
  const vectorTokens = getProfileVectorTokens(profile);
  const energy = profile.emotionalLayer?.energyLevel ?? 0.4;
  const ownCandidates = observationPerspectiveBank
    .filter((prompt) => prompt.sourceProfileId === card.id)
    .map((prompt) => ({
      prompt: { ...prompt, scope: "semantic", cardId: card.id },
      weight: scoreObservationPerspective(prompt, { visualTokens, vectorTokens, energy, recentKeys, isOwnProfile: true }),
    }))
    .filter((entry) => entry.weight > 0);

  const selected = weightedSampleUnique(ownCandidates, maxPromptsPerCard, seed + hashString(card.id));
  if (selected.length < maxPromptsPerCard) {
    const supportCandidates = observationPerspectiveBank
      .filter((prompt) => !prompt.sourceProfileId || isStrongSemanticMatch(prompt, { visualTokens, vectorTokens }))
      .filter((prompt) => prompt.sourceProfileId !== card.id)
      .map((prompt) => ({
        prompt: { ...prompt, scope: "semantic", cardId: card.id },
        weight: scoreObservationPerspective(prompt, { visualTokens, vectorTokens, energy, recentKeys, isOwnProfile: false }),
      }))
      .filter((entry) => entry.weight > 0);
    const support = weightedSampleUnique(supportCandidates, maxPromptsPerCard - selected.length, seed + hashString(card.id) + 4049);
    selected.push(...support.filter((prompt) => !selected.some((item) => item.id === prompt.id)));
  }
  if (selected.length < maxPromptsPerCard) {
    const set = projectionSets.find((candidate) => candidate.id === card.setId) ?? projectionSets[0];
    const fallback = selectFallbackPrompts(card, set, seed + 97).filter((prompt) => !selected.some((item) => item.id === prompt.id));
    selected.push(...fallback.slice(0, maxPromptsPerCard - selected.length));
  }
  rememberSemanticPromptKeys(selected.map((prompt) => prompt.avoidRecentKey ?? normalizePerspectiveKey(prompt.text)));
  return selected;
}

function scoreObservationPerspective(prompt, context) {
  const visualScore = overlapRatio(context.visualTokens, prompt.compatibleVisualFeatures ?? []);
  const vectorScore = overlapRatio(context.vectorTokens, prompt.compatibleVectors ?? []);
  const intensityScore = 1 - Math.min(1, Math.abs((prompt.intensity ?? 0.35) - context.energy));
  const toneScore = prompt.tone === "observational" || prompt.tone === "gentle-attention" ? 1 : 0.88;
  const recentPenalty = context.recentKeys.includes(prompt.avoidRecentKey ?? normalizePerspectiveKey(prompt.text)) ? 0.68 : 1;
  const ownProfileBoost = context.isOwnProfile ? 18 : 0;
  return (visualScore * 4.2 + vectorScore * 4.8 + intensityScore * 1.6 + toneScore + ownProfileBoost) * recentPenalty;
}

function isStrongSemanticMatch(prompt, context) {
  if (!prompt.sourceProfileId) return true;
  const visualScore = overlapRatio(context.visualTokens, prompt.compatibleVisualFeatures ?? []);
  const vectorScore = overlapRatio(context.vectorTokens, prompt.compatibleVectors ?? []);
  return visualScore >= 0.42 && vectorScore >= 0.42;
}

function overlapRatio(sourceTokens, compatibleTokens) {
  if (!compatibleTokens.length) return 0;
  const source = new Set(sourceTokens);
  const matches = compatibleTokens.filter((token) => source.has(token)).length;
  return matches / Math.sqrt(compatibleTokens.length);
}

function weightedSampleUnique(candidates, count, seed) {
  const pool = [...candidates];
  const selected = [];
  for (let index = 0; index < count && pool.length; index += 1) {
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) break;
    let cursor = seededRandom(seed + index * 7919) * totalWeight;
    const pickedIndex = pool.findIndex((entry) => {
      cursor -= entry.weight;
      return cursor <= 0;
    });
    const [picked] = pool.splice(pickedIndex >= 0 ? pickedIndex : pool.length - 1, 1);
    selected.push(picked.prompt);
  }
  return selected;
}

function readRecentSemanticPromptKeys() {
  return readJson(recentSemanticPromptStoreKey, []);
}

function rememberSemanticPromptKeys(keys) {
  const recent = [...keys, ...readRecentSemanticPromptKeys()].filter(Boolean);
  writeJson(recentSemanticPromptStoreKey, [...new Set(recent)].slice(0, 18));
}

function renderCurrentPrompt() {
  promptLayer.innerHTML = "";
  const session = getActiveSession();
  promptLayer.dataset.stage = session?.ritualStage ?? "idle";
  if (!session || session.ritualStage !== "observing") return;
  const stack = document.createElement("div");
  stack.className = "ritual-question-stack";
  session.questions.forEach((question, index) => {
    const bubble = document.createElement("span");
    bubble.className = "prompt-bubble ritual-question";
    bubble.style.setProperty("--question-delay", `${index * 1350}ms`);
    bubble.textContent = question;
    stack.appendChild(bubble);
  });
  promptLayer.appendChild(stack);
}

function renderModalByMode() {
  const session = getActiveSession();
  if (session) cardModal.dataset.stage = session.ritualStage;
  renderCurrentPrompt();
  renderRitualMode();
}

function renderRitualMode() {
  const session = getActiveSession();
  if (!session) return;
  responseDock.dataset.mode = "presence";
  responseDock.dataset.echo = session.echoStatus;
  responseDock.classList.toggle("settled", session.ritualStage !== "observing");

  if (session.ritualStage === "observing") {
    responseDock.innerHTML = `
      <div class="observation-current">
        <div class="tide-progress" aria-hidden="true"><span></span><i></i><i></i><i></i></div>
      </div>
    `;
    return;
  }

  if (session.ritualStage === "fragments" || session.ritualStage === "leaving") {
    renderFragmentStage(session);
    return;
  }

  renderEchoStage(session);
}

function renderFragmentStage(session) {
  if (!session.fragments.length) session.fragments = createRitualFragments(session);
  const selected = [...session.selectedFragments.values()];
  const hasSelectedFragments = selected.length > 0;
  const hasActiveWriting = session.fragments.some((fragment) => fragment.writing && !session.selectedFragments.has(fragment.id));
  const isLeaving = session.ritualStage === "leaving";
  responseDock.innerHTML = `
    <section class="ritual-fragment-stage${isLeaving ? " leaving" : ""}${hasActiveWriting ? " writing-open" : ""}" aria-label="共鸣碎片">
      <div class="fragment-guide" aria-live="polite">
        <span>海面上冲来了漂流瓶</span>
        <span>哪些只言片语让你很有感觉，点击即可放进你的漂流瓶</span>
      </div>
      ${
        session.stopNoticeVisible
          ? `<p class="fragment-stop-notice" role="status">可以先停在这里。这张卡会回到画布里，等你想再靠近的时候再回来。</p>`
          : ""
      }
      <div class="sea-fragment-field" id="seaFragmentField"></div>
      <div class="custom-writing-area" id="customWritingArea" aria-live="polite"></div>
      <div class="drift-bottle${selected.length ? " glowing" : ""}" id="driftBottle" aria-label="小漂流瓶区域">
        <span class="bottle-neck"></span>
        <span class="bottle-body"></span>
        <div class="bottle-contents" id="bottleContents"></div>
      </div>
      ${
        isLeaving
          ? ""
          : `<div class="modal-actions ritual-actions">
              <button class="primary-button" id="sendFragments" type="button"${hasSelectedFragments ? "" : " disabled"}>
                <span class="action-icon check-icon" aria-hidden="true"></span>
                <span>选好了</span>
              </button>
              <button class="secondary-button" id="regretFragments" type="button"${hasSelectedFragments ? "" : " disabled"}>
                <span class="action-icon delete-icon" aria-hidden="true"></span>
                <span>后悔了</span>
              </button>
              <button class="secondary-button stop-button" id="stopFragments" type="button">
                <span class="action-icon arrow-icon" aria-hidden="true"></span>
                <span>先停在这里</span>
              </button>
            </div>`
      }
    </section>
  `;

  const field = responseDock.querySelector("#seaFragmentField");
  session.fragments.filter((fragment) => !fragment.writing).forEach((fragment) => renderFragmentPiece(session, fragment, { isLeaving, field }));

  const customWritingArea = responseDock.querySelector("#customWritingArea");
  session.fragments
    .filter((fragment) => fragment.writing && !session.selectedFragments.has(fragment.id))
    .forEach((fragment) => renderCustomWritingPanel(session, fragment, customWritingArea));

  const bottleContents = responseDock.querySelector("#bottleContents");
  renderBottleContents(session, bottleContents, selected);

  responseDock.querySelector("#regretFragments")?.addEventListener("click", () => resetFragments(session));
  responseDock.querySelector("#stopFragments")?.addEventListener("click", () => stopFragments(session));
  responseDock.querySelector("#sendFragments")?.addEventListener("click", () => handleSendBottle(session));
}

function renderFragmentPiece(session, fragment, { isLeaving = false, field = responseDock.querySelector("#seaFragmentField") } = {}) {
  if (!field || fragment.writing || session.selectedFragments.has(fragment.id)) return null;
  const piece = document.createElement("button");
  piece.className = `paper-fragment${fragment.custom ? " custom-fragment" : ""}${fragment.customAdd ? " custom-add-fragment" : ""}${fragment.writing ? " writing custom-writing-panel" : ""}${isLeaving ? " leaving" : ""}`;
  piece.type = "button";
  piece.dataset.fragmentId = fragment.id;
  piece.dataset.family = fragment.family;
  piece.style.setProperty("--x", `${fragment.x}%`);
  piece.style.setProperty("--y", `${fragment.y}%`);
  piece.style.setProperty("--tilt", `${fragment.tilt}deg`);
  piece.style.setProperty("--float-delay", `${fragment.floatDelay}ms`);
  piece.style.setProperty("--fragment-delay", `${fragment.delay}ms`);
  piece.style.setProperty("--drift-x", `${fragment.driftX}px`);
  piece.style.setProperty("--drift-y", `${fragment.driftY}px`);

  piece.innerHTML = fragment.customAdd
    ? `<span class="custom-placeholder">自己写下</span><span class="paper-plus"></span>`
    : `<span>${escapeHtml(fragment.label)}</span>`;

  if (!isLeaving) {
    piece.addEventListener("click", () => {
      if (piece.dataset.dragged === "true") return;
      if (fragment.customAdd) {
        addCustomWritingFragment(session);
        return;
      }
      handleFragmentClick(session, fragment, piece);
    });
    makeFragmentDraggable(piece, fragment, field);
  }
  field.appendChild(piece);
  return piece;
}

function renderCustomWritingPanel(session, fragment, root = responseDock.querySelector("#customWritingArea")) {
  if (!root || session.selectedFragments.has(fragment.id)) return null;
  const panel = document.createElement("div");
  panel.className = "custom-writing-panel";
  panel.dataset.fragmentId = fragment.id;
  panel.dataset.family = fragment.family;
  panel.innerHTML = `
    <label class="custom-writing-label" for="${fragment.id}-draft">把此刻冒出来的话写在这里</label>
    <textarea id="${fragment.id}-draft" aria-label="自己写下" placeholder="可以是一句话，也可以只是一段还没整理好的东西"></textarea>
    <button class="custom-writing-save" type="button">放进来</button>
  `;
  const textarea = panel.querySelector("textarea");
  const saveButton = panel.querySelector(".custom-writing-save");
  textarea.value = fragment.draft ?? "";
  textarea.addEventListener("input", () => {
    fragment.draft = textarea.value;
  });
  saveButton.addEventListener("click", (event) => {
    event.stopPropagation();
    handleFragmentClick(session, fragment, panel);
  });
  root.appendChild(panel);
  window.setTimeout(() => textarea.focus(), 40);
  return panel;
}

function makeFragmentDraggable(piece, fragment, field) {
  if (!field || fragment.customAdd || fragment.writing) return;
  let startX = 0;
  let startY = 0;
  let moved = false;
  piece.addEventListener("pointerdown", (event) => {
    if (event.target.closest("input, textarea, button")) return;
    startX = event.clientX;
    startY = event.clientY;
    moved = false;
    piece.classList.add("dragging");
    piece.setPointerCapture?.(event.pointerId);
  });
  piece.addEventListener("pointermove", (event) => {
    if (!piece.classList.contains("dragging")) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.hypot(dx, dy) < 4 && !moved) return;
    moved = true;
    const rect = field.getBoundingClientRect();
    fragment.x = clamp(((event.clientX - rect.left) / rect.width) * 100, 12, 88);
    fragment.y = clamp(((event.clientY - rect.top) / rect.height) * 100, 12, 86);
    piece.style.setProperty("--x", `${fragment.x}%`);
    piece.style.setProperty("--y", `${fragment.y}%`);
  });
  piece.addEventListener("pointerup", (event) => {
    if (moved) {
      piece.dataset.dragged = "true";
      if (isPointInsideBottle(event.clientX, event.clientY)) {
        handleFragmentClick(getActiveSession(), fragment, piece);
      }
      window.setTimeout(() => {
        delete piece.dataset.dragged;
      }, 80);
    }
    piece.classList.remove("dragging");
    piece.releasePointerCapture?.(event.pointerId);
  });
  piece.addEventListener("pointercancel", () => {
    piece.classList.remove("dragging");
  });
}

function isPointInsideBottle(x, y) {
  const bottle = responseDock.querySelector("#driftBottle");
  if (!bottle) return false;
  const rect = bottle.getBoundingClientRect();
  const pad = 18;
  return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
}

function renderBottleContents(session, root = responseDock.querySelector("#bottleContents"), selected = [...session.selectedFragments.values()]) {
  if (!root) return;
  root.innerHTML = "";
  selected.forEach((fragment, index) => {
    const chip = document.createElement("span");
    chip.className = "bottle-piece";
    chip.dataset.family = fragment.family;
    chip.style.setProperty("--piece-delay", `${index * 38}ms`);
    chip.style.setProperty("--piece-index", index);
    const preview = fragmentPreviewLabel(fragment);
    chip.textContent = preview;
    chip.title = fragment.custom ? fragment.label : "";
    root.appendChild(chip);
  });
}

function syncFragmentActionState(session) {
  const hasSelectedFragments = Boolean(session?.selectedFragments?.size);
  const sendButton = responseDock.querySelector("#sendFragments");
  const regretButton = responseDock.querySelector("#regretFragments");
  if (sendButton) sendButton.disabled = !hasSelectedFragments;
  if (regretButton) regretButton.disabled = !hasSelectedFragments;
}

function fragmentPreviewLabel(fragment) {
  const label = fragment?.label ?? "";
  if (!fragment?.custom) return label;
  const compact = label.replace(/\s+/g, " ").trim();
  return compact.length > 12 ? `${compact.slice(0, 11)}…` : compact;
}

function renderEchoStage(session) {
  const isSending = session.ritualStage === "sending";
  if (!isSending) scheduleEchoLineReveal(session);
  responseDock.innerHTML = `
    <section class="echo-return-stage${isSending ? " sending" : ""}" aria-label="漂流瓶回声">
      ${
        isSending
          ? `<p class="sea-message">你的感受被大海接住，珍藏了起来</p>`
          : `<div class="sea-message echo-message-cycle" aria-live="polite">
              <span>海面上飘回了一点回声</span>
              <span>它会慢慢浮上来</span>
              <span>点一下也可以直接看完</span>
            </div>`
      }
      ${
        !isSending
          ? `<button class="echo-stream" id="echoStream" type="button" aria-label="展开全部回声">
              ${session.echoLines
                .map((line, index) => {
                  const visible = index < session.echoLinesVisible;
                  const revealing = visible && !session.animatedEchoLineIndexes.has(index);
                  return `<span class="echo-line${visible ? " visible" : ""}${revealing ? " revealing" : ""}">${escapeHtml(line)}</span>`;
                })
                .join("")}
             </button>
             <div class="echo-actions">
              <button class="primary-button echo-save-button${session.echoConfirmed ? " confirmed" : ""}" id="confirmEchoSave" type="button">
                ${session.echoConfirmed ? "已收下" : "收下这张回声"}
              </button>
             </div>
             <div class="quiet-input-area">
              ${
                session.inputExpanded
                  ? `<textarea id="answerInput" aria-label="留下点什么"></textarea>`
                  : `<button class="quiet-input-toggle" id="unfoldInput" type="button">
                      <span>如果你还想留下一些话…</span>
                      <i aria-hidden="true"></i>
                    </button>`
              }
             </div>`
          : ""
      }
    </section>
  `;
  if (!isSending) {
    for (let index = 0; index < session.echoLinesVisible; index += 1) {
      session.animatedEchoLineIndexes.add(index);
    }
  }

  const textarea = responseDock.querySelector("#answerInput");
  if (textarea) {
    textarea.value = session.answerText;
    textarea.addEventListener("input", () => {
      session.answerText = textarea.value;
    });
  }
  responseDock.querySelector("#unfoldInput")?.addEventListener("click", () => {
    expandQuietInput(session);
  });
  responseDock.querySelector("#echoStream")?.addEventListener("click", () => {
    revealAllEchoLines(session);
  });
  responseDock.querySelector("#confirmEchoSave")?.addEventListener("click", () => {
    captureAnswerTextFromDom(session);
    flushSessionExitRecords(session);
    session.echoConfirmed = true;
    renderRitualMode();
  });
}

function createRitualFragments(session) {
  const base = uniqueTags([
    ...semanticFragmentsForCard(session.card),
    ...getPromptDisplayTags(getCurrentPrompt()).map((label) => ({ family: inferFamily(label), label })),
    ...generatePromptTags(getCurrentPrompt(), session.card),
    ...softTagPool,
    ...defaultTags,
  ]);
  const count = 7 + Math.floor(seededRandom(session.ritualSeed + 501) * 3);
  const placed = [];
  return stableShuffle(base, session.ritualSeed + 619)
    .slice(0, count)
    .map((tag, index) => decorateFragment(tag, index, session.ritualSeed, placed))
    .concat(decorateFragment({ family: "related", label: "自己写下", customAdd: true }, count, session.ritualSeed, placed));
}

function semanticFragmentsForCard(card) {
  const profile = card.semanticProfile;
  const semanticLabels = profile ? [...getProfileVectorTokens(profile), ...getProfileVisualTokens(profile)].map(translateSemanticToken).filter(Boolean) : [];
  const titleLabels = generateAiLikeTags(card.title ?? "", { card }).map((tag) => tag.label);
  return uniqueStrings([...semanticLabels, ...titleLabels])
    .slice(0, 8)
    .map((label) => ({ family: inferFamily(label), label }));
}

function decorateFragment(tag, index, seed, placed = []) {
  const batchDelay = Math.floor(index / (seededRandom(seed + index * 17) > 0.55 ? 1 : 2)) * 80;
  const position = pickFragmentPosition(index, seed, placed);
  placed.push(position);
  return {
    id: tag.customAdd ? "custom-add-fragment" : tag.custom ? `custom-fragment-${index}-${hashString(tag.label)}` : `fragment-${index}-${hashString(tag.label)}`,
    label: tag.label,
    family: tag.family ?? inferFamily(tag.label),
    custom: Boolean(tag.custom),
    customAdd: Boolean(tag.customAdd),
    x: position.x,
    y: position.y,
    tilt: Math.round((seededRandom(seed + index * 173) - 0.5) * 16),
    driftX: Math.round((seededRandom(seed + index * 211) - 0.5) * 8),
    driftY: Math.round((seededRandom(seed + index * 257) - 0.5) * 6),
    floatDelay: 520 + Math.round(seededRandom(seed + index * 293) * 2600),
    delay: batchDelay,
  };
}

function pickFragmentPosition(index, seed, placed) {
  let best = null;
  let bestDistance = -1;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = {
      x: Math.round(18 + seededRandom(seed + index * 397 + attempt * 53) * 64),
      y: Math.round(12 + seededRandom(seed + index * 431 + attempt * 71) * 58),
    };
    if (candidate.x < 42 && candidate.y > 54) continue;
    const nearest = placed.length
      ? Math.min(...placed.map((item) => Math.hypot((candidate.x - item.x) * 1.2, candidate.y - item.y)))
      : 100;
    if (nearest > bestDistance) {
      best = candidate;
      bestDistance = nearest;
    }
    if (nearest >= 22) return candidate;
  }
  return best ?? { x: 50, y: 50 };
}

function addCustomWritingFragment(session) {
  const activeWriting = session.fragments.find((fragment) => fragment.writing && !session.selectedFragments.has(fragment.id));
  if (activeWriting) {
    responseDock.querySelector(`[data-fragment-id="${activeWriting.id}"] textarea`)?.focus();
    return;
  }
  const index = session.fragments.length + session.customFragmentCount;
  const customSlots = [
    { x: 76, y: 66 },
    { x: 86, y: 52 },
    { x: 70, y: 44 },
    { x: 84, y: 72 },
    { x: 62, y: 58 },
    { x: 74, y: 30 },
  ];
  const slot = customSlots[session.customFragmentCount % customSlots.length];
  const cycle = Math.floor(session.customFragmentCount / customSlots.length);
  const position = {
    x: clamp(slot.x + cycle * 4, 18, 82),
    y: clamp(slot.y - cycle * 4, 20, 78),
  };
  const fragment = {
    id: `custom-fragment-${Date.now()}-${session.customFragmentCount}`,
    label: "自己写下",
    family: "related",
    custom: true,
    writing: true,
    draft: "",
    x: position.x,
    y: position.y,
    tilt: Math.round((seededRandom(session.ritualSeed + index * 173) - 0.5) * 12),
    driftX: Math.round((seededRandom(session.ritualSeed + index * 211) - 0.5) * 8),
    driftY: Math.round((seededRandom(session.ritualSeed + index * 257) - 0.5) * 6),
    floatDelay: 520,
    delay: 0,
  };
  session.customFragmentCount += 1;
  const addIndex = session.fragments.findIndex((item) => item.customAdd);
  if (addIndex >= 0) {
    session.fragments.splice(addIndex, 0, fragment);
  } else {
    session.fragments.push(fragment);
  }
  renderRitualMode();
}

function handleFragmentClick(session, fragment, element = null) {
  if (session.ritualStage !== "fragments") return;
  cancelStopClose(session);
  if (fragment.writing && !fragment.draft?.trim()) {
    element?.querySelector("textarea")?.focus();
    return;
  }
  const label = fragment.custom ? fragment.draft.trim() : fragment.label;
  if (!label || session.selectedFragments.has(fragment.id)) return;
  const selected = { ...fragment, label, family: fragment.family ?? inferFamily(label) };
  session.selectedFragments.set(fragment.id, selected);
  session.selectedTags.add(label);
  element?.classList.add("picked");
  window.setTimeout(() => element?.remove(), 260);
  responseDock.querySelector("#driftBottle")?.classList.add("glowing");
  renderBottleContents(session);
  syncFragmentActionState(session);
}

function resetFragments(session) {
  cancelStopClose(session);
  session.selectedFragments.clear();
  session.selectedTags.clear();
  session.customFragmentCount = 0;
  session.fragments = createRitualFragments(session);
  record("question_action", {
    mode: "presence",
    action: "fragment_reset",
    cardId: session.card.id,
    setId: session.card.setId,
    photoBatchId: state.activeBatchId,
  });
  const field = responseDock.querySelector("#seaFragmentField");
  const bottle = responseDock.querySelector("#driftBottle");
  if (!field || !bottle) {
    renderRitualMode();
    return;
  }
  field.innerHTML = "";
  session.fragments.filter((fragment) => !fragment.writing).forEach((fragment) => renderFragmentPiece(session, fragment, { field }));
  const customWritingArea = responseDock.querySelector("#customWritingArea");
  if (customWritingArea) customWritingArea.innerHTML = "";
  renderBottleContents(session);
  syncFragmentActionState(session);
  bottle.classList.remove("glowing");
}

function clearStopCloseTimer(session) {
  if (!session?.stopCloseTimer) return;
  window.clearTimeout(session.stopCloseTimer);
  session.stopCloseTimer = null;
}

function cancelStopClose(session) {
  if (!session) return;
  clearStopCloseTimer(session);
  session.stopNoticeVisible = false;
  responseDock.querySelector(".fragment-stop-notice")?.remove();
}

function stopFragments(session) {
  if (session.ritualStage !== "fragments") return;
  clearStopCloseTimer(session);
  session.stopNoticeVisible = true;
  if (!session.cardStaySaved) {
    session.cardStaySaved = true;
    record("card_stay", {
      mode: "presence",
      action: "stop_without_echo",
      cardId: session.card.id,
      setId: session.card.setId,
      questionText: session.question,
      thumbnail: cardThumbnail(session.card),
      photoBatchId: state.activeBatchId,
    });
  }
  renderRitualMode();
  const stopTimer = window.setTimeout(() => {
    if (session.stopCloseTimer === stopTimer) session.stopCloseTimer = null;
    if (!cardModal.classList.contains("open") || getActiveSession() !== session) return;
    closeModal();
  }, 1800);
  session.stopCloseTimer = stopTimer;
  state.modalTimers.push(stopTimer);
}

function handleSendBottle(session) {
  if (session.ritualStage !== "fragments") return;
  if (!session.selectedFragments.size) {
    stopFragments(session);
    return;
  }
  cancelStopClose(session);
  clearSessionTimer(session, "observationTimer");
  clearSessionTimer(session, "sendTimer");
  clearSessionTimer(session, "returnTimer");
  clearEchoRevealTimers(session);
  session.echoStatus = "floating";
  session.ritualStage = "leaving";
  cardModal.dataset.stage = session.ritualStage;
  renderCurrentPrompt();

  const stage = responseDock.querySelector(".ritual-fragment-stage");
  if (stage) {
    stage.classList.add("leaving");
    stage.querySelector(".ritual-actions")?.classList.add("actions-leaving");
    stage.querySelectorAll(".paper-fragment").forEach((piece) => {
      if (!session.selectedFragments.has(piece.dataset.fragmentId)) piece.classList.add("leaving");
    });
    responseDock.querySelector("#driftBottle")?.classList.add("glowing", "sent-ready");
  } else {
    renderModalByMode();
  }
  const sendTimer = window.setTimeout(() => {
    if (session.sendTimer === sendTimer) session.sendTimer = null;
    if (!cardModal.classList.contains("open") || session.ritualStage !== "leaving") return;
    session.ritualStage = "sending";
    if (getActiveSession() === session) renderModalByMode();
  }, 460);
  const returnTimer = window.setTimeout(() => {
    if (session.returnTimer === returnTimer) session.returnTimer = null;
    if (!cardModal.classList.contains("open") || session.ritualStage !== "sending") return;
    session.ritualStage = "echoes";
    session.echoStatus = "ready";
    session.echoLines = createEchoLines(session);
    session.echoLinesVisible = 1;
    session.echoRevealedAll = false;
    session.animatedEchoLineIndexes.clear();
    scheduleEchoLineReveal(session);
    if (getActiveSession() === session) renderModalByMode();
  }, 3400);
  session.sendTimer = sendTimer;
  session.returnTimer = returnTimer;
  state.modalTimers.push(sendTimer, returnTimer);
}

function revealEchoLine(session, count) {
  if (session.ritualStage !== "echoes") return;
  session.echoLinesVisible = Math.min(session.echoLines.length, Math.max(session.echoLinesVisible, count));
  if (getActiveSession() === session) renderRitualMode();
}

function revealAllEchoLines(session) {
  if (session.ritualStage !== "echoes") return;
  session.echoRevealedAll = true;
  session.echoLinesVisible = session.echoLines.length;
  clearEchoRevealTimers(session);
  renderRitualMode();
}

function scheduleEchoLineReveal(session) {
  if (session.ritualStage !== "echoes" || session.echoRevealedAll || !session.echoLines.length) return;
  [1800, 3600].forEach((delay, index) => {
    const targetCount = index + 2;
    if (session.echoLinesVisible >= targetCount || session.echoRevealTimers.has(targetCount)) return;
    const timer = window.setTimeout(() => {
      session.echoRevealTimers.delete(targetCount);
      if (!cardModal.classList.contains("open") || session.echoRevealedAll) return;
      revealEchoLine(session, targetCount);
    }, delay);
    session.echoRevealTimers.set(targetCount, timer);
    state.modalTimers.push(timer);
  });
}

function createEchoMessages(session) {
  const labels = [...session.selectedFragments.values()].map((fragment) => fragment.label).join("|");
  const count = 5;
  const pool = stableShuffle(localEchoFragments, session.ritualSeed + hashString(labels || "sea"));
  const slots = [
    { x: 9, y: 4 },
    { x: 52, y: 4 },
    { x: 12, y: 34 },
    { x: 56, y: 34 },
    { x: 32, y: 64 },
  ];
  return pool.slice(0, count).map((text, index) => ({
    id: `echo-${index}-${hashString(text)}`,
    text,
    tilt: Math.round((seededRandom(session.ritualSeed + index * 307) - 0.5) * 10),
    x: clamp(slots[index].x + Math.round((seededRandom(session.ritualSeed + index * 331) - 0.5) * 4), 4, 70),
    y: clamp(slots[index].y + Math.round((seededRandom(session.ritualSeed + index * 353) - 0.5) * 2), 1, 78),
  }));
}

function collectEcho(session, echo, element = null) {
  if (session.collectedEchoes.has(echo.id)) return;
  session.collectedEchoes.add(echo.id);
  session.inputExpanded = false;
  element?.classList.add("collected");
}

function expandQuietInput(session) {
  const inputArea = responseDock.querySelector(".quiet-input-area");
  const unfold = responseDock.querySelector("#unfoldInput");
  if (!inputArea || !unfold || responseDock.querySelector("#answerInput")) return;
  session.inputExpanded = true;
  const textarea = document.createElement("textarea");
  textarea.id = "answerInput";
  textarea.setAttribute("aria-label", "留下点什么");
  textarea.value = session.answerText;
  textarea.addEventListener("input", () => {
    session.answerText = textarea.value;
  });
  unfold.replaceWith(textarea);
  window.setTimeout(() => textarea.focus(), 40);
}

function flushAnswerSave(session) {
  if (!session) return;
  const text = session.answerText.trim();
  if (!text || text === session.lastSavedAnswerText) return;
  session.lastSavedAnswerText = text;
  const prompt = getSessionPrompt(session);
  record("answer", {
    mode: "presence",
    action: "exit_save",
    cardId: session.card.id,
    setId: session.card.setId,
    promptId: prompt?.id,
    questionId: prompt?.id,
    questionText: session.question,
    text,
    thumbnail: cardThumbnail(session.card),
    photoBatchId: state.activeBatchId,
  });
}

function flushSessionExitRecords(session) {
  if (!session) return;
  [...session.selectedFragments.values()].forEach((fragment) => {
    if (session.savedFragmentIds.has(fragment.id)) return;
    session.savedFragmentIds.add(fragment.id);
    record("tag", sessionTagPayload(session, { label: fragment.label, family: fragment.family }, fragment.custom ? "custom_fragment_select" : "bottle_fragment_select"));
  });
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
      labels: [...session.selectedTags],
      echoLines: [...session.echoLines],
      thumbnail: cardThumbnail(session.card),
      visualKind: "echo_stream",
      photoBatchId: state.activeBatchId,
    });
  }
  flushAnswerSave(session);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sessionTagPayload(session, tag, action) {
  const prompt = getSessionPrompt(session);
  return {
    label: tag.label,
    family: tag.family,
    mode: "presence",
    action,
    cardId: session.card.id,
    setId: session.card.setId,
    promptId: prompt?.id,
    questionId: prompt?.id,
    questionText: session.question,
    thumbnail: cardThumbnail(session.card),
    photoBatchId: state.activeBatchId,
  };
}

function generatePromptTags(prompt, card) {
  const displayTags = getPromptDisplayTags(prompt);
  const baseText = [prompt?.text, card?.title, ...displayTags].filter(Boolean).join(" ");
  const generated = generateAiLikeTags(baseText, { card, prompt });
  const promptTags = displayTags.map((label) => ({ family: inferFamily(label), label }));
  return uniqueTags([...promptTags, ...generated, ...defaultTags]).slice(0, 9);
}

function getPromptDisplayTags(prompt) {
  return (prompt?.displayTags ?? prompt?.tags ?? []).filter((tag) => !/[a-z]/i.test(tag));
}

function generateAiLikeTags(input, context = {}) {
  const text = `${input || ""} ${context.prompt?.text ?? ""} ${context.card?.title ?? ""}`.trim();
  const related = collectRuleTags(text, tagRules, "related", ["与它有关", "靠近一点", "先看见"]).slice(0, 3);
  const opposite = collectRuleTags(text, oppositeTagRules, "opposite", ["反过来", "松开一点", "换个方向"]).slice(0, 3);
  const resonance = collectRuleTags(text, resonanceTagRules, "resonance", ["同一种需要", "相似感受", "被轻轻接住"]).slice(0, 3);
  return uniqueTags([...related, ...opposite, ...resonance]).slice(0, 9);
}

function collectRuleTags(text, rules, family, fallback) {
  const matches = [];
  rules.forEach((rule) => {
    if (rule.match.some((word) => text.includes(word))) {
      rule.tags.forEach((label) => matches.push({ family, label }));
    }
  });
  if (!matches.length) fallback.forEach((label) => matches.push({ family, label }));
  return matches;
}

function inferFamily(label) {
  if (["身体", "感受"].some((word) => label.includes(word))) return "body";
  if (["关系", "距离", "靠近"].some((word) => label.includes(word))) return "relation";
  if (["雾", "天气", "颜色"].some((word) => label.includes(word))) return "feeling";
  return "related";
}

function uniqueTags(tags) {
  return [...new Map(tags.map((tag) => [tag.label, tag])).values()];
}

function renderContentPanel() {
  const rootEl = document.getElementById("cardSetList");
  rootEl.innerHTML = "";
  contentGroups.forEach((group) => {
    const block = document.createElement("section");
    block.className = "group-block";
    block.innerHTML = `<p class="group-label">${group.name}</p>`;
    if (group.id === "photos") {
      const upload = document.createElement("button");
      upload.className = "photo-upload-button";
      upload.type = "button";
      upload.innerHTML = `<span class="ph-duotone ph-camera-plus" aria-hidden="true"></span><span>上传 / 拍照</span>`;
      upload.addEventListener("click", () => photoInput.click());
      block.appendChild(upload);
    }
    if (group.id === "photos" && !photoSet.cards.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "上传后会进入无限画布。";
      block.appendChild(empty);
    }
    group.children.forEach((child) => {
      const button = document.createElement("button");
      button.className = `set-toggle${child.enabled ? " active" : ""}`;
      button.type = "button";
      const description = child.description ?? `${child.words?.length ?? child.cards?.length ?? 0} items`;
      button.innerHTML = `<span>${child.name}<small>${description}</small></span><span class="set-switch"></span>`;
      button.addEventListener("click", () => {
        child.enabled = !child.enabled;
        saveVisibility();
        renderContentPanel();
        rebuildScene();
      });
      block.appendChild(button);
    });
    rootEl.appendChild(block);
  });
}

function updateBatchNav() {
  const show = state.activeCards.length > 1;
  prevCardButton.classList.toggle("visible", show);
  nextCardButton.classList.toggle("visible", show);
}

function moveActiveCard(delta) {
  if (state.activeCards.length <= 1) return;
  state.activeCardIndex = (state.activeCardIndex + delta + state.activeCards.length) % state.activeCards.length;
  syncActiveCard();
}

function saveVisibility() {
  writeJson(
    visibilityStoreKey,
    Object.fromEntries([...projectionSets, ...wordGroups, photoSet].map((item) => [item.id, item.enabled])),
  );
}

function renderCalendar() {
  const rootEl = document.getElementById("calendarList");
  const monthDate = calendarState.month;
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const groups = groupedRecords();
  const monthLabel = `${month + 1}月`;
  const footerCopy = calendarState.footerCopy || pickCalendarFooterCopy();
  const recordDays = Array.from({ length: days }, (_, index) => index + 1).filter((day) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return (groups[key] ?? []).length > 0;
  });
  let html = `
    <div class="calendar-headline">
      <button class="calendar-nav-button" id="prevMonth" type="button" aria-label="上个月">
        <span class="ph-duotone ph-caret-left" aria-hidden="true"></span>
      </button>
      <div class="calendar-month-title" aria-label="${year}-${monthLabel}">
        <span>${year}</span>
        <i aria-hidden="true">·</i>
        <strong>${monthLabel}</strong>
      </div>
      <button class="calendar-nav-button" id="nextMonth" type="button" aria-label="下个月">
        <span class="ph-duotone ph-caret-right" aria-hidden="true"></span>
      </button>
      <button class="calendar-close-button" id="closeCalendarInline" type="button" aria-label="关闭日历">
        <span class="ph-duotone ph-x" aria-hidden="true"></span>
      </button>
    </div>
    <div class="month-grid calendar-month-grid">
  `;
  if (!recordDays.length) {
    html += `<p class="month-empty empty-state">这个月还没有留下记录。</p>`;
  }
  recordDays.forEach((day) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entries = groups[key] ?? [];
    const density = clamp(entries.length || 1, 1, 7);
    const className = `day-button calendar-day has-record${calendarState.selectedDay === key ? " selected" : ""}`;
    html += `<button class="${className}" style="--density:${density}" data-day="${key}" type="button">${day}</button>`;
  });
  html += `</div><p class="calendar-footer-copy">${footerCopy}</p>`;
  rootEl.innerHTML = html;
  rootEl.querySelector("#prevMonth").addEventListener("click", () => {
    calendarState.month = new Date(year, month - 1, 1);
    renderCalendar();
  });
  rootEl.querySelector("#nextMonth").addEventListener("click", () => {
    calendarState.month = new Date(year, month + 1, 1);
    renderCalendar();
  });
  rootEl.querySelector("#closeCalendarInline")?.addEventListener("click", () => togglePanel(calendarPanel));
  rootEl.querySelectorAll(".day-button.has-record").forEach((button) => {
    button.addEventListener("click", () => {
      calendarState.selectedDay = button.dataset.day;
      const entries = groups[calendarState.selectedDay] ?? [];
      renderCalendar();
      openCalendarReview(calendarState.selectedDay, entries);
    });
  });
}

function pickCalendarFooterCopy() {
  return calendarFooterCopies[Math.floor(Math.random() * calendarFooterCopies.length) % calendarFooterCopies.length];
}

function groupedRecords() {
  return records.reduce((acc, entry) => {
    if (!isCalendarRecord(entry)) return acc;
    const day = entry.dateKey ?? formatRecordDay(entry.at);
    acc[day] ??= [];
    acc[day].push(entry);
    return acc;
  }, {});
}

function isCalendarRecord(entry) {
  if (entry.type === "card_open") return Boolean(entry.payload.cardId);
  if (entry.type === "tag") return ["bottle_fragment_select", "custom_fragment_select"].includes(entry.payload.action);
  if (entry.type === "echo") return entry.payload.action === "collect" && Boolean(entry.payload.text?.trim());
  if (entry.type === "answer") return entry.payload.action === "exit_save" && Boolean(entry.payload.text?.trim());
  return false;
}

function groupEntriesByCard(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const key = calendarCardKey(entry);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: calendarEntryTitle(entry),
        thumbnail: entry.payload.thumbnail ?? "",
        card: findCardById(entry.payload.cardId ?? entry.payload.id),
        entries: [],
      });
    }
    const group = groups.get(key);
    group.entries.push(entry);
    group.thumbnail ||= entry.payload.thumbnail ?? "";
    if (!group.card) group.card = findCardById(entry.payload.cardId ?? entry.payload.id);
    if (group.title === "文字" || group.title === "卡牌") group.title = calendarEntryTitle(entry);
  });
  return [...groups.values()].sort((a, b) => latestTime(b) - latestTime(a));
}

function findCardById(cardId) {
  if (!cardId) return null;
  return [...projectionSets.flatMap((set) => set.cards), ...photoSet.cards].find((card) => card.id === cardId) ?? null;
}

function calendarCardKey(entry) {
  if (entry.type === "keyword") return `keyword:${entry.payload.wordId ?? entry.payload.text ?? entry.id}`;
  const cardId = entry.payload.cardId ?? entry.payload.id;
  if (cardId) return `card:${cardId}`;
  return "text:misc";
}

function calendarEntryTitle(entry) {
  if (entry.type === "echo") return "回声";
  if (entry.type === "tag") return "漂流瓶";
  return entry.payload.title ?? entry.payload.cardTitle ?? entry.payload.cardId ?? entry.payload.id ?? "卡牌";
}

function latestTime(group) {
  return Math.max(...group.entries.map((entry) => new Date(entry.at).getTime()));
}

function openCalendarReview(day, entries) {
  const groups = groupEntriesByCard(entries);
  calendarState.reviewGroups = groups;
  calendarState.reviewActiveKey = null;
  calendarReviewDate.innerHTML = `<span>${formatReviewDate(day)}</span>`;
  calendarReview.classList.add("open");
  calendarReview.setAttribute("aria-hidden", "false");
  renderCalendarReview();
}

function closeCalendarReview() {
  calendarReview.classList.remove("open");
  calendarReview.setAttribute("aria-hidden", "true");
  calendarState.reviewGroups = [];
  calendarState.reviewActiveKey = null;
}

function renderCalendarReview() {
  const groups = calendarState.reviewGroups;
  calendarReviewDeck.innerHTML = "";
  if (!groups.length) {
    calendarReviewDetail.innerHTML = `<p class="empty-state">这一天还没有留下记录。</p>`;
    return;
  }
  groups.forEach((group, index) => {
    const button = document.createElement("button");
    button.className = `review-card${group.key === calendarState.reviewActiveKey ? " active" : ""}`;
    if (group.key.startsWith("keyword:")) button.classList.add("shell-review-card");
    if (group.card?.setId) button.classList.add(`${group.card.setId}-review-card`);
    button.type = "button";
    button.style.setProperty("--tilt", `${((index % 7) - 3) * 2.4}deg`);
    button.style.setProperty("--rise", `${Math.abs((index % 5) - 2) * 7}px`);
    const visual = createReviewCardVisual(group);
    button.append(visual);
    button.addEventListener("click", () => {
      calendarState.reviewActiveKey = group.key;
      renderCalendarReview();
      button.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    calendarReviewDeck.appendChild(button);
  });
  const activeGroup = groups.find((group) => group.key === calendarState.reviewActiveKey) ?? null;
  renderCalendarReviewDetail(activeGroup);
}

function createReviewCardVisual(group) {
  if (group.key.startsWith("keyword:")) {
    const shell = document.createElement("div");
    shell.className = "review-shell-card";
    shell.textContent = keywordGroupText(group);
    return shell;
  }
  if (group.card) {
    const image = document.createElement("img");
    const size = getCardCanvasSize(group.card);
    image.src = group.card.kind === "projection" && group.card.src ? group.card.src : cardPreviewDataUrl(group.card);
    image.alt = "";
    image.style.aspectRatio = `${size.width} / ${size.height}`;
    return image;
  }
  if (group.thumbnail) {
    const image = document.createElement("img");
    image.src = group.thumbnail;
    image.alt = "";
    return image;
  }
  const textCard = document.createElement("div");
  textCard.className = "review-text-card";
  textCard.textContent = keywordGroupText(group);
  return textCard;
}

function keywordGroupText(group) {
  return group.entries.find((entry) => entry.type === "keyword")?.payload.text ?? group.title ?? "点亮的文字";
}

function cardPreviewDataUrl(card) {
  if (card.kind === "projection" && card.src) return card.src;
  const canvas = document.createElement("canvas");
  const size = getCardCanvasSize(card);
  canvas.width = size.width;
  canvas.height = size.height;
  drawCardCanvas(canvas.getContext("2d"), canvas.width, canvas.height, card);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

function renderCalendarReviewDetail(group) {
  calendarReviewDetail.innerHTML = "";
  if (!group) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "点击一张记忆，再看见那一刻。";
    calendarReviewDetail.appendChild(empty);
    return;
  }
  calendarReviewDetail.appendChild(renderReviewRecordList(group.entries));
}

function renderReviewRecordList(entries) {
  const section = document.createElement("div");
  section.className = "review-record-group";
  getCalendarReviewTexts(entries).forEach((value) => {
    const item = document.createElement("span");
    item.textContent = value;
    section.appendChild(item);
  });
  if (!section.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "这一天还没有可回看的内容。";
    section.appendChild(empty);
  }
  return section;
}

function getCalendarReviewTexts(entries) {
  const questions = uniqueRecordValues(entries.map((entry) => entry.payload.questionText || promptTextForRecord(entry)).filter(Boolean));
  const labels = collectRecordLabels(entries);
  const echoes = uniqueRecordValues(entries.filter((entry) => entry.type === "echo" && entry.payload.text?.trim()).map((entry) => entry.payload.text.trim()));
  const answers = uniqueRecordValues(entries.filter((entry) => entry.type === "answer" && entry.payload.text?.trim()).map((entry) => entry.payload.text.trim()));
  return uniqueRecordValues([...questions, ...labels, ...echoes, ...answers]);
}

function promptTextForRecord(entry) {
  const promptId = entry.payload.questionId ?? entry.payload.promptId;
  return searchablePromptBank.find((prompt) => prompt.id === promptId)?.text ?? "";
}

function collectRecordLabels(entries) {
  const labels = [];
  entries.forEach((entry) => {
    if (entry.type === "tag" && ["bottle_fragment_select", "custom_fragment_select"].includes(entry.payload.action)) {
      labels.push(stripTagPrefix(entry.payload.label ?? entry.payload.tag ?? ""));
    }
  });
  return uniqueRecordValues(labels.filter(Boolean));
}

function formatReviewDate(day) {
  const date = new Date(`${day}T00:00:00`);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateNumber = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${dateNumber}`;
}

function uniqueRecordValues(values) {
  return [...new Set(values)];
}

function stripTagPrefix(value = "") {
  return value.replace(/^相似：/, "").replace(/^灵感：/, "");
}

function formatRecordDay(value) {
  if (!value) return "unknown";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function rebuildScene() {
  planeCache.clear();
  activeMeshes.forEach((mesh) => {
    scene.remove(mesh);
    mesh.material.dispose();
  });
  activeMeshes.clear();
  state.lastChunkKey = "";
  updateChunks(true);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, isTouchDevice() ? 1.25 : 1.5);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
}

function stableShuffle(items, seed) {
  return [...items].sort((a, b) => {
    const aKey = String(a.id ?? a.label ?? a.text ?? "");
    const bKey = String(b.id ?? b.label ?? b.text ?? "");
    return seededRandom(seed + hashString(aKey)) - seededRandom(seed + hashString(bKey));
  });
}

function pickOne(items, seed) {
  if (!items.length) return "";
  return items[Math.floor(seededRandom(seed) * items.length) % items.length];
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

function togglePanel(panel) {
  const shouldOpen = !panel.classList.contains("open");
  [cardSetPanel, calendarPanel].forEach((item) => {
    item.classList.remove("open");
    item.setAttribute("aria-hidden", "true");
  });
  if (shouldOpen) {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
  }
}

function closeCalendarPanelFromOutsideTap(event) {
  if (!calendarPanel.classList.contains("open")) return false;
  const target = event.target;
  if (calendarPanel.contains(target) || document.getElementById("calendarToggle")?.contains(target)) return false;
  calendarPanel.classList.remove("open");
  calendarPanel.setAttribute("aria-hidden", "true");
  state.pointers.clear();
  state.lastPointer = null;
  state.isDragging = false;
  return true;
}

function scheduleIntroWhisper(force = false) {
  if (!force && localStorage.getItem(introStoreKey) === "seen") return;
  window.clearTimeout(state.introTimer);
  state.introTimer = window.setTimeout(() => {
    showIntroWhisper(force);
  }, force ? 80 : 600);
}

function showIntroWhisper(force = false) {
  const seed = Date.now() + Math.floor(state.basePos.x * 10) + Math.floor(state.basePos.y * 10);
  const text = introWhispers[Math.floor(seededRandom(seed) * introWhispers.length) % introWhispers.length];
  introWhisper.textContent = text;
  introWhisper.classList.add("visible");
  if (!force) localStorage.setItem(introStoreKey, "seen");
  window.clearTimeout(state.introTimer);
  state.introTimer = window.setTimeout(() => hideIntroWhisper(), 3000);
}

function hideIntroWhisper() {
  introWhisper.classList.remove("visible");
  window.clearTimeout(state.introTimer);
}

renderer.domElement.addEventListener("pointerdown", onPointerDown);
renderer.domElement.addEventListener("pointermove", onPointerMove);
renderer.domElement.addEventListener("pointerup", onPointerUp);
renderer.domElement.addEventListener("pointercancel", onPointerUp);
renderer.domElement.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    markCanvasInteraction();
    hideIntroWhisper();
    state.scrollAccum += event.deltaY * 0.0048;
  },
  { passive: false },
);
renderer.domElement.addEventListener("mousemove", (event) => {
  markCanvasInteraction();
  state.mouse.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  updateHover(event.clientX, event.clientY);
});
renderer.domElement.addEventListener("mouseleave", () => setHoveredMeshId(null));

document.getElementById("introGuideToggle").addEventListener("click", () => scheduleIntroWhisper(true));
document.getElementById("cardSetToggle").addEventListener("click", () => {
  hideIntroWhisper();
  togglePanel(cardSetPanel);
});
document.getElementById("calendarToggle").addEventListener("click", () => {
  hideIntroWhisper();
  calendarState.footerCopy = pickCalendarFooterCopy();
  renderCalendar();
  togglePanel(calendarPanel);
});
document.getElementById("closeCardSetPanel").addEventListener("click", () => togglePanel(cardSetPanel));
document.getElementById("closeCalendarReview").addEventListener("click", closeCalendarReview);
document.getElementById("calendarReviewScrim").addEventListener("click", closeCalendarReview);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("modalScrim").addEventListener("click", closeModal);
document.addEventListener(
  "pointerdown",
  (event) => {
    if (!calendarPanel.classList.contains("open")) return;
    const target = event.target;
    if (calendarPanel.contains(target) || document.getElementById("calendarToggle")?.contains(target)) return;
    closeCalendarPanelFromOutsideTap(event);
    event.preventDefault();
    event.stopPropagation();
  },
  { capture: true },
);
prevCardButton.addEventListener("click", () => moveActiveCard(-1));
nextCardButton.addEventListener("click", () => moveActiveCard(1));
focusCard.addEventListener("touchstart", (event) => {
  state.touchStartX = event.touches[0]?.clientX ?? 0;
});
focusCard.addEventListener("touchend", (event) => {
  const endX = event.changedTouches[0]?.clientX ?? state.touchStartX;
  const delta = endX - state.touchStartX;
  if (Math.abs(delta) > 44) moveActiveCard(delta > 0 ? -1 : 1);
});
photoInput.addEventListener("change", handlePhotoUpload);
window.addEventListener("resize", resize);
