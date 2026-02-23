'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSkillTree } from '@/lib/skill-tree/context';
import { SKILL_NODES, ARCHETYPES, getNodesForArchetype } from '@/lib/skill-tree/definitions';
import type { SkillNode, Archetype, ArchetypeMeta } from '@/lib/skill-tree/types';
import styles from './SkillTree.module.css';

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
};

/** Grid cell dimensions for SVG line calculations */
const CELL_W = 110;
const CELL_H = 100;
const NODE_R = 35; // radius of node circle

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

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const archMeta = useMemo(
    () => ARCHETYPES.find((a) => a.id === state.archetype) ?? null,
    [state.archetype]
  );

  const archetypeNodes = useMemo(
    () => (state.archetype ? getNodesForArchetype(state.archetype) : []),
    [state.archetype]
  );

  const pageCount = archMeta?.pageCount ?? 1;

  const nodesForPage = useMemo(
    () => archetypeNodes.filter((n) => n.page === currentPage),
    [archetypeNodes, currentPage]
  );

  /** All nodes that *require* a node on the current page (i.e. on the next page) */
  const nextPageNodes = useMemo(
    () => archetypeNodes.filter((n) => n.page === currentPage + 1),
    [archetypeNodes, currentPage]
  );

  /** All nodes on the previous page that are parents to nodes on current page */
  const prevPageNodes = useMemo(
    () => archetypeNodes.filter((n) => n.page === currentPage - 1),
    [archetypeNodes, currentPage]
  );

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

  const handleUnlock = useCallback(
    (skillId: string) => {
      unlockSkill(skillId);
    },
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
      setCurrentPage(0);
      setSelectedNode(null);
    },
    [selectArchetype]
  );

  const goPage = (dir: -1 | 1) => {
    setSelectedNode(null);
    setCurrentPage((p) => Math.max(0, Math.min(pageCount - 1, p + dir)));
  };

  /** Calculate node center position within the SVG grid */
  const nodeCenter = (node: SkillNode, pageOffset: number = 0) => {
    const x = node.position.col * CELL_W + CELL_W / 2;
    const y = (node.position.row + pageOffset) * CELL_H + CELL_H / 2;
    return { x, y };
  };

  /** Build connection lines between nodes on the same page + cross-page stubs */
  const connections = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; active: boolean }[] = [];
    const color = archMeta?.color ?? '#888';

    for (const node of nodesForPage) {
      for (const reqId of node.requires) {
        const parent = archetypeNodes.find((n) => n.id === reqId);
        if (!parent) continue;

        if (parent.page === node.page) {
          // Same page — draw full line
          const from = nodeCenter(parent);
          const to = nodeCenter(node);
          const parentStatus = getNodeStatus(parent);
          const active = parentStatus === 'partial' || parentStatus === 'maxed';
          lines.push({ x1: from.x, y1: from.y + NODE_R, x2: to.x, y2: to.y - NODE_R, active });
        } else if (parent.page === node.page - 1) {
          // Parent on previous page — draw stub from top edge down to node
          const to = nodeCenter(node);
          const parentStatus = getNodeStatus(parent);
          const active = parentStatus === 'partial' || parentStatus === 'maxed';
          // Entry stub from parent column
          const stubX = parent.position.col * CELL_W + CELL_W / 2;
          lines.push({ x1: stubX, y1: 0, x2: to.x, y2: to.y - NODE_R, active });
        }
      }
    }

    // Bottom stubs: for nodes on current page that have children on the next page
    for (const nextNode of nextPageNodes) {
      for (const reqId of nextNode.requires) {
        const parent = nodesForPage.find((n) => n.id === reqId);
        if (!parent) continue;
        const from = nodeCenter(parent);
        const parentStatus = getNodeStatus(parent);
        const active = parentStatus === 'partial' || parentStatus === 'maxed';
        const maxRow = Math.max(...nodesForPage.map((n) => n.position.row));
        const bottomY = (maxRow + 1) * CELL_H + 10;
        lines.push({ x1: from.x, y1: from.y + NODE_R, x2: from.x, y2: bottomY, active });
      }
    }

    return { lines, color };
  }, [nodesForPage, nextPageNodes, archetypeNodes, archMeta, getNodeStatus]);

  /** SVG viewBox dimensions */
  const svgHeight = useMemo(() => {
    if (nodesForPage.length === 0) return CELL_H;
    const maxRow = Math.max(...nodesForPage.map((n) => n.position.row));
    // Extra space for bottom stubs
    const hasNextPage = nextPageNodes.some((nn) =>
      nn.requires.some((r) => nodesForPage.some((n) => n.id === r))
    );
    return (maxRow + 1) * CELL_H + (hasNextPage ? 20 : 0);
  }, [nodesForPage, nextPageNodes]);

  const svgWidth = 3 * CELL_W;

  // ───── Archetype picker (no archetype selected yet) ─────
  if (!state.archetype) {
    return (
      <div className={styles.overlay}>
        <motion.div
          className={styles.frame}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
        >
          <div className={styles.frameHeader}>
            <div className={styles.pageBanner}>
              <span className={styles.pageLabel}>{t('chooseArchetype')}</span>
            </div>
          </div>

          <div className={styles.archetypeGrid}>
            {ARCHETYPES.map((arch) => (
              <button
                key={arch.id}
                className={styles.archetypeCard}
                style={{ '--arch-color': arch.color } as React.CSSProperties}
                onClick={() => handleSelectArchetype(arch.id)}
              >
                <span className={styles.archetypeIcon}>{arch.icon}</span>
                <span className={styles.archetypeName}>
                  {t(`archetypes.${arch.nameKey}`)}
                </span>
                <span className={styles.archetypeDesc}>
                  {t(`archetypes.${arch.descKey}`)}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.bottomPanel}>
            <div className={styles.toolbar}>
              <div className={styles.pointsDisplay}>
                <span className={styles.pointsStar}>{'\u2B50'}</span>
                <span className={styles.pointsNum}>{state.skillPoints}</span>
                <span className={styles.pointsLabel}>{t('pointsAvailable')}</span>
              </div>
              {onClose && (
                <button className={styles.closeBtn} onClick={onClose}>
                  {'\u2715'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ───── Main tree view ─────
  return (
    <div className={styles.overlay}>
      <motion.div
        className={styles.frame}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header — page navigation */}
        <div className={styles.frameHeader}>
          <button
            className={styles.pageArrow}
            onClick={() => goPage(-1)}
            disabled={currentPage === 0}
          >
            {'\u25C0'}
          </button>
          <div className={styles.pageBanner}>
            <span className={styles.pageLabel}>
              PAGE {currentPage + 1}
            </span>
          </div>
          <button
            className={styles.pageArrow}
            onClick={() => goPage(1)}
            disabled={currentPage >= pageCount - 1}
          >
            {'\u25B6'}
          </button>
        </div>

        {/* Archetype title */}
        <div
          className={styles.archetypeTitle}
          style={{ color: archMeta?.color }}
        >
          <span>{archMeta?.icon}</span>
          <span>{t(`archetypes.${archMeta?.nameKey}`)}</span>
        </div>

        {/* Tree area with SVG connections */}
        <div className={styles.treeArea}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${state.archetype}-${currentPage}`}
              className={styles.treeCanvas}
              style={{ width: svgWidth, minHeight: svgHeight }}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {/* SVG connection lines */}
              <svg
                className={styles.connectionsSvg}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                width={svgWidth}
                height={svgHeight}
              >
                {connections.lines.map((line, i) => (
                  <line
                    key={i}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={line.active ? archMeta?.color ?? '#888' : '#2a2a3a'}
                    strokeWidth={3}
                    strokeLinecap="round"
                    style={
                      line.active
                        ? {
                            filter: `drop-shadow(0 0 4px ${archMeta?.color ?? '#888'})`,
                          }
                        : undefined
                    }
                  />
                ))}
              </svg>

              {/* Nodes */}
              {nodesForPage.map((node) => {
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
                      left: pos.x - NODE_R,
                      top: pos.y - NODE_R,
                      width: NODE_R * 2,
                      height: NODE_R * 2,
                    } as React.CSSProperties}
                    onClick={() =>
                      setSelectedNode(isSelected ? null : node)
                    }
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Node detail panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              className={styles.detailPanel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              <div className={styles.detailTop}>
                <span
                  className={styles.detailIcon}
                  style={{ borderColor: archMeta?.color }}
                >
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

        {/* Bottom panel */}
        <div className={styles.bottomPanel}>
          {/* Page dots */}
          <div className={styles.pageDots}>
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                className={`${styles.pageDot} ${
                  i === currentPage ? styles.pageDotActive : ''
                }`}
                style={
                  i === currentPage
                    ? { backgroundColor: archMeta?.color }
                    : undefined
                }
                onClick={() => {
                  setSelectedNode(null);
                  setCurrentPage(i);
                }}
              />
            ))}
          </div>

          <div className={styles.toolbar}>
            <div className={styles.pointsDisplay}>
              <span className={styles.pointsStar}>{'\u2B50'}</span>
              <span className={styles.pointsNum}>{state.skillPoints}</span>
              <span className={styles.pointsLabel}>{t('pointsAvailable')}</span>
            </div>
            <button
              className={styles.switchArchBtn}
              onClick={() => handleSelectArchetype(state.archetype!)}
              title={t('switchArchetype')}
            >
              {archMeta?.icon}
            </button>
            <button
              className={styles.resetBtn}
              onClick={() => setShowResetConfirm(true)}
              disabled={totalSpent === 0}
            >
              {t('reset')}
            </button>
            {onClose && (
              <button className={styles.closeBtn} onClick={onClose}>
                {'\u2715'}
              </button>
            )}
          </div>
        </div>

        {/* Reset confirmation */}
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
