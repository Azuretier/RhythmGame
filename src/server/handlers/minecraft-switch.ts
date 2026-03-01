// =============================================================================
// Minecraft Switch Edition — WebSocket Message Handler
// Handles all ms_* prefixed messages from clients.
// =============================================================================

import type { ClientMessage, ServerMessage } from '../../types/multiplayer';
import type { HandlerContext } from '../handler-context';

export function handleMinecraftSwitchMessage(
  playerId: string,
  message: ClientMessage,
  ctx: HandlerContext,
): boolean {
  const conn = ctx.playerConnections.get(playerId);

  switch (message.type) {
    // =========================================================================
    // Room Management
    // =========================================================================

    case 'ms_create_room': {
      // Remove from existing room if any
      const existing = ctx.mcsManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldCode = existing.code;
        ctx.mcsManager.removePlayer(playerId);
        ctx.broadcastToMCS(oldCode, { type: 'ms_player_left', playerId } as unknown as ServerMessage);
        ctx.sendMCSRoomState(oldCode);
      }

      const { roomCode, player } = ctx.mcsManager.createRoom(
        playerId,
        (message.playerName || 'Player').slice(0, 16),
        message.roomName,
        {
          gameMode: message.gameMode,
          difficulty: message.difficulty,
          worldType: message.worldType,
        },
      );

      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'ms_room_created',
        roomCode,
        playerId: player.id,
        reconnectToken,
      } as unknown as ServerMessage);
      ctx.sendMCSRoomState(roomCode);
      console.log(`[MCS] Room ${roomCode} created by ${player.name}`);
      return true;
    }

    case 'ms_join_room': {
      // Remove from existing room if any
      const existing = ctx.mcsManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldCode = existing.code;
        ctx.mcsManager.removePlayer(playerId);
        ctx.broadcastToMCS(oldCode, { type: 'ms_player_left', playerId } as unknown as ServerMessage);
        ctx.sendMCSRoomState(oldCode);
      }

      const result = ctx.mcsManager.joinRoom(
        message.roomCode,
        playerId,
        (message.playerName || 'Player').slice(0, 16),
      );

      if (!result.success || !result.player) {
        ctx.sendError(playerId, result.error || 'Failed to join', 'MCS_JOIN_FAILED');
        return true;
      }

      const roomState = ctx.mcsManager.getRoomState(message.roomCode.toUpperCase().trim());
      if (!roomState) {
        ctx.sendError(playerId, 'Room not found', 'MCS_ROOM_NOT_FOUND');
        return true;
      }

      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'ms_joined_room',
        roomCode: message.roomCode.toUpperCase().trim(),
        playerId: result.player.id,
        roomState,
        reconnectToken,
      } as unknown as ServerMessage);

      ctx.broadcastToMCS(message.roomCode.toUpperCase().trim(), {
        type: 'ms_player_joined',
        player: result.player,
      } as unknown as ServerMessage, playerId);

      ctx.sendMCSRoomState(message.roomCode.toUpperCase().trim());
      console.log(`[MCS] ${result.player.name} joined room ${message.roomCode}`);
      return true;
    }

    case 'ms_get_rooms': {
      const rooms = ctx.mcsManager.getPublicRooms();
      ctx.sendToPlayer(playerId, { type: 'ms_room_list', rooms } as unknown as ServerMessage);
      return true;
    }

    case 'ms_leave': {
      const result = ctx.mcsManager.removePlayer(playerId);
      if (conn?.reconnectToken) {
        ctx.reconnectTokens.delete(conn.reconnectToken);
      }
      if (result.roomCode) {
        ctx.broadcastToMCS(result.roomCode, { type: 'ms_player_left', playerId } as unknown as ServerMessage);
        if (result.room) {
          ctx.sendMCSRoomState(result.roomCode);
        }
        console.log(`[MCS] Player ${playerId} left room ${result.roomCode}`);
      }
      return true;
    }

    // =========================================================================
    // Lobby Actions
    // =========================================================================

    case 'ms_ready': {
      const result = ctx.mcsManager.setPlayerReady(playerId, message.ready);
      if (!result.success) {
        ctx.sendError(playerId, result.error || 'Failed to set ready');
        return true;
      }
      const room = ctx.mcsManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.broadcastToMCS(room.code, {
          type: 'ms_player_ready',
          playerId,
          ready: message.ready,
        } as unknown as ServerMessage);
        ctx.sendMCSRoomState(room.code);
      }
      return true;
    }

    case 'ms_start': {
      const result = ctx.mcsManager.startGame(playerId);
      if (!result.success || !result.gameSeed) {
        ctx.sendError(playerId, result.error || 'Failed to start', 'MCS_START_FAILED');
        return true;
      }
      const room = ctx.mcsManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.sendMCSRoomState(room.code);
        ctx.startMCSCountdown(room.code, result.gameSeed);
      }
      return true;
    }

    // =========================================================================
    // In-Game: Position & Movement
    // =========================================================================

    case 'ms_position': {
      ctx.mcsManager.handlePlayerPosition(
        playerId,
        message.x, message.y, message.z,
        message.yaw, message.pitch,
        message.onGround,
      );
      return true;
    }

    case 'ms_sprint': {
      ctx.mcsManager.handleSprint(playerId, message.sprinting);
      return true;
    }

    case 'ms_sneak': {
      ctx.mcsManager.handleSneak(playerId, message.sneaking);
      return true;
    }

    // =========================================================================
    // In-Game: Block Interaction
    // =========================================================================

    case 'ms_break_block': {
      ctx.mcsManager.handleBlockBreak(playerId, message.x, message.y, message.z);
      return true;
    }

    case 'ms_place_block': {
      ctx.mcsManager.handleBlockPlace(
        playerId,
        message.x, message.y, message.z,
        message.blockId, message.face,
      );
      return true;
    }

    case 'ms_start_breaking': {
      // Client started breaking a block — server can track progress
      // For now, acknowledge and let the client handle animation
      return true;
    }

    case 'ms_cancel_breaking': {
      // Client cancelled block breaking
      return true;
    }

    case 'ms_interact_block': {
      // Block interaction (open chest, use crafting table, etc.)
      // Handled client-side for now
      return true;
    }

    // =========================================================================
    // In-Game: Inventory & Items
    // =========================================================================

    case 'ms_select_slot': {
      ctx.mcsManager.handleSelectSlot(playerId, message.slot);
      return true;
    }

    // =========================================================================
    // In-Game: Chat
    // =========================================================================

    case 'ms_chat': {
      ctx.mcsManager.handleChat(playerId, message.message);
      return true;
    }

    // =========================================================================
    // Settings (Host Only)
    // =========================================================================

    case 'ms_change_gamemode': {
      ctx.mcsManager.handleGameModeChange(playerId, message.gameMode);
      return true;
    }

    case 'ms_change_difficulty': {
      ctx.mcsManager.handleDifficultyChange(playerId, message.difficulty);
      return true;
    }

    default:
      return false;
  }
}
