'use client';

import type { useEoESocket } from '@/hooks/useEoESocket';
import styles from './EoEGame.module.css';

interface Props {
  socket: ReturnType<typeof useEoESocket>;
}

export function EoEResults({ socket }: Props) {
  const { battleEnd } = socket;

  if (!battleEnd) return null;

  const { result, rewards, stats } = battleEnd;

  return (
    <div className={styles.resultsScreen}>
      {/* Result banner */}
      <div className={`${styles.resultBanner} ${styles[`result_${result}`]}`}>
        <h1 className={styles.resultTitle}>
          {result === 'victory' && 'VICTORY'}
          {result === 'defeat' && 'DEFEAT'}
          {result === 'draw' && 'DRAW'}
        </h1>
        <p className={styles.resultTitleJa}>
          {result === 'victory' && '勝利'}
          {result === 'defeat' && '敗北'}
          {result === 'draw' && '引き分け'}
        </p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Duration</span>
          <span className={styles.statValue}>{stats.duration} turns</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Best Combo</span>
          <span className={styles.statValue}>{stats.bestCombo}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Reactions</span>
          <span className={styles.statValue}>{stats.reactionsTriggered}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Rhythm Accuracy</span>
          <span className={styles.statValue}>
            {Math.round(stats.rhythmAccuracy * 100)}%
          </span>
        </div>
      </div>

      {/* Damage breakdown */}
      {Object.keys(stats.totalDamageDealt).length > 0 && (
        <div className={styles.damageBreakdown}>
          <h3>Damage Dealt</h3>
          {Object.entries(stats.totalDamageDealt).map(([id, dmg]) => (
            <div key={id} className={styles.damageRow}>
              <span>{id}</span>
              <span className={styles.damageValue}>{dmg.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Rewards */}
      <div className={styles.rewardsSection}>
        <h3>Rewards</h3>
        <div className={styles.rewardsList}>
          <div className={styles.rewardItem}>
            <span>EXP</span>
            <span className={styles.rewardValue}>+{rewards.experience}</span>
          </div>
          <div className={styles.rewardItem}>
            <span>Gold</span>
            <span className={styles.rewardValue}>+{rewards.gold}</span>
          </div>
          {rewards.guaranteedLoot.map((loot, i) => (
            <div key={i} className={styles.rewardItem}>
              <span>{loot.itemId}</span>
              <span className={styles.rewardValue}>x{loot.minQuantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MVP */}
      {stats.mvpPlayerId && (
        <div className={styles.mvpSection}>
          <span className={styles.mvpLabel}>MVP</span>
          <span className={styles.mvpName}>{stats.mvpPlayerId}</span>
        </div>
      )}

      {/* Actions */}
      <div className={styles.resultsActions}>
        <button className={styles.primaryButton} onClick={socket.goToMenu}>
          Return to Menu
        </button>
      </div>
    </div>
  );
}
