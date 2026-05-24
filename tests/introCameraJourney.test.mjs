import assert from "node:assert/strict";
import {
  chooseIntroCameraTarget,
  createIntroCameraJourney,
  sampleIntroCameraJourney,
} from "../src/introCameraJourney.js";

const basePos = { x: 0, y: 0, z: 92 };
const target = chooseIntroCameraTarget(
  [
    { userData: { kind: "word", position: { x: 0, y: 0, z: -80 } } },
    { userData: { kind: "card", position: { x: 42, y: 8, z: -180 } } },
    { userData: { kind: "card", position: { x: 8, y: -6, z: -64 } } },
    { userData: { kind: "card", position: { x: 200, y: 20, z: -70 } } },
  ],
  basePos,
);

assert.deepEqual(target.position, { x: 8, y: -6, z: -64 });

const journey = createIntroCameraJourney({
  from: basePos,
  target,
  startedAt: 100,
  durationMs: 4200,
  desiredDepth: 34,
});

assert.deepEqual(sampleIntroCameraJourney(journey, 100).position, basePos);

const midpoint = sampleIntroCameraJourney(journey, 2200);
assert.equal(midpoint.done, false);
assert.ok(midpoint.position.x > 0);
assert.ok(midpoint.position.y < 0);
assert.ok(midpoint.position.z < basePos.z);

const almostDone = sampleIntroCameraJourney(journey, 3800);
const final = sampleIntroCameraJourney(journey, 4600);
assert.equal(final.done, true);
assert.deepEqual(final.position, { x: 8, y: -6, z: -30 });
assert.ok(final.position.z - almostDone.position.z < 2.5);
