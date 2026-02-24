import React from 'react';
import type { InventoryItem, EquippedCard, ActiveEffects } from '../types';
import { ITEM_MAP, ROGUE_CARD_MAP } from '../constants';
import { ItemTexture } from '@/components/items/ItemTexture';
import { ItemTooltipWrapper } from '@/components/items/ItemTooltip';
import styles from '../VanillaGame.module.css';

interface ItemSlotsProps {
    inventory: InventoryItem[];
    equippedCards: EquippedCard[];
    activeEffects: ActiveEffects;
}

const RARITY_LABEL: Record<string, string> = {
    common: 'COMMON',
    uncommon: 'UNCOMMON',
    rare: 'RARE',
    epic: 'EPIC',
    legendary: 'LEGENDARY',
};

/**
 * Modern card-style inventory display
 * Glass-morphism cards with SVG icons, large count typography, and rarity accents
 * Shows equipped rogue cards and active effect summary
 */
export function ItemSlots({ inventory, equippedCards, activeEffects }: ItemSlotsProps) {
    return (
        <div className={styles.itemSlotsPanel}>
            {/* Panel header */}
            <div className={styles.itemSlotsHeader}>
                <span className={styles.itemSlotsTitle}>INVENTORY</span>
                {equippedCards.length > 0 && (
                    <span className={styles.damageMultBadge}>
                        {equippedCards.length} CARDS
                    </span>
                )}
            </div>

            {/* Item cards grid */}
            <div className={styles.itemSlotsGrid}>
                {inventory.length === 0 && (
                    <div className={styles.itemSlotEmpty}>
                        <span className={styles.itemSlotEmptyText}>DIG!</span>
                    </div>
                )}
                {inventory.map(inv => {
                    const item = ITEM_MAP[inv.itemId];
                    if (!item) return null;
                    return (
                        <ItemTooltipWrapper
                            key={inv.itemId}
                            itemId={inv.itemId}
                            count={inv.count}
                            side="right"
                        >
                            <div
                                className={`${styles.itemCard} ${styles[`rarity_${item.rarity}`]}`}
                            >
                                {/* Accent line at top */}
                                <div
                                    className={styles.itemCardAccent}
                                    style={{ background: item.color }}
                                />
                                {/* Icon area */}
                                <div
                                    className={styles.itemCardIconWrap}
                                    style={{
                                        background: `radial-gradient(circle at 50% 50%, ${item.glowColor}18, transparent)`,
                                    }}
                                >
                                    <ItemTexture itemId={inv.itemId} size={22} />
                                </div>
                                {/* Count — large number typography */}
                                <span className={styles.itemCardCount}>{inv.count}</span>
                                {/* Name + rarity */}
                                <span className={styles.itemCardName}>{item.nameJa}</span>
                                <span
                                    className={styles.itemCardRarity}
                                    style={{ color: item.color }}
                                >
                                    {RARITY_LABEL[item.rarity] || item.rarity}
                                </span>
                            </div>
                        </ItemTooltipWrapper>
                    );
                })}
            </div>

            {/* Equipped rogue cards */}
            {equippedCards.length > 0 && (
                <div className={styles.equippedCardSlots}>
                    {equippedCards.map((ec, idx) => {
                        const card = ROGUE_CARD_MAP[ec.cardId];
                        if (!card) return null;
                        return (
                            <div
                                key={idx}
                                className={styles.equippedCardSlot}
                                style={{
                                    borderColor: `${card.color}50`,
                                    background: `linear-gradient(135deg, ${card.color}12, transparent)`,
                                }}
                            >
                                <span className={styles.equippedCardIcon}>{card.icon}</span>
                                {ec.stackCount > 1 && (
                                    <span className={styles.equippedCardStack}>x{ec.stackCount}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Active effects summary */}
            {equippedCards.length > 0 && (
                <div className={styles.effectsSummary}>
                    {activeEffects.comboGuardUsesRemaining > 0 && (
                        <span className={styles.effectBadge}>GUARD: {activeEffects.comboGuardUsesRemaining}</span>
                    )}
                    {activeEffects.shieldActive && (
                        <span className={styles.effectBadge}>SHIELD</span>
                    )}
                    {activeEffects.terrainSurgeBonus > 0 && (
                        <span className={styles.effectBadge}>SURGE +{Math.round(activeEffects.terrainSurgeBonus * 100)}%</span>
                    )}
                    {activeEffects.beatExtendBonus > 0 && (
                        <span className={styles.effectBadge}>BEAT +{Math.round(activeEffects.beatExtendBonus * 100)}%</span>
                    )}
                    {activeEffects.scoreBoostMultiplier > 1 && (
                        <span className={styles.effectBadge}>SCORE x{activeEffects.scoreBoostMultiplier.toFixed(1)}</span>
                    )}
                    {activeEffects.gravitySlowFactor < 1 && (
                        <span className={styles.effectBadge}>SLOW {Math.round((1 - activeEffects.gravitySlowFactor) * 100)}%</span>
                    )}
                    {activeEffects.luckyDropsBonus > 0 && (
                        <span className={styles.effectBadge}>LUCK +{Math.round(activeEffects.luckyDropsBonus * 100)}%</span>
                    )}
                    {activeEffects.comboAmplifyFactor > 1 && (
                        <span className={styles.effectBadge}>COMBO x{activeEffects.comboAmplifyFactor.toFixed(1)}</span>
                    )}
                </div>
            )}
        </div>
    );
}
