import type { SkillNode, ArchetypeMeta, Archetype } from './types';

/**
 * Archetype metadata.
 *
 * Each archetype has a unique colour, icon, and personality.
 * - Striker:   aggressive scorer — red / fire
 * - Guardian:  resilient survivor — green / shield
 * - Virtuoso:  technical precision — purple / target
 * - Trickster: speed & disruption — cyan / bolt
 */
export const ARCHETYPES: ArchetypeMeta[] = [
  {
    id: 'striker',
    nameKey: 'striker',
    descKey: 'strikerDesc',
    color: '#EF5350',
    icon: '\uD83D\uDD25',
  },
  {
    id: 'guardian',
    nameKey: 'guardian',
    descKey: 'guardianDesc',
    color: '#66BB6A',
    icon: '\uD83D\uDEE1\uFE0F',
  },
  {
    id: 'virtuoso',
    nameKey: 'virtuoso',
    descKey: 'virtuosoDesc',
    color: '#AB47BC',
    icon: '\uD83C\uDFAF',
  },
  {
    id: 'trickster',
    nameKey: 'trickster',
    descKey: 'tricksterDesc',
    color: '#4FC3F7',
    icon: '\u26A1',
  },
];

// =========================================================
//  Skill nodes — unique trees per archetype
//
//  Global grid: 3 columns (0-2), 4 rows (0-3) top-down.
//  Tier 1 = rows 0-1, Tier 2 = row 2, Tier 3 = row 3.
//  Connection lines are drawn between requires → child.
// =========================================================

export const SKILL_NODES: SkillNode[] = [
  // =====================================================
  //  STRIKER — aggressive V-shape branching
  //
  //  Row 0:         [score_amp]
  //                  /         \
  //  Row 1:  [line_surge]   [combo_ignite]
  //                |      \   |   /    |
  //  Row 2:  [tetris_force]  [chain_fire]  [fever_spark]
  //                    \        |       /
  //  Row 3:        [devastator]     [overdrive]
  // =====================================================
  {
    id: 'stk_score_amp',
    archetype: 'striker',
    nameKey: 'stkScoreAmp',
    descKey: 'stkScoreAmpDesc',
    icon: 'gem',
    cost: 1,
    maxLevel: 3,
    requires: [],
    tier: 1,
    position: { row: 0, col: 1 },
  },
  {
    id: 'stk_line_surge',
    archetype: 'striker',
    nameKey: 'stkLineSurge',
    descKey: 'stkLineSurgeDesc',
    icon: 'layers',
    cost: 1,
    maxLevel: 3,
    requires: ['stk_score_amp'],
    tier: 1,
    position: { row: 1, col: 0 },
  },
  {
    id: 'stk_combo_ignite',
    archetype: 'striker',
    nameKey: 'stkComboIgnite',
    descKey: 'stkComboIgniteDesc',
    icon: 'flame',
    cost: 1,
    maxLevel: 3,
    requires: ['stk_score_amp'],
    tier: 1,
    position: { row: 1, col: 2 },
  },
  {
    id: 'stk_tetris_force',
    archetype: 'striker',
    nameKey: 'stkTetrisForce',
    descKey: 'stkTetrisForceDesc',
    icon: 'star',
    cost: 2,
    maxLevel: 2,
    requires: ['stk_line_surge'],
    tier: 2,
    position: { row: 2, col: 0 },
  },
  {
    id: 'stk_chain_fire',
    archetype: 'striker',
    nameKey: 'stkChainFire',
    descKey: 'stkChainFireDesc',
    icon: 'chain',
    cost: 2,
    maxLevel: 2,
    requires: ['stk_line_surge', 'stk_combo_ignite'],
    tier: 2,
    position: { row: 2, col: 1 },
  },
  {
    id: 'stk_fever_spark',
    archetype: 'striker',
    nameKey: 'stkFeverSpark',
    descKey: 'stkFeverSparkDesc',
    icon: 'fire',
    cost: 2,
    maxLevel: 2,
    requires: ['stk_combo_ignite'],
    tier: 2,
    position: { row: 2, col: 2 },
  },
  {
    id: 'stk_devastator',
    archetype: 'striker',
    nameKey: 'stkDevastator',
    descKey: 'stkDevastatorDesc',
    icon: 'crown',
    cost: 3,
    maxLevel: 1,
    requires: ['stk_tetris_force', 'stk_chain_fire'],
    tier: 3,
    position: { row: 3, col: 0 },
  },
  {
    id: 'stk_overdrive',
    archetype: 'striker',
    nameKey: 'stkOverdrive',
    descKey: 'stkOverdriveDesc',
    icon: 'sparkle',
    cost: 3,
    maxLevel: 1,
    requires: ['stk_chain_fire', 'stk_fever_spark'],
    tier: 3,
    position: { row: 3, col: 2 },
  },

  // =====================================================
  //  GUARDIAN — defensive funnel pattern
  //
  //  Row 0:           [fortify]
  //                       |
  //  Row 1:         [board_shield]
  //                 /      |      \
  //  Row 2:  [last_stand] [recovery] [steady_hand]
  //                  \      |      /
  //  Row 3:          [sanctuary]
  // =====================================================
  {
    id: 'grd_fortify',
    archetype: 'guardian',
    nameKey: 'grdFortify',
    descKey: 'grdFortifyDesc',
    icon: 'shield',
    cost: 1,
    maxLevel: 3,
    requires: [],
    tier: 1,
    position: { row: 0, col: 1 },
  },
  {
    id: 'grd_board_shield',
    archetype: 'guardian',
    nameKey: 'grdBoardShield',
    descKey: 'grdBoardShieldDesc',
    icon: 'heart',
    cost: 1,
    maxLevel: 3,
    requires: ['grd_fortify'],
    tier: 1,
    position: { row: 1, col: 1 },
  },
  {
    id: 'grd_last_stand',
    archetype: 'guardian',
    nameKey: 'grdLastStand',
    descKey: 'grdLastStandDesc',
    icon: 'crown',
    cost: 2,
    maxLevel: 2,
    requires: ['grd_board_shield'],
    tier: 2,
    position: { row: 2, col: 0 },
  },
  {
    id: 'grd_recovery',
    archetype: 'guardian',
    nameKey: 'grdRecovery',
    descKey: 'grdRecoveryDesc',
    icon: 'heart',
    cost: 2,
    maxLevel: 2,
    requires: ['grd_board_shield'],
    tier: 2,
    position: { row: 2, col: 1 },
  },
  {
    id: 'grd_steady_hand',
    archetype: 'guardian',
    nameKey: 'grdSteadyHand',
    descKey: 'grdSteadyHandDesc',
    icon: 'note',
    cost: 2,
    maxLevel: 2,
    requires: ['grd_board_shield'],
    tier: 2,
    position: { row: 2, col: 2 },
  },
  {
    id: 'grd_sanctuary',
    archetype: 'guardian',
    nameKey: 'grdSanctuary',
    descKey: 'grdSanctuaryDesc',
    icon: 'sparkle',
    cost: 3,
    maxLevel: 1,
    requires: ['grd_last_stand', 'grd_recovery', 'grd_steady_hand'],
    tier: 3,
    position: { row: 3, col: 1 },
  },

  // =====================================================
  //  VIRTUOSO — wide diamond shape
  //
  //  Row 0:       [precision]
  //                /         \
  //  Row 1:  [tspin_adept]   [beat_sync]
  //               |    \    /   |
  //  Row 2:  [tspin_master] [harmonic] [perfect_rhythm]
  //                  \       |       /
  //  Row 3:     [grand_master]  [crescendo]
  // =====================================================
  {
    id: 'vrt_precision',
    archetype: 'virtuoso',
    nameKey: 'vrtPrecision',
    descKey: 'vrtPrecisionDesc',
    icon: 'gem',
    cost: 1,
    maxLevel: 3,
    requires: [],
    tier: 1,
    position: { row: 0, col: 1 },
  },
  {
    id: 'vrt_tspin_adept',
    archetype: 'virtuoso',
    nameKey: 'vrtTSpinAdept',
    descKey: 'vrtTSpinAdeptDesc',
    icon: 'spin',
    cost: 1,
    maxLevel: 3,
    requires: ['vrt_precision'],
    tier: 1,
    position: { row: 1, col: 0 },
  },
  {
    id: 'vrt_beat_sync',
    archetype: 'virtuoso',
    nameKey: 'vrtBeatSync',
    descKey: 'vrtBeatSyncDesc',
    icon: 'note',
    cost: 1,
    maxLevel: 3,
    requires: ['vrt_precision'],
    tier: 1,
    position: { row: 1, col: 2 },
  },
  {
    id: 'vrt_tspin_master',
    archetype: 'virtuoso',
    nameKey: 'vrtTSpinMaster',
    descKey: 'vrtTSpinMasterDesc',
    icon: 'spin',
    cost: 2,
    maxLevel: 2,
    requires: ['vrt_tspin_adept'],
    tier: 2,
    position: { row: 2, col: 0 },
  },
  {
    id: 'vrt_harmonic',
    archetype: 'virtuoso',
    nameKey: 'vrtHarmonic',
    descKey: 'vrtHarmonicDesc',
    icon: 'sparkle',
    cost: 2,
    maxLevel: 2,
    requires: ['vrt_tspin_adept', 'vrt_beat_sync'],
    tier: 2,
    position: { row: 2, col: 1 },
  },
  {
    id: 'vrt_perfect_rhythm',
    archetype: 'virtuoso',
    nameKey: 'vrtPerfectRhythm',
    descKey: 'vrtPerfectRhythmDesc',
    icon: 'fire',
    cost: 2,
    maxLevel: 2,
    requires: ['vrt_beat_sync'],
    tier: 2,
    position: { row: 2, col: 2 },
  },
  {
    id: 'vrt_grand_master',
    archetype: 'virtuoso',
    nameKey: 'vrtGrandMaster',
    descKey: 'vrtGrandMasterDesc',
    icon: 'crown',
    cost: 3,
    maxLevel: 1,
    requires: ['vrt_tspin_master', 'vrt_harmonic'],
    tier: 3,
    position: { row: 3, col: 0 },
  },
  {
    id: 'vrt_crescendo',
    archetype: 'virtuoso',
    nameKey: 'vrtCrescendo',
    descKey: 'vrtCrescendoDesc',
    icon: 'star',
    cost: 3,
    maxLevel: 1,
    requires: ['vrt_harmonic', 'vrt_perfect_rhythm'],
    tier: 3,
    position: { row: 3, col: 2 },
  },

  // =====================================================
  //  TRICKSTER — parallel double-path
  //
  //  Row 0:        [quick_hands]
  //                 /           \
  //  Row 1:   [das_boost]     [soft_rush]
  //                |                |
  //  Row 2:  [hyper_speed]     [ghost_step]
  //                |      \   /      |
  //  Row 3:  [time_warp]  [chaos_master]  [phantom]
  // =====================================================
  {
    id: 'trk_quick_hands',
    archetype: 'trickster',
    nameKey: 'trkQuickHands',
    descKey: 'trkQuickHandsDesc',
    icon: 'bolt',
    cost: 1,
    maxLevel: 3,
    requires: [],
    tier: 1,
    position: { row: 0, col: 1 },
  },
  {
    id: 'trk_das_boost',
    archetype: 'trickster',
    nameKey: 'trkDasBoost',
    descKey: 'trkDasBoostDesc',
    icon: 'fast-forward',
    cost: 1,
    maxLevel: 3,
    requires: ['trk_quick_hands'],
    tier: 1,
    position: { row: 1, col: 0 },
  },
  {
    id: 'trk_soft_rush',
    archetype: 'trickster',
    nameKey: 'trkSoftRush',
    descKey: 'trkSoftRushDesc',
    icon: 'arrow-down',
    cost: 1,
    maxLevel: 3,
    requires: ['trk_quick_hands'],
    tier: 1,
    position: { row: 1, col: 2 },
  },
  {
    id: 'trk_hyper_speed',
    archetype: 'trickster',
    nameKey: 'trkHyperSpeed',
    descKey: 'trkHyperSpeedDesc',
    icon: 'bolt',
    cost: 2,
    maxLevel: 2,
    requires: ['trk_das_boost'],
    tier: 2,
    position: { row: 2, col: 0 },
  },
  {
    id: 'trk_ghost_step',
    archetype: 'trickster',
    nameKey: 'trkGhostStep',
    descKey: 'trkGhostStepDesc',
    icon: 'sparkle',
    cost: 2,
    maxLevel: 2,
    requires: ['trk_soft_rush'],
    tier: 2,
    position: { row: 2, col: 2 },
  },
  {
    id: 'trk_time_warp',
    archetype: 'trickster',
    nameKey: 'trkTimeWarp',
    descKey: 'trkTimeWarpDesc',
    icon: 'spin',
    cost: 3,
    maxLevel: 1,
    requires: ['trk_hyper_speed'],
    tier: 3,
    position: { row: 3, col: 0 },
  },
  {
    id: 'trk_chaos_master',
    archetype: 'trickster',
    nameKey: 'trkChaosMaster',
    descKey: 'trkChaosMasterDesc',
    icon: 'crown',
    cost: 3,
    maxLevel: 1,
    requires: ['trk_hyper_speed', 'trk_ghost_step'],
    tier: 3,
    position: { row: 3, col: 1 },
  },
  {
    id: 'trk_phantom',
    archetype: 'trickster',
    nameKey: 'trkPhantom',
    descKey: 'trkPhantomDesc',
    icon: 'fire',
    cost: 3,
    maxLevel: 1,
    requires: ['trk_ghost_step'],
    tier: 3,
    position: { row: 3, col: 2 },
  },
];

/** Helper: get nodes for a specific archetype */
export function getNodesForArchetype(archetype: string): SkillNode[] {
  return SKILL_NODES.filter((n) => n.archetype === archetype);
}

/** Helper: get archetype metadata by id */
export function getArchetypeMeta(id: Archetype): ArchetypeMeta | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}

/** Total number of skill points needed to max all nodes of an archetype */
export function getMaxPointsForArchetype(archetype: string): number {
  return getNodesForArchetype(archetype).reduce(
    (sum, node) => sum + node.cost * node.maxLevel,
    0
  );
}

/** Points awarded per game played */
export const POINTS_PER_GAME = 1;

/** Bonus points for multiplayer win */
export const POINTS_PER_MP_WIN = 1;
