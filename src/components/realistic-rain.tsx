"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function RainEffect() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Renderer with transparent background
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // transparent
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.zIndex = "9999"; // on top
    renderer.domElement.style.pointerEvents = "none"; // allow clicking through
    ref.current.appendChild(renderer.domElement);

    // Shader
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_resolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;

        uniform float u_time;
        uniform vec2 u_resolution;

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;

          // Make vertical streaks
          float streaks = step(0.95, fract(uv.x * 20.0 + u_time * 2.0));

          // Animate falling
          float rain = smoothstep(0.0, 0.1, fract(uv.y + u_time * 0.5));

          // Combine
          float alpha = streaks * rain;

          gl_FragColor = vec4(vec3(0.6, 0.7, 0.9), alpha);
        }
      `,
      transparent: true, // allow background through
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    const clock = new THREE.Clock();

    function animate() {
      material.uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener("resize", () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.u_resolution.value.set(
        window.innerWidth,
        window.innerHeight
      );
    });

    return () => {
      ref.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={ref} />;
}
