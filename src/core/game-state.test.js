import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  normalizeGameState,
  isStageUnlocked,
  hasRequiredKeyForStage,
  isFinalUnlocked,
  isWorldUnlocked,
  setActiveWorld,
  setSelectedHero,
  calculateStars,
  applyStageCompletion,
  applyDecoyDiscovery,
  applyFinalVictory,
  getTotalCompletedStages,
  getTotalStars,
  getTotalXP,
} from './game-state.js';
import { evaluatePlatformPath, areRingsAligned } from '../stages/puzzle-logic.js';
import {
  traceSunBeam,
  evaluateWaterFlow,
  evaluateGearTrain,
  routeMineOre,
  evaluateFloatingBridge,
  isConstellationAligned,
  validateCryoActivationStep,
  traceGridOpticalMaze,
  evaluateCableCarSystem,
} from '../stages/lanterns/lanterns-logic.js';
import { toPersianDigits } from '../data/translations.js';
import {
  clampZoom,
  clampPan,
  computeZoomAroundPoint,
  computePercentFocusTransform,
} from '../map/zoom-math.js';
import {
  evaluateAcousticSequence,
  isGearToothSolid,
  traceChronosSolarPrism,
  evaluateWaterScale,
  stepSonarMazeMove,
  validateColorStoneStep,
  isChronosConstellationSolved,
} from '../stages/chronos/chronos-logic.js';

test('stage 1 is unlocked on both routes while stages 2..6 start locked', () => {
  const state = createInitialGameState();
  assert.equal(isStageUnlocked(state, 'daytime', 1), true);
  assert.equal(isStageUnlocked(state, 'nighttime', 1), true);
  assert.equal(isStageUnlocked(state, 'daytime', 2), false);
  assert.equal(isStageUnlocked(state, 'nighttime', 2), false);
  assert.equal(isFinalUnlocked(state), false);
});

test('completing stage 2 grants route key and stage 3 requires that key in key-gated worlds', () => {
  let state = createInitialGameState();
  // World 1 (twin-times) does not gate stage 3 with keys
  assert.equal(hasRequiredKeyForStage(state, 'daytime', 3, 'twin-times'), true);

  // World 2 (two-worlds) requires route keys on stage 3
  assert.equal(hasRequiredKeyForStage(state, 'daytime', 3, 'two-worlds'), false);
  assert.equal(hasRequiredKeyForStage(state, 'nighttime', 3, 'two-worlds'), false);

  state = applyStageCompletion(state, { route: 'daytime', stageNumber: 1, stars: 3, worldId: 'two-worlds' });
  assert.equal(isStageUnlocked(state, 'daytime', 2, 'two-worlds'), true);
  assert.equal(isStageUnlocked(state, 'nighttime', 2, 'two-worlds'), false);

  state = applyStageCompletion(state, {
    route: 'daytime',
    stageNumber: 2,
    stars: 3,
    grantedKey: 'magnetic',
    worldId: 'two-worlds',
  });
  assert.equal(state.worlds['two-worlds'].keys.magnetic, true);
  assert.equal(state.worlds['two-worlds'].keys.silver, false);
  assert.equal(hasRequiredKeyForStage(state, 'daytime', 3, 'two-worlds'), true);
  assert.equal(hasRequiredKeyForStage(state, 'nighttime', 3, 'two-worlds'), false);
});

test('decoy discovery records state without advancing stage count or unlocking final', () => {
  let state = createInitialGameState();
  state = applyDecoyDiscovery(state, 'daytime');
  state = applyDecoyDiscovery(state, 'nighttime');
  assert.equal(state.decoyDiscovered.daytime, true);
  assert.equal(state.decoyDiscovered.nighttime, true);
  assert.equal(getTotalCompletedStages(state), 0);
  assert.equal(isFinalUnlocked(state), false);
});

test('3-world ladder unlocks sequentially: twin-times -> two-worlds -> two-lanterns', () => {
  let state = createInitialGameState();
  assert.equal(state.activeWorldId, 'twin-times');
  assert.equal(isWorldUnlocked(state, 'twin-times'), true);
  assert.equal(isWorldUnlocked(state, 'two-worlds'), false);
  assert.equal(isWorldUnlocked(state, 'two-lanterns'), false);

  // Attempting to switch to locked World 2 or 3 must be ignored
  assert.equal(setActiveWorld(state, 'two-worlds').activeWorldId, 'twin-times');
  assert.equal(setActiveWorld(state, 'two-lanterns').activeWorldId, 'twin-times');

  // Complete all 12 stages of Chronos (twin-times)
  for (let i = 1; i <= 6; i++) {
    state = applyStageCompletion(state, { route: 'daytime', stageNumber: i, stars: 3, worldId: 'twin-times' });
  }
  assert.equal(isFinalUnlocked(state, 'twin-times'), false);
  assert.equal(getTotalCompletedStages(state, 'twin-times'), 6);

  for (let i = 1; i <= 5; i++) {
    state = applyStageCompletion(state, { route: 'nighttime', stageNumber: i, stars: 2, worldId: 'twin-times' });
  }
  assert.equal(isFinalUnlocked(state, 'twin-times'), false);

  state = applyStageCompletion(state, { route: 'nighttime', stageNumber: 6, stars: 3, worldId: 'twin-times' });
  assert.equal(isFinalUnlocked(state, 'twin-times'), true);
  assert.equal(getTotalCompletedStages(state, 'twin-times'), 12);
  assert.equal(getTotalStars(state, 'twin-times'), 6 * 3 + 5 * 2 + 3);
  assert.equal(isWorldUnlocked(state, 'two-worlds'), false);

  state = applyFinalVictory(state, 'twin-times');
  assert.equal(isWorldUnlocked(state, 'two-worlds'), true);
  assert.equal(isWorldUnlocked(state, 'two-lanterns'), false);

  // Switch to two-worlds and conquer it to unlock two-lanterns
  state = setActiveWorld(state, 'two-worlds');
  assert.equal(state.activeWorldId, 'two-worlds');
  for (let i = 1; i <= 6; i++) {
    state = applyStageCompletion(state, {
      route: 'daytime',
      stageNumber: i,
      stars: 3,
      grantedKey: i === 2 ? 'magnetic' : null,
      worldId: 'two-worlds',
    });
    state = applyStageCompletion(state, {
      route: 'nighttime',
      stageNumber: i,
      stars: 3,
      grantedKey: i === 2 ? 'silver' : null,
      worldId: 'two-worlds',
    });
  }
  state = applyFinalVictory(state, 'two-worlds');
  assert.equal(isWorldUnlocked(state, 'two-lanterns'), true);

  state = setActiveWorld(state, 'two-lanterns');
  assert.equal(state.activeWorldId, 'two-lanterns');
  assert.equal(getTotalCompletedStages(state, 'two-lanterns'), 0);
  assert.equal(getTotalCompletedStages(state, 'twin-times'), 12);

  state = setSelectedHero(state, 'raha');
  assert.equal(state.selectedHero, 'raha');
  assert.ok(getTotalXP(state) > 0);
});

test('v1 saved state migrates cleanly into v2 multi-world state', () => {
  const v1Save = {
    version: 1,
    hasStarted: true,
    introSeen: true,
    muted: true,
    completedStages: { daytime: [1, 2, 3, 4, 5, 6], nighttime: [1, 2, 3, 4, 5, 6] },
    stars: { 'daytime-1': 3 },
    keys: { magnetic: true, silver: true },
    decoyDiscovered: { daytime: true, nighttime: false },
    finalCompleted: true,
  };
  const migrated = normalizeGameState(v1Save);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.activeWorldId, 'two-worlds');
  assert.equal(migrated.muted, true);
  assert.equal(isWorldUnlocked(migrated, 'two-worlds'), true);
  assert.equal(isWorldUnlocked(migrated, 'two-lanterns'), true);
  assert.equal(getTotalCompletedStages(migrated, 'two-worlds'), 12);
  assert.equal(getTotalCompletedStages(migrated, 'two-lanterns'), 0);
});

test('calculateStars awards 1..3 stars fairly based on attempts, hints, and time', () => {
  assert.equal(calculateStars({ attempts: 1, hintsUsed: 0, elapsedSeconds: 20, targetSeconds: 45 }), 3);
  assert.equal(calculateStars({ attempts: 3, hintsUsed: 1, elapsedSeconds: 30, targetSeconds: 45 }), 2);
  assert.equal(calculateStars({ attempts: 8, hintsUsed: 3, elapsedSeconds: 200, targetSeconds: 45 }), 1);
});

test('rotating platform solver finds connected path only when aligned', () => {
  const unsolved = [
    [
      { type: 'straight', rotation: 1 },
      { type: 'corner', rotation: 2 },
      { type: 'corner', rotation: 3 },
      { type: 'tee', rotation: 0 },
    ],
    [
      { type: 'end', rotation: 0 },
      { type: 'corner', rotation: 0 },
      { type: 'corner', rotation: 0 },
      { type: 'start', rotation: 0 },
    ],
  ];
  assert.equal(evaluatePlatformPath(unsolved, { r: 1, c: 3 }, { r: 1, c: 0 }).solved, false);

  const solved = [
    [
      { type: 'straight', rotation: 0 },
      { type: 'corner', rotation: 0 },
      { type: 'corner', rotation: 1 },
      { type: 'tee', rotation: 0 },
    ],
    [
      { type: 'end', rotation: 0 },
      { type: 'corner', rotation: 2 },
      { type: 'corner', rotation: 3 },
      { type: 'start', rotation: 0 },
    ],
  ];
  const res = evaluatePlatformPath(solved, { r: 1, c: 3 }, { r: 1, c: 0 });
  assert.equal(res.solved, true);
  assert.equal(res.path.length, 6);
});

test('areRingsAligned and toPersianDigits work accurately', () => {
  assert.equal(areRingsAligned([0, 360, 720]), true);
  assert.equal(areRingsAligned([0, 45, 0]), false);
  assert.equal(toPersianDigits('12 / 36'), '۱۲ / ۳۶');
});

test('map zoom and pan math clamps bounds and preserves focal point', () => {
  assert.equal(clampZoom(0.5), 1);
  assert.equal(clampZoom(5), 3.5);

  const pan1x = clampPan({ tx: 120, ty: -80, scale: 1, boardW: 374, boardH: 210, viewW: 374, viewH: 210 });
  assert.deepEqual(pan1x, { tx: 0, ty: 0 });

  const pan2x = clampPan({ tx: 500, ty: -500, scale: 2, boardW: 374, boardH: 210, viewW: 374, viewH: 210 });
  assert.deepEqual(pan2x, { tx: 187, ty: -105 });

  const zoomed = computeZoomAroundPoint({
    tx: 0,
    ty: 0,
    oldScale: 1,
    newScale: 2,
    pointX: 100,
    pointY: 150,
    viewCenterX: 187,
    viewCenterY: 150,
    boardW: 374,
    boardH: 210,
    viewW: 374,
    viewH: 210,
  });
  assert.equal(zoomed.scale, 2);
  assert.equal(zoomed.tx, 87);
  assert.equal(zoomed.ty, 0);

  const dayFocus = computePercentFocusTransform({
    pctX: 25,
    pctY: 50,
    targetScale: 2.2,
    boardW: 380,
    boardH: 214,
    viewW: 380,
    viewH: 600,
  });
  assert.equal(dayFocus.scale, 2.2);
  assert.ok(dayFocus.tx > 150);
  assert.equal(dayFocus.ty, 0);
});

// ================= WORLD 2 PURE LOGIC TESTS =================
test('World 2 Day 1 traceSunBeam hits sensor only when all 4 mirrors align', () => {
  const emitter = { x: 75, y: 115, angleDeg: 0 };
  const sensor = { x: 715, y: 92, r: 26 };
  const blockers = [
    { x: 255, y: 20, w: 32, h: 195 },
    { x: 485, y: 220, w: 32, h: 200 },
  ];
  const unsolvedMirrors = [
    { id: 1, x: 175, y: 115, length: 72, angleDeg: 15 },
    { id: 2, x: 175, y: 345, length: 72, angleDeg: 90 },
    { id: 3, x: 395, y: 345, length: 72, angleDeg: 90 },
    { id: 4, x: 395, y: 92, length: 72, angleDeg: 165 },
  ];
  assert.equal(traceSunBeam({ emitter, mirrors: unsolvedMirrors, blockers, sensor }).hitSensor, false);

  const solvedMirrors = [
    { id: 1, x: 175, y: 115, length: 72, angleDeg: 45 },
    { id: 2, x: 175, y: 345, length: 72, angleDeg: 45 },
    { id: 3, x: 395, y: 345, length: 72, angleDeg: 135 },
    { id: 4, x: 395, y: 92, length: 72, angleDeg: 135 },
  ];
  const res = traceSunBeam({ emitter, mirrors: solvedMirrors, blockers, sensor });
  assert.equal(res.hitSensor, true);
  assert.deepEqual(res.hitMirrorIds, [1, 2, 3, 4]);
});

test('World 2 Day 2 evaluateWaterFlow requires open valves and connected pipes', () => {
  const tank = { r: 0, c: 0 };
  const plants = [{ r: 0, c: 2 }, { r: 2, c: 2 }];
  const gridClosed = [
    [{ type: 'tank', ports: [1, 2] }, { type: 'valve', open: false, rotation: 0 }, { type: 'plant', ports: [3] }],
    [{ type: 'straight', rotation: 1 }, { type: 'empty' }, { type: 'empty' }],
    [{ type: 'corner', rotation: 0 }, { type: 'straight', rotation: 0 }, { type: 'plant', ports: [3] }],
  ];
  // Top branch blocked by closed valve, bottom corner wrong rotation (0 -> right & bottom instead of top & right)
  assert.equal(evaluateWaterFlow(gridClosed, tank, plants).allWatered, false);

  const gridSolved = [
    [{ type: 'tank', ports: [1, 2] }, { type: 'valve', open: true, rotation: 0 }, { type: 'plant', ports: [3] }],
    [{ type: 'straight', rotation: 1 }, { type: 'empty' }, { type: 'empty' }],
    [{ type: 'corner', rotation: 3 }, { type: 'straight', rotation: 0 }, { type: 'plant', ports: [3] }],
  ];
  const flow = evaluateWaterFlow(gridSolved, tank, plants);
  assert.equal(flow.allWatered, true);
  assert.equal(flow.wateredCount, 2);
});

test('World 2 Day 3, Day 4, Day 6 mechanical and routing logic behave deterministically', () => {
  const gBad = evaluateGearTrain(['small', 'small', 'medium'], ['small', 'large', 'medium']);
  assert.equal(gBad.solved, false);
  const gGood = evaluateGearTrain(['small', 'large', 'medium'], ['small', 'large', 'medium']);
  assert.equal(gGood.solved, true);
  assert.deepEqual(gGood.spins, [1, -1, 1]);

  assert.equal(routeMineOre({ shape: 'circle', color: 'blue', div1: 'blue', div2: 'red' }).isCorrect, true);
  assert.equal(routeMineOre({ shape: 'triangle', color: 'red', div1: 'pass', div2: 'red' }).isCorrect, true);
  assert.equal(routeMineOre({ shape: 'hexagon', color: 'gold', div1: 'pass', div2: 'red' }).isCorrect, false);

  const bridge = evaluateFloatingBridge([
    { id: 1, currentLoad: 20, idealLoad: 20, locked: true, ropeConnected: true },
    { id: 2, currentLoad: 15, idealLoad: 15, locked: true, ropeConnected: true },
  ]);
  assert.equal(bridge.solved, true);
});

test('World 2 Night 2, 3, 4, 5 pure logic solvers validate constraints accurately', () => {
  assert.equal(
    isConstellationAligned({ telescopeDeg: 360, ringAngles: [0, 360, 0], targetTelescopeDeg: 0, targetRingDeg: 0 }).solved,
    true
  );
  assert.equal(
    isConstellationAligned({ telescopeDeg: 90, ringAngles: [0, 0, 0], targetTelescopeDeg: 0, targetRingDeg: 0 }).solved,
    false
  );

  // Cryo vault enforces both exact temperature and blueprint activation order
  const badOrder = validateCryoActivationStep({
    chamberIndex: 1,
    temps: [4, 8, 12],
    targetTemps: [4, 8, 12],
    activatedOrder: [],
    expectedOrder: [0, 1, 2],
  });
  assert.equal(badOrder.ok, false);
  assert.equal(badOrder.reason, 'order');

  const step1 = validateCryoActivationStep({
    chamberIndex: 0,
    temps: [4, 8, 12],
    targetTemps: [4, 8, 12],
    activatedOrder: [],
    expectedOrder: [0, 1, 2],
  });
  assert.equal(step1.ok, true);
  assert.equal(step1.solved, false);

  // Night 4 prism optical maze
  const cells = Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => ({ kind: 'empty' })));
  cells[1][2] = { kind: 'prism' };
  cells[1][4] = { kind: 'mirror', mirrorType: 'backslash' };
  cells[3][2] = { kind: 'mirror', mirrorType: 'slash' };
  cells[3][1] = { kind: 'mirror', mirrorType: 'slash' };
  cells[4][4] = { kind: 'receiver', id: 'rx-cyan', color: 'cyan' };
  cells[4][1] = { kind: 'receiver', id: 'rx-magenta', color: 'magenta' };
  const optical = traceGridOpticalMaze({
    cols: 6,
    rows: 5,
    emitters: [{ r: 1, c: 0, dir: 1, color: 'white' }],
    cells,
  });
  assert.ok(optical.activeReceivers.includes('rx-cyan'));
  assert.ok(optical.activeReceivers.includes('rx-magenta'));

  // Night 5 cable car equilibrium
  assert.equal(
    evaluateCableCarSystem({
      cableConnected: true,
      leftPulleyDir: 'forward',
      rightPulleyDir: 'forward',
      selectedWeights: [10, 20],
      targetWeight: 30,
    }).readyToRun,
    true
  );
  assert.equal(
    evaluateCableCarSystem({
      cableConnected: true,
      leftPulleyDir: 'reverse',
      rightPulleyDir: 'forward',
      selectedWeights: [10, 20],
      targetWeight: 30,
    }).readyToRun,
    false
  );
});

// ================= WORLD 1 (CHRONOS / TWIN TIMES) PURE LOGIC TESTS =================
test('Chronos acoustic crystal sequence & gear broken sectors validate accurately', () => {
  assert.deepEqual(evaluateAcousticSequence(['c1', 'c3'], ['c1', 'c3', 'c2']), {
    ok: true,
    complete: false,
    matchedCount: 2,
  });
  assert.deepEqual(evaluateAcousticSequence(['c1', 'c3', 'c2'], ['c1', 'c3', 'c2']), {
    ok: true,
    complete: true,
    matchedCount: 3,
  });
  assert.equal(evaluateAcousticSequence(['c1', 'c2'], ['c1', 'c3', 'c2']).ok, false);

  const broken = [{ startDeg: 60, endDeg: 130 }];
  assert.equal(isGearToothSolid(0, 90, broken), false);
  assert.equal(isGearToothSolid(0, 270, broken), true);
  assert.equal(isGearToothSolid(180, 90, broken), true); // local angle is 270
});

test('Chronos solar prism splitter and water scale balance solve only under exact physical conditions', () => {
  const emitter = { x: 80, y: 210, angleDeg: 0 };
  const prism = { x: 360, y: 210, r: 22, redAngleDeg: -45, yellowAngleDeg: 45, blueAngleDeg: 90 };
  const sensors = [
    { id: 'red', color: 'red', x: 640, y: 110, r: 24 },
    { id: 'yellow', color: 'yellow', x: 640, y: 310, r: 24 },
  ];
  const unsolved = traceChronosSolarPrism({
    emitter,
    mirrors: [
      { id: 1, x: 520, y: 50, angleDeg: 90, length: 76 },
      { id: 2, x: 520, y: 370, angleDeg: 90, length: 76 },
    ],
    prism,
    sensors,
  });
  assert.equal(unsolved.prismLit, true);
  assert.equal(unsolved.solved, false);

  // Verify water balance scale
  const over = evaluateWaterScale({ leftWater: 17, rightWater: 17, maxWater: 16 });
  assert.equal(over.overflow, true);
  assert.equal(over.balanced, false);

  const balanced = evaluateWaterScale({
    leftWater: 4,
    rightWater: 3,
    leftWeights: [3, 5],
    rightWeights: [9],
    maxWater: 16,
    minBalancedTotal: 10,
  });
  assert.equal(balanced.leftTotal, 12);
  assert.equal(balanced.rightTotal, 12);
  assert.equal(balanced.balanced, true);
});

test('Chronos Night 2 sonar maze, Night 3 color stones, and Night 6 constellation lock behave deterministically', () => {
  const grid = [
    '#####',
    '#S.X#',
    '#.#.#',
    '#..E#',
    '#####',
  ];
  assert.equal(stepSonarMazeMove(grid, { r: 1, c: 1 }, 'up').event, 'wall');
  const stepRight = stepSonarMazeMove(grid, { r: 1, c: 1 }, 'right');
  assert.equal(stepRight.event, 'ok');
  assert.equal(stepSonarMazeMove(grid, stepRight.pos, 'right').event, 'spike');
  assert.equal(stepSonarMazeMove(grid, { r: 3, c: 2 }, 'right').event, 'exit');

  assert.deepEqual(validateColorStoneStep(['cyan', 'amber', 'magenta'], 0, 'cyan'), { ok: true, complete: false });
  assert.deepEqual(validateColorStoneStep(['cyan', 'amber', 'magenta'], 2, 'magenta'), { ok: true, complete: true });
  assert.equal(validateColorStoneStep(['cyan', 'amber', 'magenta'], 1, 'cyan').ok, false);

  assert.equal(isChronosConstellationSolved([90, 225, 315], [90, 225, 315], 5, 5), true);
  assert.equal(isChronosConstellationSolved([90, 225, 315], [90, 225, 315], 2, 5), false);
  assert.equal(isChronosConstellationSolved([45, 225, 315], [90, 225, 315], 5, 5), false);
});

