// =============================================================================
// World List Management — WorldListManager
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================
// Class-based world list manager providing CRUD operations, sorting,
// duplication, formatting, and world count enforcement. Built on top
// of WorldSaveManager for IndexedDB persistence.
// =============================================================================

import type { GameMode, Difficulty, Dimension } from '@/types/minecraft-switch';
import {
  WorldSaveManager,
  getWorldSaveManager,
  type WorldSaveData,
  type WorldMetadata,
} from './world-save';
import type { GameRules } from '@/lib/minecraft-switch/game-modes';
import { getDefaultGameRules } from '@/lib/minecraft-switch/game-modes';

// =============================================================================
// Types
// =============================================================================

export interface WorldListEntry {
  id: string;
  name: string;
  lastPlayed: number;
  createdAt: number;
  gameMode: GameMode;
  difficulty: Difficulty;
  worldSize: 'classic' | 'medium' | 'large';
  playTime: number;           // seconds
  thumbnail?: string;         // base64 data URL
}

export type WorldSortBy = 'lastPlayed' | 'name' | 'createdAt';

// =============================================================================
// WorldListManager
// =============================================================================

/**
 * Manages the list of saved worlds, providing high-level CRUD operations,
 * sorting, duplication, formatting helpers, and world count limits.
 *
 * Wraps a WorldSaveManager instance for database access.
 */
export class WorldListManager {
  /** Maximum number of worlds a player can have. */
  static readonly MAX_WORLDS = 20;

  private saveManager: WorldSaveManager;

  /**
   * @param saveManager - WorldSaveManager instance for database access.
   *   If not provided, uses the global singleton.
   */
  constructor(saveManager?: WorldSaveManager) {
    this.saveManager = saveManager ?? getWorldSaveManager();
  }

  // ---------------------------------------------------------------------------
  // List / Query
  // ---------------------------------------------------------------------------

  /**
   * Get all worlds as WorldListEntry objects, sorted by lastPlayed descending.
   */
  async getWorldList(): Promise<WorldListEntry[]> {
    const metadataList = await this.saveManager.listWorlds();

    const entries: WorldListEntry[] = metadataList.map((meta) =>
      metadataToEntry(meta)
    );

    // Already sorted by listWorlds, but enforce descending lastPlayed
    entries.sort((a, b) => b.lastPlayed - a.lastPlayed);
    return entries;
  }

  /**
   * Get the total number of saved worlds.
   */
  async getWorldCount(): Promise<number> {
    return this.saveManager.getWorldCount();
  }

  /**
   * Check if a new world can be created (under the MAX_WORLDS limit).
   */
  async canCreateWorld(): Promise<boolean> {
    const count = await this.getWorldCount();
    return count < WorldListManager.MAX_WORLDS;
  }

  // ---------------------------------------------------------------------------
  // Create World
  // ---------------------------------------------------------------------------

  /**
   * Create a new world with the given settings and return its ID.
   *
   * Sets up initial player state at spawn (position 0,64,0), full health
   * and hunger, empty inventory, default game rules, and day-one time.
   *
   * @param name       - Display name for the world
   * @param seed       - World generation seed
   * @param gameMode   - Starting game mode
   * @param difficulty - World difficulty
   * @param worldSize  - World boundary size
   * @param gameRules  - Custom game rules (optional, defaults to vanilla)
   * @returns The new world's unique ID
   * @throws Error if the maximum world count has been reached
   */
  async createWorld(
    name: string,
    seed: number,
    gameMode: GameMode,
    difficulty: Difficulty,
    worldSize: 'classic' | 'medium' | 'large',
    gameRules?: Partial<Record<string, boolean | number>>
  ): Promise<string> {
    const count = await this.getWorldCount();
    if (count >= WorldListManager.MAX_WORLDS) {
      throw new Error(
        `Cannot create world: maximum of ${WorldListManager.MAX_WORLDS} worlds reached.`
      );
    }

    const worldId = generateWorldId();
    const now = Date.now();

    // Merge custom game rules with defaults
    const defaultRules = getDefaultGameRules();
    const mergedRules: GameRules = { ...defaultRules };
    if (gameRules) {
      for (const [key, value] of Object.entries(gameRules)) {
        if (key in mergedRules && value !== undefined) {
          (mergedRules as unknown as Record<string, boolean | number>)[key] = value;
        }
      }
    }

    // Default spawn position
    const spawnPosition = { x: 0, y: 64, z: 0, yaw: 0, pitch: 0 };

    const saveData: WorldSaveData = {
      metadata: {
        id: worldId,
        name,
        seed,
        worldSize,
        gameMode,
        difficulty,
        createdAt: now,
        playedTime: 0,
        lastPlayed: now,
        dimension: 'overworld' as Dimension,
      },
      playerState: {
        position: spawnPosition,
        inventory: {
          main: new Array(27).fill(null),
          hotbar: new Array(9).fill(null),
          armor: new Array(4).fill(null),
          offhand: null,
          selectedSlot: 0,
        },
        health: 20,
        hunger: 20,
        saturation: 5,
        experience: 0,
        level: 0,
        totalExperience: 0,
        statusEffects: [],
        dimension: 'overworld',
        spawnPoint: { x: 0, y: 64, z: 0 },
        gameMode,
      },
      gameRules: mergedRules,
      worldTime: {
        tickCount: 0,
        dayCount: 0,
        timeOfDay: 0,
      },
      weather: {
        type: 'clear',
        duration: 12000,
        thundering: false,
        thunderDuration: 0,
      },
      tileEntities: [],
      blockChanges: [],
    };

    await this.saveManager.saveWorld(worldId, saveData);
    return worldId;
  }

  // ---------------------------------------------------------------------------
  // Duplicate World
  // ---------------------------------------------------------------------------

  /**
   * Duplicate an existing world with a new name.
   * Copies all world data including chunk data.
   *
   * @param id      - ID of the world to duplicate
   * @param newName - Name for the duplicated world
   * @returns The new world's ID, or null if the source was not found
   * @throws Error if the maximum world count has been reached
   */
  async duplicateWorld(id: string, newName: string): Promise<string> {
    const count = await this.getWorldCount();
    if (count >= WorldListManager.MAX_WORLDS) {
      throw new Error(
        `Cannot duplicate world: maximum of ${WorldListManager.MAX_WORLDS} worlds reached.`
      );
    }

    // Export the source world as a blob
    let blob: Blob;
    try {
      blob = await this.saveManager.exportWorld(id);
    } catch {
      throw new Error(`Source world "${id}" not found or could not be exported.`);
    }

    // Import creates a new ID automatically
    const newWorldId = await this.saveManager.importWorld(blob);

    // Rename the copy
    await this.saveManager.renameWorld(newWorldId, newName);

    return newWorldId;
  }

  // ---------------------------------------------------------------------------
  // Delete World
  // ---------------------------------------------------------------------------

  /**
   * Delete a world and all its associated data (chunks, etc.).
   *
   * Returns a confirmation object with the deleted world's name and ID
   * for UI display purposes.
   *
   * @param id - ID of the world to delete
   * @returns Object with { deleted: true, id, name } or { deleted: false } if not found
   */
  async deleteWorld(id: string): Promise<{
    deleted: boolean;
    id?: string;
    name?: string;
  }> {
    // Load metadata before deleting for confirmation data
    const data = await this.saveManager.loadWorld(id);
    if (!data) {
      return { deleted: false };
    }

    const name = data.metadata.name;
    await this.saveManager.deleteWorld(id);
    return { deleted: true, id, name };
  }

  // ---------------------------------------------------------------------------
  // Formatting Helpers
  // ---------------------------------------------------------------------------

  /**
   * Format a play time in seconds to a human-readable string.
   *
   * Examples:
   * - 0      -> "0 minutes"
   * - 120    -> "2 minutes"
   * - 3660   -> "1 hour 1 minute"
   * - 7200   -> "2 hours 0 minutes"
   * - 90000  -> "25 hours 0 minutes"
   */
  formatPlayTime(seconds: number): string {
    if (seconds < 0) seconds = 0;

    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    }

    const hourStr = hours === 1 ? '1 hour' : `${hours} hours`;
    const minStr = minutes === 1 ? '1 minute' : `${minutes} minutes`;
    return `${hourStr} ${minStr}`;
  }

  /**
   * Format a timestamp to a relative time string for UI display.
   *
   * Returns:
   * - "Today" for timestamps from today
   * - "Yesterday" for timestamps from yesterday
   * - "X days ago" for 2-6 days ago
   * - "X weeks ago" for 7-29 days ago
   * - Formatted date string for older timestamps (e.g. "Jan 15, 2025")
   */
  formatLastPlayed(timestamp: number): string {
    const now = new Date();
    const then = new Date(timestamp);

    // Check if same calendar day
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thenDay = new Date(then.getFullYear(), then.getMonth(), then.getDate());
    const diffDays = Math.floor(
      (nowDay.getTime() - thenDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    // Format as date for older timestamps
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const month = months[then.getMonth()];
    const day = then.getDate();
    const year = then.getFullYear();

    // Only show year if different from current year
    if (year === now.getFullYear()) {
      return `${month} ${day}`;
    }
    return `${month} ${day}, ${year}`;
  }
}

// =============================================================================
// Game Mode & Difficulty Display Names
// =============================================================================

const GAME_MODE_LABELS: Record<GameMode, { en: string; ja: string }> = {
  survival: { en: 'Survival', ja: 'サバイバル' },
  creative: { en: 'Creative', ja: 'クリエイティブ' },
  adventure: { en: 'Adventure', ja: 'アドベンチャー' },
  spectator: { en: 'Spectator', ja: 'スペクテイター' },
};

const DIFFICULTY_LABELS: Record<string, { en: string; ja: string }> = {
  peaceful: { en: 'Peaceful', ja: 'ピースフル' },
  easy: { en: 'Easy', ja: 'イージー' },
  normal: { en: 'Normal', ja: 'ノーマル' },
  hard: { en: 'Hard', ja: 'ハード' },
};

const WORLD_SIZE_LABELS: Record<string, { en: string; ja: string }> = {
  classic: { en: 'Classic', ja: 'クラシック' },
  medium: { en: 'Medium', ja: 'ミディアム' },
  large: { en: 'Large', ja: 'ラージ' },
};

/**
 * Get the localized display label for a game mode.
 */
export function getGameModeLabel(mode: GameMode, locale: 'en' | 'ja' = 'en'): string {
  return GAME_MODE_LABELS[mode]?.[locale] ?? mode;
}

/**
 * Get the localized display label for a difficulty.
 */
export function getDifficultyLabel(difficulty: string, locale: 'en' | 'ja' = 'en'): string {
  return DIFFICULTY_LABELS[difficulty]?.[locale] ?? difficulty;
}

/**
 * Get the localized display label for a world size.
 */
export function getWorldSizeLabel(size: string, locale: 'en' | 'ja' = 'en'): string {
  return WORLD_SIZE_LABELS[size]?.[locale] ?? size;
}

// =============================================================================
// Sorting
// =============================================================================

/**
 * Sort an array of WorldListEntry objects by the given criteria.
 * Returns a new sorted array (does not mutate the input).
 */
export function sortWorlds(worlds: WorldListEntry[], sortBy: WorldSortBy): WorldListEntry[] {
  const sorted = [...worlds];

  switch (sortBy) {
    case 'lastPlayed':
      sorted.sort((a, b) => b.lastPlayed - a.lastPlayed);
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'createdAt':
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
  }

  return sorted;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Convert WorldMetadata to a WorldListEntry for display.
 */
function metadataToEntry(meta: WorldMetadata): WorldListEntry {
  return {
    id: meta.id,
    name: meta.name,
    lastPlayed: meta.lastPlayed,
    createdAt: meta.createdAt,
    gameMode: meta.gameMode,
    difficulty: meta.difficulty,
    worldSize: meta.worldSize,
    playTime: meta.playedTime,
    thumbnail: meta.thumbnailUrl,
  };
}

/**
 * Generate a unique world ID using timestamp and random characters.
 */
function generateWorldId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `world_${timestamp}_${random}`;
}
