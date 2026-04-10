'use client';

import { motion } from 'framer-motion';
import { MAPS } from '@/lib/tower-defense/maps';
import type { GameMap, TerrainType } from '@/types/tower-defense';
import styles from './TDMenuScreen.module.css';

interface TDMenuScreenProps {
  selectedMap: number;
  onSelectMap: (index: number) => void;
  onStart: () => void;
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: '#22c55e20',
  path: '#a8854040',
  water: '#38bdf840',
  mountain: '#78716c40',
  spawn: '#ef444480',
  base: '#3b82f680',
};

const MAP_DIFFICULTY: { label: string; color: string }[] = [
  { label: 'Normal', color: '#4ade80' },
  { label: 'Hard', color: '#f97316' },
];

function MapPreview({ map }: { map: GameMap }) {
  return (
    <div className={styles.mapPreview}>
      {map.grid.flatMap((row, z) =>
        row.map((cell, x) => (
          <div
            key={`${z}-${x}`}
            className={styles.mapPreviewCell}
            style={{ backgroundColor: TERRAIN_COLORS[cell.terrain] }}
          />
        ))
      )}
    </div>
  );
}

export default function TDMenuScreen({ selectedMap, onSelectMap, onStart }: TDMenuScreenProps) {
  return (
    <div className={styles.menuScreen}>
      <motion.h1
        className={styles.menuTitle}
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        Tower Defense
      </motion.h1>

      <motion.p
        className={styles.menuSubtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        Defend your base against 30 waves of enemies
      </motion.p>

      <div className={styles.mapGrid}>
        {MAPS.map((map, index) => {
          const isSelected = selectedMap === index;
          const difficulty = MAP_DIFFICULTY[index] ?? MAP_DIFFICULTY[0];
          const turnCount = map.waypoints.length - 1;

          return (
            <motion.div
              key={map.name}
              className={`${styles.mapCard} ${isSelected ? styles.mapCardSelected : ''}`}
              onClick={() => onSelectMap(index)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.15 }}
              whileHover={{ y: -6 }}
            >
              <MapPreview map={map} />
              <div className={styles.mapInfo}>
                <span className={styles.mapName}>{map.name}</span>
                <div className={styles.mapMeta}>
                  <span className={styles.mapDifficulty}>
                    <span
                      className={styles.mapDifficultyDot}
                      style={{ backgroundColor: difficulty.color }}
                    />
                    {difficulty.label}
                  </span>
                  <span className={styles.mapTurns}>{turnCount} turns</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        className={styles.startBtn}
        onClick={onStart}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        Start Game
      </motion.button>
    </div>
  );
}
