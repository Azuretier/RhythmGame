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
  isPremium?: boolean;
  priceInCrystals?: number;
  description?: string;
  descriptionJa?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
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

export const PREMIUM_SKIN_PRESETS: Skin[] = [
  {
    id: 'neon',
    name: 'Neon',
    nameJa: 'ネオン',
    isPremium: true,
    priceInCrystals: 300,
    rarity: 'rare',
    description: 'Vibrant neon glow',
    descriptionJa: '鮮やかなネオンの輝き',
    colors: {
      accent: '#39FF14',
      accentLight: '#66FF44',
      accentDim: 'rgba(57, 255, 20, 0.15)',
      background: '#000A02',
      surface: 'rgba(57, 255, 20, 0.03)',
      foreground: '#f0fff0',
      subtext: 'rgba(240, 255, 240, 0.45)',
      border: 'rgba(57, 255, 20, 0.08)',
      borderHover: 'rgba(57, 255, 20, 0.18)',
    },
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    nameJa: '桜花爛漫',
    isPremium: true,
    priceInCrystals: 600,
    rarity: 'epic',
    description: 'Elegant cherry blossom petals',
    descriptionJa: '優雅な桜の花びら',
    colors: {
      accent: '#FFB7C5',
      accentLight: '#FFC8D5',
      accentDim: 'rgba(255, 183, 197, 0.15)',
      background: '#0A0005',
      surface: 'rgba(255, 183, 197, 0.03)',
      foreground: '#fff5f7',
      subtext: 'rgba(255, 245, 247, 0.45)',
      border: 'rgba(255, 183, 197, 0.08)',
      borderHover: 'rgba(255, 183, 197, 0.18)',
    },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    nameJa: 'ギャラクシー',
    isPremium: true,
    priceInCrystals: 1200,
    rarity: 'legendary',
    description: 'Deep space nebula vibes',
    descriptionJa: '深宇宙の星雲',
    colors: {
      accent: '#8B5CF6',
      accentLight: '#A78BFA',
      accentDim: 'rgba(139, 92, 246, 0.15)',
      background: '#05001A',
      surface: 'rgba(139, 92, 246, 0.03)',
      foreground: '#F5F0FF',
      subtext: 'rgba(245, 240, 255, 0.45)',
      border: 'rgba(139, 92, 246, 0.08)',
      borderHover: 'rgba(139, 92, 246, 0.18)',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    nameJa: 'オブシディアン',
    isPremium: true,
    priceInCrystals: 600,
    rarity: 'epic',
    description: 'Dark volcanic glass',
    descriptionJa: '漆黒の火山ガラス',
    colors: {
      accent: '#4A4A4A',
      accentLight: '#6A6A6A',
      accentDim: 'rgba(74, 74, 74, 0.15)',
      background: '#030303',
      surface: 'rgba(100, 100, 100, 0.03)',
      foreground: '#E8E8E8',
      subtext: 'rgba(232, 232, 232, 0.45)',
      border: 'rgba(100, 100, 100, 0.08)',
      borderHover: 'rgba(100, 100, 100, 0.18)',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    nameJa: 'オーロラ',
    isPremium: true,
    priceInCrystals: 900,
    rarity: 'epic',
    description: 'Northern lights shimmer',
    descriptionJa: 'オーロラの輝き',
    colors: {
      accent: '#00FFB3',
      accentLight: '#33FFC4',
      accentDim: 'rgba(0, 255, 179, 0.15)',
      background: '#000A08',
      surface: 'rgba(0, 255, 179, 0.03)',
      foreground: '#F0FFFA',
      subtext: 'rgba(240, 255, 250, 0.45)',
      border: 'rgba(0, 255, 179, 0.08)',
      borderHover: 'rgba(0, 255, 179, 0.18)',
    },
  },
  {
    id: 'void',
    name: 'Void',
    nameJa: 'ヴォイド',
    isPremium: true,
    priceInCrystals: 1200,
    rarity: 'legendary',
    description: 'Emptiness beyond the stars',
    descriptionJa: '星の彼方の虚無',
    colors: {
      accent: '#1A0033',
      accentLight: '#330066',
      accentDim: 'rgba(26, 0, 51, 0.25)',
      background: '#010001',
      surface: 'rgba(50, 0, 100, 0.05)',
      foreground: '#C8B0E8',
      subtext: 'rgba(200, 176, 232, 0.45)',
      border: 'rgba(50, 0, 100, 0.12)',
      borderHover: 'rgba(50, 0, 100, 0.25)',
    },
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    nameJa: 'フェニックス',
    isPremium: true,
    priceInCrystals: 900,
    rarity: 'epic',
    description: 'Reborn in flames',
    descriptionJa: '炎の中から蘇る',
    colors: {
      accent: '#FF4500',
      accentLight: '#FF6A33',
      accentDim: 'rgba(255, 69, 0, 0.15)',
      background: '#0A0200',
      surface: 'rgba(255, 100, 50, 0.03)',
      foreground: '#FFF5F0',
      subtext: 'rgba(255, 245, 240, 0.45)',
      border: 'rgba(255, 100, 50, 0.08)',
      borderHover: 'rgba(255, 100, 50, 0.18)',
    },
  },
  {
    id: 'frost',
    name: 'Frost',
    nameJa: 'フロスト',
    isPremium: true,
    priceInCrystals: 300,
    rarity: 'rare',
    description: 'Frozen crystal ice',
    descriptionJa: '凍りついた水晶の氷',
    colors: {
      accent: '#A5F3FC',
      accentLight: '#BFFDFF',
      accentDim: 'rgba(165, 243, 252, 0.15)',
      background: '#000508',
      surface: 'rgba(165, 243, 252, 0.03)',
      foreground: '#F0FCFF',
      subtext: 'rgba(240, 252, 255, 0.45)',
      border: 'rgba(165, 243, 252, 0.08)',
      borderHover: 'rgba(165, 243, 252, 0.18)',
    },
  },
  {
    id: 'midnight-rose',
    name: 'Midnight Rose',
    nameJa: '真夜中の薔薇',
    isPremium: true,
    priceInCrystals: 600,
    rarity: 'epic',
    description: 'Dark elegance blooms at night',
    descriptionJa: '夜に咲く暗い優雅さ',
    colors: {
      accent: '#B91C6C',
      accentLight: '#DB2777',
      accentDim: 'rgba(185, 28, 108, 0.15)',
      background: '#080004',
      surface: 'rgba(185, 28, 108, 0.03)',
      foreground: '#FFF0F7',
      subtext: 'rgba(255, 240, 247, 0.45)',
      border: 'rgba(185, 28, 108, 0.08)',
      borderHover: 'rgba(185, 28, 108, 0.18)',
    },
  },
  {
    id: 'electric-storm',
    name: 'Electric Storm',
    nameJa: 'エレクトリックストーム',
    isPremium: true,
    priceInCrystals: 300,
    rarity: 'rare',
    description: 'Crackling with energy',
    descriptionJa: 'エネルギーが弾ける',
    colors: {
      accent: '#FACC15',
      accentLight: '#FDE047',
      accentDim: 'rgba(250, 204, 21, 0.15)',
      background: '#0A0800',
      surface: 'rgba(250, 204, 21, 0.03)',
      foreground: '#FFFFF0',
      subtext: 'rgba(255, 255, 240, 0.45)',
      border: 'rgba(250, 204, 21, 0.08)',
      borderHover: 'rgba(250, 204, 21, 0.18)',
    },
  },
];

export const ALL_SKINS: Skin[] = [...SKIN_PRESETS, ...PREMIUM_SKIN_PRESETS];

export function getSkinById(id: string): Skin | undefined {
  return ALL_SKINS.find(skin => skin.id === id);
}

export const DEFAULT_SKIN_ID = 'azure';
