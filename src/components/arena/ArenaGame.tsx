'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useArenaSocket } from '@/hooks/useArenaSocket';
import { useTranslations } from 'next-intl';
import type { ArenaGimmick, ArenaBoardPayload } from '@/types/arena';
import { ARENA_MAX_PLAYERS, GIMMICK_DURATIONS } from '@/types/arena';
import styles from './ArenaGame.module.css';

const GIMMICK_LABELS: Record<string, string> = {
  tempo_shift: 'TEMPO SHIFT',
  gravity_surge: 'GRAVITY SURGE',
  mirror_mode: 'MIRROR MODE',
  garbage_rain: 'GARBAGE RAIN',
  blackout: 'BLACKOUT',
  speed_frenzy: 'SPEED FRENZY',
  freeze_frame: 'FREEZE',
  shuffle_preview: 'SHUFFLE',
};

// Mini board renderer for opponent preview
function MiniBoardView({ board }: { board: (null | { color: string })[][] }) {
  // Only show bottom 16 rows for mini preview
  const visibleRows = board.slice(Math.max(0, board.length - 16));

  return (
    <div className={styles.opponentMiniBoard}>
      {visibleRows.map((row, ri) => (
        <div key={ri} className={styles.miniRow}>
          {row.map((cell, ci) => (
            <div
              key={ci}
              className={`${styles.miniCell} ${cell ? styles.filled : ''}`}
              style={cell ? { background: cell.color } : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ArenaGame() {
  const t = useTranslations('arena');
  const {
    connectionStatus,
    connectWebSocket,
    playerId,
    phase,
    setPhase,
    arenaState,
    error,
    setError,
    countdownNumber,
    gameSeed,
    queuePosition,
    queueSize,
    bpm,
    beatPhase,
    chaosLevel,
    activeGimmick,
    syncMap,
    lastPlayerAction,
    lastElimination,
    lastTempoCollapse,
    sessionResult,
    opponentBoards,
    queueForArena,
    cancelQueue,
    createArena,
    joinArena,
    setReady,
    startArena,
    sendAction,
    sendBoardRelay,
    leaveArena,
  } = useArenaSocket();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showElimBanner, setShowElimBanner] = useState(false);
  const [showCollapse, setShowCollapse] = useState(false);
  const elimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Beat indicator
  const onBeat = beatPhase > 0.75 || beatPhase < 0.15;

  // My sync accuracy
  const mySync = syncMap[playerId] ?? 1.0;

  // Chaos bar class
  const chaosClass = chaosLevel >= 75 ? styles.chaosHigh
    : chaosLevel >= 40 ? styles.chaosMedium : styles.chaosLow;

  // Show elimination banner briefly
  useEffect(() => {
    if (lastElimination) {
      setShowElimBanner(true);
      if (elimTimerRef.current) clearTimeout(elimTimerRef.current);
      elimTimerRef.current = setTimeout(() => setShowElimBanner(false), 3000);
    }
    return () => { if (elimTimerRef.current) clearTimeout(elimTimerRef.current); };
  }, [lastElimination]);

  // Show tempo collapse flash
  useEffect(() => {
    if (lastTempoCollapse) {
      setShowCollapse(true);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = setTimeout(() => setShowCollapse(false), 1000);
    }
    return () => { if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current); };
  }, [lastTempoCollapse]);

  // ===== Derived state =====
  const isHost = arenaState?.hostId === playerId;
  const myPlayer = arenaState?.players.find(p => p.id === playerId);
  const opponents = useMemo(
    () => arenaState?.players.filter(p => p.id !== playerId) || [],
    [arenaState, playerId],
  );
  const allReady = arenaState?.players.every(p => p.ready || p.id === arenaState.hostId)
    && (arenaState?.players.length ?? 0) >= 3;

  // ===== Handlers =====
  const handleNameSubmit = useCallback(() => {
    if (playerName.trim().length < 2) return;
    const next = sessionStorage.getItem('arena_nextMode');
    sessionStorage.removeItem('arena_nextMode');
    if (next === 'queue') {
      queueForArena(playerName.trim());
    } else if (next === 'create') {
      createArena(playerName.trim());
    } else {
      // Default: go to queue
      queueForArena(playerName.trim());
    }
  }, [playerName, queueForArena, createArena]);

  const handleJoinByCode = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError('Enter a valid arena code');
      return;
    }
    joinArena(code, playerName.trim());
  }, [joinCode, joinArena, playerName, setError]);

  // ===== Simulated board for demo (the actual game engine would plug in here) =====
  // In a full implementation, this would use the tetris engine from components/rhythmia/tetris
  // For now, we render the arena structure and opponent boards from relayed data

  // Empty 10x20 board for display
  const emptyBoard = useMemo(() => {
    const board: (null | { color: string })[][] = [];
    for (let r = 0; r < 20; r++) {
      const row: (null | { color: string })[] = [];
      for (let c = 0; c < 10; c++) {
        row.push(null);
      }
      board.push(row);
    }
    return board;
  }, []);

  return (
    <div className={styles.container}>
      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.connectionStatus}>
          <div className={`${styles.statusDot} ${styles[connectionStatus]}`} />
          <span>
            {connectionStatus === 'connected' && t('online')}
            {connectionStatus === 'connecting' && t('connecting')}
            {connectionStatus === 'error' && t('connectionError')}
            {connectionStatus === 'disconnected' && t('offline')}
          </span>
        </div>
        {phase === 'playing' && (
          <div className={styles.tempoDisplay}>
            <div
              className={`${styles.beatIndicator} ${onBeat ? styles.onBeat : ''}`}
            />
            <div className={styles.bpmValue}>{Math.round(bpm)}</div>
            <span>BPM</span>
            <span className={styles.syncValue}>
              {t('sync')}: {Math.round(mySync * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* ===== LOBBY ===== */}
      {phase === 'lobby' && (
        <div className={styles.lobby}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
          <p className={styles.playerCount}>{t('maxPlayers', { count: ARENA_MAX_PLAYERS })}</p>

          <div className={styles.lobbyActions}>
            <button
              className={styles.primaryBtn}
              onClick={() => {
                if (connectionStatus !== 'connected') connectWebSocket();
                if (playerName.trim().length >= 2) {
                  queueForArena(playerName.trim());
                } else {
                  sessionStorage.setItem('arena_nextMode', 'queue');
                  setPhase('name-entry');
                }
              }}
            >
              {t('quickMatch')}
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => {
                if (connectionStatus !== 'connected') connectWebSocket();
                if (playerName.trim().length >= 2) {
                  createArena(playerName.trim());
                } else {
                  sessionStorage.setItem('arena_nextMode', 'create');
                  setPhase('name-entry');
                }
              }}
            >
              {t('createArena')}
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => {
                if (connectionStatus !== 'connected') connectWebSocket();
                setPhase('name-entry');
                sessionStorage.setItem('arena_nextMode', 'join');
              }}
            >
              {t('joinByCode')}
            </button>
          </div>
        </div>
      )}

      {/* ===== NAME ENTRY ===== */}
      {phase === 'name-entry' && (
        <div className={styles.nameEntry}>
          <div className={styles.sectionTitle}>{t('enterName')}</div>
          <input
            type="text"
            className={styles.nameInput}
            placeholder={t('namePlaceholder')}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            maxLength={12}
            autoFocus
          />

          {sessionStorage.getItem('arena_nextMode') === 'join' && (
            <>
              <div className={styles.sectionTitle} style={{ fontSize: '0.9rem', marginTop: 12 }}>
                {t('enterCode')}
              </div>
              <input
                type="text"
                className={styles.nameInput}
                placeholder="AXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={5}
                style={{ letterSpacing: '0.3em', textTransform: 'uppercase' }}
              />
              <button
                className={styles.primaryBtn}
                onClick={handleJoinByCode}
                disabled={playerName.trim().length < 2 || joinCode.trim().length < 4}
              >
                {t('join')}
              </button>
            </>
          )}

          {sessionStorage.getItem('arena_nextMode') !== 'join' && (
            <button
              className={styles.primaryBtn}
              onClick={handleNameSubmit}
              disabled={playerName.trim().length < 2}
            >
              {t('next')}
            </button>
          )}

          <button className={styles.secondaryBtn} onClick={() => setPhase('lobby')}>
            {t('back')}
          </button>
        </div>
      )}

      {/* ===== QUEUE ===== */}
      {phase === 'queue' && (
        <div className={styles.queueScreen}>
          <div className={styles.queuePulse} />
          <div className={styles.sectionTitle}>{t('searching')}</div>
          <div className={styles.queueInfo}>
            {t('queueInfo')}
          </div>
          <div className={styles.queueCount}>
            {t('playersInQueue', { count: queueSize })}
          </div>
          <button className={styles.secondaryBtn} onClick={cancelQueue}>
            {t('cancel')}
          </button>
        </div>
      )}

      {/* ===== WAITING ROOM ===== */}
      {phase === 'waiting-room' && arenaState && (
        <div className={styles.waitingRoom}>
          <div className={styles.sectionTitle}>{arenaState.name}</div>

          <div className={styles.arenaCode}>
            <span className={styles.arenaCodeLabel}>{t('arenaCode')}</span>
            <span className={styles.arenaCodeValue}>{arenaState.code}</span>
            <button
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(arenaState.code)}
            >
              {t('copy')}
            </button>
          </div>

          <div className={styles.playersGrid}>
            {arenaState.players.map((player) => (
              <div
                key={player.id}
                className={`${styles.playerSlot} ${player.ready ? styles.ready : ''} ${player.id === arenaState.hostId ? styles.host : ''}`}
                style={!player.connected ? { opacity: 0.5 } : {}}
              >
                <div className={styles.playerSlotName}>
                  {player.name}
                  {player.id === arenaState.hostId && (
                    <span className={styles.hostBadge}>HOST</span>
                  )}
                </div>
                <div className={styles.playerSlotStatus}>
                  {!player.connected ? t('reconnecting') : player.ready ? t('ready') : t('notReady')}
                </div>
              </div>
            ))}
            {Array.from({ length: ARENA_MAX_PLAYERS - arenaState.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className={`${styles.playerSlot} ${styles.empty}`}>
                <div className={styles.playerSlotName}>{t('waiting')}</div>
              </div>
            ))}
          </div>

          <div className={styles.waitingActions}>
            {!isHost && (
              <button
                className={myPlayer?.ready ? styles.secondaryBtn : styles.primaryBtn}
                onClick={() => setReady(!myPlayer?.ready)}
              >
                {myPlayer?.ready ? t('cancelReady') : t('readyUp')}
              </button>
            )}

            {isHost && (
              <button
                className={styles.primaryBtn}
                onClick={startArena}
                disabled={!allReady}
              >
                {allReady ? t('startArena') : t('waitingForPlayers')}
              </button>
            )}

            <button className={styles.secondaryBtn} onClick={leaveArena}>
              {t('leave')}
            </button>
          </div>
        </div>
      )}

      {/* ===== COUNTDOWN ===== */}
      {phase === 'countdown' && (
        <div className={styles.countdownScreen}>
          <div className={styles.countdownNumber}>{countdownNumber}</div>
          <div className={styles.countdownLabel}>{t('getReady')}</div>
        </div>
      )}

      {/* ===== PLAYING ===== */}
      {phase === 'playing' && arenaState && (
        <div className={styles.arenaPlayfield}>
          {/* HUD */}
          <div className={styles.hudBar}>
            <div className={styles.chaosBar}>
              <div className={styles.chaosLabel}>
                <span>{t('chaos')}</span>
                <span>{Math.round(chaosLevel)}%</span>
              </div>
              <div className={styles.chaosTrack}>
                <div
                  className={`${styles.chaosFill} ${chaosClass}`}
                  style={{ width: `${Math.min(100, chaosLevel)}%` }}
                />
              </div>
            </div>

            {activeGimmick && (
              <div className={styles.gimmickBanner}>
                {GIMMICK_LABELS[activeGimmick.type] || activeGimmick.type}
              </div>
            )}

            <div className={styles.tempoDisplay}>
              <div className={`${styles.beatIndicator} ${onBeat ? styles.onBeat : ''}`} />
              <div className={styles.bpmValue}>{Math.round(bpm)}</div>
              <span>BPM</span>
            </div>
          </div>

          {/* Main Content: My Board + Opponents */}
          <div className={styles.arenaContent}>
            {/* My board */}
            <div className={styles.myBoardArea}>
              <div className={styles.myBoard} style={{ '--cell-size': '24px' } as React.CSSProperties}>
                {emptyBoard.map((row, ri) => (
                  <div key={ri} className={styles.boardRow}>
                    {row.map((cell, ci) => (
                      <div
                        key={ci}
                        className={`${styles.boardCell} ${cell ? styles.filled : ''}`}
                        style={cell ? { background: cell.color } : { background: 'rgba(255,255,255,0.02)' }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Opponents mini boards */}
            <div className={styles.opponentsSidebar}>
              {opponents.map((opp) => {
                const board = opponentBoards.get(opp.id);
                const oppSync = syncMap[opp.id] ?? 1.0;

                return (
                  <div
                    key={opp.id}
                    className={`${styles.opponentMini} ${!opp.alive ? styles.eliminated : ''}`}
                  >
                    <div className={styles.opponentName}>{opp.name}</div>
                    {board ? (
                      <MiniBoardView board={board.board} />
                    ) : (
                      <div className={styles.opponentMiniBoard}>
                        {Array.from({ length: 10 }).map((_, ri) => (
                          <div key={ri} className={styles.miniRow}>
                            {Array.from({ length: 10 }).map((__, ci) => (
                              <div key={ci} className={styles.miniCell} />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={styles.opponentStats}>
                      <span>{board?.score ?? 0}</span>
                      <span>{board?.lines ?? 0}L</span>
                    </div>
                    <div className={styles.opponentSync}>
                      <div
                        className={styles.opponentSyncFill}
                        style={{ width: `${Math.round(oppSync * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overlays */}
          {showCollapse && <div className={styles.tempoCollapseOverlay} />}
          {showElimBanner && lastElimination && (
            <div className={styles.eliminationBanner}>
              {lastElimination.playerName} {t('eliminated')} #{lastElimination.placement}
            </div>
          )}
        </div>
      )}

      {/* ===== RESULTS ===== */}
      {phase === 'ended' && sessionResult && (
        <div className={styles.resultsScreen}>
          <div className={styles.resultReason}>
            {sessionResult.reason === 'last_standing' && t('resultLastStanding')}
            {sessionResult.reason === 'tempo_collapse' && t('resultTempoCollapse')}
            {sessionResult.reason === 'chaos_overload' && t('resultChaosOverload')}
          </div>

          <h2 className={`${styles.resultTitle} ${sessionResult.winnerId !== playerId ? styles.defeat : ''}`}>
            {sessionResult.winnerId === playerId
              ? t('victory')
              : sessionResult.winnerId
                ? `${sessionResult.winnerName} ${t('wins')}`
                : t('noWinner')}
          </h2>

          {/* Rankings */}
          <div className={styles.rankingsTable}>
            {sessionResult.rankings.map((r) => (
              <div
                key={r.playerId}
                className={`${styles.rankingRow} ${r.playerId === playerId ? styles.isMe : ''} ${r.placement === 1 ? styles.first : ''}`}
              >
                <div className={styles.rankingPlace}>#{r.placement}</div>
                <div className={styles.rankingName}>{r.playerName}</div>
                <div className={styles.rankingStat}>{r.score} pts</div>
                <div className={styles.rankingStat}>{r.kills} KO</div>
                <div className={styles.rankingStat}>{Math.round(r.avgSync * 100)}%</div>
              </div>
            ))}
          </div>

          {/* Session Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>
                {Math.floor(sessionResult.stats.totalDurationMs / 1000)}s
              </div>
              <div className={styles.statLabel}>{t('duration')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{Math.round(sessionResult.stats.peakBpm)}</div>
              <div className={styles.statLabel}>{t('peakBpm')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{sessionResult.stats.totalGimmicks}</div>
              <div className={styles.statLabel}>{t('gimmicks')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{Math.round(sessionResult.stats.peakChaos)}</div>
              <div className={styles.statLabel}>{t('peakChaos')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{sessionResult.stats.tempoCollapses}</div>
              <div className={styles.statLabel}>{t('tempoCollapses')}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{Math.round(sessionResult.stats.lowestBpm)}</div>
              <div className={styles.statLabel}>{t('lowestBpm')}</div>
            </div>
          </div>

          <div className={styles.resultActions}>
            <button className={styles.primaryBtn} onClick={() => { leaveArena(); }}>
              {t('backToLobby')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
