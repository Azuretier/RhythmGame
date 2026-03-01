'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { TowerType } from '@/types/tower-defense';
import { TOWER_DEFS } from '@/types/tower-defense';
import { TowerIcon } from './td-icons';
import styles from './TDTowerPanel.module.css';

const TOWER_ORDER: TowerType[] = ['archer', 'cannon', 'frost', 'lightning', 'sniper', 'flame', 'arcane'];

interface TDTowerPanelProps {
  gold: number;
  selectedTowerType: TowerType | null;
  onSelectTowerType: (type: TowerType) => void;
}

export default function TDTowerPanel({ gold, selectedTowerType, onSelectTowerType }: TDTowerPanelProps) {
  const cards = useMemo(() => TOWER_ORDER.map((type, idx) => {
    const def = TOWER_DEFS[type];
    const canAfford = gold >= def.cost;
    const isSelected = selectedTowerType === type;
    const displayName = def.name.split(' ')[0];

    return { type, def, canAfford, isSelected, displayName, shortcut: idx + 1 };
  }), [gold, selectedTowerType]);

  return (
    <div className={styles.panel}>
      {cards.map(({ type, def, canAfford, isSelected, displayName, shortcut }) => {
        const cardClass = !canAfford
          ? styles.cardDisabled
          : isSelected
            ? styles.cardSelected
            : styles.card;

        const borderColor = isSelected
          ? def.color
          : undefined;
        const boxShadow = isSelected
          ? `0 0 12px ${def.color}40, inset 0 0 8px ${def.color}15`
          : undefined;

        return (
          <div key={type} className={styles.tooltipWrap}>
            <motion.div
              className={cardClass}
              style={{
                borderColor,
                boxShadow,
              }}
              whileHover={canAfford ? { y: -4, borderColor: `${def.color}80` } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => canAfford && onSelectTowerType(type)}
            >
              <span className={styles.shortcutBadge}>{shortcut}</span>
              <div className={styles.cardIcon}>
                <TowerIcon type={type} size={32} />
              </div>
              <span className={styles.cardName}>{displayName}</span>
              <span className={styles.cardCost}>{def.cost}</span>
            </motion.div>

            <div className={styles.tooltip}>
              <div className={styles.tooltipName} style={{ color: def.color }}>
                {def.name}
              </div>
              <div className={styles.tooltipDesc}>{def.description}</div>
              <div className={styles.tooltipStats}>
                <div className={styles.tooltipStatRow}>
                  <span className={styles.tooltipStatLabel}>Damage</span>
                  <span className={styles.tooltipStatValue}>{def.damage}</span>
                </div>
                <div className={styles.tooltipStatRow}>
                  <span className={styles.tooltipStatLabel}>Range</span>
                  <span className={styles.tooltipStatValue}>{def.range}</span>
                </div>
                <div className={styles.tooltipStatRow}>
                  <span className={styles.tooltipStatLabel}>Fire Rate</span>
                  <span className={styles.tooltipStatValue}>{def.fireRate}/s</span>
                </div>
                <div className={styles.tooltipStatRow}>
                  <span className={styles.tooltipStatLabel}>Cost</span>
                  <span className={styles.tooltipStatValue} style={{ color: '#fbbf24' }}>{def.cost}</span>
                </div>
              </div>
              {def.special && (
                <div className={styles.tooltipSpecial}>{def.special}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
