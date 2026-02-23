'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSkillTree } from '@/lib/skill-tree/context';
import { SKILL_NODES, ARCHETYPES, getNodesForArchetype } from '@/lib/skill-tree/definitions';
import type { SkillNode, Archetype } from '@/lib/skill-tree/types';
import styles from './SkillTree.module.css';

/** Pixel-art style icons via Unicode — rendered in pixel font */
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

/** Grid cell dimensions — pixel-aligned */
const CELL_W = 110;
const CELL_H = 100;
const NODE_SIZE = 60; // square side length
const NODE_HALF = NODE_SIZE / 2;

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

  const nextPageNodes = useMemo(
    () => archetypeNodes.filter((n) => n.page === currentPage + 1),
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

  /** Node center position within the SVG grid */
  const nodeCenter = (node: SkillNode) => ({
    x: node.position.col * CELL_W + CELL_W / 2,
    y: node.position.row * CELL_H + CELL_H / 2,
  });

  /**
   * Build stepped (orthogonal) SVG paths between connected nodes.
   * Paths go: down from parent → horizontal to align with child → down to child.
   * This creates Minecraft-style grid-aligned connections.
   */
  const connectionPaths = useMemo(() => {
    const paths: { d: string; active: boolean }[] = [];

    for (const node of nodesForPage) {
      for (const reqId of node.requires) {
        const parent = archetypeNodes.find((n) => n.id === reqId);
        if (!parent) continue;

        if (parent.page === node.page) {
          // Same page — stepped path
          const from = nodeCenter(parent);
          const to = nodeCenter(node);
          const startY = from.y + NODE_HALF;
          const endY = to.y - NODE_HALF;
          const midY = Math.round((startY + endY) / 2);
          const parentStatus = getNodeStatus(parent);
          const active = parentStatus === 'partial' || parentStatus === 'maxed';

          if (from.x === to.x) {
            // Straight vertical
            paths.push({
              d: `M ${from.x} ${startY} L ${from.x} ${endY}`,
              active,
            });
          } else {
            // Stepped L-shape
            paths.push({
              d: `M ${from.x} ${startY} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${endY}`,
              active,
            });
          }
        } else if (parent.page === node.page - 1) {
          // Cross-page: parent on previous page — stub from top edge
          const to = nodeCenter(node);
          const stubX = parent.position.col * CELL_W + CELL_W / 2;
          const endY = to.y - NODE_HALF;
          const midY = Math.round(endY * 0.3);
          const parentStatus = getNodeStatus(parent);
          const active = parentStatus === 'partial' || parentStatus === 'maxed';

          if (stubX === to.x) {
            paths.push({ d: `M ${stubX} 0 L ${stubX} ${endY}`, active });
          } else {
            paths.push({
              d: `M ${stubX} 0 L ${stubX} ${midY} L ${to.x} ${midY} L ${to.x} ${endY}`,
              active,
            });
          }
        }
      }
    }

    // Bottom stubs to next page
    for (const nextNode of nextPageNodes) {
      for (const reqId of nextNode.requires) {
        const parent = nodesForPage.find((n) => n.id === reqId);
        if (!parent) continue;
        const from = nodeCenter(parent);
        const parentStatus = getNodeStatus(parent);
        const active = parentStatus === 'partial' || parentStatus === 'maxed';
        const maxRow = Math.max(...nodesForPage.map((n) => n.position.row));
        const bottomY = (maxRow + 1) * CELL_H + 10;
        paths.push({
          d: `M ${from.x} ${from.y + NODE_HALF} L ${from.x} ${bottomY}`,
          active,
        });
      }
    }

    return paths;
  }, [nodesForPage, nextPageNodes, archetypeNodes, getNodeStatus]);

  /** SVG viewBox dimensions */
  const svgHeight = useMemo(() => {
    if (nodesForPage.length === 0) return CELL_H;
    const maxRow = Math.max(...nodesForPage.map((n) => n.position.row));
    const hasNextPage = nextPageNodes.some((nn) =>
      nn.requires.some((r) => nodesForPage.some((n) => n.id === r))
    );
    return (maxRow + 1) * CELL_H + (hasNextPage ? 20 : 0);
  }, [nodesForPage, nextPageNodes]);

  const svgWidth = 3 * CELL_W;

  // ───── Archetype picker ─────
  if (!state.archetype) {
    return (
      <div className={styles.overlay}>
        <motion.div
          className={styles.frame}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
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
        transition={{ duration: 0.2 }}
      >
        {/* Header — page navigation */}
        <div className={styles.frameHeader}>
          <button
            className={styles.pageArrow}
            onClick={() => goPage(-1)}
            disabled={currentPage === 0}
          >
            {'<'}
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
            {'>'}
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

        {/* Tree area with stepped SVG connections */}
        <div className={styles.treeArea}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${state.archetype}-${currentPage}`}
              className={styles.treeCanvas}
              style={{ width: svgWidth, minHeight: svgHeight }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {/* SVG stepped connection paths */}
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
                    stroke={conn.active ? archMeta?.color ?? '#888' : '#2a2a2a'}
                    strokeWidth={4}
                    strokeLinejoin="miter"
                    strokeLinecap="butt"
                    style={
                      conn.active
                        ? {
                            filter: `drop-shadow(0 0 6px ${archMeta?.color ?? '#888'})`,
                          }
                        : undefined
                    }
                  />
                ))}
              </svg>

              {/* Square nodes (inventory slots) */}
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
                      left: pos.x - NODE_HALF,
                      top: pos.y - NODE_HALF,
                      width: NODE_SIZE,
                      height: NODE_SIZE,
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

        {/* Detail panel (Minecraft tooltip) */}
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
          {/* Page dots (square) */}
          <div className={styles.pageDots}>
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                className={`${styles.pageDot} ${
                  i === currentPage ? styles.pageDotActive : ''
                }`}
                style={
                  i === currentPage
                    ? {
                        backgroundColor: archMeta?.color,
                        '--cat-color': archMeta?.color,
                      } as React.CSSProperties
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
