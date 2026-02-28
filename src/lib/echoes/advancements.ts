// =============================================================================
// ECHOES OF ETERNITY — Advancements (Achievements) System
// 実績システム
// =============================================================================

import type { EchoesPlayerStats } from '@/types/echoes';

// ---------------------------------------------------------------------------
// Achievement Categories
// ---------------------------------------------------------------------------

export type EchoesAdvancementCategory =
  | 'combat'         // Battle-related
  | 'rhythm'         // Rhythm game performance
  | 'exploration'    // World exploration
  | 'dungeon'        // Dungeon clearing
  | 'collection'     // Items, characters, resources
  | 'social'         // Multiplayer, PvP
  | 'creative'       // Building, crafting
  | 'mastery'        // Elemental reactions, combos
  | 'progression'    // Levels, ranks
  | 'secret';        // Hidden achievements

// ---------------------------------------------------------------------------
// Achievement Definition
// ---------------------------------------------------------------------------

export interface EchoesAdvancement {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  category: EchoesAdvancementCategory;
  icon: string;
  threshold: number;
  statKey: keyof EchoesPlayerStats;
  reward?: { type: 'currency' | 'title' | 'item'; id: string; quantity: number };
  isSecret: boolean;
}

// ---------------------------------------------------------------------------
// Achievement Definitions
// ---------------------------------------------------------------------------

export const ECHOES_ADVANCEMENTS: EchoesAdvancement[] = [
  // ===== Combat =====
  {
    id: 'eoe_first_blood', name: 'First Blood', nameJa: 'ファーストブラッド',
    description: 'Win your first battle', descriptionJa: '初めてのバトルに勝利',
    category: 'combat', icon: '⚔️', threshold: 1, statKey: 'totalWins',
    reward: { type: 'currency', id: 'premium_currency', quantity: 100 },
    isSecret: false,
  },
  {
    id: 'eoe_warrior_10', name: 'Seasoned Warrior', nameJa: '歴戦の戦士',
    description: 'Win 10 battles', descriptionJa: 'バトルに10回勝利',
    category: 'combat', icon: '⚔️', threshold: 10, statKey: 'totalWins',
    isSecret: false,
  },
  {
    id: 'eoe_warrior_100', name: 'Veteran Commander', nameJa: '百戦錬磨の指揮官',
    description: 'Win 100 battles', descriptionJa: 'バトルに100回勝利',
    category: 'combat', icon: '🏆', threshold: 100, statKey: 'totalWins',
    reward: { type: 'title', id: 'title_veteran', quantity: 1 },
    isSecret: false,
  },
  {
    id: 'eoe_warrior_1000', name: 'Legend of Battle', nameJa: 'バトルの伝説',
    description: 'Win 1,000 battles', descriptionJa: 'バトルに1,000回勝利',
    category: 'combat', icon: '👑', threshold: 1000, statKey: 'totalWins',
    reward: { type: 'title', id: 'title_legend', quantity: 1 },
    isSecret: false,
  },
  {
    id: 'eoe_boss_slayer', name: 'Boss Slayer', nameJa: 'ボススレイヤー',
    description: 'Defeat 10 bosses', descriptionJa: 'ボスを10体撃破',
    category: 'combat', icon: '💀', threshold: 10, statKey: 'bossesDefeated',
    reward: { type: 'currency', id: 'premium_currency', quantity: 200 },
    isSecret: false,
  },
  {
    id: 'eoe_boss_slayer_100', name: 'Destroyer of Titans', nameJa: 'タイタンの破壊者',
    description: 'Defeat 100 bosses', descriptionJa: 'ボスを100体撃破',
    category: 'combat', icon: '💀', threshold: 100, statKey: 'bossesDefeated',
    reward: { type: 'title', id: 'title_titan_slayer', quantity: 1 },
    isSecret: false,
  },

  // ===== Rhythm =====
  {
    id: 'eoe_rhythm_first', name: 'First Note', nameJa: '最初の音',
    description: 'Complete your first rhythm sequence', descriptionJa: '初めてのリズムシーケンスをクリア',
    category: 'rhythm', icon: '🎵', threshold: 1, statKey: 'totalPerfectRhythms',
    isSecret: false,
  },
  {
    id: 'eoe_rhythm_perfect_10', name: 'Perfect Harmony', nameJa: '完璧な調和',
    description: 'Achieve 10 perfect rhythm sequences', descriptionJa: 'リズムシーケンスでパーフェクトを10回達成',
    category: 'rhythm', icon: '🎵', threshold: 10, statKey: 'totalPerfectRhythms',
    reward: { type: 'currency', id: 'premium_currency', quantity: 150 },
    isSecret: false,
  },
  {
    id: 'eoe_rhythm_perfect_100', name: 'Maestro', nameJa: 'マエストロ',
    description: 'Achieve 100 perfect rhythm sequences', descriptionJa: 'リズムシーケンスでパーフェクトを100回達成',
    category: 'rhythm', icon: '🎶', threshold: 100, statKey: 'totalPerfectRhythms',
    reward: { type: 'title', id: 'title_maestro', quantity: 1 },
    isSecret: false,
  },
  {
    id: 'eoe_rhythm_notes_1000', name: 'Thousand Notes', nameJa: '千の音符',
    description: 'Hit 1,000 rhythm notes', descriptionJa: 'リズムノートを1,000回ヒット',
    category: 'rhythm', icon: '🎵', threshold: 1000, statKey: 'totalRhythmNotes',
    isSecret: false,
  },

  // ===== Exploration =====
  {
    id: 'eoe_explorer_first', name: 'Adventurer', nameJa: '冒険者',
    description: 'Explore your first region', descriptionJa: '初めてのリージョンを探索',
    category: 'exploration', icon: '🗺️', threshold: 1, statKey: 'regionsExplored',
    isSecret: false,
  },
  {
    id: 'eoe_explorer_all', name: 'World Traveler', nameJa: '世界旅行者',
    description: 'Explore 5 regions', descriptionJa: '5つのリージョンを探索',
    category: 'exploration', icon: '🌍', threshold: 5, statKey: 'regionsExplored',
    reward: { type: 'title', id: 'title_traveler', quantity: 1 },
    isSecret: false,
  },
  {
    id: 'eoe_chest_hunter', name: 'Treasure Hunter', nameJa: 'トレジャーハンター',
    description: 'Open 100 treasure chests', descriptionJa: '宝箱を100個開封',
    category: 'exploration', icon: '🎁', threshold: 100, statKey: 'chestsOpened',
    reward: { type: 'currency', id: 'premium_currency', quantity: 200 },
    isSecret: false,
  },

  // ===== Dungeon =====
  {
    id: 'eoe_dungeon_5', name: 'Dungeon Crawler', nameJa: 'ダンジョン探索者',
    description: 'Clear 5 dungeons', descriptionJa: 'ダンジョンを5回クリア',
    category: 'dungeon', icon: '🏰', threshold: 5, statKey: 'dungeonsCleared',
    isSecret: false,
  },
  {
    id: 'eoe_dungeon_50', name: 'Abyss Walker', nameJa: '深淵の歩行者',
    description: 'Clear 50 dungeons', descriptionJa: 'ダンジョンを50回クリア',
    category: 'dungeon', icon: '🕳️', threshold: 50, statKey: 'dungeonsCleared',
    reward: { type: 'title', id: 'title_abyss_walker', quantity: 1 },
    isSecret: false,
  },
  {
    id: 'eoe_endless_10', name: 'Depths of Despair', nameJa: '絶望の深淵',
    description: 'Reach floor 10 in Endless Dungeon', descriptionJa: '無限ダンジョンで10階に到達',
    category: 'dungeon', icon: '⬇️', threshold: 10, statKey: 'deepestEndlessFloor',
    isSecret: false,
  },
  {
    id: 'eoe_endless_50', name: 'Into the Void', nameJa: '虚空への旅',
    description: 'Reach floor 50 in Endless Dungeon', descriptionJa: '無限ダンジョンで50階に到達',
    category: 'dungeon', icon: '🌀', threshold: 50, statKey: 'deepestEndlessFloor',
    reward: { type: 'title', id: 'title_void_walker', quantity: 1 },
    isSecret: false,
  },

  // ===== Collection =====
  {
    id: 'eoe_collector_100', name: 'Hoarder', nameJa: '収集家',
    description: 'Collect 100 resources', descriptionJa: '資源を100個収集',
    category: 'collection', icon: '💎', threshold: 100, statKey: 'resourcesCollected',
    isSecret: false,
  },
  {
    id: 'eoe_crafter_10', name: 'Apprentice Smith', nameJa: '見習い鍛冶師',
    description: 'Craft 10 items', descriptionJa: 'アイテムを10個クラフト',
    category: 'collection', icon: '🔨', threshold: 10, statKey: 'itemsCrafted',
    isSecret: false,
  },
  {
    id: 'eoe_gacha_100', name: 'Wish Upon a Star', nameJa: '星に願いを',
    description: 'Perform 100 gacha pulls', descriptionJa: 'ガチャを100回引く',
    category: 'collection', icon: '⭐', threshold: 100, statKey: 'totalGachaPulls',
    isSecret: false,
  },

  // ===== Social =====
  {
    id: 'eoe_pvp_10', name: 'Arena Champion', nameJa: 'アリーナチャンピオン',
    description: 'Win 10 PvP matches', descriptionJa: 'PvPで10回勝利',
    category: 'social', icon: '🏟️', threshold: 10, statKey: 'pvpWins',
    reward: { type: 'currency', id: 'premium_currency', quantity: 150 },
    isSecret: false,
  },
  {
    id: 'eoe_br_win', name: 'Last One Standing', nameJa: '最後の一人',
    description: 'Win a Battle Royale match', descriptionJa: 'バトルロイヤルで優勝',
    category: 'social', icon: '👑', threshold: 1, statKey: 'battleRoyaleWins',
    reward: { type: 'title', id: 'title_champion', quantity: 1 },
    isSecret: false,
  },
  {
    id: 'eoe_br_top10', name: 'Survivor', nameJa: 'サバイバー',
    description: 'Finish in the top 10 of Battle Royale 10 times', descriptionJa: 'バトルロイヤルでトップ10に10回入る',
    category: 'social', icon: '🥇', threshold: 10, statKey: 'battleRoyaleTop10',
    isSecret: false,
  },

  // ===== Mastery =====
  {
    id: 'eoe_combo_50', name: 'Combo King', nameJa: 'コンボキング',
    description: 'Achieve a 50-hit combo', descriptionJa: '50コンボを達成',
    category: 'mastery', icon: '🔥', threshold: 50, statKey: 'bestCombo',
    reward: { type: 'currency', id: 'premium_currency', quantity: 100 },
    isSecret: false,
  },
  {
    id: 'eoe_combo_200', name: 'Combo God', nameJa: 'コンボゴッド',
    description: 'Achieve a 200-hit combo', descriptionJa: '200コンボを達成',
    category: 'mastery', icon: '💥', threshold: 200, statKey: 'bestCombo',
    reward: { type: 'title', id: 'title_combo_god', quantity: 1 },
    isSecret: false,
  },
  {
    id: 'eoe_reactions_100', name: 'Alchemist', nameJa: '錬金術師',
    description: 'Trigger 100 elemental reactions', descriptionJa: '元素反応を100回発生',
    category: 'mastery', icon: '🧪', threshold: 100, statKey: 'totalElementalReactions',
    isSecret: false,
  },
  {
    id: 'eoe_reactions_1000', name: 'Elemental Sage', nameJa: '元素の賢者',
    description: 'Trigger 1,000 elemental reactions', descriptionJa: '元素反応を1,000回発生',
    category: 'mastery', icon: '🌈', threshold: 1000, statKey: 'totalElementalReactions',
    reward: { type: 'title', id: 'title_sage', quantity: 1 },
    isSecret: false,
  },

  // ===== Creative =====
  {
    id: 'eoe_builder_100', name: 'Architect', nameJa: 'アーキテクト',
    description: 'Place 100 blocks', descriptionJa: 'ブロックを100個設置',
    category: 'creative', icon: '🏗️', threshold: 100, statKey: 'blocksPlaced',
    isSecret: false,
  },
  {
    id: 'eoe_builder_1000', name: 'Master Builder', nameJa: 'マスタービルダー',
    description: 'Place 1,000 blocks', descriptionJa: 'ブロックを1,000個設置',
    category: 'creative', icon: '🏛️', threshold: 1000, statKey: 'blocksPlaced',
    reward: { type: 'title', id: 'title_master_builder', quantity: 1 },
    isSecret: false,
  },

  // ===== Progression =====
  {
    id: 'eoe_damage_100k', name: 'Destroyer', nameJa: '破壊者',
    description: 'Deal 100,000 total damage', descriptionJa: '累計100,000ダメージを与える',
    category: 'progression', icon: '💢', threshold: 100000, statKey: 'totalDamageDealt',
    isSecret: false,
  },
  {
    id: 'eoe_damage_1m', name: 'Annihilator', nameJa: '殲滅者',
    description: 'Deal 1,000,000 total damage', descriptionJa: '累計1,000,000ダメージを与える',
    category: 'progression', icon: '☄️', threshold: 1000000, statKey: 'totalDamageDealt',
    reward: { type: 'title', id: 'title_annihilator', quantity: 1 },
    isSecret: false,
  },
  {
    id: 'eoe_healer_10k', name: 'Guardian Angel', nameJa: '守護天使',
    description: 'Heal 10,000 total HP', descriptionJa: '累計10,000HP回復',
    category: 'progression', icon: '💚', threshold: 10000, statKey: 'totalHealing',
    isSecret: false,
  },

  // ===== Secret =====
  {
    id: 'eoe_secret_light_dark', name: '???', nameJa: '???',
    description: 'Trigger the Radiance reaction', descriptionJa: '輝滅反応を発生させる',
    category: 'secret', icon: '❓', threshold: 1, statKey: 'totalElementalReactions',
    reward: { type: 'title', id: 'title_duality', quantity: 1 },
    isSecret: true,
  },
  {
    id: 'eoe_secret_thunderstorm', name: '???', nameJa: '???',
    description: 'Trigger the Thunderstorm triple reaction', descriptionJa: '暴風雨の三重反応を発生させる',
    category: 'secret', icon: '❓', threshold: 1, statKey: 'totalElementalReactions',
    reward: { type: 'title', id: 'title_storm_caller', quantity: 1 },
    isSecret: true,
  },
];

// ---------------------------------------------------------------------------
// Achievement Checking
// ---------------------------------------------------------------------------

/**
 * Check which achievements are newly unlocked based on current stats
 */
export function checkAdvancements(
  stats: EchoesPlayerStats,
  alreadyUnlocked: string[]
): EchoesAdvancement[] {
  const newlyUnlocked: EchoesAdvancement[] = [];

  for (const adv of ECHOES_ADVANCEMENTS) {
    if (alreadyUnlocked.includes(adv.id)) continue;

    const statValue = stats[adv.statKey];
    if (typeof statValue === 'number' && statValue >= adv.threshold) {
      newlyUnlocked.push(adv);
    }
  }

  return newlyUnlocked;
}

/**
 * Get all advancements in a category
 */
export function getAdvancementsByCategory(category: EchoesAdvancementCategory): EchoesAdvancement[] {
  return ECHOES_ADVANCEMENTS.filter((a) => a.category === category);
}

/**
 * Get advancement progress for display
 */
export function getAdvancementProgress(
  advancement: EchoesAdvancement,
  stats: EchoesPlayerStats
): { current: number; target: number; percent: number; isComplete: boolean } {
  const current = stats[advancement.statKey] as number ?? 0;
  const target = advancement.threshold;
  const percent = Math.min(100, (current / target) * 100);
  return { current, target, percent, isComplete: current >= target };
}

/**
 * Calculate total achievement score (for profile display)
 */
export function calculateAchievementScore(unlockedIds: string[]): number {
  let score = 0;
  for (const id of unlockedIds) {
    const adv = ECHOES_ADVANCEMENTS.find((a) => a.id === id);
    if (adv) {
      // Higher threshold = more points
      score += Math.floor(Math.log10(adv.threshold + 1) * 100);
      if (adv.isSecret) score += 500; // Bonus for secrets
    }
  }
  return score;
}
