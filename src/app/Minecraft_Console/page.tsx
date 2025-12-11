"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { collection, query, orderBy, getDocs, setDoc, doc } from "firebase/firestore";
import { VoxelEngine, BlockType } from "@/lib/VoxelEngine";
import styles from "@/styles/Home.module.css";

const BLOCK_SIZE = 10;
const COLORS: Record<string, string> = {
  grass: '#567d46', dirt: '#5d4037', stone: '#757575',
  wood: '#4e342e', brick: '#8d6e63', leaves: '#2e7d32',
  water: '#40a4df', obsidian: '#1a1a1a'
};
const HOTBAR_ITEMS: BlockType[] = ['grass', 'dirt', 'stone', 'wood', 'brick', 'leaves', 'water', 'obsidian'];

const SPLASHES = [
  "What DOES the fox say?", "Also try Terraria!", "Creeper? Aww man!",
  "Now with 100% more voxels!", "Web Edition!", "Made by AI!",
  "Don't dig straight down!", "Blocks everywhere!"
];

const TIPS = [
  "Make some torches to light up areas at night.", "Obsidian needs a diamond pickaxe.",
  "Press 'E' to view inventory.", "Don't dig straight down!",
  "Water and lava are dangerous.", "Crops grow faster near water.",
  "Wolves can be tamed with bones.", "Shift-click to move items quickly."
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'title' | 'worlds' | 'game' | 'loading'>('title');
  const [worlds, setWorlds] = useState<any[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [modalCreate, setModalCreate] = useState(false);
  const [newWorldName, setNewWorldName] = useState("New World");
  const [splashText, setSplashText] = useState("");
  
  // Loading State
  const [loadingStatus, setLoadingStatus] = useState("Initializing server");
  const [loadingSub, setLoadingSub] = useState("Loading spawn area...");
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState("");

  // Game State
  const [showPreGame, setShowPreGame] = useState(false);
  const [paused, setPaused] = useState(false);
  const [coords, setCoords] = useState("0, 0, 0");
  const [selectedSlot, setSelectedSlot] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);

  useEffect(() => {
    setSplashText(SPLASHES[Math.floor(Math.random() * SPLASHES.length)]);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth);
    });
    return () => unsub();
  }, []);

  const startLoadingSequence = (callback: () => void) => {
    setView('loading');
    setProgress(0);
    setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    setLoadingStatus("Initializing server");
    setLoadingSub("Connecting to database...");

    setTimeout(() => { setProgress(20); setLoadingSub("Finding Seed for the World Generator..."); }, 500);
    setTimeout(() => { setProgress(50); setLoadingStatus("Generating World"); setLoadingSub("Building terrain..."); }, 1500);
    setTimeout(() => { setProgress(80); setLoadingSub("Spawning entities..."); }, 3000);
    setTimeout(() => { setProgress(100); setLoadingStatus("Loading"); setLoadingSub("Finalizing..."); }, 4500);
    
    setTimeout(() => { callback(); }, 5000);
  };

  const fetchWorlds = async () => {
    if (!user) return;
    const path = `artifacts/${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}/users/${user.uid}/worlds`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setWorlds(list);
    setView('worlds');
  };

  const createWorld = async () => {
    if (!user || !newWorldName.trim()) return;
    setModalCreate(false);
    
    startLoadingSequence(async () => {
        try {
            const newId = `world_${Date.now()}`;
            const basePath = `artifacts/${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}/users/${user.uid}/worlds`;
            await setDoc(doc(db, basePath, newId), { name: newWorldName, createdBy: user.uid, createdAt: Date.now() });

            const promises = [];
            for(let x=-8; x<8; x++){
                for(let z=-8; z<8; z++){
                    const bid = `${x}_0_${z}`;
                    promises.push(setDoc(doc(db, `${basePath}/${newId}/blocks`, bid), { x: x*BLOCK_SIZE, y: -BLOCK_SIZE, z: z*BLOCK_SIZE, type: 'grass' }));
                }
            }
            loadGame(newId, true); 
        } catch (e: any) {
            alert("Error: " + e.message);
            setView('worlds');
        }
    });
  };

  const loadGame = (worldId: string, skipLoading = false) => {
    if (!user) return;
    const initEngine = () => {
        if (engineRef.current) engineRef.current.dispose();
        const worldPath = `artifacts/${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}/users/${user.uid}/worlds/${worldId}`;
        if (containerRef.current) {
            engineRef.current = new VoxelEngine(containerRef.current, worldPath, (x, y, z) => { setCoords(`${x}, ${y}, ${z}`); });
            (window as any).__SELECTED_BLOCK__ = HOTBAR_ITEMS[selectedSlot];
            setView('game');
            setShowPreGame(true);
            setPaused(false);
        }
    };
    if (skipLoading) initEngine(); else startLoadingSequence(initEngine);
  };

  const enterWorld = () => {
    setShowPreGame(false);
    if (engineRef.current) { engineRef.current.isRunning = true; document.body.requestPointerLock(); }
  };

  const quitGame = () => {
    if (engineRef.current) { engineRef.current.dispose(); engineRef.current = null; }
    document.exitPointerLock();
    setView('title');
  };

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

  useEffect(() => { (window as any).__SELECTED_BLOCK__ = HOTBAR_ITEMS[selectedSlot]; }, [selectedSlot]);

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
    <main className={styles.fullScreen}>
      <div ref={containerRef} className={styles.fullScreen} style={{ zIndex: 0 }} />

      {/* --- TITLE SCREEN (RESTORED CONSOLE LOOK) --- */}
      {view === 'title' && (
        <div className={`${styles.fullScreen} ${styles.flexCenter} ${styles.bgPanorama}`}>
          
          <div className={styles.logoContainer}>
            <h1 className={styles.gameLogo}>MINECRAFT</h1>
            <div className={styles.gameSubtitle}>WEB EDITION</div>
            <div className={styles.splashText}>{splashText}</div>
          </div>

          <div className={styles.menuContainer}>
            <button disabled={!user} onClick={fetchWorlds} className={styles.consoleBtn}>Play Game</button>
            <button className={styles.consoleBtn} disabled>Mini Games</button>
            <button className={styles.consoleBtn} disabled>Leaderboards</button>
            <button className={styles.consoleBtn} disabled>Help & Options</button>
            <button className={styles.consoleBtn} disabled>Minecraft Store</button>
          </div>

          <div className={styles.bottomHint}>
            <div className={styles.xButton}>
              <span className={styles.xMark}>✕</span>
            </div>
            <span>Select</span>
          </div>
        </div>
      )}

      {/* --- LOADING (CONSOLE LOOK) --- */}
      {view === 'loading' && (
        <div className={`${styles.fullScreen} ${styles.loadingScreen}`}>
          <div className={styles.loadingOverlay}>
            <h1 className={styles.loadingLogo}>MINECRAFT</h1>
            <div className={styles.loadingCenter}>
                <div className={styles.loadingStatus}>{loadingStatus}</div>
                <div className={styles.loadingSubText}>{loadingSub}</div>
                <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                </div>
            </div>
            <div className={styles.tipBox}>{currentTip}</div>
          </div>
        </div>
      )}

      {/* --- WORLD SELECT --- */}
      {view === 'worlds' && (
        <div className={`${styles.fullScreen} ${styles.flexCenter} ${styles.bgPanorama}`}>
          <h1 className={styles.heading} style={{fontSize: '4rem', color:'#fff'}}>SELECT WORLD</h1>
          <div className={styles.listContainer}>
            {worlds.length === 0 && <div style={{textAlign:'center', marginTop: 100, color:'#888'}}>No worlds found.</div>}
            {worlds.map(w => (
              <div key={w.id} 
                   onClick={() => setSelectedWorldId(w.id)}
                   className={`${styles.worldRow} ${selectedWorldId === w.id ? styles.worldRowSelected : ''}`}>
                <span>{w.name}</span>
                <span>{new Date(w.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
          <div className={styles.row}>
            <button onClick={() => setModalCreate(true)} className={styles.consoleBtn} style={{width:'200px'}}>Create New</button>
            <button disabled={!selectedWorldId} onClick={() => loadGame(selectedWorldId!)} className={styles.consoleBtn} style={{width:'200px'}}>Load</button>
          </div>
          <button onClick={() => setView('title')} className={styles.consoleBtn} style={{width:'200px', marginTop:20, backgroundColor:'#8b0000'}}>Back</button>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {modalCreate && (
        <div className={`${styles.fullScreen} ${styles.flexCenter} ${styles.bgOverlay}`}>
          <div className={styles.modalBox}>
            <h2 style={{fontSize: '2rem', marginBottom: '1rem'}}>NAME YOUR WORLD</h2>
            <input value={newWorldName} onChange={(e) => setNewWorldName(e.target.value)} className={styles.input} />
            <div className={styles.row}>
              <button onClick={createWorld} className={styles.consoleBtn} style={{width:'150px', background:'#4CAF50'}}>Create</button>
              <button onClick={() => setModalCreate(false)} className={styles.consoleBtn} style={{width:'150px', background:'#d32f2f'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRE-GAME --- */}
      {view === 'game' && showPreGame && (
        <div className={`${styles.fullScreen} ${styles.flexCenter} ${styles.bgOverlay}`}>
          <h1 style={{fontFamily: 'var(--font-pixel)', fontSize: '4rem', color: '#4CAF50', marginBottom: '1rem', textShadow: '2px 2px 0 #000'}}>WORLD READY!</h1>
          <p style={{color: '#ddd', marginBottom: '30px', fontFamily: 'monospace'}}>Press the button below to capture mouse control.</p>
          <button onClick={enterWorld} className={styles.consoleBtn} style={{width: '300px', padding: '20px'}}>ENTER WORLD</button>
          <button onClick={quitGame} className={styles.consoleBtn} style={{width: '300px', marginTop: '10px', backgroundColor: '#d32f2f'}}>EXIT</button>
        </div>
      )}

      {/* --- PAUSE MENU --- */}
      {view === 'game' && paused && !showPreGame && (
        <div className={`${styles.fullScreen} ${styles.flexCenter} ${styles.bgOverlay}`}>
          <h1 style={{fontFamily: 'var(--font-pixel)', fontSize: '4rem', marginBottom: '2rem', textShadow: '2px 2px 0 #000'}}>GAME PAUSED</h1>
          <div className={styles.menuContainer}>
            <button onClick={() => document.body.requestPointerLock()} className={styles.consoleBtn}>Resume Game</button>
            <button disabled className={styles.consoleBtn}>Options</button>
            <button onClick={quitGame} className={styles.consoleBtn} style={{backgroundColor: '#d32f2f'}}>Save & Quit</button>
          </div>
        </div>
      )}

      {/* --- HUD --- */}
      {view === 'game' && !showPreGame && (
        <div className={`${styles.fullScreen} ${styles.hudLayer}`}>
          <div className={styles.crosshair}></div>
          <div className={styles.coords}>{coords}</div>
          <div className={styles.hotbar}>
            {HOTBAR_ITEMS.map((item, idx) => (
              <div key={item} 
                   onClick={() => setSelectedSlot(idx)}
                   className={`${styles.slot} ${selectedSlot === idx ? styles.slotActive : ''}`}
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