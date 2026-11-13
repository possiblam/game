// Coordinate space matches the exact 1672 x 941 artwork dimensions of public/images/adventure-map.png
export const MAP_VIEWBOX = {
  width: 1672,
  height: 941,
};

// Independent SVG route segments passing directly through each stage landmark.
// Daytime stays strictly on the western/sunlit side; Nighttime stays strictly on the eastern/moonlit side.
// They never intersect or merge prior to the shared Final Temple at top center (836, 145).
export const ROUTE_SEGMENTS = {
  daytime: [
    {
      from: 0,
      to: 1,
      d: 'M 810 868 C 700 865, 570 855, 480 820 C 435 802, 415 792, 395 775',
    },
    {
      from: 1,
      to: 2,
      d: 'M 395 775 C 345 730, 390 675, 415 598',
    },
    {
      from: 2,
      to: 3,
      d: 'M 415 598 C 535 592, 625 568, 595 522 C 565 480, 390 508, 305 468 C 260 448, 236 412, 224 379',
    },
    {
      from: 3,
      to: 4,
      d: 'M 224 379 C 310 365, 405 352, 490 335 C 535 326, 558 310, 572 294',
    },
    {
      from: 4,
      to: 5,
      d: 'M 572 294 C 490 322, 405 320, 345 280 C 295 245, 255 222, 221 208',
    },
    {
      from: 5,
      to: 6,
      d: 'M 221 208 C 280 172, 365 138, 453 114',
    },
    {
      from: 6,
      to: 'final',
      d: 'M 453 114 C 555 128, 665 172, 760 175 C 795 176, 815 162, 822 146',
    },
  ],
  nighttime: [
    {
      from: 0,
      to: 1,
      d: 'M 862 868 C 965 865, 1065 855, 1125 820 C 1145 806, 1152 785, 1155 764',
    },
    {
      from: 1,
      to: 2,
      d: 'M 1155 764 C 1110 725, 1045 685, 1095 640 C 1145 598, 1255 612, 1318 595',
    },
    {
      from: 2,
      to: 3,
      d: 'M 1318 595 C 1395 576, 1460 558, 1498 503',
    },
    {
      from: 3,
      to: 4,
      d: 'M 1498 503 C 1480 448, 1430 412, 1381 388',
    },
    {
      from: 4,
      to: 5,
      d: 'M 1381 388 C 1425 345, 1455 295, 1411 230',
    },
    {
      from: 5,
      to: 6,
      d: 'M 1411 230 C 1345 215, 1295 190, 1260 155 C 1245 140, 1238 126, 1232 114',
    },
    {
      from: 6,
      to: 'final',
      d: 'M 1232 114 C 1165 142, 1065 198, 965 196 C 905 194, 875 170, 854 146',
    },
  ],
};
