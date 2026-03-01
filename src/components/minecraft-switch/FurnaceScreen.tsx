'use client';

// =============================================================================
// Minecraft: Switch Edition — Furnace Screen
// =============================================================================
// Full-screen overlay for furnace interaction. Shows input, fuel, and output
// slots with animated flame (fuel burn) and arrow (cook progress) indicators.
// Includes the player's main inventory and hotbar below.
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { InventorySlot, EnchantmentInstance } from '@/types/minecraft-switch';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FurnaceScreenProps {
  /** Item in the input (smelting) slot. */
  inputSlot: InventorySlot | null;
  /** Item in the fuel slot. */
  fuelSlot: InventorySlot | null;
  /** Item in the output slot. */
  outputSlot: InventorySlot | null;
  /** Burn progress (0.0 to 1.0). 0 = no fuel burning. */
  burnProgress: number;
  /** Cook progress (0.0 to 1.0). 0 = not cooking. */
  cookProgress: number;
  /** Whether the furnace is currently burning fuel. */
  isBurning: boolean;
  /** Main inventory: 27 slots. */
  mainInventory: (InventorySlot | null)[];
  /** Hotbar: 9 slots. */
  hotbar: (InventorySlot | null)[];
  /** Close the furnace screen. */
  onClose: () => void;
  /** Place/take item in a furnace slot. */
  onSlotClick: (
    slotType: FurnaceSlotType,
    slotIndex: number,
    button: 'left' | 'right',
    shiftKey: boolean,
  ) => void;
  /** Move item between player inventory slots. */
  onInventoryClick: (
    fromSlot: number,
    fromContainer: 'main' | 'hotbar',
    button: 'left' | 'right',
    shiftKey: boolean,
  ) => void;
}

type FurnaceSlotType = 'input' | 'fuel' | 'output';

interface SlotAddress {
  type: 'furnace' | 'main' | 'hotbar';
  slotType?: FurnaceSlotType;
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
  if (itemId.includes('coal') || itemId.includes('charcoal')) return '#333333';
  if (itemId.includes('redstone')) return '#FF0000';
  if (itemId.includes('lapis')) return '#2546BD';
  if (itemId.includes('emerald')) return '#17DD62';
  if (itemId.includes('glass')) return '#C8E8FF';
  if (itemId.includes('brick')) return '#B05A3A';
  if (itemId.includes('cooked') || itemId.includes('baked')) return '#C87E3A';
  if (itemId.includes('raw_')) return '#E88080';
  if (itemId.includes('ingot')) return '#DDDDDD';
  if (itemId.includes('sand')) return '#E8D8A0';
  if (itemId.includes('lava')) return '#FF6600';
  if (itemId.includes('blaze')) return '#FFA800';
  if (itemId.includes('kelp')) return '#3A8A3A';
  if (itemId.includes('sponge')) return '#C8C83A';
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
  onMouseEnter,
  onMouseLeave,
  isHighlighted,
  placeholderIcon,
  slotStyle,
}: {
  slot: InventorySlot | null;
  address: SlotAddress;
  label?: string;
  onLeftClick: (addr: SlotAddress) => void;
  onRightClick: (addr: SlotAddress) => void;
  onShiftClick: (addr: SlotAddress) => void;
  onMouseEnter: (addr: SlotAddress, e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  isHighlighted?: boolean;
  placeholderIcon?: string;
  slotStyle?: string;
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
        slotStyle,
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
      ) : (
        placeholderIcon && (
          <span className="text-gray-600 text-lg select-none">{placeholderIcon}</span>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flame Icon (Fuel Burn Indicator)
// ---------------------------------------------------------------------------

function FlameIcon({ progress, isBurning }: { progress: number; isBurning: boolean }) {
  const fillHeight = Math.max(0, Math.min(1, progress)) * 100;

  return (
    <div className="relative w-[14px] h-[14px]" title={`Fuel: ${Math.round(progress * 100)}%`}>
      {/* Gray background flame (empty state) */}
      <svg
        viewBox="0 0 14 14"
        className="absolute inset-0 w-full h-full"
        style={{ color: '#4a4a4a' }}
      >
        <path
          d="M7 1C7 1 3 5 3 9C3 11.2 5.2 13 7 13C8.8 13 11 11.2 11 9C11 5 7 1 7 1Z"
          fill="currentColor"
        />
      </svg>
      {/* Orange fill flame (burns upward via clip-path) */}
      <svg
        viewBox="0 0 14 14"
        className="absolute inset-0 w-full h-full transition-all duration-100"
        style={{
          color: isBurning ? '#FF8800' : '#4a4a4a',
          clipPath: `inset(${100 - fillHeight}% 0 0 0)`,
        }}
      >
        <path
          d="M7 1C7 1 3 5 3 9C3 11.2 5.2 13 7 13C8.8 13 11 11.2 11 9C11 5 7 1 7 1Z"
          fill="currentColor"
        />
      </svg>
      {/* Bright core when burning */}
      {isBurning && (
        <svg
          viewBox="0 0 14 14"
          className="absolute inset-0 w-full h-full transition-all duration-100"
          style={{
            clipPath: `inset(${100 - fillHeight * 0.6}% 20% 10% 20%)`,
          }}
        >
          <path
            d="M7 4C7 4 5 7 5 9.5C5 10.6 6 12 7 12C8 12 9 10.6 9 9.5C9 7 7 4 7 4Z"
            fill="#FFD040"
          />
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arrow Icon (Cook Progress Indicator)
// ---------------------------------------------------------------------------

function ArrowIcon({ progress }: { progress: number }) {
  const fillWidth = Math.max(0, Math.min(1, progress)) * 100;

  return (
    <div className="relative w-[22px] h-[16px]" title={`Progress: ${Math.round(progress * 100)}%`}>
      {/* Gray background arrow (empty state) */}
      <svg viewBox="0 0 22 16" className="absolute inset-0 w-full h-full">
        <polygon points="0,4 16,4 16,0 22,8 16,16 16,12 0,12" fill="#4a4a4a" />
      </svg>
      {/* White fill arrow (fills left-to-right via clip-path) */}
      <svg
        viewBox="0 0 22 16"
        className="absolute inset-0 w-full h-full transition-all duration-100"
        style={{ clipPath: `inset(0 ${100 - fillWidth}% 0 0)` }}
      >
        <polygon points="0,4 16,4 16,0 22,8 16,16 16,12 0,12" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Furnace Screen Component
// ---------------------------------------------------------------------------

export default function FurnaceScreen({
  inputSlot,
  fuelSlot,
  outputSlot,
  burnProgress,
  cookProgress,
  isBurning,
  mainInventory,
  hotbar,
  onClose,
  onSlotClick,
  onInventoryClick,
}: FurnaceScreenProps) {
  // Tooltip state
  const [hoveredSlot, setHoveredSlot] = useState<{ item: InventorySlot; x: number; y: number } | null>(null);

  // Close on Escape or E
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Slot click handlers
  const handleLeftClick = useCallback((addr: SlotAddress) => {
    if (addr.type === 'furnace' && addr.slotType) {
      onSlotClick(addr.slotType, addr.index, 'left', false);
    } else if (addr.type === 'main' || addr.type === 'hotbar') {
      onInventoryClick(addr.index, addr.type, 'left', false);
    }
  }, [onSlotClick, onInventoryClick]);

  const handleRightClick = useCallback((addr: SlotAddress) => {
    if (addr.type === 'furnace' && addr.slotType) {
      onSlotClick(addr.slotType, addr.index, 'right', false);
    } else if (addr.type === 'main' || addr.type === 'hotbar') {
      onInventoryClick(addr.index, addr.type, 'right', false);
    }
  }, [onSlotClick, onInventoryClick]);

  const handleShiftClick = useCallback((addr: SlotAddress) => {
    if (addr.type === 'furnace' && addr.slotType) {
      onSlotClick(addr.slotType, addr.index, 'left', true);
    } else if (addr.type === 'main' || addr.type === 'hotbar') {
      onInventoryClick(addr.index, addr.type, 'left', true);
    }
  }, [onSlotClick, onInventoryClick]);

  // Tooltip handlers
  const handleMouseEnter = useCallback((addr: SlotAddress, e: React.MouseEvent) => {
    let item: InventorySlot | null = null;
    if (addr.type === 'furnace') {
      if (addr.slotType === 'input') item = inputSlot;
      else if (addr.slotType === 'fuel') item = fuelSlot;
      else if (addr.slotType === 'output') item = outputSlot;
    } else if (addr.type === 'main') {
      item = mainInventory[addr.index] ?? null;
    } else if (addr.type === 'hotbar') {
      item = hotbar[addr.index] ?? null;
    }
    if (item) {
      setHoveredSlot({ item, x: e.clientX, y: e.clientY });
    }
  }, [inputSlot, fuelSlot, outputSlot, mainInventory, hotbar]);

  const handleMouseLeave = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  // Close when clicking backdrop
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={handleBackdropClick}
    >
      {/* Main furnace panel */}
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
          Furnace
        </div>

        {/* Furnace slots section */}
        <div className="flex items-center justify-center gap-3 mb-4 py-2">
          {/* Left column: Input (top) + Fuel (bottom) */}
          <div className="flex flex-col items-center gap-2">
            {/* Input slot */}
            <InvSlot
              slot={inputSlot}
              address={{ type: 'furnace', slotType: 'input', index: 0 }}
              label="Input — Item to smelt"
              onLeftClick={handleLeftClick}
              onRightClick={handleRightClick}
              onShiftClick={handleShiftClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />

            {/* Flame indicator */}
            <div className="flex items-center justify-center w-10 h-4">
              <FlameIcon progress={burnProgress} isBurning={isBurning} />
            </div>

            {/* Fuel slot */}
            <InvSlot
              slot={fuelSlot}
              address={{ type: 'furnace', slotType: 'fuel', index: 0 }}
              label="Fuel"
              onLeftClick={handleLeftClick}
              onRightClick={handleRightClick}
              onShiftClick={handleShiftClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          </div>

          {/* Arrow indicator */}
          <div className="flex items-center justify-center px-2 -mt-5">
            <ArrowIcon progress={cookProgress} />
          </div>

          {/* Output slot (larger, special styling) */}
          <div className="flex flex-col items-center -mt-5">
            <InvSlot
              slot={outputSlot}
              address={{ type: 'furnace', slotType: 'output', index: 0 }}
              label="Output — Smelted result"
              onLeftClick={handleLeftClick}
              onRightClick={handleRightClick}
              onShiftClick={handleShiftClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              slotStyle="w-12 h-12 border-2 border-yellow-700/50"
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
                    slot={mainInventory[index] ?? null}
                    address={{ type: 'main', index }}
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
              slot={hotbar[i] ?? null}
              address={{ type: 'hotbar', index: i }}
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
            Shift-click smeltables to input, fuels to fuel slot
          </span>
          <span className="font-pixel text-[9px] text-gray-500">
            E to close
          </span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredSlot && (
        <ItemTooltip
          item={hoveredSlot.item}
          x={hoveredSlot.x}
          y={hoveredSlot.y}
        />
      )}
    </div>
  );
}
