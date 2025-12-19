import { describe, test, expect } from "bun:test";
import { PolymarketSearchCache } from "./polymarket-cache.js";
import type {
  PolymarketEvent,
  PolymarketMarket,
} from "../clients/polymarket.js";

// Helper to create mock events with only searchable fields
const mockEvent = (
  slug: string,
  title: string,
  description = "",
): PolymarketEvent =>
  ({
    slug,
    title,
    description,
    id: `evt-${slug}`,
  }) as unknown as PolymarketEvent;

// Helper to create mock markets with Polymarket-specific fields
const mockMarket = (
  slug: string,
  question: string,
  groupItemTitle = "",
  outcomes = '["Yes", "No"]',
  description = "",
): PolymarketMarket =>
  ({
    slug,
    question,
    description,
    outcomes,
    groupItemTitle,
    conditionId: `cond-${slug}`,
  }) as unknown as PolymarketMarket;

describe("PolymarketSearchCache", () => {
  describe("populate and getStats", () => {
    test("should start empty", () => {
      const cache = new PolymarketSearchCache();
      const stats = cache.getStats();

      expect(stats.status).toBe("empty");
      expect(stats.events_count).toBe(0);
      expect(stats.markets_count).toBe(0);
    });

    test("should populate with events and markets", () => {
      const cache = new PolymarketSearchCache();
      const events = [
        mockEvent("presidential-2028", "Presidential Election 2028"),
        mockEvent("super-bowl-winner", "Super Bowl Winner"),
      ];
      const markets = [
        mockMarket("dem-nominee", "Who will be the Democratic nominee?"),
        mockMarket("rep-nominee", "Who will be the Republican nominee?"),
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
      const cache = new PolymarketSearchCache();
      cache.populate(
        [
          mockEvent("presidential-2028", "Presidential Election 2028"),
          mockEvent("super-bowl", "Super Bowl Winner"),
        ],
        [],
      );

      const results = cache.searchEvents("presidential", 10);

      expect(results.length).toBe(1);
      expect(results[0]!.item.slug).toBe("presidential-2028");
      expect(results[0]!.score).toBeGreaterThan(0);
    });

    test("should find events by slug", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [mockEvent("trump-win-2024", "Will Trump Win in 2024?")],
        [],
      );

      const results = cache.searchEvents("trump-win", 10);

      expect(results.length).toBe(1);
    });

    test("should find events by description", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [
          mockEvent(
            "nfl-2024",
            "NFL Season",
            "Football predictions for the 2024 season",
          ),
        ],
        [],
      );

      const results = cache.searchEvents("football", 10);

      expect(results.length).toBe(1);
    });

    test("should be case-insensitive", () => {
      const cache = new PolymarketSearchCache();
      cache.populate([mockEvent("test", "Presidential Election")], []);

      const results = cache.searchEvents("PRESIDENTIAL", 10);

      expect(results.length).toBe(1);
    });
  });

  describe("searchMarkets", () => {
    test("should find markets by question field", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [],
        [
          mockMarket("dem-nominee", "Who will be the Democratic nominee?"),
          mockMarket("rep-nominee", "Who will be the Republican nominee?"),
        ],
      );

      const results = cache.searchMarkets("democratic", 10);

      expect(results.length).toBe(1);
      expect(results[0]!.item.slug).toBe("dem-nominee");
    });

    test("should find markets by groupItemTitle (candidate/outcome name)", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [],
        [
          mockMarket("tech-ceo-1", "Will this CEO stay?", "Tim Cook - Apple"),
          mockMarket(
            "tech-ceo-2",
            "Will this CEO stay?",
            "Sundar Pichai - Google",
          ),
        ],
      );

      const results = cache.searchMarkets("tim cook", 10);

      expect(results.length).toBe(1);
      expect(results[0]!.item.slug).toBe("tech-ceo-1");
    });

    test("should find markets by outcomes JSON field", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [],
        [
          mockMarket(
            "bracket-1",
            "Which team wins?",
            "",
            '["Lakers", "Celtics", "Warriors"]',
          ),
        ],
      );

      const results = cache.searchMarkets("lakers", 10);

      expect(results.length).toBe(1);
    });

    test("should handle malformed outcomes JSON gracefully", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [],
        [mockMarket("test", "Test market", "", "not valid json")],
      );

      // Should not crash, just won't find matches via outcomes
      const results = cache.searchMarkets("test", 10);
      expect(results.length).toBe(1);
    });
  });

  describe("search (combined)", () => {
    test("should return both events and markets", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [mockEvent("presidential-2028", "Presidential Election 2028")],
        [mockMarket("presidential-nominee", "Presidential Nominee 2028")],
      );

      const results = cache.search("presidential", 10);

      expect(results.length).toBe(2);
      const types = results.map((r) => r.type);
      expect(types).toContain("event");
      expect(types).toContain("market");
    });

    test("should respect limit", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [
          mockEvent("test-1", "Test Event 1"),
          mockEvent("test-2", "Test Event 2"),
          mockEvent("test-3", "Test Event 3"),
        ],
        [],
      );

      const results = cache.search("test", 2);

      expect(results.length).toBe(2);
    });

    test("should return empty for empty query tokens", () => {
      const cache = new PolymarketSearchCache();
      cache.populate([mockEvent("test", "Test Event")], []);

      const results = cache.search("   ", 10);

      expect(results.length).toBe(0);
    });
  });

  describe("refresh", () => {
    test("should add new items", () => {
      const cache = new PolymarketSearchCache();
      cache.populate([mockEvent("evt-1", "Event 1")], []);

      expect(cache.getStats().events_count).toBe(1);

      cache.refresh(
        [mockEvent("evt-1", "Event 1"), mockEvent("evt-2", "Event 2")],
        [],
      );

      expect(cache.getStats().events_count).toBe(2);
    });

    test("should remove missing items (pruning)", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [mockEvent("evt-1", "Alpha One"), mockEvent("evt-2", "Beta Two")],
        [],
      );

      expect(cache.getStats().events_count).toBe(2);

      // EVT-2 no longer present
      cache.refresh([mockEvent("evt-1", "Alpha One")], []);

      expect(cache.getStats().events_count).toBe(1);
      const results = cache.searchEvents("beta", 10);
      expect(results.length).toBe(0);
    });

    test("should update existing items", () => {
      const cache = new PolymarketSearchCache();
      cache.populate([mockEvent("evt-1", "Old Title")], []);

      cache.refresh([mockEvent("evt-1", "New Title")], []);

      const results = cache.searchEvents("new title", 10);
      expect(results.length).toBe(1);
      expect(results[0]!.item.title).toBe("New Title");
    });
  });

  describe("field weights", () => {
    test("should rank question matches higher than description matches", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [],
        [
          mockMarket("mkt-1", "Will Bitcoin reach 100k?", "", "[]", ""),
          mockMarket(
            "mkt-2",
            "Market about crypto",
            "",
            "[]",
            "Bitcoin price discussion",
          ),
        ],
      );

      const results = cache.searchMarkets("bitcoin", 10);

      // Market with "bitcoin" in question should rank higher
      expect(results.length).toBe(2);
      expect(results[0]!.item.slug).toBe("mkt-1");
    });

    test("should rank groupItemTitle high for candidate searches", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [],
        [
          mockMarket("mkt-1", "2028 Election", "Gavin Newsom"),
          mockMarket("mkt-2", "Gavin Newsom Analysis", ""),
        ],
      );

      const results = cache.searchMarkets("gavin newsom", 10);

      // Both should match, groupItemTitle is weighted 0.9 vs question at 1.0
      expect(results.length).toBe(2);
    });

    test("should rank title matches higher than slug for events", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [
          mockEvent("trump-poll", "Regular Event"),
          mockEvent("election-2028", "Trump Presidential Race"),
        ],
        [],
      );

      const results = cache.searchEvents("trump", 10);

      // Title match (weight 1.0) should rank higher than slug match (weight 0.5)
      expect(results[0]!.item.slug).toBe("election-2028");
    });
  });

  describe("edge cases", () => {
    test("should handle empty events and markets arrays", () => {
      const cache = new PolymarketSearchCache();
      cache.populate([], []);

      const stats = cache.getStats();
      expect(stats.status).toBe("empty");
    });

    test("should handle events/markets without slug", () => {
      const cache = new PolymarketSearchCache();
      const eventWithoutSlug = {
        title: "Test Event",
        slug: undefined,
      } as unknown as PolymarketEvent;

      expect(() => {
        cache.populate([eventWithoutSlug], []);
      }).not.toThrow();

      // Should not be stored (slug is the key)
      expect(cache.getStats().events_count).toBe(0);
    });

    test("should handle special characters in searches", () => {
      const cache = new PolymarketSearchCache();
      cache.populate([mockEvent("covid-19", "COVID-19 Predictions")], []);

      const results = cache.searchEvents("COVID-19", 10);
      expect(results.length).toBe(1);
    });

    test("should handle limit of 1", () => {
      const cache = new PolymarketSearchCache();
      cache.populate(
        [mockEvent("test-1", "Test 1"), mockEvent("test-2", "Test 2")],
        [],
      );

      const results = cache.searchEvents("test", 1);
      expect(results.length).toBe(1);
    });
  });
});
