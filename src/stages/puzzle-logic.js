// Pure decoupled puzzle logic for Stage Puzzles (unit-tested with node:test)

// Directions: 0 = Top, 1 = Right, 2 = Bottom, 3 = Left
const BASE_CONNECTIONS = {
  straight: [1, 3], // Right <-> Left at rotation 0
  corner: [1, 2],   // Right <-> Bottom at rotation 0
  tee: [1, 2, 3],   // Right, Bottom, Left at rotation 0
  start: [3],       // Exit toward Left (or specified base)
  end: [1],         // Entry from Right
  cross: [0, 1, 2, 3],
};

export function getRotatedPorts(type, rotationQuarterTurns) {
  const base = BASE_CONNECTIONS[type] || [];
  const rot = ((rotationQuarterTurns % 4) + 4) % 4;
  return base.map((dir) => (dir + rot) % 4);
}

const DIR_DELTAS = [
  { dr: -1, dc: 0, opposite: 2 }, // 0: Top
  { dr: 0, dc: 1, opposite: 3 },  // 1: Right
  { dr: 1, dc: 0, opposite: 0 },  // 2: Bottom
  { dr: 0, dc: -1, opposite: 1 }, // 3: Left
];

export function evaluatePlatformPath(grid, startPos, endPos) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const visited = new Set();
  const parent = new Map();
  const queue = [startPos];
  visited.add(`${startPos.r},${startPos.c}`);

  while (queue.length > 0) {
    const curr = queue.shift();
    const cell = grid[curr.r][curr.c];
    const ports = getRotatedPorts(cell.type, cell.rotation);

    for (const dir of ports) {
      const delta = DIR_DELTAS[dir];
      const nr = curr.r + delta.dr;
      const nc = curr.c + delta.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const neighbor = grid[nr][nc];
      const neighborPorts = getRotatedPorts(neighbor.type, neighbor.rotation);
      if (!neighborPorts.includes(delta.opposite)) continue;

      const key = `${nr},${nc}`;
      if (!visited.has(key)) {
        visited.add(key);
        parent.set(key, `${curr.r},${curr.c}`);
        queue.push({ r: nr, c: nc });
      }
    }
  }

  const endKey = `${endPos.r},${endPos.c}`;
  const solved = visited.has(endKey);
  const path = [];
  if (solved) {
    let cur = endKey;
    while (cur) {
      const [r, c] = cur.split(',').map(Number);
      path.unshift({ r, c });
      cur = parent.get(cur) || null;
    }
  }

  return {
    solved,
    reachableKeys: visited,
    path,
  };
}

export function areRingsAligned(angles, target = 0) {
  return angles.every((a) => ((a % 360) + 360) % 360 === target);
}
