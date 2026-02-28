export interface SkinColors {
  /** Primary accent color (e.g. #007FFF) */
  accent: string;
  /** Lighter variant of accent for hover states */
  accentLight: string;
  /** Dimmed accent for subtle highlights */
  accentDim: string;
  /** Page background */
  background: string;
  /** Slightly elevated surface (cards, panels) */
  surface: string;
  /** Primary text color */
  foreground: string;
  /** Secondary/muted text */
  subtext: string;
  /** Border color for cards and dividers */
  border: string;
  /** Hover border color */
  borderHover: string;
}

/** CSS custom property overrides applied beyond colors (e.g. fonts, borders, shadows) */
export type SkinStyleOverrides = Record<string, string>;

export interface Skin {
  id: string;
  name: string;
  nameJa: string;
  colors: SkinColors;
  /** CSS custom property overrides for structural styling (fonts, borders, shadows, etc.) */
  styleOverrides?: SkinStyleOverrides;
  /** CSS class added to <html> for qualified selector overrides */
  cssClass?: string;
}

export const SKIN_PRESETS: Skin[] = [
  {
    id: 'azure',
    name: 'Azure',
    nameJa: 'アズール',
    colors: {
      accent: '#007FFF',
      accentLight: '#3399FF',
      accentDim: 'rgba(0, 127, 255, 0.15)',
      background: '#000000',
      surface: 'rgba(255, 255, 255, 0.03)',
      foreground: '#ffffff',
      subtext: 'rgba(255, 255, 255, 0.45)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderHover: 'rgba(255, 255, 255, 0.18)',
    },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    nameJa: '桜',
    colors: {
      accent: '#FF6B9D',
      accentLight: '#FF8BB5',
      accentDim: 'rgba(255, 107, 157, 0.15)',
      background: '#0A0008',
      surface: 'rgba(255, 200, 220, 0.03)',
      foreground: '#fff0f5',
      subtext: 'rgba(255, 240, 245, 0.45)',
      border: 'rgba(255, 200, 220, 0.08)',
      borderHover: 'rgba(255, 200, 220, 0.18)',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    nameJa: 'エメラルド',
    colors: {
      accent: '#00C896',
      accentLight: '#33D4AA',
      accentDim: 'rgba(0, 200, 150, 0.15)',
      background: '#000A06',
      surface: 'rgba(200, 255, 230, 0.03)',
      foreground: '#f0fff8',
      subtext: 'rgba(240, 255, 248, 0.45)',
      border: 'rgba(200, 255, 230, 0.08)',
      borderHover: 'rgba(200, 255, 230, 0.18)',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    nameJa: 'サンセット',
    colors: {
      accent: '#FF8C00',
      accentLight: '#FFA033',
      accentDim: 'rgba(255, 140, 0, 0.15)',
      background: '#0A0500',
      surface: 'rgba(255, 220, 180, 0.03)',
      foreground: '#fff5eb',
      subtext: 'rgba(255, 245, 235, 0.45)',
      border: 'rgba(255, 220, 180, 0.08)',
      borderHover: 'rgba(255, 220, 180, 0.18)',
    },
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    nameJa: 'アメジスト',
    colors: {
      accent: '#9C5FFF',
      accentLight: '#B07FFF',
      accentDim: 'rgba(156, 95, 255, 0.15)',
      background: '#06000A',
      surface: 'rgba(220, 200, 255, 0.03)',
      foreground: '#f5f0ff',
      subtext: 'rgba(245, 240, 255, 0.45)',
      border: 'rgba(220, 200, 255, 0.08)',
      borderHover: 'rgba(220, 200, 255, 0.18)',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    nameJa: 'クリムゾン',
    colors: {
      accent: '#FF3B5C',
      accentLight: '#FF5C78',
      accentDim: 'rgba(255, 59, 92, 0.15)',
      background: '#0A0002',
      surface: 'rgba(255, 200, 200, 0.03)',
      foreground: '#fff0f0',
      subtext: 'rgba(255, 240, 240, 0.45)',
      border: 'rgba(255, 200, 200, 0.08)',
      borderHover: 'rgba(255, 200, 200, 0.18)',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    nameJa: 'アークティック',
    colors: {
      accent: '#00D4FF',
      accentLight: '#33DDFF',
      accentDim: 'rgba(0, 212, 255, 0.15)',
      background: '#000508',
      surface: 'rgba(200, 240, 255, 0.03)',
      foreground: '#f0faff',
      subtext: 'rgba(240, 250, 255, 0.45)',
      border: 'rgba(200, 240, 255, 0.08)',
      borderHover: 'rgba(200, 240, 255, 0.18)',
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    nameJa: 'ゴールド',
    colors: {
      accent: '#FFD700',
      accentLight: '#FFDF33',
      accentDim: 'rgba(255, 215, 0, 0.15)',
      background: '#0A0800',
      surface: 'rgba(255, 240, 200, 0.03)',
      foreground: '#fffbf0',
      subtext: 'rgba(255, 251, 240, 0.45)',
      border: 'rgba(255, 240, 200, 0.08)',
      borderHover: 'rgba(255, 240, 200, 0.18)',
    },
  },
  {
    id: 'pixel',
    name: 'Pixel',
    nameJa: 'ピクセル',
    cssClass: 'skin-pixel',
    styleOverrides: {
      '--theme-font-heading': "'Press Start 2P', 'Silkscreen', monospace",
      '--theme-font-body': "'VT323', 'Pixelify Sans', monospace",
      '--theme-font-mono': "'VT323', 'Press Start 2P', monospace",
      '--theme-radius': '0px',
      '--theme-radius-sm': '0px',
      '--theme-radius-lg': '0px',
      '--theme-border-width': '3px',
      '--theme-transition': '0s',
      '--theme-shadow': '4px 4px 0px rgba(0, 0, 0, 0.8)',
      '--theme-shadow-hover': '6px 6px 0px rgba(0, 0, 0, 0.8)',
      '--theme-glass-bg': 'rgba(0, 0, 0, 0.9)',
      '--theme-glass-blur': '0px',
      '--theme-btn-transform-active': 'translateY(3px)',
      '--theme-scanline-opacity': '1',
      '--theme-pixel-rendering': 'pixelated',
    },
    colors: {
      accent: '#4a9d9e',
      accentLight: '#5fb8b9',
      accentDim: 'rgba(74, 157, 158, 0.15)',
      background: '#1a1410',
      surface: 'rgba(45, 35, 25, 0.6)',
      foreground: '#fef3c7',
      subtext: 'rgba(254, 243, 199, 0.5)',
      border: 'rgba(244, 162, 97, 0.15)',
      borderHover: 'rgba(244, 162, 97, 0.3)',
    },
  },
];

export function getSkinById(id: string): Skin | undefined {
  return SKIN_PRESETS.find(skin => skin.id === id);
}

export const DEFAULT_SKIN_ID = 'azure';
