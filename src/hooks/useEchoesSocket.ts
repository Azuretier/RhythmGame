'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  EchoesClientMessage,
  EchoesServerMessage,
  EchoesConnectionStatus,
  GameMode,
  Party,
  BattleState,
  RhythmSequence,
  RhythmResult,
  DamageInstance,
  ElementalReactionType,
  ComboChain,
  StatusEffect,
  DungeonDefinition,
  DungeonReward,
  BattleEndStats,
  DungeonStats,
  BattleRoyaleState,
  MobaState,
  MobaEndStats,
  BuildingState,
  GachaPullResult,
  PlayerGachaState,
  PlayerRank,
  BattlePassReward,
  SeasonMission,
  Position2D,
  LootEntry,
  CharacterInstance,
} from '@/types/echoes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EchoesPhase =
  | 'menu'
  | 'lobby'
  | 'character_select'
  | 'queue'
  | 'loading'
  | 'battle'
  | 'rhythm'
  | 'exploration'
  | 'dungeon'
  | 'battle_royale'
  | 'moba'
  | 'creative'
  | 'gacha'
  | 'results'
  | 'ended';

interface BattleEndEvent {
  result: 'victory' | 'defeat' | 'draw';
  rewards: DungeonReward;
  stats: BattleEndStats;
}

const MAX_RECONNECT_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEchoesSocket() {
  // Connection
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<EchoesConnectionStatus>('disconnected');
  const playerIdRef = useRef<string>('');
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMessagesRef = useRef<EchoesClientMessage[]>([]);

  // Phase state
  const [phase, setPhase] = useState<EchoesPhase>('menu');
  const [error, setError] = useState<string | null>(null);

  // Party state
  const [party, setParty] = useState<Party | null>(null);
  const [partyCode, setPartyCode] = useState<string>('');

  // Queue state
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueGameMode, setQueueGameMode] = useState<GameMode | null>(null);

  // Battle state
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [rhythmSequence, setRhythmSequence] = useState<RhythmSequence | null>(null);
  const [activeSkillId, setActiveSkillId] = useState<string>('');
  const [comboChain, setComboChain] = useState<ComboChain | null>(null);
  const [battleEnd, setBattleEnd] = useState<BattleEndEvent | null>(null);

  // Damage feed (for battle log / visual effects)
  const [lastDamage, setLastDamage] = useState<DamageInstance | null>(null);
  const [lastReaction, setLastReaction] = useState<{ type: ElementalReactionType; damage: number; position: Position2D } | null>(null);

  // Dungeon state
  const [dungeon, setDungeon] = useState<DungeonDefinition | null>(null);
  const [dungeonFloor, setDungeonFloor] = useState(0);

  // Battle Royale state
  const [brState, setBrState] = useState<BattleRoyaleState | null>(null);

  // MOBA state
  const [mobaState, setMobaState] = useState<MobaState | null>(null);

  // Building state
  const [buildingState, setBuildingState] = useState<BuildingState | null>(null);

  // Gacha state
  const [gachaResults, setGachaResults] = useState<GachaPullResult[]>([]);
  const [gachaState, setGachaState] = useState<PlayerGachaState | null>(null);

  // Progression events
  const [levelUp, setLevelUp] = useState<{ level: number; unlockedFeatures: string[] } | null>(null);
  const [rankChange, setRankChange] = useState<{ oldRank: PlayerRank; newRank: PlayerRank; pointChange: number } | null>(null);
  const [achievementUnlocked, setAchievementUnlocked] = useState<{ id: string; name: string; nameJa: string } | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ playerId: string; playerName: string; message: string }[]>([]);
  const [emotes, setEmotes] = useState<{ playerId: string; emoteId: string }[]>([]);

  // =========================================================================
  // Connection Management
  // =========================================================================

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        setError(null);

        // Send pending messages
        for (const msg of pendingMessagesRef.current) {
          ws.send(JSON.stringify(msg));
        }
        pendingMessagesRef.current = [];
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        attemptReconnect();
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        setError('Connection error');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as EchoesServerMessage | { type: string; playerId?: string };

          // Handle system messages
          if ('playerId' in message && message.type === 'welcome') {
            playerIdRef.current = message.playerId as string;
            return;
          }

          handleServerMessage(message as EchoesServerMessage);
        } catch {
          // Ignore parse errors
        }
      };
    } catch {
      setConnectionStatus('error');
      attemptReconnect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError('Failed to reconnect after multiple attempts');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 16000);
    reconnectAttemptsRef.current++;
    setConnectionStatus('reconnecting');

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  // =========================================================================
  // Message Sending
  // =========================================================================

  const sendMessage = useCallback((message: EchoesClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      pendingMessagesRef.current.push(message);
    }
  }, []);

  // =========================================================================
  // Server Message Handler
  // =========================================================================

  const handleServerMessage = useCallback((message: EchoesServerMessage) => {
    switch (message.type) {
      // Party
      case 'eoe_party_created':
        setPartyCode(message.partyCode);
        setParty(message.party);
        setPhase('lobby');
        break;
      case 'eoe_party_joined':
        setParty(message.party);
        setPhase('lobby');
        break;
      case 'eoe_party_updated':
        setParty(message.party);
        break;
      case 'eoe_party_left':
        setParty(null);
        setPartyCode('');
        setPhase('menu');
        break;

      // Queue
      case 'eoe_queue_status':
        setQueuePosition(message.position);
        setQueueGameMode(message.gameMode);
        setPhase('queue');
        break;
      case 'eoe_match_found':
        setPhase('loading');
        break;
      case 'eoe_game_starting':
        // Countdown handled by UI
        break;

      // Battle
      case 'eoe_battle_state':
        setBattleState(message.state);
        if (phase !== 'battle') setPhase('battle');
        break;
      case 'eoe_rhythm_start':
        setRhythmSequence(message.sequence);
        setActiveSkillId(message.skillId);
        setPhase('rhythm');
        break;
      case 'eoe_damage_dealt':
        setLastDamage(message.damage);
        break;
      case 'eoe_reaction_triggered':
        setLastReaction({ type: message.reaction, damage: message.damage, position: message.position });
        break;
      case 'eoe_combo_update':
        setComboChain(message.combo);
        break;
      case 'eoe_battle_end':
        setBattleEnd({ result: message.result, rewards: message.rewards, stats: message.stats });
        setPhase('results');
        break;
      case 'eoe_status_effect':
        // Handled via battleState update
        break;
      case 'eoe_turn_start':
        // UI uses this to highlight current actor
        break;

      // Dungeon
      case 'eoe_dungeon_entered':
        setDungeon(message.dungeon);
        setDungeonFloor(message.floor);
        setPhase('dungeon');
        break;
      case 'eoe_dungeon_complete':
        setBattleEnd({
          result: 'victory',
          rewards: message.rewards,
          stats: message.stats as unknown as BattleEndStats,
        });
        setPhase('results');
        break;

      // Battle Royale
      case 'eoe_br_state':
        setBrState(message.state);
        if (phase !== 'battle_royale') setPhase('battle_royale');
        break;
      case 'eoe_br_result':
        setPhase('results');
        break;

      // MOBA
      case 'eoe_moba_state':
        setMobaState(message.state);
        if (phase !== 'moba') setPhase('moba');
        break;
      case 'eoe_moba_result':
        setPhase('results');
        break;

      // Building
      case 'eoe_building_state':
        setBuildingState(message.state);
        if (phase !== 'creative') setPhase('creative');
        break;

      // Gacha
      case 'eoe_gacha_result':
        setGachaResults(message.results);
        setPhase('gacha');
        break;
      case 'eoe_gacha_state':
        setGachaState(message.state);
        break;

      // Progression
      case 'eoe_level_up':
        setLevelUp({ level: message.level, unlockedFeatures: message.unlockedFeatures });
        break;
      case 'eoe_rank_change':
        setRankChange({ oldRank: message.oldRank, newRank: message.newRank, pointChange: message.pointChange });
        break;
      case 'eoe_achievement_unlocked':
        setAchievementUnlocked({ id: message.achievementId, name: message.name, nameJa: message.nameJa });
        break;

      // Social
      case 'eoe_player_emote':
        setEmotes((prev) => [...prev.slice(-20), { playerId: message.playerId, emoteId: message.emoteId }]);
        break;
      case 'eoe_chat_message':
        setChatMessages((prev) => [...prev.slice(-50), {
          playerId: message.playerId,
          playerName: message.playerName,
          message: message.message,
        }]);
        break;

      // Error
      case 'eoe_error':
        setError(message.message);
        break;
    }
  }, [phase]);

  // =========================================================================
  // Player Actions (public API)
  // =========================================================================

  // --- Party ---
  const createParty = useCallback((gameMode: GameMode, maxSize: number = 4) => {
    sendMessage({ type: 'eoe_create_party', gameMode, maxSize });
  }, [sendMessage]);

  const joinParty = useCallback((code: string) => {
    sendMessage({ type: 'eoe_join_party', partyCode: code });
  }, [sendMessage]);

  const leaveParty = useCallback(() => {
    sendMessage({ type: 'eoe_leave_party' });
    setParty(null);
    setPhase('menu');
  }, [sendMessage]);

  const setReady = useCallback((ready: boolean) => {
    sendMessage({ type: 'eoe_set_ready', ready });
  }, [sendMessage]);

  const selectCharacter = useCallback((characterId: string) => {
    sendMessage({ type: 'eoe_select_character', characterId });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    sendMessage({ type: 'eoe_start_game' });
  }, [sendMessage]);

  // --- Queue ---
  const queueForGame = useCallback((gameMode: GameMode) => {
    sendMessage({ type: 'eoe_queue', gameMode });
    setPhase('queue');
  }, [sendMessage]);

  const dequeue = useCallback(() => {
    sendMessage({ type: 'eoe_dequeue' });
    setPhase('menu');
  }, [sendMessage]);

  // --- Combat ---
  const submitRhythmResult = useCallback((result: RhythmResult) => {
    sendMessage({ type: 'eoe_rhythm_result', result });
    setPhase('battle');
  }, [sendMessage]);

  const selectAction = useCallback((skillId: string, targetId: string) => {
    sendMessage({ type: 'eoe_select_action', skillId, targetId });
  }, [sendMessage]);

  const useItem = useCallback((itemId: string, targetId?: string) => {
    sendMessage({ type: 'eoe_use_item', itemId, targetId });
  }, [sendMessage]);

  const endTurn = useCallback(() => {
    sendMessage({ type: 'eoe_end_turn' });
  }, [sendMessage]);

  // --- Exploration ---
  const move = useCallback((position: Position2D) => {
    sendMessage({ type: 'eoe_move', position });
  }, [sendMessage]);

  const interact = useCallback((targetId: string) => {
    sendMessage({ type: 'eoe_interact', targetId });
  }, [sendMessage]);

  const enterDungeon = useCallback((dungeonId: string, difficulty: 'normal' | 'hard' | 'expert' | 'nightmare' | 'abyss') => {
    sendMessage({ type: 'eoe_enter_dungeon', dungeonId, difficulty });
  }, [sendMessage]);

  // --- Building ---
  const placeBlock = useCallback((block: string, position: { x: number; y: number; z: number }, rotation: number) => {
    sendMessage({
      type: 'eoe_place_block',
      block: block as EchoesClientMessage extends { type: 'eoe_place_block' } ? EchoesClientMessage['block'] : never,
      position,
      rotation,
    } as EchoesClientMessage);
  }, [sendMessage]);

  const removeBlock = useCallback((position: { x: number; y: number; z: number }) => {
    sendMessage({ type: 'eoe_remove_block', position });
  }, [sendMessage]);

  // --- Gacha ---
  const gachaPull = useCallback((bannerId: string, count: 1 | 10) => {
    sendMessage({ type: 'eoe_gacha_pull', bannerId, count });
  }, [sendMessage]);

  // --- Social ---
  const sendEmote = useCallback((emoteId: string) => {
    sendMessage({ type: 'eoe_emote', emoteId });
  }, [sendMessage]);

  const sendChat = useCallback((message: string) => {
    sendMessage({ type: 'eoe_chat', message });
  }, [sendMessage]);

  // --- Phase management ---
  const goToMenu = useCallback(() => {
    setPhase('menu');
    setBattleState(null);
    setBattleEnd(null);
    setRhythmSequence(null);
    setDungeon(null);
    setBrState(null);
    setMobaState(null);
    setGachaResults([]);
    setError(null);
  }, []);

  const openGacha = useCallback(() => {
    setPhase('gacha');
  }, []);

  // =========================================================================
  // Cleanup
  // =========================================================================

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // =========================================================================
  // Return
  // =========================================================================

  return {
    // Connection
    connectionStatus,
    playerId: playerIdRef.current,
    connect,
    disconnect,
    error,

    // Phase
    phase,
    goToMenu,
    openGacha,

    // Party
    party,
    partyCode,
    createParty,
    joinParty,
    leaveParty,
    setReady,
    selectCharacter,
    startGame,

    // Queue
    queuePosition,
    queueGameMode,
    queueForGame,
    dequeue,

    // Battle
    battleState,
    rhythmSequence,
    activeSkillId,
    comboChain,
    lastDamage,
    lastReaction,
    battleEnd,
    submitRhythmResult,
    selectAction,
    useItem,
    endTurn,

    // Dungeon
    dungeon,
    dungeonFloor,
    enterDungeon,

    // Battle Royale
    brState,

    // MOBA
    mobaState,

    // Building
    buildingState,
    placeBlock,
    removeBlock,

    // Gacha
    gachaResults,
    gachaState,
    gachaPull,

    // Progression
    levelUp,
    rankChange,
    achievementUnlocked,

    // Social
    chatMessages,
    emotes,
    sendEmote,
    sendChat,

    // Exploration
    move,
    interact,
  };
}
