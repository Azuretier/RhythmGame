'use client';

import React, { useCallback, useEffect } from 'react';
import type { TowerType, RingTower } from '../galaxy-types';
import { TOWER_DEFS } from '@/types/tower-defense';
import styles from './GalaxyTDPanel.module.css';

const TOWER_TYPES: TowerType[] = ['archer', 'cannon', 'frost', 'lightning', 'sniper', 'flame', 'arcane'];

interface GalaxyTDPanelProps {
    gold: number;
    lives: number;
    waveNumber: number;
    totalWaves: number;
    selectedTowerType: TowerType | null;
    selectedTowerId: string | null;
    towers: RingTower[];
    onSelectTowerType: (type: TowerType | null) => void;
    onUpgradeTower: (towerId: string) => void;
    onSellTower: (towerId: string) => void;
}

export function GalaxyTDPanel({
    gold,
    lives,
    waveNumber,
    totalWaves,
    selectedTowerType,
    selectedTowerId,
    towers,
    onSelectTowerType,
    onUpgradeTower,
    onSellTower,
}: GalaxyTDPanelProps) {
    const selectedTower = selectedTowerId ? towers.find(t => t.id === selectedTowerId) : null;
    const selectedDef = selectedTower ? TOWER_DEFS[selectedTower.type] : null;

    // Hotkeys 1-7 for tower selection
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 7) {
                const type = TOWER_TYPES[num - 1];
                onSelectTowerType(selectedTowerType === type ? null : type);
            }
            if (e.key === 'Escape') {
                onSelectTowerType(null);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedTowerType, onSelectTowerType]);

    const handleCardClick = useCallback((type: TowerType) => {
        const def = TOWER_DEFS[type];
        if (gold < def.cost) return;
        onSelectTowerType(selectedTowerType === type ? null : type);
    }, [gold, selectedTowerType, onSelectTowerType]);

    return (
        <div className={styles.panel}>
            {/* Top bar: Gold, Lives, Wave */}
            <div className={styles.topBar}>
                <div className={`${styles.pill} ${styles.goldPill}`}>
                    <span className={styles.pillIcon}>&#x2B50;</span>
                    {gold}
                </div>
                <div className={`${styles.pill} ${styles.livesPill}`}>
                    <span className={styles.pillIcon}>&#x2764;</span>
                    {lives}
                </div>
                <div className={`${styles.pill} ${styles.wavePill}`}>
                    W{waveNumber}/{totalWaves}
                </div>
            </div>

            {/* Bottom tower bar */}
            <div className={styles.towerBar}>
                {TOWER_TYPES.map((type, i) => {
                    const def = TOWER_DEFS[type];
                    const canAfford = gold >= def.cost;
                    const isSelected = selectedTowerType === type;
                    return (
                        <div
                            key={type}
                            className={`${styles.towerCard} ${isSelected ? styles.towerCardSelected : ''} ${!canAfford ? styles.towerCardDisabled : ''}`}
                            onClick={() => handleCardClick(type)}
                        >
                            <div
                                className={styles.towerSwatch}
                                style={{ background: def.color }}
                            />
                            <span className={styles.towerName}>{type}</span>
                            <span className={styles.towerCost}>{def.cost}</span>
                            <span className={styles.towerHotkey}>{i + 1}</span>
                        </div>
                    );
                })}
            </div>

            {/* Selected tower info panel */}
            {selectedTower && selectedDef && (
                <div className={styles.selectedPanel}>
                    <div className={styles.selectedName}>{selectedDef.name}</div>
                    <div className={styles.selectedLevel}>Lv.{selectedTower.level}/{selectedDef.maxLevel}</div>
                    <div className={styles.selectedStat}>
                        DMG: {selectedDef.damagePerLevel[selectedTower.level - 1] ?? selectedDef.damage}
                    </div>
                    <div className={styles.selectedStat}>
                        Kills: {selectedTower.kills}
                    </div>
                    {selectedDef.special && (
                        <div className={styles.selectedSpecial}>{selectedDef.special}</div>
                    )}
                    <div className={styles.selectedButtons}>
                        {selectedTower.level < selectedDef.maxLevel && (
                            <button
                                className={styles.upgradeBtn}
                                disabled={gold < selectedDef.upgradeCosts[selectedTower.level - 1]}
                                onClick={() => onUpgradeTower(selectedTower.id)}
                            >
                                UP {selectedDef.upgradeCosts[selectedTower.level - 1]}
                            </button>
                        )}
                        <button
                            className={styles.sellBtn}
                            onClick={() => onSellTower(selectedTower.id)}
                        >
                            SELL
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
