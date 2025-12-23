import type { EventData, Market } from "kalshi-typescript";
import { KalshiClient } from "../clients/kalshi.js";
import { logger } from "../logger.js";
import {
  type CacheStats,
  type CombinedSearchResult,
  SearchCache,
  type SearchResult,
} from "./cache.js";
import {
  BackgroundRefreshGuard,
  calculateExpiresIn,
  DEFAULT_CACHE_TTL_SECONDS,
  isCacheExpired,
} from "./ttl.js";

export interface SearchServiceOptions {
  ttlSeconds?: number;
}

/**
 * Service that manages the Kalshi search cache lifecycle and provides search operations.
 *
 * Handles:
 * - Initial cache population from Kalshi API
 * - Merge-based cache refresh (full fetch, add/update/remove)
 * - TTL-based background refresh to keep data fresh
 * - Search operations delegated to the cache
 */
export class KalshiSearchService {
  private cache: SearchCache;
  private client: KalshiClient;
  private populatePromise: Promise<void> | null = null;
  private ttlSeconds: number;
  private refreshGuard = new BackgroundRefreshGuard();

  constructor(client: KalshiClient, options: SearchServiceOptions = {}) {
    this.cache = new SearchCache();
    this.client = client;
    this.ttlSeconds = options.ttlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  }

  /**
   * Ensures the cache is populated before performing operations.
   * Safe to call multiple times - will only populate once.
   * If the cache has exceeded its TTL, triggers a non-blocking background refresh.
   */
  async ensurePopulated(): Promise<void> {
    const stats = this.cache.getStats();

    // Cache is ready - check if TTL expired
    if (stats.status === "ready") {
      if (isCacheExpired(stats.cache_age_seconds, this.ttlSeconds)) {
        this.triggerBackgroundRefresh();
      }
      return;
    }

    // Cache is empty - do initial population
    if (this.populatePromise) {
      return this.populatePromise;
    }

    this.populatePromise = this.doPopulate();
    return this.populatePromise;
  }

  private triggerBackgroundRefresh(): void {
    const triggered = this.refreshGuard.trigger(async () => {
      try {
        await this.refresh();
      } catch {
        // Error already logged in refresh(), swallow to prevent unhandled rejection
      }
    });
    if (!triggered) {
      logger.debug("Kalshi background refresh already in progress, skipping");
    }
  }

  private async doPopulate(): Promise<void> {
    logger.info("Populating Kalshi search cache...");
    const startTime = Date.now();

    try {
      const { events, markets } = await this.client.fetchAllEventsWithMarkets();
      this.cache.populate(events, markets);

      const elapsedMs = Date.now() - startTime;
      logger.info(
        {
          events: events.length,
          markets: markets.length,
          elapsedMs,
          ttlSeconds: this.ttlSeconds,
        },
        "Kalshi search cache populated",
      );
    } catch (err) {
      logger.error({ err }, "Failed to populate Kalshi search cache");
      throw err;
    }
  }

  /**
   * Refreshes the cache with current data from Kalshi API.
   * Adds new items, updates existing, and prunes removed.
   */
  async refresh(): Promise<void> {
    logger.info("Refreshing Kalshi search cache...");
    const startTime = Date.now();

    try {
      const { events, markets } = await this.client.fetchAllEventsWithMarkets();
      this.cache.refresh(events, markets);

      const elapsedMs = Date.now() - startTime;
      logger.info(
        {
          events: events.length,
          markets: markets.length,
          elapsedMs,
        },
        "Kalshi search cache refreshed",
      );
    } catch (err) {
      logger.warn({ err }, "Kalshi background cache refresh failed");
      throw err;
    }
  }

  /**
   * Search for events matching the query.
   */
  async searchEvents(
    query: string,
    limit: number,
  ): Promise<SearchResult<EventData>[]> {
    await this.ensurePopulated();
    return this.cache.searchEvents(query, limit);
  }

  /**
   * Search for markets matching the query.
   */
  async searchMarkets(
    query: string,
    limit: number,
  ): Promise<SearchResult<Market>[]> {
    await this.ensurePopulated();
    return this.cache.searchMarkets(query, limit);
  }

  /**
   * Search for both events and markets matching the query.
   */
  async search(query: string, limit: number): Promise<CombinedSearchResult[]> {
    await this.ensurePopulated();
    return this.cache.search(query, limit);
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const cacheStats = this.cache.getStats();

    return {
      ...cacheStats,
      expires_in_seconds: calculateExpiresIn(
        cacheStats.cache_age_seconds,
        this.ttlSeconds,
      ),
    };
  }
}
