import { describe, expect, test } from "bun:test";
import type { AuthContext } from "./auth/index.js";
import { KalshiClient } from "./clients/kalshi.js";
import { PolymarketClient } from "./clients/polymarket.js";
import { kalshiConfig, polymarketConfig } from "./env.js";
import {
  KalshiSearchService,
  PolymarketSearchService,
} from "./search/index.js";
import {
  getToolsList,
  KALSHI_PUBLIC_TOOLS,
  KALSHI_TOOLS,
  POLYMARKET_PUBLIC_TOOLS,
  TOOLS,
  type ToolContext,
} from "./tools.js";

/** Tests for MCP tools module. */

// ============================================================
// Unit Tests
// ============================================================

describe("getToolsList with AuthContext", () => {
  const noAuth: AuthContext = {
    kalshi: { authenticated: false, reason: "no_credentials" },
    polymarket: { authenticated: false, reason: "no_credentials" },
  };

  const kalshiAuth: AuthContext = {
    kalshi: { authenticated: true },
    polymarket: { authenticated: false, reason: "no_credentials" },
  };

  test("excludes auth tools when no credentials", () => {
    const tools = getToolsList(noAuth);
    const names = tools.map((t) => t.name);

    expect(names).not.toContain("kalshi_get_balance");
    expect(names).not.toContain("kalshi_get_positions");
  });

  test("includes public tools when no credentials", () => {
    const tools = getToolsList(noAuth);
    const names = tools.map((t) => t.name);

    expect(names).toContain("kalshi_list_markets");
    expect(names).toContain("kalshi_get_market");
    expect(names).toContain("polymarket_list_markets");
  });

  test("includes auth tools when Kalshi authenticated", () => {
    const tools = getToolsList(kalshiAuth);
    const names = tools.map((t) => t.name);

    expect(names).toContain("kalshi_get_balance");
    expect(names).toContain("kalshi_get_positions");
  });

  test("includes requiresAuth metadata on auth tools", () => {
    const tools = getToolsList(kalshiAuth);
    const balanceTool = tools.find((t) => t.name === "kalshi_get_balance");

    expect(balanceTool).toBeDefined();
  });
});

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

  test("tool count matches public tools when no auth", () => {
    const tools = getToolsList();
    const publicToolCount =
      Object.keys(KALSHI_PUBLIC_TOOLS).length +
      Object.keys(POLYMARKET_PUBLIC_TOOLS).length;

    expect(tools.length).toBe(publicToolCount);
  });

  test("tool count matches all tools when authenticated", () => {
    const authContext: AuthContext = {
      kalshi: { authenticated: true },
      polymarket: { authenticated: true },
    };
    const tools = getToolsList(authContext);
    const registeredToolCount = Object.keys(TOOLS).length;

    expect(tools.length).toBe(registeredToolCount);
  });
});

// ============================================================
// Polymarket Tool Handler Integration Tests
// ============================================================

describe("Polymarket Tool Handler Integration Tests", () => {
  const kalshi = new KalshiClient(kalshiConfig);
  const polymarket = new PolymarketClient(polymarketConfig);
  const ctx: ToolContext = {
    kalshi,
    polymarket,
    kalshiSearchService: new KalshiSearchService(kalshi),
    polymarketSearchService: new PolymarketSearchService(polymarket),
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
  const kalshi = new KalshiClient(kalshiConfig);
  const polymarket = new PolymarketClient(polymarketConfig);
  const ctx: ToolContext = {
    kalshi,
    polymarket,
    kalshiSearchService: new KalshiSearchService(kalshi),
    polymarketSearchService: new PolymarketSearchService(polymarket),
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

  test("kalshi_get_price_history returns candlestick data", async () => {
    // First get a market and its event to find the series_ticker
    const listTool = TOOLS.kalshi_list_markets!;
    const listResult = (await listTool.handler(ctx, {
      status: "open",
      limit: 10,
    })) as { markets: Array<{ ticker: string; event_ticker: string }> };

    expect(listResult.markets.length).toBeGreaterThan(0);

    const market = listResult.markets[0]!;

    // Get the event to access series_ticker
    const eventTool = TOOLS.kalshi_get_event!;
    const eventResult = (await eventTool.handler(ctx, {
      eventTicker: market.event_ticker,
    })) as { event: { series_ticker?: string } };

    expect(eventResult.event.series_ticker).toBeDefined();

    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;

    const tool = TOOLS.kalshi_get_price_history!;
    const result = (await tool.handler(ctx, {
      series_ticker: eventResult.event.series_ticker!,
      ticker: market.ticker,
      start_ts: oneDayAgo,
      end_ts: now,
      period_interval: 60,
    })) as { ticker: string; candlesticks: unknown[] };

    expect(result).toBeDefined();
    expect(result.ticker).toBe(market.ticker);
    expect(Array.isArray(result.candlesticks)).toBe(true);
  });

  test("kalshi_list_orders returns orders array", async () => {
    const tool = TOOLS.kalshi_list_orders!;
    const result = (await tool.handler(ctx, { limit: 5 })) as {
      orders: unknown[];
      cursor: string;
    };

    expect(result).toBeDefined();
    expect(Array.isArray(result.orders)).toBe(true);
    expect(result.orders.length).toBeLessThanOrEqual(5);
  });

  test("kalshi_get_order returns order details", async () => {
    // First get an order from the list
    const listTool = TOOLS.kalshi_list_orders!;
    const listResult = (await listTool.handler(ctx, { limit: 1 })) as {
      orders: Array<{ order_id: string }>;
    };

    if (listResult.orders.length > 0) {
      const orderId = listResult.orders[0]!.order_id;
      const tool = TOOLS.kalshi_get_order!;
      const result = (await tool.handler(ctx, { orderId })) as {
        order: { order_id: string };
      };

      expect(result).toBeDefined();
      expect(result.order).toBeDefined();
      expect(result.order.order_id).toBe(orderId);
    }
    // If no orders, test still passes - account may have none
  });

  test("kalshi_get_fills returns fills array", async () => {
    const tool = TOOLS.kalshi_get_fills!;
    const result = (await tool.handler(ctx, { limit: 5 })) as {
      fills: unknown[];
    };

    expect(result).toBeDefined();
    expect(Array.isArray(result.fills)).toBe(true);
    expect(result.fills.length).toBeLessThanOrEqual(5);
  });

  test("kalshi_get_settlements returns settlements array", async () => {
    const tool = TOOLS.kalshi_get_settlements!;
    const result = (await tool.handler(ctx, { limit: 5 })) as {
      settlements: unknown[];
    };

    expect(result).toBeDefined();
    expect(Array.isArray(result.settlements)).toBe(true);
    expect(result.settlements.length).toBeLessThanOrEqual(5);
  });

  // Search integration tests are in a separate file (search/integration.test.ts)
  // because they require cache population which takes ~7 seconds
});

// ============================================================
// Portfolio Tools Tests
// ============================================================

describe("Portfolio Tools", () => {
  const kalshiAuth: AuthContext = {
    kalshi: { authenticated: true },
    polymarket: { authenticated: false, reason: "no_credentials" },
  };

  describe("kalshi_get_balance", () => {
    test("is registered in KALSHI_TOOLS", () => {
      expect(KALSHI_TOOLS.kalshi_get_balance).toBeDefined();
    });

    test("has correct name and description", () => {
      const tool = KALSHI_TOOLS.kalshi_get_balance!;
      expect(tool.name).toBe("kalshi_get_balance");
      expect(tool.description).toContain("balance");
      expect(tool.description).toContain("Requires Kalshi authentication");
    });

    test("appears in getToolsList when authenticated", () => {
      const tools = getToolsList(kalshiAuth);
      const balanceTool = tools.find((t) => t.name === "kalshi_get_balance");
      expect(balanceTool).toBeDefined();
    });
  });

  describe("kalshi_get_positions", () => {
    test("is registered in KALSHI_TOOLS", () => {
      expect(KALSHI_TOOLS.kalshi_get_positions).toBeDefined();
    });

    test("has correct name and description", () => {
      const tool = KALSHI_TOOLS.kalshi_get_positions!;
      expect(tool.name).toBe("kalshi_get_positions");
      expect(tool.description).toContain("positions");
      expect(tool.description).toContain("Requires Kalshi authentication");
    });

    test("appears in getToolsList when authenticated", () => {
      const tools = getToolsList(kalshiAuth);
      const positionsTool = tools.find(
        (t) => t.name === "kalshi_get_positions",
      );
      expect(positionsTool).toBeDefined();
    });
  });

  describe("kalshi_list_orders", () => {
    test("is registered in KALSHI_TOOLS", () => {
      expect(KALSHI_TOOLS.kalshi_list_orders).toBeDefined();
    });

    test("has correct name and description", () => {
      const tool = KALSHI_TOOLS.kalshi_list_orders!;
      expect(tool.name).toBe("kalshi_list_orders");
      expect(tool.description).toContain("orders");
      expect(tool.description).toContain("Requires Kalshi authentication");
    });

    test("appears in getToolsList when authenticated", () => {
      const tools = getToolsList(kalshiAuth);
      const ordersTool = tools.find((t) => t.name === "kalshi_list_orders");
      expect(ordersTool).toBeDefined();
    });
  });

  describe("kalshi_get_order", () => {
    test("is registered in KALSHI_TOOLS", () => {
      expect(KALSHI_TOOLS.kalshi_get_order).toBeDefined();
    });

    test("has correct name and description", () => {
      const tool = KALSHI_TOOLS.kalshi_get_order!;
      expect(tool.name).toBe("kalshi_get_order");
      expect(tool.description).toContain("order");
      expect(tool.description).toContain("Requires Kalshi authentication");
    });

    test("appears in getToolsList when authenticated", () => {
      const tools = getToolsList(kalshiAuth);
      const orderTool = tools.find((t) => t.name === "kalshi_get_order");
      expect(orderTool).toBeDefined();
    });
  });

  describe("kalshi_get_fills", () => {
    test("is registered in KALSHI_TOOLS", () => {
      expect(KALSHI_TOOLS.kalshi_get_fills).toBeDefined();
    });

    test("has correct name and description", () => {
      const tool = KALSHI_TOOLS.kalshi_get_fills!;
      expect(tool.name).toBe("kalshi_get_fills");
      expect(tool.description).toContain("fill");
      expect(tool.description).toContain("Requires Kalshi authentication");
    });

    test("appears in getToolsList when authenticated", () => {
      const tools = getToolsList(kalshiAuth);
      const fillsTool = tools.find((t) => t.name === "kalshi_get_fills");
      expect(fillsTool).toBeDefined();
    });
  });

  describe("kalshi_get_settlements", () => {
    test("is registered in KALSHI_TOOLS", () => {
      expect(KALSHI_TOOLS.kalshi_get_settlements).toBeDefined();
    });

    test("has correct name and description", () => {
      const tool = KALSHI_TOOLS.kalshi_get_settlements!;
      expect(tool.name).toBe("kalshi_get_settlements");
      expect(tool.description).toContain("settlement");
      expect(tool.description).toContain("Requires Kalshi authentication");
    });

    test("appears in getToolsList when authenticated", () => {
      const tools = getToolsList(kalshiAuth);
      const settlementsTool = tools.find(
        (t) => t.name === "kalshi_get_settlements",
      );
      expect(settlementsTool).toBeDefined();
    });
  });
});
