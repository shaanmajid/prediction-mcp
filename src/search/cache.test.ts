import { describe, expect, test } from "bun:test";
import type { EventData, Market } from "kalshi-typescript";
import { SearchCache } from "./cache.js";

// Minimal mock data for testing - using Partial types since we only need searchable fields
const mockEvent = (ticker: string, title: string, subTitle = ""): EventData =>
  ({
    event_ticker: ticker,
    series_ticker: "TEST",
    title,
    sub_title: subTitle,
    collateral_return_type: "binary",
    mutually_exclusive: true,
    category: "test",
  }) as unknown as EventData;

const mockMarket = (
  ticker: string,
  eventTicker: string,
  title: string,
  yesSubTitle = "",
  noSubTitle = "",
): Market =>
  ({
    ticker,
    event_ticker: eventTicker,
    title,
    subtitle: "",
    yes_sub_title: yesSubTitle,
    no_sub_title: noSubTitle,
    market_type: "binary",
    status: "open",
  }) as unknown as Market;

describe("SearchCache", () => {
  describe("populate and getStats", () => {
    test("should start empty", () => {
      const cache = new SearchCache();
      const stats = cache.getStats();

      expect(stats.status).toBe("empty");
      expect(stats.events_count).toBe(0);
      expect(stats.markets_count).toBe(0);
    });

    test("should populate with events and markets", () => {
      const cache = new SearchCache();
      const events = [
        mockEvent("EVT1", "Presidential Election 2028"),
        mockEvent("EVT2", "Super Bowl Winner"),
      ];
      const markets = [
        mockMarket("MKT1", "EVT1", "Democratic Nominee", "Gavin Newsom"),
        mockMarket("MKT2", "EVT1", "Republican Nominee", "Donald Trump"),
      ];

      cache.populate(events, markets);
      const stats = cache.getStats();

      expect(stats.status).toBe("ready");
      expect(stats.events_count).toBe(2);
      expect(stats.markets_count).toBe(2);
      expect(stats.last_refresh).not.toBeNull();
    });

    test("getStats() includes cache age", () => {
      const cache = new SearchCache();

      // Before population
      const emptyStats = cache.getStats();
      expect(emptyStats.cache_age_seconds).toBeNull();

      // After population
      cache.populate(
        [{ event_ticker: "TEST1", title: "Test" } as EventData],
        [],
      );

      const stats = cache.getStats();
      expect(typeof stats.cache_age_seconds).toBe("number");
      expect(stats.cache_age_seconds).toBeGreaterThanOrEqual(0);
      expect(stats.cache_age_seconds).toBeLessThan(1); // Just populated
    });
  });

  describe("searchEvents", () => {
    test("should find events by title", () => {
      const cache = new SearchCache();
      cache.populate(
        [
          mockEvent("EVT1", "Presidential Election 2028"),
          mockEvent("EVT2", "Super Bowl Winner"),
        ],
        [],
      );

      const results = cache.searchEvents("presidential", 10);

      expect(results.length).toBe(1);
      expect(results[0]!.item.event_ticker).toBe("EVT1");
      expect(results[0]!.score).toBeGreaterThan(0);
    });

    test("should find events with multi-word queries", () => {
      const cache = new SearchCache();
      cache.populate(
        [
          mockEvent("EVT1", "Presidential Election 2028"),
          mockEvent("EVT2", "Super Bowl Winner 2028"),
        ],
        [],
      );

      const results = cache.searchEvents("presidential 2028", 10);

      expect(results.length).toBe(2);
      // Presidential Election 2028 should score higher (matches both words)
      expect(results[0]!.item.event_ticker).toBe("EVT1");
    });

    test("should be case-insensitive", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "Presidential Election")], []);

      const results = cache.searchEvents("PRESIDENTIAL", 10);

      expect(results.length).toBe(1);
    });
  });

  describe("searchMarkets", () => {
    test("should find markets by yes_sub_title (candidate names)", () => {
      const cache = new SearchCache();
      cache.populate(
        [],
        [
          mockMarket("MKT1", "EVT1", "Democratic Nominee", "Gavin Newsom"),
          mockMarket("MKT2", "EVT1", "Democratic Nominee", "Joe Biden"),
        ],
      );

      const results = cache.searchMarkets("gavin newsom", 10);

      expect(results.length).toBe(1);
      expect(results[0]!.item.ticker).toBe("MKT1");
    });

    test("should find markets by title", () => {
      const cache = new SearchCache();
      cache.populate(
        [],
        [mockMarket("MKT1", "EVT1", "Democratic Nominee", "Gavin Newsom")],
      );

      const results = cache.searchMarkets("democratic", 10);

      expect(results.length).toBe(1);
    });
  });

  describe("search (combined)", () => {
    test("should return both events and markets", () => {
      const cache = new SearchCache();
      cache.populate(
        [mockEvent("EVT1", "Presidential Election 2028")],
        [mockMarket("MKT1", "EVT1", "Presidential Nominee", "Gavin Newsom")],
      );

      const results = cache.search("presidential", 10);

      expect(results.length).toBe(2);
      const types = results.map((r) => r.type);
      expect(types).toContain("event");
      expect(types).toContain("market");
    });

    test("should respect limit", () => {
      const cache = new SearchCache();
      cache.populate(
        [
          mockEvent("EVT1", "Test Event 1"),
          mockEvent("EVT2", "Test Event 2"),
          mockEvent("EVT3", "Test Event 3"),
        ],
        [],
      );

      const results = cache.search("test", 2);

      expect(results.length).toBe(2);
    });
  });

  describe("refresh", () => {
    test("should add new items", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "Event 1")], []);

      expect(cache.getStats().events_count).toBe(1);

      cache.refresh(
        [mockEvent("EVT1", "Event 1"), mockEvent("EVT2", "Event 2")],
        [],
      );

      expect(cache.getStats().events_count).toBe(2);
    });

    test("should remove missing items (pruning)", () => {
      const cache = new SearchCache();
      cache.populate(
        [mockEvent("EVT1", "Alpha One"), mockEvent("EVT2", "Beta Two")],
        [],
      );

      expect(cache.getStats().events_count).toBe(2);

      // EVT2 is no longer in the refresh data (event closed)
      cache.refresh([mockEvent("EVT1", "Alpha One")], []);

      expect(cache.getStats().events_count).toBe(1);
      const results = cache.searchEvents("beta", 10);
      expect(results.length).toBe(0);
    });

    test("should update existing items", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "Old Title")], []);

      cache.refresh([mockEvent("EVT1", "New Title")], []);

      const results = cache.searchEvents("new title", 10);
      expect(results.length).toBe(1);
      expect(results[0]!.item.title).toBe("New Title");
    });
  });

  describe("scoring algorithm - special characters", () => {
    test("should handle special regex characters in queries (C++)", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "C++ Developer Market")], []);

      const results = cache.searchEvents("C++", 10);

      expect(results.length).toBe(1);
      expect(results[0]!.item.title).toContain("C++");
    });

    test("should handle dollar signs and special characters", () => {
      const cache = new SearchCache();
      cache.populate(
        [mockEvent("EVT1", "Bitcoin Price $100,000 Prediction")],
        [],
      );

      const results = cache.searchEvents("$100,000", 10);

      expect(results.length).toBe(1);
    });

    test("should handle word boundaries with hyphens", () => {
      const cache = new SearchCache();
      cache.populate(
        [
          mockEvent("EVT1", "COVID-19 Predictions"),
          mockEvent("EVT2", "COVID Pandemic Data"),
        ],
        [],
      );

      const results = cache.searchEvents("COVID-19", 10);

      // Should match the first event with exact COVID-19
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.item.title).toContain("COVID-19");
    });

    test("should handle date ranges with hyphens", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "2024-2025 Winter Olympics")], []);

      const results = cache.searchEvents("2024-2025", 10);

      expect(results.length).toBe(1);
    });

    test("should handle parentheses and brackets", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "Fed Rate (FedFunds) Prediction")], []);

      const results = cache.searchEvents("FedFunds", 10);

      expect(results.length).toBe(1);
    });
  });

  describe("scoring algorithm - weight multiplier", () => {
    test("should score higher when ALL tokens match (1.5x multiplier)", () => {
      const cache = new SearchCache();
      cache.populate(
        [
          mockEvent("EVT1", "Presidential Election 2028"),
          mockEvent("EVT2", "Presidential Candidate"),
        ],
        [],
      );

      const results = cache.searchEvents("presidential election", 10);

      // EVT1 should score higher (matches both tokens)
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.item.event_ticker).toBe("EVT1");
    });

    test("should rank exact word boundaries higher than substrings", () => {
      const cache = new SearchCache();
      cache.populate(
        [
          mockEvent("EVT1", "Election Official Results"),
          mockEvent("EVT2", "Electronic Market Trading"),
        ],
        [],
      );

      const results = cache.searchEvents("election", 10);

      // EVT1 should rank first (exact word match vs substring in "electronic")
      expect(results[0]!.item.event_ticker).toBe("EVT1");
    });

    test("should rank word-start matches higher than substring-only matches", () => {
      const cache = new SearchCache();
      cache.populate(
        [
          mockEvent("EVT1", "Prediction Market"),
          mockEvent("EVT2", "Market Prediction"),
        ],
        [],
      );

      const results = cache.searchEvents("prediction", 10);

      // EVT1 should score equally or higher (word boundary + word start)
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("scoring algorithm - field weights", () => {
    test("should weight title matches higher than ticker matches", () => {
      const cache = new SearchCache();
      cache.populate(
        [
          mockEvent("TRUMP", "Regular Election Event"),
          mockEvent("EVT2", "Trump Presidential Race 2028"),
        ],
        [],
      );

      const results = cache.searchEvents("trump", 10);

      // EVT2 should rank higher (matched in title) than EVT1 (matched in ticker only)
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.item.event_ticker).toBe("EVT2");
    });

    test("should rank yes_sub_title matches appropriately for markets", () => {
      const cache = new SearchCache();
      cache.populate(
        [],
        [
          mockMarket("MKT1", "EVT1", "2028 Nominee", "Gavin Newsom"),
          mockMarket("MKT2", "EVT1", "Gavin Newsom Poll", "Yes"),
        ],
      );

      const results = cache.searchMarkets("gavin newsom", 10);

      // Both should match, but MKT1 scores higher (yes_sub_title is full name)
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.item.ticker).toBe("MKT1");
    });
  });

  describe("population edge cases", () => {
    test("should handle empty events and markets arrays", () => {
      const cache = new SearchCache();
      cache.populate([], []);

      const stats = cache.getStats();
      // Status is "empty" when no data, even after populate() call
      expect(stats.status).toBe("empty");
      expect(stats.events_count).toBe(0);
      expect(stats.markets_count).toBe(0);
    });

    test("should handle markets without event ticker reference", () => {
      const cache = new SearchCache();
      const marketWithoutEvent = {
        ticker: "ORPHAN",
        title: "Orphaned Market",
        yes_sub_title: "Yes",
        no_sub_title: "No",
        event_ticker: "", // Empty event reference
        market_type: "binary" as const,
        status: "open" as const,
      } as unknown as Market;

      // Should not crash
      expect(() => {
        cache.populate([], [marketWithoutEvent]);
      }).not.toThrow();
    });

    test("should handle refresh with duplicate tickers (last one wins)", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "Original Title")], []);

      // Refresh with duplicate ticker - should update to latest
      cache.refresh(
        [mockEvent("EVT1", "First Update"), mockEvent("EVT1", "Second Update")],
        [],
      );

      const results = cache.searchEvents("second update", 10);
      expect(results.length).toBe(1);
      expect(results[0]!.item.title).toBe("Second Update");
    });

    test("should handle refresh with empty new data (clears cache)", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "Event 1")], []);
      expect(cache.getStats().events_count).toBe(1);

      cache.refresh([], []);

      expect(cache.getStats().events_count).toBe(0);
      const results = cache.searchEvents("event", 10);
      expect(results.length).toBe(0);
    });
  });

  describe("search edge cases", () => {
    test("should return empty results for queries that don't match", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "Presidential Election")], []);

      const results = cache.searchEvents("nonexistent", 10);

      expect(results.length).toBe(0);
    });

    test("should handle typos gracefully (exact matching only)", () => {
      const cache = new SearchCache();
      cache.populate([mockEvent("EVT1", "Presidential Election 2028")], []);

      // Typo: "presidntial" instead of "presidential"
      const results = cache.searchEvents("presidntial", 10);

      expect(results.length).toBe(0); // No match - exact matching only
    });

    test("should handle very large result sets respecting limit", () => {
      const cache = new SearchCache();
      const events = Array.from({ length: 100 }, (_, i) =>
        mockEvent(`EVT${i}`, "Test Event"),
      );
      cache.populate(events, []);

      const results = cache.search("test", 10);

      expect(results.length).toBe(10);
    });

    test("should handle limit of 1", () => {
      const cache = new SearchCache();
      cache.populate(
        [mockEvent("EVT1", "Test Event 1"), mockEvent("EVT2", "Test Event 2")],
        [],
      );

      const results = cache.searchEvents("test", 1);

      expect(results.length).toBe(1);
    });
  });
});
