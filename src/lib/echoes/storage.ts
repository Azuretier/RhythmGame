// =============================================================
// Echoes of Eternity — Local Storage Persistence
// =============================================================

import type { EchoesPlayerData, ResourceType } from '@/types/echoes';
import { STARTER_CHARACTER_IDS, createOwnedCharacter } from './characters';

const STORAGE_KEY = 'echoes_player_data';

export function getDefaultPlayerData(): EchoesPlayerData {
  return {
    name: '',
    level: 1,
    experience: 0,
    characters: STARTER_CHARACTER_IDS.map(id => createOwnedCharacter(id)),
    resources: {
      gold: 1000,
      wood: 20,
      iron_ore: 10,
      herb: 15,
      elemental_dust: 5,
    } as Partial<Record<ResourceType, number>>,
    equipmentVault: [],
    gacha: {
      pityCounter: {},
      totalPulls: {},
      history: [],
    },
    ranked: {
      tier: 'echo_bronze',
      points: 0,
      pointsForPromotion: 500,
      wins: 0,
      losses: 0,
      winStreak: 0,
      bestWinStreak: 0,
      season: 1,
    },
    craftingLevel: 1,
    seasonPassLevel: 1,
    seasonPassXp: 0,
    totalPlayTime: 0,
    explorationProgress: 0,
    achievements: [],
    storyProgress: 0,
    dungeonFloor: 0,
    dailyQuestsCompleted: 0,
    lastDailyReset: 0,
    brWins: 0,
    brTopTen: 0,
    brKills: 0,
  };
}

export function loadPlayerData(): EchoesPlayerData {
  if (typeof window === 'undefined') return getDefaultPlayerData();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultPlayerData();

    const parsed = JSON.parse(stored) as EchoesPlayerData;
    // Merge with defaults to handle missing fields from updates
    return { ...getDefaultPlayerData(), ...parsed };
  } catch {
    return getDefaultPlayerData();
  }
}

export function savePlayerData(data: EchoesPlayerData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export function clearPlayerData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
