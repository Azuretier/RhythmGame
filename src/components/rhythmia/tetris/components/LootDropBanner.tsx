'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ItemRarity } from '@/lib/items/types';
import { RARITY_CONFIG } from '@/lib/items/types';
import { getEquipment } from '@/lib/equipment/definitions';
import { cn } from '@/lib/utils';

interface LootDropBannerProps {
    equipmentId: string | null;
    rarity: ItemRarity | null;
    show: boolean;
}

/**
 * Animated loot drop notification banner.
 * Slides in from the right when equipment drops during gameplay.
 * Shows the equipment name, icon, and a rarity-colored glow effect.
 * Auto-dismisses after 3 seconds.
 */
export function LootDropBanner({ equipmentId, rarity, show }: LootDropBannerProps) {
    const [visible, setVisible] = useState(false);

    // Control visibility with auto-dismiss
    useEffect(() => {
        if (show && equipmentId && rarity) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [show, equipmentId, rarity]);

    const definition = equipmentId ? getEquipment(equipmentId) : undefined;
    const rarityConfig = rarity ? RARITY_CONFIG[rarity] : undefined;

    if (!definition || !rarityConfig) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key={`loot-${equipmentId}-${Date.now()}`}
                    className={cn(
                        'fixed top-24 right-4 z-50',
                        'pointer-events-none',
                    )}
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 24,
                    }}
                >
                    <div
                        className={cn(
                            'relative flex items-center gap-3',
                            'px-4 py-3 rounded-xl',
                            'bg-gray-900/90 backdrop-blur-md',
                            'border-2 overflow-hidden',
                            'min-w-[220px] max-w-[300px]',
                        )}
                        style={{
                            borderColor: `${rarityConfig.color}60`,
                            boxShadow: [
                                `0 0 ${20 * rarityConfig.glowIntensity}px ${rarityConfig.color}30`,
                                `0 0 ${40 * rarityConfig.glowIntensity}px ${rarityConfig.color}15`,
                                `inset 0 0 ${16 * rarityConfig.glowIntensity}px ${rarityConfig.color}10`,
                            ].join(', '),
                        }}
                    >
                        {/* Background glow pulse */}
                        <motion.div
                            className="absolute inset-0 rounded-xl"
                            style={{
                                background: `radial-gradient(ellipse at 30% 50%, ${rarityConfig.color}15, transparent 70%)`,
                            }}
                            animate={{
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />

                        {/* Icon container */}
                        <div
                            className={cn(
                                'relative flex-shrink-0 w-10 h-10 rounded-lg',
                                'flex items-center justify-center',
                                'bg-white/5',
                            )}
                            style={{
                                boxShadow: rarityConfig.glowIntensity > 0
                                    ? `0 0 ${8 * rarityConfig.glowIntensity}px ${rarityConfig.color}40`
                                    : undefined,
                            }}
                        >
                            <motion.span
                                className="text-xl leading-none"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 15,
                                    delay: 0.1,
                                }}
                            >
                                {definition.icon}
                            </motion.span>
                        </div>

                        {/* Text content */}
                        <div className="relative flex flex-col min-w-0">
                            {/* "NEW EQUIPMENT" label */}
                            <motion.span
                                className="text-[9px] uppercase tracking-[0.15em] font-semibold text-white/40 mb-0.5"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                            >
                                New Equipment
                            </motion.span>

                            {/* Equipment name */}
                            <motion.span
                                className="text-sm font-bold leading-tight truncate"
                                style={{ color: rarityConfig.color }}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                {definition.name}
                            </motion.span>

                            {/* Rarity badge */}
                            <motion.div
                                className="flex items-center gap-1.5 mt-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <span
                                    className="px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-wider"
                                    style={{
                                        background: rarityConfig.badgeBg,
                                        color: rarityConfig.color,
                                    }}
                                >
                                    {rarityConfig.label}
                                </span>
                                <span className="text-[9px] text-white/25">
                                    {definition.slot}
                                </span>
                            </motion.div>
                        </div>

                        {/* Shimmer effect for legendary / epic */}
                        {rarityConfig.glowIntensity >= 0.7 && (
                            <motion.div
                                className="absolute inset-0 rounded-xl pointer-events-none"
                                style={{
                                    background: `linear-gradient(105deg, transparent 40%, ${rarityConfig.color}15 50%, transparent 60%)`,
                                }}
                                animate={{
                                    backgroundPosition: ['200% 0', '-200% 0'],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'linear',
                                }}
                            />
                        )}

                        {/* Auto-dismiss progress bar */}
                        <motion.div
                            className="absolute bottom-0 left-0 h-[2px] rounded-b-xl"
                            style={{ background: rarityConfig.color }}
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 3, ease: 'linear' }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
