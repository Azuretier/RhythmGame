'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import styles from './AnimeCharacter3D.module.css';

interface AnimeCharacter3DProps {
  size?: number;
  className?: string;
}

export default function AnimeCharacter3D({ size = 300, className }: AnimeCharacter3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef(0);
  const modelRef = useRef<THREE.Group | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const isHoveredRef = useRef(false);
  const clickTimeRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, []);

  const handleClick = useCallback(() => {
    clickTimeRef.current = performance.now();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 1.5, 0);

    // Lighting - 4-point setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff88cc, 0.4);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    const eyeLight = new THREE.PointLight(0xffffff, 0.3, 5);
    eyeLight.position.set(0, 3.5, 4);
    scene.add(eyeLight);

    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(
      '/models/mascot.glb',
      (gltf) => {
        const model = gltf.scene;
        model.name = 'CharacterRoot';
        scene.add(model);
        modelRef.current = model;
      },
      undefined,
      (error) => {
        console.error('Failed to load mascot.glb:', error);
      }
    );

    // Resize handler
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Mouse tracking
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', () => { isHoveredRef.current = true; });
    canvas.addEventListener('mouseleave', () => { isHoveredRef.current = false; });
    canvas.addEventListener('click', handleClick);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const model = modelRef.current;
      if (!model) {
        renderer.render(scene, camera);
        return;
      }

      // Idle floating
      model.position.y = Math.sin(t * 1.2) * 0.15;

      // Gentle rotation toward mouse when hovered, else slow idle spin
      const targetRotY = isHoveredRef.current
        ? mouseRef.current.x * 0.4
        : Math.sin(t * 0.3) * 0.15;
      model.rotation.y += (targetRotY - model.rotation.y) * 0.05;

      const targetRotX = isHoveredRef.current
        ? mouseRef.current.y * -0.1
        : 0;
      model.rotation.x += (targetRotX - model.rotation.x) * 0.05;

      // Animate named parts from the GLB
      const hair = model.getObjectByName('Hair');
      if (hair) {
        const twinL = hair.getObjectByName('TwinTailL');
        const twinR = hair.getObjectByName('TwinTailR');
        if (twinL) {
          twinL.rotation.z = Math.sin(t * 1.5) * 0.08;
          twinL.rotation.x = Math.sin(t * 1.2 + 0.5) * 0.05;
        }
        if (twinR) {
          twinR.rotation.z = Math.sin(t * 1.5 + Math.PI) * 0.08;
          twinR.rotation.x = Math.sin(t * 1.2 + Math.PI + 0.5) * 0.05;
        }
        const ah1 = hair.getObjectByName('Ahoge1');
        const ah2 = hair.getObjectByName('Ahoge2');
        if (ah1) ah1.rotation.z = -0.3 + Math.sin(t * 3) * 0.15;
        if (ah2) ah2.rotation.z = 0.2 + Math.sin(t * 2.5 + 1) * 0.12;
      }

      // Hat wobble
      const hat = model.getObjectByName('Hat');
      if (hat) {
        hat.rotation.z = 0.15 + Math.sin(t * 1.0) * 0.03;
        hat.rotation.x = Math.sin(t * 0.8) * 0.02;
      }

      // Heart pulse
      const heart = model.getObjectByName('Heart');
      if (heart) {
        const pulse = 1 + Math.sin(t * 4) * 0.15;
        heart.scale.setScalar(pulse);
      }

      // Bunny charm sway
      const bunny = model.getObjectByName('BunnyCharm');
      if (bunny) {
        bunny.rotation.z = Math.sin(t * 2) * 0.1;
      }

      // Left arm subtle movement
      const leftArm = model.getObjectByName('LeftArm');
      if (leftArm) {
        leftArm.rotation.x = Math.sin(t * 1.3) * 0.05;
      }

      // Floating diamonds rotation & bobbing
      for (let i = 0; i < 5; i++) {
        const d = model.getObjectByName(`Diamond_${i}`);
        if (d) {
          d.rotation.y = t * (0.8 + i * 0.3);
          d.rotation.x = t * (0.5 + i * 0.2);
          d.position.y += Math.sin(t * (1 + i * 0.4) + i) * 0.002;
        }
      }

      // Sparkle twinkle
      for (let i = 0; i < 3; i++) {
        const s = model.getObjectByName(`Sparkle_${i}`);
        if (s) {
          const sparkleScale = 0.5 + Math.sin(t * 3 + i * 2) * 0.5;
          s.scale.setScalar(Math.max(0, sparkleScale));
        }
      }

      // Click bounce reaction
      const clickAge = (performance.now() - clickTimeRef.current) / 1000;
      if (clickAge < 0.5) {
        const bounce = Math.sin(clickAge * Math.PI * 4) * 0.2 * (1 - clickAge * 2);
        model.position.y += bounce;
        model.scale.setScalar(1 + Math.sin(clickAge * Math.PI * 2) * 0.05);
      } else {
        model.scale.setScalar(1);
      }

      renderer.render(scene, camera);
    };
    animIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', updateSize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      // Dispose model
      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
        scene.remove(modelRef.current);
      }
      renderer.dispose();
      modelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`${styles.wrapper} ${className || ''}`}
      style={{ width: size, height: size * 1.2 }}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
      />
    </div>
  );
}
