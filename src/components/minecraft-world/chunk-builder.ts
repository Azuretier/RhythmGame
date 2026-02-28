// Chunk mesh builder with face culling
// Generates Three.js BufferGeometry from world data for a given chunk

import * as THREE from 'three';
import { Block, BLOCK_FACES, BLOCK_TRANSPARENT, BLOCK_LIQUID, getTexUV, type BlockType } from './textures';
import { WorldData, WORLD_WIDTH, WORLD_DEPTH, WORLD_HEIGHT, CHUNK_SIZE } from './terrain';

// Face definitions: vertices and normals for each of the 6 block faces
// Vertices are in counter-clockwise order for front-facing (Three.js default)
// Each face has 4 vertices forming a quad, split into 2 triangles

interface FaceDef {
  dir: [number, number, number]; // neighbor direction
  vertices: [number, number, number][]; // 4 corner vertices (relative to block origin)
  normal: [number, number, number];
  texFace: 'top' | 'bottom' | 'side';
}

const FACES: FaceDef[] = [
  {
    // Top (+Y)
    dir: [0, 1, 0],
    vertices: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
    normal: [0, 1, 0],
    texFace: 'top',
  },
  {
    // Bottom (-Y)
    dir: [0, -1, 0],
    vertices: [
      [0, 0, 1],
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
    ],
    normal: [0, -1, 0],
    texFace: 'bottom',
  },
  {
    // Front (+Z)
    dir: [0, 0, 1],
    vertices: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    normal: [0, 0, 1],
    texFace: 'side',
  },
  {
    // Back (-Z)
    dir: [0, 0, -1],
    vertices: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
    normal: [0, 0, -1],
    texFace: 'side',
  },
  {
    // Right (+X)
    dir: [1, 0, 0],
    vertices: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    normal: [1, 0, 0],
    texFace: 'side',
  },
  {
    // Left (-X)
    dir: [-1, 0, 0],
    vertices: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    normal: [-1, 0, 0],
    texFace: 'side',
  },
];

// Triangle indices for a quad (2 triangles from 4 vertices)
const QUAD_INDICES = [0, 1, 2, 0, 2, 3];

export function buildChunkGeometry(
  world: WorldData,
  chunkX: number,
  chunkZ: number,
): { solid: THREE.BufferGeometry | null; water: THREE.BufferGeometry | null } {
  const startX = chunkX * CHUNK_SIZE;
  const startZ = chunkZ * CHUNK_SIZE;

  // Accumulate geometry data
  const solidPositions: number[] = [];
  const solidNormals: number[] = [];
  const solidUvs: number[] = [];
  const solidIndices: number[] = [];

  const waterPositions: number[] = [];
  const waterNormals: number[] = [];
  const waterUvs: number[] = [];
  const waterIndices: number[] = [];

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = startX + lx;
      const wz = startZ + lz;

      if (wx >= WORLD_WIDTH || wz >= WORLD_DEPTH) continue;

      for (let y = 0; y < WORLD_HEIGHT; y++) {
        const block = world.getBlock(wx, y, wz);
        if (block === Block.Air) continue;

        const isLiquid = BLOCK_LIQUID.has(block);
        const faces = BLOCK_FACES[block];
        if (!faces) continue;

        const positions = isLiquid ? waterPositions : solidPositions;
        const normals = isLiquid ? waterNormals : solidNormals;
        const uvs = isLiquid ? waterUvs : solidUvs;
        const indices = isLiquid ? waterIndices : solidIndices;

        for (const face of FACES) {
          const nx = wx + face.dir[0];
          const ny = y + face.dir[1];
          const nz = wz + face.dir[2];

          const neighbor = world.getBlock(nx, ny, nz);

          // Determine if we should render this face
          let renderFace = false;
          if (isLiquid) {
            // Water: render face only against air or non-water transparent blocks
            renderFace = neighbor === Block.Air || (neighbor !== block && BLOCK_TRANSPARENT.has(neighbor));
          } else {
            // Solid: render face against air or any transparent block
            renderFace = BLOCK_TRANSPARENT.has(neighbor);
          }

          // At world boundaries, always render if facing outward
          if (ny < 0 || ny >= WORLD_HEIGHT) renderFace = true;
          if (nx < 0 || nx >= WORLD_WIDTH || nz < 0 || nz >= WORLD_DEPTH) renderFace = true;

          if (!renderFace) continue;

          // Get texture UV for this face
          const texIndex = faces[face.texFace];
          const uv = getTexUV(texIndex);

          // Vertex base index
          const baseIdx = positions.length / 3;

          // Add 4 vertices
          for (const v of face.vertices) {
            positions.push(wx + v[0], y + v[1], wz + v[2]);
            normals.push(face.normal[0], face.normal[1], face.normal[2]);
          }

          // UV mapping for the 4 vertices
          uvs.push(uv.u0, uv.v0); // vertex 0
          uvs.push(uv.u0, uv.v1); // vertex 1
          uvs.push(uv.u1, uv.v1); // vertex 2
          uvs.push(uv.u1, uv.v0); // vertex 3

          // Add triangle indices
          for (const idx of QUAD_INDICES) {
            indices.push(baseIdx + idx);
          }
        }
      }
    }
  }

  function createGeometry(
    positions: number[],
    normals: number[],
    uvs: number[],
    indices: number[],
  ): THREE.BufferGeometry | null {
    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
  }

  return {
    solid: createGeometry(solidPositions, solidNormals, solidUvs, solidIndices),
    water: createGeometry(waterPositions, waterNormals, waterUvs, waterIndices),
  };
}
