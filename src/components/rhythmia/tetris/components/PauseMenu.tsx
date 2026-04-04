'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ADVANCEMENTS } from '@/lib/advancements/definitions';
import { loadAdvancementState } from '@/lib/advancements/storage';
import Advancements from '@/components/rhythmia/Advancements';
import { getKeyLabel, KEYBIND_LABELS, type GameKeybinds } from '../hooks/useKeybinds';
import type { ColorTheme } from '../constants';
import type { FeatureSettings } from '../types';
import styles from './PauseMenu.module.css';

type PauseTab = 'overview' | 'settings' | 'theme' | 'advancements' | 'keybinds';

interface PauseMenuProps {
    score: number;
    onResume: () => void;
    onQuit?: () => void;
    usePortal?: boolean;
    // Settings
    das: number;
    arr: number;
    sdf: number;
    onDasChange: (v: number) => void;
    onArrChange: (v: number) => void;
    onSdfChange: (v: number) => void;
    // Theme
    colorTheme: ColorTheme;
    onThemeChange?: (theme: ColorTheme) => void;
    // Keybinds
    keybinds: GameKeybinds;
    onKeybindChange: (action: keyof GameKeybinds, key: string) => void;
    onKeybindsReset: () => void;
    defaultKeybinds: GameKeybinds;
    // Feature settings
    featureSettings?: FeatureSettings;
    onFeatureSettingsUpdate?: (settings: FeatureSettings) => void;
}

const TAB_CONFIG: { id: PauseTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Back to Game', icon: '>' },
    { id: 'settings', label: 'Options...', icon: '>' },
    { id: 'theme', label: 'Theme...', icon: '>' },
    { id: 'advancements', label: 'Achievements...', icon: '>' },
    { id: 'keybinds', label: 'Controls...', icon: '>' },
];

export function PauseMenu({
    score,
    onResume,
    onQuit,
    usePortal = true,
    das,
    arr,
    sdf,
    onDasChange,
    onArrChange,
    onSdfChange,
    colorTheme,
    onThemeChange,
    keybinds,
    onKeybindChange,
    onKeybindsReset,
    defaultKeybinds,
    featureSettings,
    onFeatureSettingsUpdate,
}: PauseMenuProps) {
    const [activeTab, setActiveTab] = useState<PauseTab>('overview');
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [rebindingAction, setRebindingAction] = useState<keyof GameKeybinds | null>(null);

    const totalCount = ADVANCEMENTS.length;
    const keybindConflicts = useMemo(() => {
        const grouped = new Map<string, (keyof GameKeybinds)[]>();
        for (const action of Object.keys(keybinds) as (keyof GameKeybinds)[]) {
            const key = keybinds[action];
            const existing = grouped.get(key) ?? [];
            existing.push(action);
            grouped.set(key, existing);
        }

        return Array.from(grouped.entries())
            .filter(([, actions]) => actions.length > 1)
            .map(([key, actions]) => ({ key, actions }));
    }, [keybinds]);
    const conflictedActions = useMemo(() => new Set(
        keybindConflicts.flatMap(conflict => conflict.actions)
    ), [keybindConflicts]);

    useEffect(() => {
        const state = loadAdvancementState();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUnlockedCount(state.unlockedIds.length);
    }, []);

    // Handle keybind rebinding
    const handleKeyCapture = useCallback((e: KeyboardEvent) => {
        if (!rebindingAction) return;
        e.preventDefault();
        e.stopPropagation();
        onKeybindChange(rebindingAction, e.key);
        setRebindingAction(null);
    }, [rebindingAction, onKeybindChange]);

    useEffect(() => {
        if (rebindingAction) {
            window.addEventListener('keydown', handleKeyCapture, true);
            return () => window.removeEventListener('keydown', handleKeyCapture, true);
        }
    }, [rebindingAction, handleKeyCapture]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className={styles.tabContent}>
                        <div className={styles.overviewHeader}>
                            <h2 className={styles.panelTitle}>Game Menu</h2>
                            <div className={styles.scoreDisplay}>Score: {score.toLocaleString()}</div>
                        </div>
                        <p className={styles.panelDescription}>
                            The game is paused. Resume play or open one of the menu screens.
                        </p>
                    </div>
                );

            case 'settings':
                return (
                    <div className={styles.tabContent}>
                        <h3 className={styles.panelTitle}>Options</h3>
                        <p className={styles.panelDescription}>Tune movement timing and input behavior.</p>
                        <div className={styles.settingsGroup}>
                            <SettingSlider
                                label="DAS"
                                description="Delayed Auto Shift"
                                value={das}
                                min={0}
                                max={300}
                                step={1}
                                unit="ms"
                                onChange={onDasChange}
                            />
                            <SettingSlider
                                label="ARR"
                                description="Auto Repeat Rate"
                                value={arr}
                                min={0}
                                max={100}
                                step={1}
                                unit="ms"
                                onChange={onArrChange}
                            />
                            <SettingSlider
                                label="SDF"
                                description="Soft Drop Speed"
                                value={sdf}
                                min={0}
                                max={200}
                                step={1}
                                unit="ms"
                                onChange={onSdfChange}
                            />
                        </div>
                        {featureSettings && onFeatureSettingsUpdate && (
                            <div className={styles.settingsGroup}>
                                <div className={styles.settingItem}>
                                    <div className={styles.settingHeader}>
                                        <span className={styles.settingLabel}>Mouse Controls</span>
                                        <span className={styles.settingValue}>
                                            {featureSettings.mouseControls ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                    <span className={styles.settingDesc}>
                                        Move piece with mouse, click to soft drop, scroll to rotate
                                    </span>
                                    <button
                                        className={styles.toggleBtn}
                                        style={{
                                            background: featureSettings.mouseControls
                                                ? 'rgba(0, 127, 255, 0.5)'
                                                : 'rgba(255, 255, 255, 0.1)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            borderRadius: '12px',
                                            width: '44px',
                                            height: '24px',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            transition: 'background 0.2s',
                                            marginTop: '6px',
                                        }}
                                        onClick={() =>
                                            onFeatureSettingsUpdate({
                                                ...featureSettings,
                                                mouseControls: !featureSettings.mouseControls,
                                            })
                                        }
                                    >
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '2px',
                                                left: featureSettings.mouseControls ? '22px' : '2px',
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                background: '#fff',
                                                transition: 'left 0.2s',
                                            }}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'theme':
                return (
                    <div className={styles.tabContent}>
                        <h3 className={styles.panelTitle}>Theme</h3>
                        <p className={styles.panelDescription}>Choose the board palette you want to play with.</p>
                        {onThemeChange && (
                            <div className={styles.themeGrid}>
                                {(['standard', 'stage', 'monochrome'] as ColorTheme[]).map((theme) => (
                                    <button
                                        key={theme}
                                        className={`${styles.themeCard} ${colorTheme === theme ? styles.themeCardActive : ''}`}
                                        onClick={() => onThemeChange(theme)}
                                    >
                                        <div className={styles.themePreview}>
                                            <ThemePreviewDots theme={theme} />
                                        </div>
                                        <span className={styles.themeLabel}>
                                            {theme === 'standard' ? 'Standard' : theme === 'stage' ? 'Stage' : 'Mono'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'advancements':
                return (
                    <div className={`${styles.tabContent} ${styles.advancementsTab}`}>
                        <Advancements onClose={() => setActiveTab('overview')} />
                    </div>
                );

            case 'keybinds':
                return (
                    <div className={styles.tabContent}>
                        <h3 className={styles.panelTitle}>Controls</h3>
                        <p className={styles.panelDescription}>Rebind keys used during the match.</p>
                        {keybindConflicts.length > 0 && (
                            <div className={styles.keybindConflictBox}>
                                <span className={styles.keybindConflictTitle}>Duplicate key warnings</span>
                                {keybindConflicts.map(({ key, actions }) => (
                                    <span key={key} className={styles.keybindConflictItem}>
                                        {getKeyLabel(key)}: {actions.map(action => KEYBIND_LABELS[action]).join(', ')}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className={styles.keybindsList}>
                            {(Object.keys(keybinds) as (keyof GameKeybinds)[]).map((action) => (
                                <div
                                    key={action}
                                    className={`${styles.keybindRow} ${conflictedActions.has(action) ? styles.keybindRowConflict : ''}`}
                                >
                                    <span className={styles.keybindLabel}>{KEYBIND_LABELS[action]}</span>
                                    <button
                                        className={`${styles.keybindKey} ${rebindingAction === action ? styles.keybindKeyListening : ''}`}
                                        onClick={() => setRebindingAction(rebindingAction === action ? null : action)}
                                    >
                                        {rebindingAction === action ? '...' : getKeyLabel(keybinds[action])}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button className={styles.resetKeybindsBtn} onClick={onKeybindsReset}>
                            Reset to Defaults
                        </button>
                        <div className={styles.keybindDefaults}>
                            <span className={styles.keybindDefaultsLabel}>Default keys</span>
                            {(Object.keys(defaultKeybinds) as (keyof GameKeybinds)[]).map((action) => (
                                <span key={action} className={styles.keybindDefault}>
                                    {action}: {getKeyLabel(defaultKeybinds[action])}
                                </span>
                            ))}
                        </div>
                    </div>
                );
        }
    };

    const menu = (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <h1 className={styles.pausedTitle}>Game Menu</h1>
                <div className={styles.columns}>
                    <nav className={styles.menuButtons}>
                    {TAB_CONFIG.map((tab) => (
                        <button
                            key={tab.id}
                            className={`${styles.menuButton} ${activeTab === tab.id ? styles.menuButtonActive : ''}`}
                            onClick={() => {
                                if (tab.id === 'overview') {
                                    onResume();
                                    return;
                                }
                                setActiveTab(tab.id);
                            }}
                            title={tab.label}
                        >
                            <span className={styles.menuButtonLabel}>{tab.label}</span>
                            {tab.id === 'advancements' && (
                                <span className={styles.menuButtonMeta}>{unlockedCount}/{totalCount}</span>
                            )}
                        </button>
                    ))}
                    {onQuit && (
                        <button className={`${styles.menuButton} ${styles.quitButton}`} onClick={onQuit}>
                            <span className={styles.menuButtonLabel}>Save and Quit to Title</span>
                        </button>
                    )}
                    </nav>

                    <div className={styles.panel}>
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );

    if (!usePortal) {
        return menu;
    }

    const portalRoot = typeof document !== 'undefined' ? document.body : null;
    return portalRoot ? createPortal(menu, portalRoot) : null;
}

// --- Sub-components ---

function SettingSlider({
    label,
    description,
    value,
    min,
    max,
    step,
    unit,
    onChange,
}: {
    label: string;
    description: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (v: number) => void;
}) {
    return (
        <div className={styles.settingItem}>
            <div className={styles.settingHeader}>
                <span className={styles.settingLabel}>{label}</span>
                <span className={styles.settingValue}>
                    {value}{unit}
                </span>
            </div>
            <span className={styles.settingDesc}>{description}</span>
            <input
                type="range"
                className={styles.settingSlider}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}

function ThemePreviewDots({ theme }: { theme: ColorTheme }) {
    const colors: Record<ColorTheme, string[]> = {
        standard: ['#00f0f0', '#f0f000', '#a000f0', '#00f000'],
        stage: ['#FF6B9D', '#4ECDC4', '#FFE66D', '#FF6B6B'],
        monochrome: ['#FFFFFF', '#E0E0E0', '#C0C0C0', '#A0A0A0'],
    };
    return (
        <div className={styles.themePreviewDots}>
            {colors[theme].map((c, i) => (
                <div
                    key={i}
                    className={styles.themePreviewDot}
                    style={{ backgroundColor: c }}
                />
            ))}
        </div>
    );
}
