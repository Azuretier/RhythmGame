import type {
  PuzzleCard,
  PuzzleDifficulty,
  PuzzlePlayerState,
  PuzzleRoomState,
  PuzzleGameState,
  PuzzlePublicRoom,
  PuzzleServerMessage,
} from '../../types/puzzle';
import {
  PUZZLE_DIFFICULTIES,
  PUZZLE_MAX_PLAYERS,
  PUZZLE_MATCH_SCORE,
  PUZZLE_COMBO_BONUS,
  PUZZLE_WINNER_BONUS,
  PUZZLE_FLIP_DELAY,
  PUZZLE_SYMBOLS,
} from '../../types/puzzle';

interface PuzzleRoom {
  code: string;
  name: string;
  hostId: string;
  players: PuzzlePlayerState[];
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  difficulty: PuzzleDifficulty;
  isPublic: boolean;
  maxPlayers: number;
  createdAt: number;
  lastActivity: number;
  // Game state (only during playing)
  gameState: PuzzleGameState | null;
  flipTimer: ReturnType<typeof setTimeout> | null;
}

interface PuzzleManagerCallbacks {
  onSendToPlayer: (playerId: string, message: PuzzleServerMessage) => void;
  onBroadcastToRoom: (roomCode: string, message: PuzzleServerMessage, excludePlayerId?: string) => void;
}

export class PuzzleGameManager {
  private rooms = new Map<string, PuzzleRoom>();
  private playerToRoom = new Map<string, string>();
  private readonly ROOM_TIMEOUT = 5 * 60 * 1000;
  private cleanupInterval: ReturnType<typeof setInterval>;
  private callbacks: PuzzleManagerCallbacks;

  constructor(callbacks: PuzzleManagerCallbacks) {
    this.callbacks = callbacks;
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 60000);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    for (const room of this.rooms.values()) {
      if (room.flipTimer) clearTimeout(room.flipTimer);
    }
  }

  private cleanupStaleRooms(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.rooms.forEach((room, code) => {
      const connectedPlayers = room.players.filter(p => p.connected);
      if (connectedPlayers.length === 0 && now - room.lastActivity > this.ROOM_TIMEOUT) {
        toDelete.push(code);
      }
      if (room.status === 'finished' && now - room.lastActivity > this.ROOM_TIMEOUT) {
        toDelete.push(code);
      }
    });

    toDelete.forEach(code => {
      const room = this.rooms.get(code);
      if (room) {
        if (room.flipTimer) clearTimeout(room.flipTimer);
        room.players.forEach(p => this.playerToRoom.delete(p.id));
      }
      this.rooms.delete(code);
      console.log(`[PUZZLE CLEANUP] Removed stale room ${code}`);
    });
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
      code = '';
      const len = attempts > 100 ? 5 : 4;
      for (let i = 0; i < len; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    } while (this.rooms.has(code));
    return code;
  }

  private touchRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.lastActivity = Date.now();
    }
  }

  private getRoomByPlayerId(playerId: string): PuzzleRoom | undefined {
    const code = this.playerToRoom.get(playerId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  getPlayerIdsInRoom(roomCode: string): string[] {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    return room.players.map(p => p.id);
  }

  getRoomState(roomCode: string): PuzzleRoomState | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      players: room.players,
      status: room.status,
      difficulty: room.difficulty,
      maxPlayers: room.maxPlayers,
      isPublic: room.isPublic,
    };
  }

  getPublicRooms(): PuzzlePublicRoom[] {
    const result: PuzzlePublicRoom[] = [];
    this.rooms.forEach(room => {
      if (room.isPublic && room.status === 'waiting' && room.players.length < room.maxPlayers) {
        const host = room.players.find(p => p.id === room.hostId);
        result.push({
          code: room.code,
          name: room.name,
          hostName: host?.name || 'Unknown',
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
          difficulty: room.difficulty,
        });
      }
    });
    return result;
  }

  // ===== Room Management =====

  createRoom(playerId: string, playerName: string, roomName?: string, difficulty?: PuzzleDifficulty): { roomCode: string } {
    const code = this.generateRoomCode();
    const player: PuzzlePlayerState = {
      id: playerId,
      name: playerName,
      score: 0,
      pairs: 0,
      consecutiveMatches: 0,
      ready: false,
      connected: true,
    };

    const room: PuzzleRoom = {
      code,
      name: roomName || `${playerName}'s Puzzle`,
      hostId: playerId,
      players: [player],
      status: 'waiting',
      difficulty: difficulty || 'medium',
      isPublic: true,
      maxPlayers: PUZZLE_MAX_PLAYERS,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      gameState: null,
      flipTimer: null,
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(playerId, code);
    console.log(`[PUZZLE] Room ${code} created by ${playerName}`);
    return { roomCode: code };
  }

  joinRoom(roomCode: string, playerId: string, playerName: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'Room is full' };
    if (room.players.some(p => p.id === playerId)) return { success: false, error: 'Already in room' };

    const player: PuzzlePlayerState = {
      id: playerId,
      name: playerName,
      score: 0,
      pairs: 0,
      consecutiveMatches: 0,
      ready: false,
      connected: true,
    };

    room.players.push(player);
    this.playerToRoom.set(playerId, roomCode);
    this.touchRoom(roomCode);
    console.log(`[PUZZLE] ${playerName} joined room ${roomCode}`);
    return { success: true };
  }

  removePlayer(playerId: string): { success: boolean; roomCode?: string; wasHost?: boolean } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false };

    const roomCode = room.code;
    const wasHost = room.hostId === playerId;

    // If game is in progress, end it
    if (room.status === 'playing' && room.gameState) {
      if (room.flipTimer) {
        clearTimeout(room.flipTimer);
        room.flipTimer = null;
      }
      // The remaining player wins
      const remainingPlayer = room.players.find(p => p.id !== playerId);
      if (remainingPlayer) {
        room.status = 'finished';
        this.callbacks.onBroadcastToRoom(roomCode, {
          type: 'puzzle_game_over',
          winnerId: remainingPlayer.id,
          players: room.players,
          isDraw: false,
        });
      }
    }

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerToRoom.delete(playerId);

    // Transfer host if needed
    if (wasHost && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }

    // Remove empty room
    if (room.players.length === 0) {
      if (room.flipTimer) clearTimeout(room.flipTimer);
      this.rooms.delete(roomCode);
      console.log(`[PUZZLE] Room ${roomCode} deleted (empty)`);
    }

    this.touchRoom(roomCode);
    return { success: true, roomCode, wasHost };
  }

  setPlayerReady(playerId: string, ready: boolean): { success: boolean; error?: string } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, error: 'Not in a room' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    player.ready = ready;
    this.touchRoom(room.code);
    return { success: true };
  }

  setDifficulty(playerId: string, difficulty: PuzzleDifficulty): { success: boolean; error?: string } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, error: 'Not in a room' };
    if (room.hostId !== playerId) return { success: false, error: 'Only the host can change difficulty' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };

    room.difficulty = difficulty;
    this.touchRoom(room.code);
    return { success: true };
  }

  startGame(playerId: string): { success: boolean; error?: string; gameSeed?: number } {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return { success: false, error: 'Not in a room' };
    if (room.hostId !== playerId) return { success: false, error: 'Only the host can start' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (room.players.length < 2) return { success: false, error: 'Need at least 2 players' };
    if (!room.players.every(p => p.ready)) return { success: false, error: 'All players must be ready' };

    const gameSeed = Math.floor(Math.random() * 2147483647);
    room.status = 'countdown';
    this.touchRoom(room.code);
    return { success: true, gameSeed };
  }

  beginPlaying(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    room.status = 'playing';

    // Generate cards
    const config = PUZZLE_DIFFICULTIES[room.difficulty];
    const totalCards = config.pairs * 2;
    const symbolIndices = PUZZLE_SYMBOLS.slice(0, config.pairs).map((_, i) => i);

    // Create pairs
    const cardSymbols = [...symbolIndices, ...symbolIndices];

    // Fisher-Yates shuffle
    for (let i = cardSymbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardSymbols[i], cardSymbols[j]] = [cardSymbols[j], cardSymbols[i]];
    }

    const cards: PuzzleCard[] = cardSymbols.map((symbolIndex, i) => ({
      id: i,
      symbolIndex,
      faceUp: false,
      matchedBy: null,
    }));

    // Reset player scores
    for (const player of room.players) {
      player.score = 0;
      player.pairs = 0;
      player.consecutiveMatches = 0;
    }

    // First player goes first (host)
    const firstPlayerId = room.players[0].id;

    room.gameState = {
      cards,
      currentTurnPlayerId: firstPlayerId,
      flippedCardIds: [],
      totalPairs: config.pairs,
      matchedPairs: 0,
      players: room.players,
    };

    // Send game state to all players (cards are face-down, so symbolIndex hidden)
    const hiddenCards = cards.map(c => ({
      ...c,
      symbolIndex: -1, // Hide symbols from clients
    }));

    this.callbacks.onBroadcastToRoom(roomCode, {
      type: 'puzzle_game_started',
      gameState: {
        ...room.gameState,
        cards: hiddenCards,
      },
    });

    console.log(`[PUZZLE] Game started in room ${roomCode} (${room.difficulty}, ${totalCards} cards)`);
  }

  // ===== Game Actions =====

  handleFlipCard(playerId: string, cardId: number): void {
    const room = this.getRoomByPlayerId(playerId);
    if (!room || !room.gameState) return;
    if (room.status !== 'playing') return;

    const gs = room.gameState;

    // Must be current player's turn
    if (gs.currentTurnPlayerId !== playerId) return;

    // Can only flip 0 or 1 cards (waiting for second flip)
    if (gs.flippedCardIds.length >= 2) return;

    // Card must exist and not already matched or flipped
    const card = gs.cards[cardId];
    if (!card) return;
    if (card.matchedBy !== null) return;
    if (card.faceUp) return;

    // Flip the card
    card.faceUp = true;
    gs.flippedCardIds.push(cardId);

    // Broadcast the flip (reveal the symbol)
    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'puzzle_card_flipped',
      cardId,
      symbolIndex: card.symbolIndex,
      playerId,
    });

    // If this is the second card flipped, check for match
    if (gs.flippedCardIds.length === 2) {
      const card1 = gs.cards[gs.flippedCardIds[0]];
      const card2 = gs.cards[gs.flippedCardIds[1]];

      if (card1.symbolIndex === card2.symbolIndex) {
        // Match found!
        this.handleMatch(room, playerId, gs.flippedCardIds[0], gs.flippedCardIds[1]);
      } else {
        // No match — flip back after delay
        room.flipTimer = setTimeout(() => {
          this.handleNoMatch(room, playerId, gs.flippedCardIds[0], gs.flippedCardIds[1]);
        }, PUZZLE_FLIP_DELAY);
      }
    }

    this.touchRoom(room.code);
  }

  private handleMatch(room: PuzzleRoom, playerId: string, cardId1: number, cardId2: number): void {
    const gs = room.gameState!;
    const player = gs.players.find(p => p.id === playerId);
    if (!player) return;

    // Mark cards as matched
    gs.cards[cardId1].matchedBy = playerId;
    gs.cards[cardId2].matchedBy = playerId;

    // Score
    player.consecutiveMatches++;
    const comboBonus = (player.consecutiveMatches - 1) * PUZZLE_COMBO_BONUS;
    const score = PUZZLE_MATCH_SCORE + comboBonus;
    player.score += score;
    player.pairs++;
    gs.matchedPairs++;
    gs.flippedCardIds = [];

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'puzzle_match_found',
      cardId1,
      cardId2,
      playerId,
      score,
      combo: player.consecutiveMatches,
    });

    // Check if game over
    if (gs.matchedPairs >= gs.totalPairs) {
      this.endGame(room);
      return;
    }

    // Same player gets another turn (don't change turn)
  }

  private handleNoMatch(room: PuzzleRoom, playerId: string, cardId1: number, cardId2: number): void {
    const gs = room.gameState;
    if (!gs) return;

    const player = gs.players.find(p => p.id === playerId);
    if (player) {
      player.consecutiveMatches = 0;
    }

    // Flip cards back
    gs.cards[cardId1].faceUp = false;
    gs.cards[cardId2].faceUp = false;
    gs.flippedCardIds = [];
    room.flipTimer = null;

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'puzzle_match_failed',
      cardId1,
      cardId2,
      playerId,
    });

    // Switch turns
    const otherPlayer = gs.players.find(p => p.id !== playerId);
    if (otherPlayer) {
      gs.currentTurnPlayerId = otherPlayer.id;
      this.callbacks.onBroadcastToRoom(room.code, {
        type: 'puzzle_turn_change',
        playerId: otherPlayer.id,
      });
    }
  }

  private endGame(room: PuzzleRoom): void {
    room.status = 'finished';
    const gs = room.gameState!;

    // Determine winner
    const sortedPlayers = [...gs.players].sort((a, b) => b.score - a.score);
    const isDraw = sortedPlayers.length >= 2 && sortedPlayers[0].score === sortedPlayers[1].score;

    // Give winner bonus
    if (!isDraw && sortedPlayers[0]) {
      sortedPlayers[0].score += PUZZLE_WINNER_BONUS;
    }

    const winnerId = isDraw ? null : sortedPlayers[0]?.id || null;

    if (room.flipTimer) {
      clearTimeout(room.flipTimer);
      room.flipTimer = null;
    }

    this.callbacks.onBroadcastToRoom(room.code, {
      type: 'puzzle_game_over',
      winnerId,
      players: gs.players,
      isDraw,
    });

    console.log(`[PUZZLE] Game over in room ${room.code}. Winner: ${winnerId || 'Draw'}`);
  }

  getRoomByPlayer(playerId: string): PuzzleRoom | undefined {
    return this.getRoomByPlayerId(playerId);
  }
}
