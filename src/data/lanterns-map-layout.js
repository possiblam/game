// Geographic coordinates anchored directly to public/images/lanterns-map.png (1672 x 941)
// Note: This artwork already includes crisp Persian stage titles and legends, so no plaque overlays are needed.

export const LANTERNS_MAP_VIEWBOX = {
  width: 1672,
  height: 941,
};

export const LANTERNS_MAP_HOTSPOTS = {
  start: {
    id: 'start',
    x: 50.0,
    y: 93.0,
    label: 'شروع ماجراجویی',
  },
  final: {
    id: 'final',
    x: 50.0,
    y: 17.5,
    label: 'گنج افسانه‌ای',
  },
  stages: {
    daytime: [
      { route: 'daytime', number: 1, x: 17.6, y: 81.8, keyMarker: null },
      { route: 'daytime', number: 2, x: 20.6, y: 63.2, keyMarker: { x: 27.6, y: 65.5 } },
      { route: 'daytime', number: 3, x: 36.2, y: 47.0, keyMarker: null },
      { route: 'daytime', number: 4, x: 17.6, y: 37.2, keyMarker: null },
      { route: 'daytime', number: 5, x: 24.2, y: 20.5, keyMarker: null },
      { route: 'daytime', number: 6, x: 37.8, y: 23.0, keyMarker: null },
    ],
    nighttime: [
      { route: 'nighttime', number: 1, x: 75.5, y: 80.5, keyMarker: null },
      { route: 'nighttime', number: 2, x: 70.6, y: 61.5, keyMarker: { x: 76.2, y: 65.8 } },
      { route: 'nighttime', number: 3, x: 80.5, y: 53.0, keyMarker: null },
      { route: 'nighttime', number: 4, x: 72.8, y: 39.2, keyMarker: null },
      { route: 'nighttime', number: 5, x: 80.2, y: 28.0, keyMarker: null },
      { route: 'nighttime', number: 6, x: 69.2, y: 22.8, keyMarker: null },
    ],
  },
  decoys: {
    daytime: {
      route: 'daytime',
      x: 9.2,
      y: 46.5,
      label: 'محفظه درخشان معدن',
    },
    nighttime: {
      route: 'nighttime',
      x: 93.8,
      y: 43.2,
      label: 'صندوق تاریک صخره‌ای',
    },
  },
};

// Independent orange (Sun Realm) and blue (Moon Realm) dashed route paths matching the exact trails, bridges, caves & cable cars.
export const LANTERNS_ROUTE_SEGMENTS = {
  daytime: [
    {
      from: 0,
      to: 1,
      d: 'M 750 868 C 600 864, 435 842, 330 792 C 308 780, 298 775, 294 770',
    },
    {
      from: 1,
      to: 2,
      d: 'M 294 770 C 318 728, 395 705, 420 676 C 436 654, 385 612, 344 595',
    },
    {
      from: 2,
      to: 3,
      d: 'M 344 595 C 405 552, 515 520, 588 475 C 618 456, 628 440, 634 425',
    },
    {
      from: 3,
      to: 4,
      d: 'M 634 425 C 540 432, 425 405, 365 368 C 340 352, 326 346, 313 341',
    },
    {
      from: 4,
      to: 5,
      d: 'M 313 341 C 385 322, 468 295, 442 252 C 425 224, 412 214, 408 205',
    },
    {
      from: 5,
      to: 6,
      d: 'M 408 205 C 465 212, 535 224, 632 216',
    },
    {
      from: 6,
      to: 'final',
      d: 'M 632 216 C 705 212, 775 194, 818 164',
    },
  ],
  nighttime: [
    {
      from: 0,
      to: 1,
      d: 'M 922 868 C 1030 865, 1145 846, 1215 805 C 1245 786, 1256 770, 1262 758',
    },
    {
      from: 1,
      to: 2,
      d: 'M 1262 758 C 1325 712, 1365 660, 1295 622 C 1255 600, 1205 592, 1180 579',
    },
    {
      from: 2,
      to: 3,
      d: 'M 1180 579 C 1245 572, 1320 555, 1346 499',
    },
    {
      from: 3,
      to: 4,
      d: 'M 1346 499 C 1295 452, 1235 415, 1217 369',
    },
    {
      from: 4,
      to: 5,
      d: 'M 1217 369 C 1285 352, 1358 312, 1341 264',
    },
    {
      from: 5,
      to: 6,
      d: 'M 1341 264 C 1280 230, 1212 204, 1157 169',
    },
    {
      from: 6,
      to: 'final',
      d: 'M 1157 169 C 1070 185, 965 186, 855 164',
    },
  ],
};
