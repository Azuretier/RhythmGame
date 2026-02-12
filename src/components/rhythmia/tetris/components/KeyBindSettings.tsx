import React, { useState, useEffect, useCallback } from 'react';
import type { Keybindings } from '../types';
import { DEFAULT_KEYBINDINGS } from '../types';
import styles from '../VanillaGame.module.css';

interface KeyBindSettingsProps {
    bindings: Keybindings;
    onUpdate: (bindings: Keybindings) => void;
    onBack: () => void;
}

const BIND_LABELS: Record<keyof Keybindings, { name: string; nameJa: string }> = {
    inventory: { name: 'Inventory', nameJa: 'インベントリ' },
    shop: { name: 'Shop', nameJa: 'ショップ' },
};

function formatKey(key: string): string {
    if (key === ' ') return 'Space';
    if (key === 'Escape') return 'ESC';
    if (key === 'Control') return 'Ctrl';
    if (key === 'Shift') return 'Shift';
    if (key.startsWith('Arrow')) return key.replace('Arrow', '');
    return key.toUpperCase();
}

/**
 * Key bindings settings panel for the pause menu.
 * Allows remapping inventory (E), shop (L), and forge (F) keys.
 */
export function KeyBindSettings({ bindings, onUpdate, onBack }: KeyBindSettingsProps) {
    const [listening, setListening] = useState<keyof Keybindings | null>(null);
    const [current, setCurrent] = useState<Keybindings>({ ...bindings });

    // Listen for key press when rebinding
    useEffect(() => {
        if (!listening) return;

        const handleKey = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Escape cancels binding
            if (e.key === 'Escape') {
                setListening(null);
                return;
            }

            // Don't allow binding game-critical keys
            const forbidden = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'p', 'P']);
            if (forbidden.has(e.key)) return;

            const newBindings = { ...current, [listening]: e.key.toLowerCase() };
            setCurrent(newBindings);
            onUpdate(newBindings);
            setListening(null);
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [listening, current, onUpdate]);

    const resetDefaults = useCallback(() => {
        const defaults = { ...DEFAULT_KEYBINDINGS };
        setCurrent(defaults);
        onUpdate(defaults);
    }, [onUpdate]);

    return (
        <div className={styles.keyBindPanel}>
            <h3 className={styles.keyBindTitle}>KEY BINDINGS</h3>
            <span className={styles.keyBindSubtitle}>キー設定</span>

            <div className={styles.keyBindList}>
                {(Object.keys(BIND_LABELS) as (keyof Keybindings)[]).map(action => (
                    <div key={action} className={styles.keyBindRow}>
                        <div className={styles.keyBindLabelWrap}>
                            <span className={styles.keyBindLabel}>{BIND_LABELS[action].name}</span>
                            <span className={styles.keyBindLabelJa}>{BIND_LABELS[action].nameJa}</span>
                        </div>
                        <button
                            className={`${styles.keyBindKey} ${listening === action ? styles.keyBindKeyListening : ''}`}
                            onClick={() => setListening(listening === action ? null : action)}
                        >
                            {listening === action ? 'Press a key...' : formatKey(current[action])}
                        </button>
                    </div>
                ))}
            </div>

            <div className={styles.keyBindActions}>
                <button className={styles.keyBindResetBtn} onClick={resetDefaults}>
                    Reset Defaults
                </button>
                <button className={styles.keyBindBackBtn} onClick={onBack}>
                    Back
                </button>
            </div>
        </div>
    );
}
