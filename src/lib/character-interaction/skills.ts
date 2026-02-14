// ===== LoL-style Skill Definitions =====
// Each character role has a unique set of Q/W/E/R skills.
// Skills are cast using keyboard keys and consume score-based mana.

import type { SkillDefinition } from './types';
import {
  Q_COOLDOWN, W_COOLDOWN, E_COOLDOWN, R_COOLDOWN,
  Q_MANA_COST, W_MANA_COST, E_MANA_COST, R_MANA_COST,
  STUN_DURATION, EXECUTE_THRESHOLD, KNOCKBACK_TILES, HEAL_AMOUNT,
} from './constants';

// ===== Warrior Skills (Offensive / Physical) =====

export const WARRIOR_SKILLS: SkillDefinition[] = [
  {
    id: 'warrior_q',
    slot: 'Q',
    name: 'Blade Strike',
    nameJa: '剣撃',
    icon: '⚔️',
    description: 'Deal 30 damage to the nearest enemy.',
    descriptionJa: '最も近い敵に30ダメージを与える。',
    cooldown: Q_COOLDOWN,
    manaCost: Q_MANA_COST,
    targetType: 'enemy',
    effects: [{ type: 'damage', value: 30 }],
    color: '#FF4444',
    glowColor: '#FF8888',
  },
  {
    id: 'warrior_w',
    slot: 'W',
    name: 'War Cry',
    nameJa: '雄叫び',
    icon: '💢',
    description: 'Boost terrain damage by 50% for 5 seconds.',
    descriptionJa: '5秒間地形ダメージを50%増加。',
    cooldown: W_COOLDOWN,
    manaCost: W_MANA_COST,
    targetType: 'self',
    effects: [{ type: 'buff_damage', value: 1.5, duration: 5000 }],
    color: '#FF6600',
    glowColor: '#FFAA44',
  },
  {
    id: 'warrior_e',
    slot: 'E',
    name: 'Ground Slam',
    nameJa: '地砕き',
    icon: '💥',
    description: 'Knock back all enemies within 5 tiles by 3 tiles.',
    descriptionJa: '5マス以内の全敵を3マス押し戻す。',
    cooldown: E_COOLDOWN,
    manaCost: E_MANA_COST,
    targetType: 'area',
    effects: [{ type: 'knockback', value: KNOCKBACK_TILES, radius: 5 }],
    color: '#CC6600',
    glowColor: '#FF9933',
  },
  {
    id: 'warrior_r',
    slot: 'R',
    name: 'Cataclysm',
    nameJa: '天変地異',
    icon: '🌋',
    description: 'Execute all enemies below 20% HP and deal 50 damage to all others.',
    descriptionJa: 'HP20%以下の全敵を即死させ、他の敵に50ダメージ。',
    cooldown: R_COOLDOWN,
    manaCost: R_MANA_COST,
    targetType: 'global',
    effects: [
      { type: 'execute', value: 0, threshold: EXECUTE_THRESHOLD },
      { type: 'damage', value: 50 },
    ],
    color: '#FF0000',
    glowColor: '#FF4444',
  },
];

// ===== Mage Skills (AoE / Utility) =====

export const MAGE_SKILLS: SkillDefinition[] = [
  {
    id: 'mage_q',
    slot: 'Q',
    name: 'Arcane Bolt',
    nameJa: '秘術弾',
    icon: '🔮',
    description: 'Deal 20 damage to the nearest enemy and slow it for 2s.',
    descriptionJa: '最も近い敵に20ダメージ、2秒間減速。',
    cooldown: Q_COOLDOWN,
    manaCost: Q_MANA_COST,
    targetType: 'enemy',
    effects: [
      { type: 'damage', value: 20 },
      { type: 'slow', value: 0.5, duration: 2000 },
    ],
    color: '#7B68EE',
    glowColor: '#9B8BFF',
  },
  {
    id: 'mage_w',
    slot: 'W',
    name: 'Frost Ring',
    nameJa: '氷結陣',
    icon: '❄️',
    description: 'Slow all enemies within 8 tiles for 3 seconds.',
    descriptionJa: '8マス以内の全敵を3秒間減速。',
    cooldown: W_COOLDOWN,
    manaCost: W_MANA_COST,
    targetType: 'area',
    effects: [{ type: 'slow', value: 0.3, duration: 3000, radius: 8 }],
    color: '#00BFFF',
    glowColor: '#66D9FF',
  },
  {
    id: 'mage_e',
    slot: 'E',
    name: 'Seismic Wave',
    nameJa: '地震波',
    icon: '🌊',
    description: 'Destroy 20 terrain blocks instantly.',
    descriptionJa: '地形ブロックを20個即座に破壊。',
    cooldown: E_COOLDOWN,
    manaCost: E_MANA_COST,
    targetType: 'self',
    effects: [{ type: 'terrain_destroy', value: 20 }],
    color: '#4FC3F7',
    glowColor: '#81D4FA',
  },
  {
    id: 'mage_r',
    slot: 'R',
    name: 'Meteor Storm',
    nameJa: '流星雨',
    icon: '☄️',
    description: 'Deal 80 damage to all enemies and stun them for 2s.',
    descriptionJa: '全敵に80ダメージを与え、2秒間スタン。',
    cooldown: R_COOLDOWN,
    manaCost: R_MANA_COST,
    targetType: 'global',
    effects: [
      { type: 'damage', value: 80 },
      { type: 'stun', value: 0, duration: STUN_DURATION },
    ],
    color: '#FF6B9D',
    glowColor: '#FF8FAB',
  },
];

// ===== Healer Skills (Support / Defensive) =====

export const HEALER_SKILLS: SkillDefinition[] = [
  {
    id: 'healer_q',
    slot: 'Q',
    name: 'Mending Light',
    nameJa: '治癒光',
    icon: '✨',
    description: 'Restore 25 tower HP.',
    descriptionJa: 'タワーHPを25回復。',
    cooldown: Q_COOLDOWN,
    manaCost: Q_MANA_COST,
    targetType: 'self',
    effects: [{ type: 'heal', value: HEAL_AMOUNT }],
    color: '#00FF88',
    glowColor: '#66FFAA',
  },
  {
    id: 'healer_w',
    slot: 'W',
    name: 'Divine Shield',
    nameJa: '聖盾',
    icon: '🛡️',
    description: 'Reduce incoming damage by 50% for 6 seconds.',
    descriptionJa: '6秒間、被ダメージを50%軽減。',
    cooldown: W_COOLDOWN,
    manaCost: W_MANA_COST,
    targetType: 'self',
    effects: [{ type: 'shield', value: 0.5, duration: 6000 }],
    color: '#FFD700',
    glowColor: '#FFECB3',
  },
  {
    id: 'healer_e',
    slot: 'E',
    name: 'Purifying Burst',
    nameJa: '浄化の光',
    icon: '💫',
    description: 'Deal 15 damage to all enemies within 6 tiles.',
    descriptionJa: '6マス以内の全敵に15ダメージ。',
    cooldown: E_COOLDOWN,
    manaCost: E_MANA_COST,
    targetType: 'area',
    effects: [{ type: 'damage', value: 15, radius: 6 }],
    color: '#FFFFFF',
    glowColor: '#FFFFCC',
  },
  {
    id: 'healer_r',
    slot: 'R',
    name: 'Resurrection',
    nameJa: '復活の祈り',
    icon: '🌟',
    description: 'Fully restore tower HP and stun all enemies for 3s.',
    descriptionJa: 'タワーHPを全回復し、全敵を3秒間スタン。',
    cooldown: R_COOLDOWN,
    manaCost: R_MANA_COST,
    targetType: 'global',
    effects: [
      { type: 'heal', value: 100 },
      { type: 'stun', value: 0, duration: 3000 },
    ],
    color: '#FFD700',
    glowColor: '#FFF8DC',
  },
];

// ===== Guide Skills (Balanced / Story NPC) =====

export const GUIDE_SKILLS: SkillDefinition[] = [
  {
    id: 'guide_q',
    slot: 'Q',
    name: 'Insight',
    nameJa: '洞察',
    icon: '👁️',
    description: 'Deal 25 damage to the nearest enemy.',
    descriptionJa: '最も近い敵に25ダメージ。',
    cooldown: Q_COOLDOWN,
    manaCost: Q_MANA_COST,
    targetType: 'enemy',
    effects: [{ type: 'damage', value: 25 }],
    color: '#A29BFE',
    glowColor: '#C5BFFF',
  },
  {
    id: 'guide_w',
    slot: 'W',
    name: 'Barrier',
    nameJa: 'バリア',
    icon: '🔰',
    description: 'Shield the tower, reducing damage by 50% for 4s.',
    descriptionJa: '4秒間タワーへのダメージを50%軽減。',
    cooldown: W_COOLDOWN,
    manaCost: W_MANA_COST,
    targetType: 'self',
    effects: [{ type: 'shield', value: 0.5, duration: 4000 }],
    color: '#4ECDC4',
    glowColor: '#7EDDD6',
  },
  {
    id: 'guide_e',
    slot: 'E',
    name: 'Inspire',
    nameJa: '鼓舞',
    icon: '🎶',
    description: 'Boost damage by 50% for 4 seconds and heal 15 HP.',
    descriptionJa: '4秒間ダメージ50%増加、HP15回復。',
    cooldown: E_COOLDOWN,
    manaCost: E_MANA_COST,
    targetType: 'self',
    effects: [
      { type: 'buff_damage', value: 1.5, duration: 4000 },
      { type: 'heal', value: 15 },
    ],
    color: '#FFE66D',
    glowColor: '#FFF4A3',
  },
  {
    id: 'guide_r',
    slot: 'R',
    name: 'Judgement',
    nameJa: '裁き',
    icon: '⚡',
    description: 'Deal 60 damage to all enemies and destroy 15 terrain blocks.',
    descriptionJa: '全敵に60ダメージ、地形を15ブロック破壊。',
    cooldown: R_COOLDOWN,
    manaCost: R_MANA_COST,
    targetType: 'global',
    effects: [
      { type: 'damage', value: 60 },
      { type: 'terrain_destroy', value: 15 },
    ],
    color: '#FFD700',
    glowColor: '#FFF8DC',
  },
];

// ===== Merchant Skills (Economy-themed) =====

export const MERCHANT_SKILLS: SkillDefinition[] = [
  {
    id: 'merchant_q',
    slot: 'Q',
    name: 'Gold Toss',
    nameJa: 'ゴールド投げ',
    icon: '💰',
    description: 'Deal 20 damage to nearest enemy. Earn 10 bonus gold on kill.',
    descriptionJa: '最も近い敵に20ダメージ。キルで10G追加。',
    cooldown: Q_COOLDOWN,
    manaCost: Q_MANA_COST,
    targetType: 'enemy',
    effects: [{ type: 'damage', value: 20 }],
    color: '#FFD700',
    glowColor: '#FFECB3',
  },
  {
    id: 'merchant_w',
    slot: 'W',
    name: 'Fortune Shield',
    nameJa: '幸運の盾',
    icon: '🏅',
    description: 'Shield for 5 seconds, reducing damage by 50%.',
    descriptionJa: '5秒間ダメージを50%軽減。',
    cooldown: W_COOLDOWN,
    manaCost: W_MANA_COST,
    targetType: 'self',
    effects: [{ type: 'shield', value: 0.5, duration: 5000 }],
    color: '#FFA500',
    glowColor: '#FFD280',
  },
  {
    id: 'merchant_e',
    slot: 'E',
    name: 'Supply Drop',
    nameJa: '補給投下',
    icon: '📦',
    description: 'Heal tower 20 HP and destroy 10 terrain blocks.',
    descriptionJa: 'タワーHP20回復、地形10ブロック破壊。',
    cooldown: E_COOLDOWN,
    manaCost: E_MANA_COST,
    targetType: 'self',
    effects: [
      { type: 'heal', value: 20 },
      { type: 'terrain_destroy', value: 10 },
    ],
    color: '#8B4513',
    glowColor: '#CD853F',
  },
  {
    id: 'merchant_r',
    slot: 'R',
    name: 'Market Crash',
    nameJa: '暴落',
    icon: '📉',
    description: 'Deal 40 damage to all enemies. Slow all for 3s.',
    descriptionJa: '全敵に40ダメージ。3秒間全敵減速。',
    cooldown: R_COOLDOWN,
    manaCost: R_MANA_COST,
    targetType: 'global',
    effects: [
      { type: 'damage', value: 40 },
      { type: 'slow', value: 0.4, duration: 3000 },
    ],
    color: '#FF4500',
    glowColor: '#FF7744',
  },
];

// ===== Skill Lookup Maps =====

export const ALL_SKILLS: SkillDefinition[] = [
  ...WARRIOR_SKILLS,
  ...MAGE_SKILLS,
  ...HEALER_SKILLS,
  ...GUIDE_SKILLS,
  ...MERCHANT_SKILLS,
];

export const SKILL_MAP: Record<string, SkillDefinition> = Object.fromEntries(
  ALL_SKILLS.map(s => [s.id, s])
);

/** Get skills by role */
export function getSkillsByRole(role: string): SkillDefinition[] {
  switch (role) {
    case 'warrior': return WARRIOR_SKILLS;
    case 'mage': return MAGE_SKILLS;
    case 'healer': return HEALER_SKILLS;
    case 'guide': return GUIDE_SKILLS;
    case 'merchant': return MERCHANT_SKILLS;
    default: return GUIDE_SKILLS;
  }
}
