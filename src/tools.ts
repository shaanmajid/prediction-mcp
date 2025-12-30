import { z } from "zod";
import type { AuthContext } from "./auth/index.js";
import { KalshiClient } from "./clients/kalshi.js";
import { PolymarketClient } from "./clients/polymarket.js";
import {
  KalshiSearchService,
  PolymarketSearchService,
} from "./search/index.js";
import {
  CacheStatsSchema,
  GetBalanceArgsSchema,
  GetEventArgsSchema,
  GetMarketArgsSchema,
  GetOrderbookArgsSchema,
  GetPositionsArgsSchema,
  GetSeriesArgsSchema,
  GetTradesArgsSchema,
  KalshiGetFillsArgsSchema,
  KalshiGetOrderArgsSchema,
  KalshiGetPriceHistoryArgsSchema,
  KalshiGetSettlementsArgsSchema,
  KalshiListOrdersArgsSchema,
  ListMarketsArgsSchema,
  PolymarketCacheStatsSchema,
  PolymarketGetEventArgsSchema,
  PolymarketGetMarketArgsSchema,
  PolymarketGetOrderbookArgsSchema,
  PolymarketGetPriceArgsSchema,
  PolymarketGetPriceHistoryArgsSchema,
  PolymarketListEventsArgsSchema,
  PolymarketListMarketsArgsSchema,
  PolymarketListTagsArgsSchema,
  PolymarketSearchQuerySchema,
  SearchQuerySchema,
  toMCPSchema,
} from "./validation.js";

// ============================================================
// Types
// ============================================================

/** Supported prediction market platforms */
export type Platform = "kalshi" | "polymarket";

/**
 * Context available to tool handlers
 */
export interface ToolContext {
  kalshi: KalshiClient;
  polymarket: PolymarketClient;
  kalshiSearchService: KalshiSearchService;
  polymarketSearchService: PolymarketSearchService;
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType;
  handler: (ctx: ToolContext, args: unknown) => Promise<unknown>;
  /** Platform this tool belongs to */
  platform: Platform;
  /** If set, tool requires authentication for the specified platform */
  requiresAuth?: {
    platform: Platform;
  };
}

// ============================================================
// All Tools (Single Source of Truth)
// ============================================================

/**
 * All tool definitions in a single array.
 * Use filter helpers below to get subsets by platform or auth requirements.
 */
const ALL_TOOLS: ToolDefinition[] = [
  // ──────────────────────────────────────────────────────────
  // Kalshi Public Tools
  // ──────────────────────────────────────────────────────────
  {
    name: "kalshi_list_markets",
    description:
      "List available markets on Kalshi. Filter by status (open/closed/settled), event, or series.",
    schema: ListMarketsArgsSchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = ListMarketsArgsSchema.parse(args || {});
      const result = await ctx.kalshi.listMarkets(params);
      return result.data;
    },
  },
  {
    name: "kalshi_get_market",
    description:
      "Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.",
    schema: GetMarketArgsSchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = GetMarketArgsSchema.parse(args);
      const result = await ctx.kalshi.getMarketDetails(params.ticker);
      return result.data;
    },
  },
  {
    name: "kalshi_get_orderbook",
    description:
      "Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.",
    schema: GetOrderbookArgsSchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = GetOrderbookArgsSchema.parse(args);
      const result = await ctx.kalshi.getOrderBook(params.ticker);
      return result.data;
    },
  },
  {
    name: "kalshi_get_trades",
    description:
      "Get recent trade history for Kalshi markets. Can filter by specific market ticker.",
    schema: GetTradesArgsSchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = GetTradesArgsSchema.parse(args || {});
      const result = await ctx.kalshi.getTrades(params);
      return result.data;
    },
  },
  {
    name: "kalshi_get_series",
    description:
      "Get series metadata including title for URL construction. Series represent categories of related markets (e.g., endorsements, elections).",
    schema: GetSeriesArgsSchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = GetSeriesArgsSchema.parse(args);
      const result = await ctx.kalshi.getSeries(params.seriesTicker);
      return result.data;
    },
  },
  {
    name: "kalshi_get_event",
    description:
      "Get event metadata including title for URL construction. Events represent specific occurrences that can be traded on.",
    schema: GetEventArgsSchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = GetEventArgsSchema.parse(args);
      const result = await ctx.kalshi.getEvent(params.eventTicker);
      return result.data;
    },
  },
  {
    name: "kalshi_search",
    description:
      "Search across Kalshi events and markets using keyword matching. Returns results ranked by relevance. Searches event titles, market titles, and candidate/outcome names (yes_sub_title).",
    schema: SearchQuerySchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = SearchQuerySchema.parse(args);
      const results = await ctx.kalshiSearchService.search(
        params.query,
        params.limit,
      );
      return {
        results,
        total: results.length,
        query: params.query,
      };
    },
  },
  {
    name: "kalshi_search_events",
    description:
      "Search Kalshi events by keyword. Returns events ranked by relevance based on title, subtitle, and ticker matches.",
    schema: SearchQuerySchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = SearchQuerySchema.parse(args);
      const results = await ctx.kalshiSearchService.searchEvents(
        params.query,
        params.limit,
      );
      return {
        results: results.map((r) => ({
          type: "event" as const,
          score: r.score,
          item: r.item,
        })),
        total: results.length,
        query: params.query,
      };
    },
  },
  {
    name: "kalshi_search_markets",
    description:
      "Search Kalshi markets by keyword. Returns markets ranked by relevance. Searches title, yes_sub_title (candidate/outcome names), no_sub_title, and ticker.",
    schema: SearchQuerySchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = SearchQuerySchema.parse(args);
      const results = await ctx.kalshiSearchService.searchMarkets(
        params.query,
        params.limit,
      );
      return {
        results: results.map((r) => ({
          type: "market" as const,
          score: r.score,
          item: r.item,
        })),
        total: results.length,
        query: params.query,
      };
    },
  },
  {
    name: "kalshi_cache_stats",
    description:
      "Get search cache statistics including event/market counts, cache age, TTL expiry time, and last refresh time. Optionally trigger a cache refresh.",
    schema: CacheStatsSchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = CacheStatsSchema.parse(args || {});
      if (params.refresh) {
        await ctx.kalshiSearchService.refresh();
      }
      return ctx.kalshiSearchService.getStats();
    },
  },
  {
    name: "kalshi_get_price_history",
    description:
      "Get historical candlestick (OHLCV) data for a Kalshi market. Returns price, volume, and open interest over time. Requires both series_ticker and market ticker.",
    schema: KalshiGetPriceHistoryArgsSchema,
    platform: "kalshi",
    handler: async (ctx, args) => {
      const params = KalshiGetPriceHistoryArgsSchema.parse(args);
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86400;

      const result = await ctx.kalshi.getMarketCandlesticks({
        seriesTicker: params.series_ticker,
        ticker: params.ticker,
        startTs: params.start_ts ?? oneDayAgo,
        endTs: params.end_ts ?? now,
        periodInterval: params.period_interval,
      });
      return result.data;
    },
  },

  // ──────────────────────────────────────────────────────────
  // Kalshi Auth Tools
  // ──────────────────────────────────────────────────────────
  {
    name: "kalshi_get_balance",
    description:
      "Get your Kalshi account balance and portfolio value. Returns values in cents and dollars. Requires Kalshi authentication.",
    schema: GetBalanceArgsSchema,
    platform: "kalshi",
    requiresAuth: { platform: "kalshi" },
    handler: async (ctx) => {
      const result = await ctx.kalshi.getBalance();
      return result.data;
    },
  },
  {
    name: "kalshi_get_positions",
    description:
      "Get your open positions on Kalshi markets. Filter by ticker or event. Returns market positions with P&L and exposure data. Requires Kalshi authentication.",
    schema: GetPositionsArgsSchema,
    platform: "kalshi",
    requiresAuth: { platform: "kalshi" },
    handler: async (ctx, args) => {
      const params = GetPositionsArgsSchema.parse(args || {});
      const result = await ctx.kalshi.getPositions({
        ticker: params.ticker,
        eventTicker: params.eventTicker,
        countFilter: params.countFilter,
        limit: params.limit,
        cursor: params.cursor,
      });
      return result.data;
    },
  },
  {
    name: "kalshi_list_orders",
    description:
      "List your orders on Kalshi. Filter by ticker, event, status, or time range. Returns order details including status, price, and fill information. Requires Kalshi authentication.",
    schema: KalshiListOrdersArgsSchema,
    platform: "kalshi",
    requiresAuth: { platform: "kalshi" },
    handler: async (ctx, args) => {
      const params = KalshiListOrdersArgsSchema.parse(args || {});
      const result = await ctx.kalshi.listOrders({
        ticker: params.ticker,
        eventTicker: params.eventTicker,
        minTs: params.minTs,
        maxTs: params.maxTs,
        status: params.status,
        limit: params.limit,
        cursor: params.cursor,
      });
      return result.data;
    },
  },
  {
    name: "kalshi_get_order",
    description:
      "Get details about a specific order by ID. Returns order status, price, fills, and timestamps. Requires Kalshi authentication.",
    schema: KalshiGetOrderArgsSchema,
    platform: "kalshi",
    requiresAuth: { platform: "kalshi" },
    handler: async (ctx, args) => {
      const params = KalshiGetOrderArgsSchema.parse(args);
      const result = await ctx.kalshi.getOrder(params.orderId);
      return result.data;
    },
  },
  {
    name: "kalshi_get_fills",
    description:
      "Get your trade execution history (fills) on Kalshi. Filter by ticker, order ID, or time range. Returns trade details including price, count, and P&L. Requires Kalshi authentication.",
    schema: KalshiGetFillsArgsSchema,
    platform: "kalshi",
    requiresAuth: { platform: "kalshi" },
    handler: async (ctx, args) => {
      const params = KalshiGetFillsArgsSchema.parse(args || {});
      const result = await ctx.kalshi.getFills({
        ticker: params.ticker,
        orderId: params.orderId,
        minTs: params.minTs,
        maxTs: params.maxTs,
        limit: params.limit,
        cursor: params.cursor,
      });
      return result.data;
    },
  },
  {
    name: "kalshi_get_settlements",
    description:
      "Get your settlement history for closed positions on Kalshi. Filter by ticker, event, or time range. Returns settlement revenue and market outcome data. Requires Kalshi authentication.",
    schema: KalshiGetSettlementsArgsSchema,
    platform: "kalshi",
    requiresAuth: { platform: "kalshi" },
    handler: async (ctx, args) => {
      const params = KalshiGetSettlementsArgsSchema.parse(args || {});
      const result = await ctx.kalshi.getSettlements({
        limit: params.limit,
        cursor: params.cursor,
        ticker: params.ticker,
        eventTicker: params.eventTicker,
        minTs: params.minTs,
        maxTs: params.maxTs,
      });
      return result.data;
    },
  },

  // ──────────────────────────────────────────────────────────
  // Polymarket Public Tools
  // ──────────────────────────────────────────────────────────
  {
    name: "polymarket_list_markets",
    description:
      "List available markets on Polymarket. Filter by status (open/closed) and category tags. Returns market metadata including question, prices, volume, and token IDs for CLOB operations.",
    schema: PolymarketListMarketsArgsSchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketListMarketsArgsSchema.parse(args || {});
      const result = await ctx.polymarket.listMarkets(params);
      return result;
    },
  },
  {
    name: "polymarket_get_market",
    description:
      "Get detailed information about a specific Polymarket market by slug. Returns question, description, resolution criteria, current prices, volume, and token IDs.",
    schema: PolymarketGetMarketArgsSchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketGetMarketArgsSchema.parse(args);
      const result = await ctx.polymarket.getMarket(params.slug);
      return result;
    },
  },
  {
    name: "polymarket_list_events",
    description:
      "List events on Polymarket. Events group related markets (e.g., '2024 Election' may contain multiple market questions).",
    schema: PolymarketListEventsArgsSchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketListEventsArgsSchema.parse(args || {});
      const result = await ctx.polymarket.listEvents(params);
      return result;
    },
  },
  {
    name: "polymarket_get_event",
    description:
      "Get detailed event information by slug. Events contain metadata and may include nested markets.",
    schema: PolymarketGetEventArgsSchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketGetEventArgsSchema.parse(args);
      const result = await ctx.polymarket.getEvent(params.slug);
      return result;
    },
  },
  {
    name: "polymarket_list_tags",
    description:
      "List available category tags on Polymarket. Tags can be used to filter markets and events by category (e.g., Politics, Sports, Crypto).",
    schema: PolymarketListTagsArgsSchema,
    platform: "polymarket",
    handler: async (ctx) => {
      const result = await ctx.polymarket.listTags();
      return result;
    },
  },
  {
    name: "polymarket_get_orderbook",
    description:
      "Get the current orderbook for a Polymarket outcome token. Returns both bids and asks with price and size. Use token_id from market's clobTokenIds field.",
    schema: PolymarketGetOrderbookArgsSchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketGetOrderbookArgsSchema.parse(args);
      const result = await ctx.polymarket.getOrderBook(params.token_id);
      return result;
    },
  },
  {
    name: "polymarket_get_price",
    description:
      "Get the current best price for a Polymarket outcome token. Specify BUY or SELL side.",
    schema: PolymarketGetPriceArgsSchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketGetPriceArgsSchema.parse(args);
      const price = await ctx.polymarket.getPrice(params.token_id, params.side);
      const midpoint = await ctx.polymarket.getMidpoint(params.token_id);
      return { price, midpoint, side: params.side };
    },
  },
  {
    name: "polymarket_get_price_history",
    description:
      "Get historical price data for a Polymarket outcome token. Returns time series of price points. Defaults to last 24 hours with hourly resolution.",
    schema: PolymarketGetPriceHistoryArgsSchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketGetPriceHistoryArgsSchema.parse(args);
      const result = await ctx.polymarket.getPriceHistory({
        tokenId: params.token_id,
        fidelity: params.fidelity,
        startTs: params.startTs,
        endTs: params.endTs,
      });
      return result;
    },
  },
  {
    name: "polymarket_search",
    description:
      "Search across Polymarket events and markets using keyword matching. Returns results ranked by relevance. Searches event titles, market questions, and outcome names.",
    schema: PolymarketSearchQuerySchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketSearchQuerySchema.parse(args);
      const results = await ctx.polymarketSearchService.search(
        params.query,
        params.limit,
      );
      return {
        results,
        total: results.length,
        query: params.query,
      };
    },
  },
  {
    name: "polymarket_search_events",
    description:
      "Search Polymarket events by keyword. Returns events ranked by relevance based on title, slug, and description matches.",
    schema: PolymarketSearchQuerySchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketSearchQuerySchema.parse(args);
      const results = await ctx.polymarketSearchService.searchEvents(
        params.query,
        params.limit,
      );
      return {
        results: results.map((r) => ({
          type: "event" as const,
          score: r.score,
          item: r.item,
        })),
        total: results.length,
        query: params.query,
      };
    },
  },
  {
    name: "polymarket_search_markets",
    description:
      "Search Polymarket markets by keyword. Returns markets ranked by relevance. Searches question, groupItemTitle (outcome/candidate names), slug, description, and outcomes.",
    schema: PolymarketSearchQuerySchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketSearchQuerySchema.parse(args);
      const results = await ctx.polymarketSearchService.searchMarkets(
        params.query,
        params.limit,
      );
      return {
        results: results.map((r) => ({
          type: "market" as const,
          score: r.score,
          item: r.item,
        })),
        total: results.length,
        query: params.query,
      };
    },
  },
  {
    name: "polymarket_cache_stats",
    description:
      "Get Polymarket search cache statistics including event/market counts, cache age, TTL expiry time, and last refresh time. Optionally trigger a cache refresh.",
    schema: PolymarketCacheStatsSchema,
    platform: "polymarket",
    handler: async (ctx, args) => {
      const params = PolymarketCacheStatsSchema.parse(args || {});
      if (params.refresh) {
        await ctx.polymarketSearchService.refresh();
      }
      return ctx.polymarketSearchService.getStats();
    },
  },

  // ──────────────────────────────────────────────────────────
  // Polymarket Auth Tools (none yet)
  // ──────────────────────────────────────────────────────────
];

// ============================================================
// Filter Helpers
// ============================================================

/** Filter tools by platform */
const byPlatform = (platform: Platform) => (t: ToolDefinition) =>
  t.platform === platform;

/** Filter to public tools only (no auth required) */
const isPublic = (t: ToolDefinition) => !t.requiresAuth;

/** Filter to auth-required tools only */
const requiresAuth = (t: ToolDefinition) => !!t.requiresAuth;

// ============================================================
// Derived Exports (for backwards compatibility and convenience)
// ============================================================

/** Convert array to Record<name, tool> */
const toRecord = (tools: ToolDefinition[]): Record<string, ToolDefinition> =>
  Object.fromEntries(tools.map((t) => [t.name, t]));

/** All tools as a lookup map */
export const TOOLS: Record<string, ToolDefinition> = toRecord(ALL_TOOLS);

/** Kalshi tools (public + auth) */
export const KALSHI_TOOLS: Record<string, ToolDefinition> = toRecord(
  ALL_TOOLS.filter(byPlatform("kalshi")),
);

/** Polymarket tools (public + auth) */
export const POLYMARKET_TOOLS: Record<string, ToolDefinition> = toRecord(
  ALL_TOOLS.filter(byPlatform("polymarket")),
);

/** Kalshi public tools only */
export const KALSHI_PUBLIC_TOOLS: Record<string, ToolDefinition> = toRecord(
  ALL_TOOLS.filter(byPlatform("kalshi")).filter(isPublic),
);

/** Kalshi auth-required tools only */
export const KALSHI_AUTH_TOOLS: Record<string, ToolDefinition> = toRecord(
  ALL_TOOLS.filter(byPlatform("kalshi")).filter(requiresAuth),
);

/** Polymarket public tools only */
export const POLYMARKET_PUBLIC_TOOLS: Record<string, ToolDefinition> = toRecord(
  ALL_TOOLS.filter(byPlatform("polymarket")).filter(isPublic),
);

/** Polymarket auth-required tools only */
export const POLYMARKET_AUTH_TOOLS: Record<string, ToolDefinition> = toRecord(
  ALL_TOOLS.filter(byPlatform("polymarket")).filter(requiresAuth),
);

// ============================================================
// Tool List for MCP Registration
// ============================================================

/**
 * Get tools list for MCP registration, filtered by auth context.
 * Public tools are always included; auth tools only if authenticated.
 */
export function getToolsList(authContext?: AuthContext) {
  return ALL_TOOLS.filter((tool) => {
    // Public tools always included
    if (!tool.requiresAuth) return true;

    // Auth tools only if authenticated for that platform
    const platform = tool.requiresAuth.platform;
    return authContext?.[platform]?.authenticated ?? false;
  }).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toMCPSchema(tool.schema),
  }));
}
