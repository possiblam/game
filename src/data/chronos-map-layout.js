// Geographic coordinates anchored directly to /assets/aistudio/image_87c9b127_9f39ed4b.jpg (1365 x 768)
export const CHRONOS_MAP_VIEWBOX = {
  width: 1365,
  height: 768,
};

export const CHRONOS_MAP_HOTSPOTS = {
  start: {
    id: 'start',
    x: 50.0,
    y: 93.8,
    label: 'شروع',
  },
  final: {
    id: 'final',
    x: 50.6,
    y: 12.2,
    label: 'صندوقچه تعادل',
  },
  stages: {
    daytime: [
      { route: 'daytime', number: 1, x: 22.0, y: 80.5, keyMarker: null },
      { route: 'daytime', number: 2, x: 24.7, y: 61.8, keyMarker: null },
      { route: 'daytime', number: 3, x: 12.6, y: 40.7, keyMarker: null },
      { route: 'daytime', number: 4, x: 32.5, y: 31.4, keyMarker: null },
      { route: 'daytime', number: 5, x: 12.7, y: 20.4, keyMarker: null },
      { route: 'daytime', number: 6, x: 26.6, y: 10.8, keyMarker: null },
    ],
    nighttime: [
      { route: 'nighttime', number: 1, x: 69.5, y: 83.8, keyMarker: null },
      { route: 'nighttime', number: 2, x: 78.4, y: 70.4, keyMarker: null },
      { route: 'nighttime', number: 3, x: 62.4, y: 55.8, keyMarker: null },
      { route: 'nighttime', number: 4, x: 83.6, y: 44.6, keyMarker: null },
      { route: 'nighttime', number: 5, x: 82.2, y: 23.8, keyMarker: null },
      { route: 'nighttime', number: 6, x: 75.0, y: 12.4, keyMarker: null },
    ],
  },
  decoys: {
    daytime: {
      route: 'daytime',
      x: 7.4,
      y: 17.8,
      label: 'صندوق سراب بیابان',
    },
    nighttime: {
      route: 'nighttime',
      x: 94.6,
      y: 81.2,
      label: 'گنج تقلبی!',
    },
  },
};

// Persian plaques anchored directly on top of every English sign in image_87c9b127_9f39ed4b.jpg
export const CHRONOS_PERSIAN_PLAQUES = [
  { x: 50.0, y: 94.0, text: 'نقطه شروع', variant: 'wood-lg' },
  { x: 9.2, y: 92.2, text: 'مسیر روز ☀\nمسیر شب 🌙', variant: 'legend' },

  { x: 29.4, y: 89.5, text: 'پل کریستالی\nصوتی', variant: 'day' },
  { x: 31.2, y: 61.8, text: 'صعود از چرخ‌دنده‌ها', variant: 'day' },
  { x: 19.6, y: 40.7, text: 'آینه‌های منشور خورشیدی', variant: 'day' },
  { x: 39.4, y: 31.4, text: 'پاراگلایدر آبفشان بخار', variant: 'day' },
  { x: 19.8, y: 20.4, text: 'پاندول‌های مغناطیسی', variant: 'day' },
  { x: 33.8, y: 10.8, text: 'دروازه ترازوی آبی', variant: 'day' },

  { x: 77.0, y: 84.0, text: 'نیلوفرهای درخشان', variant: 'night' },
  { x: 85.2, y: 70.6, text: 'هزارتوی پژواک صوتی', variant: 'night' },
  { x: 69.6, y: 55.8, text: 'سنگ‌های منشور رنگی', variant: 'night' },
  { x: 90.4, y: 44.6, text: 'یخ‌نوردی آبشار منجمد', variant: 'night' },
  { x: 92.6, y: 56.2, text: 'دیواره یخی شب', variant: 'night' },
  { x: 89.2, y: 23.8, text: 'پل زنگوله‌های بادی', variant: 'night' },
  { x: 81.8, y: 12.4, text: 'قفل صورت‌های فلکی', variant: 'night' },
  { x: 93.6, y: 92.2, text: 'گنج تقلبی\n(تله!)', variant: 'decoy' },
];

// Independent SVG route paths tracing the exact orange (Daytime) & blue (Nighttime) trails on 1365x768
export const CHRONOS_ROUTE_SEGMENTS = {
  daytime: [
    {
      from: 0,
      to: 1,
      d: 'M 638 718 C 535 718, 420 715, 340 675 C 312 660, 305 638, 300 618',
    },
    {
      from: 1,
      to: 2,
      d: 'M 300 618 C 282 575, 296 525, 337 475',
    },
    {
      from: 2,
      to: 3,
      d: 'M 337 475 C 410 475, 488 452, 472 418 C 455 385, 310 402, 232 365 C 192 346, 178 328, 172 313',
    },
    {
      from: 3,
      to: 4,
      d: 'M 172 313 C 235 298, 318 286, 392 268 C 425 258, 438 248, 444 241',
    },
    {
      from: 4,
      to: 5,
      d: 'M 444 241 C 370 258, 285 245, 222 208 C 190 188, 180 170, 173 157',
    },
    {
      from: 5,
      to: 6,
      d: 'M 173 157 C 218 130, 290 102, 363 83',
    },
    {
      from: 6,
      to: 'final',
      d: 'M 363 83 C 450 96, 540 128, 622 128 C 655 128, 675 112, 686 94',
    },
  ],
  nighttime: [
    {
      from: 0,
      to: 1,
      d: 'M 728 718 C 815 718, 895 704, 932 678 C 944 666, 948 654, 949 644',
    },
    {
      from: 1,
      to: 2,
      d: 'M 949 644 C 962 612, 1028 575, 1070 541',
    },
    {
      from: 2,
      to: 3,
      d: 'M 1070 541 C 1010 510, 918 475, 852 428',
    },
    {
      from: 3,
      to: 4,
      d: 'M 852 428 C 930 412, 1065 390, 1141 342',
    },
    {
      from: 4,
      to: 5,
      d: 'M 1141 342 C 1185 292, 1168 228, 1122 183',
    },
    {
      from: 5,
      to: 6,
      d: 'M 1122 183 C 1078 152, 1045 122, 1024 95',
    },
    {
      from: 6,
      to: 'final',
      d: 'M 1024 95 C 950 124, 858 148, 768 148 C 732 148, 708 122, 694 94',
    },
  ],
};
