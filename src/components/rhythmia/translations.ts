// Language translations for Rhythmia game
export type Language = 'en' | 'ja' | 'es' | 'fr';

export interface GameTranslations {
  title: string;
  subtitle: string;
  start: string;
  gameOver: string;
  playAgain: string;
  score: string;
  lines: string;
  level: string;
  combo: string;
  enemy: string;
  settings: string;
  selectLanguage: string;
  worlds: {
    melodia: string;
    harmonia: string;
    crescenda: string;
    fortissimo: string;
    silence: string;
  };
}

export const GAME_TRANSLATIONS: Record<Language, GameTranslations> = {
  en: {
    title: 'RHYTHMIA',
    subtitle: 'Ride the rhythm and stack blocks!',
    start: 'START',
    gameOver: 'GAME OVER',
    playAgain: 'Play Again',
    score: 'Score',
    lines: 'Lines',
    level: 'Level',
    combo: 'COMBO',
    enemy: 'Noise Ring',
    settings: '⚙️',
    selectLanguage: 'Select Language',
    worlds: {
      melodia: '🎀 Melodia',
      harmonia: '🌊 Harmonia',
      crescenda: '☀️ Crescenda',
      fortissimo: '🔥 Fortissimo',
      silence: '✨ Silence Moment',
    },
  },
  ja: {
    title: 'RHYTHMIA',
    subtitle: 'リズムに乗ってブロックを積め！',
    start: 'スタート',
    gameOver: 'ゲームオーバー',
    playAgain: 'もう一度',
    score: 'スコア',
    lines: 'ライン',
    level: 'レベル',
    combo: 'コンボ',
    enemy: 'ノイズリング',
    settings: '⚙️',
    selectLanguage: '言語を選択',
    worlds: {
      melodia: '🎀 メロディア',
      harmonia: '🌊 ハーモニア',
      crescenda: '☀️ クレシェンダ',
      fortissimo: '🔥 フォルティッシモ',
      silence: '✨ 静寂の間',
    },
  },
  es: {
    title: 'RHYTHMIA',
    subtitle: '¡Sigue el ritmo y apila bloques!',
    start: 'INICIAR',
    gameOver: 'JUEGO TERMINADO',
    playAgain: 'Jugar de Nuevo',
    score: 'Puntuación',
    lines: 'Líneas',
    level: 'Nivel',
    combo: 'COMBO',
    enemy: 'Anillo de Ruido',
    settings: '⚙️',
    selectLanguage: 'Seleccionar Idioma',
    worlds: {
      melodia: '🎀 Melodía',
      harmonia: '🌊 Armonía',
      crescenda: '☀️ Crescenda',
      fortissimo: '🔥 Fortissimo',
      silence: '✨ Momento de Silencio',
    },
  },
  fr: {
    title: 'RHYTHMIA',
    subtitle: 'Suivez le rythme et empilez les blocs!',
    start: 'DÉMARRER',
    gameOver: 'PARTIE TERMINÉE',
    playAgain: 'Rejouer',
    score: 'Score',
    lines: 'Lignes',
    level: 'Niveau',
    combo: 'COMBO',
    enemy: 'Anneau de Bruit',
    settings: '⚙️',
    selectLanguage: 'Choisir la Langue',
    worlds: {
      melodia: '🎀 Mélodia',
      harmonia: '🌊 Harmonia',
      crescenda: '☀️ Crescenda',
      fortissimo: '🔥 Fortissimo',
      silence: '✨ Moment de Silence',
    },
  },
};

// Helper function to get language from localStorage or default to English
export const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('rhythmia-language');
  if (stored && ['en', 'ja', 'es', 'fr'].includes(stored)) {
    return stored as Language;
  }
  return 'en';
};

// Helper function to store language in localStorage
export const storeLanguage = (lang: Language): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rhythmia-language', lang);
  }
};
