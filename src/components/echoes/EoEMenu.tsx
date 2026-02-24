'use client';

import { useState } from 'react';
import type { useEoESocket } from '@/hooks/useEoESocket';
import type { GameMode } from '@/types/echoes';
import { GAME_MODE_CONFIGS } from '@/lib/echoes/game-modes';
import styles from './EoEGame.module.css';

interface Props {
  socket: ReturnType<typeof useEoESocket>;
}

const gameModes: { mode: GameMode; available: boolean }[] = [
  { mode: 'story', available: true },
  { mode: 'co_op_dungeon', available: true },
  { mode: 'arena_pvp', available: true },
  { mode: 'rhythm_challenge', available: true },
  { mode: 'endless_dungeon', available: true },
  { mode: 'boss_rush', available: true },
  { mode: 'daily_challenge', available: true },
  { mode: 'ranked_5v5', available: true },
  { mode: 'battle_royale', available: true },
  { mode: 'creative', available: true },
];

export function EoEMenu({ socket }: Props) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  const handleCreateParty = (mode: GameMode) => {
    socket.createParty(mode);
  };

  const handleQuickPlay = (mode: GameMode) => {
    socket.queueForGame(mode);
  };

  const handleJoinParty = () => {
    if (joinCode.trim()) {
      socket.joinParty(joinCode.trim().toUpperCase());
      setShowJoinModal(false);
      setJoinCode('');
    }
  };

  return (
    <div className={styles.menu}>
      {/* Title */}
      <div className={styles.menuHeader}>
        <h1 className={styles.gameTitle}>ECHOES OF ETERNITY</h1>
        <p className={styles.gameSubtitle}>究極のアクションRPG</p>
      </div>

      {/* Game Mode Grid */}
      <div className={styles.modeGrid}>
        {gameModes.map(({ mode, available }) => {
          const config = GAME_MODE_CONFIGS[mode];
          return (
            <button
              key={mode}
              className={`${styles.modeCard} ${selectedMode === mode ? styles.modeCardSelected : ''} ${!available ? styles.modeCardLocked : ''}`}
              onClick={() => setSelectedMode(mode)}
              disabled={!available}
              style={{ '--mode-color': config.color } as React.CSSProperties}
            >
              <span className={styles.modeIcon}>{config.icon}</span>
              <span className={styles.modeName}>{config.name}</span>
              <span className={styles.modeNameJa}>{config.nameJa}</span>
              <span className={styles.modeDesc}>{config.description}</span>
              <span className={styles.modePlayers}>
                {config.minPlayers === config.maxPlayers
                  ? `${config.minPlayers}P`
                  : `${config.minPlayers}-${config.maxPlayers}P`}
              </span>
              {config.ranked && <span className={styles.rankedBadge}>Ranked</span>}
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      {selectedMode && (
        <div className={styles.menuActions}>
          <button className={styles.primaryButton} onClick={() => handleCreateParty(selectedMode)}>
            Create Party
          </button>
          <button className={styles.secondaryButton} onClick={() => handleQuickPlay(selectedMode)}>
            Quick Play
          </button>
          <button className={styles.secondaryButton} onClick={() => setShowJoinModal(true)}>
            Join Party
          </button>
        </div>
      )}

      {/* Bottom shortcuts */}
      <div className={styles.menuFooter}>
        <button className={styles.footerButton} onClick={socket.openGacha}>
          Gacha
        </button>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Join Party</h3>
            <input
              className={styles.codeInput}
              type="text"
              placeholder="Enter party code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={styles.primaryButton} onClick={handleJoinParty}>Join</button>
              <button className={styles.secondaryButton} onClick={() => setShowJoinModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
