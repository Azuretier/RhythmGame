export interface UiTheme {
  id: string;
  name: string;
  nameJa: string;
  /** CSS class applied to <html> element */
  cssClass: string;
  /** Short description */
  description: string;
  descriptionJa: string;
}

export const UI_THEME_PRESETS: UiTheme[] = [
  {
    id: 'neo-futuristic',
    name: 'Neo-Futuristic',
    nameJa: 'ネオフューチャリスティック',
    cssClass: 'theme-neo-futuristic',
    description: 'Sleek, clean, and advanced aesthetic with frosted glass effects',
    descriptionJa: 'フロストガラスエフェクトを備えた洗練されたモダンなデザイン',
  },
  {
    id: 'pixel-nostalgia',
    name: 'Pixel Nostalgia',
    nameJa: 'ピクセルノスタルジア',
    cssClass: 'theme-pixel-nostalgia',
    description: 'Retro 8-bit/16-bit pixel art game aesthetic with CRT effects',
    descriptionJa: 'CRTエフェクトを備えたレトロ8ビット/16ビットピクセルアートスタイル',
  },
];

export const DEFAULT_UI_THEME_ID = 'neo-futuristic';

export function getUiThemeById(id: string): UiTheme | undefined {
  return UI_THEME_PRESETS.find(theme => theme.id === id);
}
