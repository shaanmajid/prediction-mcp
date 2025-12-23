/**
 * Service that manages the Polymarket search cache lifecycle and provides search operations.
 */
import type {
  PolymarketClient,
  PolymarketEvent,
  PolymarketMarket,
} from "../clients/polymarket.js";
import { logger } from "../logger.js";
import {
  type PolymarketCombinedSearchResult,
  PolymarketSearchCache,
} from "./polymarket-cache.js";
import type { CacheStats, SearchResult } from "./scoring.js";
import {
  BackgroundRefreshGuard,
  calculateExpiresIn,
  DEFAULT_CACHE_TTL_SECONDS,
  isCacheExpired,
} from "./ttl.js";

export interface PolymarketSearchServiceOptions {
  ttlSeconds?: number;
}

/**
 * Service that manages the Polymarket search cache lifecycle and provides search operations.
 *
 * Handles:
 * - Initial cache population from Polymarket Gamma API
 * - Merge-based cache refresh (full fetch, add/update/remove)
 * - TTL-based background refresh to keep data fresh
 * - Search operations delegated to the cache
 */
export class PolymarketSearchService {
  private cache: PolymarketSearchCache;
  private client: PolymarketClient;
  private populatePromise: Promise<void> | null = null;
  private ttlSeconds: number;
  private refreshGuard = new BackgroundRefreshGuard();

  constructor(
    client: PolymarketClient,
    options: PolymarketSearchServiceOptions = {},
  ) {
    this.cache = new PolymarketSearchCache();
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
      logger.debug(
        "Polymarket background refresh already in progress, skipping",
      );
    }
  }

  private async doPopulate(): Promise<void> {
    logger.info("Populating Polymarket search cache...");
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
        "Polymarket search cache populated",
      );
    } catch (err) {
      logger.error({ err }, "Failed to populate Polymarket search cache");
      throw err;
    }
  }

  /**
   * Refreshes the cache with current data from Polymarket API.
   * Adds new items, updates existing, and prunes removed.
   */
  async refresh(): Promise<void> {
    logger.info("Refreshing Polymarket search cache...");
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
        "Polymarket search cache refreshed",
      );
    } catch (err) {
      logger.warn({ err }, "Polymarket background cache refresh failed");
      throw err;
    }
  }

  /**
   * Search for events matching the query.
   */
  async searchEvents(
    query: string,
    limit: number,
  ): Promise<SearchResult<PolymarketEvent>[]> {
    await this.ensurePopulated();
    return this.cache.searchEvents(query, limit);
  }

  /**
   * Search for markets matching the query.
   */
  async searchMarkets(
    query: string,
    limit: number,
  ): Promise<SearchResult<PolymarketMarket>[]> {
    await this.ensurePopulated();
    return this.cache.searchMarkets(query, limit);
  }

  /**
   * Search for both events and markets matching the query.
   */
  async search(
    query: string,
    limit: number,
  ): Promise<PolymarketCombinedSearchResult[]> {
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
