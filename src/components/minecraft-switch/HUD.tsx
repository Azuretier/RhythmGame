'use client';

// =============================================================================
// Minecraft: Switch Edition — In-Game HUD
// Heads-up display rendered on top of the 3D game canvas.
// Includes crosshair, hotbar, health/hunger/armor bars, XP, air bubbles,
// action bar text, and boss health bar.
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { PlayerState, InventorySlot } from '@/types/minecraft-switch';
import { MS_CONFIG } from '@/types/minecraft-switch';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HUDProps {
  playerState: PlayerState;
  inventory: InventorySlot[];
  selectedSlot: number;
  onSlotSelect: (slot: number) => void;
  actionBarText?: string;
  bossName?: string;
  bossHealth?: number;
  bossMaxHealth?: number;
}

// ---------------------------------------------------------------------------
// Item color lookup (simple heuristic by item ID prefix)
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
  if (itemId.includes('apple')) return '#FF4444';
  if (itemId.includes('bread')) return '#D4A855';
  if (itemId.includes('steak') || itemId.includes('pork') || itemId.includes('beef')) return '#C44';
  if (itemId.includes('bow') || itemId.includes('arrow')) return '#A08050';
  if (itemId.includes('leather')) return '#8B5A2B';
  if (itemId.includes('torch')) return '#FFD040';
  return '#AAA';
}

function getItemInitial(itemId: string): string {
  // Extract meaningful initial from item ID
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Crosshair — centered + symbol */
function Crosshair() {
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="relative w-6 h-6">
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-white/90"
          style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.8))' }} />
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-white/90"
          style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.8))' }} />
      </div>
    </div>
  );
}

/** Single hotbar slot */
function HotbarSlot({
  slot,
  index,
  selected,
  onSelect,
}: {
  slot: InventorySlot | null;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer transition-all',
        'border-2',
        selected
          ? 'border-white bg-gray-600/90 scale-110 z-10'
          : 'border-gray-700 bg-gray-800/80 hover:bg-gray-700/80',
      )}
      style={{
        imageRendering: 'pixelated',
      }}
    >
      {/* Inner border for Minecraft-style slot */}
      <div className={cn(
        'absolute inset-[2px] border',
        selected ? 'border-gray-400/50' : 'border-gray-600/50',
      )} />

      {slot ? (
        <>
          {/* Item icon: colored square with initial */}
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-pixel text-xs sm:text-sm font-bold rounded-sm"
            style={{
              backgroundColor: getItemColor(slot.item) + '33',
              color: getItemColor(slot.item),
              textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
            }}
          >
            {getItemInitial(slot.item)}
          </div>

          {/* Count badge */}
          {slot.count > 1 && (
            <span className="absolute bottom-0 right-0.5 font-pixel text-[10px] sm:text-xs text-white font-bold"
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
        /* Empty slot number */
        <span className="font-pixel text-[10px] text-gray-600">{index + 1}</span>
      )}
    </div>
  );
}

/** Health bar — 10 hearts */
function HealthBar({ health, maxHealth }: { health: number; maxHealth: number }) {
  const totalHearts = Math.ceil(maxHealth / 2);
  const lowHealth = health <= 8; // 4 hearts or less

  return (
    <div className="flex gap-[1px] flex-wrap">
      {Array.from({ length: totalHearts }, (_, i) => {
        const heartValue = health - i * 2;
        const isFull = heartValue >= 2;
        const isHalf = heartValue === 1;

        return (
          <div
            key={i}
            className={cn(
              'w-[9px] h-[9px] relative',
              lowHealth && 'animate-[heartShake_0.3s_ease-in-out_infinite]',
            )}
            style={{
              animationDelay: lowHealth ? `${i * 50}ms` : undefined,
            }}
          >
            {/* Heart background/outline */}
            <div className="absolute inset-0 text-[9px] leading-none select-none"
              style={{ color: '#3d1010', textShadow: 'none' }}>
              &#10084;
            </div>
            {/* Full or half heart fill */}
            {isFull && (
              <div className="absolute inset-0 text-[9px] leading-none select-none"
                style={{ color: '#ff1111', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3))' }}>
                &#10084;
              </div>
            )}
            {isHalf && (
              <div className="absolute inset-0 text-[9px] leading-none select-none overflow-hidden w-[5px]"
                style={{ color: '#ff1111' }}>
                &#10084;
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Hunger bar — 10 shanks (mirrored, right-aligned) */
function HungerBar({ hunger }: { hunger: number }) {
  const totalShanks = 10;
  const lowHunger = hunger <= 12; // 6 shanks or less

  return (
    <div className="flex gap-[1px] flex-row-reverse flex-wrap justify-end">
      {Array.from({ length: totalShanks }, (_, i) => {
        const shankIndex = totalShanks - 1 - i;
        const shankValue = hunger - shankIndex * 2;
        const isFull = shankValue >= 2;
        const isHalf = shankValue === 1;

        return (
          <div key={i} className="w-[9px] h-[9px] relative">
            {/* Shank outline */}
            <div className="absolute inset-0 text-[9px] leading-none select-none"
              style={{ color: '#3d2810' }}>
              &#127831;
            </div>
            {/* Full or half shank */}
            {isFull && (
              <div className="absolute inset-0 text-[9px] leading-none select-none"
                style={{ color: lowHunger ? '#7a9a22' : '#c0892a' }}>
                &#127831;
              </div>
            )}
            {isHalf && (
              <div className="absolute inset-0 text-[9px] leading-none select-none overflow-hidden w-[5px]"
                style={{ color: lowHunger ? '#7a9a22' : '#c0892a' }}>
                &#127831;
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Armor bar — shown only when armorPoints > 0 */
function ArmorBar({ armorPoints }: { armorPoints: number }) {
  if (armorPoints <= 0) return null;
  const totalIcons = 10;

  return (
    <div className="flex gap-[1px] flex-wrap mb-[1px]">
      {Array.from({ length: totalIcons }, (_, i) => {
        const val = armorPoints - i * 2;
        const isFull = val >= 2;
        const isHalf = val === 1;

        return (
          <div key={i} className="w-[9px] h-[9px] relative">
            {/* Empty armor outline */}
            <div className="absolute inset-0 text-[9px] leading-none select-none"
              style={{ color: '#3d3d3d' }}>
              &#128737;
            </div>
            {isFull && (
              <div className="absolute inset-0 text-[9px] leading-none select-none"
                style={{ color: '#d8d8d8' }}>
                &#128737;
              </div>
            )}
            {isHalf && (
              <div className="absolute inset-0 text-[9px] leading-none select-none overflow-hidden w-[5px]"
                style={{ color: '#d8d8d8' }}>
                &#128737;
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Air bubbles — shown when underwater */
function AirBubbles({ airSupply, maxAirSupply }: { airSupply: number; maxAirSupply: number }) {
  if (airSupply >= maxAirSupply) return null;
  const totalBubbles = 10;
  const bubblesRemaining = Math.ceil((airSupply / maxAirSupply) * totalBubbles);

  return (
    <div className="flex gap-[1px] flex-row-reverse flex-wrap justify-end mb-[1px]">
      {Array.from({ length: totalBubbles }, (_, i) => {
        const bubbleIndex = totalBubbles - 1 - i;
        const isVisible = bubbleIndex < bubblesRemaining;

        return (
          <div key={i} className="w-[9px] h-[9px] relative">
            {isVisible ? (
              <div className="absolute inset-0 text-[8px] leading-none select-none"
                style={{ color: '#3399ff' }}>
                &#9679;
              </div>
            ) : (
              <div className="absolute inset-0 text-[8px] leading-none select-none"
                style={{ color: '#335566', opacity: 0.4 }}>
                &#9675;
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** XP bar */
function ExperienceBar({ level, experience }: { level: number; experience: number }) {
  // Minecraft XP formula: levels 0-16 need 2L+7, levels 17-31 need 5L-38, levels 32+ need 9L-158
  const xpForNextLevel = useMemo(() => {
    if (level < 16) return 2 * level + 7;
    if (level < 31) return 5 * level - 38;
    return 9 * level - 158;
  }, [level]);

  const progress = xpForNextLevel > 0 ? Math.min(experience / xpForNextLevel, 1) : 0;

  return (
    <div className="relative w-full h-[5px]">
      {/* Background */}
      <div className="absolute inset-0 bg-black/70 border-t border-b border-gray-800" />
      {/* Fill */}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${progress * 100}%`,
          backgroundColor: '#80FF20',
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.3)',
        }}
      />
      {/* Level number */}
      {level > 0 && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 font-pixel text-[10px] font-bold"
          style={{
            color: '#80FF20',
            textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
          }}>
          {level}
        </div>
      )}
    </div>
  );
}

/** Action bar text (fades after 2s) */
function ActionBarText({ text }: { text?: string }) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (text) {
      setDisplayText(text);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [text]);

  if (!visible || !displayText) return null;

  return (
    <div className={cn(
      'font-pixel text-sm text-white text-center transition-opacity duration-500',
      visible ? 'opacity-100' : 'opacity-0',
    )}
    style={{
      textShadow: '1px 1px 0 rgba(0,0,0,0.8)',
    }}>
      {displayText}
    </div>
  );
}

/** Boss health bar — top center */
function BossHealthBar({
  bossName,
  bossHealth,
  bossMaxHealth,
}: {
  bossName: string;
  bossHealth: number;
  bossMaxHealth: number;
}) {
  const progress = bossMaxHealth > 0 ? bossHealth / bossMaxHealth : 0;
  // Calculate segment count for visual segmented bar
  const segments = 20;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-1">
      {/* Boss name */}
      <div className="font-pixel text-sm text-white"
        style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}>
        {bossName}
      </div>
      {/* Health bar container */}
      <div className="w-64 sm:w-80 h-[10px] relative">
        <div className="absolute inset-0 bg-gray-900/90 border border-gray-700" />
        {/* Segmented fill */}
        <div className="absolute inset-[1px] flex gap-[1px]">
          {Array.from({ length: segments }, (_, i) => {
            const segProgress = i / segments;
            const isFilled = segProgress < progress;
            return (
              <div
                key={i}
                className="flex-1 h-full"
                style={{
                  backgroundColor: isFilled ? '#9933FF' : 'transparent',
                  boxShadow: isFilled ? 'inset 0 -1px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keyframe styles injected via style tag
// ---------------------------------------------------------------------------

const HUD_STYLES = `
@keyframes heartShake {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-1px); }
  75% { transform: translateY(1px); }
}
`;

// ---------------------------------------------------------------------------
// Main HUD Component
// ---------------------------------------------------------------------------

export default function HUD({
  playerState,
  inventory,
  selectedSlot,
  onSlotSelect,
  actionBarText,
  bossName,
  bossHealth,
  bossMaxHealth,
}: HUDProps) {
  // Build hotbar slots from inventory (first 9 of the hotbar)
  const hotbarSlots: (InventorySlot | null)[] = useMemo(() => {
    const slots: (InventorySlot | null)[] = [];
    for (let i = 0; i < 9; i++) {
      slots.push(inventory[i] ?? null);
    }
    return slots;
  }, [inventory]);

  // Handle keyboard slot selection
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      onSlotSelect(num - 1);
    }
  }, [onSlotSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle scroll wheel for hotbar
  const handleWheel = useCallback((e: WheelEvent) => {
    const direction = e.deltaY > 0 ? 1 : -1;
    const newSlot = ((selectedSlot + direction) % 9 + 9) % 9;
    onSlotSelect(newSlot);
  }, [selectedSlot, onSlotSelect]);

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Selected item name for action bar
  const selectedItemName = useMemo(() => {
    const slot = hotbarSlots[selectedSlot];
    return slot ? formatItemName(slot.item) : undefined;
  }, [hotbarSlots, selectedSlot]);

  return (
    <>
      {/* Inject animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: HUD_STYLES }} />

      {/* Crosshair */}
      <Crosshair />

      {/* Boss health bar */}
      {bossName && bossHealth !== undefined && bossMaxHealth !== undefined && (
        <BossHealthBar
          bossName={bossName}
          bossHealth={bossHealth}
          bossMaxHealth={bossMaxHealth}
        />
      )}

      {/* Bottom HUD container */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex flex-col items-center pb-2 px-2">
        {/* Action bar text */}
        <div className="mb-1">
          <ActionBarText text={actionBarText ?? selectedItemName} />
        </div>

        {/* Bars above hotbar */}
        <div className="w-full max-w-[480px] flex flex-col gap-[1px] mb-[2px]">
          {/* Top row: armor bar + air bubbles */}
          <div className="flex justify-between items-end px-1">
            <ArmorBar armorPoints={playerState.armorPoints} />
            <AirBubbles
              airSupply={playerState.airSupply}
              maxAirSupply={playerState.maxAirSupply}
            />
          </div>

          {/* Middle row: health + hunger */}
          <div className="flex justify-between items-end px-1">
            <HealthBar health={playerState.health} maxHealth={playerState.maxHealth} />
            <HungerBar hunger={playerState.hunger} />
          </div>
        </div>

        {/* XP bar */}
        <div className="w-full max-w-[480px] mb-[2px]">
          <ExperienceBar level={playerState.level} experience={playerState.experience} />
        </div>

        {/* Hotbar */}
        <div className="flex gap-[2px] pointer-events-auto">
          {hotbarSlots.map((slot, i) => (
            <HotbarSlot
              key={i}
              slot={slot}
              index={i}
              selected={i === selectedSlot}
              onSelect={() => onSlotSelect(i)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
