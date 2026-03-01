'use client';

// =============================================================================
// World Creation Screen
// Enhanced world creation UI for Minecraft: Nintendo Switch Edition
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-2 mt-6 first:mt-0">
      {children}
    </h3>
  );
}

function CardSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; description: string; icon?: string; color?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all',
            'hover:border-zinc-500 hover:bg-zinc-800/60',
            value === option.value
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-zinc-700 bg-zinc-900/40',
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {option.icon && (
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: option.color || '#888' }}
              >
                {option.icon === 'sword' && '\u2694'}
                {option.icon === 'star' && '\u2605'}
                {option.icon === 'map' && '\u{1F5FA}'}
                {option.icon === 'eye' && '\u{1F441}'}
              </span>
            )}
            <span className={cn(
              'font-semibold text-sm',
              value === option.value ? 'text-emerald-400' : 'text-zinc-200',
            )}>
              {option.label}
            </span>
          </div>
          <span className="text-xs text-zinc-400 leading-tight">
            {option.description}
          </span>
        </button>
      ))}
    </div>
  );
}

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer group">
      <div className="flex-1 mr-4">
        <span className="text-sm text-zinc-200 group-hover:text-white transition-colors">
          {label}
        </span>
        {description && (
          <span className="block text-xs text-zinc-500 mt-0.5">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
          checked ? 'bg-emerald-500' : 'bg-zinc-600',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
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
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  return (
    <div className={cn(
      'flex flex-col w-full max-w-2xl mx-auto bg-zinc-900/95 backdrop-blur-sm',
      'border border-zinc-700 rounded-xl shadow-2xl overflow-hidden',
      className,
    )}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-700 bg-zinc-800/50">
        <h2 className="text-xl font-bold text-white">Create New World</h2>
        <p className="text-xs text-zinc-400 mt-1">Configure your world settings before playing</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 max-h-[70vh]">
        {/* World Name */}
        <SectionTitle>World Name</SectionTitle>
        <input
          type="text"
          value={worldName}
          onChange={(e) => setWorldName(e.target.value)}
          placeholder="New World"
          maxLength={32}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm',
            'bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500',
            'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30',
            'transition-colors',
          )}
        />

        {/* Seed */}
        <SectionTitle>Seed</SectionTitle>
        <input
          type="text"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="Leave blank for random"
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm',
            'bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500',
            'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30',
            'transition-colors',
          )}
        />
        <p className="text-xs text-zinc-500 mt-1">
          Enter a number or text to generate a specific world
        </p>

        {/* World Size */}
        <SectionTitle>World Size</SectionTitle>
        <CardSelector
          options={WORLD_SIZE_PRESETS.map(preset => ({
            value: preset.id,
            label: preset.name,
            description: preset.description,
          }))}
          value={worldSize}
          onChange={setWorldSize}
        />

        {/* Game Mode */}
        <SectionTitle>Game Mode</SectionTitle>
        <CardSelector
          options={GAME_MODE_INFO.filter(gm => gm.mode !== 'spectator').map(gm => ({
            value: gm.mode,
            label: gm.name,
            description: gm.description,
            icon: gm.icon,
            color: gm.color,
          }))}
          value={gameMode}
          onChange={setGameMode}
        />

        {/* Difficulty */}
        <SectionTitle>Difficulty</SectionTitle>
        <div className="flex gap-2">
          {DIFFICULTY_INFO.map(diff => (
            <button
              key={diff.difficulty}
              type="button"
              onClick={() => setDifficulty(diff.difficulty)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                'border-2',
                difficulty === diff.difficulty
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-500',
              )}
            >
              <span className="block">{diff.name}</span>
              <span className="block text-[10px] font-normal mt-0.5 opacity-60">
                {diff.description}
              </span>
            </button>
          ))}
        </div>

        {/* World Type */}
        <SectionTitle>World Type</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          {([
            { value: 'default' as const, label: 'Default', desc: 'Standard terrain generation' },
            { value: 'superflat' as const, label: 'Superflat', desc: 'Flat world of grass' },
            { value: 'large_biomes' as const, label: 'Large Biomes', desc: 'Bigger biomes' },
            { value: 'amplified' as const, label: 'Amplified', desc: 'Extreme terrain heights' },
          ]).map(wt => (
            <button
              key={wt.value}
              type="button"
              onClick={() => setWorldType(wt.value)}
              className={cn(
                'flex-1 min-w-[100px] py-2 px-3 rounded-lg text-sm font-medium transition-all border-2',
                worldType === wt.value
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-500',
              )}
            >
              <span className="block">{wt.label}</span>
              <span className="block text-[10px] font-normal mt-0.5 opacity-60">{wt.desc}</span>
            </button>
          ))}
        </div>

        {/* More Options */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors',
              showAdvanced ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            <span className={cn(
              'transform transition-transform text-xs',
              showAdvanced ? 'rotate-90' : '',
            )}>
              {'\u25B6'}
            </span>
            More Options
          </button>

          {showAdvanced && (
            <div className="mt-3 pl-2 border-l-2 border-zinc-700 space-y-0">
              {/* Structure generation */}
              <ToggleSwitch
                label="Generate Structures"
                description="Villages, temples, dungeons, etc."
                checked={generateStructures}
                onChange={setGenerateStructures}
              />

              {/* Bonus chest */}
              <ToggleSwitch
                label="Bonus Chest"
                description="A chest with starter items near spawn"
                checked={bonusChest}
                onChange={setBonusChest}
              />

              {/* Divider */}
              <div className="border-t border-zinc-700/50 my-2" />

              {/* Game Rules */}
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Game Rules
              </h4>

              <ToggleSwitch
                label="Keep Inventory"
                description="Keep items when you die"
                checked={gameRules.keepInventory}
                onChange={(v) => updateGameRule('keepInventory', v)}
              />

              <ToggleSwitch
                label="Mob Griefing"
                description="Mobs can destroy blocks"
                checked={gameRules.mobGriefing}
                onChange={(v) => updateGameRule('mobGriefing', v)}
              />

              <ToggleSwitch
                label="Daylight Cycle"
                description="Time advances naturally"
                checked={gameRules.doDaylightCycle}
                onChange={(v) => updateGameRule('doDaylightCycle', v)}
              />

              <ToggleSwitch
                label="Weather Cycle"
                description="Weather changes over time"
                checked={gameRules.doWeatherCycle}
                onChange={(v) => updateGameRule('doWeatherCycle', v)}
              />

              <ToggleSwitch
                label="PvP"
                description="Players can damage each other"
                checked={gameRules.pvp}
                onChange={(v) => updateGameRule('pvp', v)}
              />

              <ToggleSwitch
                label="Show Coordinates"
                description="Display XYZ coordinates on screen"
                checked={gameRules.showCoordinates}
                onChange={(v) => updateGameRule('showCoordinates', v)}
              />

              <ToggleSwitch
                label="Fire Tick"
                description="Fire spreads and extinguishes"
                checked={gameRules.doFireTick}
                onChange={(v) => updateGameRule('doFireTick', v)}
              />

              <ToggleSwitch
                label="Natural Regeneration"
                description="Health regenerates when hunger is full"
                checked={gameRules.naturalRegeneration}
                onChange={(v) => updateGameRule('naturalRegeneration', v)}
              />

              <ToggleSwitch
                label="Tile Drops"
                description="Blocks drop items when broken"
                checked={gameRules.doTileDrops}
                onChange={(v) => updateGameRule('doTileDrops', v)}
              />

              <ToggleSwitch
                label="Mob Loot"
                description="Mobs drop items on death"
                checked={gameRules.doMobLoot}
                onChange={(v) => updateGameRule('doMobLoot', v)}
              />

              <ToggleSwitch
                label="Mob Spawning"
                description="Mobs spawn naturally in the world"
                checked={gameRules.doMobSpawning}
                onChange={(v) => updateGameRule('doMobSpawning', v)}
              />

              {/* Random Tick Speed */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-zinc-200">Random Tick Speed</span>
                  <span className="block text-xs text-zinc-500 mt-0.5">
                    Speed of crop growth, leaf decay, etc. (default: 3)
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={gameRules.randomTickSpeed}
                  onChange={(e) => updateGameRule('randomTickSpeed', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className={cn(
                    'w-16 px-2 py-1 rounded text-sm text-center',
                    'bg-zinc-800 border border-zinc-600 text-white',
                    'focus:outline-none focus:border-emerald-500',
                  )}
                />
              </div>

              {/* Spawn Radius */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-zinc-200">Spawn Radius</span>
                  <span className="block text-xs text-zinc-500 mt-0.5">
                    Protected area around world spawn (default: 10)
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={gameRules.spawnRadius}
                  onChange={(e) => updateGameRule('spawnRadius', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className={cn(
                    'w-16 px-2 py-1 rounded text-sm text-center',
                    'bg-zinc-800 border border-zinc-600 text-white',
                    'focus:outline-none focus:border-emerald-500',
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-zinc-700 bg-zinc-800/50 flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white',
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          className={cn(
            'px-5 py-2.5 rounded-lg text-sm font-bold transition-colors',
            'bg-emerald-600 text-white hover:bg-emerald-500',
            'shadow-lg shadow-emerald-600/20',
          )}
        >
          Create World
        </button>
      </div>
    </div>
  );
}

export default WorldCreationScreen;
