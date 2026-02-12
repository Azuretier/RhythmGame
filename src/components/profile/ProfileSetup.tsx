'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { PROFILE_ICONS, getIconById } from '@/lib/profile/types';
import { generateFriendCode } from '@/lib/profile/storage';
import { useProfile } from '@/lib/profile/context';
import type { UserProfile } from '@/lib/profile/types';
import type { Locale } from '@/i18n/routing';
import styles from './ProfileSetup.module.css';

type Step = 'icon' | 'name' | 'language' | 'confirm';
const STEPS: Step[] = ['icon', 'name', 'language', 'confirm'];
const MAX_NAME_LENGTH = 10;

export default function ProfileSetup() {
  const t = useTranslations('profile');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { setProfile } = useProfile();

  const [step, setStep] = useState<Step>('icon');
  const [selectedIcon, setSelectedIcon] = useState<string>('icon_rhythm');
  const [name, setName] = useState('');
  const [selectedLocale, setSelectedLocale] = useState<'ja' | 'en'>(locale === 'en' ? 'en' : 'ja');

  const friendCode = useMemo(() => generateFriendCode(), []);

  const stepIndex = STEPS.indexOf(step);

  const canProceed = useCallback(() => {
    switch (step) {
      case 'icon':
        return !!selectedIcon;
      case 'name':
        return name.trim().length > 0;
      case 'language':
        return true;
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [step, selectedIcon, name]);

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
    }
  };

  const handleComplete = () => {
    const profile: UserProfile = {
      name: name.trim(),
      icon: selectedIcon,
      friendCode,
      locale: selectedLocale,
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

  const selectedIconData = getIconById(selectedIcon);

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.container}>
        {/* Step indicators */}
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`${styles.stepDot} ${
                i === stepIndex ? styles.stepDotActive : i < stepIndex ? styles.stepDotDone : ''
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Icon Selection */}
          {step === 'icon' && (
            <motion.div
              key="icon"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
            >
              <div className={styles.title}>{t('iconTitle')}</div>
              <div className={styles.subtitle}>{t('iconSubtitle')}</div>

              <div className={styles.iconGrid}>
                {PROFILE_ICONS.map((icon) => (
                  <button
                    key={icon.id}
                    className={`${styles.iconOption} ${selectedIcon === icon.id ? styles.iconOptionSelected : ''}`}
                    style={{ backgroundColor: icon.bgColor, color: icon.color }}
                    onClick={() => setSelectedIcon(icon.id)}
                    aria-label={icon.id}
                  >
                    {icon.emoji}
                  </button>
                ))}
              </div>

              <div className={styles.buttons}>
                <button
                  className={styles.btnNext}
                  onClick={goNext}
                  disabled={!canProceed()}
                >
                  {t('next')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Name Input */}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
            >
              <div className={styles.title}>{t('nameTitle')}</div>
              <div className={styles.subtitle}>{t('nameSubtitle')}</div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>{t('nameLabel')}</label>
                <input
                  className={styles.nameInput}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_NAME_LENGTH) {
                      setName(e.target.value);
                    }
                  }}
                  placeholder={t('namePlaceholder')}
                  maxLength={MAX_NAME_LENGTH}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canProceed()) goNext();
                  }}
                />
                <div className={styles.charCount}>
                  {name.length}/{MAX_NAME_LENGTH}
                </div>
              </div>

              <div className={styles.friendCodeSection}>
                <div className={styles.friendCodeLabel}>{t('friendCodeLabel')}</div>
                <div className={styles.friendCode}>{friendCode}</div>
              </div>

              <div className={styles.buttons}>
                <button className={styles.btnBack} onClick={goBack}>
                  {t('back')}
                </button>
                <button
                  className={styles.btnNext}
                  onClick={goNext}
                  disabled={!canProceed()}
                >
                  {t('next')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Language Selection */}
          {step === 'language' && (
            <motion.div
              key="language"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
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

              <div className={styles.buttons}>
                <button className={styles.btnBack} onClick={goBack}>
                  {t('back')}
                </button>
                <button className={styles.btnNext} onClick={goNext}>
                  {t('next')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
            >
              <div className={styles.title}>{t('confirmTitle')}</div>
              <div className={styles.subtitle}>{t('confirmSubtitle')}</div>

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
                  <div className={styles.previewName}>{name}</div>
                  <div className={styles.previewCode}>{friendCode}</div>
                  <div className={styles.previewLang}>
                    {selectedLocale === 'ja' ? '日本語' : 'English'}
                  </div>
                </div>
              </div>

              <div className={styles.buttons}>
                <button className={styles.btnBack} onClick={goBack}>
                  {t('back')}
                </button>
                <button className={styles.btnNext} onClick={handleComplete}>
                  OK
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
