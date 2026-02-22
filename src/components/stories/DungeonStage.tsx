'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import type { DungeonLocation } from '@/data/stories/dungeons';
import styles from './dungeonStage.module.css';

const VanillaGame = dynamic(() => import('@/components/rhythmia/tetris'), {
  ssr: false,
  loading: () => (
    <div className={styles.loading}>
      <div className={styles.loadingText}>LOADING...</div>
    </div>
  ),
});

interface GameStats {
  score: number;
  lines: number;
  bestCombo: number;
}

interface DungeonStageProps {
  location: DungeonLocation;
  onComplete: (emeralds: number, defeated: number) => void;
  onExit: () => void;
}

export default function DungeonStage({ location, onComplete, onExit }: DungeonStageProps) {
  const locale = useLocale();
  const [showBriefing, setShowBriefing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const gameStatsRef = useRef<GameStats>({ score: 0, lines: 0, bestCombo: 0 });

  // Auto-hide mission briefing after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowBriefing(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Handle game end stats from VanillaGame
  const handleGameEnd = useCallback((stats: GameStats) => {
    gameStatsRef.current = stats;
  }, []);

  // Handle quit from VanillaGame
  const handleQuit = useCallback(() => {
    setShowResults(true);
  }, []);

  // Calculate rewards from game stats
  const stats = gameStatsRef.current;
  const earnedEmeralds = Math.floor(stats.lines / 10) + location.difficulty;
  const earnedDefeated = stats.bestCombo;

  const locationName = locale === 'en' ? location.nameEn : location.name;

  return (
    <div className={styles.container}>
      {/* Tetris game */}
      <VanillaGame onQuit={handleQuit} onGameEnd={handleGameEnd} />

      {/* Mission briefing banner (auto-fades) */}
      {showBriefing && (
        <div className={styles.briefing}>
          <div className={styles.briefingContent}>
            <div className={styles.briefingIcon}>{location.icon}</div>
            <div className={styles.briefingInfo}>
              <div className={styles.briefingName}>{locationName}</div>
              <div className={styles.briefingDifficulty}>
                {'★'.repeat(location.difficulty)}{'☆'.repeat(5 - location.difficulty)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mission results overlay */}
      {showResults && (
        <div className={styles.resultsOverlay}>
          <div className={styles.resultsCard}>
            <div className={styles.resultsTitle}>
              {locale === 'en' ? 'MISSION RESULTS' : 'ミッション結果'}
            </div>
            <div className={styles.resultsIcon}>{location.icon}</div>
            <div className={styles.resultsName}>{locationName}</div>

            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>SCORE</div>
                <div className={styles.statValue}>{stats.score.toLocaleString()}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>LINES</div>
                <div className={styles.statValue}>{stats.lines}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>BEST COMBO</div>
                <div className={styles.statValue}>{stats.bestCombo}</div>
              </div>
            </div>

            <div className={styles.rewardsSection}>
              <div className={styles.rewardsTitle}>
                {locale === 'en' ? 'REWARDS' : '報酬'}
              </div>
              <div className={styles.rewardsList}>
                <span className={styles.reward}>💎 ×{earnedEmeralds}</span>
                <span className={styles.reward}>⚔️ ×{earnedDefeated}</span>
              </div>
            </div>

            <div className={styles.resultsActions}>
              <button
                className={styles.completeBtn}
                onClick={() => onComplete(earnedEmeralds, earnedDefeated)}
              >
                {locale === 'en' ? 'COMPLETE MISSION' : 'ミッション完了'}
              </button>
              <button
                className={styles.retreatBtn}
                onClick={onExit}
              >
                {locale === 'en' ? 'RETURN TO MAP' : 'マップに戻る'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
