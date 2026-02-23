// ===== Skill Tree Types =====

/** Archetypes — each has a unique branching skill tree */
export type Archetype = 'striker' | 'guardian' | 'virtuoso' | 'trickster';

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

export interface ArchetypeMeta {
  id: Archetype;
  /** i18n key suffix (skillTree.archetypes.<nameKey>) */
  nameKey: string;
  /** i18n key suffix for tagline */
  descKey: string;
  /** Accent color for this archetype */
  color: string;
  /** Icon/emoji */
  icon: string;
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
