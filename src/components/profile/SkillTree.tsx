'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSkillTree } from '@/lib/skill-tree/context';
import { ARCHETYPES, getNodesForArchetype } from '@/lib/skill-tree/definitions';
import type { SkillNode, Archetype } from '@/lib/skill-tree/types';
import styles from './SkillTree.module.css';

/** Pixel-art style icons via Unicode */
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

/** Grid cell dimensions */
const CELL_W = 110;
const CELL_H = 120;
const NODE_SIZE = 60;
const NODE_HALF = NODE_SIZE / 2;

/** Tier divider labels */
const TIER_LABELS = ['I', 'II', 'III'];

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

  const [pickingClass, setPickingClass] = useState(false);
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

  /** Node center position in the global grid */
  const nodeCenter = (node: SkillNode) => ({
    x: node.position.col * CELL_W + CELL_W / 2,
    y: node.position.row * CELL_H + CELL_H / 2,
  });

  const svgWidth = 3 * CELL_W;

  // Compute max row for SVG height
  const maxRow = useMemo(
    () =>
      archetypeNodes.length > 0
        ? Math.max(...archetypeNodes.map((n) => n.position.row))
        : 0,
    [archetypeNodes]
  );

  const svgHeight = (maxRow + 1) * CELL_H;

  // Pre-compute all connection paths (single SVG, no page breaks)
  const connectionPaths = useMemo(() => {
    const paths: { d: string; active: boolean }[] = [];

    for (const node of archetypeNodes) {
      for (const reqId of node.requires) {
        const parent = archetypeNodes.find((n) => n.id === reqId);
        if (!parent) continue;

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
  }, [archetypeNodes, getNodeStatus]);

  // Tier divider Y positions (between rows)
  const tierDividers = useMemo(() => {
    const dividers: { y: number; label: string }[] = [];
    // Divider between row 1 and row 2 → Tier II
    if (maxRow >= 2) {
      dividers.push({ y: 1.5 * CELL_H, label: TIER_LABELS[1] });
    }
    // Divider between row 2 and row 3 → Tier III
    if (maxRow >= 3) {
      dividers.push({ y: 2.5 * CELL_H, label: TIER_LABELS[2] });
    }
    return dividers;
  }, [maxRow]);

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
      setSelectedNode(null);
      setPickingClass(false);
    },
    [selectArchetype]
  );

  // ───── Class Picker (initial or switching) ─────
  if (!state.archetype || pickingClass) {
    return (
      <div className={styles.overlay} onClick={pickingClass ? onClose : undefined}>
        <motion.div
          className={styles.frame}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.frameHeader}>
            <div className={styles.headerTitle}>
              <span className={styles.headerTitleText}>{t('chooseArchetype')}</span>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.spBadge}>
                <span className={styles.spIcon}>{'\u2B50'}</span>
                <span className={styles.spNum}>{state.skillPoints}</span>
                <span className={styles.spLabel}>SP</span>
              </div>
              {onClose && (
                <button
                  className={styles.closeX}
                  onClick={pickingClass ? () => setPickingClass(false) : onClose}
                >
                  {'\u2715'}
                </button>
              )}
            </div>
          </div>

          {/* Class cards — vertical RPG list */}
          <div className={styles.classList}>
            {ARCHETYPES.map((arch) => (
              <button
                key={arch.id}
                className={`${styles.classCard} ${
                  state.archetype === arch.id ? styles.classCardActive : ''
                }`}
                style={{ '--class-color': arch.color } as React.CSSProperties}
                onClick={() => handleSelectArchetype(arch.id)}
              >
                <span className={styles.classIcon}>{arch.icon}</span>
                <div className={styles.classInfo}>
                  <span className={styles.className}>
                    {t(`archetypes.${arch.nameKey}`)}
                  </span>
                  <span className={styles.classDesc}>
                    {t(`archetypes.${arch.descKey}`)}
                  </span>
                </div>
                <span className={styles.classArrow}>{'\u25B6'}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ───── Main Tree View ─────
  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.frame}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — class icon, name, SP, close */}
        <div className={styles.frameHeader}>
          <button
            className={styles.classSwitch}
            style={{ '--class-color': archMeta?.color } as React.CSSProperties}
            onClick={() => setPickingClass(true)}
            title={t('switchArchetype')}
          >
            <span>{archMeta?.icon}</span>
          </button>
          <div className={styles.headerTitle}>
            <span
              className={styles.headerTitleText}
              style={{ color: archMeta?.color }}
            >
              {t(`archetypes.${archMeta?.nameKey}`)}
            </span>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.spBadge}>
              <span className={styles.spIcon}>{'\u2B50'}</span>
              <span className={styles.spNum}>{state.skillPoints}</span>
              <span className={styles.spLabel}>SP</span>
            </div>
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

        {/* Continuous tree area — native scroll */}
        <div className={styles.treeArea}>
          <div
            className={styles.treeCanvas}
            style={{ width: svgWidth, minHeight: svgHeight }}
          >
            {/* Single SVG for all connections — no page breaks */}
            <svg
              className={styles.connectionsSvg}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              width={svgWidth}
              height={svgHeight}
              shapeRendering="crispEdges"
            >
              {/* Tier divider lines */}
              {tierDividers.map((div, i) => (
                <g key={i}>
                  <line
                    x1={16}
                    y1={div.y}
                    x2={svgWidth - 16}
                    y2={div.y}
                    stroke="#2a2a2a"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  <text
                    x={svgWidth - 10}
                    y={div.y - 6}
                    fill="#3a3a3a"
                    fontSize="10"
                    fontFamily="var(--font-pixel, 'Courier New', monospace)"
                    textAnchor="end"
                  >
                    {t('tier')} {div.label}
                  </text>
                </g>
              ))}

              {/* Connection paths */}
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
                      ? { filter: `drop-shadow(0 0 6px ${archMeta?.color ?? '#888'})` }
                      : undefined
                  }
                />
              ))}
            </svg>

            {/* Skill nodes */}
            {archetypeNodes.map((node) => {
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

        {/* Reset confirmation dialog */}
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
