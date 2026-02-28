'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Block } from './textures';
import { createTextureAtlas, BLOCK_FACES } from './textures';
import { generateWorld, WorldData, WORLD_WIDTH, WORLD_DEPTH, WORLD_HEIGHT, SEA_LEVEL, CHUNK_SIZE } from './terrain';
import { buildChunkGeometry } from './chunk-builder';
import styles from './MinecraftWorld.module.css';

const PLAYER_HEIGHT = 1.62;
const PLAYER_WIDTH = 0.3;
const MOVE_SPEED = 5.5;
const SPRINT_SPEED = 8;
const JUMP_SPEED = 7.5;
const GRAVITY = -22;
const FOG_NEAR = 20;
const FOG_FAR = 120;

// Sky colors for day cycle
const SKY_DAY = new THREE.Color(0x87ceeb);
const SKY_SUNSET = new THREE.Color(0xd4774a);
const SKY_NIGHT = new THREE.Color(0x0a0a2e);

export default function MinecraftWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('Initializing...');
  const [progressPct, setProgressPct] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });
  const [fps, setFps] = useState(0);
  const worldRef = useRef<WorldData | null>(null);
  const controlsRef = useRef<PointerLockControls | null>(null);

  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    let disposed = false;

    // ====== Scene Setup ======
    const scene = new THREE.Scene();
    scene.background = SKY_DAY.clone();
    scene.fog = new THREE.Fog(SKY_DAY.clone(), FOG_NEAR, FOG_FAR);

    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 300);

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

    const waterMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

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
    // Generate simple cloud pattern
    const cloudImageData = cloudCtx.createImageData(256, 256);
    const cData = cloudImageData.data;
    // Simple noise-based clouds
    let cSeed = 999;
    const cRng = () => {
      cSeed = (cSeed * 16807) % 2147483647;
      return (cSeed - 1) / 2147483646;
    };
    for (let cy = 0; cy < 256; cy++) {
      for (let cx = 0; cx < 256; cx++) {
        const i = (cy * 256 + cx) * 4;
        // Large-scale noise for cloud shapes
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
    // Use setTimeout to allow loading screen to render first
    setTimeout(() => {
      if (disposed) return;

      setProgress('Generating terrain...');
      setProgressPct(10);

      setTimeout(() => {
        if (disposed) return;

        const world = generateWorld(42069);
        worldRef.current = world;

        setProgress('Building chunk meshes...');
        setProgressPct(40);

        setTimeout(() => {
          if (disposed) return;

          const chunksX = Math.ceil(WORLD_WIDTH / CHUNK_SIZE);
          const chunksZ = Math.ceil(WORLD_DEPTH / CHUNK_SIZE);
          const totalChunks = chunksX * chunksZ;
          let built = 0;

          // Build chunks in batches for smoother loading
          const chunkQueue: [number, number][] = [];
          for (let cx = 0; cx < chunksX; cx++) {
            for (let cz = 0; cz < chunksZ; cz++) {
              chunkQueue.push([cx, cz]);
            }
          }

          function buildBatch() {
            if (disposed) return;
            const batchSize = 8;
            for (let i = 0; i < batchSize && chunkQueue.length > 0; i++) {
              const [cx, cz] = chunkQueue.shift()!;
              const { solid, water } = buildChunkGeometry(world, cx, cz);
              if (solid) {
                const mesh = new THREE.Mesh(solid, solidMaterial);
                scene.add(mesh);
              }
              if (water) {
                const mesh = new THREE.Mesh(water, waterMaterial);
                mesh.renderOrder = 1; // render after solid
                scene.add(mesh);
              }
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
      if (bx < 0 || bx >= WORLD_WIDTH || bz < 0 || bz >= WORLD_DEPTH) return true; // world border
      if (by < 0) return true;
      if (by >= WORLD_HEIGHT) return false;
      const block = worldRef.current.getBlock(bx, by, bz);
      return block !== Block.Air && block !== Block.Water && block !== Block.Glass;
    }

    function checkCollision(x: number, y: number, z: number): boolean {
      // Check AABB corners
      for (const dx of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
        for (const dz of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
          if (isSolid(x + dx, y, z + dz)) return true;
          if (isSolid(x + dx, y + 1, z + dz)) return true; // head
        }
      }
      return false;
    }

    const onKeyDown = (e: KeyboardEvent) => {
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

    const handleClick = () => {
      if (!controls.isLocked) controls.lock();
    };
    container.addEventListener('click', handleClick);

    // ====== Finish Setup (called after chunks built) ======
    function finishSetup(world: WorldData) {
      if (disposed) return;

      // Find spawn point: center of world, highest solid block
      const cx = Math.floor(WORLD_WIDTH / 2);
      const cz = Math.floor(WORLD_DEPTH / 2);
      let spawnY = SEA_LEVEL + 5;
      for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
        const b = world.getBlock(cx, y, cz);
        if (b !== Block.Air && b !== Block.Water) {
          spawnY = y + 1 + PLAYER_HEIGHT;
          break;
        }
      }

      camera.position.set(cx + 0.5, spawnY, cz + 0.5);

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
    let dayTime = 0; // 0-1, 0=noon, 0.5=midnight

    function animate() {
      if (disposed) return;
      const animId = requestAnimationFrame(animate);

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

      // Day/night cycle (1 full day = 240 seconds)
      dayTime = (dayTime + dt / 240) % 1;

      // Update sky color
      const sunAngle = dayTime * Math.PI * 2;
      let skyColor: THREE.Color;
      if (dayTime < 0.25) {
        // Day
        skyColor = SKY_DAY.clone();
      } else if (dayTime < 0.35) {
        // Day → Sunset
        const t = (dayTime - 0.25) / 0.1;
        skyColor = SKY_DAY.clone().lerp(SKY_SUNSET, t);
      } else if (dayTime < 0.4) {
        // Sunset → Night
        const t = (dayTime - 0.35) / 0.05;
        skyColor = SKY_SUNSET.clone().lerp(SKY_NIGHT, t);
      } else if (dayTime < 0.6) {
        // Night
        skyColor = SKY_NIGHT.clone();
      } else if (dayTime < 0.65) {
        // Night → Sunrise
        const t = (dayTime - 0.6) / 0.05;
        skyColor = SKY_NIGHT.clone().lerp(SKY_SUNSET, t);
      } else if (dayTime < 0.75) {
        // Sunrise → Day
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

      // Update sun light direction and intensity
      sunLight.position.set(sunX, Math.max(sunY + 40, 10), sunZ);
      const dayFactor = Math.max(0, Math.sin((1 - dayTime) * Math.PI));
      sunLight.intensity = 0.2 + dayFactor * 0.65;
      ambientLight.intensity = 0.15 + dayFactor * 0.4;

      // Cloud drift
      cloudMesh.position.x += dt * 1.5;
      if (cloudMesh.position.x > WORLD_WIDTH * 2) cloudMesh.position.x = -WORLD_WIDTH;

      // ====== Player Physics ======
      // Uses "move then resolve" approach: apply forces, move, then fix penetrations.
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

        // Resolve ground collision by checking all AABB foot corners
        feetY = pos.y - PLAYER_HEIGHT;
        onGround = false;

        for (const dx of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
          for (const dz of [-PLAYER_WIDTH, PLAYER_WIDTH]) {
            const cx = pos.x + dx;
            const cz = pos.z + dz;

            if (isSolid(cx, feetY, cz)) {
              // Feet are inside a solid block — push up to block top
              const blockTop = Math.floor(feetY) + 1;
              const resolveY = blockTop + PLAYER_HEIGHT;
              if (pos.y < resolveY) {
                pos.y = resolveY;
                feetY = pos.y - PLAYER_HEIGHT;
              }
              if (velocityY < 0) velocityY = 0;
              onGround = true;
            } else if (velocityY <= 0 && isSolid(cx, feetY - 0.06, cz)) {
              // Feet are resting just above a solid block (within tolerance)
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

        // Jump (only after ground resolution confirms we're grounded)
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

        // Update coords display (throttled by FPS counter)
        if (fpsTimer < 0.05) {
          setCoords({
            x: Math.floor(pos.x),
            y: Math.floor(pos.y - PLAYER_HEIGHT),
            z: Math.floor(pos.z),
          });
        }
      }

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

    // ====== Cleanup ======
    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      container.removeEventListener('click', handleClick);
      cancelAnimationFrame(firstFrame);

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

      texture.dispose();
      cloudTexture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

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
          </div>
        </>
      )}

      <button className={styles.backButton} onClick={handleBack}>
        Back
      </button>
    </div>
  );
}
