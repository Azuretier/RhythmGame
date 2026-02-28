'use client';

import { useState, useCallback, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei';
import { useTranslations } from 'next-intl';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { cn } from '@/lib/utils';
import { SceneObject, SceneObjectMesh } from './SceneObjectMesh';
import { ObjectPanel } from './ObjectPanel';
import { PropertiesPanel } from './PropertiesPanel';

export type ShapeType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'icosahedron' | 'octahedron';

let nextId = 1;

function createDefaultObject(shape: ShapeType): SceneObject {
  const id = `obj_${nextId++}`;
  return {
    id,
    name: `${shape}_${id}`,
    shape,
    position: [0, 0.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: '#4a9eff',
    metalness: 0.1,
    roughness: 0.6,
    wireframe: false,
    visible: true,
  };
}

function SceneContent({
  objects,
  selectedId,
  onSelect,
}: {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 4, -5]} intensity={0.3} />

      {objects.map((obj) => (
        <SceneObjectMesh
          key={obj.id}
          object={obj}
          isSelected={obj.id === selectedId}
          onSelect={() => onSelect(obj.id)}
        />
      ))}

      <Grid
        args={[20, 20]}
        position={[0, 0, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#333"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#555"
        fadeDistance={25}
        infiniteGrid
      />

      <OrbitControls makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport />
      </GizmoHelper>
      <Environment preset="city" />
    </>
  );
}

export default function GltfGenerator() {
  const t = useTranslations('gltfGenerator');
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const selectedObject = objects.find((o) => o.id === selectedId) ?? null;

  const addObject = useCallback((shape: ShapeType) => {
    const obj = createDefaultObject(shape);
    setObjects((prev) => [...prev, obj]);
    setSelectedId(obj.id);
  }, []);

  const updateObject = useCallback((id: string, updates: Partial<SceneObject>) => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj))
    );
  }, []);

  const deleteObject = useCallback((id: string) => {
    setObjects((prev) => prev.filter((obj) => obj.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const duplicateObject = useCallback((id: string) => {
    setObjects((prev) => {
      const source = prev.find((o) => o.id === id);
      if (!source) return prev;
      const newObj = createDefaultObject(source.shape);
      return [
        ...prev,
        {
          ...source,
          id: newObj.id,
          name: `${source.name}_copy`,
          position: [
            source.position[0] + 1,
            source.position[1],
            source.position[2],
          ] as [number, number, number],
        },
      ];
    });
  }, []);

  const exportGltf = useCallback(async (binary: boolean) => {
    if (!sceneRef.current) return;
    setExporting(true);

    try {
      const exportScene = new THREE.Scene();

      objects.forEach((obj) => {
        if (!obj.visible) return;

        let geometry: THREE.BufferGeometry;
        switch (obj.shape) {
          case 'box':
            geometry = new THREE.BoxGeometry(1, 1, 1);
            break;
          case 'sphere':
            geometry = new THREE.SphereGeometry(0.5, 32, 32);
            break;
          case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
            break;
          case 'cone':
            geometry = new THREE.ConeGeometry(0.5, 1, 32);
            break;
          case 'torus':
            geometry = new THREE.TorusGeometry(0.4, 0.15, 16, 48);
            break;
          case 'plane':
            geometry = new THREE.PlaneGeometry(1, 1);
            break;
          case 'icosahedron':
            geometry = new THREE.IcosahedronGeometry(0.5);
            break;
          case 'octahedron':
            geometry = new THREE.OctahedronGeometry(0.5);
            break;
          default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(obj.color),
          metalness: obj.metalness,
          roughness: obj.roughness,
          wireframe: obj.wireframe,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = obj.name;
        mesh.position.set(...obj.position);
        mesh.rotation.set(...obj.rotation);
        mesh.scale.set(...obj.scale);
        exportScene.add(mesh);
      });

      const exporter = new GLTFExporter();
      const result = await exporter.parseAsync(exportScene, { binary });

      if (binary) {
        const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
        downloadBlob(blob, 'model.glb');
      } else {
        const json = JSON.stringify(result, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        downloadBlob(blob, 'model.gltf');
      }
    } finally {
      setExporting(false);
    }
  }, [objects]);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#111] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <span className="text-xs text-white/40 px-2 py-0.5 rounded bg-white/5 border border-white/10">
            {objects.length} {t('objectCount')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportGltf(false)}
            disabled={objects.length === 0 || exporting}
            className={cn(
              'px-3 py-1.5 text-sm rounded border transition-colors',
              objects.length === 0 || exporting
                ? 'border-white/10 text-white/30 cursor-not-allowed'
                : 'border-white/20 text-white/80 hover:bg-white/10'
            )}
          >
            {t('exportGltf')}
          </button>
          <button
            onClick={() => exportGltf(true)}
            disabled={objects.length === 0 || exporting}
            className={cn(
              'px-3 py-1.5 text-sm rounded transition-colors',
              objects.length === 0 || exporting
                ? 'bg-azure-500/30 text-white/30 cursor-not-allowed'
                : 'bg-azure-500 text-white hover:bg-azure-600'
            )}
          >
            {exporting ? t('exporting') : t('exportGlb')}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel - Object list & Add shapes */}
        <ObjectPanel
          objects={objects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={addObject}
          onDelete={deleteObject}
          onDuplicate={duplicateObject}
          onToggleVisibility={(id) =>
            updateObject(id, {
              visible: !objects.find((o) => o.id === id)?.visible,
            })
          }
        />

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <Canvas
            ref={canvasRef}
            camera={{ position: [4, 3, 4], fov: 50 }}
            shadows
            onCreated={({ scene }) => {
              sceneRef.current = scene;
            }}
            onPointerMissed={() => setSelectedId(null)}
          >
            <Suspense fallback={null}>
              <SceneContent
                objects={objects}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </Suspense>
          </Canvas>
          {objects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-white/30 text-sm">{t('emptyScene')}</p>
            </div>
          )}
        </div>

        {/* Right panel - Properties */}
        <PropertiesPanel
          object={selectedObject}
          onUpdate={(updates) => {
            if (selectedId) updateObject(selectedId, updates);
          }}
        />
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
