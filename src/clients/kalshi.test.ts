import { describe, expect, test } from "bun:test";
import { kalshiConfig } from "../env.js";
import {
  KALSHI_DEMO_URL,
  KALSHI_PRODUCTION_URL,
  KalshiClient,
  resolveKalshiBasePath,
} from "./kalshi.js";

/**
 * Unit tests for Kalshi client configuration.
 * Tests URL resolution logic for demo/production environments.
 */

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

describe("KalshiClient.getMarketCandlesticks", () => {
  const client = new KalshiClient(kalshiConfig);

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
