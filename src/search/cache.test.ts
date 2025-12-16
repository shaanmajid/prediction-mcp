import { describe, test, expect } from "bun:test";
import { SearchCache } from "./cache.js";
import type { EventData, Market } from "kalshi-typescript";

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
});
