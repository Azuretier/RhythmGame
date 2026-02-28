'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Gamepad2, MessageCircle, Heart, Box, Check, Home } from 'lucide-react';
import { useVersion } from '@/lib/version/context';
import {
  VERSION_METADATA,
  UI_VERSIONS,
  ACCENT_COLOR_METADATA,
  ACCENT_COLORS,
  type UIVersion,
  type AccentColor,
} from '@/lib/version/types';
import styles from './VersionSwitcher.module.css';

const VERSION_ICONS: Record<UIVersion, React.ReactNode> = {
  current: <Gamepad2 size={18} />,
  '1.0.0': <MessageCircle size={18} />,
  '1.0.1': <Heart size={18} />,
  '1.0.2': <Box size={18} />,
};

export default function VersionSwitcher() {
  const t = useTranslations('version');
  const { currentVersion, setVersion, accentColor, setAccentColor } = useVersion();
  const [switched, setSwitched] = useState(false);

  const handleVersionChange = (version: UIVersion) => {
    if (version === currentVersion) return;
    setVersion(version);
    setSwitched(true);
  };

  const handleAccentChange = (color: AccentColor) => {
    setAccentColor(color);
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.versionList}>
        {UI_VERSIONS.map((versionId) => {
          const meta = VERSION_METADATA[versionId];
          const isActive = currentVersion === versionId;

          return (
            <motion.button
              key={versionId}
              className={`${styles.versionRow} ${isActive ? styles.versionRowActive : ''}`}
              onClick={() => handleVersionChange(versionId)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={`${styles.versionIcon} ${isActive ? styles.versionIconActive : ''}`}>
                {VERSION_ICONS[versionId]}
              </div>
              <div className={styles.versionInfo}>
                <div className={styles.versionNameRow}>
                  <span className={styles.versionName}>{meta.name}</span>
                  <span className={styles.versionTag}>
                    {versionId === 'current' ? t('latest') : `v${versionId}`}
                  </span>
                </div>
                <p className={styles.versionDesc}>{meta.description}</p>
              </div>
              {isActive && (
                <Check size={16} className={styles.checkIcon} />
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {switched && (
          <motion.button
            className={styles.goHomeButton}
            onClick={handleGoHome}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Home size={14} />
            {t('goHome')}
          </motion.button>
        )}
      </AnimatePresence>

      <div className={styles.accentSection}>
        <div className={styles.accentLabel}>{t('accentColor')}</div>
        <div className={styles.accentSwatches}>
          {ACCENT_COLORS.map((colorId) => {
            const meta = ACCENT_COLOR_METADATA[colorId];
            const isActive = accentColor === colorId;

            return (
              <button
                key={colorId}
                className={`${styles.accentSwatch} ${isActive ? styles.accentSwatchActive : ''}`}
                onClick={() => handleAccentChange(colorId)}
                title={meta.name}
                style={{ backgroundColor: meta.value }}
              >
                {isActive && (
                  <Check size={14} className={styles.accentCheck} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
