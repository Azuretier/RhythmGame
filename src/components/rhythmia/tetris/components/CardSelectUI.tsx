import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CardOffer, InventoryItem, EquippedCard } from '../types';
import { ITEM_MAP, ROGUE_CARD_MAP, WORLDS } from '../constants';
import { ItemIcon } from './ItemIcon';
import styles from '../VanillaGame.module.css';

interface CardSelectUIProps {
    offers: CardOffer[];
    inventory: InventoryItem[];
    equippedCards: EquippedCard[];
    onSelect: (cardId: string) => boolean;
    onSkip: () => void;
    worldIdx: number;
    stageNumber: number;
    absorbingCardId: string | null;
    onAbsorptionComplete: () => void;
}

const RARITY_COLORS: Record<string, string> = {
    common: '#9E9E9E',
    uncommon: '#4FC3F7',
    rare: '#FFD700',
    epic: '#CE93D8',
    legendary: '#FFFFFF',
};

// ===== Dopamine-Optimized Timing Configuration =====

// Phase 1: Anticipation — "wind-up" before the reveal
// Standard cards keep it fast; rare+ extends anticipation to spike dopamine
const RARITY_ANTICIPATION_MS: Record<string, number> = {
    common: 500,
    uncommon: 650,
    rare: 900,
    epic: 1100,
    legendary: 1400,
};

// Phase 2: Hitstop — micro-freeze before the grand reveal (rare+ only)
// Momentarily freezing game state artificially spikes the impact
const RARITY_HITSTOP_MS: Record<string, number> = {
    common: 0,
    uncommon: 0,
    rare: 60,
    epic: 100,
    legendary: 150,
};

// Phase 3: Impact duration — burst/flash/"OBTAINED!" slam
const IMPACT_DURATION_MS = 350;

// Phase 4: Display — auto-dismiss fallback (wait-for-input is primary)
const DISPLAY_AUTO_DISMISS_MS = 3500;

// Phase 5: Done — fade-out
const DONE_FADE_MS = 200;

// Variable ratio jitter: ±range added to anticipation (prevents habituation)
const JITTER_RANGE_MS = 100;

const RARITY_PARTICLE_CONFIG: Record<string, { count: number; spread: number; size: number; waves: number }> = {
    common:    { count: 8,  spread: 60,  size: 6,  waves: 1 },
    uncommon:  { count: 12, spread: 80,  size: 7,  waves: 1 },
    rare:      { count: 16, spread: 100, size: 8,  waves: 2 },
    epic:      { count: 20, spread: 120, size: 9,  waves: 2 },
    legendary: { count: 28, spread: 150, size: 10, waves: 3 },
};

function spawnAbsorptionParticles(color: string, glowColor: string, rarity: string) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const config = RARITY_PARTICLE_CONFIG[rarity] || RARITY_PARTICLE_CONFIG.common;

    for (let wave = 0; wave < config.waves; wave++) {
        setTimeout(() => {
            for (let i = 0; i < config.count; i++) {
                const particle = document.createElement('div');
                const particleSize = config.size + Math.random() * 5;
                const angle = (Math.PI * 2 / config.count) * i + (wave * 0.3);
                const distance = config.spread + Math.random() * (config.spread * 0.5);
                const particleColor = wave === 0 ? color : glowColor;

                particle.style.cssText = `
                    position: fixed;
                    pointer-events: none;
                    border-radius: 50%;
                    z-index: 9999;
                    left: ${centerX}px;
                    top: ${centerY}px;
                    width: ${particleSize}px;
                    height: ${particleSize}px;
                    background: ${particleColor};
                    box-shadow: 0 0 ${particleSize * 2}px ${glowColor};
                    transition: all ${400 + wave * 100}ms ease-out;
                    transform: translate(-50%, -50%);
                `;

                document.body.appendChild(particle);

                requestAnimationFrame(() => {
                    particle.style.transform = `translate(${Math.cos(angle) * distance - particleSize / 2}px, ${Math.sin(angle) * distance - particleSize / 2}px) scale(0)`;
                    particle.style.opacity = '0';
                });

                setTimeout(() => particle.remove(), 500 + wave * 100);
            }
        }, wave * 120);
    }
}

type AnimPhase = 'idle' | 'anticipation' | 'hitstop' | 'impact' | 'display' | 'done';

export function CardSelectUI({
    offers, inventory, equippedCards, onSelect, onSkip, worldIdx, stageNumber,
    absorbingCardId, onAbsorptionComplete,
}: CardSelectUIProps) {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [animPhase, setAnimPhase] = useState<AnimPhase>('idle');
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const displayDismissedRef = useRef(false);

    // Clear all pending timers
    const clearTimers = useCallback(() => {
        timersRef.current.forEach(t => clearTimeout(t));
        timersRef.current = [];
    }, []);

    const addTimer = useCallback((fn: () => void, ms: number) => {
        timersRef.current.push(setTimeout(fn, ms));
    }, []);

    // Dismiss from display phase (player input or auto-dismiss)
    const dismissDisplay = useCallback(() => {
        if (displayDismissedRef.current) return;
        displayDismissedRef.current = true;
        setAnimPhase('done');
        addTimer(() => {
            onAbsorptionComplete();
        }, DONE_FADE_MS);
    }, [onAbsorptionComplete, addTimer]);

    // Dopamine-optimized animation sequence
    useEffect(() => {
        if (!absorbingCardId) {
            setAnimPhase('idle');
            displayDismissedRef.current = false;
            return;
        }

        const idx = offers.findIndex(o => o.card.id === absorbingCardId);
        if (idx === -1) return;

        setSelectedIdx(idx);
        displayDismissedRef.current = false;

        const rarity = offers[idx].card.rarity;

        // Variable ratio jitter: randomize anticipation ±JITTER_RANGE_MS
        const jitter = Math.floor(Math.random() * JITTER_RANGE_MS * 2) - JITTER_RANGE_MS;
        const anticipationMs = Math.max(300, (RARITY_ANTICIPATION_MS[rarity] || 500) + jitter);
        const hitstopMs = RARITY_HITSTOP_MS[rarity] || 0;

        // Phase 1: Anticipation — card hovers with building glow
        setAnimPhase('anticipation');

        let elapsed = anticipationMs;

        // Phase 2: Hitstop — micro-freeze (rare+ only)
        if (hitstopMs > 0) {
            addTimer(() => {
                setAnimPhase('hitstop');
            }, elapsed);
            elapsed += hitstopMs;
        }

        // Phase 3: Impact — burst, particles, "OBTAINED!" slam
        addTimer(() => {
            setAnimPhase('impact');
            spawnAbsorptionParticles(
                offers[idx].card.color,
                offers[idx].card.glowColor,
                rarity,
            );
        }, elapsed);
        elapsed += IMPACT_DURATION_MS;

        // Phase 4: Display — wait for player input (cognitive processing reward)
        addTimer(() => {
            setAnimPhase('display');
        }, elapsed);

        // Auto-dismiss fallback to prevent soft-lock
        addTimer(() => {
            dismissDisplay();
        }, elapsed + DISPLAY_AUTO_DISMISS_MS);

        return clearTimers;
    }, [absorbingCardId, offers, dismissDisplay, clearTimers, addTimer]);

    const isAnimating = animPhase !== 'idle';

    // Keyboard: 1/2/3 to select, Escape to skip, any key to dismiss display
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            // During display phase: any key dismisses
            if (animPhase === 'display') {
                e.preventDefault();
                dismissDisplay();
                return;
            }
            // Block all input during other animation phases
            if (isAnimating) return;

            if (e.key === '1' && offers[0]?.affordable) {
                onSelect(offers[0].card.id);
                return;
            }
            if (e.key === '2' && offers[1]?.affordable) {
                onSelect(offers[1].card.id);
                return;
            }
            if (e.key === '3' && offers[2]?.affordable) {
                onSelect(offers[2].card.id);
                return;
            }
            if (e.key === 'Escape') {
                onSkip();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [offers, onSelect, onSkip, isAnimating, animPhase, dismissDisplay]);

    const world = WORLDS[worldIdx];

    // Overlay classes per phase
    const overlayClasses = [
        styles.cardSelectOverlay,
        animPhase === 'impact' ? styles.cardAbsorbFlash : '',
        animPhase === 'done' ? styles.cardAbsorbDone : '',
        animPhase === 'hitstop' ? styles.cardHitstopOverlay : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={overlayClasses}
            onClick={() => {
                if (animPhase === 'display') dismissDisplay();
            }}
        >
            <div className={styles.cardSelectPanel}>
                {/* Header — hidden during animation */}
                {!isAnimating && (
                    <>
                        <div className={styles.cardSelectHeader}>
                            <div className={styles.cardSelectTitle}>CHOOSE YOUR PATH</div>
                            <div className={styles.cardSelectSubtitle}>道を選べ</div>
                            <div className={styles.cardSelectStage}>
                                Stage {stageNumber} Complete {world ? `\u2014 ${world.name}` : ''}
                            </div>
                        </div>

                        {/* Current materials bar */}
                        {inventory.length > 0 && (
                            <div className={styles.cardSelectMaterials}>
                                {inventory.map(inv => {
                                    const item = ITEM_MAP[inv.itemId];
                                    if (!item) return null;
                                    return (
                                        <div key={inv.itemId} className={styles.cardSelectMaterialChip}>
                                            <ItemIcon itemId={inv.itemId} size={14} />
                                            <span>{inv.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Card options */}
                <div className={styles.cardSelectCards}>
                    {offers.map((offer, idx) => {
                        const stackInfo = equippedCards.find(ec => ec.cardId === offer.card.id);
                        const isSelected = selectedIdx === idx;
                        const rarityClass = styles[`cardRarity_${offer.card.rarity}`];

                        // Determine per-card animation class
                        let animClass = '';
                        if (isAnimating && isSelected) {
                            if (animPhase === 'anticipation') animClass = styles.cardAnticipation;
                            else if (animPhase === 'hitstop') animClass = styles.cardHitstop;
                            else if (animPhase === 'impact') animClass = styles.cardAbsorbBurst;
                            else if (animPhase === 'display' || animPhase === 'done') animClass = styles.cardAbsorbHidden;
                        } else if (isAnimating && !isSelected) {
                            animClass = styles.cardDismissed;
                        }

                        return (
                            <div
                                key={offer.card.id}
                                className={[
                                    styles.cardSelectCard,
                                    rarityClass,
                                    !isAnimating && selectedIdx === idx ? styles.cardSelectCardSelected : '',
                                    !isAnimating && !offer.affordable ? styles.cardSelectCardDisabled : '',
                                    animClass,
                                ].filter(Boolean).join(' ')}
                                onClick={() => {
                                    if (!isAnimating && offer.affordable) {
                                        setSelectedIdx(idx);
                                        onSelect(offer.card.id);
                                    }
                                }}
                                onMouseEnter={() => !isAnimating && offer.affordable && setSelectedIdx(idx)}
                                onMouseLeave={() => !isAnimating && setSelectedIdx(null)}
                                style={{
                                    '--card-color': offer.card.color,
                                    '--card-glow': offer.card.glowColor,
                                    '--anticipation-duration': `${RARITY_ANTICIPATION_MS[offer.card.rarity] || 500}ms`,
                                } as React.CSSProperties}
                            >
                                {/* Card number shortcut */}
                                <div className={styles.cardNumber}>{idx + 1}</div>

                                {/* Icon */}
                                <div className={styles.cardIcon}>{offer.card.icon}</div>

                                {/* Name */}
                                <div className={styles.cardName}>{offer.card.name}</div>
                                <div className={styles.cardNameJa}>{offer.card.nameJa}</div>

                                {/* Rarity badge */}
                                <div className={styles.cardRarity} style={{ color: RARITY_COLORS[offer.card.rarity] }}>
                                    {offer.card.rarity.toUpperCase()}
                                </div>

                                {/* Attribute description */}
                                <div className={styles.cardDesc}>{offer.card.description}</div>
                                <div className={styles.cardDescJa}>{offer.card.descriptionJa}</div>

                                {/* Cost */}
                                <div className={styles.cardCost}>
                                    {offer.scaledCost.map((c, i) => {
                                        const owned = inventory.find(inv => inv.itemId === c.itemId)?.count || 0;
                                        const enough = owned >= c.count;
                                        return (
                                            <span key={i} className={`${styles.cardCostChip} ${enough ? styles.cardCostEnough : ''}`}>
                                                <ItemIcon itemId={c.itemId} size={12} />
                                                <span>{owned}/{c.count}</span>
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Stack indicator */}
                                {stackInfo && (
                                    <div className={styles.cardStackBadge}>
                                        +STACK (x{stackInfo.stackCount + 1})
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* "OBTAINED!" text during impact and display phases */}
                {(animPhase === 'impact' || animPhase === 'display' || animPhase === 'done') && selectedIdx !== null && (
                    <div className={`${styles.cardObtainedText} ${animPhase === 'display' ? styles.cardObtainedDisplay : ''}`}>
                        <span className={styles.cardObtainedIcon}>
                            {offers[selectedIdx].card.icon}
                        </span>
                        <span>OBTAINED!</span>
                        <span className={styles.cardObtainedName}>
                            {offers[selectedIdx].card.name}
                        </span>
                        {/* Display phase: show card description for cognitive processing */}
                        {animPhase === 'display' && (
                            <>
                                <span className={styles.cardObtainedDesc}>
                                    {offers[selectedIdx].card.description}
                                </span>
                                <span className={styles.cardObtainedContinue}>
                                    CLICK OR PRESS ANY KEY
                                </span>
                            </>
                        )}
                    </div>
                )}

                {/* Equipped cards summary & skip — hidden during animation */}
                {!isAnimating && (
                    <>
                        {equippedCards.length > 0 && (
                            <div className={styles.cardSelectEquipped}>
                                <span className={styles.cardSelectEquippedLabel}>
                                    EQUIPPED ({equippedCards.length})
                                </span>
                                <div className={styles.cardSelectEquippedList}>
                                    {equippedCards.map((ec, idx) => {
                                        const card = ROGUE_CARD_MAP[ec.cardId];
                                        if (!card) return null;
                                        return (
                                            <div key={idx} className={styles.cardSelectEquippedChip} style={{ borderColor: `${card.color}40` }}>
                                                <span>{card.icon}</span>
                                                <span>{card.nameJa}</span>
                                                {ec.stackCount > 1 && <span className={styles.cardSelectEquippedStack}>x{ec.stackCount}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Skip button */}
                        <button className={styles.cardSelectSkip} onClick={onSkip}>
                            SKIP (ESC)
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
