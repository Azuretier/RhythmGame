'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { MiniTower, MiniTowerType } from '../types';
import { MINI_TOWER_MAX_COUNT, TD_SETUP_GRID_HALF, GRID_TOWER_RADIUS, TOWER_DEFS } from '../constants';
import styles from '../VanillaGame.module.css';

interface TDGridSetupProps {
  miniTowers: MiniTower[];
  onPlace: (gx: number, gz: number, type: MiniTowerType) => void;
  onRemove: (id: number) => void;
  onConfirm: () => void;
  locale?: string;
}

const CELL_SIZE = 28; // px per cell
const GRID_SIZE = TD_SETUP_GRID_HALF * 2 + 1; // 17 cells wide/tall

/** All placeable tower types in order */
const TOWER_TYPES = Object.keys(TOWER_DEFS) as MiniTowerType[];

/**
 * Pre-wave tower placement overlay shown during the CHECKPOINT game phase.
 * Players select a tower type from the palette, then click grid cells to place.
 * A "Start Wave!" button (or 15s auto-countdown) confirms the setup.
 */
export default function TDGridSetup({ miniTowers, onPlace, onRemove, onConfirm, locale = 'ja' }: TDGridSetupProps) {
  const isEn = locale === 'en';
  const [selectedType, setSelectedType] = useState<MiniTowerType>('mini_tower');
  const [secondsLeft, setSecondsLeft] = useState(15);
  const confirmedRef = useRef(false);

  function cellTitle(isMain: boolean, hasTower: boolean, type?: MiniTowerType): string {
    if (isMain) return isEn ? 'Main Tower' : 'メインタワー';
    if (hasTower && type) {
      const def = TOWER_DEFS[type];
      return isEn ? `${def.label} — click to remove` : `${def.labelJa} — クリックで削除`;
    }
    const def = TOWER_DEFS[selectedType];
    return isEn ? `Place ${def.label}` : `${def.labelJa}を配置`;
  }

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
    const existing = miniTowers.find(t => t.gridX === gx && t.gridZ === gz);
    if (existing) {
      onRemove(existing.id);
    } else {
      onPlace(gx, gz, selectedType);
    }
  };

  const isMainTower = (gx: number, gz: number) =>
    Math.abs(gx) + Math.abs(gz) <= GRID_TOWER_RADIUS;

  const getTowerAt = (gx: number, gz: number): MiniTower | undefined =>
    miniTowers.find(t => t.gridX === gx && t.gridZ === gz);

  const canPlace = miniTowers.length < MINI_TOWER_MAX_COUNT;

  const selectedDef = TOWER_DEFS[selectedType];

  return (
    <div className={styles.tdSetupOverlay}>
      <div className={styles.tdSetupPanel}>
        {/* Header */}
        <div className={styles.tdSetupHeader}>
          <div className={styles.tdSetupTitle}>
            {isEn ? '🗼 Tower Placement' : '🗼 タワー配置'}
          </div>
          <div className={styles.tdSetupSubtitle}>
            {isEn
              ? `${miniTowers.length} / ${MINI_TOWER_MAX_COUNT} placed — auto-start in ${secondsLeft}s`
              : `${miniTowers.length} / ${MINI_TOWER_MAX_COUNT} 配置済み — ${secondsLeft}秒で自動開始`}
          </div>
        </div>

        {/* Tower type palette */}
        <div className={styles.tdTowerPalette}>
          {TOWER_TYPES.map(type => {
            const def = TOWER_DEFS[type];
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                className={styles.tdTowerPaletteBtn}
                data-active={isActive}
                onClick={() => setSelectedType(type)}
                title={isEn ? `${def.label}: ${def.description}` : `${def.labelJa}: ${def.descriptionJa}`}
                style={{ '--tower-color': def.color } as React.CSSProperties}
              >
                <span className={styles.tdTowerPaletteIcon}>{def.icon}</span>
                <span className={styles.tdTowerPaletteLabel}>
                  {isEn ? def.label : def.labelJa}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected tower description */}
        <div className={styles.tdTowerDesc}>
          <span style={{ color: selectedDef.color, fontWeight: 700 }}>
            {selectedDef.icon} {isEn ? selectedDef.label : selectedDef.labelJa}
          </span>
          {' — '}
          <span style={{ color: 'rgba(200,220,255,0.75)' }}>
            {isEn ? selectedDef.description : selectedDef.descriptionJa}
          </span>
          <span className={styles.tdTowerStatRow}>
            {isEn
              ? `⚔️ ${selectedDef.damage} dmg  •  🎯 ${selectedDef.range} range  •  ⏱ ${(selectedDef.fireInterval / 1000).toFixed(1)}s`
              : `⚔️ ${selectedDef.damage}ダメ  •  🎯 射程${selectedDef.range}  •  ⏱ ${(selectedDef.fireInterval / 1000).toFixed(1)}秒`}
          </span>
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
              const placed = getTowerAt(gx, gz);
              const canInteract = !isMain && (placed !== undefined || canPlace);

              // Cell background
              let bg = '#1e2533';
              if (isMain) bg = '#c0a030';
              else if (placed) bg = TOWER_DEFS[placed.towerType].color + '55'; // type color, ~33% opacity (0x55/0xFF ≈ 0.333)

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
                    border: placed
                      ? `1px solid ${TOWER_DEFS[placed.towerType].color}88`
                      : '1px solid rgba(255,255,255,0.06)',
                    transition: 'filter 0.08s',
                    boxSizing: 'border-box',
                  }}
                  title={cellTitle(isMain, !!placed, placed?.towerType)}
                >
                  {isMain && '🏰'}
                  {placed && TOWER_DEFS[placed.towerType].icon}
                </div>
              );
            });
          })}
        </div>

        {/* Footer */}
        <div className={styles.tdSetupFooter}>
          <div className={styles.tdSetupHint}>
            {isEn
              ? '✨ Aura towers boost adjacent towers • ❄️ Freeze slows enemies • Clear lines → massive aura burst!'
              : '✨ オーラは隣接タワーを強化 • ❄️ フリーズは敵を減速 • ライン消去で大型オーラ炸裂！'}
          </div>
          <button className={styles.tdSetupStartBtn} onClick={handleConfirm}>
            {isEn ? `▶ Start Wave (${secondsLeft}s)` : `▶ ウェーブ開始 (${secondsLeft}s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
