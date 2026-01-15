import type { ServerRole } from '../types/index.js';
import { Logger } from '../utils/logger.js';

const _logger = new Logger('RoleService');

export const AVAILABLE_ROLES: ServerRole[] = [
  {
    id: 'cutie',
    name: '☆ଓ｡ Cutie ｡ଓ☆',
    description: 'Called sweetheart and means a person with whom someone is having a romantic relationship',
    color: 'oklch(0.75 0.18 350)',
    icon: '💕',
    category: 'special'
  },
  {
    id: 'luminelle',
    name: 'Luminelle',
    description: 'Lightbringer',
    color: 'oklch(0.80 0.15 60)',
    icon: '✨',
    category: 'special'
  },
  {
    id: 'dreamer',
    name: 'Dreamer',
    description: 'Visionary',
    color: 'oklch(0.65 0.18 280)',
    icon: '🌙',
    category: 'interest'
  },
  {
    id: 'enjoyer',
    name: 'Community Fan',
    description: 'Passionate supporter of the community',
    color: 'oklch(0.70 0.15 200)',
    icon: '🎮',
    category: 'interest'
  },
  {
    id: 'talent',
    name: 'Rising Star',
    description: 'Emerging talent in the community',
    color: 'oklch(0.75 0.20 45)',
    icon: '⭐',
    category: 'contribution'
  },
  {
    id: 'gifted',
    name: 'Gifted',
    description: 'Naturally talented individual',
    color: 'oklch(0.72 0.17 320)',
    icon: '🎁',
    category: 'contribution'
  },
  {
    id: 'thinker',
    name: 'Thinker',
    description: 'Intelligent people',
    color: 'oklch(0.60 0.18 240)',
    icon: '🧠',
    category: 'interest'
  },
  {
    id: 'smart',
    name: 'Smart',
    description: 'Smart as it needs no explanation',
    color: 'oklch(0.65 0.15 190)',
    icon: '💡',
    category: 'interest'
  },
  {
    id: 'artist',
    name: 'Artist',
    description: 'Expresser',
    color: 'oklch(0.70 0.20 30)',
    icon: '🎨',
    category: 'contribution'
  },
  {
    id: 'creator',
    name: 'Creator',
    description: 'Creator',
    color: 'oklch(0.68 0.18 90)',
    icon: '🛠️',
    category: 'contribution'
  },
  {
    id: 'translator',
    name: 'Translator',
    description: 'Saving the harmony of the context through languages',
    color: 'oklch(0.72 0.16 150)',
    icon: '🌐',
    category: 'contribution'
  },
  {
    id: 'archeborne',
    name: 'Archeborne',
    description: 'Exist',
    color: 'oklch(0.50 0.15 270)',
    icon: '🗿',
    category: 'special'
  },
  {
    id: 'member',
    name: 'Dream Maker',
    description: 'Member of the community',
    color: 'oklch(0.65 0.15 250)',
    icon: '✦',
    category: 'activity'
  }
];

export class RoleService {
  getAvailableRoles(): ServerRole[] {
    return AVAILABLE_ROLES;
  }

  getRoleById(roleId: string): ServerRole | undefined {
    return AVAILABLE_ROLES.find(role => role.id === roleId);
  }

  getRolesByCategory(category: string): ServerRole[] {
    return AVAILABLE_ROLES.filter(role => role.category === category);
  }

  validateRoles(roleIds: string[]): { valid: boolean; invalidRoles: string[] } {
    const invalidRoles = roleIds.filter(id => !this.getRoleById(id));
    return {
      valid: invalidRoles.length === 0,
      invalidRoles
    };
  }
}

export const roleService = new RoleService();
