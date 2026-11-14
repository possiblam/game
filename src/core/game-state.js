import { WORLDS, DEFAULT_WORLD_ID, getWorldConfig } from '../data/worlds.js';

export function createEmptyWorldProgress() {
  return {
    introSeen: false,
    completedStages: {
      daytime: [],
      nighttime: [],
    },
    stars: {}, // e.g. { 'daytime-1': 3 } or { 'lanterns-daytime-1': 3 }
    keys: {
      magnetic: false,
      silver: false,
    },
    decoyDiscovered: {
      daytime: false,
      nighttime: false,
    },
    finalCompleted: false,
    xp: 0,
    badges: [],
  };
}

function normalizeSingleWorld(raw) {
  const base = createEmptyWorldProgress();
  if (!raw || typeof raw !== 'object') return base;

  const dayList = Array.isArray(raw.completedStages?.daytime)
    ? [...new Set(raw.completedStages.daytime.filter((n) => Number.isInteger(n) && n >= 1 && n <= 6))].sort((a, b) => a - b)
    : [];
  const nightList = Array.isArray(raw.completedStages?.nighttime)
    ? [...new Set(raw.completedStages.nighttime.filter((n) => Number.isInteger(n) && n >= 1 && n <= 6))].sort((a, b) => a - b)
    : [];

  const stars = {};
  if (raw.stars && typeof raw.stars === 'object') {
    for (const [k, v] of Object.entries(raw.stars)) {
      if (typeof v === 'number' && v >= 1 && v <= 3) {
        stars[k] = Math.round(v);
      }
    }
  }

  return {
    introSeen: Boolean(raw.introSeen),
    completedStages: {
      daytime: dayList,
      nighttime: nightList,
    },
    stars,
    keys: {
      magnetic: Boolean(raw.keys?.magnetic),
      silver: Boolean(raw.keys?.silver),
    },
    decoyDiscovered: {
      daytime: Boolean(raw.decoyDiscovered?.daytime),
      nighttime: Boolean(raw.decoyDiscovered?.nighttime),
    },
    finalCompleted: Boolean(raw.finalCompleted),
    xp: typeof raw.xp === 'number' && raw.xp >= 0 ? Math.round(raw.xp) : (dayList.length + nightList.length) * 100,
    badges: Array.isArray(raw.badges) ? [...new Set(raw.badges.filter((b) => typeof b === 'string'))] : [],
  };
}

function syncActiveWorldMirrors(state) {
  const activeWorldId = state.activeWorldId || DEFAULT_WORLD_ID;
  const active = state.worlds?.[activeWorldId] || createEmptyWorldProgress();
  return {
    ...state,
    activeWorldId,
    introSeen: active.introSeen,
    completedStages: active.completedStages,
    stars: active.stars,
    keys: active.keys,
    decoyDiscovered: active.decoyDiscovered,
    finalCompleted: active.finalCompleted,
  };
}

export function createInitialGameState() {
  const worlds = {};
  for (const w of WORLDS) {
    worlds[w.id] = createEmptyWorldProgress();
  }
  return syncActiveWorldMirrors({
    version: 2,
    hasStarted: false,
    muted: false,
    selectedHero: 'arad',
    activeWorldId: DEFAULT_WORLD_ID,
    worlds,
  });
}

export function normalizeGameState(raw) {
  const base = createInitialGameState();
  if (!raw || typeof raw !== 'object') return base;

  const worlds = {};
  const hasWorldsObject = raw.worlds && typeof raw.worlds === 'object';

  for (const w of WORLDS) {
    if (hasWorldsObject && raw.worlds[w.id]) {
      worlds[w.id] = normalizeSingleWorld(raw.worlds[w.id]);
    } else if (!hasWorldsObject && w.id === DEFAULT_WORLD_ID) {
      // Auto-migrate v1 flat state cleanly into World 1 ('two-worlds')
      worlds[w.id] = normalizeSingleWorld(raw);
    } else {
      worlds[w.id] = createEmptyWorldProgress();
    }
  }

  let activeWorldId = typeof raw.activeWorldId === 'string' && worlds[raw.activeWorldId]
    ? raw.activeWorldId
    : DEFAULT_WORLD_ID;

  const tempState = {
    version: 2,
    hasStarted: Boolean(raw.hasStarted),
    muted: Boolean(raw.muted),
    selectedHero: raw.selectedHero === 'raha' ? 'raha' : 'arad',
    activeWorldId,
    worlds,
  };

  // Ensure activeWorldId is actually unlocked
  if (!isWorldUnlocked(tempState, activeWorldId)) {
    activeWorldId = DEFAULT_WORLD_ID;
    tempState.activeWorldId = DEFAULT_WORLD_ID;
  }

  return syncActiveWorldMirrors(tempState);
}

export function getWorldState(state, worldId = null) {
  const targetId = worldId || state.activeWorldId || DEFAULT_WORLD_ID;
  if (state.worlds && state.worlds[targetId]) {
    return state.worlds[targetId];
  }
  // Fallback for plain/partial objects
  return {
    introSeen: Boolean(state.introSeen),
    completedStages: state.completedStages || { daytime: [], nighttime: [] },
    stars: state.stars || {},
    keys: state.keys || { magnetic: false, silver: false },
    decoyDiscovered: state.decoyDiscovered || { daytime: false, nighttime: false },
    finalCompleted: Boolean(state.finalCompleted),
    xp: state.xp || 0,
    badges: state.badges || [],
  };
}

export function isWorldUnlocked(state, worldId) {
  const world = getWorldConfig(worldId);
  if (!world) return false;
  if (!world.unlockRequirementWorldId) return true;
  const reqState = getWorldState(state, world.unlockRequirementWorldId);
  return Boolean(reqState.finalCompleted);
}

export function setActiveWorld(state, worldId) {
  if (!isWorldUnlocked(state, worldId)) return state;
  return syncActiveWorldMirrors({
    ...state,
    hasStarted: true,
    activeWorldId: worldId,
  });
}

export function setSelectedHero(state, heroId) {
  const safeHero = heroId === 'raha' ? 'raha' : 'arad';
  return {
    ...state,
    selectedHero: safeHero,
  };
}

export function markWorldIntroSeen(state, worldId = null) {
  const targetId = worldId || state.activeWorldId || DEFAULT_WORLD_ID;
  const ws = getWorldState(state, targetId);
  const nextWorlds = {
    ...(state.worlds || {}),
    [targetId]: {
      ...ws,
      introSeen: true,
    },
  };
  return syncActiveWorldMirrors({
    ...state,
    hasStarted: true,
    worlds: nextWorlds,
  });
}

export function isStageCompleted(state, route, stageNumber, worldId = null) {
  const ws = getWorldState(state, worldId);
  const list = ws.completedStages?.[route] || [];
  return list.includes(stageNumber);
}

export function isStageUnlocked(state, route, stageNumber, worldId = null) {
  if (stageNumber === 1) return true;
  if (stageNumber < 1 || stageNumber > 6) return false;
  if (!isStageCompleted(state, route, stageNumber - 1, worldId)) {
    return false;
  }
  return true;
}

export function hasRequiredKeyForStage(state, route, stageNumber, worldId = null) {
  if (stageNumber !== 3) return true;
  const ws = getWorldState(state, worldId);
  if (route === 'daytime') return Boolean(ws.keys?.magnetic);
  if (route === 'nighttime') return Boolean(ws.keys?.silver);
  return true;
}

export function isFinalUnlocked(state, worldId = null) {
  const ws = getWorldState(state, worldId);
  const dayCount = ws.completedStages?.daytime?.length || 0;
  const nightCount = ws.completedStages?.nighttime?.length || 0;
  return dayCount === 6 && nightCount === 6;
}

export function getRouteProgressCount(state, route, worldId = null) {
  const ws = getWorldState(state, worldId);
  return ws.completedStages?.[route]?.length || 0;
}

export function getTotalCompletedStages(state, worldId = null) {
  return getRouteProgressCount(state, 'daytime', worldId) + getRouteProgressCount(state, 'nighttime', worldId);
}

export function getTotalStars(state, worldId = null) {
  const ws = getWorldState(state, worldId);
  return Object.values(ws.stars || {}).reduce((acc, s) => acc + Number(s || 0), 0);
}

export function getTotalXP(state) {
  if (!state.worlds) return state.xp || 0;
  return Object.values(state.worlds).reduce((acc, w) => acc + Number(w?.xp || 0), 0);
}

export function calculateStars({ attempts = 1, hintsUsed = 0, elapsedSeconds = 30, targetSeconds = 45 }) {
  // Child-friendly and fair scoring: never punishes thinking time alone; always awards 1..3 stars
  let penalty = 0;
  if (attempts >= 3) penalty += 1;
  if (attempts >= 6) penalty += 1;
  if (hintsUsed >= 2) penalty += 1;
  if (hintsUsed >= 3) penalty += 1;
  if (elapsedSeconds > targetSeconds * 2.5) penalty += 1;

  return Math.max(1, Math.min(3, 3 - penalty));
}

export function applyStageCompletion(
  state,
  { route, stageNumber, stars, grantedKey = null, worldId = null, xpReward = 120, skillBadge = null }
) {
  const targetId = worldId || state.activeWorldId || DEFAULT_WORLD_ID;
  const ws = getWorldState(state, targetId);
  const starKey = targetId === 'two-worlds' ? `${route}-${stageNumber}` : `lanterns-${route}-${stageNumber}`;

  const currentList = ws.completedStages?.[route] || [];
  const isFirstClear = !currentList.includes(stageNumber);
  const nextList = isFirstClear
    ? [...currentList, stageNumber].sort((a, b) => a - b)
    : currentList;

  const prevBest = ws.stars?.[starKey] || 0;
  const safeStars = Math.max(1, Math.min(3, Math.round(stars || 1)));
  const nextStars = {
    ...ws.stars,
    [starKey]: Math.max(prevBest, safeStars),
  };

  const nextKeys = { ...ws.keys };
  if (grantedKey === 'magnetic' && route === 'daytime' && stageNumber === 2) {
    nextKeys.magnetic = true;
  }
  if (grantedKey === 'silver' && route === 'nighttime' && stageNumber === 2) {
    nextKeys.silver = true;
  }

  const bonusXp = isFirstClear ? xpReward + safeStars * 20 : Math.max(0, (safeStars - prevBest) * 20);
  const nextBadges = skillBadge && !ws.badges?.includes(skillBadge)
    ? [...(ws.badges || []), skillBadge]
    : ws.badges || [];

  const nextWorlds = {
    ...(state.worlds || {}),
    [targetId]: {
      ...ws,
      completedStages: {
        ...ws.completedStages,
        [route]: nextList,
      },
      stars: nextStars,
      keys: nextKeys,
      xp: (ws.xp || 0) + bonusXp,
      badges: nextBadges,
    },
  };

  return syncActiveWorldMirrors({
    ...state,
    hasStarted: true,
    worlds: nextWorlds,
  });
}

export function applyDecoyDiscovery(state, route, worldId = null) {
  if (route !== 'daytime' && route !== 'nighttime') return state;
  const targetId = worldId || state.activeWorldId || DEFAULT_WORLD_ID;
  const ws = getWorldState(state, targetId);
  const firstDiscovery = !ws.decoyDiscovered?.[route];

  const nextWorlds = {
    ...(state.worlds || {}),
    [targetId]: {
      ...ws,
      decoyDiscovered: {
        ...ws.decoyDiscovered,
        [route]: true,
      },
      xp: (ws.xp || 0) + (firstDiscovery ? 50 : 0),
    },
  };

  return syncActiveWorldMirrors({
    ...state,
    worlds: nextWorlds,
  });
}

export function applyFinalVictory(state, worldId = null) {
  const targetId = worldId || state.activeWorldId || DEFAULT_WORLD_ID;
  if (!isFinalUnlocked(state, targetId)) return state;
  const ws = getWorldState(state, targetId);
  const firstClear = !ws.finalCompleted;

  const nextWorlds = {
    ...(state.worlds || {}),
    [targetId]: {
      ...ws,
      finalCompleted: true,
      xp: (ws.xp || 0) + (firstClear ? 300 : 0),
    },
  };

  return syncActiveWorldMirrors({
    ...state,
    worlds: nextWorlds,
  });
}

export function getNextRecommendedStage(state, preferredRoute = null, worldId = null) {
  const routes = preferredRoute ? [preferredRoute] : ['daytime', 'nighttime'];
  for (const route of routes) {
    for (let n = 1; n <= 6; n++) {
      if (!isStageCompleted(state, route, n, worldId) && isStageUnlocked(state, route, n, worldId)) {
        return { route, number: n, id: `${route}-${n}` };
      }
    }
  }
  return null;
}

export function getWorldProgressSummary(state, worldId) {
  const ws = getWorldState(state, worldId);
  return {
    unlocked: isWorldUnlocked(state, worldId),
    completedCount: getTotalCompletedStages(state, worldId),
    dayCount: getRouteProgressCount(state, 'daytime', worldId),
    nightCount: getRouteProgressCount(state, 'nighttime', worldId),
    stars: getTotalStars(state, worldId),
    finalUnlocked: isFinalUnlocked(state, worldId),
    finalCompleted: Boolean(ws.finalCompleted),
    xp: ws.xp || 0,
    badges: ws.badges || [],
  };
}
