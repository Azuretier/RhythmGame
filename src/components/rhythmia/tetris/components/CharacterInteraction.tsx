'use client';

import React, { useMemo } from 'react';
import type { CharacterDefinition } from '@/lib/character-interaction/types';
import styles from './CharacterInteraction.module.css';

// ===== Character Marker (floating NPC on game field) =====

interface CharacterMarkerProps {
  character: CharacterDefinition;
  isSelected: boolean;
  isSpeaking: boolean;
  onInteract: (characterId: string) => void;
}

export function CharacterMarker({ character, isSelected, isSpeaking, onInteract }: CharacterMarkerProps) {
  return (
    <button
      className={`${styles.characterMarker} ${isSelected ? styles.selected : ''} ${isSpeaking ? styles.speaking : ''}`}
      style={{
        '--char-color': character.color,
        '--char-glow': character.glowColor,
      } as React.CSSProperties}
      onClick={() => onInteract(character.id)}
      title={`${character.name} (${character.role})`}
    >
      <span className={styles.characterIcon}>{character.icon}</span>
      <span className={styles.characterName}>{character.nameJa}</span>
      {isSpeaking && <span className={styles.speechIndicator}>...</span>}
    </button>
  );
}

// ===== Character Roster (list of available NPCs) =====

interface CharacterRosterProps {
  characters: CharacterDefinition[];
  selectedCharacterId: string | null;
  speakingCharacterId: string | null;
  onInteract: (characterId: string) => void;
}

export function CharacterRoster({
  characters,
  selectedCharacterId,
  speakingCharacterId,
  onInteract,
}: CharacterRosterProps) {
  if (characters.length === 0) return null;

  return (
    <div className={styles.characterRoster}>
      <div className={styles.rosterLabel}>ALLIES</div>
      <div className={styles.rosterList}>
        {characters.map(char => (
          <CharacterMarker
            key={char.id}
            character={char}
            isSelected={selectedCharacterId === char.id}
            isSpeaking={speakingCharacterId === char.id}
            onInteract={onInteract}
          />
        ))}
      </div>
    </div>
  );
}

// ===== Dialogue Box =====

interface DialogueBoxProps {
  speaker: string;
  speakerJa: string;
  text: string;
  textJa: string;
  characterIcon: string;
  characterColor: string;
  isVisible: boolean;
  onAdvance: () => void;
  onDismiss: () => void;
}

export function DialogueBox({
  speaker,
  speakerJa,
  text,
  textJa,
  characterIcon,
  characterColor,
  isVisible,
  onAdvance,
  onDismiss,
}: DialogueBoxProps) {
  if (!isVisible) return null;

  return (
    <div className={styles.dialogueOverlay} onClick={onAdvance}>
      <div
        className={styles.dialogueBox}
        style={{ '--dialogue-color': characterColor } as React.CSSProperties}
      >
        <div className={styles.dialogueSpeaker}>
          <span className={styles.dialogueSpeakerIcon}>{characterIcon}</span>
          <span className={styles.dialogueSpeakerName}>{speakerJa}</span>
          <span className={styles.dialogueSpeakerNameEn}>{speaker}</span>
        </div>
        <div className={styles.dialogueTextContainer}>
          <p className={styles.dialogueTextJa}>{textJa}</p>
          <p className={styles.dialogueTextEn}>{text}</p>
        </div>
        <div className={styles.dialogueActions}>
          <span className={styles.dialogueAdvanceHint}>Click to continue</span>
          <button className={styles.dialogueDismiss} onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDismiss(); }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Active Character Info Panel =====

interface CharacterInfoProps {
  character: CharacterDefinition | null;
}

export function CharacterInfo({ character }: CharacterInfoProps) {
  if (!character) return null;

  return (
    <div
      className={styles.characterInfo}
      style={{ '--char-color': character.color } as React.CSSProperties}
    >
      <span className={styles.infoIcon}>{character.icon}</span>
      <div className={styles.infoDetails}>
        <span className={styles.infoName}>{character.nameJa}</span>
        <span className={styles.infoRole}>{character.role.toUpperCase()}</span>
      </div>
    </div>
  );
}
