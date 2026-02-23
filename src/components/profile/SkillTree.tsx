'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSkillTree } from '@/lib/skill-tree/context';
import { ARCHETYPES, getNodesForArchetype } from '@/lib/skill-tree/definitions';
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
const NODE_SIZE = 60;
const NODE_HALF = NODE_SIZE / 2;

/** Scroll behaviour constants (matching main page useSlideScroll) */
const SCROLL_DEBOUNCE = 600;
const DELTA_THRESHOLD = 50;
const TOUCH_THRESHOLD = 50;

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

  // ── Scroll refs ──
  const treeAreaRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);
  const accumulatedDelta = useRef(0);
  const deltaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef(0);

  const archMeta = useMemo(
    () => ARCHETYPES.find((a) => a.id === state.archetype) ?? null,
    [state.archetype]
  );

  const archetypeNodes = useMemo(
    () => (state.archetype ? getNodesForArchetype(state.archetype) : []),
    [state.archetype]
  );

  const pageCount = archMeta?.pageCount ?? 1;

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

  /** Node center position within the per-page SVG grid */
  const nodeCenter = (node: SkillNode) => ({
    x: node.position.col * CELL_W + CELL_W / 2,
    y: node.position.row * CELL_H + CELL_H / 2,
  });

  const svgWidth = 3 * CELL_W;

  // ── Pre-compute every page's nodes, SVG height and connections ──
  const allPages = useMemo(() => {
    return Array.from({ length: pageCount }).map((_, pageIdx) => {
      const nodes = archetypeNodes.filter((n) => n.page === pageIdx);
      const nextNodes = archetypeNodes.filter((n) => n.page === pageIdx + 1);

      const maxRow =
        nodes.length > 0 ? Math.max(...nodes.map((n) => n.position.row)) : 0;
      const hasNext = nextNodes.some((nn) =>
        nn.requires.some((r) => nodes.some((n) => n.id === r))
      );
      const svgH = (maxRow + 1) * CELL_H + (hasNext ? 20 : 0);

      // Stepped connection paths
      const paths: { d: string; active: boolean }[] = [];

      for (const node of nodes) {
        for (const reqId of node.requires) {
          const parent = archetypeNodes.find((n) => n.id === reqId);
          if (!parent) continue;

          if (parent.page === pageIdx) {
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
          } else if (parent.page === pageIdx - 1) {
            const to = nodeCenter(node);
            const stubX = parent.position.col * CELL_W + CELL_W / 2;
            const endY = to.y - NODE_HALF;
            const midY = Math.round(endY * 0.3);
            const pStatus = getNodeStatus(parent);
            const active = pStatus === 'partial' || pStatus === 'maxed';

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
      for (const nextNode of nextNodes) {
        for (const reqId of nextNode.requires) {
          const parent = nodes.find((n) => n.id === reqId);
          if (!parent) continue;
          const from = nodeCenter(parent);
          const pStatus = getNodeStatus(parent);
          const active = pStatus === 'partial' || pStatus === 'maxed';
          const bottomY = (maxRow + 1) * CELL_H + 10;
          paths.push({
            d: `M ${from.x} ${from.y + NODE_HALF} L ${from.x} ${bottomY}`,
            active,
          });
        }
      }

      return { nodes, svgH, paths };
    });
  }, [archetypeNodes, pageCount, getNodeStatus]);

  // ── Navigate to a page (debounced) ──
  const goToPage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(pageCount - 1, index));
      if (clamped === currentPage || isTransitioning.current) return;

      isTransitioning.current = true;
      setSelectedNode(null);
      setCurrentPage(clamped);

      setTimeout(() => {
        isTransitioning.current = false;
      }, SCROLL_DEBOUNCE);
    },
    [currentPage, pageCount]
  );

  // ── Wheel scroll handler (delta accumulation, same as main page) ──
  useEffect(() => {
    if (!state.archetype) return;
    const el = treeAreaRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isTransitioning.current) return;

      accumulatedDelta.current += e.deltaY;
      if (deltaTimer.current) clearTimeout(deltaTimer.current);
      deltaTimer.current = setTimeout(() => {
        accumulatedDelta.current = 0;
      }, 100);

      if (Math.abs(accumulatedDelta.current) < DELTA_THRESHOLD) return;

      const direction = accumulatedDelta.current > 0 ? 1 : -1;
      accumulatedDelta.current = 0;
      goToPage(currentPage + direction);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [state.archetype, currentPage, goToPage]);

  // ── Touch swipe handler ──
  useEffect(() => {
    if (!state.archetype) return;
    const el = treeAreaRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isTransitioning.current) return;
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) < TOUCH_THRESHOLD) return;
      const direction = deltaY > 0 ? 1 : -1;
      goToPage(currentPage + direction);
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [state.archetype, currentPage, goToPage]);

  // ── Keyboard handler (ArrowUp/Down, PageUp/Down) ──
  useEffect(() => {
    if (!state.archetype) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning.current) return;
      let direction = 0;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') direction = 1;
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') direction = -1;
      else return;
      e.preventDefault();
      goToPage(currentPage + direction);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.archetype, currentPage, goToPage]);

  // ── Cleanup delta timer ──
  useEffect(() => {
    return () => {
      if (deltaTimer.current) clearTimeout(deltaTimer.current);
    };
  }, []);

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
        {/* Header — archetype + page indicator */}
        <div className={styles.frameHeader}>
          <span className={styles.archIcon} style={{ color: archMeta?.color }}>
            {archMeta?.icon}
          </span>
          <div className={styles.pageBanner}>
            <span className={styles.pageLabel}>
              {t(`archetypes.${archMeta?.nameKey}`)}
            </span>
          </div>
          <span className={styles.pageIndicator}>
            {currentPage + 1}/{pageCount}
          </span>
        </div>

        {/* Scrollable tree area — wheel / touch / keyboard to navigate */}
        <div className={styles.treeArea} ref={treeAreaRef}>
          <div
            className={styles.treeSlider}
            style={{ transform: `translateY(-${currentPage * 100}%)` }}
          >
            {allPages.map((page, pageIdx) => (
              <div key={pageIdx} className={styles.treePage}>
                <div
                  className={styles.treeCanvas}
                  style={{ width: svgWidth, minHeight: page.svgH }}
                >
                  {/* SVG stepped connection paths */}
                  <svg
                    className={styles.connectionsSvg}
                    viewBox={`0 0 ${svgWidth} ${page.svgH}`}
                    width={svgWidth}
                    height={page.svgH}
                    shapeRendering="crispEdges"
                  >
                    {page.paths.map((conn, i) => (
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
                            ? { filter: `drop-shadow(0 0 6px ${archMeta?.color ?? '#888'})` }
                            : undefined
                        }
                      />
                    ))}
                  </svg>

                  {/* Square nodes (inventory slots) */}
                  {page.nodes.map((node) => {
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
                </div>
              </div>
            ))}
          </div>

          {/* Scroll hint on first page */}
          {currentPage === 0 && pageCount > 1 && (
            <div className={styles.scrollHint}>
              <span className={styles.scrollArrow}>{'\u25BC'}</span>
            </div>
          )}
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
          {/* Page dots (square, clickable) */}
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
                onClick={() => goToPage(i)}
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
