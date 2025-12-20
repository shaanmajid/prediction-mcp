/**
 * Service that manages the Polymarket search cache lifecycle and provides search operations.
 */
import type {
  PolymarketClient,
  PolymarketEvent,
  PolymarketMarket,
} from "../clients/polymarket.js";
import {
  type PolymarketCombinedSearchResult,
  PolymarketSearchCache,
} from "./polymarket-cache.js";
import type { CacheStats, SearchResult } from "./scoring.js";

/**
 * Service that manages the Polymarket search cache lifecycle and provides search operations.
 *
 * Handles:
 * - Initial cache population from Polymarket Gamma API
 * - Merge-based cache refresh (full fetch, add/update/remove)
 * - Search operations delegated to the cache
 */
export class PolymarketSearchService {
  private cache: PolymarketSearchCache;
  private client: PolymarketClient;
  private populatePromise: Promise<void> | null = null;

  constructor(client: PolymarketClient) {
    this.cache = new PolymarketSearchCache();
    this.client = client;
  }

  /**
   * Ensures the cache is populated before performing operations.
   * Safe to call multiple times - will only populate once.
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
    // Single efficient call - events come with nested markets by default
    const { events, markets } = await this.client.fetchAllEventsWithMarkets();
    this.cache.populate(events, markets);
  }

  /**
   * Refreshes the cache with current data from Polymarket API.
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
    return this.cache.getStats();
  }
}
