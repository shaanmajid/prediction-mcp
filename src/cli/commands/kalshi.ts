/**
 * Kalshi CLI Commands
 *
 * All Kalshi-related commands for the CLI.
 * Reuses the KalshiClient and KalshiSearchService from the MCP server.
 */

import { z } from "zod";
import {
  CacheStatsSchema,
  GetBalanceArgsSchema,
  GetEventArgsSchema,
  GetMarketArgsSchema,
  GetOrderbookArgsSchema,
  GetPositionsArgsSchema,
  GetSeriesArgsSchema,
  GetTradesArgsSchema,
  KalshiCancelOrderArgsSchema,
  KalshiCreateOrderArgsSchema,
  KalshiGetFillsArgsSchema,
  KalshiGetOrderArgsSchema,
  KalshiGetPriceHistoryArgsSchema,
  KalshiGetSettlementsArgsSchema,
  KalshiListOrdersArgsSchema,
  ListMarketsArgsSchema,
  SearchQuerySchema,
} from "../../validation.js";
import { getContext, isKalshiAuthenticated } from "../context.js";
import { getDefaultColumns } from "../output.js";
import type { CommandDefinition } from "../parser.js";

// ============================================================
// Helper to check authentication
// ============================================================

function requireAuth(): void {
  if (!isKalshiAuthenticated()) {
    throw new Error(
      "Kalshi authentication required. Set KALSHI_API_KEY and KALSHI_PRIVATE_KEY_PATH.",
    );
  }
}

// ============================================================
// Markets Commands
// ============================================================

const marketsListCommand: CommandDefinition = {
  name: "list",
  description: "List available markets",
  aliases: ["ls"],
  schema: ListMarketsArgsSchema,
  defaultColumns: getDefaultColumns("kalshiMarket"),
  examples: [
    "pm kalshi markets list",
    "pm kalshi markets list --status open --limit 10",
    "pm kalshi markets list --event-ticker KXPRESIDENT",
    "pm kalshi markets list --json --jq '.[] | {ticker, title}'",
  ],
  handler: async (args, output) => {
    const params = ListMarketsArgsSchema.parse(args);
    const ctx = await getContext({ demo: output.quiet ? false : undefined });
    const result = await ctx.kalshi.listMarkets(params);
    return result.data.markets;
  },
};

const marketsGetCommand: CommandDefinition = {
  name: "get",
  description: "Get details for a specific market",
  aliases: ["show", "info"],
  schema: GetMarketArgsSchema,
  defaultColumns: getDefaultColumns("kalshiMarketDetail"),
  examples: [
    "pm kalshi markets get --ticker KXBTC-25JAN01",
    "pm kalshi markets get --ticker KXPRESIDENT --json",
    "pm kalshi markets get --ticker KXPRESIDENT --fields ticker,title,yes_price,volume",
  ],
  handler: async (args) => {
    const params = GetMarketArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.getMarketDetails(params.ticker);
    return result.data.market;
  },
};

const marketsCommand: CommandDefinition = {
  name: "markets",
  description: "Market operations",
  aliases: ["market", "m"],
  schema: z.object({}),
  subcommands: {
    list: marketsListCommand,
    get: marketsGetCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: list, get");
  },
};

// ============================================================
// Orderbook Commands
// ============================================================

const orderbookGetCommand: CommandDefinition = {
  name: "get",
  description:
    "Get orderbook for a market (bids only due to binary reciprocity)",
  aliases: ["show"],
  schema: GetOrderbookArgsSchema,
  defaultColumns: getDefaultColumns("kalshiOrderbook"),
  examples: [
    "pm kalshi orderbook get --ticker KXBTC-25JAN01",
    "pm kalshi orderbook get --ticker KXPRESIDENT --json",
  ],
  handler: async (args) => {
    const params = GetOrderbookArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.getOrderBook(params.ticker);
    return result.data.orderbook;
  },
};

const orderbookCommand: CommandDefinition = {
  name: "orderbook",
  description: "Orderbook operations",
  aliases: ["ob"],
  schema: z.object({}),
  subcommands: {
    get: orderbookGetCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: get");
  },
};

// ============================================================
// Trades Commands
// ============================================================

const tradesListCommand: CommandDefinition = {
  name: "list",
  description: "List recent trades",
  aliases: ["ls"],
  schema: GetTradesArgsSchema,
  defaultColumns: getDefaultColumns("kalshiTrade"),
  examples: [
    "pm kalshi trades list",
    "pm kalshi trades list --ticker KXBTC-25JAN01 --limit 20",
    "pm kalshi trades list --json",
  ],
  handler: async (args) => {
    const params = GetTradesArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.getTrades(params);
    return result.data.trades;
  },
};

const tradesCommand: CommandDefinition = {
  name: "trades",
  description: "Trade history operations",
  aliases: ["trade"],
  schema: z.object({}),
  subcommands: {
    list: tradesListCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: list");
  },
};

// ============================================================
// Events Commands
// ============================================================

const eventsGetCommand: CommandDefinition = {
  name: "get",
  description: "Get event details",
  aliases: ["show", "info"],
  schema: GetEventArgsSchema,
  defaultColumns: getDefaultColumns("kalshiEvent"),
  examples: [
    "pm kalshi events get --event-ticker KXPRESIDENT",
    "pm kalshi events get --event-ticker KXPRESIDENT --json",
  ],
  handler: async (args) => {
    const params = GetEventArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.getEvent(params.eventTicker);
    return result.data.event;
  },
};

const eventsCommand: CommandDefinition = {
  name: "events",
  description: "Event operations",
  aliases: ["event", "e"],
  schema: z.object({}),
  subcommands: {
    get: eventsGetCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: get");
  },
};

// ============================================================
// Series Commands
// ============================================================

const seriesGetCommand: CommandDefinition = {
  name: "get",
  description: "Get series metadata",
  aliases: ["show", "info"],
  schema: GetSeriesArgsSchema,
  defaultColumns: getDefaultColumns("kalshiSeries"),
  examples: [
    "pm kalshi series get --series-ticker KXINX",
    "pm kalshi series get --series-ticker PRES-2024 --json",
  ],
  handler: async (args) => {
    const params = GetSeriesArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.getSeries(params.seriesTicker);
    return result.data.series;
  },
};

const seriesCommand: CommandDefinition = {
  name: "series",
  description: "Series operations",
  aliases: ["s"],
  schema: z.object({}),
  subcommands: {
    get: seriesGetCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: get");
  },
};

// ============================================================
// Search Commands
// ============================================================

const searchAllCommand: CommandDefinition = {
  name: "all",
  description: "Search across events and markets",
  aliases: ["a"],
  schema: SearchQuerySchema,
  defaultColumns: getDefaultColumns("kalshiSearch"),
  examples: [
    'pm kalshi search all --query "bitcoin"',
    'pm kalshi search all --query "election" --limit 5',
    'pm kalshi search all --query "trump" --json',
  ],
  handler: async (args) => {
    const params = SearchQuerySchema.parse(args);
    const ctx = await getContext();
    return ctx.kalshiSearch.search(params.query, params.limit);
  },
};

const searchEventsCommand: CommandDefinition = {
  name: "events",
  description: "Search events only",
  aliases: ["e"],
  schema: SearchQuerySchema,
  defaultColumns: ["event_ticker", "title", "score"],
  examples: [
    'pm kalshi search events --query "election"',
    'pm kalshi search events --query "crypto" --limit 10',
  ],
  handler: async (args) => {
    const params = SearchQuerySchema.parse(args);
    const ctx = await getContext();
    const results = await ctx.kalshiSearch.searchEvents(
      params.query,
      params.limit,
    );
    return results.map((r) => ({ ...r.item, score: r.score }));
  },
};

const searchMarketsCommand: CommandDefinition = {
  name: "markets",
  description: "Search markets only",
  aliases: ["m"],
  schema: SearchQuerySchema,
  defaultColumns: ["ticker", "title", "yes_price", "score"],
  examples: [
    'pm kalshi search markets --query "bitcoin price"',
    'pm kalshi search markets --query "fed rate" --json',
  ],
  handler: async (args) => {
    const params = SearchQuerySchema.parse(args);
    const ctx = await getContext();
    const results = await ctx.kalshiSearch.searchMarkets(
      params.query,
      params.limit,
    );
    return results.map((r) => ({ ...r.item, score: r.score }));
  },
};

const searchCommand: CommandDefinition = {
  name: "search",
  description: "Search operations",
  aliases: ["find", "q"],
  schema: z.object({}),
  subcommands: {
    all: searchAllCommand,
    events: searchEventsCommand,
    markets: searchMarketsCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: all, events, markets");
  },
};

// ============================================================
// Cache Commands
// ============================================================

const cacheStatsCommand: CommandDefinition = {
  name: "stats",
  description: "Get search cache statistics",
  aliases: ["info"],
  schema: CacheStatsSchema,
  defaultColumns: [
    "status",
    "events_count",
    "markets_count",
    "cache_age_seconds",
    "ttl_expiry_time",
  ],
  examples: [
    "pm kalshi cache stats",
    "pm kalshi cache stats --refresh",
    "pm kalshi cache stats --json",
  ],
  handler: async (args) => {
    const params = CacheStatsSchema.parse(args);
    const ctx = await getContext();
    if (params.refresh) {
      await ctx.kalshiSearch.refresh();
    }
    return ctx.kalshiSearch.getStats();
  },
};

const cacheCommand: CommandDefinition = {
  name: "cache",
  description: "Cache operations",
  aliases: ["c"],
  schema: z.object({}),
  subcommands: {
    stats: cacheStatsCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: stats");
  },
};

// ============================================================
// Price History Commands
// ============================================================

const priceHistoryCommand: CommandDefinition = {
  name: "price-history",
  description: "Get historical candlestick data for a market",
  aliases: ["history", "candles", "ohlcv"],
  schema: KalshiGetPriceHistoryArgsSchema,
  defaultColumns: getDefaultColumns("kalshiPriceHistory"),
  examples: [
    "pm kalshi price-history --series-ticker KXINX --ticker KXINX-25DEC31-T2000 --period-interval 60",
    "pm kalshi price-history --series-ticker KXINX --ticker KXINX-25DEC31-T2000 --start-ts 1704067200 --end-ts 1704153600 --period-interval 1440",
  ],
  handler: async (args) => {
    const params = KalshiGetPriceHistoryArgsSchema.parse(args);
    const ctx = await getContext();
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;

    const result = await ctx.kalshi.getMarketCandlesticks({
      seriesTicker: params.series_ticker,
      ticker: params.ticker,
      startTs: params.start_ts ?? oneDayAgo,
      endTs: params.end_ts ?? now,
      periodInterval: params.period_interval,
    });
    return result.data.candlesticks;
  },
};

// ============================================================
// Portfolio Commands (Auth Required)
// ============================================================

const balanceCommand: CommandDefinition = {
  name: "balance",
  description: "Get account balance (requires auth)",
  aliases: ["bal"],
  schema: GetBalanceArgsSchema,
  defaultColumns: getDefaultColumns("kalshiBalance"),
  examples: ["pm kalshi balance", "pm kalshi balance --json"],
  handler: async () => {
    requireAuth();
    const ctx = await getContext();
    const result = await ctx.kalshi.getBalance();
    return result.data;
  },
};

const positionsListCommand: CommandDefinition = {
  name: "list",
  description: "List open positions (requires auth)",
  aliases: ["ls"],
  schema: GetPositionsArgsSchema,
  defaultColumns: getDefaultColumns("kalshiPosition"),
  examples: [
    "pm kalshi positions list",
    "pm kalshi positions list --event-ticker KXPRESIDENT",
    "pm kalshi positions list --json",
  ],
  handler: async (args) => {
    requireAuth();
    const params = GetPositionsArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.getPositions(params);
    return result.data.event_positions;
  },
};

const positionsCommand: CommandDefinition = {
  name: "positions",
  description: "Portfolio position operations (requires auth)",
  aliases: ["pos", "portfolio"],
  schema: z.object({}),
  subcommands: {
    list: positionsListCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: list");
  },
};

// ============================================================
// Orders Commands (Auth Required)
// ============================================================

const ordersListCommand: CommandDefinition = {
  name: "list",
  description: "List orders (requires auth)",
  aliases: ["ls"],
  schema: KalshiListOrdersArgsSchema,
  defaultColumns: getDefaultColumns("kalshiOrder"),
  examples: [
    "pm kalshi orders list",
    "pm kalshi orders list --status resting",
    "pm kalshi orders list --ticker KXBTC-25JAN01",
  ],
  handler: async (args) => {
    requireAuth();
    const params = KalshiListOrdersArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.listOrders(params);
    return result.data.orders;
  },
};

const ordersGetCommand: CommandDefinition = {
  name: "get",
  description: "Get order details (requires auth)",
  aliases: ["show"],
  schema: KalshiGetOrderArgsSchema,
  defaultColumns: getDefaultColumns("kalshiOrder"),
  examples: ["pm kalshi orders get --order-id abc123"],
  handler: async (args) => {
    requireAuth();
    const params = KalshiGetOrderArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.getOrder(params.orderId);
    return result.data.order;
  },
};

const ordersCreateCommand: CommandDefinition = {
  name: "create",
  description: "Create a new order (requires auth) - WARNING: real money",
  aliases: ["new", "place"],
  schema: KalshiCreateOrderArgsSchema,
  defaultColumns: getDefaultColumns("kalshiOrder"),
  examples: [
    "pm kalshi orders create --ticker KXBTC-25JAN01 --action buy --side yes --count 10 --yes-price 50",
    "pm kalshi orders create --ticker KXBTC-25JAN01 --action sell --side no --count 5 --no-price 45 --type limit",
  ],
  handler: async (args) => {
    requireAuth();
    const params = KalshiCreateOrderArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.createOrder(params);
    return result.data.order;
  },
};

const ordersCancelCommand: CommandDefinition = {
  name: "cancel",
  description: "Cancel an order (requires auth)",
  aliases: ["delete", "rm"],
  schema: KalshiCancelOrderArgsSchema,
  defaultColumns: getDefaultColumns("kalshiOrder"),
  examples: ["pm kalshi orders cancel --order-id abc123"],
  handler: async (args) => {
    requireAuth();
    const params = KalshiCancelOrderArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.cancelOrder(params.orderId);
    return result.data.order;
  },
};

const ordersCommand: CommandDefinition = {
  name: "orders",
  description: "Order operations (requires auth)",
  aliases: ["order", "o"],
  schema: z.object({}),
  subcommands: {
    list: ordersListCommand,
    get: ordersGetCommand,
    create: ordersCreateCommand,
    cancel: ordersCancelCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: list, get, create, cancel");
  },
};

// ============================================================
// Fills Commands (Auth Required)
// ============================================================

const fillsListCommand: CommandDefinition = {
  name: "list",
  description: "List trade fills (requires auth)",
  aliases: ["ls"],
  schema: KalshiGetFillsArgsSchema,
  defaultColumns: getDefaultColumns("kalshiFill"),
  examples: [
    "pm kalshi fills list",
    "pm kalshi fills list --ticker KXBTC-25JAN01",
    "pm kalshi fills list --order-id abc123",
  ],
  handler: async (args) => {
    requireAuth();
    const params = KalshiGetFillsArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.getFills(params);
    return result.data.fills;
  },
};

const fillsCommand: CommandDefinition = {
  name: "fills",
  description: "Fill operations (requires auth)",
  aliases: ["fill"],
  schema: z.object({}),
  subcommands: {
    list: fillsListCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: list");
  },
};

// ============================================================
// Settlements Commands (Auth Required)
// ============================================================

const settlementsListCommand: CommandDefinition = {
  name: "list",
  description: "List settlements (requires auth)",
  aliases: ["ls"],
  schema: KalshiGetSettlementsArgsSchema,
  defaultColumns: getDefaultColumns("kalshiSettlement"),
  examples: [
    "pm kalshi settlements list",
    "pm kalshi settlements list --event-ticker KXPRESIDENT",
  ],
  handler: async (args) => {
    requireAuth();
    const params = KalshiGetSettlementsArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.kalshi.getSettlements(params);
    return result.data.settlements;
  },
};

const settlementsCommand: CommandDefinition = {
  name: "settlements",
  description: "Settlement operations (requires auth)",
  aliases: ["settlement", "settle"],
  schema: z.object({}),
  subcommands: {
    list: settlementsListCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: list");
  },
};

// ============================================================
// Root Kalshi Command
// ============================================================

export const kalshiCommand: CommandDefinition = {
  name: "kalshi",
  description: "Kalshi prediction market commands",
  aliases: ["k"],
  schema: z.object({}),
  subcommands: {
    markets: marketsCommand,
    orderbook: orderbookCommand,
    trades: tradesCommand,
    events: eventsCommand,
    series: seriesCommand,
    search: searchCommand,
    cache: cacheCommand,
    "price-history": priceHistoryCommand,
    balance: balanceCommand,
    positions: positionsCommand,
    orders: ordersCommand,
    fills: fillsCommand,
    settlements: settlementsCommand,
  },
  examples: [
    "pm kalshi markets list --status open --limit 5",
    "pm kalshi markets get --ticker KXPRESIDENT",
    'pm kalshi search all --query "bitcoin"',
    "pm kalshi balance",
  ],
  handler: async () => {
    throw new Error("Please specify a subcommand");
  },
};
