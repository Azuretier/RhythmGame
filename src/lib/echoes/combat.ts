// =============================================================
// Echoes of Eternity — Combat Engine
// Hybrid: Rhythm-based precision + Turn-based strategy
// =============================================================

import type {
  CombatState,
  CombatAction,
  CombatCharacter,
  CombatEnemy,
  HitAccuracy,
  Element,
  CharacterStats,
  EnemyPattern,
  ActiveStatusEffect,
  PuzzleCell,
  RhythmNote,
  CombatReward,
  ResourceType,
} from '@/types/echoes';
import { ECHOES_CONFIG } from '@/types/echoes';
import { getCharacter, calculateCharacterStats } from './characters';
import { findReaction, calculateReactionDamage, getReactionStatusEffect, processStatusEffects } from './elements';

// === Combat Initialization ===

export function initCombatState(
  partyCharacterIds: string[],
  partyLevels: number[],
  enemies: CombatEnemy[],
  bpm: number = 120,
): CombatState {
  const party: CombatCharacter[] = partyCharacterIds.map((id, index) => {
    const character = getCharacter(id);
    if (!character) throw new Error(`Character not found: ${id}`);

    const stats = calculateCharacterStats(character, partyLevels[index] || 1);

    return {
      characterId: id,
      currentHp: stats.hp,
      maxHp: stats.hp,
      currentEnergy: 0,
      maxEnergy: stats.maxEnergy,
      statusEffects: [],
      abilityCooldowns: {},
      position: index,
      alive: true,
    };
  });

  return {
    turn: 1,
    phase: 'rhythm_phase',
    party,
    enemies,
    fieldAuras: [],
    combo: 0,
    maxCombo: 0,
    score: 0,
    bpm,
    beatPhase: 0,
    activeReactions: [],
    puzzleBoard: createEmptyPuzzleBoard(),
    puzzleLinesCleared: 0,
  };
}

// === Damage Calculation ===

export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  basePower: number,
  critRate: number,
  critDmg: number,
  rhythmAccuracy: HitAccuracy,
  comboCount: number,
  elementalMastery: number,
  attackElement?: Element,
  defenderElement?: Element,
): { damage: number; isCrit: boolean; reactionDamage: number } {
  // Rhythm accuracy multiplier
  const rhythmMultiplier = getAccuracyMultiplier(rhythmAccuracy);

  // Combo bonus (up to +50% at 50 combo)
  const comboBonus = 1 + Math.min(comboCount * 0.01, 0.5);

  // Base damage formula
  const baseDmg = (attackerAtk * basePower / 100) * rhythmMultiplier * comboBonus;

  // Defense reduction
  const defReduction = defenderDef / (defenderDef + 200);
  const afterDef = baseDmg * (1 - defReduction);

  // Critical hit
  const isCrit = Math.random() * 100 < critRate;
  const critMultiplier = isCrit ? critDmg / 100 : 1;

  let damage = Math.round(afterDef * critMultiplier);
  let reactionDamage = 0;

  // Elemental reaction bonus
  if (attackElement && defenderElement) {
    const reaction = findReaction(attackElement, defenderElement);
    if (reaction) {
      reactionDamage = calculateReactionDamage(damage, elementalMastery, reaction) - damage;
    }
  }

  // Minimum damage of 1
  damage = Math.max(1, damage);

  return { damage, isCrit, reactionDamage: Math.max(0, reactionDamage) };
}

function getAccuracyMultiplier(accuracy: HitAccuracy): number {
  switch (accuracy) {
    case 'perfect': return 1.5;
    case 'great': return 1.2;
    case 'good': return 1.0;
    case 'miss': return 0.3;
  }
}

// === Rhythm Accuracy Check ===

export function checkRhythmAccuracy(
  inputTimeMs: number,
  noteTimeMs: number,
): HitAccuracy {
  const diff = Math.abs(inputTimeMs - noteTimeMs);

  if (diff <= ECHOES_CONFIG.PERFECT_WINDOW_MS) return 'perfect';
  if (diff <= ECHOES_CONFIG.GREAT_WINDOW_MS) return 'great';
  if (diff <= ECHOES_CONFIG.GOOD_WINDOW_MS) return 'good';
  return 'miss';
}

export function getAccuracyScore(accuracy: HitAccuracy): number {
  switch (accuracy) {
    case 'perfect': return ECHOES_CONFIG.PERFECT_SCORE;
    case 'great': return ECHOES_CONFIG.GREAT_SCORE;
    case 'good': return ECHOES_CONFIG.GOOD_SCORE;
    case 'miss': return ECHOES_CONFIG.MISS_SCORE;
  }
}

// === Combat Action Processing ===

export interface CombatActionResult {
  damage: number;
  healing: number;
  isCrit: boolean;
  reactionTriggered: boolean;
  reactionType?: string;
  reactionDamage: number;
  statusesApplied: ActiveStatusEffect[];
  targetIds: string[];
  energyGained: number;
  comboChange: number;
  scoreGained: number;
}

export function processCombatAction(
  state: CombatState,
  action: CombatAction,
): CombatActionResult {
  const character = getCharacter(action.characterId);
  if (!character) {
    return emptyResult();
  }

  const combatChar = state.party.find(p => p.characterId === action.characterId);
  if (!combatChar || !combatChar.alive) {
    return emptyResult();
  }

  const level = 1; // In full impl, get from player data
  const stats = calculateCharacterStats(character, level);

  const rhythmScore = getAccuracyScore(action.rhythmAccuracy);
  const comboChange = action.rhythmAccuracy === 'miss' ? -(state.combo) : 1;
  const newCombo = Math.max(0, state.combo + comboChange);

  let totalDamage = 0;
  let totalHealing = 0;
  let isCrit = false;
  let reactionTriggered = false;
  let reactionType: string | undefined;
  let reactionDamage = 0;
  const statusesApplied: ActiveStatusEffect[] = [];
  const targetIds: string[] = [];

  switch (action.type) {
    case 'attack': {
      // Basic attack
      const target = state.enemies[action.targetIndex || 0];
      if (target && target.currentHp > 0) {
        const result = calculateDamage(
          stats.atk, target.def, 100,
          stats.critRate, stats.critDmg,
          action.rhythmAccuracy, newCombo,
          stats.elementalMastery,
          character.element, target.element,
        );
        totalDamage = result.damage + result.reactionDamage;
        isCrit = result.isCrit;
        reactionDamage = result.reactionDamage;
        targetIds.push(target.id);

        if (result.reactionDamage > 0) {
          reactionTriggered = true;
          const reaction = findReaction(character.element, target.element);
          if (reaction) {
            reactionType = reaction.type;
            const statusEffect = getReactionStatusEffect(reaction);
            if (statusEffect) statusesApplied.push(statusEffect);
          }
        }
      }
      break;
    }

    case 'ability': {
      const ability = character.abilities.find(a => a.id === action.actionId);
      if (!ability) break;

      // Check cooldown
      const cd = combatChar.abilityCooldowns[ability.id];
      if (cd && cd > 0) break;

      // Rhythm combo bonus
      let abilityMultiplier = 1;
      if (ability.rhythmComboThreshold && ability.rhythmBonusMultiplier) {
        if (newCombo >= ability.rhythmComboThreshold) {
          abilityMultiplier = ability.rhythmBonusMultiplier;
        }
      }

      if (ability.target === 'ally' || ability.target === 'all_allies' || ability.target === 'self') {
        // Healing/buff ability
        totalHealing = Math.round(ability.basePower * (stats.atk / 100) * abilityMultiplier);
        if (ability.target === 'all_allies') {
          targetIds.push(...state.party.filter(p => p.alive).map(p => p.characterId));
        } else if (ability.target === 'self') {
          targetIds.push(action.characterId);
        } else {
          targetIds.push(state.party[action.targetIndex || 0]?.characterId || action.characterId);
        }
      } else {
        // Damage ability
        const targets = ability.target === 'aoe'
          ? state.enemies.filter(e => e.currentHp > 0)
          : [state.enemies[action.targetIndex || 0]].filter(Boolean);

        for (const target of targets) {
          if (!target || target.currentHp <= 0) continue;
          const result = calculateDamage(
            stats.atk, target.def, ability.basePower * abilityMultiplier,
            stats.critRate, stats.critDmg,
            action.rhythmAccuracy, newCombo,
            stats.elementalMastery,
            ability.element, target.element,
          );
          totalDamage += result.damage + result.reactionDamage;
          reactionDamage += result.reactionDamage;
          if (result.isCrit) isCrit = true;
          targetIds.push(target.id);

          if (result.reactionDamage > 0) {
            reactionTriggered = true;
            const reaction = findReaction(ability.element, target.element);
            if (reaction) reactionType = reaction.type;
          }
        }
      }

      // Apply status effects
      if (ability.effects) {
        for (const effect of ability.effects) {
          if (Math.random() < effect.chance) {
            statusesApplied.push({
              status: effect.status,
              duration: effect.duration,
              source: action.characterId,
            });
          }
        }
      }

      break;
    }

    case 'ultimate': {
      const ult = character.ultimate;
      if (combatChar.currentEnergy < ult.energyCost) break;

      if (ult.target === 'all_allies' || ult.target === 'field') {
        totalHealing = Math.round(ult.basePower * (stats.atk / 100));
        targetIds.push(...state.party.filter(p => p.alive).map(p => p.characterId));
      }

      if (ult.target === 'all_enemies' || ult.target === 'field' || ult.target === 'single' || ult.target === 'aoe') {
        const targets = ult.target === 'single'
          ? [state.enemies[action.targetIndex || 0]].filter(Boolean)
          : state.enemies.filter(e => e.currentHp > 0);

        for (const target of targets) {
          if (!target || target.currentHp <= 0) continue;
          const result = calculateDamage(
            stats.atk, target.def, ult.basePower,
            stats.critRate + 10, stats.critDmg + 20,
            action.rhythmAccuracy, newCombo,
            stats.elementalMastery,
            ult.element, target.element,
          );
          totalDamage += result.damage + result.reactionDamage;
          reactionDamage += result.reactionDamage;
          if (result.isCrit) isCrit = true;
          targetIds.push(target.id);

          if (result.reactionDamage > 0) {
            reactionTriggered = true;
            const reaction = findReaction(ult.element, target.element);
            if (reaction) reactionType = reaction.type;
          }
        }
      }

      if (ult.effects) {
        for (const effect of ult.effects) {
          if (Math.random() < effect.chance) {
            statusesApplied.push({
              status: effect.status,
              duration: effect.duration,
              source: action.characterId,
            });
          }
        }
      }

      break;
    }

    case 'defend': {
      // Defend action: reduce incoming damage next turn
      statusesApplied.push({
        status: 'def_up',
        duration: 1,
        source: action.characterId,
        value: 50,
      });
      targetIds.push(action.characterId);
      break;
    }
  }

  // Energy gained from actions
  const energyGained = action.type === 'attack' ? 10 : action.type === 'ability' ? 5 : 0;

  return {
    damage: totalDamage,
    healing: totalHealing,
    isCrit,
    reactionTriggered,
    reactionType,
    reactionDamage,
    statusesApplied,
    targetIds,
    energyGained,
    comboChange,
    scoreGained: rhythmScore + (totalDamage > 0 ? Math.round(totalDamage / 10) : 0),
  };
}

function emptyResult(): CombatActionResult {
  return {
    damage: 0, healing: 0, isCrit: false, reactionTriggered: false,
    reactionDamage: 0, statusesApplied: [], targetIds: [],
    energyGained: 0, comboChange: 0, scoreGained: 0,
  };
}

// === Enemy AI ===

export function processEnemyTurn(enemy: CombatEnemy, party: CombatCharacter[]): {
  action: EnemyPattern;
  targetIndices: number[];
  damage: number;
} {
  const pattern = enemy.pattern[enemy.patternIndex % enemy.pattern.length];

  const alivePlayers = party.map((p, i) => ({ ...p, index: i })).filter(p => p.alive);
  if (alivePlayers.length === 0) {
    return { action: pattern, targetIndices: [], damage: 0 };
  }

  let targetIndices: number[];

  switch (pattern.target) {
    case 'lowest_hp':
      alivePlayers.sort((a, b) => a.currentHp - b.currentHp);
      targetIndices = [alivePlayers[0].index];
      break;
    case 'highest_atk':
      targetIndices = [alivePlayers[0].index]; // Simplified
      break;
    case 'all':
      targetIndices = alivePlayers.map(p => p.index);
      break;
    case 'random':
    default:
      targetIndices = [alivePlayers[Math.floor(Math.random() * alivePlayers.length)].index];
      break;
  }

  let damage = 0;
  if (pattern.action === 'attack' || pattern.action === 'skill') {
    damage = Math.round(enemy.atk * pattern.power / 100);
  }

  return { action: pattern, targetIndices, damage };
}

// === Puzzle Board (Tetris Mini-game for Buffs) ===

function createEmptyPuzzleBoard(): (PuzzleCell | null)[][] {
  const board: (PuzzleCell | null)[][] = [];
  for (let y = 0; y < ECHOES_CONFIG.PUZZLE_BOARD_HEIGHT; y++) {
    board.push(new Array(ECHOES_CONFIG.PUZZLE_BOARD_WIDTH).fill(null));
  }
  return board;
}

export function checkPuzzleLines(board: (PuzzleCell | null)[][]): {
  clearedLines: number;
  newBoard: (PuzzleCell | null)[][];
  elements: Element[];
} {
  const clearedLines: number[] = [];
  const elements: Element[] = [];

  for (let y = 0; y < board.length; y++) {
    if (board[y].every(cell => cell !== null)) {
      clearedLines.push(y);
      // Collect elements from cleared line
      for (const cell of board[y]) {
        if (cell?.element) elements.push(cell.element);
      }
    }
  }

  if (clearedLines.length === 0) {
    return { clearedLines: 0, newBoard: board, elements: [] };
  }

  // Remove cleared lines and add empty ones at top
  const newBoard = board.filter((_, i) => !clearedLines.includes(i));
  while (newBoard.length < ECHOES_CONFIG.PUZZLE_BOARD_HEIGHT) {
    newBoard.unshift(new Array(ECHOES_CONFIG.PUZZLE_BOARD_WIDTH).fill(null));
  }

  return { clearedLines: clearedLines.length, newBoard, elements };
}

/**
 * Get buff description for puzzle lines cleared.
 */
export function getPuzzleBuff(linesCleared: number): string {
  if (linesCleared >= 4) return 'TETRIS! All party members gain ATK +50% and Crit Rate +20% for 3 turns';
  if (linesCleared === 3) return 'Triple! Party gains ATK +30% for 2 turns';
  if (linesCleared === 2) return 'Double! Party gains ATK +15% for 2 turns';
  if (linesCleared === 1) return 'Single clear! Party gains minor ATK boost';
  return '';
}

// === Rhythm Note Generation ===

export function generateRhythmNotes(bpm: number, duration: number, difficulty: number): RhythmNote[] {
  const notes: RhythmNote[] = [];
  const beatInterval = 60000 / bpm;
  const totalBeats = Math.floor((duration * 1000) / beatInterval);

  const elements: Element[] = ['fire', 'water', 'ice', 'lightning', 'wind', 'earth'];

  for (let i = 0; i < totalBeats; i++) {
    const time = i * beatInterval;
    const lane = Math.floor(Math.random() * 4);

    // Higher difficulty = more notes, more complex patterns
    const spawnChance = 0.3 + (difficulty * 0.07);
    if (Math.random() > spawnChance) continue;

    const typeRoll = Math.random();
    let type: RhythmNote['type'] = 'tap';
    if (difficulty >= 5 && typeRoll > 0.85) type = 'critical';
    else if (difficulty >= 3 && typeRoll > 0.7) type = 'hold';
    else if (difficulty >= 7 && typeRoll > 0.6) type = 'slide';

    const note: RhythmNote = {
      time: Math.round(time),
      lane,
      type,
      element: elements[Math.floor(Math.random() * elements.length)],
    };

    if (type === 'hold') {
      note.holdDuration = Math.round(beatInterval * (1 + Math.random()));
    }

    notes.push(note);
  }

  return notes.sort((a, b) => a.time - b.time);
}

// === Enemy Generation ===

export function generateEnemy(
  name: string,
  element: Element,
  level: number,
  isBoss: boolean = false,
): CombatEnemy {
  const bossMultiplier = isBoss ? 3 : 1;
  const baseHp = Math.round((200 + level * 50) * bossMultiplier);
  const baseAtk = Math.round((30 + level * 8) * bossMultiplier);
  const baseDef = Math.round((20 + level * 5) * bossMultiplier);

  const patterns: EnemyPattern[] = isBoss
    ? [
        { action: 'attack', power: 100, target: 'random' },
        { action: 'skill', element, power: 150, target: 'random', effects: [{ status: 'burn', chance: 0.5, duration: 2 }] },
        { action: 'attack', power: 120, target: 'lowest_hp' },
        { action: 'buff', power: 0, target: 'random', effects: [{ status: 'atk_up', chance: 1.0, duration: 3 }] },
        { action: 'skill', element, power: 200, target: 'all' },
      ]
    : [
        { action: 'attack', power: 100, target: 'random' },
        { action: 'attack', power: 110, target: 'random' },
        { action: 'skill', element, power: 130, target: 'random' },
      ];

  const dropTable: CombatEnemy['drops'] = [
    { type: 'gold' as ResourceType, chance: 1.0, quantity: Math.round(10 + level * 5) },
    { type: 'elemental_dust' as ResourceType, chance: 0.5, quantity: Math.round(1 + level * 0.3) },
    { type: 'soul_fragment' as ResourceType, chance: isBoss ? 0.8 : 0.1, quantity: isBoss ? 3 : 1 },
  ];

  const themeColors: Record<Element, string> = {
    fire: '#FF4500', water: '#1E90FF', ice: '#87CEEB', lightning: '#FFD700',
    wind: '#98FB98', earth: '#8B4513', light: '#FFFFF0', dark: '#4B0082', void: '#8A2BE2',
  };

  return {
    id: `enemy_${name.toLowerCase().replace(/\s/g, '_')}_${Date.now()}`,
    name,
    element,
    level,
    currentHp: baseHp,
    maxHp: baseHp,
    atk: baseAtk,
    def: baseDef,
    statusEffects: [],
    pattern: patterns,
    patternIndex: 0,
    isBoss,
    drops: dropTable,
    themeColor: themeColors[element],
    icon: element[0].toUpperCase(),
  };
}

// === Encounter Generation by Biome ===

export function generateEncounter(biome: string, level: number): CombatEnemy[] {
  const encounters: Record<string, { names: string[]; elements: Element[] }> = {
    verdant_plains: { names: ['Slime', 'Goblin', 'Wild Boar'], elements: ['earth', 'wind', 'earth'] },
    crystal_caves: { names: ['Crystal Golem', 'Cave Spider', 'Gem Bat'], elements: ['earth', 'dark', 'ice'] },
    volcanic_ridge: { names: ['Magma Elemental', 'Fire Drake', 'Ash Wraith'], elements: ['fire', 'fire', 'dark'] },
    frozen_peaks: { names: ['Frost Wolf', 'Ice Elemental', 'Snow Harpy'], elements: ['ice', 'ice', 'wind'] },
    shadow_abyss: { names: ['Shadow Fiend', 'Void Spawn', 'Dark Knight'], elements: ['dark', 'void', 'dark'] },
    sky_citadel: { names: ['Storm Eagle', 'Lightning Sprite', 'Wind Sentinel'], elements: ['wind', 'lightning', 'wind'] },
    temporal_ruins: { names: ['Time Wraith', 'Chrono Beast', 'Paradox Clone'], elements: ['void', 'void', 'lightning'] },
    void_rift: { names: ['Void Leviathan', 'Null Entity', 'Echo Fragment'], elements: ['void', 'dark', 'void'] },
  };

  const biomeData = encounters[biome] || encounters.verdant_plains;
  const count = 1 + Math.floor(Math.random() * 3);
  const enemies: CombatEnemy[] = [];

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * biomeData.names.length);
    enemies.push(generateEnemy(
      biomeData.names[idx],
      biomeData.elements[idx],
      level + Math.floor(Math.random() * 3) - 1,
    ));
  }

  return enemies;
}

// === Combat Reward Calculation ===

export function calculateCombatRewards(
  enemies: CombatEnemy[],
  score: number,
  maxCombo: number,
  victory: boolean,
): CombatReward {
  if (!victory) {
    return {
      experience: Math.round(score / 10),
      gold: 0,
      resources: [],
      equipment: [],
      seasonPassXp: 5,
      achievementsUnlocked: [],
    };
  }

  let totalExp = 0;
  let totalGold = 0;
  const resources: { type: ResourceType; quantity: number }[] = [];

  for (const enemy of enemies) {
    totalExp += enemy.level * 20 * (enemy.isBoss ? 5 : 1);

    for (const drop of enemy.drops) {
      if (Math.random() < drop.chance) {
        if (drop.type === 'gold') {
          totalGold += drop.quantity;
        } else {
          const existing = resources.find(r => r.type === drop.type as ResourceType);
          if (existing) {
            existing.quantity += drop.quantity;
          } else {
            resources.push({ type: drop.type as ResourceType, quantity: drop.quantity });
          }
        }
      }
    }
  }

  // Bonus for high score and combo
  const scoreBonusMult = 1 + score / 10000;
  const comboBonusMult = 1 + maxCombo / 100;

  return {
    experience: Math.round(totalExp * scoreBonusMult * comboBonusMult),
    gold: Math.round(totalGold * scoreBonusMult),
    resources,
    equipment: [],
    seasonPassXp: Math.round(15 + score / 1000),
    achievementsUnlocked: [],
  };
}
