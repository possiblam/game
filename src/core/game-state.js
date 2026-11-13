export function createInitialGameState() {
  return {
    version: 1,
    hasStarted: false,
    introSeen: false,
    muted: false,
    completedStages: {
      daytime: [],
      nighttime: [],
    },
    stars: {}, // e.g., { 'daytime-1': 3 }
    keys: {
      magnetic: false,
      silver: false,
    },
    decoyDiscovered: {
      daytime: false,
      nighttime: false,
    },
    finalCompleted: false,
  };
}

export function normalizeGameState(raw) {
  const base = createInitialGameState();
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
    version: 1,
    hasStarted: Boolean(raw.hasStarted),
    introSeen: Boolean(raw.introSeen),
    muted: Boolean(raw.muted),
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
  };
}

export function isStageCompleted(state, route, stageNumber) {
  const list = state.completedStages?.[route] || [];
  return list.includes(stageNumber);
}

export function isStageUnlocked(state, route, stageNumber) {
  if (stageNumber === 1) return true;
  if (stageNumber < 1 || stageNumber > 6) return false;
  // Previous stage in the SAME route must be completed
  if (!isStageCompleted(state, route, stageNumber - 1)) {
    return false;
  }
  return true;
}

export function hasRequiredKeyForStage(state, route, stageNumber) {
  if (stageNumber !== 3) return true;
  if (route === 'daytime') return Boolean(state.keys?.magnetic);
  if (route === 'nighttime') return Boolean(state.keys?.silver);
  return true;
}

export function isFinalUnlocked(state) {
  const dayCount = state.completedStages?.daytime?.length || 0;
  const nightCount = state.completedStages?.nighttime?.length || 0;
  return dayCount === 6 && nightCount === 6;
}

export function getRouteProgressCount(state, route) {
  return state.completedStages?.[route]?.length || 0;
}

export function getTotalCompletedStages(state) {
  return getRouteProgressCount(state, 'daytime') + getRouteProgressCount(state, 'nighttime');
}

export function getTotalStars(state) {
  return Object.values(state.stars || {}).reduce((acc, s) => acc + Number(s || 0), 0);
}

export function calculateStars({ attempts = 1, hintsUsed = 0, elapsedSeconds = 30, targetSeconds = 45 }) {
  // Child-friendly and fair scoring: always awards at least 1 star on completion
  let penalty = 0;
  if (attempts >= 3) penalty += 1;
  if (attempts >= 6) penalty += 1;
  if (hintsUsed >= 2) penalty += 1;
  if (hintsUsed >= 3) penalty += 1;
  if (elapsedSeconds > targetSeconds * 2.2) penalty += 1;

  const stars = Math.max(1, Math.min(3, 3 - penalty));
  return stars;
}

export function applyStageCompletion(state, { route, stageNumber, stars, grantedKey = null }) {
  const stageId = `${route}-${stageNumber}`;
  const currentList = state.completedStages?.[route] || [];
  const nextList = currentList.includes(stageNumber)
    ? currentList
    : [...currentList, stageNumber].sort((a, b) => a - b);

  const prevBest = state.stars?.[stageId] || 0;
  const nextStars = {
    ...state.stars,
    [stageId]: Math.max(prevBest, Math.max(1, Math.min(3, Math.round(stars || 1)))),
  };

  const nextKeys = { ...state.keys };
  if (grantedKey === 'magnetic' && route === 'daytime' && stageNumber === 2) {
    nextKeys.magnetic = true;
  }
  if (grantedKey === 'silver' && route === 'nighttime' && stageNumber === 2) {
    nextKeys.silver = true;
  }

  return {
    ...state,
    hasStarted: true,
    completedStages: {
      ...state.completedStages,
      [route]: nextList,
    },
    stars: nextStars,
    keys: nextKeys,
  };
}

export function applyDecoyDiscovery(state, route) {
  if (route !== 'daytime' && route !== 'nighttime') return state;
  return {
    ...state,
    decoyDiscovered: {
      ...state.decoyDiscovered,
      [route]: true,
    },
  };
}

export function applyFinalVictory(state) {
  if (!isFinalUnlocked(state)) return state;
  return {
    ...state,
    finalCompleted: true,
  };
}

export function getNextRecommendedStage(state, preferredRoute = null) {
  const routes = preferredRoute ? [preferredRoute] : ['daytime', 'nighttime'];
  for (const route of routes) {
    for (let n = 1; n <= 6; n++) {
      if (!isStageCompleted(state, route, n) && isStageUnlocked(state, route, n)) {
        return { route, number: n, id: `${route}-${n}` };
      }
    }
  }
  return null;
}
