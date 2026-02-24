'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useShape } from '@/lib/shape/context';
import type { ShapePreset } from '@/lib/shape/types';
import styles from './ShapeSwitcher.module.css';

function ShapePreview({ preset }: { preset: ShapePreset }) {
  const r = preset.radii.radius;
  const rSm = preset.radii.radiusSm;
  const rLg = preset.radii.radiusLg;
  return (
    <div className={styles.previewArea}>
      <div
        className={styles.previewCard}
        style={{ borderRadius: rLg }}
      >
        <div className={styles.previewBar} style={{ borderRadius: rSm }} />
        <div className={styles.previewRow}>
          <div className={styles.previewChip} style={{ borderRadius: r }} />
          <div className={styles.previewChip} style={{ borderRadius: r }} />
        </div>
        <div className={styles.previewBtn} style={{ borderRadius: rSm }} />
      </div>
    </div>
  );
}

function ShapeOption({
  shape,
  isActive,
  onSelect,
  label,
}: {
  shape: ShapePreset;
  isActive: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <motion.button
      className={`${styles.shapeCard} ${isActive ? styles.shapeCardActive : ''}`}
      onClick={onSelect}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <ShapePreview preset={shape} />
      <div className={styles.shapeName}>{label}</div>
      {isActive && (
        <div className={styles.activeBadge}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </motion.button>
  );
}

export default function ShapeSwitcher() {
  const { currentShape, setShape, shapes } = useShape();
  const t = useTranslations('shape');

  return (
    <div className={styles.wrapper}>
      <div className={styles.shapeGrid}>
        {shapes.map((shape) => (
          <ShapeOption
            key={shape.id}
            shape={shape}
            isActive={currentShape.id === shape.id}
            onSelect={() => setShape(shape.id)}
            label={t(shape.id)}
          />
        ))}
      </div>
    </div>
  );
}
