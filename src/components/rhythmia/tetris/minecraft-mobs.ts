/**
 * Minecraft-style pixelized mob geometry builders for TD phase enemies.
 *
 * Each mob type is built from articulated box groups that mimic classic
 * Minecraft proportions (head, body, limbs) with flat-shaded materials.
 *
 * Supports optional GLTF model overrides: place .glb files at
 * /public/models/mobs/{type}.glb to use custom models instead.
 *
 * This barrel module re-exports sub-modules and provides the public API:
 *   createMobMesh, animateMob, getMobHeight, resetMobPose
 */
import type { TDEnemyType } from './types';

// ========== Re-exports from sub-modules ==========

export type { MobMeshData } from './mob-mesh-utils';
export { loadMobGltfModels, disposeMobGroup, disposeSharedMobResources, MOB_HEIGHTS } from './mob-mesh-utils';
import type { MobMeshData } from './mob-mesh-utils';
import { getGltfModel, MOB_HEIGHTS } from './mob-mesh-utils';

// ========== Mob Builders (internal imports) ==========

import { createZombie, createSkeleton, createCreeper, createSpider, createEnderman } from './mob-mesh-hostile';
import { createSlime, createMagmaCube } from './mob-mesh-special';
import { createPig, createChicken, createCow, createBee, createCat, createHorse, createRabbit, createWolf } from './mob-mesh-animals';

// ========== Public API ==========

/**
 * Create a mob mesh for the given enemy type.
 * Uses GLTF model if available, otherwise builds procedural geometry.
 */
export function createMobMesh(type: TDEnemyType, options?: { segments?: number }): MobMeshData {
  // Try GLTF model first
  const gltfModel = getGltfModel(type);
  if (gltfModel) {
    return {
      group: gltfModel,
      type,
      height: MOB_HEIGHTS[type],
      isGltf: true,
    };
  }

  // Fall back to procedural Minecraft-style geometry
  switch (type) {
    case 'zombie': return createZombie();
    case 'skeleton': return createSkeleton();
    case 'creeper': return createCreeper();
    case 'spider': return createSpider();
    case 'enderman': return createEnderman();
    case 'slime': return createSlime(options?.segments);
    case 'magma_cube': return createMagmaCube(options?.segments);
    case 'pig': return createPig();
    case 'chicken': return createChicken();
    case 'cow': return createCow();
    case 'bee': return createBee();
    case 'cat': return createCat();
    case 'horse': return createHorse();
    case 'rabbit': return createRabbit();
    case 'wolf': return createWolf();
    default: return createZombie();
  }
}

/**
 * Animate mob walking. Call each frame for active mobs.
 * @param mob - The mob mesh data
 * @param time - Current time in seconds (for oscillation)
 * @param isMoving - Whether the mob is currently transitioning between tiles
 */
export function animateMob(mob: MobMeshData, time: number, isMoving: boolean): void {
  if (mob.isGltf) return; // GLTF models may have their own animation

  const speed = 8;
  const swing = isMoving ? Math.sin(time * speed) * 0.6 : 0;
  const smallSwing = isMoving ? Math.sin(time * speed) * 0.2 : 0;

  switch (mob.type) {
    case 'zombie':
      // Legs swing, arms stay extended forward with subtle bob
      if (mob.leftLeg) mob.leftLeg.rotation.x = swing;
      if (mob.rightLeg) mob.rightLeg.rotation.x = -swing;
      if (mob.leftArm) mob.leftArm.rotation.x = -Math.PI / 3 + smallSwing;
      if (mob.rightArm) mob.rightArm.rotation.x = -Math.PI / 3 - smallSwing;
      break;

    case 'skeleton':
      // Full arm and leg swing
      if (mob.leftArm) mob.leftArm.rotation.x = swing;
      if (mob.rightArm) mob.rightArm.rotation.x = -swing;
      if (mob.leftLeg) mob.leftLeg.rotation.x = -swing;
      if (mob.rightLeg) mob.rightLeg.rotation.x = swing;
      break;

    case 'creeper':
      // Diagonal leg pairs swing together (like a horse trot)
      if (mob.frontLeftLeg) mob.frontLeftLeg.rotation.x = swing;
      if (mob.backRightLeg) mob.backRightLeg.rotation.x = swing;
      if (mob.frontRightLeg) mob.frontRightLeg.rotation.x = -swing;
      if (mob.backLeftLeg) mob.backLeftLeg.rotation.x = -swing;
      break;

    case 'spider': {
      // Spider legs animate in alternating pairs
      const legs = mob.spiderLegs;
      if (legs) {
        for (let i = 0; i < legs.length; i++) {
          const phase = (i % 2 === 0) ? 1 : -1;
          const legSwing = isMoving ? Math.sin(time * 10 + i * 0.8) * 0.3 : 0;
          legs[i].rotation.x = phase * legSwing;
        }
      }
      break;
    }

    case 'enderman':
      // Long limbs swing with slower, eerie motion
      if (mob.leftArm) mob.leftArm.rotation.x = swing * 0.5;
      if (mob.rightArm) mob.rightArm.rotation.x = -swing * 0.5;
      if (mob.leftLeg) mob.leftLeg.rotation.x = -swing * 0.7;
      if (mob.rightLeg) mob.rightLeg.rotation.x = swing * 0.7;
      break;

    case 'slime': {
      // Slime bounces up and down with a squish effect
      const bounce = isMoving ? Math.abs(Math.sin(time * 6)) * 0.15 : Math.sin(time * 2) * 0.05;
      mob.group.position.y = bounce;
      const squish = isMoving ? 1 + Math.sin(time * 6) * 0.1 : 1;
      mob.group.scale.y = squish;
      break;
    }

    case 'magma_cube': {
      // Magma cube bounces like slime but with a pulsing squish
      const mgBounce = isMoving ? Math.abs(Math.sin(time * 5)) * 0.15 : Math.sin(time * 2) * 0.05;
      mob.group.position.y = mgBounce;
      const mgSquish = isMoving ? 1 + Math.sin(time * 5) * 0.12 : 1;
      mob.group.scale.y = mgSquish;
      break;
    }

    case 'pig':
    case 'cow':
    case 'horse':
    case 'cat':
    case 'wolf':
    case 'rabbit':
      // Quadruped diagonal leg swing
      if (mob.frontLeftLeg) mob.frontLeftLeg.rotation.x = swing;
      if (mob.backRightLeg) mob.backRightLeg.rotation.x = swing;
      if (mob.frontRightLeg) mob.frontRightLeg.rotation.x = -swing;
      if (mob.backLeftLeg) mob.backLeftLeg.rotation.x = -swing;
      break;

    case 'chicken':
      // Bipedal waddle walk
      if (mob.leftLeg) mob.leftLeg.rotation.x = swing;
      if (mob.rightLeg) mob.rightLeg.rotation.x = -swing;
      break;

    case 'bee': {
      // Buzzing wing flap
      const wingFlap = Math.sin(time * 30) * 0.8;
      if (mob.leftArm) mob.leftArm.rotation.z = -0.3 + wingFlap;
      if (mob.rightArm) mob.rightArm.rotation.z = 0.3 - wingFlap;
      // Gentle bob
      mob.group.position.y = (mob.group.position.y || 0) + Math.sin(time * 4) * 0.03;
      break;
    }
  }
}

/** Get the height of a mob type. */
export function getMobHeight(type: TDEnemyType): number {
  return MOB_HEIGHTS[type];
}

/**
 * Reset all limb rotations to their neutral pose.
 * Must be called when reusing a pooled mob to avoid carrying over
 * the previous enemy's mid-animation limb positions.
 */
export function resetMobPose(mob: MobMeshData): void {
  if (mob.isGltf) return;

  switch (mob.type) {
    case 'zombie':
      if (mob.leftArm) mob.leftArm.rotation.x = -Math.PI / 3;
      if (mob.rightArm) mob.rightArm.rotation.x = -Math.PI / 3;
      if (mob.leftLeg) mob.leftLeg.rotation.x = 0;
      if (mob.rightLeg) mob.rightLeg.rotation.x = 0;
      break;
    case 'skeleton':
    case 'enderman':
      if (mob.leftArm) mob.leftArm.rotation.x = 0;
      if (mob.rightArm) mob.rightArm.rotation.x = 0;
      if (mob.leftLeg) mob.leftLeg.rotation.x = 0;
      if (mob.rightLeg) mob.rightLeg.rotation.x = 0;
      break;
    case 'creeper':
      if (mob.frontLeftLeg) mob.frontLeftLeg.rotation.x = 0;
      if (mob.frontRightLeg) mob.frontRightLeg.rotation.x = 0;
      if (mob.backLeftLeg) mob.backLeftLeg.rotation.x = 0;
      if (mob.backRightLeg) mob.backRightLeg.rotation.x = 0;
      break;
    case 'spider':
      if (mob.spiderLegs) {
        for (const leg of mob.spiderLegs) leg.rotation.x = 0;
      }
      break;
    case 'slime':
    case 'magma_cube':
      mob.group.position.y = 0;
      mob.group.scale.y = 1;
      break;
    case 'pig':
    case 'cow':
    case 'horse':
    case 'cat':
    case 'wolf':
    case 'rabbit':
      if (mob.frontLeftLeg) mob.frontLeftLeg.rotation.x = 0;
      if (mob.frontRightLeg) mob.frontRightLeg.rotation.x = 0;
      if (mob.backLeftLeg) mob.backLeftLeg.rotation.x = 0;
      if (mob.backRightLeg) mob.backRightLeg.rotation.x = 0;
      break;
    case 'chicken':
      if (mob.leftLeg) mob.leftLeg.rotation.x = 0;
      if (mob.rightLeg) mob.rightLeg.rotation.x = 0;
      break;
    case 'bee':
      if (mob.leftArm) mob.leftArm.rotation.z = 0;
      if (mob.rightArm) mob.rightArm.rotation.z = 0;
      break;
  }
}
