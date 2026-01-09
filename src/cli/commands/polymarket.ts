/**
 * Polymarket CLI Commands
 *
 * All Polymarket-related commands for the CLI.
 * Reuses the PolymarketClient and PolymarketSearchService from the MCP server.
 */

import { z } from "zod";
import {
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
} from "../../validation.js";
import { getContext } from "../context.js";
import { getDefaultColumns } from "../output.js";
import type { CommandDefinition } from "../parser.js";

// ============================================================
// Markets Commands
// ============================================================

const marketsListCommand: CommandDefinition = {
  name: "list",
  description: "List available markets",
  aliases: ["ls"],
  schema: PolymarketListMarketsArgsSchema,
  defaultColumns: getDefaultColumns("polymarketMarket"),
  examples: [
    "pm poly markets list",
    "pm poly markets list --closed false --limit 10",
    "pm poly markets list --tag-id politics",
    "pm poly markets list --json --jq '.[] | {slug, question}'",
  ],
  handler: async (args) => {
    const params = PolymarketListMarketsArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.polymarket.listMarkets(params);
    return result.markets;
  },
};

const marketsGetCommand: CommandDefinition = {
  name: "get",
  description: "Get details for a specific market by slug",
  aliases: ["show", "info"],
  schema: PolymarketGetMarketArgsSchema,
  defaultColumns: getDefaultColumns("polymarketMarketDetail"),
  examples: [
    "pm poly markets get --slug will-bitcoin-hit-100k",
    "pm poly markets get --slug us-presidential-election-2024 --json",
    "pm poly markets get --slug will-trump-win --fields slug,question,outcomePrices",
  ],
  handler: async (args) => {
    const params = PolymarketGetMarketArgsSchema.parse(args);
    const ctx = await getContext();
    return ctx.polymarket.getMarket(params.slug);
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
// Events Commands
// ============================================================

const eventsListCommand: CommandDefinition = {
  name: "list",
  description: "List events",
  aliases: ["ls"],
  schema: PolymarketListEventsArgsSchema,
  defaultColumns: getDefaultColumns("polymarketEvent"),
  examples: [
    "pm poly events list",
    "pm poly events list --closed false --limit 10",
    "pm poly events list --tag-id crypto",
  ],
  handler: async (args) => {
    const params = PolymarketListEventsArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.polymarket.listEvents(params);
    return result.events;
  },
};

const eventsGetCommand: CommandDefinition = {
  name: "get",
  description: "Get event details by slug",
  aliases: ["show", "info"],
  schema: PolymarketGetEventArgsSchema,
  defaultColumns: getDefaultColumns("polymarketEvent"),
  examples: [
    "pm poly events get --slug 2024-us-presidential-election",
    "pm poly events get --slug bitcoin-predictions --json",
  ],
  handler: async (args) => {
    const params = PolymarketGetEventArgsSchema.parse(args);
    const ctx = await getContext();
    return ctx.polymarket.getEvent(params.slug);
  },
};

const eventsCommand: CommandDefinition = {
  name: "events",
  description: "Event operations",
  aliases: ["event", "e"],
  schema: z.object({}),
  subcommands: {
    list: eventsListCommand,
    get: eventsGetCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: list, get");
  },
};

// ============================================================
// Tags Commands
// ============================================================

const tagsListCommand: CommandDefinition = {
  name: "list",
  description: "List available tags/categories",
  aliases: ["ls"],
  schema: PolymarketListTagsArgsSchema,
  defaultColumns: getDefaultColumns("polymarketTag"),
  examples: [
    "pm poly tags list",
    "pm poly tags list --json",
    "pm poly tags list --fields id,label",
  ],
  handler: async () => {
    const ctx = await getContext();
    const result = await ctx.polymarket.listTags();
    return result.tags;
  },
};

const tagsCommand: CommandDefinition = {
  name: "tags",
  description: "Tag/category operations",
  aliases: ["tag", "categories", "cat"],
  schema: z.object({}),
  subcommands: {
    list: tagsListCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: list");
  },
};

// ============================================================
// Orderbook Commands
// ============================================================

const orderbookGetCommand: CommandDefinition = {
  name: "get",
  description: "Get orderbook for a token (includes bids and asks)",
  aliases: ["show"],
  schema: PolymarketGetOrderbookArgsSchema,
  defaultColumns: getDefaultColumns("polymarketOrderbook"),
  examples: [
    "pm poly orderbook get --token-id 12345678901234567890",
    "pm poly orderbook get --token-id <token_id_from_market> --json",
  ],
  handler: async (args) => {
    const params = PolymarketGetOrderbookArgsSchema.parse(args);
    const ctx = await getContext();
    return ctx.polymarket.getOrderBook(params.token_id);
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
// Price Commands
// ============================================================

const priceGetCommand: CommandDefinition = {
  name: "get",
  description: "Get current price for a token",
  aliases: ["show"],
  schema: PolymarketGetPriceArgsSchema,
  defaultColumns: getDefaultColumns("polymarketPrice"),
  examples: [
    "pm poly price get --token-id 12345 --side BUY",
    "pm poly price get --token-id 12345 --side SELL --json",
  ],
  handler: async (args) => {
    const params = PolymarketGetPriceArgsSchema.parse(args);
    const ctx = await getContext();
    const price = await ctx.polymarket.getPrice(params.token_id, params.side);
    const midpoint = await ctx.polymarket.getMidpoint(params.token_id);
    return { price, midpoint, side: params.side };
  },
};

const priceHistoryCommand: CommandDefinition = {
  name: "history",
  description: "Get historical price data for a token",
  aliases: ["hist", "h"],
  schema: PolymarketGetPriceHistoryArgsSchema,
  defaultColumns: getDefaultColumns("polymarketPriceHistory"),
  examples: [
    "pm poly price history --token-id 12345",
    "pm poly price history --token-id 12345 --fidelity 60 --json",
    "pm poly price history --token-id 12345 --start-ts 1704067200 --end-ts 1704153600",
  ],
  handler: async (args) => {
    const params = PolymarketGetPriceHistoryArgsSchema.parse(args);
    const ctx = await getContext();
    const result = await ctx.polymarket.getPriceHistory({
      tokenId: params.token_id,
      fidelity: params.fidelity,
      startTs: params.startTs,
      endTs: params.endTs,
    });
    return result.history;
  },
};

const priceCommand: CommandDefinition = {
  name: "price",
  description: "Price operations",
  aliases: ["prices", "p"],
  schema: z.object({}),
  subcommands: {
    get: priceGetCommand,
    history: priceHistoryCommand,
  },
  handler: async () => {
    throw new Error("Please specify a subcommand: get, history");
  },
};

// ============================================================
// Search Commands
// ============================================================

const searchAllCommand: CommandDefinition = {
  name: "all",
  description: "Search across events and markets",
  aliases: ["a"],
  schema: PolymarketSearchQuerySchema,
  defaultColumns: getDefaultColumns("polymarketSearch"),
  examples: [
    'pm poly search all --query "bitcoin"',
    'pm poly search all --query "election" --limit 5',
    'pm poly search all --query "crypto" --json',
  ],
  handler: async (args) => {
    const params = PolymarketSearchQuerySchema.parse(args);
    const ctx = await getContext();
    return ctx.polymarketSearch.search(params.query, params.limit);
  },
};

const searchEventsCommand: CommandDefinition = {
  name: "events",
  description: "Search events only",
  aliases: ["e"],
  schema: PolymarketSearchQuerySchema,
  defaultColumns: ["slug", "title", "score"],
  examples: [
    'pm poly search events --query "election"',
    'pm poly search events --query "sports" --limit 10',
  ],
  handler: async (args) => {
    const params = PolymarketSearchQuerySchema.parse(args);
    const ctx = await getContext();
    const results = await ctx.polymarketSearch.searchEvents(
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
  schema: PolymarketSearchQuerySchema,
  defaultColumns: ["slug", "question", "score"],
  examples: [
    'pm poly search markets --query "bitcoin price"',
    'pm poly search markets --query "trump" --json',
  ],
  handler: async (args) => {
    const params = PolymarketSearchQuerySchema.parse(args);
    const ctx = await getContext();
    const results = await ctx.polymarketSearch.searchMarkets(
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
  schema: PolymarketCacheStatsSchema,
  defaultColumns: [
    "status",
    "events_count",
    "markets_count",
    "cache_age_seconds",
    "ttl_expiry_time",
  ],
  examples: [
    "pm poly cache stats",
    "pm poly cache stats --refresh",
    "pm poly cache stats --json",
  ],
  handler: async (args) => {
    const params = PolymarketCacheStatsSchema.parse(args);
    const ctx = await getContext();
    if (params.refresh) {
      await ctx.polymarketSearch.refresh();
    }
    return ctx.polymarketSearch.getStats();
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
// Root Polymarket Command
// ============================================================

export const polymarketCommand: CommandDefinition = {
  name: "polymarket",
  description: "Polymarket prediction market commands",
  aliases: ["poly", "pm", "p"],
  schema: z.object({}),
  subcommands: {
    markets: marketsCommand,
    events: eventsCommand,
    tags: tagsCommand,
    orderbook: orderbookCommand,
    price: priceCommand,
    search: searchCommand,
    cache: cacheCommand,
  },
  examples: [
    "pm poly markets list --limit 5",
    "pm poly markets get --slug will-bitcoin-hit-100k",
    'pm poly search all --query "bitcoin"',
    "pm poly price get --token-id 12345 --side BUY",
  ],
  handler: async () => {
    throw new Error("Please specify a subcommand");
  },
};
