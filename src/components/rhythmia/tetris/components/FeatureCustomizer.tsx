import React, { useState, useCallback } from 'react';
import type { FeatureSettings } from '../types';
import { DEFAULT_FEATURE_SETTINGS } from '../types';
import styles from '../VanillaGame.module.css';

type FeatureKey = keyof FeatureSettings;

interface FeatureDef {
    key: FeatureKey;
    name: string;
    nameJa: string;
    description: string;
    singlePlayer?: boolean;
    multiplayer?: boolean;
}

const FEATURES: FeatureDef[] = [
    { key: 'ghostPiece', name: 'Ghost Piece', nameJa: 'ゴースト', description: 'Show piece landing preview', singlePlayer: true, multiplayer: true },
    { key: 'beatVfx', name: 'Beat VFX', nameJa: 'ビートエフェクト', description: 'Rhythm visual effects', singlePlayer: true, multiplayer: false },
    { key: 'particles', name: 'Particles', nameJa: 'パーティクル', description: 'Terrain destruction particles', singlePlayer: true, multiplayer: false },
    { key: 'items', name: 'Items & Crafting', nameJa: 'アイテム', description: 'Item drops and crafting system', singlePlayer: true, multiplayer: false },
    { key: 'voxelBackground', name: '3D Background', nameJa: '3D背景', description: 'Voxel world background', singlePlayer: true, multiplayer: false },
    { key: 'beatBar', name: 'Beat Bar', nameJa: 'ビートバー', description: 'Rhythm timing indicator', singlePlayer: true, multiplayer: false },
    { key: 'sound', name: 'Sound', nameJa: 'サウンド', description: 'Sound effects', singlePlayer: true, multiplayer: true },
    { key: 'garbageMeter', name: 'Garbage Meter', nameJa: 'ガベージメーター', description: 'Incoming garbage indicator', singlePlayer: false, multiplayer: true },
];

interface FeatureCustomizerProps {
    settings: FeatureSettings;
    onUpdate: (settings: FeatureSettings) => void;
    onBack: () => void;
    mode: 'singleplayer' | 'multiplayer';
}

export function FeatureCustomizer({ settings, onUpdate, onBack, mode }: FeatureCustomizerProps) {
    const [current, setCurrent] = useState<FeatureSettings>({ ...settings });

    const toggleFeature = useCallback((key: FeatureKey) => {
        setCurrent(prev => {
            const next = { ...prev, [key]: !prev[key] };
            onUpdate(next);
            return next;
        });
    }, [onUpdate]);

    const resetDefaults = useCallback(() => {
        const defaults = { ...DEFAULT_FEATURE_SETTINGS };
        setCurrent(defaults);
        onUpdate(defaults);
    }, [onUpdate]);

    const filteredFeatures = FEATURES.filter(f =>
        mode === 'singleplayer' ? f.singlePlayer : f.multiplayer
    );

    return (
        <div className={styles.featurePanel}>
            <h3 className={styles.featureTitle}>FEATURES</h3>
            <span className={styles.featureSubtitle}>カスタマイズ</span>

            <div className={styles.featureList}>
                {filteredFeatures.map(feature => (
                    <div key={feature.key} className={styles.featureRow}>
                        <div className={styles.featureLabelWrap}>
                            <span className={styles.featureLabel}>{feature.name}</span>
                            <span className={styles.featureLabelJa}>{feature.nameJa}</span>
                        </div>
                        <button
                            className={`${styles.featureToggle} ${current[feature.key] ? styles.featureToggleOn : ''}`}
                            onClick={() => toggleFeature(feature.key)}
                            aria-label={`Toggle ${feature.name}`}
                        >
                            <span className={styles.featureToggleThumb} />
                        </button>
                    </div>
                ))}
            </div>

            <div className={styles.featureActions}>
                <button className={styles.featureResetBtn} onClick={resetDefaults}>
                    Reset Defaults
                </button>
                <button className={styles.featureBackBtn} onClick={onBack}>
                    Back
                </button>
            </div>
        </div>
    );
}
