// =============================================================
// Minecraft Board Game - State Serializer
// Extracted state update & serialization logic
// =============================================================

import type {
  MCPlayerState, MCMobState, MCServerMessage,
  MCTileUpdate, MCVisiblePlayer, MCGameStateUpdate,
  SideBoardVisibleState, AnomalyAlert, AnomalyEvent, RaidMob,
} from '@/types/minecraft-board';
import { MC_BOARD_CONFIG } from '@/types/minecraft-board';

// Structural type matching the MCRoom fields needed by serialization.
export interface MCRoomForSerializer {
  code: string;
  world: import('@/types/minecraft-board').WorldTile[][] | null;
  players: Map<string, MCPlayerState>;
  mobs: Map<string, MCMobState>;
  tick: number;
  timeOfDay: number;
  dayPhase: import('@/types/minecraft-board').DayPhase;
  sideBoards: {
    left: import('@/types/minecraft-board').SideBoardState;
    right: import('@/types/minecraft-board').SideBoardState;
  };
  anomalies: Map<string, AnomalyEvent>;
  raidMobs: Map<string, RaidMob>;
}

export interface SerializerCallbacks {
  sendToPlayer: (playerId: string, message: MCServerMessage) => void;
}

export function sendStateUpdate(room: MCRoomForSerializer, playerId: string, callbacks: SerializerCallbacks): void {
  if (!room.world) return;
  const player = room.players.get(playerId);
  if (!player) return;

  const vr = MC_BOARD_CONFIG.VISION_RADIUS;
  const visibleTiles: MCTileUpdate[] = [];

  // Collect visible tiles
  for (let dy = -vr; dy <= vr; dy++) {
    for (let dx = -vr; dx <= vr; dx++) {
      const x = player.x + dx;
      const y = player.y + dy;
      if (x < 0 || x >= MC_BOARD_CONFIG.WORLD_SIZE || y < 0 || y >= MC_BOARD_CONFIG.WORLD_SIZE) continue;
      if (Math.abs(dx) + Math.abs(dy) > vr + 2) continue; // Diamond-shaped vision
      visibleTiles.push({ x, y, tile: room.world[y][x] });
    }
  }

  // Visible players
  const visiblePlayers: MCVisiblePlayer[] = [];
  for (const other of room.players.values()) {
    const dist = Math.abs(other.x - player.x) + Math.abs(other.y - player.y);
    if (dist <= vr + 2) {
      visiblePlayers.push({
        id: other.id,
        name: other.name,
        x: other.x,
        y: other.y,
        health: other.health,
        maxHealth: other.maxHealth,
        color: other.color,
        mining: other.mining,
        dead: other.dead,
      });
    }
  }

  // Visible mobs
  const visibleMobs: MCMobState[] = [];
  for (const mob of room.mobs.values()) {
    const dist = Math.abs(mob.x - player.x) + Math.abs(mob.y - player.y);
    if (dist <= vr + 2) {
      visibleMobs.push({ ...mob });
    }
  }

  // Include raid mobs on the main board as visible mobs
  for (const raidMob of room.raidMobs.values()) {
    if (raidMob.boardSide === 'main') {
      const dist = Math.abs(raidMob.x - player.x) + Math.abs(raidMob.y - player.y);
      if (dist <= vr + 2) {
        visibleMobs.push({
          id: raidMob.id,
          type: raidMob.type,
          x: raidMob.x,
          y: raidMob.y,
          health: raidMob.health,
          maxHealth: raidMob.maxHealth,
          targetPlayerId: null,
          lastMoveTick: raidMob.lastMoveTick,
          hostile: true,
        });
      }
    }
  }

  // Build side board visible states
  const sideBoards: SideBoardVisibleState[] = [
    {
      side: 'left',
      width: room.sideBoards.left.width,
      height: room.sideBoards.left.height,
      corruption: [...room.sideBoards.left.corruption],
      raidMobs: Array.from(room.raidMobs.values()).filter(m => m.boardSide === 'left'),
    },
    {
      side: 'right',
      width: room.sideBoards.right.width,
      height: room.sideBoards.right.height,
      corruption: [...room.sideBoards.right.corruption],
      raidMobs: Array.from(room.raidMobs.values()).filter(m => m.boardSide === 'right'),
    },
  ];

  // Build anomaly alerts
  const anomalyAlerts: AnomalyAlert[] = Array.from(room.anomalies.values())
    .filter(a => a.active)
    .map(a => ({
      side: a.side,
      message: `Raid wave ${a.waveCount}/${a.maxWaves}`,
      active: true,
    }));

  const totalCycle = MC_BOARD_CONFIG.DAY_TICKS + MC_BOARD_CONFIG.DUSK_TICKS +
    MC_BOARD_CONFIG.NIGHT_TICKS + MC_BOARD_CONFIG.DAWN_TICKS;
  const normalizedTime = (room.timeOfDay % totalCycle) / totalCycle;

  const update: MCGameStateUpdate = {
    visibleTiles,
    players: visiblePlayers,
    mobs: visibleMobs,
    self: player,
    timeOfDay: normalizedTime,
    dayPhase: room.dayPhase,
    tick: room.tick,
    sideBoards,
    anomalyAlerts: anomalyAlerts.length > 0 ? anomalyAlerts : undefined,
  };

  callbacks.sendToPlayer(playerId, { type: 'mc_state_update', state: update });
}
