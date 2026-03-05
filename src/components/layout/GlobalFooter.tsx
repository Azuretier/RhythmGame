'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useLayoutConfig } from '@/lib/layout/context';
import styles from './GlobalFooter.module.css';

export default function GlobalFooter() {
  const { showFooter } = useLayoutConfig();
  const t = useTranslations();
  const router = useRouter();

  if (!showFooter) return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span className={styles.copyright}>{t('footer.copyright')}</span>
        <div className={styles.footerLinks}>
          <button className={styles.footerLink} onClick={() => router.push('/wiki')}>
            Wiki
          </button>
          <button className={styles.footerLink} onClick={() => router.push('/updates')}>
            Updates
          </button>
          <a
            className={styles.footerLink}
            href="https://github.com/Azuretier"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
