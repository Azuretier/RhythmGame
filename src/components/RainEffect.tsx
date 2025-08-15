"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function RainEffect() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Transparent
    mountRef.current?.appendChild(renderer.domElement);

    // Create raindrops
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 15000; // number of drops
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = Math.random() * 400 - 200; // x
      positions[i * 3 + 1] = Math.random() * 500 - 250; // y
      positions[i * 3 + 2] = Math.random() * 400 - 200; // z
    }

    rainGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const rainMaterial = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.1,
      transparent: true,
    });

    const rain = new THREE.Points(rainGeo, rainMaterial);
    scene.add(rain);

    // Animate
    const animate = () => {
      const posArray = rainGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < rainCount * 3; i += 3) {
        posArray[i + 1] -= 0.2; // y position
        if (posArray[i + 1] < -200) {
          posArray[i + 1] = 200; // reset drop to top
        }
      }
      rainGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none", // Let clicks go through
        zIndex: 9999, // FRONT of content
        width: "100%",
        height: "100%",
      }}
    />
  );
}
