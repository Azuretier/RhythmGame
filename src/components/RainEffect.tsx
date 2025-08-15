"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import fragmentShader from "@/shaders/rain.frag"; // Import the fragment shader

type RainEffectProps = {
  /** 0.0–1.0: overall density of rain */
  intensity?: number;
  /** 0.0–5.0: rate the streaks move downward */
  speed?: number;
  /** brightness multiplier of the streaks */
  brightness?: number;
  /** scale of streak noise (bigger = chunkier rain) */
  scale?: number;
  /** z-index for the canvas overlay */
  zIndex?: number | string;
};

export default function RainEffect({
  intensity = 0.5,
  speed = 1.5,
  brightness = 0.9,
  scale = 1.0,
  zIndex = 30,
}: RainEffectProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const mount = mountRef.current!;
    // Scene & camera (fullscreen quad via ortho cam)
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Renderer with transparent background so rain overlays UI
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    Object.assign(renderer.domElement.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: String(zIndex),
    });
    mount.appendChild(renderer.domElement);

    // Vertex shader: pass UVs and draw a plane
    const vertexShader = /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const uniforms = {
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_time: { value: 0 },
      u_intensity: { value: intensity },
      u_speed: { value: speed },
      u_brightness: { value: brightness },
      u_scale: { value: scale },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    materialRef.current = material;

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      (material.uniforms.u_resolution.value as THREE.Vector2).set(w, h);
    };
    window.addEventListener("resize", onResize);

    const loop = () => {
      const t = (performance.now() - startTimeRef.current) / 1000;
      material.uniforms.u_time.value = t;
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      scene.clear();
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [intensity, speed, brightness, scale, zIndex]);

  return <div ref={mountRef} />;
}
