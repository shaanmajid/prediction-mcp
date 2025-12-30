import { describe, expect, test } from "bun:test";
import type { AuthContext } from "./auth/index.js";
import { KalshiClient } from "./clients/kalshi.js";
import { PolymarketClient } from "./clients/polymarket.js";
import { env, kalshiConfig, polymarketConfig } from "./env.js";

/** Check if Kalshi credentials are available for authenticated tests. */
const hasKalshiCredentials = Boolean(
  env.KALSHI_API_KEY &&
    (env.KALSHI_PRIVATE_KEY_PATH || env.KALSHI_PRIVATE_KEY_PEM),
);

import {
  KalshiSearchService,
  PolymarketSearchService,
} from "./search/index.js";
import {
  getToolsList,
  KALSHI_PUBLIC_TOOLS,
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

  /** All Kalshi tools that require authentication. */
  const KALSHI_AUTH_TOOLS = [
    "kalshi_get_balance",
    "kalshi_get_positions",
    "kalshi_list_orders",
    "kalshi_get_order",
    "kalshi_get_fills",
    "kalshi_get_settlements",
    "kalshi_create_order",
    "kalshi_cancel_order",
  ] as const;

  test("excludes all auth tools when no credentials", () => {
    const tools = getToolsList(noAuth);
    const names = tools.map((t) => t.name);

    for (const authTool of KALSHI_AUTH_TOOLS) {
      expect(names).not.toContain(authTool);
    }
  });

  test("includes public tools when no credentials", () => {
    const tools = getToolsList(noAuth);
    const names = tools.map((t) => t.name);

    expect(names).toContain("kalshi_list_markets");
    expect(names).toContain("kalshi_get_market");
    expect(names).toContain("polymarket_list_markets");
  });

  test("includes all auth tools when Kalshi authenticated", () => {
    const tools = getToolsList(kalshiAuth);
    const names = tools.map((t) => t.name);

    for (const authTool of KALSHI_AUTH_TOOLS) {
      expect(names).toContain(authTool);
    }
  });

  test("auth tools have requiresAuth metadata", () => {
    const tools = getToolsList(kalshiAuth);

    for (const authToolName of KALSHI_AUTH_TOOLS) {
      const tool = tools.find((t) => t.name === authToolName);
      expect(tool).toBeDefined();
      // The tool definition includes requiresAuth, but getToolsList returns MCP format
      // which doesn't include that field - we just verify the tool is present
    }
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

describe("Kalshi Order Lifecycle Tools", () => {
  test("kalshi_create_order tool exists", () => {
    expect(TOOLS.kalshi_create_order).toBeDefined();
  });

  test("kalshi_create_order has correct metadata", () => {
    const tool = TOOLS.kalshi_create_order!;
    expect(tool.name).toBe("kalshi_create_order");
    expect(tool.description).toContain("WARNING");
    expect(tool.description).toContain("real money");
    expect(tool.platform).toBe("kalshi");
  });

  test("kalshi_create_order requires auth", () => {
    const tool = TOOLS.kalshi_create_order!;
    expect(tool.requiresAuth).toBeDefined();
    expect(tool.requiresAuth?.platform).toBe("kalshi");
  });

  test("kalshi_create_order handler is a function", () => {
    const tool = TOOLS.kalshi_create_order!;
    expect(typeof tool.handler).toBe("function");
  });

  test("kalshi_cancel_order tool exists", () => {
    expect(TOOLS.kalshi_cancel_order).toBeDefined();
  });

  test("kalshi_cancel_order has correct metadata", () => {
    const tool = TOOLS.kalshi_cancel_order!;
    expect(tool.name).toBe("kalshi_cancel_order");
    expect(tool.description).toContain("Cancel");
    expect(tool.platform).toBe("kalshi");
  });

  test("kalshi_cancel_order requires auth", () => {
    const tool = TOOLS.kalshi_cancel_order!;
    expect(tool.requiresAuth).toBeDefined();
    expect(tool.requiresAuth?.platform).toBe("kalshi");
  });

  test("kalshi_cancel_order handler is a function", () => {
    const tool = TOOLS.kalshi_cancel_order!;
    expect(typeof tool.handler).toBe("function");
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

  test.skipIf(!hasKalshiCredentials)(
    "kalshi_list_orders returns orders array",
    async () => {
      const tool = TOOLS.kalshi_list_orders!;
      const result = (await tool.handler(ctx, { limit: 5 })) as {
        orders: unknown[];
        cursor: string;
      };

      expect(result).toBeDefined();
      expect(Array.isArray(result.orders)).toBe(true);
      expect(result.orders.length).toBeLessThanOrEqual(5);
    },
  );

  test.skipIf(!hasKalshiCredentials)(
    "kalshi_get_order returns order details",
    async () => {
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
    },
  );

  test.skipIf(!hasKalshiCredentials)(
    "kalshi_get_fills returns fills array",
    async () => {
      const tool = TOOLS.kalshi_get_fills!;
      const result = (await tool.handler(ctx, { limit: 5 })) as {
        fills: unknown[];
      };

      expect(result).toBeDefined();
      expect(Array.isArray(result.fills)).toBe(true);
      expect(result.fills.length).toBeLessThanOrEqual(5);
    },
  );

  test.skipIf(!hasKalshiCredentials)(
    "kalshi_get_settlements returns settlements array",
    async () => {
      const tool = TOOLS.kalshi_get_settlements!;
      const result = (await tool.handler(ctx, { limit: 5 })) as {
        settlements: unknown[];
      };

      expect(result).toBeDefined();
      expect(Array.isArray(result.settlements)).toBe(true);
      expect(result.settlements.length).toBeLessThanOrEqual(5);
    },
  );

  // Search integration tests are in a separate file (search/integration.test.ts)
  // because they require cache population which takes ~7 seconds

  describe.skipIf(!hasKalshiCredentials)(
    "Order Lifecycle (create → verify → cancel)",
    () => {
      test("creates limit order, verifies in list, cancels, and verifies canceled status", async () => {
        // Step 1: Find an open market to place an order on
        const listMarketsTool = TOOLS.kalshi_list_markets!;
        const marketsResult = (await listMarketsTool.handler(ctx, {
          status: "open",
          limit: 1,
        })) as { markets: Array<{ ticker: string }> };

        expect(marketsResult.markets.length).toBeGreaterThan(0);
        const ticker = marketsResult.markets[0]!.ticker;

        // Step 2: Create a limit order at 1 cent (won't fill - too low)
        const createTool = TOOLS.kalshi_create_order!;
        const createResult = (await createTool.handler(ctx, {
          ticker,
          action: "buy",
          side: "yes",
          type: "limit",
          count: 1,
          yes_price: 1, // 1 cent - won't fill
        })) as { order: { order_id: string; status: string; ticker: string } };

        expect(createResult.order).toBeDefined();
        expect(createResult.order.order_id).toBeDefined();
        expect(createResult.order.status).toBe("resting");
        expect(createResult.order.ticker).toBe(ticker);

        const orderId = createResult.order.order_id;

        // Step 3: Verify the order appears in list_orders
        const listOrdersTool = TOOLS.kalshi_list_orders!;
        const listResult = (await listOrdersTool.handler(ctx, {
          status: "resting",
          limit: 100,
        })) as { orders: Array<{ order_id: string }> };

        const foundOrder = listResult.orders.find(
          (o) => o.order_id === orderId,
        );
        expect(foundOrder).toBeDefined();

        // Step 4: Cancel the order
        const cancelTool = TOOLS.kalshi_cancel_order!;
        const cancelResult = (await cancelTool.handler(ctx, { orderId })) as {
          order: { order_id: string; status: string };
          reduced_by: number;
        };

        expect(cancelResult.order).toBeDefined();
        expect(cancelResult.order.order_id).toBe(orderId);
        expect(cancelResult.order.status).toBe("canceled");
        expect(cancelResult.reduced_by).toBe(1);

        // Step 5: Verify the order no longer appears in resting orders
        const listAfterCancel = (await listOrdersTool.handler(ctx, {
          status: "resting",
          limit: 100,
        })) as { orders: Array<{ order_id: string }> };

        const stillResting = listAfterCancel.orders.find(
          (o) => o.order_id === orderId,
        );
        expect(stillResting).toBeUndefined();

        // Step 6: Verify we can retrieve the canceled order by ID
        const getOrderTool = TOOLS.kalshi_get_order!;
        const getResult = (await getOrderTool.handler(ctx, { orderId })) as {
          order: { order_id: string; status: string };
        };

        expect(getResult.order.order_id).toBe(orderId);
        expect(getResult.order.status).toBe("canceled");
      });

      test("cancel_order throws for non-existent order ID", async () => {
        const cancelTool = TOOLS.kalshi_cancel_order!;

        await expect(
          cancelTool.handler(ctx, { orderId: "non-existent-order-id-12345" }),
        ).rejects.toThrow();
      });

      test("create_order throws for non-existent market ticker", async () => {
        const createTool = TOOLS.kalshi_create_order!;

        await expect(
          createTool.handler(ctx, {
            ticker: "NON-EXISTENT-MARKET-TICKER-12345",
            action: "buy",
            side: "yes",
            type: "limit",
            count: 1,
            yes_price: 50,
          }),
        ).rejects.toThrow();
      });
    },
  );
});
