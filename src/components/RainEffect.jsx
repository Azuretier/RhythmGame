import { useEffect } from "react";
import * as THREE from "three";

export default function RainEffect() {
  useEffect(() => {
    let scene, camera, renderer, rainParticles;

    function init() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 500);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);

      const rainCount = 15000;
      const rainGeometry = new THREE.BufferGeometry();
      const rainPositions = [];

      for (let i = 0; i < rainCount; i++) {
        rainPositions.push((Math.random() - 0.5) * 200, Math.random() * 200 - 50, (Math.random() - 0.5) * 200);
      }

      rainGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rainPositions, 3));
      const rainMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.1, transparent: true });
      rainParticles = new THREE.Points(rainGeometry, rainMaterial);
      scene.add(rainParticles);

      window.addEventListener("resize", onWindowResize);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      requestAnimationFrame(animate);
      const positions = rainParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 0.3;
        if (positions[i] < -50) positions[i] = 50;
      }
      rainParticles.geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }

    init();
    animate();
  }, []);

  return null;
}
