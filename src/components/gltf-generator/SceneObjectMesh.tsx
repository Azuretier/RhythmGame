'use client';

import { useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Edges, Wireframe } from '@react-three/drei';
import * as THREE from 'three';
import { ShadingMode } from './GltfGenerator';

export interface SceneObject {
  id: string;
  name: string;
  shape: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'icosahedron' | 'octahedron';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  metalness: number;
  roughness: number;
  wireframe: boolean;
  visible: boolean;
}

function ShapeGeometry({ shape }: { shape: SceneObject['shape'] }) {
  switch (shape) {
    case 'box': return <boxGeometry args={[1, 1, 1]} />;
    case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
    case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
    case 'cone': return <coneGeometry args={[0.5, 1, 32]} />;
    case 'torus': return <torusGeometry args={[0.4, 0.15, 16, 48]} />;
    case 'plane': return <planeGeometry args={[1, 1]} />;
    case 'icosahedron': return <icosahedronGeometry args={[0.5]} />;
    case 'octahedron': return <octahedronGeometry args={[0.5]} />;
    default: return <boxGeometry args={[1, 1, 1]} />;
  }
}

export function SceneObjectMesh({
  object,
  isSelected,
  onSelect,
  shadingMode,
}: {
  object: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
  shadingMode: ShadingMode;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  if (!object.visible) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  const showWireframe = shadingMode === 'wireframe' || object.wireframe;

  return (
    <mesh
      ref={meshRef}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <ShapeGeometry shape={object.shape} />
      {shadingMode === 'wireframe' ? (
        <meshBasicMaterial color="#888" wireframe />
      ) : shadingMode === 'solid' ? (
        <meshStandardMaterial
          color={object.color}
          metalness={0}
          roughness={1}
          wireframe={object.wireframe}
        />
      ) : (
        <meshStandardMaterial
          color={object.color}
          metalness={object.metalness}
          roughness={object.roughness}
          wireframe={showWireframe}
        />
      )}
      {isSelected && (
        <Edges color="#ED7720" lineWidth={2.5} threshold={15} />
      )}
    </mesh>
  );
}
