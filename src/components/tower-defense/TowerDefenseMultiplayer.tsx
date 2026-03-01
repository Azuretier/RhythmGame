'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Crown, Users, Loader2, Wifi, WifiOff,
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
      className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {status === 'connecting' ? (
        <>
          <Loader2 size={48} className="text-cyan-400 animate-spin mb-4" />
          <p className="text-lg font-semibold">Connecting to server...</p>
        </>
      ) : (
        <>
          <WifiOff size={48} className="text-slate-500 mb-4" />
          <p className="text-lg font-semibold mb-4">Connection lost</p>
          <button
            onClick={onRetry}
            className={cn(
              'px-6 py-2.5 rounded-xl font-semibold text-sm',
              'bg-cyan-600 hover:bg-cyan-500 transition-colors'
            )}
          >
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
      className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Wifi size={20} className="text-green-400 mb-2" />
      <h1 className="text-3xl font-bold mb-1">Tower Defense</h1>
      <p className="text-slate-400 text-sm mb-8">Multiplayer</p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Create room */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Swords size={14} className="text-cyan-400" />
            Create Room
          </h2>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedMap(0)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                selectedMap === 0
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
              )}
            >
              Map 1
            </button>
            <button
              onClick={() => setSelectedMap(1)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                selectedMap === 1
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                  : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
              )}
            >
              Map 2
            </button>
          </div>
          <button
            onClick={() => onCreateRoom(playerName, selectedMap)}
            className={cn(
              'w-full py-2.5 rounded-xl font-semibold text-sm transition-colors',
              'bg-cyan-600 hover:bg-cyan-500'
            )}
          >
            Create Room
          </button>
        </div>

        {/* Join room */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Users size={14} className="text-amber-400" />
            Join Room
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={6}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-mono',
                'bg-slate-800 border border-slate-600/50',
                'text-slate-200 placeholder:text-slate-600',
                'focus:outline-none focus:border-cyan-500/50'
              )}
            />
            <button
              onClick={() => joinCode && onJoinRoom(joinCode, playerName)}
              disabled={!joinCode}
              className={cn(
                'px-5 py-2 rounded-lg font-semibold text-sm transition-colors',
                joinCode
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              )}
            >
              Join
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-center text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
            {error}
          </div>
        )}

        {/* Back */}
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors mt-2"
        >
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
      className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Room Code</p>
      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center gap-2 text-4xl font-mono font-bold mb-6 px-4 py-2 rounded-xl',
          'bg-slate-900/80 border border-slate-700/50 hover:border-cyan-500/40 transition-colors'
        )}
      >
        <span className="text-cyan-400 tracking-widest">{state.roomCode}</span>
        {copied ? (
          <Check size={20} className="text-green-400" />
        ) : (
          <Copy size={20} className="text-slate-500" />
        )}
      </button>

      {/* Player list */}
      <div className="w-full max-w-sm bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 mb-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Players ({state.players.length}/4)
        </h3>
        <div className="flex flex-col gap-2">
          {state.players.map(p => (
            <div
              key={p.playerId}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg',
                'bg-slate-800/60 border',
                p.ready ? 'border-green-500/30' : 'border-transparent'
              )}
            >
              {state.isHost && p.playerId === state.playerId && (
                <Crown size={14} className="text-amber-400 flex-shrink-0" />
              )}
              {!state.isHost && p.playerId === state.players.find(x => state.roomCode)?.playerId && null}
              <span className="text-sm font-medium flex-1 truncate">{p.playerName}</span>
              {p.playerId === state.playerId && (
                <span className="text-[10px] text-slate-500 font-medium">YOU</span>
              )}
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                  p.ready
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-700/50 text-slate-500'
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
        <div className="text-center text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3 mb-4 max-w-sm w-full">
          {state.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={onLeave}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
            'border border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          )}
        >
          <LogOut size={14} />
          Leave
        </button>

        <button
          onClick={() => onSetReady(!isReady)}
          className={cn(
            'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors',
            isReady
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'bg-green-600 hover:bg-green-500 text-white'
          )}
        >
          {isReady ? 'Cancel Ready' : 'Ready Up'}
        </button>

        {state.isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className={cn(
              'px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors',
              canStart
                ? 'bg-cyan-600 hover:bg-cyan-500'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
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
      className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        key={countdown}
        className="text-8xl font-bold text-cyan-400 mb-8"
        initial={{ scale: 2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {countdown > 0 ? countdown : 'GO!'}
      </motion.div>
      <div className="flex gap-4">
        {players.map(p => (
          <div
            key={p.playerId}
            className="text-sm font-medium text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg"
          >
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

  const rankIcons = [
    <Trophy key="1" size={32} className="text-amber-400" />,
    <Medal key="2" size={28} className="text-slate-300" />,
    <Medal key="3" size={24} className="text-amber-600" />,
    <Shield key="4" size={22} className="text-slate-500" />,
  ];

  const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-600', 'text-slate-500'];

  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="text-center mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {isWinner ? (
          <>
            <Trophy size={56} className="text-amber-400 mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-amber-400">Victory!</h2>
          </>
        ) : (
          <>
            <Shield size={56} className="text-slate-400 mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-slate-300">Game Over</h2>
          </>
        )}
      </motion.div>

      {/* Rankings */}
      <motion.div
        className="w-full max-w-md bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
          Rankings
        </h3>
        <div className="flex flex-col gap-2">
          {state.rankings
            .sort((a, b) => a.rank - b.rank)
            .map(r => {
              const isMe = r.playerId === state.playerId;
              return (
                <div
                  key={r.playerId}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    isMe ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-slate-800/60'
                  )}
                >
                  <div className="flex-shrink-0 w-8 flex items-center justify-center">
                    {rankIcons[r.rank - 1] || (
                      <span className="text-sm font-bold text-slate-500">#{r.rank}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold flex-1',
                      rankColors[r.rank - 1] || 'text-slate-400'
                    )}
                  >
                    {r.playerName}
                    {isMe && <span className="text-[10px] text-slate-500 ml-1.5">(you)</span>}
                  </span>
                  <span className="text-sm font-mono text-slate-400 tabular-nums">
                    {r.score.toLocaleString()}
                  </span>
                </div>
              );
            })}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex gap-3"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={onLeave}
          className={cn(
            'px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors',
            'border border-slate-700/50 text-slate-300 hover:bg-slate-800'
          )}
        >
          Leave
        </button>
      </motion.div>
    </motion.div>
  );
}
