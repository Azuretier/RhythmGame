'use client';

// =============================================================================
// Minecraft: Switch Edition — Game Play Page
// Full game shell with loading screen, HUD, pause menu, inventory,
// chat, debug overlay, and control hints.
// =============================================================================

import {
  Suspense,
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import type {
  GameMode,
  Difficulty,
  PlayerState,
  InventorySlot,
  PlayerPosition,
  PlayerInventory,
} from '@/types/minecraft-switch';
import { getCreativeInventory, getGameModeConfig } from '@/lib/minecraft-switch/game-modes';
import HUD from '@/components/minecraft-switch/HUD';
import PauseMenu from '@/components/minecraft-switch/PauseMenu';
import InventoryScreen from '@/components/minecraft-switch/InventoryScreen';
import styles from '@/components/minecraft-switch/MinecraftSwitch.module.css';

// ---------------------------------------------------------------------------
// Config parser
// ---------------------------------------------------------------------------

interface ParsedGameConfig {
  seed: number;
  size: string;
  mode: GameMode;
  difficulty: Difficulty;
  name: string;
}

function parseGameConfig(params: URLSearchParams): ParsedGameConfig {
  const seedStr = params.get('seed') ?? '';
  const seed = seedStr ? parseInt(seedStr, 10) : Math.floor(Math.random() * 2147483647);

  const size = params.get('size') ?? 'classic';

  const modeParam = params.get('mode') ?? 'survival';
  const validModes: GameMode[] = ['survival', 'creative', 'adventure', 'spectator'];
  const mode: GameMode = validModes.includes(modeParam as GameMode)
    ? (modeParam as GameMode)
    : 'survival';

  const diffParam = params.get('difficulty') ?? 'normal';
  const validDiffs: Difficulty[] = ['peaceful', 'easy', 'normal', 'hard'];
  const difficulty: Difficulty = validDiffs.includes(diffParam as Difficulty)
    ? (diffParam as Difficulty)
    : 'normal';

  const name = params.get('name') ?? 'New World';

  return { seed: isNaN(seed) ? 42 : seed, size, mode, difficulty, name };
}

// ---------------------------------------------------------------------------
// Loading stage descriptions
// ---------------------------------------------------------------------------

function getLoadingStage(progress: number): string {
  if (progress < 25) return 'Building terrain...';
  if (progress < 50) return 'Preparing spawn area...';
  if (progress < 75) return 'Loading resources...';
  return 'Starting game...';
}

// ---------------------------------------------------------------------------
// Initial inventory helpers
// ---------------------------------------------------------------------------

function getSurvivalInventory(): PlayerInventory {
  const hotbar: (InventorySlot | null)[] = [
    { item: 'wooden_sword', count: 1, durability: 59 },
    { item: 'wooden_pickaxe', count: 1, durability: 59 },
    { item: 'torch', count: 16 },
    null,
    null,
    null,
    null,
    null,
    null,
  ];

  const main: (InventorySlot | null)[] = Array(27).fill(null);

  return {
    main,
    hotbar,
    armor: [null, null, null, null],
    offhand: null,
    selectedSlot: 0,
  };
}

function getInitialInventory(mode: GameMode): PlayerInventory {
  if (mode === 'creative') return getCreativeInventory();
  return getSurvivalInventory();
}

// ---------------------------------------------------------------------------
// Initial player state
// ---------------------------------------------------------------------------

function getInitialPlayerState(mode: GameMode): PlayerState {
  const modeConfig = getGameModeConfig(mode);
  const inventory = getInitialInventory(mode);

  return {
    id: 'local-player',
    name: 'Steve',
    position: { x: 0, y: 64, z: 0, yaw: 0, pitch: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    health: 20,
    maxHealth: 20,
    hunger: 20,
    saturation: 5,
    experience: 0,
    level: 0,
    totalExperience: 0,
    armorPoints: mode === 'creative' ? 20 : 0,
    gameMode: mode,
    onGround: true,
    sprinting: false,
    sneaking: false,
    swimming: false,
    flying: mode === 'creative' || mode === 'spectator',
    dead: false,
    statusEffects: [],
    dimension: 'overworld',
    spawnPoint: { x: 0, y: 64, z: 0 },
    inventory,
    connected: true,
    color: '#ffffff',
    invulnerabilityTicks: 0,
    fireTicks: 0,
    airSupply: 300,
    maxAirSupply: 300,
  };
}

// ---------------------------------------------------------------------------
// Chat message type
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: number;
  text: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Star field component (CSS-based night sky)
// ---------------------------------------------------------------------------

function StarField() {
  const stars = useMemo(() => {
    const result: { x: number; y: number; size: number; opacity: number }[] = [];
    for (let i = 0; i < 120; i++) {
      result.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }
    return result;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Control hints overlay
// ---------------------------------------------------------------------------

function ControlHints({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <div
        className="px-8 py-6 flex flex-col gap-3"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: '2px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {[
          ['WASD', 'Move'],
          ['Mouse', 'Look'],
          ['E', 'Inventory'],
          ['Esc', 'Pause'],
          ['T', 'Chat'],
          ['F3', 'Debug'],
        ].map(([key, action]) => (
          <div key={key} className="flex items-center gap-4">
            <span
              className="font-pixel text-xs text-white/90 w-16 text-right"
              style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.8)' }}
            >
              {key}
            </span>
            <span className="font-pixel text-xs text-gray-400">
              {action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Debug screen overlay (F3)
// ---------------------------------------------------------------------------

function DebugScreen({
  position,
  seed,
  fps,
  dayCount,
  mode,
  difficulty,
}: {
  position: PlayerPosition;
  seed: number;
  fps: number;
  dayCount: number;
  mode: GameMode;
  difficulty: Difficulty;
}) {
  return (
    <div
      className="fixed top-2 left-2 z-[55] px-3 py-2 pointer-events-none flex flex-col gap-0.5"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
      }}
    >
      <div className="font-pixel text-[10px] text-white">
        Minecraft: Switch Edition (Web) v0.1.0-alpha
      </div>
      <div className="font-pixel text-[10px] text-white">
        {fps} fps
      </div>
      <div className="h-1" />
      <div className="font-pixel text-[10px] text-white">
        XYZ: {position.x.toFixed(3)} / {position.y.toFixed(3)} / {position.z.toFixed(3)}
      </div>
      <div className="font-pixel text-[10px] text-white">
        Facing: yaw {position.yaw.toFixed(1)} pitch {position.pitch.toFixed(1)}
      </div>
      <div className="h-1" />
      <div className="font-pixel text-[10px] text-white">
        Seed: {seed}
      </div>
      <div className="font-pixel text-[10px] text-white">
        Day: {dayCount}
      </div>
      <div className="font-pixel text-[10px] text-white">
        Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)}
      </div>
      <div className="font-pixel text-[10px] text-white">
        Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat overlay
// ---------------------------------------------------------------------------

function ChatOverlay({
  messages,
  chatOpen,
  chatInput,
  onChatInputChange,
  onSend,
  onClose,
}: {
  messages: ChatMessage[];
  chatOpen: boolean;
  chatInput: string;
  onChatInputChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const now = Date.now();

  useEffect(() => {
    if (chatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatOpen]);

  // Filter visible messages: show last 5, each visible for 10 seconds (or always when chat is open)
  const visibleMessages = messages
    .filter((m) => chatOpen || now - m.timestamp < 10000)
    .slice(-5);

  return (
    <div className="fixed bottom-16 left-2 z-[55] flex flex-col gap-1 w-80 max-w-[calc(100vw-16px)]">
      {visibleMessages.map((msg) => {
        const age = now - msg.timestamp;
        const fading = !chatOpen && age > 8000;
        return (
          <div
            key={msg.id}
            className="font-pixel text-xs text-white px-2 py-0.5"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              textShadow: '1px 1px 0 rgba(0,0,0,0.8)',
              opacity: fading ? Math.max(0, 1 - (age - 8000) / 2000) : 1,
              transition: 'opacity 0.3s',
            }}
          >
            {msg.text}
          </div>
        );
      })}

      {chatOpen && (
        <input
          ref={inputRef}
          type="text"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSend();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          className={styles.mcInput}
          placeholder="Type a message..."
          style={{ fontSize: '11px', minHeight: '32px', padding: '4px 8px' }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner component that reads search params (must be wrapped in Suspense)
// ---------------------------------------------------------------------------

function GamePlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const config = useMemo(() => parseGameConfig(searchParams), [searchParams]);
  const modeConfig = useMemo(() => getGameModeConfig(config.mode), [config.mode]);

  // -- Loading state --
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingFading, setLoadingFading] = useState(false);

  // -- Game state --
  const [playerState, setPlayerState] = useState<PlayerState>(() =>
    getInitialPlayerState(config.mode),
  );
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [dayCount] = useState(1);

  // -- Overlays --
  const [pauseOpen, setPauseOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [showControlHints, setShowControlHints] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  // -- Chat --
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatIdRef = useRef(0);

  // -- FPS counter --
  const [fps, setFps] = useState(0);
  const fpsFrames = useRef(0);
  const fpsLastTime = useRef(performance.now());

  // -- Loading progress animation --
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 3500; // 3.5 seconds

    function tick(time: number) {
      if (start === null) start = time;
      const elapsed = time - start;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setLoadingProgress(progress);

      if (progress < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        // Start fade out
        setLoadingFading(true);
        setTimeout(() => {
          setLoading(false);
          setShowControlHints(true);
        }, 400);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // -- Hide control hints after 5 seconds --
  useEffect(() => {
    if (!showControlHints) return;
    const timer = setTimeout(() => setShowControlHints(false), 5000);
    return () => clearTimeout(timer);
  }, [showControlHints]);

  // -- FPS counter --
  useEffect(() => {
    if (loading) return;
    let animFrame: number;

    function countFrame() {
      fpsFrames.current++;
      const now = performance.now();
      const delta = now - fpsLastTime.current;
      if (delta >= 1000) {
        setFps(Math.round((fpsFrames.current * 1000) / delta));
        fpsFrames.current = 0;
        fpsLastTime.current = now;
      }
      animFrame = requestAnimationFrame(countFrame);
    }

    animFrame = requestAnimationFrame(countFrame);
    return () => cancelAnimationFrame(animFrame);
  }, [loading]);

  // -- Force re-render for chat message fading --
  useEffect(() => {
    if (chatMessages.length === 0) return;
    const interval = setInterval(() => {
      // trigger re-render to update message fade
      setChatMessages((prev) => [...prev]);
    }, 500);
    return () => clearInterval(interval);
  }, [chatMessages.length]);

  // -- Keyboard handler --
  useEffect(() => {
    if (loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Chat takes priority when open
      if (chatOpen) {
        // Chat closes on Escape (handled in ChatOverlay)
        return;
      }

      // Inventory takes priority when open
      if (inventoryOpen) {
        // InventoryScreen handles its own Escape/E close
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          if (pauseOpen) {
            setPauseOpen(false);
          } else {
            setPauseOpen(true);
          }
          break;

        case 'e':
        case 'E':
          if (!pauseOpen) {
            e.preventDefault();
            setInventoryOpen((prev) => !prev);
          }
          break;

        case 't':
        case 'T':
          if (!pauseOpen) {
            e.preventDefault();
            setChatOpen(true);
          }
          break;

        case 'F3':
          e.preventDefault();
          setDebugOpen((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, chatOpen, inventoryOpen, pauseOpen]);

  // -- Handlers --
  const handleResume = useCallback(() => setPauseOpen(false), []);

  const handleQuit = useCallback(() => {
    router.push('/minecraft');
  }, [router]);

  const handleSlotSelect = useCallback((slot: number) => {
    setSelectedSlot(slot);
  }, []);

  const handleCloseInventory = useCallback(() => {
    setInventoryOpen(false);
  }, []);

  const handleMoveItem = useCallback(
    (
      fromSlot: number,
      toSlot: number,
      fromContainer: string,
      toContainer: string,
      count?: number,
    ) => {
      setPlayerState((prev) => {
        const inv = { ...prev.inventory };
        const getArray = (c: string) => {
          if (c === 'main') return [...inv.main];
          if (c === 'hotbar') return [...inv.hotbar];
          if (c === 'armor') return [...inv.armor];
          return [];
        };
        const setArray = (c: string, arr: (InventorySlot | null)[]) => {
          if (c === 'main') inv.main = arr;
          if (c === 'hotbar') inv.hotbar = arr;
          if (c === 'armor') inv.armor = arr;
        };

        if (fromContainer === toContainer) {
          const arr = getArray(fromContainer);
          // Swap
          const temp = arr[fromSlot];
          arr[fromSlot] = arr[toSlot];
          arr[toSlot] = temp;
          setArray(fromContainer, arr);
        } else {
          const fromArr = getArray(fromContainer);
          const toArr = getArray(toContainer);
          const temp = fromArr[fromSlot];
          fromArr[fromSlot] = toArr[toSlot];
          toArr[toSlot] = temp;
          setArray(fromContainer, fromArr);
          setArray(toContainer, toArr);
        }

        return { ...prev, inventory: { ...inv } };
      });
    },
    [],
  );

  const handleCraftItem = useCallback(
    (_grid: (InventorySlot | null)[]): InventorySlot | null => {
      // No crafting recipes implemented yet
      return null;
    },
    [],
  );

  const handleChatSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text) {
      setChatOpen(false);
      return;
    }
    setChatMessages((prev) => [
      ...prev,
      {
        id: chatIdRef.current++,
        text: `<Steve> ${text}`,
        timestamp: Date.now(),
      },
    ]);
    setChatInput('');
    setChatOpen(false);
  }, [chatInput]);

  const handleChatClose = useCallback(() => {
    setChatOpen(false);
    setChatInput('');
  }, []);

  // -- HUD inventory (pass first 9 slots of hotbar) --
  const hudInventory = useMemo(
    () => playerState.inventory.hotbar.slice(0, 9),
    [playerState.inventory.hotbar],
  );

  // Whether to show survival bars
  const showBars = modeConfig.showHunger;

  // Build a playerState for HUD (hide bars in creative/spectator)
  const hudPlayerState = useMemo(() => {
    if (!showBars) {
      return {
        ...playerState,
        health: 0,
        maxHealth: 0,
        hunger: 0,
        armorPoints: 0,
        level: 0,
        experience: 0,
        airSupply: playerState.maxAirSupply,
      };
    }
    return playerState;
  }, [playerState, showBars]);

  // ---------------------------------------------------------------------------
  // Loading Screen
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div
        className={styles.loadingScreen}
        style={{
          opacity: loadingFading ? 0 : 1,
          transition: 'opacity 0.4s ease-in',
        }}
      >
        {/* World name */}
        <div className={styles.loadingText}>
          {config.name}
        </div>

        {/* Loading bar */}
        <div className={styles.loadingBar}>
          <div
            className={styles.loadingBarFill}
            style={{ width: `${loadingProgress}%` }}
          />
        </div>

        {/* Stage text */}
        <div
          className="font-pixel text-xs text-white/70"
          style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
        >
          {getLoadingStage(loadingProgress)}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Game View
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none" style={{ cursor: pauseOpen || inventoryOpen || chatOpen ? 'default' : 'crosshair' }}>
      {/* Night sky background with gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0a1a 0%, #111122 40%, #1a1a2e 70%, #0d1117 100%)',
        }}
      />
      <StarField />

      {/* HUD — always visible behind overlays */}
      {!pauseOpen && !inventoryOpen && (
        <HUD
          playerState={hudPlayerState}
          inventory={hudInventory as InventorySlot[]}
          selectedSlot={selectedSlot}
          onSlotSelect={handleSlotSelect}
        />
      )}

      {/* Control Hints */}
      <ControlHints visible={showControlHints && !pauseOpen && !inventoryOpen} />

      {/* Debug Screen */}
      {debugOpen && (
        <DebugScreen
          position={playerState.position}
          seed={config.seed}
          fps={fps}
          dayCount={dayCount}
          mode={config.mode}
          difficulty={config.difficulty}
        />
      )}

      {/* Chat */}
      <ChatOverlay
        messages={chatMessages}
        chatOpen={chatOpen}
        chatInput={chatInput}
        onChatInputChange={setChatInput}
        onSend={handleChatSend}
        onClose={handleChatClose}
      />

      {/* Pause Menu */}
      {pauseOpen && (
        <PauseMenu
          onResume={handleResume}
          onQuit={handleQuit}
          seed={config.seed}
          playerPosition={playerState.position}
          dayCount={dayCount}
          showCoordinates={true}
        />
      )}

      {/* Inventory Screen */}
      {inventoryOpen && (
        <InventoryScreen
          mainInventory={playerState.inventory.main}
          hotbar={playerState.inventory.hotbar}
          armor={playerState.inventory.armor}
          offhand={playerState.inventory.offhand}
          onClose={handleCloseInventory}
          onMoveItem={handleMoveItem}
          onCraftItem={handleCraftItem}
        />
      )}

      {/* Bottom version bar */}
      <div className="absolute bottom-1 right-2 z-10 pointer-events-none">
        <span className="font-pixel text-[9px] text-white/20">
          Minecraft: Switch Edition (Web) v0.1.0-alpha
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export (wraps in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function MinecraftPlayPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingScreen}>
          <div className={styles.loadingText}>Loading...</div>
        </div>
      }
    >
      <GamePlayContent />
    </Suspense>
  );
}
