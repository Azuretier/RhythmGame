"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import fragmentShader from "@/shaders/rain.frag";

export default function RainEffect() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let clock = new THREE.Clock();
    let scene: THREE.Scene;
    let camera: THREE.OrthographicCamera;
    let renderer: THREE.WebGLRenderer;
    let material: THREE.ShaderMaterial;
    const settings = { fps: 30 };

    async function init() {
      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      containerRef.current?.appendChild(renderer.domElement);

      // Scene + Camera
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      // Shader material
      material = new THREE.ShaderMaterial({
        uniforms: {
          u_tex0: { value: null },
          u_time: { value: 0 },
          u_intensity: { value: 0.4 },
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
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
              vUv = uv;
              gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: fragmentShader,
      });

      // Quad geometry
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(quad);
    }

    function render() {
      setTimeout(() => {
        requestAnimationFrame(render);
      }, 1000 / settings.fps);

      if (clock.getElapsedTime() > 21600) clock = new THREE.Clock(); // reset after 6 hrs
      material.uniforms.u_time.value = clock.getElapsedTime();

      renderer.render(scene, camera);
    }

    // Init + Render
    init().then(render);

    // Resize handler
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.u_resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}
    />
  );
}
