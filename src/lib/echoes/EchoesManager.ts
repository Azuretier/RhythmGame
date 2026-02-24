// =============================================================
// Echoes of Eternity — Server-Side Lobby Manager
// Manages lobbies for all Echoes game modes
// =============================================================

import type { EchoesLobbyState, EchoesLobbyPlayer, GameMode } from '../../types/echoes';
import { ECHOES_CONFIG } from '../../types/echoes';

interface EchoesManagerCallbacks {
  onBroadcast: (lobbyCode: string, message: object, excludePlayerId?: string) => void;
  onSendToPlayer: (playerId: string, message: object) => void;
}

interface EchoesLobby {
  state: EchoesLobbyState;
  countdownTimer?: ReturnType<typeof setTimeout>;
  gameTimer?: ReturnType<typeof setInterval>;
}

function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class EchoesLobbyManager {
  private lobbies = new Map<string, EchoesLobby>();
  private playerToLobby = new Map<string, string>();
  private callbacks: EchoesManagerCallbacks;

  constructor(callbacks: EchoesManagerCallbacks) {
    this.callbacks = callbacks;
  }

  createLobby(playerId: string, playerName: string, mode: GameMode, lobbyName?: string): {
    lobbyCode: string;
    player: EchoesLobbyPlayer;
  } {
    const code = generateLobbyCode();

    const maxPlayers = (() => {
      switch (mode) {
        case 'battle_royale': return ECHOES_CONFIG.MAX_PLAYERS_BR;
        case 'ranked_match': return ECHOES_CONFIG.MAX_PLAYERS_RANKED;
        case 'endless_dungeon': return ECHOES_CONFIG.MAX_PLAYERS_DUNGEON;
        default: return ECHOES_CONFIG.MAX_PLAYERS_STORY;
      }
    })();

    const player: EchoesLobbyPlayer = {
      id: playerId,
      name: playerName,
      ready: false,
      connected: true,
      selectedCharacter: null,
      team: 0,
      color: ECHOES_CONFIG.PLAYER_COLORS[0],
    };

    const state: EchoesLobbyState = {
      code,
      name: lobbyName || `${playerName}'s Lobby`,
      hostId: playerId,
      players: [player],
      status: 'waiting',
      mode,
      maxPlayers,
      bannedCharacters: [],
    };

    this.lobbies.set(code, { state });
    this.playerToLobby.set(playerId, code);

    return { lobbyCode: code, player };
  }

  joinLobby(lobbyCode: string, playerId: string, playerName: string): {
    success: boolean;
    lobbyState?: EchoesLobbyState;
    error?: string;
  } {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) return { success: false, error: 'Lobby not found' };
    if (lobby.state.status !== 'waiting') return { success: false, error: 'Game already in progress' };
    if (lobby.state.players.length >= lobby.state.maxPlayers) return { success: false, error: 'Lobby is full' };

    const colorIndex = lobby.state.players.length % ECHOES_CONFIG.PLAYER_COLORS.length;
    const player: EchoesLobbyPlayer = {
      id: playerId,
      name: playerName,
      ready: false,
      connected: true,
      selectedCharacter: null,
      team: lobby.state.players.length % 2,
      color: ECHOES_CONFIG.PLAYER_COLORS[colorIndex],
    };

    lobby.state.players.push(player);
    this.playerToLobby.set(playerId, lobbyCode);

    return { success: true, lobbyState: lobby.state };
  }

  leaveLobby(playerId: string): { lobbyCode?: string } {
    const lobbyCode = this.playerToLobby.get(playerId);
    if (!lobbyCode) return {};

    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) {
      this.playerToLobby.delete(playerId);
      return {};
    }

    lobby.state.players = lobby.state.players.filter(p => p.id !== playerId);
    this.playerToLobby.delete(playerId);

    if (lobby.state.players.length === 0) {
      this.destroyLobby(lobbyCode);
      return { lobbyCode };
    }

    // Transfer host if needed
    if (lobby.state.hostId === playerId) {
      lobby.state.hostId = lobby.state.players[0].id;
    }

    return { lobbyCode };
  }

  setReady(playerId: string, ready: boolean): string | null {
    const lobbyCode = this.playerToLobby.get(playerId);
    if (!lobbyCode) return null;

    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) return null;

    const player = lobby.state.players.find(p => p.id === playerId);
    if (player) player.ready = ready;

    return lobbyCode;
  }

  selectCharacter(playerId: string, characterId: string): string | null {
    const lobbyCode = this.playerToLobby.get(playerId);
    if (!lobbyCode) return null;

    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) return null;

    const player = lobby.state.players.find(p => p.id === playerId);
    if (player) player.selectedCharacter = characterId;

    return lobbyCode;
  }

  banCharacter(lobbyCode: string, characterId: string): boolean {
    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) return false;

    if (!lobby.state.bannedCharacters.includes(characterId)) {
      lobby.state.bannedCharacters.push(characterId);
    }
    return true;
  }

  startGame(playerId: string): {
    success: boolean;
    lobbyCode?: string;
    seed?: number;
    mode?: GameMode;
    error?: string;
  } {
    const lobbyCode = this.playerToLobby.get(playerId);
    if (!lobbyCode) return { success: false, error: 'Not in a lobby' };

    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) return { success: false, error: 'Lobby not found' };
    if (lobby.state.hostId !== playerId) return { success: false, error: 'Only the host can start' };

    const allReady = lobby.state.players.every(p => p.ready);
    if (!allReady) return { success: false, error: 'Not all players are ready' };

    lobby.state.status = 'playing';
    const seed = Math.floor(Math.random() * 2147483647);

    return { success: true, lobbyCode, seed, mode: lobby.state.mode };
  }

  getRoomState(lobbyCode: string): EchoesLobbyState | null {
    return this.lobbies.get(lobbyCode)?.state || null;
  }

  getPlayerLobbyCode(playerId: string): string | undefined {
    return this.playerToLobby.get(playerId);
  }

  getPlayerIdsInLobby(lobbyCode: string): string[] {
    const lobby = this.lobbies.get(lobbyCode);
    return lobby ? lobby.state.players.map(p => p.id) : [];
  }

  markDisconnected(playerId: string): { lobbyCode?: string } {
    const lobbyCode = this.playerToLobby.get(playerId);
    if (!lobbyCode) return {};

    const lobby = this.lobbies.get(lobbyCode);
    if (!lobby) return {};

    const player = lobby.state.players.find(p => p.id === playerId);
    if (player) player.connected = false;

    return { lobbyCode };
  }

  private destroyLobby(lobbyCode: string): void {
    const lobby = this.lobbies.get(lobbyCode);
    if (lobby) {
      if (lobby.countdownTimer) clearTimeout(lobby.countdownTimer);
      if (lobby.gameTimer) clearInterval(lobby.gameTimer);
    }
    this.lobbies.delete(lobbyCode);
  }
}
