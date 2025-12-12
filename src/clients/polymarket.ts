/**
 * PolymarketClient - Unified client for Polymarket's Gamma and CLOB APIs
 *
 * Architecture:
 * - Gamma API (gamma-api.polymarket.com): Market discovery, events, tags
 * - CLOB API (clob.polymarket.com): Orderbook, prices, trades
 *
 * Authentication:
 * - All read operations are PUBLIC (no auth required)
 * - Trading requires wallet signing (not implemented)
 */

import { ClobClient, type OrderBookSummary } from "@polymarket/clob-client";

/**
 * Configuration for PolymarketClient
 */
export interface PolymarketConfig {
  /** Gamma API host (default: https://gamma-api.polymarket.com) */
  gammaHost?: string;
  /** CLOB API host (default: https://clob.polymarket.com) */
  clobHost?: string;
  /** Polygon chain ID (default: 137 for mainnet) */
  chainId?: number;
}

/**
 * Market object from Gamma API
 */
export interface PolymarketMarket {
  id: string;
  slug: string;
  question: string;
  description?: string;
  conditionId?: string;
  clobTokenIds?: string;
  outcomePrices?: string;
  outcomes?: string;
  volume?: string;
  liquidity?: string;
  closed: boolean;
  endDate?: string;
  resolutionSource?: string;
  [key: string]: unknown;
}

/**
 * Event object from Gamma API
 */
export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  markets?: PolymarketMarket[];
  volume?: string;
  liquidity?: string;
  closed?: boolean;
  [key: string]: unknown;
}

/**
 * Tag object from Gamma API
 */
export interface PolymarketTag {
  id: string;
  label: string;
  slug?: string;
  [key: string]: unknown;
}

// Re-export SDK's OrderBookSummary for external consumers
export type { OrderBookSummary } from "@polymarket/clob-client";

/**
 * Price history point from CLOB API
 */
export interface PriceHistoryPoint {
  t: number; // timestamp
  p: string; // price
}

/**
 * Parameters for listing markets
 */
export interface ListMarketsParams {
  closed?: boolean;
  limit?: number;
  offset?: number;
  order?: string;
  ascending?: boolean;
  tag_id?: string;
}

/**
 * Parameters for listing events
 */
export interface ListEventsParams {
  closed?: boolean;
  limit?: number;
  offset?: number;
  order?: string;
  ascending?: boolean;
  tag_id?: string;
}

/**
 * Parameters for price history
 */
export interface PriceHistoryParams {
  tokenId: string;
  /** Data resolution in minutes (default: 60) */
  fidelity?: number;
  /** Start timestamp in seconds - required if no interval */
  startTs?: number;
  /** End timestamp in seconds - required if no interval */
  endTs?: number;
  /** Interval (e.g., "1d", "1w") - alternative to startTs/endTs */
  interval?: string;
}

/**
 * PolymarketClient provides access to Polymarket's Gamma and CLOB APIs.
 *
 * Key design decisions:
 * - All read operations are PUBLIC (no auth required)
 * - Uses @polymarket/clob-client SDK for CLOB operations
 * - Direct REST calls for Gamma API (simple public reads)
 * - Gamma API: market discovery, events, tags (metadata)
 * - CLOB API: orderbook, prices, trades (trading data)
 */
export class PolymarketClient {
  private gammaHost: string;
  private clobHost: string;
  private clobClient: ClobClient;

  constructor(config: PolymarketConfig = {}) {
    this.gammaHost =
      config.gammaHost ||
      process.env.POLYMARKET_GAMMA_HOST ||
      "https://gamma-api.polymarket.com";

    this.clobHost =
      config.clobHost ||
      process.env.POLYMARKET_CLOB_HOST ||
      "https://clob.polymarket.com";

    const chainId =
      config.chainId ||
      (process.env.POLYMARKET_CHAIN_ID
        ? parseInt(process.env.POLYMARKET_CHAIN_ID)
        : 137);

    // Initialize CLOB client for public operations (no signer needed for reads)
    this.clobClient = new ClobClient(this.clobHost, chainId);
  }

  // ============================================================
  // Gamma API Methods (Market Discovery)
  // ============================================================

  /**
   * List available markets from Gamma API
   */
  async listMarkets(
    params: ListMarketsParams = {},
  ): Promise<{ markets: PolymarketMarket[] }> {
    const queryParams = new URLSearchParams();

    if (params.closed !== undefined) {
      queryParams.set("closed", String(params.closed));
    }
    if (params.limit !== undefined) {
      queryParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      queryParams.set("offset", String(params.offset));
    }
    if (params.order !== undefined) {
      queryParams.set("order", params.order);
    }
    if (params.ascending !== undefined) {
      queryParams.set("ascending", String(params.ascending));
    }
    if (params.tag_id !== undefined) {
      queryParams.set("tag_id", params.tag_id);
    }

    const url = `${this.gammaHost}/markets?${queryParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Gamma API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Gamma API returns array directly
    return { markets: Array.isArray(data) ? data : [] };
  }

  /**
   * Get detailed market information by slug
   * Gamma API uses query param: GET /markets?slug={slug}
   */
  async getMarket(slug: string): Promise<PolymarketMarket> {
    const url = `${this.gammaHost}/markets?slug=${encodeURIComponent(slug)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Gamma API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as
      | PolymarketMarket
      | PolymarketMarket[];

    // Gamma API returns array for slug query, take first result
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error(`Market not found: ${slug}`);
      }
      return data[0]!;
    }

    return data;
  }

  /**
   * List events from Gamma API
   */
  async listEvents(
    params: ListEventsParams = {},
  ): Promise<{ events: PolymarketEvent[] }> {
    const queryParams = new URLSearchParams();

    if (params.closed !== undefined) {
      queryParams.set("closed", String(params.closed));
    }
    if (params.limit !== undefined) {
      queryParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      queryParams.set("offset", String(params.offset));
    }
    if (params.order !== undefined) {
      queryParams.set("order", params.order);
    }
    if (params.ascending !== undefined) {
      queryParams.set("ascending", String(params.ascending));
    }
    if (params.tag_id !== undefined) {
      queryParams.set("tag_id", params.tag_id);
    }

    const url = `${this.gammaHost}/events?${queryParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Gamma API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return { events: Array.isArray(data) ? data : [] };
  }

  /**
   * Get event details by slug
   * Gamma API uses query param: GET /events?slug={slug}
   */
  async getEvent(slug: string): Promise<PolymarketEvent> {
    const url = `${this.gammaHost}/events?slug=${encodeURIComponent(slug)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Gamma API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as PolymarketEvent | PolymarketEvent[];

    // Handle array response
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error(`Event not found: ${slug}`);
      }
      return data[0]!;
    }

    return data;
  }

  /**
   * List available tags from Gamma API
   * Returns wrapped object for consistency with listMarkets/listEvents
   */
  async listTags(): Promise<{ tags: PolymarketTag[] }> {
    const url = `${this.gammaHost}/tags`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Gamma API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return { tags: Array.isArray(data) ? data : [] };
  }

  // ============================================================
  // CLOB API Methods (Trading Data) - Using official SDK
  // ============================================================

  /**
   * Get orderbook for a token
   * Uses SDK's OrderBookSummary which includes bids, asks, and metadata
   */
  async getOrderBook(tokenId: string): Promise<OrderBookSummary> {
    return this.clobClient.getOrderBook(tokenId);
  }

  /**
   * Get midpoint price for a token
   */
  async getMidpoint(tokenId: string): Promise<string> {
    const result = await this.clobClient.getMidpoint(tokenId);
    return result.mid;
  }

  /**
   * Get price for a token and side
   */
  async getPrice(tokenId: string, side: "BUY" | "SELL"): Promise<string> {
    const result = await this.clobClient.getPrice(tokenId, side);
    return result.price;
  }

  /**
   * Get price history for a token
   * Returns wrapped object for consistency with other list methods
   *
   * Note: Either startTs/endTs OR interval must be provided
   */
  async getPriceHistory(
    params: PriceHistoryParams,
  ): Promise<{ history: PriceHistoryPoint[] }> {
    // Ensure time component is provided - default to last 24 hours if not specified
    const now = Math.floor(Date.now() / 1000);
    const startTs =
      params.startTs ?? (params.interval ? undefined : now - 86400);
    const endTs = params.endTs ?? (params.interval ? undefined : now);

    // Use direct REST call to ensure proper parameter passing
    const queryParams = new URLSearchParams();
    queryParams.set("market", params.tokenId);
    queryParams.set("fidelity", String(params.fidelity || 60));

    if (startTs !== undefined) {
      queryParams.set("startTs", String(startTs));
    }
    if (endTs !== undefined) {
      queryParams.set("endTs", String(endTs));
    }
    if (params.interval) {
      queryParams.set("interval", params.interval);
    }

    const url = `${this.clobHost}/prices-history?${queryParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `CLOB API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as
      | { history: PriceHistoryPoint[] }
      | PriceHistoryPoint[];

    // Response may be { history: [...] } or raw array
    if ("history" in data && Array.isArray(data.history)) {
      return { history: data.history };
    }
    if (Array.isArray(data)) {
      return { history: data };
    }
    return { history: [] };
  }
}
