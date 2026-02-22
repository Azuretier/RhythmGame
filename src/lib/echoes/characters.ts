// =============================================================
// Echoes of Eternity — Character Definitions & Gacha System
// =============================================================

import type {
  Character,
  Rarity,
  GachaBanner,
  GachaPull,
  GachaState,
  OwnedCharacter,
  CharacterStats,
} from '@/types/echoes';
import { ECHOES_CONFIG } from '@/types/echoes';

// === Starter Characters (Free) ===

export const CHARACTERS: Character[] = [
  // --- Fire Characters ---
  {
    id: 'ignis',
    name: 'Ignis',
    title: 'The Ember Warden',
    element: 'fire',
    role: 'dps',
    rarity: 'legendary',
    baseStats: { hp: 800, atk: 95, def: 45, spd: 72, critRate: 15, critDmg: 150, elementalMastery: 40, energy: 0, maxEnergy: 100 },
    growthRates: { hp: 12, atk: 3.5, def: 1.5, spd: 0.5, elementalMastery: 0.8 },
    abilities: [
      {
        id: 'ignis_slash', name: 'Flame Slash', description: 'A blazing sword strike',
        element: 'fire', cooldown: 0, cost: 0, basePower: 120, target: 'single',
        rhythmComboThreshold: 5, rhythmBonusMultiplier: 1.5,
      },
      {
        id: 'ignis_burst', name: 'Inferno Burst', description: 'Erupts fire in a wide area',
        element: 'fire', cooldown: 3, cost: 30, basePower: 200, target: 'aoe',
        effects: [{ status: 'burn', chance: 0.8, duration: 3 }],
        rhythmComboThreshold: 10, rhythmBonusMultiplier: 2.0,
      },
    ],
    ultimate: {
      id: 'ignis_ult', name: 'Phoenix Ascension', description: 'Transform into a phoenix of pure flame',
      element: 'fire', energyCost: 100, basePower: 500, target: 'all_enemies',
      effects: [{ status: 'burn', chance: 1.0, duration: 4 }],
      animationTier: 3,
    },
    passive: 'When HP drops below 30%, ATK increases by 40%',
    comboPartners: ['luna', 'terra'],
    lore: 'Once the captain of the Eternal Guard, Ignis now wanders the fractured timelines, his blade eternally ablaze.',
    themeColor: '#FF4500',
    icon: 'F',
  },
  // --- Water Characters ---
  {
    id: 'luna',
    name: 'Luna',
    title: 'The Tidal Sage',
    element: 'water',
    role: 'support',
    rarity: 'legendary',
    baseStats: { hp: 900, atk: 60, def: 55, spd: 65, critRate: 10, critDmg: 120, elementalMastery: 80, energy: 0, maxEnergy: 90 },
    growthRates: { hp: 14, atk: 2.0, def: 2.0, spd: 0.4, elementalMastery: 1.2 },
    abilities: [
      {
        id: 'luna_heal', name: 'Tidal Mending', description: 'Healing waters restore an ally',
        element: 'water', cooldown: 2, cost: 25, basePower: 180, target: 'ally',
        rhythmComboThreshold: 3, rhythmBonusMultiplier: 1.3,
      },
      {
        id: 'luna_wave', name: 'Crashing Wave', description: 'A torrent sweeps enemies',
        element: 'water', cooldown: 3, cost: 35, basePower: 150, target: 'aoe',
        effects: [{ status: 'freeze', chance: 0.3, duration: 1 }],
      },
    ],
    ultimate: {
      id: 'luna_ult', name: 'Ocean\'s Embrace', description: 'Summon a healing ocean that rejuvenates all allies',
      element: 'water', energyCost: 90, basePower: 350, target: 'all_allies',
      effects: [{ status: 'regen', chance: 1.0, duration: 4 }],
      animationTier: 3,
    },
    passive: 'Allies healed by Luna gain 15% elemental mastery for 2 turns',
    comboPartners: ['ignis', 'volt'],
    lore: 'The last oracle of the sunken city of Atlantea, Luna reads the tides of fate itself.',
    themeColor: '#1E90FF',
    icon: 'W',
  },
  // --- Ice Characters ---
  {
    id: 'frost',
    name: 'Frost',
    title: 'The Winter Knight',
    element: 'ice',
    role: 'tank',
    rarity: 'epic',
    baseStats: { hp: 1200, atk: 55, def: 80, spd: 50, critRate: 8, critDmg: 100, elementalMastery: 30, energy: 0, maxEnergy: 110 },
    growthRates: { hp: 18, atk: 1.5, def: 3.0, spd: 0.3, elementalMastery: 0.5 },
    abilities: [
      {
        id: 'frost_shield', name: 'Glacial Bulwark', description: 'Raise an ice barrier protecting the party',
        element: 'ice', cooldown: 4, cost: 30, basePower: 0, target: 'all_allies',
        effects: [{ status: 'shield', chance: 1.0, duration: 3 }, { status: 'def_up', chance: 1.0, duration: 2 }],
      },
      {
        id: 'frost_lance', name: 'Frost Lance', description: 'Hurl a lance of pure ice',
        element: 'ice', cooldown: 1, cost: 15, basePower: 130, target: 'single',
        effects: [{ status: 'freeze', chance: 0.25, duration: 1 }],
        rhythmComboThreshold: 8, rhythmBonusMultiplier: 1.4,
      },
    ],
    ultimate: {
      id: 'frost_ult', name: 'Absolute Zero', description: 'Flash-freeze the entire battlefield',
      element: 'ice', energyCost: 110, basePower: 300, target: 'all_enemies',
      effects: [{ status: 'freeze', chance: 0.7, duration: 2 }],
      animationTier: 2,
    },
    passive: 'When shielded, counter-attacks deal 30% ice damage',
    comboPartners: ['luna', 'volt'],
    lore: 'Once the frozen lake\'s guardian spirit, Frost chose to walk among mortals when the timelines cracked.',
    themeColor: '#87CEEB',
    icon: 'I',
  },
  // --- Lightning Characters ---
  {
    id: 'volt',
    name: 'Volt',
    title: 'The Storm Dancer',
    element: 'lightning',
    role: 'dps',
    rarity: 'epic',
    baseStats: { hp: 750, atk: 88, def: 40, spd: 90, critRate: 20, critDmg: 160, elementalMastery: 35, energy: 0, maxEnergy: 80 },
    growthRates: { hp: 10, atk: 3.2, def: 1.2, spd: 0.8, elementalMastery: 0.6 },
    abilities: [
      {
        id: 'volt_strike', name: 'Thunder Strike', description: 'A lightning-fast blade combo',
        element: 'lightning', cooldown: 0, cost: 0, basePower: 100, target: 'single',
        rhythmComboThreshold: 3, rhythmBonusMultiplier: 1.8,
      },
      {
        id: 'volt_chain', name: 'Chain Lightning', description: 'Electricity arcs between all enemies',
        element: 'lightning', cooldown: 2, cost: 25, basePower: 90, target: 'aoe',
        effects: [{ status: 'shock', chance: 0.5, duration: 2 }],
      },
    ],
    ultimate: {
      id: 'volt_ult', name: 'Tempest Requiem', description: 'Channel a cataclysmic thunderstorm',
      element: 'lightning', energyCost: 80, basePower: 450, target: 'all_enemies',
      effects: [{ status: 'shock', chance: 0.9, duration: 3 }],
      animationTier: 3,
    },
    passive: 'Every 3rd hit on the same target is a guaranteed critical',
    comboPartners: ['ignis', 'luna'],
    lore: 'Born from a temporal lightning strike, Volt exists between moments, faster than time itself.',
    themeColor: '#FFD700',
    icon: 'L',
  },
  // --- Wind Characters ---
  {
    id: 'zephyr',
    name: 'Zephyr',
    title: 'The Gale Strider',
    element: 'wind',
    role: 'utility',
    rarity: 'rare',
    baseStats: { hp: 850, atk: 70, def: 50, spd: 85, critRate: 12, critDmg: 130, elementalMastery: 60, energy: 0, maxEnergy: 85 },
    growthRates: { hp: 11, atk: 2.5, def: 1.8, spd: 0.7, elementalMastery: 1.0 },
    abilities: [
      {
        id: 'zephyr_gust', name: 'Cutting Gust', description: 'A razor-sharp wind blade',
        element: 'wind', cooldown: 0, cost: 0, basePower: 95, target: 'single',
        rhythmComboThreshold: 4, rhythmBonusMultiplier: 1.3,
      },
      {
        id: 'zephyr_vortex', name: 'Elemental Vortex', description: 'Create a swirling vortex that absorbs and spreads elements',
        element: 'wind', cooldown: 3, cost: 35, basePower: 110, target: 'aoe',
        effects: [{ status: 'haste', chance: 0.5, duration: 2 }],
      },
    ],
    ultimate: {
      id: 'zephyr_ult', name: 'Cyclone Genesis', description: 'Summon a massive cyclone that pulls in all enemies',
      element: 'wind', energyCost: 85, basePower: 280, target: 'all_enemies',
      effects: [{ status: 'stun', chance: 0.4, duration: 1 }],
      animationTier: 2,
    },
    passive: 'Movement speed +20%. Exploration stamina cost -15%.',
    comboPartners: ['ignis', 'luna', 'volt'],
    lore: 'A wandering bard who plays melodies that bend the wind to his will.',
    themeColor: '#98FB98',
    icon: 'N',
  },
  // --- Earth Characters ---
  {
    id: 'terra',
    name: 'Terra',
    title: 'The Stone Sovereign',
    element: 'earth',
    role: 'tank',
    rarity: 'epic',
    baseStats: { hp: 1400, atk: 50, def: 90, spd: 40, critRate: 5, critDmg: 100, elementalMastery: 45, energy: 0, maxEnergy: 120 },
    growthRates: { hp: 20, atk: 1.2, def: 3.5, spd: 0.2, elementalMastery: 0.7 },
    abilities: [
      {
        id: 'terra_quake', name: 'Tremor Strike', description: 'Slam the ground, sending shockwaves',
        element: 'earth', cooldown: 1, cost: 15, basePower: 140, target: 'aoe',
        effects: [{ status: 'stun', chance: 0.2, duration: 1 }],
      },
      {
        id: 'terra_wall', name: 'Stone Fortress', description: 'Erect a massive wall of stone',
        element: 'earth', cooldown: 4, cost: 40, basePower: 0, target: 'all_allies',
        effects: [{ status: 'shield', chance: 1.0, duration: 4 }, { status: 'def_up', chance: 1.0, duration: 3 }],
      },
    ],
    ultimate: {
      id: 'terra_ult', name: 'Continental Crush', description: 'Summon a mountain to crush all enemies',
      element: 'earth', energyCost: 120, basePower: 400, target: 'all_enemies',
      effects: [{ status: 'stun', chance: 0.6, duration: 2 }],
      animationTier: 3,
    },
    passive: 'When an ally takes fatal damage, Terra absorbs 50% of it (once per combat)',
    comboPartners: ['frost', 'ignis'],
    lore: 'An ancient golem awakened by the temporal fractures, seeking to mend the broken earth.',
    themeColor: '#8B4513',
    icon: 'E',
  },
  // --- Light Characters ---
  {
    id: 'solara',
    name: 'Solara',
    title: 'The Dawn Bringer',
    element: 'light',
    role: 'support',
    rarity: 'legendary',
    baseStats: { hp: 950, atk: 75, def: 60, spd: 70, critRate: 12, critDmg: 130, elementalMastery: 70, energy: 0, maxEnergy: 95 },
    growthRates: { hp: 13, atk: 2.5, def: 2.0, spd: 0.5, elementalMastery: 1.1 },
    abilities: [
      {
        id: 'solara_ray', name: 'Radiant Beam', description: 'A focused beam of pure light',
        element: 'light', cooldown: 0, cost: 0, basePower: 110, target: 'single',
        rhythmComboThreshold: 6, rhythmBonusMultiplier: 1.6,
      },
      {
        id: 'solara_sanctum', name: 'Holy Sanctum', description: 'Create a zone of healing light',
        element: 'light', cooldown: 3, cost: 35, basePower: 200, target: 'all_allies',
        effects: [{ status: 'regen', chance: 1.0, duration: 3 }, { status: 'atk_up', chance: 0.5, duration: 2 }],
      },
    ],
    ultimate: {
      id: 'solara_ult', name: 'Eternal Radiance', description: 'Unleash the power of the sun itself',
      element: 'light', energyCost: 95, basePower: 400, target: 'field',
      effects: [{ status: 'regen', chance: 1.0, duration: 5 }, { status: 'atk_up', chance: 1.0, duration: 3 }],
      animationTier: 3,
    },
    passive: 'Healing abilities also remove 1 debuff from the target',
    comboPartners: ['nyx', 'luna'],
    lore: 'The last priestess of the Temple of Eternity, channeling the dawn to push back the void.',
    themeColor: '#FFFFF0',
    icon: 'S',
  },
  // --- Dark Characters ---
  {
    id: 'nyx',
    name: 'Nyx',
    title: 'The Shadow Reaper',
    element: 'dark',
    role: 'dps',
    rarity: 'legendary',
    baseStats: { hp: 700, atk: 100, def: 35, spd: 80, critRate: 25, critDmg: 180, elementalMastery: 50, energy: 0, maxEnergy: 75 },
    growthRates: { hp: 9, atk: 4.0, def: 1.0, spd: 0.6, elementalMastery: 0.8 },
    abilities: [
      {
        id: 'nyx_reap', name: 'Soul Reap', description: 'A devastating scythe swing that drains life',
        element: 'dark', cooldown: 0, cost: 0, basePower: 130, target: 'single',
        effects: [{ status: 'bleed', chance: 0.4, duration: 2 }],
        rhythmComboThreshold: 4, rhythmBonusMultiplier: 2.0,
      },
      {
        id: 'nyx_void', name: 'Abyssal Pull', description: 'Drag enemies into the void',
        element: 'dark', cooldown: 3, cost: 30, basePower: 180, target: 'aoe',
        effects: [{ status: 'silence', chance: 0.4, duration: 2 }],
      },
    ],
    ultimate: {
      id: 'nyx_ult', name: 'Midnight Requiem', description: 'Cloak the battlefield in absolute darkness',
      element: 'dark', energyCost: 75, basePower: 550, target: 'all_enemies',
      effects: [{ status: 'bleed', chance: 0.8, duration: 3 }],
      animationTier: 3,
    },
    passive: 'Critical hits restore 10% of damage dealt as HP',
    comboPartners: ['solara', 'volt'],
    lore: 'A phantom assassin from the void between timelines, hunting those who threaten the multiverse.',
    themeColor: '#4B0082',
    icon: 'D',
  },
  // --- Void Characters ---
  {
    id: 'echo',
    name: 'Echo',
    title: 'The Timeless One',
    element: 'void',
    role: 'utility',
    rarity: 'mythic',
    baseStats: { hp: 1000, atk: 85, def: 65, spd: 75, critRate: 18, critDmg: 150, elementalMastery: 100, energy: 0, maxEnergy: 100 },
    growthRates: { hp: 15, atk: 3.0, def: 2.0, spd: 0.6, elementalMastery: 1.5 },
    abilities: [
      {
        id: 'echo_rift', name: 'Temporal Rift', description: 'Tear a rift in spacetime',
        element: 'void', cooldown: 2, cost: 20, basePower: 160, target: 'single',
        effects: [{ status: 'stun', chance: 0.3, duration: 1 }],
        rhythmComboThreshold: 7, rhythmBonusMultiplier: 2.5,
      },
      {
        id: 'echo_rewind', name: 'Chrono Rewind', description: 'Rewind time to restore an ally',
        element: 'void', cooldown: 5, cost: 50, basePower: 300, target: 'ally',
        effects: [{ status: 'regen', chance: 1.0, duration: 3 }, { status: 'haste', chance: 1.0, duration: 2 }],
      },
    ],
    ultimate: {
      id: 'echo_ult', name: 'Echoes of Eternity', description: 'Shatter the boundaries of time — reset all cooldowns and fully heal the party',
      element: 'void', energyCost: 100, basePower: 600, target: 'field',
      effects: [{ status: 'elemental_surge', chance: 1.0, duration: 5 }],
      animationTier: 3,
    },
    passive: 'Once per combat, automatically revive with 30% HP when defeated',
    comboPartners: ['ignis', 'luna', 'nyx', 'solara'],
    lore: 'The protagonist — a being born from the echoes of every timeline, destined to save the multiverse from collapse.',
    themeColor: '#8A2BE2',
    icon: 'V',
  },
];

// === Starter Party ===

export const STARTER_CHARACTER_IDS = ['echo', 'zephyr', 'frost'];

// === Gacha System ===

export const DEFAULT_BANNERS: GachaBanner[] = [
  {
    id: 'standard',
    name: 'Eternal Echoes',
    type: 'standard',
    featuredCharacters: [],
    featuredEquipment: [],
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2099-12-31T23:59:59Z',
    hardPity: ECHOES_CONFIG.HARD_PITY,
    softPity: ECHOES_CONFIG.SOFT_PITY_START,
    baseRate: ECHOES_CONFIG.BASE_5STAR_RATE,
  },
  {
    id: 'featured_ignis',
    name: 'Flames of Eternity',
    type: 'featured',
    featuredCharacters: ['ignis'],
    featuredEquipment: [],
    startDate: '2026-02-01T00:00:00Z',
    endDate: '2026-03-01T23:59:59Z',
    hardPity: ECHOES_CONFIG.HARD_PITY,
    softPity: ECHOES_CONFIG.SOFT_PITY_START,
    baseRate: ECHOES_CONFIG.BASE_5STAR_RATE,
  },
  {
    id: 'featured_nyx',
    name: 'Midnight Requiem',
    type: 'featured',
    featuredCharacters: ['nyx'],
    featuredEquipment: [],
    startDate: '2026-02-15T00:00:00Z',
    endDate: '2026-03-15T23:59:59Z',
    hardPity: ECHOES_CONFIG.HARD_PITY,
    softPity: ECHOES_CONFIG.SOFT_PITY_START,
    baseRate: ECHOES_CONFIG.BASE_5STAR_RATE,
  },
];

/**
 * Perform a single gacha pull.
 */
export function performGachaPull(banner: GachaBanner, state: GachaState): GachaPull {
  const pity = state.pityCounter[banner.id] || 0;
  const rarity = determineRarity(pity, banner);

  let characterId: string | undefined;

  if (rarity === 'legendary' || rarity === 'mythic') {
    // Rate-up: 50% chance for featured character
    if (banner.featuredCharacters.length > 0 && Math.random() < 0.5) {
      characterId = banner.featuredCharacters[Math.floor(Math.random() * banner.featuredCharacters.length)];
    } else {
      const pool = CHARACTERS.filter(c => c.rarity === rarity || c.rarity === 'legendary');
      characterId = pool[Math.floor(Math.random() * pool.length)]?.id;
    }
  } else {
    const pool = CHARACTERS.filter(c => {
      if (rarity === 'epic') return c.rarity === 'epic';
      if (rarity === 'rare') return c.rarity === 'rare';
      return c.rarity === 'common' || c.rarity === 'rare';
    });
    if (pool.length > 0) {
      characterId = pool[Math.floor(Math.random() * pool.length)].id;
    }
  }

  return {
    bannerId: banner.id,
    characterId,
    rarity,
    timestamp: Date.now(),
    wasPity: pity >= banner.hardPity - 1,
  };
}

function determineRarity(pity: number, banner: GachaBanner): Rarity {
  // Hard pity
  if (pity >= banner.hardPity - 1) return 'legendary';

  // Soft pity: increasing rates
  let rate = banner.baseRate;
  if (pity >= banner.softPity) {
    rate += (pity - banner.softPity + 1) * ECHOES_CONFIG.SOFT_PITY_RATE_INCREASE;
  }

  const roll = Math.random();

  if (roll < rate) return 'legendary';
  if (roll < rate + 0.05) return 'epic';
  if (roll < rate + 0.05 + 0.15) return 'rare';
  return 'common';
}

/**
 * Get character by ID.
 */
export function getCharacter(id: string): Character | undefined {
  return CHARACTERS.find(c => c.id === id);
}

/**
 * Calculate stats for a character at a given level.
 */
export function calculateCharacterStats(character: Character, level: number): CharacterStats {
  const base = character.baseStats;
  const growth = character.growthRates;

  return {
    hp: Math.round(base.hp + (growth.hp || 0) * (level - 1)),
    atk: Math.round(base.atk + (growth.atk || 0) * (level - 1)),
    def: Math.round(base.def + (growth.def || 0) * (level - 1)),
    spd: Math.round(base.spd + (growth.spd || 0) * (level - 1)),
    critRate: base.critRate + (growth.critRate || 0) * (level - 1),
    critDmg: base.critDmg + (growth.critDmg || 0) * (level - 1),
    elementalMastery: Math.round(base.elementalMastery + (growth.elementalMastery || 0) * (level - 1)),
    energy: 0,
    maxEnergy: base.maxEnergy,
  };
}

/**
 * Create default owned character state.
 */
export function createOwnedCharacter(characterId: string): OwnedCharacter {
  return {
    characterId,
    level: 1,
    experience: 0,
    constellation: 0,
    equipment: { weapon: null, armor: null, accessory: null, rune: null },
    abilityLevels: {},
  };
}

/**
 * Experience needed to level up.
 */
export function experienceForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

/**
 * Get all characters of a given element.
 */
export function getCharactersByElement(element: string): Character[] {
  return CHARACTERS.filter(c => c.element === element);
}

/**
 * Get all characters of a given role.
 */
export function getCharactersByRole(role: string): Character[] {
  return CHARACTERS.filter(c => c.role === role);
}
