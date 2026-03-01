import type { ClientMessage, ServerMessage } from '../../types/multiplayer';
import type { HandlerContext } from '../handler-context';

export function handleFPSArenaMessage(
  playerId: string,
  message: ClientMessage,
  ctx: HandlerContext,
): boolean {
  const conn = ctx.playerConnections.get(playerId);

  switch (message.type) {
    case 'fps_create_room': {
      ctx.fpsManager.removePlayer(playerId);
      const { roomCode, player } = ctx.fpsManager.createRoom(playerId, message.playerName, message.roomName);
      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'fps_room_created',
        roomCode,
        playerId: player.id,
        reconnectToken,
      } as unknown as ServerMessage);
      ctx.sendFPSRoomState(roomCode);
      return true;
    }

    case 'fps_join_room': {
      const result = ctx.fpsManager.joinRoom(message.roomCode, playerId, message.playerName);
      if (!result.success || !result.player) {
        ctx.sendError(playerId, result.error || 'Failed to join', 'FPS_JOIN_FAILED');
        return true;
      }
      const roomState = ctx.fpsManager.getRoomState(message.roomCode.toUpperCase().trim());
      if (!roomState) {
        ctx.sendError(playerId, 'Room not found', 'FPS_ROOM_NOT_FOUND');
        return true;
      }
      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'fps_joined_room',
        roomCode: message.roomCode.toUpperCase().trim(),
        playerId: result.player.id,
        roomState,
        reconnectToken,
      } as unknown as ServerMessage);
      ctx.broadcastToFPS(message.roomCode.toUpperCase(), {
        type: 'fps_player_joined',
        player: result.player,
      } as unknown as ServerMessage, playerId);
      ctx.sendFPSRoomState(message.roomCode.toUpperCase());
      return true;
    }

    case 'fps_get_rooms': {
      const rooms = ctx.fpsManager.getPublicRooms();
      ctx.sendToPlayer(playerId, { type: 'fps_room_list', rooms: rooms } as unknown as ServerMessage);
      return true;
    }

    case 'fps_leave': {
      const result = ctx.fpsManager.removePlayer(playerId);
      if (conn?.reconnectToken) {
        ctx.reconnectTokens.delete(conn.reconnectToken);
      }
      if (result.roomCode) {
        ctx.broadcastToFPS(result.roomCode, { type: 'fps_player_left', playerId } as unknown as ServerMessage);
        if (result.room) {
          ctx.sendFPSRoomState(result.roomCode);
        }
      }
      return true;
    }

    case 'fps_ready': {
      const result = ctx.fpsManager.setPlayerReady(playerId, message.ready);
      if (!result.success) {
        ctx.sendError(playerId, result.error || 'Failed to set ready');
        return true;
      }
      const room = ctx.fpsManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.broadcastToFPS(room.code, {
          type: 'fps_player_ready', playerId, ready: message.ready,
        } as unknown as ServerMessage);
        ctx.sendFPSRoomState(room.code);
      }
      return true;
    }

    case 'fps_start': {
      const result = ctx.fpsManager.startGame(playerId);
      if (!result.success || !result.gameSeed) {
        ctx.sendError(playerId, result.error || 'Failed to start', 'FPS_START_FAILED');
        return true;
      }
      const room = ctx.fpsManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.sendFPSRoomState(room.code);
        ctx.startFPSCountdown(room.code, result.gameSeed);
      }
      return true;
    }

    case 'fps_position': {
      ctx.fpsManager.handlePosition(playerId, message.x, message.y, message.z, message.rx, message.ry, message.weaponId, message.health);
      return true;
    }

    case 'fps_shoot': {
      ctx.fpsManager.handleShoot(playerId, message.x, message.y, message.z, message.dx, message.dy, message.dz, message.weaponId);
      return true;
    }

    case 'fps_hit': {
      ctx.fpsManager.handleHit(playerId, message.targetId, message.damage, message.weaponId, message.headshot);
      return true;
    }

    case 'fps_died': {
      ctx.fpsManager.handleDied(playerId, message.killerId, message.weaponId);
      return true;
    }

    case 'fps_respawn': {
      ctx.fpsManager.handleRespawn(playerId);
      return true;
    }

    case 'fps_chat': {
      ctx.fpsManager.handleChat(playerId, message.message);
      return true;
    }

    default:
      return false;
  }
}
