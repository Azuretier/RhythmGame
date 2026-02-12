'use client';

// =============================================================
// Minecraft Board Game - Crafting Panel
// Shows available recipes and allows crafting
// =============================================================

import { useMemo } from 'react';
import type { MCPlayerState, WorldTile } from '@/types/minecraft-board';
import { BLOCK_PROPERTIES, ITEM_ICONS, ITEM_COLORS, MC_BOARD_CONFIG } from '@/types/minecraft-board';
import { RECIPES, canCraft, countItem } from '@/lib/minecraft-board/recipes';
import type { CraftingRecipe } from '@/lib/minecraft-board/recipes';
import styles from './MinecraftBoard.module.css';

interface CraftingPanelProps {
  selfState: MCPlayerState;
  exploredTilesRef: React.MutableRefObject<Map<string, WorldTile>>;
  onCraft: (recipeId: string) => void;
  onClose: () => void;
}

export default function CraftingPanel({
  selfState,
  exploredTilesRef,
  onCraft,
  onClose,
}: CraftingPanelProps) {
  // Check if near crafting table or furnace
  const { nearCraftingTable, nearFurnace } = useMemo(() => {
    let ct = false;
    let fn = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${selfState.x + dx},${selfState.y + dy}`;
        const tile = exploredTilesRef.current.get(key);
        if (tile) {
          if (tile.block === 'crafting_table') ct = true;
          if (tile.block === 'furnace') fn = true;
        }
      }
    }
    return { nearCraftingTable: ct, nearFurnace: fn };
  }, [selfState.x, selfState.y, exploredTilesRef]);

  // Group recipes by tier
  const recipesByTier = useMemo(() => {
    const tiers: Map<number, { recipe: CraftingRecipe; craftable: boolean }[]> = new Map();
    for (const recipe of RECIPES) {
      const craftable = canCraft(recipe, selfState.inventory, nearCraftingTable, nearFurnace);
      const tier = recipe.tier;
      if (!tiers.has(tier)) tiers.set(tier, []);
      tiers.get(tier)!.push({ recipe, craftable });
    }
    return tiers;
  }, [selfState.inventory, nearCraftingTable, nearFurnace]);

  const tierNames: Record<number, string> = {
    0: 'Basic',
    1: 'Wooden',
    2: 'Stone',
    3: 'Iron & Smelting',
    4: 'Diamond',
    5: 'Endgame',
  };

  return (
    <div className={styles.craftingPanel}>
      <div className={styles.craftingHeader}>
        <h3>Crafting</h3>
        <div className={styles.craftingStations}>
          <span className={nearCraftingTable ? styles.stationActive : styles.stationInactive}>
            [T] Crafting Table {nearCraftingTable ? 'OK' : '--'}
          </span>
          <span className={nearFurnace ? styles.stationActive : styles.stationInactive}>
            [F] Furnace {nearFurnace ? 'OK' : '--'}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>X</button>
      </div>

      <div className={styles.craftingRecipes}>
        {Array.from(recipesByTier.entries())
          .sort(([a], [b]) => a - b)
          .map(([tier, recipes]) => (
            <div key={tier} className={styles.craftingTier}>
              <h4 className={styles.tierTitle}>{tierNames[tier] || `Tier ${tier}`}</h4>
              {recipes.map(({ recipe, craftable }) => (
                <div
                  key={recipe.id}
                  className={`${styles.recipeRow} ${craftable ? styles.recipeCraftable : styles.recipeDisabled}`}
                >
                  <div className={styles.recipeInfo}>
                    <span className={styles.recipeOutput}>
                      <span style={{ color: ITEM_COLORS[recipe.output.item] || '#ccc' }}>
                        {ITEM_ICONS[recipe.output.item] || '?'}
                      </span>
                      {' '}{recipe.name}
                      {recipe.output.quantity > 1 && ` x${recipe.output.quantity}`}
                    </span>
                    <div className={styles.recipeInputs}>
                      {recipe.inputs.map((input, i) => {
                        const has = countItem(selfState.inventory, input.item);
                        const enough = has >= input.quantity;
                        return (
                          <span
                            key={i}
                            className={enough ? styles.inputOk : styles.inputMissing}
                          >
                            <span style={{ color: ITEM_COLORS[input.item] || '#888' }}>
                              {ITEM_ICONS[input.item] || '?'}
                            </span>
                            {' '}{has}/{input.quantity}
                          </span>
                        );
                      })}
                      {recipe.requiresCraftingTable && (
                        <span className={nearCraftingTable ? styles.inputOk : styles.inputMissing}>
                          [Table]
                        </span>
                      )}
                      {recipe.requiresFurnace && (
                        <span className={nearFurnace ? styles.inputOk : styles.inputMissing}>
                          [Furnace]
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className={styles.craftBtn}
                    disabled={!craftable}
                    onClick={() => onCraft(recipe.id)}
                  >
                    Craft
                  </button>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
