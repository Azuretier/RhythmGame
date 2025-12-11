"use client"

import dynamic from 'next/dynamic';
import Head from 'next/head';
// Import the CSS module
import '@/styles/VoxelWorld.module.css';

// Dynamically import the VoxelWorld component with SSR disabled.
// This is CRITICAL for Three.js/browser-specific code.
const DynamicVoxelWorld = dynamic(() => import('@/components/VoxelWorld'), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <Head>
        <title>Voxel World (Next.js/TS)</title>
      </Head>
      <div style={{ height: '100vh', width: '100vw', margin: 0, overflow: 'hidden', backgroundColor: '#87CEEB', userSelect: 'none' }}>
        <DynamicVoxelWorld />
      </div>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { collection, query, orderBy, getDocs, setDoc, doc } from "firebase/firestore";
import { VoxelEngine, BlockType } from "@/lib/VoxelEngine";

const BLOCK_SIZE = 10;
const COLORS: Record<string, string> = {
  grass: '#567d46', dirt: '#5d4037', stone: '#757575',
  wood: '#4e342e', brick: '#8d6e63', leaves: '#2e7d32',
  water: '#40a4df', obsidian: '#1a1a1a'
};
const HOTBAR_ITEMS: BlockType[] = ['grass', 'dirt', 'stone', 'wood', 'brick', 'leaves', 'water', 'obsidian'];

export default function Home() {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'title' | 'worlds' | 'game' | 'loading'>('title');
  const [worlds, setWorlds] = useState<any[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Initializing...");
  const [modalCreate, setModalCreate] = useState(false);
  const [newWorldName, setNewWorldName] = useState("New World");
  
  // Game HUD
  const [showPreGame, setShowPreGame] = useState(false);
  const [paused, setPaused] = useState(false);
  const [coords, setCoords] = useState("0, 0, 0");
  const [selectedSlot, setSelectedSlot] = useState(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);

  // 1. Auth Setup
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth);
    });
    return () => unsub();
  }, []);

  // 2. Fetch Worlds
  const fetchWorlds = async () => {
    if (!user) return;
    setLoadingMsg("Fetching Worlds...");
    setView('loading');
    
    const path = `artifacts/${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}/users/${user.uid}/worlds`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setWorlds(list);
    setView('worlds');
  };

  // 3. Create World
  const createWorld = async () => {
    if (!user || !newWorldName.trim()) return;
    setModalCreate(false);
    setLoadingMsg("Generating Terrain...");
    setView('loading');

    try {
      const newId = `world_${Date.now()}`;
      const basePath = `artifacts/${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}/users/${user.uid}/worlds`;
      
      // Meta
      await setDoc(doc(db, basePath, newId), {
        name: newWorldName, createdBy: user.uid, createdAt: Date.now()
      });

      // Generate Floor
      const promises = [];
      for(let x=-8; x<8; x++){
        for(let z=-8; z<8; z++){
          const bid = `${x}_0_${z}`;
          promises.push(setDoc(doc(db, `${basePath}/${newId}/blocks`, bid), {
            x: x*BLOCK_SIZE, y: -BLOCK_SIZE, z: z*BLOCK_SIZE, type: 'grass'
          }));
        }
      }
      
      // Start Game
      loadGame(newId);
    } catch (e: any) {
      alert("Error: " + e.message);
      setView('worlds');
    }
  };

  // 4. Load Game Engine
  const loadGame = (worldId: string) => {
    if (!user) return;
    setLoadingMsg("Entering Dimension...");
    setView('loading');
    
    setTimeout(() => {
      if (engineRef.current) engineRef.current.dispose();
      
      const worldPath = `artifacts/${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}/users/${user.uid}/worlds/${worldId}`;
      
      if (containerRef.current) {
        engineRef.current = new VoxelEngine(containerRef.current, worldPath, (x, y, z) => {
          setCoords(`${x}, ${y}, ${z}`);
        });
        
        // Setup React <-> Engine bridge
        (window as any).__SELECTED_BLOCK__ = HOTBAR_ITEMS[selectedSlot];
        
        setView('game');
        setShowPreGame(true);
        setPaused(false);
      }
    }, 500);
  };

  // 5. Game Controls
  const enterWorld = () => {
    setShowPreGame(false);
    if (engineRef.current) {
      engineRef.current.isRunning = true;
      document.body.requestPointerLock();
    }
  };

  const quitGame = () => {
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    document.exitPointerLock();
    setView('title');
  };

  // Handle Pointer Lock Events
  useEffect(() => {
    const handleLock = () => {
      if (document.pointerLockElement === document.body) {
        setPaused(false);
        if (engineRef.current) engineRef.current.isPaused = false;
      } else {
        if (view === 'game' && !showPreGame) {
          setPaused(true);
          if (engineRef.current) engineRef.current.isPaused = true;
        }
      }
    };
    document.addEventListener('pointerlockchange', handleLock);
    return () => document.removeEventListener('pointerlockchange', handleLock);
  }, [view, showPreGame]);

  // Handle Block Select
  useEffect(() => {
    (window as any).__SELECTED_BLOCK__ = HOTBAR_ITEMS[selectedSlot];
  }, [selectedSlot]);

  // Handle Hotkey Numbers
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if(e.code.startsWith("Digit")) {
        const idx = parseInt(e.key) - 1;
        if(idx >= 0 && idx < HOTBAR_ITEMS.length) setSelectedSlot(idx);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);


  return (
    <main className="w-screen h-screen overflow-hidden bg-black text-white font-sans select-none relative">
      
      {/* 3D CONTAINER */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* --- TITLE SCREEN --- */}
      {view === 'title' && (
        <div className="full-screen flex-center bg-dirt z-50">
          <h1 className="text-8xl font-vt323 mb-4 text-white drop-shadow-md">VOXEL VERSE</h1>
          <p className="text-yellow-400 mb-8 font-mono">{user ? `Connected: ${user.uid.substring(0,5)}` : 'Connecting...'}</p>
          <button disabled={!user} onClick={fetchWorlds} className="game-btn btn-primary">PLAY GAME</button>
        </div>
      )}

      {/* --- LOADING --- */}
      {view === 'loading' && (
        <div className="full-screen flex-center bg-black/90 z-[100]">
          <div className="spinner"></div>
          <h2 className="text-3xl font-vt323">{loadingMsg}</h2>
        </div>
      )}

      {/* --- WORLD SELECT --- */}
      {view === 'worlds' && (
        <div className="full-screen flex-center bg-dirt z-50">
          <h1 className="text-6xl font-vt323 mb-4">SELECT WORLD</h1>
          <div className="w-[600px] h-[300px] bg-black/60 border-2 border-gray-500 overflow-y-auto p-2 mb-4">
            {worlds.length === 0 && <div className="text-center mt-20 text-gray-400">No worlds found.</div>}
            {worlds.map(w => (
              <div key={w.id} 
                   onClick={() => setSelectedWorldId(w.id)}
                   className={`world-row ${selectedWorldId === w.id ? 'selected' : ''}`}>
                <span className="font-bold">{w.name}</span>
                <span className="text-xs text-gray-400">{new Date(w.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <button onClick={() => setModalCreate(true)} className="game-btn btn-primary">CREATE NEW</button>
            <button disabled={!selectedWorldId} onClick={() => loadGame(selectedWorldId!)} className="game-btn">LOAD SELECTED</button>
          </div>
          <button onClick={() => setView('title')} className="game-btn btn-danger mt-4">BACK</button>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {modalCreate && (
        <div className="full-screen flex-center bg-black/80 z-[60] backdrop-blur-sm">
          <div className="modal-box">
            <h2 className="text-4xl font-vt323 mb-4">NAME WORLD</h2>
            <input 
              value={newWorldName}
              onChange={(e) => setNewWorldName(e.target.value)}
              className="w-full bg-gray-800 border-2 border-gray-500 p-2 text-center text-xl font-mono mb-4 text-white focus:border-green-500 outline-none"
            />
            <div className="flex justify-center gap-2">
              <button onClick={createWorld} className="game-btn btn-primary w-32">CREATE</button>
              <button onClick={() => setModalCreate(false)} className="game-btn btn-danger w-32">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRE-GAME --- */}
      {view === 'game' && showPreGame && (
        <div className="full-screen flex-center bg-black/80 z-[60] backdrop-blur-md">
          <h1 className="text-6xl font-vt323 text-green-500 mb-4">WORLD READY!</h1>
          <p className="text-gray-400 mb-8">Click button below to capture mouse.</p>
          <button onClick={enterWorld} className="game-btn btn-primary text-4xl h-20 w-96">ENTER WORLD</button>
          <button onClick={quitGame} className="game-btn btn-danger mt-4">ABORT</button>
        </div>
      )}

      {/* --- PAUSE MENU --- */}
      {view === 'game' && paused && !showPreGame && (
        <div className="full-screen flex-center bg-black/80 z-[60] backdrop-blur-sm">
          <h1 className="text-6xl font-vt323 mb-8">PAUSED</h1>
          <button onClick={() => document.body.requestPointerLock()} className="game-btn btn-primary">RESUME</button>
          <button onClick={quitGame} className="game-btn btn-danger">SAVE & QUIT</button>
        </div>
      )}

      {/* --- HUD --- */}
      {view === 'game' && !showPreGame && (
        <div className="full-screen pointer-events-none z-10">
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white -translate-x-1/2 -translate-y-1/2 shadow-sm"></div>
          
          <div className="absolute top-2 right-2 bg-black/50 p-2 rounded font-mono text-xs text-gray-200">
            {coords}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded pointer-events-auto">
            {HOTBAR_ITEMS.map((item, idx) => (
              <div key={item} 
                   onClick={() => setSelectedSlot(idx)}
                   className={`slot w-12 h-12 border-4 ${selectedSlot === idx ? 'border-white scale-110' : 'border-gray-600'}`}
                   style={{ backgroundColor: COLORS[item] }}
                   title={item}
              />
            ))}
          </div>
        </div>
      )}

    </main>
  );
}