import { z } from "zod";

/**
 * Zod schemas for MCP tool arguments
 * These schemas serve as the single source of truth for:
 * 1. Runtime validation
 * 2. JSON Schema generation for MCP tool definitions
 */

// ============================================================
// Kalshi Schemas
// ============================================================

// Schema for kalshi_list_markets
export const ListMarketsArgsSchema = z
  .object({
    status: z
      .enum(["open", "closed", "settled"])
      .optional()
      .describe(
        "Filter markets by status. Options: 'open' (currently trading), 'closed' (trading ended, awaiting settlement), 'settled' (resolved with final outcome)",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        "Maximum number of markets to return per page. Must be between 1 and 1000. Defaults to 100.",
      ),
    eventTicker: z
      .string()
      .optional()
      .describe(
        "Filter by event ticker (e.g., 'KXPRESIDENT'). Returns only markets belonging to this event.",
      ),
    seriesTicker: z
      .string()
      .optional()
      .describe(
        "Filter by series ticker (e.g., 'PRES-2024'). Returns only markets belonging to this series category.",
      ),
  })
  .strict();

// Schema for kalshi_get_market
export const GetMarketArgsSchema = z
  .object({
    ticker: z
      .string()
      .min(1)
      .describe(
        "Market ticker symbol (e.g., 'KXPRESIDENT-2024'). Uniquely identifies a specific tradable market.",
      ),
  })
  .strict();

// Schema for kalshi_get_orderbook
export const GetOrderbookArgsSchema = z
  .object({
    ticker: z
      .string()
      .min(1)
      .describe(
        "Market ticker symbol (e.g., 'KXPRESIDENT-2024'). Returns current bids for this market. Note: Only bids are returned due to binary market reciprocity.",
      ),
  })
  .strict();

// Schema for kalshi_get_trades
export const GetTradesArgsSchema = z
  .object({
    ticker: z
      .string()
      .optional()
      .describe(
        "Filter trades by market ticker (e.g., 'KXPRESIDENT-2024'). If omitted, returns trades across all markets.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        "Maximum number of trades to return per page. Must be between 1 and 1000. Defaults to 100.",
      ),
  })
  .strict();

// Schema for kalshi_get_series
export const GetSeriesArgsSchema = z
  .object({
    seriesTicker: z
      .string()
      .min(1)
      .describe(
        "Series ticker symbol (e.g., 'PRES-2024'). Returns metadata about a series, which represents a category of related markets.",
      ),
  })
  .strict();

// Schema for kalshi_get_event
export const GetEventArgsSchema = z
  .object({
    eventTicker: z
      .string()
      .min(1)
      .describe(
        "Event ticker symbol (e.g., 'KXPRESIDENT'). Returns metadata about an event, which represents a specific occurrence that can be traded on.",
      ),
  })
  .strict();

// Schema for kalshi_search, kalshi_search_events, kalshi_search_markets
export const SearchQuerySchema = z
  .object({
    query: z.string().min(1).describe("Search terms to find events or markets"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Maximum number of results to return"),
  })
  .strict();

// Schema for kalshi_cache_stats
// Design note: refresh defaults to false (read-only by default) because it's a write
// operation with side effects (7s delay). Explicit is better than implicit.
// Pass refresh: true only when you want to fetch fresh data from the API.
export const CacheStatsSchema = z
  .object({
    refresh: z
      .boolean()
      .default(false)
      .describe("If true, trigger a cache refresh before returning stats"),
  })
  .strict();

// Schema for kalshi_get_price_history
export const KalshiGetPriceHistoryArgsSchema = z
  .object({
    series_ticker: z
      .string()
      .min(1)
      .describe(
        "Series ticker containing the market (e.g., 'KXINX'). Find this via kalshi_get_market or kalshi_get_event.",
      ),
    ticker: z
      .string()
      .min(1)
      .describe(
        "Market ticker symbol (e.g., 'KXINX-25DEC31-T2000'). The specific market to get candlestick data for.",
      ),
    start_ts: z
      .number()
      .int()
      .optional()
      .describe(
        "Start timestamp in Unix seconds. Defaults to 24 hours ago if not provided.",
      ),
    end_ts: z
      .number()
      .int()
      .optional()
      .describe(
        "End timestamp in Unix seconds. Defaults to now if not provided.",
      ),
    period_interval: z
      .union([z.literal(1), z.literal(60), z.literal(1440)])
      .describe(
        "Candlestick period in minutes. Valid values: 1 (1 minute), 60 (1 hour), 1440 (1 day).",
      ),
  })
  .strict()
  .refine(
    (data) =>
      data.start_ts === undefined ||
      data.end_ts === undefined ||
      data.end_ts > data.start_ts,
    { message: "end_ts must be greater than start_ts" },
  );

// ============================================================
// Polymarket Schemas
// ============================================================

// Schema for polymarket_list_markets
export const PolymarketListMarketsArgsSchema = z
  .object({
    closed: z
      .boolean()
      .optional()
      .describe(
        "Filter by market status. Set to false for active markets only (default), true for closed markets.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        "Maximum number of markets to return per page. Must be between 1 and 1000. Defaults to 100.",
      ),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        "Pagination offset. Use with limit for paging through results.",
      ),
    tag_id: z
      .string()
      .optional()
      .describe(
        "Filter by tag/category ID. Get available tags from polymarket_list_tags.",
      ),
  })
  .strict();

// Schema for polymarket_get_market
export const PolymarketGetMarketArgsSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .describe(
        "Market slug (e.g., 'will-trump-win-2024'). Found in market URLs and list results.",
      ),
  })
  .strict();

// Schema for polymarket_list_events
export const PolymarketListEventsArgsSchema = z
  .object({
    closed: z
      .boolean()
      .optional()
      .describe(
        "Filter by event status. Set to false for active events only (default), true for closed events.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        "Maximum number of events to return per page. Must be between 1 and 1000. Defaults to 100.",
      ),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        "Pagination offset. Use with limit for paging through results.",
      ),
    tag_id: z
      .string()
      .optional()
      .describe(
        "Filter by tag/category ID. Get available tags from polymarket_list_tags.",
      ),
  })
  .strict();

// Schema for polymarket_get_event
export const PolymarketGetEventArgsSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .describe(
        "Event slug (e.g., '2024-presidential-election'). Found in event URLs and list results.",
      ),
  })
  .strict();

// Schema for polymarket_list_tags
export const PolymarketListTagsArgsSchema = z.object({}).strict();

// Schema for polymarket_get_orderbook
export const PolymarketGetOrderbookArgsSchema = z
  .object({
    token_id: z
      .string()
      .min(1)
      .describe(
        "Outcome token ID from market's clobTokenIds field. Each market has separate token IDs for Yes/No outcomes.",
      ),
  })
  .strict();

// Schema for polymarket_get_price
export const PolymarketGetPriceArgsSchema = z
  .object({
    token_id: z
      .string()
      .min(1)
      .describe("Outcome token ID from market's clobTokenIds field."),
    side: z.enum(["BUY", "SELL"]).describe("Order side to get price for."),
  })
  .strict();

// Schema for polymarket_get_price_history
export const PolymarketGetPriceHistoryArgsSchema = z
  .object({
    token_id: z
      .string()
      .min(1)
      .describe("Outcome token ID from market's clobTokenIds field."),
    fidelity: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Data resolution in minutes. Defaults to 60 (hourly data)."),
    startTs: z
      .number()
      .int()
      .optional()
      .describe(
        "Start timestamp in Unix seconds. Defaults to 24 hours ago if not provided.",
      ),
    endTs: z
      .number()
      .int()
      .optional()
      .describe(
        "End timestamp in Unix seconds. Defaults to now if not provided.",
      ),
  })
  .strict();

// Schema for polymarket_search, polymarket_search_events, polymarket_search_markets
export const PolymarketSearchQuerySchema = z
  .object({
    query: z
      .string()
      .min(1)
      .describe("Search terms to find events or markets on Polymarket"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Maximum number of results to return"),
  })
  .strict();

// Schema for polymarket_cache_stats
// Design note: refresh defaults to false because it's a write operation with side effects (~40s delay).
export const PolymarketCacheStatsSchema = z
  .object({
    refresh: z
      .boolean()
      .default(false)
      .describe("If true, trigger a cache refresh before returning stats"),
  })
  .strict();

/**
 * Convert Zod schema to JSON Schema for MCP tool definitions
 *
 * Uses Zod v4's native toJSONSchema() which replaced the deprecated
 * zod-to-json-schema library.
 */
export function toMCPSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: "draft-7",
    reused: "inline",
  }) as Record<string, unknown>;
}

/**
 * Type inference helpers - Kalshi
 */
export type ListMarketsArgs = z.infer<typeof ListMarketsArgsSchema>;
export type GetMarketArgs = z.infer<typeof GetMarketArgsSchema>;
export type GetOrderbookArgs = z.infer<typeof GetOrderbookArgsSchema>;
export type GetTradesArgs = z.infer<typeof GetTradesArgsSchema>;
export type GetSeriesArgs = z.infer<typeof GetSeriesArgsSchema>;
export type GetEventArgs = z.infer<typeof GetEventArgsSchema>;
export type SearchQueryArgs = z.infer<typeof SearchQuerySchema>;
export type CacheStatsArgs = z.infer<typeof CacheStatsSchema>;
export type KalshiGetPriceHistoryArgs = z.infer<
  typeof KalshiGetPriceHistoryArgsSchema
>;

/**
 * Type inference helpers - Polymarket
 */
export type PolymarketListMarketsArgs = z.infer<
  typeof PolymarketListMarketsArgsSchema
>;
export type PolymarketGetMarketArgs = z.infer<
  typeof PolymarketGetMarketArgsSchema
>;
export type PolymarketListEventsArgs = z.infer<
  typeof PolymarketListEventsArgsSchema
>;
export type PolymarketGetEventArgs = z.infer<
  typeof PolymarketGetEventArgsSchema
>;
export type PolymarketListTagsArgs = z.infer<
  typeof PolymarketListTagsArgsSchema
>;
export type PolymarketGetOrderbookArgs = z.infer<
  typeof PolymarketGetOrderbookArgsSchema
>;
export type PolymarketGetPriceArgs = z.infer<
  typeof PolymarketGetPriceArgsSchema
>;
export type PolymarketGetPriceHistoryArgs = z.infer<
  typeof PolymarketGetPriceHistoryArgsSchema
>;
export type PolymarketSearchQueryArgs = z.infer<
  typeof PolymarketSearchQuerySchema
>;
export type PolymarketCacheStatsArgs = z.infer<
  typeof PolymarketCacheStatsSchema
>;
