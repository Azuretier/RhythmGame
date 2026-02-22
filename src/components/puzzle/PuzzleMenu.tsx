'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useProfile } from '@/lib/profile/context';
import type { PuzzleRoomState, PuzzlePublicRoom, PuzzleDifficulty } from '@/types/puzzle';
import styles from './PuzzleGame.module.css';

interface PuzzleMenuProps {
  phase: 'menu' | 'lobby';
  roomState: PuzzleRoomState | null;
  publicRooms: PuzzlePublicRoom[];
  playerId: string;
  connectionStatus: string;
  error: string | null;
  onConnect: () => void;
  onCreateRoom: (name: string, roomName?: string, difficulty?: PuzzleDifficulty) => void;
  onJoinRoom: (code: string, name: string) => void;
  onGetRooms: () => void;
  onSetReady: (ready: boolean) => void;
  onSetDifficulty: (difficulty: PuzzleDifficulty) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

const DIFFICULTIES: { key: PuzzleDifficulty; label: string; grid: string }[] = [
  { key: 'easy', label: 'Easy', grid: '3x4' },
  { key: 'medium', label: 'Medium', grid: '4x4' },
  { key: 'hard', label: 'Hard', grid: '5x4' },
  { key: 'expert', label: 'Expert', grid: '6x5' },
];

export default function PuzzleMenu({
  phase,
  roomState,
  publicRooms,
  playerId,
  connectionStatus,
  error,
  onConnect,
  onCreateRoom,
  onJoinRoom,
  onGetRooms,
  onSetReady,
  onSetDifficulty,
  onStartGame,
  onLeave,
}: PuzzleMenuProps) {
  const t = useTranslations('puzzle');
  const { profile } = useProfile();
  const [playerName, setPlayerName] = useState(profile?.name || '');
  const [joinCode, setJoinCode] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<PuzzleDifficulty>('medium');
  const [showRoomList, setShowRoomList] = useState(false);

  useEffect(() => {
    if (profile?.name) setPlayerName(profile.name);
  }, [profile?.name]);

  // Connect on mount if not connected
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      onConnect();
    }
  }, [connectionStatus, onConnect]);

  if (phase === 'lobby' && roomState) {
    const isHost = roomState.hostId === playerId;
    const myPlayer = roomState.players.find(p => p.id === playerId);
    const allReady = roomState.players.every(p => p.ready);
    const canStart = isHost && allReady && roomState.players.length >= 2;

    return (
      <div className={styles.menuContainer}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.subtitle}>{t('lobby')}</p>

        <div className={styles.roomInfo}>
          <div className={styles.roomCode}>
            {t('roomCode')}: <strong>{roomState.code}</strong>
          </div>
          <div className={styles.difficultyDisplay}>
            {t('difficulty')}: <strong>{t(`difficulty_${roomState.difficulty}`)}</strong>
          </div>
        </div>

        {isHost && (
          <div className={styles.difficultySelector}>
            {DIFFICULTIES.map(d => (
              <button
                key={d.key}
                className={`${styles.difficultyBtn} ${roomState.difficulty === d.key ? styles.difficultyActive : ''}`}
                onClick={() => onSetDifficulty(d.key)}
              >
                {t(`difficulty_${d.key}`)} ({d.grid})
              </button>
            ))}
          </div>
        )}

        <div className={styles.playerList}>
          <h3>{t('players')}</h3>
          {roomState.players.map(p => (
            <div key={p.id} className={`${styles.playerItem} ${p.ready ? styles.playerReady : ''}`}>
              <span>{p.name} {p.id === roomState.hostId ? '(Host)' : ''}</span>
              <span className={p.ready ? styles.readyBadge : styles.notReadyBadge}>
                {p.ready ? t('ready') : t('notReady')}
              </span>
            </div>
          ))}
          {roomState.players.length < roomState.maxPlayers && (
            <div className={styles.playerSlotEmpty}>{t('waitingForPlayer')}</div>
          )}
        </div>

        <div className={styles.lobbyActions}>
          <button
            className={`${styles.btn} ${myPlayer?.ready ? styles.btnSecondary : styles.btnPrimary}`}
            onClick={() => onSetReady(!myPlayer?.ready)}
          >
            {myPlayer?.ready ? t('unready') : t('ready')}
          </button>
          {canStart && (
            <motion.button
              className={`${styles.btn} ${styles.btnStart}`}
              onClick={onStartGame}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('startGame')}
            </motion.button>
          )}
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onLeave}>
            {t('leave')}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }

  // Menu phase
  return (
    <div className={styles.menuContainer}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.subtitle}>{t('subtitle')}</p>

      {connectionStatus !== 'connected' && (
        <div className={styles.connecting}>
          <div className={styles.spinner} />
          <p>{t('connecting')}</p>
        </div>
      )}

      {connectionStatus === 'connected' && (
        <>
          <div className={styles.nameInput}>
            <label>{t('playerName')}</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              placeholder={t('enterName')}
              className={styles.input}
            />
          </div>

          <div className={styles.difficultySelector}>
            <label>{t('difficulty')}</label>
            {DIFFICULTIES.map(d => (
              <button
                key={d.key}
                className={`${styles.difficultyBtn} ${selectedDifficulty === d.key ? styles.difficultyActive : ''}`}
                onClick={() => setSelectedDifficulty(d.key)}
              >
                {t(`difficulty_${d.key}`)} ({d.grid})
              </button>
            ))}
          </div>

          <div className={styles.menuActions}>
            <motion.button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => playerName.trim() && onCreateRoom(playerName.trim(), undefined, selectedDifficulty)}
              disabled={!playerName.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('createRoom')}
            </motion.button>

            <div className={styles.joinSection}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={5}
                placeholder={t('enterCode')}
                className={styles.input}
              />
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => playerName.trim() && joinCode.trim() && onJoinRoom(joinCode.trim(), playerName.trim())}
                disabled={!playerName.trim() || !joinCode.trim()}
              >
                {t('joinRoom')}
              </button>
            </div>

            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => {
                onGetRooms();
                setShowRoomList(!showRoomList);
              }}
            >
              {t('browseRooms')}
            </button>
          </div>

          {showRoomList && (
            <div className={styles.roomList}>
              <h3>{t('publicRooms')}</h3>
              {publicRooms.length === 0 ? (
                <p className={styles.noRooms}>{t('noRooms')}</p>
              ) : (
                publicRooms.map(room => (
                  <div key={room.code} className={styles.roomItem}>
                    <div>
                      <strong>{room.name}</strong>
                      <span className={styles.roomDifficulty}>{t(`difficulty_${room.difficulty}`)}</span>
                    </div>
                    <div className={styles.roomMeta}>
                      {room.playerCount}/{room.maxPlayers}
                      <button
                        className={`${styles.btn} ${styles.btnSmall}`}
                        onClick={() => playerName.trim() && onJoinRoom(room.code, playerName.trim())}
                        disabled={!playerName.trim()}
                      >
                        {t('join')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </>
      )}
    </div>
  );
}
