// =============================================================================
// Minecraft: Nintendo Switch Edition — Death & Respawn System
// =============================================================================
// Handles player death processing, death message generation, inventory
// dropping, item entity management, respawn point resolution, and the death
// screen state machine. Integrates with game rules (keepInventory,
// showDeathMessages, immediateRespawn).
// =============================================================================

import type {
  DamageSource,
  BlockCoord,
  Dimension,
  InventorySlot,
  PlayerInventory,
  PlayerState,
} from '@/types/minecraft-switch';
import { MS_CONFIG } from '@/types/minecraft-switch';
import type { SurvivalManager } from './survival';

// =============================================================================
// DEATH MESSAGE GENERATION
// =============================================================================

/** Map of damage sources to death message templates. `{player}` = victim, `{killer}` = attacker. */
const DEATH_MESSAGES: Record<DamageSource, string[]> = {
  player_attack:   ['{player} was slain by {killer}'],
  mob_attack:      ['{player} was slain by {killer}'],
  projectile:      ['{player} was shot by {killer}', '{player} was shot by arrow'],
  explosion:       ['{player} was blown up by {killer}', '{player} blew up'],
  fire:            ['{player} burned to death', '{player} went up in flames'],
  lava:            ['{player} tried to swim in lava'],
  drowning:        ['{player} drowned'],
  fall:            ['{player} fell from a high place', '{player} hit the ground too hard'],
  void:            ['{player} fell out of the world'],
  starving:        ['{player} starved to death'],
  suffocation:     ['{player} suffocated in a wall'],
  cactus:          ['{player} was pricked to death'],
  berry_bush:      ['{player} was poked to death by a sweet berry bush'],
  wither_effect:   ['{player} withered away'],
  poison:          ['{player} was killed by magic'],
  magic:           ['{player} was killed by magic', '{player} was killed by {killer} using magic'],
  thorns:          ['{player} was killed trying to hurt {killer}'],
  lightning:       ['{player} was struck by lightning'],
  anvil:           ['{player} was squashed by a falling anvil'],
  falling_block:   ['{player} was squashed by a falling block'],
  ender_pearl:     ['{player} hit the ground too hard'],
  dragon_breath:   ['{player} was roasted in dragon breath'],
  generic:         ['{player} died'],
};

/**
 * Generate a Minecraft-style death message.
 */
function generateDeathMessage(playerName: string, source: DamageSource, killerName?: string): string {
  const templates = DEATH_MESSAGES[source] || DEATH_MESSAGES.generic;

  // If we have a killer name, prefer templates with {killer}
  if (killerName) {
    const killerTemplates = templates.filter(t => t.includes('{killer}'));
    if (killerTemplates.length > 0) {
      const template = killerTemplates[Math.floor(Math.random() * killerTemplates.length)];
      return template.replace('{player}', playerName).replace('{killer}', killerName);
    }
  }

  // Use templates without {killer}, or fall back to the first one
  const noKillerTemplates = templates.filter(t => !t.includes('{killer}'));
  const pool = noKillerTemplates.length > 0 ? noKillerTemplates : templates;
  const template = pool[Math.floor(Math.random() * pool.length)];

  return template
    .replace('{player}', playerName)
    .replace('{killer}', killerName || 'unknown');
}

// =============================================================================
// DROPPED ITEM ENTITY
// =============================================================================

export interface DroppedItemEntity {
  /** Unique entity ID. */
  id: string;
  /** The item in this entity. */
  item: InventorySlot;
  /** World position. */
  x: number;
  y: number;
  z: number;
  /** Velocity for scatter effect. */
  vx: number;
  vy: number;
  vz: number;
  /** Dimension where the item was dropped. */
  dimension: Dimension;
  /** Ticks remaining before despawn (6000 ticks = 5 minutes). */
  despawnTimer: number;
  /** Whether this item can be picked up (brief delay after dropping). */
  pickupDelay: number;
}

const ITEM_DESPAWN_TICKS = 6000; // 5 minutes at 20 ticks/sec
const ITEM_PICKUP_DELAY = 40;    // 2 seconds before items can be picked up
const SCATTER_SPEED = 0.2;       // horizontal scatter velocity
const SCATTER_UP = 0.3;          // upward scatter velocity

let nextDroppedItemId = 0;

/**
 * Create a dropped item entity with random scatter from a position.
 */
function createDroppedItem(
  item: InventorySlot,
  x: number,
  y: number,
  z: number,
  dimension: Dimension,
): DroppedItemEntity {
  const angle = Math.random() * Math.PI * 2;
  const speed = SCATTER_SPEED * (0.5 + Math.random() * 0.5);

  return {
    id: `dropped_item_${nextDroppedItemId++}`,
    item,
    x,
    y: y + 0.5, // Drop from player center
    z,
    vx: Math.cos(angle) * speed,
    vy: SCATTER_UP + Math.random() * 0.1,
    vz: Math.sin(angle) * speed,
    dimension,
    despawnTimer: ITEM_DESPAWN_TICKS,
    pickupDelay: ITEM_PICKUP_DELAY,
  };
}

// =============================================================================
// DEATH SCREEN STATE
// =============================================================================

export interface DeathScreenState {
  /** Whether the death screen is showing. */
  visible: boolean;
  /** The death message displayed on screen. */
  message: string;
  /** Ticks since death (for Respawn button delay). */
  timeSinceDeath: number;
  /** Score displayed on death screen (= total XP earned). */
  score: number;
  /** Whether the Respawn button is clickable (after 1 second / 20 ticks). */
  canRespawn: boolean;
}

// =============================================================================
// GAME RULES
// =============================================================================

export interface DeathGameRules {
  /** If true, players keep inventory and XP on death. */
  keepInventory: boolean;
  /** If true, death messages are broadcast to all players. */
  showDeathMessages: boolean;
  /** If true, skip the death screen and respawn immediately. */
  immediateRespawn: boolean;
}

const DEFAULT_GAME_RULES: DeathGameRules = {
  keepInventory: false,
  showDeathMessages: true,
  immediateRespawn: false,
};

// =============================================================================
// DEATH MANAGER
// =============================================================================

/**
 * Manages death processing, item dropping, respawn point resolution,
 * and the death screen state for a player.
 */
export class DeathManager {
  // ---- Death screen ----
  isShowingDeathScreen: boolean = false;
  deathScreenMessage: string = '';
  timeSinceDeath: number = 0;
  score: number = 0;

  // ---- Death data ----
  deathPosition: { x: number; y: number; z: number; dimension: Dimension } | null = null;
  droppedItems: DroppedItemEntity[] = [];
  droppedXP: number = 0;

  // ---- Game rules ----
  private gameRules: DeathGameRules;

  // ---- Callbacks ----
  onDeathMessageBroadcast?: (message: string) => void;
  onItemsDropped?: (items: DroppedItemEntity[]) => void;
  onXPDropped?: (amount: number, x: number, y: number, z: number) => void;
  onRespawn?: (player: { position: BlockCoord; dimension: Dimension }) => void;

  constructor(gameRules?: Partial<DeathGameRules>) {
    this.gameRules = { ...DEFAULT_GAME_RULES, ...gameRules };
  }

  // ===========================================================================
  // GAME RULES
  // ===========================================================================

  setGameRule<K extends keyof DeathGameRules>(rule: K, value: DeathGameRules[K]): void {
    this.gameRules[rule] = value;
  }

  getGameRule<K extends keyof DeathGameRules>(rule: K): DeathGameRules[K] {
    return this.gameRules[rule];
  }

  // ===========================================================================
  // DEATH HANDLING
  // ===========================================================================

  /**
   * Called when a player's health reaches 0. Processes death:
   * - Generates death message
   * - Records death position
   * - Drops inventory and XP (unless keepInventory)
   * - Shows death screen (unless immediateRespawn)
   */
  onDeath(
    player: PlayerState,
    cause: DamageSource,
    killerName?: string,
  ): {
    deathMessage: string;
    droppedItems: DroppedItemEntity[];
    droppedXP: number;
  } {
    // Generate death message
    const deathMessage = generateDeathMessage(player.name, cause, killerName);
    this.deathScreenMessage = deathMessage;

    // Record death position
    this.deathPosition = {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      dimension: player.dimension,
    };

    // Calculate XP to drop: min(7 * level, 100)
    this.droppedXP = Math.min(7 * player.level, 100);

    // Drop inventory items (unless keepInventory)
    this.droppedItems = [];
    if (!this.gameRules.keepInventory) {
      this.droppedItems = this.dropInventory(
        player.inventory,
        player.position.x,
        player.position.y,
        player.position.z,
        player.dimension,
      );
    }

    // Score = total XP accumulated before death
    this.score = player.totalExperience;

    // Show death screen
    this.isShowingDeathScreen = !this.gameRules.immediateRespawn;
    this.timeSinceDeath = 0;

    // Broadcast death message
    if (this.gameRules.showDeathMessages && this.onDeathMessageBroadcast) {
      this.onDeathMessageBroadcast(deathMessage);
    }

    // Notify about dropped items
    if (this.droppedItems.length > 0 && this.onItemsDropped) {
      this.onItemsDropped(this.droppedItems);
    }

    // Notify about dropped XP
    if (!this.gameRules.keepInventory && this.droppedXP > 0 && this.onXPDropped) {
      this.onXPDropped(
        this.droppedXP,
        player.position.x,
        player.position.y,
        player.position.z,
      );
    }

    return {
      deathMessage,
      droppedItems: this.droppedItems,
      droppedXP: this.gameRules.keepInventory ? 0 : this.droppedXP,
    };
  }

  // ===========================================================================
  // ITEM DROPPING
  // ===========================================================================

  /**
   * Create dropped item entities from the player's full inventory.
   * Items scatter in random directions from the death point.
   */
  dropInventory(
    inventory: PlayerInventory,
    x: number,
    y: number,
    z: number,
    dimension: Dimension,
  ): DroppedItemEntity[] {
    const entities: DroppedItemEntity[] = [];

    // Helper to process a slot array
    const processSlots = (slots: (InventorySlot | null)[]) => {
      for (const slot of slots) {
        if (slot && slot.count > 0) {
          entities.push(createDroppedItem(slot, x, y, z, dimension));
        }
      }
    };

    // Drop all inventory sections
    processSlots(inventory.main);
    processSlots(inventory.hotbar);
    processSlots(inventory.armor);

    // Offhand
    if (inventory.offhand && inventory.offhand.count > 0) {
      entities.push(createDroppedItem(inventory.offhand, x, y, z, dimension));
    }

    return entities;
  }

  // ===========================================================================
  // DEATH SCREEN
  // ===========================================================================

  /**
   * Tick the death screen state. Call every game tick while the death screen is showing.
   */
  tickDeathScreen(): void {
    if (!this.isShowingDeathScreen) return;

    this.timeSinceDeath++;
  }

  /**
   * Whether the Respawn button is clickable (1 second / 20 ticks after death).
   */
  canRespawn(): boolean {
    return this.timeSinceDeath >= 20;
  }

  /**
   * Get the current death screen state for rendering.
   */
  getDeathScreenState(): DeathScreenState {
    return {
      visible: this.isShowingDeathScreen,
      message: this.deathScreenMessage,
      timeSinceDeath: this.timeSinceDeath,
      score: this.score,
      canRespawn: this.canRespawn(),
    };
  }

  // ===========================================================================
  // RESPAWN
  // ===========================================================================

  /**
   * Determine the respawn point for a player.
   * Returns bed location if set, otherwise world spawn.
   */
  getRespawnPoint(player: PlayerState): { position: BlockCoord; dimension: Dimension } {
    // If player has a spawn point set (from a bed), use it
    if (player.spawnPoint && this.isValidSpawnPoint(player.spawnPoint)) {
      return {
        position: player.spawnPoint,
        dimension: 'overworld', // Beds only work in overworld
      };
    }

    // Default world spawn
    return {
      position: { x: 0, y: MS_CONFIG.SEA_LEVEL + 1, z: 0 },
      dimension: 'overworld',
    };
  }

  /**
   * Execute the respawn sequence. Resets player state and teleports to spawn.
   * Returns the reset player state properties.
   */
  respawn(
    player: PlayerState,
    survivalManager: SurvivalManager,
  ): {
    respawnPoint: { position: BlockCoord; dimension: Dimension };
    clearInventory: boolean;
    resetXP: boolean;
  } {
    const respawnPoint = this.getRespawnPoint(player);

    // Reset survival state (health, hunger, saturation, effects)
    survivalManager.reset();

    // Set 3-second invulnerability after respawn (60 ticks)
    survivalManager.invulnerabilityTicks = 60;

    // Determine whether to clear inventory/XP
    const clearInventory = !this.gameRules.keepInventory;
    const resetXP = !this.gameRules.keepInventory;

    // Clear death screen
    this.isShowingDeathScreen = false;
    this.deathScreenMessage = '';
    this.timeSinceDeath = 0;
    this.score = 0;

    // Notify respawn
    if (this.onRespawn) {
      this.onRespawn(respawnPoint);
    }

    return {
      respawnPoint,
      clearInventory,
      resetXP,
    };
  }

  // ===========================================================================
  // DROPPED ITEM MANAGEMENT
  // ===========================================================================

  /**
   * Tick all dropped item entities. Decrements despawn timers and pickup delays.
   * Returns IDs of items that should be removed (despawned).
   */
  tickDroppedItems(): string[] {
    const despawned: string[] = [];

    for (const item of this.droppedItems) {
      // Decrement pickup delay
      if (item.pickupDelay > 0) {
        item.pickupDelay--;
      }

      // Decrement despawn timer
      item.despawnTimer--;
      if (item.despawnTimer <= 0) {
        despawned.push(item.id);
      }
    }

    // Remove despawned items
    if (despawned.length > 0) {
      this.droppedItems = this.droppedItems.filter(
        item => !despawned.includes(item.id),
      );
    }

    return despawned;
  }

  /**
   * Check if a dropped item can be picked up.
   */
  canPickUp(itemId: string): boolean {
    const item = this.droppedItems.find(i => i.id === itemId);
    return item !== undefined && item.pickupDelay <= 0;
  }

  /**
   * Remove a dropped item (after pickup).
   */
  removeDroppedItem(itemId: string): DroppedItemEntity | null {
    const index = this.droppedItems.findIndex(i => i.id === itemId);
    if (index === -1) return null;
    return this.droppedItems.splice(index, 1)[0];
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Validate a spawn point (basic check — a real implementation would check
   * block conditions like bed presence, obstruction, etc.)
   */
  private isValidSpawnPoint(point: BlockCoord): boolean {
    // A valid spawn point must have reasonable coordinates
    return (
      point.y >= 0 &&
      point.y < MS_CONFIG.WORLD_HEIGHT &&
      isFinite(point.x) &&
      isFinite(point.z)
    );
  }

  /**
   * Reset the death manager state (e.g., when leaving a world).
   */
  reset(): void {
    this.isShowingDeathScreen = false;
    this.deathScreenMessage = '';
    this.timeSinceDeath = 0;
    this.score = 0;
    this.deathPosition = null;
    this.droppedItems = [];
    this.droppedXP = 0;
  }
}
