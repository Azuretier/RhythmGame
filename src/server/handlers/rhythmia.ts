import type { ClientMessage, ServerMessage, RelayPayload } from '../../types/multiplayer';
import type { HandlerContext } from '../handler-context';

export function handleRhythmiaMessage(
  playerId: string,
  message: ClientMessage,
  ctx: HandlerContext,
): boolean {
  const conn = ctx.playerConnections.get(playerId);

  switch (message.type) {
    case 'create_room': {
      const existing = ctx.roomManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldRoomCode = existing.code;
        ctx.roomManager.removePlayerFromRoom(playerId);
        ctx.broadcastToRoom(oldRoomCode, { type: 'player_left', playerId, reason: 'left' });
        ctx.sendRoomState(oldRoomCode);
      }

      const { roomCode, player } = ctx.roomManager.createRoom(
        playerId,
        message.playerName,
        message.roomName,
        message.isPublic !== false,
      );

      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, { type: 'room_created', roomCode, playerId: player.id, reconnectToken });
      ctx.sendRoomState(roomCode);
      console.log(`[ROOM] ${roomCode} created by ${player.name}`);
      return true;
    }

    case 'join_room': {
      const existing = ctx.roomManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldRoomCode = existing.code;
        ctx.roomManager.removePlayerFromRoom(playerId);
        ctx.broadcastToRoom(oldRoomCode, { type: 'player_left', playerId, reason: 'left' });
        ctx.sendRoomState(oldRoomCode);
      }

      const result = ctx.roomManager.joinRoom(message.roomCode, playerId, message.playerName);
      if (!result.success || !result.player) {
        ctx.sendError(playerId, result.error || 'Failed to join', 'JOIN_FAILED');
        return true;
      }

      const roomState = ctx.roomManager.getRoomState(message.roomCode);
      if (!roomState) {
        ctx.sendError(playerId, 'Room not found', 'ROOM_NOT_FOUND');
        return true;
      }

      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'joined_room',
        roomCode: message.roomCode.toUpperCase().trim(),
        playerId: result.player.id,
        roomState,
        reconnectToken,
      });
      ctx.broadcastToRoom(message.roomCode, { type: 'player_joined', player: result.player }, playerId);
      ctx.sendRoomState(message.roomCode);
      console.log(`[JOIN] ${result.player.name} joined room ${message.roomCode}`);
      return true;
    }

    case 'reconnect': {
      const tokenData = ctx.reconnectTokens.get(message.reconnectToken);
      if (!tokenData || tokenData.expires < Date.now()) {
        ctx.sendError(playerId, 'Invalid or expired reconnect token', 'RECONNECT_FAILED');
        return true;
      }

      const oldPlayerId = tokenData.playerId;

      const graceTimer = ctx.disconnectTimers.get(oldPlayerId);
      if (graceTimer) {
        clearTimeout(graceTimer);
        ctx.disconnectTimers.delete(oldPlayerId);
      }

      const room = ctx.roomManager.getRoomByPlayerId(oldPlayerId);
      if (!room) {
        // Check MC Board rooms as fallback
        const mcRoom = ctx.mcBoardManager.getRoomByPlayerId(oldPlayerId);
        if (mcRoom) {
          ctx.mcBoardManager.transferPlayer(oldPlayerId, playerId);
          ctx.mcBoardManager.markReconnected(playerId);
          ctx.reconnectTokens.delete(message.reconnectToken);

          const newToken = ctx.issueReconnectToken(playerId);
          const mcRoomState = ctx.mcBoardManager.getRoomState(mcRoom.code);
          ctx.sendToPlayer(playerId, {
            type: 'mc_reconnected',
            roomCode: mcRoom.code,
            playerId,
            roomState: mcRoomState,
            reconnectToken: newToken,
            status: mcRoom.status,
          } as unknown as ServerMessage);
          ctx.sendMCBoardRoomState(mcRoom.code);
          console.log(`[MC_BOARD] Player reconnected to room ${mcRoom.code}`);
          return true;
        }

        // Check Minecraft World rooms as fallback
        const mwRoom = ctx.mwManager.getRoomByPlayerId(oldPlayerId);
        if (mwRoom) {
          ctx.mwManager.transferPlayer(oldPlayerId, playerId);
          ctx.mwManager.markReconnected(playerId);
          ctx.reconnectTokens.delete(message.reconnectToken);

          const newToken = ctx.issueReconnectToken(playerId);
          const mwRoomState = ctx.mwManager.getRoomState(mwRoom.code);
          ctx.sendToPlayer(playerId, {
            type: 'mw_reconnected',
            roomCode: mwRoom.code,
            playerId,
            roomState: mwRoomState,
            reconnectToken: newToken,
          } as unknown as ServerMessage);
          ctx.sendMWRoomState(mwRoom.code);
          console.log(`[MW] Player reconnected to room ${mwRoom.code}`);
          return true;
        }

        ctx.sendError(playerId, 'Room no longer exists', 'ROOM_GONE');
        ctx.reconnectTokens.delete(message.reconnectToken);
        return true;
      }

      ctx.roomManager.transferPlayer(oldPlayerId, playerId);
      ctx.roomManager.reconnectPlayer(playerId);
      ctx.reconnectTokens.delete(message.reconnectToken);

      const newToken = ctx.issueReconnectToken(playerId);
      const roomState = ctx.roomManager.getRoomState(room.code);
      ctx.sendToPlayer(playerId, {
        type: 'reconnected',
        roomCode: room.code,
        playerId,
        roomState: roomState!,
        reconnectToken: newToken,
      });
      ctx.sendRoomState(room.code);
      console.log(`[RECONNECT] Player reconnected to room ${room.code}`);
      return true;
    }

    case 'leave_room': {
      const graceTimer = ctx.disconnectTimers.get(playerId);
      if (graceTimer) {
        clearTimeout(graceTimer);
        ctx.disconnectTimers.delete(playerId);
      }

      const result = ctx.roomManager.removePlayerFromRoom(playerId);

      if (conn?.reconnectToken) {
        ctx.reconnectTokens.delete(conn.reconnectToken);
      }

      if (result.roomCode) {
        ctx.broadcastToRoom(result.roomCode, { type: 'player_left', playerId, reason: 'left' });
        if (result.room) {
          ctx.sendRoomState(result.roomCode);
        }
        console.log(`[LEAVE] Player ${playerId} left room ${result.roomCode}`);
      }
      return true;
    }

    case 'set_ready': {
      const result = ctx.roomManager.setPlayerReady(playerId, message.ready);
      if (!result.success) {
        ctx.sendError(playerId, result.error || 'Failed to set ready');
        return true;
      }
      const room = ctx.roomManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.broadcastToRoom(room.code, { type: 'player_ready', playerId, ready: message.ready });
        ctx.sendRoomState(room.code);
      }
      return true;
    }

    case 'start_game': {
      const result = ctx.roomManager.startGame(playerId);
      if (!result.success || !result.gameSeed) {
        ctx.sendError(playerId, result.error || 'Failed to start game', 'START_FAILED');
        return true;
      }
      const room = ctx.roomManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.sendRoomState(room.code);
        ctx.startCountdown(room.code, result.gameSeed);
      }
      return true;
    }

    case 'get_rooms': {
      const rooms = ctx.roomManager.getPublicRooms();
      ctx.sendToPlayer(playerId, { type: 'room_list', rooms });
      return true;
    }

    case 'relay': {
      const room = ctx.roomManager.getRoomByPlayerId(playerId);
      if (!room) return true;
      ctx.broadcastToRoom(
        room.code,
        { type: 'relayed', fromPlayerId: playerId, payload: message.payload as RelayPayload },
        playerId,
      );
      return true;
    }

    case 'rematch': {
      const room = ctx.roomManager.getRoomByPlayerId(playerId);
      if (!room) return true;
      if (ctx.roomManager.resetRoom(room.code)) {
        ctx.broadcastToRoom(room.code, { type: 'rematch_started' });
        ctx.sendRoomState(room.code);
        console.log(`[REMATCH] Room ${room.code} reset for rematch`);
      }
      return true;
    }

    case 'queue_ranked': {
      const existing = ctx.roomManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldRoomCode = existing.code;
        ctx.roomManager.removePlayerFromRoom(playerId);
        ctx.broadcastToRoom(oldRoomCode, { type: 'player_left', playerId, reason: 'left' });
        ctx.sendRoomState(oldRoomCode);
      }

      ctx.rankedQueue.delete(playerId);
      ctx.clearRankedTimer(playerId);

      const queueEntry: { playerId: string; playerName: string; rankPoints: number; queuedAt: number } = {
        playerId,
        playerName: (message.playerName || 'Player').slice(0, 20),
        rankPoints: typeof message.rankPoints === 'number' ? message.rankPoints : 0,
        queuedAt: Date.now(),
      };
      ctx.rankedQueue.set(playerId, queueEntry);

      ctx.sendToPlayer(playerId, { type: 'ranked_queued', position: ctx.rankedQueue.size });
      console.log(`[RANKED] ${queueEntry.playerName} queued (${queueEntry.rankPoints} pts, ${ctx.rankedQueue.size} in queue)`);

      if (!ctx.tryRankedMatch(playerId)) {
        const timer = setTimeout(() => {
          ctx.rankedTimers.delete(playerId);
          ctx.clearRankedRetryInterval(playerId);
          if (ctx.rankedQueue.has(playerId) && !ctx.tryRankedMatch(playerId)) {
            ctx.spawnAIMatch(playerId);
          }
        }, ctx.RANKED_MATCH_TIMEOUT);
        ctx.rankedTimers.set(playerId, timer);

        ctx.clearRankedRetryInterval(playerId);
        const retryInterval = setInterval(() => {
          if (!ctx.rankedQueue.has(playerId)) {
            ctx.clearRankedRetryInterval(playerId);
            return;
          }
          if (ctx.tryRankedMatch(playerId)) {
            ctx.clearRankedRetryInterval(playerId);
          }
        }, 1000);
        ctx.rankedRetryIntervals.set(playerId, retryInterval);
      }
      return true;
    }

    case 'cancel_ranked': {
      ctx.rankedQueue.delete(playerId);
      ctx.clearRankedTimer(playerId);
      console.log(`[RANKED] ${playerId} cancelled queue`);
      return true;
    }

    default:
      return false;
  }
}
