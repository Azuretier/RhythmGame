import type { MobDefinition, LineClearDamage } from './types';

// ===== Economy Constants =====
export const INITIAL_GOLD = 200;
export const MAX_BASE_HP = 100;
export const PASSIVE_INCOME_AMOUNT = 10;
export const PASSIVE_INCOME_INTERVAL = 5000; // ms
export const GOLD_PER_LINE = 30; // base gold per line cleared

// ===== Mob Definitions =====
export const MOB_DEFINITIONS: MobDefinition[] = [
  {
    id: 'zombie',
    name: 'Zombie',
    nameJa: 'ゾンビ',
    icon: '🧟',
    cost: 50,
    hp: 30,
    speed: 0.08,
    damage: 10,
    bounty: 20,
    color: '#4CAF50',
    description: 'Slow but sturdy undead.',
    descriptionJa: '遅いが丈夫なアンデッド。',
  },
  {
    id: 'spider',
    name: 'Spider',
    nameJa: 'クモ',
    icon: '🕷️',
    cost: 60,
    hp: 15,
    speed: 0.18,
    damage: 5,
    bounty: 25,
    color: '#795548',
    description: 'Fast with low health.',
    descriptionJa: '素早いが体力が低い。',
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    nameJa: 'スケルトン',
    icon: '💀',
    cost: 80,
    hp: 20,
    speed: 0.12,
    damage: 8,
    bounty: 35,
    color: '#BDBDBD',
    description: 'Balanced ranged attacker.',
    descriptionJa: 'バランスの取れた遠距離攻撃者。',
  },
  {
    id: 'creeper',
    name: 'Creeper',
    nameJa: 'クリーパー',
    icon: '💥',
    cost: 120,
    hp: 25,
    speed: 0.10,
    damage: 30,
    bounty: 50,
    color: '#76FF03',
    description: 'Explodes on arrival for massive damage.',
    descriptionJa: '到達時に爆発し大ダメージ。',
  },
  {
    id: 'enderman',
    name: 'Enderman',
    nameJa: 'エンダーマン',
    icon: '👾',
    cost: 180,
    hp: 50,
    speed: 0.14,
    damage: 15,
    bounty: 80,
    color: '#7C4DFF',
    description: 'High HP teleporting threat.',
    descriptionJa: '高体力のテレポート脅威。',
  },
  {
    id: 'golem',
    name: 'Iron Golem',
    nameJa: 'アイアンゴーレム',
    icon: '🤖',
    cost: 250,
    hp: 100,
    speed: 0.05,
    damage: 25,
    bounty: 110,
    color: '#B0BEC5',
    description: 'Extremely tanky siege unit.',
    descriptionJa: '超耐久の攻城ユニット。',
  },
];

export const MOB_MAP: Record<string, MobDefinition> = Object.fromEntries(
  MOB_DEFINITIONS.map(m => [m.id, m])
);

// ===== Line Clear Damage Table =====
// Indexed by number of lines cleared (1-4)
export const LINE_CLEAR_DAMAGE: Record<number, LineClearDamage> = {
  1: { baseDamage: 15, target: 'closest' },
  2: { baseDamage: 30, target: 'front_half' },
  3: { baseDamage: 50, target: 'all' },
  4: { baseDamage: 80, target: 'all' },
};

// ===== Damage Bonuses =====
export const BEAT_DAMAGE_MULTIPLIER = 1.5;
export const COMBO_DAMAGE_BONUS = 10; // per combo count

// ===== Mob Lane =====
export const MOB_LANE_LENGTH = 20; // visual tiles in the mob lane
export const MOB_SPAWN_POSITION = 0.0;
export const MOB_BASE_POSITION = 1.0;

// ===== Sync Interval =====
export const MOB_SYNC_INTERVAL = 2000; // ms between state sync relays
export const BOARD_RELAY_INTERVAL = 500; // ms between board state relays
