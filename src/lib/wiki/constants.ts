import type { WikiCategory } from './types';

const envEmails = typeof process !== 'undefined'
  ? process.env.NEXT_PUBLIC_WIKI_ADMIN_EMAILS
  : undefined;

export const WIKI_ADMIN_EMAILS: string[] = envEmails
  ? envEmails.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  : [];

export function isWikiAdmin(email: string | null): boolean {
  if (!email) return false;
  return WIKI_ADMIN_EMAILS.includes(email.toLowerCase());
}

export const MAX_TITLE_LENGTH = 100;
export const MAX_CONTENT_LENGTH = 50000;
export const MAX_DESCRIPTION_LENGTH = 300;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

export const WIKI_CATEGORIES: { value: WikiCategory; labelKey: string }[] = [
  { value: 'guide', labelKey: 'categoryGuide' },
  { value: 'tutorial', labelKey: 'categoryTutorial' },
  { value: 'tip', labelKey: 'categoryTip' },
  { value: 'general', labelKey: 'categoryGeneral' },
];

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `page-${Date.now()}`;
}
