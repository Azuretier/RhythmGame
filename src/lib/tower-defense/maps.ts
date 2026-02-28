import type { GameMap, GridCell, Vec3, TerrainType } from '@/types/tower-defense';

const MAP_W = 16;
const MAP_H = 16;

function cell(x: number, z: number, terrain: TerrainType, elevation = 0): GridCell {
  return { x, z, terrain, elevation, towerId: null };
}

/** Hard-coded serpentine path through the map */
function buildDefaultMap(): GameMap {
  // Initialize grid as grass
  const grid: GridCell[][] = [];
  for (let z = 0; z < MAP_H; z++) {
    grid[z] = [];
    for (let x = 0; x < MAP_W; x++) {
      grid[z][x] = cell(x, z, 'grass', 0);
    }
  }

  // Define the serpentine path waypoints (in grid coords)
  const waypoints: Vec3[] = [
    { x: 0, y: 0, z: 2 },   // spawn (left edge)
    { x: 4, y: 0, z: 2 },
    { x: 4, y: 0, z: 6 },
    { x: 12, y: 0, z: 6 },
    { x: 12, y: 0, z: 3 },
    { x: 8, y: 0, z: 3 },
    { x: 8, y: 0, z: 10 },
    { x: 3, y: 0, z: 10 },
    { x: 3, y: 0, z: 13 },
    { x: 10, y: 0, z: 13 },
    { x: 10, y: 0, z: 10 },
    { x: 14, y: 0, z: 10 },
    { x: 14, y: 0, z: 14 },
    { x: 15, y: 0, z: 14 },  // base (right-bottom edge)
  ];

  // Carve the path segments on the grid
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];

    if (from.x === to.x) {
      // vertical segment
      const minZ = Math.min(from.z, to.z);
      const maxZ = Math.max(from.z, to.z);
      for (let z = minZ; z <= maxZ; z++) {
        if (z >= 0 && z < MAP_H && from.x >= 0 && from.x < MAP_W) {
          grid[z][from.x].terrain = 'path';
        }
      }
    } else {
      // horizontal segment
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      for (let x = minX; x <= maxX; x++) {
        if (from.z >= 0 && from.z < MAP_H && x >= 0 && x < MAP_W) {
          grid[from.z][x].terrain = 'path';
        }
      }
    }
  }

  // Mark spawn and base
  grid[2][0].terrain = 'spawn';
  grid[14][15].terrain = 'base';

  // Add decorative water patches
  const waterCells: [number, number][] = [
    [1, 8], [1, 9], [2, 8], [2, 9],
    [6, 0], [6, 1], [7, 0], [7, 1],
    [12, 12], [13, 12],
    [5, 14], [5, 15], [6, 14], [6, 15],
  ];
  for (const [z, x] of waterCells) {
    if (z < MAP_H && x < MAP_W && grid[z][x].terrain === 'grass') {
      grid[z][x].terrain = 'water';
      grid[z][x].elevation = -0.15;
    }
  }

  // Add decorative mountain tiles
  const mountainCells: [number, number][] = [
    [0, 7], [0, 8], [0, 14], [0, 15],
    [7, 14], [7, 15],
    [15, 0], [15, 1], [15, 2],
    [14, 0], [14, 1],
  ];
  for (const [z, x] of mountainCells) {
    if (z < MAP_H && x < MAP_W && grid[z][x].terrain === 'grass') {
      grid[z][x].terrain = 'mountain';
      grid[z][x].elevation = 0.5;
    }
  }

  return {
    name: 'Serpentine Valley',
    width: MAP_W,
    height: MAP_H,
    grid,
    waypoints,
    spawnPoints: [{ x: -1, y: 0, z: 2 }],
    basePosition: { x: 15, y: 0, z: 14 },
  };
}

// Second map: Spiral
function buildSpiralMap(): GameMap {
  const grid: GridCell[][] = [];
  for (let z = 0; z < MAP_H; z++) {
    grid[z] = [];
    for (let x = 0; x < MAP_W; x++) {
      grid[z][x] = cell(x, z, 'grass', 0);
    }
  }

  const waypoints: Vec3[] = [
    { x: 0, y: 0, z: 8 },
    { x: 13, y: 0, z: 8 },
    { x: 13, y: 0, z: 2 },
    { x: 3, y: 0, z: 2 },
    { x: 3, y: 0, z: 12 },
    { x: 11, y: 0, z: 12 },
    { x: 11, y: 0, z: 5 },
    { x: 6, y: 0, z: 5 },
    { x: 6, y: 0, z: 9 },
    { x: 8, y: 0, z: 9 },
    { x: 8, y: 0, z: 7 },
  ];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    if (from.x === to.x) {
      const minZ = Math.min(from.z, to.z);
      const maxZ = Math.max(from.z, to.z);
      for (let z = minZ; z <= maxZ; z++) {
        if (z >= 0 && z < MAP_H && from.x >= 0 && from.x < MAP_W)
          grid[z][from.x].terrain = 'path';
      }
    } else {
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      for (let x = minX; x <= maxX; x++) {
        if (from.z >= 0 && from.z < MAP_H && x >= 0 && x < MAP_W)
          grid[from.z][x].terrain = 'path';
      }
    }
  }

  grid[8][0].terrain = 'spawn';
  grid[7][8].terrain = 'base';

  return {
    name: 'Spiral Fortress',
    width: MAP_W,
    height: MAP_H,
    grid,
    waypoints,
    spawnPoints: [{ x: -1, y: 0, z: 8 }],
    basePosition: { x: 8, y: 0, z: 7 },
  };
}

export const MAPS: GameMap[] = [
  buildDefaultMap(),
  buildSpiralMap(),
];
