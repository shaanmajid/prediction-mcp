import { describe, test, expect } from "bun:test";
import {
  ListMarketsArgsSchema,
  GetMarketArgsSchema,
  GetOrderbookArgsSchema,
  GetTradesArgsSchema,
  GetSeriesArgsSchema,
  GetEventArgsSchema,
  SearchQuerySchema,
  CacheStatsSchema,
  PolymarketListMarketsArgsSchema,
  PolymarketGetMarketArgsSchema,
  PolymarketListEventsArgsSchema,
  PolymarketGetEventArgsSchema,
  PolymarketListTagsArgsSchema,
  PolymarketGetOrderbookArgsSchema,
  PolymarketGetPriceArgsSchema,
  PolymarketGetPriceHistoryArgsSchema,
  toMCPSchema,
} from "./validation.js";

/**
 * Unit tests for Zod validation schemas
 *
 * These tests verify that schemas:
 * 1. Accept valid inputs
 * 2. Reject invalid inputs with clear errors
 * 3. Enforce constraints (min/max, enums, required fields)
 * 4. Reject extra properties (strict mode)
 */

describe("Kalshi Schemas", () => {
  describe("ListMarketsArgsSchema", () => {
    test("accepts empty object (all fields optional)", () => {
      const result = ListMarketsArgsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test("accepts valid status enum values", () => {
      for (const status of ["open", "closed", "settled"]) {
        const result = ListMarketsArgsSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    test("rejects invalid status value", () => {
      const result = ListMarketsArgsSchema.safeParse({ status: "invalid" });
      expect(result.success).toBe(false);
    });

    test("accepts limit within bounds (1-1000)", () => {
      expect(ListMarketsArgsSchema.safeParse({ limit: 1 }).success).toBe(true);
      expect(ListMarketsArgsSchema.safeParse({ limit: 500 }).success).toBe(
        true,
      );
      expect(ListMarketsArgsSchema.safeParse({ limit: 1000 }).success).toBe(
        true,
      );
    });

    test("rejects limit below minimum", () => {
      const result = ListMarketsArgsSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    test("rejects limit above maximum", () => {
      const result = ListMarketsArgsSchema.safeParse({ limit: 1001 });
      expect(result.success).toBe(false);
    });

    test("rejects non-integer limit", () => {
      const result = ListMarketsArgsSchema.safeParse({ limit: 10.5 });
      expect(result.success).toBe(false);
    });

    test("accepts valid eventTicker and seriesTicker", () => {
      const result = ListMarketsArgsSchema.safeParse({
        eventTicker: "KXPRESIDENT",
        seriesTicker: "PRES-2024",
      });
      expect(result.success).toBe(true);
    });

    test("rejects extra properties (strict mode)", () => {
      const result = ListMarketsArgsSchema.safeParse({
        status: "open",
        unknownField: "value",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("GetMarketArgsSchema", () => {
    test("accepts valid ticker string", () => {
      const result = GetMarketArgsSchema.safeParse({
        ticker: "KXPRESIDENT-2024",
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty ticker", () => {
      const result = GetMarketArgsSchema.safeParse({ ticker: "" });
      expect(result.success).toBe(false);
    });

    test("rejects missing ticker", () => {
      const result = GetMarketArgsSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    test("rejects extra properties", () => {
      const result = GetMarketArgsSchema.safeParse({
        ticker: "KXPRESIDENT",
        extra: "field",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("GetOrderbookArgsSchema", () => {
    test("accepts valid ticker", () => {
      const result = GetOrderbookArgsSchema.safeParse({ ticker: "KXTEST" });
      expect(result.success).toBe(true);
    });

    test("rejects empty ticker", () => {
      const result = GetOrderbookArgsSchema.safeParse({ ticker: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("GetTradesArgsSchema", () => {
    test("accepts empty object (all optional)", () => {
      const result = GetTradesArgsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test("accepts valid ticker and limit", () => {
      const result = GetTradesArgsSchema.safeParse({
        ticker: "KXTEST",
        limit: 100,
      });
      expect(result.success).toBe(true);
    });

    test("rejects limit outside bounds", () => {
      expect(GetTradesArgsSchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(GetTradesArgsSchema.safeParse({ limit: 1001 }).success).toBe(
        false,
      );
    });
  });

  describe("GetSeriesArgsSchema", () => {
    test("accepts valid seriesTicker", () => {
      const result = GetSeriesArgsSchema.safeParse({
        seriesTicker: "PRES-2024",
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty seriesTicker", () => {
      const result = GetSeriesArgsSchema.safeParse({ seriesTicker: "" });
      expect(result.success).toBe(false);
    });

    test("rejects missing seriesTicker", () => {
      const result = GetSeriesArgsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("GetEventArgsSchema", () => {
    test("accepts valid eventTicker", () => {
      const result = GetEventArgsSchema.safeParse({
        eventTicker: "KXPRESIDENT",
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty eventTicker", () => {
      const result = GetEventArgsSchema.safeParse({ eventTicker: "" });
      expect(result.success).toBe(false);
    });

    test("rejects missing eventTicker", () => {
      const result = GetEventArgsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("SearchQuerySchema", () => {
    test("accepts valid query and limit", () => {
      const result = SearchQuerySchema.safeParse({
        query: "election",
        limit: 10,
      });
      expect(result.success).toBe(true);
    });

    test("accepts query with default limit", () => {
      const result = SearchQuerySchema.safeParse({ query: "trump" });
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(20);
    });

    test("rejects empty query", () => {
      const result = SearchQuerySchema.safeParse({ query: "", limit: 10 });
      expect(result.success).toBe(false);
    });

    test("rejects missing query", () => {
      const result = SearchQuerySchema.safeParse({ limit: 10 });
      expect(result.success).toBe(false);
    });

    test("accepts limit within bounds (1-100)", () => {
      expect(
        SearchQuerySchema.safeParse({ query: "test", limit: 1 }).success,
      ).toBe(true);
      expect(
        SearchQuerySchema.safeParse({ query: "test", limit: 50 }).success,
      ).toBe(true);
      expect(
        SearchQuerySchema.safeParse({ query: "test", limit: 100 }).success,
      ).toBe(true);
    });

    test("rejects limit below minimum", () => {
      const result = SearchQuerySchema.safeParse({ query: "test", limit: 0 });
      expect(result.success).toBe(false);
    });

    test("rejects limit above maximum", () => {
      const result = SearchQuerySchema.safeParse({ query: "test", limit: 101 });
      expect(result.success).toBe(false);
    });

    test("rejects non-integer limit", () => {
      const result = SearchQuerySchema.safeParse({
        query: "test",
        limit: 10.5,
      });
      expect(result.success).toBe(false);
    });

    test("rejects extra properties (strict mode)", () => {
      const result = SearchQuerySchema.safeParse({
        query: "test",
        limit: 10,
        extra: "field",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CacheStatsSchema", () => {
    test("accepts empty object (defaults refresh to false)", () => {
      const result = CacheStatsSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.refresh).toBe(false);
    });

    test("accepts explicit refresh true", () => {
      const result = CacheStatsSchema.safeParse({ refresh: true });
      expect(result.success).toBe(true);
      expect(result.data?.refresh).toBe(true);
    });

    test("accepts explicit refresh false", () => {
      const result = CacheStatsSchema.safeParse({ refresh: false });
      expect(result.success).toBe(true);
      expect(result.data?.refresh).toBe(false);
    });

    test("rejects non-boolean refresh", () => {
      const result = CacheStatsSchema.safeParse({ refresh: "yes" });
      expect(result.success).toBe(false);
    });

    test("rejects non-boolean refresh as number", () => {
      const result = CacheStatsSchema.safeParse({ refresh: 1 });
      expect(result.success).toBe(false);
    });

    test("rejects extra properties (strict mode)", () => {
      const result = CacheStatsSchema.safeParse({
        refresh: true,
        extra: "field",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Polymarket Schemas", () => {
  describe("PolymarketListMarketsArgsSchema", () => {
    test("accepts empty object (all optional)", () => {
      const result = PolymarketListMarketsArgsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test("accepts valid closed boolean", () => {
      expect(
        PolymarketListMarketsArgsSchema.safeParse({ closed: true }).success,
      ).toBe(true);
      expect(
        PolymarketListMarketsArgsSchema.safeParse({ closed: false }).success,
      ).toBe(true);
    });

    test("accepts valid limit and offset", () => {
      const result = PolymarketListMarketsArgsSchema.safeParse({
        limit: 50,
        offset: 10,
      });
      expect(result.success).toBe(true);
    });

    test("rejects negative offset", () => {
      const result = PolymarketListMarketsArgsSchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });

    test("accepts valid tag_id", () => {
      const result = PolymarketListMarketsArgsSchema.safeParse({
        tag_id: "politics",
      });
      expect(result.success).toBe(true);
    });

    test("rejects extra properties", () => {
      const result = PolymarketListMarketsArgsSchema.safeParse({
        unknownField: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("PolymarketGetMarketArgsSchema", () => {
    test("accepts valid slug", () => {
      const result = PolymarketGetMarketArgsSchema.safeParse({
        slug: "will-trump-win-2024",
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty slug", () => {
      const result = PolymarketGetMarketArgsSchema.safeParse({ slug: "" });
      expect(result.success).toBe(false);
    });

    test("rejects missing slug", () => {
      const result = PolymarketGetMarketArgsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("PolymarketListEventsArgsSchema", () => {
    test("accepts empty object", () => {
      const result = PolymarketListEventsArgsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test("accepts all valid parameters", () => {
      const result = PolymarketListEventsArgsSchema.safeParse({
        closed: false,
        limit: 100,
        offset: 0,
        tag_id: "sports",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("PolymarketGetEventArgsSchema", () => {
    test("accepts valid slug", () => {
      const result = PolymarketGetEventArgsSchema.safeParse({
        slug: "2024-presidential-election",
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty slug", () => {
      const result = PolymarketGetEventArgsSchema.safeParse({ slug: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("PolymarketListTagsArgsSchema", () => {
    test("accepts empty object", () => {
      const result = PolymarketListTagsArgsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test("rejects extra properties", () => {
      const result = PolymarketListTagsArgsSchema.safeParse({ extra: "field" });
      expect(result.success).toBe(false);
    });
  });

  describe("PolymarketGetOrderbookArgsSchema", () => {
    test("accepts valid token_id", () => {
      const result = PolymarketGetOrderbookArgsSchema.safeParse({
        token_id: "12345678901234567890",
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty token_id", () => {
      const result = PolymarketGetOrderbookArgsSchema.safeParse({
        token_id: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("PolymarketGetPriceArgsSchema", () => {
    test("accepts valid BUY side", () => {
      const result = PolymarketGetPriceArgsSchema.safeParse({
        token_id: "12345",
        side: "BUY",
      });
      expect(result.success).toBe(true);
    });

    test("accepts valid SELL side", () => {
      const result = PolymarketGetPriceArgsSchema.safeParse({
        token_id: "12345",
        side: "SELL",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid side value", () => {
      const result = PolymarketGetPriceArgsSchema.safeParse({
        token_id: "12345",
        side: "HOLD",
      });
      expect(result.success).toBe(false);
    });

    test("rejects missing side", () => {
      const result = PolymarketGetPriceArgsSchema.safeParse({
        token_id: "12345",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("PolymarketGetPriceHistoryArgsSchema", () => {
    test("accepts minimal valid input", () => {
      const result = PolymarketGetPriceHistoryArgsSchema.safeParse({
        token_id: "12345",
      });
      expect(result.success).toBe(true);
    });

    test("accepts full valid input", () => {
      const result = PolymarketGetPriceHistoryArgsSchema.safeParse({
        token_id: "12345",
        fidelity: 60,
        startTs: 1700000000,
        endTs: 1700100000,
      });
      expect(result.success).toBe(true);
    });

    test("rejects fidelity below minimum", () => {
      const result = PolymarketGetPriceHistoryArgsSchema.safeParse({
        token_id: "12345",
        fidelity: 0,
      });
      expect(result.success).toBe(false);
    });

    test("rejects non-integer timestamps", () => {
      const result = PolymarketGetPriceHistoryArgsSchema.safeParse({
        token_id: "12345",
        startTs: 1700000000.5,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("toMCPSchema()", () => {
  test("generates valid JSON Schema with type object", () => {
    const schema = toMCPSchema(ListMarketsArgsSchema);
    expect(schema.type).toBe("object");
  });

  test("includes properties object", () => {
    const schema = toMCPSchema(ListMarketsArgsSchema);
    expect(schema.properties).toBeDefined();
    expect(typeof schema.properties).toBe("object");
  });

  test("includes descriptions from Zod schema", () => {
    const schema = toMCPSchema(ListMarketsArgsSchema) as {
      properties: Record<string, { description?: string }>;
    };
    expect(schema.properties.status?.description).toBeDefined();
    expect(typeof schema.properties.status?.description).toBe("string");
  });

  test("marks required fields correctly for required schema", () => {
    const schema = toMCPSchema(GetMarketArgsSchema) as {
      required?: string[];
    };
    expect(schema.required).toContain("ticker");
  });

  test("handles optional-only schema (no required array or empty)", () => {
    const schema = toMCPSchema(ListMarketsArgsSchema) as {
      required?: string[];
    };
    // All fields optional, so required should be empty or undefined
    expect(
      schema.required === undefined ||
        (Array.isArray(schema.required) && schema.required.length === 0),
    ).toBe(true);
  });

  test("handles enum constraints", () => {
    const schema = toMCPSchema(PolymarketGetPriceArgsSchema) as {
      properties: Record<string, { enum?: string[] }>;
    };
    expect(schema.properties.side?.enum).toBeDefined();
    expect(schema.properties.side?.enum).toContain("BUY");
    expect(schema.properties.side?.enum).toContain("SELL");
  });

  test("handles number constraints", () => {
    const schema = toMCPSchema(ListMarketsArgsSchema) as {
      properties: Record<string, { minimum?: number; maximum?: number }>;
    };
    expect(schema.properties.limit?.minimum).toBe(1);
    expect(schema.properties.limit?.maximum).toBe(1000);
  });
});
