import React, { useState, useMemo } from 'react';
import type { InventoryItem, CraftedCard } from '../types';
import { SHOP_ITEMS, SHOP_ITEM_MAP, ITEM_MAP, WEAPON_CARD_MAP } from '../constants';
import { ItemIcon } from './ItemIcon';
import styles from '../VanillaGame.module.css';

interface ShopUIProps {
    gold: number;
    inventory: InventoryItem[];
    craftedCards: CraftedCard[];
    onPurchase: (itemId: string, price: number) => boolean;
    onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
    common: '#8B8B8B',
    uncommon: '#4FC3F7',
    rare: '#FFD700',
    epic: '#9C27B0',
    legendary: '#FFFFFF',
};

/**
 * Full-screen shop overlay styled like League of Legends shop.
 * - Left: Tabs + item grid with search
 * - Right: Selected item details with build tree + purchase button
 */
export function ShopUI({ gold, inventory, craftedCards, onPurchase, onClose }: ShopUIProps) {
    const [tab, setTab] = useState<'recommended' | 'all'>('recommended');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Recommended items = weapons the player hasn't crafted yet
    const recommendedItems = useMemo(() => {
        const craftedIds = new Set(craftedCards.map(cc => cc.cardId));
        return SHOP_ITEMS.filter(item =>
            item.category === 'weapon' && !craftedIds.has(item.id)
        );
    }, [craftedCards]);

    // Filtered items based on tab and search
    const displayItems = useMemo(() => {
        const items = tab === 'recommended' ? recommendedItems : SHOP_ITEMS;
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(item =>
            item.name.toLowerCase().includes(q) ||
            item.nameJa.includes(q) ||
            item.category.includes(q)
        );
    }, [tab, search, recommendedItems]);

    // Selected item detail
    const selected = selectedId ? SHOP_ITEM_MAP[selectedId] : null;
    const alreadyOwned = selectedId ? (
        WEAPON_CARD_MAP[selectedId]
            ? craftedCards.some(cc => cc.cardId === selectedId)
            : false
    ) : false;
    const canAfford = selected ? gold >= selected.price : false;

    // "Commonly Built" — most popular weapons (the first 8)
    const commonlyBuilt = SHOP_ITEMS.slice(0, 8);

    const handlePurchase = () => {
        if (!selected || alreadyOwned || !canAfford) return;
        const success = onPurchase(selected.id, selected.price);
        if (success && selected.category === 'weapon') {
            // Weapon purchased — clear selection
            setSelectedId(null);
        }
    };

    return (
        <div className={styles.shopOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.shopPanel}>
                {/* Close button */}
                <button className={styles.shopClose} onClick={onClose}>✕</button>

                {/* Left section: Tabs + Items */}
                <div className={styles.shopLeft}>
                    {/* Tab bar */}
                    <div className={styles.shopTabs}>
                        <button
                            className={`${styles.shopTab} ${tab === 'recommended' ? styles.shopTabActive : ''}`}
                            onClick={() => setTab('recommended')}
                        >
                            RECOMMENDED
                        </button>
                        <button
                            className={`${styles.shopTab} ${tab === 'all' ? styles.shopTabActive : ''}`}
                            onClick={() => setTab('all')}
                        >
                            ALL ITEMS
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className={styles.shopSearchWrap}>
                        <span className={styles.shopSearchIcon}>🔍</span>
                        <input
                            className={styles.shopSearch}
                            type="text"
                            placeholder="Click Here to Search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Item section header */}
                    <div className={styles.shopSectionTitle}>
                        SELECT AN ITEM TO BUILD
                    </div>

                    {/* Item cards grid */}
                    <div className={styles.shopItemGrid}>
                        {displayItems.map(item => {
                            const isSelected = selectedId === item.id;
                            const owned = item.category === 'weapon'
                                ? craftedCards.some(cc => cc.cardId === item.id)
                                : false;

                            return (
                                <div
                                    key={item.id}
                                    className={`${styles.shopItemCard} ${isSelected ? styles.shopItemSelected : ''} ${owned ? styles.shopItemOwned : ''}`}
                                    onClick={() => setSelectedId(item.id)}
                                >
                                    {/* Item name */}
                                    <div className={styles.shopItemName}>{item.name}</div>

                                    {/* Item icon */}
                                    <div className={styles.shopItemIconWrap}>
                                        <ItemIcon itemId={item.id} size={48} />
                                    </div>

                                    {/* Price */}
                                    <div className={styles.shopItemPrice}>
                                        <span className={styles.shopGoldIcon}>⚙</span>
                                        <span>{item.price.toLocaleString()}</span>
                                    </div>

                                    {/* Tag / category label */}
                                    <div className={styles.shopItemTag}>
                                        {item.category === 'weapon' ? item.stats?.[1]?.value || 'Weapon' : 'Material'}
                                    </div>

                                    {/* Info icon */}
                                    <div className={styles.shopItemInfo}>
                                        <span className={styles.shopItemInfoIcon}>ⓘ</span>
                                    </div>

                                    {/* Generally Good label */}
                                    <div className={styles.shopItemRating}>Generally Good</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Commonly Built bar */}
                    <div className={styles.shopCommonlyBuilt}>
                        <div className={styles.shopCommonlyBuiltLabel}>COMMONLY BUILT</div>
                        <div className={styles.shopCommonlyBuiltItems}>
                            {commonlyBuilt.map(item => (
                                <div
                                    key={item.id}
                                    className={`${styles.shopCommonItem} ${selectedId === item.id ? styles.shopCommonItemActive : ''}`}
                                    onClick={() => setSelectedId(item.id)}
                                >
                                    <ItemIcon itemId={item.id} size={28} />
                                    <span className={styles.shopCommonPrice}>{item.price.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom bar: Sell, Undo, Gold */}
                    <div className={styles.shopBottomBar}>
                        <button className={styles.shopSellBtn}>SELL</button>
                        <button className={styles.shopUndoBtn}>UNDO</button>
                        <div className={styles.shopGoldDisplay}>
                            <span className={styles.shopGoldIcon}>⚙</span>
                            <span className={styles.shopGoldAmount}>{gold.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Right section: Build tree + Details */}
                <div className={styles.shopRight}>
                    {selected ? (
                        <>
                            {/* BUILDS INTO header */}
                            <div className={styles.shopBuildsIntoLabel}>BUILDS INTO</div>
                            <div className={styles.shopBuildsIntoGrid}>
                                {/* Placeholder build targets - show empty slots */}
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className={styles.shopBuildSlot} />
                                ))}
                            </div>

                            {/* Build tree visualization */}
                            <div className={styles.shopBuildTree}>
                                {/* Main item at top */}
                                <div className={styles.shopBuildTreeMain}>
                                    <div className={styles.shopBuildTreeIcon}>
                                        <ItemIcon itemId={selected.id} size={48} />
                                    </div>
                                    <span className={styles.shopBuildTreePrice}>
                                        <span className={styles.shopGoldIcon}>⚙</span>{selected.price.toLocaleString()}
                                    </span>
                                </div>

                                {/* Connector lines */}
                                {selected.buildsFrom && selected.buildsFrom.length > 0 && (
                                    <>
                                        <div className={styles.shopBuildTreeLine} />
                                        <div className={styles.shopBuildTreeComponents}>
                                            {selected.buildsFrom.map((comp, i) => {
                                                const compItem = ITEM_MAP[comp.itemId] || SHOP_ITEM_MAP[comp.itemId];
                                                if (!compItem) return null;
                                                return (
                                                    <div key={i} className={styles.shopBuildTreeComp}>
                                                        <div className={styles.shopBuildTreeCompIcon}>
                                                            <ItemIcon itemId={comp.itemId} size={32} />
                                                        </div>
                                                        <span className={styles.shopBuildTreeCompPrice}>
                                                            <span className={styles.shopGoldIcon}>⚙</span>{comp.price.toLocaleString()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {/* Extra slot for recipe cost */}
                                            <div className={styles.shopBuildTreeComp}>
                                                <div className={styles.shopBuildTreeCompIcon} style={{ borderColor: 'rgba(255,215,0,0.3)' }}>
                                                    <span style={{ fontSize: '16px', color: 'rgba(255,215,0,0.6)' }}>⚙</span>
                                                </div>
                                                <span className={styles.shopBuildTreeCompPrice}>
                                                    <span className={styles.shopGoldIcon}>⚙</span>
                                                    {(selected.price - (selected.buildsFrom?.reduce((s, c) => s + c.price, 0) || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Purchase button */}
                            <button
                                className={`${styles.shopPurchaseBtn} ${canAfford && !alreadyOwned ? styles.shopPurchaseBtnActive : ''}`}
                                disabled={!canAfford || alreadyOwned}
                                onClick={handlePurchase}
                            >
                                {alreadyOwned ? 'OWNED' : 'PURCHASE ITEM'}
                            </button>

                            {/* Item detail panel */}
                            <div className={styles.shopDetailPanel}>
                                <div className={styles.shopDetailHeader}>
                                    <div className={styles.shopDetailIcon}>
                                        <ItemIcon itemId={selected.id} size={32} />
                                    </div>
                                    <div className={styles.shopDetailInfo}>
                                        <span className={styles.shopDetailName}>{selected.name}</span>
                                        <span className={styles.shopDetailPrice}>
                                            <span className={styles.shopGoldIcon}>⚙</span> {selected.price.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Stats */}
                                {selected.stats && (
                                    <div className={styles.shopDetailStats}>
                                        {selected.stats.map((stat, i) => (
                                            <div key={i} className={styles.shopDetailStatRow}>
                                                <span className={styles.shopDetailStatIcon}>
                                                    {stat.label === 'Damage' ? '⚔' :
                                                     stat.label === 'Special' ? '◆' :
                                                     stat.label === 'Type' ? '◉' : '○'}
                                                </span>
                                                <span className={styles.shopDetailStatValue}>{stat.value}</span>
                                                <span className={styles.shopDetailStatLabel}>{stat.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Description / passive */}
                                <div className={styles.shopDetailPassive}>
                                    <div className={styles.shopDetailPassiveName}>{selected.nameJa}</div>
                                    <p className={styles.shopDetailPassiveDesc}>{selected.descriptionJa}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.shopEmptyDetail}>
                            <span>Select an item to view details</span>
                            <span className={styles.shopEmptyDetailSub}>アイテムを選択してください</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
