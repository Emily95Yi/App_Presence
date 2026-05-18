import * as THREE from "three";

const root = document.getElementById("sceneRoot");
const cardModal = document.getElementById("cardModal");
const focusCard = document.getElementById("focusCard");
const focusCtx = focusCard.getContext("2d");
const promptLayer = document.getElementById("promptLayer");
const answerInput = document.getElementById("answerInput");
const submitAnswerButton = document.getElementById("submitAnswer");
const liveTagResult = document.getElementById("liveTagResult");
const cardSetPanel = document.getElementById("cardSetPanel");
const calendarPanel = document.getElementById("calendarPanel");
const photoInput = document.getElementById("photoInput");

const recordStoreKey = "presence.records.v1";
const visibilityStoreKey = "presence.contentVisibility.v1";
const userStoreKey = "presence.localUserId.v1";
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
Efficiency|效率
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
  { id: "mist-soft", text: "这片雾里，有什么还不需要清楚？", scope: "set", setId: "mist", tags: ["模糊", "不确定"] },
  { id: "mist-card-1", text: "哪一块正在慢慢散开？", scope: "card", cardId: "mist-1", tags: ["散开", "雾"] },
  { id: "light-small", text: "这点光像一个开始，还是一个结束？", scope: "set", setId: "light", tags: ["光", "开始"] },
  { id: "light-card-2", text: "如果只保留一点亮，它在哪里？", scope: "card", cardId: "light-2", tags: ["亮", "保留"] },
  { id: "night-quiet", text: "夜色里什么声音变小了？", scope: "set", setId: "night", tags: ["安静", "夜"] },
  { id: "night-card-3", text: "这张卡想让你躲一会儿，还是出来一点？", scope: "card", cardId: "night-3", tags: ["躲起来", "出来"] },
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

const projectionSets = [
  makeCardSet("mist", "雾面", "模糊、不确定、还没说清", ["#dbece6", "#c7d7ea", "#efd77e", "#dfa28f"], 1100),
  makeCardSet("light", "微光", "一点亮、开始、慢慢靠近", ["#f3df91", "#cfe5db", "#f2b9a1", "#fff4c2"], 2200),
  makeCardSet("night", "夜色", "安静、躲藏、低声停留", ["#d7c4d7", "#b9c5d9", "#e6d8c7", "#a8b5aa"], 3300),
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
  { id: "projection", name: "投射", enabled: true, children: projectionSets },
  { id: "words", name: "Words", enabled: true, children: wordGroups },
  { id: "photos", name: "Photos", enabled: true, children: [photoSet] },
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
const calendarState = { month: new Date(), selectedDay: formatRecordDay(new Date().toISOString()) };

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
  selectedCard: null,
  selectedPrompts: [],
  currentPromptIndex: 0,
  answerSubmitted: false,
  selectedTags: new Set(),
  lastChunkKey: "",
};

const chunkOffsets = makeChunkOffsets();
resize();
renderContentPanel();
renderCalendar();
updateChunks(true);
animate();

function makeCardSet(id, name, description, colors, seedBase) {
  return {
    id,
    name,
    description,
    colors,
    enabled: true,
    cards: Array.from({ length: 8 }, (_, index) => ({
      id: `${id}-${index + 1}`,
      setId: id,
      title: `${name} ${index + 1}`,
      seed: seedBase + index * 137,
      kind: "projection",
      src: null,
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

async function persistEvent(entry) {
  const event = {
    id: entry.id,
    userId: entry.userId,
    type: entry.type,
    cardId: entry.payload.cardId,
    promptId: entry.payload.promptId,
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

function updateChunks(force = false) {
  const cx = Math.floor(state.basePos.x / chunkSize);
  const cy = Math.floor(state.basePos.y / chunkSize);
  const cz = Math.floor(state.basePos.z / chunkSize);
  const enabledKey =
    [...getEnabledProjectionSets(), ...wordGroups.filter((group) => group.enabled), ...(photoSet.enabled ? [photoSet] : [])]
      .map((item) => item.id)
      .join("|") || "none";
  const key = `${cx},${cy},${cz},${enabledKey}`;
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
  const enabledKey =
    [...getEnabledProjectionSets(), ...wordGroups.filter((group) => group.enabled), ...(photoSet.enabled ? [photoSet] : [])]
      .map((item) => item.id)
      .join("|") || "none";
  const key = `${cx},${cy},${cz},${enabledKey}`;
  if (planeCache.has(key)) return planeCache.get(key);

  const cards = getEnabledCards();
  const enabledWords = getEnabledWords();
  const items = [];
  const seed = hashString(key);
  for (let i = 0; i < 5; i += 1) {
    const s = seed + i * 997;
    const r = (n) => seededRandom(s + n);
    const isCard = cards.length > 0 && (enabledWords.length === 0 || r(6) > 0.32);
    const z = cz * chunkSize + r(2) * chunkSize - 18;
    const base = {
      id: `${key}-${i}`,
      chunkKey: key,
      position: new THREE.Vector3(
        cx * chunkSize + (r(0) - 0.5) * chunkSize,
        cy * chunkSize + (r(1) - 0.5) * chunkSize,
        z,
      ),
      seed: s,
      lit: false,
    };

    if (isCard) {
      const card = cards[Math.floor(r(5) * cards.length) % cards.length];
      const set = [...projectionSets, photoSet].find((candidate) => candidate.id === card.setId) ?? photoSet;
      items.push({
        ...base,
        id: `${key}-${i}-${card.id}`,
        kind: "card",
        card,
        set,
        scale: new THREE.Vector3(13 + r(3) * 12, 18 + r(4) * 15, 1),
      });
    } else if (enabledWords.length) {
      const word = enabledWords[Math.floor(r(5) * enabledWords.length) % enabledWords.length];
      items.push({
        ...base,
        id: `${key}-${i}-${word.id}`,
        kind: "word",
        word,
        text: word.text,
        groupId: word.groupId,
        scale: new THREE.Vector3(8 + Math.min(12, word.text.length * 1.1), 5.2, 1),
      });
    }
  }

  planeCache.set(key, items);
  if (planeCache.size > 260) planeCache.delete(planeCache.keys().next().value);
  return items;
}

function createMesh(item) {
  const texture = item.kind === "card" ? makeCardTexture(item.card) : makeWordTexture(item.text, false, item.seed);
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
  mesh.userData = item;
  mesh.visible = false;
  return mesh;
}

function makeCardTexture(card) {
  const key = `card-${card.id}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 680;
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
  canvas.width = 480;
  canvas.height = 150;
  const ctx = canvas.getContext("2d");
  const colors = ["#dbece6", "#efd77e", "#c7d7ea", "#dfa28f", "#d7c4d7", "#e9e1c7"];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.shadowColor = lit ? "rgba(52, 125, 112, 0.34)" : "rgba(22, 32, 27, 0.14)";
  ctx.shadowBlur = lit ? 28 : 18;
  roundedRect(ctx, 28, 38, canvas.width - 56, 74, 37);
  ctx.fillStyle = lit ? "#f3d56e" : colors[Math.abs(seed) % colors.length];
  ctx.fill();
  ctx.strokeStyle = lit ? "rgba(52, 125, 112, 0.52)" : "rgba(22, 32, 27, 0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.ink;
  ctx.font = `${text.length > 16 ? "600 25px" : "700 32px"} Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, 76, canvas.width - 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

function drawCardCanvas(ctx, width, height, card) {
  if (card.kind === "photo") {
    drawPhotoCardCanvas(ctx, width, height, card);
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
  ctx.globalAlpha = set.id === "night" ? 0.42 : 0.48;
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

function drawPhotoCardCanvas(ctx, width, height, card) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.shadowColor = "rgba(22, 32, 27, 0.24)";
  ctx.shadowBlur = 34;
  roundedRect(ctx, 34, 28, width - 68, height - 56, 34);
  ctx.fillStyle = palette.paper;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(22, 32, 27, 0.14)";
  ctx.lineWidth = 3;
  ctx.stroke();
  roundedRect(ctx, 68, 68, width - 136, height - 136, 20);
  ctx.clip();
  if (card.imageElement) {
    drawImageCover(ctx, card.imageElement, 68, 68, width - 136, height - 136);
  } else if (card.thumbDataUrl) {
    ctx.fillStyle = "#dbece6";
    ctx.fillRect(68, 68, width - 136, height - 136);
  }
  ctx.restore();
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
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 128;
  drawCardCanvas(canvas.getContext("2d"), canvas.width, canvas.height, card);
  return canvas.toDataURL("image/png");
}

async function handlePhotoUpload(event) {
  const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  for (const file of files) {
    const card = await createPhotoCard(file);
    photoSet.cards.unshift(card);
  }
  photoSet.enabled = true;
  saveVisibility();
  renderContentPanel();
  rebuildScene();
  event.target.value = "";
}

async function createPhotoCard(file) {
  const { imageBlob, thumbDataUrl, imageElement } = await compressImageFile(file);
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
  return { imageBlob, thumbDataUrl, imageElement };
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
  activeMeshes.forEach((mesh) => {
    const item = mesh.userData;
    reusableVector.copy(item.position);
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
    const tooCloseWord = item.kind === "word" && relativeDepth < 58;
    const target = relativeDepth > -26 && !tooCloseWord ? Math.min(gridFade, depthFade * depthFade) : 0;
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
  openModal(item);
}

function openModal(item) {
  state.selectedCard = item.card;
  state.selectedTags = new Set();
  state.currentPromptIndex = 0;
  state.answerSubmitted = false;
  answerInput.value = "";
  drawCardCanvas(focusCtx, focusCard.width, focusCard.height, item.card);
  state.selectedPrompts = selectPrompts(item.card, item.set, item.seed);
  renderCurrentPrompt();
  renderLiveTags("");
  cardModal.classList.add("open");
  cardModal.setAttribute("aria-hidden", "false");
  record("card_open", {
    cardId: item.card.id,
    setId: item.card.setId,
    title: item.card.title,
    thumbnail: cardThumbnail(item.card),
  });
}

function closeModal() {
  cardModal.classList.remove("open");
  cardModal.setAttribute("aria-hidden", "true");
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
  bubble.className = `prompt-bubble${state.answerSubmitted ? " answered" : ""}`;
  bubble.textContent = prompt
    ? `${state.currentPromptIndex + 1}/${state.selectedPrompts.length} ${prompt.text}`
    : "已经完成";
  promptLayer.appendChild(bubble);
  submitAnswerButton.textContent = state.answerSubmitted
    ? state.currentPromptIndex < state.selectedPrompts.length - 1
      ? "继续"
      : "完成"
    : "提交";
}

function getCurrentPrompt() {
  return state.selectedPrompts[state.currentPromptIndex] ?? null;
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
  if (state.answerSubmitted) {
    if (state.currentPromptIndex < state.selectedPrompts.length - 1) {
      state.currentPromptIndex += 1;
      state.answerSubmitted = false;
      answerInput.value = "";
      renderCurrentPrompt();
      renderLiveTags("");
    } else {
      closeModal();
    }
    return;
  }
  const text = answerInput.value.trim();
  const prompt = getCurrentPrompt();
  if (text) {
    record("answer", {
      cardId: state.selectedCard?.id ?? "unknown",
      setId: state.selectedCard?.setId ?? "unknown",
      promptId: prompt?.id,
      text,
      thumbnail: cardThumbnail(state.selectedCard),
    });
  }
  state.answerSubmitted = true;
  renderLiveTags(text);
  renderCurrentPrompt();
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
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const groups = groupedRecords();
  const monthLabel = `${year}-${String(month + 1).padStart(2, "0")}`;
  let html = `<div class="calendar-headline"><p class="panel-title">${monthLabel}</p></div><div class="month-grid">`;
  ["日", "一", "二", "三", "四", "五", "六"].forEach((day) => {
    html += `<span class="weekday">${day}</span>`;
  });
  for (let i = 0; i < first.getDay(); i += 1) html += `<span></span>`;
  for (let day = 1; day <= days; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const className = `day-button${groups[key]?.length ? " has-record" : ""}${calendarState.selectedDay === key ? " selected" : ""}`;
    html += `<button class="${className}" data-day="${key}" type="button">${day}</button>`;
  }
  html += `</div><section class="day-detail" id="dayDetail"></section>`;
  rootEl.innerHTML = html;
  rootEl.querySelectorAll(".day-button").forEach((button) => {
    button.addEventListener("click", () => {
      calendarState.selectedDay = button.dataset.day;
      renderCalendar();
    });
  });
  renderDayDetail(groups[calendarState.selectedDay] ?? []);
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
  return ["tag", "keyword", "card_open"].includes(entry.type);
}

function renderDayDetail(entries) {
  const detail = document.getElementById("dayDetail");
  detail.innerHTML = `<h3>${calendarState.selectedDay}</h3>`;
  if (!entries.length) {
    detail.innerHTML += `<p class="empty-state">这一天还没有留下记录。</p>`;
    return;
  }
  entries.slice().reverse().forEach((entry) => {
    detail.appendChild(renderCalendarEntry(entry));
  });
}

function renderCalendarEntry(entry) {
  const row = document.createElement("div");
  row.className = "calendar-entry";
  const thumb = document.createElement(entry.payload.thumbnail ? "img" : "div");
  thumb.className = "entry-thumb";
  if (entry.payload.thumbnail) thumb.src = entry.payload.thumbnail;
  const text = document.createElement("span");
  text.textContent = describeRecord(entry);
  row.append(thumb, text);
  return row;
}

function describeRecord(entry) {
  if (entry.type === "answer") return entry.payload.text;
  if (entry.type === "tag") return stripTagPrefix(entry.payload.label ?? entry.payload.tag);
  if (entry.type === "keyword") return entry.payload.text;
  if (entry.type === "card_open") return entry.payload.title ?? entry.payload.cardTitle ?? entry.payload.cardId ?? entry.payload.id ?? "卡牌";
  return entry.type;
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
document.getElementById("closeCardSetPanel").addEventListener("click", () => togglePanel(cardSetPanel));
document.getElementById("closeCalendarPanel").addEventListener("click", () => togglePanel(calendarPanel));
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("modalScrim").addEventListener("click", closeModal);
submitAnswerButton.addEventListener("click", submitAnswer);
photoInput.addEventListener("change", handlePhotoUpload);
answerInput.addEventListener("input", () => renderLiveTags(answerInput.value));
window.addEventListener("resize", resize);
