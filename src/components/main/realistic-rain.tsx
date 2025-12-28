// ============================================
// UPDATED realistic-rain.tsx
// Replace your existing file with this version
// Location: @/components/main/realistic-rain.tsx
// ============================================

"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface RainEffectProps {
  onLoaded: () => void;
  intensity?: number; // NEW: Accept intensity from settings (50-300)
}

export default function RainEffect({ onLoaded, intensity = 150 }: RainEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, any> | null>(null);

  // Update intensity when prop changes
  useEffect(() => {
    if (uniformsRef.current) {
      // Map intensity (50-300) to shader intensity (0.1-0.8)
      const mappedIntensity = 0.1 + ((intensity - 50) / 250) * 0.7;
      uniformsRef.current.u_intensity.value = mappedIntensity;
    }
  }, [intensity]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "-1";
    renderer.domElement.style.pointerEvents = "none";
    containerRef.current.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const tex0 = textureLoader.load(
      "/media/image.jpg",
      (tex) => {
        uniforms.u_tex0.value = tex;
        uniforms.u_tex0_resolution.value.set(tex.image.width, tex.image.height);
        onLoaded();
      }
    );

    // Map initial intensity (50-300) to shader intensity (0.1-0.8)
    const initialMappedIntensity = 0.1 + ((intensity - 50) / 250) * 0.7;

    const uniforms: Record<string, any> = {
      u_tex0: { value: tex0 },
      u_time: { value: 0 },
      u_intensity: { value: initialMappedIntensity }, // Use mapped intensity
      u_speed: { value: 0.25 },
      u_brightness: { value: 0.8 },
      u_normal: { value: 0.5 },
      u_zoom: { value: 2.61 },
      u_blur_intensity: { value: 0.5 },
      u_blur_iterations: { value: 16 },
      u_panning: { value: false },
      u_post_processing: { value: true },
      u_lightning: { value: false },
      u_texture_fill: { value: true },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_tex0_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };

    // Store reference for external updates
    uniformsRef.current = uniforms;

    async function loadShader() {
      const fragShader = await fetch("/shaders/rain.frag").then(res => res.text());

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: fragShader,
        transparent: true,
      });

      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(quad);

      const clock = new THREE.Clock();

      function animate() {
        uniforms.u_time.value = clock.getElapsedTime();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      }
      animate();
    }

    loadShader();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      uniformsRef.current = null;
    };
  }, []); // Only run once on mount

  return <div ref={containerRef} />;
}