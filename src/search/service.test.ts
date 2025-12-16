import { describe, test, expect } from "bun:test";
import type { Market } from "kalshi-typescript";
import { SearchService } from "./service.js";
import { KalshiClient } from "../clients/kalshi.js";

describe("SearchService", () => {
  describe("cache lifecycle", () => {
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

      const service = new SearchService(mockClient);

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

      const service = new SearchService(mockClient);

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

      const service = new SearchService(mockClient);
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

      const service = new SearchService(mockClient);
      await service.ensurePopulated();

      const stats = service.getStats();
      expect(stats.status).toBe("ready");
      expect(stats.events_count).toBe(1);
      expect(stats.markets_count).toBe(1);
    });
  });
});
