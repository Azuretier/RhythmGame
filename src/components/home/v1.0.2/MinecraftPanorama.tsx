"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Minecraft-style rotating cube-mapped panorama background.
 * Uses the 6 panorama face images (panorama_0 through panorama_5) to create
 * a skybox that slowly rotates, matching the classic title screen effect.
 */
export default function MinecraftPanorama() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      85,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Load cube texture from 6 panorama faces
    // Three.js CubeTextureLoader order: +x, -x, +y, -y, +z, -z
    // Minecraft panorama order: 0=right, 1=left, 2=top, 3=bottom, 4=front, 5=back
    const cubeLoader = new THREE.CubeTextureLoader();
    cubeLoader.setPath("/media/");
    const cubeTexture = cubeLoader.load([
      "panorama_1.png", // +x (right)
      "panorama_3.png", // -x (left)
      "panorama_4.png", // +y (top)
      "panorama_5.png", // -y (bottom)
      "panorama_0.png", // +z (front)
      "panorama_2.png", // -z (back)
    ]);

    scene.background = cubeTexture;

    // Slow rotation angle
    let rotationY = 0;

    const animate = () => {
      requestAnimationFrame(animate);
      rotationY += 0.0004;

      // Rotate camera around the Y axis for panorama rotation
      camera.rotation.y = rotationY;
      // Slight vertical sway
      camera.rotation.x = Math.sin(rotationY * 0.5) * 0.02;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      cubeTexture.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 z-0"
      style={{ filter: "blur(2px) brightness(0.7)" }}
    />
  );
}
