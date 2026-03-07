// =============================================================
// Minecraft Board Game - Corruption & Anomaly System
// Extracted corruption seeding, growth, anomaly, and raid logic
// =============================================================

import type {
  MobType, MCPlayerState, MCServerMessage, ItemType,
  SideBoardSide, CorruptionNode, RaidMob, AnomalyEvent,
} from '@/types/minecraft-board';
import {
  MC_BOARD_CONFIG, BLOCK_PROPERTIES, ITEM_PROPERTIES,
} from '@/types/minecraft-board';
import { SeededRandom } from './world';

// Structural type matching the MCRoom fields needed by corruption/anomaly logic.
export interface MCRoomForCorruption {
  code: string;
  world: import('@/types/minecraft-board').WorldTile[][] | null;
  players: Map<string, MCPlayerState>;
  tick: number;
  sideBoards: {
    left: import('@/types/minecraft-board').SideBoardState;
    right: import('@/types/minecraft-board').SideBoardState;
  };
  anomalies: Map<string, AnomalyEvent>;
  raidMobs: Map<string, RaidMob>;
  raidMobIdCounter: number;
  anomalyIdCounter: number;
}

export interface CorruptionSystemCallbacks {
  broadcastToRoom: (roomCode: string, message: MCServerMessage, excludePlayerId?: string) => void;
  sendToPlayer: (playerId: string, message: MCServerMessage) => void;
  addToInventory: (player: MCPlayerState, itemType: ItemType, quantity: number) => boolean;
  killPlayer: (room: MCRoomForCorruption, player: MCPlayerState, killerId: string) => void;
}

export function seedCorruption(room: MCRoomForCorruption, callbacks: CorruptionSystemCallbacks): void {
  const rng = new SeededRandom(room.tick + 7777);

  for (const side of ['left', 'right'] as SideBoardSide[]) {
    const board = room.sideBoards[side];
    if (board.corruption.length >= MC_BOARD_CONFIG.MAX_CORRUPTION_NODES_PER_BOARD) continue;

    const x = rng.nextInt(0, board.width - 1);
    const y = rng.nextInt(0, board.height - 1);

    // Don't place on existing corruption
    const exists = board.corruption.some(c => c.x === x && c.y === y);
    if (exists) continue;

    const node: CorruptionNode = {
      x, y,
      level: 0,
      maxLevel: MC_BOARD_CONFIG.CORRUPTION_MAX_LEVEL,
      spawnTick: room.tick,
      lastGrowTick: room.tick,
    };
    board.corruption.push(node);

    callbacks.broadcastToRoom(room.code, {
      type: 'mc_corruption_spread',
      side,
      node,
    });
  }
}

export function growCorruption(room: MCRoomForCorruption, callbacks: CorruptionSystemCallbacks): void {
  const rng = new SeededRandom(room.tick + 8888);

  for (const side of ['left', 'right'] as SideBoardSide[]) {
    const board = room.sideBoards[side];
    const maturedNodes: CorruptionNode[] = [];

    for (const node of board.corruption) {
      if (node.level >= node.maxLevel) continue;

      node.level++;
      node.lastGrowTick = room.tick;

      // Spread: chance to create adjacent corruption
      if (rng.chance(MC_BOARD_CONFIG.CORRUPTION_SPREAD_CHANCE) &&
          board.corruption.length < MC_BOARD_CONFIG.MAX_CORRUPTION_NODES_PER_BOARD) {
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const [dx, dy] = dirs[rng.nextInt(0, 3)];
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx >= 0 && nx < board.width && ny >= 0 && ny < board.height) {
          const exists = board.corruption.some(c => c.x === nx && c.y === ny);
          if (!exists) {
            board.corruption.push({
              x: nx, y: ny,
              level: 0,
              maxLevel: MC_BOARD_CONFIG.CORRUPTION_MAX_LEVEL,
              spawnTick: room.tick,
              lastGrowTick: room.tick,
            });
          }
        }
      }

      // Check if matured
      if (node.level >= node.maxLevel) {
        maturedNodes.push(node);
      }
    }

    // Trigger anomaly for matured nodes
    for (const matured of maturedNodes) {
      triggerAnomaly(room, side, callbacks);
      // Remove the matured corruption node (it has "burst")
      board.corruption = board.corruption.filter(c => c !== matured);
    }
  }
}

export function triggerAnomaly(room: MCRoomForCorruption, side: SideBoardSide, callbacks: CorruptionSystemCallbacks): void {
  const anomalyId = `anomaly_${room.anomalyIdCounter++}`;

  const anomaly: AnomalyEvent = {
    id: anomalyId,
    side,
    triggerTick: room.tick,
    raidMobs: [],
    waveCount: 0,
    maxWaves: MC_BOARD_CONFIG.RAID_MAX_WAVES,
    nextWaveTick: room.tick,  // First wave spawns immediately
    active: true,
  };

  room.anomalies.set(anomalyId, anomaly);

  callbacks.broadcastToRoom(room.code, {
    type: 'mc_anomaly_start',
    side,
    message: `Anomaly detected on the ${side}! A raid is incoming!`,
  });
}

export function processAnomalies(room: MCRoomForCorruption, callbacks: CorruptionSystemCallbacks): void {
  for (const [anomalyId, anomaly] of room.anomalies) {
    if (!anomaly.active) continue;

    if (room.tick >= anomaly.nextWaveTick && anomaly.waveCount < anomaly.maxWaves) {
      spawnRaidWave(room, anomaly);
      anomaly.waveCount++;
      anomaly.nextWaveTick = room.tick + MC_BOARD_CONFIG.RAID_WAVE_INTERVAL;
    }

    // Check if anomaly is finished (all waves spawned and all raid mobs dead)
    if (anomaly.waveCount >= anomaly.maxWaves) {
      const aliveRaidMobs = anomaly.raidMobs.filter(id => room.raidMobs.has(id));
      if (aliveRaidMobs.length === 0) {
        anomaly.active = false;
        callbacks.broadcastToRoom(room.code, {
          type: 'mc_anomaly_end',
          side: anomaly.side,
        });
        room.anomalies.delete(anomalyId);
      }
    }
  }
}

export function spawnRaidWave(room: MCRoomForCorruption, anomaly: AnomalyEvent): void {
  if (room.raidMobs.size >= MC_BOARD_CONFIG.MAX_RAID_MOBS) return;

  const rng = new SeededRandom(room.tick + anomaly.waveCount * 1000);
  const hostileTypes: MobType[] = ['zombie', 'skeleton', 'spider', 'creeper'];
  const board = room.sideBoards[anomaly.side];

  // Spawn at the outer edge of the side board
  const spawnEdgeX = anomaly.side === 'left' ? 0 : board.width - 1;
  const centerY = Math.floor(MC_BOARD_CONFIG.WORLD_SIZE / 2);

  for (let i = 0; i < MC_BOARD_CONFIG.RAID_WAVE_SIZE; i++) {
    if (room.raidMobs.size >= MC_BOARD_CONFIG.MAX_RAID_MOBS) break;

    const id = `raid_${room.raidMobIdCounter++}`;
    const type = hostileTypes[rng.nextInt(0, hostileTypes.length - 1)];
    const spawnY = rng.nextInt(
      Math.max(0, centerY - 8),
      Math.min(MC_BOARD_CONFIG.WORLD_SIZE - 1, centerY + 8)
    );

    // Target: the connection point where the side board meets the main board
    const targetX = anomaly.side === 'left' ? 0 : MC_BOARD_CONFIG.WORLD_SIZE - 1;

    const raidMob: RaidMob = {
      id,
      type,
      x: spawnEdgeX,
      y: spawnY,
      health: MC_BOARD_CONFIG.RAID_MOB_HEALTH,
      maxHealth: MC_BOARD_CONFIG.RAID_MOB_HEALTH,
      boardSide: anomaly.side,
      originSide: anomaly.side,
      targetX,
      targetY: spawnY,
      speed: MC_BOARD_CONFIG.RAID_MOB_SPEED,
      damage: MC_BOARD_CONFIG.RAID_MOB_DAMAGE,
      lastMoveTick: room.tick,
    };

    room.raidMobs.set(id, raidMob);
    anomaly.raidMobs.push(id);
  }
}

export function updateRaidMobs(room: MCRoomForCorruption, callbacks: CorruptionSystemCallbacks): void {
  if (!room.world) return;

  for (const raidMob of room.raidMobs.values()) {
    if (room.tick - raidMob.lastMoveTick < raidMob.speed) continue;
    raidMob.lastMoveTick = room.tick;

    if (raidMob.boardSide !== 'main') {
      moveRaidMobOnSideBoard(room, raidMob, callbacks);
    } else {
      moveRaidMobOnMainBoard(room, raidMob, callbacks);
    }
  }
}

export function moveRaidMobOnSideBoard(room: MCRoomForCorruption, mob: RaidMob, callbacks: CorruptionSystemCallbacks): void {
  const board = room.sideBoards[mob.boardSide as SideBoardSide];
  const originSide = mob.originSide;

  // Move toward the main board edge
  const connectionEdgeX = originSide === 'left' ? board.width - 1 : 0;
  const dx = Math.sign(connectionEdgeX - mob.x);

  if (dx !== 0) {
    mob.x += dx;
  }

  // Check if mob has reached the connection edge
  const reachedEdge = (originSide === 'left' && mob.x >= board.width - 1) ||
                       (originSide === 'right' && mob.x <= 0);

  if (reachedEdge) {
    // Transition to main board
    mob.boardSide = 'main';
    mob.x = originSide === 'left' ? 1 : MC_BOARD_CONFIG.WORLD_SIZE - 2;

    // Find a walkable tile near the entry point
    if (room.world) {
      let placed = false;
      for (let dy = 0; dy <= 3; dy++) {
        for (const offset of dy === 0 ? [0] : [-dy, dy]) {
          const ny = mob.y + offset;
          if (ny >= 0 && ny < MC_BOARD_CONFIG.WORLD_SIZE) {
            const tile = room.world[ny]?.[mob.x];
            if (tile && BLOCK_PROPERTIES[tile.block].walkable) {
              mob.y = ny;
              placed = true;
              break;
            }
          }
        }
        if (placed) break;
      }
      // If no walkable tile found, despawn
      if (!placed) {
        room.raidMobs.delete(mob.id);
        return;
      }
    }

    callbacks.broadcastToRoom(room.code, {
      type: 'mc_raid_mob_entered_main',
      mobId: mob.id,
      x: mob.x,
      y: mob.y,
    });
  }
}

export function moveRaidMobOnMainBoard(room: MCRoomForCorruption, mob: RaidMob, callbacks: CorruptionSystemCallbacks): void {
  if (!room.world) return;

  // Find nearest player
  let nearestPlayer: MCPlayerState | null = null;
  let nearestDist = Infinity;
  for (const player of room.players.values()) {
    if (player.dead || !player.connected) continue;
    const dist = Math.abs(player.x - mob.x) + Math.abs(player.y - mob.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestPlayer = player;
    }
  }

  if (!nearestPlayer) return;

  // Attack if adjacent
  if (nearestDist <= 1) {
    let actualDamage = mob.damage;
    if (nearestPlayer.armor) {
      const armorDef = ITEM_PROPERTIES[nearestPlayer.armor].defense;
      actualDamage = Math.max(1, mob.damage - Math.floor(armorDef / 2));
    }
    nearestPlayer.health -= actualDamage;
    callbacks.broadcastToRoom(room.code, {
      type: 'mc_damage',
      targetId: nearestPlayer.id,
      damage: actualDamage,
      sourceId: mob.id,
      targetHp: Math.max(0, nearestPlayer.health),
    });
    if (nearestPlayer.health <= 0) {
      callbacks.killPlayer(room, nearestPlayer, mob.id);
    }
    return;
  }

  // Chase player (extended detection range for raid mobs)
  if (nearestDist <= 20) {
    // Use a RaidMob-compatible move
    const dx = Math.sign(nearestPlayer.x - mob.x);
    const dy = Math.sign(nearestPlayer.y - mob.y);

    const options: [number, number][] = [];
    if (dx !== 0) options.push([dx, 0]);
    if (dy !== 0) options.push([0, dy]);

    for (const [mx, my] of options) {
      const nx = mob.x + mx;
      const ny = mob.y + my;
      if (nx < 1 || nx >= MC_BOARD_CONFIG.WORLD_SIZE - 1 || ny < 1 || ny >= MC_BOARD_CONFIG.WORLD_SIZE - 1) continue;
      if (!BLOCK_PROPERTIES[room.world[ny][nx].block].walkable) continue;

      mob.x = nx;
      mob.y = ny;
      return;
    }
  }
}

export function killRaidMob(room: MCRoomForCorruption, mobId: string, killer: MCPlayerState, callbacks: CorruptionSystemCallbacks): void {
  const mob = room.raidMobs.get(mobId);
  if (!mob) return;

  // Enhanced loot drops from raid mobs
  const rng = new SeededRandom(room.tick + mob.x);
  if (rng.chance(0.5)) {
    callbacks.addToInventory(killer, 'iron_ingot', 1);
    callbacks.sendToPlayer(killer.id, { type: 'mc_item_gained', playerId: killer.id, item: 'iron_ingot', quantity: 1 });
  }
  if (rng.chance(0.2)) {
    callbacks.addToInventory(killer, 'diamond', 1);
    callbacks.sendToPlayer(killer.id, { type: 'mc_item_gained', playerId: killer.id, item: 'diamond', quantity: 1 });
  }
  if (rng.chance(0.3)) {
    callbacks.addToInventory(killer, 'ender_pearl', 1);
    callbacks.sendToPlayer(killer.id, { type: 'mc_item_gained', playerId: killer.id, item: 'ender_pearl', quantity: 1 });
  }

  killer.kills++;
  killer.experience += 10;
  room.raidMobs.delete(mobId);

  callbacks.broadcastToRoom(room.code, {
    type: 'mc_mob_died',
    mobId,
    killerName: killer.name,
  });
}
