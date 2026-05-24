const targetDepth = {
  min: 132,
  ideal: 176,
  max: 280,
};

export function chooseIntroCameraTarget(meshes, basePos) {
  return [...meshes]
    .map((mesh) => mesh.userData ?? mesh)
    .filter((item) => item.kind === "card" && item.position)
    .map((item) => {
      const relativeDepth = basePos.z - item.position.z;
      const centerDistance = Math.hypot(item.position.x - basePos.x, item.position.y - basePos.y);
      const depthDistance = Math.abs(relativeDepth - targetDepth.ideal);
      return { item, relativeDepth, score: centerDistance * 0.18 + depthDistance };
    })
    .filter(({ relativeDepth }) => relativeDepth >= targetDepth.min && relativeDepth <= targetDepth.max)
    .sort((a, b) => a.score - b.score)[0]?.item ?? null;
}

export function createIntroCameraJourney({
  from,
  target,
  startedAt,
  durationMs = 5200,
  desiredDepth = 68,
}) {
  return {
    startedAt,
    durationMs,
    from: copyPoint(from),
    to: {
      x: target.position.x,
      y: target.position.y,
      z: target.position.z + desiredDepth,
    },
  };
}

export function sampleIntroCameraJourney(journey, nowMs) {
  const progress = clamp((nowMs - journey.startedAt) / journey.durationMs, 0, 1);
  const eased = easeOutQuart(progress);
  return {
    done: progress >= 1,
    position: {
      x: lerp(journey.from.x, journey.to.x, eased),
      y: lerp(journey.from.y, journey.to.y, eased),
      z: lerp(journey.from.z, journey.to.z, eased),
    },
  };
}

function copyPoint(point) {
  return { x: point.x, y: point.y, z: point.z };
}

function easeOutQuart(t) {
  return 1 - (1 - t) ** 4;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
