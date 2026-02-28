// =============================================================================
// ECHOES OF ETERNITY — Public API
// =============================================================================

// Core systems
export { ELEMENTAL_REACTIONS, canReact, getReactions, resolveBestReaction, calculateReactionDamage, getReactionStatus, hasElementAdvantage, getElementDamageModifier, ELEMENT_COLORS, ELEMENT_ICONS, ELEMENT_NAMES_JA, createFieldElement, isInFieldElement, getFieldElementsAtPosition } from './elements';
export { calculateDamage, applyStatusEffect, processStatusEffects, getStatusStatModifiers, applyStatModifiers, canAct, canUseSkills, updateComboChain, resetComboChain, calculateTurnOrder, generateRhythmSequence, getRhythmDamageMultiplier, scoreRhythmResult, createBattleState, advanceBattlePhase, processEndOfTurn, generateLoot, calculateBattleEndStats, determineEnemyAction, expForLevel, awardExperience, distance, isInRange, getTargetsInAoE } from './combat';
export { CHARACTER_DEFINITIONS, getCharacterDefinition, getAllCharacters, getCharactersByElement, getCharactersByRole, getCharactersByRarity, createCharacterInstance, calculateStatsForLevel, applyConstellation, analyzeParty } from './characters';
export { GAME_MODE_CONFIGS, getAvailableGameModes, isGameModeUnlocked } from './game-modes';
export { STANDARD_BANNER, createLimitedBanner, performPull, createInitialGachaState, getPityInfo, createBattlePassSeason, generateRandomLoot, calculateGoldReward, calculateExpReward } from './gacha';
export { generateDungeonFloor, WORLD_REGIONS, DUNGEON_PRESETS, revealTiles, isWalkable, calculateDungeonStats, getRegionById, getDungeonPreset, getRegionsForLevel } from './dungeons';
export { ECHOES_ADVANCEMENTS, checkAdvancements, getAdvancementsByCategory, getAdvancementProgress, calculateAchievementScore } from './advancements';
export { EchoesManager, isEchoesMessage } from './EchoesManager';

// Re-export core types
export type {
  Element, ElementalReactionType, ElementalReaction,
  StatusEffectType, StatusEffect,
  CharacterRole, CharacterRarity, CharacterDefinition, CharacterInstance, CharacterStats, CharacterSkill,
  WeaponType, WeaponDefinition, WeaponInstance, ArtifactSlot, ArtifactDefinition, ArtifactSetBonus, ArtifactSet,
  ResourceCategory, ResourceDefinition, CraftingRecipe, InventoryItem, PlayerInventory,
  BattlePhase, CombatResultType, DamageInstance, RhythmSequence, RhythmNote, RhythmJudgement, RhythmResult, RhythmDifficulty,
  BattleState, EnemyInstance, FieldElement, ComboChain, BattleLogEntry, BattleEnvironment, TerrainType, WeatherType, LootEntry,
  BiomeType, WorldRegion, SubRegion, DungeonDefinition, DungeonFloor, DungeonDifficulty, DungeonReward, DungeonStats,
  GachaBanner, GachaPullResult, PlayerGachaState, BattlePassSeason, BattlePassReward, SeasonMission,
  GameMode, GameModeConfig, PlayerRank, PlayerProgression, EchoesPlayerStats,
  BuildBlockType, BuildBlock, Blueprint, BuildingState,
  BattleRoyaleState, MobaState,
  PartyMember, Party,
  EchoesClientMessage, EchoesServerMessage, EchoesConnectionStatus, EchoesRoom, EchoesRoomPlayer,
  BattleEndStats, MobaEndStats,
  Position2D, Position3D, ItemRarity,
} from '@/types/echoes';
