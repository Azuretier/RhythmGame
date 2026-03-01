/**
 * Procedural Minecraft-style projectile geometry builders for Tower Defense.
 *
 * Each tower type fires a distinct projectile built from Three.js box/plane
 * geometry, matching the Minecraft mob theme of its tower character.
 *
 * Projectile types:
 *   - arrow       (skeleton towers: archer, sniper)
 *   - cobweb      (spider tower: frost)
 *   - tnt         (magma cube tower: cannon — unused, tower uses aura)
 *   - ender_pearl (enderman towers: lightning, arcane)
 *   - fireball    (zombie tower: flame)
 */
import * as THREE from 'three';
import type { TowerType } from '@/types/tower-defense';

// ========== Types ==========

export type TDProjectileType = 'arrow' | 'cobweb' | 'tnt' | 'ender_pearl' | 'fireball';

export interface ProjectileMeshData {
  group: THREE.Group;
  type: TDProjectileType;
  /** Whether this projectile should spin on its flight axis */
  spin: boolean;
  /** Whether this projectile should tumble (rotate on all axes) */
  tumble: boolean;
}

// ========== Tower → Projectile mapping ==========

export const TOWER_PROJECTILE_MAP: Record<TowerType, TDProjectileType> = {
  archer: 'arrow',
  cannon: 'tnt',
  frost: 'cobweb',
  lightning: 'ender_pearl',
  sniper: 'arrow',
  flame: 'fireball',
  arcane: 'ender_pearl',
};

// ========== Shared Geometry / Material Cache ==========

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.Material>();

function getBoxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `box:${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  let geo = geoCache.get(key) as THREE.BoxGeometry | undefined;
  if (!geo) {
    geo = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, geo);
  }
  return geo;
}

function getPlaneGeo(w: number, h: number): THREE.PlaneGeometry {
  const key = `plane:${w.toFixed(3)},${h.toFixed(3)}`;
  let geo = geoCache.get(key) as THREE.PlaneGeometry | undefined;
  if (!geo) {
    geo = new THREE.PlaneGeometry(w, h);
    geoCache.set(key, geo);
  }
  return geo;
}

function getSphereGeo(r: number, wSeg: number, hSeg: number): THREE.SphereGeometry {
  const key = `sphere:${r.toFixed(3)},${wSeg},${hSeg}`;
  let geo = geoCache.get(key) as THREE.SphereGeometry | undefined;
  if (!geo) {
    geo = new THREE.SphereGeometry(r, wSeg, hSeg);
    geoCache.set(key, geo);
  }
  return geo;
}

function getMat(
  color: number,
  opts?: {
    emissive?: number;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    side?: THREE.Side;
    roughness?: number;
  },
): THREE.MeshStandardMaterial {
  const emissive = opts?.emissive ?? 0x000000;
  const emissiveIntensity = opts?.emissiveIntensity ?? 0;
  const transparent = opts?.transparent ?? false;
  const opacity = opts?.opacity ?? 1;
  const side = opts?.side ?? THREE.FrontSide;
  const roughness = opts?.roughness ?? 0.85;
  const key = `${color.toString(16)}-${emissive.toString(16)}-${emissiveIntensity.toFixed(2)}-${transparent}-${opacity.toFixed(2)}-${side}-${roughness.toFixed(2)}`;
  let mat = matCache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,
      flatShading: true,
      emissive,
      emissiveIntensity,
      transparent,
      opacity,
      side,
    });
    matCache.set(key, mat);
  }
  return mat;
}

function mbox(
  w: number, h: number, d: number,
  color: number,
  opts?: Parameters<typeof getMat>[1],
): THREE.Mesh {
  return new THREE.Mesh(getBoxGeo(w, h, d), getMat(color, opts));
}

// ========== Projectile Builders ==========

/**
 * Minecraft-style arrow: thin shaft with triangular tip and feather fletchings.
 * Points along -Z axis (forward).
 */
function createArrow(): ProjectileMeshData {
  const group = new THREE.Group();
  const wood = 0x8B6914;
  const iron = 0xc0c0c0;
  const feather = 0xe8e8e8;

  // Shaft (long thin box along Z)
  const shaft = mbox(0.03, 0.03, 0.45, wood);
  shaft.position.set(0, 0, 0);
  group.add(shaft);

  // Arrowhead (pointed tip at -Z)
  const head = mbox(0.06, 0.06, 0.1, iron, { roughness: 0.3 });
  head.position.set(0, 0, -0.27);
  // Rotate 45 degrees to make diamond shape
  head.rotation.z = Math.PI / 4;
  group.add(head);

  // Fletchings (3 thin fins at +Z end)
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const fin = new THREE.Mesh(
      getPlaneGeo(0.06, 0.1),
      getMat(feather, { side: THREE.DoubleSide }),
    );
    fin.position.set(
      Math.cos(angle) * 0.025,
      Math.sin(angle) * 0.025,
      0.2,
    );
    fin.rotation.z = angle;
    group.add(fin);
  }

  return { group, type: 'arrow', spin: false, tumble: false };
}

/**
 * Spider cobweb projectile: flat web disc with radial strands and spiral rings.
 * Rendered as intersecting semi-transparent planes.
 */
function createCobweb(): ProjectileMeshData {
  const group = new THREE.Group();
  const webColor = 0xeeeeee;
  const webOpts = {
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide as THREE.Side,
    emissive: 0x88ccff as number,
    emissiveIntensity: 0.3,
  };

  // Radial strands — 4 intersecting planes through center
  for (let i = 0; i < 4; i++) {
    const strand = new THREE.Mesh(
      getPlaneGeo(0.35, 0.35),
      getMat(webColor, webOpts),
    );
    strand.rotation.y = (i / 4) * Math.PI;
    group.add(strand);
  }

  // Center knot (small opaque box)
  const knot = mbox(0.04, 0.04, 0.04, 0xcccccc, { emissive: 0x88ccff, emissiveIntensity: 0.5 });
  group.add(knot);

  // Outer ring accent — a thin torus-like band made of small boxes
  const ringSegments = 8;
  const ringRadius = 0.14;
  for (let i = 0; i < ringSegments; i++) {
    const angle = (i / ringSegments) * Math.PI * 2;
    const segment = mbox(0.02, 0.02, 0.04, webColor, webOpts);
    segment.position.set(
      Math.cos(angle) * ringRadius,
      Math.sin(angle) * ringRadius,
      0,
    );
    segment.rotation.z = angle;
    group.add(segment);
  }

  return { group, type: 'cobweb', spin: true, tumble: false };
}

/**
 * Minecraft TNT block: red block with white band and "TNT" detail.
 * Used by creeper (cannon) tower.
 */
function createTNT(): ProjectileMeshData {
  const group = new THREE.Group();
  const red = 0xcc2200;
  const white = 0xffffff;
  const dark = 0x1a1a1a;

  // Main body
  const body = mbox(0.14, 0.14, 0.14, red);
  group.add(body);

  // White band around middle (4 faces)
  const bandFront = mbox(0.145, 0.06, 0.005, white);
  bandFront.position.set(0, 0, -0.073);
  group.add(bandFront);
  const bandBack = mbox(0.145, 0.06, 0.005, white);
  bandBack.position.set(0, 0, 0.073);
  group.add(bandBack);
  const bandLeft = mbox(0.005, 0.06, 0.145, white);
  bandLeft.position.set(-0.073, 0, 0);
  group.add(bandLeft);
  const bandRight = mbox(0.005, 0.06, 0.145, white);
  bandRight.position.set(0.073, 0, 0);
  group.add(bandRight);

  // "T" letter on front (pixel art style)
  const tTop = mbox(0.06, 0.012, 0.003, dark);
  tTop.position.set(0, 0.012, -0.077);
  group.add(tTop);
  const tStem = mbox(0.015, 0.04, 0.003, dark);
  tStem.position.set(0, -0.01, -0.077);
  group.add(tStem);

  // Fuse on top
  const fuse = mbox(0.02, 0.06, 0.02, dark);
  fuse.position.set(0, 0.1, 0);
  group.add(fuse);
  // Fuse spark
  const spark = mbox(0.03, 0.03, 0.03, 0xff8800, {
    emissive: 0xff6600,
    emissiveIntensity: 3,
  });
  spark.position.set(0, 0.135, 0);
  group.add(spark);

  return { group, type: 'tnt', spin: false, tumble: true };
}

/**
 * Ender pearl: dark sphere with purple glow and particle-like accents.
 * Used by enderman (lightning, arcane) towers.
 */
function createEnderPearl(): ProjectileMeshData {
  const group = new THREE.Group();
  const dark = 0x0a1628;
  const purple = 0x8b5cf6;
  const brightPurple = 0xcc66ff;

  // Main sphere
  const pearl = new THREE.Mesh(
    getSphereGeo(0.08, 8, 8),
    getMat(dark, {
      emissive: purple,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
  );
  group.add(pearl);

  // Inner glow core
  const core = new THREE.Mesh(
    getSphereGeo(0.04, 6, 6),
    getMat(brightPurple, {
      emissive: brightPurple,
      emissiveIntensity: 3,
    }),
  );
  group.add(core);

  // Orbiting particle accents (small cubes)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const particle = mbox(0.02, 0.02, 0.02, brightPurple, {
      emissive: brightPurple,
      emissiveIntensity: 2,
    });
    particle.position.set(
      Math.cos(angle) * 0.12,
      Math.sin(angle) * 0.06,
      Math.sin(angle + Math.PI / 4) * 0.12,
    );
    group.add(particle);
  }

  return { group, type: 'ender_pearl', spin: false, tumble: true };
}

/**
 * Fireball: blazing orange/red sphere with flame-like box accents.
 * Used by zombie (flame) tower.
 */
function createFireball(): ProjectileMeshData {
  const group = new THREE.Group();
  const orange = 0xff6600;
  const yellow = 0xffcc00;
  const darkRed = 0x991100;

  // Core
  const core = new THREE.Mesh(
    getSphereGeo(0.07, 6, 6),
    getMat(orange, {
      emissive: orange,
      emissiveIntensity: 2,
      roughness: 0.3,
    }),
  );
  group.add(core);

  // Inner bright center
  const center = new THREE.Mesh(
    getSphereGeo(0.035, 4, 4),
    getMat(yellow, {
      emissive: yellow,
      emissiveIntensity: 4,
    }),
  );
  group.add(center);

  // Flame tongues — small stretched boxes at various angles
  const flameColors = [orange, yellow, darkRed, orange, yellow];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const h = 0.05 + Math.random() * 0.04;
    const flame = mbox(0.03, h, 0.03, flameColors[i], {
      emissive: flameColors[i],
      emissiveIntensity: 1.5,
    });
    flame.position.set(
      Math.cos(angle) * 0.08,
      Math.sin(angle) * 0.08,
      (i % 2 === 0 ? 1 : -1) * 0.03,
    );
    flame.rotation.z = angle + Math.PI / 4;
    group.add(flame);
  }

  return { group, type: 'fireball', spin: false, tumble: true };
}

// ========== Public API ==========

/**
 * Create a projectile mesh for the given tower type.
 */
export function createProjectileMesh(towerType: TowerType): ProjectileMeshData {
  const projType = TOWER_PROJECTILE_MAP[towerType];
  switch (projType) {
    case 'arrow': return createArrow();
    case 'cobweb': return createCobweb();
    case 'tnt': return createTNT();
    case 'ender_pearl': return createEnderPearl();
    case 'fireball': return createFireball();
    default: return createArrow();
  }
}

/**
 * Animate a projectile in flight.
 * - Arrows: orient along velocity direction
 * - Cobwebs: spin on their axis
 * - TNT/ender pearls/fireballs: tumble through the air
 *
 * @param proj - The projectile mesh data
 * @param time - Current time in seconds
 * @param velocity - Normalized direction vector (for arrow orientation)
 */
export function animateProjectile(
  proj: ProjectileMeshData,
  time: number,
  velocity?: THREE.Vector3,
): void {
  if (proj.type === 'arrow' && velocity) {
    // Orient arrow along flight path
    const dir = velocity.clone().normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    proj.group.quaternion.copy(quaternion);
  } else if (proj.spin) {
    // Cobweb: spin on Z axis (like a frisbee)
    proj.group.rotation.z = time * 6;
    proj.group.rotation.x = Math.sin(time * 3) * 0.3;
  } else if (proj.tumble) {
    // TNT, ender pearl, fireball: tumble
    proj.group.rotation.x = time * 5;
    proj.group.rotation.z = time * 3.7;
  }
}

/**
 * Dispose a projectile group.
 * Shared cache resources are NOT disposed (they persist).
 */
export function disposeProjectileGroup(proj: ProjectileMeshData): void {
  // Shared geometry/materials are cached — nothing to dispose per-instance
}

/**
 * Dispose all shared projectile resources (call on component unmount).
 */
export function disposeSharedProjectileResources(): void {
  for (const geo of geoCache.values()) geo.dispose();
  for (const mat of matCache.values()) (mat as THREE.Material).dispose();
  geoCache.clear();
  matCache.clear();
}
