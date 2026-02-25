/** Lighten a hex color toward white by the given amount (0-1). */
export function lightenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return '#' +
        Math.min(255, Math.round(r + (255 - r) * amount)).toString(16).padStart(2, '0') +
        Math.min(255, Math.round(g + (255 - g) * amount)).toString(16).padStart(2, '0') +
        Math.min(255, Math.round(b + (255 - b) * amount)).toString(16).padStart(2, '0');
}

/** Darken a hex color toward black by the given amount (0-1). */
export function darkenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return '#' +
        Math.max(0, Math.round(r * (1 - amount))).toString(16).padStart(2, '0') +
        Math.max(0, Math.round(g * (1 - amount))).toString(16).padStart(2, '0') +
        Math.max(0, Math.round(b * (1 - amount))).toString(16).padStart(2, '0');
}

/** Convert hex color to rgba string. */
export function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}
