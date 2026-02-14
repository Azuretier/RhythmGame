'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
    DUNGEON_MAP,
    getChapterForMission,
} from '@/data/stories/missions';
import type { MapMission, MissionDifficulty } from '@/data/stories/missions';
import type { Chapter } from '@/data/stories/chapters';
import MissionDetail from './MissionDetail';
import styles from './dungeons-map.module.css';

// ---------------------------------------------------------------------------
// Progress helpers (localStorage)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'rhythmia-mission-progress';

interface MissionProgress {
    completedMissions: string[];
    highestDifficulty: Record<string, MissionDifficulty>;
}

function loadProgress(): MissionProgress {
    if (typeof window === 'undefined') return { completedMissions: [], highestDifficulty: {} };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as MissionProgress;
    } catch { /* ignore */ }
    return { completedMissions: [], highestDifficulty: {} };
}

function saveProgress(progress: MissionProgress) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch { /* ignore */ }
}

function isMissionUnlocked(mission: MapMission, completed: string[]): boolean {
    if (mission.requires.length === 0) return true;
    return mission.requires.every((req) => completed.includes(req));
}

// ---------------------------------------------------------------------------
// Map node icons (pixel-art SVG)
// ---------------------------------------------------------------------------

function MissionIcon({ icon, isBoss }: { icon: MapMission['icon']; isBoss?: boolean }) {
    const size = isBoss ? 48 : 36;
    return (
        <svg
            viewBox="0 0 32 32"
            width={size}
            height={size}
            style={{ imageRendering: 'pixelated' }}
            className={styles.missionIconSvg}
        >
            {icon === 'camp' && (
                <>
                    {/* Tent / camp icon */}
                    <rect x="8" y="22" width="16" height="2" fill="#8B7355" />
                    <polygon points="16,6 6,22 26,22" fill="#C0A070" />
                    <polygon points="16,6 11,22 21,22" fill="#D4B896" />
                    <rect x="14" y="16" width="4" height="6" fill="#3a2a1a" />
                    {/* Fire */}
                    <rect x="24" y="18" width="4" height="4" fill="#FF6600" />
                    <rect x="25" y="16" width="2" height="2" fill="#FFAA00" />
                </>
            )}
            {icon === 'forest' && (
                <>
                    {/* Tree cluster */}
                    <polygon points="10,8 4,22 16,22" fill="#2E7D32" />
                    <polygon points="16,5 9,22 23,22" fill="#388E3C" />
                    <polygon points="22,8 16,22 28,22" fill="#2E7D32" />
                    <rect x="9" y="22" width="2" height="4" fill="#5D4037" />
                    <rect x="15" y="22" width="2" height="4" fill="#5D4037" />
                    <rect x="21" y="22" width="2" height="4" fill="#5D4037" />
                </>
            )}
            {icon === 'village' && (
                <>
                    {/* House */}
                    <rect x="6" y="16" width="10" height="10" fill="#A1887F" />
                    <polygon points="11,8 4,16 18,16" fill="#D84315" />
                    <rect x="9" y="20" width="4" height="6" fill="#5D4037" />
                    {/* Second house */}
                    <rect x="18" y="18" width="8" height="8" fill="#BCAAA4" />
                    <polygon points="22,12 16,18 28,18" fill="#BF360C" />
                </>
            )}
            {icon === 'dungeon' && (
                <>
                    {/* Cave/dungeon entrance */}
                    <rect x="4" y="8" width="24" height="18" fill="#5D4037" />
                    <rect x="6" y="10" width="20" height="14" fill="#3E2723" />
                    <ellipse cx="16" cy="18" rx="8" ry="6" fill="#1a1a1a" />
                    <rect x="12" y="8" width="2" height="4" fill="#9E9E9E" />
                    <rect x="18" y="8" width="2" height="4" fill="#9E9E9E" />
                    {/* Glow from inside */}
                    <ellipse cx="16" cy="20" rx="4" ry="3" fill="#FF8F00" opacity="0.4" />
                </>
            )}
            {icon === 'castle' && (
                <>
                    {/* Castle towers */}
                    <rect x="4" y="14" width="6" height="14" fill="#78909C" />
                    <rect x="22" y="14" width="6" height="14" fill="#78909C" />
                    <rect x="10" y="8" width="12" height="20" fill="#90A4AE" />
                    {/* Battlements */}
                    <rect x="4" y="12" width="2" height="2" fill="#607D8B" />
                    <rect x="8" y="12" width="2" height="2" fill="#607D8B" />
                    <rect x="22" y="12" width="2" height="2" fill="#607D8B" />
                    <rect x="26" y="12" width="2" height="2" fill="#607D8B" />
                    <rect x="10" y="6" width="3" height="2" fill="#607D8B" />
                    <rect x="15" y="6" width="3" height="2" fill="#607D8B" />
                    <rect x="19" y="6" width="3" height="2" fill="#607D8B" />
                    {/* Door */}
                    <rect x="14" y="20" width="4" height="8" fill="#37474F" />
                </>
            )}
            {icon === 'boss' && (
                <>
                    {/* Boss tower / dark spire */}
                    <rect x="12" y="4" width="8" height="24" fill="#4A148C" />
                    <polygon points="16,0 10,8 22,8" fill="#6A1B9A" />
                    <rect x="8" y="16" width="4" height="12" fill="#4A148C" />
                    <rect x="20" y="16" width="4" height="12" fill="#4A148C" />
                    {/* Eye */}
                    <rect x="14" y="12" width="4" height="4" fill="#E040FB" />
                    <rect x="15" y="13" width="2" height="2" fill="#FF80AB" />
                    {/* Lightning accents */}
                    <rect x="6" y="8" width="2" height="2" fill="#E040FB" opacity="0.6" />
                    <rect x="24" y="6" width="2" height="2" fill="#E040FB" opacity="0.6" />
                </>
            )}
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface DungeonsMapProps {
    onStartMission: (chapter: Chapter, mission: MapMission, difficulty: MissionDifficulty) => void;
}

export default function DungeonsMap({ onStartMission }: DungeonsMapProps) {
    const t = useTranslations('dungeonMap');
    const locale = useLocale();
    const router = useRouter();

    const [progress, setProgress] = useState<MissionProgress>(loadProgress);
    const [selectedMission, setSelectedMission] = useState<MapMission | null>(null);
    const [hoveredMission, setHoveredMission] = useState<string | null>(null);

    // Map panning
    const mapRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const panDelta = useRef({ x: 0, y: 0 });

    // Persist progress on change
    useEffect(() => {
        saveProgress(progress);
    }, [progress]);

    const handleMissionComplete = useCallback((missionId: string, difficulty: MissionDifficulty) => {
        setProgress((prev) => {
            const completed = prev.completedMissions.includes(missionId)
                ? prev.completedMissions
                : [...prev.completedMissions, missionId];
            return {
                completedMissions: completed,
                highestDifficulty: {
                    ...prev.highestDifficulty,
                    [missionId]: difficulty,
                },
            };
        });
    }, []);

    const handleStartMission = useCallback(
        (mission: MapMission, difficulty: MissionDifficulty) => {
            const chapter = getChapterForMission(mission);
            if (!chapter) return;
            // Mark as complete when starting (will be confirmed on chapter finish in parent)
            handleMissionComplete(mission.id, difficulty);
            onStartMission(chapter, mission, difficulty);
        },
        [onStartMission, handleMissionComplete],
    );

    // --- Pan handlers ---
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest(`.${styles.missionNode}`)) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        panDelta.current = { x: 0, y: 0 };
    }, [panOffset]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        panDelta.current = {
            x: Math.abs(dx - panOffset.x),
            y: Math.abs(dy - panOffset.y),
        };
        setPanOffset({ x: dx, y: dy });
    }, [isPanning, panStart, panOffset]);

    const handlePointerUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    // --- Render paths (SVG lines between nodes) ---
    const renderPaths = () => {
        const missionMap = new Map(DUNGEON_MAP.missions.map((m) => [m.id, m]));
        return DUNGEON_MAP.paths.map((path) => {
            const from = missionMap.get(path.from);
            const to = missionMap.get(path.to);
            if (!from || !to) return null;

            const fromUnlocked = isMissionUnlocked(from, progress.completedMissions);
            const toUnlocked = isMissionUnlocked(to, progress.completedMissions);
            const pathActive = fromUnlocked && toUnlocked;
            const fromCompleted = progress.completedMissions.includes(from.id);

            return (
                <line
                    key={`${path.from}-${path.to}`}
                    x1={`${from.x}%`}
                    y1={`${from.y}%`}
                    x2={`${to.x}%`}
                    y2={`${to.y}%`}
                    className={`${styles.mapPath} ${pathActive ? styles.mapPathActive : ''} ${fromCompleted ? styles.mapPathCompleted : ''}`}
                    strokeDasharray={pathActive ? 'none' : '8 6'}
                />
            );
        });
    };

    return (
        <div className={styles.mapContainer}>
            {/* Background layers */}
            <div className={styles.mapBg} />
            <div className={styles.mapParchment} />
            <div className={styles.scanlines} />

            {/* Header */}
            <div className={styles.mapHeader}>
                <button
                    className={styles.backButton}
                    onClick={() => router.push('/')}
                >
                    {t('back')}
                </button>
                <h1 className={styles.mapTitle}>{t('title')}</h1>
                <div className={styles.progressBadge}>
                    {progress.completedMissions.length}/{DUNGEON_MAP.missions.length} {t('completed')}
                </div>
            </div>

            {/* Pannable map area */}
            <div
                className={styles.mapViewport}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <div
                    ref={mapRef}
                    className={styles.mapCanvas}
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                        cursor: isPanning ? 'grabbing' : 'grab',
                    }}
                >
                    {/* SVG paths between nodes */}
                    <svg className={styles.pathLayer} viewBox="0 0 100 100" preserveAspectRatio="none">
                        {renderPaths()}
                    </svg>

                    {/* Mission nodes */}
                    {DUNGEON_MAP.missions.map((mission) => {
                        const unlocked = isMissionUnlocked(mission, progress.completedMissions);
                        const completed = progress.completedMissions.includes(mission.id);
                        const isSelected = selectedMission?.id === mission.id;
                        const isHovered = hoveredMission === mission.id;

                        return (
                            <button
                                key={mission.id}
                                className={`${styles.missionNode} ${unlocked ? styles.missionUnlocked : styles.missionLocked} ${completed ? styles.missionCompleted : ''} ${isSelected ? styles.missionSelected : ''} ${mission.isBoss ? styles.missionBoss : ''}`}
                                style={{
                                    left: `${mission.x}%`,
                                    top: `${mission.y}%`,
                                    '--accent': mission.accent,
                                } as React.CSSProperties}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (unlocked) setSelectedMission(mission);
                                }}
                                onMouseEnter={() => setHoveredMission(mission.id)}
                                onMouseLeave={() => setHoveredMission(null)}
                                disabled={!unlocked}
                            >
                                <div className={styles.nodeGlow} />
                                <div className={styles.nodeIcon}>
                                    <MissionIcon icon={mission.icon} isBoss={mission.isBoss} />
                                </div>
                                {completed && (
                                    <div className={styles.completedCheck}>
                                        <svg viewBox="0 0 16 16" width="14" height="14">
                                            <path d="M3 8l3 3 7-7" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                )}
                                {!unlocked && (
                                    <div className={styles.lockIcon}>
                                        <svg viewBox="0 0 16 16" width="12" height="12">
                                            <rect x="3" y="7" width="10" height="8" rx="1" fill="#666" />
                                            <path d="M5 7V5a3 3 0 016 0v2" stroke="#666" strokeWidth="1.5" fill="none" />
                                        </svg>
                                    </div>
                                )}

                                {/* Tooltip on hover */}
                                {(isHovered || isSelected) && unlocked && (
                                    <div className={styles.nodeTooltip}>
                                        <span className={styles.tooltipName}>{t(`missions.${mission.nameKey}`)}</span>
                                        {completed && <span className={styles.tooltipCompleted}>{t('cleared')}</span>}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Mission detail panel */}
            {selectedMission && (
                <MissionDetail
                    mission={selectedMission}
                    progress={progress}
                    onStart={handleStartMission}
                    onClose={() => setSelectedMission(null)}
                />
            )}

            {/* Decorative compass */}
            <div className={styles.compass}>
                <svg viewBox="0 0 48 48" width="48" height="48" style={{ imageRendering: 'pixelated' }}>
                    <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    <polygon points="24,4 28,20 24,16 20,20" fill="rgba(255,100,100,0.5)" />
                    <polygon points="24,44 28,28 24,32 20,28" fill="rgba(255,255,255,0.2)" />
                    <polygon points="4,24 20,20 16,24 20,28" fill="rgba(255,255,255,0.15)" />
                    <polygon points="44,24 28,20 32,24 28,28" fill="rgba(255,255,255,0.15)" />
                    <text x="24" y="3" textAnchor="middle" fontSize="5" fill="rgba(255,255,255,0.3)" fontFamily="'Press Start 2P', monospace">N</text>
                </svg>
            </div>
        </div>
    );
}
