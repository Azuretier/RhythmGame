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
import { TetrisAIGame, getDifficultyForRank } from '@/lib/ranked/TetrisAI';
import type { BoardCell } from '@/types/multiplayer';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type MatchPhase = 'idle' | 'found' | 'countdown' | 'playing' | 'result';

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
  // Keep a ref to the ws prop for use in effects
  const wsRef = useRef<WebSocket | null>(ws);
  useEffect(() => {
    wsRef.current = ws;
  }, [ws]);

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

  // AI game
  const aiGameRef = useRef<TetrisAIGame | null>(null);

  // ===== Start AI Match Directly =====
  const startSearch = useCallback(() => {
    setGameResult(null);
    setRankChange(null);

    // Start AI match immediately (client-side, no server queue)
    const seed = Math.floor(Math.random() * 2147483647);
    setGameSeed(seed);
    setOpponentName('AI Rival');
    setOpponentId(`ai_${Date.now()}`);
    setRoomCode(`ai_${Date.now()}`);
    setPhase('found');
  }, []);

  // ===== AI Match Setup =====
  // The AI runs client-side, relaying board updates through fake WebSocket messages
  useEffect(() => {
    if (phase !== 'playing') return;

    const currentWs = wsRef.current;
    if (!currentWs) return;

    const currentOpponentId = opponentId;
    const difficulty = getDifficultyForRank(rankedState.points);

    const aiGame = new TetrisAIGame(gameSeed, difficulty, {
      onBoardUpdate: (board, score, lines, combo, piece, hold) => {
        if (currentWs.readyState === WebSocket.OPEN) {
          const fakeMessage: ServerMessage = {
            type: 'relayed',
            fromPlayerId: currentOpponentId,
            payload: {
              event: 'board_update',
              board,
              score,
              lines,
              combo,
              piece,
              hold,
            },
          };
          const event = new MessageEvent('message', {
            data: JSON.stringify(fakeMessage),
          });
          currentWs.dispatchEvent(event);
        }
      },
      onGarbage: (lines) => {
        if (currentWs.readyState === WebSocket.OPEN) {
          const fakeMessage: ServerMessage = {
            type: 'relayed',
            fromPlayerId: currentOpponentId,
            payload: { event: 'garbage', lines },
          };
          const event = new MessageEvent('message', {
            data: JSON.stringify(fakeMessage),
          });
          currentWs.dispatchEvent(event);
        }
      },
      onGameOver: () => {
        if (currentWs.readyState === WebSocket.OPEN) {
          const fakeMessage: ServerMessage = {
            type: 'relayed',
            fromPlayerId: currentOpponentId,
            payload: { event: 'game_over' },
          };
          const event = new MessageEvent('message', {
            data: JSON.stringify(fakeMessage),
          });
          currentWs.dispatchEvent(event);
        }
      },
    });

    aiGameRef.current = aiGame;
    aiGame.start();

    // Intercept outgoing messages: route relay messages to AI locally,
    // pass non-relay messages (pong, etc.) through to the server
    const originalSend = currentWs.send.bind(currentWs);
    currentWs.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
      try {
        if (typeof data === 'string') {
          const msg = JSON.parse(data);
          if (msg.type === 'relay') {
            if (msg.payload?.event === 'garbage') {
              aiGame.addGarbage(msg.payload.lines);
            }
            if (msg.payload?.event === 'game_over') {
              aiGame.stop();
            }
            return; // Don't send relay messages to server for AI matches
          }
        }
        originalSend(data);
      } catch {}
    };

    return () => {
      aiGame.stop();
      aiGameRef.current = null;
      // Restore original send
      if (currentWs) {
        currentWs.send = originalSend;
      }
    };
  }, [phase, gameSeed, opponentId, rankedState.points]);

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

    // Stop AI if running
    if (aiGameRef.current) {
      aiGameRef.current.stop();
    }

    setPhase('result');
  }, [rankedState, playerId]);

  const handleBackToLobby = useCallback(() => {
    setPhase('idle');
    setGameResult(null);
    if (aiGameRef.current) {
      aiGameRef.current.stop();
      aiGameRef.current = null;
    }
  }, []);

  // ===== Derived State =====
  const tier = getTierByPoints(rankedState.points);
  const progress = tierProgress(rankedState.points);
  const toNext = pointsToNextTier(rankedState.points);

  // For AI matches, auto-start countdown after "found" phase
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aiGameRef.current) {
        aiGameRef.current.stop();
      }
    };
  }, []);

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
          >
            FIND MATCH
          </button>

          <button className={styles.backBtn} onClick={onBack}>
            Back
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
              <div className={styles.aiBadge}>AI</div>
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
