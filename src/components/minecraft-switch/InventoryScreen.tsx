'use client';

// =============================================================================
// Minecraft: Switch Edition — Inventory Screen
// Full-screen overlay with player inventory, 2x2 crafting grid,
// armor slots, and drag-and-drop item management.
// =============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { InventorySlot, EnchantmentInstance } from '@/types/minecraft-switch';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InventoryScreenProps {
  /** Main inventory: 27 slots. */
  mainInventory: (InventorySlot | null)[];
  /** Hotbar: 9 slots. */
  hotbar: (InventorySlot | null)[];
  /** Armor: 4 slots [helmet, chestplate, leggings, boots]. */
  armor: (InventorySlot | null)[];
  /** Offhand slot. */
  offhand: InventorySlot | null;
  /** Close the inventory screen. */
  onClose: () => void;
  /** Move item between containers. */
  onMoveItem: (
    fromSlot: number,
    toSlot: number,
    fromContainer: ContainerType,
    toContainer: ContainerType,
    count?: number,
  ) => void;
  /** Attempt to craft from the 2x2 grid. Returns the result item or null. */
  onCraftItem: (grid: (InventorySlot | null)[]) => InventorySlot | null;
}

type ContainerType = 'main' | 'hotbar' | 'armor' | 'offhand' | 'crafting';

interface SlotAddress {
  container: ContainerType;
  index: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getItemColor(itemId: string): string {
  if (itemId.includes('diamond')) return '#4AEDD9';
  if (itemId.includes('gold') || itemId.includes('golden')) return '#FFD700';
  if (itemId.includes('iron')) return '#D4D4D4';
  if (itemId.includes('netherite')) return '#4D3D37';
  if (itemId.includes('stone') || itemId.includes('cobble')) return '#808080';
  if (itemId.includes('wood') || itemId.includes('oak') || itemId.includes('planks')) return '#B8935A';
  if (itemId.includes('coal')) return '#333333';
  if (itemId.includes('redstone')) return '#FF0000';
  if (itemId.includes('lapis')) return '#2546BD';
  if (itemId.includes('emerald')) return '#17DD62';
  if (itemId.includes('leather')) return '#8B5A2B';
  if (itemId.includes('torch')) return '#FFD040';
  if (itemId.includes('sword')) return '#99BBDD';
  if (itemId.includes('pickaxe')) return '#99BBDD';
  if (itemId.includes('axe')) return '#99BBDD';
  if (itemId.includes('shovel')) return '#99BBDD';
  if (itemId.includes('hoe')) return '#99BBDD';
  if (itemId.includes('helmet')) return '#AACCEE';
  if (itemId.includes('chestplate')) return '#AACCEE';
  if (itemId.includes('leggings')) return '#AACCEE';
  if (itemId.includes('boots')) return '#AACCEE';
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

const ARMOR_SLOT_LABELS = ['Helmet', 'Chestplate', 'Leggings', 'Boots'];
const ARMOR_SLOT_ICONS = ['\u26D1', '\u{1F6E1}', '\u{1F456}', '\u{1F462}'];

// ---------------------------------------------------------------------------
// Item Tooltip
// ---------------------------------------------------------------------------

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
      {/* Item name */}
      <div className="font-pixel text-xs text-white whitespace-nowrap">
        {formatItemName(item.item)}
      </div>
      {/* Enchantments */}
      {item.enchantments && item.enchantments.length > 0 && (
        <div className="mt-0.5">
          {item.enchantments.map((ench, i) => (
            <div key={i} className="font-pixel text-[10px] text-gray-400">
              {formatEnchantment(ench)}
            </div>
          ))}
        </div>
      )}
      {/* Durability */}
      {item.durability !== undefined && (
        <div className="font-pixel text-[10px] text-gray-500 mt-0.5">
          Durability: {item.durability}
        </div>
      )}
      {/* Count */}
      {item.count > 1 && (
        <div className="font-pixel text-[10px] text-gray-500">
          Count: {item.count}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inventory Slot Component
// ---------------------------------------------------------------------------

function InvSlot({
  slot,
  address,
  label,
  onLeftClick,
  onRightClick,
  onShiftClick,
  onNumberKey,
  onMouseEnter,
  onMouseLeave,
  isHighlighted,
  placeholderIcon,
}: {
  slot: InventorySlot | null;
  address: SlotAddress;
  label?: string;
  onLeftClick: (addr: SlotAddress) => void;
  onRightClick: (addr: SlotAddress) => void;
  onShiftClick: (addr: SlotAddress) => void;
  onNumberKey?: (addr: SlotAddress, key: number) => void;
  onMouseEnter: (addr: SlotAddress, e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  isHighlighted?: boolean;
  placeholderIcon?: string;
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
        'relative w-10 h-10 flex items-center justify-center cursor-pointer',
        'border border-gray-600 transition-colors',
        isHighlighted
          ? 'bg-white/20 border-white/50'
          : 'bg-gray-800/60 hover:bg-gray-700/60',
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={(e) => onMouseEnter(address, e)}
      onMouseLeave={onMouseLeave}
      title={label}
    >
      {/* Inner highlight */}
      <div className="absolute inset-[1px] border border-gray-700/40" />

      {slot ? (
        <>
          {/* Item icon */}
          <div
            className="w-7 h-7 flex items-center justify-center font-pixel text-xs font-bold rounded-sm"
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
            <span className="absolute bottom-0 right-0.5 font-pixel text-[10px] text-white font-bold"
              style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
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
      ) : (
        placeholderIcon && (
          <span className="text-gray-600 text-lg select-none">{placeholderIcon}</span>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Inventory Screen Component
// ---------------------------------------------------------------------------

export default function InventoryScreen({
  mainInventory,
  hotbar,
  armor,
  offhand,
  onClose,
  onMoveItem,
  onCraftItem,
}: InventoryScreenProps) {
  // Cursor item state (item being dragged)
  const [cursorItem, setCursorItem] = useState<{ slot: InventorySlot; from: SlotAddress } | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Hovered slot for tooltip
  const [hoveredSlot, setHoveredSlot] = useState<{ item: InventorySlot; x: number; y: number } | null>(null);

  // 2x2 crafting grid
  const [craftingGrid, setCraftingGrid] = useState<(InventorySlot | null)[]>([null, null, null, null]);
  const [craftingOutput, setCraftingOutput] = useState<InventorySlot | null>(null);

  // Track mouse for cursor item display
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onClose();
      }
      // Number keys for quick-swap with hotbar
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && hoveredSlot) {
        // Handled via onNumberKey in slots
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, hoveredSlot]);

  // Update crafting output when grid changes
  useEffect(() => {
    const hasItems = craftingGrid.some(s => s !== null);
    if (hasItems && onCraftItem) {
      const result = onCraftItem(craftingGrid);
      setCraftingOutput(result || null);
    } else {
      setCraftingOutput(null);
    }
  }, [craftingGrid, onCraftItem]);

  // Get item from any container
  const getSlotItem = useCallback((addr: SlotAddress): InventorySlot | null => {
    switch (addr.container) {
      case 'main': return mainInventory[addr.index] ?? null;
      case 'hotbar': return hotbar[addr.index] ?? null;
      case 'armor': return armor[addr.index] ?? null;
      case 'offhand': return offhand;
      case 'crafting': return craftingGrid[addr.index] ?? null;
      default: return null;
    }
  }, [mainInventory, hotbar, armor, offhand, craftingGrid]);

  // Left click: pick up or place item
  const handleLeftClick = useCallback((addr: SlotAddress) => {
    const clickedItem = getSlotItem(addr);

    if (cursorItem) {
      // Place cursor item into slot
      if (!clickedItem) {
        // Empty slot: place entire stack
        onMoveItem(cursorItem.from.index, addr.index, cursorItem.from.container, addr.container, cursorItem.slot.count);
        setCursorItem(null);
      } else if (clickedItem.item === cursorItem.slot.item) {
        // Same item: try to stack
        onMoveItem(cursorItem.from.index, addr.index, cursorItem.from.container, addr.container, cursorItem.slot.count);
        setCursorItem(null);
      } else {
        // Different item: swap
        onMoveItem(cursorItem.from.index, addr.index, cursorItem.from.container, addr.container);
        setCursorItem({ slot: clickedItem, from: addr });
      }
    } else if (clickedItem) {
      // Pick up entire stack
      setCursorItem({ slot: clickedItem, from: addr });
    }
  }, [cursorItem, getSlotItem, onMoveItem]);

  // Right click: pick up half stack
  const handleRightClick = useCallback((addr: SlotAddress) => {
    const clickedItem = getSlotItem(addr);

    if (cursorItem) {
      // Place one item from cursor
      onMoveItem(cursorItem.from.index, addr.index, cursorItem.from.container, addr.container, 1);
      if (cursorItem.slot.count <= 1) {
        setCursorItem(null);
      } else {
        setCursorItem({
          ...cursorItem,
          slot: { ...cursorItem.slot, count: cursorItem.slot.count - 1 },
        });
      }
    } else if (clickedItem && clickedItem.count > 1) {
      // Pick up half
      const halfCount = Math.ceil(clickedItem.count / 2);
      setCursorItem({
        slot: { ...clickedItem, count: halfCount },
        from: addr,
      });
    } else if (clickedItem) {
      // Pick up the single item
      setCursorItem({ slot: clickedItem, from: addr });
    }
  }, [cursorItem, getSlotItem, onMoveItem]);

  // Shift+click: smart move
  const handleShiftClick = useCallback((addr: SlotAddress) => {
    const item = getSlotItem(addr);
    if (!item) return;

    let targetContainer: ContainerType;
    if (addr.container === 'hotbar') {
      targetContainer = 'main';
    } else if (addr.container === 'main') {
      targetContainer = 'hotbar';
    } else if (addr.container === 'armor') {
      targetContainer = 'main';
    } else {
      targetContainer = 'main';
    }

    // Check if it's armor and should go to the correct armor slot
    if (addr.container !== 'armor') {
      if (item.item.includes('helmet')) { targetContainer = 'armor'; }
      if (item.item.includes('chestplate')) { targetContainer = 'armor'; }
      if (item.item.includes('leggings')) { targetContainer = 'armor'; }
      if (item.item.includes('boots')) { targetContainer = 'armor'; }
    }

    // Find first empty slot in target container
    let targetIndex = 0;
    if (targetContainer === 'main') {
      targetIndex = mainInventory.findIndex(s => s === null);
      if (targetIndex === -1) targetIndex = 0;
    } else if (targetContainer === 'hotbar') {
      targetIndex = hotbar.findIndex(s => s === null);
      if (targetIndex === -1) targetIndex = 0;
    } else if (targetContainer === 'armor') {
      if (item.item.includes('helmet')) targetIndex = 0;
      else if (item.item.includes('chestplate')) targetIndex = 1;
      else if (item.item.includes('leggings')) targetIndex = 2;
      else if (item.item.includes('boots')) targetIndex = 3;
    }

    onMoveItem(addr.index, targetIndex, addr.container, targetContainer, item.count);
  }, [getSlotItem, onMoveItem, mainInventory, hotbar]);

  // Mouse enter/leave for tooltip
  const handleMouseEnter = useCallback((addr: SlotAddress, e: React.MouseEvent) => {
    if (cursorItem) return; // No tooltip while dragging
    const item = getSlotItem(addr);
    if (item) {
      setHoveredSlot({ item, x: e.clientX, y: e.clientY });
    }
  }, [getSlotItem, cursorItem]);

  const handleMouseLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  // Close when clicking backdrop
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (cursorItem) {
        setCursorItem(null); // Drop cursor item
      } else {
        onClose();
      }
    }
  }, [cursorItem, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={handleBackdropClick}
    >
      {/* Main inventory panel */}
      <div
        className="relative p-4 rounded-sm select-none"
        style={{
          backgroundColor: '#c6c6c6',
          border: '3px solid #555',
          boxShadow: 'inset 2px 2px 0 #fff, inset -2px -2px 0 #888, 4px 4px 12px rgba(0,0,0,0.5)',
          minWidth: '340px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="font-pixel text-sm text-gray-800 mb-3 text-center">
          Inventory
        </div>

        {/* Top section: Crafting + Player Model */}
        <div className="flex items-start gap-4 mb-4">
          {/* 2x2 Crafting Grid */}
          <div className="flex flex-col items-center">
            <div className="font-pixel text-[10px] text-gray-600 mb-1">Crafting</div>
            <div className="grid grid-cols-2 gap-[2px]">
              {craftingGrid.map((slot, i) => (
                <InvSlot
                  key={`craft-${i}`}
                  slot={slot}
                  address={{ container: 'crafting', index: i }}
                  onLeftClick={handleLeftClick}
                  onRightClick={handleRightClick}
                  onShiftClick={handleShiftClick}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                />
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center mt-6">
            <div className="text-gray-600 text-2xl font-bold select-none px-1">&rarr;</div>
          </div>

          {/* Crafting output */}
          <div className="flex flex-col items-center mt-3">
            <div className="font-pixel text-[10px] text-gray-600 mb-1">Result</div>
            <InvSlot
              slot={craftingOutput}
              address={{ container: 'crafting', index: 4 }}
              onLeftClick={handleLeftClick}
              onRightClick={handleRightClick}
              onShiftClick={handleShiftClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Armor slots (left of player model) */}
          <div className="flex gap-2">
            <div className="flex flex-col gap-[2px]">
              {armor.map((slot, i) => (
                <InvSlot
                  key={`armor-${i}`}
                  slot={slot}
                  address={{ container: 'armor', index: i }}
                  label={ARMOR_SLOT_LABELS[i]}
                  onLeftClick={handleLeftClick}
                  onRightClick={handleRightClick}
                  onShiftClick={handleShiftClick}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  placeholderIcon={ARMOR_SLOT_ICONS[i]}
                />
              ))}
            </div>

            {/* Player model placeholder */}
            <div
              className="w-16 h-[168px] flex items-center justify-center rounded-sm"
              style={{ backgroundColor: '#7a7a7a', border: '1px solid #555' }}
            >
              <div className="flex flex-col items-center gap-1">
                {/* Head */}
                <div className="w-6 h-6 bg-amber-800 border border-amber-900" />
                {/* Body */}
                <div className="w-6 h-8 bg-blue-600 border border-blue-800" />
                {/* Legs */}
                <div className="flex gap-[1px]">
                  <div className="w-[11px] h-6 bg-indigo-800 border border-indigo-900" />
                  <div className="w-[11px] h-6 bg-indigo-800 border border-indigo-900" />
                </div>
              </div>
            </div>

            {/* Offhand slot */}
            <div className="flex flex-col justify-end">
              <div className="font-pixel text-[10px] text-gray-600 mb-1 text-center">Off</div>
              <InvSlot
                slot={offhand}
                address={{ container: 'offhand', index: 0 }}
                label="Offhand"
                onLeftClick={handleLeftClick}
                onRightClick={handleRightClick}
                onShiftClick={handleShiftClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                placeholderIcon={'\u{1F6E1}'}
              />
            </div>
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
                    slot={mainInventory[index] ?? null}
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

        {/* Hotbar: 1 row of 9 (visually distinct) */}
        <div className="flex gap-[2px]">
          {Array.from({ length: 9 }, (_, i) => (
            <InvSlot
              key={`hotbar-${i}`}
              slot={hotbar[i] ?? null}
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
            Click to pick up | Right-click for half | Shift-click to quick move
          </span>
          <span className="font-pixel text-[9px] text-gray-500">
            E to close
          </span>
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
            <span className="absolute bottom-0 right-0 font-pixel text-[10px] text-white font-bold"
              style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}>
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
