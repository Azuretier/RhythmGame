'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ShapePreset, ShapeRadii } from './types';
import { SHAPE_PRESETS, DEFAULT_SHAPE_ID, getShapeById } from './types';
import { getStoredShapeId, setStoredShapeId } from './storage';

interface ShapeContextType {
  currentShape: ShapePreset;
  setShape: (shapeId: string) => void;
  shapes: ShapePreset[];
}

const ShapeContext = createContext<ShapeContextType | undefined>(undefined);

function applyShapeToDocument(radii: ShapeRadii) {
  const root = document.documentElement;
  root.style.setProperty('--theme-radius', radii.radius);
  root.style.setProperty('--theme-radius-sm', radii.radiusSm);
  root.style.setProperty('--theme-radius-lg', radii.radiusLg);
}

export function ShapeProvider({ children }: { children: ReactNode }) {
  const [currentShape, setCurrentShape] = useState<ShapePreset>(
    () => getShapeById(DEFAULT_SHAPE_ID)!
  );

  useEffect(() => {
    const storedId = getStoredShapeId();
    const shape = storedId ? getShapeById(storedId) : getShapeById(DEFAULT_SHAPE_ID)!;
    if (shape) {
      setCurrentShape(shape);
      applyShapeToDocument(shape.radii);
    }
  }, []);

  const setShape = useCallback((shapeId: string) => {
    const shape = getShapeById(shapeId);
    if (!shape) return;
    setCurrentShape(shape);
    setStoredShapeId(shapeId);
    applyShapeToDocument(shape.radii);
  }, []);

  return (
    <ShapeContext.Provider value={{ currentShape, setShape, shapes: SHAPE_PRESETS }}>
      {children}
    </ShapeContext.Provider>
  );
}

export function useShape() {
  const context = useContext(ShapeContext);
  if (context === undefined) {
    throw new Error('useShape must be used within a ShapeProvider');
  }
  return context;
}
