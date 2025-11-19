import { describe, test, expect } from "bun:test";
import { KalshiClient } from "./clients/kalshi.js";
import { TOOLS } from "./tools.js";

describe("Tool Integration Tests", () => {
  const client = new KalshiClient();

  describe("kalshi_list_markets", () => {
    test("should list markets without filters", async () => {
      const tool = TOOLS.kalshi_list_markets!;
      const result = await tool.handler(client, {});

      expect(result).toBeDefined();
      expect(Array.isArray((result as { markets: unknown[] }).markets)).toBe(
        true,
      );
    });

    test("should list open markets with limit", async () => {
      const tool = TOOLS.kalshi_list_markets!;
      const result = await tool.handler(client, {
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
      const listResult = (await tool.handler(client, {
        status: "open",
        limit: 1,
      })) as { markets: Array<{ event_ticker: string }> };

      if (listResult.markets.length > 0) {
        const eventTicker = listResult.markets[0]!.event_ticker;

        const filteredResult = await tool.handler(client, {
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
      const listResult = (await listTool.handler(client, {
        status: "open",
        limit: 1,
      })) as { markets: Array<{ ticker: string }> };

      if (listResult.markets.length > 0) {
        const ticker = listResult.markets[0]!.ticker;

        const tool = TOOLS.kalshi_get_market!;
        const result = (await tool.handler(client, { ticker })) as {
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
      const listResult = (await listTool.handler(client, {
        status: "open",
        limit: 1,
      })) as { markets: Array<{ ticker: string }> };

      if (listResult.markets.length > 0) {
        const ticker = listResult.markets[0]!.ticker;

        const tool = TOOLS.kalshi_get_orderbook!;
        const result = (await tool.handler(client, { ticker })) as {
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
      const result = (await tool.handler(client, { limit: 5 })) as {
        trades: unknown[];
      };

      expect(result).toBeDefined();
      expect(Array.isArray(result.trades)).toBe(true);
      expect(result.trades.length).toBeLessThanOrEqual(5);
    });

    test("should get trades for specific market", async () => {
      // Get a valid ticker with recent trades
      const listTool = TOOLS.kalshi_list_markets!;
      const listResult = (await listTool.handler(client, {
        status: "open",
        limit: 1,
      })) as { markets: Array<{ ticker: string }> };

      if (listResult.markets.length > 0) {
        const ticker = listResult.markets[0]!.ticker;

        const tool = TOOLS.kalshi_get_trades!;
        const result = (await tool.handler(client, {
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
      const listResult = (await listTool.handler(client, {
        limit: 100,
      })) as { markets: Array<{ series_ticker?: string }> };

      // Find a market with series_ticker (not all markets have it)
      const marketWithSeries = listResult.markets.find(
        (m) => m.series_ticker !== undefined,
      );

      if (marketWithSeries?.series_ticker) {
        const tool = TOOLS.kalshi_get_series!;
        const result = (await tool.handler(client, {
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
      const listResult = (await listTool.handler(client, {
        limit: 1,
      })) as { markets: Array<{ event_ticker: string }> };

      if (listResult.markets.length > 0) {
        const eventTicker = listResult.markets[0]!.event_ticker;

        const tool = TOOLS.kalshi_get_event!;
        const result = (await tool.handler(client, { eventTicker })) as {
          event: { event_ticker: string };
        };

        expect(result).toBeDefined();
        expect(result.event).toBeDefined();
        expect(result.event.event_ticker).toBe(eventTicker);
      }
    });
  });
});
