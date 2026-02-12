import type { Metadata } from "next";
import localFont from "next/font/local";
import "../globals.css";
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

import Provider from '../provider';
import { VersionProvider } from '@/lib/version/context';
import { ProfileProvider } from '@/lib/profile/context';

import { GoogleAnalytics } from "@next/third-parties/google";

const geistSans = localFont({
    src: "../fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});
const geistMono = localFont({
    src: "../fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

// Generate static params for all locales
export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

// Generate localized metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'meta' });

    const baseUrl = 'https://azuretier.net';

    return {
        title: t('title'),
        description: t('description'),
        keywords: t('keywords'),
        metadataBase: new URL(baseUrl),
        alternates: {
            canonical: locale === 'ja' ? baseUrl : `${baseUrl}/${locale}`,
            languages: {
                'ja': baseUrl,
                'en': `${baseUrl}/en`,
                'th': `${baseUrl}/th`,
                'es': `${baseUrl}/es`,
                'fr': `${baseUrl}/fr`,
            },
        },
        openGraph: {
            images: [
                {
                    url: 'https://azuretier.net/rhythmia.png',
                    width: 1200,
                    height: 630,
                },
            ],
            title: t('ogTitle'),
            description: t('ogDescription'),
            locale: { ja: 'ja_JP', en: 'en_US', th: 'th_TH', es: 'es_ES', fr: 'fr_FR' }[locale] || 'en_US',
            alternateLocale: ['ja_JP', 'en_US', 'th_TH', 'es_ES', 'fr_FR'].filter(l => l !== ({ ja: 'ja_JP', en: 'en_US', th: 'th_TH', es: 'es_ES', fr: 'fr_FR' }[locale] || 'en_US')),
            type: 'website',
            url: locale === 'ja' ? baseUrl : `${baseUrl}/${locale}`,
            siteName: 'Azuretia',
        },
        twitter: {
            card: 'summary_large_image',
            site: '@Azuretier',
            title: t('ogTitle'),
            description: t('ogDescription'),
            images: ['https://azuretier.net/og-rhythmia.png']
        }
    };
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    // Provide all messages to the client side
    const messages = await getMessages();

    const gaId = process.env.NEXT_PUBLIC_GA_ID;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Azuretia",
        "operatingSystem": "Web",
        "applicationCategory": "GameApplication",
        "genre": ["PuzzleGame", "MusicGame"],
        "description": {
            ja: "テトリスとリズムゲームを融合させたブラウザパズルゲーム。",
            en: "A browser-based puzzle game merging Tetris and rhythm mechanics.",
            th: "เกมพัซเซิลบนเบราว์เซอร์ที่ผสมผสานเตตริสและกลไกจังหวะ",
            es: "Un juego de puzzles en el navegador que fusiona Tetris y mecánicas de ritmo.",
            fr: "Un jeu de puzzle en navigateur fusionnant Tetris et mécaniques de rythme."
        }[locale] || "A browser-based puzzle game merging Tetris and rhythm mechanics.",
        "author": {
            "@type": "Person",
            "name": "Azuretier"
        }
    };

    return (
        <html lang={locale}>
            <head>
                <meta name="theme-color" content="#ffbd43" />
                <link rel="icon" href="/favicon.ico" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Zen+Kaku+Gothic+New:wght@300;400;700&display=swap" rel="stylesheet" />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ overflowX: 'hidden' }}>
                <NextIntlClientProvider messages={messages}>
                    <ProfileProvider>
                        <VersionProvider>
                            <Provider>
                                {children}
                            </Provider>
                        </VersionProvider>
                    </ProfileProvider>
                </NextIntlClientProvider>
                {gaId && <GoogleAnalytics gaId={gaId} />}
            </body>
        </html>
    );
}
