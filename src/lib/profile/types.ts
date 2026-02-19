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
  src: string;
  filename: string;
}

/** Default fallback icon shown when a PNG file is missing or not yet loaded */
export const DEFAULT_ICON: ProfileIcon = {
  id: '_default',
  src: '',
  filename: '',
};

/**
 * Build the public path for a profile icon by its ID.
 * Returns the `/profile_image/<id>.png` path.
 */
export function getIconSrc(id: string): string {
  if (!id || id === '_default') return '';
  return `/profile_image/${id}.png`;
}
