import type { ClientMessage, ServerMessage } from '../../types/multiplayer';
import type { WFClientMessage } from '../../types/warfront';
import type { WarfrontManager } from '../../lib/warfront/WarfrontManager';
import type { HandlerContext } from '../handler-context';

// Extended context that includes the warfront manager
export interface WarfrontHandlerContext extends HandlerContext {
  wfManager: WarfrontManager;
  broadcastToWF: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void;
  sendWFRoomState: (roomCode: string) => void;
}

export function handleWarfrontMessage(
  playerId: string,
  message: ClientMessage,
  ctx: WarfrontHandlerContext,
): boolean {
  const wfMsg = message as unknown as WFClientMessage;

  switch (wfMsg.type) {
    case 'wf_create_room': {
      ctx.wfManager.removePlayer(playerId);
      const { roomCode, player } = ctx.wfManager.createRoom(playerId, wfMsg.playerName, wfMsg.roomName, wfMsg.mode);
      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'wf_room_created',
        roomCode,
        playerId: player.id,
        reconnectToken,
      } as unknown as ServerMessage);
      ctx.sendWFRoomState(roomCode);
      return true;
    }

    case 'wf_join_room': {
      const result = ctx.wfManager.joinRoom(wfMsg.roomCode, playerId, wfMsg.playerName);
      if (!result.success || !result.player) {
        ctx.sendError(playerId, result.error || 'Failed to join', 'WF_JOIN_FAILED');
        return true;
      }
      const roomState = ctx.wfManager.getRoomState(wfMsg.roomCode.toUpperCase().trim());
      if (!roomState) {
        ctx.sendError(playerId, 'Room not found', 'WF_ROOM_NOT_FOUND');
        return true;
      }
      const reconnectToken = ctx.issueReconnectToken(playerId);
      ctx.sendToPlayer(playerId, {
        type: 'wf_joined_room',
        roomCode: wfMsg.roomCode.toUpperCase().trim(),
        playerId: result.player.id,
        roomState,
        reconnectToken,
      } as unknown as ServerMessage);
      ctx.broadcastToWF(wfMsg.roomCode.toUpperCase(), {
        type: 'wf_player_joined',
        player: result.player,
      } as unknown as ServerMessage, playerId);
      ctx.sendWFRoomState(wfMsg.roomCode.toUpperCase());
      return true;
    }

    case 'wf_get_rooms': {
      const rooms = ctx.wfManager.getPublicRooms();
      ctx.sendToPlayer(playerId, { type: 'wf_room_list', rooms } as unknown as ServerMessage);
      return true;
    }

    case 'wf_leave': {
      const result = ctx.wfManager.removePlayer(playerId);
      const conn = ctx.playerConnections.get(playerId);
      if (conn?.reconnectToken) {
        ctx.reconnectTokens.delete(conn.reconnectToken);
      }
      if (result.roomCode) {
        ctx.broadcastToWF(result.roomCode, { type: 'wf_player_left', playerId } as unknown as ServerMessage);
        if (result.room) {
          ctx.sendWFRoomState(result.roomCode);
        }
      }
      return true;
    }

    case 'wf_ready': {
      const readyResult = ctx.wfManager.setPlayerReady(playerId, wfMsg.ready);
      if (!readyResult.success) {
        ctx.sendError(playerId, readyResult.error || 'Failed to set ready');
        return true;
      }
      const room = ctx.wfManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.broadcastToWF(room.code, {
          type: 'wf_player_ready', playerId, ready: wfMsg.ready,
        } as unknown as ServerMessage);
        ctx.sendWFRoomState(room.code);
      }
      return true;
    }

    case 'wf_select_role': {
      const roleResult = ctx.wfManager.selectRole(playerId, wfMsg.role);
      if (!roleResult.success) {
        ctx.sendError(playerId, roleResult.error || 'Failed to select role');
        return true;
      }
      const room = ctx.wfManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.broadcastToWF(room.code, {
          type: 'wf_role_selected', playerId, role: wfMsg.role,
        } as unknown as ServerMessage);
        ctx.sendWFRoomState(room.code);
      }
      return true;
    }

    case 'wf_select_team': {
      const teamResult = ctx.wfManager.selectTeam(playerId, wfMsg.teamId);
      if (!teamResult.success) {
        ctx.sendError(playerId, teamResult.error || 'Failed to select team');
        return true;
      }
      const room = ctx.wfManager.getRoomByPlayerId(playerId);
      if (room) {
        ctx.broadcastToWF(room.code, {
          type: 'wf_team_selected', playerId, teamId: wfMsg.teamId,
        } as unknown as ServerMessage);
        ctx.sendWFRoomState(room.code);
      }
      return true;
    }

    case 'wf_start': {
      const startResult = ctx.wfManager.startGame(playerId);
      if (!startResult.success || !startResult.gameSeed) {
        ctx.sendError(playerId, startResult.error || 'Failed to start', 'WF_START_FAILED');
        return true;
      }
      const room = ctx.wfManager.getRoomByPlayerId(playerId);
      if (room) {
        // Send countdown
        let count = 5;
        const tick = () => {
          if (count > 0) {
            ctx.broadcastToWF(room.code, { type: 'wf_countdown', count } as unknown as ServerMessage);
            count--;
            setTimeout(tick, 1000);
          } else {
            ctx.wfManager.beginPlaying(room.code);
            const roomState = ctx.wfManager.getRoomState(room.code);
            if (roomState) {
              ctx.broadcastToWF(room.code, {
                type: 'wf_game_started',
                seed: startResult.gameSeed,
                territories: roomState.territories,
                teams: roomState.teams,
              } as unknown as ServerMessage);
            }
          }
        };
        tick();
      }
      return true;
    }

    case 'wf_chat': {
      ctx.wfManager.handleChat(playerId, wfMsg.message);
      return true;
    }

    // Defender messages
    case 'wf_defender_action': {
      ctx.wfManager.handleDefenderAction(playerId, wfMsg.actionType, wfMsg.value);
      return true;
    }

    case 'wf_defender_board': {
      // Board relay is visual-only, broadcast to team
      return true;
    }

    // Soldier messages
    case 'wf_soldier_position': {
      ctx.wfManager.handleSoldierPosition(playerId, wfMsg.x, wfMsg.y, wfMsg.z, wfMsg.rx, wfMsg.ry, wfMsg.weaponId, wfMsg.health);
      return true;
    }

    case 'wf_soldier_shoot': {
      ctx.wfManager.handleSoldierShoot(playerId, wfMsg.x, wfMsg.y, wfMsg.z, wfMsg.dx, wfMsg.dy, wfMsg.dz, wfMsg.weaponId);
      return true;
    }

    case 'wf_soldier_hit': {
      ctx.wfManager.handleSoldierHit(playerId, wfMsg.targetId, wfMsg.damage, wfMsg.weaponId, wfMsg.headshot);
      return true;
    }

    case 'wf_soldier_died': {
      ctx.wfManager.handleSoldierDied(playerId, wfMsg.killerId, wfMsg.weaponId);
      return true;
    }

    case 'wf_soldier_respawn': {
      ctx.wfManager.handleSoldierRespawn(playerId);
      return true;
    }

    // Engineer messages
    case 'wf_engineer_position': {
      ctx.wfManager.handleEngineerPosition(playerId, wfMsg.x, wfMsg.y, wfMsg.z, wfMsg.rx, wfMsg.ry);
      return true;
    }

    case 'wf_engineer_mine': {
      ctx.wfManager.handleEngineerMine(playerId, wfMsg.x, wfMsg.y, wfMsg.z, wfMsg.blockType);
      return true;
    }

    case 'wf_engineer_place': {
      ctx.wfManager.handleEngineerPlace(playerId, wfMsg.x, wfMsg.y, wfMsg.z, wfMsg.blockType);
      return true;
    }

    case 'wf_engineer_craft': {
      ctx.wfManager.handleEngineerCraft(playerId, wfMsg.recipeId);
      return true;
    }

    // Commander messages
    case 'wf_commander_scan': {
      ctx.wfManager.handleCommanderScan(playerId, wfMsg.targetTerritoryId);
      return true;
    }

    case 'wf_commander_ability': {
      ctx.wfManager.handleCommanderAbility(playerId, wfMsg.abilityId, wfMsg.targetTerritoryId);
      return true;
    }

    case 'wf_commander_ping': {
      ctx.wfManager.handleCommanderPing(playerId, wfMsg.x, wfMsg.z, wfMsg.pingType);
      return true;
    }

    default:
      return false;
  }
}
