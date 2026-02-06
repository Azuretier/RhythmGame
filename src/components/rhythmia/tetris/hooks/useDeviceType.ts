import { useEffect, useState, useMemo } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type DeviceClass = 'android' | 'ios' | 'desktop';

interface DeviceInfo {
    type: DeviceType;
    deviceClass: DeviceClass;
    viewportWidth: number;
    viewportHeight: number;
    isPortrait: boolean;
    isLandscape: boolean;
    cellSize: number;
    boardScale: number;
}

// Breakpoints for responsive design
const BREAKPOINTS = {
    mobile: 480,   // Up to 480px = mobile phone
    tablet: 1024,  // 481px - 1024px = tablet
    desktop: 1025, // 1025px+ = desktop
} as const;

// Cell sizes for different device types
const CELL_SIZES = {
    mobile: {
        portrait: 14,
        landscape: 12,
    },
    tablet: {
        portrait: 22,
        landscape: 20,
    },
    desktop: {
        small: 24,    // < 1400px
        medium: 28,   // 1400px - 1800px
        large: 32,    // > 1800px
    },
} as const;

/**
 * Hook to detect device type and provide responsive sizing
 * Handles android/tablet/desktop detection based on user agent and viewport
 */
export function useDeviceType(): DeviceInfo {
    const [viewportWidth, setViewportWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1920
    );
    const [viewportHeight, setViewportHeight] = useState(
        typeof window !== 'undefined' ? window.innerHeight : 1080
    );

    useEffect(() => {
        const handleResize = () => {
            setViewportWidth(window.innerWidth);
            setViewportHeight(window.innerHeight);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    const deviceInfo = useMemo<DeviceInfo>(() => {
        // Detect device class from user agent
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isAndroid = /android/i.test(userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(userAgent);

        let deviceClass: DeviceClass;
        if (isAndroid) {
            deviceClass = 'android';
        } else if (isIOS) {
            deviceClass = 'ios';
        } else {
            deviceClass = 'desktop';
        }

        // Detect device type from viewport width
        let type: DeviceType;
        if (viewportWidth <= BREAKPOINTS.mobile) {
            type = 'mobile';
        } else if (viewportWidth <= BREAKPOINTS.tablet) {
            type = 'tablet';
        } else {
            type = 'desktop';
        }

        // Override type based on device class for touch devices
        // If it's a mobile user agent but on a larger screen, still treat as tablet/mobile
        if ((isAndroid || isIOS) && type === 'desktop') {
            type = 'tablet';
        }

        const isPortrait = viewportHeight > viewportWidth;
        const isLandscape = viewportWidth >= viewportHeight;

        // Calculate cell size based on device and orientation
        let cellSize: number;
        let boardScale: number = 1;

        switch (type) {
            case 'mobile':
                cellSize = isPortrait ? CELL_SIZES.mobile.portrait : CELL_SIZES.mobile.landscape;
                boardScale = isPortrait ? 0.85 : 0.7;
                break;
            case 'tablet':
                cellSize = isPortrait ? CELL_SIZES.tablet.portrait : CELL_SIZES.tablet.landscape;
                boardScale = isPortrait ? 0.95 : 0.85;
                break;
            case 'desktop':
            default:
                if (viewportWidth >= 1800) {
                    cellSize = CELL_SIZES.desktop.large;
                    boardScale = 1;
                } else if (viewportWidth >= 1400) {
                    cellSize = CELL_SIZES.desktop.medium;
                    boardScale = 1;
                } else {
                    cellSize = CELL_SIZES.desktop.small;
                    boardScale = 0.95;
                }
                break;
        }

        // Adjust for very small viewports
        const maxBoardHeight = viewportHeight * 0.6; // Board should not exceed 60% of viewport height
        const boardHeight = cellSize * 20; // 20 rows
        if (boardHeight > maxBoardHeight) {
            const scaleFactor = maxBoardHeight / boardHeight;
            cellSize = Math.floor(cellSize * scaleFactor);
            boardScale *= scaleFactor;
        }

        return {
            type,
            deviceClass,
            viewportWidth,
            viewportHeight,
            isPortrait,
            isLandscape,
            cellSize: Math.max(cellSize, 10), // Minimum 10px cell size
            boardScale,
        };
    }, [viewportWidth, viewportHeight]);

    return deviceInfo;
}

/**
 * Get CSS custom properties for responsive sizing
 */
export function getResponsiveCSSVars(deviceInfo: DeviceInfo): React.CSSProperties {
    const { cellSize, boardScale, type } = deviceInfo;

    return {
        '--cell-size': `${cellSize}px`,
        '--board-scale': boardScale,
        '--preview-cell-size': `${Math.max(cellSize * 0.7, 10)}px`,
        '--gap-size': type === 'mobile' ? '1px' : '1px',
        '--board-padding': type === 'mobile' ? '4px' : type === 'tablet' ? '6px' : '8px',
        '--controls-size': type === 'mobile' ? '48px' : type === 'tablet' ? '56px' : '0px',
    } as React.CSSProperties;
}
