import type { Metadata } from "next";
import localFont from "next/font/local";
import "../globals.css";
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

import Provider from '../provider';
import { VersionProvider } from '@/lib/version/context';
import NotificationCenter from '@/components/main/NotificationCenter';

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
            canonical: locale === 'ja' ? baseUrl : `${baseUrl}/en`,
            languages: {
                'ja': baseUrl,
                'en': `${baseUrl}/en`,
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
            locale: locale === 'ja' ? 'ja_JP' : 'en_US',
            alternateLocale: locale === 'ja' ? ['en_US'] : ['ja_JP'],
            type: 'website',
            url: locale === 'ja' ? baseUrl : `${baseUrl}/en`,
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

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Azuretia",
        "operatingSystem": "Web",
        "applicationCategory": "GameApplication",
        "genre": ["PuzzleGame", "MusicGame"],
        "description": locale === 'ja'
            ? "テトリスとリズムゲームを融合させたブラウザパズルゲーム。"
            : "A browser-based puzzle game merging Tetris and rhythm mechanics.",
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
                    <VersionProvider>
                        <Provider>
                            <NotificationCenter />
                            {children}
                        </Provider>
                    </VersionProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
