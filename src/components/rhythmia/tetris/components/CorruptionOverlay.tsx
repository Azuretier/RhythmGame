import React from 'react';
import type { CorruptionNode } from '../types';
import styles from '../SideBoard.module.css';

interface CorruptionOverlayProps {
    node: CorruptionNode;
}

const LEVEL_CLASSES = [
    styles.minimapCorruption0,
    styles.minimapCorruption1,
    styles.minimapCorruption2,
    styles.minimapCorruption3,
    styles.minimapCorruption4,
    styles.minimapCorruptionMature,
];

/**
 * Renders a corruption node glow overlay within a minimap tile.
 * Visual intensity scales with corruption level (0=subtle seed → 5=bright magenta pulse).
 */
export function CorruptionOverlay({ node }: CorruptionOverlayProps) {
    const levelClass = LEVEL_CLASSES[Math.min(node.level, LEVEL_CLASSES.length - 1)];
    return <div className={levelClass} />;
}
