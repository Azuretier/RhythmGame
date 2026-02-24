export interface ShapeRadii {
  /** Base border-radius (cards, panels) */
  radius: string;
  /** Small border-radius (inputs, small elements) */
  radiusSm: string;
  /** Large border-radius (modals, large containers) */
  radiusLg: string;
}

export interface ShapePreset {
  id: string;
  radii: ShapeRadii;
}

export const SHAPE_PRESETS: ShapePreset[] = [
  {
    id: 'default',
    radii: { radius: '12px', radiusSm: '8px', radiusLg: '16px' },
  },
  {
    id: 'rounded',
    radii: { radius: '20px', radiusSm: '14px', radiusLg: '28px' },
  },
  {
    id: 'pill',
    radii: { radius: '9999px', radiusSm: '9999px', radiusLg: '9999px' },
  },
  {
    id: 'soft',
    radii: { radius: '6px', radiusSm: '4px', radiusLg: '8px' },
  },
  {
    id: 'sharp',
    radii: { radius: '0px', radiusSm: '0px', radiusLg: '0px' },
  },
];

export function getShapeById(id: string): ShapePreset | undefined {
  return SHAPE_PRESETS.find(s => s.id === id);
}

export const DEFAULT_SHAPE_ID = 'default';
