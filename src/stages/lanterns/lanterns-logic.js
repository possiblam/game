// Pure decoupled puzzle logic for World 2: «راز دوازده نشان؛ گنج دو فانوس»

// =========================================================================
// 1. Stage 1 (Daytime): Shadow Clocktower Mirror Beam Tracer
// =========================================================================
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

export function traceSunBeam({ emitter, mirrors, blockers, sensor, bounds = { w: 800, h: 440 }, maxBounces = 8 }) {
  let ox = emitter.x;
  let oy = emitter.y;
  const rad = (emitter.angleDeg * Math.PI) / 180;
  let dx = Math.cos(rad);
  let dy = Math.sin(rad);

  const segments = [];
  const hitMirrorIds = new Set();
  let hitSensor = false;

  const boundaryWalls = [
    { x1: 0, y1: 0, x2: bounds.w, y2: 0 },
    { x1: bounds.w, y1: 0, x2: bounds.w, y2: bounds.h },
    { x1: bounds.w, y1: bounds.h, x2: 0, y2: bounds.h },
    { x1: 0, y1: bounds.h, x2: 0, y2: 0 },
  ];

  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let closest = { t: Infinity, kind: 'none', x: ox + dx * 1000, y: oy + dy * 1000 };

    // Sensor circle
    const sHit = intersectRayCircle(ox, oy, dx, dy, sensor.x, sensor.y, sensor.r);
    if (sHit && sHit.t < closest.t) {
      closest = { ...sHit, kind: 'sensor' };
    }

    // Blocker segments (each rect = 4 edges)
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

    // Rotatable mirrors
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

    // Outer bounds
    for (const wall of boundaryWalls) {
      const hit = intersectRaySegment(ox, oy, dx, dy, wall.x1, wall.y1, wall.x2, wall.y2);
      if (hit && hit.t < closest.t) {
        closest = { ...hit, kind: 'wall' };
      }
    }

    segments.push({ x1: ox, y1: oy, x2: closest.x, y2: closest.y, hitKind: closest.kind });

    if (closest.kind === 'sensor') {
      hitSensor = true;
      break;
    }

    if (closest.kind !== 'mirror') {
      break;
    }

    hitMirrorIds.add(closest.mirror.id);

    // Reflect velocity vector over mirror normal
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
    const dDotN = dx * nx + dy * ny;
    dx = dx - 2 * dDotN * nx;
    dy = dy - 2 * dDotN * ny;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    ox = closest.x;
    oy = closest.y;
  }

  return {
    segments,
    hitMirrorIds: [...hitMirrorIds],
    hitSensor,
  };
}

// =========================================================================
// 2. Stage 2 (Daytime): Smart Greenhouse Pipe & Valve Flow
// Directions: 0 = Top, 1 = Right, 2 = Bottom, 3 = Left
// =========================================================================
const PIPE_BASE_PORTS = {
  empty: [],
  tank: [2, 3], // Bottom + Left
  plant: [0, 1, 2, 3],
  straight: [1, 3],
  corner: [1, 2],
  tee: [1, 2, 3],
  valve: [1, 3], // Straight when open; blocked when closed
  cross: [0, 1, 2, 3],
};

export function getPipePorts(cell) {
  if (!cell || cell.type === 'empty') return [];
  if (cell.type === 'valve' && !cell.open) return [];
  if (cell.type === 'tank') return cell.ports || [2, 3];
  if (cell.type === 'plant') return cell.ports || [0, 1, 2, 3];
  const base = PIPE_BASE_PORTS[cell.type] || [];
  const rot = (((cell.rotation || 0) % 4) + 4) % 4;
  return base.map((d) => (d + rot) % 4);
}

const FLOW_DIRS = [
  { dr: -1, dc: 0, opp: 2 },
  { dr: 0, dc: 1, opp: 3 },
  { dr: 1, dc: 0, opp: 0 },
  { dr: 0, dc: -1, opp: 1 },
];

export function evaluateWaterFlow(grid, tankPos, plantPositions) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const wetKeys = new Set();
  const queue = [{ r: tankPos.r, c: tankPos.c }];
  wetKeys.add(`${tankPos.r},${tankPos.c}`);

  while (queue.length > 0) {
    const cur = queue.shift();
    const cell = grid[cur.r][cur.c];
    const ports = getPipePorts(cell);

    for (const dir of ports) {
      const d = FLOW_DIRS[dir];
      const nr = cur.r + d.dr;
      const nc = cur.c + d.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const neighbor = grid[nr][nc];
      const neighborPorts = getPipePorts(neighbor);
      if (!neighborPorts.includes(d.opp)) continue;

      const key = `${nr},${nc}`;
      if (!wetKeys.has(key)) {
        wetKeys.add(key);
        queue.push({ r: nr, c: nc });
      }
    }
  }

  const wateredPlants = plantPositions.filter((p) => wetKeys.has(`${p.r},${p.c}`));
  return {
    wetKeys,
    wateredCount: wateredPlants.length,
    allWatered: wateredPlants.length === plantPositions.length,
  };
}

// =========================================================================
// 3. Stage 3 (Daytime): Gear Bridge Mechanical Chain
// =========================================================================
export function evaluateGearTrain(placedSizes, expectedSizes) {
  if (!Array.isArray(placedSizes) || !Array.isArray(expectedSizes)) {
    return { meshedCount: 0, solved: false, spins: [] };
  }
  let meshedCount = 0;
  let allMatch = placedSizes.length === expectedSizes.length;

  for (let i = 0; i < expectedSizes.length; i++) {
    if (placedSizes[i] === expectedSizes[i]) {
      meshedCount += 1;
    } else {
      allMatch = false;
    }
  }

  // Alternating spin directions once chained from the motor
  const spins = expectedSizes.map((_, i) => (allMatch ? (i % 2 === 0 ? 1 : -1) : 0));
  return {
    meshedCount,
    solved: allMatch,
    spins,
  };
}

// =========================================================================
// 4. Stage 4 (Daytime): Mine Ore Sorting
// =========================================================================
export function routeMineOre({ shape, color, div1, div2 }) {
  // div1: 'blue' -> Bin A (blue circle) | 'pass' -> continues to div2
  // div2: 'red' -> Bin B (red triangle) | 'gold' -> Bin C (gold hexagon)
  let actualBin = '';
  if (div1 === 'blue') {
    actualBin = 'blue';
  } else {
    actualBin = div2 === 'red' ? 'red' : 'gold';
  }
  const expectedBin = color === 'blue' && shape === 'circle'
    ? 'blue'
    : color === 'red' && shape === 'triangle'
    ? 'red'
    : 'gold';

  return {
    actualBin,
    expectedBin,
    isCorrect: actualBin === expectedBin,
  };
}

// =========================================================================
// 5. Stage 6 (Daytime): Floating River Platforms Equilibrium
// =========================================================================
export function evaluateFloatingBridge(platforms) {
  // Each platform: { id, currentLoad, idealLoad, locked, ropeConnected }
  const results = platforms.map((p) => {
    const diff = p.currentLoad - p.idealLoad;
    const balanced = diff === 0;
    const ready = balanced && p.locked && p.ropeConnected;
    return { id: p.id, diff, balanced, ready };
  });
  return {
    platforms: results,
    balancedCount: results.filter((r) => r.balanced).length,
    solved: results.every((r) => r.ready),
  };
}

// =========================================================================
// 6. Stage 8 (Nighttime): Observatory Constellation Alignment
// =========================================================================
export function normalizeDeg(deg) {
  return ((Math.round(deg) % 360) + 360) % 360;
}

export function isConstellationAligned({ telescopeDeg, ringAngles, targetTelescopeDeg = 0, targetRingDeg = 0 }) {
  const teleAligned = normalizeDeg(telescopeDeg) === normalizeDeg(targetTelescopeDeg);
  const ringsAligned = ringAngles.every((deg) => normalizeDeg(deg) === normalizeDeg(targetRingDeg));
  return {
    teleAligned,
    ringsAligned,
    alignedCount: ringAngles.filter((d) => normalizeDeg(d) === normalizeDeg(targetRingDeg)).length,
    solved: teleAligned && ringsAligned,
  };
}

// =========================================================================
// 7. Stage 9 (Nighttime): Cold Vault Sequential Temperature Gate
// =========================================================================
export function validateCryoActivationStep({ chamberIndex, temps, targetTemps, activatedOrder, expectedOrder }) {
  const nextIndex = expectedOrder[activatedOrder.length];
  if (chamberIndex !== nextIndex) {
    return { ok: false, reason: 'order', nextOrder: [] };
  }
  if (temps[chamberIndex] !== targetTemps[chamberIndex]) {
    return { ok: false, reason: 'temp', nextOrder: activatedOrder };
  }
  const nextOrder = [...activatedOrder, chamberIndex];
  return {
    ok: true,
    reason: null,
    nextOrder,
    solved: nextOrder.length === expectedOrder.length,
  };
}

// =========================================================================
// 8. Stage 10 (Nighttime): Dual-Color Moving Mirror & Prism Maze
// =========================================================================
// Grid-based optical reflection (4 cardinal dirs: 0=Up, 1=Right, 2=Down, 3=Left)
// Mirrors: 'slash' (/), 'backslash' (\)
export function traceGridOpticalMaze({ cols, rows, emitters, cells, maxSteps = 30 }) {
  const delta = [
    { dr: -1, dc: 0 }, // 0: Up
    { dr: 0, dc: 1 },  // 1: Right
    { dr: 1, dc: 0 },  // 2: Down
    { dr: 0, dc: -1 }, // 3: Left
  ];

  const beams = [];
  const activeReceivers = new Set();

  const queue = emitters.map((e) => ({
    r: e.r,
    c: e.c,
    dir: e.dir,
    color: e.color,
    path: [{ r: e.r, c: e.c }],
    steps: 0,
  }));

  while (queue.length > 0) {
    const ray = queue.shift();
    if (ray.steps >= maxSteps) {
      beams.push(ray);
      continue;
    }

    const d = delta[ray.dir];
    const nr = ray.r + d.dr;
    const nc = ray.c + d.dc;

    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
      beams.push(ray);
      continue;
    }

    const cell = cells[nr][nc];
    const nextPath = [...ray.path, { r: nr, c: nc }];

    if (cell.kind === 'wall') {
      beams.push({ ...ray, path: nextPath });
      continue;
    }

    if (cell.kind === 'receiver') {
      if (cell.color === ray.color) {
        activeReceivers.add(cell.id);
      }
      beams.push({ ...ray, path: nextPath });
      continue;
    }

    if (cell.kind === 'prism') {
      // Splits incoming light into Cyan (Right=1) and Magenta (Down=2) if traveling Right/Down
      beams.push({ ...ray, path: nextPath });
      if (ray.color === 'white') {
        queue.push({ r: nr, c: nc, dir: 1, color: 'cyan', path: [{ r: nr, c: nc }], steps: ray.steps + 1 });
        queue.push({ r: nr, c: nc, dir: 2, color: 'magenta', path: [{ r: nr, c: nc }], steps: ray.steps + 1 });
      }
      continue;
    }

    if (cell.kind === 'mirror') {
      // slash '/': 0<->1, 2<->3 ; backslash '\': 0<->3, 1<->2
      let nextDir = ray.dir;
      if (cell.mirrorType === 'slash') {
        const map = { 0: 1, 1: 0, 2: 3, 3: 2 };
        nextDir = map[ray.dir];
      } else {
        const map = { 0: 3, 3: 0, 1: 2, 2: 1 };
        nextDir = map[ray.dir];
      }
      queue.push({
        r: nr,
        c: nc,
        dir: nextDir,
        color: ray.color,
        path: nextPath,
        steps: ray.steps + 1,
      });
      continue;
    }

    // Empty space continues straight
    queue.push({
      r: nr,
      c: nc,
      dir: ray.dir,
      color: ray.color,
      path: nextPath,
      steps: ray.steps + 1,
    });
  }

  return {
    beams,
    activeReceivers: [...activeReceivers],
  };
}

// =========================================================================
// 9. Stage 11 (Nighttime): Rescue Cable Car Pulley & Weight Equilibrium
// =========================================================================
export function evaluateCableCarSystem({
  cableConnected,
  leftPulleyDir,
  rightPulleyDir,
  selectedWeights,
  targetWeight = 30,
}) {
  const totalWeight = selectedWeights.reduce((acc, w) => acc + w, 0);
  const weightBalanced = totalWeight === targetWeight;
  const pulleysAligned = leftPulleyDir === 'forward' && rightPulleyDir === 'forward';
  return {
    totalWeight,
    weightBalanced,
    pulleysAligned,
    cableConnected: Boolean(cableConnected),
    readyToRun: Boolean(cableConnected) && weightBalanced && pulleysAligned,
  };
}
