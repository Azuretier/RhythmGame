'use client';

// =============================================================================
// Minecraft: Switch Edition — Title Screen / Hub Page
// Main menu with play, create world, multiplayer, and mini-games options.
// =============================================================================

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';
import type { GameMode, Difficulty } from '@/types/minecraft-switch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorldSize = 'classic' | 'small' | 'medium';

interface WorldConfig {
  name: string;
  seed: string;
  size: WorldSize;
  gameMode: GameMode;
  difficulty: Difficulty;
}

// ---------------------------------------------------------------------------
// Minecraft-style Button
// ---------------------------------------------------------------------------

function McButton({
  children,
  onClick,
  disabled = false,
  size = 'normal',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  size?: 'normal' | 'large';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full font-pixel text-white transition-all',
        'border-2 active:translate-y-[1px] select-none',
        size === 'large' ? 'py-3 px-8 text-base' : 'py-2 px-6 text-sm',
        disabled
          ? [
              'bg-gradient-to-b from-gray-600 to-gray-700 cursor-not-allowed opacity-50',
              'border-t-gray-500 border-l-gray-500 border-b-gray-800 border-r-gray-800',
            ]
          : [
              'bg-gradient-to-b from-gray-500 to-gray-700 cursor-pointer',
              'border-t-gray-400 border-l-gray-400 border-b-gray-800 border-r-gray-800',
              'hover:from-gray-400 hover:to-gray-600',
              'active:from-gray-600 active:to-gray-700',
            ],
      )}
      style={{
        textShadow: disabled ? 'none' : '1px 1px 0 rgba(0,0,0,0.5)',
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// World Creation Form
// ---------------------------------------------------------------------------

function WorldCreationForm({
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

  const inputClass = cn(
    'w-full px-3 py-1.5 font-pixel text-sm',
    'bg-black/60 text-white border-2 border-gray-600',
    'focus:border-gray-400 focus:outline-none',
    'placeholder:text-gray-500',
  );

  const labelClass = 'font-pixel text-xs text-gray-300 mb-1 block';

  return (
    <div
      className="w-full max-w-md p-6 rounded-sm"
      style={{
        backgroundColor: 'rgba(30, 30, 30, 0.92)',
        border: '2px solid #555',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <h3
        className="font-pixel text-base text-white mb-4 text-center"
        style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
      >
        Create New World
      </h3>

      {/* World Name */}
      <div className="mb-3">
        <label className={labelClass}>World Name</label>
        <input
          type="text"
          value={worldName}
          onChange={(e) => setWorldName(e.target.value)}
          className={inputClass}
          placeholder="New World"
          maxLength={32}
        />
      </div>

      {/* Seed */}
      <div className="mb-4">
        <label className={labelClass}>Seed (optional)</label>
        <input
          type="text"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          className={inputClass}
          placeholder="Leave blank for random"
        />
      </div>

      {/* World Size */}
      <div className="mb-4">
        <label className={labelClass}>World Size</label>
        <div className="flex gap-2">
          {(['classic', 'small', 'medium'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={cn(
                'flex-1 py-1.5 font-pixel text-xs border-2 transition-all select-none',
                size === s
                  ? 'bg-green-700/80 border-green-500 text-white'
                  : 'bg-gray-700/60 border-gray-600 text-gray-400 hover:bg-gray-600/60',
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Game Mode */}
      <div className="mb-4">
        <label className={labelClass}>Game Mode</label>
        <div className="flex gap-2">
          {(['survival', 'creative'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setGameMode(mode)}
              className={cn(
                'flex-1 py-1.5 font-pixel text-xs border-2 transition-all select-none',
                gameMode === mode
                  ? 'bg-blue-700/80 border-blue-500 text-white'
                  : 'bg-gray-700/60 border-gray-600 text-gray-400 hover:bg-gray-600/60',
              )}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="mb-5">
        <label className={labelClass}>Difficulty</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className={cn(
            'w-full px-3 py-1.5 font-pixel text-sm',
            'bg-black/60 text-white border-2 border-gray-600',
            'focus:border-gray-400 focus:outline-none',
            'cursor-pointer',
          )}
        >
          <option value="peaceful">Peaceful</option>
          <option value="easy">Easy</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <McButton onClick={handleCreate}>Create World</McButton>
        <McButton onClick={onCancel}>Cancel</McButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Splash text (like vanilla Minecraft)
// ---------------------------------------------------------------------------

const SPLASHES = [
  'Web Edition!',
  'Now in your browser!',
  'TypeScript-powered!',
  'Also try terraria!',
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

function useSplash(): string {
  return useMemo(() => {
    return SPLASHES[Math.floor(Math.random() * SPLASHES.length)];
  }, []);
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function MinecraftTitlePage() {
  const router = useRouter();
  const [showCreateWorld, setShowCreateWorld] = useState(false);
  const splash = useSplash();

  const handleCreateWorld = useCallback((config: WorldConfig) => {
    // Generate seed from string or use random
    let seedNum: number;
    if (config.seed) {
      // Hash string seed to number
      let hash = 0;
      for (let i = 0; i < config.seed.length; i++) {
        const char = config.seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
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

  const handleMultiplayer = useCallback(() => {
    alert('Multiplayer is coming in a future update!');
  }, []);

  const handleMiniGames = useCallback(() => {
    alert('Mini-Games are coming in a future update!');
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background: dark stone gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2520 25%, #1e1e28 50%, #252018 75%, #1a1a1a 100%)',
        }}
      />
      {/* Noise overlay for stone texture feel */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
          imageRendering: 'pixelated',
        }}
      />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 z-[2] opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-lg px-6">
        {/* Title */}
        <div className="flex flex-col items-center mb-2">
          <h1
            className="font-pixel text-3xl sm:text-4xl md:text-5xl text-white tracking-wider"
            style={{
              textShadow: '3px 3px 0 #3a3a3a, 5px 5px 0 rgba(0,0,0,0.4)',
            }}
          >
            MINECRAFT
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-[1px] w-8 bg-gray-600" />
            <span
              className="font-pixel text-xs text-gray-400 tracking-widest"
              style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
            >
              Switch Edition
            </span>
            <div className="h-[1px] w-8 bg-gray-600" />
          </div>
          {/* Subtitle */}
          <span
            className="font-pixel text-[10px] text-yellow-400 mt-2 rotate-[-3deg]"
            style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
          >
            {splash}
          </span>
        </div>

        {/* Menu buttons or world creation form */}
        {showCreateWorld ? (
          <WorldCreationForm
            onCancel={() => setShowCreateWorld(false)}
            onCreateWorld={handleCreateWorld}
          />
        ) : (
          <div className="w-full max-w-xs flex flex-col gap-2">
            <McButton
              onClick={() => setShowCreateWorld(true)}
              size="large"
            >
              Play
            </McButton>

            <McButton onClick={() => setShowCreateWorld(true)}>
              Create New World
            </McButton>

            <div className="h-1" />

            <McButton onClick={handleMultiplayer} disabled>
              Multiplayer
            </McButton>

            <McButton onClick={handleMiniGames} disabled>
              Mini-Games
            </McButton>
          </div>
        )}

        {/* Version info at bottom */}
        <div className="mt-8 flex flex-col items-center gap-1">
          <span className="font-pixel text-[10px] text-gray-600">
            Minecraft: Switch Edition (Web)
          </span>
          <span className="font-pixel text-[9px] text-gray-700">
            v0.1.0-alpha
          </span>
        </div>
      </div>
    </div>
  );
}
