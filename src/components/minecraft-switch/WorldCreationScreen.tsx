'use client';

// =============================================================================
// World Creation Screen
// Minecraft: Nintendo Switch Edition — pixel-perfect world creation UI
// =============================================================================

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { GameMode, Difficulty, WorldType } from '@/types/minecraft-switch';
import {
  GAME_MODE_INFO,
  DIFFICULTY_INFO,
  WORLD_SIZE_PRESETS,
} from '@/lib/minecraft-switch/game-modes';
import type { GameRules } from '@/lib/minecraft-switch/game-modes';
import { getDefaultGameRules } from '@/lib/minecraft-switch/game-modes';
import styles from './MinecraftSwitch.module.css';

// =============================================================================
// Types
// =============================================================================

interface WorldCreationConfig {
  worldName: string;
  seed: string;
  worldSize: string;
  gameMode: GameMode;
  difficulty: Difficulty;
  worldType: WorldType;
  gameRules: GameRules;
  generateStructures: boolean;
  bonusChest: boolean;
}

interface WorldCreationScreenProps {
  onCreateWorld: (config: WorldCreationConfig) => void;
  onCancel: () => void;
  className?: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.mcLabel} style={{ marginTop: 8 }}>
      {children}
    </span>
  );
}

function ButtonRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, width: '100%' }}>
      {children}
    </div>
  );
}

function McToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        width: '100%',
      }}
    >
      <span className={styles.mcDescription} style={{ color: '#cccccc', fontSize: 11 }}>
        {label}
      </span>
      <button
        type="button"
        className={checked ? styles.mcToggleOn : styles.mcToggleOff}
        onClick={() => onChange(!checked)}
        style={{ minWidth: 70, flexShrink: 0 }}
      >
        {checked ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function WorldCreationScreen({ onCreateWorld, onCancel, className }: WorldCreationScreenProps) {
  const [worldName, setWorldName] = useState('New World');
  const [seed, setSeed] = useState('');
  const [worldSize, setWorldSize] = useState('small');
  const [gameMode, setGameMode] = useState<GameMode>('survival');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [worldType, setWorldType] = useState<WorldType>('default');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showGameRules, setShowGameRules] = useState(false);
  const [gameRules, setGameRules] = useState<GameRules>(getDefaultGameRules);
  const [generateStructures, setGenerateStructures] = useState(true);
  const [bonusChest, setBonusChest] = useState(false);

  const updateGameRule = useCallback(<K extends keyof GameRules>(key: K, value: GameRules[K]) => {
    setGameRules(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCreate = useCallback(() => {
    onCreateWorld({
      worldName: worldName.trim() || 'New World',
      seed,
      worldSize,
      gameMode,
      difficulty,
      worldType,
      gameRules,
      generateStructures,
      bonusChest,
    });
  }, [worldName, seed, worldSize, gameMode, difficulty, worldType, gameRules, generateStructures, bonusChest, onCreateWorld]);

  const selectedModeInfo = GAME_MODE_INFO.find(gm => gm.mode === gameMode);
  const selectedDiffInfo = DIFFICULTY_INFO.find(d => d.difficulty === difficulty);
  const selectedSizeInfo = WORLD_SIZE_PRESETS.find(p => p.id === worldSize);

  return (
    <div className={cn(styles.mcPanel, className)}>
      {/* Header */}
      <div className={styles.mcPanelHeader}>
        <h2 className={styles.mcPanelTitle}>Create New World</h2>
      </div>

      {/* Scrollable content */}
      <div className={styles.mcPanelContent}>
        {/* World Name */}
        <SectionLabel>World Name</SectionLabel>
        <input
          type="text"
          value={worldName}
          onChange={(e) => setWorldName(e.target.value)}
          placeholder="New World"
          maxLength={32}
          className={styles.mcInput}
        />

        {/* Seed */}
        <SectionLabel>Seed</SectionLabel>
        <input
          type="text"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="Leave blank for random"
          className={styles.mcInput}
        />

        {/* Separator */}
        <div className={styles.mcSeparator} />

        {/* Game Mode */}
        <SectionLabel>Game Mode</SectionLabel>
        <ButtonRow>
          {GAME_MODE_INFO.map(gm => (
            <button
              key={gm.mode}
              type="button"
              className={gameMode === gm.mode ? styles.mcButtonPrimary : styles.mcButton}
              style={{ flex: 1, fontSize: 11, padding: '6px 4px' }}
              onClick={() => setGameMode(gm.mode)}
            >
              {gm.name}
            </button>
          ))}
        </ButtonRow>
        {selectedModeInfo && (
          <span className={styles.mcDescription}>
            {selectedModeInfo.description}
          </span>
        )}

        {/* Separator */}
        <div className={styles.mcSeparator} />

        {/* Difficulty */}
        <SectionLabel>Difficulty</SectionLabel>
        <ButtonRow>
          {DIFFICULTY_INFO.map(diff => (
            <button
              key={diff.difficulty}
              type="button"
              className={difficulty === diff.difficulty ? styles.mcButtonPrimary : styles.mcButton}
              style={{ flex: 1, fontSize: 11, padding: '6px 4px' }}
              onClick={() => setDifficulty(diff.difficulty)}
            >
              {diff.name}
            </button>
          ))}
        </ButtonRow>
        {selectedDiffInfo && (
          <span className={styles.mcDescription}>
            {selectedDiffInfo.description}
          </span>
        )}

        {/* Separator */}
        <div className={styles.mcSeparator} />

        {/* World Size */}
        <SectionLabel>World Size</SectionLabel>
        <ButtonRow>
          {WORLD_SIZE_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              className={worldSize === preset.id ? styles.mcButtonPrimary : styles.mcButton}
              style={{ flex: 1, fontSize: 11, padding: '6px 8px' }}
              onClick={() => setWorldSize(preset.id)}
            >
              {preset.name}
            </button>
          ))}
        </ButtonRow>
        {selectedSizeInfo && (
          <span className={styles.mcDescription}>
            {selectedSizeInfo.description}
          </span>
        )}

        {/* Separator */}
        <div className={styles.mcSeparator} />

        {/* World Type */}
        <SectionLabel>World Type</SectionLabel>
        <ButtonRow>
          {([
            { value: 'default' as const, label: 'Default' },
            { value: 'superflat' as const, label: 'Superflat' },
            { value: 'amplified' as const, label: 'Amplified' },
          ]).map(wt => (
            <button
              key={wt.value}
              type="button"
              className={worldType === wt.value ? styles.mcButtonPrimary : styles.mcButton}
              style={{ flex: 1, fontSize: 11, padding: '6px 8px' }}
              onClick={() => setWorldType(wt.value)}
            >
              {wt.label}
            </button>
          ))}
        </ButtonRow>

        {/* Separator */}
        <div className={styles.mcSeparator} />

        {/* More World Options — expandable */}
        <button
          type="button"
          className={styles.mcButton}
          style={{ width: '100%' }}
          onClick={() => setShowMoreOptions(!showMoreOptions)}
        >
          {showMoreOptions ? '\u25BC' : '\u25B6'} More World Options
        </button>

        {showMoreOptions && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', paddingLeft: 4, paddingRight: 4 }}>
            <McToggleRow
              label="Generate Structures"
              checked={generateStructures}
              onChange={setGenerateStructures}
            />
            <McToggleRow
              label="Bonus Chest"
              checked={bonusChest}
              onChange={setBonusChest}
            />
          </div>
        )}

        {/* Separator */}
        <div className={styles.mcSeparator} />

        {/* Game Rules — expandable */}
        <button
          type="button"
          className={styles.mcButton}
          style={{ width: '100%' }}
          onClick={() => setShowGameRules(!showGameRules)}
        >
          {showGameRules ? '\u25BC' : '\u25B6'} Game Rules
        </button>

        {showGameRules && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', paddingLeft: 4, paddingRight: 4 }}>
            <McToggleRow
              label="Keep Inventory"
              checked={gameRules.keepInventory}
              onChange={(v) => updateGameRule('keepInventory', v)}
            />
            <McToggleRow
              label="Mob Griefing"
              checked={gameRules.mobGriefing}
              onChange={(v) => updateGameRule('mobGriefing', v)}
            />
            <McToggleRow
              label="Daylight Cycle"
              checked={gameRules.doDaylightCycle}
              onChange={(v) => updateGameRule('doDaylightCycle', v)}
            />
            <McToggleRow
              label="Weather Cycle"
              checked={gameRules.doWeatherCycle}
              onChange={(v) => updateGameRule('doWeatherCycle', v)}
            />
            <McToggleRow
              label="PvP"
              checked={gameRules.pvp}
              onChange={(v) => updateGameRule('pvp', v)}
            />
            <McToggleRow
              label="Show Coordinates"
              checked={gameRules.showCoordinates}
              onChange={(v) => updateGameRule('showCoordinates', v)}
            />
            <McToggleRow
              label="Fire Tick"
              checked={gameRules.doFireTick}
              onChange={(v) => updateGameRule('doFireTick', v)}
            />
            <McToggleRow
              label="Natural Regeneration"
              checked={gameRules.naturalRegeneration}
              onChange={(v) => updateGameRule('naturalRegeneration', v)}
            />
            <McToggleRow
              label="Tile Drops"
              checked={gameRules.doTileDrops}
              onChange={(v) => updateGameRule('doTileDrops', v)}
            />
            <McToggleRow
              label="Mob Loot"
              checked={gameRules.doMobLoot}
              onChange={(v) => updateGameRule('doMobLoot', v)}
            />
            <McToggleRow
              label="Mob Spawning"
              checked={gameRules.doMobSpawning}
              onChange={(v) => updateGameRule('doMobSpawning', v)}
            />

            {/* Random Tick Speed */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                width: '100%',
              }}
            >
              <span className={styles.mcDescription} style={{ color: '#cccccc', fontSize: 11 }}>
                Random Tick Speed
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={gameRules.randomTickSpeed}
                onChange={(e) => updateGameRule('randomTickSpeed', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className={styles.mcInput}
                style={{ width: 64, textAlign: 'center', minHeight: 32 }}
              />
            </div>

            {/* Spawn Radius */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                width: '100%',
              }}
            >
              <span className={styles.mcDescription} style={{ color: '#cccccc', fontSize: 11 }}>
                Spawn Radius
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={gameRules.spawnRadius}
                onChange={(e) => updateGameRule('spawnRadius', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className={styles.mcInput}
                style={{ width: 64, textAlign: 'center', minHeight: 32 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.mcPanelFooter} style={{ flexDirection: 'column', gap: 6 }}>
        <button
          type="button"
          className={styles.mcButtonPrimary}
          style={{ width: '100%' }}
          onClick={handleCreate}
        >
          Create World
        </button>
        <button
          type="button"
          className={styles.mcButton}
          style={{ width: '100%' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default WorldCreationScreen;
