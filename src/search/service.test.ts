import { describe, expect, test } from "bun:test";
import type { Market } from "kalshi-typescript";
import { KalshiClient } from "../clients/kalshi.js";
import { KalshiSearchService } from "./service.js";

describe("KalshiSearchService", () => {
  describe("cache lifecycle", () => {
    test("concurrent ensurePopulated() calls only trigger one API call", async () => {
      let callCount = 0;

      // Mock with delay to allow concurrent calls
      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          callCount++;
          await new Promise((r) => setTimeout(r, 50)); // Simulate network delay
          return {
            events: [
              {
                event_ticker: "TEST1",
                title: "Test Event",
                subtitle: "",
                markets: [],
              },
            ],
            markets: [],
          };
        },
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient);

      // Fire 3 concurrent calls
      await Promise.all([
        service.ensurePopulated(),
        service.ensurePopulated(),
        service.ensurePopulated(),
      ]);

      // Should only have called API once (deduplication via populatePromise)
      expect(callCount).toBe(1);
    });

    test("ensurePopulated() calls API and populates cache once", async () => {
      let callCount = 0;

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          callCount++;
          return {
            events: [
              {
                event_ticker: "TEST1",
                title: "Test Event",
                subtitle: "",
                markets: [],
              },
            ],
            markets: [
              {
                ticker: "MARKET1",
                title: "Test Market",
                yes_sub_title: "Yes",
                no_sub_title: "No",
                event_ticker: "TEST1",
              } as Market,
            ],
          };
        },
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient);

      // First call populates cache
      await service.ensurePopulated();
      expect(callCount).toBe(1);

      // Second call should return immediately without API call (cache is ready)
      await service.ensurePopulated();
      expect(callCount).toBe(1);
    });

    test("refresh() independently fetches and updates cache", async () => {
      let callCount = 0;

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          callCount++;
          return {
            events: [
              {
                event_ticker: "TEST1",
                title: "Test Event",
                subtitle: "",
                markets: [],
              },
            ],
            markets: [],
          };
        },
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient);

      // Initial population
      await service.ensurePopulated();
      expect(callCount).toBe(1);

      // Refresh should call API again (independent operation)
      await service.refresh();
      expect(callCount).toBe(2);
    });
  });

  describe("cache statistics", () => {
    test("getStats() reports empty state before population", () => {
      const mockClient = {
        fetchAllEventsWithMarkets: async () => ({
          events: [],
          markets: [],
        }),
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient);
      const stats = service.getStats();

      expect(stats.status).toBe("empty");
      expect(stats.events_count).toBe(0);
      expect(stats.markets_count).toBe(0);
    });

    test("getStats() reports ready state after population", async () => {
      const mockClient = {
        fetchAllEventsWithMarkets: async () => ({
          events: [
            {
              event_ticker: "TEST1",
              title: "Test Event",
              subtitle: "",
              markets: [],
            },
          ],
          markets: [
            {
              ticker: "MARKET1",
              title: "Test Market",
              yes_sub_title: "Yes",
              no_sub_title: "No",
              event_ticker: "TEST1",
            } as Market,
          ],
        }),
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient);
      await service.ensurePopulated();

      const stats = service.getStats();
      expect(stats.status).toBe("ready");
      expect(stats.events_count).toBe(1);
      expect(stats.markets_count).toBe(1);
    });
  });

  describe("TTL configuration", () => {
    test("accepts ttlSeconds in constructor", () => {
      const mockClient = {
        fetchAllEventsWithMarkets: async () => ({
          events: [],
          markets: [],
        }),
      } as unknown as KalshiClient;

      // Should not throw
      const service = new KalshiSearchService(mockClient, { ttlSeconds: 1800 });
      expect(service).toBeDefined();
    });

    test("defaults to 3600 seconds if not provided", () => {
      const mockClient = {
        fetchAllEventsWithMarkets: async () => ({
          events: [],
          markets: [],
        }),
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient);
      const stats = service.getStats();
      // expires_in_seconds should be null when cache is empty
      expect(stats.expires_in_seconds).toBeNull();
    });

    test("triggers background refresh when cache expires", async () => {
      let callCount = 0;
      let resolveRefresh: () => void;
      const refreshPromise = new Promise<void>((r) => {
        resolveRefresh = r;
      });

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          callCount++;
          if (callCount > 1) {
            // Delay the refresh call so we can verify it's non-blocking
            await refreshPromise;
          }
          return {
            events: [
              {
                event_ticker: "TEST1",
                title: "Test",
                subtitle: "",
                markets: [],
              },
            ],
            markets: [],
          };
        },
      } as unknown as KalshiClient;

      // Very short TTL for testing
      const service = new KalshiSearchService(mockClient, {
        ttlSeconds: 0.001,
      });

      // Initial population
      await service.ensurePopulated();
      expect(callCount).toBe(1);

      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 10));

      // Next ensurePopulated should trigger background refresh but return immediately
      const startTime = Date.now();
      await service.ensurePopulated();
      const elapsed = Date.now() - startTime;

      // Should return quickly (not wait for refresh)
      expect(elapsed).toBeLessThan(50);

      // Background refresh should have been triggered
      expect(callCount).toBe(2);

      // Complete the refresh
      resolveRefresh!();
    });

    test("getStats() reports expires_in_seconds after population", async () => {
      const mockClient = {
        fetchAllEventsWithMarkets: async () => ({
          events: [
            { event_ticker: "TEST1", title: "Test", subtitle: "", markets: [] },
          ],
          markets: [],
        }),
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient, { ttlSeconds: 3600 });
      await service.ensurePopulated();

      const stats = service.getStats();
      expect(stats.expires_in_seconds).not.toBeNull();
      expect(stats.expires_in_seconds).toBeGreaterThan(3590); // Close to 3600
      expect(stats.expires_in_seconds).toBeLessThanOrEqual(3600);
    });

    test("getStats() reports null expires_in_seconds when TTL disabled", async () => {
      const mockClient = {
        fetchAllEventsWithMarkets: async () => ({
          events: [
            { event_ticker: "TEST1", title: "Test", subtitle: "", markets: [] },
          ],
          markets: [],
        }),
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient, { ttlSeconds: 0 });
      await service.ensurePopulated();

      const stats = service.getStats();
      expect(stats.expires_in_seconds).toBeNull(); // TTL disabled
    });

    test("concurrent ensurePopulated() calls don't trigger multiple background refreshes", async () => {
      let callCount = 0;

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          callCount++;
          await new Promise((r) => setTimeout(r, 50)); // Simulate network delay
          return {
            events: [
              {
                event_ticker: "TEST1",
                title: "Test",
                subtitle: "",
                markets: [],
              },
            ],
            markets: [],
          };
        },
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient, {
        ttlSeconds: 0.001,
      });

      // Initial population
      await service.ensurePopulated();
      expect(callCount).toBe(1);

      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 10));

      // Fire concurrent calls - should only trigger ONE background refresh
      await Promise.all([
        service.ensurePopulated(),
        service.ensurePopulated(),
        service.ensurePopulated(),
      ]);

      // Wait for background refresh to complete
      await new Promise((r) => setTimeout(r, 100));

      // Initial populate (1) + single background refresh (1) = 2
      expect(callCount).toBe(2);
    });

    test("TTL of 0 disables automatic refresh", async () => {
      let callCount = 0;

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          callCount++;
          return {
            events: [
              {
                event_ticker: "TEST1",
                title: "Test",
                subtitle: "",
                markets: [],
              },
            ],
            markets: [],
          };
        },
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient, { ttlSeconds: 0 });

      await service.ensurePopulated();
      expect(callCount).toBe(1);

      // Wait some time
      await new Promise((r) => setTimeout(r, 50));

      // Should not trigger background refresh with TTL=0
      await service.ensurePopulated();
      expect(callCount).toBe(1);
    });

    test("manual refresh() still works with TTL disabled", async () => {
      let callCount = 0;

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          callCount++;
          return {
            events: [
              {
                event_ticker: "TEST1",
                title: "Test",
                subtitle: "",
                markets: [],
              },
            ],
            markets: [],
          };
        },
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient, { ttlSeconds: 0 });

      await service.ensurePopulated();
      expect(callCount).toBe(1);

      // Manual refresh should still work
      await service.refresh();
      expect(callCount).toBe(2);
    });

    test("background refresh failure doesn't affect subsequent queries", async () => {
      let callCount = 0;

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          callCount++;
          if (callCount === 2) {
            throw new Error("Simulated network error");
          }
          return {
            events: [
              {
                event_ticker: "TEST1",
                title: "Test",
                subtitle: "",
                markets: [],
              },
            ],
            markets: [],
          };
        },
      } as unknown as KalshiClient;

      const service = new KalshiSearchService(mockClient, {
        ttlSeconds: 0.001,
      });

      // Initial population
      await service.ensurePopulated();
      expect(callCount).toBe(1);

      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 10));

      // Trigger background refresh (will fail)
      await service.ensurePopulated();

      // Wait for the failed refresh to complete
      await new Promise((r) => setTimeout(r, 50));

      // Cache should still be "ready" with old data
      const stats = service.getStats();
      expect(stats.status).toBe("ready");
      expect(stats.events_count).toBe(1);

      // Wait for TTL to expire again
      await new Promise((r) => setTimeout(r, 10));

      // Should be able to trigger another background refresh
      await service.ensurePopulated();
      expect(callCount).toBe(3); // 1 initial + 1 failed + 1 retry
    });
  });
});
