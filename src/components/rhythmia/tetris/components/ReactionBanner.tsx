'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactionType } from '@/lib/elements/types';
import { REACTION_DEFINITIONS } from '@/lib/elements/definitions';

interface ReactionBannerProps {
    reaction: ReactionType | null;
    show: boolean;
}

/**
 * Full-width animated banner that appears when a reaction triggers.
 * Slides in from top, holds for 1.5s, then fades out.
 * Uses the reaction's color and glowColor for styling.
 */
export function ReactionBanner({ reaction, show }: ReactionBannerProps) {
    const def = reaction ? REACTION_DEFINITIONS[reaction] : null;

    return (
        <AnimatePresence>
            {show && def && (
                <motion.div
                    key={`reaction-banner-${reaction}`}
                    initial={{ y: -60, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.95 }}
                    transition={{
                        enter: { type: 'spring', stiffness: 300, damping: 20 },
                        exit: { duration: 0.4, ease: 'easeIn' },
                    }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '40%',
                        transform: 'translateY(-50%)',
                        zIndex: 50,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 20px',
                            borderRadius: 8,
                            background: `linear-gradient(135deg, ${def.color}CC, ${def.glowColor}99)`,
                            border: `1px solid ${def.glowColor}`,
                            boxShadow: `0 0 20px ${def.color}60, 0 0 40px ${def.color}30, inset 0 0 15px ${def.glowColor}20`,
                            backdropFilter: 'blur(8px)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Animated shimmer overlay */}
                        <motion.div
                            animate={{
                                x: ['-100%', '200%'],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: 0,
                                ease: 'easeInOut',
                            }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Reaction icon */}
                        <motion.span
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                            style={{
                                fontSize: 22,
                                lineHeight: 1,
                                filter: `drop-shadow(0 0 6px ${def.glowColor})`,
                            }}
                        >
                            {def.icon}
                        </motion.span>

                        {/* Reaction name */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                            }}
                        >
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.05, duration: 0.3 }}
                                style={{
                                    fontSize: 14,
                                    fontWeight: 900,
                                    letterSpacing: '0.08em',
                                    color: '#FFFFFF',
                                    textShadow: `0 0 8px ${def.glowColor}, 0 1px 2px rgba(0,0,0,0.5)`,
                                    fontFamily: 'var(--font-theme-heading, var(--font-theme-body, sans-serif))',
                                    lineHeight: 1.2,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {def.name}
                            </motion.div>

                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 0.7 }}
                                transition={{ delay: 0.15, duration: 0.3 }}
                                style={{
                                    fontSize: 8,
                                    fontWeight: 600,
                                    color: '#FFFFFF',
                                    fontFamily: 'var(--font-theme-mono, monospace)',
                                    lineHeight: 1,
                                    opacity: 0.7,
                                }}
                            >
                                {def.nameJa}
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
