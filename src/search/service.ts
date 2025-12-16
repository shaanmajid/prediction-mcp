import type { EventData, Market } from "kalshi-typescript";
import { KalshiClient } from "../clients/kalshi.js";
import {
  SearchCache,
  type SearchResult,
  type CombinedSearchResult,
  type CacheStats,
} from "./cache.js";

/**
 * Service that manages the search cache lifecycle and provides search operations.
 *
 * Handles:
 * - Initial cache population from Kalshi API
 * - Incremental cache refresh
 * - Search operations delegated to the cache
 *
 * @note Future: Support for Polymarket search would likely be implemented as a separate
 * PolymarketSearchService, following the same pattern as this class but using the
 * PolymarketClient. This allows maintaining platform-specific optimizations while
 * keeping the interface consistent.
 */
export class SearchService {
  private cache: SearchCache;
  private client: KalshiClient;
  private populatePromise: Promise<void> | null = null;

  constructor(client: KalshiClient) {
    this.cache = new SearchCache();
    this.client = client;
  }

  /**
   * Ensures the cache is populated before performing operations.
   * Safe to call multiple times - will only populate once.
   *
   * @note Future: Consider adding cache TTL (time-to-live) for long-running servers.
   * Currently, the cache persists indefinitely. A time-based expiry would help keep
   * data fresh without requiring manual refresh() calls. Target: ~1 hour TTL with
   * background refresh during idle time.
   */
  async ensurePopulated(): Promise<void> {
    if (this.cache.getStats().status === "ready") {
      return;
    }

    if (this.populatePromise) {
      return this.populatePromise;
    }

    this.populatePromise = this.doPopulate();
    return this.populatePromise;
  }

  private async doPopulate(): Promise<void> {
    // Use single paginated call with nested markets for efficiency
    // This fetches ~3400 events + ~25000 markets in ~17 API calls instead of 3400+
    const { events, markets } = await this.client.fetchAllEventsWithMarkets();

    this.cache.populate(events, markets);
  }

  /**
   * Refreshes the cache with current data from Kalshi API.
   * Adds new items, updates existing, and prunes removed.
   */
  async refresh(): Promise<void> {
    const { events, markets } = await this.client.fetchAllEventsWithMarkets();
    this.cache.refresh(events, markets);
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
    return this.cache.getStats();
  }
}
