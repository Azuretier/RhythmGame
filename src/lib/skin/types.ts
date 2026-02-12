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

export interface Skin {
  id: string;
  name: string;
  nameJa: string;
  colors: SkinColors;
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
];

export function getSkinById(id: string): Skin | undefined {
  return SKIN_PRESETS.find(skin => skin.id === id);
}

export const DEFAULT_SKIN_ID = 'azure';
