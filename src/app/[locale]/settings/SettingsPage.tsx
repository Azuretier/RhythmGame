'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import SkinCustomizer from '@/components/profile/SkinCustomizer';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const t = useTranslations('nav');

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className={styles.title}>{t('settings')}</h1>
      </motion.div>

      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <SkinCustomizer inline />
      </motion.div>
    </div>
  );
}
