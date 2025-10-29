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
    status: z.enum(["open", "closed", "settled"]).optional(),
    limit: z.coerce.number().int().min(1).max(1000).default(100),
    eventTicker: z.string().optional(),
    seriesTicker: z.string().optional(),
  })
  .strict();

// Schema for kalshi_get_market
export const GetMarketArgsSchema = z
  .object({
    ticker: z.string().min(1),
  })
  .strict();

// Schema for kalshi_get_orderbook
export const GetOrderbookArgsSchema = z
  .object({
    ticker: z.string().min(1),
  })
  .strict();

// Schema for kalshi_get_trades
export const GetTradesArgsSchema = z
  .object({
    ticker: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(1000).default(100),
  })
  .strict();

// Schema for kalshi_get_series
export const GetSeriesArgsSchema = z
  .object({
    seriesTicker: z.string().min(1),
  })
  .strict();

// Schema for kalshi_get_event
export const GetEventArgsSchema = z
  .object({
    eventTicker: z.string().min(1),
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
