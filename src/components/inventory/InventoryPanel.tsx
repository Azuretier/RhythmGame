'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useInventory } from '@/lib/inventory/context';
import { ITEM_REGISTRY } from '@/lib/items/registry';
import { RARITY_CONFIG, CATEGORY_CONFIG } from '@/lib/items/types';
import type { ItemRarity, ItemCategory, InventoryEntry } from '@/lib/items/types';
import type { InventoryFilterType, InventorySortType } from '@/lib/inventory/types';
import { ItemTexture } from '@/components/items/ItemTexture';
import { RarityBadge } from '@/components/items/RarityBadge';
import { cn } from '@/lib/utils';
import styles from './inventory.module.css';

interface InventoryPanelProps {
    onClose: () => void;
}

/** Rarity sort order (higher = rarer) */
const RARITY_ORDER: Record<ItemRarity, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
};

/** Category sort order */
const CATEGORY_ORDER: Record<ItemCategory, number> = {
    currency: 0,
    material: 1,
    consumable: 2,
    equipment: 3,
    relic: 4,
};

const FILTER_BUTTONS: { key: InventoryFilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '📦' },
    { key: 'material', label: 'Materials', icon: '⛏️' },
    { key: 'consumable', label: 'Consumables', icon: '🧪' },
    { key: 'equipment', label: 'Equipment', icon: '⚔️' },
    { key: 'relic', label: 'Relics', icon: '🏛️' },
    { key: 'currency', label: 'Currency', icon: '💰' },
];

const SORT_BUTTONS: { key: InventorySortType; label: string }[] = [
    { key: 'category', label: 'Category' },
    { key: 'rarity', label: 'Rarity' },
    { key: 'count', label: 'Count' },
    { key: 'name', label: 'Name' },
];

/**
 * Full-screen inventory management panel.
 * Displays all collected items with filtering, sorting, and detail view.
 */
export function InventoryPanel({ onClose }: InventoryPanelProps) {
    const { state, useItem, removeItem } = useInventory();
    const t = useTranslations('inventory');
    const locale = useLocale();

    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [filter, setFilter] = useState<InventoryFilterType>('all');
    const [sort, setSort] = useState<InventorySortType>('category');
    const [toast, setToast] = useState<string | null>(null);
    const [discardConfirm, setDiscardConfirm] = useState<string | null>(null);

    // Filtered and sorted items
    const displayedItems = useMemo(() => {
        let items = [...state.items];

        // Filter by category
        if (filter !== 'all') {
            items = items.filter(entry => {
                const def = ITEM_REGISTRY[entry.itemId];
                return def?.category === filter;
            });
        }

        // Sort
        switch (sort) {
            case 'category':
                items.sort((a, b) => {
                    const defA = ITEM_REGISTRY[a.itemId];
                    const defB = ITEM_REGISTRY[b.itemId];
                    if (!defA || !defB) return 0;
                    const catDiff = CATEGORY_ORDER[defA.category] - CATEGORY_ORDER[defB.category];
                    if (catDiff !== 0) return catDiff;
                    return RARITY_ORDER[defB.rarity] - RARITY_ORDER[defA.rarity];
                });
                break;
            case 'rarity':
                items.sort((a, b) => {
                    const defA = ITEM_REGISTRY[a.itemId];
                    const defB = ITEM_REGISTRY[b.itemId];
                    if (!defA || !defB) return 0;
                    return RARITY_ORDER[defB.rarity] - RARITY_ORDER[defA.rarity];
                });
                break;
            case 'count':
                items.sort((a, b) => b.count - a.count);
                break;
            case 'name':
                items.sort((a, b) => {
                    const defA = ITEM_REGISTRY[a.itemId];
                    const defB = ITEM_REGISTRY[b.itemId];
                    if (!defA || !defB) return 0;
                    const nameA = locale === 'ja' ? defA.nameJa : defA.name;
                    const nameB = locale === 'ja' ? defB.nameJa : defB.name;
                    return nameA.localeCompare(nameB);
                });
                break;
        }

        return items;
    }, [state.items, filter, sort, locale]);

    // Selected item details
    const selectedEntry = useMemo(
        () => state.items.find(e => e.itemId === selectedItemId),
        [state.items, selectedItemId],
    );
    const selectedDef = selectedItemId ? ITEM_REGISTRY[selectedItemId] : undefined;

    const handleUse = useCallback(() => {
        if (!selectedItemId) return;
        const success = useItem(selectedItemId);
        if (success) {
            const def = ITEM_REGISTRY[selectedItemId];
            const name = locale === 'ja' ? def?.nameJa : def?.name;
            setToast(t('usedItem', { name: name ?? selectedItemId }));
            setTimeout(() => setToast(null), 2500);

            // Deselect if count reaches 0
            const remaining = state.items.find(e => e.itemId === selectedItemId);
            if (!remaining || remaining.count <= 1) {
                setSelectedItemId(null);
            }
        }
    }, [selectedItemId, useItem, locale, t, state.items]);

    const handleDiscardConfirm = useCallback(() => {
        if (!discardConfirm) return;
        removeItem(discardConfirm, 1);
        const def = ITEM_REGISTRY[discardConfirm];
        const name = locale === 'ja' ? def?.nameJa : def?.name;
        setToast(t('discardedItem', { name: name ?? discardConfirm }));
        setDiscardConfirm(null);
        setTimeout(() => setToast(null), 2500);

        // Deselect if count reaches 0
        const remaining = state.items.find(e => e.itemId === discardConfirm);
        if (!remaining || remaining.count <= 1) {
            setSelectedItemId(null);
        }
    }, [discardConfirm, removeItem, locale, t, state.items]);

    // Total item count
    const totalItemCount = useMemo(
        () => state.items.reduce((sum, e) => sum + e.count, 0),
        [state.items],
    );

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className={styles.panel}
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
            >
                {/* ── Header ── */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <span className={styles.headerIcon}>📦</span>
                        <h2 className={styles.headerTitle}>{t('title')}</h2>
                        <span className={styles.headerSlots}>
                            {state.items.length}/{state.maxSlots}
                        </span>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* ── Filters & Sort ── */}
                <div className={styles.toolbar}>
                    <div className={styles.filterGroup}>
                        {FILTER_BUTTONS.map(btn => (
                            <button
                                key={btn.key}
                                onClick={() => setFilter(btn.key)}
                                className={cn(
                                    styles.filterBtn,
                                    filter === btn.key && styles.filterBtnActive,
                                )}
                            >
                                <span style={{ marginRight: 4 }}>{btn.icon}</span>
                                {t(`filter.${btn.key}`)}
                            </button>
                        ))}
                    </div>

                    <div className={styles.separator} />

                    <div className={styles.sortGroup}>
                        <span className={styles.sortLabel}>{t('sort')}:</span>
                        {SORT_BUTTONS.map(btn => (
                            <button
                                key={btn.key}
                                onClick={() => setSort(btn.key)}
                                className={cn(
                                    styles.sortBtn,
                                    sort === btn.key && styles.sortBtnActive,
                                )}
                            >
                                {t(`sortBy.${btn.key}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className={styles.content}>
                    {/* Item Grid */}
                    <div className={styles.gridArea}>
                        {displayedItems.length === 0 ? (
                            <div className={styles.emptyState}>
                                <span className={styles.emptyIcon}>📦</span>
                                <span className={styles.emptyTitle}>{t('empty.title')}</span>
                                <span className={styles.emptyDesc}>{t('empty.desc')}</span>
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                <AnimatePresence mode="popLayout">
                                    {displayedItems.map(entry => {
                                        const def = ITEM_REGISTRY[entry.itemId];
                                        if (!def) return null;

                                        const rarityConf = RARITY_CONFIG[def.rarity];
                                        const isSelected = selectedItemId === entry.itemId;
                                        const itemName = locale === 'ja' ? def.nameJa : def.name;

                                        return (
                                            <motion.button
                                                key={entry.itemId}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ duration: 0.15 }}
                                                onClick={() => setSelectedItemId(
                                                    isSelected ? null : entry.itemId,
                                                )}
                                                className={cn(
                                                    styles.itemButton,
                                                    isSelected && styles.itemButtonSelected,
                                                )}
                                                style={{
                                                    borderColor: isSelected
                                                        ? `${rarityConf.color}80`
                                                        : undefined,
                                                    boxShadow: isSelected && rarityConf.glowIntensity > 0
                                                        ? `0 0 ${12 * rarityConf.glowIntensity}px ${rarityConf.color}40`
                                                        : undefined,
                                                }}
                                            >
                                                <ItemTexture
                                                    itemId={entry.itemId}
                                                    size={32}
                                                    glow={def.rarity !== 'common'}
                                                />
                                                <span className={styles.itemName}>
                                                    {itemName}
                                                </span>
                                                <span
                                                    className={styles.itemRarity}
                                                    style={{ color: rarityConf.color }}
                                                >
                                                    {rarityConf.label}
                                                </span>
                                                {entry.count > 1 && (
                                                    <span className={styles.itemCount}>
                                                        x{entry.count}
                                                    </span>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Detail Panel */}
                    <AnimatePresence>
                        {selectedEntry && selectedDef && (
                            <motion.div
                                className={styles.detailPanel}
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 280, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                            >
                                <div className={styles.detailInner}>
                                    {/* Header */}
                                    <div className={styles.detailHeader}>
                                        <motion.div
                                            className={styles.detailTexture}
                                            style={{
                                                background: `radial-gradient(circle, ${selectedDef.glowColor}15, transparent)`,
                                            }}
                                            initial={{ scale: 0.5 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        >
                                            <ItemTexture
                                                itemId={selectedItemId!}
                                                size={40}
                                                glow={selectedDef.rarity !== 'common'}
                                            />
                                        </motion.div>

                                        <div
                                            className={styles.detailName}
                                            style={{ color: selectedDef.color }}
                                        >
                                            {locale === 'ja' ? selectedDef.nameJa : selectedDef.name}
                                        </div>
                                        <div className={styles.detailNameJa}>
                                            {locale === 'ja' ? selectedDef.name : selectedDef.nameJa}
                                        </div>

                                        <div className={styles.detailBadges}>
                                            <span
                                                className={styles.detailBadge}
                                                style={{
                                                    background: RARITY_CONFIG[selectedDef.rarity].badgeBg,
                                                    color: RARITY_CONFIG[selectedDef.rarity].color,
                                                }}
                                            >
                                                {RARITY_CONFIG[selectedDef.rarity].label}
                                            </span>
                                            <span
                                                className={styles.detailBadge}
                                                style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    color: 'rgba(255,255,255,0.5)',
                                                }}
                                            >
                                                {CATEGORY_CONFIG[selectedDef.category].icon}{' '}
                                                {CATEGORY_CONFIG[selectedDef.category].label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className={styles.detailDescription}>
                                        {locale === 'ja' ? selectedDef.descriptionJa : selectedDef.description}
                                        <span className={styles.detailDescriptionJa}>
                                            <br />
                                            {locale === 'ja' ? selectedDef.description : selectedDef.descriptionJa}
                                        </span>
                                    </p>

                                    {/* Stats */}
                                    <div className={styles.detailStatsBox}>
                                        <div className={styles.detailStatsTitle}>
                                            {t('details.info')}
                                        </div>
                                        <div className={styles.detailStatRow}>
                                            <span className={styles.detailStatLabel}>
                                                {t('details.owned')}
                                            </span>
                                            <span className={styles.detailStatValue}>
                                                {selectedEntry.count}
                                            </span>
                                        </div>
                                        <div className={styles.detailStatRow}>
                                            <span className={styles.detailStatLabel}>
                                                {t('details.maxStack')}
                                            </span>
                                            <span className={styles.detailStatValue}>
                                                {selectedDef.maxStack}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className={styles.detailActions}>
                                        {selectedDef.category === 'consumable' && (
                                            <button
                                                className={cn(styles.actionBtn, styles.actionBtnUse)}
                                                onClick={handleUse}
                                            >
                                                {t('actions.use')}
                                            </button>
                                        )}
                                        {selectedDef.category !== 'currency' && (
                                            <button
                                                className={cn(styles.actionBtn, styles.actionBtnDiscard)}
                                                onClick={() => setDiscardConfirm(selectedItemId)}
                                            >
                                                {t('actions.discard')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Summary Stats ── */}
                <div className={styles.summaryBar}>
                    <div className={styles.summaryStat}>
                        {t('summary.uniqueItems')}:{' '}
                        <span className={styles.summaryStatValue}>{state.items.length}</span>
                    </div>
                    <div className={styles.summaryStat}>
                        {t('summary.totalItems')}:{' '}
                        <span className={styles.summaryStatValue}>{totalItemCount}</span>
                    </div>
                    <div className={styles.summaryStat}>
                        {t('summary.collected')}:{' '}
                        <span className={styles.summaryStatValue}>{state.totalCollected}</span>
                    </div>
                    <div className={styles.summaryStat}>
                        {t('summary.consumed')}:{' '}
                        <span className={styles.summaryStatValue}>{state.totalConsumed}</span>
                    </div>
                </div>

                {/* ── Discard Confirmation ── */}
                <AnimatePresence>
                    {discardConfirm && (() => {
                        const def = ITEM_REGISTRY[discardConfirm];
                        if (!def) return null;
                        const name = locale === 'ja' ? def.nameJa : def.name;
                        const rarityConf = RARITY_CONFIG[def.rarity];

                        return (
                            <motion.div
                                key="discard-confirm"
                                className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="bg-gray-900/95 border border-white/10 rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.9 }}
                                >
                                    <h3 className="text-sm font-bold text-white mb-3">
                                        {t('discard.title')}
                                    </h3>
                                    <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-lg">
                                        <ItemTexture itemId={discardConfirm} size={28} glow={def.rarity !== 'common'} />
                                        <div>
                                            <div
                                                className="text-sm font-semibold"
                                                style={{ color: rarityConf.color }}
                                            >
                                                {name}
                                            </div>
                                            <div
                                                className="text-[10px] font-bold uppercase tracking-wider"
                                                style={{ color: rarityConf.color }}
                                            >
                                                {rarityConf.label}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/50 mb-4">
                                        {t('discard.warning')}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setDiscardConfirm(null)}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-xs font-semibold',
                                                'bg-white/5 text-white/60',
                                                'hover:bg-white/10 transition-colors',
                                            )}
                                        >
                                            {t('discard.cancel')}
                                        </button>
                                        <button
                                            onClick={handleDiscardConfirm}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-xs font-semibold',
                                                'bg-red-500/20 text-red-400',
                                                'hover:bg-red-500/30 transition-colors',
                                                'border border-red-500/30',
                                            )}
                                        >
                                            {t('discard.confirm')}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>

                {/* ── Toast ── */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            key="toast"
                            className={styles.toast}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                        >
                            <div className={styles.toastContent}>
                                <span>✓</span>
                                <span>{toast}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

export default InventoryPanel;
