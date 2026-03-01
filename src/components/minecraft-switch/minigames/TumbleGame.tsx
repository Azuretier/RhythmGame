'use client';

// =============================================================================
// Minecraft: Switch Edition — Tumble Mini-Game HUD
// =============================================================================
// Overlay HUD for the Tumble mini-game. Shows player count, mode indicator,
// round info, layer warnings, per-player wins, snowball count, and phase
// overlays (waiting, countdown, playing, round end, game end).
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TumblePlayer {
  id: string;
  name: string;
  alive: boolean;
  roundWins: number;
}

interface TumbleGameState {
  phase: 'waiting' | 'countdown' | 'playing' | 'round_end' | 'ended';
  players: TumblePlayer[];
  currentRound: number;
  totalRounds: number;
  mode: 'shovel' | 'snowball';
  timeRemaining: number;
  layersRemaining: number;
  playerId: string;
  countdownValue?: number;
  roundWinner?: string;
  snowballCount?: number;
  layerCollapseTime?: number;
  mvpId?: string;
}

interface TumbleGameProps {
  gameState: TumbleGameState;
  onReady?: () => void;
}

// ---------------------------------------------------------------------------
// Keyframe animations
// ---------------------------------------------------------------------------

const TUMBLE_STYLES = `
@keyframes tumble-fade-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes tumble-slide-in-left {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes tumble-slide-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes tumble-countdown-pop {
  0% { opacity: 0; transform: scale(2.5); }
  30% { opacity: 1; transform: scale(0.9); }
  50% { transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes tumble-countdown-exit {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.5); }
}
@keyframes tumble-flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes tumble-scale-in {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes tumble-pulse-glow {
  0%, 100% { text-shadow: 0 0 4px rgba(255, 200, 0, 0.4), 1px 1px 0 #000; }
  50% { text-shadow: 0 0 12px rgba(255, 200, 0, 0.8), 1px 1px 0 #000; }
}
`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Mode indicator — shows shovel or snowball mode */
function ModeIndicator({ mode }: { mode: 'shovel' | 'snowball' }) {
  const icon = mode === 'shovel' ? '\u26CF' : '\u26C4';
  const label = mode === 'shovel' ? 'Shovel' : 'Snowball';
  const color = mode === 'shovel' ? '#C0892A' : '#87CEEB';

  return (
    <div
      className="px-3 py-1.5 font-pixel text-xs flex items-center gap-2"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        textShadow: '1px 1px 0 #000',
      }}
    >
      <span style={{ color }}>{icon}</span>
      <span style={{ color }}>{label} Mode</span>
    </div>
  );
}

/** Layer collapse warning — flashing banner */
function LayerWarning({ collapseTime }: { collapseTime: number }) {
  if (collapseTime <= 0) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      style={{ animation: 'tumble-flash 0.8s ease-in-out infinite' }}
    >
      <div
        className="px-5 py-2 font-pixel text-sm text-center"
        style={{
          background: 'rgba(200, 100, 0, 0.6)',
          border: '2px solid rgba(255, 160, 50, 0.5)',
          color: '#FFAA33',
          textShadow: '1px 1px 0 #000',
        }}
      >
        {'\u26A0'} Layer collapsing in {Math.ceil(collapseTime)}s!
      </div>
    </div>
  );
}

/** Per-player round wins sidebar */
function WinsSidebar({ players }: { players: TumblePlayer[] }) {
  const sorted = useMemo(
    () => [...players].sort((a, b) => b.roundWins - a.roundWins),
    [players],
  );

  return (
    <div
      className="fixed top-28 right-4 z-50 pointer-events-none flex flex-col gap-0.5 min-w-[120px]"
      style={{ animation: 'tumble-slide-in-left 0.4s ease-out' }}
    >
      <div
        className="px-3 py-1.5 font-pixel text-[10px] text-gray-400 uppercase tracking-wider"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          textShadow: '1px 1px 0 #000',
        }}
      >
        Round Wins
      </div>
      {sorted.map(player => (
        <div
          key={player.id}
          className="px-3 py-1 font-pixel text-xs flex items-center justify-between gap-3"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span className={cn('truncate max-w-[80px]', player.alive ? 'text-white' : 'text-gray-500 line-through')}>
            {player.name}
          </span>
          <span className="text-yellow-400 font-bold">{player.roundWins}</span>
        </div>
      ))}
    </div>
  );
}

/** Big countdown overlay (3, 2, 1, GO!) */
function CountdownOverlay({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setDisplayValue(value);
    setAnimKey(prev => prev + 1);
  }, [value]);

  const text = displayValue <= 0 ? 'GO!' : displayValue.toString();
  const color = displayValue <= 0 ? '#55FF55' : displayValue === 1 ? '#FF4444' : '#FFFFFF';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      <div
        key={animKey}
        className="font-pixel font-bold"
        style={{
          fontSize: displayValue <= 0 ? '5rem' : '7rem',
          color,
          textShadow: `0 0 20px ${color}66, 0 0 40px ${color}33, 3px 3px 0 #000`,
          animation: 'tumble-countdown-pop 0.6s ease-out',
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** Round end overlay */
function RoundEndOverlay({ winnerName }: { winnerName: string }) {
  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        animation: 'tumble-fade-in 0.4s ease-out',
      }}
    >
      <p
        className="font-pixel text-3xl sm:text-4xl text-white font-bold mb-3"
        style={{
          textShadow: '2px 2px 0 #000, 0 0 10px rgba(255,255,255,0.3)',
          animation: 'tumble-scale-in 0.4s ease-out',
        }}
      >
        Round Over!
      </p>
      <p
        className="font-pixel text-lg text-yellow-300"
        style={{
          textShadow: '1px 1px 0 #000',
          animation: 'tumble-slide-in-up 0.4s ease-out 0.2s both',
        }}
      >
        {'\uD83C\uDFC6'} {winnerName} wins the round!
      </p>
    </div>
  );
}

/** Game end results screen */
function GameEndScreen({ players, mvpId }: { players: TumblePlayer[]; mvpId?: string }) {
  const sorted = useMemo(
    () => [...players].sort((a, b) => b.roundWins - a.roundWins),
    [players],
  );

  const mvpPlayer = mvpId ? players.find(p => p.id === mvpId) : sorted[0];

  function getMedalColor(rank: number): string {
    if (rank === 0) return '#FFD700';
    if (rank === 1) return '#C0C0C0';
    if (rank === 2) return '#CD7F32';
    return '#888888';
  }

  function getMedalEmoji(rank: number): string {
    if (rank === 0) return '\uD83E\uDD47';
    if (rank === 1) return '\uD83E\uDD48';
    if (rank === 2) return '\uD83E\uDD49';
    return `#${rank + 1}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
    >
      {/* Title */}
      <h1
        className="font-pixel text-4xl sm:text-5xl mb-2 font-bold"
        style={{
          color: '#FFD700',
          textShadow: '0 0 10px rgba(255, 215, 0, 0.5), 2px 2px 0 #000',
          animation: 'tumble-scale-in 0.5s ease-out',
        }}
      >
        Tumble Complete!
      </h1>

      {/* MVP */}
      {mvpPlayer && (
        <div
          className="font-pixel text-sm mb-6 flex items-center gap-2"
          style={{
            color: '#FFD700',
            textShadow: '1px 1px 0 #000',
            animation: 'tumble-pulse-glow 2s ease-in-out infinite',
          }}
        >
          <span>{'\u2B50'}</span>
          <span>MVP: {mvpPlayer.name}</span>
          <span>{'\u2B50'}</span>
        </div>
      )}

      {/* Results table */}
      <div
        className="flex flex-col gap-1 w-72 sm:w-80 max-h-[50vh] overflow-y-auto"
        style={{ animation: 'tumble-slide-in-up 0.5s ease-out 0.2s both' }}
      >
        {sorted.map((player, i) => (
          <div
            key={player.id}
            className={cn(
              'flex items-center gap-3 px-4 py-2 font-pixel text-sm',
              i < 3 ? 'border' : '',
            )}
            style={{
              background:
                i === 0
                  ? 'rgba(255, 215, 0, 0.15)'
                  : i === 1
                    ? 'rgba(192, 192, 192, 0.1)'
                    : i === 2
                      ? 'rgba(205, 127, 50, 0.1)'
                      : 'rgba(0, 0, 0, 0.5)',
              borderColor:
                i < 3 ? getMedalColor(i) + '55' : 'transparent',
            }}
          >
            <span
              className="text-base min-w-[28px] text-center"
              style={{ color: getMedalColor(i) }}
            >
              {getMedalEmoji(i)}
            </span>
            <span
              className="flex-1 text-white truncate"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              {player.name}
            </span>
            <span
              className="text-yellow-400 text-xs font-bold"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              {player.roundWins} win{player.roundWins !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TumbleGame({ gameState, onReady }: TumbleGameProps) {
  const {
    phase,
    players,
    currentRound,
    totalRounds,
    mode,
    timeRemaining,
    layersRemaining,
    playerId,
    countdownValue,
    roundWinner,
    snowballCount,
    layerCollapseTime,
    mvpId,
  } = gameState;

  const currentPlayer = useMemo(
    () => players.find(p => p.id === playerId),
    [players, playerId],
  );

  const alivePlayers = useMemo(
    () => players.filter(p => p.alive),
    [players],
  );

  const aliveCount = alivePlayers.length;
  const totalCount = players.length;
  const isEliminated = currentPlayer ? !currentPlayer.alive : false;

  // -------------------------------------------------------------------------
  // Phase: Waiting — show lobby with ready button
  // -------------------------------------------------------------------------
  if (phase === 'waiting') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: TUMBLE_STYLES }} />

        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div
            className="flex flex-col items-center gap-4"
            style={{ animation: 'tumble-fade-in 0.5s ease-out' }}
          >
            <h2
              className="font-pixel text-2xl text-white"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
              Tumble
            </h2>

            <ModeIndicator mode={mode} />

            <p
              className="font-pixel text-sm text-gray-300"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              Waiting for players... ({totalCount} joined)
            </p>

            {onReady && (
              <button
                onClick={onReady}
                className={cn(
                  'px-8 py-3 font-pixel text-sm font-bold border-2 transition-all duration-200 cursor-pointer',
                  'border-green-500/60 bg-green-900/50 text-green-300',
                  'hover:bg-green-800/60 hover:border-green-400/80 hover:text-green-200',
                )}
                style={{
                  textShadow: '1px 1px 0 #000',
                  imageRendering: 'pixelated',
                }}
              >
                Ready!
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: Countdown — big numbers
  // -------------------------------------------------------------------------
  if (phase === 'countdown') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: TUMBLE_STYLES }} />
        <CountdownOverlay value={countdownValue ?? Math.ceil(timeRemaining)} />

        {/* Mode indicator during countdown */}
        <div className="fixed top-4 left-4 z-50 pointer-events-none">
          <ModeIndicator mode={mode} />
        </div>
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: Round end — show round winner
  // -------------------------------------------------------------------------
  if (phase === 'round_end') {
    const winnerPlayer = players.find(p => p.id === roundWinner);
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: TUMBLE_STYLES }} />
        <RoundEndOverlay winnerName={winnerPlayer?.name ?? 'Unknown'} />
        <WinsSidebar players={players} />
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: Game ended — full results
  // -------------------------------------------------------------------------
  if (phase === 'ended') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: TUMBLE_STYLES }} />
        <GameEndScreen players={players} mvpId={mvpId} />
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: Playing — main game HUD
  // -------------------------------------------------------------------------
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: TUMBLE_STYLES }} />

      {/* ---- Top-left: Player count + Round + Mode ---- */}
      <div className="fixed top-4 left-4 z-50 pointer-events-none flex flex-col gap-1">
        {/* Players remaining */}
        <div
          className="px-3 py-2 font-pixel text-sm flex items-center gap-2"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span style={{ color: '#55FF55' }}>{'\u263A'}</span>
          <span className="text-white">
            {aliveCount}/{totalCount} Players
          </span>
        </div>

        {/* Round counter */}
        <div
          className="px-3 py-1.5 font-pixel text-xs text-gray-300"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          Round {currentRound} of {totalRounds}
        </div>

        {/* Mode indicator */}
        <ModeIndicator mode={mode} />
      </div>

      {/* ---- Top-center: Timer ---- */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div
          className="px-5 py-2 font-pixel text-xl font-bold"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: timeRemaining <= 10 ? '#FF4444' : '#FFFFFF',
            textShadow:
              timeRemaining <= 10
                ? '0 0 6px rgba(255, 68, 68, 0.6), 1px 1px 0 #000'
                : '1px 1px 0 #000',
            animation: timeRemaining <= 10 ? 'tumble-flash 1s ease-in-out infinite' : 'none',
          }}
        >
          {Math.ceil(timeRemaining)}s
        </div>
      </div>

      {/* ---- Layer indicator (top-center, below timer) ---- */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div
          className="px-4 py-1.5 font-pixel text-xs flex items-center gap-2"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span className="text-gray-400">{'\u25A3'}</span>
          <span className="text-gray-300">
            {layersRemaining} Layer{layersRemaining !== 1 ? 's' : ''} Remaining
          </span>
        </div>
      </div>

      {/* ---- Layer collapse warning ---- */}
      {layerCollapseTime !== undefined && layerCollapseTime > 0 && (
        <LayerWarning collapseTime={layerCollapseTime} />
      )}

      {/* ---- Wins sidebar ---- */}
      <WinsSidebar players={players} />

      {/* ---- Snowball count (snowball mode only) ---- */}
      {mode === 'snowball' && snowballCount !== undefined && !isEliminated && (
        <div
          className="fixed bottom-28 right-4 z-50 pointer-events-none px-3 py-2 font-pixel text-sm flex items-center gap-2"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span style={{ color: '#87CEEB' }}>{'\u26C4'}</span>
          <span className="text-white font-bold">{snowballCount}</span>
          <span className="text-gray-400 text-xs">Snowball{snowballCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ---- Eliminated notification ---- */}
      {isEliminated && (
        <div
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          style={{ animation: 'tumble-fade-in 0.4s ease-out' }}
        >
          <div
            className="px-6 py-3 font-pixel text-center"
            style={{
              background: 'rgba(100, 0, 0, 0.6)',
              border: '2px solid rgba(255, 50, 50, 0.3)',
            }}
          >
            <p
              className="text-sm text-red-400 font-bold"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              You fell! Spectating...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
