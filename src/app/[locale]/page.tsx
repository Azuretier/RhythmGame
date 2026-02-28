'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useVersion } from '@/lib/version/context';
import RhythmiaLobby from '@/components/rhythmia/RhythmiaLobby';
import DiscordMessengerUI from '@/components/home/discord-messenger/DiscordMessengerUI';
import CreatorPortfolioUI from '@/components/home/creator-portfolio/CreatorPortfolioUI';
import MinecraftPanoramaUI from '@/components/home/minecraft-panorama/MinecraftPanoramaUI';
import FloatingVersionSwitcher from '@/components/version/FloatingVersionSwitcher';

type PageTab = 'homepage' | 'rhythmia';

export default function HomePage() {
    const { currentVersion } = useVersion();
    const [activeTab, setActiveTab] = useState<PageTab>('homepage');
    const t = useTranslations('pageTab');

    const hasHomepage = currentVersion !== 'current';

    const renderHomepage = () => {
        switch (currentVersion) {
            case '1.0.0':
                return <DiscordMessengerUI />;
            case '1.0.1':
                return <CreatorPortfolioUI />;
            case '1.0.2':
                return <MinecraftPanoramaUI />;
            default:
                return null;
        }
    };

    // For 'current' version, RhythmiaLobby IS the homepage — no tabs needed
    if (!hasHomepage) {
        return (
            <>
                <RhythmiaLobby />
                <FloatingVersionSwitcher />
            </>
        );
    }

    // For other versions, offer both the version-specific Homepage and RhythmiaLobby
    return (
        <>
            <AnimatePresence mode="wait" initial={false}>
                {activeTab === 'homepage' ? (
                    <motion.div
                        key="homepage"
                        initial={false}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {renderHomepage()}
                    </motion.div>
                ) : (
                    <motion.div
                        key="rhythmia"
                        initial={false}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <RhythmiaLobby />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Page tab switcher — toggle between Homepage and Rhythmia */}
            <motion.nav
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-lg"
            >
                <button
                    onClick={() => setActiveTab('homepage')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                        activeTab === 'homepage'
                            ? 'bg-white/15 text-white shadow-sm'
                            : 'text-white/50 hover:text-white/80'
                    }`}
                >
                    <Home size={14} />
                    <span>{t('home')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('rhythmia')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                        activeTab === 'rhythmia'
                            ? 'bg-white/15 text-white shadow-sm'
                            : 'text-white/50 hover:text-white/80'
                    }`}
                >
                    <Gamepad2 size={14} />
                    <span>{t('rhythmia')}</span>
                </button>
            </motion.nav>

            <FloatingVersionSwitcher />
        </>
    );
}
