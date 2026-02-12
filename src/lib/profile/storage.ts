import type { UserProfile } from './types';

const PROFILE_STORAGE_KEY = 'azuret_user_profile';

export function generateFriendCode(): string {
  const seg = () =>
    String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `SW-${seg()}-${seg()}-${seg()}`;
}

export function getStoredProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setStoredProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage may be full or disabled
  }
}

export function clearStoredProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
