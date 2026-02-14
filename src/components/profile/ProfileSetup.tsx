'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { getIconById } from '@/lib/profile/types';
import { generateFriendCode, generateDefaultName } from '@/lib/profile/storage';
import { useProfile } from '@/lib/profile/context';
import type { UserProfile } from '@/lib/profile/types';
import type { Locale } from '@/i18n/routing';
import styles from './ProfileSetup.module.css';

const DEFAULT_ICON = 'icon_rhythm';

export default function ProfileSetup() {
  const t = useTranslations('profile');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { setProfile } = useProfile();

  const [selectedLocale, setSelectedLocale] = useState<'ja' | 'en'>(locale === 'en' ? 'en' : 'ja');

  const friendCode = useMemo(() => generateFriendCode(), []);
  const defaultName = useMemo(() => generateDefaultName(), []);

  const selectedIconData = getIconById(DEFAULT_ICON);

  const handleComplete = () => {
    const profile: UserProfile = {
      name: defaultName,
      icon: DEFAULT_ICON,
      friendCode,
      locale: selectedLocale,
      isPrivate: false,
      createdAt: Date.now(),
    };
    setProfile(profile);

    // Log site entry to Discord (fire-and-forget)
    fetch('/api/site-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: profile.name,
        icon: profile.icon,
        friendCode: profile.friendCode,
        locale: profile.locale,
      }),
    }).catch(() => {});

    // Switch locale if different from current
    if (selectedLocale !== locale) {
      router.replace(pathname, { locale: selectedLocale });
    }
  };

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
        >
          <div className={styles.title}>{t('langTitle')}</div>
          <div className={styles.subtitle}>{t('langSubtitle')}</div>

          <div className={styles.langSection}>
            <div className={styles.langOptions}>
              <button
                className={`${styles.langOption} ${selectedLocale === 'ja' ? styles.langOptionSelected : ''}`}
                onClick={() => setSelectedLocale('ja')}
              >
                <span className={styles.langName}>日本語</span>
                <span className={styles.langSub}>Japanese</span>
              </button>
              <button
                className={`${styles.langOption} ${selectedLocale === 'en' ? styles.langOptionSelected : ''}`}
                onClick={() => setSelectedLocale('en')}
              >
                <span className={styles.langName}>English</span>
                <span className={styles.langSub}>英語</span>
              </button>
            </div>
          </div>

          <div className={styles.previewCard}>
            {selectedIconData && (
              <div
                className={styles.previewIcon}
                style={{
                  backgroundColor: selectedIconData.bgColor,
                  color: selectedIconData.color,
                }}
              >
                {selectedIconData.emoji}
              </div>
            )}
            <div className={styles.previewInfo}>
              <div className={styles.previewName}>{defaultName}</div>
              <div className={styles.previewCode}>{friendCode}</div>
              <div className={styles.previewLang}>
                {selectedLocale === 'ja' ? '日本語' : 'English'}
              </div>
            </div>
          </div>

          <div className={styles.buttons}>
            <button className={styles.btnNext} onClick={handleComplete}>
              OK
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
