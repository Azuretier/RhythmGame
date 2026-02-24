'use client';

// =============================================================
// Echoes of Eternity — Exploration Map
// World exploration with resource gathering and encounters
// =============================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEchoes } from '@/lib/echoes/context';
import type { BiomeType, WorldLayer, WorldTileEchoes, ResourceType } from '@/types/echoes';
import { ECHOES_CONFIG } from '@/types/echoes';

// === Biome Colors & Icons ===

const BIOME_COLORS: Record<BiomeType, string> = {
  verdant_plains: '#5D8C3E',
  crystal_caves: '#4AEDD9',
  volcanic_ridge: '#FF4500',
  frozen_peaks: '#A5D6F7',
  shadow_abyss: '#4B0082',
  sky_citadel: '#FFD700',
  temporal_ruins: '#8A2BE2',
  void_rift: '#330066',
};

const BIOME_ICONS: Record<BiomeType, string> = {
  verdant_plains: '~',
  crystal_caves: '*',
  volcanic_ridge: '^',
  frozen_peaks: '#',
  shadow_abyss: '.',
  sky_citadel: '+',
  temporal_ruins: '?',
  void_rift: 'X',
};

const BIOME_NAMES: Record<BiomeType, string> = {
  verdant_plains: 'Verdant Plains',
  crystal_caves: 'Crystal Caves',
  volcanic_ridge: 'Volcanic Ridge',
  frozen_peaks: 'Frozen Peaks',
  shadow_abyss: 'Shadow Abyss',
  sky_citadel: 'Sky Citadel',
  temporal_ruins: 'Temporal Ruins',
  void_rift: 'Void Rift',
};

const RESOURCE_ICONS: Partial<Record<ResourceType, string>> = {
  wood: 'W',
  iron_ore: 'I',
  mythril_ore: 'M',
  herb: 'h',
  moonflower: 'm',
  gold: 'G',
  eternium: 'E',
  chrono_shard: 'C',
  elemental_dust: 'd',
};

interface MapTile {
  x: number;
  y: number;
  biome: BiomeType;
  discovered: boolean;
  hasResource: boolean;
  hasPoi: boolean;
  poiType?: string;
}

function generateWorldMap(seed: number, size: number): MapTile[][] {
  const map: MapTile[][] = [];
  const biomes: BiomeType[] = [
    'verdant_plains', 'crystal_caves', 'volcanic_ridge', 'frozen_peaks',
    'shadow_abyss', 'sky_citadel', 'temporal_ruins', 'void_rift',
  ];

  // Simple seeded random
  let rng = seed;
  const random = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return (rng & 0x7fffffff) / 0x7fffffff;
  };

  // Generate biome zones
  const zoneCenters: { x: number; y: number; biome: BiomeType }[] = [];
  for (let i = 0; i < biomes.length; i++) {
    zoneCenters.push({
      x: Math.floor(random() * size),
      y: Math.floor(random() * size),
      biome: biomes[i],
    });
  }

  for (let y = 0; y < size; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < size; x++) {
      // Find nearest biome center
      let nearest = zoneCenters[0];
      let nearestDist = Infinity;
      for (const center of zoneCenters) {
        const dist = Math.sqrt((x - center.x) ** 2 + (y - center.y) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = center;
        }
      }

      const hasResource = random() < 0.15;
      const hasPoi = random() < 0.05;
      const poiTypes = ['chest', 'dungeon', 'npc', 'waypoint', 'boss'];

      row.push({
        x,
        y,
        biome: nearest.biome,
        discovered: false,
        hasResource,
        hasPoi,
        poiType: hasPoi ? poiTypes[Math.floor(random() * poiTypes.length)] : undefined,
      });
    }
    map.push(row);
  }

  // Discover starting area
  const centerX = Math.floor(size / 2);
  const centerY = Math.floor(size / 2);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const tx = centerX + dx;
      const ty = centerY + dy;
      if (tx >= 0 && tx < size && ty >= 0 && ty < size) {
        map[ty][tx].discovered = true;
      }
    }
  }

  return map;
}

export function ExplorationMap() {
  const { state, setPhase, dispatch } = useEchoes();
  const { playerData } = state;

  const [worldMap, setWorldMap] = useState<MapTile[][]>(() => generateWorldMap(42, ECHOES_CONFIG.WORLD_MAP_SIZE));
  const [playerPos, setPlayerPos] = useState({ x: Math.floor(ECHOES_CONFIG.WORLD_MAP_SIZE / 2), y: Math.floor(ECHOES_CONFIG.WORLD_MAP_SIZE / 2) });
  const [stamina, setStamina] = useState(playerData.resources.gold ? ECHOES_CONFIG.MAX_STAMINA : 100);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentBiome, setCurrentBiome] = useState<BiomeType>('verdant_plains');

  const viewportSize = 11;
  const halfView = Math.floor(viewportSize / 2);

  // Visible tiles
  const visibleTiles = useMemo(() => {
    const tiles: MapTile[][] = [];
    for (let vy = 0; vy < viewportSize; vy++) {
      const row: MapTile[] = [];
      for (let vx = 0; vx < viewportSize; vx++) {
        const wx = playerPos.x - halfView + vx;
        const wy = playerPos.y - halfView + vy;

        if (wx >= 0 && wx < ECHOES_CONFIG.WORLD_MAP_SIZE && wy >= 0 && wy < ECHOES_CONFIG.WORLD_MAP_SIZE) {
          row.push(worldMap[wy][wx]);
        } else {
          row.push({ x: wx, y: wy, biome: 'void_rift', discovered: false, hasResource: false, hasPoi: false });
        }
      }
      tiles.push(row);
    }
    return tiles;
  }, [worldMap, playerPos, halfView]);

  // Move player
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (stamina <= 0) {
      setNotification('Out of stamina!');
      return;
    }

    setPlayerPos(prev => {
      const nx = Math.max(0, Math.min(ECHOES_CONFIG.WORLD_MAP_SIZE - 1, prev.x + dx));
      const ny = Math.max(0, Math.min(ECHOES_CONFIG.WORLD_MAP_SIZE - 1, prev.y + dy));

      // Discover surrounding tiles
      setWorldMap(map => {
        const newMap = map.map(row => [...row]);
        for (let ddy = -2; ddy <= 2; ddy++) {
          for (let ddx = -2; ddx <= 2; ddx++) {
            const tx = nx + ddx;
            const ty = ny + ddy;
            if (tx >= 0 && tx < ECHOES_CONFIG.WORLD_MAP_SIZE && ty >= 0 && ty < ECHOES_CONFIG.WORLD_MAP_SIZE) {
              newMap[ty][tx] = { ...newMap[ty][tx], discovered: true };
            }
          }
        }
        return newMap;
      });

      // Check current tile
      const tile = worldMap[ny]?.[nx];
      if (tile) {
        setCurrentBiome(tile.biome);

        // Random encounter chance
        if (Math.random() < 0.08) {
          setNotification('Enemy encounter!');
          // Transition to combat
          setTimeout(() => {
            setPhase('combat');
          }, 1000);
        }
      }

      return { x: nx, y: ny };
    });

    setStamina(prev => Math.max(0, prev - 1));
  }, [stamina, worldMap, setPhase]);

  // Gather resource at current tile
  const gatherResource = useCallback(() => {
    const tile = worldMap[playerPos.y]?.[playerPos.x];
    if (!tile?.hasResource) {
      setNotification('Nothing to gather here');
      return;
    }

    // Determine resource based on biome
    const biomeResources: Record<BiomeType, ResourceType[]> = {
      verdant_plains: ['wood', 'herb', 'iron_ore'],
      crystal_caves: ['mythril_ore', 'elemental_dust', 'rift_crystal'],
      volcanic_ridge: ['iron_ore', 'adamantite_ore', 'elemental_dust'],
      frozen_peaks: ['iron_ore', 'moonflower', 'chrono_shard'],
      shadow_abyss: ['soul_fragment', 'void_essence', 'elemental_dust'],
      sky_citadel: ['eternium', 'chrono_shard', 'starbloom'],
      temporal_ruins: ['chrono_shard', 'eternium', 'void_essence'],
      void_rift: ['void_essence', 'rift_crystal', 'soul_fragment'],
    };

    const possibleResources = biomeResources[tile.biome];
    const resource = possibleResources[Math.floor(Math.random() * possibleResources.length)];
    const quantity = 1 + Math.floor(Math.random() * 3);

    dispatch({ type: 'ADD_RESOURCES', resources: { [resource]: quantity } });
    setNotification(`Gathered ${quantity}x ${resource.replace(/_/g, ' ')}!`);

    // Remove resource from tile
    setWorldMap(map => {
      const newMap = map.map(row => [...row]);
      newMap[playerPos.y][playerPos.x] = { ...newMap[playerPos.y][playerPos.x], hasResource: false };
      return newMap;
    });
  }, [worldMap, playerPos, dispatch]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': movePlayer(0, -1); break;
        case 's': case 'arrowdown': movePlayer(0, 1); break;
        case 'a': case 'arrowleft': movePlayer(-1, 0); break;
        case 'd': case 'arrowright': movePlayer(1, 0); break;
        case 'e': gatherResource(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePlayer, gatherResource]);

  // Clear notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 2000);
    return () => clearTimeout(timer);
  }, [notification]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-2xl mb-4">
        <button onClick={() => setPhase('main_menu')} className="text-zinc-500 hover:text-zinc-300 text-sm">
          &larr; Return
        </button>
        <div className="text-center">
          <div className="text-sm font-bold" style={{ color: BIOME_COLORS[currentBiome] }}>
            {BIOME_NAMES[currentBiome]}
          </div>
          <div className="text-xs text-zinc-500">
            ({playerPos.x}, {playerPos.y}) &middot; Stamina: {stamina}/{ECHOES_CONFIG.MAX_STAMINA}
          </div>
        </div>
        <div className="text-xs text-zinc-600">
          WASD/Arrows to move, E to gather
        </div>
      </div>

      {/* Stamina Bar */}
      <div className="w-full max-w-2xl mb-4">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full transition-all"
            style={{ width: `${(stamina / ECHOES_CONFIG.MAX_STAMINA) * 100}%` }}
          />
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-2 text-sm font-bold text-yellow-400"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Grid */}
      <div
        className="grid gap-0 border border-zinc-800 rounded-lg overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${viewportSize}, 1fr)` }}
      >
        {visibleTiles.map((row, vy) =>
          row.map((tile, vx) => {
            const isPlayer = vx === halfView && vy === halfView;
            const isDiscovered = tile.discovered;

            return (
              <div
                key={`${vx}-${vy}`}
                className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-xs font-mono relative"
                style={{
                  backgroundColor: isDiscovered ? `${BIOME_COLORS[tile.biome]}30` : '#111',
                  borderRight: '1px solid #222',
                  borderBottom: '1px solid #222',
                }}
              >
                {isPlayer ? (
                  <span className="text-white font-bold text-sm">@</span>
                ) : isDiscovered ? (
                  <>
                    {tile.hasPoi && (
                      <span className="text-yellow-400 font-bold">
                        {tile.poiType === 'chest' ? '$' : tile.poiType === 'boss' ? 'B' : tile.poiType === 'dungeon' ? 'D' : '!'}
                      </span>
                    )}
                    {!tile.hasPoi && tile.hasResource && (
                      <span style={{ color: BIOME_COLORS[tile.biome] }} className="opacity-60">
                        {BIOME_ICONS[tile.biome]}
                      </span>
                    )}
                    {!tile.hasPoi && !tile.hasResource && (
                      <span className="text-zinc-800">&middot;</span>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-900">&middot;</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Movement Controls (Mobile) */}
      <div className="mt-4 grid grid-cols-3 gap-1 w-32">
        <div />
        <button onClick={() => movePlayer(0, -1)} className="bg-zinc-800 rounded p-2 text-center text-zinc-400 hover:bg-zinc-700 active:bg-purple-600">
          W
        </button>
        <div />
        <button onClick={() => movePlayer(-1, 0)} className="bg-zinc-800 rounded p-2 text-center text-zinc-400 hover:bg-zinc-700 active:bg-purple-600">
          A
        </button>
        <button onClick={gatherResource} className="bg-zinc-800 rounded p-2 text-center text-yellow-500 hover:bg-zinc-700 active:bg-yellow-600 text-xs font-bold">
          E
        </button>
        <button onClick={() => movePlayer(1, 0)} className="bg-zinc-800 rounded p-2 text-center text-zinc-400 hover:bg-zinc-700 active:bg-purple-600">
          D
        </button>
        <div />
        <button onClick={() => movePlayer(0, 1)} className="bg-zinc-800 rounded p-2 text-center text-zinc-400 hover:bg-zinc-700 active:bg-purple-600">
          S
        </button>
        <div />
      </div>

      {/* Mini Legend */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs text-zinc-600">
        <span>@ = You</span>
        <span>$ = Chest</span>
        <span>B = Boss</span>
        <span>D = Dungeon</span>
        <span>! = NPC</span>
      </div>
    </div>
  );
}
