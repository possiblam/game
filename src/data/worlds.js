import { MAP_VIEWBOX, ROUTE_SEGMENTS } from '../map/routes.js';
import { MAP_HOTSPOTS, PERSIAN_MAP_PLAQUES } from '../map/hotspots.js';
import {
  LANTERNS_MAP_VIEWBOX,
  LANTERNS_MAP_HOTSPOTS,
  LANTERNS_ROUTE_SEGMENTS,
} from './lanterns-map-layout.js';
import {
  CHRONOS_MAP_VIEWBOX,
  CHRONOS_MAP_HOTSPOTS,
  CHRONOS_ROUTE_SEGMENTS,
  CHRONOS_PERSIAN_PLAQUES,
} from './chronos-map-layout.js';

// Scalable World Registry: ordered strictly from Easiest -> Hardest.
// Adding a new map in the future requires adding one object here + registering its stages/mounters.
export const WORLDS = [
  {
    id: 'twin-times',
    order: 1,
    title: 'رازِ دو نیمه‌ی زمان',
    subtitle: 'نقشه اول — سرزمین کرونوس و صندوقچه‌ی تعادل',
    tagline: 'نور خورشید و جادوی شب، هم‌قدم تا صندوقچه تعادل!',
    difficulty: 'easy',
    difficultyLabel: 'آسان',
    difficultyColor: 'emerald',
    unlockRequirementWorldId: null,
    starKeyPrefix: 'chronos-',
    hasRouteKeys: false,
    stageNumberMode: '1-6',
    ambientPreset: 'chronos',
    victoryTheme: 'chronos',
    mapImage: '/assets/aistudio/image_87c9b127_9f39ed4b.jpg',
    viewbox: CHRONOS_MAP_VIEWBOX,
    hotspots: CHRONOS_MAP_HOTSPOTS,
    routeSegments: CHRONOS_ROUTE_SEGMENTS,
    plaques: CHRONOS_PERSIAN_PLAQUES,
    hasBuiltInPersianLabels: false,
    supportsHeroSelection: false,
    introSpeakerId: 'arad',
    guideCharacterId: 'nika',
    companionIds: ['arad', 'nika'],
    daytimeRouteName: 'مسیر روز (آفتاب و مکانیک)',
    nighttimeRouteName: 'مسیر شب (صدا، یخ و نجوم)',
    daytimeKeyName: 'نشان تعادل خورشید',
    nighttimeKeyName: 'نشان تعادل ماه',
    finalTempleTitle: 'صندوقچه‌ی تعادل کرونوس',
    maxStars: 36,
  },
  {
    id: 'two-worlds',
    order: 2,
    title: 'راز گنج دو جهان',
    subtitle: 'نقشه دوم — کوهستان روشنایی و تاریکی',
    tagline: 'دو مسیر، دوازده ماجرا، یک گنج افسانه‌ای!',
    difficulty: 'hard',
    difficultyLabel: 'سخت',
    difficultyColor: 'amber',
    unlockRequirementWorldId: 'twin-times',
    starKeyPrefix: '',
    hasRouteKeys: true,
    stageNumberMode: '1-6',
    ambientPreset: 'two-worlds',
    victoryTheme: 'two-worlds',
    mapImage: '/images/adventure-map.png',
    viewbox: MAP_VIEWBOX,
    hotspots: MAP_HOTSPOTS,
    routeSegments: ROUTE_SEGMENTS,
    plaques: PERSIAN_MAP_PLAQUES,
    hasBuiltInPersianLabels: false,
    supportsHeroSelection: false,
    introSpeakerId: 'arad',
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
    order: 3,
    title: 'راز دوازده نشان؛ گنج دو فانوس',
    subtitle: 'نقشه سوم — جزیره دو فانوس (پیشرفته)',
    tagline: 'دو مسیر، دوازده آزمون، یک گنج فراموش‌نشدنی!',
    difficulty: 'harder',
    difficultyLabel: 'سخت‌تر',
    difficultyColor: 'rose',
    unlockRequirementWorldId: 'two-worlds',
    starKeyPrefix: 'lanterns-',
    hasRouteKeys: true,
    stageNumberMode: '1-12',
    ambientPreset: 'two-lanterns',
    victoryTheme: 'two-lanterns',
    mapImage: '/images/lanterns-map.png',
    viewbox: LANTERNS_MAP_VIEWBOX,
    hotspots: LANTERNS_MAP_HOTSPOTS,
    routeSegments: LANTERNS_ROUTE_SEGMENTS,
    plaques: [],
    hasBuiltInPersianLabels: true,
    supportsHeroSelection: true,
    introSpeakerId: 'selectedHero',
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

export function getStageStarKey(worldId, route, stageNumber) {
  const world = getWorldConfig(worldId);
  const prefix = world.starKeyPrefix ?? `${world.id}-`;
  return `${prefix}${route}-${stageNumber}`;
}

export function getWorldDifficultyBadgeClass(difficultyColor) {
  switch (difficultyColor) {
    case 'emerald':
      return 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200';
    case 'sky':
      return 'bg-sky-500/20 border-sky-400/60 text-sky-200';
    case 'rose':
      return 'bg-rose-500/20 border-rose-400/60 text-rose-200';
    case 'violet':
      return 'bg-violet-500/20 border-violet-400/60 text-violet-200';
    case 'amber':
    default:
      return 'bg-amber-500/20 border-amber-400/60 text-amber-200';
  }
}
