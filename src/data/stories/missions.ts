import type { Chapter } from './chapters';
import { CHAPTERS } from './chapters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MissionDifficulty = 'default' | 'adventure' | 'apocalypse';

export interface MissionReward {
    type: 'item' | 'advancement' | 'xp';
    id: string;
    nameKey: string; // i18n key under dungeonMap.rewards
}

export interface MapMission {
    /** Unique mission id */
    id: string;
    /** i18n key for the mission name (under dungeonMap.missions) */
    nameKey: string;
    /** i18n key for a short description */
    descKey: string;
    /** Which chapter data to load when this mission is played */
    chapterId: string;
    /** Position on the map (0-100 percentage coords) */
    x: number;
    y: number;
    /** IDs of missions that must be completed before this one unlocks */
    requires: string[];
    /** Visual icon type for the map node */
    icon: 'forest' | 'village' | 'dungeon' | 'castle' | 'boss' | 'camp';
    /** Accent color for the node glow */
    accent: string;
    /** Whether this is a boss mission */
    isBoss?: boolean;
    /** Available difficulty levels */
    difficulties: MissionDifficulty[];
    /** Recommended power level per difficulty */
    powerLevels: Record<MissionDifficulty, number>;
    /** Rewards listed in the mission detail panel */
    rewards: MissionReward[];
}

export interface MapPath {
    from: string;
    to: string;
}

export interface DungeonMapData {
    id: string;
    nameKey: string;
    missions: MapMission[];
    paths: MapPath[];
}

// ---------------------------------------------------------------------------
// Helper: resolve chapter data for a mission
// ---------------------------------------------------------------------------

export function getChapterForMission(mission: MapMission): Chapter | undefined {
    return CHAPTERS.find((c) => c.id === mission.chapterId);
}

// ---------------------------------------------------------------------------
// Map Data — Rhythmia World Map
// ---------------------------------------------------------------------------

export const DUNGEON_MAP: DungeonMapData = {
    id: 'rhythmia-overworld',
    nameKey: 'mapName',
    missions: [
        {
            id: 'camp',
            nameKey: 'camp',
            descKey: 'campDesc',
            chapterId: 'awakening',
            x: 15,
            y: 75,
            requires: [],
            icon: 'camp',
            accent: '#4CAF50',
            difficulties: ['default'],
            powerLevels: { default: 0, adventure: 0, apocalypse: 0 },
            rewards: [],
        },
        {
            id: 'creeper-woods',
            nameKey: 'creeperWoods',
            descKey: 'creeperWoodsDesc',
            chapterId: 'awakening',
            x: 30,
            y: 65,
            requires: ['camp'],
            icon: 'forest',
            accent: '#4CAF50',
            difficulties: ['default', 'adventure', 'apocalypse'],
            powerLevels: { default: 1, adventure: 25, apocalypse: 50 },
            rewards: [
                { type: 'xp', id: 'xp-100', nameKey: '100xp' },
                { type: 'item', id: 'stone-fragment', nameKey: 'stoneFragment' },
            ],
        },
        {
            id: 'soggy-swamp',
            nameKey: 'soggySwamp',
            descKey: 'soggySwampDesc',
            chapterId: 'awakening',
            x: 45,
            y: 50,
            requires: ['creeper-woods'],
            icon: 'dungeon',
            accent: '#7B8D3A',
            difficulties: ['default', 'adventure', 'apocalypse'],
            powerLevels: { default: 5, adventure: 30, apocalypse: 55 },
            rewards: [
                { type: 'xp', id: 'xp-200', nameKey: '200xp' },
                { type: 'item', id: 'iron-ore', nameKey: 'ironOre' },
            ],
        },
        {
            id: 'pumpkin-pastures',
            nameKey: 'pumpkinPastures',
            descKey: 'pumpkinPasturesDesc',
            chapterId: 'melodia',
            x: 38,
            y: 32,
            requires: ['creeper-woods'],
            icon: 'village',
            accent: '#FF9800',
            difficulties: ['default', 'adventure', 'apocalypse'],
            powerLevels: { default: 8, adventure: 33, apocalypse: 58 },
            rewards: [
                { type: 'xp', id: 'xp-250', nameKey: '250xp' },
                { type: 'item', id: 'crystal-shard', nameKey: 'crystalShard' },
            ],
        },
        {
            id: 'redstone-mines',
            nameKey: 'redstoneMines',
            descKey: 'redstoneMinesDesc',
            chapterId: 'melodia',
            x: 58,
            y: 40,
            requires: ['soggy-swamp', 'pumpkin-pastures'],
            icon: 'dungeon',
            accent: '#E53935',
            difficulties: ['default', 'adventure', 'apocalypse'],
            powerLevels: { default: 12, adventure: 37, apocalypse: 62 },
            rewards: [
                { type: 'xp', id: 'xp-300', nameKey: '300xp' },
                { type: 'item', id: 'gold-nugget', nameKey: 'goldNugget' },
            ],
        },
        {
            id: 'fiery-forge',
            nameKey: 'fieryForge',
            descKey: 'fieryForgeDesc',
            chapterId: 'melodia',
            x: 68,
            y: 55,
            requires: ['redstone-mines'],
            icon: 'dungeon',
            accent: '#FF5722',
            difficulties: ['default', 'adventure', 'apocalypse'],
            powerLevels: { default: 16, adventure: 41, apocalypse: 66 },
            rewards: [
                { type: 'xp', id: 'xp-350', nameKey: '350xp' },
                { type: 'item', id: 'obsidian-core', nameKey: 'obsidianCore' },
            ],
        },
        {
            id: 'highblock-halls',
            nameKey: 'highblockHalls',
            descKey: 'highblockHallsDesc',
            chapterId: 'crescendo',
            x: 75,
            y: 35,
            requires: ['fiery-forge'],
            icon: 'castle',
            accent: '#9C27B0',
            difficulties: ['default', 'adventure', 'apocalypse'],
            powerLevels: { default: 20, adventure: 45, apocalypse: 70 },
            rewards: [
                { type: 'xp', id: 'xp-400', nameKey: '400xp' },
                { type: 'item', id: 'star-fragment', nameKey: 'starFragment' },
            ],
        },
        {
            id: 'obsidian-pinnacle',
            nameKey: 'obsidianPinnacle',
            descKey: 'obsidianPinnacleDesc',
            chapterId: 'crescendo',
            x: 85,
            y: 20,
            requires: ['highblock-halls'],
            icon: 'boss',
            accent: '#7C4DFF',
            isBoss: true,
            difficulties: ['default', 'adventure', 'apocalypse'],
            powerLevels: { default: 25, adventure: 50, apocalypse: 75 },
            rewards: [
                { type: 'xp', id: 'xp-500', nameKey: '500xp' },
                { type: 'advancement', id: 'worlds_5', nameKey: 'worldTraveler' },
            ],
        },
    ],
    paths: [
        { from: 'camp', to: 'creeper-woods' },
        { from: 'creeper-woods', to: 'soggy-swamp' },
        { from: 'creeper-woods', to: 'pumpkin-pastures' },
        { from: 'soggy-swamp', to: 'redstone-mines' },
        { from: 'pumpkin-pastures', to: 'redstone-mines' },
        { from: 'redstone-mines', to: 'fiery-forge' },
        { from: 'fiery-forge', to: 'highblock-halls' },
        { from: 'highblock-halls', to: 'obsidian-pinnacle' },
    ],
};
