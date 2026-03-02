'use client';

import { motion } from 'framer-motion';
import { Heart, Trophy, Zap, Skull, Crosshair } from 'lucide-react';
import styles from './TDOpponentBar.module.css';

interface TDOpponentBarProps {
  opponents: Array<{
    playerId: string;
    playerName: string;
    lives: number;
    maxLives: number;
    score: number;
    sendPoints: number;
    towerCount: number;
    enemyCount: number;
    eliminated: boolean;
  }>;
  selectedTarget: string | null;
  onSelectTarget: (playerId: string) => void;
}

function TowerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="1" width="4" height="2" rx="0.5" fill="currentColor" />
      <rect x="3" y="3" width="6" height="7" rx="0.5" fill="currentColor" />
      <rect x="5" y="7" width="2" height="3" rx="0.3" fill="rgba(15,23,42,0.6)" />
    </svg>
  );
}

function EnemyCountIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="4" r="2.5" fill="currentColor" />
      <ellipse cx="6" cy="10" rx="4" ry="2.5" fill="currentColor" opacity="0.5" />
      <circle cx="5" cy="3.5" r="0.5" fill="rgba(15,23,42,0.8)" />
      <circle cx="7" cy="3.5" r="0.5" fill="rgba(15,23,42,0.8)" />
    </svg>
  );
}

export default function TDOpponentBar({
  opponents,
  selectedTarget,
  onSelectTarget,
}: TDOpponentBarProps) {
  return (
    <motion.div
      className={styles.bar}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
    >
      {opponents.map((opp) => {
        const isSelected = selectedTarget === opp.playerId;
        const livesPercent = opp.maxLives > 0 ? opp.lives / opp.maxLives : 0;
        const livesColor =
          livesPercent > 0.5 ? '#22c55e' : livesPercent > 0.25 ? '#eab308' : '#ef4444';

        const cardClass = opp.eliminated
          ? styles.cardEliminated
          : isSelected
            ? styles.cardSelected
            : styles.card;

        return (
          <motion.button
            key={opp.playerId}
            onClick={() => !opp.eliminated && onSelectTarget(opp.playerId)}
            disabled={opp.eliminated}
            className={cardClass}
            whileHover={!opp.eliminated ? { y: -2 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {/* Selected target badge */}
            {isSelected && !opp.eliminated && (
              <div className={styles.targetBadge}>
                <Crosshair size={8} />
              </div>
            )}

            {/* Player name row */}
            <div className={styles.playerRow}>
              {opp.eliminated ? (
                <Skull size={12} className={styles.eliminatedIcon} />
              ) : (
                <div
                  className={styles.statusDot}
                  style={{ backgroundColor: livesColor }}
                />
              )}
              <span className={opp.eliminated ? styles.playerNameEliminated : styles.playerName}>
                {opp.playerName}
              </span>
            </div>

            {opp.eliminated ? (
              <div className={styles.eliminatedLabel}>Eliminated</div>
            ) : (
              <>
                {/* Lives bar */}
                <div className={styles.livesBar}>
                  <div
                    className={styles.livesFill}
                    style={{
                      width: `${livesPercent * 100}%`,
                      backgroundColor: livesColor,
                    }}
                  />
                </div>

                {/* Stats row */}
                <div className={styles.statsRow}>
                  <span className={styles.stat} title="Lives">
                    <Heart size={9} className={styles.statIconLives} style={{ fill: 'currentColor' }} />
                    <span className={styles.statValueLives}>
                      {opp.lives}/{opp.maxLives}
                    </span>
                  </span>
                  <span className={styles.stat} title="Score">
                    <Trophy size={9} className={styles.statIconScore} />
                    <span className={styles.statValue}>
                      {opp.score}
                    </span>
                  </span>
                  <span className={styles.stat} title="Towers">
                    <span className={styles.statIconTowers}><TowerIcon /></span>
                    <span className={styles.statValue}>
                      {opp.towerCount}
                    </span>
                  </span>
                  <span className={styles.stat} title="Enemies">
                    <span className={styles.statIconEnemies}><EnemyCountIcon /></span>
                    <span className={styles.statValue}>
                      {opp.enemyCount}
                    </span>
                  </span>
                  <span className={styles.stat} title="Send Points">
                    <Zap size={9} className={styles.statIconPoints} />
                    <span className={styles.statValue}>
                      {opp.sendPoints}
                    </span>
                  </span>
                </div>
              </>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
