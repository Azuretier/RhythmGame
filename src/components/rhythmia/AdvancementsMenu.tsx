'use client';

import React, { useState, useEffect } from 'react';
import { ADVANCEMENTS } from '@/lib/advancements/definitions';
import { loadAdvancementState } from '@/lib/advancements/storage';
import type { AdvancementCategory, AdvancementState } from '@/lib/advancements/types';
import styles from './AdvancementsMenu.module.css';

const CATEGORY_ORDER: AdvancementCategory[] = ['general', 'lines', 'score', 'tspin', 'combo', 'multiplayer'];

const CATEGORY_ICONS: Record<AdvancementCategory, string> = {
    general: '🎮',
    lines: '📏',
    score: '💎',
    tspin: '🌀',
    combo: '🔥',
    multiplayer: '⚔️',
};

const CATEGORY_LABELS: Record<AdvancementCategory, string> = {
    general: 'General',
    lines: 'Lines',
    score: 'Score',
    tspin: 'T-Spin',
    combo: 'Combo',
    multiplayer: 'PvP',
};

function formatThreshold(n: number): string {
    if (n >= 10000000) return `${(n / 1000000).toFixed(0)}M`;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 10000) return `${(n / 1000).toFixed(0)}K`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
}

interface AdvancementsMenuProps {
    onClose: () => void;
}

export function AdvancementsMenu({ onClose }: AdvancementsMenuProps) {
    const [advState, setAdvState] = useState<AdvancementState | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<AdvancementCategory>('general');

    useEffect(() => {
        setAdvState(loadAdvancementState());
    }, []);

    if (!advState) return null;

    const unlockedCount = advState.unlockedIds.length;
    const totalCount = ADVANCEMENTS.length;
    const filteredAdvancements = ADVANCEMENTS.filter(a => a.category === selectedCategory);

    return (
        <div className={styles.panel}>
            {/* Header bar */}
            <div className={styles.header}>
                <button className={styles.back} onClick={onClose}>
                    ← Back
                </button>
                <div className={styles.title}>ADVANCEMENTS</div>
                <div className={styles.count}>
                    {unlockedCount} / {totalCount}
                </div>
            </div>

            {/* Progress bar */}
            <div className={styles.progressBar}>
                <div
                    className={styles.progressFill}
                    style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
                />
            </div>

            {/* Category tabs */}
            <div className={styles.tabs}>
                {CATEGORY_ORDER.map(cat => {
                    const catAdvs = ADVANCEMENTS.filter(a => a.category === cat);
                    const catUnlocked = catAdvs.filter(a => advState.unlockedIds.includes(a.id)).length;
                    const isActive = selectedCategory === cat;
                    return (
                        <button
                            key={cat}
                            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            <span className={styles.tabIcon}>{CATEGORY_ICONS[cat]}</span>
                            <span className={styles.tabLabel}>{CATEGORY_LABELS[cat]}</span>
                            <span className={styles.tabCount}>{catUnlocked}/{catAdvs.length}</span>
                        </button>
                    );
                })}
            </div>

            {/* Advancement grid */}
            <div className={styles.grid}>
                {filteredAdvancements.map(adv => {
                    const unlocked = advState.unlockedIds.includes(adv.id);
                    const currentValue = advState.stats[adv.statKey];
                    const progress = Math.min(1, currentValue / adv.threshold);

                    return (
                        <div
                            key={adv.id}
                            className={`${styles.tile} ${unlocked ? styles.tileUnlocked : styles.tileLocked}`}
                        >
                            <div className={styles.tileIcon}>
                                {unlocked ? adv.icon : '🔒'}
                            </div>
                            <div className={styles.tileInfo}>
                                <div className={styles.tileName}>
                                    {adv.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </div>
                                <div className={styles.tileProgress}>
                                    <div className={styles.tileProgressBar}>
                                        <div
                                            className={styles.tileProgressFill}
                                            style={{ width: `${progress * 100}%` }}
                                        />
                                    </div>
                                    <span className={styles.tileProgressText}>
                                        {formatThreshold(currentValue)}/{formatThreshold(adv.threshold)}
                                    </span>
                                </div>
                            </div>
                            {unlocked && <div className={styles.tileCheck}>✓</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default AdvancementsMenu;
