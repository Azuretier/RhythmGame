'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Block } from '../minecraft-world/textures';
import { createTextureAtlas } from '../minecraft-world/textures';
import { generateWorld, WorldData, WORLD_WIDTH, WORLD_DEPTH, WORLD_HEIGHT, SEA_LEVEL, CHUNK_SIZE } from '../minecraft-world/terrain';
import { buildChunkGeometry } from '../minecraft-world/chunk-builder';
import { CSGO_WEAPON_REGISTRY, ALL_CSGO_WEAPONS } from '@/lib/csgo/registry';
import type { CsgoWeaponDefinition } from '@/types/csgo';
import { GunTexture } from '../csgo/GunTexture';
import { useFPSMultiplayer } from '@/lib/fps-arena/useFPSMultiplayer';
import type { RemotePlayer } from '@/lib/fps-arena/useFPSMultiplayer';
import styles from './FPSArena.module.css';

// ====== Constants ======
const PLAYER_HEIGHT = 1.62;
const PLAYER_WIDTH = 0.3;
const MOVE_SPEED = 5.5;
const SPRINT_SPEED = 8;
const JUMP_SPEED = 7.5;
const GRAVITY = -22;
const FOG_NEAR = 24;
const FOG_FAR = 140;

const SKY_COLOR = new THREE.Color(0x87ceeb);

// ====== Enemy Bot types ======
interface EnemyBot {
    id: number;
    mesh: THREE.Group;
    position: THREE.Vector3;
    health: number;
    maxHealth: number;
    speed: number;
    direction: THREE.Vector3;
    turnTimer: number;
    color: string;
    dead: boolean;
    respawnTimer: number;
}

// ====== Kill feed entry ======
interface KillEntry {
    id: number;
    weapon: string;
    victim: string;
    time: number;
}

// ====== Weapon slot ======
interface WeaponSlot {
    weaponId: string;
    currentAmmo: number;
    reserveAmmo: number;
}

// ====== Default loadout ======
const DEFAULT_LOADOUT: WeaponSlot[] = [
    { weaponId: 'knife', currentAmmo: 0, reserveAmmo: 0 },
    { weaponId: 'glock_18', currentAmmo: 20, reserveAmmo: 120 },
    { weaponId: 'ak_47', currentAmmo: 30, reserveAmmo: 90 },
    { weaponId: 'awp', currentAmmo: 5, reserveAmmo: 30 },
    { weaponId: 'p90', currentAmmo: 50, reserveAmmo: 100 },
];

const ENEMY_NAMES = [
    'BOT Alpha', 'BOT Bravo', 'BOT Charlie', 'BOT Delta',
    'BOT Echo', 'BOT Foxtrot', 'BOT Golf', 'BOT Hotel',
    'BOT India', 'BOT Juliet', 'BOT Kilo', 'BOT Lima',
];

const ENEMY_COLORS = [
    '#e53935', '#d81b60', '#8e24aa', '#5e35b1',
    '#3949ab', '#1e88e5', '#00897b', '#43a047',
    '#c0ca33', '#ffb300', '#f4511e', '#6d4c41',
];

const MAX_ENEMIES = 8;

export default function FPSArena() {
    const mountRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState('Initializing...');
    const [progressPct, setProgressPct] = useState(0);
    const [showOverlay, setShowOverlay] = useState(true);
    const [showLobby, setShowLobby] = useState(false);
    const [playerName, setPlayerName] = useState('');
    const [roomCodeInput, setRoomCodeInput] = useState('');
    const [chatMessages, setChatMessages] = useState<{ id: string; name: string; msg: string; t: number }[]>([]);

    // Multiplayer hook
    const [mpState, mpActions] = useFPSMultiplayer(
        undefined, // onRemoteShot — handled via remote player meshes
        undefined, // onRemoteHit
        undefined, // onRemoteDied
        undefined, // onRemoteRespawn
        (playerId, playerName, message) => {
            setChatMessages(prev => [...prev.slice(-20), { id: playerId, name: playerName, msg: message, t: Date.now() }]);
        },
    );

    // Remote player mesh tracking
    const remotePlayerMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

    // Refs for multiplayer state (so animate loop doesn't trigger useEffect re-runs)
    const mpStateRef = useRef(mpState);
    const mpActionsRef = useRef(mpActions);

    // HUD state
    const [health, setHealth] = useState(100);
    const [armor, setArmor] = useState(100);
    const [kills, setKills] = useState(0);
    const [deaths, setDeaths] = useState(0);
    const [fps, setFps] = useState(0);
    const [money, setMoney] = useState(800);

    // Weapon state
    const [loadout, setLoadout] = useState<WeaponSlot[]>(DEFAULT_LOADOUT);
    const [activeSlot, setActiveSlot] = useState(2); // start with AK
    const [isReloading, setIsReloading] = useState(false);
    const [reloadProgress, setReloadProgress] = useState(0);

    // Effects state
    const [showHitMarker, setShowHitMarker] = useState(false);
    const [showMuzzleFlash, setShowMuzzleFlash] = useState(false);
    const [showDamageVignette, setShowDamageVignette] = useState(false);
    const [gunRecoil, setGunRecoil] = useState(false);
    const [killFeed, setKillFeed] = useState<KillEntry[]>([]);

    // Refs for game loop state
    const worldRef = useRef<WorldData | null>(null);
    const controlsRef = useRef<PointerLockControls | null>(null);
    const enemiesRef = useRef<EnemyBot[]>([]);
    const loadoutRef = useRef(loadout);
    const activeSlotRef = useRef(activeSlot);
    const healthRef = useRef(health);
    const armorRef = useRef(armor);
    const killsRef = useRef(kills);
    const deathsRef = useRef(deaths);
    const moneyRef = useRef(money);
    const isReloadingRef = useRef(false);
    const reloadTimerRef = useRef<number | null>(null);
    const lastFireTimeRef = useRef(0);
    const killIdRef = useRef(0);

    // 3D viewmodel refs
    const vmSceneRef = useRef<THREE.Scene | null>(null);
    const vmCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const vmGunGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
    const vmActiveGroupRef = useRef<THREE.Group | null>(null);
    const vmRecoilRef = useRef(0);
    const vmBobRef = useRef(0);
    const vmBobPhaseRef = useRef(0);

    // Audio
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    }, []);

    const playGunSound = useCallback((weaponCategory: string, slot: string) => {
        const ctx = getAudioCtx();
        const t = ctx.currentTime;

        // Create noise buffer
        const bufferSize = ctx.sampleRate * 0.3;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.ratio.value = 12;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(compressor);
        compressor.connect(ctx.destination);

        if (slot === 'melee') {
            // Knife whoosh
            filter.type = 'highpass';
            filter.frequency.value = 800;
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            noise.start(t);
            noise.stop(t + 0.15);
            return;
        }

        // Gun sounds by category
        if (weaponCategory === 'pistol') {
            filter.type = 'bandpass';
            filter.frequency.value = 2500;
            filter.Q.value = 1.5;
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            noise.start(t);
            noise.stop(t + 0.12);
            // Add a sharp transient
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.connect(oscGain);
            oscGain.connect(compressor);
            osc.frequency.setValueAtTime(500, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.05);
            oscGain.gain.setValueAtTime(0.2, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            osc.start(t);
            osc.stop(t + 0.06);
        } else if (weaponCategory === 'rifle') {
            filter.type = 'bandpass';
            filter.frequency.value = 1200;
            filter.Q.value = 0.8;
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            noise.start(t);
            noise.stop(t + 0.18);
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.connect(oscGain);
            oscGain.connect(compressor);
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
            oscGain.gain.setValueAtTime(0.35, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else if (weaponCategory === 'sniper') {
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            filter.Q.value = 0.5;
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            noise.start(t);
            noise.stop(t + 0.4);
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.connect(oscGain);
            oscGain.connect(compressor);
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
            oscGain.gain.setValueAtTime(0.5, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
        } else if (weaponCategory === 'smg') {
            filter.type = 'bandpass';
            filter.frequency.value = 3000;
            filter.Q.value = 2;
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            noise.start(t);
            noise.stop(t + 0.08);
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.connect(oscGain);
            oscGain.connect(compressor);
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);
            oscGain.gain.setValueAtTime(0.15, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            osc.start(t);
            osc.stop(t + 0.05);
        } else if (weaponCategory === 'shotgun') {
            filter.type = 'lowpass';
            filter.frequency.value = 1500;
            filter.Q.value = 0.5;
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            noise.start(t);
            noise.stop(t + 0.25);
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.connect(oscGain);
            oscGain.connect(compressor);
            osc.frequency.setValueAtTime(250, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
            oscGain.gain.setValueAtTime(0.4, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        } else {
            // LMG / heavy / default
            filter.type = 'bandpass';
            filter.frequency.value = 900;
            filter.Q.value = 0.6;
            gain.gain.setValueAtTime(0.45, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            noise.start(t);
            noise.stop(t + 0.2);
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.connect(oscGain);
            oscGain.connect(compressor);
            osc.frequency.setValueAtTime(250, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
            oscGain.gain.setValueAtTime(0.4, t);
            oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.start(t);
            osc.stop(t + 0.12);
        }
    }, [getAudioCtx]);

    // Sync refs
    useEffect(() => { loadoutRef.current = loadout; }, [loadout]);
    useEffect(() => { activeSlotRef.current = activeSlot; }, [activeSlot]);
    useEffect(() => { healthRef.current = health; }, [health]);
    useEffect(() => { armorRef.current = armor; }, [armor]);
    useEffect(() => { killsRef.current = kills; }, [kills]);
    useEffect(() => { deathsRef.current = deaths; }, [deaths]);
    useEffect(() => { moneyRef.current = money; }, [money]);

    // Clean old kill feed entries
    useEffect(() => {
        const interval = setInterval(() => {
            setKillFeed(prev => prev.filter(k => Date.now() - k.time < 5000));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Get active weapon definition
    const activeWeaponDef: CsgoWeaponDefinition | undefined =
        loadout[activeSlot] ? CSGO_WEAPON_REGISTRY[loadout[activeSlot].weaponId] : undefined;

    // ====== Fire weapon (called from click handler inside useEffect) ======
    const fireWeapon = useCallback((camera: THREE.PerspectiveCamera, scene: THREE.Scene) => {
        const slot = loadoutRef.current[activeSlotRef.current];
        if (!slot) return;

        const weapon = CSGO_WEAPON_REGISTRY[slot.weaponId];
        if (!weapon) return;

        // Check fire rate
        const now = performance.now();
        const fireInterval = 60000 / weapon.stats.fireRate; // ms between shots
        if (now - lastFireTimeRef.current < fireInterval) return;

        // Knife is melee
        if (weapon.slot === 'melee') {
            lastFireTimeRef.current = now;
            // Melee attack — check short range
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            raycaster.far = 3;

            for (const enemy of enemiesRef.current) {
                if (enemy.dead) continue;
                const dir = enemy.position.clone().sub(camera.position);
                const dist = dir.length();
                if (dist < 3) {
                    const dot = dir.normalize().dot(raycaster.ray.direction);
                    if (dot > 0.85) {
                        dealDamageToEnemy(enemy, weapon.stats.damage, weapon, camera);
                        break;
                    }
                }
            }
            setGunRecoil(true);
            vmRecoilRef.current = 1;
            playGunSound('melee', 'melee');
            setTimeout(() => setGunRecoil(false), 80);
            return;
        }

        // Grenade — skip
        if (weapon.slot === 'grenade') return;

        // Check reload
        if (isReloadingRef.current) return;

        // Check ammo
        if (slot.currentAmmo <= 0) {
            startReload();
            return;
        }

        lastFireTimeRef.current = now;

        // Consume ammo
        const newLoadout = [...loadoutRef.current];
        newLoadout[activeSlotRef.current] = { ...slot, currentAmmo: slot.currentAmmo - 1 };
        setLoadout(newLoadout);

        // Visual effects
        setShowMuzzleFlash(true);
        setTimeout(() => setShowMuzzleFlash(false), 60);
        setGunRecoil(true);
        vmRecoilRef.current = 1;
        // Determine sound category
        const soundCat = weapon.category === 'pistol' ? 'pistol'
            : weapon.category === 'smg' ? 'smg'
                : weapon.category === 'rifle' ? (weapon.slot === 'primary' && weapon.stats.fireRate < 50 ? 'sniper' : 'rifle')
                    : weapon.category === 'heavy' ? (weapon.stats.magazineSize <= 8 ? 'shotgun' : 'heavy')
                        : 'rifle';
        playGunSound(soundCat, weapon.slot);
        setTimeout(() => setGunRecoil(false), 80);

        // Raycast for hit detection
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

        // Add accuracy spread
        const spread = (1 - weapon.stats.accuracy) * 0.03;
        raycaster.ray.direction.x += (Math.random() - 0.5) * spread;
        raycaster.ray.direction.y += (Math.random() - 0.5) * spread;
        raycaster.ray.direction.z += (Math.random() - 0.5) * spread;
        raycaster.ray.direction.normalize();

        raycaster.far = weapon.stats.range * 2;

        // Check enemy hits
        let hit = false;
        for (const enemy of enemiesRef.current) {
            if (enemy.dead) continue;
            const enemyCenter = enemy.position.clone();
            enemyCenter.y += 0.9; // center mass

            // Simple sphere intersection
            const toEnemy = enemyCenter.clone().sub(raycaster.ray.origin);
            const proj = toEnemy.dot(raycaster.ray.direction);
            if (proj < 0) continue;

            const closest = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(proj));
            const dist = closest.distanceTo(enemyCenter);

            if (dist < 0.7 && proj < raycaster.far) { // hit radius
                // Headshot if close to head height
                const isHeadshot = Math.abs(closest.y - (enemy.position.y + 1.6)) < 0.3;
                const damage = isHeadshot ? weapon.stats.damage * 4 : weapon.stats.damage;

                dealDamageToEnemy(enemy, damage, weapon, camera);
                hit = true;
                break;
            }
        }

        // Bullet impact on terrain if no enemy hit
        if (!hit) {
            // Raycast against scene meshes for visual feedback
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length > 0 && intersects[0].distance < raycaster.far) {
                // Create impact particle
                createBulletImpact(scene, intersects[0].point);
            }
        }

        // Auto-reload when empty
        if (slot.currentAmmo - 1 <= 0 && slot.reserveAmmo > 0) {
            setTimeout(() => startReload(), 300);
        }
    }, []);

    // ====== Deal damage to enemy ======
    const dealDamageToEnemy = useCallback((enemy: EnemyBot, damage: number, weapon: CsgoWeaponDefinition, _camera: THREE.PerspectiveCamera) => {
        enemy.health -= damage;

        // Hit marker
        setShowHitMarker(true);
        setTimeout(() => setShowHitMarker(false), 200);

        if (enemy.health <= 0) {
            enemy.dead = true;
            enemy.respawnTimer = 5; // respawn in 5 seconds
            enemy.mesh.visible = false;

            const newKills = killsRef.current + 1;
            setKills(newKills);

            const newMoney = Math.min(16000, moneyRef.current + weapon.killReward);
            setMoney(newMoney);

            // Add to kill feed
            const entry: KillEntry = {
                id: killIdRef.current++,
                weapon: weapon.name,
                victim: ENEMY_NAMES[enemy.id % ENEMY_NAMES.length],
                time: Date.now(),
            };
            setKillFeed(prev => [entry, ...prev].slice(0, 5));
        }
    }, []);

    // ====== Reload ======
    const startReload = useCallback(() => {
        const slot = loadoutRef.current[activeSlotRef.current];
        if (!slot || isReloadingRef.current) return;

        const weapon = CSGO_WEAPON_REGISTRY[slot.weaponId];
        if (!weapon) return;
        if (slot.currentAmmo >= weapon.stats.magazineSize) return;
        if (slot.reserveAmmo <= 0) return;
        if (weapon.slot === 'melee' || weapon.slot === 'grenade') return;

        isReloadingRef.current = true;
        setIsReloading(true);
        setReloadProgress(0);

        const reloadTime = weapon.stats.reloadTime * 1000;
        const startTime = performance.now();

        const updateProgress = () => {
            const elapsed = performance.now() - startTime;
            const pct = Math.min(1, elapsed / reloadTime);
            setReloadProgress(pct);

            if (pct < 1) {
                reloadTimerRef.current = requestAnimationFrame(updateProgress);
            } else {
                // Reload complete
                const currSlot = loadoutRef.current[activeSlotRef.current];
                if (currSlot) {
                    const w = CSGO_WEAPON_REGISTRY[currSlot.weaponId];
                    if (w) {
                        const needed = w.stats.magazineSize - currSlot.currentAmmo;
                        const canTake = Math.min(needed, currSlot.reserveAmmo);
                        const newLoadout = [...loadoutRef.current];
                        newLoadout[activeSlotRef.current] = {
                            ...currSlot,
                            currentAmmo: currSlot.currentAmmo + canTake,
                            reserveAmmo: currSlot.reserveAmmo - canTake,
                        };
                        setLoadout(newLoadout);
                    }
                }
                isReloadingRef.current = false;
                setIsReloading(false);
                setReloadProgress(0);
            }
        };

        reloadTimerRef.current = requestAnimationFrame(updateProgress);
    }, []);

    // ====== Create bullet impact particles ======
    const createBulletImpact = useCallback((scene: THREE.Scene, point: THREE.Vector3) => {
        const particles: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
            const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
            const mat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(point);
            scene.add(mesh);
            particles.push(mesh);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 2,
                (Math.random() - 0.5) * 3
            );

            let life = 0.5;
            const animate = () => {
                life -= 0.016;
                if (life <= 0) {
                    scene.remove(mesh);
                    geo.dispose();
                    mat.dispose();
                    return;
                }
                mesh.position.add(vel.clone().multiplyScalar(0.016));
                vel.y -= 9.8 * 0.016;
                mat.opacity = life * 2;
                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }
    }, []);

    // ====== 3D World Rendering ======
    useEffect(() => {
        if (!mountRef.current) return;

        const container = mountRef.current;
        let disposed = false;

        // ====== Scene Setup ======
        const scene = new THREE.Scene();
        scene.background = SKY_COLOR.clone();
        scene.fog = new THREE.Fog(SKY_COLOR.clone(), FOG_NEAR, FOG_FAR);

        const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.1, 300);

        const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = false;
        renderer.autoClear = false;
        container.appendChild(renderer.domElement);

        // ====== Viewmodel Scene (separate scene for 3D gun) ======
        const vmScene = new THREE.Scene();
        vmSceneRef.current = vmScene;
        const vmCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10);
        vmCameraRef.current = vmCamera;

        // Viewmodel lighting
        const vmAmbient = new THREE.AmbientLight(0xffffff, 0.7);
        vmScene.add(vmAmbient);
        const vmDirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        vmDirLight.position.set(1, 2, 3);
        vmScene.add(vmDirLight);
        const vmFillLight = new THREE.DirectionalLight(0xaaccff, 0.4);
        vmFillLight.position.set(-2, 0, -1);
        vmScene.add(vmFillLight);

        // ====== Build procedural 3D gun meshes ======
        const gunMetal = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.3 });
        const gunMetalLight = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.85, roughness: 0.35 });
        const gunWood = new THREE.MeshStandardMaterial({ color: 0x5D4037, metalness: 0.1, roughness: 0.7 });
        const gunGreen = new THREE.MeshStandardMaterial({ color: 0x2E7D32, metalness: 0.8, roughness: 0.3 });
        const gunPolymer = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.3, roughness: 0.6 });

        function buildGlockMesh(): THREE.Group {
            const g = new THREE.Group();
            // Slide
            const slide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.2), gunMetal);
            slide.position.set(0, 0.025, -0.02);
            g.add(slide);
            // Barrel
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), gunMetal);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.03, -0.14);
            g.add(barrel);
            // Frame/grip
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.03), gunPolymer);
            frame.position.set(0, -0.04, 0.04);
            frame.rotation.x = 0.15;
            g.add(frame);
            // Trigger guard
            const trigGuard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.04), gunMetal);
            trigGuard.position.set(0, -0.015, -0.01);
            g.add(trigGuard);
            // Magazine
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.03), gunMetal);
            mag.position.set(0, -0.06, 0.03);
            mag.rotation.x = 0.15;
            g.add(mag);
            g.scale.setScalar(2.8);
            return g;
        }

        function buildAWPMesh(): THREE.Group {
            const g = new THREE.Group();
            // Main body / receiver
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), gunGreen);
            body.position.set(0, 0, 0);
            g.add(body);
            // Long barrel
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.45, 8), gunMetal);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.01, -0.48);
            g.add(barrel);
            // Scope mount
            const scopeMount = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.08), gunMetal);
            scopeMount.position.set(0, 0.04, -0.05);
            g.add(scopeMount);
            // Scope body
            const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), gunMetal);
            scope.rotation.x = Math.PI / 2;
            scope.position.set(0, 0.06, -0.05);
            g.add(scope);
            // Scope lenses
            const lensMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, metalness: 0.1, roughness: 0.1 });
            const lensFront = new THREE.Mesh(new THREE.CircleGeometry(0.016, 8), lensMat);
            lensFront.position.set(0, 0.06, -0.11);
            g.add(lensFront);
            // Stock
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.18), gunGreen);
            stock.position.set(0, -0.01, 0.32);
            g.add(stock);
            // Grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.035), gunGreen);
            grip.position.set(0, -0.055, 0.1);
            grip.rotation.x = 0.2;
            g.add(grip);
            // Magazine
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.05), gunMetal);
            mag.position.set(0, -0.06, 0.02);
            mag.rotation.x = 0.05;
            g.add(mag);
            // Bolt handle
            const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6), gunMetal);
            bolt.rotation.z = Math.PI / 2;
            bolt.position.set(0.04, 0.02, 0.05);
            g.add(bolt);
            g.scale.setScalar(2.0);
            return g;
        }

        function buildP90Mesh(): THREE.Group {
            const g = new THREE.Group();
            // Main body (bullpup, rounded)
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.35), gunPolymer);
            body.position.set(0, 0, 0);
            g.add(body);
            // Top magazine (signature P90 feature)
            const topMag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.25), gunMetalLight);
            topMag.position.set(0, 0.045, -0.03);
            g.add(topMag);
            // Barrel shroud
            const barrelShroud = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.12), gunPolymer);
            barrelShroud.position.set(0, 0, -0.22);
            g.add(barrelShroud);
            // Barrel
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), gunMetal);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.005, -0.32);
            g.add(barrel);
            // Grip (integrated)
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.03), gunPolymer);
            grip.position.set(0, -0.06, 0.06);
            grip.rotation.x = 0.3;
            g.add(grip);
            // Trigger guard
            const trigGuard = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.015, 0.05), gunPolymer);
            trigGuard.position.set(0, -0.04, -0.01);
            g.add(trigGuard);
            // Small optic rail
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.008, 0.1), gunMetal);
            rail.position.set(0, 0.06, -0.12);
            g.add(rail);
            g.scale.setScalar(2.2);
            return g;
        }

        // Map weapon IDs to their viewmodel groups
        const vmGunGroups = new Map<string, THREE.Group>();
        vmGunGroupsRef.current = vmGunGroups;

        // Build procedural guns
        const glockGroup = buildGlockMesh();
        glockGroup.visible = false;
        vmScene.add(glockGroup);
        vmGunGroups.set('glock_18', glockGroup);

        const awpGroup = buildAWPMesh();
        awpGroup.visible = false;
        vmScene.add(awpGroup);
        vmGunGroups.set('awp', awpGroup);

        const p90Group = buildP90Mesh();
        p90Group.visible = false;
        vmScene.add(p90Group);
        vmGunGroups.set('p90', p90Group);

        // Load AK-12 GLTF model for AK-47 slot
        const gltfLoader = new GLTFLoader();
        gltfLoader.load('/models/ak12.gltf', (gltf) => {
            if (disposed) return;
            const akModel = gltf.scene;
            // Wrap in container to center the model
            const akContainer = new THREE.Group();
            akModel.scale.setScalar(0.00015);
            akModel.rotation.set(0, -Math.PI / 2, 0);
            // Compute bounding box and center the model
            const box = new THREE.Box3().setFromObject(akModel);
            const center = box.getCenter(new THREE.Vector3());
            akModel.position.sub(center); // center the model at origin
            akContainer.add(akModel);
            akContainer.visible = false;
            vmScene.add(akContainer);
            vmGunGroups.set('ak_47', akContainer);
            // If AK is currently selected, make it visible
            if (loadoutRef.current[activeSlotRef.current]?.weaponId === 'ak_47') {
                akContainer.visible = true;
                vmActiveGroupRef.current = akContainer;
            }
        }, undefined, (err) => {
            console.warn('Failed to load AK-12 model:', err);
            // Fallback: build a procedural AK
            const fallbackAK = buildFallbackAKMesh();
            fallbackAK.visible = false;
            vmScene.add(fallbackAK);
            vmGunGroups.set('ak_47', fallbackAK);
        });

        function buildFallbackAKMesh(): THREE.Group {
            const g = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.5), gunWood);
            g.add(body);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.3, 8), gunMetal);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.01, -0.38);
            g.add(barrel);
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.04), gunMetal);
            mag.position.set(0, -0.06, 0);
            mag.rotation.x = 0.15;
            g.add(mag);
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.15), gunWood);
            stock.position.set(0, -0.01, 0.3);
            g.add(stock);
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), gunWood);
            grip.position.set(0, -0.05, 0.12);
            grip.rotation.x = 0.2;
            g.add(grip);
            const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.2), gunMetal);
            gasBlock.position.set(0, 0.04, -0.18);
            g.add(gasBlock);
            g.scale.setScalar(2.2);
            return g;
        }

        // Show initial weapon viewmodel (if not knife)
        const initWeaponId = loadoutRef.current[activeSlotRef.current]?.weaponId;
        if (initWeaponId && initWeaponId !== 'knife') {
            const initGroup = vmGunGroups.get(initWeaponId);
            if (initGroup) {
                initGroup.visible = true;
                vmActiveGroupRef.current = initGroup;
            }
        }

        // Viewmodel positioning constants
        const VM_POS_X = 0.25;
        const VM_POS_Y = -0.18;
        const VM_POS_Z = -0.45;

        // ====== Texture Atlas ======
        const atlas = createTextureAtlas();
        const texture = new THREE.CanvasTexture(atlas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestMipMapLinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;

        const solidMaterial = new THREE.MeshLambertMaterial({ map: texture, side: THREE.FrontSide });
        const waterMaterial = new THREE.MeshLambertMaterial({
            map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.65, depthWrite: false,
        });

        // ====== Lighting ======
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
        scene.add(ambientLight);
        const sunLight = new THREE.DirectionalLight(0xfff5e0, 0.85);
        sunLight.position.set(80, 120, 60);
        scene.add(sunLight);
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.3);
        scene.add(hemiLight);

        // ====== Sun ======
        const sunGeo = new THREE.SphereGeometry(5, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(80, 160, 60);
        scene.add(sunMesh);

        // ====== World Generation (deferred) ======
        const seed = 55555;

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
                            if (solid) scene.add(new THREE.Mesh(solid, solidMaterial));
                            if (water) {
                                const m = new THREE.Mesh(water, waterMaterial);
                                m.renderOrder = 1;
                                scene.add(m);
                            }
                            built++;
                        }

                        const pct = 40 + Math.floor((built / totalChunks) * 50);
                        setProgressPct(pct);
                        setProgress(`Building meshes... ${built}/${totalChunks} chunks`);

                        if (chunkQueue.length > 0) {
                            setTimeout(buildBatch, 0);
                        } else {
                            setProgress('Spawning enemies...');
                            setProgressPct(95);
                            setTimeout(() => {
                                if (!disposed) spawnEnemies(world, scene);
                                finishSetup(world);
                            }, 50);
                        }
                    }

                    buildBatch();
                }, 16);
            }, 16);
        }, 50);

        // ====== Create enemy bot mesh ======
        function createEnemyMesh(color: string): THREE.Group {
            const group = new THREE.Group();

            // Body
            const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
            const bodyMat = new THREE.MeshLambertMaterial({ color });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.6;
            group.add(body);

            // Head
            const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
            const headMat = new THREE.MeshLambertMaterial({ color: 0xf5d6b8 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 1.55;
            group.add(head);

            // Left arm
            const armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
            const armMat = new THREE.MeshLambertMaterial({ color });
            const lArm = new THREE.Mesh(armGeo, armMat);
            lArm.position.set(-0.4, 0.6, 0);
            group.add(lArm);

            // Right arm
            const rArm = new THREE.Mesh(armGeo.clone(), armMat.clone());
            rArm.position.set(0.4, 0.6, 0);
            group.add(rArm);

            // Legs
            const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
            const legMat = new THREE.MeshLambertMaterial({ color: '#333' });
            const lLeg = new THREE.Mesh(legGeo, legMat);
            lLeg.position.set(-0.15, -0.15, 0);
            group.add(lLeg);
            const rLeg = new THREE.Mesh(legGeo.clone(), legMat.clone());
            rLeg.position.set(0.15, -0.15, 0);
            group.add(rLeg);

            // Health bar background
            const hpBgGeo = new THREE.PlaneGeometry(0.8, 0.08);
            const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.7, depthTest: false });
            const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
            hpBg.position.y = 2.0;
            hpBg.renderOrder = 999;
            group.add(hpBg);

            // Health bar fill
            const hpFillGeo = new THREE.PlaneGeometry(0.78, 0.06);
            const hpFillMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, depthTest: false });
            const hpFill = new THREE.Mesh(hpFillGeo, hpFillMat);
            hpFill.position.y = 2.0;
            hpFill.position.z = 0.001;
            hpFill.renderOrder = 1000;
            group.add(hpFill);

            group.userData.hpFill = hpFill;
            group.userData.hpBg = hpBg;

            return group;
        }

        // ====== Find ground Y at position ======
        function findGroundY(world: WorldData, x: number, z: number): number {
            const bx = Math.floor(x);
            const bz = Math.floor(z);
            if (bx < 0 || bx >= WORLD_WIDTH || bz < 0 || bz >= WORLD_DEPTH) return SEA_LEVEL + 2;
            for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
                const block = world.getBlock(bx, y, bz);
                if (block !== Block.Air && block !== Block.Water) {
                    return y + 1;
                }
            }
            return SEA_LEVEL + 2;
        }

        // ====== Spawn enemies ======
        function spawnEnemies(world: WorldData, scene: THREE.Scene) {
            const enemies: EnemyBot[] = [];
            const centerX = WORLD_WIDTH / 2;
            const centerZ = WORLD_DEPTH / 2;

            for (let i = 0; i < MAX_ENEMIES; i++) {
                const angle = (i / MAX_ENEMIES) * Math.PI * 2;
                const radius = 15 + Math.random() * 25;
                const x = centerX + Math.cos(angle) * radius;
                const z = centerZ + Math.sin(angle) * radius;
                const y = findGroundY(world, x, z);

                const color = ENEMY_COLORS[i % ENEMY_COLORS.length];
                const mesh = createEnemyMesh(color);
                mesh.position.set(x, y, z);
                scene.add(mesh);

                enemies.push({
                    id: i,
                    mesh,
                    position: new THREE.Vector3(x, y, z),
                    health: 100,
                    maxHealth: 100,
                    speed: 1.5 + Math.random() * 1.5,
                    direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
                    turnTimer: 2 + Math.random() * 3,
                    color,
                    dead: false,
                    respawnTimer: 0,
                });
            }

            enemiesRef.current = enemies;
        }

        // ====== Is solid block ======
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

        // ====== Controls ======
        const controls = new PointerLockControls(camera, renderer.domElement);
        controlsRef.current = controls;

        controls.addEventListener('lock', () => setShowOverlay(false));
        controls.addEventListener('unlock', () => setShowOverlay(true));

        const moveState = {
            forward: false, backward: false, left: false, right: false,
            jump: false, sprint: false,
        };

        let velocityY = 0;
        let onGround = false;

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
                case 'KeyR': startReload(); break;
                case 'Digit1': switchWeapon(0); break;
                case 'Digit2': switchWeapon(1); break;
                case 'Digit3': switchWeapon(2); break;
                case 'Digit4': switchWeapon(3); break;
                case 'Digit5': switchWeapon(4); break;
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

        function switchWeapon(slotIndex: number) {
            if (slotIndex >= 0 && slotIndex < loadoutRef.current.length) {
                // Cancel reload
                if (isReloadingRef.current) {
                    isReloadingRef.current = false;
                    setIsReloading(false);
                    setReloadProgress(0);
                    if (reloadTimerRef.current) {
                        cancelAnimationFrame(reloadTimerRef.current);
                        reloadTimerRef.current = null;
                    }
                }
                setActiveSlot(slotIndex);

                // Switch 3D viewmodel
                const newWeaponId = loadoutRef.current[slotIndex]?.weaponId;
                // Hide current
                if (vmActiveGroupRef.current) {
                    vmActiveGroupRef.current.visible = false;
                    vmActiveGroupRef.current = null;
                }
                // Show new (if not knife)
                if (newWeaponId && newWeaponId !== 'knife') {
                    const group = vmGunGroupsRef.current.get(newWeaponId);
                    if (group) {
                        group.visible = true;
                        vmActiveGroupRef.current = group;
                    }
                }
            }
        }

        // wheel weapon switch
        const onWheel = (e: WheelEvent) => {
            if (!controls.isLocked) return;
            const dir = e.deltaY > 0 ? 1 : -1;
            const totalSlots = loadoutRef.current.length;
            const next = (activeSlotRef.current + dir + totalSlots) % totalSlots;
            switchWeapon(next);
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('wheel', onWheel);

        // Mouse click — fire
        let mouseDown = false;
        let fireInterval: number | null = null;

        const onMouseDown = (e: MouseEvent) => {
            if (!controls.isLocked) {
                controls.lock();
                return;
            }
            if (e.button === 0) {
                mouseDown = true;
                fireWeapon(camera, scene);

                // Auto-fire for automatic weapons
                const slot = loadoutRef.current[activeSlotRef.current];
                if (slot) {
                    const weapon = CSGO_WEAPON_REGISTRY[slot.weaponId];
                    if (weapon && weapon.stats.fireRate > 200) { // auto weapons
                        fireInterval = window.setInterval(() => {
                            if (mouseDown && controls.isLocked) {
                                fireWeapon(camera, scene);
                            }
                        }, 60000 / weapon.stats.fireRate);
                    }
                }
            }
        };

        const onMouseUp = () => {
            mouseDown = false;
            if (fireInterval !== null) {
                clearInterval(fireInterval);
                fireInterval = null;
            }
        };

        container.addEventListener('mousedown', onMouseDown);
        container.addEventListener('mouseup', onMouseUp);

        // ====== Finish Setup ======
        function finishSetup(world: WorldData) {
            if (disposed) return;

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

        // ====== Animation Loop ======
        let prevTime = performance.now();
        let frameCount = 0;
        let fpsTimer = 0;

        function animate() {
            if (disposed) return;
            requestAnimationFrame(animate);

            const now = performance.now();
            const dt = Math.min((now - prevTime) / 1000, 0.1);
            prevTime = now;

            // FPS
            frameCount++;
            fpsTimer += dt;
            if (fpsTimer >= 1) {
                setFps(frameCount);
                frameCount = 0;
                fpsTimer = 0;
            }

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
                let feetY = pos.y - PLAYER_HEIGHT;

                const newX = pos.x + move.x;
                if (!checkCollision(newX, feetY, pos.z)) pos.x = newX;

                const newZ = pos.z + move.z;
                if (!checkCollision(pos.x, feetY, newZ)) pos.z = newZ;

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
                            if (pos.y < blockTop + PLAYER_HEIGHT) {
                                pos.y = blockTop + PLAYER_HEIGHT;
                                feetY = pos.y - PLAYER_HEIGHT;
                            }
                            if (velocityY < 0) velocityY = 0;
                            onGround = true;
                        } else if (velocityY <= 0 && isSolid(colX, feetY - 0.06, colZ)) {
                            const blockTop = Math.floor(feetY - 0.06) + 1;
                            const gap = feetY - blockTop;
                            if (gap >= 0 && gap < 0.06) {
                                pos.y = blockTop + PLAYER_HEIGHT;
                                if (velocityY < 0) velocityY = 0;
                                onGround = true;
                            }
                        }
                    }
                }

                if (onGround && moveState.jump) {
                    velocityY = JUMP_SPEED;
                    onGround = false;
                }

                if (velocityY > 0) {
                    for (const dx of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
                        for (const dz of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
                            if (isSolid(pos.x + dx, pos.y + 0.1, pos.z + dz)) velocityY = 0;
                        }
                    }
                }

                pos.x = Math.max(PLAYER_WIDTH + 0.1, Math.min(WORLD_WIDTH - PLAYER_WIDTH - 0.1, pos.x));
                pos.z = Math.max(PLAYER_WIDTH + 0.1, Math.min(WORLD_DEPTH - PLAYER_WIDTH - 0.1, pos.z));
                if (pos.y < PLAYER_HEIGHT + 1) {
                    pos.y = PLAYER_HEIGHT + 1;
                    velocityY = 0;
                }
            }

            // ====== Update Enemies ======
            for (const enemy of enemiesRef.current) {
                if (enemy.dead) {
                    enemy.respawnTimer -= dt;
                    if (enemy.respawnTimer <= 0) {
                        // Respawn
                        const angle = Math.random() * Math.PI * 2;
                        const radius = 20 + Math.random() * 30;
                        const cx = WORLD_WIDTH / 2;
                        const cz = WORLD_DEPTH / 2;
                        const nx = cx + Math.cos(angle) * radius;
                        const nz = cz + Math.sin(angle) * radius;
                        const ny = worldRef.current ? findGroundY(worldRef.current, nx, nz) : SEA_LEVEL + 2;

                        enemy.position.set(nx, ny, nz);
                        enemy.mesh.position.copy(enemy.position);
                        enemy.health = enemy.maxHealth;
                        enemy.dead = false;
                        enemy.mesh.visible = true;
                        enemy.direction = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                        enemy.turnTimer = 2 + Math.random() * 3;
                    }
                    continue;
                }

                // Move enemy
                enemy.turnTimer -= dt;
                if (enemy.turnTimer <= 0) {
                    // Turn toward player probabilistically
                    if (controls.isLocked && Math.random() < 0.4) {
                        const toPlayer = camera.position.clone().sub(enemy.position);
                        toPlayer.y = 0;
                        toPlayer.normalize();
                        enemy.direction.lerp(toPlayer, 0.6).normalize();
                    } else {
                        enemy.direction = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                    }
                    enemy.turnTimer = 1.5 + Math.random() * 3;
                }

                const moveX = enemy.direction.x * enemy.speed * dt;
                const moveZ = enemy.direction.z * enemy.speed * dt;
                const nx = enemy.position.x + moveX;
                const nz = enemy.position.z + moveZ;

                // Bounds check
                if (nx > 3 && nx < WORLD_WIDTH - 3 && nz > 3 && nz < WORLD_DEPTH - 3) {
                    if (!isSolid(nx, enemy.position.y, nz) && !isSolid(nx, enemy.position.y + 1, nz)) {
                        enemy.position.x = nx;
                        enemy.position.z = nz;
                    } else {
                        // Turn away from obstacle
                        enemy.direction.negate();
                        enemy.turnTimer = 0.5;
                    }
                } else {
                    enemy.direction.negate();
                    enemy.turnTimer = 0.5;
                }

                // Snap to ground
                if (worldRef.current) {
                    const groundY = findGroundY(worldRef.current, enemy.position.x, enemy.position.z);
                    enemy.position.y += (groundY - enemy.position.y) * 0.3;
                }

                enemy.mesh.position.copy(enemy.position);

                // Face movement direction
                enemy.mesh.rotation.y = Math.atan2(enemy.direction.x, enemy.direction.z);

                // Update health bar
                const hpFill = enemy.mesh.userData.hpFill as THREE.Mesh;
                const hpBg = enemy.mesh.userData.hpBg as THREE.Mesh;
                if (hpFill && hpBg) {
                    const pct = enemy.health / enemy.maxHealth;
                    hpFill.scale.x = Math.max(0.01, pct);
                    hpFill.position.x = -(1 - pct) * 0.39;
                    (hpFill.material as THREE.MeshBasicMaterial).color.set(
                        pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xef4444
                    );
                    // Make health bars face camera
                    hpFill.lookAt(camera.position);
                    hpBg.lookAt(camera.position);
                }

                // Enemy attacks player if close
                if (controls.isLocked) {
                    const distToPlayer = enemy.position.distanceTo(camera.position);
                    if (distToPlayer < 2.5 && Math.random() < dt * 0.5) {
                        // Enemy hits player
                        const dmg = 5 + Math.floor(Math.random() * 10);
                        let newArmor = armorRef.current;
                        let newHealth = healthRef.current;

                        if (newArmor > 0) {
                            const armorAbsorb = Math.min(dmg * 0.5, newArmor);
                            newArmor -= armorAbsorb;
                            newHealth -= (dmg - armorAbsorb);
                        } else {
                            newHealth -= dmg;
                        }

                        setArmor(Math.max(0, Math.round(newArmor)));
                        setHealth(Math.max(0, Math.round(newHealth)));
                        setShowDamageVignette(true);
                        setTimeout(() => setShowDamageVignette(false), 500);

                        if (newHealth <= 0) {
                            // Player death — respawn
                            const newDeaths = deathsRef.current + 1;
                            setDeaths(newDeaths);
                            setHealth(100);
                            setArmor(100);

                            // Respawn at center
                            const spawnX = Math.floor(WORLD_WIDTH / 2);
                            const spawnZ = Math.floor(WORLD_DEPTH / 2);
                            let spawnY = SEA_LEVEL + 5;
                            if (worldRef.current) {
                                for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
                                    const b = worldRef.current.getBlock(spawnX, y, spawnZ);
                                    if (b !== Block.Air && b !== Block.Water) {
                                        spawnY = y + 1 + PLAYER_HEIGHT;
                                        break;
                                    }
                                }
                            }
                            camera.position.set(spawnX + 0.5, spawnY, spawnZ + 0.5);

                            // Reset loadout ammo
                            setLoadout(DEFAULT_LOADOUT.map(s => ({ ...s })));
                        }
                    }
                }
            }

            // ====== Update Viewmodel ======
            if (vmActiveGroupRef.current && vmSceneRef.current && vmCameraRef.current) {
                const vm = vmActiveGroupRef.current;
                const isMoving = controls.isLocked && (moveState.forward || moveState.backward || moveState.left || moveState.right);
                const isSprinting = moveState.sprint && moveState.forward;

                // Bob animation
                if (isMoving) {
                    vmBobPhaseRef.current += dt * (isSprinting ? 12 : 8);
                    vmBobRef.current = Math.sin(vmBobPhaseRef.current) * 0.012;
                } else {
                    // Idle sway
                    vmBobPhaseRef.current += dt * 1.5;
                    vmBobRef.current = Math.sin(vmBobPhaseRef.current) * 0.003;
                }

                // Recoil decay
                vmRecoilRef.current *= 0.85;
                if (vmRecoilRef.current < 0.001) vmRecoilRef.current = 0;

                vm.position.set(
                    VM_POS_X + Math.sin(vmBobPhaseRef.current * 0.5) * (isMoving ? 0.008 : 0.002),
                    VM_POS_Y + vmBobRef.current - vmRecoilRef.current * 0.02,
                    VM_POS_Z + vmRecoilRef.current * 0.04
                );
                vm.rotation.x = -vmRecoilRef.current * 0.15;
            }

            // ====== Broadcast position to multiplayer ======
            if (controls.isLocked && mpStateRef.current.phase === 'playing') {
                const slotData = loadoutRef.current[activeSlotRef.current];
                mpActionsRef.current.sendPosition(
                    camera.position.x, camera.position.y, camera.position.z,
                    camera.rotation.x, camera.rotation.y,
                    slotData?.weaponId || 'knife', healthRef.current
                );
            }

            // ====== Update remote player meshes ======
            const remoteMap = mpStateRef.current.remotePlayers;
            const myId = mpStateRef.current.myPlayerId;
            const existingMeshIds = new Set(remotePlayerMeshesRef.current.keys());
            for (const [id, rp] of remoteMap) {
                if (id === myId) continue;
                let mesh = remotePlayerMeshesRef.current.get(id);
                if (!mesh) {
                    // Create a humanoid mesh for this remote player
                    mesh = createRemotePlayerMesh(rp.color, rp.name);
                    scene.add(mesh);
                    remotePlayerMeshesRef.current.set(id, mesh);
                }
                // Interpolate position smoothly
                const targetPos = new THREE.Vector3(rp.position.x, rp.position.y - PLAYER_HEIGHT / 2, rp.position.z);
                mesh.position.lerp(targetPos, 0.3);
                mesh.rotation.y = rp.position.ry + Math.PI;
                // Update name label and hp bar
                const hpFill = mesh.userData.hpFill as THREE.Mesh;
                if (hpFill) {
                    const pct = Math.max(0, rp.position.health / 100);
                    hpFill.scale.x = Math.max(0.01, pct);
                    hpFill.position.x = -(1 - pct) * 0.39;
                    (hpFill.material as THREE.MeshBasicMaterial).color.set(
                        pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfbbf24 : 0xef4444
                    );
                    hpFill.lookAt(camera.position);
                    const hpBg = mesh.userData.hpBg as THREE.Mesh;
                    if (hpBg) hpBg.lookAt(camera.position);
                }
                existingMeshIds.delete(id);
            }
            // Remove meshes for disconnected players
            for (const staleId of existingMeshIds) {
                const staleMesh = remotePlayerMeshesRef.current.get(staleId);
                if (staleMesh) {
                    scene.remove(staleMesh);
                    remotePlayerMeshesRef.current.delete(staleId);
                }
            }

            // Render main scene then viewmodel on top
            renderer.clear();
            renderer.render(scene, camera);
            if (vmSceneRef.current && vmCameraRef.current) {
                renderer.clearDepth();
                renderer.render(vmSceneRef.current, vmCameraRef.current);
            }
        }

        const firstFrame = requestAnimationFrame(animate);

        // ====== Resize ======
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            if (vmCameraRef.current) {
                vmCameraRef.current.aspect = window.innerWidth / window.innerHeight;
                vmCameraRef.current.updateProjectionMatrix();
            }
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // ====== Cleanup ======
        return () => {
            disposed = true;
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('wheel', onWheel);
            container.removeEventListener('mousedown', onMouseDown);
            container.removeEventListener('mouseup', onMouseUp);
            cancelAnimationFrame(firstFrame);
            if (fireInterval !== null) clearInterval(fireInterval);

            if (controlsRef.current) {
                controlsRef.current.dispose();
                controlsRef.current = null;
            }

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

            // Cleanup viewmodel scene
            vmScene.traverse((obj) => {
                if (obj instanceof THREE.Mesh) {
                    obj.geometry?.dispose();
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m) => m.dispose());
                    } else {
                        obj.material?.dispose();
                    }
                }
            });
            vmSceneRef.current = null;
            vmCameraRef.current = null;
            vmActiveGroupRef.current = null;
            vmGunGroupsRef.current = new Map();

            texture.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, [fireWeapon, startReload, createBulletImpact]);

    // Sync multiplayer refs (lightweight, no scene re-init)
    useEffect(() => { mpStateRef.current = mpState; }, [mpState]);
    useEffect(() => { mpActionsRef.current = mpActions; }, [mpActions]);

    // Helper to create a remote player mesh
    function createRemotePlayerMesh(color: string, name: string): THREE.Group {
        const group = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color });

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.3), mat);
        body.position.y = 0.45;
        group.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
        head.position.y = 1.1;
        group.add(head);

        // Arms
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), mat);
        armL.position.set(-0.4, 0.5, 0);
        group.add(armL);
        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), mat);
        armR.position.set(0.4, 0.5, 0);
        group.add(armR);

        // Legs
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), mat);
        legL.position.set(-0.15, -0.15, 0);
        group.add(legL);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), mat);
        legR.position.set(0.15, -0.15, 0);
        group.add(legR);

        // Health bar background
        const hpBg = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.08),
            new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.6, depthTest: false })
        );
        hpBg.position.y = 1.6;
        hpBg.renderOrder = 999;
        group.add(hpBg);
        group.userData.hpBg = hpBg;

        // Health bar fill
        const hpFill = new THREE.Mesh(
            new THREE.PlaneGeometry(0.78, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x4ade80, depthTest: false })
        );
        hpFill.position.y = 1.6;
        hpFill.position.z = 0.001;
        hpFill.renderOrder = 1000;
        group.add(hpFill);
        group.userData.hpFill = hpFill;

        // Name label (using a canvas texture sprite)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx2d = canvas.getContext('2d');
        if (ctx2d) {
            ctx2d.fillStyle = 'rgba(0,0,0,0.5)';
            ctx2d.fillRect(0, 0, 256, 64);
            ctx2d.fillStyle = color;
            ctx2d.font = 'bold 28px sans-serif';
            ctx2d.textAlign = 'center';
            ctx2d.fillText(name, 128, 42);
        }
        const nameTexture = new THREE.CanvasTexture(canvas);
        const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTexture, depthTest: false }));
        nameSprite.position.y = 1.85;
        nameSprite.scale.set(1.2, 0.3, 1);
        nameSprite.renderOrder = 1001;
        group.add(nameSprite);

        return group;
    }

    // ====== Active weapon info ======
    const activeSlotData = loadout[activeSlot];
    const activeWep = activeSlotData ? CSGO_WEAPON_REGISTRY[activeSlotData.weaponId] : undefined;

    return (
        <div className={styles.container} ref={mountRef}>
            {/* Loading Screen */}
            {loading && (
                <div className={styles.loadingScreen}>
                    <div className={styles.loadingTitle}>FPS ARENA</div>
                    <div className={styles.loadingSubtitle}>Counter-Strike × Minecraft</div>
                    <div className={styles.loadingBarOuter}>
                        <div className={styles.loadingBarInner} style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className={styles.loadingText}>{progress}</div>
                </div>
            )}

            {/* Multiplayer Lobby */}
            {!loading && showOverlay && showLobby && (
                <div className={styles.overlay} style={{ zIndex: 100 }}>
                    <div style={{ background: 'rgba(0,0,0,0.85)', borderRadius: 12, padding: 32, maxWidth: 500, width: '90%', color: '#fff', fontFamily: 'sans-serif' }}>
                        <h2 style={{ margin: '0 0 16px', fontSize: 24, textAlign: 'center' }}>🎯 FPS Arena — Multiplayer</h2>

                        {mpState.phase === 'menu' && (
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontSize: 12, opacity: 0.7 }}>Your Name</label>
                                    <input
                                        value={playerName}
                                        onChange={e => setPlayerName(e.target.value)}
                                        placeholder="Enter name..."
                                        maxLength={16}
                                        style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #555', background: '#222', color: '#fff', fontSize: 16 }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    <button
                                        onClick={() => { mpActions.connect(); setTimeout(() => mpActions.createRoom(playerName || 'Player'), 500); }}
                                        disabled={!playerName.trim()}
                                        style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#4ade80', color: '#000', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}
                                    >Create Room</button>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    <input
                                        value={roomCodeInput}
                                        onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                                        placeholder="Room code"
                                        maxLength={5}
                                        style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #555', background: '#222', color: '#fff', fontSize: 16, textTransform: 'uppercase', letterSpacing: 4 }}
                                    />
                                    <button
                                        onClick={() => { mpActions.connect(); setTimeout(() => mpActions.joinRoom(roomCodeInput, playerName || 'Player'), 500); }}
                                        disabled={!playerName.trim() || roomCodeInput.length < 4}
                                        style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#60a5fa', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                                    >Join</button>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => { mpActions.connect(); setTimeout(() => mpActions.refreshRooms(), 500); }}
                                        style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#aaa', cursor: 'pointer' }}
                                    >Refresh Rooms</button>
                                    <button
                                        onClick={() => setShowLobby(false)}
                                        style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#aaa', cursor: 'pointer' }}
                                    >Solo Mode</button>
                                </div>
                                {mpState.publicRooms.length > 0 && (
                                    <div style={{ marginTop: 16 }}>
                                        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Open Rooms</div>
                                        {mpState.publicRooms.map(r => (
                                            <div key={r.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#333', borderRadius: 6, marginBottom: 4 }}>
                                                <span>{r.name} ({r.playerCount}/{r.maxPlayers})</span>
                                                <button
                                                    onClick={() => { mpActions.connect(); setTimeout(() => mpActions.joinRoom(r.code, playerName || 'Player'), 500); }}
                                                    style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: '#60a5fa', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}
                                                >Join</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {mpState.error && <div style={{ color: '#ef4444', marginTop: 12, textAlign: 'center' }}>{mpState.error}</div>}
                            </>
                        )}

                        {(mpState.phase === 'lobby' || mpState.phase === 'countdown') && mpState.roomState && (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                    <div style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 8, color: '#4ade80' }}>{mpState.roomState.code}</div>
                                    <div style={{ fontSize: 12, opacity: 0.6 }}>Share this code with friends</div>
                                </div>
                                {mpState.phase === 'countdown' && mpState.countdown !== null && (
                                    <div style={{ textAlign: 'center', fontSize: 48, fontWeight: 'bold', color: '#fbbf24', marginBottom: 16 }}>{mpState.countdown}</div>
                                )}
                                <div style={{ marginBottom: 16 }}>
                                    {mpState.roomState.players.map(p => (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: p.id === mpState.myPlayerId ? '#1a3a2a' : '#222', borderRadius: 6, marginBottom: 4, borderLeft: `3px solid ${p.color}` }}>
                                            <span>{p.name} {p.id === mpState.roomState!.hostId ? '👑' : ''}</span>
                                            <span style={{ color: p.ready ? '#4ade80' : '#666' }}>{p.ready ? '✓ Ready' : 'Not Ready'}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => mpActions.setReady(!mpState.roomState!.players.find(p => p.id === mpState.myPlayerId)?.ready)}
                                        style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#4ade80', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                                    >Toggle Ready</button>
                                    {mpState.myPlayerId === mpState.roomState.hostId && (
                                        <button
                                            onClick={() => mpActions.startGame()}
                                            style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#f59e0b', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                                        >Start Game</button>
                                    )}
                                    <button
                                        onClick={() => { mpActions.leaveRoom(); }}
                                        style={{ padding: '12px 20px', borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                    >Leave</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Start Overlay (Solo mode or not in lobby) */}
            {!loading && showOverlay && !showLobby && mpState.phase !== 'playing' && (
                <div className={styles.overlay}>
                    <div className={styles.overlayContent}>
                        <h2>FPS Arena</h2>
                        <p>Click to play solo</p>
                        <div className={styles.overlayControls}>
                            <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> — Move</p>
                            <p><kbd>Space</kbd> — Jump &nbsp;|&nbsp; <kbd>Shift</kbd> — Sprint</p>
                            <p><kbd>Mouse</kbd> — Aim &amp; Shoot</p>
                            <p><kbd>1</kbd>-<kbd>5</kbd> or <kbd>Scroll</kbd> — Switch Weapon</p>
                            <p><kbd>R</kbd> — Reload</p>
                        </div>
                        <button
                            onClick={() => setShowLobby(true)}
                            style={{ marginTop: 16, padding: '12px 32px', borderRadius: 8, border: '2px solid #4ade80', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', letterSpacing: 2 }}
                        >🌐 MULTIPLAYER</button>
                    </div>
                </div>
            )}

            {/* Crosshair */}
            {!loading && !showOverlay && (
                <div className={styles.crosshair}>
                    <div className={styles.crosshairInner}>
                        <div className={styles.crosshairDot} />
                    </div>
                </div>
            )}

            {/* Hit Marker */}
            <div className={`${styles.hitMarker} ${showHitMarker ? styles.hitMarkerActive : ''}`}>
                <svg width="20" height="20" viewBox="0 0 20 20" className={styles.hitMarkerSvg}>
                    <line x1="3" y1="3" x2="7" y2="7" />
                    <line x1="13" y1="3" x2="17" y2="7" />
                    <line x1="3" y1="17" x2="7" y2="13" />
                    <line x1="13" y1="17" x2="17" y2="13" />
                </svg>
            </div>

            {/* Muzzle Flash */}
            <div className={`${styles.muzzleFlash} ${showMuzzleFlash ? styles.muzzleFlashActive : ''}`} />

            {/* Damage Vignette */}
            <div className={`${styles.damageVignette} ${showDamageVignette ? styles.damageVignetteActive : ''}`} />

            {/* Gun ViewModel — only show pixel art for knife (guns use 3D viewmodel) */}
            {!loading && !showOverlay && activeWep && activeSlotData.weaponId === 'knife' && (
                <div className={`${styles.gunViewModel} ${gunRecoil ? styles.gunViewModelRecoil : styles.gunViewModelBob}`}>
                    <GunTexture
                        weaponId={activeSlotData.weaponId}
                        size={140}
                        glow={activeWep.skinGrade !== 'consumer' && activeWep.skinGrade !== 'industrial'}
                    />
                </div>
            )}

            {/* Reload indicator */}
            {isReloading && (
                <>
                    <div className={styles.reloadText}>RELOADING</div>
                    <div className={styles.reloadBar}>
                        <div className={styles.reloadBarFill} style={{ width: `${reloadProgress * 100}%` }} />
                    </div>
                </>
            )}

            {/* Kill Feed */}
            {killFeed.length > 0 && (
                <div className={styles.killFeed}>
                    {killFeed.map(k => (
                        <div key={k.id} className={styles.killEntry}>
                            <span>You</span>
                            <span className={styles.killWeapon}>[{k.weapon}]</span>
                            <span className={styles.killVictim}>{k.victim}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Top HUD */}
            {!loading && !showOverlay && (
                <div className={styles.hudTop}>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>Kills</span>
                        <span className={styles.statValue}>{kills}</span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>Deaths</span>
                        <span className={styles.statValue}>{deaths}</span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>FPS</span>
                        <span className={styles.statValue}>{fps}</span>
                    </div>
                </div>
            )}

            {/* Weapon Hotbar */}
            {!loading && !showOverlay && (
                <div className={styles.hotbar}>
                    {loadout.map((slot, i) => {
                        const wep = CSGO_WEAPON_REGISTRY[slot.weaponId];
                        if (!wep) return null;
                        return (
                            <div
                                key={i}
                                className={`${styles.hotbarSlot} ${i === activeSlot ? styles.hotbarSlotActive : ''}`}
                                onClick={() => setActiveSlot(i)}
                            >
                                <span className={styles.hotbarKey}>{i + 1}</span>
                                <GunTexture weaponId={slot.weaponId} size={28} />
                                <span className={styles.hotbarName}>{wep.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Bottom HUD */}
            {!loading && !showOverlay && (
                <div className={styles.hud}>
                    <div className={styles.hudBottom}>
                        {/* Health + Armor */}
                        <div className={styles.healthPanel}>
                            <span className={styles.healthIcon}>❤️</span>
                            <span className={`${styles.healthValue} ${health > 50 ? styles.healthOk : health > 25 ? styles.healthLow : styles.healthCrit
                                }`}>
                                {health}
                            </span>
                            <span className={styles.healthIcon}>🛡️</span>
                            <span className={styles.armorValue}>{armor}</span>
                        </div>

                        {/* Ammo */}
                        {activeWep && activeWep.slot !== 'melee' && activeWep.slot !== 'grenade' && (
                            <div className={styles.ammoPanel}>
                                <span className={styles.ammoCurrent}>{activeSlotData.currentAmmo}</span>
                                <span className={styles.ammoDivider}>/</span>
                                <span className={styles.ammoReserve}>{activeSlotData.reserveAmmo}</span>
                            </div>
                        )}

                        {/* Weapon name + money */}
                        <div className={styles.weaponPanel}>
                            {activeWep && (
                                <>
                                    <GunTexture weaponId={activeSlotData.weaponId} size={28} />
                                    <div>
                                        <div className={styles.weaponName}>{activeWep.name}</div>
                                        <div className={styles.weaponMoney}>${money}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
