'use client';

import { useState } from 'react';
import type { useEoESocket } from '@/hooks/useEoESocket';
import { getAllCharacters } from '@/lib/echoes/characters';
import { ELEMENT_COLORS, ELEMENT_NAMES_JA } from '@/lib/echoes/elements';
import styles from './EoEGame.module.css';

interface Props {
  socket: ReturnType<typeof useEoESocket>;
}

export function EoELobby({ socket }: Props) {
  const { party, partyCode } = socket;
  const characters = getAllCharacters();
  const [selectedCharId, setSelectedCharId] = useState<string>('');

  if (!party) return null;

  const handleSelectCharacter = (charId: string) => {
    setSelectedCharId(charId);
    socket.selectCharacter(charId);
  };

  const isHost = party.members.some((m) => m.role === 'leader' && m.playerId === socket.playerId);

  return (
    <div className={styles.lobby}>
      {/* Room Info */}
      <div className={styles.lobbyHeader}>
        <h2>Party Lobby</h2>
        <div className={styles.roomCode}>
          Code: <span className={styles.codeHighlight}>{partyCode}</span>
        </div>
        <p className={styles.lobbyMode}>{party.currentActivity}</p>
      </div>

      {/* Player List */}
      <div className={styles.playerList}>
        <h3>Players ({party.members.length}/{party.maxSize})</h3>
        {party.members.map((member) => (
          <div
            key={member.playerId}
            className={`${styles.playerCard} ${member.isReady ? styles.playerReady : ''}`}
          >
            <div className={styles.playerInfo}>
              <span className={styles.playerName}>
                {member.role === 'leader' && '👑 '}
                {member.playerName || 'Player'}
              </span>
              {member.character && (
                <span
                  className={styles.playerCharacter}
                  style={{ color: ELEMENT_COLORS[member.character.currentElement] }}
                >
                  Lv.{member.character.level} {member.character.definitionId}
                </span>
              )}
            </div>
            <span className={member.isReady ? styles.readyBadge : styles.notReadyBadge}>
              {member.isReady ? 'Ready' : 'Not Ready'}
            </span>
          </div>
        ))}
      </div>

      {/* Character Selection */}
      <div className={styles.characterGrid}>
        <h3>Select Character</h3>
        <div className={styles.charList}>
          {characters.map((char) => {
            const isSelected = selectedCharId === char.id;
            const isTaken = party.members.some(
              (m) => m.playerId !== socket.playerId && m.character?.definitionId === char.id
            );

            return (
              <button
                key={char.id}
                className={`${styles.charCard} ${isSelected ? styles.charCardSelected : ''} ${isTaken ? styles.charCardTaken : ''}`}
                onClick={() => !isTaken && handleSelectCharacter(char.id)}
                disabled={isTaken}
                style={{ '--char-color': ELEMENT_COLORS[char.element] } as React.CSSProperties}
              >
                <div className={styles.charRarity}>
                  {'★'.repeat(char.rarity)}
                </div>
                <div className={styles.charName}>{char.name}</div>
                <div className={styles.charNameJa}>{char.nameJa}</div>
                <div className={styles.charElement}>
                  {ELEMENT_NAMES_JA[char.element]}
                </div>
                <div className={styles.charRole}>{char.role.toUpperCase()}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.lobbyActions}>
        <button
          className={socket.party?.members.find((m) => m.playerId === socket.playerId)?.isReady ? styles.readyButtonActive : styles.readyButton}
          onClick={() => {
            const me = party.members.find((m) => m.playerId === socket.playerId);
            socket.setReady(!me?.isReady);
          }}
        >
          {socket.party?.members.find((m) => m.playerId === socket.playerId)?.isReady ? 'Unready' : 'Ready'}
        </button>
        {isHost && (
          <button
            className={styles.startButton}
            onClick={socket.startGame}
            disabled={!party.members.every((m) => m.isReady)}
          >
            Start Game
          </button>
        )}
        <button className={styles.leaveButton} onClick={socket.leaveParty}>
          Leave
        </button>
      </div>
    </div>
  );
}
