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

test('stage 1 is unlocked on both routes while stages 2..6 start locked', () => {
  const state = createInitialGameState();
  assert.equal(isStageUnlocked(state, 'daytime', 1), true);
  assert.equal(isStageUnlocked(state, 'nighttime', 1), true);
  assert.equal(isStageUnlocked(state, 'daytime', 2), false);
  assert.equal(isStageUnlocked(state, 'nighttime', 2), false);
  assert.equal(isFinalUnlocked(state), false);
});

test('completing stage 2 grants route key and stage 3 requires that key', () => {
  let state = createInitialGameState();
  assert.equal(hasRequiredKeyForStage(state, 'daytime', 3), false);
  assert.equal(hasRequiredKeyForStage(state, 'nighttime', 3), false);

  state = applyStageCompletion(state, { route: 'daytime', stageNumber: 1, stars: 3 });
  assert.equal(isStageUnlocked(state, 'daytime', 2), true);
  assert.equal(isStageUnlocked(state, 'nighttime', 2), false);

  state = applyStageCompletion(state, {
    route: 'daytime',
    stageNumber: 2,
    stars: 3,
    grantedKey: 'magnetic',
  });
  assert.equal(state.keys.magnetic, true);
  assert.equal(state.keys.silver, false);
  assert.equal(hasRequiredKeyForStage(state, 'daytime', 3), true);
  assert.equal(hasRequiredKeyForStage(state, 'nighttime', 3), false);
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

test('final treasure unlocks only after all 12 stages complete, and conquering World 1 unlocks World 2', () => {
  let state = createInitialGameState();
  assert.equal(isWorldUnlocked(state, 'two-worlds'), true);
  assert.equal(isWorldUnlocked(state, 'two-lanterns'), false);

  // Attempting to switch to locked World 2 must be ignored
  const blockedSwitch = setActiveWorld(state, 'two-lanterns');
  assert.equal(blockedSwitch.activeWorldId, 'two-worlds');

  for (let i = 1; i <= 6; i++) {
    state = applyStageCompletion(state, {
      route: 'daytime',
      stageNumber: i,
      stars: 3,
      grantedKey: i === 2 ? 'magnetic' : null,
    });
  }
  assert.equal(isFinalUnlocked(state), false);
  assert.equal(getTotalCompletedStages(state), 6);

  for (let i = 1; i <= 5; i++) {
    state = applyStageCompletion(state, {
      route: 'nighttime',
      stageNumber: i,
      stars: 2,
      grantedKey: i === 2 ? 'silver' : null,
    });
  }
  assert.equal(isFinalUnlocked(state), false);

  state = applyStageCompletion(state, { route: 'nighttime', stageNumber: 6, stars: 3 });
  assert.equal(isFinalUnlocked(state), true);
  assert.equal(getTotalCompletedStages(state), 12);
  assert.equal(getTotalStars(state), 6 * 3 + 5 * 2 + 3);
  assert.equal(isWorldUnlocked(state, 'two-lanterns'), false);

  state = applyFinalVictory(state);
  assert.equal(state.finalCompleted, true);
  assert.equal(isWorldUnlocked(state, 'two-lanterns'), true);

  // Switching to World 2 succeeds now and keeps World 2 progress independent
  state = setActiveWorld(state, 'two-lanterns');
  assert.equal(state.activeWorldId, 'two-lanterns');
  assert.equal(getTotalCompletedStages(state, 'two-lanterns'), 0);
  assert.equal(getTotalCompletedStages(state, 'two-worlds'), 12);

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
