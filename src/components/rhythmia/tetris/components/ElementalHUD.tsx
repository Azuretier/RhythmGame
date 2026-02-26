'use client';

import React, { useMemo } from 'react';
import type { ElementalState, ActiveReaction, ElementType, ReactionType } from '@/lib/elements/types';
import { ALL_ELEMENT_CONFIGS, REACTION_DEFINITIONS } from '@/lib/elements/definitions';
import { MAX_ELEMENT_ORBS } from '@/lib/elements/engine';

interface ElementalHUDProps {
    elementalState: ElementalState;
    activeReactions: ActiveReaction[];
}

/** Threshold: elements with >= this many orbs can participate in reactions */
const REACTION_THRESHOLD = 3;

/**
 * Check if any pair of elements at >= threshold could form a reaction.
 * Returns the set of element types that are "ready" for a reaction.
 */
function getReadyElements(orbs: Record<ElementType, number>): Set<ElementType> {
    const ready = new Set<ElementType>();
    const entries = Object.entries(REACTION_DEFINITIONS) as [string, (typeof REACTION_DEFINITIONS)[string]][];

    for (const [, def] of entries) {
        const [el1, el2] = def.elements;
        // Special case: corruption uses dark + any
        if (def.type === 'corruption') {
            if (orbs.dark >= REACTION_THRESHOLD) {
                ready.add('dark');
                // Any other element at threshold
                for (const [element, count] of Object.entries(orbs) as [ElementType, number][]) {
                    if (element !== 'dark' && count >= REACTION_THRESHOLD) {
                        ready.add(element);
                    }
                }
            }
        } else if (orbs[el1] >= REACTION_THRESHOLD && orbs[el2] >= REACTION_THRESHOLD) {
            ready.add(el1);
            ready.add(el2);
        }
    }

    return ready;
}

/**
 * Compact elemental orb gauge display — 6 element indicators in a vertical column.
 * Shows element icon, fill meter (0-10), and active reaction badges.
 */
export function ElementalHUD({ elementalState, activeReactions }: ElementalHUDProps) {
    const readyElements = useMemo(
        () => getReadyElements(elementalState.orbs),
        [elementalState.orbs]
    );

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 4px',
                position: 'relative',
            }}
        >
            {/* Element gauges */}
            {ALL_ELEMENT_CONFIGS.map((config) => {
                const orbCount = elementalState.orbs[config.type];
                const fillPercent = orbCount / MAX_ELEMENT_ORBS;
                const isReady = readyElements.has(config.type);

                return (
                    <div
                        key={config.type}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            position: 'relative',
                        }}
                    >
                        {/* Element icon with circular gauge background */}
                        <div
                            style={{
                                position: 'relative',
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                background: `conic-gradient(${config.color} ${fillPercent * 360}deg, rgba(255,255,255,0.08) ${fillPercent * 360}deg)`,
                                boxShadow: isReady
                                    ? `0 0 8px ${config.color}, 0 0 16px ${config.glowColor}`
                                    : orbCount > 0
                                        ? `0 0 4px ${config.color}40`
                                        : 'none',
                                transition: 'box-shadow 0.3s ease',
                                animation: isReady ? 'elementPulse 0.8s ease-in-out infinite alternate' : 'none',
                            }}
                        >
                            {/* Inner circle (icon container) */}
                            <div
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.7)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    lineHeight: 1,
                                }}
                            >
                                {config.icon}
                            </div>
                        </div>

                        {/* Orb count / bar */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                                width: 28,
                            }}
                        >
                            {/* Count text */}
                            <div
                                style={{
                                    fontSize: 8,
                                    fontWeight: 700,
                                    color: orbCount > 0 ? config.color : 'rgba(255,255,255,0.3)',
                                    fontFamily: 'var(--font-theme-mono, monospace)',
                                    textShadow: orbCount >= REACTION_THRESHOLD
                                        ? `0 0 4px ${config.glowColor}`
                                        : 'none',
                                    lineHeight: 1,
                                    textAlign: 'center',
                                    transition: 'color 0.2s ease',
                                }}
                            >
                                {orbCount}
                            </div>

                            {/* Mini bar */}
                            <div
                                style={{
                                    width: '100%',
                                    height: 2,
                                    borderRadius: 1,
                                    background: 'rgba(255,255,255,0.08)',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        width: `${fillPercent * 100}%`,
                                        height: '100%',
                                        borderRadius: 1,
                                        background: `linear-gradient(90deg, ${config.color}, ${config.glowColor})`,
                                        boxShadow: orbCount > 0
                                            ? `0 0 3px ${config.color}`
                                            : 'none',
                                        transition: 'width 0.3s ease-out',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Active Reactions badges */}
            {activeReactions.length > 0 && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        marginTop: 4,
                        alignItems: 'center',
                    }}
                >
                    {activeReactions.map((ar) => {
                        const def = REACTION_DEFINITIONS[ar.type];
                        if (!def) return null;

                        const elapsed = Date.now() - ar.startTime;
                        const remaining = Math.max(0, 1 - elapsed / ar.duration);

                        return (
                            <div
                                key={ar.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    padding: '1px 4px',
                                    borderRadius: 4,
                                    background: `${def.color}20`,
                                    border: `1px solid ${def.color}40`,
                                    boxShadow: `0 0 6px ${def.color}30`,
                                    fontSize: 7,
                                    fontWeight: 700,
                                    color: def.color,
                                    fontFamily: 'var(--font-theme-mono, monospace)',
                                    whiteSpace: 'nowrap',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Duration bar background */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: `${remaining * 100}%`,
                                        background: `${def.color}15`,
                                        transition: 'width 0.5s linear',
                                    }}
                                />
                                <span style={{ position: 'relative', zIndex: 1 }}>{def.icon}</span>
                                <span style={{ position: 'relative', zIndex: 1 }}>{def.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Ambient glow when reactions are ready */}
            {readyElements.size > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        inset: -6,
                        borderRadius: 8,
                        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)',
                        pointerEvents: 'none',
                        zIndex: -1,
                    }}
                />
            )}

            {/* CSS keyframe animations */}
            <style>{`
                @keyframes elementPulse {
                    from { transform: scale(1); }
                    to { transform: scale(1.12); }
                }
            `}</style>
        </div>
    );
}
