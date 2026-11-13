import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  isStageUnlocked,
  hasRequiredKeyForStage,
  isFinalUnlocked,
  calculateStars,
  applyStageCompletion,
  applyDecoyDiscovery,
  applyFinalVictory,
  getTotalCompletedStages,
  getTotalStars,
} from './game-state.js';
import { evaluatePlatformPath, areRingsAligned } from '../stages/puzzle-logic.js';
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

test('final treasure unlocks only after all 12 stages (6 daytime + 6 nighttime) complete', () => {
  let state = createInitialGameState();
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

  state = applyFinalVictory(state);
  assert.equal(state.finalCompleted, true);
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
