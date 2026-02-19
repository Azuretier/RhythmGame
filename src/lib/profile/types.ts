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
 * Build the public path for a profile icon.
 * Accepts either a filename with extension (e.g., "image.jpg") or an ID.
 * If the input contains an extension, returns `/profile_image/<filename>`.
 * Otherwise, returns `/profile_image/<id>.png` for backward compatibility.
 */
export function getIconSrc(idOrFilename: string): string {
  if (!idOrFilename || idOrFilename === '_default') return '';
  
  // If the input has an image extension, use it as-is
  if (/\.(png|jpe?g|gif|jfif)$/i.test(idOrFilename)) {
    return `/profile_image/${idOrFilename}`;
  }
  
  // Otherwise, assume it's an ID and append .png for backward compatibility
  return `/profile_image/${idOrFilename}.png`;
}
