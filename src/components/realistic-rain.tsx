"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function RainEffect() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationId: number;
    const clock = new THREE.Clock();
    let scene: THREE.Scene;
    let camera: THREE.OrthographicCamera;
    let renderer: THREE.WebGLRenderer;
    let material: THREE.ShaderMaterial;

    async function init() {
      // Renderer
      renderer = new THREE.WebGLRenderer({ alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.domElement.style.position = "fixed";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      renderer.domElement.style.pointerEvents = "none";
      renderer.domElement.style.zIndex = "9999";
      containerRef.current?.appendChild(renderer.domElement);

      // Scene + Camera
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      // Load fragment shader
      const fragShader = await fetch("/shaders/rain.frag").then((res) =>
        res.text()
      );

      material = new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0 },
          u_resolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
          },
          u_brightness: { value: 0.8 },
        },
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

      const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        material
      );
      scene.add(quad);

      // Animation loop
      const animate = () => {
        material.uniforms.u_time.value = clock.getElapsedTime();
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      };
      animate();

      // Resize
      const onResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.u_resolution.value.set(
          window.innerWidth,
          window.innerHeight
        );
      };
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
      };
    }

    init();
  }, []);

  return <div ref={containerRef} />;
}
