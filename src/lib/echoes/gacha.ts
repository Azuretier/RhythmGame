// =============================================================================
// ECHOES OF ETERNITY — Gacha & Reward System
// ガチャ＆報酬システム
// =============================================================================

import type {
  GachaBanner,
  GachaPullResult,
  PlayerGachaState,
  CharacterRarity,
  BattlePassSeason,
  BattlePassReward,
  SeasonMission,
  LootEntry,
  ItemRarity,
  EOE_CONFIG,
} from '@/types/echoes';
import { CHARACTER_DEFINITIONS } from './characters';

// ---------------------------------------------------------------------------
// Banner Definitions
// ---------------------------------------------------------------------------

export const STANDARD_BANNER: GachaBanner = {
  id: 'standard_001',
  name: 'Echoes of Eternity',
  nameJa: 'エコーズ・オブ・エタニティ',
  type: 'standard',
  featuredItems: [],
  rateUp: [],
  basePullRates: {
    fiveStar: 0.006,
    fourStar: 0.051,
    threeStar: 0.943,
  },
  pitySystem: {
    softPityStart: 74,
    hardPity: 90,
    rateIncreasePer: 0.06,
    guaranteedFeatured: false,
    fourStarPity: 10,
  },
  costPerPull: 160,
  costPer10Pull: 1600,
  startDate: '2026-01-01',
  endDate: '2099-12-31',
  isActive: true,
};

export function createLimitedBanner(
  id: string,
  name: string,
  nameJa: string,
  featuredCharacterId: string,
  startDate: string,
  endDate: string
): GachaBanner {
  return {
    id,
    name,
    nameJa,
    type: 'limited',
    featuredItems: [featuredCharacterId],
    rateUp: [{ itemId: featuredCharacterId, rateMultiplier: 2.0 }],
    basePullRates: {
      fiveStar: 0.006,
      fourStar: 0.051,
      threeStar: 0.943,
    },
    pitySystem: {
      softPityStart: 74,
      hardPity: 90,
      rateIncreasePer: 0.06,
      guaranteedFeatured: true,
      fourStarPity: 10,
    },
    costPerPull: 160,
    costPer10Pull: 1600,
    startDate,
    endDate,
    isActive: true,
  };
}

// ---------------------------------------------------------------------------
// Gacha Pull Logic
// ---------------------------------------------------------------------------

/**
 * Perform gacha pulls with pity system
 */
export function performPull(
  banner: GachaBanner,
  state: PlayerGachaState,
  count: 1 | 10
): { results: GachaPullResult[]; updatedState: PlayerGachaState } {
  const results: GachaPullResult[] = [];
  const updatedState = { ...state };

  // Initialize counters for this banner
  if (!updatedState.pullCounts[banner.id]) updatedState.pullCounts[banner.id] = 0;
  if (!updatedState.pityCounters[banner.id]) updatedState.pityCounters[banner.id] = 0;
  if (!updatedState.fourStarPityCounters[banner.id]) updatedState.fourStarPityCounters[banner.id] = 0;
  if (updatedState.guaranteedFeatured[banner.id] === undefined) updatedState.guaranteedFeatured[banner.id] = false;

  for (let i = 0; i < count; i++) {
    updatedState.pullCounts[banner.id]++;
    updatedState.pityCounters[banner.id]++;
    updatedState.fourStarPityCounters[banner.id]++;

    const pullNumber = updatedState.pullCounts[banner.id];
    const fiveStarPity = updatedState.pityCounters[banner.id];
    const fourStarPity = updatedState.fourStarPityCounters[banner.id];

    // Calculate 5★ rate with soft/hard pity
    let fiveStarRate = banner.basePullRates.fiveStar;
    if (fiveStarPity >= banner.pitySystem.softPityStart) {
      const pullsOverSoft = fiveStarPity - banner.pitySystem.softPityStart;
      fiveStarRate += pullsOverSoft * banner.pitySystem.rateIncreasePer;
    }
    if (fiveStarPity >= banner.pitySystem.hardPity) {
      fiveStarRate = 1.0; // Guaranteed
    }

    // 4★ guaranteed every N pulls
    const fourStarGuaranteed = fourStarPity >= banner.pitySystem.fourStarPity;

    // Roll
    const roll = Math.random();
    let rarity: CharacterRarity;
    let isPity = false;

    if (roll < fiveStarRate) {
      rarity = 5;
      if (fiveStarPity >= banner.pitySystem.softPityStart) isPity = true;
      updatedState.pityCounters[banner.id] = 0;
      updatedState.fourStarPityCounters[banner.id] = 0;
    } else if (fourStarGuaranteed || roll < fiveStarRate + banner.basePullRates.fourStar) {
      rarity = 4;
      updatedState.fourStarPityCounters[banner.id] = 0;
    } else {
      rarity = 3;
    }

    // Select item
    const { itemId, isFeatured } = selectPullItem(banner, updatedState, rarity);

    // Update guaranteed featured state (50/50 system for 5★)
    if (rarity === 5 && banner.pitySystem.guaranteedFeatured) {
      if (isFeatured) {
        updatedState.guaranteedFeatured[banner.id] = false;
      } else {
        updatedState.guaranteedFeatured[banner.id] = true; // next 5★ guaranteed featured
      }
    }

    // Determine animation
    let animation: GachaPullResult['animation'] = 'standard';
    if (rarity === 5) animation = 'rainbow';
    else if (rarity === 4) animation = 'golden';

    // Check if new
    const isNew = !updatedState.pullHistory.some((p) => p.itemId === itemId);

    const result: GachaPullResult = {
      itemId,
      itemType: 'character', // Simplified: all are characters
      rarity,
      isNew,
      isFeatured,
      pullNumber,
      isPity,
      animation,
    };

    results.push(result);
    updatedState.pullHistory.push(result);
  }

  return { results, updatedState };
}

function selectPullItem(
  banner: GachaBanner,
  state: PlayerGachaState,
  rarity: CharacterRarity
): { itemId: string; isFeatured: boolean } {
  const pool = CHARACTER_DEFINITIONS.filter((c) => c.rarity === rarity);

  if (pool.length === 0) {
    // Fallback
    return { itemId: 'generic_3star', isFeatured: false };
  }

  // For 5★ with guarantee system
  if (rarity === 5 && banner.type === 'limited' && banner.featuredItems.length > 0) {
    const isGuaranteed = state.guaranteedFeatured[banner.id];

    if (isGuaranteed) {
      // Guaranteed featured
      return { itemId: banner.featuredItems[0], isFeatured: true };
    }

    // 50/50 chance
    if (Math.random() < 0.5) {
      return { itemId: banner.featuredItems[0], isFeatured: true };
    }
  }

  // Rate-up check for featured items in the pool
  for (const rateUp of banner.rateUp) {
    const char = pool.find((c) => c.id === rateUp.itemId);
    if (char && char.rarity === rarity) {
      if (Math.random() < 0.5 * rateUp.rateMultiplier / pool.length) {
        return { itemId: char.id, isFeatured: true };
      }
    }
  }

  // Random from pool
  const selected = pool[Math.floor(Math.random() * pool.length)];
  return { itemId: selected.id, isFeatured: banner.featuredItems.includes(selected.id) };
}

/**
 * Create initial gacha state for a new player
 */
export function createInitialGachaState(): PlayerGachaState {
  return {
    pullCounts: {},
    pityCounters: {},
    fourStarPityCounters: {},
    guaranteedFeatured: {},
    pullHistory: [],
  };
}

/**
 * Get pity info for display
 */
export function getPityInfo(state: PlayerGachaState, bannerId: string): {
  fiveStarPity: number;
  fourStarPity: number;
  isGuaranteedFeatured: boolean;
  totalPulls: number;
} {
  return {
    fiveStarPity: state.pityCounters[bannerId] ?? 0,
    fourStarPity: state.fourStarPityCounters[bannerId] ?? 0,
    isGuaranteedFeatured: state.guaranteedFeatured[bannerId] ?? false,
    totalPulls: state.pullCounts[bannerId] ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Battle Pass / Season System
// ---------------------------------------------------------------------------

export function createBattlePassSeason(seasonNumber: number): BattlePassSeason {
  const freeRewards: BattlePassReward[] = [];
  const premiumRewards: BattlePassReward[] = [];

  // Generate 50 levels of rewards
  for (let level = 1; level <= 50; level++) {
    // Free rewards every 2 levels
    if (level % 2 === 0) {
      freeRewards.push({
        level,
        itemId: level % 10 === 0 ? 'gacha_ticket' : 'exp_crystal',
        itemType: level % 10 === 0 ? 'currency' : 'resource',
        quantity: level % 10 === 0 ? 1 : Math.floor(level / 5) + 1,
        isPremium: false,
      });
    }

    // Premium rewards every level
    premiumRewards.push({
      level,
      itemId: getPremiumRewardForLevel(level),
      itemType: getPremiumRewardType(level),
      quantity: 1,
      isPremium: true,
    });
  }

  return {
    id: `season_${seasonNumber}`,
    name: `Season ${seasonNumber}: Echoes Awakened`,
    nameJa: `シーズン${seasonNumber}: 覚醒のエコー`,
    seasonNumber,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    maxLevel: 50,
    freeRewards,
    premiumRewards,
    experiencePerLevel: 1000,
    weeklyMissions: generateWeeklyMissions(),
    dailyMissions: generateDailyMissions(),
    seasonalEvents: [],
  };
}

function getPremiumRewardForLevel(level: number): string {
  if (level === 1) return 'season_namecard';
  if (level === 50) return 'season_skin_legendary';
  if (level === 25) return 'gacha_ticket_10';
  if (level % 10 === 0) return 'premium_currency_pack';
  if (level % 5 === 0) return 'gacha_ticket';
  return 'exp_crystal_premium';
}

function getPremiumRewardType(level: number): BattlePassReward['itemType'] {
  if (level === 1) return 'namecard';
  if (level === 50) return 'skin';
  if (level % 10 === 0 || level === 25) return 'currency';
  return 'resource';
}

function generateWeeklyMissions(): SeasonMission[] {
  return [
    {
      id: 'weekly_battles', name: 'Weekly Warrior', nameJa: '週間戦士',
      description: 'Win 10 battles this week', descriptionJa: '今週10回バトルに勝利',
      objective: { type: 'win_battle', target: 'any', count: 10 },
      reward: { experience: 500, items: [{ itemId: 'exp_crystal', chance: 1, minQuantity: 5, maxQuantity: 5, rarity: 'uncommon' }] },
      isCompleted: false, progress: 0, maxProgress: 10,
    },
    {
      id: 'weekly_dungeon', name: 'Dungeon Diver', nameJa: 'ダンジョン探索者',
      description: 'Clear 5 dungeons', descriptionJa: 'ダンジョンを5回クリア',
      objective: { type: 'complete_dungeon', target: 'any', count: 5 },
      reward: { experience: 500, items: [{ itemId: 'gold_coin', chance: 1, minQuantity: 500, maxQuantity: 500, rarity: 'common' }] },
      isCompleted: false, progress: 0, maxProgress: 5,
    },
    {
      id: 'weekly_reactions', name: 'Elemental Master', nameJa: '元素マスター',
      description: 'Trigger 50 elemental reactions', descriptionJa: '元素反応を50回発生',
      objective: { type: 'reaction', target: 'any', count: 50 },
      reward: { experience: 300 },
      isCompleted: false, progress: 0, maxProgress: 50,
    },
    {
      id: 'weekly_rhythm', name: 'Rhythm Prodigy', nameJa: 'リズムの天才',
      description: 'Achieve 90%+ accuracy in 10 rhythm sequences', descriptionJa: 'リズムシーケンスで90%以上の精度を10回達成',
      objective: { type: 'rhythm_score', target: '0.9', count: 10 },
      reward: { experience: 400 },
      isCompleted: false, progress: 0, maxProgress: 10,
    },
  ];
}

function generateDailyMissions(): SeasonMission[] {
  return [
    {
      id: 'daily_battle', name: 'Daily Battle', nameJa: 'デイリーバトル',
      description: 'Win 3 battles', descriptionJa: '3回バトルに勝利',
      objective: { type: 'win_battle', target: 'any', count: 3 },
      reward: { experience: 100 },
      isCompleted: false, progress: 0, maxProgress: 3,
    },
    {
      id: 'daily_collect', name: 'Resource Gathering', nameJa: '資源収集',
      description: 'Collect 20 resources', descriptionJa: '資源を20個収集',
      objective: { type: 'collect', target: 'any', count: 20 },
      reward: { experience: 100 },
      isCompleted: false, progress: 0, maxProgress: 20,
    },
    {
      id: 'daily_combo', name: 'Combo Chain', nameJa: 'コンボチェイン',
      description: 'Achieve a 20-hit combo', descriptionJa: '20コンボを達成',
      objective: { type: 'combo', target: '20', count: 1 },
      reward: { experience: 150 },
      isCompleted: false, progress: 0, maxProgress: 1,
    },
  ];
}

// ---------------------------------------------------------------------------
// Loot Generation
// ---------------------------------------------------------------------------

const RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 50,
  uncommon: 25,
  rare: 15,
  epic: 7,
  legendary: 2.5,
  mythic: 0.5,
};

/**
 * Generate random loot from a loot pool
 */
export function generateRandomLoot(
  level: number,
  count: number,
  rarityBoost: number = 0
): LootEntry[] {
  const loot: LootEntry[] = [];

  for (let i = 0; i < count; i++) {
    const roll = Math.random() * 100;
    let rarity: ItemRarity = 'common';
    let cumulative = 0;

    for (const [r, weight] of Object.entries(RARITY_WEIGHTS)) {
      const adjustedWeight = r === 'common' ? weight - rarityBoost : weight + rarityBoost / 5;
      cumulative += adjustedWeight;
      if (roll < cumulative) {
        rarity = r as ItemRarity;
        break;
      }
    }

    const baseQuantity = rarity === 'common' ? 3 : rarity === 'uncommon' ? 2 : 1;

    loot.push({
      itemId: `loot_${rarity}_${Math.floor(Math.random() * 10)}`,
      chance: 1,
      minQuantity: baseQuantity,
      maxQuantity: baseQuantity + Math.floor(level / 10),
      rarity,
    });
  }

  return loot;
}

/**
 * Calculate gold reward for a battle
 */
export function calculateGoldReward(enemyLevel: number, enemyCount: number, isBoss: boolean): number {
  const base = enemyLevel * 5;
  const countMultiplier = enemyCount;
  const bossMultiplier = isBoss ? 5 : 1;
  return Math.floor(base * countMultiplier * bossMultiplier);
}

/**
 * Calculate experience reward for a battle
 */
export function calculateExpReward(enemyLevel: number, enemyCount: number, isBoss: boolean, rhythmAccuracy: number): number {
  const base = enemyLevel * 10;
  const countMultiplier = enemyCount;
  const bossMultiplier = isBoss ? 3 : 1;
  const rhythmBonus = 1 + rhythmAccuracy * 0.5; // up to 50% bonus
  return Math.floor(base * countMultiplier * bossMultiplier * rhythmBonus);
}
