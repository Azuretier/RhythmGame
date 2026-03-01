"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Minecraft-style rotating panorama background.
 * Uses 6 panorama face images mapped onto an inverted box (skybox) that slowly
 * rotates, matching the classic title screen effect. Uses individual textures
 * per face instead of CubeTexture to support non-square panorama images.
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
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Load 6 panorama face textures individually
    // Minecraft panorama order: 0=front, 1=right, 2=back, 3=left, 4=top, 5=bottom
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    const loader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];

    const faceFiles = [
      "/media/panorama_1.png", // +x (right)
      "/media/panorama_3.png", // -x (left)
      "/media/panorama_4.png", // +y (top)
      "/media/panorama_5.png", // -y (bottom)
      "/media/panorama_0.png", // +z (front)
      "/media/panorama_2.png", // -z (back)
    ];

    const materials = faceFiles.map((file) => {
      const tex = loader.load(file);
      tex.colorSpace = THREE.SRGBColorSpace;
      textures.push(tex);
      return new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.BackSide,
      });
    });

    // Create inverted box (viewed from inside)
    const skyboxGeometry = new THREE.BoxGeometry(100, 100, 100);
    const skybox = new THREE.Mesh(skyboxGeometry, materials);
    scene.add(skybox);

    // Slow rotation angle
    let rotationY = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      rotationY += 0.0004;

      // Rotate the skybox (camera stays fixed looking forward)
      skybox.rotation.y = rotationY;
      // Slight vertical sway
      skybox.rotation.x = Math.sin(rotationY * 0.5) * 0.02;

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
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      materials.forEach((mat) => mat.dispose());
      textures.forEach((tex) => tex.dispose());
      skyboxGeometry.dispose();
      renderer.dispose();
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
