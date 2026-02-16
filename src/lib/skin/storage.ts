const SKIN_STORAGE_KEY = 'azuret_skin';

export function getStoredSkinId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SKIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredSkinId(skinId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SKIN_STORAGE_KEY, skinId);
  } catch {
    // localStorage may be full or disabled
  }
}
