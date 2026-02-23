// ===== Skill Tree Types =====

/** Archetypes — each has a unique branching skill tree */
export type Archetype = 'striker' | 'guardian' | 'virtuoso' | 'trickster' | 'conductor';

export interface SkillNode {
  id: string;
  archetype: Archetype;
  /** i18n key suffix for name (used as skillTree.nodes.<nameKey>) */
  nameKey: string;
  /** i18n key suffix for description */
  descKey: string;
  /** Icon identifier for the node */
  icon: string;
  /** Skill point cost per level */
  cost: number;
  /** Maximum upgrade level */
  maxLevel: number;
  /** IDs of prerequisite skill nodes (must be fully unlocked) */
  requires: string[];
  /** Power tier (1 = basic, 2 = advanced, 3 = ultimate) */
  tier: number;
  /** Position within the global tree grid (row 0-3, col 0-2) */
  position: { row: number; col: number };
}

/** Stat ratings for subclass stat bars (1–5 scale) */
export interface SubclassStats {
  difficulty: number;
  damage: number;
  defence: number;
  range: number;
  speed: number;
}

/** Subclass metadata for the class detail panel */
export interface SubclassMeta {
  id: string;
  /** i18n key suffix (skillTree.subclasses.<nameKey>) */
  nameKey: string;
  /** Icon identifier */
  icon: string;
  /** Stat ratings (1–5) */
  stats: SubclassStats;
}

export interface ArchetypeMeta {
  id: Archetype;
  /** i18n key suffix (skillTree.archetypes.<nameKey>) */
  nameKey: string;
  /** i18n key suffix for tagline */
  descKey: string;
  /** i18n key suffix for alternate class name (e.g., "Knight" for Warrior) */
  altNameKey: string;
  /** Accent color for this archetype */
  color: string;
  /** Icon/emoji */
  icon: string;
  /** Class difficulty rating (1–5) shown on class selector cards */
  difficulty: number;
  /** Three subclasses per class */
  subclasses: SubclassMeta[];
}

export interface SkillTreeState {
  /** Currently selected archetype (null = not yet chosen) */
  archetype: Archetype | null;
  /** Skill points available to spend */
  skillPoints: number;
  /** Total skill points ever earned */
  totalPointsEarned: number;
  /** Map of skill ID -> current level (0 = not unlocked) */
  unlockedSkills: Record<string, number>;
}
