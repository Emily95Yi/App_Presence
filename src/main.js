import * as THREE from "three";
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
const weatherToggle = document.getElementById("weatherToggle");
const weatherReview = document.getElementById("weatherReview");
const weatherReviewTitle = document.getElementById("weatherReviewTitle");
const weatherReviewCopy = document.getElementById("weatherReviewCopy");
const weatherReviewDeck = document.getElementById("weatherReviewDeck");
const weatherReviewDetail = document.getElementById("weatherReviewDetail");
const photoInput = document.getElementById("photoInput");
const prevCardButton = document.getElementById("prevCard");
const nextCardButton = document.getElementById("nextCard");
const introWhisper = document.getElementById("introWhisper");

const recordStoreKey = "presence.records.v1";
const visibilityStoreKey = "presence.contentVisibility.v1";
const userStoreKey = "presence.localUserId.v1";
const weatherStoreKey = "presence.weatherFragments.v1";
const recentSemanticPromptStoreKey = "presence.recentSemanticPrompts.v1";
const introStoreKey = "presence.intro.v1";
const dbName = "presence.db.v1";
const dbVersion = 1;
const canvasGenerationConfig = {
  minCardsPerViewport: 7,
  maxCardsPerViewport: 10,
  minBubblesPerViewport: 5,
  maxBubblesPerViewport: 8,
  chunkSize: 92,
  clusterRadius: 58,
  minDistanceBetweenCards: 130,
  minDistanceBetweenBubbles: 78,
  minDistanceCardToBubble: 112,
  minOpacity: 0.35,
  spawnPaddingAroundViewport: 0.22,
};

const chunkSize = canvasGenerationConfig.chunkSize;
const renderDistance = 2;
const chunkFadeMargin = 1.2;
const depthFadeStart = 122;
const depthFadeEnd = 330;
const maxVelocity = 2.9;
const velocityLerp = 0.16;
const velocityDecay = 0.9;
const initialCameraZ = 92;
const maxPromptsPerCard = 3;
const maxItemsPerChunk = canvasGenerationConfig.maxCardsPerViewport + canvasGenerationConfig.maxBubblesPerViewport;
const flowBendStrength = 38;
const flowJitterStrength = 24;
const poissonPlacementAttempts = 30;
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
  weather: 0.18,
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
  "你在画面中看到了什么？",
  "你被卡牌的哪里吸引着？",
  "这里有什么还不需要马上清楚？",
  "你的目光先停在哪里？",
  "如果它是一种天气，会是什么？",
];

const dwellingCopies = [
  "你似乎在这里停留了一会儿。",
  "也许有几个词，正慢慢靠近。",
  "不用选对，只是把贴近的留下。",
  "沉默也可以先留在这里。",
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
  "你似乎在反复经过这里。",
  "有些东西还没有被说完。",
  "这里有一点慢下来的声音。",
  "你刚才靠近了一个很轻的地方。",
  "那句没有解释的话，也被留下了。",
  "有个词像雾一样停着。",
  "你没有急着离开，这已经算回应。",
  "这里像是暂时不用整理。",
  "有一点光，没有被拿走。",
  "你提到的部分，还在轻轻回响。",
  "这张图接住了一点沉默。",
  "有些靠近，是很小声的。",
  "刚才那一下停顿，被空间记住了。",
  "你放下的不是答案，是一小片天气。",
  "这里还有一点未完成的柔软。",
  "像有什么从边缘慢慢浮回来。",
  "那一点不确定，也可以先在这里。",
  "你没有把它说清，但它被看见了。",
  "有个地方，似乎还想再停一会儿。",
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
    modeCompatibility: ["choice", "journal"],
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
    modeCompatibility: ["choice", "journal"],
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
    modeCompatibility: ["choice", "journal"],
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
    modeCompatibility: ["choice", "journal"],
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
    modeCompatibility: ["choice", "journal"],
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
    modeCompatibility: ["choice", "journal"],
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

const weatherSimilarityGroups = [
  { key: "mist", family: "feeling", title: "像雾一样", match: ["雾", "模糊", "不清楚", "不确定", "没答案", "还没想好"] },
  { key: "low", family: "feeling", title: "有点低低地漂着", match: ["累", "疲", "困", "闷", "空", "低能量", "酸涩", "躲"] },
  { key: "seen", family: "relation", title: "想被轻轻看见", match: ["靠近", "看见", "抱", "陪", "接住", "支持"] },
  { key: "body", family: "body", title: "身体还在轻声说", match: ["身体", "心", "胸", "胃", "肩", "呼吸"] },
  { key: "weather", family: "feeling", title: "同一片天气", match: ["天气", "雨", "风", "傍晚", "海", "漂浮"] },
  { key: "distance", family: "relation", title: "距离还在摇晃", match: ["距离", "边界", "退后", "离远", "保护", "亲密"] },
  { key: "light", family: "shift", title: "一点亮还留着", match: ["光", "亮", "希望", "开始", "保留"] },
  { key: "soft-stop", family: "related", title: "柔软的停顿", match: ["慢", "停留", "先放", "不解释", "没关系", "沉默"] },
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
const viewportDensityCache = new Map();
const textureCache = new Map();
const activeMeshes = new Map();
const activeViewportDensityMeshIds = new Set();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const reusableVector = new THREE.Vector3();
const calendarState = {
  month: new Date(),
  selectedDay: formatRecordDay(new Date().toISOString()),
  detailCardKey: null,
  reviewGroups: [],
  reviewActiveKey: null,
};

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
  mode: "journal",
  activeCards: [],
  activeCardIndex: 0,
  activeBatchId: null,
  cardSessions: new Map(),
  touchStartX: 0,
  selectedCard: null,
  selectedPrompts: [],
  currentPromptIndex: 0,
  answerSubmitted: false,
  selectedTags: new Set(),
  lastChunkKey: "",
  weatherEnabled: localStorage.getItem(weatherStoreKey) === "on",
  weatherWindowDays: 30,
  weatherFragments: [],
  activeWeatherId: null,
  activeWeatherCardKey: null,
  hoveredMeshId: null,
  introTimer: null,
  activeDwellTimer: null,
  lastInteractionAt: performance.now(),
  lastFrameAt: performance.now(),
  interactionFloatBoost: 0,
};

const chunkOffsets = makeChunkOffsets();
resize();
renderContentPanel();
renderCalendar();
refreshWeatherFragments(false);
renderWeatherButton();
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
      modeCompatibility: ["choice", "journal"],
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
  refreshWeatherFragments();
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
  const maxDist = renderDistance + chunkFadeMargin;
  for (let dx = -3; dx <= 3; dx += 1) {
    for (let dy = -3; dy <= 3; dy += 1) {
      for (let dz = -5; dz <= 2; dz += 1) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
        if (dist <= maxDist + 2) offsets.push({ dx, dy, dz, dist });
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

function refreshWeatherFragments(shouldRebuild = true) {
  const previousKey = state.weatherFragments.map((fragment) => fragment.id).join("|");
  state.weatherFragments = buildWeatherFragments(30);
  renderWeatherButton();
  const nextKey = state.weatherFragments.map((fragment) => fragment.id).join("|");
  if (shouldRebuild && previousKey !== nextKey) rebuildScene();
}

function buildWeatherFragments(windowDays) {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const buckets = new Map();
  collectWeatherPieces(windowDays, cutoff).forEach((piece) => {
    const bucketKey = weatherBucketKey(piece);
    if (!buckets.has(bucketKey)) {
      const softGroup = weatherSimilarityGroups.find((group) => bucketKey === `soft:${group.key}`);
      buckets.set(bucketKey, {
        key: bucketKey,
        title: softGroup?.title ?? "",
        family: softGroup?.family ?? piece.family ?? inferFamily(piece.label),
        fragments: new Map(),
        entries: new Map(),
        days: new Set(),
      });
    }
    const bucket = buckets.get(bucketKey);
    bucket.fragments.set(piece.label, (bucket.fragments.get(piece.label) ?? 0) + 1);
    bucket.entries.set(piece.entry.id, piece.entry);
    bucket.days.add(piece.day);
  });

  return [...buckets.values()]
    .filter((bucket) => [...bucket.entries.values()].some((entry) => entry.type === "echo") || bucket.entries.size >= 2 || bucket.days.size >= 2)
    .sort((a, b) => b.days.size - a.days.size || b.entries.size - a.entries.size || a.key.localeCompare(b.key))
    .slice(0, 5)
    .map((bucket, index) => {
      const fragments = [...bucket.fragments.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label]) => label)
        .slice(0, 5);
      const title = bucket.title || fragments[0] || "轻轻停留";
      return {
        id: `weather-${windowDays}-${bucket.key}`,
        title,
        fragments,
        relatedEntries: [...bucket.entries.values()].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
        windowDays,
        seed: hashString(`${windowDays}-${bucket.key}-${fragments.join("|")}`),
        visualKind: ["shell", "paper", "tide", "glow"][index % 4],
      };
    });
}

function collectWeatherPieces(windowDays, cutoff) {
  const pieces = [];
  records.forEach((entry) => {
    const at = new Date(entry.at).getTime();
    if (!Number.isFinite(at) || at < cutoff || !isWeatherRecord(entry)) return;
    const day = entry.dateKey ?? formatRecordDay(entry.at);
    weatherLabelsForEntry(entry).forEach((tag) => {
      const label = normalizeWeatherLabel(tag.label);
      if (!label) return;
      pieces.push({
        label,
        family: tag.family ?? inferFamily(label),
        entry,
        day,
        windowDays,
      });
    });
  });
  return pieces;
}

function isWeatherRecord(entry) {
  return ["tag", "keyword", "question_action", "answer", "echo"].includes(entry.type);
}

function weatherLabelsForEntry(entry) {
  if (entry.type === "tag") {
    return [{ label: entry.payload.label ?? entry.payload.tag ?? "", family: entry.payload.family }];
  }
  if (entry.type === "keyword") {
    return [{ label: entry.payload.text ?? "", family: "related" }];
  }
  if (entry.type === "question_action") {
    return (entry.payload.labels ?? []).map((label) => ({ label, family: inferFamily(label) }));
  }
  if (entry.type === "answer") {
    return answerWeatherLabels(entry.payload.text ?? "");
  }
  if (entry.type === "echo") {
    return [
      { label: entry.payload.text ?? "回声", family: "resonance" },
      ...(entry.payload.labels ?? []).map((label) => ({ label, family: inferFamily(label) })),
    ];
  }
  return [];
}

function answerWeatherLabels(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const tags = generateAiLikeTags(trimmed).map((tag) => ({ label: tag.label, family: tag.family }));
  const direct = trimmed.length <= 10 ? [{ label: trimmed, family: inferFamily(trimmed) }] : [];
  return uniqueTags([...direct, ...tags]).slice(0, 4);
}

function normalizeWeatherLabel(value = "") {
  return translateEnglishDisplayText(stripTagPrefix(value))
    .replace(/[，。！？、,.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

function translateEnglishDisplayText(value = "") {
  const text = String(value).trim();
  if (!/^[A-Za-z][A-Za-z /-]*$/.test(text)) return text;
  return angelTranslationMap.get(text.toLowerCase()) ?? "";
}

function weatherBucketKey(piece) {
  const softGroup = weatherSimilarityGroups.find((group) => group.match.some((word) => piece.label.includes(word)));
  if (softGroup) return `soft:${softGroup.key}`;
  return `${piece.family ?? inferFamily(piece.label)}:${piece.label}`;
}

function renderWeatherButton() {
  weatherToggle.classList.toggle("active", state.weatherEnabled);
  weatherToggle.classList.toggle("has-fragments", state.weatherFragments.length > 0);
}

function updateChunks(force = false) {
  const cx = Math.floor(state.basePos.x / chunkSize);
  const cy = Math.floor(state.basePos.y / chunkSize);
  const cz = Math.floor(state.basePos.z / chunkSize);
  const weatherKey = state.weatherEnabled ? state.weatherFragments.map((item) => item.id).join("|") : "quiet";
  const enabledKey =
    [...getEnabledProjectionSets(), ...wordGroups.filter((group) => group.enabled), ...(photoSet.enabled ? [photoSet] : [])]
      .map((item) => item.id)
      .join("|") || "none";
  const sceneKey = `${enabledKey},${weatherKey}`;
  const key = `${cx},${cy},${cz},${sceneKey}`;
  if (!force && key === state.lastChunkKey) {
    ensureViewportDensity(sceneKey);
    return;
  }
  state.lastChunkKey = key;

  const needed = new Set();
  activeViewportDensityMeshIds.forEach((id) => removeMeshById(id));
  activeViewportDensityMeshIds.clear();
  chunkOffsets.forEach((offset) => {
    generateChunkPlanesCached(cx + offset.dx, cy + offset.dy, cz + offset.dz).forEach((item) => {
      needed.add(item.id);
      if (!activeMeshes.has(item.id)) {
        const mesh = createMesh(item);
        activeMeshes.set(item.id, mesh);
        scene.add(mesh);
      }
    });
  });

  activeMeshes.forEach((mesh, id) => {
    if (!needed.has(id)) {
      removeMeshById(id);
    }
  });
  ensureViewportDensity(sceneKey);
}

function ensureViewportDensity(sceneKey) {
  const densityKey = getViewportDensityKey(sceneKey);
  activeViewportDensityMeshIds.forEach((id) => {
    const item = activeMeshes.get(id)?.userData;
    if (item?.viewportDensityKey !== densityKey) {
      removeMeshById(id);
      activeViewportDensityMeshIds.delete(id);
    }
  });

  const counts = countViewportDensity();
  const missingCards =
    counts.cards < canvasGenerationConfig.minCardsPerViewport
      ? Math.min(canvasGenerationConfig.minCardsPerViewport - counts.cards, Math.max(0, canvasGenerationConfig.maxCardsPerViewport - counts.cards))
      : 0;
  const missingWords =
    counts.words < canvasGenerationConfig.minBubblesPerViewport
      ? Math.min(canvasGenerationConfig.minBubblesPerViewport - counts.words, Math.max(0, canvasGenerationConfig.maxBubblesPerViewport - counts.words))
      : 0;
  if (!missingCards && !missingWords) return;

  if (!viewportDensityCache.has(densityKey)) {
    const existingItems = getPlacementItemsNearViewport(canvasGenerationConfig.spawnPaddingAroundViewport);
    viewportDensityCache.set(densityKey, makeViewportDensityItems(densityKey, missingCards, missingWords, existingItems));
    if (viewportDensityCache.size > 180) viewportDensityCache.delete(viewportDensityCache.keys().next().value);
  }

  viewportDensityCache.get(densityKey).forEach((item) => {
    if (activeMeshes.has(item.id)) return;
    const mesh = createMesh(item);
    activeMeshes.set(item.id, mesh);
    activeViewportDensityMeshIds.add(item.id);
    scene.add(mesh);
  });
}

function getViewportDensityKey(sceneKey) {
  const width = Math.max(1, getVisibleWorldWidth() * 0.72);
  const height = Math.max(1, getVisibleWorldHeight() * 0.72);
  const vx = Math.floor((state.basePos.x + state.drift.x) / width);
  const vy = Math.floor((state.basePos.y + state.drift.y) / height);
  const vz = Math.floor(state.basePos.z / chunkSize);
  return `${sceneKey}|viewport:${vx}:${vy}:${vz}`;
}

function countViewportDensity() {
  const counts = { cards: 0, words: 0 };
  activeMeshes.forEach((mesh) => {
    const item = mesh.userData;
    if (item.kind !== "card" && item.kind !== "word") return;
    if (!isItemInReadableViewport(item, -0.12)) return;
    if (item.kind === "card") counts.cards += 1;
    if (item.kind === "word") counts.words += 1;
  });
  return counts;
}

function getPlacementItemsNearViewport(padding) {
  return [...activeMeshes.values()]
    .map((mesh) => mesh.userData)
    .filter((item) => (item.kind === "card" || item.kind === "word") && isItemInReadableViewport(item, padding + 0.18));
}

function isItemInProjectedViewport(item, padding) {
  reusableVector.copy(item.position).project(camera);
  const relativeDepth = state.basePos.z - item.position.z;
  return (
    relativeDepth > -26 &&
    Math.abs(relativeDepth) < depthFadeEnd &&
    reusableVector.x >= -1 - padding &&
    reusableVector.x <= 1 + padding &&
    reusableVector.y >= -1 - padding &&
    reusableVector.y <= 1 + padding
  );
}

function isItemInReadableViewport(item, padding) {
  reusableVector.copy(item.position).project(camera);
  const relativeDepth = state.basePos.z - item.position.z;
  return (
    relativeDepth > 8 &&
    relativeDepth <= depthFadeStart &&
    reusableVector.x >= -1 - padding &&
    reusableVector.x <= 1 + padding &&
    reusableVector.y >= -1 - padding &&
    reusableVector.y <= 1 + padding
  );
}

function makeViewportDensityItems(densityKey, missingCards, missingWords, existingItems) {
  const cards = getEnabledCards();
  const enabledWords = getEnabledWords();
  const items = [];
  const seed = hashString(densityKey);
  const bounds = getViewportWorldBounds(state.basePos.z - 72, canvasGenerationConfig.spawnPaddingAroundViewport);
  const clusters = makeViewportDensityClusters(bounds, seed);
  const clusterRadius = screenPixelsToWorldUnits(canvasGenerationConfig.clusterRadius);
  const kinds = [
    ...Array.from({ length: cards.length ? missingCards : 0 }, () => "card"),
    ...Array.from({ length: enabledWords.length ? missingWords : 0 }, () => "word"),
  ];

  kinds.forEach((kind, index) => {
    const item = makePoissonViewportItem(
      {
        cards,
        enabledWords,
        clusters,
        clusterRadius,
        densityKey,
        itemIndex: index,
        itemSeed: seed + index * 1291,
        kind,
      },
      [...existingItems, ...items],
    );
    if (item) items.push(item);
  });

  return items;
}

function makeViewportDensityClusters(bounds, seed) {
  const count = 2 + (seededRandom(seed + 17) > 0.62 ? 1 : 0);
  return Array.from({ length: count }, (_, index) => {
    const s = seed + index * 2161;
    const r = (n) => seededRandom(s + n);
    return {
      id: `viewport-cluster:${index}`,
      center: new THREE.Vector3(lerp(bounds.minX, bounds.maxX, r(1)), lerp(bounds.minY, bounds.maxY, r(2)), bounds.z + (r(3) - 0.5) * chunkSize * 0.38),
      semanticKey: ["standard", "round", "relationship", "present", "angel"][Math.floor(r(4) * 5) % 5],
      flowRotation: (r(5) - 0.5) * 0.32,
      seed: s,
    };
  });
}

function makePoissonViewportItem(args, placedItems) {
  const attempts = poissonPlacementAttempts * 2;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const itemSeed = args.itemSeed + attempt * 7919;
    const cluster = args.clusters[Math.floor(seededRandom(itemSeed + 5) * args.clusters.length) % args.clusters.length];
    const radius = args.clusterRadius * (1 + (attempt / attempts) * 2.4);
    const item = makeClusterItem({
      cards: args.cards,
      enabledWords: args.enabledWords,
      weatherFragments: [],
      cluster,
      key: args.densityKey,
      itemIndex: args.itemIndex,
      itemSeed,
      kind: args.kind,
      position: placeAroundCluster(cluster, radius, itemSeed),
      attempt,
    });
    if (item && isPoissonPlacementValid(item, placedItems)) {
      item.isViewportSupplemental = true;
      item.viewportDensityKey = args.densityKey;
      if (item.kind === "card") item.scale.multiplyScalar(0.72);
      if (item.kind === "word") item.scale.multiplyScalar(0.92);
      return item;
    }
  }
  return null;
}

function getViewportWorldBounds(z, padding) {
  const distance = Math.max(1, camera.position.z - z);
  const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const width = height * camera.aspect;
  const padX = width * padding;
  const padY = height * padding;
  return {
    minX: camera.position.x - width / 2 - padX,
    maxX: camera.position.x + width / 2 + padX,
    minY: camera.position.y - height / 2 - padY,
    maxY: camera.position.y + height / 2 + padY,
    z,
  };
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
  const weatherKey = state.weatherEnabled ? state.weatherFragments.map((item) => item.id).join("|") : "quiet";
  const enabledKey =
    [...getEnabledProjectionSets(), ...wordGroups.filter((group) => group.enabled), ...(photoSet.enabled ? [photoSet] : [])]
      .map((item) => item.id)
      .join("|") || "none";
  const key = `${cx},${cy},${cz},${enabledKey},${weatherKey}`;
  if (planeCache.has(key)) return planeCache.get(key);

  const cards = getEnabledCards();
  const enabledWords = getEnabledWords();
  const weatherFragments = state.weatherEnabled ? state.weatherFragments : [];
  const items = [];
  const seed = hashString(key);
  const clusters = makeChunkClusters(cx, cy, cz, seed);
  const clusterRadius = screenPixelsToWorldUnits(canvasGenerationConfig.clusterRadius);
  let itemIndex = 0;

  const desiredCards = cards.length ? 1 + (seededRandom(seed + 11) > 0.72 ? 1 : 0) : 0;
  const desiredWords = enabledWords.length && seededRandom(seed + 13) > 0.45 ? 1 : 0;
  const desiredWeather = weatherFragments.length && seededRandom(seed + 17) > 0.82 ? 1 : 0;
  const itemKinds = [
    ...Array.from({ length: desiredCards }, () => "card"),
    ...Array.from({ length: desiredWords }, () => "word"),
    ...Array.from({ length: desiredWeather }, () => "weather"),
  ];

  itemKinds.forEach((kind, index) => {
    if (items.length >= maxItemsPerChunk) return;
    const itemSeed = seed + index * 997;
    const item = makePoissonClusterItem(
      {
        cards,
        enabledWords,
        weatherFragments,
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

  if (state.weatherEnabled && weatherFragments.length && isNearInitialView(cx, cy, cz) && !items.some((item) => item.kind === "weather")) {
    const echoItem = makeWeatherStreamItem(
      {
        id: `${key}-weather-echo-surface`,
        chunkKey: key,
        streamId: clusters[0]?.id ?? key,
        semanticKey: "weather",
        flowRotation: (clusters[0]?.flowRotation ?? 0) + 0.08,
        floatPhase: seededRandom(seed + 88) * Math.PI * 2,
        floatAmp: 1.4,
        position: placeAroundCluster(clusters[0] ?? makeChunkCluster(cx, cy, cz, seed + 88, "fallback"), clusterRadius, seed + 909),
        seed: seed + 909,
        lit: true,
      },
      weatherFragments,
      seed + 909,
    );
    if (echoItem) items.push(echoItem);
  }

  if (!items.length) {
    const fallbackKind = cards.length ? "card" : enabledWords.length ? "word" : weatherFragments.length ? "weather" : null;
    if (fallbackKind) {
      const item = makePoissonClusterItem(
        {
          cards,
          enabledWords,
          weatherFragments,
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
  const count = 1 + (seededRandom(seed + 31) > 0.42 ? 1 : 0) + (seededRandom(seed + 37) > 0.82 ? 1 : 0);
  return Array.from({ length: count }, (_, index) => makeChunkCluster(cx, cy, cz, seed + index * 2017, index));
}

function makeChunkCluster(cx, cy, cz, seed, index) {
  const r = (n) => seededRandom(seed + n);
  const center = new THREE.Vector3(
    cx * chunkSize + (r(1) - 0.5) * chunkSize * 0.86,
    cy * chunkSize + (r(2) - 0.5) * chunkSize * 0.86,
    cz * chunkSize + (r(3) - 0.5) * chunkSize * 0.5,
  );
  const semanticKeys = ["standard", "round", "relationship", "photos", "present", "angel", "mist", "seen", "weather", "body", "light"];
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
  const depth = (r(3) - 0.5) * chunkSize * 0.28;
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

function makeClusterItem({ cards, enabledWords, weatherFragments, cluster, key, itemIndex, itemSeed, kind, position, attempt }) {
  const base = {
    id: `${key}-${cluster.id}-${kind}-${itemIndex}-${attempt}`,
    chunkKey: key,
    streamId: cluster.id,
    semanticKey: cluster.semanticKey,
    flowRotation: cluster.flowRotation,
    floatPhase: seededRandom(itemSeed + 3) * Math.PI * 2,
    floatAmp: 0.45 + seededRandom(itemSeed + 4) * 1.4,
    position,
    seed: itemSeed,
    lit: false,
  };
  if (kind === "card") return makeCardStreamItem(base, cards, cluster.semanticKey, itemSeed);
  if (kind === "word") return makeWordStreamItem(base, enabledWords, cluster.semanticKey, itemSeed);
  if (kind === "weather") return makeWeatherStreamItem(base, weatherFragments, itemSeed);
  return null;
}

function makeStreamAnchors(cx, cy, cz, seed) {
  if (isBreathingVoid(cx, cy, cz) && !isNearInitialView(cx, cy, cz) && seededRandom(seed + 71) > 0.42) return [];
  const streamCount = isNearInitialView(cx, cy, cz) ? 2 : Math.floor(seededRandom(seed + 17) * 4);
  return Array.from({ length: streamCount }, (_, index) => {
    const s = seed + index * 2017;
    const r = (n) => seededRandom(s + n);
    const center = new THREE.Vector3(
      cx * chunkSize + (r(1) - 0.5) * chunkSize,
      cy * chunkSize + (r(2) - 0.5) * chunkSize,
      cz * chunkSize + (r(3) - 0.5) * chunkSize,
    );
    const flow = flowAt(center.x, center.y, center.z, seed);
    const angle = Math.atan2(flow.y, flow.x);
    const semanticKeys = ["standard", "round", "relationship", "photos", "present", "angel", "mist", "seen", "weather", "body", "light"];
    return {
      id: `${cx}:${cy}:${cz}:${index}`,
      center,
      angle,
      bend: (r(4) - 0.5) * flowBendStrength,
      length: chunkSize * (0.86 + r(5) * 0.78),
      semanticKey: semanticKeys[Math.floor(r(6) * semanticKeys.length) % semanticKeys.length],
      density: r(7),
      seed: s,
      groupRotation: (r(8) - 0.5) * 0.32,
    };
  });
}

function flowAt(x, y, z, seed) {
  const a = Math.sin(x * 0.011 + z * 0.006 + seed * 0.0001);
  const b = Math.cos(y * 0.013 - z * 0.004 + seed * 0.00013);
  const c = Math.sin((x + y) * 0.006 + seed * 0.00017);
  const angle = a * 1.35 + b * 0.85 + c * 0.7;
  return new THREE.Vector2(Math.cos(angle), Math.sin(angle)).normalize();
}

function placeAlongStream(stream, t, jitterSeed) {
  const r = (n) => seededRandom(jitterSeed + n);
  const u = (t - 0.5) * 2;
  const dir = new THREE.Vector2(Math.cos(stream.angle), Math.sin(stream.angle));
  const normal = new THREE.Vector2(-dir.y, dir.x);
  const curve = Math.sin(u * Math.PI) * stream.bend;
  const side = (r(1) - 0.5) * flowJitterStrength * (0.45 + Math.abs(u));
  const depth = (r(2) - 0.5) * chunkSize * 0.5;
  return new THREE.Vector3(
    stream.center.x + dir.x * u * stream.length * 0.5 + normal.x * (curve + side),
    stream.center.y + dir.y * u * stream.length * 0.5 + normal.y * (curve + side),
    stream.center.z + depth,
  );
}

function makePoissonStreamItem(args, placedItems) {
  for (let attempt = 0; attempt < poissonPlacementAttempts; attempt += 1) {
    const item = makeStreamItem({
      ...args,
      itemSeed: args.itemSeed + attempt * 7919,
    });
    if (item && isPoissonPlacementValid(item, placedItems)) return item;
  }
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

function makeStreamItem({ cards, enabledWords, weatherFragments, stream, key, itemIndex, itemSeed }) {
  const r = (n) => seededRandom(itemSeed + n);
  const semanticKey = stream.semanticKey;
  const t = (itemIndex + 0.35 + r(1) * 0.42) / (2 + Math.floor(stream.density * 5));
  const position = placeAlongStream(stream, t % 1, itemSeed);
  const base = {
    id: `${key}-${stream.id}-${itemIndex}`,
    chunkKey: key,
    streamId: stream.id,
    semanticKey,
    flowRotation: stream.groupRotation + (r(2) - 0.5) * 0.18,
    floatPhase: r(3) * Math.PI * 2,
    floatAmp: 0.45 + r(4) * 1.4,
    position,
    seed: itemSeed,
    lit: false,
  };
  const kind = chooseStreamKind({ cards, enabledWords, weatherFragments, semanticKey, seed: itemSeed });
  if (kind === "card") return makeCardStreamItem(base, cards, semanticKey, itemSeed);
  if (kind === "weather") return makeWeatherStreamItem(base, weatherFragments, itemSeed);
  if (kind === "word") return makeWordStreamItem(base, enabledWords, semanticKey, itemSeed);
  return null;
}

function chooseStreamKind({ cards, enabledWords, weatherFragments, semanticKey, seed }) {
  const hasCards = cards.length > 0;
  const hasWords = enabledWords.length > 0;
  const hasWeather = weatherFragments.length > 0;
  const r = seededRandom(seed + 23);
  if (hasWeather && ["mist", "seen", "weather", "body", "light"].includes(semanticKey) && r > 0.48) return "weather";
  if (hasWords && (semanticKey === "present" || semanticKey === "angel" || r < 0.34)) return "word";
  if (hasCards) return "card";
  if (hasWeather) return "weather";
  if (hasWords) return "word";
  return null;
}

function makeCardStreamItem(base, cards, semanticKey, seed) {
  const matching = cards.filter((card) => getCardSemanticKey(card) === semanticKey);
  const pool = matching.length ? matching : cards;
  const card = pool[Math.floor(seededRandom(seed + 31) * pool.length) % pool.length];
  const set = [...projectionSets, photoSet].find((candidate) => candidate.id === card.setId) ?? photoSet;
  const cardHeight = 13.5 + seededRandom(seed + 37) * 13.5;
  const cardAspect = getCardAspect(card);
  return {
    ...base,
    id: `${base.id}-${card.id}`,
    kind: "card",
    card,
    set,
    semanticKey: getCardSemanticKey(card),
    floatSpeed: getCardFloatSpeed(card),
    scale: new THREE.Vector3(clamp(cardHeight * cardAspect, 8.5, 29), cardHeight, 1),
  };
}

function makeWordStreamItem(base, enabledWords, semanticKey, seed) {
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

function makeWeatherStreamItem(base, weatherFragments, seed) {
  if (!weatherFragments.length) return null;
  const fragment = weatherFragments[Math.floor(seededRandom(seed + 53) * weatherFragments.length) % weatherFragments.length];
  const scale = getWeatherPlaneScale(fragment.title, fragment.visualKind);
  return {
    ...base,
    id: `${base.id}-${fragment.id}`,
    kind: "weather",
    fragment,
    semanticKey: getWeatherSemanticKey(fragment),
    floatSpeed: floatSpeeds.weather,
    scale: new THREE.Vector3(scale.width, scale.height, 1),
  };
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

function getWeatherSemanticKey(fragment) {
  if (!fragment) return "weather";
  const matched = weatherSimilarityGroups.find((group) => fragment.id.includes(group.key) || fragment.fragments?.some((text) => group.match.some((word) => text.includes(word))));
  return matched?.key ?? fragment.visualKind ?? "weather";
}

function isBreathingVoid(cx, cy, cz) {
  if (isNearInitialView(cx, cy, cz)) return false;
  return seededRandom(hashString(`${cx}:${cy}:${cz}:void`)) > 0.78;
}

function isNearInitialView(cx, cy, cz) {
  return Math.abs(cx) <= 1 && Math.abs(cy) <= 1 && cz >= 0 && cz <= 2;
}

function makeFallbackStream(cx, cy, cz, seed) {
  const center = new THREE.Vector3(cx * chunkSize, cy * chunkSize, cz * chunkSize);
  const flow = flowAt(center.x, center.y, center.z, seed);
  return {
    id: `${cx}:${cy}:${cz}:fallback`,
    center,
    angle: Math.atan2(flow.y, flow.x),
    bend: 0,
    length: chunkSize,
    semanticKey: "standard",
    density: 0.58,
    seed,
    groupRotation: 0,
  };
}

function createMesh(item) {
  const texture =
    item.kind === "card"
      ? makeCardTexture(item.card)
      : item.kind === "weather"
        ? makeWeatherTexture(item.fragment, item.seed)
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

function makeWeatherTexture(fragment, seed) {
  const key = `weather-${fragment.id}-${seed % 9}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  const size = getWeatherTextureSize(fragment.title);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  const kind = fragment.visualKind;
  const colors = {
    shell: ["rgba(255, 255, 246, 0.98)", "rgba(255, 229, 150, 0.82)", "rgba(156, 220, 210, 0.42)"],
    paper: ["rgba(255, 255, 250, 0.96)", "rgba(156, 220, 210, 0.76)", "rgba(255, 229, 150, 0.36)"],
    tide: ["rgba(255, 255, 245, 0.92)", "rgba(205, 187, 235, 0.72)", "rgba(156, 220, 210, 0.38)"],
    glow: ["rgba(255, 255, 250, 0.98)", "rgba(255, 229, 150, 0.86)", "rgba(205, 187, 235, 0.46)"],
  }[kind] ?? ["rgba(255, 255, 250, 0.96)", "rgba(255, 229, 150, 0.76)", "rgba(156, 220, 210, 0.38)"];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((seededRandom(seed + 3) - 0.5) * 0.14);
  ctx.shadowColor = "rgba(255, 214, 111, 0.76)";
  ctx.shadowBlur = 44;
  ctx.beginPath();
  if (kind === "shell") {
    ctx.moveTo(-canvas.width * 0.34, -canvas.height * 0.04);
    ctx.bezierCurveTo(-canvas.width * 0.24, -canvas.height * 0.42, canvas.width * 0.25, -canvas.height * 0.46, canvas.width * 0.34, -canvas.height * 0.06);
    ctx.bezierCurveTo(canvas.width * 0.4, canvas.height * 0.24, canvas.width * 0.12, canvas.height * 0.38, -canvas.width * 0.26, canvas.height * 0.24);
    ctx.bezierCurveTo(-canvas.width * 0.38, canvas.height * 0.18, -canvas.width * 0.42, canvas.height * 0.08, -canvas.width * 0.34, -canvas.height * 0.04);
  } else if (kind === "paper" || kind === "glow") {
    ctx.moveTo(-canvas.width * 0.36, -canvas.height * 0.28);
    ctx.lineTo(canvas.width * 0.3, -canvas.height * 0.34);
    ctx.quadraticCurveTo(canvas.width * 0.4, -canvas.height * 0.1, canvas.width * 0.34, canvas.height * 0.28);
    ctx.lineTo(-canvas.width * 0.3, canvas.height * 0.34);
    ctx.quadraticCurveTo(-canvas.width * 0.44, canvas.height * 0.04, -canvas.width * 0.36, -canvas.height * 0.28);
  } else {
    ctx.moveTo(-canvas.width * 0.38, -canvas.height * 0.06);
    ctx.bezierCurveTo(-canvas.width * 0.18, -canvas.height * 0.34, canvas.width * 0.18, -canvas.height * 0.28, canvas.width * 0.38, -canvas.height * 0.02);
    ctx.bezierCurveTo(canvas.width * 0.18, canvas.height * 0.3, -canvas.width * 0.14, canvas.height * 0.34, -canvas.width * 0.38, canvas.height * 0.06);
    ctx.bezierCurveTo(-canvas.width * 0.32, canvas.height * 0.02, -canvas.width * 0.32, -canvas.height * 0.02, -canvas.width * 0.38, -canvas.height * 0.06);
  }
  const gradient = ctx.createRadialGradient(0, -canvas.height * 0.12, 12, 0, 0, canvas.width * 0.44);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.72, colors[1]);
  gradient.addColorStop(1, colors[2]);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(22, 32, 27, 0.12)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.globalAlpha = 0.64;
  ctx.strokeStyle = "rgba(255, 250, 210, 0.86)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.shadowColor = "rgba(255, 229, 150, 0.72)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(31, 38, 34, 0.78)";
  ctx.font = `${size.lines.length > 1 ? 700 : 760} ${size.lines.length > 1 ? 30 : 34}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = size.lines.length > 1 ? 38 : 42;
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

function getWeatherTextureSize(text) {
  const chars = [...text];
  const lines = chars.length > 9 ? splitTextLines(chars, 2) : [text];
  return { width: 520, height: lines.length > 1 ? 250 : 210, lines };
}

function getWeatherPlaneScale(text, visualKind) {
  const size = getWeatherTextureSize(text);
  const height = visualKind === "tide" || visualKind === "glow" ? 10.8 : 9.6;
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

function drawImageContain(ctx, image, x, y, width, height) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  const dx = x + (width - dw) / 2;
  const dy = y + (height - dh) / 2;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(x, y, width, height);
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
  updateMeshVisibility();
  renderer.render(scene, camera);
}

function updateMeshVisibility() {
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
    const depthFade =
      absDepth <= depthFadeStart ? 1 : Math.max(0, 1 - (absDepth - depthFadeStart) / (depthFadeEnd - depthFadeStart));
    const depthRatio = clamp(absDepth / depthFadeEnd, 0, 1);
    reusableVector.copy(mesh.position).project(camera);
    const edgeDistance = Math.max(Math.abs(reusableVector.x), Math.abs(reusableVector.y));
    const edgeFade = edgeDistance < 0.72 ? 1 : clamp(1 - (edgeDistance - 0.72) / 0.34, 0, 1);
    const tooCloseWord = item.kind === "word" && relativeDepth < 24;
    const depthSoftness = item.kind === "weather" ? depthFade : depthFade * depthFade;
    const observable = relativeDepth > -26 && !tooCloseWord && gridFade > 0 && depthSoftness > 0 && edgeFade > 0;
    const rawTarget = observable ? Math.min(gridFade, depthSoftness, edgeFade) : 0;
    const target = observable && (item.kind === "card" || item.kind === "word") ? Math.max(canvasGenerationConfig.minOpacity, rawTarget) : rawTarget;
    const isHovered = state.hoveredMeshId === item.id;
    const hoverBoost = isHovered ? (item.kind === "weather" ? 0.24 : 0.16) : 0;
    mesh.material.opacity += (Math.min(1, target + hoverBoost) - mesh.material.opacity) * 0.16;
    mesh.material.color.setHex(isHovered && item.kind === "weather" ? 0xfff4bb : 0xffffff);
    const breatheAmp = item.kind === "weather" ? 0.035 : item.kind === "card" ? 0.018 : 0.012;
    const zoomSoftness = 1 - depthRatio * (item.kind === "weather" ? 0.08 : 0.16);
    const hoverScale = item.kind === "weather" && isHovered ? 1.04 : hover.scale;
    const breathe = (1 + Math.sin((now * floatSpeed + phaseOffset) * 0.82) * breatheAmp) * zoomSoftness * hoverScale;
    mesh.scale.set(item.scale.x * breathe, item.scale.y * breathe, item.scale.z);
    mesh.material.depthWrite = mesh.material.opacity > 0.98;
    mesh.visible = mesh.material.opacity > 0.012;
  });
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
  if (item.kind === "weather") return floatSpeeds.weather;
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
  pointerNdc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects([...activeMeshes.values()].filter((mesh) => mesh.visible), false);
  const visibleHits = hits.filter((entry) => entry.object.material.opacity > 0.24);
  const hit =
    visibleHits.find((entry) => entry.object.userData.kind === "weather") ??
    visibleHits.find((entry) => entry.object.userData.kind === "card") ??
    visibleHits[0];
  if (!hit) return;
  const item = hit.object.userData;
  if (item.kind === "weather") {
    openWeatherReview(item.fragment);
    return;
  }
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
  return {
    card,
    set,
    prompts: selectPrompts(card, set, card.seed ?? hashString(card.id)),
    currentPromptIndex: 0,
    question: pickOne(observingQuestions, seed + 13),
    dwellCopy: pickOne(dwellingCopies, seed + 29),
    reflectionStage: "observing",
    inputOpen: false,
    openedAt: performance.now(),
    selectedTags: new Set(),
    collectedTags: new Set(),
    answerText: "",
    responseTags: [],
    echoText: "",
    echoStatus: "idle",
    echoError: "",
    hasResponse: false,
  };
}

function syncActiveCard() {
  const card = state.activeCards[state.activeCardIndex];
  if (!card) return;
  const session = getActiveSession();
  state.selectedCard = card;
  state.selectedPrompts = session.prompts;
  state.currentPromptIndex = session.currentPromptIndex;
  state.selectedTags = session.selectedTags;
  const size = getCardCanvasSize(card);
  focusCard.width = size.width;
  focusCard.height = size.height;
  focusCard.style.aspectRatio = `${size.width} / ${size.height}`;
  drawCardCanvas(focusCtx, focusCard.width, focusCard.height, card);
  renderModalByMode();
  scheduleDwellReveal(session);
  updateBatchNav();
  record("card_open", {
    cardId: card.id,
    setId: card.setId,
    title: card.title,
    mode: "presence",
    photoBatchId: state.activeBatchId,
    thumbnail: cardThumbnail(card),
  });
}

function scheduleDwellReveal(session) {
  window.clearTimeout(state.activeDwellTimer);
  if (session.reflectionStage !== "observing") return;
  state.activeDwellTimer = window.setTimeout(() => {
    if (!cardModal.classList.contains("open") || getActiveSession() !== session) return;
    session.reflectionStage = "tagsVisible";
    renderModalByMode();
  }, 3500);
}

function closeModal() {
  const session = getActiveSession();
  if (session) {
    const dwellMs = Math.round(performance.now() - session.openedAt);
    if (dwellMs > 1800) {
      record("question_action", {
        mode: "presence",
        action: "dwell",
        cardId: session.card.id,
        setId: session.card.setId,
        promptId: getCurrentPrompt()?.id,
        questionId: getCurrentPrompt()?.id,
        dwellMs,
        labels: [...session.selectedTags],
        photoBatchId: state.activeBatchId,
      });
    }
  }
  window.clearTimeout(state.activeDwellTimer);
  cardModal.classList.remove("open");
  cardModal.setAttribute("aria-hidden", "true");
  state.activeCards = [];
  state.activeCardIndex = 0;
  state.activeBatchId = null;
}

function getActiveSession() {
  const card = state.activeCards[state.activeCardIndex] ?? state.selectedCard;
  if (!card) return null;
  if (!state.cardSessions.has(card.id)) state.cardSessions.set(card.id, createCardSession(card));
  return state.cardSessions.get(card.id);
}

function getCurrentPrompt() {
  const session = getActiveSession();
  return session?.prompts[session.currentPromptIndex] ?? null;
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
      weight: scoreObservationPerspective(prompt, { visualTokens, vectorTokens, energy, mode: state.mode, recentKeys, isOwnProfile: true }),
    }))
    .filter((entry) => entry.weight > 0);

  const selected = weightedSampleUnique(ownCandidates, maxPromptsPerCard, seed + hashString(card.id));
  if (selected.length < maxPromptsPerCard) {
    const supportCandidates = observationPerspectiveBank
      .filter((prompt) => !prompt.sourceProfileId || isStrongSemanticMatch(prompt, { visualTokens, vectorTokens }))
      .filter((prompt) => prompt.sourceProfileId !== card.id)
      .map((prompt) => ({
        prompt: { ...prompt, scope: "semantic", cardId: card.id },
        weight: scoreObservationPerspective(prompt, { visualTokens, vectorTokens, energy, mode: state.mode, recentKeys, isOwnProfile: false }),
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
  const modeScore = !prompt.modeCompatibility?.length || prompt.modeCompatibility.includes(context.mode) ? 1 : 0.35;
  const toneScore = prompt.tone === "observational" || prompt.tone === "gentle-attention" || context.mode === "journal" ? 1 : 0.88;
  const recentPenalty = context.recentKeys.includes(prompt.avoidRecentKey ?? normalizePerspectiveKey(prompt.text)) ? 0.68 : 1;
  const ownProfileBoost = context.isOwnProfile ? 18 : 0;
  return (visualScore * 4.2 + vectorScore * 4.8 + intensityScore * 1.6 + modeScore + toneScore + ownProfileBoost) * recentPenalty;
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
  const bubble = document.createElement("span");
  bubble.className = "prompt-bubble";
  bubble.textContent = session?.question || getCurrentPrompt()?.text || "先看一会儿也可以";
  promptLayer.appendChild(bubble);
}

function renderLiveTags(text) {
  liveTagResult.innerHTML = "";
  generateTags(text).forEach((tag) => {
    const button = document.createElement("button");
    button.className = `tag-chip${state.selectedTags.has(tag.label) ? " active" : ""}`;
    button.dataset.family = tag.family;
    button.type = "button";
    button.textContent = tag.label;
    button.addEventListener("click", () => {
      if (state.selectedTags.has(tag.label)) {
        state.selectedTags.delete(tag.label);
        button.classList.remove("active");
      } else {
        state.selectedTags.add(tag.label);
        button.classList.add("active");
      }
      record("tag", {
        label: tag.label,
        family: tag.family,
        cardId: state.selectedCard?.id ?? "unknown",
        setId: state.selectedCard?.setId ?? "unknown",
        promptId: getCurrentPrompt()?.id,
      });
    });
    liveTagResult.appendChild(button);
  });
}

function renderModalByMode() {
  renderCurrentPrompt();
  renderReflectionMode();
}

function renderReflectionMode() {
  const session = getActiveSession();
  if (!session) return;
  const isWaiting = session.echoStatus === "floating" || session.echoStatus === "loading";
  const hasResponse = session.hasResponse;
  const hasDraft = session.answerText.trim().length > 0;
  const showTags = session.reflectionStage === "tagsVisible" || session.inputOpen || hasResponse || isWaiting;
  const tags = getSoftTagsForSession(session);
  responseDock.dataset.mode = "presence";
  responseDock.dataset.echo = session.echoStatus;
  responseDock.classList.toggle("settled", showTags);
  responseDock.innerHTML = `
    <div class="reflection-dock">
      ${
        showTags
          ? `<p class="dwell-copy">${session.dwellCopy}</p>
             <div class="tag-result choice-tags soft-tags" id="softTagCloud"></div>`
          : `<p class="quiet-space">先看着它，不用马上回答。</p>`
      }
      ${
        hasResponse
          ? `<div class="bottle-response visible">
              <p class="echo-title">漂来的回声碎片</p>
              <p class="echo-text" id="echoText"></p>
            </div>`
          : ""
      }
      ${
        isWaiting
          ? `<div class="echo-status visible" id="echoStatus">${
              session.echoStatus === "floating" ? "这句话正在慢慢离开指尖。" : "回声正在从水面浮回来。"
            }</div>`
          : ""
      }
      ${
        session.inputOpen && !hasResponse
          ? `<div class="input-drawer open">
              <textarea id="answerInput" placeholder="一个词、一句话，或者什么都不解释。" ${isWaiting ? "readonly" : ""}></textarea>
              <button class="primary-button" id="castBottle" type="button" ${hasDraft && !isWaiting ? "" : "disabled"}>轻轻放下</button>
            </div>`
          : ""
      }
      <div class="reflection-actions">
        ${
          !session.inputOpen && !hasResponse
            ? `<button class="secondary-button soft-open-input" id="openInputDrawer" type="button">留下一句话</button>`
            : ""
        }
        <button class="secondary-button quiet-leave" id="keepBottle" type="button">回到画布</button>
      </div>
    </div>
  `;

  const tagRoot = responseDock.querySelector("#softTagCloud");
  if (tagRoot) {
    tags.forEach((tag, index) => {
      const button = document.createElement("button");
      button.className = `tag-chip soft-tag${session.selectedTags.has(tag.label) ? " active collected" : ""}`;
      button.dataset.family = tag.family;
      button.type = "button";
      button.style.setProperty("--tag-delay", `${index * 56}ms`);
      button.textContent = tag.label;
      button.addEventListener("click", () => {
        toggleSessionTag(session, tag);
        record("tag", tagPayload(tag, "soft_absorb"));
        renderReflectionMode();
      });
      tagRoot.appendChild(button);
    });
  }

  const textarea = responseDock.querySelector("#answerInput");
  const castButton = responseDock.querySelector("#castBottle");
  if (textarea) {
    textarea.value = session.answerText;
    textarea.addEventListener("input", () => {
      session.answerText = textarea.value;
      if (castButton) castButton.disabled = !session.answerText.trim() || isWaiting;
    });
  }
  const echoText = responseDock.querySelector("#echoText");
  if (echoText) echoText.textContent = session.echoText;
  responseDock.querySelector("#openInputDrawer")?.addEventListener("click", () => {
    session.inputOpen = true;
    renderReflectionMode();
    window.setTimeout(() => responseDock.querySelector("#answerInput")?.focus(), 80);
  });
  responseDock.querySelector("#castBottle")?.addEventListener("click", handleJournalCast);
  responseDock.querySelector("#keepBottle")?.addEventListener("click", closeModal);
}

function getSoftTagsForSession(session) {
  if (session.softTags) return session.softTags;
  const promptTags = getPromptDisplayTags(getCurrentPrompt()).map((label) => ({ family: inferFamily(label), label }));
  const base = uniqueTags([...promptTags, ...generateChoiceTags(getCurrentPrompt(), session.card), ...softTagPool]);
  session.softTags = stableShuffle(base, (session.card.seed ?? hashString(session.card.id)) + hashString(session.question)).slice(0, 7);
  return session.softTags;
}

function renderChoiceMode() {
  const session = getActiveSession();
  const prompt = getCurrentPrompt();
  const tags = generateChoiceTags(prompt, session.card);
  const canStay = session.selectedTags.size > 0;
  const isLast = session.currentPromptIndex >= session.prompts.length - 1;
  responseDock.innerHTML = `
    <div class="tag-result choice-tags" id="liveTagResult"></div>
    <div class="modal-actions">
      <button class="secondary-button" id="leaveCard" type="button">↙ 离开</button>
      <button class="primary-button" id="stayCard" type="button" ${canStay ? "" : "disabled"}>${isLast ? "✦ 放手" : "◌ 停留"}</button>
    </div>
  `;
  const tagRoot = responseDock.querySelector("#liveTagResult");
  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.className = `tag-chip${session.selectedTags.has(tag.label) ? " active" : ""}`;
    button.dataset.family = tag.family;
    button.type = "button";
    button.textContent = tag.label;
    button.addEventListener("click", () => {
      toggleSessionTag(session, tag);
      record("tag", tagPayload(tag, "choice_select"));
      renderChoiceMode();
    });
    tagRoot.appendChild(button);
  });
  responseDock.querySelector("#leaveCard").addEventListener("click", closeModal);
  responseDock.querySelector("#stayCard").addEventListener("click", handleChoiceStay);
}

function renderJournalMode() {
  const session = getActiveSession();
  const hasDraft = session.answerText.trim().length > 0;
  const hasResponse = session.hasResponse;
  const isWaiting = session.echoStatus === "floating" || session.echoStatus === "loading";
  const hasError = session.echoStatus === "error";
  const isLast = session.currentPromptIndex >= session.prompts.length - 1;
  responseDock.dataset.echo = session.echoStatus;
  responseDock.innerHTML = `
    <div class="journal-sea" aria-hidden="true">
      <span class="sea-glow"></span>
      <span class="paper-drift"></span>
    </div>
    <p class="journal-boundary">这里不会替你说明什么，也不会把你推向结论。它只是帮你把刚才的话轻轻放一放。</p>
    <textarea id="answerInput" placeholder="把此刻的一句话放进瓶子里。" ${hasResponse || isWaiting ? "readonly" : ""}></textarea>
    <div class="echo-status${isWaiting || hasError ? " visible" : ""}" id="echoStatus">
      ${hasError ? "这次回声没有顺利漂回来，可以稍后再试一次。" : "海面正在把话带回来……"}
    </div>
    <div class="bottle-response${hasResponse ? " visible" : ""}">
      <p class="echo-title">漂来的回声碎片</p>
      <p class="echo-text" id="echoText"></p>
      <p class="echo-prompt">哪些部分贴近你？</p>
      <div class="tag-result bottle-tags" id="bottleTags"></div>
      <p class="bottle-hint" id="bottleHint">拾起回声碎片装进漂流瓶。</p>
    </div>
    <div class="modal-actions journal-actions${hasResponse ? " has-echo" : ""}${hasResponse && isLast ? " final-question" : ""}">
      ${hasResponse && !isLast ? '<button class="secondary-button" id="exploreCard" type="button">再等会儿</button>' : ""}
      ${!hasResponse ? `<button class="primary-button" id="castBottle" type="button" ${hasDraft && !isWaiting ? "" : "disabled"}>留下这些</button>` : ""}
      <button class="secondary-button" id="keepBottle" type="button">收好离开</button>
    </div>
  `;
  const textarea = responseDock.querySelector("#answerInput");
  const castButton = responseDock.querySelector("#castBottle");
  textarea.value = session.answerText;
  textarea.addEventListener("input", () => {
    session.answerText = textarea.value;
    if (castButton) {
      castButton.disabled = !session.answerText.trim() || session.hasResponse || session.echoStatus === "floating" || session.echoStatus === "loading";
    }
  });
  const echoText = responseDock.querySelector("#echoText");
  if (echoText) echoText.textContent = session.echoText;
  const tagRoot = responseDock.querySelector("#bottleTags");
  session.responseTags.forEach((tag) => {
    const button = document.createElement("button");
    button.className = `tag-chip echo-chip${session.collectedTags.has(tag.label) ? " active collected" : ""}`;
    button.dataset.family = tag.family;
    button.type = "button";
    button.textContent = tag.label;
    button.addEventListener("click", () => {
      if (session.collectedTags.has(tag.label)) return;
      session.collectedTags.add(tag.label);
      record("tag", tagPayload(tag, "journal_collect"));
      renderJournalMode();
    });
    tagRoot.appendChild(button);
  });
  if (!session.responseTags.length && hasResponse) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "这次只有很轻的一点回声。";
    tagRoot.appendChild(empty);
  }
  responseDock.querySelector("#castBottle")?.addEventListener("click", () => {
    handleJournalCast();
  });
  responseDock.querySelector("#exploreCard")?.addEventListener("click", handleJournalExplore);
  responseDock.querySelector("#keepBottle").addEventListener("click", closeModal);
}

function toggleSessionTag(session, tag) {
  if (session.selectedTags.has(tag.label)) {
    session.selectedTags.delete(tag.label);
  } else {
    session.selectedTags.add(tag.label);
  }
}

function tagPayload(tag, action) {
  const session = getActiveSession();
  const prompt = getCurrentPrompt();
  return {
    label: tag.label,
    family: tag.family,
    mode: state.mode,
    action,
    cardId: session.card.id,
    setId: session.card.setId,
    promptId: prompt?.id,
    questionId: prompt?.id,
    photoBatchId: state.activeBatchId,
  };
}

function handleChoiceStay() {
  const session = getActiveSession();
  if (!session.selectedTags.size) return;
  const prompt = getCurrentPrompt();
  record("question_action", {
    mode: "choice",
    action: session.currentPromptIndex >= session.prompts.length - 1 ? "release" : "stay",
    cardId: session.card.id,
    setId: session.card.setId,
    promptId: prompt?.id,
    questionId: prompt?.id,
    labels: [...session.selectedTags],
    photoBatchId: state.activeBatchId,
  });
  if (session.currentPromptIndex >= session.prompts.length - 1) {
    closeModal();
    return;
  }
  session.currentPromptIndex += 1;
  session.selectedTags = new Set();
  syncActiveCard();
}

async function handleJournalCast() {
  const session = getActiveSession();
  if (!session.answerText.trim() || session.hasResponse || session.echoStatus === "floating" || session.echoStatus === "loading") return;
  const prompt = getCurrentPrompt();
  const answerText = session.answerText.trim();
  session.echoStatus = "floating";
  session.echoError = "";
  if (session.answerText.trim()) {
    record("answer", {
      mode: "presence",
      action: "cast",
      cardId: session.card.id,
      setId: session.card.setId,
      promptId: prompt?.id,
      questionId: prompt?.id,
      text: answerText,
      thumbnail: cardThumbnail(session.card),
      photoBatchId: state.activeBatchId,
    });
  }
  renderReflectionMode();
  try {
    await wait(420);
    session.echoStatus = "loading";
    renderReflectionMode();
    await wait(680);
    const echo = await requestEcho(answerText, {
      card: session.card,
      prompt,
      selectedTags: [...session.selectedTags],
      dwellMs: Math.round(performance.now() - session.openedAt),
      mode: "presence",
    });
    session.responseTags = echo.tags;
    session.echoText = echo.echoText;
    session.hasResponse = true;
    session.echoStatus = "ready";
    record("echo", {
      mode: "presence",
      action: "return",
      cardId: session.card.id,
      setId: session.card.setId,
      promptId: prompt?.id,
      questionId: prompt?.id,
      text: echo.echoText,
      labels: echo.tags.map((tag) => tag.label),
      thumbnail: cardThumbnail(session.card),
      visualKind: echo.visualKind,
      photoBatchId: state.activeBatchId,
    });
  } catch {
    session.echoStatus = "error";
    session.echoError = "这次回声没有顺利漂回来，可以稍后再试一次。";
  }
  renderReflectionMode();
}

function handleJournalExplore() {
  const session = getActiveSession();
  if (!session.hasResponse) return;
  const prompt = getCurrentPrompt();
  record("question_action", {
    mode: "journal",
    action: "explore",
    cardId: session.card.id,
    setId: session.card.setId,
    promptId: prompt?.id,
    questionId: prompt?.id,
    photoBatchId: state.activeBatchId,
  });
  if (session.currentPromptIndex >= session.prompts.length - 1) {
    closeModal();
    return;
  }
  session.currentPromptIndex += 1;
  session.answerText = "";
  session.responseTags = [];
  session.collectedTags = new Set();
  session.echoText = "";
  session.echoError = "";
  session.echoStatus = "idle";
  session.hasResponse = false;
  syncActiveCard();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateTags(text) {
  const trimmed = text.trim();
  if (!trimmed) return defaultTags;
  const matches = [];
  tagRules.forEach((rule) => {
    if (rule.match.some((word) => trimmed.includes(word))) {
      rule.tags.slice(0, 2).forEach((label) => matches.push({ family: rule.family, label }));
    }
  });
  const promptTags = getPromptDisplayTags(getCurrentPrompt()).map((label) => ({ family: inferFamily(label), label }));
  const fallback = [
    { family: "feeling", label: trimmed.slice(0, 8) },
    { family: "shift", label: "换个角度" },
    { family: "action", label: "慢一点" },
  ];
  return uniqueTags([...matches, ...promptTags, ...fallback, ...defaultTags]).slice(0, 8);
}

function generateChoiceTags(prompt, card) {
  const displayTags = getPromptDisplayTags(prompt);
  const baseText = [prompt?.text, card?.title, ...displayTags].filter(Boolean).join(" ");
  const generated = generateAiLikeTags(baseText, { card, prompt });
  const promptTags = displayTags.map((label) => ({ family: inferFamily(label), label }));
  return uniqueTags([...promptTags, ...generated, ...defaultTags]).slice(0, 9);
}

async function requestEcho(answerText, context = {}) {
  const selected = (context.selectedTags ?? []).map((label) =>
    typeof label === "string" ? { family: inferFamily(label), label } : { family: label.family ?? inferFamily(label.label), label: label.label },
  );
  const fallbackTags = uniqueTags([...selected, ...generateAiLikeTags(answerText, context), ...softTagPool]).slice(0, 5);
  return {
    echoText: generateEchoText(answerText, context, fallbackTags),
    tags: fallbackTags,
    visualKind: pickOne(["paper", "mist", "tide", "shell", "glow"], hashString(answerText || context.card?.id || "echo")),
    source: "mock",
  };
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

function generateEchoText(input, context = {}, tags = []) {
  const compact = input.trim().replace(/\s+/g, " ");
  if (compact && compact.length <= 8) return `你提到的“${compact}”，还在轻轻回响。`;
  const tagSeed = tags.map((tag) => tag.label).join("|");
  const seed = hashString(`${compact}|${context.card?.id ?? ""}|${context.prompt?.id ?? ""}|${tagSeed}`);
  return pickOne(localEchoFragments, seed);
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

function submitAnswer() {
  handleJournalCast();
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
      upload.textContent = "＋ 上传 / 拍照";
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

function setMode(mode) {
  state.mode = mode;
  if (cardModal.classList.contains("open")) renderModalByMode();
}

function renderModeToggle() {
  return state.mode;
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

function openWeatherReview(fragment = null) {
  const fragments = buildWeatherFragments(state.weatherWindowDays);
  const active = fragment && fragments.find((item) => item.id === fragment.id) ? fragment : fragments[0];
  state.activeWeatherId = active?.id ?? null;
  state.activeWeatherCardKey = null;
  weatherReview.classList.add("open");
  weatherReview.setAttribute("aria-hidden", "false");
  renderWeatherReview();
}

function closeWeatherReview() {
  weatherReview.classList.remove("open");
  weatherReview.setAttribute("aria-hidden", "true");
  state.activeWeatherId = null;
  state.activeWeatherCardKey = null;
}

function renderWeatherReview() {
  const fragments = buildWeatherFragments(state.weatherWindowDays);
  const active = fragments.find((fragment) => fragment.id === state.activeWeatherId) ?? fragments[0] ?? null;
  state.activeWeatherId = active?.id ?? null;
  weatherReview.querySelectorAll(".weather-window-option").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.days) === state.weatherWindowDays);
  });
  weatherReviewTitle.textContent = active?.title ?? "这些词最近轻轻聚在一起了";
  weatherReviewCopy.textContent = active
    ? `有些感觉似乎还停留在这里：${active.fragments.slice(0, 4).join("、")}`
    : "最近还没有反复漂回来的碎片。";
  renderWeatherReviewDeck(fragments, active);
  renderWeatherReviewDetail(active);
}

function renderWeatherReviewDeck(fragments, active) {
  weatherReviewDeck.innerHTML = "";
  if (!fragments.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "最近还没有反复漂回来的碎片。";
    weatherReviewDeck.appendChild(empty);
    return;
  }
  fragments.forEach((fragment, index) => {
    const button = document.createElement("button");
    button.className = `weather-fragment-card${fragment.id === active?.id ? " active" : ""}`;
    button.type = "button";
    button.style.setProperty("--tilt", `${((index % 5) - 2) * 2.8}deg`);
    button.dataset.kind = fragment.visualKind;
    const title = document.createElement("strong");
    title.textContent = fragment.title;
    const text = document.createElement("span");
    text.textContent = fragment.fragments.slice(0, 3).join("、");
    button.append(title, text);
    button.addEventListener("click", () => {
      state.activeWeatherId = fragment.id;
      state.activeWeatherCardKey = null;
      renderWeatherReview();
    });
    weatherReviewDeck.appendChild(button);
  });
}

function renderWeatherReviewDetail(fragment) {
  weatherReviewDetail.innerHTML = "";
  if (!fragment) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "最近还没有反复漂回来的碎片。";
    weatherReviewDetail.appendChild(empty);
    return;
  }
  const intro = document.createElement("p");
  intro.className = "weather-detail-title";
  intro.textContent = "曾经靠近过它的片刻";
  weatherReviewDetail.appendChild(intro);

  const groups = groupEntriesByCard(fragment.relatedEntries);
  if (!state.activeWeatherCardKey) state.activeWeatherCardKey = groups[0]?.key ?? null;
  const deck = document.createElement("div");
  deck.className = "weather-moment-deck";
  groups.slice(0, 8).forEach((group, index) => {
    const button = document.createElement("button");
    button.className = `weather-moment-card${group.key === state.activeWeatherCardKey ? " active" : ""}`;
    button.type = "button";
    button.style.setProperty("--tilt", `${((index % 7) - 3) * 1.7}deg`);
    button.append(createReviewCardVisual(group));
    button.addEventListener("click", () => {
      state.activeWeatherCardKey = group.key;
      renderWeatherReviewDetail(fragment);
    });
    deck.appendChild(button);
  });
  weatherReviewDetail.appendChild(deck);

  const activeGroup = groups.find((group) => group.key === state.activeWeatherCardKey) ?? groups[0];
  const detail = document.createElement("div");
  detail.className = "weather-moment-detail";
  if (activeGroup) {
    appendWeatherRecordSections(detail, activeGroup.entries);
  } else {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "这些碎片还没有靠近任何卡片。";
    detail.appendChild(empty);
  }
  weatherReviewDetail.appendChild(detail);
}

function appendWeatherRecordSections(rootEl, entries) {
  const answers = entries.filter((entry) => entry.type === "answer" && entry.payload.text?.trim()).map((entry) => entry.payload.text.trim());
  const echoes = entries.filter((entry) => entry.type === "echo" && entry.payload.text?.trim()).map((entry) => entry.payload.text.trim());
  const labels = collectRecordLabels(entries);
  const words = entries.filter((entry) => entry.type === "keyword").map((entry) => entry.payload.text ?? "点亮的文字");
  [
    ["回声碎片", echoes],
    ["留下的话", answers],
    ["轻轻靠近的词", labels],
    ["点亮过的文字", words],
  ].forEach(([label, values]) => {
    if (!values.length) return;
    const section = document.createElement("div");
    section.className = "weather-record-group";
    const heading = document.createElement("p");
    heading.textContent = label;
    section.appendChild(heading);
    uniqueRecordValues(values)
      .slice(0, 6)
      .forEach((value) => {
        const item = document.createElement("span");
        item.textContent = value;
        section.appendChild(item);
      });
    rootEl.appendChild(section);
  });
  if (!rootEl.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "这里只留下很轻的一点触碰。";
    rootEl.appendChild(empty);
  }
}

function renderCalendar() {
  const rootEl = document.getElementById("calendarList");
  const monthDate = calendarState.month;
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const groups = groupedRecords();
  const monthLabel = String(month + 1).padStart(2, "0");
  let html = `
    <div class="calendar-headline">
      <button class="calendar-nav-button" id="prevMonth" type="button" aria-label="上个月">‹</button>
      <div class="calendar-month-title" aria-label="${year}-${monthLabel}">
        <span>${year}</span>
        <strong>${monthLabel}</strong>
      </div>
      <button class="calendar-nav-button" id="nextMonth" type="button" aria-label="下个月">›</button>
    </div>
    <div class="month-grid weather-month-grid">
  `;
  let visibleDays = 0;
  for (let day = 1; day <= days; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entries = groups[key] ?? [];
    const meaningful = entries.filter((entry) => entry.type !== "app_visit");
    const hasRecord = meaningful.length > 0;
    const visitedOnly = !hasRecord && entries.some((entry) => entry.type === "app_visit");
    if (!hasRecord && !visitedOnly) continue;
    visibleDays += 1;
    const density = clamp(meaningful.length, 1, 7);
    const className = `day-button weather-day${hasRecord ? " has-record" : " visited-only"}${
      calendarState.selectedDay === key ? " selected" : ""
    }`;
    html += `<button class="${className}" style="--density:${density}" data-day="${key}" type="button">${day}</button>`;
  }
  if (!visibleDays) html += `<p class="empty-state month-empty">这个月还没有什么留下。</p>`;
  html += `</div>`;
  rootEl.innerHTML = html;
  rootEl.querySelector("#prevMonth").addEventListener("click", () => {
    calendarState.month = new Date(year, month - 1, 1);
    renderCalendar();
  });
  rootEl.querySelector("#nextMonth").addEventListener("click", () => {
    calendarState.month = new Date(year, month + 1, 1);
    renderCalendar();
  });
  rootEl.querySelectorAll(".day-button").forEach((button) => {
    button.addEventListener("click", () => {
      calendarState.selectedDay = button.dataset.day;
      calendarState.detailCardKey = null;
      const entries = groups[calendarState.selectedDay] ?? [];
      renderCalendar();
      openCalendarReview(calendarState.selectedDay, entries);
    });
  });
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
  if (entry.type === "answer") return Boolean(entry.payload.text?.trim());
  return ["tag", "keyword", "card_open", "question_action", "photo_upload", "app_visit", "echo"].includes(entry.type);
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
  if (entry.type === "app_visit") return "轻轻经过";
  if (entry.type === "echo") return "回声";
  if (entry.type === "keyword") return entry.payload.text ?? "点亮的文字";
  if (!entry.payload.cardId && !entry.payload.id) return "文字";
  return entry.payload.title ?? entry.payload.cardTitle ?? entry.payload.cardId ?? entry.payload.id ?? "卡牌";
}

function latestTime(group) {
  return Math.max(...group.entries.map((entry) => new Date(entry.at).getTime()));
}

function openCalendarReview(day, entries) {
  const groups = groupEntriesByCard(entries);
  calendarState.reviewGroups = groups;
  calendarState.reviewActiveKey = groups[0]?.key ?? null;
  calendarReviewDate.textContent = day;
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
  const activeGroup = groups.find((group) => group.key === calendarState.reviewActiveKey) ?? groups[0];
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
  const questions = uniqueRecordValues(group.entries.map((entry) => promptTextForRecord(entry)).filter(Boolean));
  const answers = group.entries.filter((entry) => entry.type === "answer" && entry.payload.text?.trim()).map((entry) => entry.payload.text.trim());
  const echoes = group.entries.filter((entry) => entry.type === "echo" && entry.payload.text?.trim()).map((entry) => entry.payload.text.trim());
  const labels = collectRecordLabels(group.entries);
  calendarReviewDetail.innerHTML = "";
  [
    ["回声", echoes],
    ["设问", questions],
    ["输入", answers],
    ["标签", labels],
    ["点亮文字", group.entries.filter((entry) => entry.type === "keyword").map((entry) => entry.payload.text ?? "点亮的文字")],
  ].forEach(([label, values]) => {
    if (!values.length) return;
    const section = document.createElement("div");
    section.className = "review-record-group";
    const heading = document.createElement("p");
    heading.textContent = label;
    section.appendChild(heading);
    values.forEach((value) => {
      const item = document.createElement("span");
      item.textContent = value;
      section.appendChild(item);
    });
    calendarReviewDetail.appendChild(section);
  });
  if (!calendarReviewDetail.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = group.entries.some((entry) => entry.type === "app_visit") ? "这一天只是轻轻经过。" : "这张卡还没有留下可回看的输入或标签。";
    calendarReviewDetail.appendChild(empty);
  }
}

function promptTextForRecord(entry) {
  const promptId = entry.payload.questionId ?? entry.payload.promptId;
  return searchablePromptBank.find((prompt) => prompt.id === promptId)?.text ?? "";
}

function collectRecordLabels(entries) {
  const labels = [];
  entries.forEach((entry) => {
    if (entry.type === "tag") labels.push(stripTagPrefix(entry.payload.label ?? entry.payload.tag ?? ""));
    if (entry.type === "question_action") labels.push(...(entry.payload.labels ?? []));
    if (entry.type === "echo") labels.push(...(entry.payload.labels ?? []));
  });
  return uniqueRecordValues(labels.filter(Boolean));
}

function uniqueRecordValues(values) {
  return [...new Set(values)];
}

function renderCardRecordDetail(group) {
  const detail = document.createElement("section");
  detail.className = "record-detail";
  const header = document.createElement("div");
  header.className = "record-detail-head";
  const back = document.createElement("button");
  back.className = "detail-back";
  back.type = "button";
  back.textContent = "← 返回";
  back.addEventListener("click", () => {
    calendarState.detailCardKey = null;
    renderCalendar();
  });
  const thumb = document.createElement(group.thumbnail ? "img" : "div");
  thumb.className = "detail-thumb";
  if (group.thumbnail) thumb.src = group.thumbnail;
  const title = document.createElement("h4");
  title.textContent = group.title;
  header.append(back, thumb, title);
  detail.appendChild(header);

  const sections = [
    ["提交内容", group.entries.filter((entry) => entry.type === "answer")],
    ["文字标签", group.entries.filter((entry) => entry.type === "tag")],
    ["行动", group.entries.filter((entry) => ["question_action", "card_open", "photo_upload"].includes(entry.type))],
    ["点亮文字", group.entries.filter((entry) => entry.type === "keyword")],
  ];
  sections.forEach(([label, sectionEntries]) => {
    if (!sectionEntries.length) return;
    const section = document.createElement("div");
    section.className = "record-group";
    const heading = document.createElement("p");
    heading.textContent = label;
    section.appendChild(heading);
    sectionEntries
      .slice()
      .reverse()
      .forEach((entry) => {
        const item = document.createElement("span");
        item.textContent = describeRecord(entry);
        section.appendChild(item);
      });
    detail.appendChild(section);
  });
  return detail;
}

function describeRecord(entry) {
  if (entry.type === "answer") return entry.payload.text;
  if (entry.type === "tag") return stripTagPrefix(entry.payload.label ?? entry.payload.tag);
  if (entry.type === "keyword") return entry.payload.text;
  if (entry.type === "question_action") return describeAction(entry.payload.action);
  if (entry.type === "photo_upload") return "上传";
  if (entry.type === "card_open") return "打开";
  if (entry.type === "app_visit") return "轻轻经过";
  if (entry.type === "echo") return entry.payload.text ?? "回声";
  return entry.type;
}

function stripTagPrefix(value = "") {
  return value.replace(/^相似：/, "").replace(/^灵感：/, "");
}

function describeAction(action) {
  return (
    {
      stay: "停留",
      release: "放手",
      explore: "探索",
      cast: "投出",
      choice_select: "选择",
      journal_collect: "收进瓶子",
    }[action] ?? "行动"
  );
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
  viewportDensityCache.clear();
  activeMeshes.forEach((mesh) => {
    scene.remove(mesh);
    mesh.material.dispose();
  });
  activeMeshes.clear();
  activeViewportDensityMeshIds.clear();
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
  renderCalendar();
  togglePanel(calendarPanel);
});
weatherToggle.addEventListener("click", () => {
  hideIntroWhisper();
  state.weatherEnabled = !state.weatherEnabled;
  localStorage.setItem(weatherStoreKey, state.weatherEnabled ? "on" : "off");
  renderWeatherButton();
  rebuildScene();
});
document.getElementById("closeCardSetPanel").addEventListener("click", () => togglePanel(cardSetPanel));
document.getElementById("closeCalendarPanel").addEventListener("click", () => togglePanel(calendarPanel));
document.getElementById("closeCalendarReview").addEventListener("click", closeCalendarReview);
document.getElementById("calendarReviewScrim").addEventListener("click", closeCalendarReview);
document.getElementById("closeWeatherReview").addEventListener("click", closeWeatherReview);
document.getElementById("weatherReviewScrim").addEventListener("click", closeWeatherReview);
weatherReview.querySelectorAll(".weather-window-option").forEach((button) => {
  button.addEventListener("click", () => {
    state.weatherWindowDays = Number(button.dataset.days);
    state.activeWeatherCardKey = null;
    renderWeatherReview();
  });
});
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("modalScrim").addEventListener("click", closeModal);
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
