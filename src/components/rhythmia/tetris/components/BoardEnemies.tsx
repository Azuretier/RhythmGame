'use client';

import React, { useMemo } from 'react';
import type { BoardEnemy, BoardEnemyKind } from '../types';
import { BOARD_ENEMY_DEFS } from '../constants';
import styles from './BoardEnemies.module.css';

interface BoardEnemiesProps {
    enemies: BoardEnemy[];
    /** Width of a single board cell in pixels */
    cellWidth: number;
    /** Height of a single board cell in pixels */
    cellHeight: number;
    /** Whether the beat is currently active (for glow sync) */
    beatActive?: boolean;
}

/** SVG body for a slime: rounded blob shape */
function SlimeBody({ gradient, accent }: { gradient: [string, string]; accent: string }) {
    const id = React.useId();
    return (
        <svg className={styles.enemySvg} viewBox="0 0 32 32" fill="none">
            <defs>
                <radialGradient id={`sg${id}`} cx="0.4" cy="0.35" r="0.65">
                    <stop offset="0%" stopColor={gradient[0]} />
                    <stop offset="100%" stopColor={gradient[1]} />
                </radialGradient>
                <radialGradient id={`sh${id}`} cx="0.5" cy="0.3" r="0.5">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
            </defs>
            {/* Body */}
            <ellipse cx="16" cy="20" rx="12" ry="10" fill={`url(#sg${id})`} />
            {/* Highlight */}
            <ellipse cx="13" cy="16" rx="5" ry="4" fill={`url(#sh${id})`} />
            {/* Eyes */}
            <ellipse cx="12" cy="18" rx="2.5" ry="3" fill="white" />
            <ellipse cx="20" cy="18" rx="2.5" ry="3" fill="white" />
            <ellipse cx="12.5" cy="19" rx="1.2" ry="1.8" fill={accent} />
            <ellipse cx="20.5" cy="19" rx="1.2" ry="1.8" fill={accent} />
            {/* Highlight dots */}
            <circle cx="11.5" cy="17" r="0.7" fill="rgba(255,255,255,0.8)" />
            <circle cx="19.5" cy="17" r="0.7" fill="rgba(255,255,255,0.8)" />
        </svg>
    );
}

/** SVG body for a phantom: ghostly floating shape */
function PhantomBody({ gradient, accent }: { gradient: [string, string]; accent: string }) {
    const id = React.useId();
    return (
        <svg className={styles.enemySvg} viewBox="0 0 32 32" fill="none">
            <defs>
                <linearGradient id={`pg${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={gradient[0]} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={gradient[1]} stopOpacity="0.6" />
                </linearGradient>
            </defs>
            {/* Body — tall ghost shape */}
            <path
                d="M8 28 Q8 8 16 6 Q24 8 24 28 L22 25 L20 28 L18 25 L16 28 L14 25 L12 28 L10 25 Z"
                fill={`url(#pg${id})`}
            />
            {/* Inner glow */}
            <ellipse cx="16" cy="14" rx="6" ry="5" fill="rgba(255,255,255,0.12)" />
            {/* Eyes — hollow */}
            <ellipse cx="12" cy="16" rx="2" ry="2.5" fill={accent} />
            <ellipse cx="20" cy="16" rx="2" ry="2.5" fill={accent} />
            {/* Eye inner glow */}
            <ellipse cx="12" cy="15.5" rx="1" ry="1.2" fill="rgba(255,255,255,0.5)" />
            <ellipse cx="20" cy="15.5" rx="1" ry="1.2" fill="rgba(255,255,255,0.5)" />
        </svg>
    );
}

/** SVG body for a golem: angular rocky shape */
function GolemBody({ gradient, accent }: { gradient: [string, string]; accent: string }) {
    const id = React.useId();
    return (
        <svg className={styles.enemySvg} viewBox="0 0 32 32" fill="none">
            <defs>
                <linearGradient id={`gg${id}`} x1="0" y1="0" x2="0.5" y2="1">
                    <stop offset="0%" stopColor={gradient[0]} />
                    <stop offset="100%" stopColor={gradient[1]} />
                </linearGradient>
            </defs>
            {/* Body — blocky */}
            <path
                d="M7 28 L7 14 L10 10 L14 8 L18 8 L22 10 L25 14 L25 28 Z"
                fill={`url(#gg${id})`}
            />
            {/* Cracks / details */}
            <line x1="10" y1="14" x2="14" y2="20" stroke={accent} strokeWidth="0.8" opacity="0.5" />
            <line x1="22" y1="12" x2="19" y2="18" stroke={accent} strokeWidth="0.8" opacity="0.5" />
            <line x1="12" y1="24" x2="20" y2="24" stroke={accent} strokeWidth="0.6" opacity="0.3" />
            {/* Eyes — angular slits */}
            <rect x="10" y="15" width="4" height="2.5" rx="0.5" fill="white" />
            <rect x="18" y="15" width="4" height="2.5" rx="0.5" fill="white" />
            <rect x="11" y="15.5" width="2" height="1.5" rx="0.3" fill={accent} />
            <rect x="19" y="15.5" width="2" height="1.5" rx="0.3" fill={accent} />
            {/* Highlight */}
            <path d="M10 10 L14 8 L15 11 L11 13 Z" fill="rgba(255,255,255,0.15)" />
        </svg>
    );
}

/** SVG body for a wisp: ethereal orb with trailing wisps */
function WispBody({ gradient, accent }: { gradient: [string, string]; accent: string }) {
    const id = React.useId();
    return (
        <svg className={styles.enemySvg} viewBox="0 0 32 32" fill="none">
            <defs>
                <radialGradient id={`wg${id}`} cx="0.5" cy="0.4" r="0.5">
                    <stop offset="0%" stopColor={gradient[0]} stopOpacity="0.95" />
                    <stop offset="80%" stopColor={gradient[1]} stopOpacity="0.7" />
                    <stop offset="100%" stopColor={gradient[1]} stopOpacity="0" />
                </radialGradient>
            </defs>
            {/* Outer glow */}
            <circle cx="16" cy="16" r="14" fill={`url(#wg${id})`} />
            {/* Core */}
            <circle cx="16" cy="15" r="7" fill={gradient[0]} opacity="0.8" />
            {/* Inner shine */}
            <circle cx="14" cy="13" r="3" fill="rgba(255,255,255,0.4)" />
            {/* Tail wisps */}
            <path d="M10 22 Q8 26 6 28" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
            <path d="M22 22 Q24 26 26 28" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
            <path d="M16 24 Q16 27 15 30" stroke={accent} strokeWidth="1" fill="none" opacity="0.35" strokeLinecap="round" />
            {/* Eyes */}
            <ellipse cx="13" cy="15" rx="1.5" ry="2" fill="white" opacity="0.9" />
            <ellipse cx="19" cy="15" rx="1.5" ry="2" fill="white" opacity="0.9" />
            <circle cx="13.3" cy="15.5" r="0.8" fill={accent} />
            <circle cx="19.3" cy="15.5" r="0.8" fill={accent} />
        </svg>
    );
}

const BODY_COMPONENTS: Record<BoardEnemyKind, React.FC<{ gradient: [string, string]; accent: string }>> = {
    slime: SlimeBody,
    phantom: PhantomBody,
    golem: GolemBody,
    wisp: WispBody,
};

function EnemySprite({ enemy, cellWidth, cellHeight, beatActive }: {
    enemy: BoardEnemy;
    cellWidth: number;
    cellHeight: number;
    beatActive: boolean;
}) {
    const def = BOARD_ENEMY_DEFS[enemy.kind];
    const BodyComponent = BODY_COMPONENTS[enemy.kind];

    // Compute interpolated position for airborne enemies
    const { renderCol, renderRow } = useMemo(() => {
        if (enemy.hopPhase === 'airborne') {
            const t = Math.min(Math.max((enemy.hopProgress - 0.15) / 0.7, 0), 1);
            // Smooth ease
            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
            return {
                renderCol: enemy.prevCol + (enemy.targetCol - enemy.prevCol) * eased,
                renderRow: enemy.prevRow + (enemy.targetRow - enemy.prevRow) * eased,
            };
        }
        return { renderCol: enemy.col, renderRow: enemy.row };
    }, [enemy.hopPhase, enemy.hopProgress, enemy.prevCol, enemy.prevRow, enemy.targetCol, enemy.targetRow, enemy.col, enemy.row]);

    const left = renderCol * (cellWidth + 1); // +1 for grid gap
    const top = renderRow * (cellHeight + 1);

    const isNewSpawn = Date.now() - enemy.spawnTime < 400;
    const showHealthBar = enemy.maxHealth > 1;

    const phaseClass = styles[`phase_${enemy.hopPhase}`] || '';
    const facingClass = enemy.facing === -1 ? styles.facingLeft : '';
    const spawnClass = isNewSpawn ? styles.spawning : '';
    const beatClass = beatActive ? styles.beatPulse : '';

    return (
        <div
            className={`${styles.enemy} ${phaseClass} ${facingClass} ${spawnClass} ${beatClass}`}
            style={{
                '--cell-w': `${cellWidth}px`,
                '--cell-h': `${cellHeight}px`,
                '--enemy-glow': def.glowColor,
                '--shadow-alpha': String(def.shadowAlpha),
                '--hop-dur': `${def.hopSpeed * 0.7}ms`,
                left: `${left}px`,
                top: `${top}px`,
            } as React.CSSProperties}
        >
            {/* Shadow */}
            <div
                className={styles.enemyShadow}
                style={{ opacity: def.shadowAlpha }}
            />

            {/* Body */}
            <div className={styles.enemyBody}>
                <BodyComponent gradient={def.bodyGradient} accent={def.accentColor} />
            </div>

            {/* Health bar (only for multi-hp enemies) */}
            {showHealthBar && (
                <div className={`${styles.healthBar} ${styles.visible}`}>
                    <div
                        className={styles.healthBarFill}
                        style={{
                            width: `${(enemy.health / enemy.maxHealth) * 100}%`,
                            background: `linear-gradient(90deg, ${def.color}, ${def.bodyGradient[0]})`,
                        }}
                    />
                </div>
            )}
        </div>
    );
}

/**
 * Renders board enemies as an overlay on the Tetris board.
 * Each enemy is an SVG sprite with squash-and-stretch hop animations.
 */
export function BoardEnemies({ enemies, cellWidth, cellHeight, beatActive = false }: BoardEnemiesProps) {
    const aliveEnemies = useMemo(
        () => enemies.filter(e => e.alive),
        [enemies]
    );

    if (aliveEnemies.length === 0) return null;

    return (
        <div className={styles.enemyLayer}>
            {aliveEnemies.map(enemy => (
                <EnemySprite
                    key={enemy.id}
                    enemy={enemy}
                    cellWidth={cellWidth}
                    cellHeight={cellHeight}
                    beatActive={beatActive}
                />
            ))}
        </div>
    );
}
