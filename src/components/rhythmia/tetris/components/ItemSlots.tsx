import React from 'react';
import type { InventoryItem, CraftedCard } from '../types';
import { ITEM_MAP, WEAPON_CARD_MAP } from '../constants';
import { ItemIcon, WeaponIcon } from './ItemIcon';
import { ItemTooltipWrapper } from './ItemTooltip';
import styles from '../VanillaGame.module.css';

interface ItemSlotsProps {
    inventory: InventoryItem[];
    craftedCards: CraftedCard[];
    damageMultiplier: number;
    onCraftOpen: () => void;
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
 * Hybrid tooltips: Java Edition purple container + Dungeons icon/stat content
 */
export function ItemSlots({ inventory, craftedCards, damageMultiplier, onCraftOpen }: ItemSlotsProps) {
    return (
        <div className={styles.itemSlotsPanel}>
            {/* Panel header */}
            <div className={styles.itemSlotsHeader}>
                <span className={styles.itemSlotsTitle}>INVENTORY</span>
                {damageMultiplier > 1 && (
                    <span className={styles.damageMultBadge}>
                        x{damageMultiplier.toFixed(1)}
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
                            item={item}
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
                                    <ItemIcon itemId={inv.itemId} size={22} />
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

            {/* Crafted weapon cards */}
            {craftedCards.length > 0 && (
                <div className={styles.weaponCardSlots}>
                    {craftedCards.map((cc, idx) => {
                        const card = WEAPON_CARD_MAP[cc.cardId];
                        if (!card) return null;
                        return (
                            <ItemTooltipWrapper
                                key={idx}
                                weapon={card}
                                equipped
                                side="right"
                            >
                                <div
                                    className={styles.weaponCardSlot}
                                    style={{
                                        borderColor: `${card.color}50`,
                                        background: `linear-gradient(135deg, ${card.color}12, transparent)`,
                                    }}
                                >
                                    <WeaponIcon cardId={cc.cardId} size={16} glowColor={card.glowColor} />
                                </div>
                            </ItemTooltipWrapper>
                        );
                    })}
                </div>
            )}

            {/* Craft button */}
            <button className={styles.craftButton} onClick={onCraftOpen}>
                FORGE
            </button>
        </div>
    );
}
