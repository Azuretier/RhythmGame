"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function RainEffect() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let clock = new THREE.Clock();
    let scene: THREE.Scene;
    let camera: THREE.OrthographicCamera;
    let renderer: THREE.WebGLRenderer;
    let material: THREE.ShaderMaterial;

    async function init() {
      // Renderer
      renderer = new THREE.WebGLRenderer({ alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      containerRef.current?.appendChild(renderer.domElement);

      // Scene & Camera
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      // Load shader files
      const frag = await (await fetch("/shaders/rain.frag")).text();

      material = new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0 },
          u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          u_brightness: { value: 0.85 },
          u_speed: { value: 0.25 },
          u_intensity: { value: 0.5 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: frag,
        transparent: true,
      });

      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(quad);
    }

    function render() {
      requestAnimationFrame(render);
      if (material) {
        material.uniforms.u_time.value = clock.getElapsedTime();
      }
      renderer.render(scene, camera);
    }

    // Start
    init().then(render);

    // Resize
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}
    />
  );
}
