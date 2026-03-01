'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Block, BlockType, BLOCK_TRANSPARENT } from './textures';
import { createTextureAtlas } from './textures';
import { generateWorld, WorldData, WORLD_WIDTH, WORLD_DEPTH, WORLD_HEIGHT, SEA_LEVEL, CHUNK_SIZE } from './terrain';
import { buildChunkGeometry } from './chunk-builder';
import { useMinecraftWorldSocket, BlockChangeEvent } from '@/hooks/useMinecraftWorldSocket';
import type { MWPlayerPosition } from '@/types/minecraft-world';
import { BlockInventory, PLACEABLE_BLOCKS } from './BlockInventory';
import styles from './MinecraftWorld.module.css';

const PLAYER_HEIGHT = 1.62;
const PLAYER_WIDTH = 0.3;
const MOVE_SPEED = 5.5;
const SPRINT_SPEED = 8;
const JUMP_SPEED = 7.5;
const GRAVITY = -22;
const FOG_NEAR = 20;
const FOG_FAR = 120;
const POSITION_SEND_INTERVAL = 100; // 10Hz

// Sky colors for day cycle
const SKY_DAY = new THREE.Color(0x87ceeb);
const SKY_SUNSET = new THREE.Color(0xd4774a);
const SKY_NIGHT = new THREE.Color(0x0a0a2e);

export default function MinecraftWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('Initializing...');
  const [progressPct, setProgressPct] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const [fps, setFps] = useState(0);
  const worldRef = useRef<WorldData | null>(null);
  const controlsRef = useRef<PointerLockControls | null>(null);

  // Block inventory state
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [hotbar, setHotbar] = useState<(BlockType | null)[]>([
    Block.Grass, Block.Dirt, Block.Stone, Block.Cobblestone,
    Block.OakPlanks, Block.OakLog, Block.Glass, Block.Sand, null,
  ]);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  // Refs for chunk mesh management (used for rebuilding after block changes)
  const chunkMeshesRef = useRef<Map<string, { solid: THREE.Mesh | null; water: THREE.Mesh | null }>>(new Map());
  const solidMaterialRef = useRef<THREE.MeshLambertMaterial | null>(null);
  const waterMaterialRef = useRef<THREE.MeshLambertMaterial | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Menu state
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [menuTab, setMenuTab] = useState<'create' | 'join' | 'browse'>('create');
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Multiplayer hook
  const mp = useMinecraftWorldSocket();

  // Auto-connect on mount
  useEffect(() => {
    mp.connectWebSocket();
    return () => mp.disconnect();
  }, []);

  // Load name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mw_playerName');
    if (saved) setPlayerName(saved);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mp.chatMessages]);

  // Refresh rooms when browse tab selected
  useEffect(() => {
    if (menuTab === 'browse') {
      mp.getRooms();
    }
  }, [menuTab]);

  // Remote player mesh management
  const remotePlayerMeshes = useRef<Map<string, { group: THREE.Group; lastUpdate: number }>>(new Map());
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Track roomState in a ref so the animation loop always reads fresh data
  const roomStateRef = useRef(mp.roomState);
  useEffect(() => { roomStateRef.current = mp.roomState; }, [mp.roomState]);

  const handleCreateRoom = useCallback(() => {
    if (!playerName.trim()) return;
    localStorage.setItem('mw_playerName', playerName.trim());
    mp.createRoom(playerName.trim(), roomName.trim() || undefined);
  }, [playerName, roomName, mp]);

  const handleJoinRoom = useCallback(() => {
    if (!playerName.trim() || !roomCode.trim()) return;
    localStorage.setItem('mw_playerName', playerName.trim());
    mp.joinRoom(roomCode.trim(), playerName.trim());
  }, [playerName, roomCode, mp]);

  const handleJoinFromBrowse = useCallback((code: string) => {
    if (!playerName.trim()) return;
    localStorage.setItem('mw_playerName', playerName.trim());
    mp.joinRoom(code, playerName.trim());
  }, [playerName, mp]);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    mp.sendChat(chatInput.trim());
    setChatInput('');
  }, [chatInput, mp]);

  const handleBack = useCallback(() => {
    if (mp.phase !== 'menu') {
      mp.leaveRoom();
    } else {
      window.history.back();
    }
  }, [mp]);

  // ====== 3D World Rendering (playing phase) ======
  useEffect(() => {
    if (mp.phase !== 'playing' || !mountRef.current) return;

    const container = mountRef.current;
    let disposed = false;

    setLoading(true);
    setProgress('Initializing...');
    setProgressPct(0);
    setShowOverlay(true);

    // ====== Scene Setup ======
    const scene = new THREE.Scene();
    scene.background = SKY_DAY.clone();
    scene.fog = new THREE.Fog(SKY_DAY.clone(), FOG_NEAR, FOG_FAR);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 300);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // ====== Texture Atlas ======
    const atlas = createTextureAtlas();
    const texture = new THREE.CanvasTexture(atlas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipMapLinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;

    const solidMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.FrontSide,
    });
    solidMaterialRef.current = solidMaterial;

    const waterMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    waterMaterialRef.current = waterMaterial;

    // ====== Lighting ======
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 0.85);
    sunLight.position.set(80, 120, 60);
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.3);
    scene.add(hemiLight);

    // ====== Sun / Moon visual ======
    const sunGeo = new THREE.SphereGeometry(5, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    const moonGeo = new THREE.SphereGeometry(3, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);

    // ====== Cloud Layer ======
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 256;
    cloudCanvas.height = 256;
    const cloudCtx = cloudCanvas.getContext('2d')!;
    const cloudImageData = cloudCtx.createImageData(256, 256);
    const cData = cloudImageData.data;
    let cSeed = 999;
    const cRng = () => {
      cSeed = (cSeed * 16807) % 2147483647;
      return (cSeed - 1) / 2147483646;
    };
    for (let cy = 0; cy < 256; cy++) {
      for (let cx = 0; cx < 256; cx++) {
        const i = (cy * 256 + cx) * 4;
        const nx = cx / 32;
        const ny = cy / 32;
        const v1 = Math.sin(nx * 1.5) * Math.cos(ny * 1.3) * 0.5 + 0.5;
        const v2 = Math.sin(nx * 3.1 + 1) * Math.cos(ny * 2.7 + 2) * 0.25;
        const cloud = v1 + v2 + cRng() * 0.1;
        if (cloud > 0.55) {
          cData[i] = 255;
          cData[i + 1] = 255;
          cData[i + 2] = 255;
          cData[i + 3] = Math.min(255, Math.floor((cloud - 0.55) * 400));
        } else {
          cData[i] = 255;
          cData[i + 1] = 255;
          cData[i + 2] = 255;
          cData[i + 3] = 0;
        }
      }
    }
    cloudCtx.putImageData(cloudImageData, 0, 0);
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
    cloudTexture.wrapS = THREE.RepeatWrapping;
    cloudTexture.wrapT = THREE.RepeatWrapping;
    const cloudGeo = new THREE.PlaneGeometry(WORLD_WIDTH * 3, WORLD_DEPTH * 3);
    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.position.set(WORLD_WIDTH / 2, WORLD_HEIGHT + 15, WORLD_DEPTH / 2);
    cloudMesh.rotation.x = -Math.PI / 2;
    scene.add(cloudMesh);

    // ====== Deferred World Generation ======
    const seed = mp.gameSeed || 42069;

    setTimeout(() => {
      if (disposed) return;

      setProgress('Generating terrain...');
      setProgressPct(10);

      setTimeout(() => {
        if (disposed) return;

        const world = generateWorld(seed);
        worldRef.current = world;

        setProgress('Building chunk meshes...');
        setProgressPct(40);

        setTimeout(() => {
          if (disposed) return;

          const chunksX = Math.ceil(WORLD_WIDTH / CHUNK_SIZE);
          const chunksZ = Math.ceil(WORLD_DEPTH / CHUNK_SIZE);
          const totalChunks = chunksX * chunksZ;
          let built = 0;

          const chunkQueue: [number, number][] = [];
          for (let chX = 0; chX < chunksX; chX++) {
            for (let chZ = 0; chZ < chunksZ; chZ++) {
              chunkQueue.push([chX, chZ]);
            }
          }

          function buildBatch() {
            if (disposed) return;
            const batchSize = 8;
            for (let i = 0; i < batchSize && chunkQueue.length > 0; i++) {
              const [chX, chZ] = chunkQueue.shift()!;
              const { solid, water } = buildChunkGeometry(world, chX, chZ);
              const key = `${chX},${chZ}`;
              let solidMesh: THREE.Mesh | null = null;
              let waterMesh: THREE.Mesh | null = null;
              if (solid) {
                solidMesh = new THREE.Mesh(solid, solidMaterial);
                scene.add(solidMesh);
              }
              if (water) {
                waterMesh = new THREE.Mesh(water, waterMaterial);
                waterMesh.renderOrder = 1;
                scene.add(waterMesh);
              }
              chunkMeshesRef.current.set(key, { solid: solidMesh, water: waterMesh });
              built++;
            }

            const pct = 40 + Math.floor((built / totalChunks) * 55);
            setProgressPct(pct);
            setProgress(`Building meshes... ${built}/${totalChunks} chunks`);

            if (chunkQueue.length > 0) {
              setTimeout(buildBatch, 0);
            } else {
              finishSetup(world);
            }
          }

          buildBatch();
        }, 16);
      }, 16);
    }, 50);

    // ====== Player Controls & Physics ======
    const controls = new PointerLockControls(camera, renderer.domElement);
    controlsRef.current = controls;

    controls.addEventListener('lock', () => setShowOverlay(false));
    controls.addEventListener('unlock', () => setShowOverlay(true));

    const moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
    };

    let velocityY = 0;
    let onGround = false;

    function isSolid(x: number, y: number, z: number): boolean {
      const bx = Math.floor(x);
      const by = Math.floor(y);
      const bz = Math.floor(z);
      if (!worldRef.current) return false;
      if (bx < 0 || bx >= WORLD_WIDTH || bz < 0 || bz >= WORLD_DEPTH) return true;
      if (by < 0) return true;
      if (by >= WORLD_HEIGHT) return false;
      const block = worldRef.current.getBlock(bx, by, bz);
      return block !== Block.Air && block !== Block.Water && block !== Block.Glass;
    }

    function checkCollision(x: number, y: number, z: number): boolean {
      for (const dx of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
        for (const dz of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
          if (isSolid(x + dx, y, z + dz)) return true;
          if (isSolid(x + dx, y + 1, z + dz)) return true;
        }
      }
      return false;
    }

    // ====== Block Raycast Helpers ======
    const REACH = 6; // max reach distance in blocks
    const RAY_STEPS = 120; // number of steps along ray

    /** Cast a ray from camera and find the first solid block hit.
     *  Returns { hitPos, prevPos } or null.
     *  hitPos = the block that was hit, prevPos = the empty block just before it. */
    function raycastBlock(): { hitPos: [number, number, number]; prevPos: [number, number, number] } | null {
      if (!worldRef.current) return null;
      const world = worldRef.current;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const origin = camera.position.clone();
      const step = dir.clone().multiplyScalar(REACH / RAY_STEPS);

      let prevBx = -999, prevBy = -999, prevBz = -999;
      const pos = origin.clone();

      for (let i = 0; i < RAY_STEPS; i++) {
        const bx = Math.floor(pos.x);
        const by = Math.floor(pos.y);
        const bz = Math.floor(pos.z);

        if (bx !== prevBx || by !== prevBy || bz !== prevBz) {
          if (bx >= 0 && bx < WORLD_WIDTH && by >= 0 && by < WORLD_HEIGHT && bz >= 0 && bz < WORLD_DEPTH) {
            const block = world.getBlock(bx, by, bz);
            if (block !== Block.Air && block !== Block.Water) {
              return { hitPos: [bx, by, bz], prevPos: [prevBx, prevBy, prevBz] };
            }
          }
          prevBx = bx;
          prevBy = by;
          prevBz = bz;
        }

        pos.add(step);
      }
      return null;
    }

    /** Rebuild the chunk mesh containing block (bx, by, bz) */
    function rebuildChunkAt(bx: number, _by: number, bz: number) {
      if (!worldRef.current || !sceneRef.current) return;
      const chX = Math.floor(bx / CHUNK_SIZE);
      const chZ = Math.floor(bz / CHUNK_SIZE);
      const key = `${chX},${chZ}`;

      // Remove old meshes
      const old = chunkMeshesRef.current.get(key);
      if (old) {
        if (old.solid) {
          sceneRef.current.remove(old.solid);
          old.solid.geometry.dispose();
        }
        if (old.water) {
          sceneRef.current.remove(old.water);
          old.water.geometry.dispose();
        }
      }

      // Build new geometry
      const { solid, water } = buildChunkGeometry(worldRef.current, chX, chZ);
      let solidMesh: THREE.Mesh | null = null;
      let waterMesh: THREE.Mesh | null = null;
      if (solid && solidMaterialRef.current) {
        solidMesh = new THREE.Mesh(solid, solidMaterialRef.current);
        sceneRef.current.add(solidMesh);
      }
      if (water && waterMaterialRef.current) {
        waterMesh = new THREE.Mesh(water, waterMaterialRef.current);
        waterMesh.renderOrder = 1;
        sceneRef.current.add(waterMesh);
      }
      chunkMeshesRef.current.set(key, { solid: solidMesh, water: waterMesh });

      // Also rebuild adjacent chunks if block is at a chunk boundary
      const localX = bx - chX * CHUNK_SIZE;
      const localZ = bz - chZ * CHUNK_SIZE;
      const adjacents: [number, number][] = [];
      if (localX === 0 && chX > 0) adjacents.push([chX - 1, chZ]);
      if (localX === CHUNK_SIZE - 1) adjacents.push([chX + 1, chZ]);
      if (localZ === 0 && chZ > 0) adjacents.push([chX, chZ - 1]);
      if (localZ === CHUNK_SIZE - 1) adjacents.push([chX, chZ + 1]);

      for (const [adjX, adjZ] of adjacents) {
        const adjKey = `${adjX},${adjZ}`;
        const adjOld = chunkMeshesRef.current.get(adjKey);
        if (adjOld) {
          if (adjOld.solid) { sceneRef.current.remove(adjOld.solid); adjOld.solid.geometry.dispose(); }
          if (adjOld.water) { sceneRef.current.remove(adjOld.water); adjOld.water.geometry.dispose(); }
        }
        const adj = buildChunkGeometry(worldRef.current, adjX, adjZ);
        let aSolid: THREE.Mesh | null = null;
        let aWater: THREE.Mesh | null = null;
        if (adj.solid && solidMaterialRef.current) {
          aSolid = new THREE.Mesh(adj.solid, solidMaterialRef.current);
          sceneRef.current.add(aSolid);
        }
        if (adj.water && waterMaterialRef.current) {
          aWater = new THREE.Mesh(adj.water, waterMaterialRef.current);
          aWater.renderOrder = 1;
          sceneRef.current.add(aWater);
        }
        chunkMeshesRef.current.set(adjKey, { solid: aSolid, water: aWater });
      }
    }

    /** Apply a block change to the local world (called from server broadcast) */
    function applyBlockChange(x: number, y: number, z: number, blockType: number) {
      if (!worldRef.current) return;
      if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT || z < 0 || z >= WORLD_DEPTH) return;
      worldRef.current.setBlock(x, y, z, blockType as BlockType);
      rebuildChunkAt(x, y, z);
    }

    /** Break a block (left-click) — applies instantly on client, sends to server for sync */
    function breakBlock() {
      if (!worldRef.current) return;
      const hit = raycastBlock();
      if (!hit) return;
      const [bx, by, bz] = hit.hitPos;
      // Don't break bedrock
      if (worldRef.current.getBlock(bx, by, bz) === Block.Bedrock) return;
      // Apply locally first for instant feedback (zero perceived delay)
      applyBlockChange(bx, by, bz, Block.Air);
      // Send to server to sync with other players
      mp.sendBreakBlock(bx, by, bz);
    }

    /** Place a block (right-click) — applies instantly on client, sends to server for sync */
    function placeBlock(blockType: BlockType) {
      if (!worldRef.current || blockType === Block.Air) return;
      const hit = raycastBlock();
      if (!hit) return;
      const [px, py, pz] = hit.prevPos;
      // Validate position
      if (px < 0 || px >= WORLD_WIDTH || py < 0 || py >= WORLD_HEIGHT || pz < 0 || pz >= WORLD_DEPTH) return;
      // Don't place a block where the player is standing
      const camPos = camera.position;
      const playerFeetY = camPos.y - PLAYER_HEIGHT;
      if (Math.floor(camPos.x) === px && Math.floor(camPos.z) === pz) {
        if (py === Math.floor(playerFeetY) || py === Math.floor(playerFeetY) + 1) return;
      }
      // Apply locally first for instant feedback (zero perceived delay)
      applyBlockChange(px, py, pz, blockType);
      // Send to server to sync with other players
      mp.sendPlaceBlock(px, py, pz, blockType);
    }

    // Register block change callback so server-broadcast changes update the 3D world
    // Skip self-originated changes (already applied locally above for instant feedback)
    mp.onBlockChange((event: BlockChangeEvent) => {
      if (event.playerId === mp.playerId) return;
      applyBlockChange(event.x, event.y, event.z, event.blockType);
    });

    // Store placeBlock/breakBlock refs for event handlers
    let currentSelectedBlock: BlockType | null = null;
    function setCurrentSelectedBlock(b: BlockType | null) { currentSelectedBlock = b; }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'Space': moveState.jump = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': moveState.sprint = true; break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'Space': moveState.jump = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': moveState.sprint = false; break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse events for block interaction
    const handleMouseDown = (e: MouseEvent) => {
      if (!controls.isLocked) {
        controls.lock();
        return;
      }
      if (e.button === 0) {
        // Left-click = break block
        breakBlock();
      } else if (e.button === 2) {
        // Right-click = place block
        if (currentSelectedBlock !== null) {
          placeBlock(currentSelectedBlock);
        }
      }
    };

    // Prevent context menu on right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('contextmenu', handleContextMenu);

    // ====== Finish Setup (called after chunks built) ======
    function finishSetup(world: WorldData) {
      if (disposed) return;

      // Replay any pending block changes from reconnection
      const pendingChanges = mp.consumePendingBlockChanges();
      if (pendingChanges.length > 0) {
        for (const change of pendingChanges) {
          if (change.x >= 0 && change.x < WORLD_WIDTH &&
              change.y >= 0 && change.y < WORLD_HEIGHT &&
              change.z >= 0 && change.z < WORLD_DEPTH) {
            world.setBlock(change.x, change.y, change.z, change.blockType as BlockType);
          }
        }
        // Rebuild all affected chunks
        const affectedChunks = new Set<string>();
        for (const change of pendingChanges) {
          const chX = Math.floor(change.x / CHUNK_SIZE);
          const chZ = Math.floor(change.z / CHUNK_SIZE);
          affectedChunks.add(`${chX},${chZ}`);
        }
        for (const key of affectedChunks) {
          const [chX, chZ] = key.split(',').map(Number);
          const old = chunkMeshesRef.current.get(key);
          if (old) {
            if (old.solid) { scene.remove(old.solid); old.solid.geometry.dispose(); }
            if (old.water) { scene.remove(old.water); old.water.geometry.dispose(); }
          }
          const { solid, water } = buildChunkGeometry(world, chX, chZ);
          let sMesh: THREE.Mesh | null = null;
          let wMesh: THREE.Mesh | null = null;
          if (solid && solidMaterialRef.current) {
            sMesh = new THREE.Mesh(solid, solidMaterialRef.current);
            scene.add(sMesh);
          }
          if (water && waterMaterialRef.current) {
            wMesh = new THREE.Mesh(water, waterMaterialRef.current);
            wMesh.renderOrder = 1;
            scene.add(wMesh);
          }
          chunkMeshesRef.current.set(key, { solid: sMesh, water: wMesh });
        }
      }

      const spawnX = Math.floor(WORLD_WIDTH / 2);
      const spawnZ = Math.floor(WORLD_DEPTH / 2);
      let spawnY = SEA_LEVEL + 5;
      for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
        const b = world.getBlock(spawnX, y, spawnZ);
        if (b !== Block.Air && b !== Block.Water) {
          spawnY = y + 1 + PLAYER_HEIGHT;
          break;
        }
      }

      camera.position.set(spawnX + 0.5, spawnY, spawnZ + 0.5);

      setProgress('Ready!');
      setProgressPct(100);

      setTimeout(() => {
        if (!disposed) setLoading(false);
      }, 300);
    }

    // ====== Remote Player Rendering ======
    function createPlayerMesh(color: string): THREE.Group {
      const group = new THREE.Group();

      // Body (0.6 x 1.5 x 0.3)
      const bodyGeo = new THREE.BoxGeometry(0.6, 1.5, 0.3);
      const bodyMat = new THREE.MeshLambertMaterial({ color });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.75;
      group.add(body);

      // Head (0.5 x 0.5 x 0.5)
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const headMat = new THREE.MeshLambertMaterial({ color: 0xf5d6b8 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.75;
      group.add(head);

      // Name tag - will be set later via userData
      const nameCanvas = document.createElement('canvas');
      nameCanvas.width = 256;
      nameCanvas.height = 64;
      const nameTexture = new THREE.CanvasTexture(nameCanvas);
      nameTexture.magFilter = THREE.LinearFilter;
      const nameGeo = new THREE.PlaneGeometry(2, 0.5);
      const nameMat = new THREE.MeshBasicMaterial({
        map: nameTexture,
        transparent: true,
        depthTest: false,
      });
      const nameMesh = new THREE.Mesh(nameGeo, nameMat);
      nameMesh.position.y = 2.2;
      group.add(nameMesh);

      group.userData.nameCanvas = nameCanvas;
      group.userData.nameTexture = nameTexture;

      return group;
    }

    function updateNameTag(group: THREE.Group, name: string) {
      const canvas = group.userData.nameCanvas as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 256, 64);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(name, 128, 32);
      (group.userData.nameTexture as THREE.CanvasTexture).needsUpdate = true;
    }

    function updateRemotePlayers(remotePlayers: MWPlayerPosition[], playerColors: Map<string, string>, playerNames: Map<string, string>) {
      const currentIds = new Set(remotePlayers.map(p => p.id));

      // Remove old meshes
      for (const [id, entry] of remotePlayerMeshes.current) {
        if (!currentIds.has(id)) {
          scene.remove(entry.group);
          entry.group.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
              } else {
                obj.material.dispose();
              }
            }
          });
          remotePlayerMeshes.current.delete(id);
        }
      }

      // Add/update meshes
      for (const rp of remotePlayers) {
        let entry = remotePlayerMeshes.current.get(rp.id);
        if (!entry) {
          const color = playerColors.get(rp.id) || '#FF4444';
          const group = createPlayerMesh(color);
          const name = playerNames.get(rp.id) || 'Player';
          updateNameTag(group, name);
          scene.add(group);
          entry = { group, lastUpdate: Date.now() };
          remotePlayerMeshes.current.set(rp.id, entry);
        }

        // Lerp position for smooth movement
        const targetX = rp.x;
        const targetY = rp.y;
        const targetZ = rp.z;
        const group = entry.group;
        group.position.x += (targetX - group.position.x) * 0.3;
        group.position.y += (targetY - group.position.y) * 0.3;
        group.position.z += (targetZ - group.position.z) * 0.3;
        group.rotation.y = rp.ry;

        // Make name tag face camera
        const nameTag = group.children[2];
        if (nameTag) {
          nameTag.lookAt(camera.position);
        }

        entry.lastUpdate = Date.now();
      }
    }

    // ====== Animation Loop ======
    let prevTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;
    let lastPositionSend = 0;

    function animate() {
      if (disposed) return;
      requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - prevTime) / 1000, 0.1);
      prevTime = now;

      // FPS counter
      frameCount++;
      fpsTimer += dt;
      if (fpsTimer >= 1) {
        setFps(frameCount);
        frameCount = 0;
        fpsTimer = 0;
      }

      // Day/night cycle — synced from server (1 full day = 240 seconds)
      const dayTime = mp.getSyncedDayTime();

      // Update sky color
      const sunAngle = dayTime * Math.PI * 2;
      let skyColor: THREE.Color;
      if (dayTime < 0.25) {
        skyColor = SKY_DAY.clone();
      } else if (dayTime < 0.35) {
        const t = (dayTime - 0.25) / 0.1;
        skyColor = SKY_DAY.clone().lerp(SKY_SUNSET, t);
      } else if (dayTime < 0.4) {
        const t = (dayTime - 0.35) / 0.05;
        skyColor = SKY_SUNSET.clone().lerp(SKY_NIGHT, t);
      } else if (dayTime < 0.6) {
        skyColor = SKY_NIGHT.clone();
      } else if (dayTime < 0.65) {
        const t = (dayTime - 0.6) / 0.05;
        skyColor = SKY_NIGHT.clone().lerp(SKY_SUNSET, t);
      } else if (dayTime < 0.75) {
        const t = (dayTime - 0.65) / 0.1;
        skyColor = SKY_SUNSET.clone().lerp(SKY_DAY, t);
      } else {
        skyColor = SKY_DAY.clone();
      }

      scene.background = skyColor;
      (scene.fog as THREE.Fog).color.copy(skyColor);

      // Sun/moon position
      const sunDist = 150;
      const sunX = WORLD_WIDTH / 2 + Math.cos(sunAngle - Math.PI / 2) * sunDist;
      const sunY = Math.sin(sunAngle - Math.PI / 2) * sunDist;
      const sunZ = WORLD_DEPTH / 2;
      sunMesh.position.set(sunX, sunY + 40, sunZ);
      sunMesh.visible = sunY > -20;
      moonMesh.position.set(WORLD_WIDTH - sunX + WORLD_WIDTH / 2, -sunY + 40, sunZ);
      moonMesh.visible = sunY < 20;

      sunLight.position.set(sunX, Math.max(sunY + 40, 10), sunZ);
      const dayFactor = Math.max(0, Math.sin((1 - dayTime) * Math.PI));
      sunLight.intensity = 0.2 + dayFactor * 0.65;
      ambientLight.intensity = 0.15 + dayFactor * 0.4;

      // Cloud drift
      cloudMesh.position.x += dt * 1.5;
      if (cloudMesh.position.x > WORLD_WIDTH * 2) cloudMesh.position.x = -WORLD_WIDTH;

      // ====== Player Physics ======
      if (controls.isLocked && worldRef.current) {
        const direction = new THREE.Vector3();
        const right = new THREE.Vector3();

        camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();
        right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

        const speed = moveState.sprint && moveState.forward ? SPRINT_SPEED : MOVE_SPEED;
        const move = new THREE.Vector3();
        if (moveState.forward) move.add(direction);
        if (moveState.backward) move.sub(direction);
        if (moveState.left) move.sub(right);
        if (moveState.right) move.add(right);

        if (move.lengthSq() > 0) {
          move.normalize().multiplyScalar(speed * dt);
        }

        const pos = camera.position;

        // --- Horizontal movement with per-axis collision ---
        let feetY = pos.y - PLAYER_HEIGHT;

        const newX = pos.x + move.x;
        if (!checkCollision(newX, feetY, pos.z)) {
          pos.x = newX;
        }

        const newZ = pos.z + move.z;
        if (!checkCollision(pos.x, feetY, newZ)) {
          pos.z = newZ;
        }

        // --- Vertical: apply gravity, move, then resolve ground/ceiling ---
        velocityY += GRAVITY * dt;
        pos.y += velocityY * dt;

        feetY = pos.y - PLAYER_HEIGHT;
        onGround = false;

        for (const dx of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
          for (const dz of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
            const colX = pos.x + dx;
            const colZ = pos.z + dz;

            if (isSolid(colX, feetY, colZ)) {
              const blockTop = Math.floor(feetY) + 1;
              const resolveY = blockTop + PLAYER_HEIGHT;
              if (pos.y < resolveY) {
                pos.y = resolveY;
                feetY = pos.y - PLAYER_HEIGHT;
              }
              if (velocityY < 0) velocityY = 0;
              onGround = true;
            } else if (velocityY <= 0 && isSolid(colX, feetY - 0.06, colZ)) {
              const blockTop = Math.floor(feetY - 0.06) + 1;
              const gap = feetY - blockTop;
              if (gap >= 0 && gap < 0.06) {
                pos.y = blockTop + PLAYER_HEIGHT;
                feetY = pos.y - PLAYER_HEIGHT;
                if (velocityY < 0) velocityY = 0;
                onGround = true;
              }
            }
          }
        }

        // Jump
        if (onGround && moveState.jump) {
          velocityY = JUMP_SPEED;
          onGround = false;
        }

        // Ceiling collision
        if (velocityY > 0) {
          for (const dx of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
            for (const dz of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
              if (isSolid(pos.x + dx, pos.y + 0.1, pos.z + dz)) {
                velocityY = 0;
              }
            }
          }
        }

        // World bounds
        pos.x = Math.max(PLAYER_WIDTH + 0.1, Math.min(WORLD_WIDTH - PLAYER_WIDTH - 0.1, pos.x));
        pos.z = Math.max(PLAYER_WIDTH + 0.1, Math.min(WORLD_DEPTH - PLAYER_WIDTH - 0.1, pos.z));
        if (pos.y < PLAYER_HEIGHT + 1) {
          pos.y = PLAYER_HEIGHT + 1;
          velocityY = 0;
        }

        // Update coords
        if (fpsTimer < 0.05) {
          setCoords({
            x: Math.floor(pos.x),
            y: Math.floor(pos.y - PLAYER_HEIGHT),
            z: Math.floor(pos.z),
          });
        }

        // Send position to server at 10Hz
        if (now - lastPositionSend >= POSITION_SEND_INTERVAL) {
          const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
          mp.sendPosition(pos.x, pos.y - PLAYER_HEIGHT, pos.z, euler.x, euler.y);
          lastPositionSend = now;
        }
      }

      // Update remote players — read from refs to avoid stale closure
      const playerColors = new Map<string, string>();
      const playerNames = new Map<string, string>();
      const currentRoomState = roomStateRef.current;
      if (currentRoomState) {
        for (const p of currentRoomState.players) {
          playerColors.set(p.id, p.color);
          playerNames.set(p.id, p.name);
        }
      }
      updateRemotePlayers(
        Array.from(mp.remotePlayers.current.values()),
        playerColors,
        playerNames,
      );

      renderer.render(scene, camera);
    }

    const firstFrame = requestAnimationFrame(animate);

    // ====== Resize Handler ======
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ====== Sync selected block into closure ======
    // We use an interval to keep the selected block in sync with React state
    const syncInterval = setInterval(() => {
      // The hotbar & selectedSlot are React state; read via DOM data attribute
      const hotbarEl = container.querySelector('[data-hotbar]');
      if (hotbarEl) {
        const blockId = hotbarEl.getAttribute('data-selected-block');
        setCurrentSelectedBlock(blockId ? parseInt(blockId) as BlockType : null);
      }
    }, 100);

    // ====== Cleanup ======
    return () => {
      disposed = true;
      sceneRef.current = null;
      cameraRef.current = null;
      solidMaterialRef.current = null;
      waterMaterialRef.current = null;
      mp.onBlockChange(null); // Unregister block change callback
      clearInterval(syncInterval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('contextmenu', handleContextMenu);
      cancelAnimationFrame(firstFrame);

      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      // Clean up chunk meshes
      chunkMeshesRef.current.clear();

      // Clean up remote player meshes
      for (const [, entry] of remotePlayerMeshes.current) {
        entry.group.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material?.dispose();
            }
          }
        });
      }
      remotePlayerMeshes.current.clear();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });

      texture.dispose();
      cloudTexture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mp.phase, mp.gameSeed]);

  // ====== Menu Phase ======
  if (mp.phase === 'menu') {
    return (
      <div className={styles.menuContainer}>
        <div className={styles.menuPanel}>
          <h1 className={styles.menuTitle}>Minecraft World</h1>
          <p className={styles.menuSubtitle}>Multiplayer Exploration</p>

          {mp.gameMessage && (
            <div className={styles.gameMessage}>{mp.gameMessage}</div>
          )}

          <div className={styles.nameInput}>
            <label>Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value.slice(0, 16))}
              placeholder="Enter your name..."
              maxLength={16}
            />
          </div>

          <div className={styles.tabBar}>
            <button
              className={`${styles.tab} ${menuTab === 'create' ? styles.tabActive : ''}`}
              onClick={() => setMenuTab('create')}
            >
              Create
            </button>
            <button
              className={`${styles.tab} ${menuTab === 'join' ? styles.tabActive : ''}`}
              onClick={() => setMenuTab('join')}
            >
              Join
            </button>
            <button
              className={`${styles.tab} ${menuTab === 'browse' ? styles.tabActive : ''}`}
              onClick={() => setMenuTab('browse')}
            >
              Browse
            </button>
          </div>

          {menuTab === 'create' && (
            <div className={styles.tabContent}>
              <input
                type="text"
                value={roomName}
                onChange={e => setRoomName(e.target.value.slice(0, 32))}
                placeholder="Room name (optional)"
                maxLength={32}
                className={styles.textInput}
              />
              <button
                className={styles.primaryButton}
                onClick={handleCreateRoom}
                disabled={!playerName.trim() || mp.connectionStatus !== 'connected'}
              >
                Create Room
              </button>
            </div>
          )}

          {menuTab === 'join' && (
            <div className={styles.tabContent}>
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="Room code (e.g. ABC12)"
                maxLength={5}
                className={styles.textInput}
                style={{ textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center' }}
              />
              <button
                className={styles.primaryButton}
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || roomCode.length < 5 || mp.connectionStatus !== 'connected'}
              >
                Join Room
              </button>
            </div>
          )}

          {menuTab === 'browse' && (
            <div className={styles.tabContent}>
              <div className={styles.roomList}>
                {[...mp.publicRooms, ...mp.firestoreRooms.filter(fr =>
                  !mp.publicRooms.some(pr => pr.code === fr.code)
                ).map(fr => ({
                  code: fr.code,
                  name: fr.name,
                  hostName: fr.hostName,
                  playerCount: fr.playerCount,
                  maxPlayers: fr.maxPlayers,
                  status: fr.status === 'open' ? 'waiting' as const : 'playing' as const,
                }))].map(room => (
                  <div key={room.code} className={styles.roomCard}>
                    <div className={styles.roomInfo}>
                      <div className={styles.roomCardName}>{room.name}</div>
                      <div className={styles.roomCardMeta}>
                        {room.code} &middot; {room.hostName} &middot; {room.playerCount}/{room.maxPlayers}
                      </div>
                    </div>
                    <button
                      className={styles.joinButton}
                      onClick={() => handleJoinFromBrowse(room.code)}
                      disabled={!playerName.trim() || room.status !== 'waiting'}
                    >
                      {room.status === 'waiting' ? 'Join' : 'In Game'}
                    </button>
                  </div>
                ))}
                {mp.publicRooms.length === 0 && mp.firestoreRooms.length === 0 && (
                  <div className={styles.emptyRooms}>No rooms available</div>
                )}
              </div>
              <button
                className={styles.secondaryButton}
                onClick={() => mp.getRooms()}
              >
                Refresh
              </button>
            </div>
          )}

          <div className={styles.connectionStatus}>
            {mp.connectionStatus === 'connected' ? 'Connected' :
              mp.connectionStatus === 'connecting' ? 'Connecting...' :
                mp.connectionStatus === 'reconnecting' ? 'Reconnecting...' :
                  'Disconnected'}
          </div>
        </div>

        <button className={styles.menuBackButton} onClick={() => window.history.back()}>
          Back
        </button>
      </div>
    );
  }

  // ====== Lobby Phase ======
  if (mp.phase === 'lobby') {
    return (
      <div className={styles.menuContainer}>
        <div className={styles.lobbyPanel}>
          <h2 className={styles.lobbyTitle}>
            {mp.roomState?.name || 'Lobby'}
          </h2>
          <div className={styles.lobbyCode}>
            Room Code: <span>{mp.roomState?.code}</span>
          </div>

          {mp.gameMessage && (
            <div className={styles.gameMessage}>{mp.gameMessage}</div>
          )}

          <div className={styles.playerList}>
            {mp.roomState?.players.map(p => (
              <div key={p.id} className={styles.playerItem}>
                <div
                  className={styles.playerColor}
                  style={{ backgroundColor: p.color }}
                />
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>
                    {p.name}
                    {p.id === mp.roomState?.hostId && (
                      <span className={styles.hostBadge}>HOST</span>
                    )}
                  </span>
                  <span className={`${styles.playerStatus} ${!p.connected ? styles.disconnected : p.ready ? styles.ready : ''}`}>
                    {!p.connected ? 'Disconnected' : p.id === mp.roomState?.hostId ? '' : p.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.lobbyActions}>
            {mp.playerId === mp.roomState?.hostId ? (
              <button
                className={styles.primaryButton}
                onClick={() => mp.startGame()}
                disabled={
                  !mp.roomState?.players.every(p =>
                    p.id === mp.roomState?.hostId || p.ready || !p.connected
                  )
                }
              >
                Start Game
              </button>
            ) : (
              <button
                className={`${styles.primaryButton} ${mp.roomState?.players.find(p => p.id === mp.playerId)?.ready ? styles.readyActive : ''
                  }`}
                onClick={() => {
                  const me = mp.roomState?.players.find(p => p.id === mp.playerId);
                  mp.setReady(!me?.ready);
                }}
              >
                {mp.roomState?.players.find(p => p.id === mp.playerId)?.ready ? 'Unready' : 'Ready'}
              </button>
            )}
            <button className={styles.secondaryButton} onClick={() => mp.leaveRoom()}>
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== Countdown Phase ======
  if (mp.phase === 'countdown') {
    return (
      <div className={styles.countdownContainer}>
        <div className={styles.countdownNumber}>
          {mp.countdownCount}
        </div>
        <div className={styles.countdownText}>Get ready to explore!</div>
      </div>
    );
  }

  // ====== Playing Phase ======
  return (
    <div ref={mountRef} className={styles.container}>
      {loading && (
        <div className={styles.loadingScreen}>
          <div className={styles.loadingTitle}>Minecraft World</div>
          <div className={styles.loadingBarOuter}>
            <div className={styles.loadingBarInner} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.loadingText}>{progress}</div>
        </div>
      )}

      {showOverlay && !loading && (
        <div className={styles.overlay}>
          <div className={styles.overlayContent}>
            <h2>Minecraft World</h2>
            <p>Click anywhere to start exploring</p>
            <div className={styles.controls}>
              <p>WASD - Move</p>
              <p>Shift - Sprint</p>
              <p>Space - Jump</p>
              <p>Mouse - Look around</p>
              <p>Left Click - Break block</p>
              <p>Right Click - Place block</p>
              <p>1-9 / Scroll - Select block</p>
              <p>E - Open inventory</p>
              <p>T - Chat</p>
              <p>ESC - Release cursor</p>
            </div>
          </div>
        </div>
      )}

      {!showOverlay && !loading && (
        <>
          <div className={styles.crosshair}>+</div>
          <div className={styles.hud}>
            <div className={styles.coordLine}>XYZ: {coords.x} / {coords.y} / {coords.z}</div>
            <div className={styles.coordLine}>{fps} FPS</div>
            <div className={styles.coordLine}>
              Players: {mp.roomState?.players.filter(p => p.connected).length || 1}
            </div>
          </div>

          {/* Hidden element to sync selected block into the Three.js closure */}
          <div
            data-hotbar="true"
            data-selected-block={hotbar[selectedSlot] ?? ''}
            style={{ display: 'none' }}
          />

          {/* Block Inventory & Hotbar */}
          <BlockInventory
            selectedSlot={selectedSlot}
            hotbar={hotbar}
            onSelectSlot={setSelectedSlot}
            onUpdateHotbar={setHotbar}
            inventoryOpen={inventoryOpen}
            onToggleInventory={() => {
              setInventoryOpen(prev => !prev);
              // Unlock pointer when opening inventory
              if (!inventoryOpen && controlsRef.current?.isLocked) {
                controlsRef.current.unlock();
              }
            }}
          />
        </>
      )}

      {/* Chat UI */}
      <div className={`${styles.chatContainer} ${showChat ? styles.chatOpen : ''}`}>
        <div className={styles.chatMessages}>
          {mp.chatMessages.slice(-20).map((msg, i) => (
            <div key={i} className={styles.chatMsg}>
              <span className={styles.chatSender}>{msg.playerName}</span>
              <span>{msg.message}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {showChat && (
          <div className={styles.chatInputRow}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value.slice(0, 200))}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSendChat();
                  setShowChat(false);
                }
                if (e.key === 'Escape') {
                  setShowChat(false);
                  setChatInput('');
                }
              }}
              placeholder="Type a message..."
              autoFocus
              className={styles.chatInputField}
            />
          </div>
        )}
      </div>

      {/* T key to open chat, E for inventory, 1-9 for slots, scroll for slot */}
      {!showChat && mp.phase === 'playing' && (
        <KeyListener
          onKey={(e) => {
            if (e.target instanceof HTMLInputElement) return;
            if (e.key === 't' || e.key === 'T') {
              e.preventDefault();
              setShowChat(true);
            }
            if (e.key === 'e' || e.key === 'E') {
              e.preventDefault();
              setInventoryOpen(prev => {
                const opening = !prev;
                if (opening && controlsRef.current?.isLocked) {
                  controlsRef.current.unlock();
                }
                return opening;
              });
            }
            // 1-9 keys for hotbar selection
            const digit = parseInt(e.key);
            if (digit >= 1 && digit <= 9) {
              setSelectedSlot(digit - 1);
            }
          }}
        />
      )}

      {/* Scroll wheel for hotbar slot */}
      {mp.phase === 'playing' && (
        <ScrollListener
          onScroll={(delta) => {
            setSelectedSlot(prev => {
              let next = prev + (delta > 0 ? 1 : -1);
              if (next < 0) next = 8;
              if (next > 8) next = 0;
              return next;
            });
          }}
        />
      )}

      {mp.gameMessage && (
        <div className={styles.gameToast}>{mp.gameMessage}</div>
      )}

      <button className={styles.backButton} onClick={handleBack}>
        Leave
      </button>
    </div>
  );
}

// Small helper to listen for keyboard without polluting the main component
function KeyListener({ onKey }: { onKey: (e: KeyboardEvent) => void }) {
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);
  return null;
}

// Scroll wheel listener for hotbar slot cycling
function ScrollListener({ onScroll }: { onScroll: (delta: number) => void }) {
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;

  useEffect(() => {
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      onScrollRef.current(e.deltaY);
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, []);
  return null;
}
