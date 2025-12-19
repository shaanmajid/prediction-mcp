/**
 * Polymarket-specific search cache with adapted field weights.
 */
import type {
  PolymarketEvent,
  PolymarketMarket,
} from "../clients/polymarket.js";
import {
  tokenize,
  scoreItem,
  type SearchResult,
  type CacheStats,
} from "./scoring.js";

/**
 * Combined search result for Polymarket events and markets.
 */
export interface PolymarketCombinedSearchResult {
  type: "event" | "market";
  score: number;
  item: PolymarketEvent | PolymarketMarket;
}

/**
 * Field weights for Polymarket event search scoring.
 */
const POLYMARKET_EVENT_FIELD_WEIGHTS = new Map<string, number>([
  ["title", 1.0],
  ["slug", 0.5],
  ["description", 0.3],
]);

/**
 * Field weights for Polymarket market search scoring.
 * - question: Primary market question (equivalent to Kalshi's title)
 * - groupItemTitle: Outcome/candidate name (e.g., "Tim Cook - Apple")
 * - slug: URL identifier
 * - description: Detailed market description
 * - outcomes: JSON array of outcome names (parsed and searched)
 */
const POLYMARKET_MARKET_FIELD_WEIGHTS = new Map<string, number>([
  ["question", 1.0],
  ["groupItemTitle", 0.9],
  ["slug", 0.6],
  ["description", 0.4],
  ["outcomes", 0.3],
]);

/**
 * Safely parses a JSON string field that may contain an array of strings.
 * Returns the joined string for searching, or empty string if parsing fails.
 */
function parseJsonArrayField(jsonString: string | undefined): string {
  if (!jsonString) return "";
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.join(" ");
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Scores a Polymarket event against search tokens using weighted field matching.
 */
function scorePolymarketEvent(
  tokens: string[],
  event: PolymarketEvent,
): number {
  let totalScore = 0;

  const fields: Record<string, string> = {
    title: event.title || "",
    slug: event.slug || "",
    description: event.description || "",
  };

  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    if (fieldValue) {
      const weight = POLYMARKET_EVENT_FIELD_WEIGHTS.get(fieldName) || 0;
      const fieldScore = scoreItem(tokens, fieldValue);
      totalScore += fieldScore * weight;
    }
  }

  return totalScore;
}

/**
 * Scores a Polymarket market against search tokens using weighted field matching.
 */
function scorePolymarketMarket(
  tokens: string[],
  market: PolymarketMarket,
): number {
  let totalScore = 0;

  // Get groupItemTitle from market (may be in the extensible [key: string] fields)
  const groupItemTitle = (market as Record<string, unknown>).groupItemTitle as
    | string
    | undefined;

  const fields: Record<string, string> = {
    question: market.question || "",
    groupItemTitle: groupItemTitle || "",
    slug: market.slug || "",
    description: market.description || "",
    outcomes: parseJsonArrayField(market.outcomes),
  };

  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    if (fieldValue) {
      const weight = POLYMARKET_MARKET_FIELD_WEIGHTS.get(fieldName) || 0;
      const fieldScore = scoreItem(tokens, fieldValue);
      totalScore += fieldScore * weight;
    }
  }

  return totalScore;
}

/**
 * In-memory search cache with tokenized scoring for Polymarket events and markets.
 *
 * Supports:
 * - Fast in-memory search with relevance scoring
 * - Incremental refresh that adds/updates/removes items
 * - Separate search for events, markets, or combined results
 */
export class PolymarketSearchCache {
  private events: Map<string, PolymarketEvent>;
  private markets: Map<string, PolymarketMarket>;
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
  populate(events: PolymarketEvent[], markets: PolymarketMarket[]): void {
    const startTime = Date.now();

    this.events.clear();
    this.markets.clear();

    for (const event of events) {
      if (event.slug) {
        this.events.set(event.slug, event);
      }
    }

    for (const market of markets) {
      if (market.slug) {
        this.markets.set(market.slug, market);
      }
    }

    this.refreshDurationMs = Date.now() - startTime;
    this.lastRefresh = new Date();
  }

  /**
   * Refreshes cache with new data via merge-based update strategy.
   */
  refresh(events: PolymarketEvent[], markets: PolymarketMarket[]): void {
    const startTime = Date.now();

    const newEventSlugs = new Set<string>();
    const newMarketSlugs = new Set<string>();

    // Add or update events
    for (const event of events) {
      if (event.slug) {
        newEventSlugs.add(event.slug);
        this.events.set(event.slug, event);
      }
    }

    // Add or update markets
    for (const market of markets) {
      if (market.slug) {
        newMarketSlugs.add(market.slug);
        this.markets.set(market.slug, market);
      }
    }

    // Remove events that are no longer present
    const eventSlugsToRemove = [...this.events.keys()].filter(
      (slug) => !newEventSlugs.has(slug),
    );
    for (const slug of eventSlugsToRemove) {
      this.events.delete(slug);
    }

    // Remove markets that are no longer present
    const marketSlugsToRemove = [...this.markets.keys()].filter(
      (slug) => !newMarketSlugs.has(slug),
    );
    for (const slug of marketSlugsToRemove) {
      this.markets.delete(slug);
    }

    this.refreshDurationMs = Date.now() - startTime;
    this.lastRefresh = new Date();
  }

  /**
   * Searches events by query string, returning scored results.
   */
  searchEvents(query: string, limit: number): SearchResult<PolymarketEvent>[] {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
      return [];
    }

    const results: SearchResult<PolymarketEvent>[] = [];

    for (const event of this.events.values()) {
      const score = scorePolymarketEvent(tokens, event);
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
  searchMarkets(
    query: string,
    limit: number,
  ): SearchResult<PolymarketMarket>[] {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
      return [];
    }

    const results: SearchResult<PolymarketMarket>[] = [];

    for (const market of this.markets.values()) {
      const score = scorePolymarketMarket(tokens, market);
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
  search(query: string, limit: number): PolymarketCombinedSearchResult[] {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
      return [];
    }

    const results: PolymarketCombinedSearchResult[] = [];

    // Score events
    for (const event of this.events.values()) {
      const score = scorePolymarketEvent(tokens, event);
      if (score > 0) {
        results.push({ type: "event", score, item: event });
      }
    }

    // Score markets
    for (const market of this.markets.values()) {
      const score = scorePolymarketMarket(tokens, market);
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
  getStats(): CacheStats {
    const isEmpty = this.events.size === 0 && this.markets.size === 0;

    return {
      status: isEmpty ? "empty" : "ready",
      events_count: this.events.size,
      markets_count: this.markets.size,
      last_refresh: this.lastRefresh ? this.lastRefresh.toISOString() : null,
      refresh_duration_ms: this.refreshDurationMs,
    };
  }
}
