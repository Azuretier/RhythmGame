'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEoESocket, type EoEPhase } from '@/hooks/useEoESocket';
import { EoEMenu } from './EoEMenu';
import { EoELobby } from './EoELobby';
import { EoEBattle } from './EoEBattle';
import { EoERhythm } from './EoERhythm';
import { EoEResults } from './EoEResults';
import { EoECharacterSelect } from './EoECharacterSelect';
import { EoEGacha } from './EoEGacha';
import { EoEHUD } from './EoEHUD';
import styles from './EoEGame.module.css';

export default function EoEGame() {
  const socket = useEoESocket();
  const [isConnecting, setIsConnecting] = useState(false);

  // Auto-connect on mount
  useEffect(() => {
    if (socket.connectionStatus === 'disconnected' && !isConnecting) {
      setIsConnecting(true);
      socket.connect();
    }
  }, [socket.connectionStatus, isConnecting]);

  useEffect(() => {
    if (socket.connectionStatus === 'connected') {
      setIsConnecting(false);
    }
  }, [socket.connectionStatus]);

  const renderPhase = () => {
    switch (socket.phase) {
      case 'menu':
        return <EoEMenu socket={socket} />;
      case 'lobby':
        return <EoELobby socket={socket} />;
      case 'character_select':
        return <EoECharacterSelect socket={socket} />;
      case 'queue':
        return (
          <div className={styles.queueScreen}>
            <div className={styles.queueSpinner} />
            <h2 className={styles.queueTitle}>
              {socket.queueGameMode ? `Searching for ${socket.queueGameMode} match...` : 'In queue...'}
            </h2>
            <p className={styles.queuePosition}>Position: {socket.queuePosition}</p>
            <button className={styles.cancelButton} onClick={socket.dequeue}>Cancel</button>
          </div>
        );
      case 'loading':
        return (
          <div className={styles.loadingScreen}>
            <div className={styles.loadingBar} />
            <p>Loading game...</p>
          </div>
        );
      case 'battle':
        return <EoEBattle socket={socket} />;
      case 'rhythm':
        return <EoERhythm socket={socket} />;
      case 'results':
        return <EoEResults socket={socket} />;
      case 'gacha':
        return <EoEGacha socket={socket} />;
      case 'dungeon':
      case 'battle_royale':
      case 'moba':
      case 'creative':
      case 'exploration':
        return (
          <div className={styles.comingSoon}>
            <h2>
              {socket.phase === 'dungeon' && 'Dungeon Mode'}
              {socket.phase === 'battle_royale' && 'Battle Royale Mode'}
              {socket.phase === 'moba' && 'Ranked 5v5 Mode'}
              {socket.phase === 'creative' && 'Creative Mode'}
              {socket.phase === 'exploration' && 'Exploration Mode'}
            </h2>
            <p>Coming soon — full implementation in progress</p>
            <button className={styles.backButton} onClick={socket.goToMenu}>
              Back to Menu
            </button>
          </div>
        );
      default:
        return <EoEMenu socket={socket} />;
    }
  };

  return (
    <div className={styles.gameContainer}>
      {/* Connection status indicator */}
      {socket.connectionStatus !== 'connected' && (
        <div className={styles.connectionBanner}>
          {socket.connectionStatus === 'connecting' && 'Connecting...'}
          {socket.connectionStatus === 'reconnecting' && 'Reconnecting...'}
          {socket.connectionStatus === 'error' && `Error: ${socket.error || 'Connection failed'}`}
          {socket.connectionStatus === 'disconnected' && 'Disconnected'}
        </div>
      )}

      {/* Error display */}
      {socket.error && socket.connectionStatus === 'connected' && (
        <div className={styles.errorBanner}>
          {socket.error}
        </div>
      )}

      {/* HUD overlay (during gameplay) */}
      {['battle', 'rhythm', 'dungeon', 'battle_royale', 'moba'].includes(socket.phase) && (
        <EoEHUD socket={socket} />
      )}

      {/* Level up notification */}
      {socket.levelUp && (
        <div className={styles.levelUpNotification}>
          <h3>Level Up!</h3>
          <p>Level {socket.levelUp.level}</p>
          {socket.levelUp.unlockedFeatures.length > 0 && (
            <ul>
              {socket.levelUp.unlockedFeatures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Achievement notification */}
      {socket.achievementUnlocked && (
        <div className={styles.achievementNotification}>
          <h3>Achievement Unlocked!</h3>
          <p>{socket.achievementUnlocked.name}</p>
          <p className={styles.achievementJa}>{socket.achievementUnlocked.nameJa}</p>
        </div>
      )}

      {/* Main content */}
      <main className={styles.mainContent}>
        {renderPhase()}
      </main>
    </div>
  );
}
