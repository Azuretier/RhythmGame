import React, { useState, useEffect } from 'react';
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

const RARITY_EXTRA_DELAY: Record<string, number> = {
    common: 0,
    uncommon: 50,
    rare: 100,
    epic: 150,
    legendary: 200,
};

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

export function CardSelectUI({
    offers, inventory, equippedCards, onSelect, onSkip, worldIdx, stageNumber,
    absorbingCardId, onAbsorptionComplete,
}: CardSelectUIProps) {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [animPhase, setAnimPhase] = useState<'idle' | 'absorbing' | 'flash' | 'done'>('idle');

    // Animation sequence when absorbingCardId is set
    useEffect(() => {
        if (!absorbingCardId) {
            setAnimPhase('idle');
            return;
        }

        const idx = offers.findIndex(o => o.card.id === absorbingCardId);
        if (idx === -1) return;

        setSelectedIdx(idx);
        setAnimPhase('absorbing');

        const rarity = offers[idx].card.rarity;
        const extraDelay = RARITY_EXTRA_DELAY[rarity] || 0;

        // Phase 2: Flash + particles at 500ms
        const flashTimer = setTimeout(() => {
            setAnimPhase('flash');
            spawnAbsorptionParticles(
                offers[idx].card.color,
                offers[idx].card.glowColor,
                rarity,
            );
        }, 500);

        // Phase 3: Done (fade out) at 800ms + rarity delay
        const doneTimer = setTimeout(() => {
            setAnimPhase('done');
        }, 800 + extraDelay);

        // Phase 4: Complete — hand control back to game
        const completeTimer = setTimeout(() => {
            onAbsorptionComplete();
        }, 1000 + extraDelay);

        return () => {
            clearTimeout(flashTimer);
            clearTimeout(doneTimer);
            clearTimeout(completeTimer);
        };
    }, [absorbingCardId, offers, onAbsorptionComplete]);

    const isAnimating = animPhase !== 'idle';

    // Keyboard support: 1/2/3 to select, Escape to skip
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
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
    }, [offers, onSelect, onSkip, isAnimating]);

    const world = WORLDS[worldIdx];

    const overlayClasses = [
        styles.cardSelectOverlay,
        animPhase === 'flash' ? styles.cardAbsorbFlash : '',
        animPhase === 'done' ? styles.cardAbsorbDone : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={overlayClasses}>
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

                        return (
                            <div
                                key={offer.card.id}
                                className={[
                                    styles.cardSelectCard,
                                    styles[`cardRarity_${offer.card.rarity}`],
                                    !isAnimating && selectedIdx === idx ? styles.cardSelectCardSelected : '',
                                    !isAnimating && !offer.affordable ? styles.cardSelectCardDisabled : '',
                                    isAnimating && isSelected ? styles.cardAbsorbing : '',
                                    isAnimating && !isSelected ? styles.cardDismissed : '',
                                    animPhase === 'flash' && isSelected ? styles.cardAbsorbBurst : '',
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

                {/* "OBTAINED!" text during flash phase */}
                {(animPhase === 'flash' || animPhase === 'done') && selectedIdx !== null && (
                    <div className={styles.cardObtainedText}>
                        <span className={styles.cardObtainedIcon}>
                            {offers[selectedIdx].card.icon}
                        </span>
                        <span>OBTAINED!</span>
                        <span className={styles.cardObtainedName}>
                            {offers[selectedIdx].card.name}
                        </span>
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
