'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LocaleSwitcher.module.css';

const LOCALE_FLAGS: Record<string, string> = {
    ja: '🇯🇵',
    en: '🇺🇸',
    th: '🇹🇭',
    es: '🇪🇸',
    fr: '🇫🇷',
    ru: '🇷🇺',
    zh: '🇨🇳',
    pt: '🇧🇷',
    de: '🇩🇪',
    ko: '🇰🇷',
    ar: '🇸🇦',
    hi: '🇮🇳',
    it: '🇮🇹',
    tr: '🇹🇷',
    nl: '🇳🇱',
    pl: '🇵🇱',
    vi: '🇻🇳',
    id: '🇮🇩',
    uk: '🇺🇦',
    sv: '🇸🇪',
    cs: '🇨🇿',
    ro: '🇷🇴',
    el: '🇬🇷',
    he: '🇮🇱',
    ms: '🇲🇾',
    fa: '🇮🇷',
};

export default function LocaleSwitcher() {
    const t = useTranslations('localeSwitcher');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const handleChange = (newLocale: Locale) => {
        setOpen(false);
        if (newLocale !== locale) {
            router.replace(pathname, { locale: newLocale });
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.wrapper} ref={ref}>
            <button
                className={styles.trigger}
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className={styles.flag}>{LOCALE_FLAGS[locale]}</span>
                <span className={styles.label}>{t(locale)}</span>
                <motion.span
                    className={styles.chevron}
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    ▾
                </motion.span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.ul
                        className={styles.dropdown}
                        role="listbox"
                        aria-label={t('label')}
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {routing.locales.map((loc, i) => (
                            <motion.li
                                key={loc}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03, duration: 0.15 }}
                            >
                                <button
                                    role="option"
                                    aria-selected={locale === loc}
                                    className={`${styles.option} ${locale === loc ? styles.active : ''}`}
                                    onClick={() => handleChange(loc)}
                                >
                                    <span className={styles.flag}>{LOCALE_FLAGS[loc]}</span>
                                    <span className={styles.optionLabel}>{t(loc)}</span>
                                    {locale === loc && (
                                        <motion.span
                                            className={styles.check}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                        >
                                            ✓
                                        </motion.span>
                                    )}
                                </button>
                            </motion.li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}
