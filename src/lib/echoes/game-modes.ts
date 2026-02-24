// =============================================================================
// ECHOES OF ETERNITY — Game Mode Configurations
// ゲームモード設定
// =============================================================================

import type { GameMode, GameModeConfig } from '@/types/echoes';

export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  story: {
    mode: 'story',
    name: 'Story Campaign',
    nameJa: 'ストーリーモード',
    description: 'Experience the epic tale of Echoes of Eternity',
    descriptionJa: '壮大な物語を体験せよ',
    minPlayers: 1,
    maxPlayers: 4,
    ranked: false,
    rewards: { experience: 500, gold: 200, guaranteedLoot: [], bonusLoot: [] },
    icon: '📖',
    color: '#8B5CF6',
  },
  battle_royale: {
    mode: 'battle_royale',
    name: 'Eternity Royale',
    nameJa: 'エタニティロイヤル',
    description: '100 players drop into a collapsing multiverse',
    descriptionJa: '100人が崩壊する多元世界に降下',
    minPlayers: 2, // reduced for testing
    maxPlayers: 100,
    ranked: true,
    rewards: { experience: 1000, gold: 500, guaranteedLoot: [], bonusLoot: [] },
    icon: '👑',
    color: '#EF4444',
    unlockRequirement: { level: 10 },
  },
  ranked_5v5: {
    mode: 'ranked_5v5',
    name: 'Ranked Arena',
    nameJa: 'ランクマッチ',
    description: '5v5 MOBA-style strategic combat',
    descriptionJa: '5v5のMOBA式戦略バトル',
    minPlayers: 2, // reduced for testing
    maxPlayers: 10,
    ranked: true,
    rewards: { experience: 800, gold: 400, guaranteedLoot: [], bonusLoot: [] },
    icon: '⚔️',
    color: '#F59E0B',
    unlockRequirement: { level: 15 },
  },
  rhythm_challenge: {
    mode: 'rhythm_challenge',
    name: 'Rhythm Challenge',
    nameJa: 'リズムチャレンジ',
    description: 'Pure rhythm game mode with global leaderboards',
    descriptionJa: '純粋な音ゲーモード — 世界ランキング対応',
    minPlayers: 1,
    maxPlayers: 1,
    ranked: true,
    rewards: { experience: 300, gold: 150, guaranteedLoot: [], bonusLoot: [] },
    icon: '🎵',
    color: '#EC4899',
  },
  endless_dungeon: {
    mode: 'endless_dungeon',
    name: 'Endless Abyss',
    nameJa: '無限の深淵',
    description: 'Descend into infinite floors of increasing difficulty',
    descriptionJa: '無限に続く階層を攻略せよ',
    minPlayers: 1,
    maxPlayers: 4,
    ranked: true,
    rewards: { experience: 600, gold: 300, guaranteedLoot: [], bonusLoot: [] },
    icon: '🕳️',
    color: '#6366F1',
    unlockRequirement: { level: 5 },
  },
  creative: {
    mode: 'creative',
    name: 'Creative Mode',
    nameJa: 'クリエイティブ',
    description: 'Build freely with unlimited resources',
    descriptionJa: '無制限の資源で自由に建築',
    minPlayers: 1,
    maxPlayers: 8,
    ranked: false,
    rewards: { experience: 100, gold: 0, guaranteedLoot: [], bonusLoot: [] },
    icon: '🏗️',
    color: '#10B981',
  },
  arena_pvp: {
    mode: 'arena_pvp',
    name: 'Arena Duel',
    nameJa: 'アリーナ決闘',
    description: '1v1 or 2v2 PvP duels',
    descriptionJa: '1v1 / 2v2 のPvP対決',
    minPlayers: 2,
    maxPlayers: 4,
    ranked: true,
    rewards: { experience: 400, gold: 200, guaranteedLoot: [], bonusLoot: [] },
    icon: '🏟️',
    color: '#DC2626',
    unlockRequirement: { level: 8 },
  },
  co_op_dungeon: {
    mode: 'co_op_dungeon',
    name: 'Co-op Dungeon',
    nameJa: '協力ダンジョン',
    description: 'Team up to conquer challenging dungeons',
    descriptionJa: '仲間と協力して難関ダンジョンに挑め',
    minPlayers: 2,
    maxPlayers: 4,
    ranked: false,
    rewards: { experience: 700, gold: 350, guaranteedLoot: [], bonusLoot: [] },
    icon: '🏰',
    color: '#0EA5E9',
    unlockRequirement: { level: 5 },
  },
  boss_rush: {
    mode: 'boss_rush',
    name: 'Boss Rush',
    nameJa: 'ボスラッシュ',
    description: 'Face a gauntlet of powerful bosses',
    descriptionJa: '強力なボスの連戦に挑め',
    minPlayers: 1,
    maxPlayers: 4,
    ranked: true,
    rewards: { experience: 1200, gold: 600, guaranteedLoot: [], bonusLoot: [] },
    timeLimit: 600,
    icon: '💀',
    color: '#7C3AED',
    unlockRequirement: { level: 20, storyChapter: 5 },
  },
  daily_challenge: {
    mode: 'daily_challenge',
    name: 'Daily Challenge',
    nameJa: 'デイリーチャレンジ',
    description: 'Unique challenge that rotates every day',
    descriptionJa: '毎日変わるユニークなチャレンジ',
    minPlayers: 1,
    maxPlayers: 1,
    ranked: false,
    rewards: { experience: 200, gold: 100, guaranteedLoot: [], bonusLoot: [] },
    timeLimit: 300,
    icon: '📅',
    color: '#F97316',
  },
};

/**
 * Get all available game modes
 */
export function getAvailableGameModes(playerLevel: number, achievements: string[] = [], storyChapter: number = 0): GameModeConfig[] {
  return Object.values(GAME_MODE_CONFIGS).filter((config) => {
    if (!config.unlockRequirement) return true;
    if (config.unlockRequirement.level && playerLevel < config.unlockRequirement.level) return false;
    if (config.unlockRequirement.achievement && !achievements.includes(config.unlockRequirement.achievement)) return false;
    if (config.unlockRequirement.storyChapter && storyChapter < config.unlockRequirement.storyChapter) return false;
    return true;
  });
}

/**
 * Check if a game mode is unlocked
 */
export function isGameModeUnlocked(mode: GameMode, playerLevel: number, achievements: string[] = [], storyChapter: number = 0): boolean {
  const config = GAME_MODE_CONFIGS[mode];
  if (!config.unlockRequirement) return true;
  if (config.unlockRequirement.level && playerLevel < config.unlockRequirement.level) return false;
  if (config.unlockRequirement.achievement && !achievements.includes(config.unlockRequirement.achievement)) return false;
  if (config.unlockRequirement.storyChapter && storyChapter < config.unlockRequirement.storyChapter) return false;
  return true;
}
