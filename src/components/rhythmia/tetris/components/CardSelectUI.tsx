import React, { useState, useEffect, useCallback, useRef } from 'react';
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
}

const RARITY_COLORS: Record<string, string> = {
    common: '#9E9E9E',
    uncommon: '#4FC3F7',
    rare: '#FFD700',
    epic: '#CE93D8',
    legendary: '#FFFFFF',
};

export function CardSelectUI({
    offers, inventory, equippedCards, onSelect, onSkip, worldIdx, stageNumber,
}: CardSelectUIProps) {
    // -1 = skip button focused, 0-2 = card index focused
    const [focusedIdx, setFocusedIdx] = useState<number>(-1);
    const focusedIdxRef = useRef(focusedIdx);
    focusedIdxRef.current = focusedIdx;

    // Auto-focus first affordable card on mount
    useEffect(() => {
        const firstAffordable = offers.findIndex(o => o.affordable);
        setFocusedIdx(firstAffordable >= 0 ? firstAffordable : -1);
    }, [offers]);

    // Navigate to next/previous affordable card, cycling only through affordable cards
    const affordableIndices = offers.map((o, i) => o.affordable ? i : -1).filter(i => i !== -1);
    const findNextAffordable = useCallback((from: number, direction: 1 | -1): number => {
        if (affordableIndices.length === 0) return from; // no affordable cards, stay put
        const currentPos = affordableIndices.indexOf(from);
        if (currentPos === -1) {
            // Not on an affordable card; jump to first or last
            return direction === 1 ? affordableIndices[0] : affordableIndices[affordableIndices.length - 1];
        }
        const nextPos = (currentPos + direction + affordableIndices.length) % affordableIndices.length;
        return affordableIndices[nextPos];
    }, [affordableIndices]);

    // Keyboard navigation: arrows to move, Enter/Space to confirm, 1/2/3 direct select, Escape to skip
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIdx(prev => findNextAffordable(prev, 1));
                return;
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIdx(prev => findNextAffordable(prev, -1));
                return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const idx = focusedIdxRef.current;
                if (idx >= 0 && idx < offers.length && offers[idx]?.affordable) {
                    onSelect(offers[idx].card.id);
                } else if (idx === -1) {
                    onSkip();
                }
                return;
            }
            if (e.key === '1' && offers[0]?.affordable) {
                setFocusedIdx(0);
                onSelect(offers[0].card.id);
                return;
            }
            if (e.key === '2' && offers[1]?.affordable) {
                setFocusedIdx(1);
                onSelect(offers[1].card.id);
                return;
            }
            if (e.key === '3' && offers[2]?.affordable) {
                setFocusedIdx(2);
                onSelect(offers[2].card.id);
                return;
            }
            if (e.key === 'Escape') {
                setFocusedIdx(-1);
                onSkip();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [offers, onSelect, onSkip, findNextAffordable]);

    const world = WORLDS[worldIdx];

    return (
        <div className={styles.cardSelectOverlay}>
            <div className={styles.cardSelectPanel}>
                {/* Header */}
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

                {/* Card options */}
                <div className={styles.cardSelectCards}>
                    {offers.map((offer, idx) => {
                        const stackInfo = equippedCards.find(ec => ec.cardId === offer.card.id);
                        return (
                            <div
                                key={offer.card.id}
                                className={[
                                    styles.cardSelectCard,
                                    styles[`cardRarity_${offer.card.rarity}`],
                                    focusedIdx === idx ? styles.cardSelectCardFocused : '',
                                    !offer.affordable ? styles.cardSelectCardDisabled : '',
                                ].filter(Boolean).join(' ')}
                                onClick={() => {
                                    if (offer.affordable) {
                                        setFocusedIdx(idx);
                                        onSelect(offer.card.id);
                                    }
                                }}
                                onMouseEnter={() => offer.affordable && setFocusedIdx(idx)}
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

                {/* Equipped cards summary */}
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
                <button
                    className={`${styles.cardSelectSkip} ${focusedIdx === -1 ? styles.cardSelectSkipFocused : ''}`}
                    onClick={onSkip}
                    onMouseEnter={() => setFocusedIdx(-1)}
                >
                    SKIP (ESC)
                </button>
            </div>
        </div>
    );
}
