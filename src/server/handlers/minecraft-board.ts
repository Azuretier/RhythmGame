import type { ClientMessage, ServerMessage } from '../../types/multiplayer';
import type { HandlerContext } from '../handler-context';

export function handleMinecraftBoardMessage(
  playerId: string,
  message: ClientMessage,
  ctx: HandlerContext,
): boolean {
  const conn = ctx.playerConnections.get(playerId);

  switch (message.type) {
    case 'mc_create_room': {
      const existing = ctx.mcBoardManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldMcCode = existing.code;
        ctx.mcBoardManager.removePlayer(playerId);
        ctx.broadcastToMCBoard(oldMcCode, { type: 'mc_player_left', playerId });
        ctx.sendMCBoardRoomState(oldMcCode);
      }

      const { roomCode, player } = ctx.mcBoardManager.createRoom(
        playerId,
        (message.playerName || 'Player').slice(0, 16),
        message.roomName,
      );

      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, { type: 'mc_room_created', roomCode, playerId: player.id, reconnectToken });
      ctx.sendMCBoardRoomState(roomCode);
      console.log(`[MC_BOARD] Room ${roomCode} created by ${player.name}`);
      return true;
    }

    case 'mc_join_room': {
      const existing = ctx.mcBoardManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldMcCode = existing.code;
        ctx.mcBoardManager.removePlayer(playerId);
        ctx.broadcastToMCBoard(oldMcCode, { type: 'mc_player_left', playerId });
        ctx.sendMCBoardRoomState(oldMcCode);
      }

      const result = ctx.mcBoardManager.joinRoom(message.roomCode, playerId, (message.playerName || 'Player').slice(0, 16));
      if (!result.success || !result.player) {
        ctx.sendError(playerId, result.error || 'Failed to join', 'MC_JOIN_FAILED');
        return true;
      }

      const roomState = ctx.mcBoardManager.getRoomState(message.roomCode.toUpperCase());
      if (!roomState) {
        ctx.sendError(playerId, 'Room not found', 'MC_ROOM_NOT_FOUND');
        return true;
      }

      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'mc_joined_room',
        roomCode: message.roomCode.toUpperCase().trim(),
        playerId: result.player.id,
        roomState,
        reconnectToken,
      });
      ctx.broadcastToMCBoard(message.roomCode.toUpperCase(), { type: 'mc_player_joined', player: result.player }, playerId);
      ctx.sendMCBoardRoomState(message.roomCode.toUpperCase());
      console.log(`[MC_BOARD] ${result.player.name} joined room ${message.roomCode}`);
      return true;
    }

    case 'mc_get_rooms': {
      const rooms = ctx.mcBoardManager.getPublicRooms();
      ctx.sendToPlayer(playerId, { type: 'mc_room_list', rooms });
      return true;
    }

    case 'mc_leave': {
      const result = ctx.mcBoardManager.removePlayer(playerId);
      if (conn?.reconnectToken) {
        ctx.reconnectTokens.delete(conn.reconnectToken);
      }
      if (result.roomCode) {
        ctx.broadcastToMCBoard(result.roomCode, { type: 'mc_player_left', playerId });
        if (result.room) {
          ctx.sendMCBoardRoomState(result.roomCode);
        }
        console.log(`[MC_BOARD] Player ${playerId} left room ${result.roomCode}`);
      }
      return true;
    }

    case 'mc_ready': {
      const result = ctx.mcBoardManager.setPlayerReady(playerId, message.ready);
      if (!result.success) {
        ctx.sendError(playerId, result.error || 'Failed to set ready');
        return true;
      }
      const room = ctx.mcBoardManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.broadcastToMCBoard(room.code, { type: 'mc_player_ready', playerId, ready: message.ready });
        ctx.sendMCBoardRoomState(room.code);
      }
      return true;
    }

    case 'mc_start': {
      const result = ctx.mcBoardManager.startGame(playerId);
      if (!result.success || !result.gameSeed) {
        ctx.sendError(playerId, result.error || 'Failed to start', 'MC_START_FAILED');
        return true;
      }
      const room = ctx.mcBoardManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.sendMCBoardRoomState(room.code);
        ctx.startMCBoardCountdown(room.code, result.gameSeed);
      }
      return true;
    }

    case 'mc_move': {
      ctx.mcBoardManager.handleMove(playerId, message.direction);
      return true;
    }

    case 'mc_mine': {
      ctx.mcBoardManager.handleMine(playerId, message.x, message.y);
      return true;
    }

    case 'mc_cancel_mine': {
      ctx.mcBoardManager.handleCancelMine(playerId);
      return true;
    }

    case 'mc_craft': {
      ctx.mcBoardManager.handleCraft(playerId, message.recipeId);
      return true;
    }

    case 'mc_attack': {
      ctx.mcBoardManager.handleAttack(playerId, message.targetId);
      return true;
    }

    case 'mc_place_block': {
      ctx.mcBoardManager.handlePlaceBlock(playerId, message.x, message.y, message.itemIndex);
      return true;
    }

    case 'mc_eat': {
      ctx.mcBoardManager.handleEat(playerId, message.itemIndex);
      return true;
    }

    case 'mc_select_slot': {
      ctx.mcBoardManager.handleSelectSlot(playerId, message.slot);
      return true;
    }

    case 'mc_chat': {
      ctx.mcBoardManager.handleChat(playerId, message.message);
      return true;
    }

    default:
      return false;
  }
}
