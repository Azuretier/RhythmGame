export interface UserProfile {
  name: string;
  icon: string;
  friendCode: string;
  locale: 'ja' | 'en';
  isPrivate: boolean;
  createdAt: number;
}

export interface ProfileIcon {
  id: string;
  color: string;
  bgColor: string;
  emoji: string;
}

// Nintendo Switch-inspired profile icon set
export const PROFILE_ICONS: ProfileIcon[] = [
  { id: 'icon_mario', color: '#ffffff', bgColor: '#e60012', emoji: 'M' },
  { id: 'icon_link', color: '#ffffff', bgColor: '#00a651', emoji: 'L' },
  { id: 'icon_kirby', color: '#ffffff', bgColor: '#ff69b4', emoji: 'K' },
  { id: 'icon_pikachu', color: '#333333', bgColor: '#ffd700', emoji: 'P' },
  { id: 'icon_splatoon', color: '#ffffff', bgColor: '#ff5722', emoji: 'S' },
  { id: 'icon_animal', color: '#ffffff', bgColor: '#6ec6ff', emoji: 'A' },
  { id: 'icon_star', color: '#ffffff', bgColor: '#9c27b0', emoji: '*' },
  { id: 'icon_heart', color: '#ffffff', bgColor: '#e91e63', emoji: 'H' },
  { id: 'icon_rhythm', color: '#ffffff', bgColor: '#007fff', emoji: 'R' },
  { id: 'icon_fire', color: '#ffffff', bgColor: '#ff6d00', emoji: 'F' },
  { id: 'icon_moon', color: '#333333', bgColor: '#c0c0c0', emoji: 'N' },
  { id: 'icon_bolt', color: '#ffffff', bgColor: '#7b1fa2', emoji: 'B' },
];

export function getIconById(id: string): ProfileIcon | undefined {
  return PROFILE_ICONS.find(icon => icon.id === id);
}
