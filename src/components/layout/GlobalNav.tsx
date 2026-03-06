'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { useLayoutConfig } from '@/lib/layout/context';
import styles from './GlobalNav.module.css';

const GAME_ROUTES = [
  '/arena',
  '/minecraft-board',
  '/minecraft-world',
  '/minecraft',
  '/tower-defense',
  '/echoes',
  '/chapter',
  '/stories',
];

export default function GlobalNav() {
  const { showNav } = useLayoutConfig();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');

  // Strip locale prefix to get the route path
  const routePath = pathname.replace(/^\/(en|th|es|fr)/, '') || '/';

  // Check if current page is a fullscreen game page
  const isGamePage = GAME_ROUTES.some(
    (route) => routePath === route || routePath.startsWith(route + '/')
  );

  // Show back button on game pages instead of nav
  if (isGamePage || !showNav) {
    return (
      <button className={styles.backButton} onClick={() => router.push('/')}>
        <ArrowLeft size={14} />
        {t('lobby')}
      </button>
    );
  }

  const isActive = (path: string) =>
    routePath === path ? styles.navLinkActive : '';

  return (
    <nav className={styles.navbar}>
      <div className={styles.navInner}>
        <button className={styles.navLogo} onClick={() => router.push('/')}>
          azuretier<span className={styles.navLogoAccent}>.net</span>
        </button>

        <div className={styles.navLinks}>
          <button
            className={`${styles.navLink} ${isActive('/games')}`}
            onClick={() => router.push('/games')}
          >
            {t('games')}
          </button>
          <button
            className={`${styles.navLink} ${isActive('/wiki')}`}
            onClick={() => router.push('/wiki')}
          >
            {t('wiki')}
          </button>
          <button
            className={`${styles.navLink} ${isActive('/updates')}`}
            onClick={() => router.push('/updates')}
          >
            {t('updates')}
          </button>
          <button
            className={`${styles.navLink} ${isActive('/shop')}`}
            onClick={() => router.push('/shop')}
          >
            {t('shop')}
          </button>
          <button
            className={`${styles.navLink} ${isActive('/loyalty')}`}
            onClick={() => router.push('/loyalty')}
          >
            {t('loyalty')}
          </button>
          <button
            className={`${styles.navLink} ${isActive('/settings')}`}
            onClick={() => router.push('/settings')}
          >
            {t('settings')}
          </button>

          <div className={styles.navDivider} />

          <LocaleSwitcher />
        </div>
      </div>
    </nav>
  );
}
