/**
 * Creates a typed localStorage accessor pair for a given key.
 * Both functions gracefully handle SSR (server-side rendering) by
 * checking for `window` before accessing localStorage.
 */
export function createLocalStorageItem(key: string): {
  get: () => string | null;
  set: (value: string) => void;
} {
  function get(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function set(value: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // localStorage may be full or disabled
    }
  }

  return { get, set };
}
