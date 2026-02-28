'use client';

import { useVersion } from '@/lib/version/context';
import RhythmiaLobby from '@/components/rhythmia/RhythmiaLobby';
import DiscordMessengerUI from '@/components/home/discord-messenger/DiscordMessengerUI';
import CreatorPortfolioUI from '@/components/home/creator-portfolio/CreatorPortfolioUI';
import MinecraftPanoramaUI from '@/components/home/minecraft-panorama/MinecraftPanoramaUI';
import FloatingVersionSwitcher from '@/components/version/FloatingVersionSwitcher';

export default function HomePage() {
    const { currentVersion } = useVersion();

    const renderPage = () => {
        switch (currentVersion) {
            case '1.0.0':
                return <DiscordMessengerUI />;
            case '1.0.1':
                return <CreatorPortfolioUI />;
            case '1.0.2':
                return <MinecraftPanoramaUI />;
            case 'current':
            default:
                return <RhythmiaLobby />;
        }
    };

    return (
        <>
            {renderPage()}
            <FloatingVersionSwitcher />
        </>
    );
}
