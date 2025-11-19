import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Zod schemas for MCP tool arguments
 * These schemas serve as the single source of truth for:
 * 1. Runtime validation
 * 2. JSON Schema generation for MCP tool definitions
 */

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

/**
 * Convert Zod schema to JSON Schema for MCP tool definitions
 */
export function toMCPSchema(schema: z.ZodType): Record<string, unknown> {
  return zodToJsonSchema(schema, {
    target: "jsonSchema7",
    $refStrategy: "none",
  });
}

/**
 * Type inference helpers
 */
export type ListMarketsArgs = z.infer<typeof ListMarketsArgsSchema>;
export type GetMarketArgs = z.infer<typeof GetMarketArgsSchema>;
export type GetOrderbookArgs = z.infer<typeof GetOrderbookArgsSchema>;
export type GetTradesArgs = z.infer<typeof GetTradesArgsSchema>;
export type GetSeriesArgs = z.infer<typeof GetSeriesArgsSchema>;
export type GetEventArgs = z.infer<typeof GetEventArgsSchema>;
