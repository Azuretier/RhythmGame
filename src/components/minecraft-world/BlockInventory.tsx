'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Block, BlockType } from './textures';
import styles from './BlockInventory.module.css';

// ── Block definitions for inventory ──
export interface BlockInfo {
  id: BlockType;
  name: string;
  color: string;      // Primary display color
  colorAlt?: string;  // Secondary/accent color
  pattern?: 'solid' | 'striped' | 'dotted' | 'ring' | 'gradient' | 'cross' | 'frame';
}

/** All placeable blocks */
export const PLACEABLE_BLOCKS: BlockInfo[] = [
  { id: Block.Grass,       name: 'Grass',       color: '#5d9b2f', colorAlt: '#8b6840', pattern: 'gradient' },
  { id: Block.Dirt,        name: 'Dirt',        color: '#8b6840', pattern: 'solid' },
  { id: Block.Stone,       name: 'Stone',       color: '#808080', pattern: 'solid' },
  { id: Block.Cobblestone, name: 'Cobblestone', color: '#7a7a7a', colorAlt: '#555', pattern: 'dotted' },
  { id: Block.OakPlanks,   name: 'Oak Planks',  color: '#bc9155', pattern: 'striped' },
  { id: Block.OakLog,      name: 'Oak Log',     color: '#6b4c26', colorAlt: '#a88952', pattern: 'ring' },
  { id: Block.OakLeaves,   name: 'Oak Leaves',  color: '#3a7d22', pattern: 'dotted' },
  { id: Block.BirchLog,    name: 'Birch Log',   color: '#d7d2c8', colorAlt: '#333', pattern: 'dotted' },
  { id: Block.Sand,        name: 'Sand',        color: '#dbc478', pattern: 'solid' },
  { id: Block.Sandstone,   name: 'Sandstone',   color: '#d4b87a', pattern: 'striped' },
  { id: Block.Gravel,      name: 'Gravel',      color: '#807c78', pattern: 'dotted' },
  { id: Block.Clay,        name: 'Clay',        color: '#a0a6b2', pattern: 'solid' },
  { id: Block.Glass,       name: 'Glass',       color: '#c8dde7', pattern: 'frame' },
  { id: Block.Snow,        name: 'Snow',        color: '#f4f4f8', pattern: 'solid' },
  { id: Block.Ice,         name: 'Ice',         color: '#a5d6f5', pattern: 'cross' },
  { id: Block.Pumpkin,     name: 'Pumpkin',     color: '#ce7e1e', colorAlt: '#508032', pattern: 'ring' },
  { id: Block.CoalOre,     name: 'Coal Ore',    color: '#808080', colorAlt: '#1e1e1e', pattern: 'dotted' },
  { id: Block.IronOre,     name: 'Iron Ore',    color: '#808080', colorAlt: '#c8b496', pattern: 'dotted' },
  { id: Block.GoldOre,     name: 'Gold Ore',    color: '#808080', colorAlt: '#daa520', pattern: 'dotted' },
  { id: Block.DiamondOre,  name: 'Diamond Ore', color: '#808080', colorAlt: '#64dceb', pattern: 'dotted' },
];

const HOTBAR_SIZE = 9;

/** Render a mini block icon with pattern */
function BlockIcon({ block, size = 32 }: { block: BlockInfo; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const s = size;
    ctx.clearRect(0, 0, s, s);

    // Base color fill
    ctx.fillStyle = block.color;
    ctx.fillRect(0, 0, s, s);

    const alt = block.colorAlt || block.color;

    switch (block.pattern) {
      case 'gradient': {
        // Top half primary, bottom half alt (like grass)
        ctx.fillStyle = alt;
        ctx.fillRect(0, Math.floor(s * 0.4), s, s);
        break;
      }
      case 'striped': {
        // Horizontal stripes
        ctx.fillStyle = alt;
        for (let i = 0; i < s; i += 4) {
          ctx.fillRect(0, i, s, 1);
        }
        break;
      }
      case 'dotted': {
        // Random ore/leaf dots
        ctx.fillStyle = alt;
        const dotSize = Math.max(2, Math.floor(s / 8));
        const positions = [
          [0.2, 0.3], [0.6, 0.2], [0.4, 0.6], [0.7, 0.7], [0.15, 0.75],
        ];
        for (const [px, py] of positions) {
          ctx.fillRect(
            Math.floor(px * s),
            Math.floor(py * s),
            dotSize, dotSize,
          );
        }
        break;
      }
      case 'ring': {
        // Center circle (like log top)
        ctx.fillStyle = alt;
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'frame': {
        // Border frame (like glass)
        ctx.strokeStyle = '#667788';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, s - 2, s - 2);
        ctx.strokeRect(3, 3, s - 6, s - 6);
        break;
      }
      case 'cross': {
        // Cross pattern (like ice cracks)
        ctx.strokeStyle = alt || '#cceeff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s, s);
        ctx.moveTo(s, 0);
        ctx.lineTo(0, s);
        ctx.stroke();
        break;
      }
      default:
        break;
    }

    // Pixel-art border
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, s - 1, s - 1);

    // Subtle highlight on top-left
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(1, 1, s - 2, 1);
    ctx.fillRect(1, 1, 1, s - 2);

    // Shadow on bottom-right
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(1, s - 2, s - 2, 1);
    ctx.fillRect(s - 2, 1, 1, s - 2);
  }, [block, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={styles.blockIcon}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
}

export interface BlockInventoryProps {
  /** Currently selected hotbar slot (0-8) */
  selectedSlot: number;
  /** Hotbar contents (block IDs for slots 0-8) */
  hotbar: (BlockType | null)[];
  /** Called when selected slot changes */
  onSelectSlot: (slot: number) => void;
  /** Called when hotbar is updated */
  onUpdateHotbar: (hotbar: (BlockType | null)[]) => void;
  /** Whether the full inventory is open */
  inventoryOpen: boolean;
  /** Toggle inventory open/close */
  onToggleInventory: () => void;
}

/**
 * Minecraft-style block inventory with a bottom hotbar and full-screen
 * inventory panel (toggled with E key).
 */
export function BlockInventory({
  selectedSlot,
  hotbar,
  onSelectSlot,
  onUpdateHotbar,
  inventoryOpen,
  onToggleInventory,
}: BlockInventoryProps) {
  const [tooltipBlock, setTooltipBlock] = useState<BlockInfo | null>(null);

  const getBlockInfo = useCallback((blockId: BlockType | null): BlockInfo | undefined => {
    if (blockId === null) return undefined;
    return PLACEABLE_BLOCKS.find(b => b.id === blockId);
  }, []);

  // Add block to first empty hotbar slot or replace selected
  const addToHotbar = useCallback((blockId: BlockType) => {
    const newHotbar = [...hotbar];

    // If already in hotbar, just select it
    const existingIdx = newHotbar.indexOf(blockId);
    if (existingIdx !== -1) {
      onSelectSlot(existingIdx);
      return;
    }

    // Try to place in selected slot first
    if (newHotbar[selectedSlot] === null) {
      newHotbar[selectedSlot] = blockId;
    } else {
      // Find first empty slot
      const emptyIdx = newHotbar.indexOf(null);
      if (emptyIdx !== -1) {
        newHotbar[emptyIdx] = blockId;
      } else {
        // Replace selected slot
        newHotbar[selectedSlot] = blockId;
      }
    }

    onUpdateHotbar(newHotbar);
  }, [hotbar, selectedSlot, onSelectSlot, onUpdateHotbar]);

  return (
    <>
      {/* ── Hotbar ── */}
      <div className={styles.hotbarContainer}>
        <div className={styles.hotbar}>
          {hotbar.map((blockId, slotIdx) => {
            const info = getBlockInfo(blockId);
            const isSelected = slotIdx === selectedSlot;

            return (
              <button
                key={slotIdx}
                className={`${styles.hotbarSlot} ${isSelected ? styles.hotbarSlotSelected : ''}`}
                onClick={() => onSelectSlot(slotIdx)}
                onMouseEnter={() => info && setTooltipBlock(info)}
                onMouseLeave={() => setTooltipBlock(null)}
              >
                {info && <BlockIcon block={info} size={32} />}
                <span className={styles.hotbarSlotNumber}>{slotIdx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Tooltip */}
        {tooltipBlock && (
          <div className={styles.hotbarTooltip}>
            {tooltipBlock.name}
          </div>
        )}
      </div>

      {/* ── Full Inventory Panel ── */}
      {inventoryOpen && (
        <div className={styles.inventoryOverlay} onClick={onToggleInventory}>
          <div className={styles.inventoryPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.inventoryHeader}>
              <h3 className={styles.inventoryTitle}>Block Inventory</h3>
              <button className={styles.inventoryClose} onClick={onToggleInventory}>
                ✕
              </button>
            </div>

            {/* ── Hotbar Section ── */}
            <div className={styles.inventorySection}>
              <div className={styles.inventorySectionLabel}>Hotbar</div>
              <div className={styles.inventoryHotbarRow}>
                {hotbar.map((blockId, slotIdx) => {
                  const info = getBlockInfo(blockId);
                  const isSelected = slotIdx === selectedSlot;

                  return (
                    <div
                      key={slotIdx}
                      className={`${styles.inventorySlot} ${isSelected ? styles.inventorySlotSelected : ''}`}
                      onClick={() => onSelectSlot(slotIdx)}
                    >
                      {info && <BlockIcon block={info} size={28} />}
                      <span className={styles.inventorySlotKey}>{slotIdx + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── All Blocks Grid ── */}
            <div className={styles.inventorySection}>
              <div className={styles.inventorySectionLabel}>
                All Blocks ({PLACEABLE_BLOCKS.length})
              </div>
              <div className={styles.inventoryGrid}>
                {PLACEABLE_BLOCKS.map(block => {
                  const inHotbar = hotbar.includes(block.id);

                  return (
                    <button
                      key={block.id}
                      className={`${styles.inventoryBlockBtn} ${inHotbar ? styles.inventoryBlockInHotbar : ''}`}
                      onClick={() => addToHotbar(block.id)}
                      title={block.name}
                    >
                      <BlockIcon block={block} size={32} />
                      <span className={styles.inventoryBlockName}>{block.name}</span>
                      {inHotbar && <span className={styles.inventoryBlockCheck}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.inventoryHint}>
              Click a block to add it to your hotbar. Press <kbd>E</kbd> to close.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BlockInventory;
