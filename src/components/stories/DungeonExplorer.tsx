'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocale } from 'next-intl';
import type { DungeonLocation, DungeonTile, DungeonMob, DungeonItem } from '@/data/stories/dungeons';
import styles from './dungeonExplorer.module.css';

// Tile rendering constants
const TILE_SIZE = 40;

// Tile colors
const TILE_COLORS: Record<DungeonTile['type'], { bg: string; border: string; icon?: string }> = {
  floor: { bg: '#3a3a4a', border: '#2a2a3a' },
  wall: { bg: '#1a1a2a', border: '#0a0a1a' },
  water: { bg: '#2a4a8a', border: '#1a3a6a', icon: '~' },
  lava: { bg: '#c04020', border: '#a03010', icon: '🔥' },
  chest: { bg: '#3a3a4a', border: '#2a2a3a', icon: '📦' },
  door: { bg: '#6a5a2a', border: '#5a4a1a', icon: '🚪' },
  exit: { bg: '#2a6a2a', border: '#1a5a1a', icon: '🏁' },
  entrance: { bg: '#2a4a6a', border: '#1a3a5a', icon: '🏠' },
  trap: { bg: '#5a3a3a', border: '#4a2a2a', icon: '⚠️' },
  cracked_wall: { bg: '#2a2a3a', border: '#1a1a2a', icon: '🧱' },
};

// Mob visuals
const MOB_ICONS: Record<DungeonMob['type'], string> = {
  zombie: '🧟',
  skeleton: '💀',
  spider: '🕷️',
  creeper: '💚',
  enderman: '🟣',
};

const MOB_NAMES: Record<DungeonMob['type'], { ja: string; en: string }> = {
  zombie: { ja: 'ゾンビ', en: 'Zombie' },
  skeleton: { ja: 'スケルトン', en: 'Skeleton' },
  spider: { ja: 'クモ', en: 'Spider' },
  creeper: { ja: 'クリーパー', en: 'Creeper' },
  enderman: { ja: 'エンダーマン', en: 'Enderman' },
};

// Item icons
const ITEM_ICONS: Record<DungeonItem['type'], string> = {
  key: '🗝️',
  potion: '🧪',
  emerald: '💎',
  artifact: '⭐',
  bread: '🍞',
  arrow: '🏹',
};

interface PlayerState {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  inventory: { type: DungeonItem['type']; name: string }[];
  emeralds: number;
  defeated: number;
}

interface DungeonExplorerProps {
  location: DungeonLocation;
  onComplete: (emeralds: number, defeated: number) => void;
  onExit: () => void;
}

export default function DungeonExplorer({ location, onComplete, onExit }: DungeonExplorerProps) {
  const locale = useLocale();
  const boardRef = useRef<HTMLDivElement>(null);

  // Build the tile map from dungeon data
  const tileMap = useMemo(() => {
    const map = new Map<string, DungeonTile>();
    for (const tile of location.dungeonTiles) {
      map.set(`${tile.x},${tile.y}`, tile);
    }
    // Fill walls for the dungeon boundary
    for (let y = 0; y < location.dungeonHeight; y++) {
      for (let x = 0; x < location.dungeonWidth; x++) {
        const key = `${x},${y}`;
        if (!map.has(key)) {
          map.set(key, { x, y, type: 'wall' });
        }
      }
    }
    return map;
  }, [location]);

  // Find entrance tile for starting position
  const entranceTile = useMemo(() => {
    return location.dungeonTiles.find(t => t.type === 'entrance') || { x: 1, y: 1 };
  }, [location]);

  // Game state
  const [player, setPlayer] = useState<PlayerState>({
    x: entranceTile.x,
    y: entranceTile.y,
    health: 10,
    maxHealth: 10,
    attack: 2,
    defense: 0,
    inventory: [],
    emeralds: 0,
    defeated: 0,
  });

  const [mobs, setMobs] = useState<(DungeonMob & { alive: boolean })[]>(
    () => location.dungeonMobs.map(m => ({ ...m, alive: true }))
  );

  const [items, setItems] = useState<(DungeonItem & { collected: boolean })[]>(
    () => location.dungeonItems.map(i => ({ ...i, collected: false }))
  );

  const [openedChests, setOpenedChests] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [shakeDir, setShakeDir] = useState<string | null>(null);
  const [revealedTraps, setRevealedTraps] = useState<Set<string>>(new Set());

  const addMessage = useCallback((msg: string) => {
    setMessages(prev => [...prev.slice(-5), msg]);
  }, []);

  // Check if a tile is walkable
  const isWalkable = useCallback((x: number, y: number): boolean => {
    const tile = tileMap.get(`${x},${y}`);
    if (!tile) return false;
    return tile.type !== 'wall' && tile.type !== 'water' && tile.type !== 'lava' && tile.type !== 'cracked_wall';
  }, [tileMap]);

  // Movement handler
  const move = useCallback((dx: number, dy: number) => {
    if (gameOver || completed) return;

    const newX = player.x + dx;
    const newY = player.y + dy;

    if (!isWalkable(newX, newY)) {
      setShakeDir(dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up');
      setTimeout(() => setShakeDir(null), 200);
      return;
    }

    // Check for mob collision (combat)
    const mobAtPos = mobs.find(m => m.alive && m.x === newX && m.y === newY);
    if (mobAtPos) {
      const mobName = locale === 'en' ? MOB_NAMES[mobAtPos.type].en : MOB_NAMES[mobAtPos.type].ja;

      // Player attacks mob
      const damage = Math.max(1, player.attack - 0);
      const newMobHealth = mobAtPos.health - damage;

      if (newMobHealth <= 0) {
        // Mob defeated
        setMobs(prev => prev.map(m =>
          m.id === mobAtPos.id ? { ...m, alive: false } : m
        ));
        addMessage(`${mobName} を倒した！ (+1 ⚔️)`);

        setPlayer(prev => ({
          ...prev,
          x: newX,
          y: newY,
          defeated: prev.defeated + 1,
        }));

        // Drop loot
        if (mobAtPos.loot === 'artifact') {
          addMessage(locale === 'en' ? 'Dropped an artifact!' : 'アーティファクトを落とした！');
          setItems(prev => [...prev, {
            id: `loot-${mobAtPos.id}`,
            type: 'artifact',
            x: newX,
            y: newY,
            name: locale === 'en' ? 'Artifact' : 'アーティファクト',
            nameEn: 'Artifact',
            collected: false,
          }]);
        }
      } else {
        // Mob survives, update health and deal damage back
        setMobs(prev => prev.map(m =>
          m.id === mobAtPos.id ? { ...m, health: newMobHealth } : m
        ));

        const mobDamage = Math.max(1, mobAtPos.damage - player.defense);
        const newPlayerHealth = player.health - mobDamage;

        addMessage(`${mobName} に${damage}ダメージ！ ${mobDamage}ダメージを受けた！`);

        if (newPlayerHealth <= 0) {
          setPlayer(prev => ({ ...prev, health: 0 }));
          setGameOver(true);
          addMessage(locale === 'en' ? 'You were defeated...' : '倒れてしまった...');
        } else {
          setPlayer(prev => ({ ...prev, health: newPlayerHealth }));
        }

        // Don't move into mob's tile
        setShakeDir(dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up');
        setTimeout(() => setShakeDir(null), 200);
        return;
      }
    } else {
      // Normal movement
      setPlayer(prev => ({ ...prev, x: newX, y: newY }));
    }

    // Check for item pickup
    const itemAtPos = items.find(i => !i.collected && i.x === newX && i.y === newY);
    if (itemAtPos) {
      setItems(prev => prev.map(i =>
        i.id === itemAtPos.id ? { ...i, collected: true } : i
      ));
      const itemName = locale === 'en' ? itemAtPos.nameEn : itemAtPos.name;

      if (itemAtPos.type === 'emerald') {
        setPlayer(prev => ({ ...prev, emeralds: prev.emeralds + 1 }));
        addMessage(`💎 ${itemName} を手に入れた！`);
      } else if (itemAtPos.type === 'potion') {
        setPlayer(prev => ({
          ...prev,
          health: Math.min(prev.maxHealth, prev.health + 4),
        }));
        addMessage(`🧪 HP回復！ (+4)`);
      } else if (itemAtPos.type === 'bread') {
        setPlayer(prev => ({
          ...prev,
          health: Math.min(prev.maxHealth, prev.health + 2),
        }));
        addMessage(`🍞 HP回復！ (+2)`);
      } else if (itemAtPos.type === 'artifact') {
        setPlayer(prev => ({
          ...prev,
          attack: prev.attack + 1,
          inventory: [...prev.inventory, { type: itemAtPos.type, name: itemName }],
        }));
        addMessage(`⭐ ${itemName}！ 攻撃力UP！`);
      } else if (itemAtPos.type === 'key') {
        setPlayer(prev => ({
          ...prev,
          inventory: [...prev.inventory, { type: itemAtPos.type, name: itemName }],
        }));
        addMessage(`🗝️ ${itemName} を手に入れた！`);
      } else {
        setPlayer(prev => ({
          ...prev,
          inventory: [...prev.inventory, { type: itemAtPos.type, name: itemName }],
        }));
        addMessage(`${ITEM_ICONS[itemAtPos.type]} ${itemName} を手に入れた！`);
      }
    }

    // Check for chest
    const chestKey = `${newX},${newY}`;
    const tile = tileMap.get(chestKey);
    if (tile?.type === 'chest' && !openedChests.has(chestKey)) {
      setOpenedChests(prev => new Set(prev).add(chestKey));
      setPlayer(prev => ({ ...prev, emeralds: prev.emeralds + 2 }));
      addMessage(locale === 'en' ? '📦 Opened chest! (+2 💎)' : '📦 宝箱を開けた！ (+2 💎)');
    }

    // Check for trap
    if (tile?.type === 'trap' && !revealedTraps.has(chestKey)) {
      setRevealedTraps(prev => new Set(prev).add(chestKey));
      const trapDamage = 2;
      const newHealth = player.health - trapDamage;
      if (newHealth <= 0) {
        setPlayer(prev => ({ ...prev, health: 0, x: newX, y: newY }));
        setGameOver(true);
        addMessage(locale === 'en' ? 'Trap triggered! You were defeated...' : 'トラップ発動！倒れてしまった...');
      } else {
        setPlayer(prev => ({ ...prev, health: newHealth }));
        addMessage(locale === 'en' ? `⚠️ Trap! (-${trapDamage} HP)` : `⚠️ トラップ！ (-${trapDamage} HP)`);
      }
    }

    // Check for door (needs key)
    if (tile?.type === 'door') {
      const hasKey = player.inventory.some(i => i.type === 'key');
      if (!hasKey) {
        addMessage(locale === 'en' ? '🔒 Locked! Need a key.' : '🔒 鍵が必要！');
      }
    }

    // Check for exit
    if (tile?.type === 'exit') {
      setCompleted(true);
      addMessage(locale === 'en' ? '🏁 Dungeon cleared!' : '🏁 ダンジョンクリア！');
    }
  }, [player, mobs, items, tileMap, openedChests, revealedTraps, isWalkable, gameOver, completed, locale, addMessage]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); move(0, -1); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); move(0, 1); break;
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); move(-1, 0); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); move(1, 0); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Viewport offset (center on player)
  const viewportCols = 9;
  const viewportRows = 9;
  const halfVP = Math.floor(viewportCols / 2);

  // Render grid cells
  const gridCells = useMemo(() => {
    const cells: React.ReactNode[] = [];

    for (let vy = 0; vy < viewportRows; vy++) {
      for (let vx = 0; vx < viewportCols; vx++) {
        const wx = player.x - halfVP + vx;
        const wy = player.y - halfVP + vy;
        const key = `${wx},${wy}`;

        // Out of bounds
        if (wx < 0 || wx >= location.dungeonWidth || wy < 0 || wy >= location.dungeonHeight) {
          cells.push(
            <div
              key={`${vx}-${vy}`}
              className={styles.tile}
              style={{
                left: vx * TILE_SIZE,
                top: vy * TILE_SIZE,
                background: '#050410',
              }}
            />
          );
          continue;
        }

        const tile = tileMap.get(key);
        if (!tile) continue;

        const colors = TILE_COLORS[tile.type];
        const isOpened = tile.type === 'chest' && openedChests.has(key);
        const isRevealed = tile.type === 'trap' && revealedTraps.has(key);

        // Check if mob is on this tile
        const mob = mobs.find(m => m.alive && m.x === wx && m.y === wy);
        // Check if item is on this tile
        const item = items.find(i => !i.collected && i.x === wx && i.y === wy);
        // Is this the player?
        const isPlayer = wx === player.x && wy === player.y;

        cells.push(
          <div
            key={`${vx}-${vy}`}
            className={`${styles.tile} ${tile.type === 'floor' || tile.type === 'entrance' || tile.type === 'exit' ? styles.walkable : ''}`}
            style={{
              left: vx * TILE_SIZE,
              top: vy * TILE_SIZE,
              background: colors.bg,
              borderColor: colors.border,
            }}
            onClick={() => {
              // Click to move (if adjacent)
              const dx = wx - player.x;
              const dy = wy - player.y;
              if (Math.abs(dx) + Math.abs(dy) === 1) {
                move(dx, dy);
              }
            }}
          >
            {/* Tile icon */}
            {colors.icon && !isOpened && !isRevealed && tile.type !== 'trap' && (
              <span className={styles.tileIcon}>{colors.icon}</span>
            )}
            {isOpened && <span className={styles.tileIcon} style={{ opacity: 0.3 }}>📦</span>}
            {isRevealed && <span className={styles.tileIcon}>💥</span>}

            {/* Item */}
            {item && !isPlayer && (
              <span className={styles.itemIcon}>{ITEM_ICONS[item.type]}</span>
            )}

            {/* Mob */}
            {mob && (
              <div className={styles.mobContainer}>
                <span className={styles.mobIcon}>{MOB_ICONS[mob.type]}</span>
                <div className={styles.mobHealthBar}>
                  <div
                    className={styles.mobHealthFill}
                    style={{
                      width: `${(mob.health / (location.dungeonMobs.find(m => m.id === mob.id)?.health ?? mob.health)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Player */}
            {isPlayer && (
              <div
                className={`${styles.player} ${shakeDir ? styles[`shake_${shakeDir}`] : ''}`}
              >
                ⚔️
              </div>
            )}
          </div>
        );
      }
    }
    return cells;
  }, [player, mobs, items, tileMap, openedChests, revealedTraps, location, shakeDir, halfVP, move]);

  // Mobile D-pad
  const dpadButton = (label: string, dx: number, dy: number) => (
    <button
      className={styles.dpadBtn}
      onClick={() => move(dx, dy)}
      disabled={gameOver || completed}
    >
      {label}
    </button>
  );

  const locationName = locale === 'en' ? location.nameEn : location.name;

  return (
    <div className={styles.container}>
      <div className={styles.dungeonBg} />
      <div className={styles.scanlines} />

      {/* Header */}
      <div className={styles.header}>
        <button className={styles.exitBtn} onClick={onExit}>
          ← {locale === 'en' ? 'Map' : 'マップ'}
        </button>
        <div className={styles.headerTitle}>
          {location.icon} {locationName}
        </div>
        <div className={styles.headerStats}>
          💎 {player.emeralds} | ⚔️ {player.defeated}
        </div>
      </div>

      {/* Player HUD */}
      <div className={styles.hud}>
        <div className={styles.hudRow}>
          <span className={styles.hudLabel}>HP</span>
          <div className={styles.healthBar}>
            <div
              className={styles.healthFill}
              style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
            />
            <span className={styles.healthText}>{player.health}/{player.maxHealth}</span>
          </div>
        </div>
        <div className={styles.hudRow}>
          <span className={styles.hudLabel}>ATK</span>
          <span className={styles.hudValue}>{player.attack}</span>
          <span className={styles.hudLabel}>DEF</span>
          <span className={styles.hudValue}>{player.defense}</span>
        </div>
        {player.inventory.length > 0 && (
          <div className={styles.inventoryRow}>
            {player.inventory.map((item, i) => (
              <span key={i} className={styles.inventoryItem}>
                {ITEM_ICONS[item.type]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Game board */}
      <div className={styles.boardWrapper}>
        <div
          className={styles.board}
          ref={boardRef}
          style={{
            width: viewportCols * TILE_SIZE,
            height: viewportRows * TILE_SIZE,
          }}
        >
          {gridCells}
        </div>
      </div>

      {/* Message log */}
      <div className={styles.messageLog}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={styles.message}
            style={{ opacity: 1 - (messages.length - 1 - i) * 0.2 }}
          >
            {msg}
          </div>
        ))}
      </div>

      {/* Mobile D-pad */}
      <div className={styles.dpad}>
        <div className={styles.dpadRow}>
          {dpadButton('▲', 0, -1)}
        </div>
        <div className={styles.dpadRow}>
          {dpadButton('◄', -1, 0)}
          {dpadButton('▼', 0, 1)}
          {dpadButton('►', 1, 0)}
        </div>
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            <div className={styles.overlayTitle}>
              {locale === 'en' ? 'DEFEATED' : '敗北'}
            </div>
            <div className={styles.overlayStats}>
              💎 {player.emeralds} | ⚔️ {player.defeated}
            </div>
            <button className={styles.overlayBtn} onClick={onExit}>
              {locale === 'en' ? 'Return to Map' : 'マップに戻る'}
            </button>
          </div>
        </div>
      )}

      {/* Victory overlay */}
      {completed && (
        <div className={`${styles.overlay} ${styles.victoryOverlay}`}>
          <div className={styles.overlayContent}>
            <div className={styles.overlayTitle}>
              {locale === 'en' ? 'DUNGEON CLEARED!' : 'ダンジョンクリア！'}
            </div>
            <div className={styles.overlayIcon}>🏆</div>
            <div className={styles.overlayStats}>
              💎 {player.emeralds} | ⚔️ {player.defeated}
            </div>
            <button
              className={styles.overlayBtn}
              onClick={() => onComplete(player.emeralds, player.defeated)}
            >
              {locale === 'en' ? 'Continue' : '続ける'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
