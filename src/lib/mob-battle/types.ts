// ===== Mob Battle Types =====
// 1v1 battle mode where players summon mobs to attack opponent's base.
// Gold is earned by killing incoming mobs, clearing lines, and passive income.

export interface MobDefinition {
  id: string;
  name: string;
  nameJa: string;
  icon: string;
  cost: number;
  hp: number;
  speed: number;       // tiles per second
  damage: number;      // damage dealt to base on arrival
  bounty: number;      // gold earned when killed
  color: string;
  description: string;
  descriptionJa: string;
}

export interface ActiveMob {
  id: number;
  definitionId: string;
  hp: number;
  maxHp: number;
  /** Position along the lane (0.0 = spawn, 1.0 = base) */
  position: number;
  speed: number;
  damage: number;
  bounty: number;
  alive: boolean;
  spawnTime: number;
  /** Visual hit flash timer */
  hitFlash: number;
}

export interface MobBattleState {
  gold: number;
  baseHp: number;
  maxBaseHp: number;
  incomingMobs: ActiveMob[];
  /** Total mobs killed this game */
  mobsKilled: number;
  /** Total gold earned this game */
  totalGoldEarned: number;
  /** Total damage dealt to mobs */
  totalDamageDealt: number;
}

// ===== Relay Payloads for Mob Battle =====
// These are sent as relay messages between players

export interface MobSpawnRelayPayload {
  event: 'mob_spawn';
  mobType: string;
  mobId: number;
}

export interface MobBattleSyncPayload {
  event: 'mob_battle_sync';
  baseHp: number;
  gold: number;
  mobsKilled: number;
}

export interface MobBattleBoardPayload {
  event: 'board_update';
  board: ({ color: string } | null)[][];
  score: number;
  lines: number;
  combo: number;
  piece?: string;
  hold?: string | null;
  baseHp: number;
  gold: number;
}

export interface MobBattleGameOverPayload {
  event: 'game_over';
}

export type MobBattleRelayPayload =
  | MobSpawnRelayPayload
  | MobBattleSyncPayload
  | MobBattleBoardPayload
  | MobBattleGameOverPayload;

// ===== Line Clear Damage =====
export interface LineClearDamage {
  baseDamage: number;
  /** 'closest' hits nearest mob, 'front_half' hits front 50%, 'all' hits all mobs */
  target: 'closest' | 'front_half' | 'all';
}
