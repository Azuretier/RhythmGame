// components/VoxelWorld.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, User,
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection,
} from 'firebase/firestore';

// --- TYPE DEFINITIONS ---
interface BlockType {
  id: string;
  name: string;
  color: number;
}

interface HotbarState {
  [key: number]: string;
}

// --- GAME CONSTANTS ---
const WORLD_SIZE = 32;
const BLOCK_SIZE = 10;
const PLAYER_HEIGHT = 18;
const PLAYER_WIDTH = 3;

// Physics
const SPEED = 150;
const JUMP_FORCE = 150;
const GRAVITY = 500;
const AIR_DAMPING = 2.0;
const GROUND_DAMPING = 8.0;

// Block Definitions
const BLOCK_TYPES: BlockType[] = [
  { id: 'grass', name: 'Grass', color: 0x567d46 },
  { id: 'dirt', name: 'Dirt', color: 0x5d4037 },
  { id: 'stone', name: 'Stone', color: 0x757575 },
  { id: 'wood', name: 'Wood', color: 0x4e342e },
  { id: 'brick', name: 'Brick', color: 0x8d6e63 },
  { id: 'leaves', name: 'Leaves', color: 0x2e7d32 },
  { id: 'sand', name: 'Sand', color: 0xc2b280 },
  { id: 'water', name: 'Water', color: 0x40a4df },
  { id: 'gold', name: 'Gold', color: 0xffd700 },
  { id: 'obsidian', name: 'Obsidian', color: 0x1a1a1a },
];

// Materials Map
const MATERIALS: { [key: string]: THREE.MeshLambertMaterial } = {};
BLOCK_TYPES.forEach(b => {
  MATERIALS[b.id] = new THREE.MeshLambertMaterial({
    color: b.color,
    transparent: b.id === 'water' || b.id === 'leaves',
    opacity: b.id === 'water' ? 0.6 : 1.0,
  });
});

// Initial Hotbar State
const INITIAL_HOTBAR: HotbarState = {
  0: 'grass', 1: 'dirt', 2: 'stone', 3: 'wood', 4: 'brick',
};

// --- REACT COMPONENT ---

const VoxelWorld: React.FC = () => {
  // --- STATE ---
  const [userId, setUserId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState('Initializing Server...');
  const [isGameActive, setIsGameActive] = useState(false);
  const [activeModal, setActiveModal] = useState<null | 'settings' | 'inventory'>(null);
  const [sensitivity, setSensitivity] = useState(parseFloat(localStorage.getItem('voxelSensitivity') || '20'));
  const [currentHotbarIndex, setCurrentHotbarIndex] = useState(0);
  const [hotbarState, setHotbarState] = useState<HotbarState>(INITIAL_HOTBAR);
  const [playerCount, setPlayerCount] = useState(0);

  // --- REFS (for Three.js mutable objects) ---
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);

  // Game state
  const objectsRef = useRef<THREE.Mesh[]>([]);
  const blockMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const velocityRef = useRef(new THREE.Vector3());
  const onGroundRef = useRef(false);
  const moveStateRef = useRef({ forward: false, backward: false, left: false, right: false });

  // Firebase/DB refs
  const dbRef = useRef<any>(null); // Use 'any' for quick Firebase compatibility

  // --- UI GENERATORS (Memoized with useCallback) ---

  // Hotbar UI is managed by React state, no direct DOM generation is needed.
  
  const generateInventoryUI = useCallback(() => (
    <div id="inventory-grid">
      {BLOCK_TYPES.map(block => (
        <div
          key={block.id}
          className="inv-item"
          style={{ backgroundColor: `#${block.color.toString(16).padStart(6, '0')}` }}
          onClick={() => assignBlockToHotbar(block.id)}
        >
          <div className="inv-item-label">{block.name}</div>
        </div>
      ))}
    </div>
  ), []); // Dependencies are empty as BLOCK_TYPES is constant

  // --- INVENTORY LOGIC ---

  const assignBlockToHotbar = (blockId: string) => {
    setHotbarState(prev => ({ ...prev, [currentHotbarIndex]: blockId }));
  };

  const selectHotbarSlot = (index: number) => {
    setCurrentHotbarIndex(index);
  };

  const toggleModal = useCallback((type: 'settings' | 'inventory') => {
    setActiveModal(prev => {
      const isCurrentlyOpen = prev === type;
      if (isCurrentlyOpen) {
        document.body.requestPointerLock();
        return null;
      } else {
        document.exitPointerLock();
        return type;
      }
    });
  }, []);

  // --- FIREBASE & INITIALIZATION ---

  useEffect(() => {
    if (typeof window === 'undefined') return; // Ensure this runs client-side

    const setupFirebase = async () => {
      try {
        // These are expected to be injected environment variables or global variables
        // In a real Next.js app, you'd load these from process.env or a client-side config file
        const firebaseConfig = JSON.parse(
          (window as any).__firebase_config || '{}',
        );
        const initialAuthToken = (window as any).__initial_auth_token || null;
        const appId = (window as any).__app_id || 'default-app-id';

        if (!Object.keys(firebaseConfig).length) {
            console.error("Firebase config is missing.");
            setAuthStatus("Firebase Config Error.");
            return;
        }

        const app = initializeApp(firebaseConfig);
        dbRef.current = getFirestore(app);
        const auth = getAuth(app);
        
        onAuthStateChanged(auth, async (user: User | null) => {
          if (user) {
            setUserId(user.uid);
            setAuthStatus('Server Ready.');
            // Initial sync/setup can happen here
            setupWorldListener(appId, dbRef.current, blockMapRef, objectsRef, sceneRef);
            setupPlayersListener(appId, dbRef.current, setPlayerCount);
          } else {
            if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
            else await signInAnonymously(auth);
          }
        });
      } catch (e) {
        console.error('Firebase setup failed:', e);
        setAuthStatus('Authentication Error.');
      }
    };

    setupFirebase();

    // The rest of init() is also moved here to run after mount
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 20, 750);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 100, 0);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0x606060));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(100, 200, 50);
    scene.add(sun);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current?.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    raycasterRef.current = new THREE.Raycaster();

    // Event listeners that depend on the browser/DOM/Three.js being ready
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    const handlePointerLockChange = () => {
      if (document.pointerLockElement === document.body) {
        setIsGameActive(true);
        setActiveModal(null);
      } else {
        setIsGameActive(false);
        // If not locked and no other modal is active, show the blocker/start screen
        setActiveModal(prev => prev || null);
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []); // Empty dependency array means run once on mount

  // --- INPUT HANDLING ---

  const onKey = useCallback((event: KeyboardEvent, isDown: boolean) => {
    switch (event.code) {
      case 'KeyW': moveStateRef.current.forward = isDown; break;
      case 'KeyS': moveStateRef.current.backward = isDown; break;
      case 'KeyA': moveStateRef.current.left = isDown; break;
      case 'KeyD': moveStateRef.current.right = isDown; break;
      case 'Space':
        if (isDown && onGroundRef.current) {
          velocityRef.current.y = JUMP_FORCE;
          onGroundRef.current = false;
        }
        break;
    }
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code === 'KeyP') toggleModal('settings');
    if (event.code === 'KeyE') toggleModal('inventory');

    if (isGameActive) {
      onKey(event, true);
      if (event.code.startsWith('Digit')) {
        const idx = parseInt(event.key) - 1;
        if (idx >= 0 && idx < 5) selectHotbarSlot(idx);
      }
    } else if (event.code === 'Escape' && activeModal) {
      // Logic for closing modals on ESC is implicitly handled by pointerlock logic
      setActiveModal(null);
    }
  }, [isGameActive, onKey, toggleModal, activeModal]);

  const onMouseMove = useCallback((event: MouseEvent) => {
    if (!isGameActive || !cameraRef.current) return;
    const mouseSensitivityValue = sensitivity / 10000;
    
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(cameraRef.current.quaternion);
    euler.y -= event.movementX * mouseSensitivityValue;
    euler.x -= event.movementY * mouseSensitivityValue;
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
    cameraRef.current.quaternion.setFromEuler(euler);
  }, [isGameActive, sensitivity]);

  const onMouseClick = useCallback(async (event: MouseEvent) => {
    event.preventDefault(); // Prevent default right-click context menu
    if (!isGameActive || !raycasterRef.current || !cameraRef.current || !dbRef.current) return;

    raycasterRef.current.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(objectsRef.current);
    if (intersects.length === 0 || intersects[0].distance > 60) return;

    const intersect = intersects[0] as THREE.Intersection & { face: THREE.Face };
    const pos = intersect.object.position;
    const selectedMaterialId = hotbarState[currentHotbarIndex];

    const appId = (window as any).__app_id || 'default-app-id';

    if (event.button === 0) { // Break (Left Click)
      const docId = `${Math.round(pos.x / BLOCK_SIZE)}_${Math.round((pos.y - BLOCK_SIZE / 2) / BLOCK_SIZE)}_${Math.round(pos.z / BLOCK_SIZE)}`;
      if (pos.y > BLOCK_SIZE / 2) {
        await deleteDoc(doc(dbRef.current, `artifacts/${appId}/public/data/blocks`, docId));
      }
    } else if (event.button === 2) { // Place (Right Click)
      const n = intersect.face.normal;
      const px = pos.x + n.x * BLOCK_SIZE;
      const py = pos.y + n.y * BLOCK_SIZE;
      const pz = pos.z + n.z * BLOCK_SIZE;

      // Player self-collision check
      if (
        Math.abs(px - cameraRef.current.position.x) < PLAYER_WIDTH * 2
        && Math.abs(py - (cameraRef.current.position.y - PLAYER_HEIGHT / 2)) < PLAYER_HEIGHT
        && Math.abs(pz - cameraRef.current.position.z) < PLAYER_WIDTH * 2
      ) return;

      const docId = `${Math.round(px / BLOCK_SIZE)}_${Math.round((py - BLOCK_SIZE / 2) / BLOCK_SIZE)}_${Math.round(pz / BLOCK_SIZE)}`;
      await setDoc(doc(dbRef.current, `artifacts/${appId}/public/data/blocks`, docId), {
        x: px, y: py, z: pz, material: selectedMaterialId,
      });
    }
  }, [isGameActive, hotbarState, currentHotbarIndex]);

  // Use a second useEffect to attach/detach global listeners for the game loop
  useEffect(() => {
    if (typeof window === 'undefined') return;

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', (e) => onKey(e, false));
    document.body.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseClick);
    document.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', (e) => onKey(e, false));
      document.body.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseClick);
      document.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, [onKeyDown, onKey, onMouseMove, onMouseClick]);


  // --- GAME LOOP / ANIMATION ---

  useEffect(() => {
    let animationFrameId: number;
    let prevTime = performance.now();
    let lastSync = 0;

    const checkPlayerCollision = () => {
      if (!cameraRef.current) return false;
      const playerPos = cameraRef.current.position;

      const minX = playerPos.x - PLAYER_WIDTH;
      const maxX = playerPos.x + PLAYER_WIDTH;
      const minY = playerPos.y - PLAYER_HEIGHT;
      const maxY = playerPos.y;
      const minZ = playerPos.z - PLAYER_WIDTH;
      const maxZ = playerPos.z + PLAYER_WIDTH;

      const checkRadius = 20;

      for (let i = 0; i < objectsRef.current.length; i++) {
        const obj = objectsRef.current[i];
        if (Math.abs(obj.position.x - playerPos.x) > checkRadius) continue;
        if (Math.abs(obj.position.z - playerPos.z) > checkRadius) continue;
        if (Math.abs(obj.position.y - playerPos.y) > checkRadius) continue;

        const bMinX = obj.position.x - BLOCK_SIZE / 2;
        const bMaxX = obj.position.x + BLOCK_SIZE / 2;
        const bMinY = obj.position.y - BLOCK_SIZE / 2;
        const bMaxY = obj.position.y + BLOCK_SIZE / 2;
        const bMinZ = obj.position.z - BLOCK_SIZE / 2;
        const bMaxZ = obj.position.z + BLOCK_SIZE / 2;

        if (minX < bMaxX && maxX > bMinX && minY < bMaxY && maxY > bMinY && minZ < bMaxZ && maxZ > bMinZ) return true;
      }
      return false;
    };

    const updatePhysics = (delta: number) => {
      if (!cameraRef.current) return;
      const velocity = velocityRef.current;
      const moveState = moveStateRef.current;

      const damping = Math.exp(-(onGroundRef.current ? GROUND_DAMPING : AIR_DAMPING) * delta);
      velocity.x *= damping;
      velocity.z *= damping;
      velocity.y -= GRAVITY * delta;

      const forward = new THREE.Vector3();
      cameraRef.current.getWorldDirection(forward);
      forward.y = 0; forward.normalize();
      const right = new THREE.Vector3();
      right.crossVectors(forward, cameraRef.current.up).normalize();

      const inputVector = new THREE.Vector3();
      if (moveState.forward) inputVector.add(forward);
      if (moveState.backward) inputVector.sub(forward);
      if (moveState.right) inputVector.add(right);
      if (moveState.left) inputVector.sub(right);
      if (inputVector.length() > 0) inputVector.normalize();

      const accel = onGroundRef.current ? SPEED * 10 : SPEED * 2;
      velocity.x += inputVector.x * accel * delta;
      velocity.z += inputVector.z * accel * delta;

      cameraRef.current.position.x += velocity.x * delta;
      if (checkPlayerCollision()) { cameraRef.current.position.x -= velocity.x * delta; velocity.x = 0; }

      cameraRef.current.position.z += velocity.z * delta;
      if (checkPlayerCollision()) { cameraRef.current.position.z -= velocity.z * delta; velocity.z = 0; }

      onGroundRef.current = false;
      cameraRef.current.position.y += velocity.y * delta;
      if (checkPlayerCollision()) {
        const wasFalling = velocity.y < 0;
        cameraRef.current.position.y -= velocity.y * delta;
        velocity.y = 0;
        if (wasFalling) onGroundRef.current = true;
      }

      if (cameraRef.current.position.y < -50) { velocity.set(0, 0, 0); cameraRef.current.position.set(0, 100, 0); }
    };

    const syncPlayer = () => {
      if (!userId || !dbRef.current || !cameraRef.current) return;
      const appId = (window as any).__app_id || 'default-app-id';
      setDoc(doc(dbRef.current, `artifacts/${appId}/public/data/players`, userId), {
        position: { x: cameraRef.current.position.x, y: cameraRef.current.position.y, z: cameraRef.current.position.z },
        rotation: { x: 0, y: cameraRef.current.rotation.y, z: 0 },
        lastSeen: Date.now(),
      }, { merge: true });
    };

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      if (isGameActive && rendererRef.current && cameraRef.current) {
        const delta = Math.min((time - prevTime) / 1000, 0.05);
        updatePhysics(delta);

        if (time - lastSync > 100) {
          syncPlayer();
          lastSync = time;
        }
        prevTime = time;
        rendererRef.current.render(sceneRef.current!, cameraRef.current);
      } else {
        prevTime = time;
        // Still render the scene if a modal is open, but without physics updates
        if (rendererRef.current && cameraRef.current && sceneRef.current) {
           rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }
    };

    if (typeof window !== 'undefined') {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isGameActive, userId, sensitivity]); // Re-run if game state or userId changes

  // --- JSX RENDER ---

  const blockerDisplay = isGameActive || activeModal ? 'none' : 'flex';
  const settingsDisplay = activeModal === 'settings' ? 'flex' : 'none';
  const inventoryDisplay = activeModal === 'inventory' ? 'flex' : 'none';

  return (
    <>
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

      {/* UI LAYER (Heads-Up Display) */}
      <div id="ui-layer">
        <div id="crosshair" />
        <div id="instructions">
          <b>Controls:</b><br />
          W, A, S, D - Move<br />
          SPACE - Jump<br />
          E - Inventory<br />
          P - Settings<br />
          L-CLICK - Break | R-CLICK - Place<br />
          1-5 - Select Hotbar Slot
        </div>
        <div id="info-panel">
          <div id="user-id-display">ID: {userId ? userId.substring(0, 6) : 'N/A'}</div>
          <div id="player-count">{playerCount + 1} players</div>
        </div>

        {/* Hotbar */}
        <div id="hotbar">
          {Object.entries(hotbarState).map(([indexStr, blockId]) => {
            const index = parseInt(indexStr);
            const block = BLOCK_TYPES.find(b => b.id === blockId)!;
            const hexColor = block.color.toString(16).padStart(6, '0');
            
            return (
              <div
                key={index}
                className={`slot ${currentHotbarIndex === index ? 'active' : ''}`}
                data-index={index}
                style={{ backgroundColor: `#${hexColor}` }}
                onMouseDown={(e) => { e.stopPropagation(); selectHotbarSlot(index); }}
              />
            );
          })}
        </div>
      </div>

      {/* INVENTORY SCREEN (Modal) */}
      <div id="inventory-modal" style={{ display: inventoryDisplay }}>
        <div id="inventory-container">
          <h2 style={{ color: 'white', margin: 0 }}>Block Picker</h2>
          <p style={{ color: '#aaa', fontSize: '14px', margin: '5px 0 0 0' }}>Click a block to assign it to your selected hotbar slot.</p>
          {generateInventoryUI()}
          <button id="close-inv-btn" className="btn-green" onClick={() => toggleModal('inventory')}>Close (E)</button>
        </div>
      </div>

      {/* SETTINGS SCREEN (Modal) */}
      <div id="settings-modal" style={{ display: settingsDisplay }}>
        <div className="modal-box">
          <h2 style={{ marginTop: 0 }}>Settings</h2>
          <div className="setting-row">
            <label>Mouse Sensitivity: <span id="sens-display">{(sensitivity / 10).toFixed(1)}</span></label>
            <input
              type="range"
              id="sens-slider"
              min="1"
              max="100"
              value={sensitivity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSensitivity(val);
                localStorage.setItem('voxelSensitivity', val.toString());
              }}
            />
          </div>
          <button id="close-settings-btn" className="btn-green" onClick={() => toggleModal('settings')}>Resume Game</button>
        </div>
      </div>

      {/* START SCREEN (Blocker) */}
      <div id="blocker" style={{ display: blockerDisplay }}>
        <h1 style={{ color: 'white', fontSize: '48px', marginBottom: '20px', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>VOXEL VERSE</h1>
        <p id="auth-status" style={{ color: 'yellow', marginBottom: '20px' }}>{authStatus}</p>
        <button
          id="start-btn"
          className="btn-green"
          disabled={!userId}
          onClick={() => document.body.requestPointerLock()}
        >
          Click to Play
        </button>
      </div>
    </>
  );
};

export default VoxelWorld;


// --- FIREBASE LISTENERS (Outside of the component for cleaner code) ---

// Helper function to create/update blocks in Three.js scene
function handleBlockChange(
  change: any, // Firebase DocumentChange
  sceneRef: React.MutableRefObject<THREE.Scene | null>,
  blockMapRef: React.MutableRefObject<Map<string, THREE.Mesh>>,
  objectsRef: React.MutableRefObject<THREE.Mesh[]>
) {
  const d = change.doc.data();
  const key = `${d.x}_${d.y}_${d.z}`;

  if (change.type !== 'removed') {
    if (blockMapRef.current.has(key)) return;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
      MATERIALS[d.material] || MATERIALS.grass,
    );
    mesh.position.set(d.x, d.y, d.z);
    sceneRef.current!.add(mesh);
    objectsRef.current.push(mesh);
    blockMapRef.current.set(key, mesh);
  } else {
    const mesh = blockMapRef.current.get(key);
    if (mesh) {
      sceneRef.current!.remove(mesh);
      objectsRef.current.splice(objectsRef.current.indexOf(mesh), 1);
      blockMapRef.current.delete(key);
    }
  }
}

// Function to generate the initial world (Only runs if no blocks exist)
async function generateWorld(db: any, appId: string) {
  const range = WORLD_SIZE / 2;
  const promises = [];
  for (let x = -range; x < range; x++) {
    for (let z = -range; z < range; z++) {
      const docId = `${x}_0_${z}`;
      promises.push(setDoc(doc(db, `artifacts/${appId}/public/data/blocks`, docId), {
        x: x * BLOCK_SIZE, y: BLOCK_SIZE / 2, z: z * BLOCK_SIZE, material: 'stone',
      }));
    }
  }
  await Promise.all(promises);
}

// Block Listener
function setupWorldListener(
  appId: string,
  db: any,
  blockMapRef: React.MutableRefObject<Map<string, THREE.Mesh>>,
  objectsRef: React.MutableRefObject<THREE.Mesh[]>,
  sceneRef: React.MutableRefObject<THREE.Scene | null>
) {
  onSnapshot(collection(db, `artifacts/${appId}/public/data/blocks`), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      handleBlockChange(change, sceneRef, blockMapRef, objectsRef);
    });
    if (snapshot.empty) {
      // Generate world if the blocks collection is empty
      // Only do this on first load if collection is truly empty
      // In a production app, you'd use a transaction or rule to ensure this runs once
      generateWorld(db, appId);
    }
  });
}

// Player Listener
const remotePlayers: { [key: string]: { mesh: THREE.Mesh } } = {};
function setupPlayersListener(
  appId: string,
  db: any,
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>
) {
  onSnapshot(collection(db, `artifacts/${appId}/public/data/players`), (snapshot) => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    snapshot.docChanges().forEach((c) => {
      // Skip the local user
      const localUserId = (window as any).auth?.currentUser?.uid;
      if (c.doc.id === localUserId) return;

      if (c.type === 'removed') {
        if (remotePlayers[c.doc.id]) { scene.remove(remotePlayers[c.doc.id].mesh); delete remotePlayers[c.doc.id]; }
        return;
      }
      
      const d = c.doc.data();
      if (!remotePlayers[c.doc.id]) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 36, 8), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        scene.add(mesh);
        remotePlayers[c.doc.id] = { mesh };
      }
      remotePlayers[c.doc.id].mesh.position.set(d.position.x, d.position.y, d.position.z);
    });

    // Update player count state
    setPlayerCount(Object.keys(remotePlayers).length);
  });
}
