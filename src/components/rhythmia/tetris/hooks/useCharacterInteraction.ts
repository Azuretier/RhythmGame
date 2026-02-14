import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  CharacterDefinition,
  CharacterState,
  DialogueSequence,
  DialogueTrigger,
} from '@/lib/character-interaction/types';
import { getCharactersForWorld } from '@/lib/character-interaction/characters';
import { DIALOGUE_LINE_DURATION, CHARACTER_APPEAR_DELAY } from '@/lib/character-interaction/constants';

export interface CharacterInteractionState {
  /** Active characters in the current world */
  activeCharacters: CharacterDefinition[];
  /** State for each active character */
  characterStates: Map<string, CharacterState>;
  /** Currently speaking character (only one at a time) */
  speakingCharacterId: string | null;
  /** Current dialogue text being displayed */
  currentDialogueText: string;
  currentDialogueTextJa: string;
  currentSpeaker: string;
  currentSpeakerJa: string;
  /** Whether dialogue UI is visible */
  isDialogueVisible: boolean;
  /** Selected character for skill loadout */
  selectedCharacterId: string | null;
}

export function useCharacterInteraction() {
  const [activeCharacters, setActiveCharacters] = useState<CharacterDefinition[]>([]);
  const [characterStates, setCharacterStates] = useState<Map<string, CharacterState>>(new Map());
  const [speakingCharacterId, setSpeakingCharacterId] = useState<string | null>(null);
  const [currentDialogueText, setCurrentDialogueText] = useState('');
  const [currentDialogueTextJa, setCurrentDialogueTextJa] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState('');
  const [currentSpeakerJa, setCurrentSpeakerJa] = useState('');
  const [isDialogueVisible, setIsDialogueVisible] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const dialogueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenDialoguesRef = useRef<Set<string>>(new Set());

  /** Initialize characters for a given world */
  const initCharactersForWorld = useCallback((worldIdx: number) => {
    const chars = getCharactersForWorld(worldIdx);
    setActiveCharacters(chars);

    const states = new Map<string, CharacterState>();
    for (const char of chars) {
      states.set(char.id, {
        characterId: char.id,
        isVisible: true,
        isInRange: false,
        activeDialogueId: null,
        currentLineIndex: 0,
        seenDialogues: seenDialoguesRef.current,
        isInteracting: false,
      });
    }
    setCharacterStates(states);

    // Auto-select first character for skill loadout if none selected
    if (!selectedCharacterId && chars.length > 0) {
      setSelectedCharacterId(chars[0].id);
    }
  }, [selectedCharacterId]);

  /** Find and trigger a matching dialogue */
  const findMatchingDialogue = useCallback((
    character: CharacterDefinition,
    trigger: DialogueTrigger,
  ): DialogueSequence | null => {
    const matching = character.dialogues
      .filter(d => {
        // Check trigger type match
        if (d.trigger.type !== trigger.type) return false;

        // Check specific trigger params
        if (d.trigger.type === 'world_enter' && trigger.type === 'world_enter') {
          if (d.trigger.worldIdx !== trigger.worldIdx) return false;
        }
        if (d.trigger.type === 'stage_start' && trigger.type === 'stage_start') {
          if (d.trigger.stageNumber !== trigger.stageNumber) return false;
        }
        if (d.trigger.type === 'health_low' && trigger.type === 'health_low') {
          // Threshold is checked externally
        }

        // Check if already seen and not repeatable
        if (!d.repeatable && seenDialoguesRef.current.has(d.id)) return false;

        return true;
      })
      .sort((a, b) => b.priority - a.priority);

    return matching[0] || null;
  }, []);

  /** Play a dialogue sequence */
  const playDialogue = useCallback((character: CharacterDefinition, dialogue: DialogueSequence) => {
    // Clear any existing timer
    if (dialogueTimerRef.current) {
      clearTimeout(dialogueTimerRef.current);
    }

    setSpeakingCharacterId(character.id);
    seenDialoguesRef.current.add(dialogue.id);

    // Update character state
    setCharacterStates(prev => {
      const next = new Map(prev);
      const state = next.get(character.id);
      if (state) {
        next.set(character.id, {
          ...state,
          activeDialogueId: dialogue.id,
          currentLineIndex: 0,
          isInteracting: true,
        });
      }
      return next;
    });

    // Show first line
    const firstLine = dialogue.lines[0];
    setCurrentSpeaker(firstLine.speaker);
    setCurrentSpeakerJa(firstLine.speakerJa);
    setCurrentDialogueText(firstLine.text);
    setCurrentDialogueTextJa(firstLine.textJa);
    setIsDialogueVisible(true);

    // Auto-advance through remaining lines
    let lineIdx = 0;
    const advanceLine = () => {
      lineIdx++;
      if (lineIdx < dialogue.lines.length) {
        const line = dialogue.lines[lineIdx];
        setCurrentSpeaker(line.speaker);
        setCurrentSpeakerJa(line.speakerJa);
        setCurrentDialogueText(line.text);
        setCurrentDialogueTextJa(line.textJa);

        setCharacterStates(prev => {
          const next = new Map(prev);
          const state = next.get(character.id);
          if (state) {
            next.set(character.id, { ...state, currentLineIndex: lineIdx });
          }
          return next;
        });

        dialogueTimerRef.current = setTimeout(advanceLine, DIALOGUE_LINE_DURATION);
      } else {
        // Dialogue complete
        dismissDialogue();
      }
    };

    dialogueTimerRef.current = setTimeout(advanceLine, DIALOGUE_LINE_DURATION);
  }, []);

  /** Dismiss current dialogue */
  const dismissDialogue = useCallback(() => {
    if (dialogueTimerRef.current) {
      clearTimeout(dialogueTimerRef.current);
      dialogueTimerRef.current = null;
    }
    setSpeakingCharacterId(null);
    setIsDialogueVisible(false);
    setCurrentDialogueText('');
    setCurrentDialogueTextJa('');
    setCurrentSpeaker('');
    setCurrentSpeakerJa('');

    setCharacterStates(prev => {
      const next = new Map(prev);
      for (const [id, state] of next) {
        if (state.isInteracting) {
          next.set(id, { ...state, isInteracting: false, activeDialogueId: null });
        }
      }
      return next;
    });
  }, []);

  /** Advance to next dialogue line (manual advance on click) */
  const advanceDialogue = useCallback(() => {
    if (!speakingCharacterId) return;

    const state = characterStates.get(speakingCharacterId);
    if (!state || !state.activeDialogueId) return;

    const character = activeCharacters.find(c => c.id === speakingCharacterId);
    if (!character) return;

    const dialogue = character.dialogues.find(d => d.id === state.activeDialogueId);
    if (!dialogue) return;

    const nextIdx = state.currentLineIndex + 1;
    if (nextIdx < dialogue.lines.length) {
      // Clear auto-advance timer and show next line
      if (dialogueTimerRef.current) {
        clearTimeout(dialogueTimerRef.current);
      }

      const line = dialogue.lines[nextIdx];
      setCurrentSpeaker(line.speaker);
      setCurrentSpeakerJa(line.speakerJa);
      setCurrentDialogueText(line.text);
      setCurrentDialogueTextJa(line.textJa);

      setCharacterStates(prev => {
        const next = new Map(prev);
        next.set(speakingCharacterId, { ...state, currentLineIndex: nextIdx });
        return next;
      });

      dialogueTimerRef.current = setTimeout(() => {
        // Auto-advance from this line
        advanceDialogue();
      }, DIALOGUE_LINE_DURATION);
    } else {
      dismissDialogue();
    }
  }, [speakingCharacterId, characterStates, activeCharacters, dismissDialogue]);

  /** Trigger event — checks all active characters for matching dialogues */
  const triggerEvent = useCallback((trigger: DialogueTrigger) => {
    // Don't interrupt existing dialogue
    if (speakingCharacterId) return;

    for (const char of activeCharacters) {
      const dialogue = findMatchingDialogue(char, trigger);
      if (dialogue) {
        setTimeout(() => {
          playDialogue(char, dialogue);
        }, CHARACTER_APPEAR_DELAY);
        break;  // Only one dialogue at a time
      }
    }
  }, [speakingCharacterId, activeCharacters, findMatchingDialogue, playDialogue]);

  /** Player interacts with a specific character */
  const interactWithCharacter = useCallback((characterId: string) => {
    const character = activeCharacters.find(c => c.id === characterId);
    if (!character) return;

    // Select this character for skill loadout
    setSelectedCharacterId(characterId);

    // Find interact dialogue
    const dialogue = findMatchingDialogue(character, { type: 'interact' });
    if (dialogue) {
      playDialogue(character, dialogue);
    }
  }, [activeCharacters, findMatchingDialogue, playDialogue]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dialogueTimerRef.current) {
        clearTimeout(dialogueTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    activeCharacters,
    characterStates,
    speakingCharacterId,
    currentDialogueText,
    currentDialogueTextJa,
    currentSpeaker,
    currentSpeakerJa,
    isDialogueVisible,
    selectedCharacterId,

    // Actions
    initCharactersForWorld,
    triggerEvent,
    interactWithCharacter,
    advanceDialogue,
    dismissDialogue,
    setSelectedCharacterId,
  };
}
