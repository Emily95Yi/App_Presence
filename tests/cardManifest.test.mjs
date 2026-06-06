import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mainSource = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");

assert.match(
  mainSource,
  /relationship:\s*createNumberedCardImages\("relationship",\s*36,\s*"png"\)/,
);
assert.match(mainSource, /关系投射卡，36 张/);
