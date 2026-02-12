import React, { useState } from 'react';
import type { InventoryItem, CraftedCard } from '../types';
import { ITEMS, ITEM_MAP, WEAPON_CARD_MAP } from '../constants';
import { ItemIcon, WeaponIcon } from './ItemIcon';
import styles from '../VanillaGame.module.css';

interface InventoryUIProps {
    inventory: InventoryItem[];
    craftedCards: CraftedCard[];
    damageMultiplier: number;
    onClose: () => void;
    closeKey: string;
}

type TabFilter = 'all' | 'materials' | 'weapons';

const RARITY_COLORS: Record<string, string> = {
    common: '#8B8B8B',
    uncommon: '#4FC3F7',
    rare: '#FFD700',
    epic: '#CE93D8',
    legendary: '#FFFFFF',
};

const RARITY_LABEL: Record<string, string> = {
    common: 'COMMON',
    uncommon: 'UNCOMMON',
    rare: 'RARE',
    epic: 'EPIC',
    legendary: 'LEGENDARY',
};

/**
 * Full-screen inventory overlay — Minecraft Dungeons style.
 * Left: character/equipment display. Center: item grid. Right: selected item detail.
 */
export function InventoryUI({ inventory, craftedCards, damageMultiplier, onClose, closeKey }: InventoryUIProps) {
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [selectedWeapon, setSelectedWeapon] = useState<string | null>(null);
    const [tab, setTab] = useState<TabFilter>('all');

    const selectedItemDef = selectedItem ? ITEM_MAP[selectedItem] : null;
    const selectedWeaponDef = selectedWeapon ? WEAPON_CARD_MAP[selectedWeapon] : null;
    const selectedInv = selectedItem ? inventory.find(i => i.itemId === selectedItem) : null;

    // Build display list based on tab
    const showMaterials = tab === 'all' || tab === 'materials';
    const showWeapons = tab === 'all' || tab === 'weapons';

    return (
        <div className={styles.inventoryOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.invPanel}>
                {/* Header with tabs */}
                <div className={styles.invHeader}>
                    <div className={styles.invTitle}>INVENTORY</div>
                    <div className={styles.invTabs}>
                        <button
                            className={`${styles.invTab} ${tab === 'all' ? styles.invTabActive : ''}`}
                            onClick={() => setTab('all')}
                        >All</button>
                        <button
                            className={`${styles.invTab} ${tab === 'materials' ? styles.invTabActive : ''}`}
                            onClick={() => setTab('materials')}
                        >Materials</button>
                        <button
                            className={`${styles.invTab} ${tab === 'weapons' ? styles.invTabActive : ''}`}
                            onClick={() => setTab('weapons')}
                        >Weapons</button>
                    </div>
                    <button className={styles.invClose} onClick={onClose}>
                        {closeKey.toUpperCase()}
                    </button>
                </div>

                <div className={styles.invBody}>
                    {/* Left panel — character & equipped weapons */}
                    <div className={styles.invLeft}>
                        {/* Equipment slots around character */}
                        <div className={styles.invEquipSlots}>
                            {/* Top row: weapon slots */}
                            <div className={styles.invEquipRow}>
                                {craftedCards.length > 0 ? (
                                    craftedCards.slice(0, 3).map((cc, idx) => {
                                        const card = WEAPON_CARD_MAP[cc.cardId];
                                        if (!card) return null;
                                        return (
                                            <div
                                                key={idx}
                                                className={`${styles.invEquipSlot} ${selectedWeapon === cc.cardId ? styles.invEquipSlotSelected : ''}`}
                                                style={{ borderColor: `${card.color}60` }}
                                                onClick={() => {
                                                    setSelectedWeapon(cc.cardId);
                                                    setSelectedItem(null);
                                                }}
                                            >
                                                <WeaponIcon cardId={cc.cardId} size={24} glowColor={card.glowColor} />
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className={styles.invEquipSlotEmpty}>
                                        <span className={styles.invEquipSlotPlus}>+</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Character display */}
                        <div className={styles.invCharacter}>
                            <div className={styles.invCharLevelBadge}>
                                <span className={styles.invCharLevelLabel}>LEVEL</span>
                                <span className={styles.invCharLevelNum}>{Math.floor(damageMultiplier * 10)}</span>
                            </div>
                            <div className={styles.invCharIcon}>&#x2694;</div>
                            <div className={styles.invCharPower}>
                                <span className={styles.invCharPowerLabel}>POWER</span>
                                <span className={styles.invCharPowerNum}>{craftedCards.length}</span>
                            </div>
                        </div>

                        {/* Bottom equipment slots */}
                        <div className={styles.invEquipRow}>
                            {craftedCards.slice(3, 6).map((cc, idx) => {
                                const card = WEAPON_CARD_MAP[cc.cardId];
                                if (!card) return null;
                                return (
                                    <div
                                        key={idx}
                                        className={`${styles.invEquipSlot} ${selectedWeapon === cc.cardId ? styles.invEquipSlotSelected : ''}`}
                                        style={{ borderColor: `${card.color}60` }}
                                        onClick={() => {
                                            setSelectedWeapon(cc.cardId);
                                            setSelectedItem(null);
                                        }}
                                    >
                                        <WeaponIcon cardId={cc.cardId} size={24} glowColor={card.glowColor} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Center — item grid */}
                    <div className={styles.invCenter}>
                        <div className={styles.invGrid}>
                            {/* Material items */}
                            {showMaterials && inventory.map(inv => {
                                const item = ITEM_MAP[inv.itemId];
                                if (!item) return null;
                                const isSelected = selectedItem === inv.itemId;
                                return (
                                    <div
                                        key={inv.itemId}
                                        className={`${styles.invSlot} ${isSelected ? styles.invSlotSelected : ''}`}
                                        style={{
                                            borderColor: isSelected ? item.color : `${RARITY_COLORS[item.rarity]}30`,
                                            background: isSelected
                                                ? `linear-gradient(135deg, ${item.color}20, transparent)`
                                                : undefined,
                                        }}
                                        onClick={() => {
                                            setSelectedItem(inv.itemId);
                                            setSelectedWeapon(null);
                                        }}
                                    >
                                        {/* Rarity indicator */}
                                        <div className={styles.invSlotRarityBar} style={{ background: RARITY_COLORS[item.rarity] }} />
                                        <div className={styles.invSlotIcon}>
                                            <ItemIcon itemId={inv.itemId} size={28} />
                                        </div>
                                        {/* Count badge */}
                                        <div className={styles.invSlotCount}>
                                            {inv.count}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Weapon cards */}
                            {showWeapons && craftedCards.map((cc, idx) => {
                                const card = WEAPON_CARD_MAP[cc.cardId];
                                if (!card) return null;
                                const isSelected = selectedWeapon === cc.cardId;
                                return (
                                    <div
                                        key={`w-${idx}`}
                                        className={`${styles.invSlot} ${isSelected ? styles.invSlotSelected : ''}`}
                                        style={{
                                            borderColor: isSelected ? card.color : `${card.color}30`,
                                            background: isSelected
                                                ? `linear-gradient(135deg, ${card.color}20, transparent)`
                                                : undefined,
                                        }}
                                        onClick={() => {
                                            setSelectedWeapon(cc.cardId);
                                            setSelectedItem(null);
                                        }}
                                    >
                                        <div className={styles.invSlotRarityBar} style={{ background: card.color }} />
                                        <div className={styles.invSlotIcon}>
                                            <WeaponIcon cardId={cc.cardId} size={28} glowColor={card.glowColor} />
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Empty slots */}
                            {Array.from({ length: Math.max(0, 9 - inventory.length - (showWeapons ? craftedCards.length : 0)) }).map((_, i) => (
                                <div key={`empty-${i}`} className={styles.invSlotEmpty}>
                                    <div className={styles.invSlotEmptyX}>&times;</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right panel — selected item detail */}
                    <div className={styles.invRight}>
                        {selectedItemDef && selectedInv && (
                            <>
                                <div className={styles.invDetailHeader}>
                                    <div className={styles.invDetailIcon}>
                                        <ItemIcon itemId={selectedItem!} size={48} />
                                    </div>
                                    <div>
                                        <div className={styles.invDetailRarityBadge} style={{ color: RARITY_COLORS[selectedItemDef.rarity] }}>
                                            {RARITY_LABEL[selectedItemDef.rarity]}
                                        </div>
                                        <div className={styles.invDetailName}>{selectedItemDef.name}</div>
                                        <div className={styles.invDetailNameJa}>{selectedItemDef.nameJa}</div>
                                    </div>
                                </div>
                                <div className={styles.invDetailDivider} />
                                <div className={styles.invDetailStats}>
                                    <div className={styles.invDetailStat}>
                                        <span className={styles.invDetailStatLabel}>Quantity</span>
                                        <span className={styles.invDetailStatValue}>{selectedInv.count}</span>
                                    </div>
                                    <div className={styles.invDetailStat}>
                                        <span className={styles.invDetailStatLabel}>Rarity</span>
                                        <span className={styles.invDetailStatValue} style={{ color: RARITY_COLORS[selectedItemDef.rarity] }}>
                                            {RARITY_LABEL[selectedItemDef.rarity]}
                                        </span>
                                    </div>
                                    <div className={styles.invDetailStat}>
                                        <span className={styles.invDetailStatLabel}>Drop Rate</span>
                                        <div className={styles.invDetailStatBar}>
                                            <div
                                                className={styles.invDetailStatBarFill}
                                                style={{
                                                    width: `${(selectedItemDef.dropWeight / 40) * 100}%`,
                                                    background: selectedItemDef.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.invDetailDivider} />
                                <div className={styles.invDetailDesc}>
                                    Crafting material used to forge weapon cards at the FORGE.
                                </div>
                            </>
                        )}

                        {selectedWeaponDef && (
                            <>
                                <div className={styles.invDetailHeader}>
                                    <div className={styles.invDetailIcon}>
                                        <WeaponIcon cardId={selectedWeapon!} size={48} glowColor={selectedWeaponDef.glowColor} />
                                    </div>
                                    <div>
                                        <div className={styles.invDetailRarityBadge} style={{ color: selectedWeaponDef.color }}>
                                            EQUIPPED
                                        </div>
                                        <div className={styles.invDetailName}>{selectedWeaponDef.name}</div>
                                        <div className={styles.invDetailNameJa}>{selectedWeaponDef.nameJa}</div>
                                    </div>
                                </div>
                                <div className={styles.invDetailDivider} />
                                <div className={styles.invDetailStats}>
                                    <div className={styles.invDetailStat}>
                                        <span className={styles.invDetailStatLabel}>Damage</span>
                                        <span className={styles.invDetailStatValue} style={{ color: '#FF6B6B' }}>
                                            +{Math.round((selectedWeaponDef.damageMultiplier - 1) * 100)}%
                                        </span>
                                    </div>
                                    {selectedWeaponDef.specialEffect && (
                                        <div className={styles.invDetailStat}>
                                            <span className={styles.invDetailStatLabel}>Special</span>
                                            <span className={styles.invDetailStatValue} style={{ color: '#CE93D8' }}>
                                                {selectedWeaponDef.specialEffect}
                                            </span>
                                        </div>
                                    )}
                                    <div className={styles.invDetailStat}>
                                        <span className={styles.invDetailStatLabel}>Power</span>
                                        <div className={styles.invDetailStatBar}>
                                            <div
                                                className={styles.invDetailStatBarFill}
                                                style={{
                                                    width: `${((selectedWeaponDef.damageMultiplier - 1) / 0.8) * 100}%`,
                                                    background: '#FF6B6B',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.invDetailDivider} />
                                <div className={styles.invDetailDesc}>{selectedWeaponDef.description}</div>
                                <div className={styles.invDetailDescJa}>{selectedWeaponDef.descriptionJa}</div>
                            </>
                        )}

                        {!selectedItemDef && !selectedWeaponDef && (
                            <div className={styles.invDetailEmpty}>
                                Select an item to view details
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom action bar */}
                <div className={styles.invBottomBar}>
                    <div className={styles.invBottomAction}>
                        <span className={styles.invBottomKey}>{closeKey.toUpperCase()}</span>
                        <span className={styles.invBottomLabel}>Back</span>
                    </div>
                    {damageMultiplier > 1 && (
                        <div className={styles.invBottomDmg}>
                            Total Damage: x{damageMultiplier.toFixed(1)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
