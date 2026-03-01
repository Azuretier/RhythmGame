'use client';

import { useWarfrontSocket } from '@/hooks/useWarfrontSocket';
import WarfrontLobby from './WarfrontLobby';
import WarfrontHUD from './WarfrontHUD';
import styles from './WarfrontGame.module.css';

export default function WarfrontGame() {
  const wf = useWarfrontSocket();

  // Menu / Lobby phase
  if (wf.phase === 'menu' || wf.phase === 'lobby') {
    return <WarfrontLobby wf={wf} />;
  }

  // Countdown phase
  if (wf.phase === 'countdown') {
    return (
      <div className={styles.container}>
        <div className={styles.countdownOverlay}>
          <div className={styles.countdownNumber}>{wf.countdown}</div>
          <div className={styles.countdownLabel}>Game starting...</div>
          <div className={styles.roleLabel}>
            Playing as <span className={styles.roleName}>{wf.myRole?.toUpperCase()}</span>
          </div>
        </div>
      </div>
    );
  }

  // Playing phase — render role-specific view + HUD
  if (wf.phase === 'playing') {
    return (
      <div className={styles.container}>
        {/* Role-specific view */}
        <div className={styles.roleView}>
          {wf.myRole === 'defender' && (
            <div className={styles.placeholder}>
              <h2>Defender View</h2>
              <p>Rhythmia tetris game will render here</p>
              <p className={styles.hint}>Phase 4 implementation</p>
            </div>
          )}
          {wf.myRole === 'soldier' && (
            <div className={styles.placeholder}>
              <h2>Soldier View</h2>
              <p>FPS 3D world will render here</p>
              <p className={styles.hint}>Phase 2 implementation</p>
            </div>
          )}
          {wf.myRole === 'engineer' && (
            <div className={styles.placeholder}>
              <h2>Engineer View</h2>
              <p>Minecraft building view will render here</p>
              <p className={styles.hint}>Phase 3 implementation</p>
            </div>
          )}
          {wf.myRole === 'commander' && (
            <div className={styles.placeholder}>
              <h2>Commander View</h2>
              <p>Tactical overhead map will render here</p>
              <p className={styles.hint}>Phase 6 implementation</p>
            </div>
          )}
        </div>

        {/* Shared HUD overlay */}
        <WarfrontHUD
          territories={wf.territories}
          teams={wf.teams}
          teamResources={wf.teamResources}
          recentEffects={wf.recentEffects}
          myTeamId={wf.myTeamId}
          elapsedMs={wf.roomState?.elapsedMs || 0}
          durationMs={wf.roomState?.gameDurationMs || 600000}
        />
      </div>
    );
  }

  // Ended phase
  if (wf.phase === 'ended' && wf.gameResult) {
    const myTeam = wf.teams.find(t => t.id === wf.myTeamId);
    const won = wf.gameResult.winnerId === wf.myTeamId;
    return (
      <div className={styles.container}>
        <div className={styles.endScreen}>
          <h1 className={won ? styles.victory : styles.defeat}>
            {won ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <p className={styles.endReason}>{wf.gameResult.reason.replace(/_/g, ' ').toUpperCase()}</p>
          <div className={styles.endStats}>
            <div className={styles.teamScore}>
              {myTeam?.name}: {myTeam?.territoryCount} territories
            </div>
          </div>
          <div className={styles.rankings}>
            {wf.gameResult.rankings.map((r) => (
              <div key={r.playerId} className={styles.rankRow}>
                <span className={styles.rankRole}>{r.role}</span>
                <span className={styles.rankName}>{r.playerName}</span>
              </div>
            ))}
          </div>
          <button className={styles.backButton} onClick={wf.leaveRoom}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return null;
}
