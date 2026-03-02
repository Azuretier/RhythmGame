/**
 * Simple in-memory rate limiter using a Map with automatic TTL cleanup.
 * Suitable for single-instance deployments (Vercel serverless + Railway WebSocket).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private options: RateLimiterOptions) {
    // Clean up expired entries every 60 seconds
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Check if a key (e.g. IP address) is within the rate limit.
   * Returns { allowed: true } if under limit, or { allowed: false, retryAfterMs } if over.
   */
  check(key: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now >= entry.resetAt) {
      this.entries.set(key, { count: 1, resetAt: now + this.options.windowMs });
      return { allowed: true };
    }

    if (entry.count < this.options.maxRequests) {
      entry.count++;
      return { allowed: true };
    }

    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now >= entry.resetAt) {
        this.entries.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.entries.clear();
  }
}

/**
 * Extract client IP from a Next.js request.
 * Checks x-forwarded-for (standard for reverse proxies/Vercel) then falls back to x-real-ip.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
