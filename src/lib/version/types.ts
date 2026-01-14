/**
 * Version types for the application
 */

export type AppVersion = '1.0.0' | '1.0.1';

export interface VersionInfo {
  id: AppVersion;
  name: string;
  description: string;
}

export const VERSIONS: Record<AppVersion, VersionInfo> = {
  '1.0.0': {
    id: '1.0.0',
    name: 'Discord-like UI',
    description: 'Interactive homepage with Discord-like messenger UI and GPU-rendered background'
  },
  '1.0.1': {
    id: '1.0.1',
    name: 'Patreon User UI',
    description: 'Portfolio interface with advanced window management and customizable themes'
  }
};
