'use client';

// =============================================================================
// Minecraft: Switch Edition — Title Screen
// Console edition-style menu with rotating panorama, 3D beveled buttons,
// and animated panel transitions. Reuses the proven v1.0.2 UI system.
// =============================================================================

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import styles from '@/components/home/v1.0.2/V1_0_2_UI.module.css';
import type { GameMode, Difficulty } from '@/types/minecraft-switch';

const MinecraftPanorama = dynamic(
  () => import('@/components/home/v1.0.2/MinecraftPanorama'),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Screen = 'main' | 'createWorld';
type WorldSize = 'classic' | 'small' | 'medium';

interface WorldConfig {
  name: string;
  seed: string;
  size: WorldSize;
  gameMode: GameMode;
  difficulty: Difficulty;
}

// ---------------------------------------------------------------------------
// Splash texts
// ---------------------------------------------------------------------------

const SPLASHES = [
  'Web Edition!',
  'Now in your browser!',
  'TypeScript-powered!',
  'Also try Terraria!',
  '100% renewable!',
  'Pixel perfect!',
  'Three.js inside!',
  'Voxel magic!',
  'Is that a creeper?',
  'Block by block!',
  'Notch approved*',
  'Infinite potential!',
  'Craft everything!',
];

// ---------------------------------------------------------------------------
// Form input style (reused in create world panel)
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontFamily: 'var(--font-pixel), "Press Start 2P", monospace',
  fontSize: '12px',
  color: '#ffffff',
  background: 'rgba(0, 0, 0, 0.6)',
  border: '2px solid #555555',
  borderColor: '#555555 #2a2a2a #2a2a2a #555555',
  outline: 'none',
  imageRendering: 'pixelated' as const,
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-pixel), "Press Start 2P", monospace',
  fontSize: '10px',
  color: 'rgba(255, 255, 255, 0.6)',
  textShadow: '1px 1px 0px rgba(0, 0, 0, 0.5)',
  marginBottom: '4px',
  display: 'block',
  userSelect: 'none',
};

// ---------------------------------------------------------------------------
// World Creation Panel
// ---------------------------------------------------------------------------

function WorldCreationPanel({
  onCancel,
  onCreateWorld,
}: {
  onCancel: () => void;
  onCreateWorld: (config: WorldConfig) => void;
}) {
  const [worldName, setWorldName] = useState('New World');
  const [seed, setSeed] = useState('');
  const [size, setSize] = useState<WorldSize>('classic');
  const [gameMode, setGameMode] = useState<GameMode>('survival');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const handleCreate = useCallback(() => {
    onCreateWorld({
      name: worldName.trim() || 'New World',
      seed: seed.trim(),
      size,
      gameMode,
      difficulty,
    });
  }, [worldName, seed, size, gameMode, difficulty, onCreateWorld]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.25 }}
      className="relative z-10 flex items-center justify-center h-full px-4"
    >
      <div className={styles.mcPanel} style={{ maxWidth: '480px', width: '100%' }}>
        {/* Header */}
        <div className={styles.mcPanelHeader}>
          <span className={styles.mcPanelTitle}>Create New World</span>
        </div>

        {/* Content */}
        <div className={styles.mcPanelContent}>
          {/* World Name */}
          <div style={{ marginBottom: '8px' }}>
            <label style={labelStyle}>World Name</label>
            <input
              type="text"
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              style={inputStyle}
              placeholder="New World"
              maxLength={32}
            />
          </div>

          {/* Seed */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Seed (optional)</label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              style={inputStyle}
              placeholder="Leave blank for random"
            />
          </div>

          {/* World Size */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>World Size</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['classic', 'small', 'medium'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={size === s ? styles.mcButtonPrimary : styles.mcButton}
                  style={{ flex: 1, minHeight: '36px', fontSize: '11px', padding: '6px 8px' }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Game Mode */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Game Mode</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['survival', 'creative'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  className={gameMode === mode ? styles.mcButtonPrimary : styles.mcButton}
                  style={{ flex: 1, minHeight: '36px', fontSize: '11px', padding: '6px 8px' }}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div style={{ marginBottom: '4px' }}>
            <label style={labelStyle}>Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                appearance: 'auto',
              }}
            >
              <option value="peaceful">Peaceful</option>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.mcPanelFooter} style={{ gap: '8px' }}>
          <button
            className={styles.mcButtonPrimary}
            style={{ flex: 1 }}
            onClick={handleCreate}
          >
            Create World
          </button>
          <button
            className={styles.mcButton}
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MinecraftTitlePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('main');
  const [splash] = useState(
    () => SPLASHES[Math.floor(Math.random() * SPLASHES.length)],
  );

  const handleCreateWorld = useCallback((config: WorldConfig) => {
    let seedNum: number;
    if (config.seed) {
      let hash = 0;
      for (let i = 0; i < config.seed.length; i++) {
        const char = config.seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      seedNum = Math.abs(hash);
    } else {
      seedNum = Math.floor(Math.random() * 2147483647);
    }

    const params = new URLSearchParams({
      seed: seedNum.toString(),
      size: config.size,
      mode: config.gameMode,
      difficulty: config.difficulty,
      name: config.name,
    });

    router.push(`/minecraft/play?${params.toString()}`);
  }, [router]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Panorama background */}
      <MinecraftPanorama />

      {/* Overlays */}
      <div className={styles.vignette} />
      <div className={styles.gradientOverlay} />

      {/* Screen content */}
      <AnimatePresence mode="wait">
        {screen === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 flex flex-col items-center justify-center h-full"
          >
            {/* Title */}
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="flex flex-col items-center mb-8"
            >
              <h1 className={styles.mcTitle}>MINECRAFT</h1>
              <div className="relative mt-1">
                <span className={styles.mcSubtitle}>Switch Edition</span>
                {/* Splash text */}
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, type: 'spring' }}
                  className={styles.splashText}
                  style={{
                    position: 'absolute',
                    left: '110%',
                    top: '-12px',
                  }}
                >
                  {splash}
                </motion.span>
              </div>
            </motion.div>

            {/* Menu buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className={styles.menuContainer}
            >
              {/* Play — primary, full width */}
              <button
                className={styles.mcButtonPrimary}
                style={{ width: '100%' }}
                onClick={() => setScreen('createWorld')}
              >
                Play
              </button>

              {/* Create New World | Load World */}
              <div className={styles.menuRow}>
                <button
                  className={styles.mcButton}
                  onClick={() => setScreen('createWorld')}
                >
                  Create New World
                </button>
                <button
                  className={styles.mcButton}
                  disabled
                >
                  Load World
                </button>
              </div>

              {/* Multiplayer | Mini-Games */}
              <div className={styles.menuRow}>
                <button
                  className={styles.mcButton}
                  disabled
                >
                  Multiplayer
                </button>
                <button
                  className={styles.mcButton}
                  disabled
                >
                  Mini-Games
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {screen === 'createWorld' && (
          <WorldCreationPanel
            key="createWorld"
            onCancel={() => setScreen('main')}
            onCreateWorld={handleCreateWorld}
          />
        )}
      </AnimatePresence>

      {/* Bottom info bar */}
      <div className={styles.bottomBar}>
        <span className={styles.bottomBarText}>
          Minecraft: Switch Edition (Web)
        </span>
        <span className={styles.bottomBarText}>
          v0.1.0-alpha
        </span>
      </div>
    </div>
  );
}
