import React from 'react';
import type { InventoryItem, CraftedCard } from '../types';
import { WEAPON_CARDS, ITEM_MAP, WEAPON_CARD_MAP } from '../constants';
import { ItemIcon, WeaponIcon } from './ItemIcon';
import styles from '../VanillaGame.module.css';

interface CraftingUIProps {
    inventory: InventoryItem[];
    craftedCards: CraftedCard[];
    onCraft: (cardId: string) => boolean;
    canCraft: (cardId: string) => boolean;
    onClose: () => void;
}

/**
 * Full-screen crafting overlay with modern card-style weapon recipes
 */
export function CraftingUI({ inventory, craftedCards, onCraft, canCraft, onClose }: CraftingUIProps) {
    return (
        <div className={styles.craftingOverlay}>
            <div className={styles.craftingPanel}>
                <div className={styles.craftingHeader}>
                    <h2 className={styles.craftingTitle}>WEAPON FORGE</h2>
                    <span className={styles.craftingSubtitle}>素材を合成して武器カードを作成</span>
                    <button className={styles.craftingClose} onClick={onClose}>ESC</button>
                </div>

                {/* Current inventory display */}
                <div className={styles.craftingInventory}>
                    <div className={styles.craftingInventoryTitle}>MATERIALS</div>
                    <div className={styles.craftingInventoryGrid}>
                        {inventory.map(inv => {
                            const item = ITEM_MAP[inv.itemId];
                            if (!item) return null;
                            return (
                                <div key={inv.itemId} className={styles.craftingMaterial}>
                                    <div className={styles.craftingMaterialIconWrap}>
                                        <ItemIcon itemId={inv.itemId} size={16} />
                                    </div>
                                    <span className={styles.craftingMaterialName}>{item.nameJa}</span>
                                    <span className={styles.craftingMaterialCount}>x{inv.count}</span>
                                </div>
                            );
                        })}
                        {inventory.length === 0 && (
                            <div className={styles.craftingEmpty}>素材なし — ブロックを消して採掘しよう!</div>
                        )}
                    </div>
                </div>

                {/* Recipe list — modern card layout */}
                <div className={styles.craftingRecipes}>
                    <div className={styles.craftingRecipesTitle}>RECIPES</div>
                    <div className={styles.craftingRecipeList}>
                        {WEAPON_CARDS.map(card => {
                            const craftable = canCraft(card.id);
                            const alreadyCrafted = craftedCards.some(cc => cc.cardId === card.id);
                            return (
                                <div
                                    key={card.id}
                                    className={`${styles.craftingRecipe} ${craftable ? styles.craftable : ''} ${alreadyCrafted ? styles.crafted : ''}`}
                                >
                                    <div className={styles.recipeLeft}>
                                        <div
                                            className={styles.recipeIcon}
                                            style={{ background: `radial-gradient(circle, ${card.glowColor}30, ${card.color}10)` }}
                                        >
                                            <ItemIcon itemId={card.id} size={24} />
                                        </div>
                                        <div className={styles.recipeInfo}>
                                            <div className={styles.recipeName}>{card.name}</div>
                                            <div className={styles.recipeNameJa}>{card.nameJa}</div>
                                            <div className={styles.recipeDesc}>{card.descriptionJa}</div>
                                        </div>
                                    </div>
                                    <div className={styles.recipeRight}>
                                        <div className={styles.recipeCost}>
                                            {card.recipe.map((req, i) => {
                                                const item = ITEM_MAP[req.itemId];
                                                if (!item) return null;
                                                const owned = inventory.find(inv => inv.itemId === req.itemId)?.count || 0;
                                                const enough = owned >= req.count;
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`${styles.recipeCostItem} ${enough ? styles.recipeCostEnough : ''}`}
                                                    >
                                                        <ItemIcon itemId={req.itemId} size={12} />
                                                        <span>{owned}/{req.count}</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        {alreadyCrafted ? (
                                            <span className={styles.craftedBadge}>EQUIPPED</span>
                                        ) : (
                                            <button
                                                className={`${styles.craftRecipeBtn} ${craftable ? styles.craftRecipeBtnActive : ''}`}
                                                disabled={!craftable}
                                                onClick={() => onCraft(card.id)}
                                            >
                                                FORGE
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
