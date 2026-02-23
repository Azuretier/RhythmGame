'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSkillTree } from '@/lib/skill-tree/context';
import { SKILL_NODES } from '@/lib/skill-tree/definitions';
import type { SkillNode, SkillCategory } from '@/lib/skill-tree/types';
import styles from './SkillTree.module.css';

const CATEGORIES: SkillCategory[] = ['speed', 'power', 'technique', 'rhythm', 'survival'];

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  speed: '#4FC3F7',
  power: '#EF5350',
  technique: '#AB47BC',
  rhythm: '#FFB74D',
  survival: '#66BB6A',
};

const CATEGORY_ICONS: Record<SkillCategory, string> = {
  speed: '\u26A1',
  power: '\uD83D\uDD25',
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

  const [activePage, setActivePage] = useState(0);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const activeCategory = CATEGORIES[activePage];

  const nodesForPage = useMemo(() => {
    return SKILL_NODES
      .filter((n) => n.category === activeCategory)
      .sort((a, b) => a.position.row - b.position.row);
  }, [activeCategory]);

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

  const goPage = (dir: -1 | 1) => {
    setSelectedNode(null);
    setActivePage((p) => (p + dir + CATEGORIES.length) % CATEGORIES.length);
  };

  return (
    <div className={styles.overlay}>
      <motion.div
        className={styles.frame}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        {/* Stone frame header with page navigation */}
        <div className={styles.frameHeader}>
          <button className={styles.pageArrow} onClick={() => goPage(-1)}>
            {'\u25C0'}
          </button>
          <div className={styles.pageBanner}>
            <span className={styles.pageLabel}>
              PAGE {activePage + 1}
            </span>
          </div>
          <button className={styles.pageArrow} onClick={() => goPage(1)}>
            {'\u25B6'}
          </button>
        </div>

        {/* Category title */}
        <div
          className={styles.categoryTitle}
          style={{ color: CATEGORY_COLORS[activeCategory] }}
        >
          <span>{CATEGORY_ICONS[activeCategory]}</span>
          <span>{t(`categories.${activeCategory}`)}</span>
        </div>

        {/* Tree area */}
        <div className={styles.treeArea}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              className={styles.treeColumn}
              style={
                {
                  '--cat-color': CATEGORY_COLORS[activeCategory],
                } as React.CSSProperties
              }
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {nodesForPage.map((node, idx) => {
                const status = getNodeStatus(node);
                const level = getLevel(node.id);
                const isSelected = selectedNode?.id === node.id;
                const prevNode = idx > 0 ? nodesForPage[idx - 1] : null;
                const prevStatus = prevNode
                  ? getNodeStatus(prevNode)
                  : null;
                const connectorActive =
                  prevStatus === 'partial' || prevStatus === 'maxed';

                return (
                  <div key={node.id} className={styles.nodeGroup}>
                    {/* Connector line to parent node */}
                    {idx > 0 && (
                      <div
                        className={`${styles.connector} ${
                          connectorActive ? styles.connectorActive : ''
                        }`}
                      />
                    )}
                    <button
                      className={`${styles.node} ${styles[`node_${status}`]} ${
                        isSelected ? styles.nodeSelected : ''
                      }`}
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
                    <span className={styles.nodeName}>
                      {t(`nodes.${node.nameKey}`)}
                    </span>
                  </div>
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
                  style={{
                    borderColor: CATEGORY_COLORS[selectedNode.category],
                  }}
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
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[selectedNode.category],
                    }}
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

        {/* Bottom panel — category tabs + toolbar */}
        <div className={styles.bottomPanel}>
          <div className={styles.categoryTabs}>
            {CATEGORIES.map((cat, i) => {
              const isActive = i === activePage;
              const catNodes = SKILL_NODES.filter(
                (n) => n.category === cat
              );
              const hasProgress = catNodes.some(
                (n) => getLevel(n.id) > 0
              );
              return (
                <button
                  key={cat}
                  className={`${styles.catTab} ${
                    isActive ? styles.catTabActive : ''
                  } ${hasProgress ? styles.catTabProgress : ''}`}
                  style={
                    {
                      '--tab-color': CATEGORY_COLORS[cat],
                    } as React.CSSProperties
                  }
                  onClick={() => {
                    setSelectedNode(null);
                    setActivePage(i);
                  }}
                >
                  <span className={styles.catTabIcon}>
                    {CATEGORY_ICONS[cat]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.toolbar}>
            <div className={styles.pointsDisplay}>
              <span className={styles.pointsStar}>{'\u2B50'}</span>
              <span className={styles.pointsNum}>{state.skillPoints}</span>
              <span className={styles.pointsLabel}>
                {t('pointsAvailable')}
              </span>
            </div>
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
