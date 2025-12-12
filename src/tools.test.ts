import { describe, test, expect, beforeAll } from "bun:test";
import { KalshiClient } from "./clients/kalshi.js";
import { PolymarketClient } from "./clients/polymarket.js";
import { TOOLS, type ToolClients } from "./tools.js";

/**
 * Integration tests for MCP tool handlers
 *
 * These tests verify that tool handlers correctly invoke their
 * respective clients and return properly structured data.
 */

describe("Kalshi Tool Integration Tests", () => {
  const clients: ToolClients = {
    kalshi: new KalshiClient(),
    polymarket: new PolymarketClient(),
  };

  describe("kalshi_list_markets", () => {
    test("should list markets without filters", async () => {
      const tool = TOOLS.kalshi_list_markets!;
      const result = await tool.handler(clients, {});

      expect(result).toBeDefined();
      expect(Array.isArray((result as { markets: unknown[] }).markets)).toBe(
        true,
      );
    });

    test("should list open markets with limit", async () => {
      const tool = TOOLS.kalshi_list_markets!;
      const result = await tool.handler(clients, {
        status: "open",
        limit: 5,
      });

      expect(result).toBeDefined();
      const markets = (result as { markets: unknown[] }).markets;
      expect(Array.isArray(markets)).toBe(true);
      expect(markets.length).toBeLessThanOrEqual(5);
    });

    test("should filter by event ticker", async () => {
      const tool = TOOLS.kalshi_list_markets!;

      // First get any open market to find a valid event ticker
      const listResult = (await tool.handler(clients, {
        status: "open",
        limit: 1,
      })) as { markets: Array<{ event_ticker: string }> };

      if (listResult.markets.length > 0) {
        const eventTicker = listResult.markets[0]!.event_ticker;

        const filteredResult = await tool.handler(clients, {
          eventTicker,
          limit: 10,
        });

        expect(filteredResult).toBeDefined();
        const markets = (filteredResult as { markets: unknown[] }).markets;
        expect(Array.isArray(markets)).toBe(true);
      }
    });
  });

  describe("kalshi_get_market", () => {
    test("should get market details by ticker", async () => {
      // First get a valid ticker
      const listTool = TOOLS.kalshi_list_markets!;
      const listResult = (await listTool.handler(clients, {
        status: "open",
        limit: 1,
      })) as { markets: Array<{ ticker: string }> };

      if (listResult.markets.length > 0) {
        const ticker = listResult.markets[0]!.ticker;

        const tool = TOOLS.kalshi_get_market!;
        const result = (await tool.handler(clients, { ticker })) as {
          market: { ticker: string };
        };

        expect(result).toBeDefined();
        expect(result.market).toBeDefined();
        expect(result.market.ticker).toBe(ticker);
      }
    });
  });

  describe("kalshi_get_orderbook", () => {
    test("should get orderbook for a market", async () => {
      // Get a valid open market ticker
      const listTool = TOOLS.kalshi_list_markets!;
      const listResult = (await listTool.handler(clients, {
        status: "open",
        limit: 1,
      })) as { markets: Array<{ ticker: string }> };

      if (listResult.markets.length > 0) {
        const ticker = listResult.markets[0]!.ticker;

        const tool = TOOLS.kalshi_get_orderbook!;
        const result = (await tool.handler(clients, { ticker })) as {
          orderbook: { yes: unknown[] | null; no: unknown[] | null };
        };

        expect(result).toBeDefined();
        expect(result.orderbook).toBeDefined();
        // Orderbook can be null if no active orders
        expect(
          result.orderbook.yes === null || Array.isArray(result.orderbook.yes),
        ).toBe(true);
        expect(
          result.orderbook.no === null || Array.isArray(result.orderbook.no),
        ).toBe(true);
      }
    });
  });

  describe("kalshi_get_trades", () => {
    test("should get recent trades without filter", async () => {
      const tool = TOOLS.kalshi_get_trades!;
      const result = (await tool.handler(clients, { limit: 5 })) as {
        trades: unknown[];
      };

      expect(result).toBeDefined();
      expect(Array.isArray(result.trades)).toBe(true);
      expect(result.trades.length).toBeLessThanOrEqual(5);
    });

    test("should get trades for specific market", async () => {
      // Get a valid ticker with recent trades
      const listTool = TOOLS.kalshi_list_markets!;
      const listResult = (await listTool.handler(clients, {
        status: "open",
        limit: 1,
      })) as { markets: Array<{ ticker: string }> };

      if (listResult.markets.length > 0) {
        const ticker = listResult.markets[0]!.ticker;

        const tool = TOOLS.kalshi_get_trades!;
        const result = (await tool.handler(clients, {
          ticker,
          limit: 10,
        })) as { trades: unknown[] };

        expect(result).toBeDefined();
        expect(Array.isArray(result.trades)).toBe(true);
      }
    });
  });

  describe("kalshi_get_series", () => {
    test("should get series metadata", async () => {
      // Get a valid series ticker
      const listTool = TOOLS.kalshi_list_markets!;
      const listResult = (await listTool.handler(clients, {
        limit: 100,
      })) as { markets: Array<{ series_ticker?: string }> };

      // Find a market with series_ticker (not all markets have it)
      const marketWithSeries = listResult.markets.find(
        (m) => m.series_ticker !== undefined,
      );

      if (marketWithSeries?.series_ticker) {
        const tool = TOOLS.kalshi_get_series!;
        const result = (await tool.handler(clients, {
          seriesTicker: marketWithSeries.series_ticker,
        })) as {
          series: { ticker: string };
        };

        expect(result).toBeDefined();
        expect(result.series).toBeDefined();
        expect(result.series.ticker).toBe(marketWithSeries.series_ticker);
      }
    });
  });

  describe("kalshi_get_event", () => {
    test("should get event metadata", async () => {
      // Get a valid event ticker
      const listTool = TOOLS.kalshi_list_markets!;
      const listResult = (await listTool.handler(clients, {
        limit: 1,
      })) as { markets: Array<{ event_ticker: string }> };

      if (listResult.markets.length > 0) {
        const eventTicker = listResult.markets[0]!.event_ticker;

        const tool = TOOLS.kalshi_get_event!;
        const result = (await tool.handler(clients, { eventTicker })) as {
          event: { event_ticker: string };
        };

        expect(result).toBeDefined();
        expect(result.event).toBeDefined();
        expect(result.event.event_ticker).toBe(eventTicker);
      }
    });
  });
});

describe("Polymarket Tool Integration Tests", () => {
  const clients: ToolClients = {
    kalshi: new KalshiClient(),
    polymarket: new PolymarketClient(),
  };

  let testTokenId: string;
  let testMarketSlug: string;
  let testEventSlug: string;

  beforeAll(async () => {
    // Get test data from live API
    const listTool = TOOLS.polymarket_list_markets!;
    const result = (await listTool.handler(clients, {
      closed: false,
      limit: 1,
    })) as { markets: Array<{ slug: string; clobTokenIds?: string }> };

    if (result.markets.length > 0) {
      const market = result.markets[0]!;
      testMarketSlug = market.slug;

      if (market.clobTokenIds) {
        try {
          const tokenIds = JSON.parse(market.clobTokenIds as string);
          if (Array.isArray(tokenIds) && tokenIds.length > 0) {
            testTokenId = tokenIds[0];
          }
        } catch {
          // Fallback
        }
      }
    }

    // Get a test event
    const eventsTool = TOOLS.polymarket_list_events!;
    const eventsResult = (await eventsTool.handler(clients, {
      closed: false,
      limit: 1,
    })) as { events: Array<{ slug: string }> };

    if (eventsResult.events.length > 0) {
      testEventSlug = eventsResult.events[0]!.slug;
    }
  });

  describe("polymarket_list_markets", () => {
    test("should list markets without filters", async () => {
      const tool = TOOLS.polymarket_list_markets!;
      const result = await tool.handler(clients, {});

      expect(result).toBeDefined();
      expect(Array.isArray((result as { markets: unknown[] }).markets)).toBe(
        true,
      );
    });

    test("should list active markets with limit", async () => {
      const tool = TOOLS.polymarket_list_markets!;
      const result = await tool.handler(clients, {
        closed: false,
        limit: 5,
      });

      expect(result).toBeDefined();
      const markets = (result as { markets: unknown[] }).markets;
      expect(Array.isArray(markets)).toBe(true);
      expect(markets.length).toBeLessThanOrEqual(5);
    });
  });

  describe("polymarket_get_market", () => {
    test("should get market details by slug", async () => {
      if (!testMarketSlug) {
        console.log("Skipping: no test market available");
        return;
      }

      const tool = TOOLS.polymarket_get_market!;
      const result = (await tool.handler(clients, {
        slug: testMarketSlug,
      })) as { slug: string; question: string };

      expect(result).toBeDefined();
      expect(result.slug).toBe(testMarketSlug);
      expect(result.question).toBeDefined();
    });
  });

  describe("polymarket_list_events", () => {
    test("should list events", async () => {
      const tool = TOOLS.polymarket_list_events!;
      const result = await tool.handler(clients, { limit: 5 });

      expect(result).toBeDefined();
      expect(Array.isArray((result as { events: unknown[] }).events)).toBe(
        true,
      );
    });
  });

  describe("polymarket_get_event", () => {
    test("should get event details by slug", async () => {
      if (!testEventSlug) {
        console.log("Skipping: no test event available");
        return;
      }

      const tool = TOOLS.polymarket_get_event!;
      const result = (await tool.handler(clients, {
        slug: testEventSlug,
      })) as { slug: string; title: string };

      expect(result).toBeDefined();
      expect(result.slug).toBe(testEventSlug);
      expect(result.title).toBeDefined();
    });
  });

  describe("polymarket_list_tags", () => {
    test("should list available tags", async () => {
      const tool = TOOLS.polymarket_list_tags!;
      const result = (await tool.handler(clients, {})) as { tags: unknown[] };

      expect(result).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    });
  });

  describe("polymarket_get_orderbook", () => {
    test("should get orderbook for a token", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const tool = TOOLS.polymarket_get_orderbook!;
      const result = (await tool.handler(clients, {
        token_id: testTokenId,
      })) as { bids: unknown[]; asks: unknown[] };

      expect(result).toBeDefined();
      expect(Array.isArray(result.bids)).toBe(true);
      expect(Array.isArray(result.asks)).toBe(true);
    });
  });

  describe("polymarket_get_price", () => {
    test("should get price for BUY side", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const tool = TOOLS.polymarket_get_price!;
      const result = (await tool.handler(clients, {
        token_id: testTokenId,
        side: "BUY",
      })) as { price: string; midpoint: string; side: string };

      expect(result).toBeDefined();
      expect(result.price).toBeDefined();
      expect(result.midpoint).toBeDefined();
      expect(result.side).toBe("BUY");
    });
  });

  describe("polymarket_get_price_history", () => {
    test("should get price history for a token", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const tool = TOOLS.polymarket_get_price_history!;
      const result = (await tool.handler(clients, {
        token_id: testTokenId,
        fidelity: 60,
      })) as { history: unknown[] };

      expect(result).toBeDefined();
      expect(Array.isArray(result.history)).toBe(true);
    });
  });
});
