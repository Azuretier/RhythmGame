'use client';

import { useVersion } from '@/lib/version/context';
import RhythmiaLobby from '@/components/rhythmia/RhythmiaLobby';
import V1_0_0_UI from '@/components/home/v1.0.0/V1_0_0_UI';
import V1_0_1_UI from '@/components/home/v1.0.1/V1_0_1_UI';
import V1_0_2_UI from '@/components/home/v1.0.2/V1_0_2_UI';
import FloatingVersionSwitcher from '@/components/version/FloatingVersionSwitcher';

export default function HomePage() {
    const { currentVersion } = useVersion();

    const renderPage = () => {
        switch (currentVersion) {
            case '1.0.0':
                return <V1_0_0_UI />;
            case '1.0.1':
                return <V1_0_1_UI />;
            case '1.0.2':
                return <V1_0_2_UI />;
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
