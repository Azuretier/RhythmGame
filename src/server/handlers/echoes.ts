import type { ClientMessage, ServerMessage } from '../../types/multiplayer';
import type { EoEClientMessage } from '../../types/echoes';
import { isEoEMessage } from '../../lib/echoes/EoEManager';
import type { HandlerContext } from '../handler-context';

export function handleEoEMessage(
  playerId: string,
  message: ClientMessage,
  ctx: HandlerContext,
): boolean {
  if (!isEoEMessage(message.type)) return false;

  const conn = ctx.playerConnections.get(playerId);
  const eoeMessage = message as unknown as EoEClientMessage;

  if (eoeMessage.type === 'eoe_set_profile') {
    // Profile is set via the main set_profile handler
    return true;
  }

  if (eoeMessage.type === 'eoe_create_party') {
    const { roomCode } = ctx.eoeManager.createRoom(
      playerId,
      conn?.profileName || 'Player',
      conn?.profileIcon || '',
      eoeMessage.gameMode,
      eoeMessage.maxSize
    );
    ctx.sendToPlayer(playerId, {
      type: 'eoe_party_created',
      partyCode: roomCode,
      party: {
        id: roomCode,
        members: [{
          playerId,
          playerName: conn?.profileName || 'Player',
          character: null as never,
          role: 'leader',
          isReady: false,
          isOnline: true,
        }],
        maxSize: eoeMessage.maxSize || 4,
        currentActivity: eoeMessage.gameMode,
        isPublic: true,
      },
    } as unknown as ServerMessage);
    return true;
  }

  if (eoeMessage.type === 'eoe_join_party') {
    const result = ctx.eoeManager.joinRoom(
      eoeMessage.partyCode,
      playerId,
      conn?.profileName || 'Player',
      conn?.profileIcon || ''
    );
    if (!result.success) {
      ctx.sendToPlayer(playerId, {
        type: 'eoe_error',
        code: 'JOIN_FAILED',
        message: result.error || 'Failed to join party',
      } as unknown as ServerMessage);
    } else if (result.room) {
      ctx.sendToPlayer(playerId, {
        type: 'eoe_party_joined',
        party: {
          id: result.room.id,
          members: [...result.room.players.entries()].map(([id, p]) => ({
            playerId: id,
            playerName: p.name,
            character: p.character!,
            role: p.isHost ? 'leader' : 'member',
            isReady: p.isReady,
            isOnline: true,
          })),
          maxSize: result.room.maxPlayers,
          currentActivity: result.room.gameMode,
          isPublic: true,
        },
      } as unknown as ServerMessage);
    }
    return true;
  }

  if (eoeMessage.type === 'eoe_queue') {
    ctx.eoeManager.queuePlayer(
      playerId,
      conn?.profileName || 'Player',
      conn?.profileIcon || '',
      eoeMessage.gameMode
    );
    return true;
  }

  // All other EoE messages go through the manager's handleMessage
  ctx.eoeManager.handleMessage(playerId, eoeMessage);
  return true;
}
