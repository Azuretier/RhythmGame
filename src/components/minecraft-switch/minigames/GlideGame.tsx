'use client';

// =============================================================================
// Minecraft: Switch Edition — Glide Mini-Game HUD
// =============================================================================
// Overlay HUD for the Glide mini-game. Shows speedometer, checkpoint/lap
// counters, position indicator, race timer, firework boosts, mini-leaderboard,
// speed lines, and phase overlays (countdown, racing, finished, results).
// =============================================================================

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GlidePlayer {
  id: string;
  name: string;
  position: number;
  finished: boolean;
  finishTime?: number;
  checkpointsPassed: number;
  lapsCompleted: number;
  score?: number;
}

interface GlideGameState {
  phase: 'countdown' | 'racing' | 'finished' | 'results';
  players: GlidePlayer[];
  track: string;
  mode: 'race' | 'time_trial';
  raceTime: number;
  playerId: string;
  countdownValue?: number;
}

interface GlidePlayerState {
  speed: number;
  checkpointsPassed: number;
  totalCheckpoints: number;
  lapsCompleted: number;
  totalLaps: number;
  fireworkCount: number;
  position: number;
}

interface GlideGameProps {
  gameState: GlideGameState;
  playerState: GlidePlayerState;
}

// ---------------------------------------------------------------------------
// Keyframe animations
// ---------------------------------------------------------------------------

const GLIDE_STYLES = `
@keyframes glide-fade-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes glide-slide-in-right {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes glide-slide-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes glide-countdown-pop {
  0% { opacity: 0; transform: scale(2.5); }
  30% { opacity: 1; transform: scale(0.9); }
  50% { transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes glide-scale-in {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes glide-speed-line {
  0% { transform: translateY(-100vh); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  100% { transform: translateY(100vh); opacity: 0; }
}
@keyframes glide-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes glide-finished-bounce {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.1); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}
`;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function formatRaceTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getPositionColor(position: number): string {
  if (position === 1) return '#FFD700';
  if (position === 2) return '#C0C0C0';
  if (position === 3) return '#CD7F32';
  return '#FFFFFF';
}

function getSpeedColor(speed: number): string {
  // 0-60: green, 60-85: yellow, 85+: red (boost)
  if (speed >= 85) return '#FF4444';
  if (speed >= 60) return '#FFAA00';
  return '#55FF55';
}

function getSpeedZone(speed: number): string {
  if (speed >= 85) return 'BOOST';
  if (speed >= 60) return 'FAST';
  return 'NORMAL';
}

function formatTrackName(track: string): string {
  return track
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Speedometer — vertical bar with color-coded fill */
function Speedometer({ speed }: { speed: number }) {
  const normalizedSpeed = Math.min(100, Math.max(0, speed));
  const fillColor = getSpeedColor(speed);
  const zone = getSpeedZone(speed);
  const isBoosting = speed >= 85;

  // Build gradient stops for the fill bar
  const barSegments = 20;

  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ animation: 'glide-fade-in 0.4s ease-out' }}
    >
      {/* Speed zone label */}
      <div
        className="font-pixel text-[10px] font-bold uppercase tracking-wider"
        style={{
          color: fillColor,
          textShadow: '1px 1px 0 #000',
          animation: isBoosting ? 'glide-pulse 0.5s ease-in-out infinite' : 'none',
        }}
      >
        {zone}
      </div>

      {/* Vertical bar container */}
      <div
        className="relative w-5 h-32 flex flex-col-reverse"
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Segment grid */}
        {Array.from({ length: barSegments }, (_, i) => {
          const segmentThreshold = (i / barSegments) * 100;
          const isFilled = normalizedSpeed >= segmentThreshold;
          const segmentColor =
            segmentThreshold >= 85
              ? '#FF4444'
              : segmentThreshold >= 60
                ? '#FFAA00'
                : '#55FF55';

          return (
            <div
              key={i}
              className="flex-1 mx-[1px] my-[0.5px]"
              style={{
                backgroundColor: isFilled ? segmentColor : 'rgba(255, 255, 255, 0.05)',
                boxShadow: isFilled
                  ? `inset 0 0 2px ${segmentColor}66`
                  : 'none',
                transition: 'background-color 0.15s ease',
              }}
            />
          );
        })}

        {/* Boost glow overlay */}
        {isBoosting && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: `inset 0 0 8px rgba(255, 68, 68, 0.4)`,
              animation: 'glide-pulse 0.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Speed number */}
      <div
        className="font-pixel text-xs font-bold"
        style={{
          color: fillColor,
          textShadow: '1px 1px 0 #000',
        }}
      >
        {Math.round(speed)}
      </div>
    </div>
  );
}

/** Position indicator — large ordinal number */
function PositionIndicator({ position }: { position: number }) {
  const color = getPositionColor(position);

  return (
    <div
      className="px-4 py-2 font-pixel text-center"
      style={{
        background: 'rgba(0, 0, 0, 0.7)',
        textShadow: '2px 2px 0 #000',
      }}
    >
      <div
        className="text-3xl font-bold leading-none"
        style={{ color }}
      >
        {getOrdinalSuffix(position)}
      </div>
    </div>
  );
}

/** Firework boost counter */
function FireworkCounter({ count }: { count: number }) {
  return (
    <div
      className="px-3 py-2 font-pixel text-sm flex items-center gap-2"
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        textShadow: '1px 1px 0 #000',
      }}
    >
      {Array.from({ length: Math.min(count, 5) }, (_, i) => (
        <span
          key={i}
          style={{ color: '#FF6644' }}
        >
          {'\uD83D\uDE80'}
        </span>
      ))}
      {count > 5 && (
        <span className="text-gray-400 text-xs">+{count - 5}</span>
      )}
      {count === 0 && (
        <span className="text-gray-500 text-xs">No boosts</span>
      )}
    </div>
  );
}

/** Mini-leaderboard — top 3 on the right side */
function MiniLeaderboard({ players, currentPlayerId }: { players: GlidePlayer[]; currentPlayerId: string }) {
  const topPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => a.position - b.position);
    return sorted.slice(0, 3);
  }, [players]);

  return (
    <div
      className="flex flex-col gap-0.5 min-w-[130px]"
      style={{ animation: 'glide-slide-in-right 0.4s ease-out' }}
    >
      {topPlayers.map((player, i) => (
        <div
          key={player.id}
          className={cn(
            'px-3 py-1 font-pixel text-xs flex items-center gap-2',
            player.id === currentPlayerId && 'border border-white/20',
          )}
          style={{
            background:
              player.id === currentPlayerId
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.5)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span
            className="font-bold min-w-[20px]"
            style={{ color: getPositionColor(i + 1) }}
          >
            {getOrdinalSuffix(i + 1)}
          </span>
          <span
            className={cn(
              'flex-1 truncate max-w-[80px]',
              player.id === currentPlayerId ? 'text-white' : 'text-gray-300',
            )}
          >
            {player.name}
          </span>
          {player.finished && (
            <span className="text-green-400 text-[10px]">{'\u2713'}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Speed lines effect — CSS-based motion streaks when boosting */
function SpeedLines({ speed }: { speed: number }) {
  const isBoosting = speed >= 80;

  // Generate line positions — random-ish offsets from fixed seeds
  // NOTE: useMemo must be called before any early return (Rules of Hooks)
  const lineCount = Math.min(12, Math.floor((speed - 80) / 2) + 4);
  const lines = useMemo(() => {
    const result = [];
    for (let i = 0; i < lineCount; i++) {
      const seed = (i * 7919 + 1) % 100;
      result.push({
        left: `${seed}%`,
        delay: `${(i * 0.15) % 1}s`,
        duration: `${0.3 + (seed % 5) * 0.05}s`,
        opacity: 0.2 + (speed - 80) * 0.02,
      });
    }
    return result;
  }, [lineCount, speed]);

  if (!isBoosting) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {lines.map((line, i) => (
        <div
          key={i}
          className="absolute top-0 w-[1px]"
          style={{
            left: line.left,
            height: '40%',
            background: `linear-gradient(to bottom, transparent, rgba(255, 255, 255, ${line.opacity}), transparent)`,
            animation: `glide-speed-line ${line.duration} linear ${line.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** Countdown overlay for race start */
function CountdownOverlay({ value, trackName }: { value: number; trackName: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setDisplayValue(value);
    setAnimKey(prev => prev + 1);
  }, [value]);

  const text = displayValue <= 0 ? 'FLY!' : displayValue.toString();
  const color = displayValue <= 0 ? '#55FF55' : '#FFFFFF';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center">
      {/* Track name */}
      <div
        className="font-pixel text-lg text-gray-300 mb-8"
        style={{
          textShadow: '1px 1px 0 #000',
          animation: 'glide-fade-in 0.5s ease-out',
        }}
      >
        {formatTrackName(trackName)}
      </div>

      {/* Countdown number */}
      <div
        key={animKey}
        className="font-pixel font-bold"
        style={{
          fontSize: displayValue <= 0 ? '5rem' : '7rem',
          color,
          textShadow: `0 0 20px ${color}66, 0 0 40px ${color}33, 3px 3px 0 #000`,
          animation: 'glide-countdown-pop 0.6s ease-out',
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** Finished overlay — shown when player crosses the finish line */
function FinishedOverlay({
  finishTime,
  position,
  totalPlayers,
}: {
  finishTime: number;
  position: number;
  totalPlayers: number;
}) {
  const finishedPlayers = position;
  const waitingFor = totalPlayers - finishedPlayers;

  return (
    <div
      className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
    >
      <div
        className="flex flex-col items-center gap-3 px-10 py-6"
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          animation: 'glide-finished-bounce 0.5s ease-out',
        }}
      >
        <p
          className="font-pixel text-3xl font-bold"
          style={{
            color: '#55FF55',
            textShadow: '0 0 10px rgba(85, 255, 85, 0.5), 2px 2px 0 #000',
          }}
        >
          FINISHED!
        </p>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p
              className="font-pixel text-xs text-gray-400"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              Time
            </p>
            <p
              className="font-pixel text-lg text-white font-bold"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              {formatRaceTime(finishTime)}
            </p>
          </div>
          <div
            className="w-px h-8"
            style={{ background: 'rgba(255, 255, 255, 0.2)' }}
          />
          <div className="text-center">
            <p
              className="font-pixel text-xs text-gray-400"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              Position
            </p>
            <p
              className="font-pixel text-lg font-bold"
              style={{
                color: getPositionColor(position),
                textShadow: '1px 1px 0 #000',
              }}
            >
              {getOrdinalSuffix(position)}
            </p>
          </div>
        </div>
        {waitingFor > 0 && (
          <p
            className="font-pixel text-[10px] text-gray-500"
            style={{ textShadow: '1px 1px 0 #000' }}
          >
            Waiting for {waitingFor} player{waitingFor !== 1 ? 's' : ''}...
          </p>
        )}
      </div>
    </div>
  );
}

/** Full results screen */
function ResultsScreen({ players }: { players: GlidePlayer[] }) {
  const sorted = useMemo(
    () => [...players].sort((a, b) => a.position - b.position),
    [players],
  );

  function getMedalColor(rank: number): string {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#888888';
  }

  function getMedalEmoji(rank: number): string {
    if (rank === 1) return '\uD83E\uDD47';
    if (rank === 2) return '\uD83E\uDD48';
    if (rank === 3) return '\uD83E\uDD49';
    return `#${rank}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
    >
      <h1
        className="font-pixel text-4xl sm:text-5xl mb-2 font-bold"
        style={{
          color: '#FFD700',
          textShadow: '0 0 10px rgba(255, 215, 0, 0.5), 2px 2px 0 #000',
          animation: 'glide-scale-in 0.5s ease-out',
        }}
      >
        Race Results
      </h1>

      <p
        className="font-pixel text-sm text-gray-400 mb-8"
        style={{ textShadow: '1px 1px 0 #000' }}
      >
        Final Standings
      </p>

      <div
        className="flex flex-col gap-1 w-80 sm:w-96 max-h-[60vh] overflow-y-auto"
        style={{ animation: 'glide-slide-in-up 0.5s ease-out 0.2s both' }}
      >
        {sorted.map((player) => {
          const rank = player.position;
          return (
            <div
              key={player.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2 font-pixel text-sm',
                rank <= 3 ? 'border' : '',
              )}
              style={{
                background:
                  rank === 1
                    ? 'rgba(255, 215, 0, 0.15)'
                    : rank === 2
                      ? 'rgba(192, 192, 192, 0.1)'
                      : rank === 3
                        ? 'rgba(205, 127, 50, 0.1)'
                        : 'rgba(0, 0, 0, 0.5)',
                borderColor:
                  rank <= 3 ? getMedalColor(rank) + '55' : 'transparent',
              }}
            >
              <span
                className="text-base min-w-[28px] text-center"
                style={{ color: getMedalColor(rank) }}
              >
                {getMedalEmoji(rank)}
              </span>
              <span
                className="flex-1 text-white truncate"
                style={{ textShadow: '1px 1px 0 #000' }}
              >
                {player.name}
              </span>
              <span
                className="text-gray-300 text-xs tabular-nums"
                style={{ textShadow: '1px 1px 0 #000' }}
              >
                {player.finishTime !== undefined
                  ? formatRaceTime(player.finishTime)
                  : 'DNF'}
              </span>
              {player.score !== undefined && (
                <span
                  className="text-yellow-400 text-xs font-bold ml-1"
                  style={{ textShadow: '1px 1px 0 #000' }}
                >
                  +{player.score}
                </span>
              )}
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

export default function GlideGame({ gameState, playerState }: GlideGameProps) {
  const {
    phase,
    players,
    track,
    mode,
    raceTime,
    playerId,
    countdownValue,
  } = gameState;

  const {
    speed,
    checkpointsPassed,
    totalCheckpoints,
    lapsCompleted,
    totalLaps,
    fireworkCount,
    position,
  } = playerState;

  const currentPlayer = useMemo(
    () => players.find(p => p.id === playerId),
    [players, playerId],
  );

  const hasLaps = totalLaps > 1;
  const isFinished = currentPlayer?.finished ?? false;

  // -------------------------------------------------------------------------
  // Phase: Countdown
  // -------------------------------------------------------------------------
  if (phase === 'countdown') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: GLIDE_STYLES }} />
        <CountdownOverlay
          value={countdownValue ?? 3}
          trackName={track}
        />
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: Results
  // -------------------------------------------------------------------------
  if (phase === 'results') {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: GLIDE_STYLES }} />
        <ResultsScreen players={players} />
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Phase: Racing / Finished — main HUD
  // -------------------------------------------------------------------------
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLIDE_STYLES }} />

      {/* ---- Speed lines effect ---- */}
      <SpeedLines speed={speed} />

      {/* ---- Left side: Speedometer ---- */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
        <Speedometer speed={speed} />
      </div>

      {/* ---- Top-left: Position + Checkpoints/Laps ---- */}
      <div className="fixed top-4 left-14 z-50 pointer-events-none flex flex-col gap-1">
        {/* Position */}
        <PositionIndicator position={position} />

        {/* Checkpoint counter */}
        <div
          className="px-3 py-1.5 font-pixel text-xs flex items-center gap-2"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          <span className="text-green-400">{'\u2691'}</span>
          <span className="text-white">
            Checkpoint {checkpointsPassed}/{totalCheckpoints}
          </span>
        </div>

        {/* Lap counter (if applicable) */}
        {hasLaps && (
          <div
            className="px-3 py-1.5 font-pixel text-xs flex items-center gap-2"
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              textShadow: '1px 1px 0 #000',
            }}
          >
            <span className="text-blue-400">{'\u27F3'}</span>
            <span className="text-gray-300">
              Lap {lapsCompleted}/{totalLaps}
            </span>
          </div>
        )}

        {/* Mode indicator */}
        <div
          className="px-3 py-1 font-pixel text-[10px] text-gray-500"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            textShadow: '1px 1px 0 #000',
          }}
        >
          {mode === 'time_trial' ? 'Time Trial' : 'Race'}
        </div>
      </div>

      {/* ---- Top-center: Race timer ---- */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div
          className="px-5 py-2 font-pixel text-lg font-bold tabular-nums"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#FFFFFF',
            textShadow: '1px 1px 0 #000',
            minWidth: '140px',
            textAlign: 'center',
          }}
        >
          {formatRaceTime(raceTime)}
        </div>
      </div>

      {/* ---- Top-right: Mini leaderboard ---- */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        <MiniLeaderboard players={players} currentPlayerId={playerId} />
      </div>

      {/* ---- Bottom-right: Firework boosts ---- */}
      <div className="fixed bottom-28 right-4 z-50 pointer-events-none">
        <FireworkCounter count={fireworkCount} />
      </div>

      {/* ---- Finished overlay ---- */}
      {(phase === 'finished' || isFinished) && currentPlayer?.finishTime !== undefined && (
        <FinishedOverlay
          finishTime={currentPlayer.finishTime}
          position={position}
          totalPlayers={players.length}
        />
      )}
    </>
  );
}
