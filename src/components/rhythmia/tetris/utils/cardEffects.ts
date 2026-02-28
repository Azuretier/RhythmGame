import type { EquippedCard, ActiveEffects } from '../types';
import type { EquipmentBonuses } from '@/lib/equipment/types';
import { ROGUE_CARD_MAP, DEFAULT_ACTIVE_EFFECTS, ITEMS } from '../constants';

/**
 * Compute the aggregate active effects from all equipped rogue-like cards,
 * optionally merging in equipment bonuses.
 * Pure function — no React hooks or side effects.
 */
export function computeActiveEffects(
    cards: EquippedCard[],
    equipmentBonuses?: EquipmentBonuses,
): ActiveEffects {
    const effects = { ...DEFAULT_ACTIVE_EFFECTS, equipmentEnchantments: [] as ActiveEffects['equipmentEnchantments'] };

    for (const ec of cards) {
        const card = ROGUE_CARD_MAP[ec.cardId];
        if (!card) continue;

        const totalValue = card.attributeValue * ec.stackCount;

        switch (card.attribute) {
            case 'combo_guard':
                effects.comboGuardUsesRemaining += totalValue;
                break;
            case 'shield':
                effects.shieldUsesRemaining += totalValue;
                break;
            case 'terrain_surge':
                effects.terrainSurgeBonus += totalValue;
                break;
            case 'beat_extend':
                effects.beatExtendBonus += totalValue;
                break;
            case 'score_boost':
                effects.scoreBoostMultiplier += totalValue;
                break;
            case 'gravity_slow':
                effects.gravitySlowFactor = Math.max(0.1, effects.gravitySlowFactor - totalValue);
                break;
            case 'lucky_drops':
                effects.luckyDropsBonus += totalValue;
                break;
            case 'combo_amplify':
                effects.comboAmplifyFactor *= Math.pow(card.attributeValue, ec.stackCount);
                break;
            case 'dragon_boost':
                effects.dragonBoostEnabled = true;
                effects.dragonBoostChargeMultiplier *= Math.pow(1 + card.attributeValue * 0.5, ec.stackCount);
                break;
        }
    }

    // Merge equipment bonuses if provided
    if (equipmentBonuses) {
        effects.equipmentScoreBonus = equipmentBonuses.scorePercent;
        effects.equipmentComboDuration = equipmentBonuses.comboDuration;
        effects.equipmentBeatWindow = equipmentBonuses.beatWindow;
        effects.equipmentTerrainDamage = equipmentBonuses.terrainDamage;
        effects.equipmentDropRate = equipmentBonuses.dropRate;
        effects.equipmentGravityReduce = equipmentBonuses.gravityReduce;
        effects.equipmentComboAmplify = equipmentBonuses.comboAmplify;
        effects.equipmentReactionPower = equipmentBonuses.reactionPower;
        effects.equipmentEnchantments = [...equipmentBonuses.enchantments];

        // Apply equipment bonuses on top of card bonuses
        effects.scoreBoostMultiplier += equipmentBonuses.scorePercent / 100;
        effects.beatExtendBonus += equipmentBonuses.beatWindow / 100;
        effects.gravitySlowFactor = Math.max(0.1, effects.gravitySlowFactor - equipmentBonuses.gravityReduce / 100);
        effects.terrainSurgeBonus += equipmentBonuses.terrainDamage / 100;
        effects.luckyDropsBonus += equipmentBonuses.dropRate / 100;
        effects.comboAmplifyFactor *= (1 + equipmentBonuses.comboAmplify / 100);
    }

    return effects;
}

/**
 * Roll a random item based on drop weights.
 * luckyBonus shifts probability toward rarer items.
 */
export function rollItem(luckyBonus: number = 0): string {
    const adjustedWeights = ITEMS.map(item => {
        let w = item.dropWeight;
        if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary') {
            w *= (1 + luckyBonus * 3);
        } else if (item.rarity === 'common') {
            w *= Math.max(0.5, 1 - luckyBonus);
        }
        return w;
    });
    const total = adjustedWeights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < ITEMS.length; i++) {
        roll -= adjustedWeights[i];
        if (roll <= 0) return ITEMS[i].id;
    }
    return ITEMS[0].id;
}
