// Percentage coordinates (0..100) relative to the adventure-map.png natural container
// Every coordinate is anchored directly to its geographical landmark on the map.

export const MAP_HOTSPOTS = {
  start: {
    id: 'start',
    x: 50,
    y: 93.5,
    label: 'شروع',
  },
  final: {
    id: 'final',
    x: 50.2,
    y: 15.2,
    label: 'گنج افسانه‌ای',
  },
  stages: {
    daytime: [
      { route: 'daytime', number: 1, x: 23.6, y: 82.4, keyMarker: null },
      { route: 'daytime', number: 2, x: 24.8, y: 63.6, keyMarker: { x: 34.4, y: 65.8 } },
      { route: 'daytime', number: 3, x: 13.4, y: 40.3, keyMarker: null },
      { route: 'daytime', number: 4, x: 34.2, y: 31.3, keyMarker: null },
      { route: 'daytime', number: 5, x: 13.2, y: 22.1, keyMarker: null },
      { route: 'daytime', number: 6, x: 27.1, y: 12.1, keyMarker: null },
    ],
    nighttime: [
      { route: 'nighttime', number: 1, x: 69.1, y: 81.2, keyMarker: null },
      { route: 'nighttime', number: 2, x: 78.8, y: 63.2, keyMarker: { x: 78.8, y: 63.2 } },
      { route: 'nighttime', number: 3, x: 89.6, y: 53.5, keyMarker: null },
      { route: 'nighttime', number: 4, x: 82.6, y: 41.2, keyMarker: null },
      { route: 'nighttime', number: 5, x: 84.4, y: 24.4, keyMarker: null },
      { route: 'nighttime', number: 6, x: 73.7, y: 12.1, keyMarker: null },
    ],
  },
  decoys: {
    daytime: {
      route: 'daytime',
      x: 10.6,
      y: 28.5,
      label: 'صندوق مشکوک',
    },
    nighttime: {
      route: 'nighttime',
      x: 91.2,
      y: 80.5,
      label: 'صندوق فریبنده!',
    },
  },
};

// Persian plaques positioned over the English artwork captions so 100% of the map reads naturally in Persian
export const PERSIAN_MAP_PLAQUES = [
  { x: 50.0, y: 94.0, text: 'نقطه شروع', variant: 'wood-lg' },
  { x: 10.6, y: 92.2, text: 'مسیر روز ☀\nمسیر شب 🌙', variant: 'legend' },
  { x: 29.8, y: 88.6, text: 'هزارتوی امنیت لیزری', variant: 'day' },
  { x: 30.8, y: 63.4, text: 'اتاقک کلید مغناطیسی', variant: 'day' },
  { x: 19.6, y: 40.5, text: 'دروازه هولوگرافیک', variant: 'day' },
  { x: 39.8, y: 31.4, text: 'زیپلاین دره آتش', variant: 'day' },
  { x: 20.6, y: 21.4, text: 'عبور با کایت بادی', variant: 'day' },
  { x: 33.8, y: 11.4, text: 'معمای سکوهای چرخان', variant: 'day' },

  { x: 75.8, y: 83.4, text: 'دیوار حافظه هولوگرافیک', variant: 'night' },
  { x: 85.4, y: 67.2, text: 'خزانه کلید زیرآبی', variant: 'night' },
  { x: 94.4, y: 55.2, text: 'دروازه زیست‌سنجی', variant: 'night' },
  { x: 88.4, y: 41.4, text: 'پل طوفانی', variant: 'night' },
  { x: 91.0, y: 24.6, text: 'چالش پرواز پهپاد', variant: 'night' },
  { x: 79.8, y: 12.2, text: 'تونل تغییر گرانش', variant: 'night' },
  { x: 91.6, y: 90.0, text: 'صندوق گنج تقلبی!', variant: 'decoy' },
];
