'use client';

import React, { useMemo } from 'react';
import type { DragonGaugeState } from '../types';
import { DRAGON_FURY_MAX, DRAGON_MIGHT_MAX } from '../constants';
import { DragonModel3D } from './DragonModel3D';

interface DragonGaugeProps {
    gauge: DragonGaugeState;
}

/**
 * Mandarin Fever Dragon Gauge — Wuthering Waves-inspired dual gauge display.
 *
 * Vertical dragon silhouette with segmented glow regions:
 * - Fury (top/head): orange-gold, charges from T-spins
 * - Might (bottom/tail): crimson-red, charges from Tetrises
 *
 * When both gauges are full, the dragon blazes with fire animation.
 * During Dragon Breath, the entire silhouette ignites.
 */
export function DragonGauge({ gauge }: DragonGaugeProps) {
    if (!gauge.enabled) return null;

    const furyPercent = gauge.furyGauge / DRAGON_FURY_MAX;
    const mightPercent = gauge.mightGauge / DRAGON_MIGHT_MAX;
    const furyFull = gauge.furyGauge >= DRAGON_FURY_MAX;
    const mightFull = gauge.mightGauge >= DRAGON_MIGHT_MAX;
    const bothFull = furyFull && mightFull;

    // Dragon silhouette SVG path segments for glow mask
    const furySegments = useMemo(() => {
        const segments = [];
        for (let i = 0; i < DRAGON_FURY_MAX; i++) {
            const filled = i < gauge.furyGauge;
            segments.push(
                <div
                    key={`fury-${i}`}
                    style={{
                        width: 8,
                        height: 12,
                        borderRadius: 2,
                        marginBottom: 2,
                        background: filled
                            ? `linear-gradient(180deg, #FFB300, #FF8C00)`
                            : 'rgba(255, 179, 0, 0.12)',
                        boxShadow: filled
                            ? '0 0 8px rgba(255, 179, 0, 0.6), 0 0 16px rgba(255, 140, 0, 0.3)'
                            : 'none',
                        transition: 'all 0.3s ease-out',
                        transform: filled ? 'scaleY(1.1)' : 'scaleY(1)',
                    }}
                />
            );
        }
        return segments;
    }, [gauge.furyGauge]);

    const mightSegments = useMemo(() => {
        const segments = [];
        for (let i = 0; i < DRAGON_MIGHT_MAX; i++) {
            const filled = i < gauge.mightGauge;
            segments.push(
                <div
                    key={`might-${i}`}
                    style={{
                        width: 8,
                        height: 12,
                        borderRadius: 2,
                        marginBottom: 2,
                        background: filled
                            ? `linear-gradient(180deg, #DC143C, #C41E3A)`
                            : 'rgba(220, 20, 60, 0.12)',
                        boxShadow: filled
                            ? '0 0 8px rgba(220, 20, 60, 0.6), 0 0 16px rgba(196, 30, 58, 0.3)'
                            : 'none',
                        transition: 'all 0.3s ease-out',
                        transform: filled ? 'scaleY(1.1)' : 'scaleY(1)',
                    }}
                />
            );
        }
        return segments;
    }, [gauge.mightGauge]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 4px',
                position: 'relative',
            }}
        >
            {/* Dragon silhouette container with breathing animation */}
            <div
                style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    animation: gauge.isBreathing
                        ? 'dragonBreathPulse 0.5s ease-in-out infinite alternate'
                        : bothFull
                            ? 'dragonReadyPulse 1s ease-in-out infinite alternate'
                            : 'none',
                }}
            >
                {/* Dragon 3D model */}
                <div
                    style={{
                        marginBottom: 4,
                        filter: gauge.isBreathing
                            ? 'drop-shadow(0 0 12px #FFB300) drop-shadow(0 0 24px #FF8C00)'
                            : bothFull
                                ? 'drop-shadow(0 0 8px #FFB300)'
                                : furyFull || mightFull
                                    ? 'drop-shadow(0 0 4px rgba(255, 179, 0, 0.5))'
                                    : 'none',
                        transition: 'filter 0.5s ease',
                    }}
                >
                    <DragonModel3D
                        isBreathing={gauge.isBreathing}
                        bothFull={bothFull}
                        furyPercent={furyPercent}
                        mightPercent={mightPercent}
                    />
                </div>

                {/* Fury gauge label */}
                <div
                    style={{
                        fontSize: 7,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: furyFull ? '#FFB300' : 'rgba(255, 179, 0, 0.5)',
                        textShadow: furyFull ? '0 0 6px rgba(255, 179, 0, 0.6)' : 'none',
                        marginBottom: 2,
                        fontFamily: 'var(--font-theme-mono, monospace)',
                        transition: 'all 0.3s ease',
                    }}
                >
                    怒り
                </div>

                {/* Fury gauge segments (top) */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        alignItems: 'center',
                    }}
                >
                    {furySegments}
                </div>

                {/* Divider with dragon fang decoration */}
                <div
                    style={{
                        width: 12,
                        height: 2,
                        margin: '6px 0',
                        background: bothFull
                            ? 'linear-gradient(90deg, #FFB300, #DC143C)'
                            : 'rgba(255, 255, 255, 0.15)',
                        borderRadius: 1,
                        boxShadow: bothFull
                            ? '0 0 10px rgba(255, 179, 0, 0.5), 0 0 20px rgba(220, 20, 60, 0.3)'
                            : 'none',
                        transition: 'all 0.5s ease',
                    }}
                />

                {/* Might gauge label */}
                <div
                    style={{
                        fontSize: 7,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: mightFull ? '#DC143C' : 'rgba(220, 20, 60, 0.5)',
                        textShadow: mightFull ? '0 0 6px rgba(220, 20, 60, 0.6)' : 'none',
                        marginBottom: 2,
                        fontFamily: 'var(--font-theme-mono, monospace)',
                        transition: 'all 0.3s ease',
                    }}
                >
                    力
                </div>

                {/* Might gauge segments (bottom) */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        alignItems: 'center',
                    }}
                >
                    {mightSegments}
                </div>

                {/* "READY" indicator when both full */}
                {bothFull && !gauge.isBreathing && (
                    <div
                        style={{
                            fontSize: 7,
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            color: '#FFF8E1',
                            textShadow: '0 0 8px #FFB300, 0 0 16px #FF8C00',
                            marginTop: 4,
                            fontFamily: 'var(--font-theme-mono, monospace)',
                            animation: 'dragonReadyBlink 0.6s ease-in-out infinite alternate',
                        }}
                    >
                        READY
                    </div>
                )}

                {/* "DRAGON BREATH" indicator during breath */}
                {gauge.isBreathing && (
                    <div
                        style={{
                            fontSize: 6,
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            color: '#FFF8E1',
                            textShadow: '0 0 10px #FFB300, 0 0 20px #DC143C',
                            marginTop: 4,
                            fontFamily: 'var(--font-theme-mono, monospace)',
                            animation: 'dragonBreathText 0.3s ease-in-out infinite alternate',
                        }}
                    >
                        🔥
                    </div>
                )}

                {/* Ambient glow behind gauge when active */}
                <div
                    style={{
                        position: 'absolute',
                        inset: -8,
                        borderRadius: 8,
                        background: gauge.isBreathing
                            ? 'radial-gradient(ellipse at center, rgba(255, 179, 0, 0.15) 0%, transparent 70%)'
                            : furyPercent + mightPercent > 0.5
                                ? 'radial-gradient(ellipse at center, rgba(255, 179, 0, 0.06) 0%, transparent 70%)'
                                : 'none',
                        pointerEvents: 'none',
                        transition: 'background 0.5s ease',
                        zIndex: -1,
                    }}
                />
            </div>

            {/* CSS keyframe animations */}
            <style>{`
                @keyframes dragonBreathPulse {
                    from { transform: scale(1); filter: brightness(1); }
                    to { transform: scale(1.05); filter: brightness(1.3); }
                }
                @keyframes dragonReadyPulse {
                    from { transform: scale(1); }
                    to { transform: scale(1.03); }
                }
                @keyframes dragonReadyBlink {
                    from { opacity: 0.6; }
                    to { opacity: 1; }
                }
                @keyframes dragonBreathText {
                    from { transform: scale(1); opacity: 0.8; }
                    to { transform: scale(1.2); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
