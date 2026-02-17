'use client';

import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { useUiTheme } from '@/lib/theme/context';
import type { UiTheme } from '@/lib/theme/types';
import styles from './ThemeSwitcher.module.css';

function ThemePreviewNeo({ isActive }: { isActive: boolean }) {
  return (
    <div className={styles.previewContainer}>
      <div className={styles.neoPreview}>
        {/* Frosted glass nav bar */}
        <div className={styles.neoNavBar}>
          <div className={styles.neoDot} />
          <div className={styles.neoDot} />
          <div className={styles.neoDot} />
        </div>
        {/* Content area with glass cards */}
        <div className={styles.neoContent}>
          <div className={styles.neoCard}>
            <div className={styles.neoCardLine} />
            <div className={styles.neoCardLineShort} />
          </div>
          <div className={styles.neoCard}>
            <div className={styles.neoCardLine} />
            <div className={styles.neoCardLineShort} />
          </div>
        </div>
        {/* Glow accent */}
        <div className={styles.neoGlow} />
        {isActive && <div className={styles.previewBadge}>&#10003;</div>}
      </div>
    </div>
  );
}

function ThemePreviewPixel({ isActive }: { isActive: boolean }) {
  return (
    <div className={styles.previewContainer}>
      <div className={styles.pixelPreview}>
        {/* Pixel title bar */}
        <div className={styles.pixelTitleBar}>
          <span className={styles.pixelTitleText}>*.EXE</span>
          <div className={styles.pixelCloseBtn}>X</div>
        </div>
        {/* Content with pixel elements */}
        <div className={styles.pixelContent}>
          <div className={styles.pixelCard}>
            <div className={styles.pixelLine} />
            <div className={styles.pixelLineShort} />
          </div>
          <div className={styles.pixelBtn}>OK</div>
        </div>
        {/* CRT scanline effect */}
        <div className={styles.pixelScanlines} />
        {isActive && <div className={styles.previewBadgePixel}>&#10003;</div>}
      </div>
    </div>
  );
}

function ThemeCard({
  theme,
  isActive,
  onSelect,
  locale,
}: {
  theme: UiTheme;
  isActive: boolean;
  onSelect: () => void;
  locale: string;
}) {
  const isPixel = theme.id === 'pixel-nostalgia';

  return (
    <motion.button
      className={`${styles.themeCard} ${isActive ? styles.themeCardActive : ''}`}
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isPixel ? (
        <ThemePreviewPixel isActive={isActive} />
      ) : (
        <ThemePreviewNeo isActive={isActive} />
      )}
      <div className={styles.themeInfo}>
        <div className={styles.themeName}>
          {locale === 'ja' ? theme.nameJa : theme.name}
        </div>
        <div className={styles.themeDesc}>
          {locale === 'ja' ? theme.descriptionJa : theme.description}
        </div>
      </div>
    </motion.button>
  );
}

export default function ThemeSwitcher() {
  const { currentTheme, setTheme, themes } = useUiTheme();
  const locale = useLocale();

  return (
    <div className={styles.wrapper}>
      <div className={styles.themeGrid}>
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme.id === theme.id}
            onSelect={() => setTheme(theme.id)}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}
