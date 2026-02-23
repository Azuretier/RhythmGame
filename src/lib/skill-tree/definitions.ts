import type { SkillNode } from './types';

/**
 * Skill tree node definitions.
 *
 * The tree has 5 branches (categories):
 *  - speed:     Drop speed & soft drop bonuses
 *  - power:     Score multipliers & line clear bonuses
 *  - technique: T-Spin & combo bonuses
 *  - rhythm:    Beat timing & perfect beat rewards
 *  - survival:  Board tolerance & recovery aids
 *
 * Layout: each category occupies a column (0-4), nodes flow downward (rows).
 * Top node in each column has no prerequisites; deeper nodes require the one above.
 */
export const SKILL_NODES: SkillNode[] = [
  // ===== Speed (column 0) =====
  {
    id: 'speed_drop',
    category: 'speed',
    nameKey: 'speedDrop',
    descKey: 'speedDropDesc',
    icon: 'bolt',
    cost: 1,
    maxLevel: 3,
    requires: [],
    position: { row: 0, col: 0 },
  },
  {
    id: 'speed_soft',
    category: 'speed',
    nameKey: 'speedSoft',
    descKey: 'speedSoftDesc',
    icon: 'arrow-down',
    cost: 2,
    maxLevel: 3,
    requires: ['speed_drop'],
    position: { row: 1, col: 0 },
  },
  {
    id: 'speed_das',
    category: 'speed',
    nameKey: 'speedDas',
    descKey: 'speedDasDesc',
    icon: 'fast-forward',
    cost: 3,
    maxLevel: 2,
    requires: ['speed_soft'],
    position: { row: 2, col: 0 },
  },

  // ===== Power (column 1) =====
  {
    id: 'power_score',
    category: 'power',
    nameKey: 'powerScore',
    descKey: 'powerScoreDesc',
    icon: 'gem',
    cost: 1,
    maxLevel: 3,
    requires: [],
    position: { row: 0, col: 1 },
  },
  {
    id: 'power_lines',
    category: 'power',
    nameKey: 'powerLines',
    descKey: 'powerLinesDesc',
    icon: 'layers',
    cost: 2,
    maxLevel: 3,
    requires: ['power_score'],
    position: { row: 1, col: 1 },
  },
  {
    id: 'power_tetris',
    category: 'power',
    nameKey: 'powerTetris',
    descKey: 'powerTetrisDesc',
    icon: 'star',
    cost: 3,
    maxLevel: 2,
    requires: ['power_lines'],
    position: { row: 2, col: 1 },
  },

  // ===== Technique (column 2) =====
  {
    id: 'tech_tspin',
    category: 'technique',
    nameKey: 'techTSpin',
    descKey: 'techTSpinDesc',
    icon: 'spin',
    cost: 1,
    maxLevel: 3,
    requires: [],
    position: { row: 0, col: 2 },
  },
  {
    id: 'tech_combo',
    category: 'technique',
    nameKey: 'techCombo',
    descKey: 'techComboDesc',
    icon: 'flame',
    cost: 2,
    maxLevel: 3,
    requires: ['tech_tspin'],
    position: { row: 1, col: 2 },
  },
  {
    id: 'tech_backtoback',
    category: 'technique',
    nameKey: 'techBackToBack',
    descKey: 'techBackToBackDesc',
    icon: 'chain',
    cost: 3,
    maxLevel: 2,
    requires: ['tech_combo'],
    position: { row: 2, col: 2 },
  },

  // ===== Rhythm (column 3) =====
  {
    id: 'rhythm_timing',
    category: 'rhythm',
    nameKey: 'rhythmTiming',
    descKey: 'rhythmTimingDesc',
    icon: 'note',
    cost: 1,
    maxLevel: 3,
    requires: [],
    position: { row: 0, col: 3 },
  },
  {
    id: 'rhythm_perfect',
    category: 'rhythm',
    nameKey: 'rhythmPerfect',
    descKey: 'rhythmPerfectDesc',
    icon: 'sparkle',
    cost: 2,
    maxLevel: 3,
    requires: ['rhythm_timing'],
    position: { row: 1, col: 3 },
  },
  {
    id: 'rhythm_fever',
    category: 'rhythm',
    nameKey: 'rhythmFever',
    descKey: 'rhythmFeverDesc',
    icon: 'fire',
    cost: 3,
    maxLevel: 2,
    requires: ['rhythm_perfect'],
    position: { row: 2, col: 3 },
  },

  // ===== Survival (column 4) =====
  {
    id: 'survival_shield',
    category: 'survival',
    nameKey: 'survivalShield',
    descKey: 'survivalShieldDesc',
    icon: 'shield',
    cost: 1,
    maxLevel: 3,
    requires: [],
    position: { row: 0, col: 4 },
  },
  {
    id: 'survival_recovery',
    category: 'survival',
    nameKey: 'survivalRecovery',
    descKey: 'survivalRecoveryDesc',
    icon: 'heart',
    cost: 2,
    maxLevel: 3,
    requires: ['survival_shield'],
    position: { row: 1, col: 4 },
  },
  {
    id: 'survival_laststand',
    category: 'survival',
    nameKey: 'survivalLastStand',
    descKey: 'survivalLastStandDesc',
    icon: 'crown',
    cost: 3,
    maxLevel: 2,
    requires: ['survival_recovery'],
    position: { row: 2, col: 4 },
  },
];

/** Total number of skill points needed to max all nodes */
export const MAX_TOTAL_POINTS = SKILL_NODES.reduce(
  (sum, node) => sum + node.cost * node.maxLevel,
  0
);

/** Points awarded per game played */
export const POINTS_PER_GAME = 1;

/** Bonus points for multiplayer win */
export const POINTS_PER_MP_WIN = 1;
