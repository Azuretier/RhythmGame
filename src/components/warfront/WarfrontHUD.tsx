'use client';

import type { WarfrontTerritory, WarfrontTeam, ResourcePool, CrossModeEffect } from '@/types/warfront';
import { WF_TERRITORY_GRID } from '@/types/warfront';
import styles from './WarfrontHUD.module.css';

interface WarfrontHUDProps {
  territories: WarfrontTerritory[];
  teams: WarfrontTeam[];
  teamResources: ResourcePool | null;
  recentEffects: CrossModeEffect[];
  myTeamId: string | null;
  elapsedMs: number;
  durationMs: number;
}

export default function WarfrontHUD({
  territories,
  teams,
  teamResources,
  recentEffects,
  myTeamId,
  elapsedMs,
  durationMs,
}: WarfrontHUDProps) {
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return (
    <div className={styles.hud}>
      {/* Timer */}
      <div className={styles.timer}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {/* Team Scores */}
      <div className={styles.teamScores}>
        {teams.map((team) => (
          <div
            key={team.id}
            className={`${styles.teamScore} ${team.id === myTeamId ? styles.myTeam : ''}`}
            style={{ borderColor: team.color }}
          >
            <span className={styles.teamName} style={{ color: team.color }}>{team.name}</span>
            <span className={styles.territoryCount}>{team.territoryCount}</span>
          </div>
        ))}
      </div>

      {/* Territory Minimap */}
      <div className={styles.minimap}>
        <div className={styles.minimapGrid}>
          {territories.map((t) => {
            const team = teams.find(tm => tm.id === t.ownerId);
            const bgColor = team ? team.color : '#333';
            const opacity = t.health / 100;
            return (
              <div
                key={t.id}
                className={styles.minimapCell}
                style={{
                  gridColumn: t.gridX + 1,
                  gridRow: t.gridZ + 1,
                  backgroundColor: bgColor,
                  opacity: Math.max(0.2, opacity),
                }}
                title={`Territory ${t.id} - ${t.ownerId || 'Neutral'} (${t.health}HP, Fort ${t.fortificationLevel})`}
              >
                {t.fortificationLevel > 0 && (
                  <span className={styles.fortIcon}>{'▪'.repeat(t.fortificationLevel)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resources */}
      {teamResources && (
        <div className={styles.resources}>
          <div className={styles.resourceItem} title="Energy">⚡ {teamResources.energy}</div>
          <div className={styles.resourceItem} title="Iron">🔩 {teamResources.iron}</div>
          <div className={styles.resourceItem} title="Diamond">💎 {teamResources.diamond}</div>
          <div className={styles.resourceItem} title="Wood">🪵 {teamResources.wood}</div>
          <div className={styles.resourceItem} title="Stone">🪨 {teamResources.stone}</div>
        </div>
      )}

      {/* Effect Feed */}
      {recentEffects.length > 0 && (
        <div className={styles.effectFeed}>
          {recentEffects.slice(-5).map((effect) => (
            <div key={effect.id} className={styles.effectItem}>
              <span className={styles.effectType}>
                {effect.effectType.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
