// ===== Skill Tree Types =====

export type SkillCategory = 'speed' | 'power' | 'technique' | 'rhythm' | 'survival';

export interface SkillNode {
  id: string;
  category: SkillCategory;
  /** i18n key suffix for name (used as skillTree.nodes.<nameKey>) */
  nameKey: string;
  /** i18n key suffix for description */
  descKey: string;
  /** Icon identifier for the node */
  icon: string;
  /** Skill point cost to unlock */
  cost: number;
  /** Maximum upgrade level */
  maxLevel: number;
  /** IDs of prerequisite skill nodes (must be fully unlocked) */
  requires: string[];
  /** Position in the tree grid (row, col) for visual layout */
  position: { row: number; col: number };
}

export interface SkillTreeState {
  /** Skill points available to spend */
  skillPoints: number;
  /** Total skill points ever earned */
  totalPointsEarned: number;
  /** Map of skill ID -> current level (0 = not unlocked) */
  unlockedSkills: Record<string, number>;
}
