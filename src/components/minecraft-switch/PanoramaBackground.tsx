"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function PanoramaBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    // Adjusted FOV to 80 for a better wide-angle look
    const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // 2. Geometry: SWITCHED TO CYLINDER
    // RadiusTop, RadiusBottom, Height, Segments
    // Height (300) is tuned to fit the aspect ratio of the Minecraft strip image
    const geometry = new THREE.CylinderGeometry(500, 500, 300, 60);
    geometry.scale(-1, 1, 1); // Invert so we see inside

    // 3. Load Texture
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
      "/media/mnsw_panorama.png",
      undefined,
      undefined,
      (err) => console.error("Texture error:", err)
    );
    
    // Set wrapping to ensure it loops seamlessly horizontally
    texture.wrapS = THREE.RepeatWrapping; 
    texture.wrapT = THREE.ClampToEdgeWrapping; // Prevents vertical tiling artifacts
    texture.repeat.set(1, 1);

    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false; 

    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 4. Animation
    const animate = () => {
      requestAnimationFrame(animate);
      mesh.rotation.y += 0.00006; // Rotate cylinder
      renderer.render(scene, camera);
    };
    animate();

    // 5. Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0,
        filter: 'blur(4px) scale(1.02)' 
      }} 
    />
  );
}