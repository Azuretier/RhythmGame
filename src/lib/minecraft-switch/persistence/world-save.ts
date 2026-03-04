// =============================================================================
// World Save Manager — IndexedDB Persistence
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================
// IndexedDB-based world save system with RLE chunk compression, auto-save,
// import/export, thumbnail capture, and full world state serialization.
// Supports Uint16 block IDs (0-450+) via varint-based RLE encoding.
// =============================================================================

import type {
  GameMode,
  Difficulty,
  Dimension,
  BlockCoord,
  PlayerPosition,
  PlayerInventory,
  StatusEffectInstance,
  WeatherType,
  InventorySlot,
} from '@/types/minecraft-switch';
import type { GameRules } from '@/lib/minecraft-switch/game-modes';

// =============================================================================
// Data Types
// =============================================================================

export interface WorldMetadata {
  id: string;
  name: string;
  seed: number;
  worldSize: 'classic' | 'medium' | 'large';
  gameMode: GameMode;
  difficulty: Difficulty;
  createdAt: number;
  playedTime: number;       // total seconds played
  lastPlayed: number;       // unix timestamp ms
  dimension: Dimension;
  thumbnailUrl?: string;    // base64 data URL
}

export interface SerializedInventorySlot {
  item: string;
  count: number;
  durability?: number;
  enchantments?: { type: string; level: number }[];
  nbt?: Record<string, unknown>;
}

export interface WorldPlayerState {
  position: PlayerPosition;
  inventory: PlayerInventory;
  health: number;
  hunger: number;
  saturation: number;
  experience: number;
  level: number;
  totalExperience: number;
  statusEffects: StatusEffectInstance[];
  dimension: Dimension;
  spawnPoint: BlockCoord;
  gameMode: GameMode;
}

export interface WorldTimeState {
  tickCount: number;
  dayCount: number;
  timeOfDay: number;        // 0-24000
}

export interface WorldWeatherState {
  type: WeatherType;
  duration: number;          // ticks remaining
  thundering: boolean;
  thunderDuration: number;
}

export interface SerializedTileEntity {
  type: string;
  x: number;
  y: number;
  z: number;
  data: Record<string, unknown>;
}

export interface SerializedChunkEntry {
  /** Chunk key, e.g. "3,7" for cx=3, cz=7. */
  key: string;
  /** RLE-compressed block data as base64 string. */
  blocks: string;
}

export interface WorldSaveData {
  metadata: WorldMetadata;
  playerState: WorldPlayerState;
  gameRules: GameRules;
  worldTime: WorldTimeState;
  weather: WorldWeatherState;
  tileEntities: SerializedTileEntity[];
  /** Block changes stored as "x,y,z" -> blockId entries. */
  blockChanges: [string, number][];
  /** Statistics JSON string. */
  statistics?: string;
}

// =============================================================================
// Database Constants
// =============================================================================

const DB_NAME = 'minecraft-switch-worlds';
const DB_VERSION = 1;
const STORE_WORLDS = 'worlds';
const STORE_CHUNKS = 'chunks';

/** Maximum number of saved worlds. */
export const MAX_WORLDS = 20;

/** Auto-save interval in milliseconds (5 minutes). */
const AUTO_SAVE_INTERVAL_MS = 300_000;

// =============================================================================
// RLE Chunk Compression (Varint-based for Uint16 block IDs)
// =============================================================================

/**
 * Write a varint-encoded unsigned integer into a byte buffer.
 * Returns the number of bytes written.
 * Varint encoding: 7 bits of data per byte, MSB=1 means more bytes follow.
 */
function writeVarint(value: number, buffer: number[], offset: number): number {
  let written = 0;
  let v = value;
  while (v >= 0x80) {
    buffer[offset + written] = (v & 0x7F) | 0x80;
    v >>>= 7;
    written++;
  }
  buffer[offset + written] = v & 0x7F;
  written++;
  return written;
}

/**
 * Read a varint-encoded unsigned integer from a Uint8Array.
 * Returns [value, bytesRead].
 */
function readVarint(data: Uint8Array, offset: number): [number, number] {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;

  while (offset + bytesRead < data.length) {
    const byte = data[offset + bytesRead];
    value |= (byte & 0x7F) << shift;
    bytesRead++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }

  return [value, bytesRead];
}

/**
 * Compress a chunk block array using Run-Length Encoding with varint encoding.
 *
 * Each run is encoded as two varints: [blockId, runLength].
 * Block IDs can be up to 450+ (Uint16 range) and run lengths up to chunk size.
 * Varint encoding keeps common values compact (1-2 bytes for typical IDs).
 *
 * @param blocks - Uint16Array of block IDs (one per voxel in the chunk)
 * @returns Uint8Array of RLE-compressed data
 */
export function compressChunk(blocks: Uint16Array): Uint8Array {
  if (blocks.length === 0) return new Uint8Array(0);

  // Worst case: each block is unique, 3 bytes per varint * 2 varints per run
  // Actual is typically much smaller due to compression
  const tempBuffer: number[] = new Array(blocks.length * 6);
  let writePos = 0;

  let currentBlock = blocks[0];
  let runLength = 1;

  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i] === currentBlock && runLength < 0xFFFF) {
      runLength++;
    } else {
      writePos += writeVarint(currentBlock, tempBuffer, writePos);
      writePos += writeVarint(runLength, tempBuffer, writePos);
      currentBlock = blocks[i];
      runLength = 1;
    }
  }
  // Write the last run
  writePos += writeVarint(currentBlock, tempBuffer, writePos);
  writePos += writeVarint(runLength, tempBuffer, writePos);

  // Copy to a properly sized Uint8Array
  const result = new Uint8Array(writePos);
  for (let i = 0; i < writePos; i++) {
    result[i] = tempBuffer[i];
  }

  return result;
}

/**
 * Decompress an RLE-encoded Uint8Array back into a Uint16Array of block IDs.
 * Reverses the varint-based encoding produced by compressChunk.
 *
 * @param compressed - RLE-compressed data
 * @returns Uint16Array of block IDs
 */
export function decompressChunk(compressed: Uint8Array): Uint16Array {
  if (compressed.length === 0) return new Uint16Array(0);

  // First pass: determine output length
  let totalLength = 0;
  let readPos = 0;
  while (readPos < compressed.length) {
    const [, blockIdBytes] = readVarint(compressed, readPos);
    readPos += blockIdBytes;
    if (readPos >= compressed.length) break;
    const [count, countBytes] = readVarint(compressed, readPos);
    readPos += countBytes;
    totalLength += count;
  }

  // Second pass: fill the output array
  const result = new Uint16Array(totalLength);
  let writeIdx = 0;
  readPos = 0;
  while (readPos < compressed.length) {
    const [blockId, blockIdBytes] = readVarint(compressed, readPos);
    readPos += blockIdBytes;
    if (readPos >= compressed.length) break;
    const [count, countBytes] = readVarint(compressed, readPos);
    readPos += countBytes;
    for (let j = 0; j < count; j++) {
      result[writeIdx++] = blockId;
    }
  }

  return result;
}

/**
 * Convert an ArrayBuffer to a base64 string (browser-safe).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string to a Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// =============================================================================
// Inventory Serialization Helpers
// =============================================================================

/**
 * Serialize an inventory slot into a plain JSON-safe object.
 */
export function serializeSlot(slot: InventorySlot | null): SerializedInventorySlot | null {
  if (!slot) return null;
  const serialized: SerializedInventorySlot = {
    item: slot.item,
    count: slot.count,
  };
  if (slot.durability !== undefined) {
    serialized.durability = slot.durability;
  }
  if (slot.enchantments && slot.enchantments.length > 0) {
    serialized.enchantments = slot.enchantments.map((e) => ({
      type: String(e.type),
      level: e.level,
    }));
  }
  if (slot.nbt && Object.keys(slot.nbt).length > 0) {
    serialized.nbt = { ...slot.nbt };
  }
  return serialized;
}

/**
 * Serialize a complete player inventory into JSON-safe arrays.
 */
export function serializeInventory(inventory: PlayerInventory): {
  main: (SerializedInventorySlot | null)[];
  hotbar: (SerializedInventorySlot | null)[];
  armor: (SerializedInventorySlot | null)[];
  offhand: SerializedInventorySlot | null;
  selectedSlot: number;
} {
  return {
    main: inventory.main.map(serializeSlot),
    hotbar: inventory.hotbar.map(serializeSlot),
    armor: inventory.armor.map(serializeSlot),
    offhand: serializeSlot(inventory.offhand),
    selectedSlot: inventory.selectedSlot,
  };
}

// =============================================================================
// IndexedDB Helpers
// =============================================================================

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_WORLDS)) {
        db.createObjectStore(STORE_WORLDS, { keyPath: 'metadata.id' });
      }
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        db.createObjectStore(STORE_CHUNKS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbTransaction(
  db: IDBDatabase,
  storeNames: string | string[],
  mode: IDBTransactionMode
): IDBTransaction {
  return db.transaction(storeNames, mode);
}

/**
 * Generate a UUID v4 for world IDs.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// WorldSaveManager
// =============================================================================

/**
 * Manages world persistence using IndexedDB.
 *
 * Two object stores are used:
 * - `worlds`: stores WorldSaveData keyed by metadata.id
 * - `chunks`: stores RLE-compressed chunk block data keyed by "worldId:cx,cz"
 *
 * Features:
 * - Full world save/load with player state, game rules, time, weather
 * - Chunked block storage with RLE compression (varint encoding)
 * - Auto-save with configurable interval (default 5 minutes)
 * - World listing, renaming, deleting
 * - Import/export as JSON blobs for backup/sharing
 * - Storage usage estimation
 * - Approximate per-world size calculation
 */
export class WorldSaveManager {
  private db: IDBDatabase | null = null;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private lastAutoSaveTime: number = 0;

  // ---------------------------------------------------------------------------
  // Database Connection
  // ---------------------------------------------------------------------------

  /**
   * Initialize the IndexedDB connection.
   * Must be called before any database operations.
   * Safe to call multiple times (no-op if already initialized).
   */
  async init(): Promise<void> {
    if (this.db) return;
    this.db = await openDB();
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  /**
   * Close the database connection and stop any active auto-save timer.
   */
  close(): void {
    this.stopAutoSave();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Save World
  // ---------------------------------------------------------------------------

  /**
   * Save complete world state to IndexedDB.
   * Updates the lastPlayed timestamp automatically.
   * Stores metadata, player state, game rules, time, weather,
   * tile entities, block changes, and statistics as a single record.
   */
  async saveWorld(worldId: string, data: WorldSaveData): Promise<void> {
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_WORLDS, 'readwrite');
    const store = tx.objectStore(STORE_WORLDS);

    const saveData: WorldSaveData = {
      ...data,
      metadata: {
        ...data.metadata,
        id: worldId,
        lastPlayed: Date.now(),
      },
    };

    await idbRequest(store.put(saveData));
  }

  /**
   * Save a single chunk's block data with RLE compression.
   * Key format: "worldId:cx,cz"
   */
  async saveChunk(
    worldId: string,
    cx: number,
    cz: number,
    blocks: Uint16Array
  ): Promise<void> {
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_CHUNKS, 'readwrite');
    const store = tx.objectStore(STORE_CHUNKS);
    const key = `${worldId}:${cx},${cz}`;
    const compressed = compressChunk(blocks);
    await idbRequest(store.put(compressed.buffer, key));
  }

  /**
   * Save multiple chunks in a single transaction for better performance.
   */
  async saveChunks(
    worldId: string,
    chunks: { cx: number; cz: number; blocks: Uint16Array }[]
  ): Promise<void> {
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_CHUNKS, 'readwrite');
    const store = tx.objectStore(STORE_CHUNKS);

    const promises: Promise<IDBValidKey>[] = [];
    for (const chunk of chunks) {
      const key = `${worldId}:${chunk.cx},${chunk.cz}`;
      const compressed = compressChunk(chunk.blocks);
      promises.push(idbRequest(store.put(compressed.buffer, key)));
    }

    await Promise.all(promises);
  }

  // ---------------------------------------------------------------------------
  // Load World
  // ---------------------------------------------------------------------------

  /**
   * Load complete world state by ID.
   * Returns null if the world does not exist.
   */
  async loadWorld(worldId: string): Promise<WorldSaveData | null> {
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_WORLDS, 'readonly');
    const store = tx.objectStore(STORE_WORLDS);

    const allRecords = await idbRequest(store.getAll());
    const match = allRecords.find(
      (record: WorldSaveData) => record.metadata.id === worldId
    );

    return match ?? null;
  }

  /**
   * Load and decompress a single chunk's block data.
   * Returns null if the chunk has not been saved.
   */
  async loadChunk(
    worldId: string,
    cx: number,
    cz: number
  ): Promise<Uint16Array | null> {
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_CHUNKS, 'readonly');
    const store = tx.objectStore(STORE_CHUNKS);
    const key = `${worldId}:${cx},${cz}`;

    const compressed: ArrayBuffer | undefined = await idbRequest(store.get(key));
    if (!compressed) return null;

    return decompressChunk(new Uint8Array(compressed));
  }

  /**
   * Load multiple chunks in a single transaction.
   * Returns a map of "cx,cz" -> Uint16Array for chunks that exist.
   */
  async loadChunks(
    worldId: string,
    coords: { cx: number; cz: number }[]
  ): Promise<Map<string, Uint16Array>> {
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_CHUNKS, 'readonly');
    const store = tx.objectStore(STORE_CHUNKS);
    const results = new Map<string, Uint16Array>();

    for (const { cx, cz } of coords) {
      const key = `${worldId}:${cx},${cz}`;
      const compressed: ArrayBuffer | undefined = await idbRequest(store.get(key));
      if (compressed) {
        results.set(`${cx},${cz}`, decompressChunk(new Uint8Array(compressed)));
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // World List
  // ---------------------------------------------------------------------------

  /**
   * List all saved worlds' metadata, sorted by lastPlayed (most recent first).
   */
  async listWorlds(): Promise<WorldMetadata[]> {
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_WORLDS, 'readonly');
    const store = tx.objectStore(STORE_WORLDS);

    const allRecords: WorldSaveData[] = await idbRequest(store.getAll());
    const metadataList = allRecords.map((record) => record.metadata);

    metadataList.sort((a, b) => b.lastPlayed - a.lastPlayed);
    return metadataList;
  }

  /**
   * Get the total number of saved worlds.
   */
  async getWorldCount(): Promise<number> {
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_WORLDS, 'readonly');
    const store = tx.objectStore(STORE_WORLDS);
    return idbRequest(store.count());
  }

  // ---------------------------------------------------------------------------
  // World Management
  // ---------------------------------------------------------------------------

  /**
   * Delete a world and all its associated chunk data.
   */
  async deleteWorld(worldId: string): Promise<void> {
    const db = await this.ensureDB();

    // Delete the world record
    const worldTx = idbTransaction(db, STORE_WORLDS, 'readwrite');
    const worldStore = worldTx.objectStore(STORE_WORLDS);
    const allRecords: WorldSaveData[] = await idbRequest(worldStore.getAll());
    for (const record of allRecords) {
      if (record.metadata.id === worldId) {
        await idbRequest(worldStore.delete(record.metadata.id));
      }
    }

    // Delete all chunks associated with this world
    const chunkTx = idbTransaction(db, STORE_CHUNKS, 'readwrite');
    const chunkStore = chunkTx.objectStore(STORE_CHUNKS);
    const allKeys: IDBValidKey[] = await idbRequest(chunkStore.getAllKeys());
    const prefix = `${worldId}:`;

    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        await idbRequest(chunkStore.delete(key));
      }
    }
  }

  /**
   * Rename a saved world. No-ops if the world is not found.
   */
  async renameWorld(worldId: string, newName: string): Promise<void> {
    const data = await this.loadWorld(worldId);
    if (!data) return;

    data.metadata.name = newName;
    await this.saveWorld(worldId, data);
  }

  /**
   * Calculate the approximate storage size of a world in bytes.
   * Accounts for world data JSON size and all associated chunk data.
   */
  async getWorldSize(worldId: string): Promise<number> {
    let totalSize = 0;

    // World record size
    const worldData = await this.loadWorld(worldId);
    if (worldData) {
      totalSize += new Blob([JSON.stringify(worldData)]).size;
    }

    // Chunk data sizes
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_CHUNKS, 'readonly');
    const store = tx.objectStore(STORE_CHUNKS);
    const allKeys: IDBValidKey[] = await idbRequest(store.getAllKeys());
    const prefix = `${worldId}:`;

    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        const buffer: ArrayBuffer | undefined = await idbRequest(store.get(key));
        if (buffer) {
          totalSize += buffer.byteLength;
        }
      }
    }

    return totalSize;
  }

  // ---------------------------------------------------------------------------
  // Auto-Save
  // ---------------------------------------------------------------------------

  /**
   * Start periodic auto-saving. The `getState` callback is called each
   * interval to retrieve the current world state for saving.
   *
   * The auto-save respects a minimum 5-minute interval between saves.
   * If a save is requested before the interval has elapsed, it is skipped.
   *
   * @param worldId - ID of the world to save
   * @param getState - callback returning current world state
   * @param intervalMs - auto-save interval in ms (default: 5 minutes)
   */
  startAutoSave(
    worldId: string,
    getState: () => WorldSaveData,
    intervalMs: number = AUTO_SAVE_INTERVAL_MS
  ): void {
    this.stopAutoSave();
    this.lastAutoSaveTime = Date.now();

    this.autoSaveTimer = setInterval(async () => {
      const now = Date.now();
      // Enforce minimum interval between saves
      if (now - this.lastAutoSaveTime < intervalMs * 0.9) {
        return;
      }

      try {
        const state = getState();
        await this.saveWorld(worldId, state);
        this.lastAutoSaveTime = now;
      } catch (err) {
        console.error('[WorldSaveManager] Auto-save failed:', err);
      }
    }, intervalMs);
  }

  /**
   * Stop the auto-save timer.
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Perform a single debounced auto-save.
   * Only saves if at least 5 minutes have passed since the last auto-save.
   */
  async autoSave(data: WorldSaveData): Promise<void> {
    const now = Date.now();
    if (now - this.lastAutoSaveTime < AUTO_SAVE_INTERVAL_MS) {
      return; // Debounce: too soon since last save
    }

    try {
      await this.saveWorld(data.metadata.id, data);
      this.lastAutoSaveTime = now;
    } catch (err) {
      console.error('[WorldSaveManager] Auto-save failed:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Storage Management
  // ---------------------------------------------------------------------------

  /**
   * Estimate overall storage usage via the StorageManager API.
   * Returns { used, available } in bytes.
   * Falls back to { 0, 0 } if the API is not available.
   */
  async getStorageUsage(): Promise<{ used: number; available: number }> {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage ?? 0,
        available: estimate.quota ?? 0,
      };
    }
    return { used: 0, available: 0 };
  }

  // ---------------------------------------------------------------------------
  // Import / Export
  // ---------------------------------------------------------------------------

  /**
   * Export a world as a downloadable JSON Blob.
   *
   * The export includes:
   * - All world metadata, player state, game rules, time, weather
   * - Block changes and tile entities
   * - All chunk data as base64-encoded RLE-compressed buffers
   * - Statistics data if present
   *
   * @param worldId - ID of the world to export
   * @returns Blob containing the JSON export
   * @throws Error if the world is not found
   */
  async exportWorld(worldId: string): Promise<Blob> {
    const worldData = await this.loadWorld(worldId);
    if (!worldData) {
      throw new Error(`World "${worldId}" not found`);
    }

    // Collect all chunks belonging to this world
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_CHUNKS, 'readonly');
    const store = tx.objectStore(STORE_CHUNKS);
    const allKeys: IDBValidKey[] = await idbRequest(store.getAllKeys());
    const prefix = `${worldId}:`;

    const chunks: Record<string, string> = {};
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        const chunkKey = key.slice(prefix.length);
        const buffer: ArrayBuffer = await idbRequest(store.get(key));
        if (buffer) {
          chunks[chunkKey] = arrayBufferToBase64(buffer);
        }
      }
    }

    const exportData = {
      version: 1,
      formatName: 'minecraft-switch-world',
      exportedAt: Date.now(),
      world: worldData,
      chunks,
    };

    return new Blob([JSON.stringify(exportData)], { type: 'application/json' });
  }

  /**
   * Import a world from a previously exported JSON Blob.
   *
   * A new unique ID is assigned to the imported world to prevent conflicts
   * with existing worlds. The lastPlayed timestamp is updated to now.
   *
   * @param blob - Blob containing the JSON export
   * @returns The new world ID assigned to the imported world
   * @throws Error if the blob format is unsupported
   */
  async importWorld(blob: Blob): Promise<string> {
    const text = await blob.text();
    const importData = JSON.parse(text) as {
      version: number;
      formatName?: string;
      world: WorldSaveData;
      chunks: Record<string, string>;
    };

    if (importData.version !== 1) {
      throw new Error(`Unsupported world export version: ${importData.version}`);
    }

    // Generate a new unique ID for the imported world
    const newWorldId = generateUUID();
    const worldData = importData.world;
    worldData.metadata.id = newWorldId;
    worldData.metadata.lastPlayed = Date.now();

    // Save the world data
    await this.saveWorld(newWorldId, worldData);

    // Save all chunks with the new world ID
    const db = await this.ensureDB();
    const tx = idbTransaction(db, STORE_CHUNKS, 'readwrite');
    const store = tx.objectStore(STORE_CHUNKS);

    for (const [chunkKey, base64] of Object.entries(importData.chunks)) {
      const bytes = base64ToUint8Array(base64);
      const key = `${newWorldId}:${chunkKey}`;
      await idbRequest(store.put(bytes.buffer, key));
    }

    return newWorldId;
  }

  // ---------------------------------------------------------------------------
  // Thumbnail
  // ---------------------------------------------------------------------------

  /**
   * Update the thumbnail for a saved world.
   * @param worldId - World ID
   * @param dataUrl - base64 data URL (e.g. from canvas.toDataURL())
   */
  async setThumbnail(worldId: string, dataUrl: string): Promise<void> {
    const data = await this.loadWorld(worldId);
    if (!data) return;

    data.metadata.thumbnailUrl = dataUrl;
    await this.saveWorld(worldId, data);
  }

  // ---------------------------------------------------------------------------
  // Statistics persistence (piggybacked on world save)
  // ---------------------------------------------------------------------------

  /**
   * Save statistics JSON alongside the world data.
   */
  async saveStatistics(worldId: string, statisticsJson: string): Promise<void> {
    const data = await this.loadWorld(worldId);
    if (!data) return;

    data.statistics = statisticsJson;
    await this.saveWorld(worldId, data);
  }

  /**
   * Load statistics JSON from a world save.
   * Returns null if no statistics have been saved.
   */
  async loadStatistics(worldId: string): Promise<string | null> {
    const data = await this.loadWorld(worldId);
    if (!data) return null;
    return data.statistics ?? null;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _instance: WorldSaveManager | null = null;

/**
 * Get the shared WorldSaveManager singleton.
 * Initializes IndexedDB on first access.
 */
export function getWorldSaveManager(): WorldSaveManager {
  if (!_instance) {
    _instance = new WorldSaveManager();
  }
  return _instance;
}

/**
 * Format bytes into a human-readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
