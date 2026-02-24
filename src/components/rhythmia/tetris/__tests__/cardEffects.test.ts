import { describe, it, expect } from 'vitest';
import { computeActiveEffects, rollItem } from '../utils/cardEffects';
import { getBeatJudgment, getBeatMultiplier } from '../utils/boardUtils';
import { DEFAULT_ACTIVE_EFFECTS, ROGUE_CARDS, ROGUE_CARD_MAP, BEAT_GOOD_WINDOW, BEAT_GREAT_WINDOW, BEAT_PERFECT_WINDOW } from '../constants';
import type { EquippedCard } from '../types';

// Helper to create an EquippedCard
function equip(cardId: string, stackCount = 1): EquippedCard {
    return { cardId, equippedAt: Date.now(), stackCount };
}

// =============================================
// computeActiveEffects tests
// =============================================

describe('computeActiveEffects', () => {
    it('returns defaults for empty cards', () => {
        const effects = computeActiveEffects([]);
        expect(effects).toEqual(DEFAULT_ACTIVE_EFFECTS);
    });

    // --- shield (Stone Shield) ---
    describe('shield (Stone Shield)', () => {
        it('single stack gives 1 shield use', () => {
            const effects = computeActiveEffects([equip('stone_shield', 1)]);
            expect(effects.shieldUsesRemaining).toBe(1);
        });

        it('2 stacks give 2 shield uses', () => {
            const effects = computeActiveEffects([equip('stone_shield', 2)]);
            expect(effects.shieldUsesRemaining).toBe(2);
        });

        it('3 stacks give 3 shield uses', () => {
            const effects = computeActiveEffects([equip('stone_shield', 3)]);
            expect(effects.shieldUsesRemaining).toBe(3);
        });
    });

    // --- beat_extend (Rhythm Cushion, Crystal Lens, Void Lens) ---
    describe('beat_extend', () => {
        it('Rhythm Cushion adds 3% per stack', () => {
            const effects = computeActiveEffects([equip('rhythm_cushion', 1)]);
            expect(effects.beatExtendBonus).toBeCloseTo(0.03);
        });

        it('Crystal Lens adds 5% per stack', () => {
            const effects = computeActiveEffects([equip('crystal_lens', 1)]);
            expect(effects.beatExtendBonus).toBeCloseTo(0.05);
        });

        it('Void Lens adds 8% per stack', () => {
            const effects = computeActiveEffects([equip('void_lens', 1)]);
            expect(effects.beatExtendBonus).toBeCloseTo(0.08);
        });

        it('stacking same card multiplies value', () => {
            const effects = computeActiveEffects([equip('rhythm_cushion', 3)]);
            expect(effects.beatExtendBonus).toBeCloseTo(0.09); // 0.03 * 3
        });

        it('different beat_extend cards stack additively', () => {
            const effects = computeActiveEffects([
                equip('rhythm_cushion', 1), // 0.03
                equip('crystal_lens', 1),   // 0.05
                equip('void_lens', 1),      // 0.08
            ]);
            expect(effects.beatExtendBonus).toBeCloseTo(0.16); // 0.03 + 0.05 + 0.08
        });
    });

    // --- terrain_surge (Iron Pickaxe, Gold Surge) ---
    describe('terrain_surge', () => {
        it('Iron Pickaxe adds 15% per stack', () => {
            const effects = computeActiveEffects([equip('iron_pickaxe', 1)]);
            expect(effects.terrainSurgeBonus).toBeCloseTo(0.15);
        });

        it('Gold Surge adds 30% per stack', () => {
            const effects = computeActiveEffects([equip('gold_surge', 1)]);
            expect(effects.terrainSurgeBonus).toBeCloseTo(0.30);
        });

        it('stacking adds up', () => {
            const effects = computeActiveEffects([equip('iron_pickaxe', 2)]);
            expect(effects.terrainSurgeBonus).toBeCloseTo(0.30); // 0.15 * 2
        });

        it('different surge cards combine', () => {
            const effects = computeActiveEffects([
                equip('iron_pickaxe', 1), // 0.15
                equip('gold_surge', 1),   // 0.30
            ]);
            expect(effects.terrainSurgeBonus).toBeCloseTo(0.45);
        });
    });

    // --- score_boost (Score Coin, Gold Crown) ---
    describe('score_boost', () => {
        it('starts at 1.0 base multiplier', () => {
            const effects = computeActiveEffects([]);
            expect(effects.scoreBoostMultiplier).toBe(1);
        });

        it('Score Coin adds 10%', () => {
            const effects = computeActiveEffects([equip('score_coin', 1)]);
            expect(effects.scoreBoostMultiplier).toBeCloseTo(1.10);
        });

        it('Gold Crown adds 25%', () => {
            const effects = computeActiveEffects([equip('gold_crown', 1)]);
            expect(effects.scoreBoostMultiplier).toBeCloseTo(1.25);
        });

        it('stacking is additive', () => {
            const effects = computeActiveEffects([equip('score_coin', 3)]);
            expect(effects.scoreBoostMultiplier).toBeCloseTo(1.30); // 1 + 0.10*3
        });

        it('different cards combine additively', () => {
            const effects = computeActiveEffects([
                equip('score_coin', 1),  // +0.10
                equip('gold_crown', 1),  // +0.25
            ]);
            expect(effects.scoreBoostMultiplier).toBeCloseTo(1.35);
        });
    });

    // --- gravity_slow (Slow Feather, Obsidian Heart) ---
    describe('gravity_slow', () => {
        it('starts at 1.0 base factor', () => {
            const effects = computeActiveEffects([]);
            expect(effects.gravitySlowFactor).toBe(1);
        });

        it('Slow Feather reduces by 10%', () => {
            const effects = computeActiveEffects([equip('slow_feather', 1)]);
            expect(effects.gravitySlowFactor).toBeCloseTo(0.90);
        });

        it('Obsidian Heart reduces by 25%', () => {
            const effects = computeActiveEffects([equip('obsidian_heart', 1)]);
            expect(effects.gravitySlowFactor).toBeCloseTo(0.75);
        });

        it('stacking reduces further', () => {
            const effects = computeActiveEffects([equip('slow_feather', 3)]);
            expect(effects.gravitySlowFactor).toBeCloseTo(0.70); // 1 - 0.10*3
        });

        it('floors at 0.1 with extreme stacking', () => {
            const effects = computeActiveEffects([
                equip('obsidian_heart', 3), // -0.75
                equip('slow_feather', 3),   // -0.30
            ]);
            // Would be 1 - 0.75 - 0.30 = -0.05, but clamped to 0.1
            expect(effects.gravitySlowFactor).toBe(0.1);
        });
    });

    // --- combo_guard (Combo Guard, Double Guard, Star Heart) ---
    describe('combo_guard', () => {
        it('Combo Guard gives 1 use per stack', () => {
            const effects = computeActiveEffects([equip('combo_guard', 1)]);
            expect(effects.comboGuardUsesRemaining).toBe(1);
        });

        it('Double Guard gives 2 uses per stack', () => {
            const effects = computeActiveEffects([equip('double_guard', 1)]);
            expect(effects.comboGuardUsesRemaining).toBe(2);
        });

        it('Star Heart gives 3 uses per stack', () => {
            const effects = computeActiveEffects([equip('star_heart', 1)]);
            expect(effects.comboGuardUsesRemaining).toBe(3);
        });

        it('stacking multiplies uses', () => {
            const effects = computeActiveEffects([equip('combo_guard', 3)]);
            expect(effects.comboGuardUsesRemaining).toBe(3); // 1 * 3
        });

        it('different guard cards combine additively', () => {
            const effects = computeActiveEffects([
                equip('combo_guard', 1),  // 1
                equip('double_guard', 1), // 2
                equip('star_heart', 1),   // 3
            ]);
            expect(effects.comboGuardUsesRemaining).toBe(6);
        });
    });

    // --- combo_amplify (Combo Ring) ---
    describe('combo_amplify', () => {
        it('starts at 1.0 base factor', () => {
            const effects = computeActiveEffects([]);
            expect(effects.comboAmplifyFactor).toBe(1);
        });

        it('1 stack gives 1.5x', () => {
            const effects = computeActiveEffects([equip('combo_ring', 1)]);
            expect(effects.comboAmplifyFactor).toBeCloseTo(1.5);
        });

        it('2 stacks give 2.25x (geometric)', () => {
            const effects = computeActiveEffects([equip('combo_ring', 2)]);
            expect(effects.comboAmplifyFactor).toBeCloseTo(2.25); // 1.5^2
        });

        it('3 stacks give 3.375x (geometric)', () => {
            const effects = computeActiveEffects([equip('combo_ring', 3)]);
            expect(effects.comboAmplifyFactor).toBeCloseTo(3.375); // 1.5^3
        });
    });

    // --- lucky_drops (Lucky Charm) ---
    describe('lucky_drops', () => {
        it('Lucky Charm adds 15% per stack', () => {
            const effects = computeActiveEffects([equip('lucky_charm', 1)]);
            expect(effects.luckyDropsBonus).toBeCloseTo(0.15);
        });

        it('stacking is additive', () => {
            const effects = computeActiveEffects([equip('lucky_charm', 3)]);
            expect(effects.luckyDropsBonus).toBeCloseTo(0.45); // 0.15 * 3
        });
    });

    // --- dragon_boost (Mandarin Dragon) ---
    describe('dragon_boost', () => {
        it('enables dragon gauge', () => {
            const effects = computeActiveEffects([equip('mandarin_dragon', 1)]);
            expect(effects.dragonBoostEnabled).toBe(true);
        });

        it('charge multiplier scales with stacks', () => {
            const effects1 = computeActiveEffects([equip('mandarin_dragon', 1)]);
            // (1 + 1.0 * 0.5)^1 = 1.5
            expect(effects1.dragonBoostChargeMultiplier).toBeCloseTo(1.5);

            const effects2 = computeActiveEffects([equip('mandarin_dragon', 2)]);
            // (1 + 1.0 * 0.5)^2 = 2.25
            expect(effects2.dragonBoostChargeMultiplier).toBeCloseTo(2.25);
        });

        it('disabled by default', () => {
            const effects = computeActiveEffects([]);
            expect(effects.dragonBoostEnabled).toBe(false);
            expect(effects.dragonBoostChargeMultiplier).toBe(1);
        });
    });

    // --- Mixed card combinations ---
    describe('mixed card combinations', () => {
        it('applies all different card types simultaneously', () => {
            const effects = computeActiveEffects([
                equip('stone_shield', 1),     // shield: 1 use
                equip('rhythm_cushion', 1),   // beat_extend: +3%
                equip('iron_pickaxe', 1),     // terrain_surge: +15%
                equip('score_coin', 1),       // score_boost: +10%
                equip('slow_feather', 1),     // gravity_slow: -10%
                equip('combo_guard', 1),      // combo_guard: 1 use
                equip('combo_ring', 1),       // combo_amplify: 1.5x
                equip('lucky_charm', 1),      // lucky_drops: +15%
                equip('mandarin_dragon', 1),  // dragon_boost: enabled
            ]);

            expect(effects.shieldUsesRemaining).toBe(1);
            expect(effects.beatExtendBonus).toBeCloseTo(0.03);
            expect(effects.terrainSurgeBonus).toBeCloseTo(0.15);
            expect(effects.scoreBoostMultiplier).toBeCloseTo(1.10);
            expect(effects.gravitySlowFactor).toBeCloseTo(0.90);
            expect(effects.comboGuardUsesRemaining).toBe(1);
            expect(effects.comboAmplifyFactor).toBeCloseTo(1.5);
            expect(effects.luckyDropsBonus).toBeCloseTo(0.15);
            expect(effects.dragonBoostEnabled).toBe(true);
        });
    });

    // --- Edge cases ---
    describe('edge cases', () => {
        it('unknown card ID is skipped', () => {
            const effects = computeActiveEffects([equip('nonexistent_card', 1)]);
            expect(effects).toEqual(DEFAULT_ACTIVE_EFFECTS);
        });

        it('all 16 cards are recognized', () => {
            for (const card of ROGUE_CARDS) {
                expect(ROGUE_CARD_MAP[card.id]).toBeDefined();
                // Equipping any valid card should not throw
                const effects = computeActiveEffects([equip(card.id, 1)]);
                expect(effects).toBeDefined();
            }
        });
    });
});

// =============================================
// getBeatJudgment tests
// =============================================

describe('getBeatJudgment', () => {
    it('exact beat (phase 0) is perfect', () => {
        expect(getBeatJudgment(0)).toBe('perfect');
    });

    it('exact beat (phase 1 wraps to 0) is perfect', () => {
        // phase 1 -> dist = 1 - 1 = 0
        expect(getBeatJudgment(1)).toBe('perfect');
    });

    it('phase 0.5 (furthest from beat) is miss', () => {
        expect(getBeatJudgment(0.5)).toBe('miss');
    });

    it('within PERFECT window is perfect', () => {
        expect(getBeatJudgment(BEAT_PERFECT_WINDOW - 0.001)).toBe('perfect');
        expect(getBeatJudgment(1 - BEAT_PERFECT_WINDOW + 0.001)).toBe('perfect');
    });

    it('just outside PERFECT but within GREAT is great', () => {
        expect(getBeatJudgment(BEAT_PERFECT_WINDOW + 0.01)).toBe('great');
    });

    it('within GREAT window is great', () => {
        expect(getBeatJudgment(BEAT_GREAT_WINDOW - 0.001)).toBe('great');
    });

    it('just outside GREAT but within GOOD is good', () => {
        expect(getBeatJudgment(BEAT_GREAT_WINDOW + 0.01)).toBe('good');
    });

    it('within GOOD window is good', () => {
        expect(getBeatJudgment(BEAT_GOOD_WINDOW - 0.001)).toBe('good');
    });

    it('outside GOOD window is miss', () => {
        expect(getBeatJudgment(BEAT_GOOD_WINDOW + 0.01)).toBe('miss');
    });

    describe('with beatExtendBonus', () => {
        it('widens perfect window', () => {
            // Default perfect window = 0.06
            // With bonus 0.05: perfect window = 0.11
            const justOutsideDefault = BEAT_PERFECT_WINDOW + 0.02;
            expect(getBeatJudgment(justOutsideDefault, 0)).toBe('great');
            expect(getBeatJudgment(justOutsideDefault, 0.05)).toBe('perfect');
        });

        it('widens good window', () => {
            // Default good window = 0.20
            // With bonus 0.05: good window = 0.25
            const justOutsideDefault = BEAT_GOOD_WINDOW + 0.02;
            expect(getBeatJudgment(justOutsideDefault, 0)).toBe('miss');
            expect(getBeatJudgment(justOutsideDefault, 0.05)).toBe('good');
        });
    });

    describe('with beatWindowMod', () => {
        it('shrinking windows makes timing stricter', () => {
            // Default perfect window = 0.06
            // With mod 0.5: effective perfect window = 0.03
            const phase = 0.04; // inside default perfect, but outside shrunk
            expect(getBeatJudgment(phase, 0, 1.0)).toBe('perfect');
            expect(getBeatJudgment(phase, 0, 0.5)).toBe('great');
        });
    });
});

describe('getBeatMultiplier', () => {
    it('perfect gives 2x', () => {
        expect(getBeatMultiplier('perfect')).toBe(2);
    });

    it('great gives 1.5x', () => {
        expect(getBeatMultiplier('great')).toBe(1.5);
    });

    it('good gives 1.2x', () => {
        expect(getBeatMultiplier('good')).toBe(1.2);
    });

    it('miss gives 1x (default)', () => {
        expect(getBeatMultiplier('miss')).toBe(1);
    });
});

// =============================================
// rollItem tests
// =============================================

describe('rollItem', () => {
    it('always returns a valid item ID', () => {
        for (let i = 0; i < 100; i++) {
            const itemId = rollItem(0);
            expect(typeof itemId).toBe('string');
            expect(itemId.length).toBeGreaterThan(0);
        }
    });

    it('with lucky bonus, rare items appear more often', () => {
        const counts = { rare: 0, common: 0 };
        const iterations = 5000;

        // Baseline (no bonus)
        for (let i = 0; i < iterations; i++) {
            const id = rollItem(0);
            if (id === 'stone' || id === 'iron') counts.common++;
            if (id === 'gold' || id === 'obsidian' || id === 'star') counts.rare++;
        }
        const baseRareRate = counts.rare / iterations;

        // With bonus
        const boostedCounts = { rare: 0, common: 0 };
        for (let i = 0; i < iterations; i++) {
            const id = rollItem(0.5);
            if (id === 'stone' || id === 'iron') boostedCounts.common++;
            if (id === 'gold' || id === 'obsidian' || id === 'star') boostedCounts.rare++;
        }
        const boostedRareRate = boostedCounts.rare / iterations;

        // Lucky bonus should increase rare item rate
        expect(boostedRareRate).toBeGreaterThan(baseRareRate);
    });
});
