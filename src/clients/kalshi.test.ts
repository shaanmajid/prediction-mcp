import { beforeAll, describe, expect, test } from "bun:test";
import { kalshiConfig } from "../env.js";
import {
  KALSHI_DEMO_URL,
  KALSHI_PRODUCTION_URL,
  KalshiClient,
  resolveKalshiBasePath,
} from "./kalshi.js";

/**
 * Tests for KalshiClient
 *
 * Organized into:
 * - Unit Tests: Fast tests for configuration logic, no external calls
 * - Integration Tests: Live API tests against demo environment (requires credentials)
 */

// ============================================================
// Unit Tests
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

/**
 * Unit tests for KalshiClient method existence.
 *
 * IMPORTANT: We do NOT instantiate KalshiClient with fake credentials here.
 * The kalshi-typescript SDK adds axios interceptors to the GLOBAL axios instance,
 * so creating a client with invalid credentials would break all subsequent clients
 * in the same process (including integration tests).
 *
 * These tests verify the class prototype has the expected methods.
 */
describe("KalshiClient - Unit Tests", () => {
  describe("getBalance()", () => {
    test("method exists on prototype", () => {
      expect(typeof KalshiClient.prototype.getBalance).toBe("function");
    });
  });

  describe("getPositions()", () => {
    test("method exists on prototype", () => {
      expect(typeof KalshiClient.prototype.getPositions).toBe("function");
    });
  });

  describe("getApiKeys()", () => {
    test("method exists on prototype", () => {
      expect(typeof KalshiClient.prototype.getApiKeys).toBe("function");
    });
  });

  describe("getMarketCandlesticks()", () => {
    test("method exists on prototype", () => {
      expect(typeof KalshiClient.prototype.getMarketCandlesticks).toBe(
        "function",
      );
    });
  });
});

// ============================================================
// Integration Tests
// ============================================================

/**
 * Integration tests require Kalshi demo credentials.
 * Set KALSHI_API_KEY and KALSHI_PRIVATE_KEY_PEM (or KALSHI_PRIVATE_KEY_PATH)
 * to run these tests.
 */
const hasKalshiCredentials =
  process.env.KALSHI_API_KEY &&
  (process.env.KALSHI_PRIVATE_KEY_PEM || process.env.KALSHI_PRIVATE_KEY_PATH);

// Use describe.skipIf to conditionally skip when credentials aren't available
const describeWithCredentials = hasKalshiCredentials ? describe : describe.skip;

describeWithCredentials("KalshiClient - Integration Tests", () => {
  let client: KalshiClient;

  beforeAll(() => {
    client = new KalshiClient({
      apiKey: process.env.KALSHI_API_KEY,
      privateKeyPem: process.env.KALSHI_PRIVATE_KEY_PEM,
      privateKeyPath: process.env.KALSHI_PRIVATE_KEY_PATH,
      useDemo: true,
    });
  });

  describe("Portfolio API", () => {
    test("getBalance returns balance structure with expected fields", async () => {
      const result = await client.getBalance();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();

      // Verify the balance response has expected numeric fields
      // Demo accounts may have 0 balance, but the fields should exist
      expect(typeof result.data.balance).toBe("number");
      expect(typeof result.data.portfolio_value).toBe("number");
    });

    test("getPositions returns positions array", async () => {
      const result = await client.getPositions();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.market_positions)).toBe(true);

      // If there's a cursor, it should be a string (or null)
      if (result.data.cursor !== null) {
        expect(typeof result.data.cursor).toBe("string");
      }
    });

    test("getPositions respects limit parameter", async () => {
      const result = await client.getPositions({ limit: 5 });
      const positions = result.data.market_positions ?? [];

      expect(positions.length).toBeLessThanOrEqual(5);
    });

    test("getPositions returns position details when positions exist", async () => {
      const result = await client.getPositions({ limit: 1 });
      const positions = result.data.market_positions ?? [];

      if (positions.length > 0) {
        const position = positions[0]!;

        // Verify position has expected structure
        expect(position.ticker).toBeDefined();
        expect(typeof position.ticker).toBe("string");

        // Exposure and P&L fields should be present
        expect(typeof position.market_exposure).toBe("number");
        expect(typeof position.realized_pnl).toBe("number");
      }
      // If no positions, test still passes - demo account may be empty
    });

    test("getApiKeys returns API key list", async () => {
      const result = await client.getApiKeys();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.api_keys)).toBe(true);

      // Should have at least one API key (the one we're using)
      expect(result.data.api_keys.length).toBeGreaterThan(0);

      // Verify key structure
      const key = result.data.api_keys[0]!;
      expect(typeof key.api_key_id).toBe("string");
      expect(typeof key.name).toBe("string");
    });
  });

  describe("Market Candlesticks API", () => {
    test("returns candlestick data for a market", async () => {
      // Get an event with nested markets to access series_ticker
      const eventsResponse = await client.listEvents({
        limit: 10,
        withNestedMarkets: true,
      });

      // Find an event with a series_ticker and markets
      const event = eventsResponse.data.events.find(
        (e) => e.series_ticker && e.markets && e.markets.length > 0,
      )!;
      const market = event.markets![0]!;

      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86400;

      const result = await client.getMarketCandlesticks({
        seriesTicker: event.series_ticker,
        ticker: market.ticker,
        startTs: oneDayAgo,
        endTs: now,
        periodInterval: 60,
      });

      expect(result.data).toBeDefined();
      expect(result.data.ticker).toBe(market.ticker);
      expect(Array.isArray(result.data.candlesticks)).toBe(true);
    });
  });
});
