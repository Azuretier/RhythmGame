'use client';

// =============================================================================
// Minecraft: Switch Edition — Battle Mini-Game HUD
// =============================================================================
// Overlay HUD for the Battle mini-game. Shows alive count, round timer, kill
// feed, spectator controls, phase-specific overlays, and border warnings.
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KillFeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  timestamp: number;
}

interface BattlePlayer {
  id: string;
  name: string;
  alive: boolean;
  kills: number;
  placement?: number;
}

interface BattleGameState {
  phase: 'lobby' | 'grace' | 'playing' | 'ended';
  players: BattlePlayer[];
  timeRemaining: number;
  round: number;
  totalRounds: number;
  killFeed: KillFeedEntry[];
  playerId: string;
  borderActive?: boolean;
  borderDistance?: number;
}

interface BattleGameProps {
  gameState: BattleGameState;
  onSpectate?: (targetId: string) => void;
}

// ---------------------------------------------------------------------------
// Keyframe animations
// ---------------------------------------------------------------------------

const BATTLE_STYLES = `
@keyframes battle-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes battle-fade-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes battle-slide-in-right {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes battle-slide-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes battle-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes battle-scale-in {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes battle-border-flash {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.9; }
}
`;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getWeaponIcon(weapon: string): string {
  if (weapon.includes('sword')) return '\u2694';
  if (weapon.includes('bow') || weapon.includes('arrow')) return '\uD83C\uDFF9';
  if (weapon.includes('axe')) return '\uD83E\uDE93';
  if (weapon.includes('trident')) return '\uD83D\uDD31';
  if (weapon.includes('tnt') || weapon.includes('explosion')) return '\uD83D\uDCA5';
  if (weapon.includes('lava') || weapon.includes('fire')) return '\uD83D\uDD25';
  if (weapon === 'fall') return '\u2B07';
  if (weapon === 'void') return '\u2604';
  return '\u2620';
}

function getMedalColor(placement: number): string {
  if (placement === 1) return '#FFD700';
  if (placement === 2) return '#C0C0C0';
  if (placement === 3) return '#CD7F32';
  return '#888888';
}

function getMedalEmoji(placement: number): string {
  if (placement === 1) return '\uD83E\uDD47';
  if (placement === 2) return '\uD83E\uDD48';
  if (placement === 3) return '\uD83E\uDD49';
  return `#${placement}`;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Kill feed overlay — top right, last 5 kills with auto-fade */
function KillFeed({ entries }: { entries: KillFeedEntry[] }) {
  const [visibleEntries, setVisibleEntries] = useState<KillFeedEntry[]>([]);

  useEffect(() => {
    const now = Date.now();
    const recent = entries.filter(e => now - e.timestamp < 5000).slice(-5);
    setVisibleEntries(recent);
  }, [entries]);

  // Auto-refresh to fade out old entries
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setVisibleEntries(prev => prev.filter(e => now - e.timestamp < 5000));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (visibleEntries.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 pointer-events-none flex flex-col gap-1 max-w-xs">
      {visibleEntries.map((entry) => {
        const age = Date.now() - entry.timestamp;
        const fadeOpacity = age > 3500 ? Math.max(0, 1 - (age - 3500) / 1500) : 1;

        return (
          <div
            key={entry.id}
            className="px-3 py-1.5 text-xs font-pixel flex items-center gap-1.5"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#FFFFFF',
              textShadow: '1px 1px 0 #000',
              opacity: fadeOpacity,
              animation: 'battle-slide-in-right 0.3s ease-out',
            }}
          >
            <span className="text-red-400 font-bold">{entry.killer}</span>
            <span className="text-gray-400">{getWeaponIcon(entry.weapon)}</span>
            <span className="text-gray-300">{entry.victim}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Spectator mode bar — bottom center when eliminated */
function SpectatorBar({
  spectatingName,
  alivePlayers,
  currentIndex,
  onPrev,
  onNext,
}: {
  spectatingName: string;
  alivePlayers: BattlePlayer[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3"
      style={{
        background: 'rgba(0, 0, 0, 0.75)',
        border: '2px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      <button
        onClick={onPrev}
        disabled={alivePlayers.length <= 1}
        className={cn(
          'font-pixel text-sm px-2 py-1 transition-colors',
          alivePlayers.length > 1
            ? 'text-white hover:text-yellow-300 cursor-pointer'
            : 'text-gray-600 cursor-not-allowed',
        )}
        style={{ textShadow: '1px 1px 0 #000' }}
      >
        &lt; Prev
      </button>

      <div className="flex flex-col items-center">
        <span
          className="font-pixel text-[10px] text-gray-400 uppercase tracking-wider"
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          Spectating
        </span>
        <span
          className="font-pixel text-sm text-white font-bold"
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          {spectatingName}
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={alivePlayers.length <= 1}
        className={cn(
          'font-pixel text-sm px-2 py-1 transition-colors',
          alivePlayers.length > 1
            ? 'text-white hover:text-yellow-300 cursor-pointer'
            : 'text-gray-600 cursor-not-allowed',
        )}
        style={{ textShadow: '1px 1px 0 #000' }}
      >
        Next &gt;
      </button>
    </div>
  );
}

/** Results screen — shows rankings with medals */
function ResultsScreen({ players }: { players: BattlePlayer[] }) {
  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        if (a.placement !== undefined && b.placement !== undefined)
          return a.placement - b.placement;
        return b.kills - a.kills;
      }),
    [players],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
    >
      <h1
        className="font-pixel text-4xl sm:text-5xl mb-2 font-bold"
        style={{
          color: '#FFD700',
          textShadow: '0 0 10px rgba(255, 215, 0, 0.5), 2px 2px 0 #000',
          animation: 'battle-scale-in 0.5s ease-out',
        }}
      >
        Battle Over!
      </h1>

      <p
        className="font-pixel text-sm text-gray-400 mb-8"
        style={{ textShadow: '1px 1px 0 #000' }}
      >
        Final Standings
      </p>

      <div
        className="flex flex-col gap-1 w-72 sm:w-80 max-h-[60vh] overflow-y-auto"
        style={{ animation: 'battle-slide-in-up 0.5s ease-out 0.2s both' }}
      >
        {sorted.map((player, i) => {
          const place = player.placement ?? i + 1;
          return (
            <div
              key={player.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2 font-pixel text-sm',
                place <= 3 ? 'border' : '',
              )}
              style={{
                background:
                  place === 1
                    ? 'rgba(255, 215, 0, 0.15)'
                    : place === 2
                      ? 'rgba(192, 192, 192, 0.1)'
                      : place === 3
                        ? 'rgba(205, 127, 50, 0.1)'
                        : 'rgba(0, 0, 0, 0.5)',
                borderColor:
                  place <= 3
                    ? getMedalColor(place) + '55'
                    : 'transparent',
              }}
            >
              <span
                className="text-base min-w-[28px] text-center"
                style={{ color: getMedalColor(place) }}
              >
                {getMedalEmoji(place)}
              </span>
              <span
                className="flex-1 text-white truncate"
                style={{ textShadow: '1px 1px 0 #000' }}
              >
                {player.name}
              </span>
              <span
                className="text-gray-400 text-xs"
                style={{ textShadow: '1px 1px 0 #000' }}
              >
                {player.kills} kill{player.kills !== 1 ? 's' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function BattleGame({ gameState, onSpectate }: BattleGameProps) {
  const {
    phase,
    players,
    timeRemaining,
    round,
    totalRounds,
    killFeed,
    playerId,
    borderActive,
    borderDistance,
  } = gameState;

  const [spectateIndex, setSpectateIndex] = useState(0);

  const currentPlayer = useMemo(
    () => players.find(p => p.id === playerId),
    [players, playerId],
  );

  const alivePlayers = useMemo(
    () => players.filter(p => p.alive),
    [players],
  );

  const totalPlayers = players.length;
  const aliveCount = alivePlayers.length;
  const isEliminated = currentPlayer ? !currentPlayer.alive : false;
  const isTimerCritical = timeRemaining <= 10 && timeRemaining > 0;

  // Keep spectate index in range
  useEffect(() => {
    if (alivePlayers.length > 0) {
      setSpectateIndex(prev => Math.min(prev, alivePlayers.length - 1));
    }
  }, [alivePlayers.length]);

  const spectatedPlayer = alivePlayers[spectateIndex] ?? null;

  const handlePrevSpectate = useCallback(() => {
    setSpectateIndex(prev => {
      const next = (prev - 1 + alivePlayers.length) % alivePlayers.length;
      if (onSpectate && alivePlayers[next]) onSpectate(alivePlayers[next].id);
      return next;
    });
  }, [alivePlayers, onSpectate]);

  const handleNextSpectate = useCallback(() => {
    setSpectateIndex(prev => {
      const next = (prev + 1) % alivePlayers.length;
      if (onSpectate && alivePlayers[next]) onSpectate(alivePlayers[next].id);
      return next;
    });
  }, [alivePlayers, onSpectate]);

  // -------------------------------------------------------------------------
  // Phase: Game ended — full results screen
  // -------------------------------------------------------------------------
  if (phase === 'ended') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: BATTLE_STYLES }} />
        <ResultsScreen players={players} />
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: Lobby — exploring arena before game starts
  // -------------------------------------------------------------------------
  if (phase === 'lobby') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: BATTLE_STYLES }} />

        {/* Lobby banner */}
        <div
          className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-3"
          style={{ animation: 'battle-fade-in 0.6s ease-out' }}
        >
          <div
            className="px-8 py-4 font-pixel text-center"
            style={{ background: 'rgba(0, 0, 0, 0.75)', border: '2px solid rgba(255, 255, 255, 0.15)' }}
          >
            <p
              className="text-lg text-white mb-1"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              Exploring Arena...
            </p>
            <p
              className="text-sm text-yellow-300"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              Game starts in {formatTime(timeRemaining)}
            </p>
          </div>
        </div>

        {/* Player count */}
        <div
          className="fixed top-4 left-4 z-50 pointer-events-none px-3 py-2 font-pixel text-sm flex items-center gap-2"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#FFFFFF',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span className="text-gray-300">{'\u263A'}</span>
          <span>{totalPlayers} Player{totalPlayers !== 1 ? 's' : ''}</span>
        </div>
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: Grace / Playing — main game HUD
  // -------------------------------------------------------------------------
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BATTLE_STYLES }} />

      {/* ---- Top-left: Alive count + Round ---- */}
      <div className="fixed top-4 left-4 z-50 pointer-events-none flex flex-col gap-1">
        {/* Alive count */}
        <div
          className="px-3 py-2 font-pixel text-sm flex items-center gap-2"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span style={{ color: '#FF4444' }}>{'\u2620'}</span>
          <span className="text-white">
            {aliveCount}/{totalPlayers} Alive
          </span>
        </div>

        {/* Round indicator */}
        <div
          className="px-3 py-1.5 font-pixel text-xs text-gray-300"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          Round {round} of {totalRounds}
        </div>
      </div>

      {/* ---- Top-center: Timer ---- */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div
          className={cn(
            'px-5 py-2 font-pixel text-xl font-bold',
            isTimerCritical && 'text-red-400',
          )}
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: isTimerCritical ? '#FF4444' : '#FFFFFF',
            textShadow: isTimerCritical
              ? '0 0 6px rgba(255, 68, 68, 0.6), 1px 1px 0 #000'
              : '1px 1px 0 #000',
            animation: isTimerCritical ? 'battle-pulse 1s ease-in-out infinite' : 'none',
          }}
        >
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* ---- Kill feed ---- */}
      <KillFeed entries={killFeed} />

      {/* ---- Grace period overlay ---- */}
      {phase === 'grace' && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          style={{ animation: 'battle-fade-in 0.4s ease-out' }}
        >
          <div
            className="px-6 py-3 font-pixel text-center flex items-center gap-2"
            style={{
              background: 'rgba(0, 80, 160, 0.6)',
              border: '2px solid rgba(100, 180, 255, 0.4)',
            }}
          >
            <span className="text-xl">{'\uD83D\uDEE1'}</span>
            <span
              className="text-sm text-blue-200 font-bold"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              Grace Period &mdash; {Math.ceil(timeRemaining)}s
            </span>
          </div>
        </div>
      )}

      {/* ---- Border shrinking warning ---- */}
      {borderActive && phase === 'playing' && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          style={{ animation: 'battle-border-flash 1.5s ease-in-out infinite' }}
        >
          <div
            className="px-5 py-2 font-pixel text-sm text-center"
            style={{
              background: 'rgba(200, 0, 0, 0.5)',
              border: '2px solid rgba(255, 60, 60, 0.5)',
              color: '#FF6666',
              textShadow: '1px 1px 0 #000',
            }}
          >
            {'\u26A0'} Border Shrinking!{' '}
            {borderDistance !== undefined && (
              <span className="text-red-300">({Math.round(borderDistance)}m away)</span>
            )}
          </div>
        </div>
      )}

      {/* ---- Spectator mode (when eliminated) ---- */}
      {isEliminated && phase === 'playing' && (
        <>
          {/* Eliminated banner */}
          <div
            className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            style={{ animation: 'battle-fade-in 0.5s ease-out' }}
          >
            <div
              className="px-6 py-3 font-pixel text-center"
              style={{
                background: 'rgba(100, 0, 0, 0.6)',
                border: '2px solid rgba(255, 50, 50, 0.3)',
              }}
            >
              <p
                className="text-lg text-red-400 font-bold mb-1"
                style={{ textShadow: '0 0 6px rgba(255, 0, 0, 0.4), 1px 1px 0 #000' }}
              >
                Eliminated!
              </p>
              <p
                className="text-xs text-gray-400"
                style={{ textShadow: '1px 1px 0 #000' }}
              >
                You placed {getOrdinalSuffix(currentPlayer?.placement ?? totalPlayers)}
              </p>
            </div>
          </div>

          {/* Spectator bar */}
          {spectatedPlayer && (
            <SpectatorBar
              spectatingName={spectatedPlayer.name}
              alivePlayers={alivePlayers}
              currentIndex={spectateIndex}
              onPrev={handlePrevSpectate}
              onNext={handleNextSpectate}
            />
          )}

          {/* Camera hint */}
          <div
            className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none font-pixel text-[10px] text-gray-500"
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            Use mouse to look around
          </div>
        </>
      )}

      {/* ---- Player kills (bottom-left, playing phase) ---- */}
      {!isEliminated && phase === 'playing' && currentPlayer && (
        <div
          className="fixed bottom-28 left-4 z-50 pointer-events-none px-3 py-2 font-pixel text-xs flex items-center gap-2"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span style={{ color: '#FF4444' }}>{'\u2694'}</span>
          <span className="text-white">
            {currentPlayer.kills} Kill{currentPlayer.kills !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </>
  );
}
