import { describe, test, expect, beforeAll, spyOn } from "bun:test";
import { PolymarketClient } from "./polymarket.js";

/**
 * Tests for PolymarketClient
 *
 * Organized into:
 * - Unit Tests: Fast tests using mocked fetch, no external calls
 * - Integration Tests: Live API tests for regression detection
 */

// ============================================================
// Unit Tests
// ============================================================

describe("PolymarketClient - Unit Tests", () => {
  describe("Constructor", () => {
    test("uses default hosts when no config provided", () => {
      const client = new PolymarketClient();
      // Client should be created without error
      expect(client).toBeDefined();
    });

    test("accepts custom hosts in config", () => {
      const client = new PolymarketClient({
        gammaHost: "https://custom-gamma.example.com",
        clobHost: "https://custom-clob.example.com",
      });
      expect(client).toBeDefined();
    });

    test("accepts custom chainId in config", () => {
      const client = new PolymarketClient({
        chainId: 80001, // Mumbai testnet
      });
      expect(client).toBeDefined();
    });
  });

  describe("Response Normalization - getMarket", () => {
    test("normalizes array response to single market", async () => {
      const mockMarket = { slug: "test-market", question: "Test?" };
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [mockMarket],
      } as Response);

      const client = new PolymarketClient();
      const result = await client.getMarket("test-market");

      expect(result.slug).toBe("test-market");
      expect(result.question).toBe("Test?");
      expect(fetchSpy).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    test("passes through single object response", async () => {
      const mockMarket = { slug: "direct-market", question: "Direct?" };
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockMarket,
      } as Response);

      const client = new PolymarketClient();
      const result = await client.getMarket("direct-market");

      expect(result.slug).toBe("direct-market");

      fetchSpy.mockRestore();
    });

    test("throws for empty array response", async () => {
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      const client = new PolymarketClient();

      await expect(client.getMarket("nonexistent")).rejects.toThrow(
        "Market not found",
      );

      fetchSpy.mockRestore();
    });
  });

  describe("Response Normalization - getEvent", () => {
    test("normalizes array response to single event", async () => {
      const mockEvent = { slug: "test-event", title: "Test Event" };
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [mockEvent],
      } as Response);

      const client = new PolymarketClient();
      const result = await client.getEvent("test-event");

      expect(result.slug).toBe("test-event");
      expect(result.title).toBe("Test Event");

      fetchSpy.mockRestore();
    });

    test("throws for empty array response", async () => {
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      const client = new PolymarketClient();

      await expect(client.getEvent("nonexistent")).rejects.toThrow(
        "Event not found",
      );

      fetchSpy.mockRestore();
    });
  });

  describe("Response Normalization - listMarkets", () => {
    test("wraps array response in markets object", async () => {
      const mockMarkets = [
        { slug: "market-1", question: "Q1?" },
        { slug: "market-2", question: "Q2?" },
      ];
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockMarkets,
      } as Response);

      const client = new PolymarketClient();
      const result = await client.listMarkets();

      expect(result.markets.length).toBe(2);
      expect(result.markets[0]!.slug).toBe("market-1");
      expect(result.markets[1]!.slug).toBe("market-2");

      fetchSpy.mockRestore();
    });

    test("returns empty array for non-array response", async () => {
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => null,
      } as Response);

      const client = new PolymarketClient();
      const result = await client.listMarkets();

      expect(result.markets).toEqual([]);

      fetchSpy.mockRestore();
    });
  });

  describe("Response Normalization - getPriceHistory", () => {
    test("extracts history from wrapped response", async () => {
      const mockHistory = [
        { t: 1700000000, p: "0.5" },
        { t: 1700001000, p: "0.55" },
      ];
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ history: mockHistory }),
      } as Response);

      const client = new PolymarketClient();
      const result = await client.getPriceHistory({ tokenId: "test-token" });

      expect(result.history).toEqual(mockHistory);

      fetchSpy.mockRestore();
    });

    test("wraps raw array response in history object", async () => {
      const mockHistory = [
        { t: 1700000000, p: "0.5" },
        { t: 1700001000, p: "0.55" },
      ];
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockHistory,
      } as Response);

      const client = new PolymarketClient();
      const result = await client.getPriceHistory({ tokenId: "test-token" });

      expect(result.history).toEqual(mockHistory);

      fetchSpy.mockRestore();
    });

    test("returns empty history for unexpected response", async () => {
      const fetchSpy = spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: "format" }),
      } as Response);

      const client = new PolymarketClient();
      const result = await client.getPriceHistory({ tokenId: "test-token" });

      expect(result.history).toEqual([]);

      fetchSpy.mockRestore();
    });
  });
});

// ============================================================
// Integration Tests
// ============================================================

describe("PolymarketClient - Integration Tests", () => {
  let client: PolymarketClient;

  beforeAll(() => {
    client = new PolymarketClient();
  });

  describe("Gamma API", () => {
    test("listMarkets returns markets from live API", async () => {
      const result = await client.listMarkets({ limit: 5 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.markets)).toBe(true);
      expect(result.markets.length).toBeLessThanOrEqual(5);

      if (result.markets.length > 0) {
        const market = result.markets[0]!;
        expect(typeof market.id).toBe("string");
        expect(typeof market.question).toBe("string");
      }
    });

    test("getMarket returns market by slug", async () => {
      // First get a valid slug
      const markets = await client.listMarkets({ limit: 1, closed: false });
      if (markets.markets.length === 0) {
        console.log("Skipping: no markets available");
        return;
      }

      const slug = markets.markets[0]!.slug;
      const market = await client.getMarket(slug);

      expect(market).toBeDefined();
      expect(market.slug).toBe(slug);
      expect(market.question).toBeDefined();
    });

    test("listEvents returns events from live API", async () => {
      const result = await client.listEvents({ limit: 5 });

      expect(result).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);

      if (result.events.length > 0) {
        const event = result.events[0]!;
        expect(typeof event.id).toBe("string");
        expect(typeof event.slug).toBe("string");
        expect(typeof event.title).toBe("string");
      }
    });

    test("getEvent returns event by slug", async () => {
      const events = await client.listEvents({ limit: 1, closed: false });
      if (events.events.length === 0) {
        console.log("Skipping: no events available");
        return;
      }

      const slug = events.events[0]!.slug;
      const event = await client.getEvent(slug);

      expect(event).toBeDefined();
      expect(event.slug).toBe(slug);
      expect(event.title).toBeDefined();
    });

    test("listTags returns tags array", async () => {
      const result = await client.listTags();

      expect(result).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);

      if (result.tags.length > 0) {
        const tag = result.tags[0]!;
        expect(typeof tag.id).toBe("string");
        expect(typeof tag.label).toBe("string");
      }
    });
  });

  describe("CLOB API", () => {
    let testTokenId: string;

    beforeAll(async () => {
      // Get a real token ID from an active market
      const markets = await client.listMarkets({ limit: 1, closed: false });
      if (markets.markets.length > 0) {
        const market = markets.markets[0]!;
        if (market.clobTokenIds) {
          try {
            const tokenIds = JSON.parse(market.clobTokenIds as string);
            if (Array.isArray(tokenIds) && tokenIds.length > 0) {
              testTokenId = tokenIds[0];
            }
          } catch {
            const tokenIds = (market.clobTokenIds as string).split(",");
            testTokenId = tokenIds[0]!.trim();
          }
        }
      }
    });

    test("getOrderBook returns bids and asks", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const orderbook = await client.getOrderBook(testTokenId);

      expect(orderbook).toBeDefined();
      expect(Array.isArray(orderbook.bids)).toBe(true);
      expect(Array.isArray(orderbook.asks)).toBe(true);
    });

    test("getMidpoint returns price string", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const midpoint = await client.getMidpoint(testTokenId);

      expect(midpoint).toBeDefined();
      expect(typeof midpoint).toBe("string");
      const price = parseFloat(midpoint);
      expect(price).toBeGreaterThanOrEqual(0);
      expect(price).toBeLessThanOrEqual(1);
    });

    test("getPrice returns price for BUY side", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const price = await client.getPrice(testTokenId, "BUY");

      expect(price).toBeDefined();
      expect(typeof price).toBe("string");
    });

    test("getPriceHistory returns history array", async () => {
      if (!testTokenId) {
        console.log("Skipping: no test token available");
        return;
      }

      const result = await client.getPriceHistory({
        tokenId: testTokenId,
        fidelity: 60,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.history)).toBe(true);
    });
  });
});
