import { useState, useEffect, useRef, useCallback } from 'react';
import type { ServerMessage, OnlineUser } from '@/types/multiplayer';
import type { UserProfile } from '@/lib/profile/types';
import { getUnlockedCount } from '@/lib/advancements/storage';
import { BATTLE_ARENA_REQUIRED_ADVANCEMENTS } from '@/lib/advancements/definitions';
import { useProfile } from '@/lib/profile/context';
import { useRouter } from '@/i18n/navigation';

export type GameMode = 'lobby' | 'vanilla' | 'multiplayer';

export function useHomepageLogic() {
    const [gameMode, setGameMode] = useState<GameMode>('lobby');
    const [isLoading, setIsLoading] = useState(true);
    const [onlineCount, setOnlineCount] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [showAdvancements, setShowAdvancements] = useState(false);
    const [showOnlineUsers, setShowOnlineUsers] = useState(false);
    const [showSkinCustomizer, setShowSkinCustomizer] = useState(false);
    const [showSkillTree, setShowSkillTree] = useState(false);
    const [showLogoAnimation, setShowLogoAnimation] = useState(false);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);
    const profileSentRef = useRef(false);
    const profileRef = useRef<UserProfile | null>(null);

    const router = useRouter();
    const { profile, showProfileSetup } = useProfile();

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const isArenaLocked = unlockedCount < BATTLE_ARENA_REQUIRED_ADVANCEMENTS;

    // ---- Loading & advancement count ----
    useEffect(() => {
        setUnlockedCount(getUnlockedCount());
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (gameMode === 'lobby' && !showAdvancements) {
            setUnlockedCount(getUnlockedCount());
        }
    }, [gameMode, showAdvancements]);

    // ---- WebSocket for online count ----
    const sendProfileToWs = useCallback(() => {
        if (profile && wsRef.current?.readyState === WebSocket.OPEN && !profileSentRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'set_profile',
                name: profile.name,
                icon: profile.icon,
                isPrivate: profile.isPrivate,
            }));
            profileSentRef.current = true;
        }
    }, [profile]);

    const connectMultiplayerWs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

        const wsUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'ws://localhost:3001';
        const ws = new WebSocket(wsUrl);
        profileSentRef.current = false;

        ws.onopen = () => {
            const currentProfile = profileRef.current;
            if (currentProfile) {
                ws.send(JSON.stringify({
                    type: 'set_profile',
                    name: currentProfile.name,
                    icon: currentProfile.icon,
                    isPrivate: currentProfile.isPrivate,
                }));
                profileSentRef.current = true;
            }
        };

        ws.onmessage = (event) => {
            try {
                const message: ServerMessage = JSON.parse(event.data);
                if (message.type === 'online_count') {
                    setOnlineCount(message.count);
                } else if (message.type === 'online_users') {
                    setOnlineUsers(message.users);
                } else if (message.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            } catch { }
        };

        ws.onclose = () => {
            wsRef.current = null;
            profileSentRef.current = false;
        };

        wsRef.current = ws;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        connectMultiplayerWs();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connectMultiplayerWs]);

    useEffect(() => { sendProfileToWs(); }, [sendProfileToWs]);

    useEffect(() => {
        if (profile && wsRef.current?.readyState === WebSocket.OPEN && profileSentRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'set_profile',
                name: profile.name,
                icon: profile.icon,
                isPrivate: profile.isPrivate,
            }));
        }
    }, [profile?.isPrivate]); // eslint-disable-line react-hooks/exhaustive-deps

    // ---- Actions ----
    const requestOnlineUsers = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'get_online_users' }));
        }
        setShowOnlineUsers(true);
    };

    const launchGame = (mode: GameMode) => {
        if (mode === 'multiplayer' && isArenaLocked) return;
        if (mode === 'multiplayer' && wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (mode === 'vanilla') {
            setShowLogoAnimation(true);
            return;
        }
        setGameMode(mode);
    };

    const handleLogoComplete = () => {
        setGameMode('vanilla');
        requestAnimationFrame(() => setShowLogoAnimation(false));
    };

    const closeGame = () => {
        setGameMode('lobby');
        connectMultiplayerWs();
    };

    const handleFeatureClick = (action: string) => {
        switch (action) {
            case 'vanilla':
                launchGame('vanilla');
                break;
            case 'multiplayer':
                launchGame('multiplayer');
                break;
            case 'arena':
                router.push('/arena');
                break;
            case 'stories':
                router.push('/stories');
                break;
            case 'minecraft-board':
                router.push('/minecraft-board');
                break;
            case 'advancements':
                setShowAdvancements(true);
                break;
        }
    };

    return {
        gameMode,
        isLoading,
        onlineCount,
        onlineUsers,
        showAdvancements, setShowAdvancements,
        showOnlineUsers, setShowOnlineUsers,
        showSkinCustomizer, setShowSkinCustomizer,
        showSkillTree, setShowSkillTree,
        showLogoAnimation,
        unlockedCount,
        isArenaLocked,
        launchGame,
        closeGame,
        handleFeatureClick,
        requestOnlineUsers,
        handleLogoComplete,
        profile,
        showProfileSetup,
    };
}
