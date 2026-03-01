import type { ClientMessage, ServerMessage } from '../../types/multiplayer';
import type { HandlerContext } from '../handler-context';

export function handleMinecraftWorldMessage(
  playerId: string,
  message: ClientMessage,
  ctx: HandlerContext,
): boolean {
  const conn = ctx.playerConnections.get(playerId);

  switch (message.type) {
    case 'mw_create_room': {
      const existing = ctx.mwManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldCode = existing.code;
        ctx.mwManager.removePlayer(playerId);
        ctx.broadcastToMW(oldCode, { type: 'mw_player_left', playerId } as unknown as ServerMessage);
        ctx.sendMWRoomState(oldCode);
      }

      const { roomCode, player } = ctx.mwManager.createRoom(
        playerId,
        (message.playerName || 'Player').slice(0, 16),
        message.roomName,
      );

      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'mw_room_created',
        roomCode,
        playerId: player.id,
        reconnectToken,
      } as unknown as ServerMessage);
      ctx.sendMWRoomState(roomCode);
      console.log(`[MW] Room ${roomCode} created by ${player.name}`);
      return true;
    }

    case 'mw_join_room': {
      const existing = ctx.mwManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldCode = existing.code;
        ctx.mwManager.removePlayer(playerId);
        ctx.broadcastToMW(oldCode, { type: 'mw_player_left', playerId } as unknown as ServerMessage);
        ctx.sendMWRoomState(oldCode);
      }

      const result = ctx.mwManager.joinRoom(message.roomCode, playerId, (message.playerName || 'Player').slice(0, 16));
      if (!result.success || !result.player) {
        ctx.sendError(playerId, result.error || 'Failed to join', 'MW_JOIN_FAILED');
        return true;
      }

      const roomState = ctx.mwManager.getRoomState(message.roomCode.toUpperCase());
      if (!roomState) {
        ctx.sendError(playerId, 'Room not found', 'MW_ROOM_NOT_FOUND');
        return true;
      }

      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'mw_joined_room',
        roomCode: message.roomCode.toUpperCase().trim(),
        playerId: result.player.id,
        roomState,
        reconnectToken,
      } as unknown as ServerMessage);
      ctx.broadcastToMW(message.roomCode.toUpperCase(), {
        type: 'mw_player_joined',
        player: result.player,
      } as unknown as ServerMessage, playerId);
      ctx.sendMWRoomState(message.roomCode.toUpperCase());
      console.log(`[MW] ${result.player.name} joined room ${message.roomCode}`);
      return true;
    }

    case 'mw_get_rooms': {
      const rooms = ctx.mwManager.getPublicRooms();
      ctx.sendToPlayer(playerId, { type: 'mw_room_list', rooms } as unknown as ServerMessage);
      return true;
    }

    case 'mw_leave': {
      const result = ctx.mwManager.removePlayer(playerId);
      if (conn?.reconnectToken) {
        ctx.reconnectTokens.delete(conn.reconnectToken);
      }
      if (result.roomCode) {
        ctx.broadcastToMW(result.roomCode, { type: 'mw_player_left', playerId } as unknown as ServerMessage);
        if (result.room) {
          ctx.sendMWRoomState(result.roomCode);
        }
        console.log(`[MW] Player ${playerId} left room ${result.roomCode}`);
      }
      return true;
    }

    case 'mw_ready': {
      const result = ctx.mwManager.setPlayerReady(playerId, message.ready);
      if (!result.success) {
        ctx.sendError(playerId, result.error || 'Failed to set ready');
        return true;
      }
      const room = ctx.mwManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.broadcastToMW(room.code, { type: 'mw_player_ready', playerId, ready: message.ready } as unknown as ServerMessage);
        ctx.sendMWRoomState(room.code);
      }
      return true;
    }

    case 'mw_start': {
      const result = ctx.mwManager.startGame(playerId);
      if (!result.success || !result.gameSeed) {
        ctx.sendError(playerId, result.error || 'Failed to start', 'MW_START_FAILED');
        return true;
      }
      const room = ctx.mwManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.sendMWRoomState(room.code);
        ctx.startMWCountdown(room.code, result.gameSeed);
      }
      return true;
    }

    case 'mw_position': {
      ctx.mwManager.handlePosition(playerId, message.x, message.y, message.z, message.rx, message.ry);
      return true;
    }

    case 'mw_chat': {
      ctx.mwManager.handleChat(playerId, message.message);
      return true;
    }

    default:
      return false;
  }
}
