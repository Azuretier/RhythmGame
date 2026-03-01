import type { ClientMessage, ServerMessage } from '../../types/multiplayer';
import { ARENA_QUEUE_TIMEOUT } from '../../types/arena';
import type { HandlerContext } from '../handler-context';

export function handleArenaMessage(
  playerId: string,
  message: ClientMessage,
  ctx: HandlerContext,
): boolean {
  const conn = ctx.playerConnections.get(playerId);

  switch (message.type) {
    case 'create_arena': {
      const existing = ctx.arenaManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldArenaCode = existing.code;
        ctx.arenaManager.removePlayer(playerId);
        ctx.broadcastToArena(oldArenaCode, { type: 'arena_player_left', playerId });
        ctx.sendArenaState(oldArenaCode);
      }

      const { roomCode, player } = ctx.arenaManager.createRoom(playerId, message.playerName, message.roomName);
      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'arena_created',
        arenaCode: roomCode,
        playerId: player.id,
        reconnectToken,
      } as ServerMessage);
      ctx.sendArenaState(roomCode);
      console.log(`[ARENA] ${roomCode} created by ${player.name}`);
      return true;
    }

    case 'join_arena': {
      const existing = ctx.arenaManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldArenaCode = existing.code;
        ctx.arenaManager.removePlayer(playerId);
        ctx.broadcastToArena(oldArenaCode, { type: 'arena_player_left', playerId });
        ctx.sendArenaState(oldArenaCode);
      }

      const result = ctx.arenaManager.joinRoom(message.arenaCode, playerId, message.playerName);
      if (!result.success || !result.player) {
        ctx.sendError(playerId, result.error || 'Failed to join arena', 'ARENA_JOIN_FAILED');
        return true;
      }

      const arenaState = ctx.arenaManager.getRoomState(message.arenaCode);
      if (!arenaState) {
        ctx.sendError(playerId, 'Arena not found', 'ARENA_NOT_FOUND');
        return true;
      }

      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'arena_joined',
        arenaCode: message.arenaCode.toUpperCase().trim(),
        playerId: result.player.id,
        arenaState,
        reconnectToken,
      });
      ctx.broadcastToArena(message.arenaCode, { type: 'arena_player_joined', player: result.player }, playerId);
      ctx.sendArenaState(message.arenaCode);
      console.log(`[ARENA] ${result.player.name} joined arena ${message.arenaCode}`);
      return true;
    }

    case 'queue_arena': {
      const existing = ctx.arenaManager.getRoomByPlayerId(playerId);
      if (existing) {
        const oldArenaCode = existing.code;
        ctx.arenaManager.removePlayer(playerId);
        ctx.broadcastToArena(oldArenaCode, { type: 'arena_player_left', playerId });
        ctx.sendArenaState(oldArenaCode);
      }

      ctx.arenaQueue.delete(playerId);
      ctx.clearArenaTimer(playerId);

      const entry = {
        playerId,
        playerName: (message.playerName || 'Player').slice(0, 20),
        queuedAt: Date.now(),
      };
      ctx.arenaQueue.set(playerId, entry);

      ctx.sendToPlayer(playerId, {
        type: 'arena_queued',
        position: ctx.arenaQueue.size,
        queueSize: ctx.arenaQueue.size,
      });

      console.log(`[ARENA] ${entry.playerName} queued (${ctx.arenaQueue.size} in queue)`);

      if (!ctx.tryFormArenaMatch()) {
        const timer = setTimeout(() => {
          ctx.arenaQueueTimers.delete(playerId);
          if (ctx.arenaQueue.has(playerId)) {
            ctx.tryFormArenaMatch();
          }
        }, ARENA_QUEUE_TIMEOUT);
        ctx.arenaQueueTimers.set(playerId, timer);

        const retryInterval = setInterval(() => {
          if (!ctx.arenaQueue.has(playerId)) {
            clearInterval(retryInterval);
            return;
          }
          if (ctx.tryFormArenaMatch()) {
            clearInterval(retryInterval);
          }
        }, 3000);

        setTimeout(() => clearInterval(retryInterval), ARENA_QUEUE_TIMEOUT + 1000);
      }
      return true;
    }

    case 'cancel_arena_queue': {
      ctx.arenaQueue.delete(playerId);
      ctx.clearArenaTimer(playerId);
      console.log(`[ARENA] ${playerId} cancelled arena queue`);
      return true;
    }

    case 'arena_ready': {
      const result = ctx.arenaManager.setPlayerReady(playerId, message.ready);
      if (!result.success) {
        ctx.sendError(playerId, result.error || 'Failed to set ready');
        return true;
      }
      const room = ctx.arenaManager.getRoomByPlayerId(playerId);
      if (room) ctx.sendArenaState(room.code);
      return true;
    }

    case 'arena_start': {
      const result = ctx.arenaManager.startGame(playerId);
      if (!result.success || !result.gameSeed) {
        ctx.sendError(playerId, result.error || 'Failed to start arena', 'ARENA_START_FAILED');
        return true;
      }
      const room = ctx.arenaManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.sendArenaState(room.code);
        ctx.startArenaCountdown(room.code, result.gameSeed);
      }
      return true;
    }

    case 'arena_action': {
      ctx.arenaManager.handleAction(playerId, message.action);
      return true;
    }

    case 'arena_relay': {
      ctx.arenaManager.handleRelay(playerId, message.payload);
      return true;
    }

    case 'arena_use_powerup': {
      ctx.arenaManager.handleUsePowerUp(playerId, message.targetId);
      return true;
    }

    case 'arena_emote': {
      ctx.arenaManager.handleEmote(playerId, message.emote);
      return true;
    }

    case 'arena_set_target': {
      ctx.arenaManager.handleSetTarget(playerId, message.targetMode, message.targetId);
      return true;
    }

    case 'arena_leave': {
      const result = ctx.arenaManager.removePlayer(playerId);
      if (conn?.reconnectToken) {
        ctx.reconnectTokens.delete(conn.reconnectToken);
      }
      if (result.roomCode) {
        ctx.broadcastToArena(result.roomCode, { type: 'arena_player_left', playerId });
        if (result.room) {
          ctx.sendArenaState(result.roomCode);
        }
        console.log(`[ARENA] Player ${playerId} left arena ${result.roomCode}`);
      }
      return true;
    }

    default:
      return false;
  }
}
