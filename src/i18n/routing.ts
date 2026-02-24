import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
    // List of all supported locales
    locales: ['ja', 'en', 'th', 'es', 'fr', 'ru', 'zh', 'pt', 'de', 'ko', 'ar', 'hi', 'it', 'tr', 'nl', 'pl', 'vi', 'id', 'uk', 'sv', 'cs', 'ro', 'el', 'he', 'ms', 'fa'],

    // Japanese as the default locale (no prefix)
    defaultLocale: 'ja',

    // Prefix strategy: 'as-needed' means default locale has no prefix
    localePrefix: 'as-needed'
});

// Type helper for locales
export type Locale = (typeof routing.locales)[number];
