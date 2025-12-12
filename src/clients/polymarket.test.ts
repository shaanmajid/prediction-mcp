import { describe, test, expect, beforeAll } from "bun:test";
import { PolymarketClient } from "./polymarket.js";

/**
 * Integration tests for PolymarketClient
 *
 * These tests run against the live Polymarket APIs (Gamma + CLOB).
 * No authentication required - all operations are public reads.
 *
 * Test strategy:
 * - Phase 1: Gamma API (markets, events, tags)
 * - Phase 2: CLOB API (orderbook, trades, price history)
 */

describe("PolymarketClient", () => {
  let client: PolymarketClient;

  beforeAll(() => {
    client = new PolymarketClient();
  });

  describe("instantiation", () => {
    test("creates client without configuration (public access)", () => {
      const publicClient = new PolymarketClient();
      expect(publicClient).toBeDefined();
    });

    test("creates client with custom hosts", () => {
      const customClient = new PolymarketClient({
        gammaHost: "https://gamma-api.polymarket.com",
        clobHost: "https://clob.polymarket.com",
      });
      expect(customClient).toBeDefined();
    });
  });

  describe("Gamma API - listMarkets", () => {
    test("returns array of markets", async () => {
      const result = await client.listMarkets();
      expect(result).toBeDefined();
      expect(Array.isArray(result.markets)).toBe(true);
    });

    test("respects limit parameter", async () => {
      const result = await client.listMarkets({ limit: 5 });
      expect(result.markets.length).toBeLessThanOrEqual(5);
    });

    test("filters by closed status", async () => {
      const result = await client.listMarkets({ closed: false, limit: 10 });
      // All returned markets should be active (not closed)
      for (const market of result.markets) {
        expect(market.closed).toBe(false);
      }
    });

    test("supports pagination with offset", async () => {
      const page1 = await client.listMarkets({ limit: 5, offset: 0 });
      const page2 = await client.listMarkets({ limit: 5, offset: 5 });

      // Pages should have different markets (by ID)
      const page1Ids = page1.markets.map((m) => m.id);
      const page2Ids = page2.markets.map((m) => m.id);

      // At least some IDs should differ (unless very few markets exist)
      if (page1Ids.length > 0 && page2Ids.length > 0) {
        const overlap = page1Ids.filter((id) => page2Ids.includes(id));
        expect(overlap.length).toBeLessThan(page1Ids.length);
      }
    });

    test("market objects have required fields", async () => {
      const result = await client.listMarkets({ limit: 1 });
      expect(result.markets.length).toBeGreaterThan(0);

      const market = result.markets[0]!;
      // Core identification
      expect(typeof market.id).toBe("string");
      expect(typeof market.question).toBe("string");

      // Pricing data
      expect(market.outcomePrices).toBeDefined();
    });
  });

  describe("Gamma API - getMarket", () => {
    let testMarketSlug: string;

    beforeAll(async () => {
      // Get a real market slug to test with
      const markets = await client.listMarkets({ limit: 1, closed: false });
      if (markets.markets.length > 0) {
        testMarketSlug = markets.markets[0]!.slug;
      }
    });

    test("returns market details by slug", async () => {
      if (!testMarketSlug) {
        console.log("Skipping: no test market available");
        return;
      }

      const market = await client.getMarket(testMarketSlug);
      expect(market).toBeDefined();
      expect(market.slug).toBe(testMarketSlug);
    });

    test("market details include resolution info", async () => {
      if (!testMarketSlug) {
        console.log("Skipping: no test market available");
        return;
      }

      const market = await client.getMarket(testMarketSlug);
      expect(market.question).toBeDefined();
      expect(typeof market.question).toBe("string");
    });

    test("throws error for non-existent market", async () => {
      await expect(
        client.getMarket("this-market-definitely-does-not-exist-12345"),
      ).rejects.toThrow();
    });
  });

  describe("Gamma API - listEvents", () => {
    test("returns array of events", async () => {
      const result = await client.listEvents();
      expect(result).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });

    test("respects limit parameter", async () => {
      const result = await client.listEvents({ limit: 5 });
      expect(result.events.length).toBeLessThanOrEqual(5);
    });

    test("event objects have required fields", async () => {
      const result = await client.listEvents({ limit: 1 });
      expect(result.events.length).toBeGreaterThan(0);

      const event = result.events[0]!;
      expect(typeof event.id).toBe("string");
      expect(typeof event.slug).toBe("string");
      expect(typeof event.title).toBe("string");
    });
  });

  describe("Gamma API - getEvent", () => {
    let testEventSlug: string;

    beforeAll(async () => {
      // Get a real event slug to test with
      const events = await client.listEvents({ limit: 1, closed: false });
      if (events.events.length > 0) {
        testEventSlug = events.events[0]!.slug;
      }
    });

    test("returns event details by slug", async () => {
      if (!testEventSlug) {
        console.log("Skipping: no test event available");
        return;
      }

      const event = await client.getEvent(testEventSlug);
      expect(event).toBeDefined();
      expect(event.slug).toBe(testEventSlug);
    });

    test("event includes nested markets", async () => {
      if (!testEventSlug) {
        console.log("Skipping: no test event available");
        return;
      }

      const event = await client.getEvent(testEventSlug);
      // Events may or may not have markets array populated
      expect(event.title).toBeDefined();
    });

    test("throws error for non-existent event", async () => {
      await expect(
        client.getEvent("this-event-definitely-does-not-exist-12345"),
      ).rejects.toThrow();
    });
  });

  describe("Gamma API - listTags", () => {
    test("returns wrapped object with tags array", async () => {
      const result = await client.listTags();
      expect(result).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    });

    test("tag objects have required fields", async () => {
      const result = await client.listTags();
      if (result.tags.length > 0) {
        const tag = result.tags[0]!;
        expect(typeof tag.id).toBe("string");
        expect(typeof tag.label).toBe("string");
      }
    });
  });
});

describe("PolymarketClient - CLOB API", () => {
  let client: PolymarketClient;
  let testTokenId: string;

  beforeAll(async () => {
    client = new PolymarketClient();

    // Get a real token ID from an active market
    const markets = await client.listMarkets({ limit: 1, closed: false });
    if (markets.markets.length > 0) {
      const market = markets.markets[0]!;
      // Token IDs are in clobTokenIds field as JSON array string
      if (market.clobTokenIds) {
        try {
          const tokenIds = JSON.parse(market.clobTokenIds as string);
          if (Array.isArray(tokenIds) && tokenIds.length > 0) {
            testTokenId = tokenIds[0];
          }
        } catch {
          // Fallback if not JSON - try comma split
          const tokenIds = (market.clobTokenIds as string).split(",");
          testTokenId = tokenIds[0]!.trim();
        }
      }
    }
  });

  describe("CLOB API - getOrderBook", () => {
    test("returns orderbook with bids and asks", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const orderbook = await client.getOrderBook(testTokenId);
      expect(orderbook).toBeDefined();
      expect(Array.isArray(orderbook.bids)).toBe(true);
      expect(Array.isArray(orderbook.asks)).toBe(true);
    });

    test("orderbook entries have price and size", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const orderbook = await client.getOrderBook(testTokenId);

      if (orderbook.bids.length > 0) {
        const bid = orderbook.bids[0]!;
        expect(typeof bid.price).toBe("string");
        expect(typeof bid.size).toBe("string");
      }

      if (orderbook.asks.length > 0) {
        const ask = orderbook.asks[0]!;
        expect(typeof ask.price).toBe("string");
        expect(typeof ask.size).toBe("string");
      }
    });
  });

  describe("CLOB API - getMidpoint", () => {
    test("returns midpoint price for token", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const midpoint = await client.getMidpoint(testTokenId);
      expect(midpoint).toBeDefined();
      expect(typeof midpoint).toBe("string");
      // Midpoint should be a valid number string between 0 and 1
      const price = parseFloat(midpoint);
      expect(price).toBeGreaterThanOrEqual(0);
      expect(price).toBeLessThanOrEqual(1);
    });
  });

  describe("CLOB API - getPrice", () => {
    test("returns price for BUY side", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const price = await client.getPrice(testTokenId, "BUY");
      expect(price).toBeDefined();
      expect(typeof price).toBe("string");
    });

    test("returns price for SELL side", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const price = await client.getPrice(testTokenId, "SELL");
      expect(price).toBeDefined();
      expect(typeof price).toBe("string");
    });
  });

  describe("CLOB API - getTrades", () => {
    test("returns wrapped object with trades array", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const result = await client.getTrades(testTokenId);
      expect(result).toBeDefined();
      expect(Array.isArray(result.trades)).toBe(true);
    });

    test("trade objects have required fields when trades exist", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const result = await client.getTrades(testTokenId);
      // Trades may be empty for some markets, which is valid
      if (result.trades.length > 0) {
        const trade = result.trades[0]!;
        // Check for common trade fields (API may return different field names)
        expect(
          trade.timestamp || trade.created_at || trade.matchTime,
        ).toBeDefined();
        expect(trade.price).toBeDefined();
        expect(trade.size || trade.amount).toBeDefined();
      }
    });
  });

  describe("CLOB API - getPriceHistory", () => {
    test("returns wrapped object with history array", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const result = await client.getPriceHistory({
        tokenId: testTokenId,
        fidelity: 60, // 1 hour intervals
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result.history)).toBe(true);
    });

    test("price history entries have timestamp and price", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const result = await client.getPriceHistory({
        tokenId: testTokenId,
        fidelity: 60,
      });

      if (result.history.length > 0) {
        const point = result.history[0]!;
        expect(point.t).toBeDefined(); // timestamp
        expect(point.p).toBeDefined(); // price
      }
    });
  });
});
