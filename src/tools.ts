import { z } from "zod";
import { KalshiClient } from "./clients/kalshi.js";
import {
  ListMarketsArgsSchema,
  GetMarketArgsSchema,
  GetOrderbookArgsSchema,
  GetTradesArgsSchema,
  GetSeriesArgsSchema,
  GetEventArgsSchema,
  toMCPSchema,
} from "./validation.js";

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType;
  handler: (client: KalshiClient, args: unknown) => Promise<unknown>;
}

export const TOOLS: Record<string, ToolDefinition> = {
  kalshi_list_markets: {
    name: "kalshi_list_markets",
    description:
      "List available markets on Kalshi. Filter by status (open/closed/settled), event, or series.",
    schema: ListMarketsArgsSchema,
    handler: async (client, args) => {
      const params = ListMarketsArgsSchema.parse(args || {});
      const result = await client.listMarkets(params);
      return result.data;
    },
  },

  kalshi_get_market: {
    name: "kalshi_get_market",
    description:
      "Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.",
    schema: GetMarketArgsSchema,
    handler: async (client, args) => {
      const params = GetMarketArgsSchema.parse(args);
      const result = await client.getMarketDetails(params.ticker);
      return result.data;
    },
  },

  kalshi_get_orderbook: {
    name: "kalshi_get_orderbook",
    description:
      "Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.",
    schema: GetOrderbookArgsSchema,
    handler: async (client, args) => {
      const params = GetOrderbookArgsSchema.parse(args);
      const result = await client.getOrderBook(params.ticker);
      return result.data;
    },
  },

  kalshi_get_trades: {
    name: "kalshi_get_trades",
    description:
      "Get recent trade history for Kalshi markets. Can filter by specific market ticker.",
    schema: GetTradesArgsSchema,
    handler: async (client, args) => {
      const params = GetTradesArgsSchema.parse(args || {});
      const result = await client.getTrades(params);
      return result.data;
    },
  },

  kalshi_get_series: {
    name: "kalshi_get_series",
    description:
      "Get series metadata including title for URL construction. Series represent categories of related markets (e.g., endorsements, elections).",
    schema: GetSeriesArgsSchema,
    handler: async (client, args) => {
      const params = GetSeriesArgsSchema.parse(args);
      const result = await client.getSeries(params.seriesTicker);
      return result.data;
    },
  },

  kalshi_get_event: {
    name: "kalshi_get_event",
    description:
      "Get event metadata including title for URL construction. Events represent specific occurrences that can be traded on.",
    schema: GetEventArgsSchema,
    handler: async (client, args) => {
      const params = GetEventArgsSchema.parse(args);
      const result = await client.getEvent(params.eventTicker);
      return result.data;
    },
  },
};

export function getToolsList() {
  return Object.values(TOOLS).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toMCPSchema(tool.schema),
  }));
}
