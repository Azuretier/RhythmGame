import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { TreasureBox, TreasureBoxReward } from '../types';
import { TREASURE_BOX_TIERS, ITEM_MAP, ROGUE_CARD_MAP } from '../constants';
import { ItemIcon } from './ItemIcon';
import styles from '../VanillaGame.module.css';

interface TreasureBoxUIProps {
    box: TreasureBox;
    onOpen: () => void;
    onFinish: () => void;
}

type BoxPhase = 'appear' | 'idle' | 'opening' | 'reveal' | 'rewards' | 'done';

const PHASE_TIMINGS = {
    appear: 600,     // Box slides in
    opening: 800,    // Lid opens with particle burst
    reveal: 400,     // Flash/glow before showing rewards
    rewards: 0,      // Wait for user input
    done: 300,       // Fade out
};

function spawnChestParticles(color: string, glowColor: string, count: number) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2 - 40;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        const size = 4 + Math.random() * 8;
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
        const distance = 60 + Math.random() * 100;

        particle.style.cssText = `
            position: fixed;
            pointer-events: none;
            border-radius: 50%;
            z-index: 10000;
            left: ${centerX}px;
            top: ${centerY}px;
            width: ${size}px;
            height: ${size}px;
            background: ${Math.random() > 0.5 ? color : glowColor};
            box-shadow: 0 0 ${size * 2}px ${glowColor};
            transition: all ${500 + Math.random() * 300}ms ease-out;
            transform: translate(-50%, -50%);
        `;

        document.body.appendChild(particle);

        requestAnimationFrame(() => {
            particle.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0)`;
            particle.style.opacity = '0';
        });

        setTimeout(() => particle.remove(), 900);
    }
}

function RewardDisplay({ reward, index }: { reward: TreasureBoxReward; index: number }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), index * 200);
        return () => clearTimeout(timer);
    }, [index]);

    switch (reward.type) {
        case 'materials':
            return (
                <div className={`${styles.treasureRewardItem} ${visible ? styles.treasureRewardVisible : ''}`}>
                    <div className={styles.treasureRewardLabel}>MATERIALS</div>
                    <div className={styles.treasureRewardMaterials}>
                        {reward.items.map((item, i) => {
                            const itemDef = ITEM_MAP[item.itemId];
                            return (
                                <div key={i} className={styles.treasureRewardMaterialChip}>
                                    <ItemIcon itemId={item.itemId} size={16} />
                                    <span style={{ color: itemDef?.color || '#fff' }}>
                                        +{item.count} {itemDef?.nameJa || item.itemId}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );

        case 'score_bonus':
            return (
                <div className={`${styles.treasureRewardItem} ${visible ? styles.treasureRewardVisible : ''}`}>
                    <div className={styles.treasureRewardLabel}>SCORE BONUS</div>
                    <div className={styles.treasureRewardScore}>
                        +{reward.amount.toLocaleString()}
                    </div>
                </div>
            );

        case 'free_card': {
            const card = reward.card;
            return (
                <div className={`${styles.treasureRewardItem} ${visible ? styles.treasureRewardVisible : ''}`}>
                    <div className={styles.treasureRewardLabel}>FREE CARD</div>
                    <div className={styles.treasureRewardCard} style={{ borderColor: `${card.color}60` }}>
                        <span className={styles.treasureRewardCardIcon}>{card.icon}</span>
                        <span className={styles.treasureRewardCardName}>{card.name}</span>
                        <span className={styles.treasureRewardCardNameJa}>{card.nameJa}</span>
                    </div>
                </div>
            );
        }

        case 'effect_boost':
            return (
                <div className={`${styles.treasureRewardItem} ${visible ? styles.treasureRewardVisible : ''}`}>
                    <div className={styles.treasureRewardLabel}>EFFECT BOOST</div>
                    <div className={styles.treasureRewardEffect}>
                        {reward.effect.replace('_', ' ').toUpperCase()} +{Math.round(reward.value * 100)}%
                    </div>
                </div>
            );

        default:
            return null;
    }
}

export function TreasureBoxUI({ box, onOpen, onFinish }: TreasureBoxUIProps) {
    const [phase, setPhase] = useState<BoxPhase>('appear');
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const tierConfig = TREASURE_BOX_TIERS[box.tier];

    const clearTimers = useCallback(() => {
        timersRef.current.forEach((t: ReturnType<typeof setTimeout>) => clearTimeout(t));
        timersRef.current = [];
    }, []);

    const addTimer = useCallback((fn: () => void, ms: number) => {
        timersRef.current.push(setTimeout(fn, ms));
    }, []);

    // Clean up all timers on unmount
    useEffect(() => {
        return clearTimers;
    }, [clearTimers]);

    // Appear animation
    useEffect(() => {
        addTimer(() => setPhase('idle'), PHASE_TIMINGS.appear);
    }, [addTimer]);

    const handleOpen = useCallback(() => {
        if (phase !== 'idle') return;

        setPhase('opening');
        onOpen();

        // Spawn particles on open
        addTimer(() => {
            spawnChestParticles(tierConfig.color, tierConfig.glowColor,
                box.tier === 'crystal' ? 24 : box.tier === 'golden' ? 18 : box.tier === 'iron' ? 12 : 8
            );
            setPhase('reveal');
        }, PHASE_TIMINGS.opening);

        addTimer(() => {
            setPhase('rewards');
        }, PHASE_TIMINGS.opening + PHASE_TIMINGS.reveal);
    }, [phase, onOpen, addTimer, tierConfig, box.tier]);

    const handleDismiss = useCallback(() => {
        if (phase !== 'rewards') return;
        setPhase('done');
        addTimer(() => onFinish(), PHASE_TIMINGS.done);
    }, [phase, onFinish, addTimer]);

    // Keyboard controls
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (phase === 'idle') {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpen();
                }
            } else if (phase === 'rewards') {
                e.preventDefault();
                handleDismiss();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [phase, handleOpen, handleDismiss]);

    const overlayClasses = [
        styles.treasureBoxOverlay,
        phase === 'appear' ? styles.treasureBoxAppear : '',
        phase === 'done' ? styles.treasureBoxDone : '',
        (phase === 'opening' || phase === 'reveal') ? styles.treasureBoxFlash : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={overlayClasses}
            onClick={() => {
                if (phase === 'idle') handleOpen();
                else if (phase === 'rewards') handleDismiss();
            }}
        >
            <div className={styles.treasureBoxPanel}>
                {/* Header */}
                {(phase === 'appear' || phase === 'idle') && (
                    <div className={styles.treasureBoxHeader}>
                        <div className={styles.treasureBoxTitle}>TREASURE FOUND!</div>
                        <div className={styles.treasureBoxSubtitle}>宝箱を発見！</div>
                    </div>
                )}

                {/* Chest icon with tier styling */}
                {phase !== 'rewards' && phase !== 'done' && (
                    <div
                        className={[
                            styles.treasureBoxChest,
                            phase === 'idle' ? styles.treasureBoxChestIdle : '',
                            phase === 'opening' ? styles.treasureBoxChestOpening : '',
                            phase === 'reveal' ? styles.treasureBoxChestRevealed : '',
                        ].filter(Boolean).join(' ')}
                        style={{
                            '--chest-color': tierConfig.color,
                            '--chest-glow': tierConfig.glowColor,
                        } as React.CSSProperties}
                    >
                        <div className={styles.treasureBoxIcon}>{tierConfig.icon}</div>
                        <div className={styles.treasureBoxTierName} style={{ color: tierConfig.color }}>
                            {tierConfig.name}
                        </div>
                        <div className={styles.treasureBoxTierNameJa} style={{ color: tierConfig.color }}>
                            {tierConfig.nameJa}
                        </div>
                    </div>
                )}

                {/* Open prompt */}
                {phase === 'idle' && (
                    <div className={styles.treasureBoxPrompt}>
                        CLICK OR PRESS ENTER TO OPEN
                    </div>
                )}

                {/* Rewards display */}
                {phase === 'rewards' && (
                    <div className={styles.treasureBoxRewards}>
                        <div className={styles.treasureBoxRewardsTitle} style={{ color: tierConfig.color }}>
                            {tierConfig.icon} {tierConfig.nameJa}
                        </div>
                        <div className={styles.treasureBoxRewardsList}>
                            {box.rewards.map((reward, i) => (
                                <RewardDisplay key={i} reward={reward} index={i} />
                            ))}
                        </div>
                        <div className={styles.treasureBoxContinue}>
                            CLICK OR PRESS ANY KEY
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
