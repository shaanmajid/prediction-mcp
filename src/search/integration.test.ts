/**
 * Search Integration Tests
 *
 * These tests require cache population which takes ~7 seconds (using withNestedMarkets
 * optimization). The 900s timeout is retained as safety margin for slow networks/CI.
 *
 * These tests hit the live Kalshi API and verify:
 * - Search returns relevant results
 * - "gavin newsom" finds markets via yes_sub_title
 * - "presidential 2028" finds relevant events
 * - Search performance is <500ms after cache is populated (typically <10ms locally)
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { KalshiClient } from "../clients/kalshi.js";
import { PolymarketClient } from "../clients/polymarket.js";
import { SearchService } from "./index.js";
import { TOOLS, type ToolContext } from "../tools.js";

describe("Search Integration Tests", () => {
  const kalshi = new KalshiClient();
  const polymarket = new PolymarketClient({
    gammaHost: "https://gamma-api.polymarket.com",
    clobHost: "https://clob.polymarket.com",
    chainId: 137,
  });
  const searchService = new SearchService(kalshi);
  const ctx: ToolContext = { kalshi, polymarket, searchService };

  // Populate cache once before all tests (~7s with withNestedMarkets)
  beforeAll(async () => {
    await searchService.search("test", 1); // Triggers ensurePopulated()
  }, 900000); // Safety timeout for slow networks

  describe("kalshi_search", () => {
    test("should search and return results with scores", async () => {
      const tool = TOOLS.kalshi_search!;
      const result = (await tool.handler(ctx, {
        query: "election",
        limit: 5,
      })) as {
        results: Array<{ type: string; score: number }>;
        total: number;
        query: string;
      };

      expect(result).toBeDefined();
      expect(result.query).toBe("election");
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
      expect(result.results[0]?.score).toBeGreaterThan(0);
    });

    test("should respect limit parameter", async () => {
      const tool = TOOLS.kalshi_search!;
      const result = (await tool.handler(ctx, {
        query: "bitcoin",
        limit: 3,
      })) as { results: unknown[]; total: number };

      expect(result.results.length).toBeLessThanOrEqual(3);
    });

    test("should complete search in <500ms", async () => {
      // Note: Using 500ms threshold to account for CI environment variability
      // Local performance is typically <10ms, but CI runners can be slower
      const tool = TOOLS.kalshi_search!;
      const start = Date.now();
      await tool.handler(ctx, { query: "trump", limit: 20 });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe("kalshi_search_events", () => {
    test("should return only events", async () => {
      const tool = TOOLS.kalshi_search_events!;
      const result = (await tool.handler(ctx, {
        query: "presidential",
        limit: 5,
      })) as { results: Array<{ type: string }> };

      expect(result.results.length).toBeGreaterThan(0);
      for (const r of result.results) {
        expect(r.type).toBe("event");
      }
    });

    test("should find 2028 presidential election events", async () => {
      const tool = TOOLS.kalshi_search_events!;
      const result = (await tool.handler(ctx, {
        query: "presidential 2028",
        limit: 10,
      })) as { results: Array<{ item: { title: string } }> };

      expect(result.results.length).toBeGreaterThan(0);
      // At least one result should mention presidential or 2028
      const hasRelevant = result.results.some(
        (r) =>
          r.item.title.toLowerCase().includes("presidential") ||
          r.item.title.includes("2028"),
      );
      expect(hasRelevant).toBe(true);
    });
  });

  describe("kalshi_search_markets", () => {
    test("should return only markets", async () => {
      const tool = TOOLS.kalshi_search_markets!;
      const result = (await tool.handler(ctx, {
        query: "trump",
        limit: 5,
      })) as { results: Array<{ type: string }> };

      expect(result.results.length).toBeGreaterThan(0);
      for (const r of result.results) {
        expect(r.type).toBe("market");
      }
    });

    test("should find markets by yes_sub_title (candidate names)", async () => {
      const tool = TOOLS.kalshi_search_markets!;
      const result = (await tool.handler(ctx, {
        query: "gavin newsom",
        limit: 10,
      })) as { results: Array<{ item: { yes_sub_title?: string } }> };

      expect(result.results.length).toBeGreaterThan(0);
      // At least one result should have Newsom in yes_sub_title
      const hasNewsom = result.results.some((r) =>
        r.item.yes_sub_title?.toLowerCase().includes("newsom"),
      );
      expect(hasNewsom).toBe(true);
    });
  });

  describe("kalshi_cache_stats", () => {
    test("should return cache statistics", async () => {
      const tool = TOOLS.kalshi_cache_stats!;
      const result = (await tool.handler(ctx, {})) as {
        status: string;
        events_count: number;
        markets_count: number;
      };

      expect(result.status).toBe("ready");
      expect(result.events_count).toBeGreaterThan(0);
      expect(result.markets_count).toBeGreaterThan(0);
    });
  });
});
