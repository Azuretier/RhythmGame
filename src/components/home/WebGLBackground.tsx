"use client";

import { useEffect, useRef, memo } from "react";
import * as THREE from "three";

interface WebGLBackgroundProps {
  onLoaded?: () => void;
}

const WebGLBackground = memo(({ onLoaded }: WebGLBackgroundProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isInitializedRef.current || !containerRef.current) return;
    isInitializedRef.current = true;

    const container = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "-1";
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Load shader
    async function loadShader() {
      try {
        const fragShader = await fetch("/shaders/light-scattering.frag").then(
          (res) => {
            if (!res.ok) throw new Error("Shader not found");
            return res.text();
          }
        );

        const uniforms = {
          u_time: { value: 0 },
          u_resolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
          },
        };

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
          depthTest: false,
          depthWrite: false,
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        const quad = new THREE.Mesh(geometry, material);
        scene.add(quad);

        const clock = new THREE.Clock();

        function animate() {
          if (!rendererRef.current) return;

          uniforms.u_time.value = clock.getElapsedTime();
          renderer.render(scene, camera);
          animationFrameRef.current = requestAnimationFrame(animate);
        }

        animate();
        onLoaded?.();

        // Handle resize - update resolution uniform
        const handleResize = () => {
          if (!rendererRef.current) return;

          const width = window.innerWidth;
          const height = window.innerHeight;

          rendererRef.current.setSize(width, height);
          uniforms.u_resolution.value.set(width, height);
        };

        resizeHandlerRef.current = handleResize;
        window.addEventListener("resize", handleResize);
      } catch (error) {
        console.warn("Failed to load WebGL shader:", error);
        onLoaded?.();
      }
    }

    loadShader();

    // Cleanup
    return () => {
      if (resizeHandlerRef.current) {
        window.removeEventListener("resize", resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();

        if (
          container &&
          rendererRef.current.domElement.parentNode === container
        ) {
          container.removeChild(rendererRef.current.domElement);
        }

        rendererRef.current = null;
      }

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });

      isInitializedRef.current = false;
    };
  }, [onLoaded]);

  return <div ref={containerRef} />;
});

WebGLBackground.displayName = "WebGLBackground";

export default WebGLBackground;
