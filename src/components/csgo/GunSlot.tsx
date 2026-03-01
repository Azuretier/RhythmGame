'use client';

import React from 'react';
import type { CsgoSkinGrade } from '@/types/csgo';
import { CSGO_WEAPON_REGISTRY } from '@/lib/csgo/registry';
import { GunTexture } from './GunTexture';
import styles from './GunSlot.module.css';

interface GunSlotProps {
    weaponId?: string;
    size?: number;
    selected?: boolean;
    showName?: boolean;
    onClick?: () => void;
    className?: string;
}

const GRADE_CLASS: Record<CsgoSkinGrade, string> = {
    consumer: styles.gradeConsumer,
    industrial: styles.gradeIndustrial,
    mil_spec: styles.gradeMilSpec,
    restricted: styles.gradeRestricted,
    classified: styles.gradeClassified,
    covert: styles.gradeCovert,
    contraband: styles.gradeContraband,
};

/**
 * Square slot for displaying a CS:GO weapon with skin-grade–colored border.
 */
export function GunSlot({ weaponId, size = 56, selected, showName = true, onClick, className }: GunSlotProps) {
    const weapon = weaponId ? CSGO_WEAPON_REGISTRY[weaponId] : undefined;
    const isEmpty = !weapon;
    const textureSize = Math.round(size * 0.6);

    return (
        <div
            className={[
                styles.slot,
                isEmpty ? styles.slotEmpty : (GRADE_CLASS[weapon.skinGrade] || ''),
                selected ? styles.slotSelected : '',
                onClick ? styles.slotClickable : '',
                className || '',
            ].filter(Boolean).join(' ')}
            style={{
                width: size,
                height: size,
                '--slot-color': weapon?.color,
                '--slot-glow': weapon?.glowColor,
            } as React.CSSProperties}
            onClick={onClick}
        >
            {weapon && (
                <>
                    <div className={styles.accentLine} style={{ background: weapon.color }} />
                    <GunTexture
                        weaponId={weaponId!}
                        size={textureSize}
                        glow={weapon.skinGrade !== 'consumer' && weapon.skinGrade !== 'industrial'}
                    />
                    {showName && (
                        <span className={styles.nameLabel}>{weapon.name}</span>
                    )}
                </>
            )}
        </div>
    );
}

export default GunSlot;
