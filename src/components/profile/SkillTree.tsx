'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSkillTree } from '@/lib/skill-tree/context';
import { SKILL_NODES } from '@/lib/skill-tree/definitions';
import type { SkillNode, SkillCategory } from '@/lib/skill-tree/types';
import styles from './SkillTree.module.css';

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  speed: '#3B82F6',
  power: '#EF4444',
  technique: '#A855F7',
  rhythm: '#F59E0B',
  survival: '#10B981',
};

const CATEGORY_ICONS: Record<SkillCategory, string> = {
  speed: '\u26A1',
  power: '\uD83D\uDCA5',
  technique: '\uD83C\uDFAF',
  rhythm: '\uD83C\uDFB5',
  survival: '\uD83D\uDEE1\uFE0F',
};

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

interface SkillTreeProps {
  onClose?: () => void;
}

export default function SkillTree({ onClose }: SkillTreeProps) {
  const t = useTranslations('skillTree');
  const {
    state,
    unlockSkill,
    resetAllSkills,
    canUnlock,
    getLevel,
    totalSpent,
  } = useSkillTree();

  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const categories = useMemo(
    () => ['speed', 'power', 'technique', 'rhythm', 'survival'] as SkillCategory[],
    []
  );

  const nodesByCategory = useMemo(() => {
    const map: Record<SkillCategory, SkillNode[]> = {
      speed: [],
      power: [],
      technique: [],
      rhythm: [],
      survival: [],
    };
    for (const node of SKILL_NODES) {
      map[node.category].push(node);
    }
    // Sort by row within each category
    for (const cat of categories) {
      map[cat].sort((a, b) => a.position.row - b.position.row);
    }
    return map;
  }, [categories]);

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

  return (
    <div className={styles.overlay}>
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{t('title')}</h2>
            <div className={styles.points}>
              <span className={styles.pointsIcon}>{'\u2B50'}</span>
              <span className={styles.pointsValue}>{state.skillPoints}</span>
              <span className={styles.pointsLabel}>{t('pointsAvailable')}</span>
            </div>
          </div>
          <div className={styles.headerRight}>
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

        {/* Tree Grid */}
        <div className={styles.treeGrid}>
          {categories.map((category) => (
            <div key={category} className={styles.branch}>
              <div
                className={styles.branchHeader}
                style={{ borderColor: CATEGORY_COLORS[category] }}
              >
                <span className={styles.branchIcon}>{CATEGORY_ICONS[category]}</span>
                <span className={styles.branchName}>{t(`categories.${category}`)}</span>
              </div>
              <div className={styles.branchNodes}>
                {nodesByCategory[category].map((node, idx) => {
                  const status = getNodeStatus(node);
                  const level = getLevel(node.id);
                  const isSelected = selectedNode?.id === node.id;

                  return (
                    <div key={node.id} className={styles.nodeWrapper}>
                      {/* Connector line to parent */}
                      {idx > 0 && (
                        <div
                          className={styles.connector}
                          style={{
                            borderColor:
                              status === 'locked'
                                ? 'var(--border)'
                                : CATEGORY_COLORS[category],
                          }}
                        />
                      )}
                      <button
                        className={`${styles.node} ${styles[`node_${status}`]} ${
                          isSelected ? styles.nodeSelected : ''
                        }`}
                        style={{
                          '--node-color': CATEGORY_COLORS[category],
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
                              style={
                                i < level
                                  ? { backgroundColor: CATEGORY_COLORS[category] }
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Node Detail Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              className={styles.detailPanel}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.15 }}
            >
              <div className={styles.detailHeader}>
                <span
                  className={styles.detailIcon}
                  style={{ backgroundColor: CATEGORY_COLORS[selectedNode.category] }}
                >
                  {NODE_ICONS[selectedNode.icon] || selectedNode.icon}
                </span>
                <div>
                  <div className={styles.detailName}>
                    {t(`nodes.${selectedNode.nameKey}`)}
                  </div>
                  <div className={styles.detailCategory}>
                    {t(`categories.${selectedNode.category}`)}
                  </div>
                </div>
              </div>
              <p className={styles.detailDesc}>
                {t(`nodes.${selectedNode.descKey}`)}
              </p>
              <div className={styles.detailStats}>
                <span>
                  {t('level')}: {getLevel(selectedNode.id)}/{selectedNode.maxLevel}
                </span>
                <span>
                  {t('cost')}: {selectedNode.cost} {t('pointsUnit')}
                </span>
              </div>
              {canUnlock(selectedNode.id) && (
                <button
                  className={styles.unlockBtn}
                  style={{ backgroundColor: CATEGORY_COLORS[selectedNode.category] }}
                  onClick={() => handleUnlock(selectedNode.id)}
                >
                  {getLevel(selectedNode.id) > 0 ? t('upgrade') : t('unlock')}
                </button>
              )}
              {getNodeStatus(selectedNode) === 'maxed' && (
                <div className={styles.maxedBadge}>{t('maxed')}</div>
              )}
              {getNodeStatus(selectedNode) === 'locked' && (
                <div className={styles.lockedHint}>{t('lockedHint')}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Confirmation */}
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
                  <button className={styles.resetConfirmBtn} onClick={handleReset}>
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
