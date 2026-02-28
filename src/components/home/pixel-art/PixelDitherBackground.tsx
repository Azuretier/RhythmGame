'use client';

import styles from './PixelArtHomepage.module.css';

export default function PixelDitherBackground() {
    return (
        <svg
            className={styles.ditherBg}
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
        >
            <defs>
                <pattern id="dither-bg" width="16" height="16" patternUnits="userSpaceOnUse">
                    <rect width="16" height="16" fill="#1a1410" />
                    <rect x="0" y="0" width="8" height="8" fill="#1e1812" />
                    <rect x="8" y="8" width="8" height="8" fill="#1e1812" />
                </pattern>
                <pattern id="dither-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <rect width="32" height="32" fill="transparent" />
                    <line x1="0" y1="32" x2="32" y2="32" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                    <line x1="32" y1="0" x2="32" y2="32" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dither-bg)" />
            <rect width="100%" height="100%" fill="url(#dither-grid)" />
        </svg>
    );
}
