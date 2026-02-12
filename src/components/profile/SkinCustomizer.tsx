'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { useSkin } from '@/lib/skin/context';
import { useProfile } from '@/lib/profile/context';
import { getIconById } from '@/lib/profile/types';
import type { Skin } from '@/lib/skin/types';
import styles from './SkinCustomizer.module.css';

const LOCALE_FLAGS: Record<string, string> = {
  ja: '\u{1F1EF}\u{1F1F5}',
  en: '\u{1F1FA}\u{1F1F8}',
  th: '\u{1F1F9}\u{1F1ED}',
  es: '\u{1F1EA}\u{1F1F8}',
  fr: '\u{1F1EB}\u{1F1F7}',
};

function PrivacyToggle() {
  const t = useTranslations('profile');
  const { profile, updateProfile } = useProfile();
  if (!profile) return null;

  const isPrivate = profile.isPrivate;

  return (
    <button
      className={`${styles.privacyToggle} ${isPrivate ? styles.privacyToggleActive : ''}`}
      onClick={() => updateProfile({ isPrivate: !isPrivate })}
      type="button"
    >
      <div className={styles.privacyIcon}>{isPrivate ? '🔒' : '🌐'}</div>
      <div className={styles.privacyText}>
        <div className={styles.privacyLabel}>
          {t(isPrivate ? 'privateProfile' : 'publicProfile')}
        </div>
        <div className={styles.privacyDesc}>
          {t(isPrivate ? 'privateProfileDesc' : 'publicProfileDesc')}
        </div>
      </div>
    </button>
  );
}

interface SkinCustomizerProps {
  onClose: () => void;
}

function SkinSwatch({ skin, isActive, onSelect }: { skin: Skin; isActive: boolean; onSelect: () => void }) {
  return (
    <motion.button
      className={`${styles.skinCard} ${isActive ? styles.skinCardActive : ''}`}
      onClick={onSelect}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{
        '--swatch-accent': skin.colors.accent,
        '--swatch-bg': skin.colors.background,
        '--swatch-surface': skin.colors.surface,
        '--swatch-fg': skin.colors.foreground,
        '--swatch-border': skin.colors.border,
      } as React.CSSProperties}
    >
      <div className={styles.swatchPreview}>
        <div className={styles.swatchBg}>
          <div className={styles.swatchHeader} />
          <div className={styles.swatchCards}>
            <div className={styles.swatchCard} />
            <div className={styles.swatchCard} />
          </div>
          <div className={styles.swatchButton} />
        </div>
      </div>
      <div className={styles.skinInfo}>
        <div className={styles.skinName}>{skin.name}</div>
        <div className={styles.skinNameJa}>{skin.nameJa}</div>
      </div>
      {isActive && (
        <div className={styles.activeBadge}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </motion.button>
  );
}

export default function SkinCustomizer({ onClose }: SkinCustomizerProps) {
  const t = useTranslations('skin');
  const tLocale = useTranslations('localeSwitcher');
  const { currentSkin, setSkin, skins } = useSkin();
  const { profile } = useProfile();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale !== locale) {
      router.replace(pathname, { locale: newLocale });
    }
  };

  const iconData = profile ? getIconById(profile.icon) : null;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className={styles.panel}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header with profile info */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {profile && iconData && (
              <div
                className={styles.profileIcon}
                style={{ backgroundColor: iconData.bgColor, color: iconData.color }}
              >
                {iconData.emoji}
              </div>
            )}
            <div className={styles.headerText}>
              <h2 className={styles.title}>{t('title')}</h2>
              {profile && (
                <div className={styles.profileName}>{profile.name}</div>
              )}
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Section label */}
        <div className={styles.sectionLabel}>{t('selectSkin')}</div>

        {/* Skin grid */}
        <div className={styles.skinGrid}>
          {skins.map((skin) => (
            <SkinSwatch
              key={skin.id}
              skin={skin}
              isActive={currentSkin.id === skin.id}
              onSelect={() => setSkin(skin.id)}
            />
          ))}
        </div>

        {/* Current skin info */}
        <div className={styles.currentInfo}>
          <div className={styles.currentLabel}>{t('currentSkin')}</div>
          <div className={styles.currentName}>
            <span
              className={styles.currentDot}
              style={{ background: currentSkin.colors.accent }}
            />
            {currentSkin.name} — {currentSkin.nameJa}
          </div>
        </div>

        {/* Language selection */}
        <div className={styles.sectionLabel}>{t('selectLanguage')}</div>
        <div className={styles.langGrid}>
          {routing.locales.map((loc) => (
            <button
              key={loc}
              className={`${styles.langOption} ${locale === loc ? styles.langOptionActive : ''}`}
              onClick={() => handleLocaleChange(loc)}
            >
              <span className={styles.langFlag}>{LOCALE_FLAGS[loc]}</span>
              <span className={styles.langName}>{tLocale(loc)}</span>
              {locale === loc && (
                <svg className={styles.langCheck} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
          
        {/* Privacy setting */}
        <div className={styles.sectionLabel}>{t('privacy')}</div>
        <div className={styles.privacySection}>
          <PrivacyToggle />
        </div>
      </motion.div>
    </motion.div>
  );
}
