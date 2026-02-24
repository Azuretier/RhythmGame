'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { MiniTower } from '../types';
import { MINI_TOWER_MAX_COUNT, TD_SETUP_GRID_HALF, GRID_TOWER_RADIUS } from '../constants';
import styles from '../VanillaGame.module.css';

interface TDGridSetupProps {
  miniTowers: MiniTower[];
  onPlace: (gx: number, gz: number) => void;
  onRemove: (id: number) => void;
  onConfirm: () => void;
  locale?: string;
}

const CELL_SIZE = 28; // px per cell
const GRID_SIZE = TD_SETUP_GRID_HALF * 2 + 1; // e.g. 17 cells wide/tall

/**
 * Pre-wave tower placement overlay shown during the CHECKPOINT game phase.
 * Players click cells on a 2D grid to place (or remove) mini-towers.
 * A "Start Wave!" button (or 15s auto-countdown) confirms the setup.
 */
export default function TDGridSetup({ miniTowers, onPlace, onRemove, onConfirm, locale = 'ja' }: TDGridSetupProps) {
  const isEn = locale === 'en';

  function cellTitle(isMain: boolean, hasTower: boolean): string {
    if (isMain) return isEn ? 'Main Tower' : 'メインタワー';
    if (hasTower) return isEn ? 'Remove' : '削除';
    return isEn ? 'Place mini-tower' : 'ミニタワーを配置';
  }
  const [secondsLeft, setSecondsLeft] = useState(15);
  const confirmedRef = useRef(false);

  // Countdown timer — auto-confirm after 15s
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!confirmedRef.current) {
            confirmedRef.current = true;
            onConfirm();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onConfirm]);

  const handleConfirm = () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm();
  };

  const handleCellClick = (gx: number, gz: number) => {
    // Check if a mini-tower already exists here
    const existing = miniTowers.find(t => t.gridX === gx && t.gridZ === gz);
    if (existing) {
      onRemove(existing.id);
    } else {
      onPlace(gx, gz);
    }
  };

  const isMainTower = (gx: number, gz: number) =>
    Math.abs(gx) + Math.abs(gz) <= GRID_TOWER_RADIUS;

  const hasMiniTower = (gx: number, gz: number) =>
    miniTowers.some(t => t.gridX === gx && t.gridZ === gz);

  const canPlace = miniTowers.length < MINI_TOWER_MAX_COUNT;

  return (
    <div className={styles.tdSetupOverlay}>
      <div className={styles.tdSetupPanel}>
        {/* Header */}
        <div className={styles.tdSetupHeader}>
          <div className={styles.tdSetupTitle}>
            {isEn ? '🗼 Place Mini-Towers' : '🗼 ミニタワー配置'}
          </div>
          <div className={styles.tdSetupSubtitle}>
            {isEn
              ? `${miniTowers.length} / ${MINI_TOWER_MAX_COUNT} placed — auto-start in ${secondsLeft}s`
              : `${miniTowers.length} / ${MINI_TOWER_MAX_COUNT} 配置済み — ${secondsLeft}秒で自動開始`}
          </div>
        </div>

        {/* Grid */}
        <div
          className={styles.tdSetupGrid}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gap: '1px',
          }}
        >
          {Array.from({ length: GRID_SIZE }, (_, ri) => {
            const gz = ri - TD_SETUP_GRID_HALF;
            return Array.from({ length: GRID_SIZE }, (_, ci) => {
              const gx = ci - TD_SETUP_GRID_HALF;
              const isMain = isMainTower(gx, gz);
              const hasTower = hasMiniTower(gx, gz);
              const canInteract = !isMain && (hasTower || canPlace);

              let bg = '#1e2533';
              if (isMain) bg = '#c0a030';
              else if (hasTower) bg = '#4488cc';

              return (
                <div
                  key={`${ri}-${ci}`}
                  onClick={() => canInteract && handleCellClick(gx, gz)}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: bg,
                    cursor: canInteract ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'filter 0.08s',
                  }}
                  title={cellTitle(isMain, hasTower)}
                >
                  {isMain && '🏰'}
                  {hasTower && '🗼'}
                </div>
              );
            });
          })}
        </div>

        {/* Footer */}
        <div className={styles.tdSetupFooter}>
          <div className={styles.tdSetupHint}>
            {isEn
              ? '🗼 Mini-towers auto-shoot enemies • Clear Tetris lines → massive aura burst!'
              : '🗼 ミニタワーは敵を自動射撃 • テトリスラインを消すと大型オーラが炸裂！'}
          </div>
          <button className={styles.tdSetupStartBtn} onClick={handleConfirm}>
            {isEn ? `▶ Start Wave (${secondsLeft}s)` : `▶ ウェーブ開始 (${secondsLeft}s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
