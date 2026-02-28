'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment, ContactShadows } from '@react-three/drei';
import { useTranslations } from 'next-intl';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { SceneObject, SceneObjectMesh } from './SceneObjectMesh';
import { Outliner } from './Outliner';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';
import { ViewportHeader } from './ViewportHeader';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';

export type ShapeType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'icosahedron' | 'octahedron';
export type ShadingMode = 'solid' | 'material' | 'wireframe' | 'rendered';
export type TransformMode = 'grab' | 'rotate' | 'scale' | 'cursor';

let nextId = 1;

function createDefaultObject(shape: ShapeType): SceneObject {
  const id = `obj_${nextId++}`;
  return {
    id,
    name: `${shape.charAt(0).toUpperCase() + shape.slice(1)}`,
    shape,
    position: [0, shape === 'plane' ? 0 : 0.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: '#E8E8E8',
    metalness: 0.0,
    roughness: 0.5,
    wireframe: false,
    visible: true,
  };
}

function SceneContent({
  objects,
  selectedId,
  onSelect,
  shadingMode,
  showGrid,
}: {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  shadingMode: ShadingMode;
  showGrid: boolean;
}) {
  return (
    <>
      <ambientLight intensity={shadingMode === 'rendered' ? 0.3 : 0.6} />
      <directionalLight position={[5, 8, 5]} intensity={shadingMode === 'rendered' ? 1.2 : 0.8} castShadow />
      <directionalLight position={[-3, 4, -5]} intensity={0.2} />
      {shadingMode === 'rendered' && <pointLight position={[-5, 3, 0]} intensity={0.4} color="#b4c7ff" />}

      {objects.map((obj) => (
        <SceneObjectMesh
          key={obj.id}
          object={obj}
          isSelected={obj.id === selectedId}
          onSelect={() => onSelect(obj.id)}
          shadingMode={shadingMode}
        />
      ))}

      {showGrid && (
        <Grid
          args={[30, 30]}
          position={[0, 0, 0]}
          cellSize={1}
          cellThickness={0.4}
          cellColor="#444"
          sectionSize={5}
          sectionThickness={0.8}
          sectionColor="#666"
          fadeDistance={30}
          infiniteGrid
        />
      )}

      {shadingMode === 'rendered' && (
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={20} blur={2} />
      )}

      <OrbitControls makeDefault />
      <GizmoHelper alignment="top-right" margin={[70, 70]}>
        <GizmoViewport axisColors={['#e74444', '#68c468', '#4488ee']} labelColor="white" />
      </GizmoHelper>
      {shadingMode === 'rendered' && <Environment preset="studio" />}
    </>
  );
}

export default function GltfGenerator() {
  const t = useTranslations('gltfGenerator');
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [shadingMode, setShadingMode] = useState<ShadingMode>('solid');
  const [showGrid, setShowGrid] = useState(true);
  const [transformMode, setTransformMode] = useState<TransformMode>('grab');
  const [rightPanelTab, setRightPanelTab] = useState<'outliner' | 'properties'>('outliner');
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
          name: `${source.name}.001`,
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
          case 'box': geometry = new THREE.BoxGeometry(1, 1, 1); break;
          case 'sphere': geometry = new THREE.SphereGeometry(0.5, 32, 32); break;
          case 'cylinder': geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
          case 'cone': geometry = new THREE.ConeGeometry(0.5, 1, 32); break;
          case 'torus': geometry = new THREE.TorusGeometry(0.4, 0.15, 16, 48); break;
          case 'plane': geometry = new THREE.PlaneGeometry(1, 1); break;
          case 'icosahedron': geometry = new THREE.IcosahedronGeometry(0.5); break;
          case 'octahedron': geometry = new THREE.OctahedronGeometry(0.5); break;
          default: geometry = new THREE.BoxGeometry(1, 1, 1);
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

  const clearScene = useCallback(() => {
    setObjects([]);
    setSelectedId(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'x' || e.key === 'Delete') {
        if (selectedId) { e.preventDefault(); deleteObject(selectedId); }
      } else if (e.key === 'd' && e.shiftKey) {
        if (selectedId) { e.preventDefault(); duplicateObject(selectedId); }
      } else if (e.key === 'h') {
        if (selectedId) {
          e.preventDefault();
          updateObject(selectedId, { visible: !objects.find((o) => o.id === selectedId)?.visible });
        }
      } else if (e.key === 'a') {
        e.preventDefault();
        setSelectedId(null);
      } else if (e.key === 'g') {
        setTransformMode('grab');
      } else if (e.key === 'r') {
        setTransformMode('rotate');
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        setTransformMode('scale');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, objects, deleteObject, duplicateObject, updateObject]);

  return (
    <div className="fixed inset-0 flex flex-col select-none" style={{ background: '#1D1D1D', color: '#ccc' }}>
      {/* Menu Bar */}
      <MenuBar
        onAdd={addObject}
        onExportGltf={() => exportGltf(false)}
        onExportGlb={() => exportGltf(true)}
        onClearScene={clearScene}
        onDelete={selectedId ? () => deleteObject(selectedId) : undefined}
        onDuplicate={selectedId ? () => duplicateObject(selectedId) : undefined}
        canExport={objects.length > 0 && !exporting}
        exporting={exporting}
      />

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <Toolbar
          transformMode={transformMode}
          onSetTransformMode={setTransformMode}
        />

        {/* 3D Viewport — takes up all remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#1D1D1D' }}>
          <ViewportHeader
            shadingMode={shadingMode}
            onSetShadingMode={setShadingMode}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
          />
          <div className="flex-1 relative overflow-hidden">
            <Canvas
              camera={{ position: [5, 3.5, 5], fov: 45 }}
              shadows
              onCreated={({ scene }) => { sceneRef.current = scene; }}
              onPointerMissed={() => setSelectedId(null)}
              style={{ position: 'absolute', inset: 0, background: '#191919' }}
            >
              <Suspense fallback={null}>
                <SceneContent
                  objects={objects}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  shadingMode={shadingMode}
                  showGrid={showGrid}
                />
              </Suspense>
            </Canvas>
            {objects.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-[#555] text-sm">{t('emptyScene')}</p>
                  <p className="text-[#444] text-xs mt-1">{t('shortcutHint')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar: Outliner + Properties */}
        <div className="flex flex-col shrink-0 overflow-hidden" style={{ width: 280, background: '#303030', borderLeft: '1px solid #1a1a1a' }}>
          {/* Tab headers */}
          <div className="flex shrink-0" style={{ background: '#2a2a2a', borderBottom: '1px solid #1a1a1a' }}>
            <button
              onClick={() => setRightPanelTab('outliner')}
              className="flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                background: rightPanelTab === 'outliner' ? '#303030' : 'transparent',
                color: rightPanelTab === 'outliner' ? '#ddd' : '#888',
                borderBottom: rightPanelTab === 'outliner' ? '2px solid #5680C2' : '2px solid transparent',
              }}
            >
              {t('outliner')}
            </button>
            <button
              onClick={() => setRightPanelTab('properties')}
              className="flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                background: rightPanelTab === 'properties' ? '#303030' : 'transparent',
                color: rightPanelTab === 'properties' ? '#ddd' : '#888',
                borderBottom: rightPanelTab === 'properties' ? '2px solid #5680C2' : '2px solid transparent',
              }}
            >
              {t('propertiesTab')}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {rightPanelTab === 'outliner' ? (
              <Outliner
                objects={objects}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onDelete={deleteObject}
                onDuplicate={duplicateObject}
                onToggleVisibility={(id) =>
                  updateObject(id, { visible: !objects.find((o) => o.id === id)?.visible })
                }
                onRename={(id, name) => updateObject(id, { name })}
              />
            ) : (
              <PropertiesPanel
                object={selectedObject}
                onUpdate={(updates) => {
                  if (selectedId) updateObject(selectedId, updates);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        objectCount={objects.length}
        selectedObject={selectedObject}
        transformMode={transformMode}
      />
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
