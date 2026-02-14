'use client';

import type { PlayerStats } from '@/types/skills';
import { cn } from '@/lib/utils';
import styles from './PlayerHUD.module.css';

interface PlayerHUDProps {
  /** Player stats */
  stats: PlayerStats;
  /** Player name/title */
  playerName?: string;
  /** Player level */
  level?: number;
}

export default function PlayerHUD({
  stats,
  playerName = 'Player',
  level = 1,
}: PlayerHUDProps) {
  const healthPercent = (stats.health / stats.maxHealth) * 100;
  const manaPercent = (stats.mana / stats.maxMana) * 100;

  return (
    <div className={styles.container}>
      {/* Player Info */}
      <div className={styles.playerInfo}>
        <div className={styles.playerName}>{playerName}</div>
        <div className={styles.playerLevel}>Level {level}</div>
      </div>

      {/* Health Bar */}
      <div className={styles.statBar}>
        <div className={styles.statLabel}>
          <span>HP</span>
          <span className={styles.statValue}>
            {Math.floor(stats.health)} / {stats.maxHealth}
          </span>
        </div>
        <div className={styles.barContainer}>
          <div
            className={cn(styles.barFill, styles.healthBar)}
            style={{ width: `${healthPercent}%` }}
          >
            <div className={styles.barShine} />
          </div>
        </div>
      </div>

      {/* Mana Bar */}
      <div className={styles.statBar}>
        <div className={styles.statLabel}>
          <span>MP</span>
          <span className={styles.statValue}>
            {Math.floor(stats.mana)} / {stats.maxMana}
          </span>
        </div>
        <div className={styles.barContainer}>
          <div
            className={cn(styles.barFill, styles.manaBar)}
            style={{ width: `${manaPercent}%` }}
          >
            <div className={styles.barShine} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>⚔️</div>
          <div className={styles.statNum}>{stats.attackDamage}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>✨</div>
          <div className={styles.statNum}>{stats.abilityPower}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>🛡️</div>
          <div className={styles.statNum}>{stats.armor}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>💫</div>
          <div className={styles.statNum}>{stats.magicResist}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>👟</div>
          <div className={styles.statNum}>{stats.movementSpeed}</div>
        </div>
      </div>
    </div>
  );
}
