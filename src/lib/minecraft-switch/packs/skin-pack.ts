// =============================================================================
// Player Skin Pack System — Skin customization and management
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================
// Manages player skins organized into packs. Each skin defines hex colors
// for body parts (head, body, arms, legs, optional hat and cape) and model
// type (classic or slim/Alex). Ships with Default (Steve/Alex + color variants),
// Battle & Beasts, City Folk, mob-themed, and themed character packs (20+ skins).
// =============================================================================

// =============================================================================
// Interfaces
// =============================================================================

export interface PlayerSkin {
  /** Unique skin identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Pack this skin belongs to. */
  pack: string;
  /** Skin category. */
  category: 'default' | 'pack' | 'custom';
  /** Per-part hex colors. */
  headColor: string;
  bodyColor: string;
  legColor: string;
  armColor: string;
  /** Whether this is the slim (Alex) model. */
  isSlim: boolean;
}

export interface SkinPack {
  id: string;
  name: string;
  description: string;
  skins: PlayerSkin[];
  /** Representative hex color for the pack icon. */
  icon: string;
}

/**
 * Resolved skin colors for rendering.
 */
export interface SkinColors {
  head: string;
  body: string;
  legs: string;
  arms: string;
}

/**
 * Listener invoked when the active skin changes.
 */
export type SkinChangeListener = (skin: PlayerSkin) => void;

// =============================================================================
// Helper: create a skin entry
// =============================================================================

function skin(
  id: string,
  name: string,
  pack: string,
  category: 'default' | 'pack' | 'custom',
  headColor: string,
  bodyColor: string,
  legColor: string,
  armColor: string,
  isSlim: boolean
): PlayerSkin {
  return { id, name, pack, category, headColor, bodyColor, legColor, armColor, isSlim };
}

// =============================================================================
// Default Pack — Steve and Alex with color variants
// =============================================================================

function createDefaultPack(): SkinPack {
  const skins: PlayerSkin[] = [
    // Steve (classic)
    skin('steve', 'Steve', 'default', 'default', '#6B4226', '#3CB0D3', '#3B3B6E', '#C8A87C', false),
    // Alex (slim)
    skin('alex', 'Alex', 'default', 'default', '#C06A2C', '#54893C', '#6B5844', '#D4A87C', true),
    // 8 color variants
    skin('color_red', 'Red', 'default', 'default', '#CC3333', '#FF5555', '#992222', '#DD8888', false),
    skin('color_blue', 'Blue', 'default', 'default', '#3355CC', '#5577FF', '#223399', '#8899DD', false),
    skin('color_green', 'Green', 'default', 'default', '#33AA33', '#55CC55', '#228822', '#88CC88', true),
    skin('color_yellow', 'Yellow', 'default', 'default', '#CCAA22', '#FFDD44', '#997711', '#DDCC88', false),
    skin('color_purple', 'Purple', 'default', 'default', '#8833AA', '#AA55CC', '#662288', '#BB88CC', true),
    skin('color_cyan', 'Cyan', 'default', 'default', '#22AAAA', '#44CCCC', '#118888', '#88CCCC', false),
    skin('color_orange', 'Orange', 'default', 'default', '#CC7722', '#FF9944', '#995511', '#DDAA77', true),
    skin('color_pink', 'Pink', 'default', 'default', '#CC5588', '#FF77AA', '#993366', '#DD99BB', true),
  ];

  return {
    id: 'default',
    name: 'Default',
    description: 'The classic Steve and Alex skins with color variants.',
    skins,
    icon: '#3CB0D3',
  };
}

// =============================================================================
// Themed Pack — Knight, Wizard, Pirate, Astronaut, Ninja, Farmer
// =============================================================================

function createThemedPack(): SkinPack {
  const skins: PlayerSkin[] = [
    skin('themed_knight', 'Knight', 'themed', 'pack', '#888888', '#AAAAAA', '#777777', '#999999', false),
    skin('themed_wizard', 'Wizard', 'themed', 'pack', '#6633AA', '#8855CC', '#553399', '#CCAA44', true),
    skin('themed_pirate', 'Pirate', 'themed', 'pack', '#5B3A1A', '#CC3333', '#3D2B1A', '#B18665', false),
    skin('themed_astronaut', 'Astronaut', 'themed', 'pack', '#DDDDDD', '#EEEEEE', '#CCCCCC', '#4488CC', false),
    skin('themed_ninja', 'Ninja', 'themed', 'pack', '#222222', '#333333', '#1A1A1A', '#2A2A2A', true),
    skin('themed_farmer', 'Farmer', 'themed', 'pack', '#8B6914', '#4A7A25', '#6B5436', '#B18665', false),
  ];

  return {
    id: 'themed',
    name: 'Themed Characters',
    description: 'Fantasy and occupation-themed character skins for role-playing adventures.',
    skins,
    icon: '#AAAAAA',
  };
}

// =============================================================================
// Mob-Themed Pack — Creeper, Enderman, Skeleton, Zombie
// =============================================================================

function createMobThemedPack(): SkinPack {
  const skins: PlayerSkin[] = [
    skin('mob_creeper', 'Creeper', 'mob_themed', 'pack', '#4CAF50', '#388E3C', '#2E7D32', '#43A047', false),
    skin('mob_enderman', 'Enderman', 'mob_themed', 'pack', '#1A1A2E', '#111122', '#0A0A1A', '#6633AA', true),
    skin('mob_skeleton', 'Skeleton', 'mob_themed', 'pack', '#DDDDCC', '#CCCCBB', '#BBBBAA', '#AAAAAA', true),
    skin('mob_zombie', 'Zombie', 'mob_themed', 'pack', '#4A7A25', '#2DACD1', '#38387B', '#5B8B3A', false),
  ];

  return {
    id: 'mob_themed',
    name: 'Mob Skins',
    description: 'Dress up as your favorite Minecraft mobs. Creeper, Enderman, Skeleton, and Zombie.',
    skins,
    icon: '#4CAF50',
  };
}

// =============================================================================
// Battle & Beasts Pack
// =============================================================================

function createBattleAndBeastsPack(): SkinPack {
  const skins: PlayerSkin[] = [
    skin('bb_warrior', 'Warrior', 'battle_beasts', 'pack', '#8B6914', '#A0522D', '#5C3A1E', '#C0A060', false),
    skin('bb_archer', 'Archer', 'battle_beasts', 'pack', '#3E2723', '#2E7D32', '#5D4037', '#4E6B3A', true),
    skin('bb_mage', 'Mage', 'battle_beasts', 'pack', '#E8DCC8', '#4A148C', '#311B92', '#6A1B9A', true),
    skin('bb_knight', 'Knight', 'battle_beasts', 'pack', '#90A4AE', '#B0BEC5', '#607D8B', '#78909C', false),
    skin('bb_dragon', 'Dragon', 'battle_beasts', 'pack', '#2E003E', '#4A0072', '#1A0030', '#3D0059', false),
    skin('bb_wolf', 'Wolf', 'battle_beasts', 'pack', '#9E9E9E', '#757575', '#616161', '#BDBDBD', false),
    skin('bb_bear', 'Bear', 'battle_beasts', 'pack', '#5D4037', '#4E342E', '#3E2723', '#6D4C41', false),
    skin('bb_phoenix', 'Phoenix', 'battle_beasts', 'pack', '#FF6F00', '#E65100', '#BF360C', '#FF8F00', true),
  ];

  return {
    id: 'battle_beasts',
    name: 'Battle & Beasts',
    description: 'Warriors, mages, and mythical creatures ready for battle. 8 themed skins for adventurers.',
    skins,
    icon: '#A0522D',
  };
}

// =============================================================================
// City Folk Pack
// =============================================================================

function createCityFolkPack(): SkinPack {
  const skins: PlayerSkin[] = [
    skin('cf_business', 'Business Executive', 'city_folk', 'pack', '#3E2723', '#263238', '#212121', '#37474F', false),
    skin('cf_chef', 'Chef', 'city_folk', 'pack', '#6D4C41', '#FAFAFA', '#424242', '#F5F5F5', false),
    skin('cf_skater', 'Skater', 'city_folk', 'pack', '#FFB74D', '#F44336', '#1565C0', '#FFCC80', true),
    skin('cf_musician', 'Musician', 'city_folk', 'pack', '#1A237E', '#000000', '#1A1A1A', '#212121', true),
    skin('cf_scientist', 'Scientist', 'city_folk', 'pack', '#795548', '#ECEFF1', '#546E7A', '#CFD8DC', true),
    skin('cf_firefighter', 'Firefighter', 'city_folk', 'pack', '#FFCC80', '#BF360C', '#4E342E', '#D84315', false),
    skin('cf_pilot', 'Pilot', 'city_folk', 'pack', '#5D4037', '#1A237E', '#0D47A1', '#283593', false),
    skin('cf_artist', 'Artist', 'city_folk', 'pack', '#D7CCC8', '#F3E5F5', '#CE93D8', '#E1BEE7', true),
  ];

  return {
    id: 'city_folk',
    name: 'City Folk',
    description: 'Modern urban characters for life in the big city. 8 everyday heroes and creatives.',
    skins,
    icon: '#263238',
  };
}

// =============================================================================
// SkinPackManager
// =============================================================================

export class SkinPackManager {
  private packs: Map<string, SkinPack> = new Map();
  private skinIndex: Map<string, PlayerSkin> = new Map();
  private activeSkinId: string = 'steve';
  private listeners: SkinChangeListener[] = [];

  constructor() {
    // Register all built-in packs
    this.registerPack(createDefaultPack());
    this.registerPack(createThemedPack());
    this.registerPack(createMobThemedPack());
    this.registerPack(createBattleAndBeastsPack());
    this.registerPack(createCityFolkPack());
  }

  // ---------------------------------------------------------------------------
  // Pack Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a skin pack. Indexes all skins within it for fast lookup.
   */
  registerPack(pack: SkinPack): void {
    this.packs.set(pack.id, pack);
    for (const s of pack.skins) {
      this.skinIndex.set(s.id, s);
    }
  }

  /**
   * Register additional skins into an existing or new pack.
   */
  registerSkins(skins: PlayerSkin[], packId?: string): void {
    for (const s of skins) {
      this.skinIndex.set(s.id, s);
    }
    if (packId) {
      const existing = this.packs.get(packId);
      if (existing) {
        existing.skins.push(...skins);
      }
    }
  }

  /**
   * Unregister all skins from a specific pack. Cannot remove the active skin.
   */
  unregisterPack(packId: string): void {
    const pack = this.packs.get(packId);
    if (!pack) return;

    for (const s of pack.skins) {
      if (s.id !== this.activeSkinId) {
        this.skinIndex.delete(s.id);
      }
    }
    this.packs.delete(packId);
  }

  // ---------------------------------------------------------------------------
  // Skin Access
  // ---------------------------------------------------------------------------

  /**
   * Get all available skins across all packs.
   */
  getAvailableSkins(): PlayerSkin[] {
    return Array.from(this.skinIndex.values());
  }

  /**
   * Get all registered packs.
   */
  getAvailablePacks(): SkinPack[] {
    return Array.from(this.packs.values());
  }

  /**
   * Get the currently active skin.
   */
  getActiveSkin(): PlayerSkin {
    return this.skinIndex.get(this.activeSkinId) ?? this.getDefaultSkin();
  }

  /**
   * Get all skins belonging to a specific pack.
   */
  getSkinsByPack(packName: string): PlayerSkin[] {
    const pack = this.packs.get(packName);
    if (!pack) {
      // Also search by pack field on individual skins
      return Array.from(this.skinIndex.values()).filter((s) => s.pack === packName);
    }
    return [...pack.skins];
  }

  /**
   * Get all unique pack names.
   */
  getPackNames(): string[] {
    return Array.from(this.packs.keys());
  }

  // ---------------------------------------------------------------------------
  // Skin Selection
  // ---------------------------------------------------------------------------

  /**
   * Set the active skin by ID. Does nothing if the ID is invalid.
   * Notifies all registered listeners.
   */
  setActiveSkin(skinId: string): void {
    if (!this.skinIndex.has(skinId)) return;
    if (this.activeSkinId === skinId) return;

    this.activeSkinId = skinId;
    const skin = this.getActiveSkin();

    for (const listener of this.listeners) {
      listener(skin);
    }
  }

  // ---------------------------------------------------------------------------
  // Skin Colors for Rendering
  // ---------------------------------------------------------------------------

  /**
   * Get the color palette for a specific skin.
   * Returns the { head, body, legs, arms } colors for use in player rendering.
   */
  getSkinColors(skinId: string): SkinColors {
    const s = this.skinIndex.get(skinId);
    if (!s) {
      return {
        head: '#6B4226',
        body: '#3CB0D3',
        legs: '#3B3B6E',
        arms: '#C8A87C',
      };
    }

    return {
      head: s.headColor,
      body: s.bodyColor,
      legs: s.legColor,
      arms: s.armColor,
    };
  }

  // ---------------------------------------------------------------------------
  // Change Listeners
  // ---------------------------------------------------------------------------

  /**
   * Register a listener for skin changes. Returns an unsubscribe function.
   */
  onSkinChange(listener: SkinChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private getDefaultSkin(): PlayerSkin {
    return this.skinIndex.get('steve') ?? skin(
      'steve', 'Steve', 'default', 'default',
      '#6B4226', '#3CB0D3', '#3B3B6E', '#C8A87C', false
    );
  }
}

// =============================================================================
// Singleton
// =============================================================================

let _instance: SkinPackManager | null = null;

export function getSkinPackManager(): SkinPackManager {
  if (!_instance) {
    _instance = new SkinPackManager();
  }
  return _instance;
}

// =============================================================================
// Exports for pack creation functions (used by mario-mashup.ts etc.)
// =============================================================================

export {
  createDefaultPack,
  createThemedPack,
  createMobThemedPack,
  createBattleAndBeastsPack,
  createCityFolkPack,
};
