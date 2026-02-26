'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  TD_GRID_ROWS, TD_GRID_COLS, TD_CELL_PX,
  TD_TOWERS, TDTowerType, TDLayoutCell, TDSavedLayout,
} from '@/types/tower-defense';
import styles from './TowerDefense.module.css';

// ── Default path (a winding corridor through the grid) ──────────

const DEFAULT_PATH_CELLS: { r: number; c: number }[] = [
  // Entrance column (left side, col 0)
  { r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }, { r: 5, c: 0 },
  // Turn right
  { r: 5, c: 1 }, { r: 5, c: 2 }, { r: 5, c: 3 }, { r: 5, c: 4 }, { r: 5, c: 5 },
  // Turn down
  { r: 6, c: 5 }, { r: 7, c: 5 }, { r: 8, c: 5 },
  // Turn right
  { r: 8, c: 6 }, { r: 8, c: 7 }, { r: 8, c: 8 },
  // Turn up
  { r: 7, c: 8 }, { r: 6, c: 8 }, { r: 5, c: 8 }, { r: 4, c: 8 },
  // Turn right
  { r: 4, c: 9 }, { r: 4, c: 10 }, { r: 4, c: 11 },
  // Turn down
  { r: 5, c: 11 }, { r: 6, c: 11 }, { r: 7, c: 11 }, { r: 8, c: 11 },
  { r: 9, c: 11 }, { r: 10, c: 11 }, { r: 11, c: 11 }, { r: 12, c: 11 },
  // Turn left
  { r: 12, c: 10 }, { r: 12, c: 9 }, { r: 12, c: 8 }, { r: 12, c: 7 },
  // Turn down
  { r: 13, c: 7 }, { r: 14, c: 7 }, { r: 15, c: 7 },
  // Turn right toward goal
  { r: 15, c: 8 }, { r: 15, c: 9 }, { r: 15, c: 10 }, { r: 15, c: 11 },
  { r: 15, c: 12 }, { r: 15, c: 13 },
];

const SPAWN_CELL = { r: 2, c: 0 };
const GOAL_CELL  = { r: 15, c: 13 };

const STORAGE_KEY = 'td_saved_layout';

// ── Towers available in the editor palette ────────────────────────

const PALETTE_TOWERS: TDTowerType[] = ['mini_tower', 'archer', 'cannon', 'freeze', 'aura', 'wall'];

// ── Build default grid ────────────────────────────────────────────

function buildDefaultGrid(): TDLayoutCell[][] {
  const grid: TDLayoutCell[][] = Array.from({ length: TD_GRID_ROWS }, () =>
    Array<TDLayoutCell>(TD_GRID_COLS).fill('empty')
  );
  for (const { r, c } of DEFAULT_PATH_CELLS) {
    if (r >= 0 && r < TD_GRID_ROWS && c >= 0 && c < TD_GRID_COLS) grid[r][c] = 'path';
  }
  grid[SPAWN_CELL.r][SPAWN_CELL.c] = 'spawn';
  grid[GOAL_CELL.r][GOAL_CELL.c] = 'goal';
  return grid;
}

function loadLayout(): TDLayoutCell[][] {
  if (typeof window === 'undefined') return buildDefaultGrid();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultGrid();
    const saved = JSON.parse(raw) as TDSavedLayout;
    if (saved.version !== 1 || saved.rows !== TD_GRID_ROWS || saved.cols !== TD_GRID_COLS) {
      return buildDefaultGrid();
    }
    return saved.cells;
  } catch {
    return buildDefaultGrid();
  }
}

function saveLayout(cells: TDLayoutCell[][]): void {
  try {
    const layout: TDSavedLayout = { version: 1, rows: TD_GRID_ROWS, cols: TD_GRID_COLS, cells };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch { /* ignore */ }
}

// ── Helper: is a cell fixed (path/spawn/goal)? ───────────────────

function isFixed(cell: TDLayoutCell): boolean {
  return cell === 'path' || cell === 'spawn' || cell === 'goal';
}

// ── Component ────────────────────────────────────────────────────

interface TDGridEditorProps {
  onStart: (layout: TDLayoutCell[][]) => void;
  onBack: () => void;
  locale: string;
}

export default function TDGridEditor({ onStart, onBack, locale }: TDGridEditorProps) {
  const isEn = locale === 'en';

  const [grid, setGrid] = useState<TDLayoutCell[][]>(buildDefaultGrid);
  const [selected, setSelected] = useState<TDTowerType | 'eraser'>('mini_tower');
  const [painting, setPainting] = useState(false);

  useEffect(() => { setGrid(loadLayout()); }, []);

  const paint = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const current = prev[r][c];
      if (isFixed(current)) return prev;
      const next = prev.map(row => [...row]);
      if (selected === 'eraser') {
        next[r][c] = 'empty';
      } else {
        next[r][c] = current === selected ? 'empty' : selected;
      }
      saveLayout(next);
      return next;
    });
  }, [selected]);

  const handleMouseDown = (r: number, c: number) => { setPainting(true); paint(r, c); };
  const handleMouseEnter = (r: number, c: number) => { if (painting) paint(r, c); };
  const handleMouseUp = () => setPainting(false);

  const reset = () => {
    const fresh = buildDefaultGrid();
    setGrid(fresh);
    saveLayout(fresh);
  };

  const cellColor = (cell: TDLayoutCell): string => {
    if (cell === 'path')  return '#c8a868';
    if (cell === 'spawn') return '#44cc88';
    if (cell === 'goal')  return '#c0a030';
    if (cell === 'empty') return '#2a3040';
    return TD_TOWERS[cell as TDTowerType]?.color ?? '#666';
  };

  const cellIcon = (cell: TDLayoutCell): string => {
    if (cell === 'spawn') return '⚡';
    if (cell === 'goal')  return '🏰';
    if (cell === 'path')  return '';
    if (cell === 'empty') return '';
    return TD_TOWERS[cell as TDTowerType]?.icon ?? '';
  };

  return (
    <div className={styles.editorRoot} onMouseUp={handleMouseUp}>
      {/* Header */}
      <div className={styles.editorHeader}>
        <button className={styles.backBtn} onClick={onBack}>← {isEn ? 'Back' : '戻る'}</button>
        <h2 className={styles.editorTitle}>
          {isEn ? '⚙️ Tower Defense — Grid Setup' : '⚙️ タワーディフェンス — グリッド設定'}
        </h2>
        <div className={styles.editorHeaderRight}>
          <button className={styles.resetBtn} onClick={reset}>
            {isEn ? '↺ Reset' : '↺ リセット'}
          </button>
          <button
            className={styles.startBtn}
            onClick={() => onStart(grid)}
          >
            {isEn ? '▶ Start Game' : '▶ ゲーム開始'}
          </button>
        </div>
      </div>

      <div className={styles.editorBody}>
        {/* Tower palette */}
        <div className={styles.palette}>
          <div className={styles.paletteTitle}>{isEn ? 'Place' : '配置'}</div>
          {PALETTE_TOWERS.map(t => {
            const def = TD_TOWERS[t];
            return (
              <button
                key={t}
                className={`${styles.paletteBtn} ${selected === t ? styles.paletteBtnSelected : ''}`}
                style={{ '--accent': def.color } as React.CSSProperties}
                onClick={() => setSelected(t)}
                title={`${def.label} — ${isEn ? def.description : def.label}`}
              >
                <span className={styles.paletteBtnIcon}>{def.icon}</span>
                <span className={styles.paletteBtnLabel}>{def.label}</span>
                <span className={styles.paletteBtnCost}>💰{def.cost}</span>
              </button>
            );
          })}
          <div className={styles.paletteDivider} />
          <button
            className={`${styles.paletteBtn} ${selected === 'eraser' ? styles.paletteBtnSelected : ''}`}
            style={{ '--accent': '#ff6644' } as React.CSSProperties}
            onClick={() => setSelected('eraser')}
          >
            <span className={styles.paletteBtnIcon}>🗑️</span>
            <span className={styles.paletteBtnLabel}>{isEn ? 'Eraser' : '消去'}</span>
          </button>

          {/* Legend */}
          <div className={styles.legendSection}>
            <div className={styles.legendTitle}>{isEn ? 'Legend' : '凡例'}</div>
            <div className={styles.legendRow}>
              <span className={styles.legendSwatch} style={{ background: '#c8a868' }} />
              {isEn ? 'Enemy Path' : '敵の経路'}
            </div>
            <div className={styles.legendRow}>
              <span className={styles.legendSwatch} style={{ background: '#44cc88' }} />
              {isEn ? 'Spawn' : 'スポーン'}
            </div>
            <div className={styles.legendRow}>
              <span className={styles.legendSwatch} style={{ background: '#c0a030' }} />
              {isEn ? 'Main Tower' : 'メインタワー'}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className={styles.gridContainer}>
          <div
            className={styles.grid}
            style={{
              gridTemplateColumns: `repeat(${TD_GRID_COLS}, ${TD_CELL_PX}px)`,
              gridTemplateRows: `repeat(${TD_GRID_ROWS}, ${TD_CELL_PX}px)`,
            }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`${styles.cell} ${isFixed(cell) ? styles.cellFixed : styles.cellPlaceable}`}
                  style={{ background: cellColor(cell) }}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  title={`${r},${c} — ${cell}`}
                >
                  {cellIcon(cell) && (
                    <span className={styles.cellIcon}>{cellIcon(cell)}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className={styles.infoPanel}>
          {selected !== 'eraser' && (
            <>
              <div className={styles.infoIcon}>{TD_TOWERS[selected].icon}</div>
              <div className={styles.infoName}>{TD_TOWERS[selected].label}</div>
              <div className={styles.infoCost}>💰 {TD_TOWERS[selected].cost} {isEn ? 'gold' : 'ゴールド'}</div>
              <div className={styles.infoDesc}>{TD_TOWERS[selected].description}</div>
              <div className={styles.infoStats}>
                {TD_TOWERS[selected].damage > 0 && (
                  <div className={styles.infoStat}>
                    <span>⚔️</span>
                    <span>{isEn ? 'Damage' : 'ダメージ'}: {TD_TOWERS[selected].damage}</span>
                  </div>
                )}
                {TD_TOWERS[selected].range > 0 && (
                  <div className={styles.infoStat}>
                    <span>🎯</span>
                    <span>{isEn ? 'Range' : '射程'}: {TD_TOWERS[selected].range}</span>
                  </div>
                )}
                {TD_TOWERS[selected].attackSpeed > 0 && (
                  <div className={styles.infoStat}>
                    <span>⏱️</span>
                    <span>{isEn ? 'Speed' : '速度'}: {TD_TOWERS[selected].attackSpeed}/s</span>
                  </div>
                )}
                <div className={styles.infoStat}>
                  <span>❤️</span>
                  <span>HP: {TD_TOWERS[selected].hp}</span>
                </div>
              </div>
            </>
          )}
          {selected === 'eraser' && (
            <>
              <div className={styles.infoIcon}>🗑️</div>
              <div className={styles.infoName}>{isEn ? 'Eraser' : '消去'}</div>
              <div className={styles.infoDesc}>{isEn ? 'Click cells to remove placed towers.' : 'セルをクリックしてタワーを削除します。'}</div>
            </>
          )}

          <div className={styles.tipSection}>
            <div className={styles.tipTitle}>💡 {isEn ? 'Tips' : 'ヒント'}</div>
            <ul className={styles.tipList}>
              <li>{isEn ? 'Place towers on grey cells only.' : '灰色のセルにのみタワーを配置できます。'}</li>
              <li>{isEn ? 'Aura towers boost neighbors.' : 'オーラタワーは隣接するタワーを強化します。'}</li>
              <li>{isEn ? 'Clearing Tetris lines emits an aura that damages all enemies.' : 'テトリスのラインを消すと敵にダメージを与えるオーラが発生。'}</li>
              <li>{isEn ? 'Garbage Throwers arc blocks to your Tetris board!' : 'ガーベッジスローワーはブロックを放物線でテトリスボードに投げ込む！'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
