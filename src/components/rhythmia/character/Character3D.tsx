'use client';

import {
  Suspense,
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment } from '@react-three/drei';
import { useCharacterAnimation } from './useCharacterAnimation';
import { useMouseTracking } from './useMouseTracking';
import type { AnimationState, Expression } from '@/types/dialog';
import { cn } from '@/lib/utils';
import styles from './Character3D.module.css';

// ===== Toon Shader =====

const TOON_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const TOON_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLightDir;
  uniform float uShadowSmooth;
  uniform float uShadowBrightness;
  uniform float uRimPower;
  uniform float uRimIntensity;
  uniform vec3 uRimColor;
  uniform sampler2D uTexture;
  uniform bool uUseTexture;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDir);
    vec3 viewDir = normalize(vViewDir);

    // Cel-shaded diffuse: quantize into 3 bands
    float NdotL = dot(normal, lightDir);
    float shadow = smoothstep(-uShadowSmooth, uShadowSmooth, NdotL);
    shadow = floor(shadow * 3.0 + 0.5) / 3.0;
    float diffuse = mix(uShadowBrightness, 1.0, shadow);

    // Anime-style rim lighting
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, uRimPower) * uRimIntensity;

    // Base color from uniform or texture
    vec3 baseColor = uColor;
    if (uUseTexture) {
      vec4 texColor = texture2D(uTexture, vUv);
      baseColor *= texColor.rgb;
    }

    vec3 finalColor = baseColor * diffuse + uRimColor * rim;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/** Create a toon ShaderMaterial with cel-shading */
function createToonMaterial(
  baseColor: THREE.Color,
  existingMap?: THREE.Texture | null,
  pixelated = false
): THREE.ShaderMaterial {
  if (existingMap && pixelated) {
    existingMap.magFilter = THREE.NearestFilter;
    existingMap.minFilter = THREE.NearestFilter;
    existingMap.needsUpdate = true;
  }

  return new THREE.ShaderMaterial({
    vertexShader: TOON_VERTEX_SHADER,
    fragmentShader: TOON_FRAGMENT_SHADER,
    uniforms: {
      uColor: { value: baseColor },
      uLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
      uShadowSmooth: { value: 0.04 },
      uShadowBrightness: { value: 0.45 },
      uRimPower: { value: 3.0 },
      uRimIntensity: { value: 0.5 },
      uRimColor: { value: new THREE.Color('#88ccff') },
      uTexture: { value: existingMap || new THREE.Texture() },
      uUseTexture: { value: !!existingMap },
    },
  });
}

/** Create an outline material using inverted hull method */
function createOutlineMaterial(): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color: '#1a1a2e',
    side: THREE.BackSide,
  });

  mat.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed += normal * 0.015;`
    );
  };

  return mat;
}

// ===== Expression Morph Targets =====

const EXPRESSION_MORPH_MAP: Record<Expression, Record<string, number>> = {
  neutral: {},
  smile: { Smile: 0.8, Happy: 0.8, Joy: 0.6 },
  angry: { Angry: 0.8, Frown: 0.6 },
  surprised: { Surprised: 1.0, EyeWide: 0.8, MouthOpen: 0.6 },
  sad: { Sad: 0.8, Frown: 0.5 },
  thinking: { Frown: 0.3, EyeSquint: 0.4 },
};

// ===== GLTF Character Model =====

interface CharacterModelProps {
  modelPath: string;
  animationState: AnimationState;
  expression: Expression;
  pixelatedTextures?: boolean;
}

function CharacterModel({
  modelPath,
  animationState,
  expression,
  pixelatedTextures = false,
}: CharacterModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headBoneRef = useRef<THREE.Object3D | null>(null);
  const outlineMeshesRef = useRef<THREE.Mesh[]>([]);

  const { scene, animations } = useGLTF(modelPath);
  const { mixer, actions } = useAnimations(animations, groupRef);

  const animation = useCharacterAnimation();
  const { updateTracking, findHeadBone } = useMouseTracking();

  // Setup animations when model loads
  useEffect(() => {
    if (mixer && animations.length > 0) {
      animation.setup({ mixer, clips: animations });
      animation.transition('idle');
    }
  }, [mixer, animations, animation]);

  // Find head bone
  useEffect(() => {
    if (scene) {
      headBoneRef.current = findHeadBone(scene);
    }
  }, [scene, findHeadBone]);

  // Apply toon material and create outlines
  useEffect(() => {
    if (!scene) return;

    const outlineMat = createOutlineMaterial();
    const outlines: THREE.Mesh[] = [];

    scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
        // Extract base color and map from original material
        const origMat = child.material as THREE.MeshStandardMaterial;
        const baseColor = origMat.color
          ? origMat.color.clone()
          : new THREE.Color('#ffffff');
        const map = origMat.map || null;

        // Replace with toon material
        child.material = createToonMaterial(
          baseColor,
          map,
          pixelatedTextures
        );

        // Create outline mesh
        const outlineMesh = child.clone();
        outlineMesh.material = outlineMat;
        outlineMesh.name = `${child.name}_outline`;
        outlineMesh.renderOrder = -1;

        // For SkinnedMesh, share the skeleton
        if (
          child instanceof THREE.SkinnedMesh &&
          outlineMesh instanceof THREE.SkinnedMesh
        ) {
          outlineMesh.skeleton = child.skeleton;
          outlineMesh.bindMatrix.copy(child.bindMatrix);
          outlineMesh.bindMatrixInverse.copy(child.bindMatrixInverse);
        }

        if (child.parent) {
          child.parent.add(outlineMesh);
          outlines.push(outlineMesh);
        }
      }
    });

    outlineMeshesRef.current = outlines;

    return () => {
      outlines.forEach((mesh) => {
        mesh.parent?.remove(mesh);
        mesh.geometry?.dispose();
      });
    };
  }, [scene, pixelatedTextures]);

  // Handle animation state changes
  useEffect(() => {
    animation.transition(animationState);
  }, [animationState, animation]);

  // Handle expression changes via morph targets
  useEffect(() => {
    if (!scene) return;

    const morphTargets = EXPRESSION_MORPH_MAP[expression] || {};

    scene.traverse((child: THREE.Object3D) => {
      if (
        child instanceof THREE.Mesh &&
        child.morphTargetInfluences &&
        child.morphTargetDictionary
      ) {
        // Reset all morph targets
        child.morphTargetInfluences.fill(0);

        // Apply expression morph targets
        for (const [name, value] of Object.entries(morphTargets)) {
          const idx = child.morphTargetDictionary[name];
          if (idx !== undefined) {
            child.morphTargetInfluences[idx] = value;
          }
        }
      }
    });
  }, [expression, scene]);

  // Per-frame update
  useFrame((_state: unknown, delta: number) => {
    animation.update(delta, groupRef.current);
    updateTracking(headBoneRef.current, delta);
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

// ===== Fallback Placeholder Character =====

function PlaceholderCharacter({
  animationState,
}: {
  animationState: AnimationState;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const { updateTracking } = useMouseTracking();
  const timeRef = useRef(0);
  const blinkRef = useRef(0);

  const toonMaterial = useMemo(
    () => createToonMaterial(new THREE.Color('#7eb8da')),
    []
  );

  const headMaterial = useMemo(
    () => createToonMaterial(new THREE.Color('#f5d6c8')),
    []
  );

  const eyeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#2a2a3e',
      }),
    []
  );

  const outlineMat = useMemo(() => createOutlineMaterial(), []);

  useFrame((_state: unknown, delta: number) => {
    timeRef.current += delta;
    const t = timeRef.current;

    if (!groupRef.current) return;

    // Procedural breathing
    const breathe = Math.sin(t * 1.5) * 0.02;
    groupRef.current.position.y = breathe;

    // Subtle sway
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.01;

    // State-specific animation
    if (animationState === 'talking') {
      groupRef.current.rotation.x = Math.sin(t * 8) * 0.02;
    } else if (animationState === 'thinking') {
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1 - 0.05;
    } else if (animationState === 'surprised') {
      groupRef.current.scale.setScalar(1 + Math.sin(t * 12) * 0.01);
    } else if (animationState === 'wave') {
      // Handled by arm (not implemented for placeholder)
    }

    // Eye tracking
    updateTracking(headRef.current, delta, 0.2);

    // Blink cycle
    blinkRef.current += delta;
    if (blinkRef.current > 3 + Math.random() * 2) {
      blinkRef.current = 0;
    }
  });

  const isBlinking = blinkRef.current < 0.15;

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      {/* Body (capsule) */}
      <mesh material={toonMaterial} position={[0, 0, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 8, 16]} />
      </mesh>
      <mesh material={outlineMat} position={[0, 0, 0]}>
        <capsuleGeometry args={[0.315, 0.615, 8, 16]} />
      </mesh>

      {/* Head */}
      <mesh
        ref={headRef}
        material={headMaterial}
        position={[0, 0.75, 0]}
      >
        <sphereGeometry args={[0.28, 16, 16]} />
      </mesh>
      <mesh material={outlineMat} position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.295, 16, 16]} />
      </mesh>

      {/* Eyes */}
      <mesh
        material={eyeMaterial}
        position={[-0.09, 0.78, 0.24]}
        scale={isBlinking ? [1, 0.1, 1] : [1, 1, 1]}
      >
        <sphereGeometry args={[0.04, 8, 8]} />
      </mesh>
      <mesh
        material={eyeMaterial}
        position={[0.09, 0.78, 0.24]}
        scale={isBlinking ? [1, 0.1, 1] : [1, 1, 1]}
      >
        <sphereGeometry args={[0.04, 8, 8]} />
      </mesh>

      {/* Eye highlights */}
      <mesh position={[-0.08, 0.795, 0.27]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.1, 0.795, 0.27]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Hair (simple bangs) */}
      <mesh
        material={
          new THREE.ShaderMaterial({
            vertexShader: TOON_VERTEX_SHADER,
            fragmentShader: TOON_FRAGMENT_SHADER,
            uniforms: {
              uColor: { value: new THREE.Color('#3a3a5c') },
              uLightDir: {
                value: new THREE.Vector3(0.5, 1.0, 0.3).normalize(),
              },
              uShadowSmooth: { value: 0.04 },
              uShadowBrightness: { value: 0.4 },
              uRimPower: { value: 2.5 },
              uRimIntensity: { value: 0.6 },
              uRimColor: { value: new THREE.Color('#6688cc') },
              uTexture: { value: new THREE.Texture() },
              uUseTexture: { value: false },
            },
          })
        }
        position={[0, 0.88, 0.05]}
      >
        <sphereGeometry args={[0.29, 16, 12, 0, Math.PI * 2, 0, 1.2]} />
      </mesh>
    </group>
  );
}

// ===== Lighting Setup =====

function ToonLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#b8c4e0" />
      <directionalLight
        position={[3, 5, 2]}
        intensity={0.8}
        color="#ffe8d0"
        castShadow={false}
      />
      <directionalLight
        position={[-2, 3, -1]}
        intensity={0.3}
        color="#d0e0ff"
      />
      {/* Fill light from below for anime-style soft lighting */}
      <pointLight position={[0, -2, 2]} intensity={0.15} color="#ffd4e0" />
    </>
  );
}

// ===== Main Character3D Component =====

export interface Character3DProps {
  /** Path to .glb or .gltf model. If omitted, renders a placeholder character. */
  modelPath?: string;
  /** Current animation state */
  animationState?: AnimationState;
  /** Current facial expression */
  expression?: Expression;
  /** Use nearest-neighbor filtering for pixel-art textures */
  pixelatedTextures?: boolean;
  /** Background color or gradient for the canvas */
  background?: string;
  /** Additional CSS class */
  className?: string;
}

export default function Character3D({
  modelPath,
  animationState = 'idle',
  expression = 'neutral',
  pixelatedTextures = false,
  background = 'transparent',
  className,
}: Character3DProps) {
  const [loadError, setLoadError] = useState(false);

  const handleError = useCallback(() => {
    setLoadError(true);
  }, []);

  return (
    <div
      className={cn(styles.container, className)}
      style={{ background }}
    >
      <Canvas
        flat
        camera={{
          fov: 35,
          position: [0, 0.2, 3],
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onError={handleError}
      >
        <Suspense fallback={null}>
          <ToonLighting />

          {modelPath && !loadError ? (
            <CharacterModel
              modelPath={modelPath}
              animationState={animationState}
              expression={expression}
              pixelatedTextures={pixelatedTextures}
            />
          ) : (
            <PlaceholderCharacter animationState={animationState} />
          )}

          <Environment preset="studio" environmentIntensity={0.2} />
        </Suspense>
      </Canvas>
    </div>
  );
}
