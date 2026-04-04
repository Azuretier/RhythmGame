import { useState, useCallback, useEffect } from 'react';

// ===== Keybind Definitions =====
export interface GameKeybinds {
    moveLeft: string;
    moveRight: string;
    softDrop: string;
    rotateCW: string;
    rotateCCW: string;
    hold: string;
    hardDrop: string;
    pause: string;
    cameraCycle: string;
    cameraReset: string;
    inventory: string;
    shop: string;
}

export const DEFAULT_KEYBINDS: GameKeybinds = {
    moveLeft: 'arrowleft',
    moveRight: 'arrowright',
    softDrop: 'arrowdown',
    rotateCW: 'arrowup',
    rotateCCW: 'z',
    hold: 'c',
    hardDrop: ' ',
    pause: 'escape',
    cameraCycle: 'v',
    cameraReset: 'r',
    inventory: 'e',
    shop: 'l',
};

export const KEYBIND_LABELS: Record<keyof GameKeybinds, string> = {
    moveLeft: 'Move Left',
    moveRight: 'Move Right',
    softDrop: 'Soft Drop',
    rotateCW: 'Rotate CW',
    rotateCCW: 'Rotate CCW',
    hold: 'Hold Piece',
    hardDrop: 'Hard Drop',
    pause: 'Pause Menu',
    cameraCycle: 'Cycle Camera',
    cameraReset: 'Reset Camera',
    inventory: 'Inventory',
    shop: 'Shop',
};

const STORAGE_KEY = 'rhythmia-keybinds';

export function normalizeKey(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
}

// Human-readable key labels
export function getKeyLabel(key: string): string {
    switch (normalizeKey(key)) {
        case ' ':
            return 'Space';
        case 'escape':
            return 'Esc';
        case 'control':
            return 'Ctrl';
        case 'shift':
            return 'Shift';
        case 'arrowleft':
            return 'Left';
        case 'arrowright':
            return 'Right';
        case 'arrowup':
            return 'Up';
        case 'arrowdown':
            return 'Down';
        default:
            return key.length === 1 ? key.toUpperCase() : key;
    }
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
        setKeybinds(prev => ({ ...prev, [action]: normalizeKey(key) }));
    }, []);

    const resetKeybinds = useCallback(() => {
        setKeybinds(DEFAULT_KEYBINDS);
    }, []);

    const isKeybind = useCallback((key: string, action: keyof GameKeybinds): boolean => {
        return normalizeKey(key) === keybinds[action];
    }, [keybinds]);

    return {
        keybinds,
        setKeybind,
        resetKeybinds,
        isKeybind,
        defaults: DEFAULT_KEYBINDS,
    };
}
