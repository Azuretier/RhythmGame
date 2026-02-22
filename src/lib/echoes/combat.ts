// =============================================================================
// ECHOES OF ETERNITY — Combat Engine
// 戦闘エンジン (ハイブリッド: ターン制 + リズム + アクション)
// =============================================================================

import type {
  BattleState,
  BattlePhase,
  CharacterInstance,
  EnemyInstance,
  CharacterSkill,
  DamageInstance,
  CombatResultType,
  StatusEffect,
  StatusEffectType,
  RhythmResult,
  RhythmSequence,
  RhythmNote,
  RhythmDifficulty,
  ComboChain,
  FieldElement,
  Element,
  Position2D,
  BattleLogEntry,
  BattleEndStats,
  LootEntry,
  DungeonReward,
  BattleEnvironment,
  EOE_CONFIG,
} from '@/types/echoes';
import {
  resolveBestReaction,
  calculateReactionDamage,
  getReactionStatus,
  getElementDamageModifier,
  createFieldElement,
  getFieldElementsAtPosition,
  ELEMENTAL_REACTIONS,
} from './elements';

// ---------------------------------------------------------------------------
// Combat Damage Calculation
// ---------------------------------------------------------------------------

export interface DamageCalcInput {
  attackerStats: CharacterInstance['stats'];
  defenderStats: CharacterInstance['stats'] | EnemyInstance['stats'];
  skill: CharacterSkill;
  rhythmResult: RhythmResult | null;
  comboCount: number;
  attackerElement: Element;
  defenderElement: Element;
  attackerLevel: number;
  fieldElements: Element[];
  isCritOverride?: boolean;
}

export function calculateDamage(input: DamageCalcInput): Omit<DamageInstance, 'sourceId' | 'targetId'> {
  const {
    attackerStats,
    defenderStats,
    skill,
    rhythmResult,
    comboCount,
    attackerElement,
    defenderElement,
    attackerLevel,
    fieldElements,
    isCritOverride,
  } = input;

  // Base damage: ATK * skill multiplier
  let baseDamage = attackerStats.atk * skill.damageMultiplier;

  // Rhythm bonus
  let rhythmBonus = 1.0;
  if (rhythmResult) {
    rhythmBonus = rhythmResult.damageMultiplier;
  }

  // Combo bonus: diminishing returns, capped at 3x
  const comboBonus = Math.min(3.0, 1.0 + comboCount * 0.05);

  // Elemental advantage/resistance
  const elementModifier = getElementDamageModifier(attackerElement, defenderElement);

  // Defense calculation: DEF reduces damage with diminishing returns
  const defReduction = defenderStats.def / (defenderStats.def + 500 + attackerLevel * 10);
  const defMultiplier = 1 - defReduction;

  // Critical hit check
  let isCritical = isCritOverride ?? false;
  let critMultiplier = 1.0;
  if (!isCritOverride) {
    const critRoll = Math.random();
    if (critRoll < attackerStats.critRate) {
      isCritical = true;
    }
  }
  if (isCritical) {
    critMultiplier = attackerStats.critDamage;
  }

  // Accuracy/evasion check
  let resultType: CombatResultType = 'hit';
  const hitChance = attackerStats.accuracy - defenderStats.evasion * 0.5;
  const hitRoll = Math.random();
  if (hitRoll > hitChance) {
    resultType = 'evaded';
    return {
      baseDamage: 0,
      element: attackerElement,
      resultType,
      finalDamage: 0,
      rhythmBonus,
      comboBonus,
      statusEffectsApplied: [],
      isCritical: false,
      overkill: false,
    };
  }

  // Calculate final damage
  let finalDamage = Math.floor(
    baseDamage * rhythmBonus * comboBonus * elementModifier * defMultiplier * critMultiplier
  );

  // Perfect rhythm + critical = Perfect Critical
  if (isCritical && rhythmResult && rhythmResult.accuracy >= 0.95) {
    resultType = 'perfect_critical';
    finalDamage = Math.floor(finalDamage * 1.5); // Extra 50% on perfect crits
  } else if (isCritical) {
    resultType = 'critical';
  }

  // Elemental reaction check
  let reactionTriggered: DamageInstance['reactionTriggered'];
  let reactionDamage: number | undefined;

  const reaction = resolveBestReaction(attackerElement, defenderElement, fieldElements);
  if (reaction) {
    reactionTriggered = reaction;
    reactionDamage = calculateReactionDamage(
      reaction,
      baseDamage,
      attackerStats.elementalMastery,
      attackerLevel
    );
    finalDamage += reactionDamage;
  }

  // Apply status effects from skill
  const statusEffectsApplied: StatusEffect[] = [];
  if (skill.statusEffects) {
    for (const se of skill.statusEffects) {
      if (Math.random() < se.chance) {
        statusEffectsApplied.push({
          type: se.type,
          stacks: 1,
          maxStacks: 3,
          duration: se.duration,
          sourcePlayerId: '', // filled by caller
          value: se.value,
        });
      }
    }
  }

  // Add reaction status effect
  if (reaction) {
    const reactionStatus = getReactionStatus(reaction, attackerStats.elementalMastery);
    if (reactionStatus) {
      statusEffectsApplied.push({
        type: reactionStatus.type,
        stacks: 1,
        maxStacks: 3,
        duration: reactionStatus.duration,
        sourcePlayerId: '',
        value: reactionStatus.value,
      });
    }
  }

  // Ensure minimum 1 damage if not evaded
  finalDamage = Math.max(1, finalDamage);

  return {
    baseDamage: Math.floor(baseDamage),
    element: attackerElement,
    resultType,
    finalDamage,
    rhythmBonus,
    comboBonus,
    reactionTriggered,
    reactionDamage,
    statusEffectsApplied,
    isCritical,
    overkill: false, // determined by caller
  };
}

// ---------------------------------------------------------------------------
// Status Effect Processing
// ---------------------------------------------------------------------------

/**
 * Apply a status effect to a target, handling stacking
 */
export function applyStatusEffect(
  existing: StatusEffect[],
  newEffect: StatusEffect
): StatusEffect[] {
  const updated = [...existing];
  const existingIdx = updated.findIndex((e) => e.type === newEffect.type);

  if (existingIdx >= 0) {
    const current = updated[existingIdx];
    if (current.stacks < current.maxStacks) {
      // Stack the effect
      updated[existingIdx] = {
        ...current,
        stacks: current.stacks + 1,
        duration: Math.max(current.duration, newEffect.duration), // refresh duration
        value: current.value + newEffect.value * 0.5, // diminishing stacking
      };
    } else {
      // At max stacks, just refresh duration
      updated[existingIdx] = {
        ...current,
        duration: Math.max(current.duration, newEffect.duration),
      };
    }
  } else {
    updated.push(newEffect);
  }

  return updated;
}

/**
 * Process status effects at end of turn (DoT, duration reduction)
 */
export function processStatusEffects(
  target: { stats: CharacterInstance['stats']; statusEffects: StatusEffect[]; isAlive: boolean },
  turn: number
): { damage: number; healing: number; expiredEffects: StatusEffectType[] } {
  let damage = 0;
  let healing = 0;
  const expiredEffects: StatusEffectType[] = [];
  const updatedEffects: StatusEffect[] = [];

  for (const effect of target.statusEffects) {
    const remaining = { ...effect, duration: effect.duration - 1 };

    // Process DoT/HoT effects
    switch (effect.type) {
      case 'burn':
        damage += Math.floor(target.stats.maxHp * effect.value * effect.stacks);
        break;
      case 'poison':
        damage += Math.floor(target.stats.maxHp * 0.03 * effect.stacks);
        break;
      case 'bleed':
        damage += Math.floor(target.stats.maxHp * 0.02 * effect.stacks);
        break;
      case 'corrupt':
        damage += Math.floor(target.stats.maxHp * effect.value * effect.stacks);
        break;
      case 'shock':
        if (turn % 2 === 0) {
          damage += Math.floor(target.stats.maxHp * 0.05 * effect.stacks);
        }
        break;
      case 'regen':
        healing += Math.floor(target.stats.maxHp * effect.value * effect.stacks);
        break;
    }

    if (remaining.duration <= 0) {
      expiredEffects.push(effect.type);
    } else {
      updatedEffects.push(remaining);
    }
  }

  target.statusEffects = updatedEffects;
  return { damage, healing, expiredEffects };
}

/**
 * Get stat modifiers from active status effects
 */
export function getStatusStatModifiers(effects: StatusEffect[]): Partial<CharacterInstance['stats']> {
  const mods: Partial<CharacterInstance['stats']> = {};

  for (const effect of effects) {
    switch (effect.type) {
      case 'def_down':
        mods.def = (mods.def ?? 0) - effect.value * effect.stacks;
        break;
      case 'atk_down':
        mods.atk = (mods.atk ?? 0) - effect.value * effect.stacks;
        break;
      case 'speed_down':
      case 'slow':
        mods.speed = (mods.speed ?? 0) - effect.value * effect.stacks;
        break;
      case 'atk_up':
        mods.atk = (mods.atk ?? 0) + effect.value * effect.stacks;
        break;
      case 'def_up':
        mods.def = (mods.def ?? 0) + effect.value * effect.stacks;
        break;
      case 'speed_up':
        mods.speed = (mods.speed ?? 0) + effect.value * effect.stacks;
        break;
      case 'crit_up':
        mods.critRate = (mods.critRate ?? 0) + effect.value * effect.stacks;
        break;
      case 'blind':
        mods.accuracy = (mods.accuracy ?? 0) - effect.value * effect.stacks;
        break;
    }
  }

  return mods;
}

/**
 * Apply stat modifiers to base stats
 */
export function applyStatModifiers(
  base: CharacterInstance['stats'],
  mods: Partial<CharacterInstance['stats']>
): CharacterInstance['stats'] {
  const result = { ...base };
  for (const [key, value] of Object.entries(mods)) {
    const k = key as keyof CharacterInstance['stats'];
    if (typeof result[k] === 'number' && typeof value === 'number') {
      (result as Record<string, number>)[k] = Math.max(0, (result[k] as number) + value);
    }
  }
  // Clamp rates
  result.critRate = Math.min(1, Math.max(0, result.critRate));
  result.accuracy = Math.min(1, Math.max(0, result.accuracy));
  result.evasion = Math.min(1, Math.max(0, result.evasion));
  return result;
}

/**
 * Check if target can act (not stunned/frozen/silenced)
 */
export function canAct(effects: StatusEffect[]): { canAct: boolean; reason?: string } {
  for (const effect of effects) {
    if (effect.type === 'stun') return { canAct: false, reason: 'Stunned' };
    if (effect.type === 'freeze') return { canAct: false, reason: 'Frozen' };
  }
  return { canAct: true };
}

export function canUseSkills(effects: StatusEffect[]): boolean {
  return !effects.some((e) => e.type === 'silence');
}

// ---------------------------------------------------------------------------
// Combo System
// ---------------------------------------------------------------------------

/**
 * Update combo chain after a successful hit
 */
export function updateComboChain(
  chain: ComboChain,
  element: Element,
  damage: number,
  actorId: string
): ComboChain {
  const newHits = chain.isActive ? chain.hits + 1 : 1;
  const newElements = chain.isActive ? [...chain.elements, element] : [element];

  // Unique elements bonus: more variety = higher multiplier
  const uniqueElements = new Set(newElements).size;
  const elementBonus = 1 + (uniqueElements - 1) * 0.1;

  // Combo multiplier increases with hits
  const comboMultiplier = Math.min(3.0, 1 + newHits * 0.05) * elementBonus;

  return {
    hits: newHits,
    elements: newElements,
    damage: chain.damage + damage,
    lastActorId: actorId,
    multiplier: comboMultiplier,
    isActive: true,
  };
}

/**
 * Reset combo chain
 */
export function resetComboChain(): ComboChain {
  return {
    hits: 0,
    elements: [],
    damage: 0,
    lastActorId: '',
    multiplier: 1.0,
    isActive: false,
  };
}

// ---------------------------------------------------------------------------
// Turn Order Calculation
// ---------------------------------------------------------------------------

/**
 * Determine turn order based on speed stats
 */
export function calculateTurnOrder(
  party: CharacterInstance[],
  enemies: EnemyInstance[]
): string[] {
  const allActors: { id: string; speed: number }[] = [];

  for (const char of party) {
    if (!char.isAlive) continue;
    const mods = getStatusStatModifiers(char.statusEffects);
    const effectiveSpeed = Math.max(0, char.stats.speed + (mods.speed ?? 0));
    allActors.push({ id: char.definitionId, speed: effectiveSpeed });
  }

  for (const enemy of enemies) {
    if (!enemy.isAlive) continue;
    const mods = getStatusStatModifiers(enemy.statusEffects);
    const effectiveSpeed = Math.max(0, enemy.stats.speed + (mods.speed ?? 0));
    allActors.push({ id: enemy.id, speed: effectiveSpeed });
  }

  // Sort by speed descending, with random tiebreaker
  allActors.sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed;
    return Math.random() - 0.5;
  });

  return allActors.map((a) => a.id);
}

// ---------------------------------------------------------------------------
// Rhythm Sequence Generation
// ---------------------------------------------------------------------------

/**
 * Generate a rhythm sequence for a skill
 */
export function generateRhythmSequence(
  difficulty: RhythmDifficulty,
  bpm: number = 120,
  durationMs: number = 4000
): RhythmSequence {
  const notes: RhythmNote[] = [];
  const beatInterval = 60000 / bpm; // ms per beat

  // Note density based on difficulty
  const densityMap: Record<RhythmDifficulty, number> = {
    easy: 0.5,     // every other beat
    normal: 1.0,   // every beat
    hard: 1.5,     // some beats have multiple notes
    expert: 2.0,   // double density
    master: 3.0,   // triple density
  };

  const density = densityMap[difficulty];
  const totalBeats = Math.floor(durationMs / beatInterval);
  const noteCount = Math.floor(totalBeats * density);

  // Window sizes based on difficulty
  const windowMap: Record<RhythmDifficulty, { perfect: number; great: number; good: number }> = {
    easy: { perfect: 80, great: 160, good: 300 },
    normal: { perfect: 60, great: 120, good: 240 },
    hard: { perfect: 50, great: 100, good: 200 },
    expert: { perfect: 40, great: 80, good: 160 },
    master: { perfect: 30, great: 60, good: 120 },
  };

  const windows = windowMap[difficulty];

  // Generate notes
  for (let i = 0; i < noteCount; i++) {
    const time = (i / noteCount) * durationMs;
    const lane = Math.floor(Math.random() * 4);

    // Mix note types based on difficulty
    let type: RhythmNote['type'] = 'tap';
    if (difficulty !== 'easy') {
      const typeRoll = Math.random();
      if (typeRoll < 0.1 && difficulty !== 'normal') {
        type = 'flick';
      } else if (typeRoll < 0.2) {
        type = 'hold';
      } else if (typeRoll < 0.25 && (difficulty === 'expert' || difficulty === 'master')) {
        type = 'slide';
      }
    }

    const note: RhythmNote = { time, lane, type };
    if (type === 'hold') {
      note.holdDuration = beatInterval * (1 + Math.floor(Math.random() * 2));
    }
    if (type === 'slide') {
      note.slideDirection = (['left', 'right', 'up', 'down'] as const)[Math.floor(Math.random() * 4)];
    }

    notes.push(note);
  }

  // Sort by time
  notes.sort((a, b) => a.time - b.time);

  return {
    notes,
    bpm,
    duration: durationMs,
    difficulty,
    perfectWindow: windows.perfect,
    greatWindow: windows.great,
    goodWindow: windows.good,
  };
}

/**
 * Calculate damage multiplier from rhythm accuracy
 */
export function getRhythmDamageMultiplier(accuracy: number): number {
  if (accuracy >= 0.95) return 2.0;  // S rank
  if (accuracy >= 0.85) return 1.7;  // A rank
  if (accuracy >= 0.70) return 1.4;  // B rank
  if (accuracy >= 0.50) return 1.1;  // C rank
  return 0.8;                        // D rank / miss heavy
}

/**
 * Score a rhythm result and determine bonuses
 */
export function scoreRhythmResult(
  perfectCount: number,
  greatCount: number,
  goodCount: number,
  missCount: number,
  maxCombo: number
): RhythmResult {
  const total = perfectCount + greatCount + goodCount + missCount;
  if (total === 0) {
    return {
      judgements: [],
      perfectCount: 0,
      greatCount: 0,
      goodCount: 0,
      missCount: 0,
      maxCombo: 0,
      accuracy: 0,
      damageMultiplier: 1.0,
      bonusEffects: [],
    };
  }

  // Weighted accuracy: perfect=1.0, great=0.8, good=0.5, miss=0
  const accuracy = (perfectCount * 1.0 + greatCount * 0.8 + goodCount * 0.5) / total;
  const damageMultiplier = getRhythmDamageMultiplier(accuracy);

  // Bonus effects for exceptional performance
  const bonusEffects: string[] = [];
  if (perfectCount === total) {
    bonusEffects.push('ALL_PERFECT'); // Perfect on every note
  }
  if (missCount === 0) {
    bonusEffects.push('FULL_COMBO'); // No misses
  }
  if (maxCombo >= total * 0.8) {
    bonusEffects.push('GREAT_COMBO'); // 80%+ combo
  }

  return {
    judgements: [], // filled by rhythm input handler
    perfectCount,
    greatCount,
    goodCount,
    missCount,
    maxCombo,
    accuracy,
    damageMultiplier,
    bonusEffects,
  };
}

// ---------------------------------------------------------------------------
// Battle State Management
// ---------------------------------------------------------------------------

/**
 * Create initial battle state
 */
export function createBattleState(
  party: CharacterInstance[],
  enemies: EnemyInstance[],
  environment: BattleEnvironment,
  isBoss: boolean = false
): BattleState {
  const turnOrder = calculateTurnOrder(party, enemies);

  return {
    id: generateBattleId(),
    phase: 'initiative',
    turn: 1,
    turnOrder,
    currentActorIndex: 0,
    playerParty: party,
    enemies,
    fieldElements: [],
    comboChain: resetComboChain(),
    rhythmSequence: null,
    rhythmResult: null,
    battleLog: [],
    environment,
    isBossEncounter: isBoss,
  };
}

/**
 * Advance to next phase
 */
export function advanceBattlePhase(state: BattleState): BattlePhase {
  const phaseOrder: BattlePhase[] = [
    'initiative',
    'rhythm_input',
    'action_select',
    'target_select',
    'execution',
    'reaction_check',
    'counter_phase',
    'end_turn',
  ];

  const currentIdx = phaseOrder.indexOf(state.phase);
  const nextIdx = (currentIdx + 1) % phaseOrder.length;

  // Skip rhythm_input for enemies
  const currentActor = state.turnOrder[state.currentActorIndex];
  const isPlayerTurn = state.playerParty.some((p) => p.definitionId === currentActor);
  if (phaseOrder[nextIdx] === 'rhythm_input' && !isPlayerTurn) {
    return 'action_select';
  }

  // Skip counter_phase if all enemies dead
  if (phaseOrder[nextIdx] === 'counter_phase' && state.enemies.every((e) => !e.isAlive)) {
    return 'end_turn';
  }

  return phaseOrder[nextIdx];
}

/**
 * Process end of turn: advance actor, check win/lose, process effects
 */
export function processEndOfTurn(state: BattleState): {
  state: BattleState;
  battleOver: boolean;
  result?: 'victory' | 'defeat' | 'draw';
} {
  const updatedState = { ...state };

  // Process status effects for all actors
  for (const char of updatedState.playerParty) {
    if (!char.isAlive) continue;
    const { damage, healing, expiredEffects: _expired } = processStatusEffects(char, state.turn);
    char.stats.hp = Math.min(char.stats.maxHp, char.stats.hp + healing - damage);
    if (char.stats.hp <= 0) {
      char.isAlive = false;
      char.stats.hp = 0;
    }
  }

  for (const enemy of updatedState.enemies) {
    if (!enemy.isAlive) continue;
    const { damage, healing, expiredEffects: _expired } = processStatusEffects(enemy, state.turn);
    enemy.stats.hp = Math.min(enemy.stats.maxHp, enemy.stats.hp + healing - damage);
    if (enemy.stats.hp <= 0) {
      enemy.isAlive = false;
      enemy.stats.hp = 0;
    }
  }

  // Decay field elements
  updatedState.fieldElements = updatedState.fieldElements
    .map((f) => ({ ...f, duration: f.duration - 1 }))
    .filter((f) => f.duration > 0);

  // Check win/lose conditions
  const allPlayersDead = updatedState.playerParty.every((p) => !p.isAlive);
  const allEnemiesDead = updatedState.enemies.every((e) => !e.isAlive);

  if (allPlayersDead && allEnemiesDead) {
    return { state: updatedState, battleOver: true, result: 'draw' };
  }
  if (allPlayersDead) {
    return { state: updatedState, battleOver: true, result: 'defeat' };
  }
  if (allEnemiesDead) {
    return { state: updatedState, battleOver: true, result: 'victory' };
  }

  // Advance to next living actor
  let nextIdx = (updatedState.currentActorIndex + 1) % updatedState.turnOrder.length;
  let attempts = 0;
  while (attempts < updatedState.turnOrder.length) {
    const actorId = updatedState.turnOrder[nextIdx];
    const actor = [...updatedState.playerParty, ...updatedState.enemies].find(
      (a) => ('definitionId' in a ? a.definitionId : a.id) === actorId
    );
    if (actor && actor.isAlive) break;
    nextIdx = (nextIdx + 1) % updatedState.turnOrder.length;
    attempts++;
  }

  // If we wrapped around, increment turn count
  if (nextIdx <= updatedState.currentActorIndex) {
    updatedState.turn += 1;
    // Recalculate turn order each full round
    updatedState.turnOrder = calculateTurnOrder(
      updatedState.playerParty,
      updatedState.enemies
    );
  }

  updatedState.currentActorIndex = nextIdx;
  updatedState.phase = 'initiative';

  return { state: updatedState, battleOver: false };
}

/**
 * Calculate loot from defeated enemies
 */
export function generateLoot(enemies: EnemyInstance[]): LootEntry[] {
  const loot: LootEntry[] = [];

  for (const enemy of enemies) {
    if (!enemy.isAlive) {
      for (const entry of enemy.lootTable) {
        if (Math.random() < entry.chance) {
          const quantity = entry.minQuantity +
            Math.floor(Math.random() * (entry.maxQuantity - entry.minQuantity + 1));
          loot.push({ ...entry, minQuantity: quantity, maxQuantity: quantity });
        }
      }
    }
  }

  return loot;
}

/**
 * Calculate battle end stats
 */
export function calculateBattleEndStats(state: BattleState): BattleEndStats {
  const totalDamageDealt: Record<string, number> = {};
  const totalDamageReceived: Record<string, number> = {};
  const totalHealing: Record<string, number> = {};

  let reactionsTriggered = 0;
  let bestCombo = state.comboChain.hits;
  let totalAccuracy = 0;
  let accuracySamples = 0;

  for (const entry of state.battleLog) {
    if (entry.type === 'damage' && entry.data) {
      totalDamageDealt[entry.data.sourceId] =
        (totalDamageDealt[entry.data.sourceId] ?? 0) + entry.data.finalDamage;
      totalDamageReceived[entry.data.targetId] =
        (totalDamageReceived[entry.data.targetId] ?? 0) + entry.data.finalDamage;
      if (entry.data.reactionTriggered) {
        reactionsTriggered++;
      }
    }
    if (entry.type === 'rhythm' && state.rhythmResult) {
      totalAccuracy += state.rhythmResult.accuracy;
      accuracySamples++;
    }
  }

  // Find MVP (highest damage dealt)
  let mvpPlayerId = '';
  let maxDmg = 0;
  for (const [id, dmg] of Object.entries(totalDamageDealt)) {
    if (dmg > maxDmg) {
      maxDmg = dmg;
      mvpPlayerId = id;
    }
  }

  return {
    duration: state.turn,
    totalDamageDealt,
    totalDamageReceived,
    totalHealing,
    mvpPlayerId,
    reactionsTriggered,
    bestCombo,
    rhythmAccuracy: accuracySamples > 0 ? totalAccuracy / accuracySamples : 0,
    experienceGained: 0, // calculated by progression system
    goldEarned: 0,
  };
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

export interface EnemyAction {
  skillId: string;
  targetId: string;
}

/**
 * Determine enemy action based on AI type
 */
export function determineEnemyAction(
  enemy: EnemyInstance,
  party: CharacterInstance[],
  allies: EnemyInstance[]
): EnemyAction {
  const aliveParty = party.filter((p) => p.isAlive);
  if (aliveParty.length === 0) {
    return { skillId: enemy.skills[0].id, targetId: '' };
  }

  switch (enemy.ai) {
    case 'aggressive': {
      // Target lowest HP party member with strongest skill
      const target = aliveParty.reduce((a, b) => (a.stats.hp < b.stats.hp ? a : b));
      const skill = enemy.skills.reduce((a, b) =>
        a.damageMultiplier > b.damageMultiplier ? a : b
      );
      return { skillId: skill.id, targetId: target.definitionId };
    }
    case 'defensive': {
      // Use support skills if available, target self or allies
      const supportSkill = enemy.skills.find((s) => s.targetType === 'self' || s.targetType === 'all_allies');
      if (supportSkill) {
        return { skillId: supportSkill.id, targetId: enemy.id };
      }
      const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
      return { skillId: enemy.skills[0].id, targetId: target.definitionId };
    }
    case 'support': {
      // Heal lowest HP ally, or buff strongest ally
      const aliveAllies = allies.filter((a) => a.isAlive && a.id !== enemy.id);
      const healSkill = enemy.skills.find(
        (s) => s.targetType === 'ally' || s.targetType === 'all_allies'
      );
      if (healSkill && aliveAllies.length > 0) {
        const lowestAlly = aliveAllies.reduce((a, b) =>
          a.stats.hp / a.stats.maxHp < b.stats.hp / b.stats.maxHp ? a : b
        );
        return { skillId: healSkill.id, targetId: lowestAlly.id };
      }
      const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
      return { skillId: enemy.skills[0].id, targetId: target.definitionId };
    }
    case 'boss_pattern': {
      // Cycle through skills in order, targeting strategically
      const skillIndex = enemy.stats.hp > enemy.stats.maxHp * 0.5
        ? 0 // Phase 1: basic attacks
        : Math.min(enemy.skills.length - 1, 1); // Phase 2: stronger skills
      const skill = enemy.skills[skillIndex];

      // Target based on skill type
      if (skill.targetType === 'all_enemies') {
        return { skillId: skill.id, targetId: 'all' };
      }
      // Target highest threat (most damage dealt)
      const target = aliveParty.reduce((a, b) => (a.stats.atk > b.stats.atk ? a : b));
      return { skillId: skill.id, targetId: target.definitionId };
    }
    case 'random':
    default: {
      const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
      const skill = enemy.skills[Math.floor(Math.random() * enemy.skills.length)];
      return { skillId: skill.id, targetId: target.definitionId };
    }
  }
}

// ---------------------------------------------------------------------------
// Experience & Leveling
// ---------------------------------------------------------------------------

const BASE_EXP = 1000;
const EXP_SCALING = 1.15;

/**
 * Calculate XP needed for next level
 */
export function expForLevel(level: number): number {
  return Math.floor(BASE_EXP * Math.pow(EXP_SCALING, level - 1));
}

/**
 * Award experience and check for level up
 */
export function awardExperience(
  character: CharacterInstance,
  amount: number
): { leveledUp: boolean; newLevel: number; overflow: number } {
  character.experience += amount;
  let leveledUp = false;
  let overflow = 0;

  while (character.experience >= character.experienceToNext && character.level < 90) {
    character.experience -= character.experienceToNext;
    character.level += 1;
    leveledUp = true;

    // Apply growth stats
    character.experienceToNext = expForLevel(character.level);
  }

  if (character.level >= 90) {
    overflow = character.experience;
    character.experience = 0;
  }

  return { leveledUp, newLevel: character.level, overflow };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function generateBattleId(): string {
  return 'battle_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Calculate distance between two positions
 */
export function distance(a: Position2D, b: Position2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Check if target is within skill range
 */
export function isInRange(
  attacker: Position2D,
  target: Position2D,
  range: number
): boolean {
  return distance(attacker, target) <= range;
}

/**
 * Get all targets in AoE radius from a center point
 */
export function getTargetsInAoE(
  center: Position2D,
  radius: number,
  targets: { id: string; position: Position2D; isAlive: boolean }[]
): string[] {
  return targets
    .filter((t) => t.isAlive && distance(center, t.position) <= radius)
    .map((t) => t.id);
}
