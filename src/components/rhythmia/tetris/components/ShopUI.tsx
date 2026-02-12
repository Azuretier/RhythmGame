import React, { useState } from 'react';
import type { InventoryItem, CraftedCard } from '../types';
import { SHOP_ITEMS, ITEM_MAP, WEAPON_CARD_MAP } from '../constants';
import { ItemIcon, WeaponIcon } from './ItemIcon';
import styles from '../VanillaGame.module.css';

interface ShopUIProps {
    inventory: InventoryItem[];
    craftedCards: CraftedCard[];
    onPurchase: (cardId: string) => boolean;
    canPurchase: (cardId: string) => boolean;
    onClose: () => void;
    closeKey: string;
}

const RARITY_COLORS: Record<string, string> = {
    common: '#8B8B8B',
    uncommon: '#4FC3F7',
    rare: '#FFD700',
    epic: '#CE93D8',
    legendary: '#FFFFFF',
};

/**
 * Full-screen shop overlay.
 * Layout: Left = item build tree + purchase button, Right = item detail panel.
 * Scrollable item list for expansion.
 */
export function ShopUI({ inventory, craftedCards, onPurchase, canPurchase, onClose, closeKey }: ShopUIProps) {
    const [selectedId, setSelectedId] = useState<string | null>(SHOP_ITEMS[0]?.id || null);

    const selectedItem = SHOP_ITEMS.find(i => i.id === selectedId) || null;
    const alreadyOwned = selectedItem ? craftedCards.some(cc => cc.cardId === selectedItem.id) : false;
    const canBuy = selectedItem ? canPurchase(selectedItem.id) : false;

    return (
        <div className={styles.shopOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.shopPanel}>
                {/* Header */}
                <div className={styles.shopHeader}>
                    <div className={styles.shopTitle}>WEAPON SHOP</div>
                    <div className={styles.shopSubtitle}>素材を使って武器を購入</div>
                    <button className={styles.shopClose} onClick={onClose}>
                        {closeKey.toUpperCase()}
                    </button>
                </div>

                <div className={styles.shopBody}>
                    {/* Left panel — scrollable item list */}
                    <div className={styles.shopLeft}>
                        {/* Current materials bar */}
                        <div className={styles.shopMaterials}>
                            {inventory.map(inv => {
                                const item = ITEM_MAP[inv.itemId];
                                if (!item) return null;
                                return (
                                    <div key={inv.itemId} className={styles.shopMaterialChip}>
                                        <ItemIcon itemId={inv.itemId} size={14} />
                                        <span className={styles.shopMaterialCount}>{inv.count}</span>
                                    </div>
                                );
                            })}
                            {inventory.length === 0 && (
                                <span className={styles.shopMaterialEmpty}>No materials</span>
                            )}
                        </div>

                        {/* Scrollable item list */}
                        <div className={styles.shopItemList}>
                            {SHOP_ITEMS.map(item => {
                                const owned = craftedCards.some(cc => cc.cardId === item.id);
                                const affordable = canPurchase(item.id);
                                const isSelected = selectedId === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        className={`${styles.shopItemRow} ${isSelected ? styles.shopItemRowSelected : ''} ${owned ? styles.shopItemRowOwned : ''}`}
                                        onClick={() => setSelectedId(item.id)}
                                    >
                                        <div className={styles.shopItemRowLeft}>
                                            <div
                                                className={styles.shopItemRowIcon}
                                                style={{ borderColor: `${item.color}40` }}
                                            >
                                                <ItemIcon itemId={item.id} size={24} />
                                            </div>
                                            <div className={styles.shopItemRowInfo}>
                                                <div className={styles.shopItemRowName}>{item.name}</div>
                                                <div className={styles.shopItemRowNameJa}>{item.nameJa}</div>
                                            </div>
                                        </div>
                                        <div className={styles.shopItemRowRight}>
                                            {owned ? (
                                                <span className={styles.shopOwnedBadge}>OWNED</span>
                                            ) : (
                                                <div className={styles.shopItemRowCost}>
                                                    {item.cost.map((c, i) => {
                                                        const matItem = ITEM_MAP[c.itemId];
                                                        if (!matItem) return null;
                                                        const owned = inventory.find(inv => inv.itemId === c.itemId)?.count || 0;
                                                        const enough = owned >= c.count;
                                                        return (
                                                            <span key={i} className={`${styles.shopCostChip} ${enough ? styles.shopCostEnough : ''}`}>
                                                                <ItemIcon itemId={c.itemId} size={10} />
                                                                <span>{c.count}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right panel — selected item detail */}
                    {selectedItem && (
                        <div className={styles.shopRight}>
                            {/* Build tree */}
                            <div className={styles.shopBuildTree}>
                                {/* Result item at top */}
                                <div className={styles.shopTreeResult}>
                                    <div
                                        className={styles.shopTreeNode}
                                        style={{ borderColor: selectedItem.color }}
                                    >
                                        <ItemIcon itemId={selectedItem.id} size={32} />
                                    </div>
                                </div>

                                {/* Connector line */}
                                <div className={styles.shopTreeConnector} />

                                {/* Component items */}
                                <div className={styles.shopTreeComponents}>
                                    {selectedItem.cost.map((c, i) => {
                                        const matItem = ITEM_MAP[c.itemId];
                                        if (!matItem) return null;
                                        const ownedCount = inventory.find(inv => inv.itemId === c.itemId)?.count || 0;
                                        const enough = ownedCount >= c.count;
                                        return (
                                            <div key={i} className={styles.shopTreeComponentWrap}>
                                                <div
                                                    className={`${styles.shopTreeNode} ${enough ? styles.shopTreeNodeEnough : ''}`}
                                                    style={{ borderColor: enough ? matItem.color : `${matItem.color}40` }}
                                                >
                                                    <ItemIcon itemId={c.itemId} size={20} />
                                                </div>
                                                <span className={`${styles.shopTreeCost} ${enough ? styles.shopTreeCostEnough : ''}`}>
                                                    {ownedCount}/{c.count}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Purchase button */}
                            <button
                                className={`${styles.shopPurchaseBtn} ${canBuy && !alreadyOwned ? styles.shopPurchaseBtnActive : ''}`}
                                disabled={!canBuy || alreadyOwned}
                                onClick={() => {
                                    if (selectedItem.producesCardId && canBuy) {
                                        onPurchase(selectedItem.producesCardId);
                                    }
                                }}
                            >
                                {alreadyOwned ? 'OWNED' : 'PURCHASE ITEM'}
                            </button>

                            {/* Item info panel (LoL style) */}
                            <div className={styles.shopDetailCard}>
                                <div className={styles.shopDetailTop}>
                                    <div className={styles.shopDetailIcon}>
                                        <ItemIcon itemId={selectedItem.id} size={36} />
                                    </div>
                                    <div>
                                        <div className={styles.shopDetailName}>{selectedItem.name}</div>
                                        <div className={styles.shopDetailNameJa}>{selectedItem.nameJa}</div>
                                    </div>
                                </div>

                                <div className={styles.shopDetailDivider} />

                                {/* Stats */}
                                <div className={styles.shopDetailStats}>
                                    {selectedItem.stats.map((stat, i) => (
                                        <div key={i} className={styles.shopDetailStat}>
                                            <span className={styles.shopDetailStatIcon} style={{ color: stat.color || '#fff' }}>&#x25C6;</span>
                                            <span className={styles.shopDetailStatValue} style={{ color: stat.color || '#fff' }}>{stat.value}</span>
                                            <span className={styles.shopDetailStatLabel}>{stat.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.shopDetailDivider} />

                                {/* Description */}
                                <div className={styles.shopDetailDesc}>
                                    <div className={styles.shopDetailDescTitle}>{selectedItem.description}</div>
                                    <div className={styles.shopDetailDescBody}>{selectedItem.descriptionJa}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
