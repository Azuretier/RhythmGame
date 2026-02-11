import { useState, useCallback, useEffect } from 'react';

// ===== Keybind Definitions =====
export interface GameKeybinds {
    inventory: string;
    shop: string;
}

const DEFAULT_KEYBINDS: GameKeybinds = {
    inventory: 'e',
    shop: 'l',
};

const STORAGE_KEY = 'rhythmia-keybinds';

// Human-readable key labels
export function getKeyLabel(key: string): string {
    if (key.length === 1) return key.toUpperCase();
    return key;
}

// ===== Hook =====
export function useKeybinds() {
    const [keybinds, setKeybinds] = useState<GameKeybinds>(() => {
        if (typeof window === 'undefined') return DEFAULT_KEYBINDS;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...DEFAULT_KEYBINDS, ...parsed };
            }
        } catch { /* ignore */ }
        return DEFAULT_KEYBINDS;
    });

    // Persist to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(keybinds));
        } catch { /* ignore */ }
    }, [keybinds]);

    const setKeybind = useCallback((action: keyof GameKeybinds, key: string) => {
        setKeybinds(prev => ({ ...prev, [action]: key.toLowerCase() }));
    }, []);

    const resetKeybinds = useCallback(() => {
        setKeybinds(DEFAULT_KEYBINDS);
    }, []);

    const isKeybind = useCallback((key: string, action: keyof GameKeybinds): boolean => {
        return key.toLowerCase() === keybinds[action];
    }, [keybinds]);

    return {
        keybinds,
        setKeybind,
        resetKeybinds,
        isKeybind,
        defaults: DEFAULT_KEYBINDS,
    };
}
