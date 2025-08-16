"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function RainEffect() {
  const ref = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.zIndex = "-1";
    ref.current?.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_tex0: { value: null as THREE.Texture | null },
      u_tex0_resolution: { value: new THREE.Vector2(1, 1) },
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
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D u_tex0;
        uniform float u_time;

        void main() {
          // TODO: replace with rain shader code
          vec3 tex = texture2D(u_tex0, vUv).rgb;
          gl_FragColor = vec4(tex, 1.0);
        }
      `,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    // Load texture (your wallpaper)
    new THREE.TextureLoader().load(
      "/media/image.jpg",
      (tex) => {
        uniforms.u_tex0.value = tex;
        uniforms.u_tex0_resolution.value.set(tex.image.width, tex.image.height);

        // Everything ready → trigger fade out
        setIsLoaded(true);
        setTimeout(() => setShowOverlay(false), 1000); // wait for fade transition
      }
    );

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener("resize", () => {
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return () => {
      ref.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <>
      {/* Loading screen overlay */}
      {showOverlay && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black text-white transition-opacity duration-1000 ${
            isLoaded ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg">Loading rain...</p>
          </div>
        </div>
      )}

      <div ref={ref} />
    </>
  );
}
