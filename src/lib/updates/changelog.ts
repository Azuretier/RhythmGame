/**
 * Changelog and update notification system
 * Tracks all PR changes from #104 onwards
 */

export interface PRUpdate {
  number: number;
  title: string;
  category: 'feature' | 'enhancement' | 'fix' | 'refactor' | 'docs' | 'i18n';
  date: string;
  merged: boolean;
  description: string;
  highlights?: string[];
}

export const PR_UPDATES: PRUpdate[] = [
  {
    number: 104,
    title: 'Add real-time online player count broadcast via Socket.IO',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Implemented real-time online player count tracking with Socket.IO broadcasting',
    highlights: ['Real-time player count updates', 'Socket.IO integration']
  },
  {
    number: 105,
    title: 'Improve multiplayer reconnection and timeout handling',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Enhanced reconnection with grace periods and exponential backoff',
    highlights: ['60s grace period for reconnections', 'Exponential backoff retry logic', 'Session storage persistence']
  },
  {
    number: 106,
    title: 'Improve pixel-perfect rendering in game components',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Enhanced visual fidelity with crisp pixel rendering',
    highlights: ['Removed rounded corners', 'Added pixelated image rendering']
  },
  {
    number: 107,
    title: 'Add procedural block textures and refactor texture atlas system',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Implemented procedural texture generation for voxel blocks',
    highlights: ['11 unique block textures', 'Pre-generated PNG assets', 'Minecraft-style aesthetics']
  },
  {
    number: 108,
    title: 'initial commit - adding i18n',
    category: 'i18n',
    date: '2026-02-07',
    merged: true,
    description: 'Initial internationalization setup with next-intl',
    highlights: ['Japanese and English support', 'Locale routing']
  },
  {
    number: 109,
    title: 'Replace enemy HP system with terrain destruction mechanic',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Transformed enemy HP into dynamic terrain destruction gameplay',
    highlights: ['20x12 procedural terrain grid', 'Stage progression system', 'World cycling every 5 stages']
  },
  {
    number: 110,
    title: 'Adding each translation for en and jp',
    category: 'i18n',
    date: '2026-02-07',
    merged: true,
    description: 'Added comprehensive translations for English and Japanese',
    highlights: ['Complete translation coverage']
  },
  {
    number: 111,
    title: 'Fix grid layout sizing in multiplayer battle component',
    category: 'fix',
    date: '2026-02-07',
    merged: true,
    description: 'Fixed grid layout to use auto sizing for better alignment',
    highlights: ['Pixel-perfect grid alignment']
  },
  {
    number: 112,
    title: 'Add procedural textures and improve PBR rendering for voxel blocks',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Enhanced voxel rendering with PBR materials and procedural maps',
    highlights: ['Detail, bump, and roughness maps', 'Enhanced lighting system', 'Ambient occlusion effects']
  },
  {
    number: 113,
    title: 'Add rhythm-reactive VFX system with fever mode and beat animations',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Introduced comprehensive rhythm-reactive visual effects system',
    highlights: ['8 effect types', 'Fever mode at combo 10+', 'Beat-synchronized animations', 'Rainbow hue cycling']
  },
  {
    number: 114,
    title: 'Add crafting system with floating items and world transitions',
    category: 'feature',
    date: '2026-02-07',
    merged: true,
    description: 'Complete crafting and inventory system with visual effects',
    highlights: ['6 item types', '6 weapon cards', 'Floating item animations', 'World transition effects']
  },
  {
    number: 115,
    title: 'Make RHYTHMIA version configurable and connect WebSocket at page load',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Made game version configurable via JSON config file',
    highlights: ['rhythmia.config.json', 'Lobby WebSocket auto-connect', 'Accurate online player count']
  },
  {
    number: 116,
    title: 'Transform terrain destruction into tower defense game mode',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Added tower defense mechanics with enemy spawning',
    highlights: ['Tower model at terrain center', 'Beat-synchronized enemy spawning', 'Line clears kill enemies']
  },
  {
    number: 117,
    title: 'Memoize useRhythmVFX hook return value to prevent unnecessary re-renders',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Performance optimization for VFX hook',
    highlights: ['Reduced unnecessary re-renders']
  },
  {
    number: 118,
    title: 'Redesign beat indicator with cursor and dual target zones',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'New cursor-based beat timing indicator with on-beat zones',
    highlights: ['Left and right target zones', 'Gold glow on hit window', 'Improved timing feedback']
  },
  {
    number: 119,
    title: 'Redesign item inventory UI with modern card layout and SVG icons',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Modern glass-morphism card design for inventory',
    highlights: ['Custom SVG icons', 'Typography-focused layout', 'Rarity-specific visual effects']
  },
  {
    number: 121,
    title: 'Consolidate online count display in lobby status bar',
    category: 'enhancement',
    date: '2026-02-07',
    merged: true,
    description: 'Unified online player count in lobby UI',
    highlights: ['Single source of truth for player count']
  },
  {
    number: 123,
    title: 'Add ranked matchmaking system with AI fallback',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Implemented competitive ranked matchmaking',
    highlights: ['Tier-based ranking', 'TetrisAI for bot opponents', '8s timeout with AI fallback']
  },
  {
    number: 124,
    title: 'Refactor game layout to three-column symmetric design',
    category: 'refactor',
    date: '2026-02-08',
    merged: true,
    description: 'Redesigned game layout for better visual balance',
    highlights: ['Three-column symmetry']
  },
  {
    number: 125,
    title: 'Refactor RankedMatch to accept WebSocket as prop',
    category: 'refactor',
    date: '2026-02-08',
    merged: true,
    description: 'Improved WebSocket handling in ranked matches',
    highlights: ['Prop-based WebSocket injection']
  },
  {
    number: 126,
    title: 'Refactor terrain generation with fixed dimensions and top-down destruction',
    category: 'refactor',
    date: '2026-02-08',
    merged: true,
    description: 'Improved terrain generation algorithm',
    highlights: ['Fixed dimensions', 'Top-down destruction pattern']
  },
  {
    number: 128,
    title: 'Resolve merge conflict from main branch integration',
    category: 'fix',
    date: '2026-02-08',
    merged: true,
    description: 'Fixed merge conflicts from main branch',
    highlights: ['Branch synchronization']
  },
  {
    number: 129,
    title: 'Add achievements system with progression tracking and multiplayer unlock',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Complete achievements system with 13+ advancement types',
    highlights: ['Progression tracking', 'Firestore sync', 'Toast notifications', 'Battle arena gating']
  },
  {
    number: 130,
    title: 'Merge main branch advancements into ModelViewer feature branch',
    category: 'fix',
    date: '2026-02-08',
    merged: true,
    description: 'Branch merge for ModelViewer feature',
    highlights: ['Feature branch synchronization']
  },
  {
    number: 131,
    title: 'Resolve merge conflicts with main branch',
    category: 'fix',
    date: '2026-02-08',
    merged: true,
    description: 'Resolved merge conflicts',
    highlights: ['Conflict resolution']
  },
  {
    number: 132,
    title: 'Add notification center for advancement unlocks',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Notification center UI for tracking achievements',
    highlights: ['Bell icon with badge', 'Dropdown notification list', 'Mark as read functionality']
  },
  {
    number: 133,
    title: 'Add world-themed terrain colors and fix vanilla mode terrain generation',
    category: 'enhancement',
    date: '2026-02-08',
    merged: true,
    description: 'Enhanced terrain visuals with world-specific colors',
    highlights: ['World-themed color palettes', 'Fixed vanilla mode']
  },
  {
    number: 134,
    title: 'Upgrade React Three Fiber ecosystem and fix React 19 type incompatibilities',
    category: 'enhancement',
    date: '2026-02-08',
    merged: true,
    description: 'Upgraded 3D rendering libraries and fixed type issues',
    highlights: ['React Three Fiber upgrade', 'React 19 compatibility']
  },
  {
    number: 135,
    title: 'Add tower defense mechanics with turret, bullets, and impact effects',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Expanded tower defense with turrets and projectiles',
    highlights: ['Turret system', 'Bullet mechanics', 'Impact visual effects']
  },
  {
    number: 136,
    title: 'Enhance bullet visuals and improve tower defense gameplay speed',
    category: 'enhancement',
    date: '2026-02-08',
    merged: true,
    description: 'Improved tower defense gameplay and visuals',
    highlights: ['Enhanced bullet graphics', 'Faster gameplay']
  },
  {
    number: 139,
    title: 'Add advancement system with live notifications to Rhythmia game',
    category: 'feature',
    date: '2026-02-08',
    merged: true,
    description: 'Integrated advancement system into main game',
    highlights: ['Live unlock notifications', 'Game integration']
  },
  {
    number: 140,
    title: 'Redesign ModelViewer with dark theme and improved styling',
    category: 'enhancement',
    date: '2026-02-09',
    merged: true,
    description: 'Visual overhaul for 3D model viewer',
    highlights: ['Dark theme', 'Modern styling']
  },
  {
    number: 141,
    title: 'Refactor pause menu with theme selector and notifications',
    category: 'refactor',
    date: '2026-02-09',
    merged: true,
    description: 'Enhanced pause menu with new features',
    highlights: ['Theme selector', 'Notification integration']
  },
  {
    number: 142,
    title: 'Add Discord community link to header',
    category: 'feature',
    date: '2026-02-09',
    merged: true,
    description: 'Added Discord community navigation link',
    highlights: ['Discord integration']
  },
  {
    number: 144,
    title: 'Add SEO files and implement grid-based enemy movement system',
    category: 'feature',
    date: '2026-02-10',
    merged: true,
    description: 'SEO improvements and enemy AI enhancement',
    highlights: ['SEO metadata', 'Grid-based pathfinding']
  },
  {
    number: 146,
    title: 'Update CLAUDE.md with i18n, ranked, advancements, and deployment details',
    category: 'docs',
    date: '2026-02-10',
    merged: true,
    description: 'Comprehensive documentation update',
    highlights: ['Architecture documentation', 'Feature documentation']
  },
  {
    number: 148,
    title: 'Add world progression system with visual indicators',
    category: 'feature',
    date: '2026-02-10',
    merged: true,
    description: 'World progression tracking with UI indicators',
    highlights: ['Visual progress indicators', 'World tracking']
  }
];

/**
 * Get updates categorized by type
 */
export function getUpdatesByCategory() {
  const categories = new Map<string, PRUpdate[]>();
  
  for (const update of PR_UPDATES) {
    if (!categories.has(update.category)) {
      categories.set(update.category, []);
    }
    categories.get(update.category)!.push(update);
  }
  
  return categories;
}

/**
 * Get recent updates (last N merged PRs)
 */
export function getRecentUpdates(count: number = 10): PRUpdate[] {
  return PR_UPDATES
    .filter(pr => pr.merged)
    .sort((a, b) => b.number - a.number)
    .slice(0, count);
}

/**
 * Get updates by date range
 */
export function getUpdatesByDateRange(startDate: string, endDate?: string): PRUpdate[] {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  return PR_UPDATES.filter(pr => {
    const prDate = new Date(pr.date);
    return prDate >= start && prDate <= end && pr.merged;
  });
}

/**
 * Get update statistics
 */
export function getUpdateStats() {
  const merged = PR_UPDATES.filter(pr => pr.merged);
  const categories = getUpdatesByCategory();
  
  return {
    total: PR_UPDATES.length,
    merged: merged.length,
    byCategory: {
      feature: categories.get('feature')?.length || 0,
      enhancement: categories.get('enhancement')?.length || 0,
      fix: categories.get('fix')?.length || 0,
      refactor: categories.get('refactor')?.length || 0,
      docs: categories.get('docs')?.length || 0,
      i18n: categories.get('i18n')?.length || 0,
    },
    dateRange: {
      start: merged[0]?.date || '',
      end: merged[merged.length - 1]?.date || '',
    }
  };
}
