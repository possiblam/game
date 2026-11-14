// Pure decoupled puzzle & physics logic for World 1: «رازِ دو نیمه‌ی زمان» (سرزمین کرونوس)

export function evaluateAcousticSequence(inputSeq, targetSeq) {
  if (!Array.isArray(inputSeq) || !Array.isArray(targetSeq) || targetSeq.length === 0) {
    return { ok: false, complete: false, matchedCount: 0 };
  }
  for (let i = 0; i < inputSeq.length; i++) {
    if (inputSeq[i] !== targetSeq[i]) {
      return { ok: false, complete: false, matchedCount: i };
    }
  }
  return {
    ok: true,
    complete: inputSeq.length === targetSeq.length,
    matchedCount: inputSeq.length,
  };
}

export function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

export function isGearToothSolid(gearAngleDeg, targetAngleDeg, brokenSectors = []) {
  // brokenSectors: array of { startDeg, endDeg } in local gear coordinates (0..360)
  const localDeg = normalizeDeg(targetAngleDeg - gearAngleDeg);
  for (const sec of brokenSectors) {
    const start = normalizeDeg(sec.startDeg);
    const end = normalizeDeg(sec.endDeg);
    if (start <= end) {
      if (localDeg >= start && localDeg <= end) return false;
    } else {
      if (localDeg >= start || localDeg <= end) return false;
    }
  }
  return true;
}

// Ray-segment & ray-circle helpers for Solar-Prism Mirror Puzzle
function intersectRaySegment(ox, oy, dx, dy, x1, y1, x2, y2) {
  const sx = x2 - x1;
  const sy = y2 - y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-6) return null;
  const qx = x1 - ox;
  const qy = y1 - oy;
  const t = (qx * sy - qy * sx) / denom;
  const u = (qx * dy - qy * dx) / denom;
  if (t > 2.5 && u >= 0 && u <= 1) {
    return { t, u, x: ox + dx * t, y: oy + dy * t };
  }
  return null;
}

function intersectRayCircle(ox, oy, dx, dy, cx, cy, r) {
  const fx = ox - cx;
  const fy = oy - cy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const sqrtD = Math.sqrt(disc);
  const t1 = (-b - sqrtD) / 2;
  const t2 = (-b + sqrtD) / 2;
  const t = t1 > 2.5 ? t1 : t2 > 2.5 ? t2 : -1;
  if (t <= 2.5) return null;
  return { t, x: ox + dx * t, y: oy + dy * t };
}

function traceSingleRay({ ox, oy, dx, dy, color, mirrors, prism, sensors, blockers, bounds, maxBounces = 6 }) {
  const segments = [];
  const hitSensors = new Set();
  let hitPrism = false;
  let prismHitPoint = null;

  const boundaryWalls = [
    { x1: 0, y1: 0, x2: bounds.w, y2: 0 },
    { x1: bounds.w, y1: 0, x2: bounds.w, y2: bounds.h },
    { x1: bounds.w, y1: bounds.h, x2: 0, y2: bounds.h },
    { x1: 0, y1: bounds.h, x2: 0, y2: 0 },
  ];

  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let closest = { t: Infinity, kind: 'none', x: ox + dx * 1000, y: oy + dy * 1000 };

    if (color === 'white' && prism) {
      const pHit = intersectRayCircle(ox, oy, dx, dy, prism.x, prism.y, prism.r);
      if (pHit && pHit.t < closest.t) {
        closest = { ...pHit, kind: 'prism' };
      }
    }

    for (const s of sensors) {
      const sHit = intersectRayCircle(ox, oy, dx, dy, s.x, s.y, s.r);
      if (sHit && sHit.t < closest.t) {
        closest = { ...sHit, kind: 'sensor', sensor: s };
      }
    }

    for (const b of blockers) {
      const edges = [
        { x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y },
        { x1: b.x + b.w, y1: b.y, x2: b.x + b.w, y2: b.y + b.h },
        { x1: b.x + b.w, y1: b.y + b.h, x2: b.x, y2: b.y + b.h },
        { x1: b.x, y1: b.y + b.h, x2: b.x, y2: b.y },
      ];
      for (const edge of edges) {
        const hit = intersectRaySegment(ox, oy, dx, dy, edge.x1, edge.y1, edge.x2, edge.y2);
        if (hit && hit.t < closest.t) {
          closest = { ...hit, kind: 'blocker' };
        }
      }
    }

    for (const m of mirrors) {
      const mRad = (m.angleDeg * Math.PI) / 180;
      const half = (m.length || 68) / 2;
      const mx = Math.cos(mRad) * half;
      const my = Math.sin(mRad) * half;
      const hit = intersectRaySegment(ox, oy, dx, dy, m.x - mx, m.y - my, m.x + mx, m.y + my);
      if (hit && hit.t < closest.t) {
        closest = { ...hit, kind: 'mirror', mirror: m };
      }
    }

    for (const wall of boundaryWalls) {
      const hit = intersectRaySegment(ox, oy, dx, dy, wall.x1, wall.y1, wall.x2, wall.y2);
      if (hit && hit.t < closest.t) {
        closest = { ...hit, kind: 'wall' };
      }
    }

    segments.push({ x1: ox, y1: oy, x2: closest.x, y2: closest.y, color, hitKind: closest.kind });

    if (closest.kind === 'prism') {
      hitPrism = true;
      prismHitPoint = { x: closest.x, y: closest.y };
      break;
    }

    if (closest.kind === 'sensor') {
      if (closest.sensor.color === color) {
        hitSensors.add(closest.sensor.id);
      }
      break;
    }

    if (closest.kind !== 'mirror') {
      break;
    }

    const mRad = (closest.mirror.angleDeg * Math.PI) / 180;
    const tx = Math.cos(mRad);
    const ty = Math.sin(mRad);
    let nx = -ty;
    let ny = tx;
    const dot = dx * nx + dy * ny;
    if (dot > 0) {
      nx = -nx;
      ny = -ny;
    }
    const rDot = dx * nx + dy * ny;
    dx = dx - 2 * rDot * nx;
    dy = dy - 2 * rDot * ny;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    ox = closest.x;
    oy = closest.y;
  }

  return { segments, hitPrism, prismHitPoint, hitSensors: [...hitSensors] };
}

export function traceChronosSolarPrism({
  emitter,
  mirrors,
  prism,
  sensors,
  blockers = [],
  bounds = { w: 780, h: 420 },
}) {
  const rad = (emitter.angleDeg * Math.PI) / 180;
  const whiteResult = traceSingleRay({
    ox: emitter.x,
    oy: emitter.y,
    dx: Math.cos(rad),
    dy: Math.sin(rad),
    color: 'white',
    mirrors,
    prism,
    sensors,
    blockers,
    bounds,
  });

  const allSegments = [...whiteResult.segments];
  const litSensorIds = new Set(whiteResult.hitSensors);

  if (whiteResult.hitPrism) {
    // Prism splits incoming sunlight into 3 spectrum beams: red (-35 deg), yellow (0 deg), blue (+35 deg)
    const splits = [
      { color: 'red', angleDeg: prism.redAngleDeg ?? -35 },
      { color: 'yellow', angleDeg: prism.yellowAngleDeg ?? 25 },
      { color: 'blue', angleDeg: prism.blueAngleDeg ?? 65 },
    ];
    for (const sp of splits) {
      const sRad = (sp.angleDeg * Math.PI) / 180;
      const dx = Math.cos(sRad);
      const dy = Math.sin(sRad);
      const res = traceSingleRay({
        ox: prism.x + dx * (prism.r + 3),
        oy: prism.y + dy * (prism.r + 3),
        dx,
        dy,
        color: sp.color,
        mirrors,
        prism: null,
        sensors,
        blockers,
        bounds,
      });
      allSegments.push(...res.segments);
      res.hitSensors.forEach((id) => litSensorIds.add(id));
    }
  }

  const requiredIds = sensors.map((s) => s.id);
  const solved = requiredIds.length > 0 && requiredIds.every((id) => litSensorIds.has(id));

  return {
    segments: allSegments,
    prismLit: whiteResult.hitPrism,
    litSensorIds: [...litSensorIds],
    solved,
  };
}

export function evaluateWaterScale({
  leftWater = 0,
  rightWater = 0,
  leftWeights = [],
  rightWeights = [],
  maxWater = 12,
  minBalancedTotal = 8,
}) {
  const leftWeightSum = leftWeights.reduce((acc, w) => acc + Number(w || 0), 0);
  const rightWeightSum = rightWeights.reduce((acc, w) => acc + Number(w || 0), 0);
  const leftTotal = Math.round((leftWater + leftWeightSum) * 10) / 10;
  const rightTotal = Math.round((rightWater + rightWeightSum) * 10) / 10;

  const overflowLeft = leftWater > maxWater;
  const overflowRight = rightWater > maxWater;
  const overflow = overflowLeft || overflowRight;

  const diff = rightTotal - leftTotal;
  const tiltDeg = Math.max(-18, Math.min(18, diff * 1.8));
  const balanced = !overflow && Math.abs(diff) <= 0.25 && leftTotal >= minBalancedTotal && rightTotal >= minBalancedTotal;

  return {
    leftTotal,
    rightTotal,
    diff,
    tiltDeg,
    overflow,
    overflowSide: overflowLeft ? 'left' : overflowRight ? 'right' : null,
    balanced,
  };
}

export function stepSonarMazeMove(grid, pos, dir) {
  const deltas = {
    up: { dr: -1, dc: 0 },
    down: { dr: 1, dc: 0 },
    left: { dr: 0, dc: -1 },
    right: { dr: 0, dc: 1 },
  };
  const d = deltas[dir];
  if (!d) return { moved: false, pos, event: 'none' };

  const nr = pos.r + d.dr;
  const nc = pos.c + d.dc;
  if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) {
    return { moved: false, pos, event: 'wall' };
  }

  const cell = grid[nr][nc];
  if (cell === '#') {
    return { moved: false, pos, event: 'wall' };
  }
  if (cell === 'X') {
    return { moved: true, pos: { r: nr, c: nc }, event: 'spike' };
  }
  if (cell === 'E') {
    return { moved: true, pos: { r: nr, c: nc }, event: 'exit' };
  }
  return { moved: true, pos: { r: nr, c: nc }, event: 'ok' };
}

export function validateColorStoneStep(targetSeq, stepIdx, chosenColor) {
  if (!Array.isArray(targetSeq) || stepIdx < 0 || stepIdx >= targetSeq.length) {
    return { ok: false, complete: false };
  }
  const ok = targetSeq[stepIdx] === chosenColor;
  return {
    ok,
    complete: ok && stepIdx + 1 === targetSeq.length,
  };
}

export function isChronosConstellationSolved(rings, targetRings, starSlot, targetStarSlot) {
  if (!Array.isArray(rings) || !Array.isArray(targetRings) || rings.length !== targetRings.length) {
    return false;
  }
  const ringsMatch = rings.every((angle, i) => normalizeDeg(angle) === normalizeDeg(targetRings[i]));
  return ringsMatch && starSlot === targetStarSlot;
}
