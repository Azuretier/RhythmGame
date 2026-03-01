'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GamePhase } from '@/types/tower-defense';
import styles from './TDGameHUD.module.css';

// --- Inline SVG icon components ---

function CoinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      <circle cx="8" cy="8" r="4" fill="none" stroke="#d97706" strokeWidth="0.8" opacity="0.6" />
      <circle cx="8" cy="8" r="1.5" fill="#d97706" opacity="0.4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 14s-5.5-3.5-5.5-7.5C2.5 4 4 2.5 5.5 2.5c1 0 2 .5 2.5 1.5.5-1 1.5-1.5 2.5-1.5 1.5 0 3 1.5 3 3 0 4-5.5 7.5-5.5 7.5z"
        fill="#f87171"
        stroke="#dc2626"
        strokeWidth="0.5"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.8 3.8 14l.8-4.7L1.2 6l4.7-.7L8 1z"
        fill="#a78bfa"
        stroke="#8b5cf6"
        strokeWidth="0.5"
      />
    </svg>
  );
}

function SpeedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6h2.5L8 3v10L4.5 10H2V6z" fill="currentColor" />
      <path d="M10.5 5.5c.8.8 1.2 1.8 1.2 2.5s-.4 1.7-1.2 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.5 3.5c1.3 1.3 2 3 2 4.5s-.7 3.2-2 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerMutedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6h2.5L8 3v10L4.5 10H2V6z" fill="currentColor" />
      <path d="M11 5.5l4 5M15 5.5l-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

// --- Main HUD Component ---

interface TDGameHUDProps {
  gold: number;
  lives: number;
  maxLives: number;
  score: number;
  currentWave: number;
  totalWaves: number;
  phase: GamePhase;
  enemyCount: number;
  gameSpeed: number;
  soundOn: boolean;
  waveCountdown: number;
  autoStart: boolean;
  onStartWave: () => void;
  onSpeedToggle: () => void;
  onSoundToggle: () => void;
  onBackToMenu: () => void;
}

export default function TDGameHUD({
  gold,
  lives,
  maxLives,
  score,
  currentWave,
  totalWaves,
  phase,
  enemyCount,
  gameSpeed,
  soundOn,
  waveCountdown,
  autoStart,
  onStartWave,
  onSpeedToggle,
  onSoundToggle,
  onBackToMenu,
}: TDGameHUDProps) {
  // Gold flash animation
  const prevGoldRef = useRef(gold);
  const [goldFlash, setGoldFlash] = useState(false);

  useEffect(() => {
    if (gold !== prevGoldRef.current) {
      prevGoldRef.current = gold;
      setGoldFlash(true);
      const timer = setTimeout(() => setGoldFlash(false), 400);
      return () => clearTimeout(timer);
    }
  }, [gold]);

  // Heart shake animation
  const prevLivesRef = useRef(lives);
  const [heartShake, setHeartShake] = useState(false);

  useEffect(() => {
    if (lives < prevLivesRef.current) {
      setHeartShake(true);
      const timer = setTimeout(() => setHeartShake(false), 500);
      prevLivesRef.current = lives;
      return () => clearTimeout(timer);
    }
    prevLivesRef.current = lives;
  }, [lives]);

  const getPhaseText = useCallback((): { text: string; color: string } => {
    switch (phase) {
      case 'build':
        return { text: 'BUILD PHASE', color: '#22d3ee' };
      case 'wave':
        return { text: `${enemyCount} enemies remaining`, color: '#fb923c' };
      case 'paused':
        return { text: 'PAUSED', color: '#94a3b8' };
      case 'won':
        return { text: 'VICTORY!', color: '#4ade80' };
      case 'lost':
        return { text: 'DEFEATED', color: '#f87171' };
      default:
        return { text: '', color: '#94a3b8' };
    }
  }, [phase, enemyCount]);

  const phaseInfo = getPhaseText();

  const speedLabel = `${gameSpeed}x`;
  const waveProgress = totalWaves > 0 ? currentWave / totalWaves : 0;

  // Countdown ring SVG values
  const ringRadius = 32;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const countdownFraction = waveCountdown / 15;
  const ringOffset = ringCircumference * (1 - countdownFraction);

  return (
    <>
      {/* Top HUD Bar */}
      <div className={styles.hudBar}>
        {/* Left section — resources */}
        <div className={styles.hudLeft}>
          <div className={styles.statPill}>
            <span className={styles.statIcon}><CoinIcon /></span>
            <span className={`${styles.statValue} ${styles.goldValue} ${goldFlash ? styles.goldFlash : ''}`}>
              {gold}
            </span>
          </div>
          <div className={styles.statPill}>
            <span className={`${styles.statIcon} ${heartShake ? styles.heartShake : ''}`}><HeartIcon /></span>
            <span className={`${styles.statValue} ${styles.livesValue}`}>
              {lives}/{maxLives}
            </span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statIcon}><StarIcon /></span>
            <span className={`${styles.statValue} ${styles.scoreValue}`}>
              {score}
            </span>
          </div>
        </div>

        {/* Center section — wave info */}
        <div className={styles.hudCenter}>
          <div className={styles.waveTitle}>WAVE {currentWave} / {totalWaves}</div>
          <div className={styles.waveProgressTrack}>
            <div
              className={styles.waveProgressFill}
              style={{ width: `${waveProgress * 100}%` }}
            />
          </div>
          <div className={styles.phaseText} style={{ color: phaseInfo.color }}>
            {phaseInfo.text}
          </div>
        </div>

        {/* Right section — controls */}
        <div className={styles.hudRight}>
          <button
            className={`${styles.hudBtn} ${gameSpeed > 1 ? styles.hudBtnActive : ''}`}
            onClick={onSpeedToggle}
            title="Toggle game speed"
          >
            <SpeedIcon />
            <span className={styles.hudBtnLabel}>{speedLabel}</span>
          </button>
          <button
            className={`${styles.hudBtn} ${soundOn ? styles.hudBtnActive : ''}`}
            onClick={onSoundToggle}
            title="Toggle sound"
          >
            {soundOn ? <SpeakerIcon /> : <SpeakerMutedIcon />}
          </button>
          <button
            className={styles.hudBtn}
            onClick={onBackToMenu}
            title="Back to menu"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {/* Wave Start Button */}
      <AnimatePresence>
        {phase === 'build' && (
          <motion.div
            className={styles.waveStartWrap}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <button className={styles.waveStartBtn} onClick={onStartWave}>
              {autoStart && (
                <svg
                  className={styles.countdownRing}
                  viewBox="0 0 80 80"
                >
                  <circle
                    cx="40"
                    cy="40"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.2)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={ringRadius}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 0.3s linear' }}
                  />
                </svg>
              )}
              <span className={styles.waveStartLabel}>
                START WAVE {currentWave + 1}
              </span>
              {autoStart && (
                <span className={styles.countdownText}>
                  Auto in {Math.ceil(waveCountdown)}s
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
