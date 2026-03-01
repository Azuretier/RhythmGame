'use client';

// =============================================================================
// Minecraft: Switch Edition — Game Play Page
// Reads world configuration from URL params and renders the game container.
// Currently a placeholder that will host the Three.js Canvas.
// =============================================================================

import { Suspense, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';
import type { GameMode, Difficulty } from '@/types/minecraft-switch';

// ---------------------------------------------------------------------------
// Config parser
// ---------------------------------------------------------------------------

interface ParsedGameConfig {
  seed: number;
  size: string;
  mode: GameMode;
  difficulty: Difficulty;
  name: string;
}

function parseGameConfig(params: URLSearchParams): ParsedGameConfig {
  const seedStr = params.get('seed') ?? '';
  const seed = seedStr ? parseInt(seedStr, 10) : Math.floor(Math.random() * 2147483647);

  const size = params.get('size') ?? 'classic';

  const modeParam = params.get('mode') ?? 'survival';
  const validModes: GameMode[] = ['survival', 'creative', 'adventure', 'spectator'];
  const mode: GameMode = validModes.includes(modeParam as GameMode)
    ? (modeParam as GameMode)
    : 'survival';

  const diffParam = params.get('difficulty') ?? 'normal';
  const validDiffs: Difficulty[] = ['peaceful', 'easy', 'normal', 'hard'];
  const difficulty: Difficulty = validDiffs.includes(diffParam as Difficulty)
    ? (diffParam as Difficulty)
    : 'normal';

  const name = params.get('name') ?? 'New World';

  return { seed: isNaN(seed) ? 42 : seed, size, mode, difficulty, name };
}

// ---------------------------------------------------------------------------
// Inner component that reads search params (must be wrapped in Suspense)
// ---------------------------------------------------------------------------

function GamePlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const config = useMemo(() => parseGameConfig(searchParams), [searchParams]);

  const handleBackToMenu = useCallback(() => {
    router.push('/minecraft');
  }, [router]);

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-black">
      {/* Game container — will hold Three.js Canvas in the future */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Placeholder content */}
        <div className="flex flex-col items-center gap-6 px-6">
          {/* Loading text */}
          <h1
            className="font-pixel text-xl sm:text-2xl text-white text-center"
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}
          >
            Minecraft Switch Edition
          </h1>
          <p className="font-pixel text-sm text-gray-400 text-center">
            Game Loading...
          </p>

          {/* Config display */}
          <div
            className="p-4 rounded-sm w-full max-w-sm"
            style={{
              backgroundColor: 'rgba(40, 40, 40, 0.85)',
              border: '2px solid #555',
            }}
          >
            <h3 className="font-pixel text-xs text-gray-300 mb-3 text-center border-b border-gray-700 pb-2">
              World Configuration
            </h3>
            <div className="flex flex-col gap-1.5">
              <ConfigRow label="World Name" value={config.name} />
              <ConfigRow label="Seed" value={config.seed.toString()} />
              <ConfigRow label="World Size" value={capitalize(config.size)} />
              <ConfigRow label="Game Mode" value={capitalize(config.mode)} />
              <ConfigRow label="Difficulty" value={capitalize(config.difficulty)} />
            </div>
          </div>

          {/* Loading bar (static placeholder) */}
          <div className="w-full max-w-sm">
            <div className="w-full h-[6px] bg-gray-800 border border-gray-700">
              <div
                className="h-full bg-green-600 animate-pulse"
                style={{ width: '35%' }}
              />
            </div>
            <p className="font-pixel text-[10px] text-gray-500 mt-1 text-center">
              Building terrain...
            </p>
          </div>

          {/* Back button */}
          <button
            onClick={handleBackToMenu}
            className={cn(
              'font-pixel text-sm text-white py-2 px-6',
              'bg-gradient-to-b from-gray-500 to-gray-700',
              'border-2 border-t-gray-400 border-l-gray-400 border-b-gray-800 border-r-gray-800',
              'hover:from-gray-400 hover:to-gray-600',
              'active:from-gray-600 active:to-gray-700 active:translate-y-[1px]',
              'transition-all select-none cursor-pointer',
            )}
            style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
          >
            Back to Menu
          </button>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <span className="font-pixel text-[9px] text-gray-700">
          Minecraft: Switch Edition (Web) v0.1.0-alpha
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config row helper
// ---------------------------------------------------------------------------

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-pixel text-[10px] text-gray-500">{label}</span>
      <span className="font-pixel text-xs text-white">{value}</span>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Page export (wraps in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function MinecraftPlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-black flex items-center justify-center">
          <p
            className="font-pixel text-sm text-gray-400"
            style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
          >
            Loading...
          </p>
        </div>
      }
    >
      <GamePlayContent />
    </Suspense>
  );
}
