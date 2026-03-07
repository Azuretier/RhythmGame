// =============================================================
// Minecraft Board Game - Mob System
// Extracted mob-related logic: spawning, AI, movement, death
// =============================================================

import type {
  MobType, MCPlayerState, MCMobState, MCServerMessage,
} from '@/types/minecraft-board';
import {
  MC_BOARD_CONFIG, BLOCK_PROPERTIES, ITEM_PROPERTIES,
  MOB_STATS, MOB_DROPS,
} from '@/types/minecraft-board';
import { SeededRandom } from './world';

// Re-export the MCRoom interface shape expected by these functions.
// We use a structural type so the manager can pass its private MCRoom directly.
export interface MCRoomForMobs {
  code: string;
  world: import('@/types/minecraft-board').WorldTile[][] | null;
  mobs: Map<string, MCMobState>;
  players: Map<string, MCPlayerState>;
  tick: number;
  seed: number;
  mobIdCounter: number;
  dayPhase: import('@/types/minecraft-board').DayPhase;
}

export interface MobSystemCallbacks {
  broadcastToRoom: (roomCode: string, message: MCServerMessage, excludePlayerId?: string) => void;
  sendToPlayer: (playerId: string, message: MCServerMessage) => void;
  addToInventory: (player: MCPlayerState, itemType: import('@/types/minecraft-board').ItemType, quantity: number) => boolean;
  killPlayer: (room: MCRoomForMobs, player: MCPlayerState, killerId: string) => void;
}

export function spawnInitialMobs(room: MCRoomForMobs): void {
  if (!room.world) return;
  const rng = new SeededRandom(room.seed + 9000);
  const passiveTypes: MobType[] = ['cow', 'pig', 'chicken'];

  for (let i = 0; i < 12; i++) {
    const type = passiveTypes[rng.nextInt(0, passiveTypes.length - 1)];
    const x = rng.nextInt(2, MC_BOARD_CONFIG.WORLD_SIZE - 3);
    const y = rng.nextInt(2, MC_BOARD_CONFIG.WORLD_SIZE - 3);

    const tile = room.world[y][x];
    if (!BLOCK_PROPERTIES[tile.block].walkable) continue;
    if (tile.block === 'water' || tile.block === 'deep_water') continue;

    spawnMob(room, type, x, y);
  }
}

export function spawnHostileMobs(room: MCRoomForMobs, callbacks: MobSystemCallbacks): void {
  if (!room.world) return;
  if (room.mobs.size >= MC_BOARD_CONFIG.MAX_MOBS) return;

  const rng = new SeededRandom(room.tick);
  const hostileTypes: MobType[] = ['zombie', 'skeleton', 'spider', 'creeper'];
  const players = Array.from(room.players.values()).filter(p => !p.dead);
  if (players.length === 0) return;

  // Spawn near a random player
  const target = players[rng.nextInt(0, players.length - 1)];
  const angle = rng.nextFloat(0, Math.PI * 2);
  const dist = rng.nextInt(6, 10);
  const x = Math.round(target.x + Math.cos(angle) * dist);
  const y = Math.round(target.y + Math.sin(angle) * dist);

  if (x < 1 || x >= MC_BOARD_CONFIG.WORLD_SIZE - 1 || y < 1 || y >= MC_BOARD_CONFIG.WORLD_SIZE - 1) return;

  const tile = room.world[y][x];
  if (!BLOCK_PROPERTIES[tile.block].walkable) return;

  const type = hostileTypes[rng.nextInt(0, hostileTypes.length - 1)];
  const mob = spawnMob(room, type, x, y);
  if (mob) {
    callbacks.broadcastToRoom(room.code, { type: 'mc_mob_spawned', mob });
  }
}

export function spawnMob(room: MCRoomForMobs, type: MobType, x: number, y: number): MCMobState | null {
  const stats = MOB_STATS[type];
  const id = `mob_${room.mobIdCounter++}`;
  const mob: MCMobState = {
    id,
    type,
    x,
    y,
    health: stats.health,
    maxHealth: stats.health,
    targetPlayerId: null,
    lastMoveTick: room.tick,
    hostile: stats.hostile,
  };
  room.mobs.set(id, mob);
  return mob;
}

export function updateMobs(room: MCRoomForMobs, callbacks: MobSystemCallbacks): void {
  if (!room.world) return;

  for (const mob of room.mobs.values()) {
    if (room.tick - mob.lastMoveTick < MOB_STATS[mob.type].speed) continue;
    mob.lastMoveTick = room.tick;

    if (mob.hostile) {
      updateHostileMob(room, mob, callbacks);
    } else {
      updatePassiveMob(room, mob);
    }
  }
}

export function updateHostileMob(room: MCRoomForMobs, mob: MCMobState, callbacks: MobSystemCallbacks): void {
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

  if (!nearestPlayer || nearestDist > 12) return;

  // Attack if adjacent
  if (nearestDist <= 1) {
    const damage = MOB_STATS[mob.type].damage;
    let actualDamage = damage;
    if (nearestPlayer.armor) {
      const armorDef = ITEM_PROPERTIES[nearestPlayer.armor].defense;
      actualDamage = Math.max(1, damage - Math.floor(armorDef / 2));
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

  // Move toward player
  moveMobToward(room, mob, nearestPlayer.x, nearestPlayer.y);
}

export function updatePassiveMob(room: MCRoomForMobs, mob: MCMobState): void {
  if (!room.world) return;
  const rng = new SeededRandom(room.tick + mob.x * 100 + mob.y);
  if (!rng.chance(0.3)) return; // Only move sometimes

  const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const [dx, dy] = dirs[rng.nextInt(0, 3)];
  const nx = mob.x + dx;
  const ny = mob.y + dy;

  if (nx < 1 || nx >= MC_BOARD_CONFIG.WORLD_SIZE - 1 || ny < 1 || ny >= MC_BOARD_CONFIG.WORLD_SIZE - 1) return;
  if (!BLOCK_PROPERTIES[room.world[ny][nx].block].walkable) return;

  mob.x = nx;
  mob.y = ny;
}

export function moveMobToward(room: MCRoomForMobs, mob: MCMobState, targetX: number, targetY: number): void {
  if (!room.world) return;

  const dx = Math.sign(targetX - mob.x);
  const dy = Math.sign(targetY - mob.y);

  // Try primary direction
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

export function killMob(room: MCRoomForMobs, mobId: string, killer: MCPlayerState, callbacks: MobSystemCallbacks): void {
  const mob = room.mobs.get(mobId);
  if (!mob) return;

  // Generate drops
  const drops = MOB_DROPS[mob.type];
  const rng = new SeededRandom(room.tick + mob.x);
  for (const drop of drops) {
    if (rng.chance(drop.chance)) {
      callbacks.addToInventory(killer, drop.item, drop.quantity);
      callbacks.sendToPlayer(killer.id, {
        type: 'mc_item_gained',
        playerId: killer.id,
        item: drop.item,
        quantity: drop.quantity,
      });
    }
  }

  killer.kills++;
  killer.experience += mob.hostile ? 5 : 1;
  room.mobs.delete(mobId);

  callbacks.broadcastToRoom(room.code, {
    type: 'mc_mob_died',
    mobId,
    killerName: killer.name,
  });
}
