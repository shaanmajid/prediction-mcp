import { z } from "zod";
import { KalshiClient } from "./clients/kalshi.js";
import { PolymarketClient } from "./clients/polymarket.js";
import {
  ListMarketsArgsSchema,
  GetMarketArgsSchema,
  GetOrderbookArgsSchema,
  GetTradesArgsSchema,
  GetSeriesArgsSchema,
  GetEventArgsSchema,
  PolymarketListMarketsArgsSchema,
  PolymarketGetMarketArgsSchema,
  PolymarketListEventsArgsSchema,
  PolymarketGetEventArgsSchema,
  PolymarketListTagsArgsSchema,
  PolymarketGetOrderbookArgsSchema,
  PolymarketGetPriceArgsSchema,
  PolymarketGetPriceHistoryArgsSchema,
  toMCPSchema,
} from "./validation.js";

/**
 * Clients available to tool handlers
 */
export interface ToolClients {
  kalshi: KalshiClient;
  polymarket: PolymarketClient;
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType;
  handler: (clients: ToolClients, args: unknown) => Promise<unknown>;
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
    handler: async (clients, args) => {
      const params = ListMarketsArgsSchema.parse(args || {});
      const result = await clients.kalshi.listMarkets(params);
      return result.data;
    },
  },

  kalshi_get_market: {
    name: "kalshi_get_market",
    description:
      "Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.",
    schema: GetMarketArgsSchema,
    handler: async (clients, args) => {
      const params = GetMarketArgsSchema.parse(args);
      const result = await clients.kalshi.getMarketDetails(params.ticker);
      return result.data;
    },
  },

  kalshi_get_orderbook: {
    name: "kalshi_get_orderbook",
    description:
      "Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.",
    schema: GetOrderbookArgsSchema,
    handler: async (clients, args) => {
      const params = GetOrderbookArgsSchema.parse(args);
      const result = await clients.kalshi.getOrderBook(params.ticker);
      return result.data;
    },
  },

  kalshi_get_trades: {
    name: "kalshi_get_trades",
    description:
      "Get recent trade history for Kalshi markets. Can filter by specific market ticker.",
    schema: GetTradesArgsSchema,
    handler: async (clients, args) => {
      const params = GetTradesArgsSchema.parse(args || {});
      const result = await clients.kalshi.getTrades(params);
      return result.data;
    },
  },

  kalshi_get_series: {
    name: "kalshi_get_series",
    description:
      "Get series metadata including title for URL construction. Series represent categories of related markets (e.g., endorsements, elections).",
    schema: GetSeriesArgsSchema,
    handler: async (clients, args) => {
      const params = GetSeriesArgsSchema.parse(args);
      const result = await clients.kalshi.getSeries(params.seriesTicker);
      return result.data;
    },
  },

  kalshi_get_event: {
    name: "kalshi_get_event",
    description:
      "Get event metadata including title for URL construction. Events represent specific occurrences that can be traded on.",
    schema: GetEventArgsSchema,
    handler: async (clients, args) => {
      const params = GetEventArgsSchema.parse(args);
      const result = await clients.kalshi.getEvent(params.eventTicker);
      return result.data;
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
    handler: async (clients, args) => {
      const params = PolymarketListMarketsArgsSchema.parse(args || {});
      const result = await clients.polymarket.listMarkets(params);
      return result;
    },
  },

  polymarket_get_market: {
    name: "polymarket_get_market",
    description:
      "Get detailed information about a specific Polymarket market by slug. Returns question, description, resolution criteria, current prices, volume, and token IDs.",
    schema: PolymarketGetMarketArgsSchema,
    handler: async (clients, args) => {
      const params = PolymarketGetMarketArgsSchema.parse(args);
      const result = await clients.polymarket.getMarket(params.slug);
      return result;
    },
  },

  polymarket_list_events: {
    name: "polymarket_list_events",
    description:
      "List events on Polymarket. Events group related markets (e.g., '2024 Election' may contain multiple market questions).",
    schema: PolymarketListEventsArgsSchema,
    handler: async (clients, args) => {
      const params = PolymarketListEventsArgsSchema.parse(args || {});
      const result = await clients.polymarket.listEvents(params);
      return result;
    },
  },

  polymarket_get_event: {
    name: "polymarket_get_event",
    description:
      "Get detailed event information by slug. Events contain metadata and may include nested markets.",
    schema: PolymarketGetEventArgsSchema,
    handler: async (clients, args) => {
      const params = PolymarketGetEventArgsSchema.parse(args);
      const result = await clients.polymarket.getEvent(params.slug);
      return result;
    },
  },

  polymarket_list_tags: {
    name: "polymarket_list_tags",
    description:
      "List available category tags on Polymarket. Tags can be used to filter markets and events by category (e.g., Politics, Sports, Crypto).",
    schema: PolymarketListTagsArgsSchema,
    handler: async (clients) => {
      const result = await clients.polymarket.listTags();
      return result;
    },
  },

  polymarket_get_orderbook: {
    name: "polymarket_get_orderbook",
    description:
      "Get the current orderbook for a Polymarket outcome token. Returns both bids and asks with price and size. Use token_id from market's clobTokenIds field.",
    schema: PolymarketGetOrderbookArgsSchema,
    handler: async (clients, args) => {
      const params = PolymarketGetOrderbookArgsSchema.parse(args);
      const result = await clients.polymarket.getOrderBook(params.token_id);
      return result;
    },
  },

  polymarket_get_price: {
    name: "polymarket_get_price",
    description:
      "Get the current best price for a Polymarket outcome token. Specify BUY or SELL side.",
    schema: PolymarketGetPriceArgsSchema,
    handler: async (clients, args) => {
      const params = PolymarketGetPriceArgsSchema.parse(args);
      const price = await clients.polymarket.getPrice(
        params.token_id,
        params.side,
      );
      const midpoint = await clients.polymarket.getMidpoint(params.token_id);
      return { price, midpoint, side: params.side };
    },
  },

  polymarket_get_price_history: {
    name: "polymarket_get_price_history",
    description:
      "Get historical price data for a Polymarket outcome token. Returns time series of price points. Defaults to last 24 hours with hourly resolution.",
    schema: PolymarketGetPriceHistoryArgsSchema,
    handler: async (clients, args) => {
      const params = PolymarketGetPriceHistoryArgsSchema.parse(args);
      const result = await clients.polymarket.getPriceHistory({
        tokenId: params.token_id,
        fidelity: params.fidelity,
        startTs: params.startTs,
        endTs: params.endTs,
      });
      return result;
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
