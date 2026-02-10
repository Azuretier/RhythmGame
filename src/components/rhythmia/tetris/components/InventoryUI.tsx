import React, { useState } from 'react';
import type { InventoryItem, CraftedCard } from '../types';
import { ITEM_MAP, WEAPON_CARD_MAP, ITEMS } from '../constants';
import { ItemIcon, WeaponIcon } from './ItemIcon';
import styles from '../VanillaGame.module.css';

interface InventoryUIProps {
    inventory: InventoryItem[];
    craftedCards: CraftedCard[];
    damageMultiplier: number;
    level: number;
    onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
    common: '#8B8B8B',
    uncommon: '#4FC3F7',
    rare: '#FFD700',
    epic: '#9C27B0',
    legendary: '#FFFFFF',
};

const RARITY_LABEL: Record<string, string> = {
    common: 'COMMON',
    uncommon: 'UNCOMMON',
    rare: 'RARE',
    epic: 'EPIC',
    legendary: 'LEGENDARY',
};

// Equipment slot positions around character silhouette
const EQUIP_SLOTS = [
    { id: 'weapon', label: 'Weapon', x: 'left', y: 'top' },
    { id: 'armor', label: 'Armor', x: 'right', y: 'top' },
    { id: 'artifact1', label: 'Artifact', x: 'left', y: 'bottom' },
    { id: 'artifact2', label: 'Artifact', x: 'center', y: 'bottom' },
    { id: 'artifact3', label: 'Artifact', x: 'right', y: 'bottom' },
];

/**
 * Full-screen inventory overlay styled like Minecraft Dungeons.
 * - Left: Character silhouette with equipment slots
 * - Center: Item grid
 * - Right: Selected item detail panel
 */
export function InventoryUI({ inventory, craftedCards, damageMultiplier, level, onClose }: InventoryUIProps) {
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'materials' | 'weapons'>('all');

    // Build combined item list for grid
    const materialItems = inventory.map(inv => {
        const item = ITEM_MAP[inv.itemId];
        return item ? { type: 'material' as const, id: inv.itemId, count: inv.count, item } : null;
    }).filter(Boolean);

    const weaponItems = craftedCards.map(cc => {
        const card = WEAPON_CARD_MAP[cc.cardId];
        return card ? { type: 'weapon' as const, id: cc.cardId, count: 1, card } : null;
    }).filter(Boolean);

    const allItems = selectedCategory === 'materials' ? materialItems
        : selectedCategory === 'weapons' ? weaponItems
        : [...materialItems, ...weaponItems];

    // Get selected item details
    const selectedDetail = selectedItem ? (
        ITEM_MAP[selectedItem] || WEAPON_CARD_MAP[selectedItem]
    ) : null;

    const isWeapon = selectedItem ? !!WEAPON_CARD_MAP[selectedItem] : false;
    const selectedWeapon = isWeapon && selectedItem ? WEAPON_CARD_MAP[selectedItem] : null;
    const selectedMaterial = !isWeapon && selectedItem ? ITEM_MAP[selectedItem] : null;

    // Power level = sum of damage multipliers
    const powerLevel = Math.round(damageMultiplier * 10);

    return (
        <div className={styles.inventoryOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.inventoryPanel}>
                {/* Left section: Character + Equipment */}
                <div className={styles.invCharacterSection}>
                    {/* Level badge */}
                    <div className={styles.invLevelBadge}>
                        <span className={styles.invLevelIcon}>◈</span>
                        <span className={styles.invLevelLabel}>LEVEL</span>
                        <span className={styles.invLevelValue}>{level}</span>
                    </div>

                    {/* Character silhouette area */}
                    <div className={styles.invCharacterArea}>
                        {/* Equipment slots around character */}
                        <div className={styles.invEquipSlots}>
                            {/* Top row: weapon + empty + armor */}
                            <div className={styles.invEquipRow}>
                                {craftedCards[0] ? (
                                    <div
                                        className={`${styles.invEquipSlot} ${styles.invEquipFilled}`}
                                        onClick={() => setSelectedItem(craftedCards[0].cardId)}
                                        style={{ borderColor: `${WEAPON_CARD_MAP[craftedCards[0].cardId]?.color || '#fff'}50` }}
                                    >
                                        <ItemIcon itemId={craftedCards[0].cardId} size={28} />
                                        <span className={styles.invEquipCount}>♦ {
                                            Math.round((WEAPON_CARD_MAP[craftedCards[0].cardId]?.damageMultiplier || 1) * 10)
                                        }</span>
                                    </div>
                                ) : (
                                    <div className={styles.invEquipSlot}>
                                        <span className={styles.invEquipEmpty}>+</span>
                                    </div>
                                )}
                                <div className={styles.invCharacterIcon}>
                                    {/* Simple character silhouette */}
                                    <svg width="48" height="64" viewBox="0 0 48 64" fill="none">
                                        {/* Head */}
                                        <rect x="14" y="0" width="20" height="20" rx="2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                                        {/* Eyes */}
                                        <rect x="18" y="8" width="3" height="3" fill="rgba(255,255,255,0.4)" />
                                        <rect x="27" y="8" width="3" height="3" fill="rgba(255,255,255,0.4)" />
                                        {/* Body */}
                                        <rect x="10" y="22" width="28" height="22" rx="1" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                                        {/* Arms */}
                                        <rect x="2" y="22" width="8" height="20" rx="1" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                                        <rect x="38" y="22" width="8" height="20" rx="1" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                                        {/* Legs */}
                                        <rect x="14" y="46" width="8" height="18" rx="1" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                                        <rect x="26" y="46" width="8" height="18" rx="1" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                                    </svg>
                                </div>
                                {craftedCards[1] ? (
                                    <div
                                        className={`${styles.invEquipSlot} ${styles.invEquipFilled}`}
                                        onClick={() => setSelectedItem(craftedCards[1].cardId)}
                                        style={{ borderColor: `${WEAPON_CARD_MAP[craftedCards[1].cardId]?.color || '#fff'}50` }}
                                    >
                                        <ItemIcon itemId={craftedCards[1].cardId} size={28} />
                                    </div>
                                ) : (
                                    <div className={styles.invEquipSlot}>
                                        <span className={styles.invEquipEmpty}>+</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Power display */}
                    <div className={styles.invPowerDisplay}>
                        <span className={styles.invPowerIcon}>◈</span>
                        <span className={styles.invPowerLabel}>POWER</span>
                        <span className={styles.invPowerValue}>{powerLevel}</span>
                    </div>

                    {/* Bottom artifact slots */}
                    <div className={styles.invArtifactRow}>
                        {[2, 3, 4].map(idx => (
                            craftedCards[idx] ? (
                                <div
                                    key={idx}
                                    className={`${styles.invEquipSlot} ${styles.invEquipSmall} ${styles.invEquipFilled}`}
                                    onClick={() => setSelectedItem(craftedCards[idx].cardId)}
                                >
                                    <ItemIcon itemId={craftedCards[idx].cardId} size={22} />
                                    <span className={styles.invEquipCount}>♦ {
                                        Math.round((WEAPON_CARD_MAP[craftedCards[idx].cardId]?.damageMultiplier || 1) * 10)
                                    }</span>
                                </div>
                            ) : (
                                <div key={idx} className={`${styles.invEquipSlot} ${styles.invEquipSmall}`}>
                                    <span className={styles.invEquipEmpty}>+</span>
                                </div>
                            )
                        ))}
                    </div>
                </div>

                {/* Center section: Item Grid */}
                <div className={styles.invGridSection}>
                    {/* Category tabs */}
                    <div className={styles.invCategoryTabs}>
                        <span className={styles.invTabLabel}>All</span>
                        <div className={styles.invTabIcons}>
                            <button
                                className={`${styles.invTabBtn} ${selectedCategory === 'all' ? styles.invTabActive : ''}`}
                                onClick={() => setSelectedCategory('all')}
                                title="All Items"
                            >
                                ≡
                            </button>
                            <button
                                className={`${styles.invTabBtn} ${selectedCategory === 'materials' ? styles.invTabActive : ''}`}
                                onClick={() => setSelectedCategory('materials')}
                                title="Materials"
                            >
                                ◆
                            </button>
                            <button
                                className={`${styles.invTabBtn} ${selectedCategory === 'weapons' ? styles.invTabActive : ''}`}
                                onClick={() => setSelectedCategory('weapons')}
                                title="Weapons"
                            >
                                ⚔
                            </button>
                        </div>
                    </div>

                    {/* Item grid */}
                    <div className={styles.invGrid}>
                        {allItems.map((entry, idx) => {
                            if (!entry) return null;
                            const isMat = entry.type === 'material';
                            const color = isMat ? entry.item.color : entry.card!.color;
                            const rarity = isMat ? entry.item.rarity : 'common';
                            const isSelected = selectedItem === entry.id;

                            return (
                                <div
                                    key={`${entry.id}-${idx}`}
                                    className={`${styles.invGridItem} ${isSelected ? styles.invGridItemSelected : ''}`}
                                    style={{
                                        borderColor: isSelected ? `${color}80` : undefined,
                                        boxShadow: isSelected ? `0 0 12px ${color}30, inset 0 0 8px ${color}10` : undefined,
                                    }}
                                    onClick={() => setSelectedItem(entry.id)}
                                >
                                    <div className={styles.invGridItemRarityBar} style={{ background: RARITY_COLORS[rarity] || '#8B8B8B' }} />
                                    <div className={styles.invGridItemIcon}>
                                        <ItemIcon itemId={entry.id} size={30} />
                                    </div>
                                    {isMat && entry.count > 1 && (
                                        <span className={styles.invGridItemCount}>
                                            <span className={styles.invGridItemCountIcon}>◆</span> {entry.count}
                                        </span>
                                    )}
                                    {!isMat && (
                                        <span className={styles.invGridItemCount}>
                                            <span className={styles.invGridItemCountIcon}>♦</span> {
                                                Math.round((entry.card!.damageMultiplier || 1) * 10)
                                            }
                                        </span>
                                    )}
                                </div>
                            );
                        })}

                        {/* Empty slots to fill grid */}
                        {Array.from({ length: Math.max(0, 18 - allItems.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className={styles.invGridItemEmpty}>
                                <span className={styles.invGridEmptyX}>✕</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right section: Item Detail */}
                <div className={styles.invDetailSection}>
                    {selectedDetail ? (
                        <>
                            {/* Rarity + level */}
                            <div className={styles.invDetailHeader}>
                                <span className={styles.invDetailLevel}>{powerLevel}</span>
                                <span
                                    className={styles.invDetailRarity}
                                    style={{ color: RARITY_COLORS[isWeapon ? 'rare' : (selectedMaterial?.rarity || 'common')] }}
                                >
                                    {RARITY_LABEL[isWeapon ? 'rare' : (selectedMaterial?.rarity || 'common')]}
                                </span>
                            </div>

                            {/* Item name */}
                            <h3 className={styles.invDetailName}>
                                {isWeapon ? selectedWeapon?.name : selectedMaterial?.name}
                            </h3>

                            {/* Large icon preview */}
                            <div className={styles.invDetailIconWrap}>
                                <ItemIcon itemId={selectedItem!} size={64} />
                            </div>

                            {/* Stats */}
                            {isWeapon && selectedWeapon && (
                                <div className={styles.invDetailStats}>
                                    <div className={styles.invDetailStat}>
                                        <span className={styles.invDetailStatIcon}>⚔</span>
                                        <span>{selectedWeapon.description}</span>
                                    </div>
                                    {selectedWeapon.specialEffect && (
                                        <div className={styles.invDetailStat}>
                                            <span className={styles.invDetailStatIcon}>◆</span>
                                            <span>{selectedWeapon.specialEffect}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedMaterial && (
                                <div className={styles.invDetailStats}>
                                    <div className={styles.invDetailStat}>
                                        <span className={styles.invDetailStatIcon}>◆</span>
                                        <span>Rarity: {selectedMaterial.rarity}</span>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <p className={styles.invDetailDesc}>
                                {isWeapon ? selectedWeapon?.descriptionJa : selectedMaterial?.nameJa}
                            </p>

                            {/* Stat bars */}
                            {isWeapon && selectedWeapon && (
                                <div className={styles.invDetailBars}>
                                    <div className={styles.invDetailBarRow}>
                                        <span className={styles.invDetailBarLabel}>POWER</span>
                                        <div className={styles.invDetailBar}>
                                            <div
                                                className={styles.invDetailBarFill}
                                                style={{
                                                    width: `${Math.min(100, (selectedWeapon.damageMultiplier - 1) * 200)}%`,
                                                    background: '#e53935',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.invDetailBarRow}>
                                        <span className={styles.invDetailBarLabel}>SPEED</span>
                                        <div className={styles.invDetailBar}>
                                            <div
                                                className={styles.invDetailBarFill}
                                                style={{ width: '60%', background: '#4caf50' }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.invDetailBarRow}>
                                        <span className={styles.invDetailBarLabel}>AREA</span>
                                        <div className={styles.invDetailBar}>
                                            <div
                                                className={styles.invDetailBarFill}
                                                style={{
                                                    width: selectedWeapon.specialEffect ? '70%' : '30%',
                                                    background: '#e53935',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Enchantments (for weapons) */}
                            {isWeapon && (
                                <div className={styles.invDetailEnchants}>
                                    <h4 className={styles.invDetailEnchantsTitle}>Enchantments</h4>
                                    <div className={styles.invDetailEnchantSlots}>
                                        <div className={styles.invDetailEnchantSlot}>
                                            {selectedWeapon?.specialEffect ? (
                                                <span className={styles.invDetailEnchantIcon}>✦</span>
                                            ) : (
                                                <span className={styles.invDetailEnchantEmpty}>◇</span>
                                            )}
                                        </div>
                                        <div className={styles.invDetailEnchantSlot}>
                                            <span className={styles.invDetailEnchantEmpty}>◇</span>
                                        </div>
                                        <div className={styles.invDetailEnchantSlot}>
                                            <span className={styles.invDetailEnchantEmpty}>◇</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.invDetailEmpty}>
                            <span className={styles.invDetailEmptyText}>Select an item</span>
                            <span className={styles.invDetailEmptySubtext}>アイテムを選択してください</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom action bar */}
            <div className={styles.invBottomBar}>
                <div className={styles.invBottomAction}>
                    <span className={styles.invBottomKey}>ESC</span>
                    <span className={styles.invBottomLabel}>Back</span>
                </div>
                <div className={styles.invBottomAction}>
                    <span className={styles.invBottomKey}>E</span>
                    <span className={styles.invBottomLabel}>Quick Equip</span>
                </div>
                <div className={styles.invBottomAction}>
                    <span className={styles.invBottomKey}>X</span>
                    <span className={styles.invBottomLabel}>Salvage</span>
                </div>
                <div className={styles.invBottomAction}>
                    <span className={styles.invBottomKey}>A</span>
                    <span className={styles.invBottomLabel}>Pick Up</span>
                </div>
            </div>
        </div>
    );
}
