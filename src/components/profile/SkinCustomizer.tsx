'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { useSkin } from '@/lib/skin/context';
import { useProfile } from '@/lib/profile/context';
import { useGoogleSync } from '@/lib/google-sync/context';
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
  const tSync = useTranslations('googleSync');
  const tLocale = useTranslations('localeSwitcher');
  const { currentSkin, setSkin, skins } = useSkin();
  const { profile } = useProfile();
  const {
    isLinked,
    googleDisplayName,
    googleEmail,
    googlePhotoURL,
    status,
    linkGoogle,
    unlinkGoogle,
    syncNow,
  } = useGoogleSync();
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

        {/* Google Account Sync */}
        <div className={styles.sectionLabel}>{tSync('sectionTitle')}</div>
        <div className={styles.syncSection}>
          {isLinked ? (
            <div className={styles.syncLinked}>
              <div className={styles.syncAccount}>
                {googlePhotoURL ? (
                  <img
                    src={googlePhotoURL}
                    alt=""
                    className={styles.syncAvatar}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={styles.syncAvatarPlaceholder}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
                <div className={styles.syncInfo}>
                  <div className={styles.syncName}>
                    {googleDisplayName || googleEmail}
                  </div>
                  {googleDisplayName && googleEmail && (
                    <div className={styles.syncEmail}>{googleEmail}</div>
                  )}
                </div>
              </div>
              <div className={styles.syncActions}>
                <button
                  className={styles.syncButton}
                  onClick={syncNow}
                  disabled={status === 'syncing'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                  </svg>
                  {status === 'syncing' ? tSync('syncing') : tSync('syncNow')}
                </button>
                <button
                  className={styles.syncButtonDanger}
                  onClick={unlinkGoogle}
                  disabled={status === 'syncing' || status === 'linking'}
                >
                  {tSync('signOut')}
                </button>
              </div>
              {status === 'done' && (
                <div className={styles.syncStatus}>{tSync('synced')}</div>
              )}
              {status === 'error' && (
                <div className={styles.syncStatusError}>{tSync('error')}</div>
              )}
            </div>
          ) : (
            <div className={styles.syncUnlinked}>
              <div className={styles.syncDesc}>{tSync('description')}</div>
              <button
                className={styles.googleSignInButton}
                onClick={linkGoogle}
                disabled={status === 'linking'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {status === 'linking' ? tSync('linking') : tSync('signIn')}
              </button>
            </div>
          )}
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
