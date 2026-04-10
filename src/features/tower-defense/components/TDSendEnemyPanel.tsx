'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Crosshair, Skull, Heart } from 'lucide-react';
import type { EnemyType } from '@/types/tower-defense';
import styles from './TDSendEnemyPanel.module.css';

const SEND_ENEMY_COSTS = [
  { enemyType: 'grunt' as const, cost: 5, count: 3, label: 'Grunts', icon: '🐷' },
  { enemyType: 'fast' as const, cost: 4, count: 4, label: 'Chickens', icon: '🐔' },
  { enemyType: 'swarm' as const, cost: 3, count: 8, label: 'Swarm', icon: '🐰' },
  { enemyType: 'flying' as const, cost: 8, count: 2, label: 'Flyers', icon: '🐝' },
  { enemyType: 'healer' as const, cost: 12, count: 2, label: 'Healers', icon: '🐱' },
  { enemyType: 'tank' as const, cost: 15, count: 1, label: 'Tank', icon: '🐄' },
  { enemyType: 'shield' as const, cost: 18, count: 1, label: 'Shield', icon: '🐺' },
  { enemyType: 'boss' as const, cost: 50, count: 1, label: 'Boss', icon: '🐴' },
];

interface TDSendEnemyPanelProps {
  sendPoints: number;
  opponents: Array<{
    playerId: string;
    playerName: string;
    lives: number;
    eliminated: boolean;
  }>;
  selectedTarget: string | null;
  onSelectTarget: (playerId: string) => void;
  onSendEnemy: (targetPlayerId: string, enemyType: EnemyType) => void;
}

export default function TDSendEnemyPanel({
  sendPoints,
  opponents,
  selectedTarget,
  onSelectTarget,
  onSendEnemy,
}: TDSendEnemyPanelProps) {
  const [pressedType, setPressedType] = useState<EnemyType | null>(null);
  const [displayPoints, setDisplayPoints] = useState(sendPoints);
  const [pointsGlow, setPointsGlow] = useState(false);
  const prevPointsRef = useRef(sendPoints);

  // Animate point counter
  useEffect(() => {
    if (sendPoints === prevPointsRef.current) return;
    const start = prevPointsRef.current;
    const diff = sendPoints - start;
    const steps = Math.min(Math.abs(diff), 10);
    const stepDuration = 200 / steps;
    let step = 0;

    setPointsGlow(true);
    const glowTimer = setTimeout(() => setPointsGlow(false), 500);

    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayPoints(sendPoints);
        clearInterval(interval);
      } else {
        setDisplayPoints(Math.round(start + (diff * step) / steps));
      }
    }, stepDuration);

    prevPointsRef.current = sendPoints;
    return () => {
      clearInterval(interval);
      clearTimeout(glowTimer);
    };
  }, [sendPoints]);

  const handleSend = useCallback((enemyType: EnemyType, cost: number) => {
    if (!selectedTarget || sendPoints < cost) return;
    setPressedType(enemyType);
    onSendEnemy(selectedTarget, enemyType);
    setTimeout(() => setPressedType(null), 300);
  }, [selectedTarget, sendPoints, onSendEnemy]);

  return (
    <motion.div
      className={styles.panel}
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <Crosshair size={14} className={styles.headerIcon} />
          <span className={styles.headerLabel}>Send Enemies</span>
        </div>
        <div className={styles.pointsRow}>
          <Zap size={16} className={styles.pointsIcon} />
          <span className={`${styles.pointsValue}${pointsGlow ? ` ${styles.pointsGlow}` : ''}`}>
            {displayPoints}
          </span>
          <span className={styles.pointsLabel}>points</span>
        </div>
      </div>

      {/* Target selector */}
      <div className={styles.targetSection}>
        <div className={styles.sectionLabel}>Target</div>
        <div className={styles.targetList}>
          {opponents.map((opp) => {
            const isSelected = selectedTarget === opp.playerId;
            const isEliminated = opp.eliminated;

            const btnClass = isEliminated
              ? styles.targetBtnEliminated
              : isSelected
                ? styles.targetBtnSelected
                : styles.targetBtn;

            const radioClass = isEliminated
              ? styles.radioEliminated
              : isSelected
                ? styles.radioSelected
                : styles.radio;

            return (
              <button
                key={opp.playerId}
                onClick={() => !isEliminated && onSelectTarget(opp.playerId)}
                disabled={isEliminated}
                className={btnClass}
              >
                <div className={radioClass}>
                  {isSelected && !isEliminated && (
                    <div className={styles.radioDot} />
                  )}
                  {isEliminated && (
                    <span className={styles.radioX}>&times;</span>
                  )}
                </div>

                <span className={isEliminated ? styles.targetNameEliminated : styles.targetName}>
                  {opp.playerName}
                </span>

                {isEliminated ? (
                  <Skull size={12} className={styles.eliminatedIcon} />
                ) : (
                  <span className={styles.livesIndicator}>
                    <Heart size={10} className={styles.livesIcon} style={{ fill: 'currentColor' }} />
                    <span className={styles.livesCount}>{opp.lives}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Enemy send grid */}
      <div className={styles.enemyGrid}>
        {SEND_ENEMY_COSTS.map(({ enemyType, cost, count, label, icon }) => {
          const canAfford = sendPoints >= cost;
          const hasTarget = selectedTarget !== null;
          const enabled = canAfford && hasTarget;
          const isPressed = pressedType === enemyType;

          return (
            <motion.button
              key={enemyType}
              onClick={() => handleSend(enemyType, cost)}
              disabled={!enabled}
              className={enabled ? styles.enemyBtn : styles.enemyBtnDisabled}
              animate={
                isPressed
                  ? { scale: [0.95, 1.05, 1] }
                  : { scale: 1 }
              }
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <span className={styles.enemyIcon}>{icon}</span>

              <div className={styles.enemyInfo}>
                <span className={styles.enemyLabel}>{label}</span>
                <span className={styles.enemyCount}>&times;{count}</span>
              </div>

              <div className={enabled ? styles.costBadge : styles.costBadgeDisabled}>
                <Zap size={10} className={styles.costIcon} />
                {cost}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* No target hint */}
      <AnimatePresence>
        {!selectedTarget && opponents.some((o) => !o.eliminated) && (
          <motion.div
            className={styles.hintWrap}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className={styles.hintText}>
              Select a target above to send enemies
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
