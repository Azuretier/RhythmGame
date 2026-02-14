'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './RankedMatch.module.css';
import MultiplayerBattle from './MultiplayerBattle';
import type {
  ServerMessage,
} from '@/types/multiplayer';
import {
  getTierByPoints,
  getDefaultRankedState,
  calculateRankChange,
  tierProgress,
  pointsToNextTier,
} from '@/lib/ranked/constants';
import type { RankedState, RankChange } from '@/lib/ranked/types';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type MatchPhase = 'idle' | 'searching' | 'found' | 'countdown' | 'playing' | 'result';

const RANKED_STORAGE_KEY = 'rhythmia_ranked_state';

function loadRankedState(): RankedState {
  if (typeof window === 'undefined') return getDefaultRankedState();
  try {
    const saved = localStorage.getItem(RANKED_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        tier: getTierByPoints(parsed.points || 0),
      };
    }
  } catch {}
  return getDefaultRankedState();
}

function saveRankedState(state: RankedState): void {
  try {
    localStorage.setItem(RANKED_STORAGE_KEY, JSON.stringify({
      points: state.points,
      wins: state.wins,
      losses: state.losses,
      winStreak: state.winStreak,
    }));
  } catch {}
}

interface Props {
  playerName: string;
  onBack: () => void;
  ws: WebSocket | null;
  connectionStatus: ConnectionStatus;
  playerId: string;
}

export default function RankedMatch({ playerName, onBack, ws, connectionStatus, playerId }: Props) {
  // Ranked state
  const [rankedState, setRankedState] = useState<RankedState>(loadRankedState);
  const [rankChange, setRankChange] = useState<RankChange | null>(null);

  // Match state
  const [phase, setPhase] = useState<MatchPhase>('idle');
  const [opponentName, setOpponentName] = useState('');
  const [opponentId, setOpponentId] = useState('');
  const [gameSeed, setGameSeed] = useState(0);
  const [roomCode, setRoomCode] = useState('');
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<'win' | 'loss' | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ===== Queue for Ranked Match (server-side human matchmaking) =====
  const startSearch = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    setGameResult(null);
    setRankChange(null);
    setSearchTime(0);
    setPhase('searching');

    // Send queue_ranked message to server
    ws.send(JSON.stringify({
      type: 'queue_ranked',
      playerName,
      rankPoints: rankedState.points,
    }));

    // Track search time
    searchTimerRef.current = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);
  }, [ws, playerName, rankedState.points]);

  const cancelSearch = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'cancel_ranked' }));
    }
    setPhase('idle');
    if (searchTimerRef.current) {
      clearInterval(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  }, [ws]);

  // ===== Listen for server messages =====
  useEffect(() => {
    if (!ws) return;

    const handler = (event: MessageEvent) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);

        if (msg.type === 'ranked_queued') {
          // Queued successfully, keep searching
        } else if (msg.type === 'ranked_match_found') {
          // Match found — transition to countdown
          if (searchTimerRef.current) {
            clearInterval(searchTimerRef.current);
            searchTimerRef.current = null;
          }
          setOpponentName(msg.opponentName);
          setOpponentId(msg.opponentId);
          setGameSeed(msg.gameSeed);
          setRoomCode(msg.roomCode);
          setPhase('found');
        } else if (msg.type === 'countdown') {
          setCountdownNumber(msg.count);
          setPhase('countdown');
        } else if (msg.type === 'game_started') {
          setGameSeed(msg.gameSeed);
          setCountdownNumber(null);
          setPhase('playing');
        }
      } catch {}
    };

    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws]);

  // Auto-start countdown after "found" phase
  useEffect(() => {
    if (phase !== 'found') return;

    let count = 3;
    setCountdownNumber(count);
    setPhase('countdown');

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNumber(count);
      } else {
        clearInterval(interval);
        setCountdownNumber(null);
        setPhase('playing');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // ===== Game End =====
  const handleGameEnd = useCallback((winnerId: string) => {
    const won = winnerId === playerId;
    setGameResult(won ? 'win' : 'loss');

    // Calculate rank change
    const change = calculateRankChange(rankedState, won);
    setRankChange(change);

    // Update ranked state
    const newState: RankedState = {
      points: change.newPoints,
      tier: change.newTier,
      wins: rankedState.wins + (won ? 1 : 0),
      losses: rankedState.losses + (won ? 0 : 1),
      winStreak: won ? rankedState.winStreak + 1 : 0,
    };
    setRankedState(newState);
    saveRankedState(newState);

    setPhase('result');
  }, [rankedState, playerId]);

  const handleBackToLobby = useCallback(() => {
    setPhase('idle');
    setGameResult(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
      }
    };
  }, []);

  // ===== Derived State =====
  const tier = getTierByPoints(rankedState.points);
  const progress = tierProgress(rankedState.points);
  const toNext = pointsToNextTier(rankedState.points);

  // ===== Render =====
  return (
    <div className={styles.container}>
      {/* Idle - Rank Display + Start */}
      {phase === 'idle' && (
        <div className={styles.rankScreen}>
          <div className={styles.rankHeader}>RANKED MATCH</div>

          {/* Rank Card */}
          <div className={styles.rankCard}>
            <div className={styles.tierIcon} style={{ color: tier.color, textShadow: `0 0 20px ${tier.color}40` }}>
              {tier.id.startsWith('champion') ? 'III' : tier.id.startsWith('contender') ? 'II' : 'I'}
            </div>
            <div className={styles.tierName} style={{ color: tier.color }}>{tier.name}</div>
            <div className={styles.tierNameJa}>{tier.nameJa}</div>

            <div className={styles.pointsDisplay}>
              <span className={styles.pointsValue}>{rankedState.points}</span>
              <span className={styles.pointsLabel}>RP</span>
            </div>

            {/* Progress bar */}
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${tier.color}80, ${tier.color})`,
                  }}
                />
              </div>
              {toNext !== null && (
                <div className={styles.progressLabel}>{toNext} RP to next tier</div>
              )}
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{rankedState.wins}</div>
                <div className={styles.statLabel}>Wins</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{rankedState.losses}</div>
                <div className={styles.statLabel}>Losses</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {rankedState.wins + rankedState.losses > 0
                    ? Math.round((rankedState.wins / (rankedState.wins + rankedState.losses)) * 100)
                    : 0}%
                </div>
                <div className={styles.statLabel}>Win Rate</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{rankedState.winStreak}</div>
                <div className={styles.statLabel}>Streak</div>
              </div>
            </div>

            {/* Bus Fare */}
            <div className={styles.busFare}>
              Entry Cost: <span>{tier.busFare} RP</span> / Win Reward: <span>+{tier.winReward} RP</span>
            </div>
          </div>

          {/* Actions */}
          <button
            className={styles.searchBtn}
            onClick={startSearch}
            disabled={connectionStatus !== 'connected'}
          >
            {connectionStatus === 'connected' ? 'FIND MATCH' : 'Connecting...'}
          </button>

          <button className={styles.backBtn} onClick={onBack}>
            Back
          </button>
        </div>
      )}

      {/* Searching */}
      {phase === 'searching' && (
        <div className={styles.countdownScreen}>
          <div className={styles.matchupDisplay}>
            <div className={styles.matchupPlayer}>
              <div className={styles.matchupName}>{playerName}</div>
              <div className={styles.matchupRank} style={{ color: tier.color }}>{tier.name}</div>
            </div>
            <div className={styles.matchupVs}>SEARCHING</div>
            <div className={styles.matchupPlayer}>
              <div className={styles.matchupName}>???</div>
              <div className={styles.matchupRank}>Finding opponent...</div>
            </div>
          </div>
          <div className={styles.countdownNumber}>{searchTime}s</div>
          <button className={styles.backBtn} onClick={cancelSearch}>
            Cancel
          </button>
        </div>
      )}

      {/* Countdown */}
      {phase === 'countdown' && (
        <div className={styles.countdownScreen}>
          <div className={styles.matchupDisplay}>
            <div className={styles.matchupPlayer}>
              <div className={styles.matchupName}>{playerName}</div>
              <div className={styles.matchupRank} style={{ color: tier.color }}>{tier.name}</div>
            </div>
            <div className={styles.matchupVs}>VS</div>
            <div className={styles.matchupPlayer}>
              <div className={styles.matchupName}>{opponentName}</div>
            </div>
          </div>
          <div className={styles.countdownNumber}>{countdownNumber}</div>
        </div>
      )}

      {/* Playing */}
      {phase === 'playing' && ws && (
        <MultiplayerBattle
          ws={ws}
          roomCode={roomCode}
          playerId={playerId}
          playerName={playerName}
          opponents={[{
            id: opponentId,
            name: opponentName,
            ready: true,
            connected: true,
          }]}
          gameSeed={gameSeed}
          onGameEnd={handleGameEnd}
          onBackToLobby={handleBackToLobby}
        />
      )}

      {/* Result */}
      {phase === 'result' && rankChange && (
        <div className={styles.resultScreen}>
          <div className={`${styles.resultTitle} ${gameResult === 'win' ? styles.resultWin : styles.resultLoss}`}>
            {gameResult === 'win' ? 'VICTORY' : 'DEFEAT'}
          </div>

          {/* Rank change */}
          <div className={styles.rankChangeCard}>
            <div className={styles.rankChangeTier} style={{ color: rankChange.newTier.color }}>
              {rankChange.newTier.name}
            </div>

            <div className={styles.rankChangePoints}>
              <span className={styles.rankChangeOld}>{rankChange.previousPoints}</span>
              <span className={styles.rankChangeArrow}>
                {rankChange.pointsDelta >= 0 ? '+' : ''}{rankChange.pointsDelta}
              </span>
              <span className={styles.rankChangeNew}>{rankChange.newPoints} RP</span>
            </div>

            {rankChange.isPromotion && (
              <div className={styles.promotionBanner}>PROMOTION!</div>
            )}
            {rankChange.isDemotion && (
              <div className={styles.demotionBanner}>DEMOTION</div>
            )}

            {/* Progress bar */}
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${tierProgress(rankChange.newPoints)}%`,
                    background: `linear-gradient(90deg, ${rankChange.newTier.color}80, ${rankChange.newTier.color})`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.resultActions}>
            <button className={styles.searchBtn} onClick={startSearch}>
              PLAY AGAIN
            </button>
            <button className={styles.backBtn} onClick={handleBackToLobby}>
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
