import { MAP_VIEWBOX, ROUTE_SEGMENTS } from '../map/routes.js';
import { MAP_HOTSPOTS, PERSIAN_MAP_PLAQUES } from '../map/hotspots.js';
import {
  LANTERNS_MAP_VIEWBOX,
  LANTERNS_MAP_HOTSPOTS,
  LANTERNS_ROUTE_SEGMENTS,
} from './lanterns-map-layout.js';

// Worlds ordered strictly from easiest to hardest (extensible ladder).
// A locked world unlocks automatically after conquering the preceding world's Final Treasure.
export const WORLDS = [
  {
    id: 'two-worlds',
    order: 1,
    title: 'راز گنج دو جهان',
    subtitle: 'نقشه اول — کوهستان روشنایی و تاریکی',
    tagline: 'دو مسیر، دوازده ماجرا، یک گنج افسانه‌ای!',
    difficulty: 'hard',
    difficultyLabel: 'سخت',
    difficultyColor: 'amber',
    unlockRequirementWorldId: null,
    mapImage: '/images/adventure-map.png',
    viewbox: MAP_VIEWBOX,
    hotspots: MAP_HOTSPOTS,
    routeSegments: ROUTE_SEGMENTS,
    plaques: PERSIAN_MAP_PLAQUES,
    hasBuiltInPersianLabels: false,
    supportsHeroSelection: false,
    guideCharacterId: 'nika',
    companionIds: ['arad', 'nika'],
    daytimeRouteName: 'مسیر روز',
    nighttimeRouteName: 'مسیر شب',
    daytimeKeyName: 'کلید مغناطیسی',
    nighttimeKeyName: 'کلید نقره‌ای',
    finalTempleTitle: 'معبد گنج دو جهان',
    maxStars: 36,
  },
  {
    id: 'two-lanterns',
    order: 2,
    title: 'راز دوازده نشان؛ گنج دو فانوس',
    subtitle: 'نقشه دوم — جزیره دو فانوس (پیشرفته)',
    tagline: 'دو مسیر، دوازده آزمون، یک گنج فراموش‌نشدنی!',
    difficulty: 'harder',
    difficultyLabel: 'سخت‌تر',
    difficultyColor: 'rose',
    unlockRequirementWorldId: 'two-worlds',
    mapImage: '/images/lanterns-map.png',
    viewbox: LANTERNS_MAP_VIEWBOX,
    hotspots: LANTERNS_MAP_HOTSPOTS,
    routeSegments: LANTERNS_ROUTE_SEGMENTS,
    plaques: [],
    hasBuiltInPersianLabels: true,
    supportsHeroSelection: true,
    guideCharacterId: 'pico',
    companionIds: ['arad', 'raha'],
    daytimeRouteName: 'مسیر روزانه (قلمرو خورشید)',
    nighttimeRouteName: 'مسیر شبانه (قلمرو ماه)',
    daytimeKeyName: 'کلید طلایی مغناطیسی',
    nighttimeKeyName: 'کلید نقره‌ای ماه',
    finalTempleTitle: 'معبد مرکزی جزیره دو فانوس',
    maxStars: 36,
  },
];

export const DEFAULT_WORLD_ID = WORLDS[0].id;

export function getWorldConfig(worldId) {
  return WORLDS.find((w) => w.id === worldId) || WORLDS[0];
}

export function getNextWorldConfig(worldId) {
  const idx = WORLDS.findIndex((w) => w.id === worldId);
  if (idx >= 0 && idx + 1 < WORLDS.length) {
    return WORLDS[idx + 1];
  }
  return null;
}
