"use client";
import { useEffect, useRef, useState} from "react";
import * as THREE from "three";

export default function RainEffect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
      "/media/image.jpg", // your background image path
      (tex) => {
        uniforms.u_tex0.value = tex;
        uniforms.u_tex0_resolution.value.set(tex.image.width, tex.image.height);
        setIsLoaded(true); // mark as loaded when texture is ready
      }
    );

    // All uniforms must be defined here
    const uniforms: Record<string, any> = {
      u_tex0: { value: tex0 },
      u_time: { value: 0,},
      u_intensity: { value: 0.4},
      u_speed: { value: 0.25},
      u_brightness: { value: 0.8},
      u_normal: { value: 0.5},
      u_zoom: { value: 2.61},
      u_blur_intensity: { value: 0.5},
      u_blur_iterations: { value: 16},
      u_panning: { value: false},
      u_post_processing: { value: true},
      u_lightning: { value: false},
      u_texture_fill: { value: true},
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight)},
      u_tex0_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight)},
    };

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

    window.addEventListener("resize", () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    });

    return () => {
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <>
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
          <p className="animate-pulse">Loading rain...</p>
        </div>
      )}
      <div ref={containerRef} />
    </>
  );
}
