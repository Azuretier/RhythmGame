"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { collection, query, orderBy, getDocs, setDoc, doc } from "firebase/firestore";
import { VoxelEngine, BlockType } from "@/lib/VoxelEngine";
import PanoramaBackground from "@/components/PanoramaBackground";
import styles from "@/styles/Home.module.css";

const BLOCK_SIZE = 10;
const COLORS: Record<string, string> = {
  grass: '#567d46', dirt: '#5d4037', stone: '#757575',
  wood: '#4e342e', brick: '#8d6e63', leaves: '#2e7d32',
  water: '#40a4df', obsidian: '#1a1a1a'
};
const HOTBAR_ITEMS: BlockType[] = ['grass', 'dirt', 'stone', 'wood', 'brick', 'leaves', 'water', 'obsidian'];

const FIXED_SPLASH = "Music by C418!";
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
  
  // Loading
  const [loadingStatus, setLoadingStatus] = useState("Initializing server");
  const [loadingSub, setLoadingSub] = useState("Loading spawn area...");
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState("");

  // Game & Settings
  const [showPreGame, setShowPreGame] = useState(false);
  const [paused, setPaused] = useState(false);
  const [coords, setCoords] = useState("0, 0, 0");
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [sensitivity, setSensitivity] = useState(20);
  
  // Nested Menu State: 'main' or 'options'
  const [pauseMenuState, setPauseMenuState] = useState<'main' | 'options'>('main');

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth);
    });
    return () => unsub();
  }, []);

  // Update Sensitivity Live
  useEffect(() => {
    if (engineRef.current) {
        engineRef.current.setSensitivity(sensitivity / 10000);
    }
  }, [sensitivity]);

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
            // Initialize sensitivity
            engineRef.current.setSensitivity(sensitivity / 10000);
            setView('game');
            setShowPreGame(true);
            setPaused(false);
            setPauseMenuState('main'); // Reset menu
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
          setPauseMenuState('main'); // Always reset to main menu on pause
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
      <div className={(view === 'title' || view === 'worlds' || view === 'loading') ? '' : styles.hidden}>
        <PanoramaBackground /> 
        <div className={styles.vignette}></div>
      </div>

      <div ref={containerRef} className={styles.fullScreen} style={{ zIndex: 0 }} />

      {/* --- TITLE SCREEN --- */}
      {view === 'title' && (
        <div className={styles.fullScreen}>
          <div className={styles.menuLayer}>
            <div className={styles.logoContainer}>
              <h1 className={styles.logoMain}>MINECRAFT</h1>
              <div className={styles.logoSub}>NINTENDO SWITCH EDITION</div>
              <div className={styles.splashText}>{FIXED_SPLASH}</div>
            </div>
            <div className={styles.menuContainer}>
              <button disabled={!user} onClick={fetchWorlds} className={styles.switchBtn}>Play Game</button>
              <button className={styles.switchBtn}>Mini Games</button>
              <button className={styles.switchBtn}>Achievements</button>
              <button className={styles.switchBtn}>Help & Options</button>
              <button className={styles.switchBtn}>Minecraft Store</button>
              <button className={`${styles.switchBtn} ${styles.downloadBtn}`}>
                  Download the latest version of Minecraft<br/>for FREE!
              </button>
            </div>
            <div className={styles.footerBar}>
              <div className={styles.footerItem}>
                <div className={styles.btnIcon} style={{background:'#444', color:'#fff'}}>A</div>
                <span>Select</span>
              </div>
              <div className={styles.footerItem}>
                <div className={styles.btnIcon} style={{background:'#444', color:'#fff'}}>Y</div>
                <span>Change Network Mode</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LOADING --- */}
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
        <div className={styles.fullScreen}>
          <div className={styles.menuLayer}>
            <h1 className={styles.logoMain} style={{fontSize: '4rem', marginTop: 20}}>SELECT WORLD</h1>
            <div className={styles.listContainer}>
              {worlds.length === 0 && <div style={{textAlign:'center', marginTop: 100, color:'#888', fontFamily: 'var(--font-pixel)', fontSize: '1.5rem'}}>No worlds created yet.</div>}
              {worlds.map(w => (
                <div key={w.id} 
                    onClick={() => setSelectedWorldId(w.id)}
                    className={`${styles.worldRow} ${selectedWorldId === w.id ? styles.worldRowSelected : ''}`}>
                  <span>{w.name}</span>
                  <span style={{fontSize: '0.8rem', color:'#aaa'}}>{new Date(w.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
            <div className={styles.row}>
              <button onClick={() => setModalCreate(true)} className={styles.switchBtn} style={{width:'200px'}}>Create New</button>
              <button disabled={!selectedWorldId} onClick={() => loadGame(selectedWorldId!)} className={styles.switchBtn} style={{width:'200px'}}>Load</button>
            </div>
            <button onClick={() => setView('title')} className={styles.switchBtn} style={{width:'200px', marginTop:20}}>Back</button>
          </div>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {modalCreate && (
        <div className={`${styles.fullScreen} ${styles.flexCenter} ${styles.bgOverlay}`}>
          <div className={styles.modalBox}>
            <h2 style={{fontSize: '2rem', marginBottom: '1rem'}}>NAME YOUR WORLD</h2>
            <input value={newWorldName} onChange={(e) => setNewWorldName(e.target.value)} className={styles.input} />
            <div className={styles.row}>
              <button onClick={createWorld} className={styles.switchBtn} style={{width:'150px'}}>Create</button>
              <button onClick={() => setModalCreate(false)} className={styles.switchBtn} style={{width:'150px'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRE-GAME --- */}
      {view === 'game' && showPreGame && (
        <div className={`${styles.fullScreen} ${styles.flexCenter} ${styles.bgOverlay}`}>
          <h1 style={{fontFamily: 'var(--font-pixel)', fontSize: '4rem', color: '#4CAF50', marginBottom: '1rem', textShadow: '2px 2px 0 #000'}}>WORLD READY!</h1>
          <p style={{color: '#ddd', marginBottom: '30px', fontFamily: 'monospace'}}>Press A to Start</p>
          <button onClick={enterWorld} className={styles.switchBtn} style={{width: '300px'}}>START GAME</button>
          <button onClick={quitGame} className={styles.switchBtn} style={{width: '300px', marginTop: '10px'}}>EXIT</button>
        </div>
      )}

      {/* --- PAUSE MENU (LAYERED) --- */}
      {view === 'game' && paused && !showPreGame && (
        <div className={`${styles.fullScreen} ${styles.flexCenter} ${styles.bgOverlay}`}>
          
          <h1 style={{fontFamily: 'var(--font-pixel)', fontSize: '4rem', marginBottom: '1rem', textShadow: '2px 2px 0 #000'}}>
            {pauseMenuState === 'main' ? 'GAME PAUSED' : 'OPTIONS'}
          </h1>

          <div className={styles.menuContainer}>
            
            {/* LAYER 1: MAIN MENU */}
            {pauseMenuState === 'main' && (
                <>
                    <button onClick={() => document.body.requestPointerLock()} className={styles.switchBtn}>Resume Game</button>
                    <button onClick={() => setPauseMenuState('options')} className={styles.switchBtn}>Options</button>
                    <button onClick={quitGame} className={styles.switchBtn}>Save & Quit</button>
                </>
            )}

            {/* LAYER 2: OPTIONS MENU */}
            {pauseMenuState === 'options' && (
                <>
                    {/* CUSTOM MINECRAFT STYLE SLIDER */}
                    <div className={styles.sliderContainer}>
                        <input type="range" min="1" max="200" value={sensitivity} 
                            onChange={(e) => setSensitivity(parseInt(e.target.value))} 
                            className={styles.sliderInput} />
                        <div className={styles.sliderLabel}>Sensitivity: {sensitivity}%</div>
                    </div>

                    <button onClick={() => setPauseMenuState('main')} className={styles.switchBtn}>Back</button>
                </>
            )}

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
              />
            ))}
          </div>
        </div>
      )}

    </main>
  );
}