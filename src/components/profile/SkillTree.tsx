'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSkillTree } from '@/lib/skill-tree/context';
import { ARCHETYPES, getNodesForArchetype } from '@/lib/skill-tree/definitions';
import type { SkillNode, Archetype, ArchetypeMeta, SubclassStats } from '@/lib/skill-tree/types';
import styles from './SkillTree.module.css';

/** Unicode icons for skill node rendering */
const NODE_ICONS: Record<string, string> = {
  bolt: '\u26A1',
  'arrow-down': '\u2B07',
  'fast-forward': '\u23E9',
  gem: '\uD83D\uDC8E',
  layers: '\uD83D\uDCDA',
  star: '\u2B50',
  spin: '\uD83C\uDF00',
  flame: '\uD83D\uDD25',
  chain: '\uD83D\uDD17',
  note: '\uD83C\uDFB5',
  sparkle: '\u2728',
  fire: '\uD83C\uDF1F',
  shield: '\uD83D\uDEE1\uFE0F',
  heart: '\u2764\uFE0F',
  crown: '\uD83D\uDC51',
  fist: '\u270A',
};

/** Grid cell dimensions */
const CELL_W = 110;
const CELL_H = 120;
const NODE_SIZE = 56;
const NODE_HALF = NODE_SIZE / 2;
const ROWS_PER_PAGE = 2;

const TIER_LABELS = ['I', 'II', 'III'];
const STAT_KEYS: (keyof SubclassStats)[] = ['difficulty', 'damage', 'defence', 'range', 'speed'];

interface SkillTreeProps {
  onClose?: () => void;
}

export default function SkillTree({ onClose }: SkillTreeProps) {
  const t = useTranslations('skillTree');
  const {
    state,
    selectArchetype,
    unlockSkill,
    resetAllSkills,
    canUnlock,
    getLevel,
    totalSpent,
  } = useSkillTree();

  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [page, setPage] = useState(0);

  const archMeta = useMemo(
    () => ARCHETYPES.find((a) => a.id === state.archetype) ?? null,
    [state.archetype]
  );

  const archetypeNodes = useMemo(
    () => (state.archetype ? getNodesForArchetype(state.archetype) : []),
    [state.archetype]
  );

  const maxRow = useMemo(
    () =>
      archetypeNodes.length > 0
        ? Math.max(...archetypeNodes.map((n) => n.position.row))
        : 0,
    [archetypeNodes]
  );

  const totalPages = Math.max(1, Math.ceil((maxRow + 1) / ROWS_PER_PAGE));

  // Filter nodes for current page
  const pageNodes = useMemo(() => {
    const startRow = page * ROWS_PER_PAGE;
    const endRow = startRow + ROWS_PER_PAGE;
    return archetypeNodes.filter(
      (n) => n.position.row >= startRow && n.position.row < endRow
    );
  }, [archetypeNodes, page]);

  const getNodeStatus = useCallback(
    (node: SkillNode): 'locked' | 'available' | 'partial' | 'maxed' => {
      const level = getLevel(node.id);
      if (level >= node.maxLevel) return 'maxed';
      if (level > 0) return 'partial';
      if (canUnlock(node.id)) return 'available';
      return 'locked';
    },
    [getLevel, canUnlock]
  );

  /** Node center relative to current page */
  const nodeCenter = useCallback(
    (node: SkillNode) => ({
      x: node.position.col * CELL_W + CELL_W / 2,
      y: (node.position.row - page * ROWS_PER_PAGE) * CELL_H + CELL_H / 2,
    }),
    [page]
  );

  const svgWidth = 3 * CELL_W;
  const svgHeight = ROWS_PER_PAGE * CELL_H;

  // Connection paths for current page
  const connectionPaths = useMemo(() => {
    const paths: { d: string; active: boolean }[] = [];
    const startRow = page * ROWS_PER_PAGE;
    const endRow = startRow + ROWS_PER_PAGE;

    for (const node of pageNodes) {
      for (const reqId of node.requires) {
        const parent = archetypeNodes.find((n) => n.id === reqId);
        if (!parent) continue;
        // Only draw if parent is also on this page
        if (parent.position.row < startRow || parent.position.row >= endRow) continue;

        const from = nodeCenter(parent);
        const to = nodeCenter(node);
        const startY = from.y + NODE_HALF;
        const endY = to.y - NODE_HALF;
        const midY = Math.round((startY + endY) / 2);
        const pStatus = getNodeStatus(parent);
        const active = pStatus === 'partial' || pStatus === 'maxed';

        if (from.x === to.x) {
          paths.push({ d: `M ${from.x} ${startY} L ${from.x} ${endY}`, active });
        } else {
          paths.push({
            d: `M ${from.x} ${startY} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${endY}`,
            active,
          });
        }
      }
    }
    return paths;
  }, [pageNodes, archetypeNodes, page, getNodeStatus, nodeCenter]);

  const handleUnlock = useCallback(
    (skillId: string) => unlockSkill(skillId),
    [unlockSkill]
  );

  const handleReset = useCallback(() => {
    resetAllSkills();
    setShowResetConfirm(false);
    setSelectedNode(null);
  }, [resetAllSkills]);

  const handleSelectArchetype = useCallback(
    (arch: Archetype) => {
      selectArchetype(arch);
      setSelectedNode(null);
      setPage(0);
    },
    [selectArchetype]
  );

  // ───── Render ─────
  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.frame}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Top bar ===== */}
        <div className={styles.topBar}>
          <span className={styles.topBarTitle}>{t('title')}</span>
          <div className={styles.topBarRight}>
            {totalSpent > 0 && (
              <button
                className={styles.resetLink}
                onClick={() => setShowResetConfirm(true)}
              >
                {t('reset')}
              </button>
            )}
            {onClose && (
              <button className={styles.closeX} onClick={onClose}>
                {'\u2715'}
              </button>
            )}
          </div>
        </div>

        {/* ===== Left Panel — Class Detail ===== */}
        <div className={styles.classDetail}>
          {archMeta ? (
            <ClassDetailContent
              arch={archMeta}
              skillPoints={state.skillPoints}
              t={t}
            />
          ) : (
            <div className={styles.noClassPlaceholder}>
              {t('chooseArchetype')}
            </div>
          )}
        </div>

        {/* ===== Center Panel — Ability Tree ===== */}
        <div className={styles.treePanel}>
          {state.archetype ? (
            <>
              {/* Page navigation */}
              <div className={styles.pageNav}>
                <button
                  className={styles.pageArrow}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  {'\u25C0'}
                </button>
                <span className={styles.pageLabel}>
                  {t('page')} {page + 1}
                </span>
                <button
                  className={styles.pageArrow}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  {'\u25B6'}
                </button>
              </div>

              {/* Tree canvas */}
              <div className={styles.treeArea}>
                <div
                  className={styles.treeCanvas}
                  style={{ width: svgWidth, minHeight: svgHeight }}
                >
                  <svg
                    className={styles.connectionsSvg}
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    width={svgWidth}
                    height={svgHeight}
                    shapeRendering="crispEdges"
                  >
                    {connectionPaths.map((conn, i) => (
                      <path
                        key={i}
                        d={conn.d}
                        fill="none"
                        stroke={conn.active ? archMeta?.color ?? '#888' : '#4a4a68'}
                        strokeWidth={3}
                        strokeLinejoin="miter"
                        strokeLinecap="butt"
                        strokeDasharray={conn.active ? undefined : '6 4'}
                        style={
                          conn.active
                            ? { filter: `drop-shadow(0 0 4px ${archMeta?.color ?? '#888'})` }
                            : undefined
                        }
                      />
                    ))}
                  </svg>

                  {pageNodes.map((node) => {
                    const status = getNodeStatus(node);
                    const level = getLevel(node.id);
                    const isSelected = selectedNode?.id === node.id;
                    const pos = nodeCenter(node);

                    return (
                      <button
                        key={node.id}
                        className={`${styles.node} ${styles[`node_${status}`]} ${
                          isSelected ? styles.nodeSelected : ''
                        }`}
                        style={{
                          '--cat-color': archMeta?.color ?? '#888',
                          left: pos.x - NODE_HALF,
                          top: pos.y - NODE_HALF,
                          width: NODE_SIZE,
                          height: NODE_SIZE,
                        } as React.CSSProperties}
                        onClick={() => setSelectedNode(isSelected ? null : node)}
                      >
                        <span className={styles.nodeIcon}>
                          {NODE_ICONS[node.icon] || node.icon}
                        </span>
                        <div className={styles.levelPips}>
                          {Array.from({ length: node.maxLevel }).map((_, i) => (
                            <div
                              key={i}
                              className={`${styles.pip} ${
                                i < level ? styles.pipFilled : ''
                              }`}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Node detail tooltip */}
                <AnimatePresence>
                  {selectedNode && (
                    <motion.div
                      className={styles.detailPanel}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.12 }}
                    >
                      <div className={styles.detailTop}>
                        <span className={styles.detailIcon}>
                          {NODE_ICONS[selectedNode.icon] || selectedNode.icon}
                        </span>
                        <div className={styles.detailInfo}>
                          <div className={styles.detailName}>
                            {t(`nodes.${selectedNode.nameKey}`)}
                          </div>
                          <div className={styles.detailDesc}>
                            {t(`nodes.${selectedNode.descKey}`)}
                          </div>
                        </div>
                      </div>
                      <div className={styles.detailBottom}>
                        <span className={styles.detailStat}>
                          {t('level')}: {getLevel(selectedNode.id)}/
                          {selectedNode.maxLevel}
                        </span>
                        <span className={styles.detailStat}>
                          {t('cost')}: {selectedNode.cost} {t('pointsUnit')}
                        </span>
                        <span className={styles.detailTier}>
                          {t('tier')} {TIER_LABELS[selectedNode.tier - 1]}
                        </span>
                        {canUnlock(selectedNode.id) && (
                          <button
                            className={styles.unlockBtn}
                            style={{ backgroundColor: archMeta?.color }}
                            onClick={() => handleUnlock(selectedNode.id)}
                          >
                            {getLevel(selectedNode.id) > 0
                              ? t('upgrade')
                              : t('unlock')}
                          </button>
                        )}
                        {getNodeStatus(selectedNode) === 'maxed' && (
                          <span className={styles.maxedBadge}>{t('maxed')}</span>
                        )}
                        {getNodeStatus(selectedNode) === 'locked' && (
                          <span className={styles.lockedHint}>
                            {t('lockedHint')}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className={styles.treePlaceholder}>
              {t('selectClassForTree')}
            </div>
          )}
        </div>

        {/* ===== Right Panel — Class Selector ===== */}
        <div className={styles.classSelector}>
          <div className={styles.selectorHeader}>{t('classes')}</div>
          <div className={styles.classCardList}>
            {ARCHETYPES.map((arch) => (
              <button
                key={arch.id}
                className={`${styles.classCard} ${
                  state.archetype === arch.id ? styles.classCardActive : ''
                }`}
                style={{ '--class-color': arch.color } as React.CSSProperties}
                onClick={() => handleSelectArchetype(arch.id)}
              >
                <div className={styles.cardPortrait}>
                  <span>{arch.icon}</span>
                </div>
                <div className={styles.cardInfo}>
                  <span className={styles.cardName}>
                    {t(`archetypes.${arch.nameKey}`)}
                  </span>
                  <span className={styles.cardAlt}>
                    ({t(`archetypes.${arch.altNameKey}`)})
                  </span>
                  <div className={styles.diffRow}>
                    <span className={styles.diffLabel}>{t('difficulty')}</span>
                    <div className={styles.diffTrack}>
                      <div
                        className={styles.diffFill}
                        style={{
                          width: `${(arch.difficulty / 5) * 100}%`,
                          backgroundColor: arch.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ===== Reset Confirmation ===== */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              className={styles.resetOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.resetDialog}>
                <p>{t('resetConfirm')}</p>
                <div className={styles.resetActions}>
                  <button
                    className={styles.resetCancel}
                    onClick={() => setShowResetConfirm(false)}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    className={styles.resetConfirmBtn}
                    onClick={handleReset}
                  >
                    {t('resetConfirmBtn')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ================================================================
   Sub-components
   ================================================================ */

/** Left panel content when a class is selected */
function ClassDetailContent({
  arch,
  skillPoints,
  t,
}: {
  arch: ArchetypeMeta;
  skillPoints: number;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <>
      {/* Portrait + name */}
      <div className={styles.portraitArea}>
        <div
          className={styles.portrait}
          style={{ boxShadow: `0 0 12px ${arch.color}33` }}
        >
          <span className={styles.portraitIcon}>{arch.icon}</span>
        </div>
        <div className={styles.portraitNames}>
          <span className={styles.className}>
            {t(`archetypes.${arch.nameKey}`)}
          </span>
          <span className={styles.classAltName}>
            ({t(`archetypes.${arch.altNameKey}`)})
          </span>
        </div>
      </div>

      {/* SP badge */}
      <div className={styles.detailSp}>
        <span className={styles.detailSpNum}>{skillPoints}</span>
        <span className={styles.detailSpLabel}>SP</span>
      </div>

      {/* Description */}
      <p className={styles.classDescription}>
        {t(`archetypes.${arch.descKey}`)}
      </p>

      {/* Subclasses */}
      <div className={styles.subclassHeader}>{t('subclassesTitle')}</div>
      <div className={styles.subclassList}>
        {arch.subclasses.map((sub) => (
          <div key={sub.id} className={styles.subclassEntry}>
            <div className={styles.subclassTop}>
              <span className={styles.subclassIcon}>
                {NODE_ICONS[sub.icon] || sub.icon}
              </span>
              <span className={styles.subclassName}>
                {t(`subclasses.${sub.nameKey}`)}
              </span>
            </div>
            <div className={styles.statBars}>
              {STAT_KEYS.map((key) => (
                <div key={key} className={styles.statRow}>
                  <span className={styles.statLabel}>{t(`stats.${key}`)}</span>
                  <div className={styles.statBarTrack}>
                    <div
                      className={styles.statBarFill}
                      style={{
                        width: `${(sub.stats[key] / 5) * 100}%`,
                        backgroundColor: arch.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
