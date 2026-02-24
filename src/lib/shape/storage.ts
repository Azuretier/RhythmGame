const SHAPE_STORAGE_KEY = 'azuret_shape';

export function getStoredShapeId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SHAPE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredShapeId(shapeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SHAPE_STORAGE_KEY, shapeId);
  } catch {
    // localStorage may be full or disabled
  }
}
