'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Crown, Users, Loader2, WifiOff,
  Swords, LogOut, Trophy, Medal, Shield, Skull,
} from 'lucide-react';
import type { TowerType } from '@/types/tower-defense';
import { TOWER_DEFS, INITIAL_LIVES } from '@/types/tower-defense';
import { useProfile } from '@/lib/profile/context';
import { useTDMultiplayerSocket } from '@/hooks/useTDMultiplayerSocket';
import type { TDMultiplayerState } from '@/hooks/useTDMultiplayerSocket';
import TDGameHUD from './TDGameHUD';
import TDTowerPanel from './TDTowerPanel';
import TDTowerInfo from './TDTowerInfo';
import TDEnemyInfo from './TDEnemyInfo';
import TDSendEnemyPanel from './TDSendEnemyPanel';
import TDOpponentBar from './TDOpponentBar';
import TDIncomingAlert from './TDIncomingAlert';
import TDParticleOverlay from './TDParticleOverlay';
import { cn } from '@/lib/utils';
import styles from './TowerDefenseGame.module.css';
import mpStyles from './TowerDefenseMultiplayer.module.css';

const TowerDefenseRenderer3D = dynamic(
  () => import('./TowerDefenseRenderer3D'),
  { ssr: false }
);

const TOWER_ORDER: TowerType[] = ['archer', 'cannon', 'frost', 'lightning', 'sniper', 'flame', 'arcane'];

// ===== Main Export =====

export default function TowerDefenseMultiplayer() {
  const { profile } = useProfile();
  const mp = useTDMultiplayerSocket();
  const { state } = mp;

  // Auto-connect on mount
  useEffect(() => {
    if (!mp.isConnected) {
      mp.connectWebSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        {(state.status === 'disconnected' || state.status === 'connecting') && (
          <ConnectingScreen key="connecting" status={state.status} onRetry={mp.connectWebSocket} />
        )}
        {state.status === 'connected' && !state.roomCode && (
          <TDMultiplayerLobby
            key="lobby"
            playerName={profile?.name || 'Player'}
            error={state.error}
            onCreateRoom={mp.createRoom}
            onJoinRoom={mp.joinRoom}
            onBack={mp.disconnect}
          />
        )}
        {state.status === 'waiting' && state.roomCode && (
          <TDMultiplayerWaitingRoom
            key="waiting"
            state={state}
            onSetReady={mp.setReady}
            onStartGame={mp.startGame}
            onLeave={mp.leaveRoom}
          />
        )}
        {state.status === 'countdown' && (
          <TDMultiplayerCountdown
            key="countdown"
            countdown={state.countdown}
            players={state.players}
          />
        )}
        {(state.status === 'playing' || state.status === 'ended') && (
          <TDMultiplayerGameView
            key="game"
            state={state}
            mp={mp}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== Connecting Screen =====

function ConnectingScreen({
  status,
  onRetry,
}: {
  status: 'disconnected' | 'connecting';
  onRetry: () => void;
}) {
  return (
    <motion.div
      className={mpStyles.connectingScreen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {status === 'connecting' ? (
        <>
          <Loader2 size={56} className={cn(mpStyles.connectingIcon, mpStyles.connectingIconSpin)} />
          <p className={mpStyles.connectingText}>Connecting to server</p>
          <div className={mpStyles.pulsingDots}>
            <div className={mpStyles.pulsingDot} />
            <div className={mpStyles.pulsingDot} />
            <div className={mpStyles.pulsingDot} />
          </div>
        </>
      ) : (
        <>
          <WifiOff size={56} className={cn(mpStyles.connectingIcon, mpStyles.connectingIconOff)} />
          <p className={mpStyles.connectingText}>Connection lost</p>
          <p className={mpStyles.connectingSubtext}>Server may be offline or unreachable</p>
          <button onClick={onRetry} className={mpStyles.reconnectBtn}>
            Reconnect
          </button>
        </>
      )}
    </motion.div>
  );
}

// ===== Multiplayer Lobby =====

function TDMultiplayerLobby({
  playerName,
  error,
  onCreateRoom,
  onJoinRoom,
  onBack,
}: {
  playerName: string;
  error: string | null;
  onCreateRoom: (name: string, mapIndex?: number) => void;
  onJoinRoom: (code: string, name: string) => void;
  onBack: () => void;
}) {
  const [joinCode, setJoinCode] = useState('');
  const [selectedMap, setSelectedMap] = useState(0);

  return (
    <motion.div
      className={mpStyles.lobbyScreen}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={mpStyles.lobbyStatusBadge}>
        <div className={mpStyles.lobbyStatusDot} />
        <span className={mpStyles.lobbyStatusText}>Online</span>
      </div>
      <h1 className={mpStyles.lobbyTitle}>Tower Defense</h1>
      <p className={mpStyles.lobbySubtitle}>Multiplayer</p>

      <div className={mpStyles.lobbyContent}>
        {/* Create room */}
        <div className={mpStyles.glassCard}>
          <div className={mpStyles.cardHeader}>
            <div className={cn(mpStyles.cardHeaderIcon, mpStyles.cardHeaderIconCreate)}>
              <Swords size={14} />
            </div>
            <span className={mpStyles.cardTitle}>Create Room</span>
          </div>
          <div className={mpStyles.mapSelector}>
            <button
              onClick={() => setSelectedMap(0)}
              className={cn(
                mpStyles.mapBtn,
                selectedMap === 0 && mpStyles.mapBtnSelected
              )}
            >
              Map 1
            </button>
            <button
              onClick={() => setSelectedMap(1)}
              className={cn(
                mpStyles.mapBtn,
                selectedMap === 1 && mpStyles.mapBtnSelectedAlt
              )}
            >
              Map 2
            </button>
          </div>
          <button
            onClick={() => onCreateRoom(playerName, selectedMap)}
            className={mpStyles.primaryBtn}
          >
            Create Room
          </button>
        </div>

        {/* Join room */}
        <div className={mpStyles.glassCard}>
          <div className={mpStyles.cardHeader}>
            <div className={cn(mpStyles.cardHeaderIcon, mpStyles.cardHeaderIconJoin)}>
              <Users size={14} />
            </div>
            <span className={mpStyles.cardTitle}>Join Room</span>
          </div>
          <div className={mpStyles.joinRow}>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={6}
              className={mpStyles.joinInput}
            />
            <button
              onClick={() => joinCode && onJoinRoom(joinCode, playerName)}
              disabled={!joinCode}
              className={cn(
                mpStyles.joinBtn,
                joinCode ? mpStyles.joinBtnActive : mpStyles.joinBtnDisabled
              )}
            >
              Join
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={mpStyles.errorBanner}>{error}</div>
        )}

        {/* Back */}
        <button onClick={onBack} className={mpStyles.backLink}>
          Back to menu
        </button>
      </div>
    </motion.div>
  );
}

// ===== Waiting Room =====

function TDMultiplayerWaitingRoom({
  state,
  onSetReady,
  onStartGame,
  onLeave,
}: {
  state: TDMultiplayerState;
  onSetReady: (ready: boolean) => void;
  onStartGame: () => void;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const me = state.players.find(p => p.playerId === state.playerId);
  const isReady = me?.ready ?? false;
  const allReady = state.players.every(p => p.ready || p.playerId === state.playerId);
  const canStart = state.isHost && allReady && state.players.length >= 2;

  const handleCopy = useCallback(() => {
    if (!state.roomCode) return;
    navigator.clipboard.writeText(state.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state.roomCode]);

  return (
    <motion.div
      className={mpStyles.waitingScreen}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <p className={mpStyles.roomCodeLabel}>Room Code</p>
      <button onClick={handleCopy} className={mpStyles.roomCodeBtn}>
        <span className={mpStyles.roomCodeText}>{state.roomCode}</span>
        {copied ? (
          <Check size={20} className={cn(mpStyles.roomCodeIcon, mpStyles.roomCodeCopied)} />
        ) : (
          <Copy size={20} className={mpStyles.roomCodeIcon} />
        )}
      </button>

      {/* Player list */}
      <div className={mpStyles.playerListCard}>
        <h3 className={mpStyles.playerListHeader}>
          Players ({state.players.length}/4)
        </h3>
        <div className={mpStyles.playerList}>
          {state.players.map(p => (
            <div
              key={p.playerId}
              className={cn(
                mpStyles.playerRow,
                p.ready && mpStyles.playerRowReady
              )}
            >
              {state.isHost && p.playerId === state.playerId && (
                <Crown size={14} className={mpStyles.playerCrown} />
              )}
              {!state.isHost && p.playerId === state.players.find(_x => state.roomCode)?.playerId && null}
              <span className={mpStyles.playerName}>{p.playerName}</span>
              {p.playerId === state.playerId && (
                <span className={mpStyles.playerYouTag}>YOU</span>
              )}
              <span
                className={cn(
                  mpStyles.readyBadge,
                  p.ready ? mpStyles.readyBadgeOn : mpStyles.readyBadgeOff
                )}
              >
                {p.ready ? 'Ready' : 'Not ready'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <div className={mpStyles.errorBanner} style={{ marginBottom: 16, maxWidth: 420, width: '100%' }}>
          {state.error}
        </div>
      )}

      {/* Actions */}
      <div className={mpStyles.waitingActions}>
        <button onClick={onLeave} className={mpStyles.leaveBtn}>
          <LogOut size={14} />
          Leave
        </button>

        <button
          onClick={() => onSetReady(!isReady)}
          className={cn(
            mpStyles.readyBtn,
            isReady ? mpStyles.readyBtnCancel : mpStyles.readyBtnReady
          )}
        >
          {isReady ? 'Cancel Ready' : 'Ready Up'}
        </button>

        {state.isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className={cn(
              mpStyles.startBtn,
              canStart ? mpStyles.startBtnEnabled : mpStyles.startBtnDisabled
            )}
          >
            Start
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ===== Countdown =====

function TDMultiplayerCountdown({
  countdown,
  players,
}: {
  countdown: number;
  players: TDMultiplayerState['players'];
}) {
  return (
    <motion.div
      className={mpStyles.countdownScreen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Expanding ring effect */}
      <div className={mpStyles.countdownRing} />

      <motion.div
        key={countdown}
        className={countdown > 0 ? mpStyles.countdownNumber : mpStyles.countdownGo}
        initial={{ scale: 2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {countdown > 0 ? countdown : 'GO!'}
      </motion.div>
      <div className={mpStyles.countdownPlayers}>
        {players.map(p => (
          <div key={p.playerId} className={mpStyles.countdownPlayerTag}>
            {p.playerName}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ===== Game View =====

function TDMultiplayerGameView({
  state,
  mp,
}: {
  state: TDMultiplayerState;
  mp: ReturnType<typeof useTDMultiplayerSocket>;
}) {
  const gs = state.ownGameState;
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  const myPlayer = state.players.find(p => p.playerId === state.playerId);
  const isEliminated = myPlayer?.eliminated ?? false;

  // Build opponent data for the panels
  const opponents = useMemo(() =>
    state.players
      .filter(p => p.playerId !== state.playerId)
      .map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        lives: p.lives,
        maxLives: p.maxLives || INITIAL_LIVES,
        score: p.score,
        sendPoints: p.sendPoints,
        towerCount: p.towerCount,
        enemyCount: p.enemyCount,
        eliminated: p.eliminated,
      })),
    [state.players, state.playerId]
  );

  const sendPanelOpponents = useMemo(() =>
    opponents.map(o => ({
      playerId: o.playerId,
      playerName: o.playerName,
      lives: o.lives,
      eliminated: o.eliminated,
    })),
    [opponents]
  );

  // Selected tower/enemy objects
  const selectedTower = useMemo(() => {
    if (!selectedTowerId || !gs) return null;
    return gs.towers.find(t => t.id === selectedTowerId) ?? null;
  }, [selectedTowerId, gs]);

  const selectedEnemy = useMemo(() => {
    if (!selectedEnemyId || !gs) return null;
    return gs.enemies.find(e => e.id === selectedEnemyId) ?? null;
  }, [selectedEnemyId, gs]);

  // Cell click -> place tower via server
  const handleCellClick = useCallback((x: number, z: number) => {
    if (isEliminated) return;

    if (selectedTowerType && gs) {
      mp.placeTower(selectedTowerType, x, z);
      setSelectedTowerType(null);
      return;
    }
    // Check if there's a tower on this cell
    if (gs) {
      const cell = gs.map.grid[z]?.[x];
      if (cell?.towerId) {
        setSelectedTowerId(cell.towerId);
        setSelectedTowerType(null);
        setSelectedEnemyId(null);
        return;
      }
    }
    setSelectedTowerId(null);
  }, [selectedTowerType, gs, mp, isEliminated]);

  const handleSelectTower = useCallback((id: string) => {
    setSelectedTowerId(id);
    setSelectedTowerType(null);
    setSelectedEnemyId(null);
  }, []);

  const handleSelectEnemy = useCallback((id: string) => {
    setSelectedEnemyId(prev => prev === id ? null : id);
    setSelectedTowerId(null);
    setSelectedTowerType(null);
  }, []);

  const handleDeselectEnemy = useCallback(() => setSelectedEnemyId(null), []);
  const handleDeselect = useCallback(() => {
    setSelectedTowerId(null);
    setSelectedTowerType(null);
  }, []);

  const handleTowerTypeSelect = useCallback((type: TowerType) => {
    if (isEliminated || !gs) return;
    if (gs.gold < TOWER_DEFS[type].cost) return;
    setSelectedTowerType(prev => prev === type ? null : type);
    setSelectedTowerId(null);
  }, [gs, isEliminated]);

  const handleUpgrade = useCallback(() => {
    if (selectedTowerId) mp.upgradeTower(selectedTowerId);
  }, [selectedTowerId, mp]);

  const handleSell = useCallback(() => {
    if (selectedTowerId) {
      mp.sellTower(selectedTowerId);
      setSelectedTowerId(null);
    }
  }, [selectedTowerId, mp]);

  const handleSpeedToggle = useCallback(() => {
    // Speed is server-managed in multiplayer; no-op
  }, []);

  const handleSoundToggle = useCallback(() => {
    setSoundOn(prev => !prev);
  }, []);

  const handleBackToMenu = useCallback(() => {
    mp.leaveRoom();
  }, [mp]);

  const handleStartWave = useCallback(() => {
    mp.startWave();
  }, [mp]);

  const handleSendEnemy = useCallback((targetPlayerId: string, enemyType: import('@/types/tower-defense').EnemyType) => {
    mp.sendEnemy(targetPlayerId, enemyType);
  }, [mp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isEliminated) return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= TOWER_ORDER.length) {
        const type = TOWER_ORDER[num - 1];
        setSelectedTowerType(prev => prev === type ? null : type);
        setSelectedTowerId(null);
        return;
      }

      if (e.key === 'Escape') {
        setSelectedTowerType(null);
        setSelectedTowerId(null);
      }

      if ((e.key === ' ' || e.key === 'Enter') && state.isHost) {
        e.preventDefault();
        mp.startWave();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTowerId) {
          mp.sellTower(selectedTowerId);
          setSelectedTowerId(null);
        }
      }

      if (e.key === 'u' || e.key === 'U') {
        if (selectedTowerId) mp.upgradeTower(selectedTowerId);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isEliminated, state.isHost, selectedTowerId, mp]);

  if (!gs) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  const displayState = {
    ...gs,
    selectedTowerType,
    selectedTowerId,
    selectedEnemyId,
  };

  return (
    <motion.div
      className="relative w-full h-screen overflow-hidden bg-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Particle Overlay */}
      <TDParticleOverlay phase={gs.phase} />

      {/* 3D Canvas */}
      <div className={styles.canvasWrapper}>
        <TowerDefenseRenderer3D
          state={displayState}
          onCellClick={handleCellClick}
          onSelectTower={handleSelectTower}
          onSelectEnemy={handleSelectEnemy}
        />
      </div>

      {/* HUD */}
      <TDGameHUD
        gold={gs.gold}
        lives={gs.lives}
        maxLives={gs.maxLives}
        score={gs.score}
        currentWave={gs.currentWave}
        totalWaves={gs.totalWaves}
        phase={gs.phase}
        enemyCount={gs.enemies.length}
        gameSpeed={gs.gameSpeed}
        soundOn={soundOn}
        waveCountdown={gs.waveCountdown}
        autoStart={gs.autoStart}
        onStartWave={handleStartWave}
        onSpeedToggle={handleSpeedToggle}
        onSoundToggle={handleSoundToggle}
        onBackToMenu={handleBackToMenu}
      />

      {/* Tower Selection Panel */}
      <TDTowerPanel
        gold={gs.gold}
        selectedTowerType={selectedTowerType}
        onSelectTowerType={handleTowerTypeSelect}
      />

      {/* Selected Tower Info */}
      <AnimatePresence>
        {selectedTower && (
          <TDTowerInfo
            key={selectedTower.id}
            tower={selectedTower}
            gold={gs.gold}
            onUpgrade={handleUpgrade}
            onSell={handleSell}
            onDeselect={handleDeselect}
          />
        )}
      </AnimatePresence>

      {/* Enemy Info Panel */}
      <AnimatePresence>
        {selectedEnemy && !selectedTower && (
          <TDEnemyInfo
            key={selectedEnemy.id}
            enemy={selectedEnemy}
            onDeselect={handleDeselectEnemy}
          />
        )}
      </AnimatePresence>

      {/* Send Enemy Panel (right side) */}
      <AnimatePresence>
        {!isEliminated && (
          <TDSendEnemyPanel
            sendPoints={myPlayer?.sendPoints ?? 0}
            opponents={sendPanelOpponents}
            selectedTarget={state.selectedTarget}
            onSelectTarget={mp.selectTarget}
            onSendEnemy={handleSendEnemy}
          />
        )}
      </AnimatePresence>

      {/* Opponent Status Bar (bottom) */}
      <TDOpponentBar
        opponents={opponents}
        selectedTarget={state.selectedTarget}
        onSelectTarget={mp.selectTarget}
      />

      {/* Incoming Enemy Alerts */}
      <TDIncomingAlert alerts={state.incomingAlerts} />

      {/* Eliminated Overlay */}
      <AnimatePresence>
        {isEliminated && state.status === 'playing' && (
          <motion.div
            className={cn(
              'absolute inset-0 z-40 flex flex-col items-center justify-center',
              'bg-black/60 backdrop-blur-sm'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Skull size={48} className="text-red-400 mb-3" />
            <h2 className="text-2xl font-bold text-red-400 mb-1">Eliminated</h2>
            <p className="text-slate-400 text-sm">Spectating...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Screen */}
      <AnimatePresence>
        {state.status === 'ended' && (
          <TDMultiplayerEndScreen
            state={state}
            onLeave={mp.leaveRoom}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ===== End Screen =====

function TDMultiplayerEndScreen({
  state,
  onLeave,
}: {
  state: TDMultiplayerState;
  onLeave: () => void;
}) {
  const isWinner = state.winner === state.playerId;

  const rankIconStyles = [mpStyles.rankIcon1, mpStyles.rankIcon2, mpStyles.rankIcon3, mpStyles.rankIcon4];
  const rankNameStyles = [mpStyles.rankName1, mpStyles.rankName2, mpStyles.rankName3, mpStyles.rankName4];

  const rankIcons = [
    <Trophy key="1" size={32} className={rankIconStyles[0]} />,
    <Medal key="2" size={28} className={rankIconStyles[1]} />,
    <Medal key="3" size={24} className={rankIconStyles[2]} />,
    <Shield key="4" size={22} className={rankIconStyles[3]} />,
  ];

  return (
    <motion.div
      className={cn(
        mpStyles.endOverlay,
        isWinner ? mpStyles.endOverlayWon : mpStyles.endOverlayLost
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={{ textAlign: 'center', marginBottom: 32 }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {isWinner ? (
          <>
            <Trophy size={64} className={cn(mpStyles.endIcon, mpStyles.endIconWin)} style={{ margin: '0 auto 12px' }} />
            <h2 className={cn(mpStyles.endTitle, mpStyles.endTitleWin)}>Victory!</h2>
          </>
        ) : (
          <>
            <Shield size={64} className={cn(mpStyles.endIcon, mpStyles.endIconLose)} style={{ margin: '0 auto 12px' }} />
            <h2 className={cn(mpStyles.endTitle, mpStyles.endTitleLose)}>Game Over</h2>
          </>
        )}
      </motion.div>

      {/* Rankings */}
      <motion.div
        className={mpStyles.rankingsCard}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className={mpStyles.rankingsTitle}>Rankings</h3>
        <div className={mpStyles.rankingsList}>
          {state.rankings
            .sort((a, b) => a.rank - b.rank)
            .map(r => {
              const isMe = r.playerId === state.playerId;
              return (
                <div
                  key={r.playerId}
                  className={cn(
                    mpStyles.rankRow,
                    isMe && mpStyles.rankRowMe
                  )}
                >
                  <div className={mpStyles.rankIconWrap}>
                    {rankIcons[r.rank - 1] || (
                      <span className={mpStyles.rankNumber}>#{r.rank}</span>
                    )}
                  </div>
                  <span className={cn(
                    mpStyles.rankPlayerName,
                    rankNameStyles[r.rank - 1] || mpStyles.rankName4
                  )}>
                    {r.playerName}
                    {isMe && <span className={mpStyles.rankYouTag}>(you)</span>}
                  </span>
                  <span className={mpStyles.rankScore}>
                    {r.score.toLocaleString()}
                  </span>
                </div>
              );
            })}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className={mpStyles.endActions}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={onLeave}
          className={cn(mpStyles.endActionBtn, mpStyles.endActionSecondary)}
        >
          Leave
        </button>
      </motion.div>
    </motion.div>
  );
}
