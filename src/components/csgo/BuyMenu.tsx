'use client';

import React, { useState } from 'react';
import { BUY_MENU_SECTIONS, CSGO_WEAPON_REGISTRY } from '@/lib/csgo/registry';
import { CSGO_CATEGORY_CONFIG } from '@/types/csgo';
import type { CsgoWeaponDefinition } from '@/types/csgo';
import { GunTexture } from './GunTexture';
import { SkinGradeBadge } from './SkinGradeBadge';
import { GunStatsBar } from './GunStatsBar';
import { cn } from '@/lib/utils';

interface BuyMenuProps {
    money?: number;
    team?: 'terrorist' | 'counter_terrorist';
    onBuy?: (weaponId: string) => void;
    className?: string;
}

/**
 * CS:GO-style buy menu with weapon categories, stats preview, and purchase interaction.
 */
export function BuyMenu({ money = 16000, team = 'terrorist', onBuy, className }: BuyMenuProps) {
    const [selectedWeapon, setSelectedWeapon] = useState<CsgoWeaponDefinition | null>(null);

    return (
        <div className={cn(
            'flex gap-3 rounded-xl border border-white/10 bg-black/60 backdrop-blur-lg p-4',
            className
        )}>
            {/* Left: Category list */}
            <div className="flex flex-col gap-2 w-[240px] shrink-0">
                <div className="flex items-center justify-between px-2 mb-1">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Buy Menu</span>
                    <span className="text-sm font-mono font-bold text-green-400">${money}</span>
                </div>

                {BUY_MENU_SECTIONS.map(section => {
                    const catConf = CSGO_CATEGORY_CONFIG[section.category];
                    return (
                        <div key={section.category}>
                            <div className="flex items-center gap-1.5 px-2 py-1">
                                <span className="text-xs">{catConf.icon}</span>
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                    {section.label}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                {section.weapons.map(wid => {
                                    const w = CSGO_WEAPON_REGISTRY[wid];
                                    if (!w) return null;
                                    if (w.team !== 'both' && w.team !== team) return null;

                                    const canAfford = money >= w.price;
                                    const isSelected = selectedWeapon?.id === w.id;

                                    return (
                                        <button
                                            key={wid}
                                            className={cn(
                                                'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left w-full',
                                                isSelected
                                                    ? 'bg-white/10 border border-white/15'
                                                    : 'border border-transparent hover:bg-white/5',
                                                !canAfford && 'opacity-40'
                                            )}
                                            onClick={() => setSelectedWeapon(w)}
                                        >
                                            <GunTexture weaponId={wid} size={20} />
                                            <span className="text-xs font-medium text-white/80 flex-1 truncate">
                                                {w.name}
                                            </span>
                                            <span className={cn(
                                                'text-[10px] font-mono font-bold',
                                                canAfford ? 'text-green-400/70' : 'text-red-400/70'
                                            )}>
                                                ${w.price}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Right: Weapon detail */}
            <div className="flex-1 min-w-[220px] rounded-lg border border-white/5 bg-white/[0.02] p-4">
                {selectedWeapon ? (
                    <div className="flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex items-start gap-3">
                            <div
                                className="flex items-center justify-center w-14 h-14 rounded-lg"
                                style={{
                                    background: `radial-gradient(circle, ${selectedWeapon.glowColor}15, transparent)`,
                                }}
                            >
                                <GunTexture
                                    weaponId={selectedWeapon.id}
                                    size={44}
                                    glow={selectedWeapon.skinGrade !== 'consumer'}
                                />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-bold" style={{ color: selectedWeapon.color }}>
                                    {selectedWeapon.name}
                                </span>
                                <span className="text-[10px] text-white/40">{selectedWeapon.nameJa}</span>
                                <div className="flex gap-1.5 mt-0.5">
                                    <SkinGradeBadge grade={selectedWeapon.skinGrade} size="sm" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                                        {CSGO_CATEGORY_CONFIG[selectedWeapon.category].label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                            <GunStatsBar label="Damage" value={selectedWeapon.stats.damage} max={120} color="#EF5350" />
                            <GunStatsBar label="Fire Rate" value={selectedWeapon.stats.fireRate} max={1000} color="#FFD54F" />
                            <GunStatsBar label="Accuracy" value={Math.round(selectedWeapon.stats.accuracy * 100)} max={100} color="#4FC3F7" />
                            <GunStatsBar label="Recoil" value={Math.round(selectedWeapon.stats.recoilControl * 100)} max={100} color="#66BB6A" />
                            <GunStatsBar label="Armor Pen" value={Math.round(selectedWeapon.stats.armorPenetration * 100)} max={100} color="#AB47BC" />
                            <GunStatsBar label="Move Spd" value={selectedWeapon.stats.moveSpeed} max={250} color="#FF9800" />
                        </div>

                        {/* Key stats row */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-white/30 uppercase">Magazine</span>
                                <span className="text-xs font-mono font-bold text-white/70">
                                    {selectedWeapon.stats.magazineSize}/{selectedWeapon.stats.reserveAmmo}
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-white/30 uppercase">Reload</span>
                                <span className="text-xs font-mono font-bold text-white/70">
                                    {selectedWeapon.stats.reloadTime}s
                                </span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] text-white/30 uppercase">Kill $</span>
                                <span className="text-xs font-mono font-bold text-green-400/70">
                                    ${selectedWeapon.killReward}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-white/40 leading-relaxed pt-2 border-t border-white/5">
                            {selectedWeapon.description}
                        </p>

                        {/* Buy button */}
                        {onBuy && (
                            <button
                                className={cn(
                                    'w-full py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors',
                                    money >= selectedWeapon.price
                                        ? 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30'
                                        : 'bg-red-600/10 text-red-400/50 border border-red-500/20 cursor-not-allowed'
                                )}
                                onClick={() => {
                                    if (money >= selectedWeapon.price) {
                                        onBuy(selectedWeapon.id);
                                    }
                                }}
                                disabled={money < selectedWeapon.price}
                            >
                                Buy — ${selectedWeapon.price}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-xs text-white/20">
                        Select a weapon
                    </div>
                )}
            </div>
        </div>
    );
}

export default BuyMenu;
