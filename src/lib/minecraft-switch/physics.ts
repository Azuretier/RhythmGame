// =============================================================================
// PlayerPhysics — Standalone Minecraft survival physics engine
// =============================================================================
// Extracted and expanded from the inline MinecraftWorld physics. Provides a
// complete physics simulation matching Minecraft: Nintendo Switch Edition
// mechanics: AABB collision, water/lava physics, special block effects,
// fall damage tracking, sneaking edge-clamping, creative flight, and more.
// =============================================================================

import {
  Block,
  BlockId,
  PHYSICS,
  MS_CONFIG,
  CHUNK_HEIGHT,
} from '@/types/minecraft-switch';
import { ChunkedWorld } from '@/lib/minecraft-switch/world-gen/chunk-world';

// =============================================================================
// Types
// =============================================================================

/** Input state fed into each physics tick. */
export interface PhysicsInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sneak: boolean;
  sprint: boolean;
  flyToggle: boolean;
}

/** Axis-aligned bounding box. */
export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** Configuration overrides for the physics engine. */
export interface PhysicsConfig {
  /** Gravity in blocks/sec^2 (positive = downward). Default: 32 */
  gravity: number;
  /** Jump initial velocity in blocks/sec. Default: 9.0 */
  jumpVelocity: number;
  /** Terminal velocity in blocks/sec (positive = downward). Default: 78.4 */
  terminalVelocity: number;
  /** Walking speed in blocks/sec. Default: 4.317 */
  walkSpeed: number;
  /** Sprinting speed in blocks/sec. Default: 5.612 */
  sprintSpeed: number;
  /** Sneaking speed in blocks/sec. Default: 1.295 */
  sneakSpeed: number;
  /** Swimming speed in blocks/sec. Default: 2.0 */
  swimSpeed: number;
  /** Creative fly speed in blocks/sec. Default: 10.89 */
  flySpeed: number;
  /** Creative fly sprint speed in blocks/sec. Default: 21.78 */
  flySprintSpeed: number;
  /** Player hitbox width. Default: 0.6 */
  playerWidth: number;
  /** Player hitbox height. Default: 1.8 */
  playerHeight: number;
  /** Eye height from feet. Default: 1.62 */
  eyeHeight: number;
  /** Sneaking eye height from feet. Default: 1.54 */
  sneakEyeHeight: number;
  /** Auto-step height for ledges. Default: 0.6 */
  stepHeight: number;
  /** Climbing speed (ladder/vine) in blocks/sec. Default: 2.35 */
  climbSpeed: number;
  /** Maximum air supply in ticks. Default: 300 */
  maxAirSupply: number;
  /** Whether creative mode (enables flight). Default: false */
  creativeMode: boolean;
}

const DEFAULT_CONFIG: PhysicsConfig = {
  gravity: 32,
  jumpVelocity: 9.0,
  terminalVelocity: 78.4,
  walkSpeed: MS_CONFIG.PLAYER_BASE_SPEED,    // 4.317
  sprintSpeed: MS_CONFIG.PLAYER_SPRINT_SPEED, // 5.612
  sneakSpeed: MS_CONFIG.PLAYER_SNEAK_SPEED,   // 1.295
  swimSpeed: 2.0,
  flySpeed: MS_CONFIG.PLAYER_FLY_SPEED,       // 10.89
  flySprintSpeed: MS_CONFIG.PLAYER_FLY_SPEED * 2, // 21.78
  playerWidth: MS_CONFIG.PLAYER_WIDTH,         // 0.6
  playerHeight: MS_CONFIG.PLAYER_HEIGHT,       // 1.8
  eyeHeight: MS_CONFIG.PLAYER_EYE_HEIGHT,      // 1.62
  sneakEyeHeight: MS_CONFIG.PLAYER_EYE_HEIGHT - 0.08, // 1.54
  stepHeight: PHYSICS.STEP_HEIGHT,             // 0.6
  climbSpeed: 2.35,
  maxAirSupply: MS_CONFIG.MAX_AIR_SUPPLY,      // 300
  creativeMode: false,
};

// =============================================================================
// Block classification helpers
// =============================================================================

/** Set of block IDs that are water (flowing or still). */
const WATER_BLOCKS: ReadonlySet<number> = new Set([
  Block.Water,
  Block.StillWater,
]);

/** Set of block IDs that are lava (flowing or still). */
const LAVA_BLOCKS: ReadonlySet<number> = new Set([
  Block.Lava,
  Block.StillLava,
]);

/** Blocks that are climbable (ladder, vine). */
const CLIMBABLE_BLOCKS: ReadonlySet<number> = new Set([
  Block.Ladder,
  Block.Vine,
]);

/** Ice block IDs for slippery friction. */
const ICE_BLOCKS: ReadonlySet<number> = new Set([
  Block.Ice,
  Block.PackedIce,
  Block.BlueIce,
  Block.FrostedIce,
]);

/** Blocks that are non-solid / passable for collision purposes. */
function isPassableBlock(block: BlockId): boolean {
  if (block === Block.Air) return true;
  if (WATER_BLOCKS.has(block)) return true;
  if (LAVA_BLOCKS.has(block)) return true;
  if (CLIMBABLE_BLOCKS.has(block)) return true;

  // Plants, flowers, crops, mushrooms, torches, etc.
  // These are all "cross" or "none" shape blocks
  if (block === Block.TallGrass) return true;
  if (block === Block.Fern) return true;
  if (block === Block.DeadBush) return true;
  if (block >= Block.Dandelion && block <= Block.RoseBush) return true;
  if (block === Block.SugarCane) return true;
  if (block === Block.Wheat) return true;
  if (block === Block.Carrots) return true;
  if (block === Block.Potatoes) return true;
  if (block === Block.Beetroots) return true;
  if (block === Block.BrownMushroom) return true;
  if (block === Block.RedMushroom) return true;
  if (block === Block.NetherWart) return true;
  if (block === Block.SweetBerryBush) return true;
  if (block === Block.Torch) return true;
  if (block === Block.RedstoneTorch) return true;
  if (block === Block.RedstoneTorch_Wall) return true;
  if (block === Block.RedstoneDust) return true;
  if (block === Block.Rail) return true;
  if (block === Block.PoweredRail) return true;
  if (block === Block.DetectorRail) return true;
  if (block === Block.ActivatorRail) return true;
  if (block === Block.Sign) return true;
  if (block === Block.WallSign) return true;
  if (block === Block.SnowLayer) return true;
  if (block === Block.Cobweb) return true;
  if (block === Block.Carpet) return true;
  if (block === Block.LilyPad) return true;
  if (block === Block.EndRod) return true;

  // Coral plants (not blocks)
  if (block >= Block.TubeCoral && block <= Block.HornCoral) return true;
  if (block === Block.Kelp) return true;
  if (block === Block.SeaGrass) return true;
  if (block === Block.TallSeaGrass) return true;
  if (block === Block.SeaPickle) return true;

  // Glass and glass pane are solid for collision
  // Doors, trapdoors, fence gates — simplified: treat as solid
  return false;
}

// =============================================================================
// PlayerPhysics
// =============================================================================

/**
 * Standalone physics engine for a single player in a chunk-based voxel world.
 *
 * Usage:
 * ```ts
 * const physics = new PlayerPhysics(world);
 * physics.teleport(spawnX, spawnY, spawnZ);
 *
 * // In game loop:
 * physics.update(dt, inputState);
 * const eye = physics.getEyePosition();
 * ```
 */
export class PlayerPhysics {
  // ---- Position & Velocity ----
  /** X position (center of hitbox). */
  x = 0;
  /** Y position (bottom of hitbox / feet). */
  y = 0;
  /** Z position (center of hitbox). */
  z = 0;
  /** Horizontal velocity along X (blocks/sec). */
  vx = 0;
  /** Vertical velocity (blocks/sec, positive = up). */
  vy = 0;
  /** Horizontal velocity along Z (blocks/sec). */
  vz = 0;

  // ---- Rotation ----
  /** Horizontal look angle in radians. */
  yaw = 0;
  /** Vertical look angle in radians. */
  pitch = 0;

  // ---- State Flags ----
  /** Whether the player is standing on solid ground. */
  isOnGround = false;
  /** Whether the player's feet are in water. */
  isInWater = false;
  /** Whether the player's feet are in lava. */
  isInLava = false;
  /** Whether the player is on a climbable block (ladder/vine). */
  isClimbing = false;
  /** Whether creative flight is active. */
  isFlying = false;
  /** Whether the player is currently sprinting. */
  isSprinting = false;
  /** Whether the player is currently sneaking. */
  isSneaking = false;
  /** Whether the player is swimming (in water and moving). */
  isSwimming = false;
  /** Whether the player is inside a cobweb. */
  isInCobweb = false;

  // ---- Fall Damage Tracking ----
  /** Accumulated vertical fall distance in blocks. */
  fallDistance = 0;
  /** The Y position where falling began. */
  private fallStartY = 0;
  /** Whether we are currently tracking a fall. */
  private isFalling = false;

  // ---- Air Supply ----
  /** Remaining air supply in ticks (decrements when head submerged). */
  airSupply: number;

  // ---- Creative Flight ----
  /** Timestamp of last space press for double-tap detection. */
  private lastSpacePress = 0;
  /** Whether space was pressed last tick (for edge detection). */
  private wasSpacePressed = false;

  // ---- Block Beneath Tracking ----
  /** Block ID at the player's feet (for friction/effect lookups). */
  private blockAtFeet: BlockId = Block.Air as BlockId;
  /** Block ID at the player's head position. */
  private blockAtHead: BlockId = Block.Air as BlockId;

  // ---- Sneak Edge Tracking ----
  /** Last on-ground position for sneak edge-clamping. */
  private lastGroundX = 0;
  private lastGroundZ = 0;

  // ---- Dependencies ----
  private world: ChunkedWorld;
  private config: PhysicsConfig;

  // ---- Cached half-width for AABB ----
  private halfWidth: number;

  constructor(world: ChunkedWorld, configOverrides?: Partial<PhysicsConfig>) {
    this.world = world;
    this.config = { ...DEFAULT_CONFIG, ...configOverrides };
    this.halfWidth = this.config.playerWidth / 2;
    this.airSupply = this.config.maxAirSupply;
  }

  // ===========================================================================
  // Main Update
  // ===========================================================================

  /**
   * Run one physics tick.
   * @param dt Delta time in seconds.
   * @param input Player input state for this tick.
   */
  update(dt: number, input: PhysicsInput): void {
    // Clamp dt to avoid physics explosion on lag spikes
    const clampedDt = Math.min(dt, 0.1);

    // Update state flags
    this.isSneaking = input.sneak;
    this.isSprinting = input.sprint && input.forward && !input.sneak;

    // Sample blocks at key positions
    this.sampleBlocks();

    // Detect environment
    this.detectWater();
    this.detectLava();
    this.detectClimbing();
    this.detectCobweb();

    // Handle creative flight toggle (double-tap space)
    this.handleFlyToggle(input);

    // Compute movement direction from input and yaw
    const { moveX, moveZ } = this.computeMovementDirection(input);

    // Determine movement speed
    const speed = this.getMovementSpeed();

    // Apply speed multipliers for special blocks
    const speedMult = this.getBlockSpeedMultiplier();

    // Compute desired horizontal velocity
    const desiredVx = moveX * speed * speedMult;
    const desiredVz = moveZ * speed * speedMult;

    if (this.isFlying) {
      this.updateFlying(clampedDt, input, desiredVx, desiredVz);
    } else if (this.isInWater) {
      this.updateWater(clampedDt, input, desiredVx, desiredVz);
    } else if (this.isInLava) {
      this.updateLava(clampedDt, input, desiredVx, desiredVz);
    } else if (this.isClimbing) {
      this.updateClimbing(clampedDt, input, desiredVx, desiredVz);
    } else if (this.isInCobweb) {
      this.updateCobweb(clampedDt, desiredVx, desiredVz);
    } else {
      this.updateNormal(clampedDt, input, desiredVx, desiredVz);
    }

    // Apply velocity and resolve collisions per-axis
    this.applyMovementAndCollision(clampedDt);

    // Sneak edge clamping — prevent falling off edges when sneaking
    if (this.isSneaking && this.isOnGround) {
      this.clampToEdge();
    }

    // Track ground position for sneak clamping
    if (this.isOnGround) {
      this.lastGroundX = this.x;
      this.lastGroundZ = this.z;
    }

    // Update fall tracking
    this.updateFallTracking();

    // Update air supply
    this.updateAirSupply();

    // Swimming state
    this.isSwimming = this.isInWater && (
      input.forward || input.backward || input.left || input.right
    );
  }

  // ===========================================================================
  // Movement Direction
  // ===========================================================================

  /** Compute normalized movement direction based on yaw and input. */
  private computeMovementDirection(input: PhysicsInput): { moveX: number; moveZ: number } {
    // Forward direction based on yaw
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    let moveX = 0;
    let moveZ = 0;

    if (input.forward) {
      moveX -= sinYaw;
      moveZ -= cosYaw;
    }
    if (input.backward) {
      moveX += sinYaw;
      moveZ += cosYaw;
    }
    if (input.left) {
      moveX -= cosYaw;
      moveZ += sinYaw;
    }
    if (input.right) {
      moveX += cosYaw;
      moveZ -= sinYaw;
    }

    // Normalize so diagonal movement is not faster
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0.001) {
      moveX /= len;
      moveZ /= len;
    }

    return { moveX, moveZ };
  }

  // ===========================================================================
  // Movement Speed
  // ===========================================================================

  /** Get the base movement speed in blocks/sec based on current state. */
  private getMovementSpeed(): number {
    if (this.isFlying) {
      return this.isSprinting ? this.config.flySprintSpeed : this.config.flySpeed;
    }
    if (this.isSwimming || this.isInWater) {
      return this.config.swimSpeed;
    }
    if (this.isInLava) {
      return this.config.swimSpeed * PHYSICS.LAVA_SPEED_MULTIPLIER;
    }
    if (this.isSneaking) {
      return this.config.sneakSpeed;
    }
    if (this.isSprinting) {
      return this.config.sprintSpeed;
    }
    return this.config.walkSpeed;
  }

  /** Get a speed multiplier from the block the player is standing on. */
  private getBlockSpeedMultiplier(): number {
    if (this.isInCobweb) return 0.05;

    const floorBlock = this.getBlockBelow();
    if (floorBlock === Block.SoulSand || floorBlock === Block.SoulSoil) {
      return PHYSICS.SOUL_SAND_SPEED;
    }
    if (floorBlock === Block.HoneyBlock) {
      return PHYSICS.HONEY_SPEED;
    }
    return 1.0;
  }

  // ===========================================================================
  // Normal Ground/Air Physics
  // ===========================================================================

  private updateNormal(
    dt: number,
    input: PhysicsInput,
    desiredVx: number,
    desiredVz: number,
  ): void {
    // Horizontal: set velocity directly (ground) or blend (air)
    if (this.isOnGround) {
      this.vx = desiredVx;
      this.vz = desiredVz;
    } else {
      // Air control: blend toward desired velocity with reduced authority
      const airAccel = 2.0; // blocks/sec^2 of air control authority
      this.vx = this.approach(this.vx, desiredVx, airAccel * dt);
      this.vz = this.approach(this.vz, desiredVz, airAccel * dt);
    }

    // Apply ground friction
    if (this.isOnGround) {
      const friction = this.getGroundFriction();
      // Friction damps velocity each tick: v *= friction^(dt*20)
      // At 20 TPS (dt=0.05), friction applies once per tick
      const frictionFactor = Math.pow(friction, dt * 20);
      this.vx *= frictionFactor;
      this.vz *= frictionFactor;
    } else {
      // Air drag
      const dragFactor = Math.pow(PHYSICS.DRAG, dt * 20);
      this.vx *= dragFactor;
      this.vz *= dragFactor;
    }

    // Gravity
    this.vy -= this.config.gravity * dt;

    // Clamp to terminal velocity
    if (this.vy < -this.config.terminalVelocity) {
      this.vy = -this.config.terminalVelocity;
    }

    // Jump
    if (input.jump && this.isOnGround) {
      this.vy = this.config.jumpVelocity;
      this.isOnGround = false;

      // Sprint jump boost: add forward velocity
      if (this.isSprinting) {
        const sinYaw = Math.sin(this.yaw);
        const cosYaw = Math.cos(this.yaw);
        const boost = PHYSICS.SPRINT_JUMP_BOOST * 20; // convert per-tick to per-sec
        this.vx -= sinYaw * boost;
        this.vz -= cosYaw * boost;
      }
    }
  }

  // ===========================================================================
  // Water Physics
  // ===========================================================================

  private updateWater(
    dt: number,
    input: PhysicsInput,
    desiredVx: number,
    desiredVz: number,
  ): void {
    // Horizontal movement with water drag
    this.vx = desiredVx;
    this.vz = desiredVz;

    const waterDrag = Math.pow(PHYSICS.WATER_DRAG, dt * 20);
    this.vx *= waterDrag;
    this.vz *= waterDrag;

    // Vertical: reduced gravity + buoyancy
    const waterGravity = 2.0; // blocks/sec^2 in water
    this.vy -= waterGravity * dt;

    // Buoyancy pushes upward slightly
    this.vy += PHYSICS.WATER_BUOYANCY * 20 * dt;

    // Vertical drag
    this.vy *= waterDrag;

    // Space = swim upward
    if (input.jump) {
      this.vy += 4.0 * dt;
    }

    // Sneak = sink faster
    if (input.sneak) {
      this.vy -= 3.0 * dt;
    }

    // Clamp vertical
    if (this.vy < -this.config.terminalVelocity * 0.5) {
      this.vy = -this.config.terminalVelocity * 0.5;
    }
    if (this.vy > 4.0) {
      this.vy = 4.0;
    }
  }

  // ===========================================================================
  // Lava Physics
  // ===========================================================================

  private updateLava(
    dt: number,
    input: PhysicsInput,
    desiredVx: number,
    desiredVz: number,
  ): void {
    // Similar to water but much slower
    this.vx = desiredVx * PHYSICS.LAVA_SPEED_MULTIPLIER;
    this.vz = desiredVz * PHYSICS.LAVA_SPEED_MULTIPLIER;

    const lavaDrag = Math.pow(0.5, dt * 20);
    this.vx *= lavaDrag;
    this.vz *= lavaDrag;

    // Reduced gravity in lava
    const lavaGravity = 2.0;
    this.vy -= lavaGravity * dt;
    this.vy += PHYSICS.LAVA_BUOYANCY * 20 * dt;
    this.vy *= lavaDrag;

    // Can swim up but slowly
    if (input.jump) {
      this.vy += 2.0 * dt;
    }

    // Clamp
    if (this.vy < -10.0) this.vy = -10.0;
    if (this.vy > 2.0) this.vy = 2.0;
  }

  // ===========================================================================
  // Climbing Physics (Ladder / Vine)
  // ===========================================================================

  private updateClimbing(
    dt: number,
    input: PhysicsInput,
    desiredVx: number,
    desiredVz: number,
  ): void {
    // Horizontal movement works normally
    this.vx = desiredVx;
    this.vz = desiredVz;

    // Vertical: climb up with jump, climb down with sneak
    if (input.jump) {
      this.vy = this.config.climbSpeed;
    } else if (input.sneak) {
      this.vy = -this.config.climbSpeed;
    } else if (input.forward) {
      // Holding forward toward ladder: no gravity, hold position
      this.vy = Math.max(this.vy, 0);
      // Allow slight upward movement when moving toward ladder
      this.vy = this.config.climbSpeed * 0.5;
    } else {
      // Not holding anything: slow descent (cling to ladder)
      this.vy = Math.max(this.vy, -PHYSICS.LADDER_MAX_FALL * 20);
      // Apply reduced gravity
      this.vy -= this.config.gravity * 0.1 * dt;
    }

    // Clamp fall speed on ladder
    if (this.vy < -PHYSICS.LADDER_MAX_FALL * 20) {
      this.vy = -PHYSICS.LADDER_MAX_FALL * 20;
    }
  }

  // ===========================================================================
  // Cobweb Physics
  // ===========================================================================

  private updateCobweb(
    dt: number,
    desiredVx: number,
    desiredVz: number,
  ): void {
    // Extreme slowdown in cobwebs
    this.vx = desiredVx * 0.05;
    this.vz = desiredVz * 0.05;

    // Very slow fall
    this.vy -= this.config.gravity * 0.05 * dt;
    if (this.vy < -0.5) this.vy = -0.5;

    // Heavy drag
    const cobwebDrag = Math.pow(0.05, dt * 20);
    this.vx *= cobwebDrag;
    this.vz *= cobwebDrag;
    this.vy *= cobwebDrag;
  }

  // ===========================================================================
  // Flying Physics (Creative Mode)
  // ===========================================================================

  private updateFlying(
    dt: number,
    input: PhysicsInput,
    desiredVx: number,
    desiredVz: number,
  ): void {
    // Direct horizontal control
    this.vx = desiredVx;
    this.vz = desiredVz;

    // Vertical: space = up, sneak = down
    if (input.jump) {
      this.vy = this.isFlying ? this.config.flySpeed : this.config.jumpVelocity;
    } else if (input.sneak) {
      this.vy = -this.config.flySpeed;
    } else {
      // Slow to a halt vertically
      this.vy *= Math.pow(0.6, dt * 20);
    }

    // No gravity while flying
    // Gentle drag
    const flyDrag = Math.pow(0.9, dt * 20);
    this.vx *= flyDrag;
    this.vz *= flyDrag;
  }

  // ===========================================================================
  // Flight Toggle
  // ===========================================================================

  private handleFlyToggle(input: PhysicsInput): void {
    if (!this.config.creativeMode) {
      this.isFlying = false;
      return;
    }

    // Double-tap space detection
    const now = performance.now();
    const spaceJustPressed = input.flyToggle && !this.wasSpacePressed;
    this.wasSpacePressed = input.flyToggle;

    if (spaceJustPressed) {
      if (now - this.lastSpacePress < 300) {
        // Double tap detected — toggle flight
        this.isFlying = !this.isFlying;
        if (this.isFlying) {
          this.vy = 0;
          this.fallDistance = 0;
          this.isFalling = false;
        }
        this.lastSpacePress = 0; // reset to prevent triple-tap
      } else {
        this.lastSpacePress = now;
      }
    }

    // Disable flight on ground contact if sneaking
    if (this.isFlying && this.isOnGround && input.sneak) {
      this.isFlying = false;
    }
  }

  // ===========================================================================
  // Collision Detection & Resolution
  // ===========================================================================

  /**
   * Apply velocity to position, resolving collisions axis-by-axis.
   * Includes step-up logic for small ledges and head bonk detection.
   */
  private applyMovementAndCollision(dt: number): void {
    const prevOnGround = this.isOnGround;

    // --- X axis ---
    const newX = this.x + this.vx * dt;
    if (!this.collidesAt(newX, this.y, this.z)) {
      this.x = newX;
    } else if (!this.isFlying) {
      // Try step-up: move player up by step height and retry
      const stepY = this.y + this.config.stepHeight;
      if (this.isOnGround && !this.collidesAt(newX, stepY, this.z) &&
          !this.collidesAt(this.x, stepY, this.z)) {
        this.x = newX;
        this.y = stepY;
      } else {
        this.vx = 0;
      }
    } else {
      this.vx = 0;
    }

    // --- Z axis ---
    const newZ = this.z + this.vz * dt;
    if (!this.collidesAt(this.x, this.y, newZ)) {
      this.z = newZ;
    } else if (!this.isFlying) {
      // Try step-up
      const stepY = this.y + this.config.stepHeight;
      if (this.isOnGround && !this.collidesAt(this.x, stepY, newZ) &&
          !this.collidesAt(this.x, stepY, this.z)) {
        this.z = newZ;
        this.y = stepY;
      } else {
        this.vz = 0;
      }
    } else {
      this.vz = 0;
    }

    // --- Y axis ---
    const newY = this.y + this.vy * dt;
    this.isOnGround = false;

    if (this.vy <= 0) {
      // Moving down — check ground collision
      if (!this.collidesAt(this.x, newY, this.z)) {
        this.y = newY;
      } else {
        // Resolve: snap to top of colliding block
        const resolvedY = this.resolveGroundCollision(newY);
        this.y = resolvedY;
        this.handleLanding();
        this.vy = 0;
        this.isOnGround = true;
      }

      // Additional ground probe: check slightly below feet for edge cases
      if (!this.isOnGround && this.vy <= 0) {
        const probeY = this.y - 0.06;
        if (this.collidesAt(this.x, probeY, this.z)) {
          const resolvedY = this.resolveGroundCollision(probeY);
          const gap = this.y - resolvedY;
          if (gap >= 0 && gap < 0.06) {
            this.y = resolvedY;
            if (this.vy < 0) this.vy = 0;
            this.isOnGround = true;
            if (!prevOnGround) {
              this.handleLanding();
            }
          }
        }
      }
    } else {
      // Moving up — check ceiling collision (head bonk)
      if (!this.collidesAt(this.x, newY, this.z)) {
        this.y = newY;
      } else {
        // Head bonk: resolve downward, zero vertical velocity
        this.y = this.resolveCeilingCollision(newY);
        this.vy = 0;
      }
    }

    // World floor boundary
    if (this.y < 0) {
      this.y = 0;
      this.vy = 0;
      this.isOnGround = true;
    }

    // World ceiling boundary
    if (this.y + this.config.playerHeight > CHUNK_HEIGHT) {
      this.y = CHUNK_HEIGHT - this.config.playerHeight;
      if (this.vy > 0) this.vy = 0;
    }
  }

  /**
   * Check if the player's bounding box at (x, y, z) intersects any solid block.
   * y is the position of the player's feet.
   */
  private collidesAt(x: number, y: number, z: number): boolean {
    const hw = this.halfWidth;
    const h = this.config.playerHeight;

    const minBx = Math.floor(x - hw);
    const maxBx = Math.floor(x + hw);
    const minBy = Math.floor(y);
    const maxBy = Math.floor(y + h - 0.01); // slightly less than full height
    const minBz = Math.floor(z - hw);
    const maxBz = Math.floor(z + hw);

    for (let bx = minBx; bx <= maxBx; bx++) {
      for (let by = minBy; by <= maxBy; by++) {
        for (let bz = minBz; bz <= maxBz; bz++) {
          const block = this.world.getBlock(bx, by, bz);
          if (!isPassableBlock(block)) {
            // AABB overlap test between player box and block box
            if (this.aabbOverlaps(x, y, z, bx, by, bz, block)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Check if the player AABB overlaps a block at integer position (bx, by, bz).
   * Handles slabs (half-height) and full blocks.
   */
  private aabbOverlaps(
    px: number, py: number, pz: number,
    bx: number, by: number, bz: number,
    block: BlockId,
  ): boolean {
    const hw = this.halfWidth;
    const ph = this.config.playerHeight;

    // Player AABB
    const pMinX = px - hw;
    const pMaxX = px + hw;
    const pMinY = py;
    const pMaxY = py + ph;
    const pMinZ = pz - hw;
    const pMaxZ = pz + hw;

    // Block AABB (default: full block 1x1x1)
    let bMinY = by;
    let bMaxY = by + 1;

    // Slab blocks are half height (bottom half by default)
    if (this.isSlabBlock(block)) {
      bMaxY = by + 0.5;
    }

    // Check overlap on all 3 axes
    return (
      pMaxX > bx && pMinX < bx + 1 &&
      pMaxY > bMinY && pMinY < bMaxY &&
      pMaxZ > bz && pMinZ < bz + 1
    );
  }

  /** Check if a block is a slab type. */
  private isSlabBlock(block: BlockId): boolean {
    return (
      block === Block.OakSlab ||
      block === Block.SpruceSlab ||
      block === Block.BirchSlab ||
      block === Block.JungleSlab ||
      block === Block.AcaciaSlab ||
      block === Block.DarkOakSlab ||
      block === Block.StoneSlab ||
      block === Block.SandstoneSlab ||
      block === Block.CobblestoneSlab ||
      block === Block.BrickSlab ||
      block === Block.QuartzSlab ||
      block === Block.StoneBrickSlab ||
      block === Block.NetherBrickSlab ||
      block === Block.NetherBrickSlab_ ||
      block === Block.RedSandstoneSlab ||
      block === Block.PrismarineSlab ||
      block === Block.PrismarineBrickSlab ||
      block === Block.DarkPrismarineSlab ||
      block === Block.PurpurSlab
    );
  }

  /**
   * Resolve ground collision: find the Y position where the player should
   * be standing (top of the highest colliding block at current XZ).
   */
  private resolveGroundCollision(attemptedY: number): number {
    const hw = this.halfWidth;
    const minBx = Math.floor(this.x - hw);
    const maxBx = Math.floor(this.x + hw);
    const minBz = Math.floor(this.z - hw);
    const maxBz = Math.floor(this.z + hw);
    const checkY = Math.floor(attemptedY);

    let highestTop = attemptedY;

    for (let bx = minBx; bx <= maxBx; bx++) {
      for (let bz = minBz; bz <= maxBz; bz++) {
        // Check the block at and just above the foot level
        for (let by = checkY; by <= checkY + 1; by++) {
          const block = this.world.getBlock(bx, by, bz);
          if (!isPassableBlock(block)) {
            let blockTop = by + 1;
            if (this.isSlabBlock(block)) {
              blockTop = by + 0.5;
            }
            if (blockTop > highestTop && blockTop <= this.y + this.config.stepHeight + 0.01) {
              highestTop = blockTop;
            }
          }
        }
      }
    }

    return highestTop;
  }

  /**
   * Resolve ceiling collision: find the Y position where the player's head
   * stops hitting the ceiling.
   */
  private resolveCeilingCollision(attemptedY: number): number {
    const headY = attemptedY + this.config.playerHeight;
    const blockY = Math.floor(headY);
    // Snap so that player head is just below the block
    return blockY - this.config.playerHeight;
  }

  // ===========================================================================
  // Block Sampling
  // ===========================================================================

  /** Sample block IDs at feet and head positions. */
  private sampleBlocks(): void {
    const feetBx = Math.floor(this.x);
    const feetBy = Math.floor(this.y);
    const feetBz = Math.floor(this.z);

    this.blockAtFeet = this.world.getBlock(feetBx, feetBy, feetBz);

    const headBy = Math.floor(this.y + this.config.eyeHeight);
    this.blockAtHead = this.world.getBlock(feetBx, headBy, feetBz);
  }

  /** Detect if the player's bounding box intersects water blocks. */
  private detectWater(): void {
    this.isInWater = this.isInFluid(WATER_BLOCKS);
  }

  /** Detect if the player's bounding box intersects lava blocks. */
  private detectLava(): void {
    this.isInLava = this.isInFluid(LAVA_BLOCKS);
  }

  /** Check if any part of the player's hitbox is inside a given fluid set. */
  private isInFluid(fluidSet: ReadonlySet<number>): boolean {
    const hw = this.halfWidth;
    const h = this.config.playerHeight;

    // Check at feet, mid, and head level at each corner
    const checkPoints: [number, number, number][] = [
      [this.x, this.y, this.z],
      [this.x, this.y + h * 0.5, this.z],
      [this.x - hw, this.y, this.z - hw],
      [this.x + hw, this.y, this.z + hw],
      [this.x - hw, this.y, this.z + hw],
      [this.x + hw, this.y, this.z - hw],
    ];

    for (const [px, py, pz] of checkPoints) {
      const block = this.world.getBlock(Math.floor(px), Math.floor(py), Math.floor(pz));
      if (fluidSet.has(block)) return true;
    }
    return false;
  }

  /** Detect if the player is adjacent to / inside a climbable block. */
  private detectClimbing(): void {
    const bx = Math.floor(this.x);
    const by = Math.floor(this.y);
    const bz = Math.floor(this.z);

    // Check at feet and mid-body
    const atFeet = this.world.getBlock(bx, by, bz);
    const atBody = this.world.getBlock(bx, by + 1, bz);

    this.isClimbing = CLIMBABLE_BLOCKS.has(atFeet) || CLIMBABLE_BLOCKS.has(atBody);
  }

  /** Detect if the player is inside a cobweb. */
  private detectCobweb(): void {
    const bx = Math.floor(this.x);
    const by = Math.floor(this.y);
    const bz = Math.floor(this.z);

    const atFeet = this.world.getBlock(bx, by, bz);
    const atBody = this.world.getBlock(bx, by + 1, bz);

    this.isInCobweb = atFeet === Block.Cobweb || atBody === Block.Cobweb;
  }

  /** Get the block directly below the player's feet. */
  private getBlockBelow(): BlockId {
    return this.world.getBlock(
      Math.floor(this.x),
      Math.floor(this.y - 0.01),
      Math.floor(this.z),
    );
  }

  // ===========================================================================
  // Ground Friction
  // ===========================================================================

  /** Get ground friction coefficient based on block below. */
  private getGroundFriction(): number {
    const below = this.getBlockBelow();
    if (ICE_BLOCKS.has(below)) return PHYSICS.ICE_FRICTION;
    if (below === Block.SlimeBlock) return PHYSICS.NORMAL_FRICTION;
    return PHYSICS.NORMAL_FRICTION;
  }

  // ===========================================================================
  // Landing & Fall Damage
  // ===========================================================================

  /** Called when the player lands on the ground. */
  private handleLanding(): void {
    const floorBlock = this.getBlockBelow();

    // Slime block bounce
    if (floorBlock === Block.SlimeBlock && !this.isSneaking) {
      // Bounce: reverse vertical velocity with retention
      this.vy = -this.vy * PHYSICS.SLIME_BOUNCE_FACTOR * 0.8;
      this.isOnGround = false;
      // Reset fall damage on slime — no damage
      this.fallDistance = 0;
      this.isFalling = false;
      return;
    }

    // Calculate fall damage if applicable
    if (this.isFalling && this.fallDistance > 0) {
      // No fall damage in water, on slime blocks, or while flying
      if (!this.isInWater && !this.isFlying) {
        // Hay bale: 80% reduction
        const isHayBale = floorBlock === Block.HayBale;
        const isHoneyBlock = floorBlock === Block.HoneyBlock;

        let effectiveFall = this.fallDistance;
        if (isHayBale) {
          effectiveFall *= 0.2; // 80% reduction
        }
        if (isHoneyBlock) {
          effectiveFall *= 0.2; // 80% reduction
        }

        // Fall damage: (distance - 3) half-hearts
        if (effectiveFall > PHYSICS.FALL_DAMAGE_THRESHOLD) {
          const damage = Math.floor(
            (effectiveFall - PHYSICS.FALL_DAMAGE_THRESHOLD) * PHYSICS.FALL_DAMAGE_PER_BLOCK
          );
          // Expose damage through a callback or event system
          // For now, store it as lastFallDamage for external reading
          this._lastFallDamage = damage;
        }
      }
    }

    this.fallDistance = 0;
    this.isFalling = false;
  }

  /** Last computed fall damage (in half-hearts). Reset after reading. */
  private _lastFallDamage = 0;

  /**
   * Read and consume the last fall damage value.
   * Returns 0 if no fall damage occurred since last check.
   */
  consumeFallDamage(): number {
    const dmg = this._lastFallDamage;
    this._lastFallDamage = 0;
    return dmg;
  }

  // ===========================================================================
  // Fall Tracking
  // ===========================================================================

  private updateFallTracking(): void {
    if (this.isOnGround || this.isInWater || this.isInLava || this.isClimbing || this.isFlying) {
      if (this.isFalling) {
        // Landing was handled in handleLanding() or we are in a safe medium
        this.isFalling = false;
        this.fallDistance = 0;
      }
      this.fallStartY = this.y;
    } else if (this.vy < 0) {
      // We are falling
      if (!this.isFalling) {
        this.isFalling = true;
        this.fallStartY = this.y;
      }
      const currentFall = this.fallStartY - this.y;
      if (currentFall > this.fallDistance) {
        this.fallDistance = currentFall;
      }
    } else {
      // Moving upward — reset fall start to current position
      this.fallStartY = this.y;
    }
  }

  // ===========================================================================
  // Air Supply
  // ===========================================================================

  private updateAirSupply(): void {
    if (this.isSubmerged()) {
      // Head underwater — decrease air
      this.airSupply = Math.max(0, this.airSupply - 1);
    } else {
      // Head above water — restore air
      this.airSupply = Math.min(this.config.maxAirSupply, this.airSupply + 5);
    }
  }

  // ===========================================================================
  // Sneak Edge Clamping
  // ===========================================================================

  /**
   * When sneaking, prevent the player from walking off block edges.
   * Check if we would be over air; if so, clamp back.
   */
  private clampToEdge(): void {
    const hw = this.halfWidth;

    // Check each corner of the bounding box
    const corners: [number, number][] = [
      [this.x - hw, this.z - hw],
      [this.x + hw, this.z - hw],
      [this.x - hw, this.z + hw],
      [this.x + hw, this.z + hw],
    ];

    const feetY = Math.floor(this.y - 0.5);
    let unsupported = true;

    for (const [cx, cz] of corners) {
      const block = this.world.getBlock(Math.floor(cx), feetY, Math.floor(cz));
      if (!isPassableBlock(block)) {
        unsupported = false;
        break;
      }
    }

    if (unsupported) {
      // No ground beneath any corner — clamp back to last ground position
      this.x = this.lastGroundX;
      this.z = this.lastGroundZ;
      this.vx = 0;
      this.vz = 0;
    }
  }

  // ===========================================================================
  // Utility: Approach
  // ===========================================================================

  /** Move `current` toward `target` by at most `maxDelta`. */
  private approach(current: number, target: number, maxDelta: number): number {
    if (current < target) {
      return Math.min(current + maxDelta, target);
    }
    return Math.max(current - maxDelta, target);
  }

  // ===========================================================================
  // Public Helpers
  // ===========================================================================

  /**
   * Get the camera / eye position.
   * Accounts for sneaking (lower eye height).
   */
  getEyePosition(): { x: number; y: number; z: number } {
    const eyeH = this.isSneaking ? this.config.sneakEyeHeight : this.config.eyeHeight;
    return {
      x: this.x,
      y: this.y + eyeH,
      z: this.z,
    };
  }

  /** Get the block ID at the player's feet. */
  getBlockAtFeet(): BlockId {
    return this.blockAtFeet;
  }

  /** Get the block ID at the player's head level. */
  getBlockInHead(): BlockId {
    return this.blockAtHead;
  }

  /** Check if the player's head is submerged in water. */
  isSubmerged(): boolean {
    const headY = this.y + this.config.eyeHeight;
    const block = this.world.getBlock(
      Math.floor(this.x),
      Math.floor(headY),
      Math.floor(this.z),
    );
    return WATER_BLOCKS.has(block);
  }

  /** Get the player's axis-aligned bounding box. */
  getBoundingBox(): AABB {
    const hw = this.halfWidth;
    return {
      minX: this.x - hw,
      minY: this.y,
      minZ: this.z - hw,
      maxX: this.x + hw,
      maxY: this.y + this.config.playerHeight,
      maxZ: this.z + hw,
    };
  }

  /** Teleport the player to an exact position. Resets velocity and fall state. */
  teleport(x: number, y: number, z: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.fallDistance = 0;
    this.isFalling = false;
    this.fallStartY = y;
    this.isOnGround = false;
    this.lastGroundX = x;
    this.lastGroundZ = z;
  }

  /**
   * Apply a knockback force to the player.
   * @param dx Horizontal X direction (will be normalized with dz).
   * @param dz Horizontal Z direction.
   * @param strength Knockback strength multiplier.
   */
  applyKnockback(dx: number, dz: number, strength: number): void {
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.001) return;

    const nx = dx / len;
    const nz = dz / len;

    const horizontalForce = PHYSICS.KNOCKBACK_HORIZONTAL * strength * 20;
    const verticalForce = PHYSICS.KNOCKBACK_VERTICAL * strength * 20;

    this.vx = nx * horizontalForce;
    this.vz = nz * horizontalForce;
    this.vy = verticalForce;

    this.isOnGround = false;
  }

  /**
   * Set the yaw and pitch directly (e.g., from mouse look).
   * Pitch is clamped to [-PI/2, PI/2].
   */
  setRotation(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  }

  /** Get the current physics configuration (read-only copy). */
  getConfig(): Readonly<PhysicsConfig> {
    return { ...this.config };
  }

  /**
   * Update the physics configuration at runtime.
   * Useful for toggling creative mode, changing speeds, etc.
   */
  setConfig(overrides: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...overrides };
    this.halfWidth = this.config.playerWidth / 2;
    if (!this.config.creativeMode) {
      this.isFlying = false;
    }
  }
}
