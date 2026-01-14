/**
 * UI Version type definitions
 */

export const UI_VERSIONS = ['1.0.0', '1.0.1'] as const;
export type UIVersion = typeof UI_VERSIONS[number];

// Alias for backward compatibility
export type AppVersion = UIVersion;

export interface UIVersionMetadata {
  id: UIVersion;
  name: string;
  description: string;
}

export const VERSION_METADATA: Record<UIVersion, UIVersionMetadata> = {
  '1.0.0': {
    id: '1.0.0',
    name: 'Discord UI',
    description: 'Discord-like messenger interface with social navigation',
  },
  '1.0.1': {
    id: '1.0.1',
    name: 'Patreon UI',
    description: 'Patreon-style creator layout with profile and content feed',
  },
};

// Alias for backward compatibility
export const VERSIONS = VERSION_METADATA;
