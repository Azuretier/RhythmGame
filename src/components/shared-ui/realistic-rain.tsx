// ============================================
// FIXED realistic-rain.tsx
// Fixes: GL_INVALID_OPERATION: glTexStorage2D: Texture is immutable
// Location: @/components/shared-ui/realistic-rain.tsx
// ============================================

"use client";
import { useEffect, useRef, memo } from "react";
import * as THREE from "three";

interface RainEffectProps {
  onLoaded: () => void;
  intensity?: number;
}

const RainEffect = memo(({ onLoaded, intensity = 150 }: RainEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const uniformsRef = useRef<Record<string, any> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  // Update intensity when prop changes (without re-creating the scene)
  useEffect(() => {
    if (uniformsRef.current && isInitializedRef.current) {
      const mappedIntensity = 0.1 + ((intensity - 50) / 250) * 0.7;
      uniformsRef.current.u_intensity.value = mappedIntensity;
    }
  }, [intensity]);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current || !containerRef.current) return;
    isInitializedRef.current = true;

    const container = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Renderer setup with specific settings to prevent texture issues
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

    // Map initial intensity
    const initialMappedIntensity = 0.1 + ((intensity - 50) / 250) * 0.7;

    // Create uniforms first (without texture)
    const uniforms: Record<string, any> = {
      u_tex0: { value: null },
      u_time: { value: 0 },
      u_intensity: { value: initialMappedIntensity },
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
      u_tex0_resolution: { value: new THREE.Vector2(1, 1) },
    };

    uniformsRef.current = uniforms;

    // Load texture with proper settings
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "/media/image.jpg",
      (texture) => {
        // Set texture properties BEFORE assigning to uniform
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.generateMipmaps = false;
        
        // Now assign to uniform
        uniforms.u_tex0.value = texture;
        uniforms.u_tex0_resolution.value.set(
          texture.image.width || window.innerWidth,
          texture.image.height || window.innerHeight
        );
        
        onLoaded();
      },
      undefined,
      (error) => {
        console.warn("Failed to load rain texture, using fallback:", error);
        // Create a fallback texture
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, 1, 1);
        }
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        fallbackTexture.minFilter = THREE.LinearFilter;
        fallbackTexture.magFilter = THREE.LinearFilter;
        fallbackTexture.generateMipmaps = false;
        
        uniforms.u_tex0.value = fallbackTexture;
        uniforms.u_tex0_resolution.value.set(1, 1);
        onLoaded();
      }
    );

    // Load and setup shader
    async function loadShader() {
      try {
        const fragShader = await fetch("/shaders/rain.frag").then(res => {
          if (!res.ok) throw new Error("Shader not found");
          return res.text();
        });

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
      } catch (error) {
        console.warn("Failed to load rain shader:", error);
        onLoaded();
      }
    }

    loadShader();

    // Handle resize
    const handleResize = () => {
      if (!rendererRef.current) return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      rendererRef.current.setSize(width, height);
      uniforms.u_resolution.value.set(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Dispose of Three.js resources
      if (rendererRef.current) {
        rendererRef.current.dispose();
        
        // Remove canvas from DOM
        if (container && rendererRef.current.domElement.parentNode === container) {
          container.removeChild(rendererRef.current.domElement);
        }
        
        rendererRef.current = null;
      }

      // Dispose texture
      if (uniformsRef.current?.u_tex0?.value) {
        uniformsRef.current.u_tex0.value.dispose();
      }

      // Dispose geometry and material from scene
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });

      uniformsRef.current = null;
      isInitializedRef.current = false;
    };
  }, []); // Empty dependency array - only run once

  return <div ref={containerRef} />;
});

RainEffect.displayName = 'RainEffect';

export default RainEffect;