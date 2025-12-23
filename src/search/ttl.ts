/**
 * TTL (Time-To-Live) utilities for cache expiry.
 *
 * Pure functions for TTL calculations, plus a stateful guard for
 * deduplicating background refresh operations.
 */

// ============================================================
// Pure Functions
// ============================================================

/**
 * Check if a cache has exceeded its TTL.
 *
 * @param cacheAgeSeconds - How old the cache is (null if never populated)
 * @param ttlSeconds - The TTL threshold (0 or negative disables TTL)
 * @returns true if cache is expired and should be refreshed
 */
export function isCacheExpired(
  cacheAgeSeconds: number | null,
  ttlSeconds: number,
): boolean {
  if (ttlSeconds <= 0) return false;
  if (cacheAgeSeconds === null) return false;
  return cacheAgeSeconds >= ttlSeconds;
}

/**
 * Calculate seconds until cache expires.
 *
 * @param cacheAgeSeconds - How old the cache is (null if never populated)
 * @param ttlSeconds - The TTL threshold (0 or negative disables TTL)
 * @returns Seconds until expiry, or null if TTL disabled or cache empty
 */
export function calculateExpiresIn(
  cacheAgeSeconds: number | null,
  ttlSeconds: number,
): number | null {
  if (ttlSeconds <= 0 || cacheAgeSeconds === null) {
    return null;
  }
  return Math.max(0, ttlSeconds - cacheAgeSeconds);
}

// ============================================================
// Stateful Guard
// ============================================================

/**
 * Guards against concurrent background refresh operations.
 *
 * Ensures only one refresh runs at a time. Does not handle logging
 * or error reporting—that's the caller's responsibility.
 */
export class BackgroundRefreshGuard {
  private pending: Promise<void> | null = null;

  /**
   * Trigger a background refresh if one isn't already running.
   *
   * @param fn - Async function that performs the refresh
   * @returns true if refresh was triggered, false if one was already in progress
   */
  trigger(fn: () => Promise<void>): boolean {
    if (this.pending) return false;

    this.pending = fn().finally(() => {
      this.pending = null;
    });

    return true;
  }

  /**
   * Check if a refresh is currently in progress.
   */
  isRefreshing(): boolean {
    return this.pending !== null;
  }
}
