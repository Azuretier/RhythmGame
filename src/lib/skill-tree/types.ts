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
  /** Which page this node appears on (0-indexed) */
  page: number;
  /** Position within the page grid (row, col — 3 columns: 0, 1, 2) */
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
  /** Number of pages in this archetype's tree */
  pageCount: number;
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
