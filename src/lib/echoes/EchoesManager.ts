// =============================================================================
// ECHOES OF ETERNITY — Server-Side Game Manager
// ゲームマネージャー (サーバー側ルーム＆状態管理)
// =============================================================================

import type {
  EchoesRoom,
  EchoesRoomPlayer,
  GameMode,
  GameModeConfig,
  Party,
  PartyMember,
  CharacterInstance,
  EnemyInstance,
  DamageInstance,
  BattleState,
  BattleRoyaleState,
  MobaState,
  DungeonDefinition,
  DungeonDifficulty,
  EchoesServerMessage,
  EchoesClientMessage,
  RhythmResult,
  Position2D,
  BattleEndStats,
  DungeonReward,
  BuildBlockType,
  Position3D,
} from '@/types/echoes';
import {
  createBattleState,
  advanceBattlePhase,
  processEndOfTurn,
  calculateDamage,
  generateRhythmSequence,
  scoreRhythmResult,
  updateComboChain,
  resetComboChain,
  calculateBattleEndStats,
  generateLoot,
  determineEnemyAction,
  canAct,
  canUseSkills,
  applyStatusEffect,
  getStatusStatModifiers,
  applyStatModifiers,
} from './combat';
import { GAME_MODE_CONFIGS } from './game-modes';
import { getCharacterDefinition, createCharacterInstance } from './characters';

// ---------------------------------------------------------------------------
// Manager Callbacks (same pattern as ArenaManager, MinecraftBoardManager)
// ---------------------------------------------------------------------------

export interface EchoesManagerCallbacks {
  onBroadcast: (roomCode: string, message: EchoesServerMessage) => void;
  onSendToPlayer: (playerId: string, message: EchoesServerMessage) => void;
  onSessionEnd: (roomCode: string) => void;
}

// ---------------------------------------------------------------------------
// Internal room state
// ---------------------------------------------------------------------------

interface EchoesRoomInternal {
  room: EchoesRoom;
  battleState: BattleState | null;
  brState: BattleRoyaleState | null;
  mobaState: MobaState | null;
  dungeonState: DungeonRunState | null;
  tickInterval: NodeJS.Timeout | null;
  countdownInterval: NodeJS.Timeout | null;
}

interface DungeonRunState {
  dungeon: DungeonDefinition;
  difficulty: DungeonDifficulty;
  currentFloor: number;
  battleState: BattleState | null;
  playerPositions: Record<string, Position2D>;
  revealedTiles: Set<string>;
  startTime: number;
  deathCount: number;
  trapsTriggered: number;
  puzzlesSolved: number;
  chestsOpened: number;
}

// ---------------------------------------------------------------------------
// EchoesManager Class
// ---------------------------------------------------------------------------

export class EchoesManager {
  private rooms: Map<string, EchoesRoomInternal> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private queues: Map<GameMode, Map<string, { name: string; icon: string; joinedAt: number }>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private callbacks: EchoesManagerCallbacks) {
    // Cleanup stale rooms every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  // =========================================================================
  // Room Lifecycle
  // =========================================================================

  createRoom(
    hostId: string,
    hostName: string,
    hostIcon: string,
    gameMode: GameMode,
    maxPlayers?: number
  ): { roomCode: string; room: EchoesRoom } {
    const roomCode = this.generateRoomCode();
    const config = GAME_MODE_CONFIGS[gameMode];
    const effectiveMax = maxPlayers ?? config.maxPlayers;

    const room: EchoesRoom = {
      id: roomCode,
      code: roomCode,
      gameMode,
      players: new Map(),
      state: 'lobby',
      settings: config,
      createdAt: Date.now(),
      maxPlayers: effectiveMax,
    };

    const hostPlayer: EchoesRoomPlayer = {
      id: hostId,
      name: hostName,
      icon: hostIcon,
      character: null,
      isReady: false,
      isHost: true,
      ping: 0,
    };

    room.players.set(hostId, hostPlayer);

    const internal: EchoesRoomInternal = {
      room,
      battleState: null,
      brState: null,
      mobaState: null,
      dungeonState: null,
      tickInterval: null,
      countdownInterval: null,
    };

    this.rooms.set(roomCode, internal);
    this.playerToRoom.set(hostId, roomCode);

    return { roomCode, room };
  }

  joinRoom(
    roomCode: string,
    playerId: string,
    playerName: string,
    playerIcon: string
  ): { success: boolean; error?: string; room?: EchoesRoom } {
    const internal = this.rooms.get(roomCode);
    if (!internal) return { success: false, error: 'Room not found' };
    if (internal.room.state !== 'lobby') return { success: false, error: 'Game already in progress' };
    if (internal.room.players.size >= internal.room.maxPlayers) return { success: false, error: 'Room is full' };

    const player: EchoesRoomPlayer = {
      id: playerId,
      name: playerName,
      icon: playerIcon,
      character: null,
      isReady: false,
      isHost: false,
      ping: 0,
    };

    internal.room.players.set(playerId, player);
    this.playerToRoom.set(playerId, roomCode);

    // Notify all players
    this.broadcastPartyUpdate(roomCode);

    return { success: true, room: internal.room };
  }

  removePlayer(playerId: string): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    internal.room.players.delete(playerId);
    this.playerToRoom.delete(playerId);

    // If room is empty, clean up
    if (internal.room.players.size === 0) {
      this.destroyRoom(roomCode);
      return;
    }

    // If host left, assign new host
    const hostExists = [...internal.room.players.values()].some((p) => p.isHost);
    if (!hostExists) {
      const newHost = internal.room.players.values().next().value;
      if (newHost) {
        newHost.isHost = true;
      }
    }

    this.broadcastPartyUpdate(roomCode);
  }

  // =========================================================================
  // Character Selection
  // =========================================================================

  selectCharacter(playerId: string, characterId: string): boolean {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return false;

    const internal = this.rooms.get(roomCode);
    if (!internal) return false;

    const player = internal.room.players.get(playerId);
    if (!player) return false;

    const definition = getCharacterDefinition(characterId);
    if (!definition) return false;

    // Check if character already selected by another player
    for (const [id, p] of internal.room.players) {
      if (id !== playerId && p.character?.definitionId === characterId) {
        this.callbacks.onSendToPlayer(playerId, {
          type: 'eoe_error',
          code: 'CHARACTER_TAKEN',
          message: 'Character already selected by another player',
        });
        return false;
      }
    }

    player.character = createCharacterInstance(definition, 1);
    this.broadcastPartyUpdate(roomCode);
    return true;
  }

  setPlayerReady(playerId: string, ready: boolean): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    const player = internal.room.players.get(playerId);
    if (!player) return;

    player.isReady = ready;
    this.broadcastPartyUpdate(roomCode);
  }

  // =========================================================================
  // Game Start
  // =========================================================================

  startGame(hostId: string): boolean {
    const roomCode = this.playerToRoom.get(hostId);
    if (!roomCode) return false;

    const internal = this.rooms.get(roomCode);
    if (!internal) return false;

    const host = internal.room.players.get(hostId);
    if (!host?.isHost) return false;

    // Check all players ready and have characters
    for (const player of internal.room.players.values()) {
      if (!player.isReady || !player.character) {
        this.callbacks.onSendToPlayer(hostId, {
          type: 'eoe_error',
          code: 'NOT_ALL_READY',
          message: 'All players must be ready with a selected character',
        });
        return false;
      }
    }

    // Start countdown
    internal.room.state = 'loading';
    let countdown = 3;

    internal.countdownInterval = setInterval(() => {
      this.callbacks.onBroadcast(roomCode, {
        type: 'eoe_game_starting',
        countdown,
      });

      countdown--;
      if (countdown < 0) {
        if (internal.countdownInterval) {
          clearInterval(internal.countdownInterval);
          internal.countdownInterval = null;
        }
        this.initializeGameMode(roomCode);
      }
    }, 1000);

    return true;
  }

  private initializeGameMode(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    internal.room.state = 'active';

    switch (internal.room.gameMode) {
      case 'story':
      case 'co_op_dungeon':
      case 'boss_rush':
      case 'daily_challenge':
        this.initializePvEBattle(roomCode);
        break;
      case 'arena_pvp':
        this.initializeArenaPvP(roomCode);
        break;
      case 'rhythm_challenge':
        this.initializeRhythmChallenge(roomCode);
        break;
      case 'ranked_5v5':
        this.initializeMoba(roomCode);
        break;
      case 'battle_royale':
        this.initializeBattleRoyale(roomCode);
        break;
      case 'endless_dungeon':
        this.initializeEndlessDungeon(roomCode);
        break;
      case 'creative':
        this.initializeCreative(roomCode);
        break;
    }
  }

  // =========================================================================
  // PvE Battle Mode
  // =========================================================================

  private initializePvEBattle(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    const party: CharacterInstance[] = [];
    for (const player of internal.room.players.values()) {
      if (player.character) {
        party.push(player.character);
      }
    }

    // Generate enemies based on party level
    const avgLevel = Math.floor(
      party.reduce((sum, p) => sum + p.level, 0) / party.length
    );
    const enemies = this.generateEncounterEnemies(avgLevel, internal.room.gameMode === 'boss_rush');

    const battleState = createBattleState(
      party,
      enemies,
      {
        terrain: 'plains',
        weather: 'clear',
        timeOfDay: 'day',
        hazards: [],
      },
      internal.room.gameMode === 'boss_rush'
    );

    internal.battleState = battleState;

    // Broadcast initial state
    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_battle_state',
      state: battleState,
    });

    // Start tick loop for battle
    internal.tickInterval = setInterval(() => {
      this.battleTick(roomCode);
    }, 100); // 10 ticks/sec
  }

  private battleTick(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal?.battleState) return;

    const state = internal.battleState;

    // Only process enemy turns automatically
    const currentActor = state.turnOrder[state.currentActorIndex];
    const isEnemy = state.enemies.some((e) => e.id === currentActor && e.isAlive);

    if (isEnemy && state.phase === 'action_select') {
      const enemy = state.enemies.find((e) => e.id === currentActor)!;
      const action = determineEnemyAction(enemy, state.playerParty, state.enemies);

      // Execute enemy action
      this.executeAction(roomCode, currentActor, action.skillId, action.targetId);
    }
  }

  // =========================================================================
  // Action Execution
  // =========================================================================

  handleRhythmResult(playerId: string, result: RhythmResult): void {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const internal = this.rooms.get(roomCode);
    if (!internal?.battleState) return;

    internal.battleState.rhythmResult = result;
    internal.battleState.phase = 'action_select';

    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_battle_state',
      state: internal.battleState,
    });
  }

  executeAction(roomCode: string, actorId: string, skillId: string, targetId: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal?.battleState) return;

    const state = internal.battleState;

    // Find actor
    const playerChar = state.playerParty.find((p) => p.definitionId === actorId);
    const enemyChar = state.enemies.find((e) => e.id === actorId);
    const actor = playerChar || enemyChar;
    if (!actor) return;

    // Check if actor can act
    const actCheck = canAct(actor.statusEffects);
    if (!actCheck.canAct) {
      // Skip turn
      const { state: newState, battleOver, result } = processEndOfTurn(state);
      internal.battleState = newState;
      if (battleOver) {
        this.endBattle(roomCode, result!);
      }
      return;
    }

    // Find skill
    const skills = 'skills' in actor && Array.isArray(actor.skills)
      ? actor.skills
      : [];
    const skill = skills.find((s: { id: string }) => s.id === skillId);
    if (!skill) return;

    // Check silence
    if (skill.skillType !== 'normal' && !canUseSkills(actor.statusEffects)) {
      return;
    }

    // Find target(s)
    const targets: (CharacterInstance | EnemyInstance)[] = [];
    if (skill.targetType === 'all_enemies') {
      if (playerChar) targets.push(...state.enemies.filter((e) => e.isAlive));
      else targets.push(...state.playerParty.filter((p) => p.isAlive));
    } else if (skill.targetType === 'all_allies') {
      if (playerChar) targets.push(...state.playerParty.filter((p) => p.isAlive));
      else targets.push(...state.enemies.filter((e) => e.isAlive));
    } else {
      const target =
        state.playerParty.find((p) => p.definitionId === targetId) ||
        state.enemies.find((e) => e.id === targetId);
      if (target) targets.push(target);
    }

    // Apply stat modifiers
    const actorMods = getStatusStatModifiers(actor.statusEffects);
    const effectiveStats = applyStatModifiers(actor.stats, actorMods);

    // Calculate and apply damage to each target
    for (const target of targets) {
      const targetMods = getStatusStatModifiers(target.statusEffects);
      const targetStats = applyStatModifiers(target.stats, targetMods);

      const damageResult = calculateDamage({
        attackerStats: effectiveStats,
        defenderStats: targetStats,
        skill,
        rhythmResult: state.rhythmResult,
        comboCount: state.comboChain.hits,
        attackerElement: 'currentElement' in actor ? actor.currentElement : actor.element,
        defenderElement: 'currentElement' in target ? target.currentElement : target.element,
        attackerLevel: 'level' in actor ? actor.level : 1,
        fieldElements: [],
      });

      // Apply damage
      target.stats.hp -= damageResult.finalDamage;
      if (target.stats.hp <= 0) {
        target.stats.hp = 0;
        target.isAlive = false;
        damageResult.overkill = true;
      }

      // Apply status effects
      for (const effect of damageResult.statusEffectsApplied) {
        effect.sourcePlayerId = actorId;
        target.statusEffects = applyStatusEffect(target.statusEffects, effect);
      }

      // Update combo
      if (damageResult.resultType !== 'evaded') {
        state.comboChain = updateComboChain(
          state.comboChain,
          skill.element,
          damageResult.finalDamage,
          actorId
        );
      } else {
        state.comboChain = resetComboChain();
      }

      const damage: DamageInstance = {
        sourceId: actorId,
        targetId: 'id' in target ? target.id : target.definitionId,
        ...damageResult,
      };

      // Add to battle log
      state.battleLog.push({
        turn: state.turn,
        timestamp: Date.now(),
        type: 'damage',
        message: `${actorId} used ${skill.name} on target for ${damageResult.finalDamage} damage`,
        messageJa: `${actorId}が${skill.nameJa}を使用、${damageResult.finalDamage}ダメージ`,
        data: damage,
      });

      // Broadcast damage
      this.callbacks.onBroadcast(roomCode, {
        type: 'eoe_damage_dealt',
        damage,
      });

      // Broadcast reaction if triggered
      if (damageResult.reactionTriggered) {
        this.callbacks.onBroadcast(roomCode, {
          type: 'eoe_reaction_triggered',
          reaction: damageResult.reactionTriggered,
          damage: damageResult.reactionDamage ?? 0,
          position: 'position' in target ? target.position : { x: 0, y: 0 },
        });
      }
    }

    // Process end of turn
    state.rhythmResult = null;
    const { state: newState, battleOver, result } = processEndOfTurn(state);
    internal.battleState = newState;

    if (battleOver) {
      this.endBattle(roomCode, result!);
    } else {
      // Broadcast updated state
      this.callbacks.onBroadcast(roomCode, {
        type: 'eoe_battle_state',
        state: newState,
      });

      // If next turn is a player, send rhythm sequence
      const nextActor = newState.turnOrder[newState.currentActorIndex];
      const isPlayerNext = newState.playerParty.some((p) => p.definitionId === nextActor && p.isAlive);
      if (isPlayerNext) {
        const rhythmSeq = generateRhythmSequence('normal', 120, 4000);
        newState.rhythmSequence = rhythmSeq;
        this.callbacks.onBroadcast(roomCode, {
          type: 'eoe_rhythm_start',
          sequence: rhythmSeq,
          skillId: '', // player will choose
        });
      }
    }
  }

  private endBattle(roomCode: string, result: 'victory' | 'defeat' | 'draw'): void {
    const internal = this.rooms.get(roomCode);
    if (!internal?.battleState) return;

    // Stop tick loop
    if (internal.tickInterval) {
      clearInterval(internal.tickInterval);
      internal.tickInterval = null;
    }

    const stats = calculateBattleEndStats(internal.battleState);
    const loot = result === 'victory' ? generateLoot(internal.battleState.enemies) : [];

    const reward: DungeonReward = {
      experience: stats.experienceGained || 100 * internal.battleState.turn,
      gold: 50 * internal.battleState.turn,
      guaranteedLoot: loot,
      bonusLoot: [],
    };

    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_battle_end',
      result,
      rewards: reward,
      stats,
    });

    internal.room.state = 'ended';
    internal.battleState = null;
  }

  // =========================================================================
  // Arena PvP
  // =========================================================================

  private initializeArenaPvP(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    // For PvP, each player's character fights against the other's
    const players = [...internal.room.players.values()];
    if (players.length < 2) return;

    // Player 1's party = their character, Player 2's party = their character
    // For simplicity, each player controls one character
    const party = players.slice(0, 1).filter((p) => p.character).map((p) => p.character!);
    const enemies = players.slice(1).filter((p) => p.character).map((p) => ({
      id: p.id,
      definitionId: p.character!.definitionId,
      name: p.name,
      nameJa: p.name,
      level: p.character!.level,
      stats: { ...p.character!.stats },
      element: p.character!.currentElement,
      statusEffects: [],
      position: { x: 5, y: 0 },
      isAlive: true,
      isBoss: false,
      lootTable: [],
      skills: [], // loaded from character definition
      ai: 'aggressive' as const,
      sprite: '',
    }));

    const battleState = createBattleState(party, enemies, {
      terrain: 'arena',
      weather: 'clear',
      timeOfDay: 'day',
      hazards: [],
    });

    internal.battleState = battleState;
    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_battle_state',
      state: battleState,
    });
  }

  // =========================================================================
  // Rhythm Challenge
  // =========================================================================

  private initializeRhythmChallenge(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    // Pure rhythm mode — generate longer sequences
    const sequence = generateRhythmSequence('expert', 140, 30000);

    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_rhythm_start',
      sequence,
      skillId: 'rhythm_challenge',
    });
  }

  // =========================================================================
  // MOBA Mode (stub — complex mode)
  // =========================================================================

  private initializeMoba(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    const players = [...internal.room.players.entries()];

    const mobaState: MobaState = {
      roomId: roomCode,
      phase: 'ban_pick',
      teamBlue: {
        players: players.slice(0, Math.ceil(players.length / 2)).map(([id, p]) => ({
          playerId: id,
          playerName: p.name,
          character: p.character!,
          lane: 'mid' as const,
          gold: 500,
          kills: 0,
          deaths: 0,
          assists: 0,
          cs: 0,
          items: [],
          level: 1,
        })),
        totalKills: 0,
        totalGold: 0,
        towersDestroyed: 0,
        nexusHealth: 5000,
      },
      teamRed: {
        players: players.slice(Math.ceil(players.length / 2)).map(([id, p]) => ({
          playerId: id,
          playerName: p.name,
          character: p.character!,
          lane: 'mid' as const,
          gold: 500,
          kills: 0,
          deaths: 0,
          assists: 0,
          cs: 0,
          items: [],
          level: 1,
        })),
        totalKills: 0,
        totalGold: 0,
        towersDestroyed: 0,
        nexusHealth: 5000,
      },
      bannedCharacters: [],
      pickedCharacters: {},
      pickPhase: { team: 'blue', action: 'ban', timeRemaining: 30 },
      towers: this.generateMobaTowers(),
      minions: [],
      jungle: [],
      gameTime: 0,
      killFeed: [],
    };

    internal.mobaState = mobaState;
    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_moba_state',
      state: mobaState,
    });
  }

  private generateMobaTowers(): MobaState['towers'] {
    const towers: MobaState['towers'] = [];
    const lanes: ('top' | 'mid' | 'bot')[] = ['top', 'mid', 'bot'];
    const tiers: (1 | 2 | 3)[] = [1, 2, 3];

    for (const team of ['blue', 'red'] as const) {
      for (const lane of lanes) {
        for (const tier of tiers) {
          const xBase = team === 'blue' ? 100 : 900;
          const xOffset = team === 'blue' ? tier * 100 : -tier * 100;
          const yMap = { top: 100, mid: 500, bot: 900 };

          towers.push({
            id: `tower_${team}_${lane}_${tier}`,
            team,
            lane,
            tier,
            health: 3000 + tier * 500,
            maxHealth: 3000 + tier * 500,
            position: { x: xBase + xOffset, y: yMap[lane] },
            isDestroyed: false,
          });
        }
      }
    }

    return towers;
  }

  // =========================================================================
  // Battle Royale (stub — complex mode)
  // =========================================================================

  private initializeBattleRoyale(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    const players = [...internal.room.players.entries()];

    const brState: BattleRoyaleState = {
      roomId: roomCode,
      phase: 'waiting',
      players: players.map(([id, p]) => ({
        playerId: id,
        playerName: p.name,
        character: p.character!,
        position: { x: 500, y: 500 }, // center spawn
        isAlive: true,
        kills: 0,
        placement: 0,
        inventory: { items: [], maxSlots: 20, gold: 0, premiumCurrency: 0 },
        buildingState: {
          blocks: new Map(),
          totalBlocksPlaced: 0,
          buildMode: false,
          selectedBlock: 'wood' as BuildBlockType,
          previewPosition: null,
          canPlace: true,
        },
        shield: 0,
        maxShield: 100,
      })),
      alivePlayers: players.length,
      totalPlayers: players.length,
      stormCircle: { center: { x: 500, y: 500 }, radius: 500, shrinkRate: 0, damage: 0 },
      nextCircle: null,
      circlePhase: 0,
      timeToNextShrink: 120,
      lootSpawns: [],
      supplyDrops: [],
      worldSeed: Math.floor(Math.random() * 999999),
    };

    internal.brState = brState;
    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_br_state',
      state: brState,
    });
  }

  // =========================================================================
  // Endless Dungeon
  // =========================================================================

  private initializeEndlessDungeon(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    // Generate first floor and start dungeon run
    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_dungeon_entered',
      dungeon: {
        id: 'endless_' + roomCode,
        name: 'Endless Abyss',
        nameJa: '無限の深淵',
        description: 'How deep can you go?',
        descriptionJa: 'どこまで潜れるか？',
        regionId: 'void',
        floors: [],
        difficulty: 'normal',
        recommendedLevel: 1,
        maxPlayers: 4,
        isEndless: true,
        rewards: { experience: 0, gold: 0, guaranteedLoot: [], bonusLoot: [] },
        weeklyReset: false,
        music: 'dungeon_endless',
      },
      floor: 1,
    });
  }

  // =========================================================================
  // Creative Mode
  // =========================================================================

  private initializeCreative(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    // Creative mode — no enemies, free building
    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_building_state',
      state: {
        blocks: new Map(),
        totalBlocksPlaced: 0,
        buildMode: true,
        selectedBlock: 'stone',
        previewPosition: null,
        canPlace: true,
      },
    });
  }

  // =========================================================================
  // Queue System
  // =========================================================================

  queuePlayer(playerId: string, playerName: string, playerIcon: string, gameMode: GameMode): void {
    if (!this.queues.has(gameMode)) {
      this.queues.set(gameMode, new Map());
    }

    const queue = this.queues.get(gameMode)!;
    queue.set(playerId, { name: playerName, icon: playerIcon, joinedAt: Date.now() });

    // Send queue status
    this.callbacks.onSendToPlayer(playerId, {
      type: 'eoe_queue_status',
      position: queue.size,
      estimatedWait: queue.size * 5, // rough estimate
      gameMode,
    });

    // Try to form a match
    this.tryFormMatch(gameMode);
  }

  dequeuePlayer(playerId: string): void {
    for (const [, queue] of this.queues) {
      queue.delete(playerId);
    }
  }

  private tryFormMatch(gameMode: GameMode): void {
    const queue = this.queues.get(gameMode);
    if (!queue) return;

    const config = GAME_MODE_CONFIGS[gameMode];
    if (queue.size >= config.minPlayers) {
      // Form match with available players
      const matchPlayers = [...queue.entries()].slice(0, config.maxPlayers);

      // Create room
      const [hostId, hostData] = matchPlayers[0];
      const { roomCode } = this.createRoom(hostId, hostData.name, hostData.icon, gameMode);

      // Add remaining players
      for (let i = 1; i < matchPlayers.length; i++) {
        const [pid, pdata] = matchPlayers[i];
        this.joinRoom(roomCode, pid, pdata.name, pdata.icon);
        queue.delete(pid);
      }
      queue.delete(hostId);

      // Notify all
      for (const [pid] of matchPlayers) {
        this.callbacks.onSendToPlayer(pid, {
          type: 'eoe_match_found',
          roomId: roomCode,
          gameMode,
          players: matchPlayers.map(([id]) => id),
        });
      }

      // Auto-start: assign default characters to queue players without one, then begin.
      // The 3s delay gives clients time to transition to the loading phase (after
      // receiving eoe_match_found) before the first game-state broadcast arrives.
      setTimeout(() => {
        const internal = this.rooms.get(roomCode);
        if (!internal) return;
        const defaultDef = getCharacterDefinition('aether_flame');
        if (defaultDef) {
          for (const player of internal.room.players.values()) {
            if (!player.character) {
              player.character = createCharacterInstance(defaultDef, 1);
            }
          }
        }
        this.initializeGameMode(roomCode);
      }, 3000);
    }
  }

  // =========================================================================
  // Message Handler
  // =========================================================================

  handleMessage(playerId: string, message: EchoesClientMessage): void {
    switch (message.type) {
      case 'eoe_create_party':
        this.createRoom(playerId, '', '', message.gameMode, message.maxSize);
        break;
      case 'eoe_join_party':
        this.joinRoom(message.partyCode, playerId, '', '');
        break;
      case 'eoe_leave_party':
        this.removePlayer(playerId);
        break;
      case 'eoe_select_character':
        this.selectCharacter(playerId, message.characterId);
        break;
      case 'eoe_set_ready':
        this.setPlayerReady(playerId, message.ready);
        break;
      case 'eoe_start_game':
        this.startGame(playerId);
        break;
      case 'eoe_rhythm_result':
        this.handleRhythmResult(playerId, message.result);
        break;
      case 'eoe_select_action': {
        const rc = this.playerToRoom.get(playerId);
        if (rc) this.executeAction(rc, playerId, message.skillId, message.targetId);
        break;
      }
      case 'eoe_queue':
        this.queuePlayer(playerId, '', '', message.gameMode);
        break;
      case 'eoe_dequeue':
        this.dequeuePlayer(playerId);
        break;
      case 'eoe_emote': {
        const rc2 = this.playerToRoom.get(playerId);
        if (rc2) {
          this.callbacks.onBroadcast(rc2, {
            type: 'eoe_player_emote',
            playerId,
            emoteId: message.emoteId,
          });
        }
        break;
      }
      case 'eoe_chat': {
        const rc3 = this.playerToRoom.get(playerId);
        if (rc3) {
          const player = this.rooms.get(rc3)?.room.players.get(playerId);
          this.callbacks.onBroadcast(rc3, {
            type: 'eoe_chat_message',
            playerId,
            playerName: player?.name ?? 'Unknown',
            message: message.message,
          });
        }
        break;
      }
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private broadcastPartyUpdate(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    const party: Party = {
      id: roomCode,
      members: [...internal.room.players.entries()].map(([id, p]) => ({
        playerId: id,
        playerName: p.name,
        character: p.character!,
        role: p.isHost ? 'leader' : 'member',
        isReady: p.isReady,
        isOnline: true,
      })),
      maxSize: internal.room.maxPlayers,
      currentActivity: internal.room.gameMode,
      isPublic: true,
    };

    this.callbacks.onBroadcast(roomCode, {
      type: 'eoe_party_updated',
      party,
    });
  }

  private generateEncounterEnemies(avgLevel: number, isBoss: boolean): import('@/types/echoes').EnemyInstance[] {
    const elements: import('@/types/echoes').Element[] = ['fire', 'water', 'ice', 'thunder', 'wind', 'earth'];

    const count = isBoss ? 1 : 2 + Math.floor(Math.random() * 3);
    const enemies: import('@/types/echoes').EnemyInstance[] = [];

    for (let i = 0; i < count; i++) {
      const element = elements[Math.floor(Math.random() * elements.length)];
      const level = avgLevel + Math.floor(Math.random() * 5) - 2;
      const hpBase = isBoss ? 5000 : 500;

      enemies.push({
        id: `enemy_${i}_${Date.now()}`,
        definitionId: isBoss ? 'boss_generic' : 'mob_generic',
        name: isBoss ? 'Temporal Guardian' : `Void Wanderer ${i + 1}`,
        nameJa: isBoss ? '時の守護者' : `虚空の彷徨者 ${i + 1}`,
        level: Math.max(1, level),
        stats: {
          hp: hpBase + level * 50,
          maxHp: hpBase + level * 50,
          mp: 100,
          maxMp: 100,
          atk: 30 + level * 5,
          def: 20 + level * 3,
          speed: 50 + level * 2,
          critRate: 0.05,
          critDamage: 1.5,
          accuracy: 0.9,
          evasion: 0.05,
          elementalMastery: level * 5,
        },
        element,
        statusEffects: [],
        position: { x: 5 + i * 2, y: 0 },
        isAlive: true,
        isBoss,
        lootTable: [
          { itemId: 'gold_coin', chance: 1.0, minQuantity: 10, maxQuantity: 50, rarity: 'common' },
          { itemId: `${element}_essence`, chance: 0.3, minQuantity: 1, maxQuantity: 3, rarity: 'uncommon' },
          { itemId: 'exp_crystal', chance: 0.5, minQuantity: 1, maxQuantity: 2, rarity: 'common' },
        ],
        skills: [
          {
            id: `${element}_strike`,
            name: `${element.charAt(0).toUpperCase() + element.slice(1)} Strike`,
            nameJa: `${element}撃`,
            description: 'A basic elemental attack',
            descriptionJa: '基本的な元素攻撃',
            element,
            cooldown: 0,
            manaCost: 0,
            damageMultiplier: 1.0,
            range: 1,
            aoeRadius: 0,
            skillType: 'normal',
            targetType: 'enemy',
          },
          {
            id: `${element}_burst`,
            name: `${element.charAt(0).toUpperCase() + element.slice(1)} Burst`,
            nameJa: `${element}爆発`,
            description: 'A powerful elemental burst',
            descriptionJa: '強力な元素爆発',
            element,
            cooldown: 3,
            manaCost: 30,
            damageMultiplier: 2.5,
            range: 2,
            aoeRadius: isBoss ? 3 : 0,
            skillType: 'burst',
            targetType: isBoss ? 'all_enemies' : 'enemy',
          },
        ],
        ai: isBoss ? 'boss_pattern' : 'aggressive',
        sprite: `enemy_${element}`,
      });
    }

    return enemies;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  private destroyRoom(roomCode: string): void {
    const internal = this.rooms.get(roomCode);
    if (!internal) return;

    if (internal.tickInterval) clearInterval(internal.tickInterval);
    if (internal.countdownInterval) clearInterval(internal.countdownInterval);

    for (const playerId of internal.room.players.keys()) {
      this.playerToRoom.delete(playerId);
    }

    this.rooms.delete(roomCode);
    this.callbacks.onSessionEnd(roomCode);
  }

  private cleanupStaleRooms(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [code, internal] of this.rooms) {
      if (internal.room.state === 'ended' && now - internal.room.createdAt > staleThreshold) {
        this.destroyRoom(code);
      }
      if (internal.room.players.size === 0) {
        this.destroyRoom(code);
      }
    }
  }

  getRoomByPlayerId(playerId: string): EchoesRoom | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;
    return this.rooms.get(roomCode)?.room ?? null;
  }

  getRoomByCode(roomCode: string): EchoesRoom | null {
    return this.rooms.get(roomCode)?.room ?? null;
  }

  getQueueSize(gameMode: GameMode): number {
    return this.queues.get(gameMode)?.size ?? 0;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    for (const [code] of this.rooms) {
      this.destroyRoom(code);
    }
  }
}

// ---------------------------------------------------------------------------
// Type guard for message routing
// ---------------------------------------------------------------------------

export function isEchoesMessage(type: string): boolean {
  return type.startsWith('eoe_');
}
