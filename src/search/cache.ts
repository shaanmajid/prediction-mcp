import type { EventData, Market } from "kalshi-typescript";
import {
  type CacheInternalStats,
  type SearchResult,
  scoreItem,
  tokenize,
} from "./scoring.js";

// Re-export types for external use
export type {
  CacheInternalStats,
  CacheStats,
  SearchResult,
} from "./scoring.js";

/**
 * Combined search result that can contain either an event or a market.
 * Kalshi-specific: uses EventData and Market types from kalshi-typescript.
 */
export interface CombinedSearchResult {
  type: "event" | "market";
  score: number;
  item: EventData | Market;
}

/**
 * Field weights for event search scoring.
 */
const EVENT_FIELD_WEIGHTS = new Map<string, number>([
  ["title", 1.0],
  ["sub_title", 0.8],
  ["event_ticker", 0.6],
  ["series_ticker", 0.4],
]);

/**
 * Field weights for market search scoring.
 */
const MARKET_FIELD_WEIGHTS = new Map<string, number>([
  ["title", 1.0],
  ["yes_sub_title", 1.0],
  ["no_sub_title", 0.8],
  ["subtitle", 0.6],
  ["ticker", 0.5],
  ["event_ticker", 0.3],
]);

/**
 * Scores an event against search tokens using weighted field matching.
 */
function scoreEvent(tokens: string[], event: EventData): number {
  let totalScore = 0;

  const fields = {
    title: event.title || "",
    sub_title: event.sub_title || "",
    event_ticker: event.event_ticker || "",
    series_ticker: event.series_ticker || "",
  };

  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    if (fieldValue) {
      const weight = EVENT_FIELD_WEIGHTS.get(fieldName) || 0;
      const fieldScore = scoreItem(tokens, fieldValue);
      totalScore += fieldScore * weight;
    }
  }

  return totalScore;
}

/**
 * Scores a market against search tokens using weighted field matching.
 */
function scoreMarket(tokens: string[], market: Market): number {
  let totalScore = 0;

  const fields = {
    title: market.title || "",
    yes_sub_title: market.yes_sub_title || "",
    no_sub_title: market.no_sub_title || "",
    subtitle: market.subtitle || "",
    ticker: market.ticker || "",
    event_ticker: market.event_ticker || "",
  };

  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    if (fieldValue) {
      const weight = MARKET_FIELD_WEIGHTS.get(fieldName) || 0;
      const fieldScore = scoreItem(tokens, fieldValue);
      totalScore += fieldScore * weight;
    }
  }

  return totalScore;
}

/**
 * In-memory search cache with tokenized scoring for Kalshi events and markets.
 *
 * Supports:
 * - Fast in-memory search with relevance scoring
 * - Incremental refresh that adds/updates/removes items
 * - Separate search for events, markets, or combined results
 *
 * @note Future: The cache has no expiry currently. For long-running servers, consider:
 * 1. Adding lastRefreshTime checks to warn if data is stale (>1 hour)
 * 2. Implementing optional TTL with automatic background refresh
 * 3. Exposing refresh() through MCP tools for manual cache invalidation
 * The current implementation is suitable for per-request or per-session usage patterns.
 */
export class SearchCache {
  private events: Map<string, EventData>;
  private markets: Map<string, Market>;
  private lastRefresh: Date | null;
  private refreshDurationMs: number;

  constructor() {
    this.events = new Map();
    this.markets = new Map();
    this.lastRefresh = null;
    this.refreshDurationMs = 0;
  }

  /**
   * Initializes the cache with events and markets.
   * Clears any existing data.
   */
  populate(events: EventData[], markets: Market[]): void {
    const startTime = Date.now();

    this.events.clear();
    this.markets.clear();

    for (const event of events) {
      if (event.event_ticker) {
        this.events.set(event.event_ticker, event);
      }
    }

    for (const market of markets) {
      if (market.ticker) {
        this.markets.set(market.ticker, market);
      }
    }

    this.refreshDurationMs = Date.now() - startTime;
    this.lastRefresh = new Date();
  }

  /**
   * Refreshes cache with new data via merge-based update strategy:
   * - Full fetch from API (not incremental delta)
   * - Merges new data: adds (new tickers), updates (existing with changed fields), removes (deleted tickers)
   * - This approach simplifies consistency vs. tracking deltas on API side
   */
  refresh(events: EventData[], markets: Market[]): void {
    const startTime = Date.now();

    const newEventTickers = new Set<string>();
    const newMarketTickers = new Set<string>();

    // Add or update events
    for (const event of events) {
      if (event.event_ticker) {
        newEventTickers.add(event.event_ticker);
        this.events.set(event.event_ticker, event);
      }
    }

    // Add or update markets
    for (const market of markets) {
      if (market.ticker) {
        newMarketTickers.add(market.ticker);
        this.markets.set(market.ticker, market);
      }
    }

    // Remove events that are no longer present
    const eventTickersToRemove = [...this.events.keys()].filter(
      (ticker) => !newEventTickers.has(ticker),
    );
    for (const ticker of eventTickersToRemove) {
      this.events.delete(ticker);
    }

    // Remove markets that are no longer present
    const marketTickersToRemove = [...this.markets.keys()].filter(
      (ticker) => !newMarketTickers.has(ticker),
    );
    for (const ticker of marketTickersToRemove) {
      this.markets.delete(ticker);
    }

    this.refreshDurationMs = Date.now() - startTime;
    this.lastRefresh = new Date();
  }

  /**
   * Searches events by query string, returning scored results.
   */
  searchEvents(query: string, limit: number): SearchResult<EventData>[] {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
      return [];
    }

    const results: SearchResult<EventData>[] = [];

    for (const event of this.events.values()) {
      const score = scoreEvent(tokens, event);
      if (score > 0) {
        results.push({ score, item: event });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Searches markets by query string, returning scored results.
   */
  searchMarkets(query: string, limit: number): SearchResult<Market>[] {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
      return [];
    }

    const results: SearchResult<Market>[] = [];

    for (const market of this.markets.values()) {
      const score = scoreMarket(tokens, market);
      if (score > 0) {
        results.push({ score, item: market });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Searches both events and markets, returning combined scored results.
   */
  search(query: string, limit: number): CombinedSearchResult[] {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
      return [];
    }

    const results: CombinedSearchResult[] = [];

    // Score events
    for (const event of this.events.values()) {
      const score = scoreEvent(tokens, event);
      if (score > 0) {
        results.push({ type: "event", score, item: event });
      }
    }

    // Score markets
    for (const market of this.markets.values()) {
      const score = scoreMarket(tokens, market);
      if (score > 0) {
        results.push({ type: "market", score, item: market });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Returns statistics about the current cache state.
   */
  getStats(): CacheInternalStats {
    const isEmpty = this.events.size === 0 && this.markets.size === 0;

    let cacheAgeSeconds: number | null = null;
    if (this.lastRefresh) {
      cacheAgeSeconds = (Date.now() - this.lastRefresh.getTime()) / 1000;
    }

    return {
      status: isEmpty ? "empty" : "ready",
      events_count: this.events.size,
      markets_count: this.markets.size,
      last_refresh: this.lastRefresh ? this.lastRefresh.toISOString() : null,
      refresh_duration_ms: this.refreshDurationMs,
      cache_age_seconds: cacheAgeSeconds,
    };
  }
}
