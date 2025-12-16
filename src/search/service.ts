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
 */
export class SearchService {
  private cache: SearchCache;
  private client: KalshiClient;
  private populatePromise: Promise<void> | null = null;
  private isPopulating = false;

  constructor(client: KalshiClient) {
    this.cache = new SearchCache();
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
    if (this.isPopulating) return;
    this.isPopulating = true;

    try {
      const events = await this.client.fetchAllEvents();
      const eventTickers = events.map((e) => e.event_ticker);
      const markets = await this.client.fetchAllMarkets(eventTickers);

      this.cache.populate(events, markets);
    } finally {
      this.isPopulating = false;
    }
  }

  /**
   * Refreshes the cache with current data from Kalshi API.
   * Adds new items, updates existing, and prunes removed.
   */
  async refresh(): Promise<void> {
    const events = await this.client.fetchAllEvents();
    const eventTickers = events.map((e) => e.event_ticker);
    const markets = await this.client.fetchAllMarkets(eventTickers);

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
