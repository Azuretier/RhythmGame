'use client';

// =============================================================================
// Minecraft: Switch Edition — Crafting Table Screen
// =============================================================================
// Full crafting table overlay with 3x3 crafting grid, output slot, player
// inventory, and a toggleable recipe book with category filtering.
// Supports click-to-place, shift-click for quick moves, and auto-fill
// from recipe book selection.
// =============================================================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { InventorySlot, EnchantmentInstance } from '@/types/minecraft-switch';
import { getCraftingEngine, type GridCell, type CraftResult } from '@/lib/minecraft-switch/crafting/crafting-engine';
import { RECIPE_CATEGORIES, type RecipeCategory } from '@/lib/minecraft-switch/crafting/recipes';
import type { CraftingRecipe } from '@/types/minecraft-switch';

// =============================================================================
// PROPS
// =============================================================================

interface CraftingScreenProps {
  /** Main inventory: 27 slots (top 3 rows). */
  mainInventory: (InventorySlot | null)[];
  /** Hotbar: 9 slots. */
  hotbar: (InventorySlot | null)[];
  /** Close the crafting screen. */
  onClose: () => void;
  /** Called when inventory changes. Passes updated main + hotbar arrays. */
  onInventoryChange: (main: (InventorySlot | null)[], hotbar: (InventorySlot | null)[]) => void;
}

type ContainerType = 'main' | 'hotbar' | 'crafting' | 'output';

interface SlotAddress {
  container: ContainerType;
  index: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function getItemColor(itemId: string): string {
  if (itemId.includes('diamond')) return '#4AEDD9';
  if (itemId.includes('gold') || itemId.includes('golden')) return '#FFD700';
  if (itemId.includes('iron')) return '#D4D4D4';
  if (itemId.includes('netherite')) return '#4D3D37';
  if (itemId.includes('stone') || itemId.includes('cobble')) return '#808080';
  if (itemId.includes('wood') || itemId.includes('oak') || itemId.includes('planks')) return '#B8935A';
  if (itemId.includes('coal') || itemId.includes('charcoal')) return '#333333';
  if (itemId.includes('redstone')) return '#FF0000';
  if (itemId.includes('lapis')) return '#2546BD';
  if (itemId.includes('emerald')) return '#17DD62';
  if (itemId.includes('leather')) return '#8B5A2B';
  if (itemId.includes('torch')) return '#FFD040';
  if (itemId.includes('wool')) return '#F0F0F0';
  if (itemId.includes('glass')) return '#C8E8FF';
  if (itemId.includes('brick')) return '#B74C3C';
  if (itemId.includes('sand')) return '#E8D9A0';
  if (itemId.includes('dirt') || itemId.includes('log')) return '#8B6B3D';
  if (itemId.includes('sword') || itemId.includes('pickaxe') || itemId.includes('axe') || itemId.includes('shovel') || itemId.includes('hoe')) return '#99BBDD';
  if (itemId.includes('helmet') || itemId.includes('chestplate') || itemId.includes('leggings') || itemId.includes('boots')) return '#AACCEE';
  return '#AAA';
}

function getItemInitial(itemId: string): string {
  const name = itemId.replace(/_/g, ' ');
  const words = name.split(' ');
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatItemName(itemId: string): string {
  return itemId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatEnchantment(ench: EnchantmentInstance): string {
  const name = ench.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
  const level = romanNumerals[ench.level - 1] ?? ench.level.toString();
  return `${name} ${level}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  building: 'Building',
  decoration: 'Deco',
  redstone: 'Redstone',
  transportation: 'Transport',
  tools: 'Tools',
  combat: 'Combat',
  food: 'Food',
  misc: 'Misc',
};

// =============================================================================
// ITEM TOOLTIP
// =============================================================================

function ItemTooltip({ item, x, y }: { item: InventorySlot; x: number; y: number }) {
  return (
    <div
      className="fixed z-[100] pointer-events-none px-2 py-1 rounded-sm border border-purple-800/80 max-w-[200px]"
      style={{
        left: x + 12,
        top: y - 8,
        backgroundColor: 'rgba(16, 0, 32, 0.94)',
      }}
    >
      <div className="font-pixel text-xs text-white whitespace-nowrap">
        {formatItemName(item.item)}
      </div>
      {item.enchantments && item.enchantments.length > 0 && (
        <div className="mt-0.5">
          {item.enchantments.map((ench, i) => (
            <div key={i} className="font-pixel text-[10px] text-gray-400">
              {formatEnchantment(ench)}
            </div>
          ))}
        </div>
      )}
      {item.durability !== undefined && (
        <div className="font-pixel text-[10px] text-gray-500 mt-0.5">
          Durability: {item.durability}
        </div>
      )}
      {item.count > 1 && (
        <div className="font-pixel text-[10px] text-gray-500">
          Count: {item.count}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// INVENTORY SLOT COMPONENT
// =============================================================================

function InvSlot({
  slot,
  address,
  onLeftClick,
  onRightClick,
  onShiftClick,
  onMouseEnter,
  onMouseLeave,
  isHighlighted,
  isOutputSlot,
}: {
  slot: InventorySlot | null;
  address: SlotAddress;
  onLeftClick: (addr: SlotAddress) => void;
  onRightClick: (addr: SlotAddress) => void;
  onShiftClick: (addr: SlotAddress) => void;
  onMouseEnter: (addr: SlotAddress, e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  isHighlighted?: boolean;
  isOutputSlot?: boolean;
}) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      onShiftClick(address);
    } else {
      onLeftClick(address);
    }
  }, [address, onLeftClick, onShiftClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onRightClick(address);
  }, [address, onRightClick]);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center cursor-pointer',
        'border transition-colors',
        isOutputSlot ? 'w-12 h-12' : 'w-10 h-10',
        isHighlighted
          ? 'bg-white/20 border-white/50'
          : 'bg-gray-800/60 hover:bg-gray-700/60 border-gray-600',
        isOutputSlot && 'border-yellow-600/60',
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={(e) => onMouseEnter(address, e)}
      onMouseLeave={onMouseLeave}
    >
      {/* Inner highlight */}
      <div className="absolute inset-[1px] border border-gray-700/40" />

      {slot ? (
        <>
          {/* Item icon */}
          <div
            className={cn(
              'flex items-center justify-center font-pixel text-xs font-bold rounded-sm',
              isOutputSlot ? 'w-9 h-9' : 'w-7 h-7',
            )}
            style={{
              backgroundColor: getItemColor(slot.item) + '33',
              color: getItemColor(slot.item),
              textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
            }}
          >
            {getItemInitial(slot.item)}
          </div>
          {/* Stack count */}
          {slot.count > 1 && (
            <span
              className="absolute bottom-0 right-0.5 font-pixel text-[10px] text-white font-bold"
              style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
            >
              {slot.count}
            </span>
          )}
          {/* Durability bar */}
          {slot.durability !== undefined && slot.durability < 100 && (
            <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-gray-900">
              <div
                className="h-full"
                style={{
                  width: `${slot.durability}%`,
                  backgroundColor: slot.durability > 60 ? '#4f4' : slot.durability > 30 ? '#ff4' : '#f44',
                }}
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// =============================================================================
// RECIPE PREVIEW (mini grid in recipe book)
// =============================================================================

function RecipePreview({
  recipe,
  isSelected,
  canCraft,
  onClick,
}: {
  recipe: CraftingRecipe;
  isSelected: boolean;
  canCraft: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'relative p-1 rounded-sm cursor-pointer border transition-colors',
        isSelected
          ? 'border-yellow-400 bg-yellow-400/10'
          : canCraft
            ? 'border-gray-500 bg-gray-700/40 hover:bg-gray-600/40'
            : 'border-gray-700 bg-gray-800/40 hover:bg-gray-700/40 opacity-60',
      )}
      onClick={onClick}
      title={formatItemName(recipe.result)}
    >
      {/* Result item display */}
      <div
        className="w-8 h-8 flex items-center justify-center font-pixel text-[10px] font-bold rounded-sm"
        style={{
          backgroundColor: getItemColor(recipe.result) + '33',
          color: getItemColor(recipe.result),
          textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
        }}
      >
        {getItemInitial(recipe.result)}
      </div>
      {recipe.resultCount > 1 && (
        <span
          className="absolute bottom-0.5 right-0.5 font-pixel text-[8px] text-white font-bold"
          style={{ textShadow: '1px 1px 0 #000' }}
        >
          {recipe.resultCount}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// RECIPE DETAIL (shown when a recipe is selected in the book)
// =============================================================================

function RecipeDetail({
  recipe,
  canCraft,
  onAutoFill,
}: {
  recipe: CraftingRecipe;
  canCraft: boolean;
  onAutoFill: (recipe: CraftingRecipe) => void;
}) {
  const engine = useMemo(() => getCraftingEngine(), []);
  const patternGrid = useMemo(() => engine.getPatternGrid(recipe), [engine, recipe]);
  const requiredItems = useMemo(() => engine.getRequiredItems(recipe), [engine, recipe]);

  return (
    <div className="p-2 border-t border-gray-600 mt-1">
      {/* Recipe name */}
      <div className="font-pixel text-xs text-white mb-2 text-center">
        {formatItemName(recipe.result)}
        {recipe.resultCount > 1 && ` x${recipe.resultCount}`}
      </div>

      {/* Pattern grid or ingredient list */}
      {recipe.type === 'shaped' && patternGrid ? (
        <div className="flex justify-center mb-2">
          <div className="grid grid-cols-3 gap-[1px]">
            {Array.from({ length: 3 }, (_, row) =>
              Array.from({ length: 3 }, (_, col) => {
                const item = patternGrid[row]?.[col] ?? null;
                return (
                  <div
                    key={`${row}-${col}`}
                    className="w-7 h-7 flex items-center justify-center border border-gray-700 bg-gray-800/40"
                  >
                    {item && (
                      <div
                        className="w-5 h-5 flex items-center justify-center font-pixel text-[8px] font-bold rounded-sm"
                        style={{
                          backgroundColor: getItemColor(item) + '33',
                          color: getItemColor(item),
                        }}
                      >
                        {getItemInitial(item)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : recipe.type === 'shapeless' && recipe.ingredients ? (
        <div className="flex flex-wrap justify-center gap-1 mb-2">
          {recipe.ingredients.map((item, i) => (
            <div
              key={i}
              className="w-7 h-7 flex items-center justify-center border border-gray-700 bg-gray-800/40"
            >
              <div
                className="w-5 h-5 flex items-center justify-center font-pixel text-[8px] font-bold rounded-sm"
                style={{
                  backgroundColor: getItemColor(item) + '33',
                  color: getItemColor(item),
                }}
              >
                {getItemInitial(item)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Required items list */}
      <div className="text-center mb-2">
        {Array.from(requiredItems.entries()).map(([item, count]) => (
          <div key={item} className="font-pixel text-[10px] text-gray-400">
            {formatItemName(item)} x{count}
          </div>
        ))}
      </div>

      {/* Auto-fill button */}
      <button
        className={cn(
          'w-full py-1 px-2 rounded-sm font-pixel text-[10px] border transition-colors',
          canCraft
            ? 'bg-green-800/60 border-green-600 text-green-300 hover:bg-green-700/60 cursor-pointer'
            : 'bg-gray-800/60 border-gray-700 text-gray-500 cursor-not-allowed',
        )}
        onClick={() => canCraft && onAutoFill(recipe)}
        disabled={!canCraft}
      >
        {canCraft ? 'Auto-Fill Grid' : 'Missing Materials'}
      </button>
    </div>
  );
}

// =============================================================================
// MAIN CRAFTING SCREEN
// =============================================================================

export default function CraftingScreen({
  mainInventory,
  hotbar,
  onClose,
  onInventoryChange,
}: CraftingScreenProps) {
  const engine = useMemo(() => getCraftingEngine(), []);

  // Local copies of inventory state
  const [localMain, setLocalMain] = useState<(InventorySlot | null)[]>([...mainInventory]);
  const [localHotbar, setLocalHotbar] = useState<(InventorySlot | null)[]>([...hotbar]);

  // Crafting grid: 9 slots (3x3)
  const [craftingGrid, setCraftingGrid] = useState<(InventorySlot | null)[]>(
    new Array(9).fill(null)
  );

  // Current match result
  const [craftResult, setCraftResult] = useState<CraftResult | null>(null);

  // Cursor item (being dragged)
  const [cursorItem, setCursorItem] = useState<{ slot: InventorySlot; from: SlotAddress } | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Tooltip
  const [hoveredSlot, setHoveredSlot] = useState<{ item: InventorySlot; x: number; y: number } | null>(null);

  // Recipe book state
  const [showRecipeBook, setShowRecipeBook] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const recipeBookRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // RECIPE MATCHING — Update whenever grid changes
  // =========================================================================

  useEffect(() => {
    const gridItems: GridCell[] = craftingGrid.map(slot => slot?.item ?? null);
    const result = engine.getCraftResult(gridItems, 3);
    setCraftResult(result);
  }, [craftingGrid, engine]);

  // =========================================================================
  // MOUSE TRACKING
  // =========================================================================

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // =========================================================================
  // KEYBOARD — Close on Escape or E
  // =========================================================================

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [craftingGrid, localMain, localHotbar]);

  // =========================================================================
  // CLOSE — Return grid items to inventory
  // =========================================================================

  const handleClose = useCallback(() => {
    // Return all items from crafting grid to inventory
    const updatedMain = [...localMain];
    const updatedHotbar = [...localHotbar];

    for (let i = 0; i < 9; i++) {
      const gridItem = craftingGrid[i];
      if (!gridItem) continue;

      let placed = false;

      // Try to stack into existing slots in hotbar first
      for (let h = 0; h < 9 && !placed; h++) {
        if (updatedHotbar[h] && updatedHotbar[h]!.item === gridItem.item) {
          updatedHotbar[h] = { ...updatedHotbar[h]!, count: updatedHotbar[h]!.count + gridItem.count };
          placed = true;
        }
      }
      // Try main inventory stacking
      for (let m = 0; m < 27 && !placed; m++) {
        if (updatedMain[m] && updatedMain[m]!.item === gridItem.item) {
          updatedMain[m] = { ...updatedMain[m]!, count: updatedMain[m]!.count + gridItem.count };
          placed = true;
        }
      }
      // Try empty hotbar slot
      for (let h = 0; h < 9 && !placed; h++) {
        if (!updatedHotbar[h]) {
          updatedHotbar[h] = { ...gridItem };
          placed = true;
        }
      }
      // Try empty main slot
      for (let m = 0; m < 27 && !placed; m++) {
        if (!updatedMain[m]) {
          updatedMain[m] = { ...gridItem };
          placed = true;
        }
      }
      // If inventory is full, items are lost (edge case)
    }

    onInventoryChange(updatedMain, updatedHotbar);
    onClose();
  }, [craftingGrid, localMain, localHotbar, onInventoryChange, onClose]);

  // =========================================================================
  // SLOT ACCESSORS
  // =========================================================================

  const getSlotItem = useCallback((addr: SlotAddress): InventorySlot | null => {
    switch (addr.container) {
      case 'main': return localMain[addr.index] ?? null;
      case 'hotbar': return localHotbar[addr.index] ?? null;
      case 'crafting': return craftingGrid[addr.index] ?? null;
      case 'output': return craftResult ? { item: craftResult.item, count: craftResult.count } : null;
      default: return null;
    }
  }, [localMain, localHotbar, craftingGrid, craftResult]);

  const setSlotItem = useCallback((addr: SlotAddress, item: InventorySlot | null) => {
    switch (addr.container) {
      case 'main':
        setLocalMain(prev => {
          const next = [...prev];
          next[addr.index] = item;
          return next;
        });
        break;
      case 'hotbar':
        setLocalHotbar(prev => {
          const next = [...prev];
          next[addr.index] = item;
          return next;
        });
        break;
      case 'crafting':
        setCraftingGrid(prev => {
          const next = [...prev];
          next[addr.index] = item;
          return next;
        });
        break;
    }
  }, []);

  // =========================================================================
  // CRAFTING — Take output
  // =========================================================================

  const performCraft = useCallback((shiftCraft: boolean) => {
    if (!craftResult) return;

    const doCraftOnce = (grid: (InventorySlot | null)[]): (InventorySlot | null)[] => {
      return engine.consumeIngredientsWithCounts(grid);
    };

    if (shiftCraft) {
      // Craft as many as possible
      let currentGrid = [...craftingGrid];
      let totalCrafted = 0;
      const maxCrafts = 64; // Safety limit

      while (totalCrafted < maxCrafts) {
        // Check if current grid still matches
        const gridItems: GridCell[] = currentGrid.map(s => s?.item ?? null);
        const result = engine.getCraftResult(gridItems, 3);
        if (!result || result.recipe.id !== craftResult.recipe.id) break;

        // Try to add result to inventory
        const resultItem = result.item;
        const resultCount = result.count;
        let placed = false;

        // Try stacking into hotbar
        for (let h = 0; h < 9; h++) {
          const slot = localHotbar[h];
          if (slot && slot.item === resultItem && slot.count + resultCount <= 64) {
            setLocalHotbar(prev => {
              const next = [...prev];
              next[h] = { ...slot, count: slot.count + resultCount };
              return next;
            });
            placed = true;
            break;
          }
        }
        // Try stacking into main
        if (!placed) {
          for (let m = 0; m < 27; m++) {
            const slot = localMain[m];
            if (slot && slot.item === resultItem && slot.count + resultCount <= 64) {
              setLocalMain(prev => {
                const next = [...prev];
                next[m] = { ...slot, count: slot.count + resultCount };
                return next;
              });
              placed = true;
              break;
            }
          }
        }
        // Try empty hotbar
        if (!placed) {
          for (let h = 0; h < 9; h++) {
            if (!localHotbar[h]) {
              setLocalHotbar(prev => {
                const next = [...prev];
                next[h] = { item: resultItem, count: resultCount };
                return next;
              });
              placed = true;
              break;
            }
          }
        }
        // Try empty main
        if (!placed) {
          for (let m = 0; m < 27; m++) {
            if (!localMain[m]) {
              setLocalMain(prev => {
                const next = [...prev];
                next[m] = { item: resultItem, count: resultCount };
                return next;
              });
              placed = true;
              break;
            }
          }
        }

        if (!placed) break; // Inventory full

        currentGrid = doCraftOnce(currentGrid);
        totalCrafted++;
      }

      setCraftingGrid(currentGrid);
    } else {
      // Single craft — put result on cursor
      const newGrid = doCraftOnce(craftingGrid);
      setCraftingGrid(newGrid);

      if (cursorItem && cursorItem.slot.item === craftResult.item) {
        // Stack onto cursor
        setCursorItem({
          ...cursorItem,
          slot: { ...cursorItem.slot, count: cursorItem.slot.count + craftResult.count },
        });
      } else if (!cursorItem) {
        setCursorItem({
          slot: { item: craftResult.item, count: craftResult.count },
          from: { container: 'output', index: 0 },
        });
      }
    }
  }, [craftResult, craftingGrid, cursorItem, engine, localMain, localHotbar]);

  // =========================================================================
  // CLICK HANDLERS
  // =========================================================================

  const handleLeftClick = useCallback((addr: SlotAddress) => {
    // Output slot — craft
    if (addr.container === 'output') {
      performCraft(false);
      return;
    }

    const clickedItem = getSlotItem(addr);

    if (cursorItem) {
      if (!clickedItem) {
        // Place cursor item
        setSlotItem(addr, cursorItem.slot);
        setCursorItem(null);
      } else if (clickedItem.item === cursorItem.slot.item) {
        // Stack
        const maxStack = 64; // Simplified
        const space = maxStack - clickedItem.count;
        if (space >= cursorItem.slot.count) {
          setSlotItem(addr, { ...clickedItem, count: clickedItem.count + cursorItem.slot.count });
          setCursorItem(null);
        } else if (space > 0) {
          setSlotItem(addr, { ...clickedItem, count: maxStack });
          setCursorItem({
            ...cursorItem,
            slot: { ...cursorItem.slot, count: cursorItem.slot.count - space },
          });
        }
      } else {
        // Swap
        setSlotItem(addr, cursorItem.slot);
        setCursorItem({ slot: clickedItem, from: addr });
      }
    } else if (clickedItem) {
      // Pick up item
      setCursorItem({ slot: clickedItem, from: addr });
      setSlotItem(addr, null);
    }
  }, [cursorItem, getSlotItem, setSlotItem, performCraft]);

  const handleRightClick = useCallback((addr: SlotAddress) => {
    if (addr.container === 'output') return;

    const clickedItem = getSlotItem(addr);

    if (cursorItem) {
      // Place one item from cursor
      if (!clickedItem) {
        setSlotItem(addr, { ...cursorItem.slot, count: 1 });
        if (cursorItem.slot.count <= 1) {
          setCursorItem(null);
        } else {
          setCursorItem({
            ...cursorItem,
            slot: { ...cursorItem.slot, count: cursorItem.slot.count - 1 },
          });
        }
      } else if (clickedItem.item === cursorItem.slot.item && clickedItem.count < 64) {
        setSlotItem(addr, { ...clickedItem, count: clickedItem.count + 1 });
        if (cursorItem.slot.count <= 1) {
          setCursorItem(null);
        } else {
          setCursorItem({
            ...cursorItem,
            slot: { ...cursorItem.slot, count: cursorItem.slot.count - 1 },
          });
        }
      }
    } else if (clickedItem && clickedItem.count > 1) {
      // Pick up half
      const halfCount = Math.ceil(clickedItem.count / 2);
      const remaining = clickedItem.count - halfCount;
      setCursorItem({
        slot: { ...clickedItem, count: halfCount },
        from: addr,
      });
      setSlotItem(addr, remaining > 0 ? { ...clickedItem, count: remaining } : null);
    } else if (clickedItem) {
      // Pick up single item
      setCursorItem({ slot: clickedItem, from: addr });
      setSlotItem(addr, null);
    }
  }, [cursorItem, getSlotItem, setSlotItem]);

  const handleShiftClick = useCallback((addr: SlotAddress) => {
    if (addr.container === 'output') {
      performCraft(true);
      return;
    }

    const item = getSlotItem(addr);
    if (!item) return;

    if (addr.container === 'crafting') {
      // Move from crafting grid to inventory
      let placed = false;
      // Try hotbar first
      for (let h = 0; h < 9 && !placed; h++) {
        if (localHotbar[h] && localHotbar[h]!.item === item.item) {
          setLocalHotbar(prev => {
            const next = [...prev];
            next[h] = { ...item, count: (next[h]?.count ?? 0) + item.count };
            return next;
          });
          placed = true;
        }
      }
      for (let m = 0; m < 27 && !placed; m++) {
        if (localMain[m] && localMain[m]!.item === item.item) {
          setLocalMain(prev => {
            const next = [...prev];
            next[m] = { ...item, count: (next[m]?.count ?? 0) + item.count };
            return next;
          });
          placed = true;
        }
      }
      for (let h = 0; h < 9 && !placed; h++) {
        if (!localHotbar[h]) {
          setLocalHotbar(prev => {
            const next = [...prev];
            next[h] = { ...item };
            return next;
          });
          placed = true;
        }
      }
      for (let m = 0; m < 27 && !placed; m++) {
        if (!localMain[m]) {
          setLocalMain(prev => {
            const next = [...prev];
            next[m] = { ...item };
            return next;
          });
          placed = true;
        }
      }
      if (placed) {
        setCraftingGrid(prev => {
          const next = [...prev];
          next[addr.index] = null;
          return next;
        });
      }
    } else if (addr.container === 'hotbar') {
      // Move to main inventory
      let placed = false;
      for (let m = 0; m < 27 && !placed; m++) {
        if (localMain[m] && localMain[m]!.item === item.item) {
          setLocalMain(prev => {
            const next = [...prev];
            next[m] = { ...item, count: (next[m]?.count ?? 0) + item.count };
            return next;
          });
          placed = true;
        }
      }
      for (let m = 0; m < 27 && !placed; m++) {
        if (!localMain[m]) {
          setLocalMain(prev => {
            const next = [...prev];
            next[m] = { ...item };
            return next;
          });
          placed = true;
        }
      }
      if (placed) {
        setLocalHotbar(prev => {
          const next = [...prev];
          next[addr.index] = null;
          return next;
        });
      }
    } else if (addr.container === 'main') {
      // Move to hotbar
      let placed = false;
      for (let h = 0; h < 9 && !placed; h++) {
        if (localHotbar[h] && localHotbar[h]!.item === item.item) {
          setLocalHotbar(prev => {
            const next = [...prev];
            next[h] = { ...item, count: (next[h]?.count ?? 0) + item.count };
            return next;
          });
          placed = true;
        }
      }
      for (let h = 0; h < 9 && !placed; h++) {
        if (!localHotbar[h]) {
          setLocalHotbar(prev => {
            const next = [...prev];
            next[h] = { ...item };
            return next;
          });
          placed = true;
        }
      }
      if (placed) {
        setLocalMain(prev => {
          const next = [...prev];
          next[addr.index] = null;
          return next;
        });
      }
    }
  }, [getSlotItem, localMain, localHotbar, performCraft]);

  // =========================================================================
  // TOOLTIP
  // =========================================================================

  const handleMouseEnter = useCallback((addr: SlotAddress, e: React.MouseEvent) => {
    if (cursorItem) return;
    const item = getSlotItem(addr);
    if (item) {
      setHoveredSlot({ item, x: e.clientX, y: e.clientY });
    }
  }, [getSlotItem, cursorItem]);

  const handleMouseLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  // =========================================================================
  // RECIPE BOOK — Available items and craftable recipes
  // =========================================================================

  const availableItems = useMemo(() => {
    const items: string[] = [];
    for (const slot of localMain) {
      if (slot) {
        for (let i = 0; i < slot.count; i++) items.push(slot.item);
      }
    }
    for (const slot of localHotbar) {
      if (slot) {
        for (let i = 0; i < slot.count; i++) items.push(slot.item);
      }
    }
    return items;
  }, [localMain, localHotbar]);

  const craftableRecipeIds = useMemo(() => {
    const craftable = engine.discoverRecipes(availableItems);
    return new Set(craftable.map(r => r.id));
  }, [engine, availableItems]);

  const filteredRecipes = useMemo(() => {
    const allCrafting = engine.getRecipeBook();
    const categoryGroup = allCrafting.find(g => g.category === selectedCategory);
    const recipes = categoryGroup?.recipes ?? [];

    // Sort: craftable first, then alphabetically
    return [...recipes].sort((a, b) => {
      const aCraft = craftableRecipeIds.has(a.id) ? 0 : 1;
      const bCraft = craftableRecipeIds.has(b.id) ? 0 : 1;
      if (aCraft !== bCraft) return aCraft - bCraft;
      return a.result.localeCompare(b.result);
    });
  }, [engine, selectedCategory, craftableRecipeIds]);

  // =========================================================================
  // AUTO-FILL from recipe book
  // =========================================================================

  const handleAutoFill = useCallback((recipe: CraftingRecipe) => {
    // Clear current grid first, returning items to inventory
    const updatedMain = [...localMain];
    const updatedHotbar = [...localHotbar];

    for (let i = 0; i < 9; i++) {
      const gridItem = craftingGrid[i];
      if (!gridItem) continue;

      let placed = false;
      for (let h = 0; h < 9 && !placed; h++) {
        if (updatedHotbar[h] && updatedHotbar[h]!.item === gridItem.item) {
          updatedHotbar[h] = { ...updatedHotbar[h]!, count: updatedHotbar[h]!.count + gridItem.count };
          placed = true;
        }
      }
      for (let m = 0; m < 27 && !placed; m++) {
        if (updatedMain[m] && updatedMain[m]!.item === gridItem.item) {
          updatedMain[m] = { ...updatedMain[m]!, count: updatedMain[m]!.count + gridItem.count };
          placed = true;
        }
      }
      for (let h = 0; h < 9 && !placed; h++) {
        if (!updatedHotbar[h]) {
          updatedHotbar[h] = { ...gridItem };
          placed = true;
        }
      }
      for (let m = 0; m < 27 && !placed; m++) {
        if (!updatedMain[m]) {
          updatedMain[m] = { ...gridItem };
          placed = true;
        }
      }
    }

    // Now fill the grid with recipe ingredients
    const newGrid: (InventorySlot | null)[] = new Array(9).fill(null);

    if (recipe.type === 'shaped' && recipe.pattern && recipe.key) {
      // Place shaped pattern into grid
      for (let r = 0; r < recipe.pattern.length; r++) {
        for (let c = 0; c < recipe.pattern[r].length; c++) {
          const char = recipe.pattern[r][c];
          if (char === ' ') continue;
          const itemId = recipe.key[char];
          if (!itemId) continue;

          const gridIndex = r * 3 + c;

          // Find and consume the item from inventory
          let found = false;
          for (let h = 0; h < 9 && !found; h++) {
            if (updatedHotbar[h] && updatedHotbar[h]!.item === itemId) {
              if (updatedHotbar[h]!.count > 1) {
                updatedHotbar[h] = { ...updatedHotbar[h]!, count: updatedHotbar[h]!.count - 1 };
              } else {
                updatedHotbar[h] = null;
              }
              found = true;
            }
          }
          for (let m = 0; m < 27 && !found; m++) {
            if (updatedMain[m] && updatedMain[m]!.item === itemId) {
              if (updatedMain[m]!.count > 1) {
                updatedMain[m] = { ...updatedMain[m]!, count: updatedMain[m]!.count - 1 };
              } else {
                updatedMain[m] = null;
              }
              found = true;
            }
          }

          if (found) {
            newGrid[gridIndex] = { item: itemId, count: 1 };
          }
        }
      }
    } else if (recipe.type === 'shapeless' && recipe.ingredients) {
      // Place shapeless ingredients into grid slots sequentially
      let slotIdx = 0;
      for (const itemId of recipe.ingredients) {
        let found = false;
        for (let h = 0; h < 9 && !found; h++) {
          if (updatedHotbar[h] && updatedHotbar[h]!.item === itemId) {
            if (updatedHotbar[h]!.count > 1) {
              updatedHotbar[h] = { ...updatedHotbar[h]!, count: updatedHotbar[h]!.count - 1 };
            } else {
              updatedHotbar[h] = null;
            }
            found = true;
          }
        }
        for (let m = 0; m < 27 && !found; m++) {
          if (updatedMain[m] && updatedMain[m]!.item === itemId) {
            if (updatedMain[m]!.count > 1) {
              updatedMain[m] = { ...updatedMain[m]!, count: updatedMain[m]!.count - 1 };
            } else {
              updatedMain[m] = null;
            }
            found = true;
          }
        }

        if (found) {
          newGrid[slotIdx] = { item: itemId, count: 1 };
          slotIdx++;
        }
      }
    }

    setLocalMain(updatedMain);
    setLocalHotbar(updatedHotbar);
    setCraftingGrid(newGrid);
  }, [localMain, localHotbar, craftingGrid]);

  // =========================================================================
  // BACKDROP CLICK
  // =========================================================================

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (cursorItem) {
        // Drop cursor item back
        setCursorItem(null);
      } else {
        handleClose();
      }
    }
  }, [cursorItem, handleClose]);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={handleBackdropClick}
    >
      <div className="flex gap-0">
        {/* Recipe Book Panel */}
        {showRecipeBook && (
          <div
            ref={recipeBookRef}
            className="relative p-2 rounded-l-sm select-none flex flex-col"
            style={{
              backgroundColor: '#8b7355',
              border: '3px solid #555',
              borderRight: 'none',
              boxShadow: 'inset 2px 2px 0 #a08860, inset -1px -2px 0 #6b5540',
              width: '200px',
              maxHeight: '460px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Category tabs */}
            <div className="flex flex-wrap gap-[2px] mb-2">
              {RECIPE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={cn(
                    'px-1.5 py-0.5 font-pixel text-[9px] rounded-sm border transition-colors',
                    selectedCategory === cat
                      ? 'bg-yellow-700/80 border-yellow-500 text-yellow-100'
                      : 'bg-gray-700/40 border-gray-600 text-gray-300 hover:bg-gray-600/40',
                  )}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedRecipe(null);
                  }}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>

            {/* Recipe grid */}
            <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              <div className="grid grid-cols-4 gap-1">
                {filteredRecipes.map(recipe => (
                  <RecipePreview
                    key={recipe.id}
                    recipe={recipe}
                    isSelected={selectedRecipe?.id === recipe.id}
                    canCraft={craftableRecipeIds.has(recipe.id)}
                    onClick={() => setSelectedRecipe(
                      selectedRecipe?.id === recipe.id ? null : recipe
                    )}
                  />
                ))}
              </div>

              {filteredRecipes.length === 0 && (
                <div className="text-center font-pixel text-[10px] text-gray-400 mt-4">
                  No recipes in this category
                </div>
              )}
            </div>

            {/* Selected recipe detail */}
            {selectedRecipe && (
              <RecipeDetail
                recipe={selectedRecipe}
                canCraft={craftableRecipeIds.has(selectedRecipe.id)}
                onAutoFill={handleAutoFill}
              />
            )}
          </div>
        )}

        {/* Main Crafting Panel */}
        <div
          className="relative p-4 select-none"
          style={{
            backgroundColor: '#c6c6c6',
            border: '3px solid #555',
            boxShadow: 'inset 2px 2px 0 #fff, inset -2px -2px 0 #888, 4px 4px 12px rgba(0,0,0,0.5)',
            borderRadius: showRecipeBook ? '0 4px 4px 0' : '4px',
            minWidth: '380px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <div className="font-pixel text-sm text-gray-800 mb-3 text-center">
            Crafting
          </div>

          {/* Crafting area: grid + arrow + output */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Recipe book toggle */}
            <button
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-sm border transition-colors',
                showRecipeBook
                  ? 'bg-green-700/60 border-green-500 text-green-200'
                  : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:bg-gray-600/40',
              )}
              onClick={() => setShowRecipeBook(prev => !prev)}
              title="Toggle Recipe Book"
            >
              <span className="font-pixel text-sm">{'\u{1F4D6}'}</span>
            </button>

            {/* 3x3 Crafting Grid */}
            <div className="grid grid-cols-3 gap-[2px]">
              {Array.from({ length: 9 }, (_, i) => (
                <InvSlot
                  key={`craft-${i}`}
                  slot={craftingGrid[i]}
                  address={{ container: 'crafting', index: i }}
                  onLeftClick={handleLeftClick}
                  onRightClick={handleRightClick}
                  onShiftClick={handleShiftClick}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                />
              ))}
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center">
              <div className="text-gray-600 text-3xl font-bold select-none px-1">
                {'\u2192'}
              </div>
            </div>

            {/* Output slot */}
            <div className="flex flex-col items-center">
              <InvSlot
                slot={craftResult ? { item: craftResult.item, count: craftResult.count } : null}
                address={{ container: 'output', index: 0 }}
                onLeftClick={handleLeftClick}
                onRightClick={handleRightClick}
                onShiftClick={handleShiftClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                isOutputSlot
              />
            </div>
          </div>

          {/* Separator */}
          <div className="h-[1px] bg-gray-500/40 mb-2" />

          {/* Main inventory: 3 rows of 9 */}
          <div className="flex flex-col gap-[2px] mb-3">
            {Array.from({ length: 3 }, (_, row) => (
              <div key={`row-${row}`} className="flex gap-[2px]">
                {Array.from({ length: 9 }, (_, col) => {
                  const index = row * 9 + col;
                  return (
                    <InvSlot
                      key={`main-${index}`}
                      slot={localMain[index] ?? null}
                      address={{ container: 'main', index }}
                      onLeftClick={handleLeftClick}
                      onRightClick={handleRightClick}
                      onShiftClick={handleShiftClick}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Separator */}
          <div className="h-[1px] bg-gray-500/40 mb-2" />

          {/* Hotbar: 1 row of 9 */}
          <div className="flex gap-[2px]">
            {Array.from({ length: 9 }, (_, i) => (
              <InvSlot
                key={`hotbar-${i}`}
                slot={localHotbar[i] ?? null}
                address={{ container: 'hotbar', index: i }}
                onLeftClick={handleLeftClick}
                onRightClick={handleRightClick}
                onShiftClick={handleShiftClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </div>

          {/* Hints */}
          <div className="mt-2 flex justify-between">
            <span className="font-pixel text-[9px] text-gray-500">
              Click to place | Shift-click output to craft max | Right-click for half
            </span>
            <span className="font-pixel text-[9px] text-gray-500">
              E to close
            </span>
          </div>
        </div>
      </div>

      {/* Cursor item (follows mouse) */}
      {cursorItem && (
        <div
          className="fixed pointer-events-none z-[110]"
          style={{
            left: cursorPos.x - 16,
            top: cursorPos.y - 16,
          }}
        >
          <div
            className="w-8 h-8 flex items-center justify-center font-pixel text-xs font-bold rounded-sm"
            style={{
              backgroundColor: getItemColor(cursorItem.slot.item) + '55',
              color: getItemColor(cursorItem.slot.item),
              textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            {getItemInitial(cursorItem.slot.item)}
          </div>
          {cursorItem.slot.count > 1 && (
            <span
              className="absolute bottom-0 right-0 font-pixel text-[10px] text-white font-bold"
              style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}
            >
              {cursorItem.slot.count}
            </span>
          )}
        </div>
      )}

      {/* Tooltip */}
      {hoveredSlot && !cursorItem && (
        <ItemTooltip
          item={hoveredSlot.item}
          x={hoveredSlot.x}
          y={hoveredSlot.y}
        />
      )}
    </div>
  );
}
