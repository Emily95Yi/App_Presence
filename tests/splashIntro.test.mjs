import assert from "node:assert/strict";
import { createSplashIntro, getSplashTiming } from "../src/splashIntro.js";

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.items = new Set();
  }

  add(...tokens) {
    tokens.forEach((token) => this.items.add(token));
    this.owner.className = [...this.items].join(" ");
  }

  contains(token) {
    return this.items.has(token);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.className = "";
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.parentNode = null;
  }

  append(...children) {
    children.forEach((child) => {
      child.parentNode = this;
      this.children.push(child);
    });
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  querySelector(selector) {
    if (!selector.startsWith(".")) return null;
    const className = selector.slice(1);
    return this.walk().find((child) => child.classList.contains(className)) ?? null;
  }

  walk() {
    return this.children.flatMap((child) => [child, ...child.walk()]);
  }
}

function createFakeDocument() {
  return {
    body: new FakeElement("body"),
    createElement: (tagName) => new FakeElement(tagName),
  };
}

function createFakeClock() {
  const timers = new Map();
  let nextId = 1;

  return {
    timers,
    setTimeout(callback, delay) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
}

const fakeDocument = createFakeDocument();
const fakeClock = createFakeClock();
let completed = false;
let revealed = false;

const splash = createSplashIntro({
  document: fakeDocument,
  logoSrc: "/assets/brand/presence-logo.png",
  onReveal: () => {
    revealed = true;
  },
  onComplete: () => {
    completed = true;
  },
  setTimeout: fakeClock.setTimeout,
  clearTimeout: fakeClock.clearTimeout,
});

assert.equal(fakeDocument.body.children.length, 1);
assert.ok(splash.element.classList.contains("splash-intro"));
assert.equal(splash.element.getAttribute("aria-hidden"), "true");
assert.equal(splash.element.querySelector(".splash-intro__logo").src, "/assets/brand/presence-logo.png");
assert.equal(fakeClock.timers.size, 2);

const timers = [...fakeClock.timers.entries()].sort((a, b) => a[1].delay - b[1].delay);
assert.equal(timers[0][1].delay, 900);
assert.equal(timers[1][1].delay, 4300);
timers[0][1].callback();
assert.equal(revealed, true);
assert.equal(completed, false);
assert.equal(fakeDocument.body.children.length, 1);
await timers[1][1].callback();
const leaveTimer = [...fakeClock.timers.entries()].find(([, timer]) => timer.delay === 700);
assert.ok(splash.element.classList.contains("splash-intro--leaving"));
assert.equal(completed, false);
assert.equal(fakeDocument.body.children.length, 1);
leaveTimer[1].callback();
assert.equal(completed, true);
assert.equal(fakeDocument.body.children.length, 0);

const secondDocument = createFakeDocument();
const secondClock = createFakeClock();
const secondSplash = createSplashIntro({
  document: secondDocument,
  logoSrc: "/assets/brand/presence-logo.png",
  onComplete: () => {
    throw new Error("destroy should cancel completion");
  },
  setTimeout: secondClock.setTimeout,
  clearTimeout: secondClock.clearTimeout,
});

assert.equal(secondClock.timers.size, 2);
secondSplash.destroy();
assert.equal(secondClock.timers.size, 0);
assert.equal(secondDocument.body.children.length, 0);

assert.deepEqual(
  getSplashTiming({ matchMedia: () => ({ matches: true }) }),
  { revealMs: 350, completeMs: 900, leaveMs: 200 },
);
assert.deepEqual(
  getSplashTiming({ matchMedia: () => ({ matches: false }) }),
  { revealMs: 900, completeMs: 4300, leaveMs: 700 },
);
