"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export default function RainEffect() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "9999";
    renderer.domElement.style.pointerEvents = "none";
    ref.current?.appendChild(renderer.domElement);

    const loader = new THREE.TextureLoader();
    const rainTexture = loader.load('/raindrop.png'); // small streak texture

    const rainCount = 20000;
    const positions = new Float32Array(rainCount * 3);
    const velocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      positions.set([
        (Math.random() - 0.5) * 50,
        Math.random() * 100 - 50,
        (Math.random() - 0.5) * 50
      ], i * 3);
      velocities[i] = - (0.1 + Math.random() * 0.5);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 1));

    const material = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.7,
      transparent: true,
      map: rainTexture,
      depthWrite: false,
      opacity: 0.6,
    });

    const rain = new THREE.Points(geometry, material);
    scene.add(rain);

    function animate() {
      const pos = geometry.attributes.position.array as Float32Array;
      const vel = geometry.attributes.velocity.array as Float32Array;
      for (let i = 0; i < rainCount; i++) {
        pos[i * 3 + 1] += vel[i];
        if (pos[i * 3 + 1] < -50) pos[i * 3 + 1] = 50;
      }
      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return () => {
      ref.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={ref} />;
}
