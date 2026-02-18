'use client';

import React, { useRef, useEffect, memo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// ============================================================================
// SEEDED RANDOM & NOISE (deterministic terrain)
// ============================================================================

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function noise2D(x: number, z: number, seed: number): number {
  const rand = seededRandom(
    Math.floor(x * 73856093) ^ Math.floor(z * 19349663) ^ seed
  );
  return rand();
}

function smoothNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const n00 = noise2D(ix, iz, seed);
  const n10 = noise2D(ix + 1, iz, seed);
  const n01 = noise2D(ix, iz + 1, seed);
  const n11 = noise2D(ix + 1, iz + 1, seed);
  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);
  return nx0 + sz * (nx1 - nx0);
}

// ============================================================================
// FLOATING ISLAND GENERATION
// ============================================================================

interface IslandDef {
  cx: number;
  cy: number;
  cz: number;
  radiusX: number;
  radiusZ: number;
  maxHeight: number;
  seed: number;
  palette: IslandPalette;
  rotationSpeed: number;
  bobSpeed: number;
  bobAmplitude: number;
}

interface IslandPalette {
  top: THREE.Color;
  mid: THREE.Color;
  deep: THREE.Color;
  accent: THREE.Color;
  crystal: THREE.Color;
}

const ISLAND_PALETTES: IslandPalette[] = [
  { // Ethereal amethyst
    top: new THREE.Color(0.55, 0.45, 0.85),
    mid: new THREE.Color(0.40, 0.30, 0.65),
    deep: new THREE.Color(0.25, 0.18, 0.45),
    accent: new THREE.Color(0.80, 0.70, 1.0),
    crystal: new THREE.Color(0.6, 0.3, 1.0),
  },
  { // Cosmic teal
    top: new THREE.Color(0.15, 0.60, 0.65),
    mid: new THREE.Color(0.10, 0.42, 0.50),
    deep: new THREE.Color(0.06, 0.25, 0.35),
    accent: new THREE.Color(0.25, 0.85, 0.90),
    crystal: new THREE.Color(0.0, 0.9, 0.8),
  },
  { // Ancient gold
    top: new THREE.Color(0.70, 0.55, 0.20),
    mid: new THREE.Color(0.52, 0.38, 0.12),
    deep: new THREE.Color(0.35, 0.25, 0.08),
    accent: new THREE.Color(1.0, 0.85, 0.35),
    crystal: new THREE.Color(1.0, 0.7, 0.1),
  },
  { // Phantom rose
    top: new THREE.Color(0.75, 0.30, 0.45),
    mid: new THREE.Color(0.55, 0.20, 0.35),
    deep: new THREE.Color(0.35, 0.12, 0.22),
    accent: new THREE.Color(1.0, 0.55, 0.70),
    crystal: new THREE.Color(1.0, 0.3, 0.5),
  },
  { // Void emerald
    top: new THREE.Color(0.20, 0.65, 0.35),
    mid: new THREE.Color(0.12, 0.45, 0.25),
    deep: new THREE.Color(0.06, 0.28, 0.15),
    accent: new THREE.Color(0.35, 0.95, 0.55),
    crystal: new THREE.Color(0.1, 1.0, 0.4),
  },
];

function generateIslandDefinitions(seed: number): IslandDef[] {
  const rng = seededRandom(seed);
  const islands: IslandDef[] = [];

  // Central main island — large and prominent
  islands.push({
    cx: 0, cy: 0, cz: 0,
    radiusX: 8, radiusZ: 8, maxHeight: 12,
    seed: Math.floor(rng() * 100000),
    palette: ISLAND_PALETTES[0],
    rotationSpeed: 0.02,
    bobSpeed: 0.3,
    bobAmplitude: 0.5,
  });

  // Surrounding floating islands at various positions and altitudes
  const islandConfigs = [
    { dist: 22, angle: 0.4, y: 6, rx: 5, rz: 5, h: 8, pi: 1 },
    { dist: 28, angle: 1.8, y: -4, rx: 6, rz: 4, h: 7, pi: 2 },
    { dist: 18, angle: 3.2, y: 10, rx: 4, rz: 4, h: 6, pi: 3 },
    { dist: 35, angle: 4.5, y: -8, rx: 7, rz: 6, h: 9, pi: 4 },
    { dist: 25, angle: 5.8, y: 3, rx: 3, rz: 3, h: 5, pi: 0 },
    // Smaller distant fragments
    { dist: 42, angle: 0.9, y: 14, rx: 3, rz: 2, h: 4, pi: 2 },
    { dist: 38, angle: 2.6, y: -12, rx: 2, rz: 3, h: 3, pi: 1 },
    { dist: 45, angle: 4.0, y: 8, rx: 2, rz: 2, h: 3, pi: 3 },
    { dist: 50, angle: 5.2, y: -6, rx: 3, rz: 2, h: 4, pi: 4 },
  ];

  for (const cfg of islandConfigs) {
    const angle = cfg.angle + rng() * 0.3;
    islands.push({
      cx: Math.cos(angle) * cfg.dist,
      cy: cfg.y + (rng() - 0.5) * 4,
      cz: Math.sin(angle) * cfg.dist,
      radiusX: cfg.rx,
      radiusZ: cfg.rz,
      maxHeight: cfg.h,
      seed: Math.floor(rng() * 100000),
      palette: ISLAND_PALETTES[cfg.pi],
      rotationSpeed: 0.01 + rng() * 0.02,
      bobSpeed: 0.2 + rng() * 0.3,
      bobAmplitude: 0.3 + rng() * 0.7,
    });
  }

  return islands;
}

interface VoxelBlock {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  emissive: number; // 0 = no emission, >0 = crystal glow
}

function generateIslandVoxels(def: IslandDef): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  const rng = seededRandom(def.seed);

  for (let x = -def.radiusX; x <= def.radiusX; x++) {
    for (let z = -def.radiusZ; z <= def.radiusZ; z++) {
      // Elliptical distance from center
      const distNorm = Math.sqrt(
        (x / def.radiusX) * (x / def.radiusX) +
        (z / def.radiusZ) * (z / def.radiusZ)
      );

      if (distNorm > 1.05) continue;

      // Height based on distance from center — taller at center, tapers at edges
      const heightFactor = Math.max(0, 1.0 - distNorm * distNorm);
      const noiseH = smoothNoise(x * 0.2 + def.seed * 0.1, z * 0.2, def.seed);
      const height = Math.max(1, Math.floor(
        def.maxHeight * heightFactor + noiseH * 3
      ));

      // Underside — stalactite-like hanging blocks beneath the island
      const underDepth = Math.max(0, Math.floor(
        (def.maxHeight * 0.5) * heightFactor * (0.5 + noiseH * 0.5)
      ));

      // Top surface blocks
      for (let y = 0; y < height; y++) {
        const t = height > 1 ? y / (height - 1) : 0.5;
        let color: THREE.Color;
        if (y === height - 1) {
          color = def.palette.accent.clone().lerp(def.palette.top, 0.3);
        } else if (t > 0.6) {
          color = def.palette.top.clone();
        } else if (t > 0.25) {
          color = def.palette.mid.clone();
        } else {
          color = def.palette.deep.clone();
        }

        // Add subtle noise to color
        const colorNoise = (rng() - 0.5) * 0.06;
        color.r = Math.max(0, Math.min(1, color.r + colorNoise));
        color.g = Math.max(0, Math.min(1, color.g + colorNoise));
        color.b = Math.max(0, Math.min(1, color.b + colorNoise));

        blocks.push({ x, y, z, color, emissive: 0 });
      }

      // Underside blocks (hanging stalactites)
      for (let y = 1; y <= underDepth; y++) {
        const t = y / Math.max(1, underDepth);
        const color = def.palette.deep.clone().lerp(
          new THREE.Color(0.05, 0.02, 0.1), t * 0.7
        );
        blocks.push({ x, y: -y, z, color, emissive: 0 });
      }

      // Crystal formations on top of tallest columns
      if (height > def.maxHeight * 0.7 && rng() > 0.7) {
        const crystalHeight = 1 + Math.floor(rng() * 3);
        for (let cy = 0; cy < crystalHeight; cy++) {
          blocks.push({
            x, y: height + cy, z,
            color: def.palette.crystal.clone(),
            emissive: 0.8 + rng() * 0.2,
          });
        }
      }
    }
  }

  return blocks;
}

// ============================================================================
// CHROMATIC ABERRATION SHADER
// ============================================================================

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    u_strength: { value: 0.003 },
    u_time: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float u_strength;
    uniform float u_time;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - vec2(0.5);
      float dist = length(dir);
      float strength = u_strength * (1.0 + sin(u_time * 0.5) * 0.2);
      vec2 offset = dir * dist * strength;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      float a = texture2D(tDiffuse, vUv).a;
      gl_FragColor = vec4(r, g, b, a);
    }
  `,
};

// ============================================================================
// VIGNETTE + FILM GRAIN SHADER
// ============================================================================

const VignetteGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    u_time: { value: 0.0 },
    u_vignetteStrength: { value: 0.45 },
    u_grainStrength: { value: 0.04 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float u_time;
    uniform float u_vignetteStrength;
    uniform float u_grainStrength;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Vignette
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = 1.0 - smoothstep(0.3, 0.85, dist) * u_vignetteStrength;
      color.rgb *= vignette;

      // Film grain
      float grain = (hash(vUv * 1000.0 + u_time * 100.0) - 0.5) * u_grainStrength;
      color.rgb += grain;

      gl_FragColor = color;
    }
  `,
};

// ============================================================================
// COSMIC PARTICLE SYSTEM
// ============================================================================

function createCosmicParticles(count: number, spread: number, seed: number): THREE.Points {
  const rng = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rng() - 0.5) * spread;
    positions[i * 3 + 1] = (rng() - 0.5) * spread;
    positions[i * 3 + 2] = (rng() - 0.5) * spread;

    // Random color from cosmic palette
    const t = rng();
    if (t < 0.3) {
      // Purple/violet
      colors[i * 3] = 0.5 + rng() * 0.3;
      colors[i * 3 + 1] = 0.2 + rng() * 0.2;
      colors[i * 3 + 2] = 0.8 + rng() * 0.2;
    } else if (t < 0.6) {
      // Cyan/teal
      colors[i * 3] = 0.1 + rng() * 0.2;
      colors[i * 3 + 1] = 0.6 + rng() * 0.3;
      colors[i * 3 + 2] = 0.8 + rng() * 0.2;
    } else if (t < 0.8) {
      // Golden
      colors[i * 3] = 0.8 + rng() * 0.2;
      colors[i * 3 + 1] = 0.6 + rng() * 0.2;
      colors[i * 3 + 2] = 0.1 + rng() * 0.1;
    } else {
      // White/blue
      colors[i * 3] = 0.7 + rng() * 0.3;
      colors[i * 3 + 1] = 0.7 + rng() * 0.3;
      colors[i * 3 + 2] = 0.9 + rng() * 0.1;
    }

    sizes[i] = 0.1 + rng() * 0.4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

// ============================================================================
// COSMIC ENERGY BEAM — vertical light pillars between islands
// ============================================================================

function createEnergyBeam(
  fromY: number, toY: number, x: number, z: number,
  color: THREE.Color, intensity: number,
): THREE.Mesh {
  const height = Math.abs(toY - fromY);
  const geo = new THREE.CylinderGeometry(0.15, 0.15, height, 8, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: intensity * 0.3,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, (fromY + toY) / 2, z);
  return mesh;
}

// ============================================================================
// BLOCK DETAIL TEXTURES (procedural)
// ============================================================================

function createBlockDetailTexture(seed: number): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const rng = seededRandom(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let val = 0.78;
      val += (smoothNoise(x * 0.06, y * 0.06, seed + 7000) - 0.5) * 0.18;
      val += (smoothNoise(x * 0.14, y * 0.14, seed + 7100) - 0.5) * 0.10;
      val += (rng() - 0.5) * 0.08;

      const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edgeDist < 4) {
        const t = edgeDist / 4;
        val *= 0.5 + 0.5 * (t * t);
      }

      val = Math.max(0, Math.min(1, val));
      const byte = Math.round(val * 255);
      imgData.data[idx] = byte;
      imgData.data[idx + 1] = byte;
      imgData.data[idx + 2] = byte;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBlockBumpMap(seed: number): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const rng = seededRandom(seed + 5000);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let h = 0.5;
      h += (smoothNoise(x * 0.08, y * 0.08, seed + 8000) - 0.5) * 0.3;
      h += (smoothNoise(x * 0.2, y * 0.2, seed + 8100) - 0.5) * 0.18;
      h += (rng() - 0.5) * 0.06;
      const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edgeDist < 4) h *= edgeDist / 4;
      h = Math.max(0, Math.min(1, h));
      const byte = Math.round(h * 255);
      imgData.data[idx] = byte;
      imgData.data[idx + 1] = byte;
      imgData.data[idx + 2] = byte;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CosmicLandscapeSceneProps {
  onLoaded?: () => void;
}

const CosmicLandscapeScene = memo(({ onLoaded }: CosmicLandscapeSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isInitializedRef.current || !containerRef.current) return;
    isInitializedRef.current = true;

    const container = containerRef.current;
    const WORLD_SEED = 7742;

    // ======================================================================
    // RENDERER SETUP
    // ======================================================================
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ======================================================================
    // SCENE + CAMERA
    // ======================================================================
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050210, 0.008);

    const camera = new THREE.PerspectiveCamera(
      55, window.innerWidth / window.innerHeight, 0.1, 500
    );
    camera.position.set(35, 20, 35);
    camera.lookAt(0, 2, 0);

    // ======================================================================
    // BACKGROUND SHADER PLANE (cosmic sky)
    // ======================================================================
    const bgScene = new THREE.Scene();
    const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const bgUniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_cameraPos: { value: new THREE.Vector3() },
    };

    async function loadBackgroundShader() {
      try {
        const fragShader = await fetch('/shaders/cosmic-landscape.frag').then(res => {
          if (!res.ok) throw new Error('Shader not found');
          return res.text();
        });

        const bgMaterial = new THREE.ShaderMaterial({
          uniforms: bgUniforms,
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = vec4(position, 1.0);
            }
          `,
          fragmentShader: fragShader,
          depthTest: false,
          depthWrite: false,
        });

        const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMaterial);
        bgScene.add(bgQuad);
      } catch (e) {
        console.warn('Failed to load cosmic background shader:', e);
        scene.background = new THREE.Color(0x050210);
      }
    }

    loadBackgroundShader();

    // ======================================================================
    // LIGHTING — dramatic cosmic illumination
    // ======================================================================
    const ambientLight = new THREE.AmbientLight(0x1a0a2e, 0.4);
    scene.add(ambientLight);

    // Primary light — cool purple directional
    const mainLight = new THREE.DirectionalLight(0x8866cc, 1.2);
    mainLight.position.set(30, 40, 20);
    scene.add(mainLight);

    // Fill light — warm gold from below
    const fillLight = new THREE.DirectionalLight(0xcc8844, 0.4);
    fillLight.position.set(-20, -10, 15);
    scene.add(fillLight);

    // Rim light — cyan accent
    const rimLight = new THREE.DirectionalLight(0x44ccdd, 0.5);
    rimLight.position.set(-10, 20, -30);
    scene.add(rimLight);

    // Point lights for cosmic glow
    const cosmicLight1 = new THREE.PointLight(0x7733ff, 2, 80);
    cosmicLight1.position.set(0, 15, 0);
    scene.add(cosmicLight1);

    const cosmicLight2 = new THREE.PointLight(0x00ccaa, 1.5, 60);
    cosmicLight2.position.set(-25, -5, 20);
    scene.add(cosmicLight2);

    const cosmicLight3 = new THREE.PointLight(0xff6633, 1, 50);
    cosmicLight3.position.set(30, 10, -20);
    scene.add(cosmicLight3);

    // ======================================================================
    // PROCEDURAL TEXTURES
    // ======================================================================
    const detailMap = createBlockDetailTexture(WORLD_SEED);
    const bumpMap = createBlockBumpMap(WORLD_SEED);

    // ======================================================================
    // GENERATE FLOATING ISLANDS
    // ======================================================================
    const islandDefs = generateIslandDefinitions(WORLD_SEED);
    const islandGroups: THREE.Group[] = [];
    const islandMeshData: {
      group: THREE.Group;
      def: IslandDef;
      instancedMesh: THREE.InstancedMesh;
      crystalMesh: THREE.InstancedMesh | null;
    }[] = [];

    const blockGeo = new THREE.BoxGeometry(0.92, 0.92, 0.92);

    for (const def of islandDefs) {
      const voxels = generateIslandVoxels(def);
      const normalBlocks = voxels.filter(v => v.emissive === 0);
      const crystalBlocks = voxels.filter(v => v.emissive > 0);

      const group = new THREE.Group();
      group.position.set(def.cx, def.cy, def.cz);

      // Normal blocks material
      const blockMat = new THREE.MeshStandardMaterial({
        roughness: 0.7,
        metalness: 0.05,
        flatShading: false,
        map: detailMap,
        bumpMap: bumpMap,
        bumpScale: 0.12,
      });

      // Normal blocks instanced mesh
      if (normalBlocks.length > 0) {
        const mesh = new THREE.InstancedMesh(blockGeo, blockMat, normalBlocks.length);
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        for (let i = 0; i < normalBlocks.length; i++) {
          const b = normalBlocks[i];
          dummy.position.set(b.x, b.y, b.z);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          color.copy(b.color);
          mesh.setColorAt(i, color);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        group.add(mesh);

        // Crystal blocks instanced mesh — emissive glowing blocks
        let crystalMesh: THREE.InstancedMesh | null = null;
        if (crystalBlocks.length > 0) {
          const crystalMat = new THREE.MeshStandardMaterial({
            roughness: 0.2,
            metalness: 0.6,
            emissive: def.palette.crystal,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.85,
          });

          crystalMesh = new THREE.InstancedMesh(blockGeo, crystalMat, crystalBlocks.length);
          for (let i = 0; i < crystalBlocks.length; i++) {
            const b = crystalBlocks[i];
            dummy.position.set(b.x, b.y, b.z);
            dummy.scale.set(0.85, 1.1, 0.85);
            dummy.updateMatrix();
            crystalMesh.setMatrixAt(i, dummy.matrix);
            color.copy(b.color);
            crystalMesh.setColorAt(i, color);
          }
          crystalMesh.instanceMatrix.needsUpdate = true;
          if (crystalMesh.instanceColor) crystalMesh.instanceColor.needsUpdate = true;
          group.add(crystalMesh);
        }

        scene.add(group);
        islandGroups.push(group);
        islandMeshData.push({ group, def, instancedMesh: mesh, crystalMesh });
      }
    }

    // ======================================================================
    // ENERGY BEAMS between some islands
    // ======================================================================
    const beams: THREE.Mesh[] = [];
    const beamPairs = [
      [0, 1], [0, 2], [0, 3], [1, 4], [2, 5],
    ];
    for (const [a, b] of beamPairs) {
      if (a < islandDefs.length && b < islandDefs.length) {
        const defA = islandDefs[a];
        const defB = islandDefs[b];
        const midX = (defA.cx + defB.cx) / 2;
        const midZ = (defA.cz + defB.cz) / 2;
        const beam = createEnergyBeam(
          Math.min(defA.cy, defB.cy) - 5,
          Math.max(defA.cy, defB.cy) + defA.maxHeight + 5,
          midX, midZ,
          new THREE.Color(0.4, 0.2, 0.8),
          0.5,
        );
        scene.add(beam);
        beams.push(beam);
      }
    }

    // ======================================================================
    // COSMIC PARTICLE FIELD
    // ======================================================================
    const particles = createCosmicParticles(3000, 150, WORLD_SEED + 100);
    scene.add(particles);

    // Smaller dense particles near center
    const innerParticles = createCosmicParticles(1500, 40, WORLD_SEED + 200);
    scene.add(innerParticles);

    // ======================================================================
    // POST-PROCESSING
    // ======================================================================
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;

    // We'll render bg + scene manually in the loop
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom — ethereal glow
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,   // strength
      0.4,   // radius
      0.6    // threshold
    );
    composer.addPass(bloomPass);

    // Chromatic aberration
    const chromaticPass = new ShaderPass(ChromaticAberrationShader);
    composer.addPass(chromaticPass);

    // Vignette + film grain
    const vignettePass = new ShaderPass(VignetteGrainShader);
    composer.addPass(vignettePass);

    // ======================================================================
    // ANIMATION LOOP
    // ======================================================================
    const clock = new THREE.Clock();
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    function animate() {
      if (!rendererRef.current) return;
      animationFrameRef.current = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Update background shader uniforms
      bgUniforms.u_time.value = elapsed;
      bgUniforms.u_cameraPos.value.copy(camera.position);

      // Update post-processing uniforms
      chromaticPass.uniforms.u_time.value = elapsed;
      vignettePass.uniforms.u_time.value = elapsed;

      // === Camera orbit with mouse parallax ===
      const orbitAngle = elapsed * 0.05;
      const orbitRadius = 42;
      const targetX = Math.cos(orbitAngle) * orbitRadius + mouseX * 8;
      const targetZ = Math.sin(orbitAngle) * orbitRadius + mouseX * 4;
      const targetY = 18 + Math.sin(elapsed * 0.15) * 5 - mouseY * 6;

      camera.position.x += (targetX - camera.position.x) * 0.02;
      camera.position.y += (targetY - camera.position.y) * 0.02;
      camera.position.z += (targetZ - camera.position.z) * 0.02;
      camera.lookAt(0, 2 + Math.sin(elapsed * 0.1) * 2, 0);

      // === Animate floating islands ===
      for (const { group, def } of islandMeshData) {
        // Gentle bobbing
        group.position.y = def.cy + Math.sin(elapsed * def.bobSpeed) * def.bobAmplitude;

        // Very slow rotation
        group.rotation.y += def.rotationSpeed * delta;
      }

      // === Animate energy beams ===
      for (let i = 0; i < beams.length; i++) {
        const beam = beams[i];
        const mat = beam.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.15 + Math.sin(elapsed * 1.5 + i * 1.2) * 0.1;
        beam.rotation.y = elapsed * 0.3 + i;
      }

      // === Animate cosmic lights ===
      cosmicLight1.intensity = 2 + Math.sin(elapsed * 0.8) * 0.5;
      cosmicLight1.position.y = 15 + Math.sin(elapsed * 0.3) * 3;

      cosmicLight2.position.x = -25 + Math.sin(elapsed * 0.2) * 5;
      cosmicLight2.intensity = 1.5 + Math.cos(elapsed * 0.6) * 0.4;

      cosmicLight3.position.z = -20 + Math.cos(elapsed * 0.25) * 8;

      // === Animate particles ===
      particles.rotation.y = elapsed * 0.01;
      particles.rotation.x = Math.sin(elapsed * 0.05) * 0.02;

      innerParticles.rotation.y = -elapsed * 0.03;
      innerParticles.rotation.z = Math.sin(elapsed * 0.1) * 0.01;

      // Pulse inner particle opacity
      const innerMat = innerParticles.material as THREE.PointsMaterial;
      innerMat.opacity = 0.4 + Math.sin(elapsed * 0.7) * 0.15;

      // === Render ===
      // First render the background shader
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(bgScene, bgCamera);

      // Then render the 3D scene on top (with transparency from fog)
      composer.render();
    }

    animationFrameRef.current = requestAnimationFrame(animate);
    onLoaded?.();

    // ======================================================================
    // RESIZE HANDLER
    // ======================================================================
    const handleResize = () => {
      if (!rendererRef.current) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      rendererRef.current.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      composer.setSize(width, height);
      bloomPass.resolution.set(width, height);
      bgUniforms.u_resolution.value.set(width, height);
    };
    resizeHandlerRef.current = handleResize;
    window.addEventListener('resize', handleResize);

    // ======================================================================
    // CLEANUP
    // ======================================================================
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);

      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Dispose island meshes
      for (const { instancedMesh, crystalMesh } of islandMeshData) {
        instancedMesh.geometry.dispose();
        (instancedMesh.material as THREE.Material).dispose();
        if (crystalMesh) {
          crystalMesh.geometry.dispose();
          (crystalMesh.material as THREE.Material).dispose();
        }
      }

      // Dispose beams
      for (const beam of beams) {
        beam.geometry.dispose();
        (beam.material as THREE.Material).dispose();
      }

      // Dispose particles
      particles.geometry.dispose();
      (particles.material as THREE.Material).dispose();
      innerParticles.geometry.dispose();
      (innerParticles.material as THREE.Material).dispose();

      // Dispose textures
      detailMap.dispose();
      bumpMap.dispose();

      // Dispose geometry
      blockGeo.dispose();

      // Dispose post-processing
      composer.dispose();

      // Dispose renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container && rendererRef.current.domElement.parentNode === container) {
          container.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }

      // Dispose all scene objects
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else if (object.material) {
            (object.material as THREE.Material).dispose();
          }
        }
      });

      bgScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });

      isInitializedRef.current = false;
    };
  }, [onLoaded]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    />
  );
});

CosmicLandscapeScene.displayName = 'CosmicLandscapeScene';

export default CosmicLandscapeScene;
