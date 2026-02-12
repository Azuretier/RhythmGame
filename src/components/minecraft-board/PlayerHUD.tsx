'use client';

// =============================================================
// Minecraft Board Game - Player HUD
// Health, hunger, inventory hotbar, armor, experience
// =============================================================

import { useCallback } from 'react';
import type { MCPlayerState, ItemType } from '@/types/minecraft-board';
import { MC_BOARD_CONFIG, ITEM_ICONS, ITEM_COLORS, ITEM_PROPERTIES } from '@/types/minecraft-board';
import styles from './MinecraftBoard.module.css';

interface PlayerHUDProps {
  selfState: MCPlayerState;
  onSelectSlot: (slot: number) => void;
  onEat: (itemIndex: number) => void;
  onToggleCrafting: () => void;
  onToggleInventory: () => void;
}

function HealthBar({ current, max }: { current: number; max: number }) {
  const hearts: React.ReactNode[] = [];
  const totalHearts = Math.ceil(max / 2);
  for (let i = 0; i < totalHearts; i++) {
    const heartValue = current - i * 2;
    let className = styles.heart;
    if (heartValue >= 2) className += ` ${styles.heartFull}`;
    else if (heartValue === 1) className += ` ${styles.heartHalf}`;
    else className += ` ${styles.heartEmpty}`;
    hearts.push(<span key={i} className={className} />);
  }
  return <div className={styles.healthBar}>{hearts}</div>;
}

function HungerBar({ current, max }: { current: number; max: number }) {
  const drums: React.ReactNode[] = [];
  const totalDrums = Math.ceil(max / 2);
  for (let i = 0; i < totalDrums; i++) {
    const drumValue = current - i * 2;
    let className = styles.hunger;
    if (drumValue >= 2) className += ` ${styles.hungerFull}`;
    else if (drumValue === 1) className += ` ${styles.hungerHalf}`;
    else className += ` ${styles.hungerEmpty}`;
    drums.push(<span key={i} className={className} />);
  }
  return <div className={styles.hungerBar}>{drums}</div>;
}

function ItemSlot({
  item,
  index,
  selected,
  onSelect,
  onRightClick,
}: {
  item: { type: ItemType; quantity: number } | null;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onRightClick: () => void;
}) {
  return (
    <div
      className={`${styles.inventorySlot} ${selected ? styles.inventorySlotSelected : ''}`}
      onClick={onSelect}
      onContextMenu={(e) => { e.preventDefault(); onRightClick(); }}
      title={item ? `${item.type.replace(/_/g, ' ')} x${item.quantity}` : `Slot ${index + 1}`}
    >
      {item && (
        <>
          <span
            className={styles.itemIcon}
            style={{ color: ITEM_COLORS[item.type] || '#ccc' }}
          >
            {ITEM_ICONS[item.type] || '?'}
          </span>
          {item.quantity > 1 && (
            <span className={styles.itemCount}>{item.quantity}</span>
          )}
        </>
      )}
      {!item && <span className={styles.slotNumber}>{index + 1}</span>}
    </div>
  );
}

export default function PlayerHUD({
  selfState,
  onSelectSlot,
  onEat,
  onToggleCrafting,
  onToggleInventory,
}: PlayerHUDProps) {
  const handleRightClick = useCallback((index: number) => {
    const item = selfState.inventory[index];
    if (item && ITEM_PROPERTIES[item.type].edible) {
      onEat(index);
    }
  }, [selfState.inventory, onEat]);

  const equippedItem = selfState.inventory[selfState.selectedSlot];
  const equippedName = equippedItem
    ? equippedItem.type.replace(/_/g, ' ')
    : 'Fist';

  return (
    <div className={styles.hud}>
      {/* Top bar: health + hunger */}
      <div className={styles.hudTopBar}>
        <HealthBar current={selfState.health} max={selfState.maxHealth} />
        <HungerBar current={selfState.hunger} max={selfState.maxHunger} />
      </div>

      {/* Status info */}
      <div className={styles.hudStatusRow}>
        <span className={styles.hudEquipped}>
          Equipped: <strong>{equippedName}</strong>
        </span>
        {selfState.armor && (
          <span className={styles.hudArmor}>
            Armor: {selfState.armor.replace(/_/g, ' ')}
          </span>
        )}
        <span className={styles.hudStats}>
          Kills: {selfState.kills} | Mined: {selfState.blocksMined} | XP: {selfState.experience}
        </span>
      </div>

      {/* Hotbar */}
      <div className={styles.hotbar}>
        {selfState.inventory.slice(0, MC_BOARD_CONFIG.HOTBAR_SIZE).map((item, i) => (
          <ItemSlot
            key={i}
            item={item}
            index={i}
            selected={i === selfState.selectedSlot}
            onSelect={() => onSelectSlot(i)}
            onRightClick={() => handleRightClick(i)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className={styles.hudActions}>
        <button className={styles.hudBtn} onClick={onToggleCrafting}>
          Craft
        </button>
        <button className={styles.hudBtn} onClick={onToggleInventory}>
          Inventory
        </button>
      </div>
    </div>
  );
}

// === Full Inventory Panel ===

export function InventoryPanel({
  selfState,
  onSelectSlot,
  onEat,
  onClose,
}: {
  selfState: MCPlayerState;
  onSelectSlot: (slot: number) => void;
  onEat: (itemIndex: number) => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.inventoryPanel}>
      <div className={styles.inventoryHeader}>
        <h3>Inventory</h3>
        <button className={styles.closeBtn} onClick={onClose}>X</button>
      </div>

      {/* Armor slot */}
      {selfState.armor && (
        <div className={styles.armorSlot}>
          <span className={styles.armorLabel}>Armor:</span>
          <span style={{ color: ITEM_COLORS[selfState.armor] || '#ccc' }}>
            {ITEM_ICONS[selfState.armor] || '?'} {selfState.armor.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Full inventory grid */}
      <div className={styles.inventoryGrid}>
        {selfState.inventory.map((item, i) => (
          <ItemSlot
            key={i}
            item={item}
            index={i}
            selected={i === selfState.selectedSlot}
            onSelect={() => onSelectSlot(i)}
            onRightClick={() => {
              if (item && ITEM_PROPERTIES[item.type].edible) onEat(i);
            }}
          />
        ))}
      </div>

      <p className={styles.inventoryHint}>
        Click to select | Right-click food to eat
      </p>
    </div>
  );
}
