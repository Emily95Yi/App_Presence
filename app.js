import * as THREE from "three";

const root = document.getElementById("sceneRoot");
const cardModal = document.getElementById("cardModal");
const focusCard = document.getElementById("focusCard");
const focusCtx = focusCard.getContext("2d");
const promptLayer = document.getElementById("promptLayer");
const answerInput = document.getElementById("answerInput");
const submitAnswerButton = document.getElementById("submitAnswer");
const liveTagResult = document.getElementById("liveTagResult");
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
const choiceModeToggle = document.getElementById("choiceModeToggle");
const journalModeToggle = document.getElementById("journalModeToggle");
const prevCardButton = document.getElementById("prevCard");
const nextCardButton = document.getElementById("nextCard");

const recordStoreKey = "presence.records.v1";
const visibilityStoreKey = "presence.contentVisibility.v1";
const userStoreKey = "presence.localUserId.v1";
const modeStoreKey = "presence.mode.v1";
const weatherStoreKey = "presence.weatherFragments.v1";
const dbName = "presence.db.v1";
const dbVersion = 1;
const chunkSize = 92;
const renderDistance = 2;
const chunkFadeMargin = 1.2;
const depthFadeStart = 122;
const depthFadeEnd = 330;
const maxVelocity = 2.9;
const velocityLerp = 0.16;
const velocityDecay = 0.9;
const initialCameraZ = 92;
const maxPromptsPerCard = 3;
const maxItemsPerChunk = 7;
const flowBendStrength = 38;
const flowJitterStrength = 24;

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
      .flatMap((line, index) => {
        const [en, zh] = line.split("|");
        return [
          { id: `angel-en-${index}`, text: en, language: "en", tags: ["天使"] },
          { id: `angel-zh-${index}`, text: zh, language: "zh", tags: ["天使"] },
        ];
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
  detailCardKey: null,
  reviewGroups: [],
  reviewActiveKey: null,
};

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setClearColor(0xf8f4ec, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf8f4ec, depthFadeStart, depthFadeEnd);

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
  mode: localStorage.getItem(modeStoreKey) || "choice",
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
  weatherEnabled: localStorage.getItem(weatherStoreKey) !== "off",
  weatherWindowDays: 30,
  weatherFragments: [],
  activeWeatherId: null,
  activeWeatherCardKey: null,
};

const chunkOffsets = makeChunkOffsets();
resize();
renderModeToggle();
renderContentPanel();
renderCalendar();
refreshWeatherFragments(false);
renderWeatherButton();
updateChunks(true);
animate();

function createNumberedCardImages(setId, count, extension) {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return `./assets/cards/${setId}/${setId}-${number}.${extension}`;
  });
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
  promptBank.forEach((prompt) => {
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
    .filter((bucket) => bucket.entries.size >= 2 || bucket.days.size >= 2)
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
        visualKind: ["shell", "paper", "tide"][index % 3],
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
  return ["tag", "keyword", "question_action", "answer"].includes(entry.type);
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
  return stripTagPrefix(value)
    .replace(/[，。！？、,.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
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
  if (!force && key === state.lastChunkKey) return;
  state.lastChunkKey = key;

  const needed = new Set();
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
      scene.remove(mesh);
      mesh.material.dispose();
      activeMeshes.delete(id);
    }
  });
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
  const streams = makeStreamAnchors(cx, cy, cz, seed);
  const empty = isBreathingVoid(cx, cy, cz);
  let itemIndex = 0;

  streams.forEach((stream, streamIndex) => {
    if (items.length >= maxItemsPerChunk) return;
    const streamSeed = seed + streamIndex * 1543;
    const r = (n) => seededRandom(streamSeed + n);
    const rawCount = Math.floor(1.5 + r(11) * 3.8 + (stream.density > 0.72 ? r(12) * 2.4 : 0));
    const count = empty ? Math.min(rawCount, r(13) > 0.62 ? 1 : 0) : Math.min(rawCount, maxItemsPerChunk - items.length);
    for (let i = 0; i < count && items.length < maxItemsPerChunk; i += 1) {
      const itemSeed = streamSeed + i * 997;
      const item = makeStreamItem({
        cards,
        enabledWords,
        weatherFragments,
        stream,
        key,
        itemIndex,
        itemSeed,
      });
      if (item) {
        items.push(item);
        itemIndex += 1;
      }
    }
  });

  if (!items.length && isNearInitialView(cx, cy, cz)) {
    const stream = streams[0] ?? makeFallbackStream(cx, cy, cz, seed);
    const item = makeStreamItem({ cards, enabledWords, weatherFragments, stream, key, itemIndex: 0, itemSeed: seed + 4049 });
    if (item) items.push(item);
  }

  planeCache.set(key, items);
  if (planeCache.size > 260) planeCache.delete(planeCache.keys().next().value);
  return items;
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
    scale: new THREE.Vector3(clamp(cardHeight * cardAspect, 8.5, 29), cardHeight, 1),
  };
}

function makeWordStreamItem(base, enabledWords, semanticKey, seed) {
  const matching = enabledWords.filter((word) => getWordSemanticKey(word) === semanticKey);
  const pool = matching.length ? matching : enabledWords;
  const word = pool[Math.floor(seededRandom(seed + 41) * pool.length) % pool.length];
  const wordScale = getWordPlaneScale(word.text);
  return {
    ...base,
    id: `${base.id}-${word.id}`,
    kind: "word",
    word,
    text: word.text,
    groupId: word.groupId,
    semanticKey: getWordSemanticKey(word),
    scale: new THREE.Vector3(wordScale.width, wordScale.height, 1),
  };
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
    scale: new THREE.Vector3(scale.width, scale.height, 1),
  };
}

function getCardSemanticKey(card) {
  return card?.setId ?? "card";
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
    shell: ["rgba(255, 252, 245, 0.92)", "rgba(232, 213, 190, 0.72)", "rgba(52, 125, 112, 0.2)"],
    paper: ["rgba(255, 252, 245, 0.9)", "rgba(219, 236, 230, 0.72)", "rgba(223, 162, 143, 0.18)"],
    tide: ["rgba(255, 252, 245, 0.78)", "rgba(199, 215, 234, 0.64)", "rgba(52, 125, 112, 0.16)"],
  }[kind];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((seededRandom(seed + 3) - 0.5) * 0.14);
  ctx.shadowColor = "rgba(22, 32, 27, 0.14)";
  ctx.shadowBlur = 28;
  ctx.beginPath();
  if (kind === "shell") {
    ctx.moveTo(-canvas.width * 0.34, -canvas.height * 0.04);
    ctx.bezierCurveTo(-canvas.width * 0.24, -canvas.height * 0.42, canvas.width * 0.25, -canvas.height * 0.46, canvas.width * 0.34, -canvas.height * 0.06);
    ctx.bezierCurveTo(canvas.width * 0.4, canvas.height * 0.24, canvas.width * 0.12, canvas.height * 0.38, -canvas.width * 0.26, canvas.height * 0.24);
    ctx.bezierCurveTo(-canvas.width * 0.38, canvas.height * 0.18, -canvas.width * 0.42, canvas.height * 0.08, -canvas.width * 0.34, -canvas.height * 0.04);
  } else if (kind === "paper") {
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
  ctx.restore();

  ctx.fillStyle = "rgba(22, 32, 27, 0.72)";
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
  const height = visualKind === "tide" ? 10.2 : 9.2;
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
  state.targetVel.z += state.scrollAccum;
  state.scrollAccum *= 0.78;
  state.targetVel.x = clamp(state.targetVel.x, -maxVelocity, maxVelocity);
  state.targetVel.y = clamp(state.targetVel.y, -maxVelocity, maxVelocity);
  state.targetVel.z = clamp(state.targetVel.z, -maxVelocity * 0.86, maxVelocity * 0.86);
  state.velocity.lerp(state.targetVel, velocityLerp);
  state.basePos.add(state.velocity);
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
  const now = performance.now() * 0.001;
  activeMeshes.forEach((mesh) => {
    const item = mesh.userData;
    const flow = flowAt(item.position.x, item.position.y, item.position.z, item.seed ?? 1);
    const phase = now * 0.24 + (item.floatPhase ?? 0);
    const floatAmp = item.floatAmp ?? 0;
    const streamDrift = Math.sin(phase) * floatAmp;
    const sideDrift = Math.cos(phase * 0.72) * floatAmp * 0.38;
    mesh.position.set(
      item.position.x + flow.x * streamDrift - flow.y * sideDrift,
      item.position.y + flow.y * streamDrift + flow.x * sideDrift,
      item.position.z + Math.sin(phase * 0.62) * floatAmp * 0.42,
    );
    mesh.rotation.z = (item.flowRotation ?? 0) + Math.sin(phase * 0.5) * 0.035;
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
    reusableVector.copy(mesh.position).project(camera);
    const edgeDistance = Math.max(Math.abs(reusableVector.x), Math.abs(reusableVector.y));
    const edgeFade = edgeDistance < 0.72 ? 1 : clamp(1 - (edgeDistance - 0.72) / 0.34, 0, 1);
    const tooCloseWord = item.kind === "word" && relativeDepth < 24;
    const depthSoftness = item.kind === "weather" ? depthFade : depthFade * depthFade;
    const target = relativeDepth > -26 && !tooCloseWord ? Math.min(gridFade, depthSoftness, edgeFade) : 0;
    mesh.material.opacity += (target - mesh.material.opacity) * 0.16;
    mesh.material.depthWrite = mesh.material.opacity > 0.98;
    mesh.visible = mesh.material.opacity > 0.012;
  });
}

function onPointerDown(event) {
  renderer.domElement.setPointerCapture(event.pointerId);
  state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  state.lastPointer = { x: event.clientX, y: event.clientY, t: performance.now(), moved: 0 };
  state.isDragging = true;
  state.targetVel.multiplyScalar(0.35);
}

function onPointerMove(event) {
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
  return {
    card,
    set,
    prompts: selectPrompts(card, set, card.seed ?? hashString(card.id)),
    currentPromptIndex: 0,
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
  updateBatchNav();
  record("card_open", {
    cardId: card.id,
    setId: card.setId,
    title: card.title,
    mode: state.mode,
    photoBatchId: state.activeBatchId,
    thumbnail: cardThumbnail(card),
  });
}

function closeModal() {
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

function renderCurrentPrompt() {
  promptLayer.innerHTML = "";
  const prompt = getCurrentPrompt();
  const bubble = document.createElement("span");
  bubble.className = "prompt-bubble";
  bubble.textContent = prompt ? prompt.text : "已经完成";
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
  responseDock.dataset.mode = state.mode;
  if (state.mode === "journal") {
    renderJournalMode();
  } else {
    renderChoiceMode();
  }
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
      mode: "journal",
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
  renderJournalMode();
  try {
    await wait(420);
    session.echoStatus = "loading";
    renderJournalMode();
    await wait(680);
    session.responseTags = generateAiLikeTags(answerText, { card: session.card, prompt });
    session.echoText = generateEchoText(answerText, { card: session.card, prompt }, session.responseTags);
    session.hasResponse = true;
    session.echoStatus = "ready";
  } catch {
    session.echoStatus = "error";
    session.echoError = "这次回声没有顺利漂回来，可以稍后再试一次。";
  }
  renderJournalMode();
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
  const promptTags = (getCurrentPrompt()?.tags ?? []).map((label) => ({ family: inferFamily(label), label }));
  const fallback = [
    { family: "feeling", label: trimmed.slice(0, 8) },
    { family: "shift", label: "换个角度" },
    { family: "action", label: "慢一点" },
  ];
  return uniqueTags([...matches, ...promptTags, ...fallback, ...defaultTags]).slice(0, 8);
}

function generateChoiceTags(prompt, card) {
  const baseText = [prompt?.text, card?.title, ...(prompt?.tags ?? [])].filter(Boolean).join(" ");
  const generated = generateAiLikeTags(baseText, { card, prompt });
  const promptTags = (prompt?.tags ?? []).map((label) => ({ family: inferFamily(label), label }));
  return uniqueTags([...promptTags, ...generated, ...defaultTags]).slice(0, 9);
}

function generateAiLikeTags(input, context = {}) {
  const text = `${input || ""} ${context.prompt?.text ?? ""} ${context.card?.title ?? ""}`.trim();
  const related = collectRuleTags(text, tagRules, "related", ["与它有关", "靠近一点", "先看见"]).slice(0, 3);
  const opposite = collectRuleTags(text, oppositeTagRules, "opposite", ["反过来", "松开一点", "换个方向"]).slice(0, 3);
  const resonance = collectRuleTags(text, resonanceTagRules, "resonance", ["同一种需要", "相似感受", "被轻轻接住"]).slice(0, 3);
  return uniqueTags([...related, ...opposite, ...resonance]).slice(0, 9);
}

function generateEchoText(input, context = {}, tags = []) {
  const promptText = context.prompt?.text ? `在“${context.prompt.text}”旁边，` : "";
  const picked = tags.slice(0, 3).map((tag) => stripTagPrefix(tag.label));
  const fragments = picked.length ? picked.join("、") : "一点还没完全说清的感受";
  const inputHint = input.length > 18 ? "这句话" : `“${input}”`;
  return `${promptText}${inputHint}像是把${fragments}轻轻放在海面上。它不急着给出答案，只是在提醒你：这些细小的感觉，也可以先被看见。`;
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
  localStorage.setItem(modeStoreKey, mode);
  renderModeToggle();
  if (cardModal.classList.contains("open")) renderModalByMode();
}

function renderModeToggle() {
  choiceModeToggle.classList.toggle("active", state.mode === "choice");
  journalModeToggle.classList.toggle("active", state.mode === "journal");
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
  const labels = collectRecordLabels(entries);
  const words = entries.filter((entry) => entry.type === "keyword").map((entry) => entry.payload.text ?? "点亮的文字");
  [
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
  const first = new Date(year, month, 1);
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
    <div class="month-grid">
  `;
  ["日", "一", "二", "三", "四", "五", "六"].forEach((day) => {
    html += `<span class="weekday">${day}</span>`;
  });
  for (let i = 0; i < first.getDay(); i += 1) html += `<span></span>`;
  for (let day = 1; day <= days; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasRecord = Boolean(groups[key]?.length);
    const className = `day-button${hasRecord ? " has-record" : " no-record"}${calendarState.selectedDay === key ? " selected" : ""}`;
    html += `<button class="${className}" data-day="${key}" type="button" ${hasRecord ? "" : "disabled"}>${day}</button>`;
  }
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
  rootEl.querySelectorAll(".day-button.has-record").forEach((button) => {
    button.addEventListener("click", () => {
      calendarState.selectedDay = button.dataset.day;
      calendarState.detailCardKey = null;
      const entries = groups[calendarState.selectedDay] ?? [];
      renderCalendar();
      if (entries.length) openCalendarReview(calendarState.selectedDay, entries);
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
  return ["tag", "keyword", "card_open", "question_action", "photo_upload"].includes(entry.type);
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
  const labels = collectRecordLabels(group.entries);
  calendarReviewDetail.innerHTML = "";
  [
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
    empty.textContent = "这张卡还没有留下可回看的输入或标签。";
    calendarReviewDetail.appendChild(empty);
  }
}

function promptTextForRecord(entry) {
  const promptId = entry.payload.questionId ?? entry.payload.promptId;
  return promptBank.find((prompt) => prompt.id === promptId)?.text ?? "";
}

function collectRecordLabels(entries) {
  const labels = [];
  entries.forEach((entry) => {
    if (entry.type === "tag") labels.push(stripTagPrefix(entry.payload.label ?? entry.payload.tag ?? ""));
    if (entry.type === "question_action") labels.push(...(entry.payload.labels ?? []));
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
  activeMeshes.forEach((mesh) => {
    scene.remove(mesh);
    mesh.material.dispose();
  });
  activeMeshes.clear();
  state.lastChunkKey = "";
  updateChunks(true);
}

function resetView() {
  state.basePos.set(0, 0, initialCameraZ);
  state.velocity.set(0, 0, 0);
  state.targetVel.set(0, 0, 0);
  state.scrollAccum = 0;
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
  return [...items].sort((a, b) => seededRandom(seed + hashString(a.id)) - seededRandom(seed + hashString(b.id)));
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

renderer.domElement.addEventListener("pointerdown", onPointerDown);
renderer.domElement.addEventListener("pointermove", onPointerMove);
renderer.domElement.addEventListener("pointerup", onPointerUp);
renderer.domElement.addEventListener("pointercancel", onPointerUp);
renderer.domElement.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    state.scrollAccum += event.deltaY * 0.0048;
  },
  { passive: false },
);
renderer.domElement.addEventListener("mousemove", (event) => {
  state.mouse.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
});

document.getElementById("resetView").addEventListener("click", resetView);
document.getElementById("cardSetToggle").addEventListener("click", () => togglePanel(cardSetPanel));
document.getElementById("calendarToggle").addEventListener("click", () => {
  renderCalendar();
  togglePanel(calendarPanel);
});
weatherToggle.addEventListener("click", () => {
  state.weatherEnabled = !state.weatherEnabled;
  localStorage.setItem(weatherStoreKey, state.weatherEnabled ? "on" : "off");
  renderWeatherButton();
  rebuildScene();
});
choiceModeToggle.addEventListener("click", () => setMode("choice"));
journalModeToggle.addEventListener("click", () => setMode("journal"));
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
submitAnswerButton.addEventListener("click", submitAnswer);
photoInput.addEventListener("change", handlePhotoUpload);
window.addEventListener("resize", resize);
