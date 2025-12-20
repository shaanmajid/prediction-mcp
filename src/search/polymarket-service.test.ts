import { describe, expect, test } from "bun:test";
import type {
  PolymarketClient,
  PolymarketEvent,
  PolymarketMarket,
} from "../clients/polymarket.js";
import { PolymarketSearchService } from "./polymarket-service.js";

describe("PolymarketSearchService", () => {
  describe("cache lifecycle", () => {
    test("concurrent ensurePopulated() calls only trigger one API call", async () => {
      let callCount = 0;

      // Mock with delay to allow concurrent calls
      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          callCount++;
          await new Promise((r) => setTimeout(r, 50));
          return {
            events: [
              {
                slug: "test-event",
                title: "Test Event",
              } as PolymarketEvent,
            ],
            markets: [],
          };
        },
      } as unknown as PolymarketClient;

      const service = new PolymarketSearchService(mockClient);

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
                slug: "test-event",
                title: "Test Event",
              } as PolymarketEvent,
            ],
            markets: [
              {
                slug: "test-market",
                question: "Test Market?",
              } as PolymarketMarket,
            ],
          };
        },
      } as unknown as PolymarketClient;

      const service = new PolymarketSearchService(mockClient);

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
                slug: "test-event",
                title: "Test Event",
              } as PolymarketEvent,
            ],
            markets: [],
          };
        },
      } as unknown as PolymarketClient;

      const service = new PolymarketSearchService(mockClient);

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
      } as unknown as PolymarketClient;

      const service = new PolymarketSearchService(mockClient);
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
              slug: "test-event",
              title: "Test Event",
            } as PolymarketEvent,
          ],
          markets: [
            {
              slug: "test-market",
              question: "Test Market?",
            } as PolymarketMarket,
          ],
        }),
      } as unknown as PolymarketClient;

      const service = new PolymarketSearchService(mockClient);
      await service.ensurePopulated();

      const stats = service.getStats();
      expect(stats.status).toBe("ready");
      expect(stats.events_count).toBe(1);
      expect(stats.markets_count).toBe(1);
    });
  });

  describe("search operations", () => {
    test("searchEvents() triggers ensurePopulated and returns results", async () => {
      let populateCalled = false;

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          populateCalled = true;
          return {
            events: [
              {
                slug: "presidential-2028",
                title: "Presidential Election 2028",
              } as PolymarketEvent,
            ],
            markets: [],
          };
        },
      } as unknown as PolymarketClient;

      const service = new PolymarketSearchService(mockClient);
      const results = await service.searchEvents("presidential", 10);

      expect(populateCalled).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0]!.item.slug).toBe("presidential-2028");
    });

    test("searchMarkets() triggers ensurePopulated and returns results", async () => {
      let populateCalled = false;

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          populateCalled = true;
          return {
            events: [],
            markets: [
              {
                slug: "dem-nominee",
                question: "Who will be the Democratic nominee?",
              } as PolymarketMarket,
            ],
          };
        },
      } as unknown as PolymarketClient;

      const service = new PolymarketSearchService(mockClient);
      const results = await service.searchMarkets("democratic", 10);

      expect(populateCalled).toBe(true);
      expect(results.length).toBe(1);
    });

    test("search() triggers ensurePopulated and returns combined results", async () => {
      let populateCalled = false;

      const mockClient = {
        fetchAllEventsWithMarkets: async () => {
          populateCalled = true;
          return {
            events: [
              {
                slug: "presidential-2028",
                title: "Presidential Election 2028",
              } as PolymarketEvent,
            ],
            markets: [
              {
                slug: "presidential-nominee",
                question: "Presidential Nominee?",
              } as PolymarketMarket,
            ],
          };
        },
      } as unknown as PolymarketClient;

      const service = new PolymarketSearchService(mockClient);
      const results = await service.search("presidential", 10);

      expect(populateCalled).toBe(true);
      expect(results.length).toBe(2);
      const types = results.map((r) => r.type);
      expect(types).toContain("event");
      expect(types).toContain("market");
    });
  });
});
