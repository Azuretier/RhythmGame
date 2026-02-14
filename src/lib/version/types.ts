/**
 * UI Version type definitions
 */

export const UI_VERSIONS = ['current', '1.0.0', '1.0.1', '1.0.2'] as const;
export type UIVersion = typeof UI_VERSIONS[number];

// Alias for backward compatibility
export type AppVersion = UIVersion;

export const DEFAULT_VERSION: UIVersion = 'current';

export interface UIVersionMetadata {
  id: UIVersion;
  name: string;
  description: string;
}

export const VERSION_METADATA: Record<UIVersion, UIVersionMetadata> = {
  current: {
    id: 'current',
    name: 'Rhythmia',
    description: 'Play solo, battle 1v1, or join 9-player arenas',
  },
  '1.0.0': {
    id: '1.0.0',
    name: 'Discord UI',
    description: 'Chat with Azur to find social links and profiles',
  },
  '1.0.1': {
    id: '1.0.1',
    name: 'Patreon UI',
    description: 'Creator portfolio with posts and social links',
  },
  '1.0.2': {
    id: '1.0.2',
    name: 'Minecraft: Switch Edition',
    description: 'Classic console menu with rotating panorama',
  },
};

// Alias for backward compatibility
export const VERSIONS = VERSION_METADATA;

/**
 * Accent color / appearance definitions
 */

export const ACCENT_COLORS = [
  'azure',
  'purple',
  'emerald',
  'rose',
  'amber',
] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

export const DEFAULT_ACCENT: AccentColor = 'azure';

export interface AccentColorMetadata {
  id: AccentColor;
  name: string;
  value: string;
  hsl: string;
}

export const ACCENT_COLOR_METADATA: Record<AccentColor, AccentColorMetadata> = {
  azure: { id: 'azure', name: 'Azure', value: '#007FFF', hsl: '210 100% 50%' },
  purple: { id: 'purple', name: 'Purple', value: '#8B5CF6', hsl: '258 90% 66%' },
  emerald: { id: 'emerald', name: 'Emerald', value: '#10B981', hsl: '160 84% 39%' },
  rose: { id: 'rose', name: 'Rose', value: '#F43F5E', hsl: '350 89% 60%' },
  amber: { id: 'amber', name: 'Amber', value: '#F59E0B', hsl: '38 92% 50%' },
};
