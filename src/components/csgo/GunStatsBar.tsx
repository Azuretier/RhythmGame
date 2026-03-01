'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GunStatsBarProps {
    label: string;
    value: number;
    max: number;
    color?: string;
    className?: string;
}

/**
 * Horizontal stat bar for CS:GO weapon stats visualization.
 */
export function GunStatsBar({ label, value, max, color = '#4FC3F7', className }: GunStatsBarProps) {
    const pct = Math.min((value / max) * 100, 100);

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <span className="text-[10px] font-medium text-white/50 w-20 shrink-0 uppercase tracking-wide">
                {label}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
            <span className="text-[10px] font-mono text-white/40 w-8 text-right tabular-nums">
                {value}
            </span>
        </div>
    );
}

export default GunStatsBar;
