'use client';

import React from 'react';
import type { CsgoSkinGrade } from '@/types/csgo';
import { CSGO_SKIN_GRADE_CONFIG } from '@/types/csgo';
import { cn } from '@/lib/utils';

interface SkinGradeBadgeProps {
    grade: CsgoSkinGrade;
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * CS:GO skin grade indicator pill with color-coded styling.
 */
export function SkinGradeBadge({ grade, size = 'md', className }: SkinGradeBadgeProps) {
    const config = CSGO_SKIN_GRADE_CONFIG[grade];

    return (
        <span
            className={cn(
                'inline-flex items-center font-bold uppercase tracking-wider',
                'rounded-full border',
                size === 'sm'
                    ? 'px-1.5 py-0.5 text-[9px] leading-none'
                    : 'px-2 py-0.5 text-[10px] leading-none',
                className
            )}
            style={{
                color: config.color,
                background: config.badgeBg,
                borderColor: `${config.color}40`,
            }}
        >
            {config.label}
        </span>
    );
}

export default SkinGradeBadge;
