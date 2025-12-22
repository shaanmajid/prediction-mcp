import { describe, expect, spyOn, test } from "bun:test";
import { AxiosError } from "axios";
import {
  KALSHI_DEMO_URL,
  KALSHI_PRODUCTION_URL,
  KalshiClient,
  resolveKalshiBasePath,
} from "./kalshi.js";

/**
 * Unit tests for Kalshi client configuration and operations.
 * Tests URL resolution logic, API methods, and retry behavior.
 */

// Helper types for mocking private API members
type MockableFunction = (...args: unknown[]) => unknown;
interface MarketApiLike {
  getMarkets: MockableFunction;
}
interface EventsApiLike {
  getEvents: MockableFunction;
}

// ============================================================
// URL Resolution Tests
// ============================================================

describe("resolveKalshiBasePath", () => {
  test("uses production URL when useDemo is false", () => {
    const result = resolveKalshiBasePath({ useDemo: false });

    expect(result.basePath).toBe(KALSHI_PRODUCTION_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("uses demo URL when useDemo is true", () => {
    const result = resolveKalshiBasePath({ useDemo: true });

    expect(result.basePath).toBe(KALSHI_DEMO_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("explicit basePath takes precedence over useDemo", () => {
    const customUrl = "https://custom.kalshi.com/api";

    const result = resolveKalshiBasePath({
      useDemo: true,
      basePath: customUrl,
    });

    expect(result.basePath).toBe(customUrl);
    expect(result.shouldWarn).toBe(true);
    expect(result.explicitBasePath).toBe(customUrl);
  });

  test("shouldWarn is true only when both demo flag AND explicit path are set", () => {
    expect(resolveKalshiBasePath({ useDemo: true }).shouldWarn).toBe(false);
    expect(
      resolveKalshiBasePath({ useDemo: false, basePath: "https://custom.com" })
        .shouldWarn,
    ).toBe(false);
    expect(
      resolveKalshiBasePath({ useDemo: true, basePath: "https://custom.com" })
        .shouldWarn,
    ).toBe(true);
  });
});

// ============================================================
// KalshiClient Unit Tests
// ============================================================

describe("KalshiClient", () => {
  describe("constructor", () => {
    test("creates client with demo config", () => {
      const client = new KalshiClient({ useDemo: true });
      expect(client).toBeDefined();
    });

    test("creates client with production config", () => {
      const client = new KalshiClient({ useDemo: false });
      expect(client).toBeDefined();
    });

    test("creates client with API key only (private key loaded later)", () => {
      // Note: We don't test with privateKeyPath or privateKeyPem here because
      // the SDK immediately tries to load/parse the key on construction.
      // In production, these are validated at startup with real credentials.
      const client = new KalshiClient({
        useDemo: true,
        apiKey: "test-api-key",
      });
      expect(client).toBeDefined();
    });
  });

  describe("listMarkets", () => {
    test("calls API and returns market data", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = {
        data: {
          markets: [
            { ticker: "TEST-MARKET-1", title: "Test Market 1" },
            { ticker: "TEST-MARKET-2", title: "Test Market 2" },
          ],
          cursor: null,
        },
      };

      const marketApi = (
        client as unknown as { marketApi: { getMarkets: unknown } }
      ).marketApi;
      const spy = spyOn(marketApi, "getMarkets").mockResolvedValue(
        mockResponse,
      );

      const result = await client.listMarkets({ limit: 10 });

      expect(spy).toHaveBeenCalled();
      expect(result.data.markets).toHaveLength(2);
      expect(result.data.markets[0]!.ticker).toBe("TEST-MARKET-1");
    });

    test("passes filter parameters correctly", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = { data: { markets: [], cursor: null } };

      const marketApi = (
        client as unknown as { marketApi: { getMarkets: unknown } }
      ).marketApi;
      const spy = spyOn(marketApi, "getMarkets").mockResolvedValue(
        mockResponse,
      );

      await client.listMarkets({
        status: "open",
        limit: 50,
        eventTicker: "EVENT-1",
        seriesTicker: "SERIES-1",
      });

      expect(spy).toHaveBeenCalledWith(
        50, // limit
        undefined, // cursor
        "EVENT-1", // eventTicker
        "SERIES-1", // seriesTicker
        undefined, // minCreatedTs
        undefined, // maxCreatedTs
        undefined, // maxCloseTs
        undefined, // minCloseTs
        undefined, // minSettledTs
        undefined, // maxSettledTs
        "open", // status
      );
    });

    test("handles empty result", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = { data: { markets: [], cursor: null } };

      const marketApi = (
        client as unknown as { marketApi: { getMarkets: unknown } }
      ).marketApi;
      spyOn(marketApi, "getMarkets").mockResolvedValue(mockResponse);

      const result = await client.listMarkets({});

      expect(result.data.markets).toHaveLength(0);
    });
  });

  describe("getMarketDetails", () => {
    test("calls API with correct ticker", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = {
        data: { market: { ticker: "TEST-MKT", title: "Test Market" } },
      };

      const marketApi = (
        client as unknown as { marketApi: { getMarket: unknown } }
      ).marketApi;
      const spy = spyOn(marketApi, "getMarket").mockResolvedValue(mockResponse);

      const result = await client.getMarketDetails("TEST-MKT");

      expect(spy).toHaveBeenCalledWith("TEST-MKT");
      expect(result.data.market.ticker).toBe("TEST-MKT");
    });
  });

  describe("getOrderBook", () => {
    test("calls API with correct ticker", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = {
        data: { orderbook: { yes: [[0.5, 100]], no: null } },
      };

      const marketApi = (
        client as unknown as { marketApi: { getMarketOrderbook: unknown } }
      ).marketApi;
      const spy = spyOn(marketApi, "getMarketOrderbook").mockResolvedValue(
        mockResponse,
      );

      const result = await client.getOrderBook("TEST-MKT");

      expect(spy).toHaveBeenCalledWith("TEST-MKT");
      expect(result.data.orderbook).toBeDefined();
    });
  });

  describe("getTrades", () => {
    test("calls API with correct parameters", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = {
        data: { trades: [{ id: "trade-1" }], cursor: null },
      };

      const marketApi = (
        client as unknown as { marketApi: { getTrades: unknown } }
      ).marketApi;
      const spy = spyOn(marketApi, "getTrades").mockResolvedValue(mockResponse);

      const result = await client.getTrades({ ticker: "TEST-MKT", limit: 10 });

      expect(spy).toHaveBeenCalledWith(
        10,
        undefined,
        "TEST-MKT",
        undefined,
        undefined,
      );
      expect(result.data.trades).toHaveLength(1);
    });

    test("handles optional parameters", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = { data: { trades: [], cursor: null } };

      const marketApi = (
        client as unknown as { marketApi: { getTrades: unknown } }
      ).marketApi;
      const spy = spyOn(marketApi, "getTrades").mockResolvedValue(mockResponse);

      await client.getTrades({});

      expect(spy).toHaveBeenCalledWith(
        undefined, // limit
        undefined, // cursor
        undefined, // ticker
        undefined, // minTs
        undefined, // maxTs
      );
    });
  });

  describe("getSeries", () => {
    test("calls API with correct series ticker", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = {
        data: { series: { ticker: "PRES-2028", title: "Presidential 2028" } },
      };

      const marketApi = (
        client as unknown as { marketApi: { getSeries: unknown } }
      ).marketApi;
      const spy = spyOn(marketApi, "getSeries").mockResolvedValue(mockResponse);

      const result = await client.getSeries("PRES-2028");

      expect(spy).toHaveBeenCalledWith("PRES-2028");
      expect(result.data.series.ticker).toBe("PRES-2028");
    });
  });

  describe("getEvent", () => {
    test("calls API with correct event ticker", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = {
        data: { event: { event_ticker: "EVENT-1", title: "Test Event" } },
      };

      const eventsApi = (
        client as unknown as { eventsApi: { getEvent: unknown } }
      ).eventsApi;
      const spy = spyOn(eventsApi, "getEvent").mockResolvedValue(mockResponse);

      const result = await client.getEvent("EVENT-1");

      expect(spy).toHaveBeenCalledWith("EVENT-1");
      expect(result.data.event.event_ticker).toBe("EVENT-1");
    });
  });

  describe("listEvents", () => {
    test("calls API with correct parameters", async () => {
      const client = new KalshiClient({ useDemo: true });
      const mockResponse = {
        data: { events: [{ event_ticker: "EVT-1" }], cursor: null },
      };

      const eventsApi = (
        client as unknown as { eventsApi: { getEvents: unknown } }
      ).eventsApi;
      const spy = spyOn(eventsApi, "getEvents").mockResolvedValue(mockResponse);

      const result = await client.listEvents({
        status: "open",
        limit: 100,
        withNestedMarkets: true,
      });

      expect(spy).toHaveBeenCalledWith(
        100, // limit
        undefined, // cursor
        true, // withNestedMarkets
        undefined, // withMilestones
        "open", // status
        undefined, // seriesTicker
        undefined, // minCloseTs
      );
      expect(result.data.events).toHaveLength(1);
    });
  });
});

// ============================================================
// Rate Limiting / Retry Tests
// ============================================================

describe("KalshiClient retry behavior", () => {
  test("retries on 429 rate limit error", async () => {
    const client = new KalshiClient({ useDemo: true });
    let callCount = 0;

    // Access private API and properly type the mock
    const marketApi = (client as unknown as { marketApi: MarketApiLike })
      .marketApi;
    (marketApi.getMarkets as MockableFunction) = async () => {
      callCount++;
      if (callCount < 3) {
        const error = new AxiosError("Rate limited");
        error.response = { status: 429 } as unknown as typeof error.response;
        throw error;
      }
      return { data: { markets: [], cursor: null } };
    };

    const result = await client.listMarkets({});

    expect(callCount).toBe(3);
    expect(result.data.markets).toEqual([]);
  });

  test("does not retry on non-429 errors", async () => {
    const client = new KalshiClient({ useDemo: true });
    let callCount = 0;

    const marketApi = (client as unknown as { marketApi: MarketApiLike })
      .marketApi;
    (marketApi.getMarkets as MockableFunction) = async () => {
      callCount++;
      const error = new AxiosError("Not found");
      error.response = { status: 404 } as unknown as typeof error.response;
      throw error;
    };

    await expect(client.listMarkets({})).rejects.toThrow();
    expect(callCount).toBe(1);
  });

  test("throws after max retry attempts on persistent 429", async () => {
    const client = new KalshiClient({ useDemo: true });
    let callCount = 0;

    const marketApi = (client as unknown as { marketApi: MarketApiLike })
      .marketApi;
    (marketApi.getMarkets as MockableFunction) = async () => {
      callCount++;
      const error = new AxiosError("Rate limited");
      error.response = { status: 429 } as unknown as typeof error.response;
      throw error;
    };

    await expect(client.listMarkets({})).rejects.toThrow();
    expect(callCount).toBe(4); // MAX_RETRY_ATTEMPTS = 4
  });
});

// ============================================================
// Bulk Fetch / Pagination Tests
// ============================================================

describe("KalshiClient bulk fetch methods", () => {
  describe("fetchAllEventsWithMarkets", () => {
    test("paginates until cursor is empty", async () => {
      const client = new KalshiClient({ useDemo: true });
      let callCount = 0;

      const eventsApi = (client as unknown as { eventsApi: EventsApiLike })
        .eventsApi;
      (eventsApi.getEvents as MockableFunction) = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            data: {
              events: [
                {
                  event_ticker: "EVT-1",
                  title: "Event 1",
                  markets: [{ ticker: "MKT-1", title: "Market 1" }],
                },
              ],
              cursor: "next-page",
            },
          };
        }
        return {
          data: {
            events: [
              {
                event_ticker: "EVT-2",
                title: "Event 2",
                markets: [{ ticker: "MKT-2", title: "Market 2" }],
              },
            ],
            cursor: null,
          },
        };
      };

      const result = await client.fetchAllEventsWithMarkets();

      expect(callCount).toBe(2);
      expect(result.events).toHaveLength(2);
      expect(result.markets).toHaveLength(2);
    });

    test("extracts markets from nested event data", async () => {
      const client = new KalshiClient({ useDemo: true });

      const eventsApi = (
        client as unknown as { eventsApi: { getEvents: unknown } }
      ).eventsApi;
      spyOn(eventsApi, "getEvents").mockResolvedValue({
        data: {
          events: [
            {
              event_ticker: "EVT-1",
              title: "Event 1",
              markets: [
                { ticker: "MKT-1", title: "Market 1" },
                { ticker: "MKT-2", title: "Market 2" },
              ],
            },
          ],
          cursor: null,
        },
      });

      const result = await client.fetchAllEventsWithMarkets();

      expect(result.events).toHaveLength(1);
      expect(result.markets).toHaveLength(2);
      // Events should not have nested markets anymore
      expect(
        (result.events[0] as { markets?: unknown }).markets,
      ).toBeUndefined();
    });

    test("handles events with no markets", async () => {
      const client = new KalshiClient({ useDemo: true });

      const eventsApi = (
        client as unknown as { eventsApi: { getEvents: unknown } }
      ).eventsApi;
      spyOn(eventsApi, "getEvents").mockResolvedValue({
        data: {
          events: [
            { event_ticker: "EVT-1", title: "Event 1", markets: undefined },
            { event_ticker: "EVT-2", title: "Event 2", markets: [] },
          ],
          cursor: null,
        },
      });

      const result = await client.fetchAllEventsWithMarkets();

      expect(result.events).toHaveLength(2);
      expect(result.markets).toHaveLength(0);
    });

    test("handles empty response", async () => {
      const client = new KalshiClient({ useDemo: true });

      const eventsApi = (
        client as unknown as { eventsApi: { getEvents: unknown } }
      ).eventsApi;
      spyOn(eventsApi, "getEvents").mockResolvedValue({
        data: { events: [], cursor: null },
      });

      const result = await client.fetchAllEventsWithMarkets();

      expect(result.events).toHaveLength(0);
      expect(result.markets).toHaveLength(0);
    });
  });

  describe("fetchAllMarkets", () => {
    test("paginates until cursor is empty", async () => {
      const client = new KalshiClient({ useDemo: true });
      let callCount = 0;

      const marketApi = (client as unknown as { marketApi: MarketApiLike })
        .marketApi;
      (marketApi.getMarkets as MockableFunction) = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            data: {
              markets: [{ ticker: "MKT-1", event_ticker: "EVT-1" }],
              cursor: "next-page",
            },
          };
        }
        return {
          data: {
            markets: [{ ticker: "MKT-2", event_ticker: "EVT-2" }],
            cursor: null,
          },
        };
      };

      const result = await client.fetchAllMarkets();

      expect(callCount).toBe(2);
      expect(result).toHaveLength(2);
    });

    test("filters by event tickers when provided", async () => {
      const client = new KalshiClient({ useDemo: true });

      const marketApi = (
        client as unknown as { marketApi: { getMarkets: unknown } }
      ).marketApi;
      spyOn(marketApi, "getMarkets").mockResolvedValue({
        data: {
          markets: [
            { ticker: "MKT-1", event_ticker: "EVT-1" },
            { ticker: "MKT-2", event_ticker: "EVT-2" },
            { ticker: "MKT-3", event_ticker: "EVT-1" },
          ],
          cursor: null,
        },
      });

      const result = await client.fetchAllMarkets(["EVT-1"]);

      expect(result).toHaveLength(2);
      expect(result.every((m) => m.event_ticker === "EVT-1")).toBe(true);
    });

    test("returns all markets when no filter provided", async () => {
      const client = new KalshiClient({ useDemo: true });

      const marketApi = (
        client as unknown as { marketApi: { getMarkets: unknown } }
      ).marketApi;
      spyOn(marketApi, "getMarkets").mockResolvedValue({
        data: {
          markets: [
            { ticker: "MKT-1", event_ticker: "EVT-1" },
            { ticker: "MKT-2", event_ticker: "EVT-2" },
          ],
          cursor: null,
        },
      });

      const result = await client.fetchAllMarkets();

      expect(result).toHaveLength(2);
    });

    test("handles empty response", async () => {
      const client = new KalshiClient({ useDemo: true });

      const marketApi = (
        client as unknown as { marketApi: { getMarkets: unknown } }
      ).marketApi;
      spyOn(marketApi, "getMarkets").mockResolvedValue({
        data: { markets: [], cursor: null },
      });

      const result = await client.fetchAllMarkets();

      expect(result).toHaveLength(0);
    });
  });
});
