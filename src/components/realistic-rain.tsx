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
        varying vec2 vUv;

        float rand(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;

          // Stretch vertically
          uv.y *= 3.0;

          // Animate downward
          uv.y += u_time * 2.0;

          // Randomize drops
          float drops = step(0.98, rand(floor(uv * 20.0)));

          // Fade intensity
          float alpha = smoothstep(0.5, 0.0, fract(uv.y));

          vec3 col = mix(vec3(0.0,0.0,0.0,1.0), vec3(0.6,0.6,1.0), drops * alpha);
          gl_FragColor = vec4(col, drops * alpha);
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
