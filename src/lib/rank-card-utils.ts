// Utility functions for rank card operations

/**
 * Normalize display name for consistent lookups
 * Uses NFKC normalization and converts to lowercase
 */
export function normalizeDisplayName(displayName: string): string {
  return displayName.trim().normalize('NFKC').toLowerCase();
}

/**
 * Generate stable card ID from guild and display name
 * Uses SHA-256 hash for consistent IDs
 * Works in both browser and Node.js environments
 */
export async function generateCardId(
  guildId: string,
  displayNameKey: string
): Promise<string> {
  const input = `${guildId}:${displayNameKey}`;
  
  // Use Web Crypto API (available in both browser and modern Node.js)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for older environments
  throw new Error('Web Crypto API not available');
}

/**
 * Synchronous version using a simple hash for client-side use
 * Not cryptographically secure, but sufficient for card IDs
 */
export function generateCardIdSync(
  guildId: string,
  displayNameKey: string
): string {
  const input = `${guildId}:${displayNameKey}`;
  let hash = 0;
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to hex and pad to simulate SHA-256 length
  const baseHash = Math.abs(hash).toString(16).padStart(8, '0');
  // Repeat to get a longer hash-like string
  return baseHash.repeat(8).substring(0, 64);
}
