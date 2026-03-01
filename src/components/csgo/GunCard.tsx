'use client';

import React from 'react';
import { CSGO_WEAPON_REGISTRY } from '@/lib/csgo/registry';
import { CSGO_CATEGORY_CONFIG } from '@/types/csgo';
import { GunTexture } from './GunTexture';
import { SkinGradeBadge } from './SkinGradeBadge';
import { GunStatsBar } from './GunStatsBar';
import styles from './GunCard.module.css';

interface GunCardProps {
    weaponId: string;
    compact?: boolean;
    showStats?: boolean;
    className?: string;
}

const TEAM_LABELS: Record<string, { label: string; class: string }> = {
    terrorist: { label: 'T', class: styles.teamT },
    counter_terrorist: { label: 'CT', class: styles.teamCT },
    both: { label: 'ALL', class: styles.teamBoth },
};

/**
 * Card-style weapon display with pixel art texture, name, skin grade, stats, and description.
 */
export function GunCard({ weaponId, compact, showStats = true, className }: GunCardProps) {
    const weapon = CSGO_WEAPON_REGISTRY[weaponId];
    if (!weapon) return null;

    const categoryConf = CSGO_CATEGORY_CONFIG[weapon.category];
    const teamConf = TEAM_LABELS[weapon.team] || TEAM_LABELS.both;

    return (
        <div
            className={`${styles.card} ${compact ? styles.compact : ''} ${className || ''}`}
        >
            {/* Accent line */}
            <div className={styles.accentLine} style={{ background: weapon.color }} />

            {/* Header */}
            <div className={styles.header}>
                <div
                    className={styles.textureWrap}
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${weapon.glowColor}15, transparent)`,
                    }}
                >
                    <GunTexture
                        weaponId={weaponId}
                        size={compact ? 22 : 36}
                        glow={weapon.skinGrade !== 'consumer' && weapon.skinGrade !== 'industrial'}
                    />
                </div>

                <div className={styles.info}>
                    <span className={styles.name} style={{ color: weapon.color }}>
                        {weapon.name}
                    </span>
                    {!compact && (
                        <span className={styles.nameJa}>{weapon.nameJa}</span>
                    )}
                    {!compact && (
                        <div className={styles.badges}>
                            <SkinGradeBadge grade={weapon.skinGrade} size="sm" />
                            <span className={styles.categoryTag}>
                                {categoryConf.label}
                            </span>
                            <span className={`${styles.teamTag} ${teamConf.class}`}>
                                {teamConf.label}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Price */}
            <span className={styles.price}>
                <span className={styles.pricePrefix}>$</span>{weapon.price}
            </span>

            {/* Stats */}
            {!compact && showStats && (
                <div className={styles.stats}>
                    <GunStatsBar label="Damage" value={weapon.stats.damage} max={120} color="#EF5350" />
                    <GunStatsBar label="Fire Rate" value={weapon.stats.fireRate} max={1000} color="#FFD54F" />
                    <GunStatsBar label="Accuracy" value={Math.round(weapon.stats.accuracy * 100)} max={100} color="#4FC3F7" />
                    <GunStatsBar label="Recoil" value={Math.round(weapon.stats.recoilControl * 100)} max={100} color="#66BB6A" />
                    <GunStatsBar label="Armor Pen" value={Math.round(weapon.stats.armorPenetration * 100)} max={100} color="#AB47BC" />
                </div>
            )}

            {/* Description */}
            {!compact && (
                <p className={styles.description}>{weapon.description}</p>
            )}
        </div>
    );
}

export default GunCard;
