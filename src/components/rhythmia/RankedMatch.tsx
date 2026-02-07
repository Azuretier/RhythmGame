'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './RankedMatch.module.css';
import MultiplayerBattle from './MultiplayerBattle';
import type {
  ServerMessage,
  RoomState,
  Player,
} from '@/types/multiplayer';
import {
  RANK_TIERS,
  getTierByPoints,
  getDefaultRankedState,
  calculateRankChange,
  tierProgress,
  pointsToNextTier,
  MATCHMAKING_TIMEOUT_MS,
} from '@/lib/ranked/constants';
import type { RankedState, RankChange } from '@/lib/ranked/types';
import { TetrisAIGame, getDifficultyForRank } from '@/lib/ranked/TetrisAI';
import type { BoardCell } from '@/types/multiplayer';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type MatchPhase = 'idle' | 'searching' | 'found' | 'countdown' | 'playing' | 'result';

const MAX_RECONNECT_ATTEMPTS = 5;
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
}

export default function RankedMatch({ playerName, onBack }: Props) {
  // Connection
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const playerIdRef = useRef<string>('');
  const reconnectTokenRef = useRef<string>('');
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ranked state
  const [rankedState, setRankedState] = useState<RankedState>(loadRankedState);
  const [rankChange, setRankChange] = useState<RankChange | null>(null);

  // Match state
  const [phase, setPhase] = useState<MatchPhase>('idle');
  const [searchTimer, setSearchTimer] = useState(0);
  const searchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [opponentName, setOpponentName] = useState('');
  const [opponentId, setOpponentId] = useState('');
  const [isAIMatch, setIsAIMatch] = useState(false);
  const [gameSeed, setGameSeed] = useState(0);
  const [roomCode, setRoomCode] = useState('');
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<'win' | 'loss' | null>(null);

  // AI game
  const aiGameRef = useRef<TetrisAIGame | null>(null);
  const aiOpponentBoardRef = useRef<(BoardCell | null)[][]>([]);

  // ===== WebSocket Connection =====
  const connectWebSocketRef = useRef<() => void>(() => {});

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 15000);
    reconnectAttemptsRef.current++;
    setConnectionStatus('connecting');

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectWebSocketRef.current();
    }, delay);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setConnectionStatus('connecting');
    const wsUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleServerMessage(message);
      } catch {}
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      wsRef.current = null;
      if (reconnectTokenRef.current) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      setConnectionStatus('error');
    };

    wsRef.current = ws;
  }, [scheduleReconnect]);

  connectWebSocketRef.current = connectWebSocket;

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // ===== Server Message Handler =====
  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'connected':
        playerIdRef.current = msg.playerId;
        break;

      case 'ranked_queued':
        // Confirmed in queue
        break;

      case 'ranked_match_found':
        reconnectTokenRef.current = msg.reconnectToken;
        setRoomCode(msg.roomCode);
        setOpponentName(msg.opponentName);
        setOpponentId(msg.opponentId);
        setIsAIMatch(msg.isAI);
        setGameSeed(msg.gameSeed);
        setPhase('found');

        // Stop search timer
        if (searchIntervalRef.current) {
          clearInterval(searchIntervalRef.current);
          searchIntervalRef.current = null;
        }
        break;

      case 'countdown':
        setCountdownNumber(msg.count);
        setPhase('countdown');
        break;

      case 'game_started':
        setGameSeed(msg.gameSeed);
        setCountdownNumber(null);
        setPhase('playing');
        break;

      case 'room_state':
        // Handle room state updates
        break;

      case 'ping':
        send({ type: 'pong' });
        break;

      case 'error':
        // If error during search, reset
        if (phase === 'searching') {
          setPhase('idle');
          if (searchIntervalRef.current) {
            clearInterval(searchIntervalRef.current);
            searchIntervalRef.current = null;
          }
        }
        break;

      default:
        break;
    }
  }, [send, phase]);

  // Connect on mount
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (aiGameRef.current) {
        aiGameRef.current.stop();
      }
    };
  }, [connectWebSocket]);

  // ===== Matchmaking =====
  const startSearch = useCallback(() => {
    if (connectionStatus !== 'connected') return;

    setPhase('searching');
    setSearchTimer(0);
    setGameResult(null);
    setRankChange(null);

    send({
      type: 'queue_ranked',
      playerName: playerName.trim(),
      rankPoints: rankedState.points,
    });

    // Start search timer display
    const start = Date.now();
    searchIntervalRef.current = setInterval(() => {
      setSearchTimer(Math.floor((Date.now() - start) / 1000));
    }, 100);
  }, [connectionStatus, send, playerName, rankedState.points]);

  const cancelSearch = useCallback(() => {
    send({ type: 'cancel_ranked' });
    setPhase('idle');
    setSearchTimer(0);
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current);
      searchIntervalRef.current = null;
    }
  }, [send]);

  // ===== AI Match Setup =====
  // For AI matches, we handle the game entirely client-side
  // The AI runs its own game, relaying board updates through simulated messages
  useEffect(() => {
    if (phase !== 'playing' || !isAIMatch) return;

    const difficulty = getDifficultyForRank(rankedState.points);

    const aiGame = new TetrisAIGame(gameSeed, difficulty, {
      onBoardUpdate: (board, score, lines, combo, piece, hold) => {
        // Simulate a relay message from the AI player
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Inject as if it came from the server
          const fakeMessage: ServerMessage = {
            type: 'relayed',
            fromPlayerId: opponentId,
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
          // Dispatch to the WebSocket message handler
          const event = new MessageEvent('message', {
            data: JSON.stringify(fakeMessage),
          });
          wsRef.current.dispatchEvent(event);
        }
      },
      onGarbage: (lines) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const fakeMessage: ServerMessage = {
            type: 'relayed',
            fromPlayerId: opponentId,
            payload: { event: 'garbage', lines },
          };
          const event = new MessageEvent('message', {
            data: JSON.stringify(fakeMessage),
          });
          wsRef.current.dispatchEvent(event);
        }
      },
      onGameOver: () => {
        // AI lost, player wins
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const fakeMessage: ServerMessage = {
            type: 'relayed',
            fromPlayerId: opponentId,
            payload: { event: 'game_over' },
          };
          const event = new MessageEvent('message', {
            data: JSON.stringify(fakeMessage),
          });
          wsRef.current.dispatchEvent(event);
        }
      },
    });

    aiGameRef.current = aiGame;
    aiGame.start();

    // Listen for player's garbage sent to AI
    const handlePlayerRelay = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'relay' && msg.payload?.event === 'garbage') {
          aiGame.addGarbage(msg.payload.lines);
        }
      } catch {}
    };

    // We intercept outgoing relay messages to feed garbage to AI
    const originalSend = wsRef.current?.send.bind(wsRef.current);
    if (wsRef.current && originalSend) {
      wsRef.current.send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
        // Still send to server for normal relay
        try {
          originalSend(data);
        } catch {}

        // Also check if this is a garbage relay for the AI
        try {
          if (typeof data === 'string') {
            const msg = JSON.parse(data);
            if (msg.type === 'relay' && msg.payload?.event === 'garbage') {
              aiGame.addGarbage(msg.payload.lines);
            }
            if (msg.type === 'relay' && msg.payload?.event === 'game_over') {
              aiGame.stop();
            }
          }
        } catch {}
      };
    }

    return () => {
      aiGame.stop();
      aiGameRef.current = null;
      // Restore original send
      if (wsRef.current && originalSend) {
        wsRef.current.send = originalSend;
      }
    };
  }, [phase, isAIMatch, gameSeed, opponentId, rankedState.points]);

  // ===== Game End =====
  const handleGameEnd = useCallback((winnerId: string) => {
    const won = winnerId === playerIdRef.current;
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
  }, [rankedState]);

  const handleBackToLobby = useCallback(() => {
    send({ type: 'leave_room' });
    reconnectTokenRef.current = '';
    setPhase('idle');
    setGameResult(null);
    if (aiGameRef.current) {
      aiGameRef.current.stop();
      aiGameRef.current = null;
    }
  }, [send]);

  // ===== Derived State =====
  const tier = getTierByPoints(rankedState.points);
  const progress = tierProgress(rankedState.points);
  const toNext = pointsToNextTier(rankedState.points);

  // For AI matches, auto-start countdown after "found" phase
  useEffect(() => {
    if (phase === 'found' && isAIMatch) {
      // Simulate a countdown
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
    }
  }, [phase, isAIMatch]);

  // ===== Render =====
  return (
    <div className={styles.container}>
      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.connectionStatus}>
          <div className={`${styles.statusDot} ${styles[connectionStatus]}`} />
          <span>
            {connectionStatus === 'connected' && 'Online'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'error' && 'Error'}
            {connectionStatus === 'disconnected' && 'Offline'}
          </span>
        </div>
      </div>

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
            FIND MATCH
          </button>

          <button className={styles.backBtn} onClick={onBack}>
            Back
          </button>
        </div>
      )}

      {/* Searching */}
      {phase === 'searching' && (
        <div className={styles.searchScreen}>
          <div className={styles.searchTitle}>SEARCHING FOR OPPONENT</div>

          <div className={styles.searchAnim}>
            <div className={styles.searchPulse} />
            <div className={styles.searchTimer}>{searchTimer}s</div>
          </div>

          <div className={styles.searchInfo}>
            <div className={styles.searchRank} style={{ color: tier.color }}>{tier.name}</div>
            <div className={styles.searchPoints}>{rankedState.points} RP</div>
          </div>

          {searchTimer >= 5 && (
            <div className={styles.searchHint}>
              AI opponent joining soon...
            </div>
          )}

          <button className={styles.cancelBtn} onClick={cancelSearch}>
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
              {isAIMatch && <div className={styles.aiBadge}>AI</div>}
            </div>
          </div>
          <div className={styles.countdownNumber}>{countdownNumber}</div>
        </div>
      )}

      {/* Playing */}
      {phase === 'playing' && wsRef.current && (
        <MultiplayerBattle
          ws={wsRef.current}
          roomCode={roomCode}
          playerId={playerIdRef.current}
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
