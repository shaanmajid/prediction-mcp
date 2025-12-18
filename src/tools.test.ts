import { describe, test, expect } from "bun:test";
import { KalshiClient } from "./clients/kalshi.js";
import { PolymarketClient } from "./clients/polymarket.js";
import { SearchService } from "./search/index.js";
import { TOOLS, getToolsList, type ToolContext } from "./tools.js";
import { kalshiConfig, polymarketConfig } from "./env.js";

/** Tests for MCP tools module. */

// ============================================================
// Unit Tests
// ============================================================

describe("getToolsList()", () => {
  test("returns array of all registered tools", () => {
    const tools = getToolsList();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);

    // Should have both Kalshi and Polymarket tools
    const kalshiTools = tools.filter((t) => t.name.startsWith("kalshi_"));
    const polymarketTools = tools.filter((t) =>
      t.name.startsWith("polymarket_"),
    );

    expect(kalshiTools.length).toBeGreaterThan(0);
    expect(polymarketTools.length).toBeGreaterThan(0);
  });

  test("each tool has required MCP properties", () => {
    const tools = getToolsList();

    for (const tool of tools) {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe("string");
      expect(tool.name.length).toBeGreaterThan(0);

      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe("string");
      expect(tool.description.length).toBeGreaterThan(0);

      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.inputSchema).toBe("object");
    }
  });

  test("tool names follow platform_action convention", () => {
    const tools = getToolsList();
    const validPrefixes = ["kalshi_", "polymarket_"];

    for (const tool of tools) {
      const hasValidPrefix = validPrefixes.some((prefix) =>
        tool.name.startsWith(prefix),
      );
      expect(hasValidPrefix).toBe(true);
    }
  });

  test("inputSchema has valid JSON Schema structure", () => {
    const tools = getToolsList();

    for (const tool of tools) {
      const schema = tool.inputSchema as {
        type?: string;
        properties?: Record<string, unknown>;
      };

      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();
      expect(typeof schema.properties).toBe("object");
    }
  });

  test("tool count matches TOOLS registry", () => {
    const tools = getToolsList();
    const registeredToolCount = Object.keys(TOOLS).length;

    expect(tools.length).toBe(registeredToolCount);
  });
});

// ============================================================
// Polymarket Tool Handler Integration Tests
// ============================================================

describe("Polymarket Tool Handler Integration Tests", () => {
  const ctx: ToolContext = {
    kalshi: new KalshiClient(kalshiConfig),
    polymarket: new PolymarketClient(polymarketConfig),
    searchService: new SearchService(new KalshiClient(kalshiConfig)),
  };

  test("polymarket_get_price returns price and midpoint", async () => {
    // Search through markets until we find one with valid CLOB token IDs
    const listTool = TOOLS.polymarket_list_markets!;
    const MAX_PAGES = 5;
    let testTokenId: string | undefined;

    for (let page = 0; page < MAX_PAGES && !testTokenId; page++) {
      const result = (await listTool.handler(ctx, {
        closed: false,
        limit: 100,
        offset: page * 100,
      })) as { markets: Array<{ clobTokenIds?: string }> };

      if (result.markets.length === 0) break;

      for (const market of result.markets) {
        if (market.clobTokenIds) {
          try {
            const tokenIds = JSON.parse(market.clobTokenIds as string);
            if (Array.isArray(tokenIds) && tokenIds.length > 0) {
              testTokenId = tokenIds[0];
              break;
            }
          } catch {
            const tokenIds = (market.clobTokenIds as string).split(",");
            if (tokenIds[0]?.trim()) {
              testTokenId = tokenIds[0].trim();
              break;
            }
          }
        }
      }
    }

    expect(testTokenId).toBeDefined();

    const tool = TOOLS.polymarket_get_price!;
    const result = (await tool.handler(ctx, {
      token_id: testTokenId!,
      side: "BUY",
    })) as { price: string; midpoint: string; side: string };

    // Verify the handler correctly composes both API calls
    expect(result).toBeDefined();
    expect(result.price).toBeDefined();
    expect(typeof result.price).toBe("string");
    expect(result.midpoint).toBeDefined();
    expect(typeof result.midpoint).toBe("string");
    expect(result.side).toBe("BUY");

    // Verify prices are valid numbers in [0, 1] range
    const price = parseFloat(result.price);
    const midpoint = parseFloat(result.midpoint);
    expect(price).toBeGreaterThanOrEqual(0);
    expect(price).toBeLessThanOrEqual(1);
    expect(midpoint).toBeGreaterThanOrEqual(0);
    expect(midpoint).toBeLessThanOrEqual(1);
  });
});

// ============================================================
// Kalshi Integration Tests
// ============================================================

describe("Kalshi Tool Integration Tests", () => {
  const ctx: ToolContext = {
    kalshi: new KalshiClient(kalshiConfig),
    polymarket: new PolymarketClient(polymarketConfig),
    searchService: new SearchService(new KalshiClient(kalshiConfig)),
  };

  test("kalshi_list_markets returns markets array", async () => {
    const tool = TOOLS.kalshi_list_markets!;
    const result = (await tool.handler(ctx, { limit: 5 })) as {
      markets: Array<{ ticker: string; event_ticker: string }>;
    };

    expect(result).toBeDefined();
    expect(Array.isArray(result.markets)).toBe(true);
    expect(result.markets.length).toBeGreaterThan(0);
    expect(result.markets.length).toBeLessThanOrEqual(5);

    const market = result.markets[0]!;
    expect(typeof market.ticker).toBe("string");
  });

  test("kalshi_get_market returns market details", async () => {
    // Get an open market - Kalshi should always have open markets
    const listTool = TOOLS.kalshi_list_markets!;
    const listResult = (await listTool.handler(ctx, {
      status: "open",
      limit: 10,
    })) as { markets: Array<{ ticker: string }> };

    expect(listResult.markets.length).toBeGreaterThan(0);

    const ticker = listResult.markets[0]!.ticker;
    const tool = TOOLS.kalshi_get_market!;
    const result = (await tool.handler(ctx, { ticker })) as {
      market: { ticker: string };
    };

    expect(result).toBeDefined();
    expect(result.market).toBeDefined();
    expect(result.market.ticker).toBe(ticker);
  });

  test("kalshi_get_orderbook returns orderbook structure", async () => {
    const listTool = TOOLS.kalshi_list_markets!;
    const listResult = (await listTool.handler(ctx, {
      status: "open",
      limit: 10,
    })) as { markets: Array<{ ticker: string }> };

    expect(listResult.markets.length).toBeGreaterThan(0);

    const ticker = listResult.markets[0]!.ticker;
    const tool = TOOLS.kalshi_get_orderbook!;
    const result = (await tool.handler(ctx, { ticker })) as {
      orderbook: { yes: unknown[] | null; no: unknown[] | null };
    };

    expect(result).toBeDefined();
    expect(result.orderbook).toBeDefined();
    // Orderbook can be null if no active orders
    expect(
      result.orderbook.yes === null || Array.isArray(result.orderbook.yes),
    ).toBe(true);
  });

  test("kalshi_get_trades returns trades array", async () => {
    const tool = TOOLS.kalshi_get_trades!;
    const result = (await tool.handler(ctx, { limit: 5 })) as {
      trades: unknown[];
    };

    expect(result).toBeDefined();
    expect(Array.isArray(result.trades)).toBe(true);
    expect(result.trades.length).toBeLessThanOrEqual(5);
  });

  test("kalshi_get_series returns series metadata", async () => {
    // Search through events until we find one with a series_ticker
    const listTool = TOOLS.kalshi_list_markets!;
    const eventTool = TOOLS.kalshi_get_event!;
    const MAX_MARKETS = 50;

    let seriesTicker: string | undefined;

    const listResult = (await listTool.handler(ctx, {
      limit: MAX_MARKETS,
    })) as { markets: Array<{ event_ticker: string }> };

    expect(listResult.markets.length).toBeGreaterThan(0);

    // Collect unique event tickers to avoid redundant API calls
    const eventTickers = [
      ...new Set(listResult.markets.map((m) => m.event_ticker)),
    ];

    for (const eventTicker of eventTickers) {
      const eventResult = (await eventTool.handler(ctx, { eventTicker })) as {
        event: { series_ticker?: string };
      };
      if (eventResult.event.series_ticker) {
        seriesTicker = eventResult.event.series_ticker;
        break;
      }
    }

    expect(seriesTicker).toBeDefined();

    const tool = TOOLS.kalshi_get_series!;
    const result = (await tool.handler(ctx, {
      seriesTicker: seriesTicker!,
    })) as { series: { ticker: string } };

    expect(result).toBeDefined();
    expect(result.series).toBeDefined();
    expect(result.series.ticker).toBe(seriesTicker!);
  });

  test("kalshi_get_event returns event metadata", async () => {
    const listTool = TOOLS.kalshi_list_markets!;
    const listResult = (await listTool.handler(ctx, {
      limit: 10,
    })) as { markets: Array<{ event_ticker: string }> };

    expect(listResult.markets.length).toBeGreaterThan(0);

    const eventTicker = listResult.markets[0]!.event_ticker;
    const tool = TOOLS.kalshi_get_event!;
    const result = (await tool.handler(ctx, { eventTicker })) as {
      event: { event_ticker: string };
    };

    expect(result).toBeDefined();
    expect(result.event).toBeDefined();
    expect(result.event.event_ticker).toBe(eventTicker);
  });

  // Search integration tests are in a separate file (search/integration.test.ts)
  // because they require cache population which takes ~7 seconds
});
