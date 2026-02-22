import React from 'react';
import type { CorruptionNode } from '../types';
import styles from '../SideBoard.module.css';

interface CorruptionOverlayProps {
    node: CorruptionNode;
}

const LEVEL_CLASSES = [
    styles.corruptionLevel0,
    styles.corruptionLevel1,
    styles.corruptionLevel2,
    styles.corruptionLevel3,
    styles.corruptionLevel4,
    styles.corruptionMature,
];

/**
 * Renders a corruption node glow overlay within a side board tile.
 * Visual intensity scales with corruption level (0=subtle seed → 5=bright magenta pulse).
 */
export function CorruptionOverlay({ node }: CorruptionOverlayProps) {
    const levelClass = LEVEL_CLASSES[Math.min(node.level, LEVEL_CLASSES.length - 1)];
    return <div className={levelClass} />;
}
