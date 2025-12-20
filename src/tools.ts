import { z } from "zod";
import { KalshiClient } from "./clients/kalshi.js";
import { PolymarketClient } from "./clients/polymarket.js";
import {
  KalshiSearchService,
  PolymarketSearchService,
} from "./search/index.js";
import {
  CacheStatsSchema,
  GetEventArgsSchema,
  GetMarketArgsSchema,
  GetOrderbookArgsSchema,
  GetSeriesArgsSchema,
  GetTradesArgsSchema,
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
}

// ============================================================
// Kalshi Tools
// ============================================================

export const KALSHI_TOOLS: Record<string, ToolDefinition> = {
  kalshi_list_markets: {
    name: "kalshi_list_markets",
    description:
      "List available markets on Kalshi. Filter by status (open/closed/settled), event, or series.",
    schema: ListMarketsArgsSchema,
    handler: async (ctx, args) => {
      const params = ListMarketsArgsSchema.parse(args || {});
      const result = await ctx.kalshi.listMarkets(params);
      return result.data;
    },
  },

  kalshi_get_market: {
    name: "kalshi_get_market",
    description:
      "Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.",
    schema: GetMarketArgsSchema,
    handler: async (ctx, args) => {
      const params = GetMarketArgsSchema.parse(args);
      const result = await ctx.kalshi.getMarketDetails(params.ticker);
      return result.data;
    },
  },

  kalshi_get_orderbook: {
    name: "kalshi_get_orderbook",
    description:
      "Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.",
    schema: GetOrderbookArgsSchema,
    handler: async (ctx, args) => {
      const params = GetOrderbookArgsSchema.parse(args);
      const result = await ctx.kalshi.getOrderBook(params.ticker);
      return result.data;
    },
  },

  kalshi_get_trades: {
    name: "kalshi_get_trades",
    description:
      "Get recent trade history for Kalshi markets. Can filter by specific market ticker.",
    schema: GetTradesArgsSchema,
    handler: async (ctx, args) => {
      const params = GetTradesArgsSchema.parse(args || {});
      const result = await ctx.kalshi.getTrades(params);
      return result.data;
    },
  },

  kalshi_get_series: {
    name: "kalshi_get_series",
    description:
      "Get series metadata including title for URL construction. Series represent categories of related markets (e.g., endorsements, elections).",
    schema: GetSeriesArgsSchema,
    handler: async (ctx, args) => {
      const params = GetSeriesArgsSchema.parse(args);
      const result = await ctx.kalshi.getSeries(params.seriesTicker);
      return result.data;
    },
  },

  kalshi_get_event: {
    name: "kalshi_get_event",
    description:
      "Get event metadata including title for URL construction. Events represent specific occurrences that can be traded on.",
    schema: GetEventArgsSchema,
    handler: async (ctx, args) => {
      const params = GetEventArgsSchema.parse(args);
      const result = await ctx.kalshi.getEvent(params.eventTicker);
      return result.data;
    },
  },

  kalshi_search: {
    name: "kalshi_search",
    description:
      "Search across Kalshi events and markets using keyword matching. Returns results ranked by relevance. Searches event titles, market titles, and candidate/outcome names (yes_sub_title).",
    schema: SearchQuerySchema,
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

  kalshi_search_events: {
    name: "kalshi_search_events",
    description:
      "Search Kalshi events by keyword. Returns events ranked by relevance based on title, subtitle, and ticker matches.",
    schema: SearchQuerySchema,
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

  kalshi_search_markets: {
    name: "kalshi_search_markets",
    description:
      "Search Kalshi markets by keyword. Returns markets ranked by relevance. Searches title, yes_sub_title (candidate/outcome names), no_sub_title, and ticker.",
    schema: SearchQuerySchema,
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

  kalshi_cache_stats: {
    name: "kalshi_cache_stats",
    description:
      "Get search cache statistics including event/market counts and last refresh time. Optionally trigger a cache refresh.",
    schema: CacheStatsSchema,
    handler: async (ctx, args) => {
      const params = CacheStatsSchema.parse(args || {});
      if (params.refresh) {
        await ctx.kalshiSearchService.refresh();
      }
      return ctx.kalshiSearchService.getStats();
    },
  },
};

// ============================================================
// Polymarket Tools
// ============================================================

export const POLYMARKET_TOOLS: Record<string, ToolDefinition> = {
  polymarket_list_markets: {
    name: "polymarket_list_markets",
    description:
      "List available markets on Polymarket. Filter by status (open/closed) and category tags. Returns market metadata including question, prices, volume, and token IDs for CLOB operations.",
    schema: PolymarketListMarketsArgsSchema,
    handler: async (ctx, args) => {
      const params = PolymarketListMarketsArgsSchema.parse(args || {});
      const result = await ctx.polymarket.listMarkets(params);
      return result;
    },
  },

  polymarket_get_market: {
    name: "polymarket_get_market",
    description:
      "Get detailed information about a specific Polymarket market by slug. Returns question, description, resolution criteria, current prices, volume, and token IDs.",
    schema: PolymarketGetMarketArgsSchema,
    handler: async (ctx, args) => {
      const params = PolymarketGetMarketArgsSchema.parse(args);
      const result = await ctx.polymarket.getMarket(params.slug);
      return result;
    },
  },

  polymarket_list_events: {
    name: "polymarket_list_events",
    description:
      "List events on Polymarket. Events group related markets (e.g., '2024 Election' may contain multiple market questions).",
    schema: PolymarketListEventsArgsSchema,
    handler: async (ctx, args) => {
      const params = PolymarketListEventsArgsSchema.parse(args || {});
      const result = await ctx.polymarket.listEvents(params);
      return result;
    },
  },

  polymarket_get_event: {
    name: "polymarket_get_event",
    description:
      "Get detailed event information by slug. Events contain metadata and may include nested markets.",
    schema: PolymarketGetEventArgsSchema,
    handler: async (ctx, args) => {
      const params = PolymarketGetEventArgsSchema.parse(args);
      const result = await ctx.polymarket.getEvent(params.slug);
      return result;
    },
  },

  polymarket_list_tags: {
    name: "polymarket_list_tags",
    description:
      "List available category tags on Polymarket. Tags can be used to filter markets and events by category (e.g., Politics, Sports, Crypto).",
    schema: PolymarketListTagsArgsSchema,
    handler: async (ctx) => {
      const result = await ctx.polymarket.listTags();
      return result;
    },
  },

  polymarket_get_orderbook: {
    name: "polymarket_get_orderbook",
    description:
      "Get the current orderbook for a Polymarket outcome token. Returns both bids and asks with price and size. Use token_id from market's clobTokenIds field.",
    schema: PolymarketGetOrderbookArgsSchema,
    handler: async (ctx, args) => {
      const params = PolymarketGetOrderbookArgsSchema.parse(args);
      const result = await ctx.polymarket.getOrderBook(params.token_id);
      return result;
    },
  },

  polymarket_get_price: {
    name: "polymarket_get_price",
    description:
      "Get the current best price for a Polymarket outcome token. Specify BUY or SELL side.",
    schema: PolymarketGetPriceArgsSchema,
    handler: async (ctx, args) => {
      const params = PolymarketGetPriceArgsSchema.parse(args);
      const price = await ctx.polymarket.getPrice(params.token_id, params.side);
      const midpoint = await ctx.polymarket.getMidpoint(params.token_id);
      return { price, midpoint, side: params.side };
    },
  },

  polymarket_get_price_history: {
    name: "polymarket_get_price_history",
    description:
      "Get historical price data for a Polymarket outcome token. Returns time series of price points. Defaults to last 24 hours with hourly resolution.",
    schema: PolymarketGetPriceHistoryArgsSchema,
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

  polymarket_search: {
    name: "polymarket_search",
    description:
      "Search across Polymarket events and markets using keyword matching. Returns results ranked by relevance. Searches event titles, market questions, and outcome names.",
    schema: PolymarketSearchQuerySchema,
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

  polymarket_search_events: {
    name: "polymarket_search_events",
    description:
      "Search Polymarket events by keyword. Returns events ranked by relevance based on title, slug, and description matches.",
    schema: PolymarketSearchQuerySchema,
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

  polymarket_search_markets: {
    name: "polymarket_search_markets",
    description:
      "Search Polymarket markets by keyword. Returns markets ranked by relevance. Searches question, groupItemTitle (outcome/candidate names), slug, description, and outcomes.",
    schema: PolymarketSearchQuerySchema,
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

  polymarket_cache_stats: {
    name: "polymarket_cache_stats",
    description:
      "Get Polymarket search cache statistics including event/market counts and last refresh time. Optionally trigger a cache refresh.",
    schema: PolymarketCacheStatsSchema,
    handler: async (ctx, args) => {
      const params = PolymarketCacheStatsSchema.parse(args || {});
      if (params.refresh) {
        await ctx.polymarketSearchService.refresh();
      }
      return ctx.polymarketSearchService.getStats();
    },
  },
};

// ============================================================
// Combined Tools
// ============================================================

export const TOOLS: Record<string, ToolDefinition> = {
  ...KALSHI_TOOLS,
  ...POLYMARKET_TOOLS,
};

export function getToolsList() {
  return Object.values(TOOLS).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toMCPSchema(tool.schema),
  }));
}
