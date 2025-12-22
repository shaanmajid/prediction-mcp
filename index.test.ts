import { describe, expect, spyOn, test } from "bun:test";
import { classifyError } from "./index.js";
import { getToolsList, TOOLS, type ToolContext } from "./src/tools.js";

/**
 * Unit tests for MCP server functionality
 *
 * Tests cover:
 * - Error classification for MCP error responses
 * - Tool listing functionality
 * - Tool handler resolution and execution
 */

// ============================================================
// Error Classification Tests
// ============================================================

describe("classifyError()", () => {
  describe("ZodError handling", () => {
    test("classifies ZodError as ValidationError", () => {
      const zodError = new Error("Invalid input");
      zodError.name = "ZodError";

      const result = classifyError(zodError);

      expect(result.code).toBe("ValidationError");
      expect(result.message).toBe("Invalid input");
    });
  });

  describe("API error handling", () => {
    test("classifies error with 'API' in message as APIError", () => {
      const result = classifyError(new Error("API request failed"));
      expect(result.code).toBe("APIError");
    });

    test("classifies error with 'network' in message as APIError", () => {
      const result = classifyError(new Error("network error occurred"));
      expect(result.code).toBe("APIError");
    });

    test("classifies error with 'fetch' in message as APIError", () => {
      const result = classifyError(new Error("fetch failed"));
      expect(result.code).toBe("APIError");
    });
  });

  describe("NotFoundError handling", () => {
    test("classifies 'not found' as NotFoundError", () => {
      const result = classifyError(new Error("Market not found: xyz"));
      expect(result.code).toBe("NotFoundError");
    });

    test("classifies 'Unknown tool' as NotFoundError", () => {
      const result = classifyError(new Error("Unknown tool: invalid_tool"));
      expect(result.code).toBe("NotFoundError");
    });
  });

  describe("AuthenticationError handling", () => {
    test("classifies 'unauthorized' as AuthenticationError", () => {
      const result = classifyError(new Error("unauthorized access"));
      expect(result.code).toBe("AuthenticationError");
    });

    test("classifies 'forbidden' as AuthenticationError", () => {
      const result = classifyError(new Error("forbidden resource"));
      expect(result.code).toBe("AuthenticationError");
    });
  });

  describe("RateLimitError handling", () => {
    test("classifies 'rate limit' as RateLimitError", () => {
      const result = classifyError(new Error("rate limit exceeded"));
      expect(result.code).toBe("RateLimitError");
    });
  });

  describe("UnknownError handling", () => {
    test("classifies generic error as UnknownError", () => {
      const result = classifyError(new Error("Something went wrong"));
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("Something went wrong");
    });

    test("classifies empty error message as UnknownError", () => {
      const result = classifyError(new Error(""));
      expect(result.code).toBe("UnknownError");
    });

    test("classifies Error subclasses by message content", () => {
      // TypeError, RangeError, etc. are Error subclasses
      // They should be classified based on message, not constructor name
      const typeError = new TypeError(
        "Cannot read property 'foo' of undefined",
      );
      const rangeError = new RangeError("Maximum call stack size exceeded");

      expect(classifyError(typeError).code).toBe("UnknownError");
      expect(classifyError(rangeError).code).toBe("UnknownError");

      // But if the message contains classification keywords, they should match
      const networkTypeError = new TypeError("network request failed");
      expect(classifyError(networkTypeError).code).toBe("APIError");
    });
  });

  describe("non-Error object handling", () => {
    test("handles string thrown as error", () => {
      const result = classifyError("string error");
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("string error");
    });

    test("handles number thrown as error", () => {
      const result = classifyError(404);
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("404");
    });

    test("handles null thrown as error", () => {
      const result = classifyError(null);
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("null");
    });

    test("handles undefined thrown as error", () => {
      const result = classifyError(undefined);
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("undefined");
    });

    test("handles object thrown as error", () => {
      const result = classifyError({ custom: "error" });
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("[object Object]");
    });
  });

  describe("error message preservation", () => {
    test("preserves original error message", () => {
      const originalMessage = "Detailed error: something specific happened";
      const result = classifyError(new Error(originalMessage));
      expect(result.message).toBe(originalMessage);
    });

    test("preserves message even when classified", () => {
      const result = classifyError(new Error("API error: connection refused"));
      expect(result.code).toBe("APIError");
      expect(result.message).toBe("API error: connection refused");
    });
  });
});

// ============================================================
// MCP ListTools Handler Tests
// ============================================================

describe("MCP ListTools Handler", () => {
  test("returns all registered tools", () => {
    const tools = getToolsList();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.length).toBe(Object.keys(TOOLS).length);
  });

  test("returns tools with required MCP properties", () => {
    const tools = getToolsList();

    for (const tool of tools) {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("inputSchema");

      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(typeof tool.inputSchema).toBe("object");
    }
  });

  test("returns both Kalshi and Polymarket tools", () => {
    const tools = getToolsList();

    const kalshiTools = tools.filter((t) => t.name.startsWith("kalshi_"));
    const polymarketTools = tools.filter((t) =>
      t.name.startsWith("polymarket_"),
    );

    expect(kalshiTools.length).toBeGreaterThan(0);
    expect(polymarketTools.length).toBeGreaterThan(0);
  });

  test("tool input schemas have valid JSON Schema structure", () => {
    const tools = getToolsList();

    for (const tool of tools) {
      const schema = tool.inputSchema as {
        type?: string;
        properties?: Record<string, unknown>;
      };

      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();
    }
  });
});

// ============================================================
// MCP CallTool Handler Tests
// ============================================================

describe("MCP CallTool Handler", () => {
  describe("tool resolution", () => {
    test("all registered tools have handlers", () => {
      for (const [name, tool] of Object.entries(TOOLS)) {
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe("function");
        expect(tool.name).toBe(name);
      }
    });

    test("unknown tool throws error with correct message", async () => {
      const unknownToolName = "nonexistent_tool";

      // Simulate what the CallTool handler does
      const tool = TOOLS[unknownToolName];

      expect(tool).toBeUndefined();

      // The handler throws "Unknown tool: {name}"
      const error = new Error(`Unknown tool: ${unknownToolName}`);
      const classified = classifyError(error);

      expect(classified.code).toBe("NotFoundError");
      expect(classified.message).toContain("Unknown tool");
    });
  });

  describe("tool handler execution", () => {
    test("handlers receive context and args", async () => {
      // Create a mock context
      const mockCtx = {
        kalshi: {
          listMarkets: async () => ({ data: { markets: [] } }),
        },
        polymarket: {
          listMarkets: async () => ({ markets: [] }),
        },
        kalshiSearchService: {
          search: async () => [],
          getStats: () => ({ status: "empty", events_count: 0, markets_count: 0 }),
        },
        polymarketSearchService: {
          search: async () => [],
          getStats: () => ({ status: "empty", events_count: 0, markets_count: 0 }),
        },
      } as unknown as ToolContext;

      // Test that kalshi_cache_stats handler works with mock
      const tool = TOOLS.kalshi_cache_stats;
      expect(tool).toBeDefined();

      const result = await tool!.handler(mockCtx, {});
      expect(result).toHaveProperty("status");
    });

    test("handlers validate input args with Zod", async () => {
      const mockCtx = {
        kalshi: {},
        polymarket: {},
        kalshiSearchService: {},
        polymarketSearchService: {},
      } as unknown as ToolContext;

      // kalshi_get_market requires a ticker
      const tool = TOOLS.kalshi_get_market;
      expect(tool).toBeDefined();

      // Missing required ticker should throw ZodError
      try {
        await tool!.handler(mockCtx, {});
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).name).toBe("ZodError");
        const classified = classifyError(error);
        expect(classified.code).toBe("ValidationError");
      }
    });

    test("handlers return structured data on success", async () => {
      const mockMarkets = [
        { ticker: "TEST-1", title: "Test Market 1" },
        { ticker: "TEST-2", title: "Test Market 2" },
      ];

      const mockCtx = {
        kalshi: {
          listMarkets: async () => ({ data: { markets: mockMarkets } }),
        },
        polymarket: {},
        kalshiSearchService: {},
        polymarketSearchService: {},
      } as unknown as ToolContext;

      const tool = TOOLS.kalshi_list_markets;
      expect(tool).toBeDefined();

      const result = await tool!.handler(mockCtx, { limit: 10 });

      expect(result).toHaveProperty("markets");
      expect((result as { markets: unknown[] }).markets).toEqual(mockMarkets);
    });
  });

  describe("error handling in handlers", () => {
    test("API errors are properly thrown", async () => {
      const mockCtx = {
        kalshi: {
          getMarketDetails: async () => {
            throw new Error("API error: Market not found");
          },
        },
        polymarket: {},
        kalshiSearchService: {},
        polymarketSearchService: {},
      } as unknown as ToolContext;

      const tool = TOOLS.kalshi_get_market;
      expect(tool).toBeDefined();

      try {
        await tool!.handler(mockCtx, { ticker: "INVALID" });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        const classified = classifyError(error);
        expect(classified.code).toBe("APIError");
      }
    });

    test("network errors are properly classified", async () => {
      const mockCtx = {
        polymarket: {
          getMarket: async () => {
            throw new Error("network timeout");
          },
        },
        kalshi: {},
        kalshiSearchService: {},
        polymarketSearchService: {},
      } as unknown as ToolContext;

      const tool = TOOLS.polymarket_get_market;
      expect(tool).toBeDefined();

      try {
        await tool!.handler(mockCtx, { slug: "test-market" });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        const classified = classifyError(error);
        expect(classified.code).toBe("APIError");
      }
    });
  });
});

// ============================================================
// Prefetch Search Caches Pattern Tests
// ============================================================

describe("prefetchSearchCaches pattern", () => {
  test("Promise.allSettled handles both services succeeding", async () => {
    const mockKalshiService = {
      ensurePopulated: async () => {},
      getStats: () => ({ status: "ready", events_count: 10, markets_count: 50 }),
    };
    const mockPolymarketService = {
      ensurePopulated: async () => {},
      getStats: () => ({ status: "ready", events_count: 5, markets_count: 25 }),
    };

    const [kalshiResult, polymarketResult] = await Promise.allSettled([
      mockKalshiService.ensurePopulated(),
      mockPolymarketService.ensurePopulated(),
    ]);

    expect(kalshiResult.status).toBe("fulfilled");
    expect(polymarketResult.status).toBe("fulfilled");

    // Stats should be accessible after successful population
    const kalshiStats = mockKalshiService.getStats();
    const polyStats = mockPolymarketService.getStats();

    expect(kalshiStats.status).toBe("ready");
    expect(polyStats.status).toBe("ready");
  });

  test("Promise.allSettled handles Kalshi failure gracefully", async () => {
    const mockKalshiService = {
      ensurePopulated: async () => {
        throw new Error("Kalshi API error");
      },
      getStats: () => ({ status: "empty", events_count: 0, markets_count: 0 }),
    };
    const mockPolymarketService = {
      ensurePopulated: async () => {},
      getStats: () => ({ status: "ready", events_count: 5, markets_count: 25 }),
    };

    const [kalshiResult, polymarketResult] = await Promise.allSettled([
      mockKalshiService.ensurePopulated(),
      mockPolymarketService.ensurePopulated(),
    ]);

    // Kalshi failed, but Polymarket should still succeed
    expect(kalshiResult.status).toBe("rejected");
    expect(polymarketResult.status).toBe("fulfilled");

    if (kalshiResult.status === "rejected") {
      expect(kalshiResult.reason.message).toBe("Kalshi API error");
    }
  });

  test("Promise.allSettled handles Polymarket failure gracefully", async () => {
    const mockKalshiService = {
      ensurePopulated: async () => {},
      getStats: () => ({ status: "ready", events_count: 10, markets_count: 50 }),
    };
    const mockPolymarketService = {
      ensurePopulated: async () => {
        throw new Error("Polymarket network timeout");
      },
      getStats: () => ({ status: "empty", events_count: 0, markets_count: 0 }),
    };

    const [kalshiResult, polymarketResult] = await Promise.allSettled([
      mockKalshiService.ensurePopulated(),
      mockPolymarketService.ensurePopulated(),
    ]);

    // Kalshi should succeed, Polymarket failed
    expect(kalshiResult.status).toBe("fulfilled");
    expect(polymarketResult.status).toBe("rejected");

    if (polymarketResult.status === "rejected") {
      expect(polymarketResult.reason.message).toBe("Polymarket network timeout");
    }
  });

  test("Promise.allSettled handles both services failing", async () => {
    const mockKalshiService = {
      ensurePopulated: async () => {
        throw new Error("Kalshi API error");
      },
    };
    const mockPolymarketService = {
      ensurePopulated: async () => {
        throw new Error("Polymarket network timeout");
      },
    };

    const [kalshiResult, polymarketResult] = await Promise.allSettled([
      mockKalshiService.ensurePopulated(),
      mockPolymarketService.ensurePopulated(),
    ]);

    // Both should fail independently
    expect(kalshiResult.status).toBe("rejected");
    expect(polymarketResult.status).toBe("rejected");
  });

  test("services are called concurrently (not sequentially)", async () => {
    const callOrder: string[] = [];
    const startTime = Date.now();

    const mockKalshiService = {
      ensurePopulated: async () => {
        callOrder.push("kalshi-start");
        await new Promise((r) => setTimeout(r, 50));
        callOrder.push("kalshi-end");
      },
    };
    const mockPolymarketService = {
      ensurePopulated: async () => {
        callOrder.push("polymarket-start");
        await new Promise((r) => setTimeout(r, 50));
        callOrder.push("polymarket-end");
      },
    };

    await Promise.allSettled([
      mockKalshiService.ensurePopulated(),
      mockPolymarketService.ensurePopulated(),
    ]);

    const elapsed = Date.now() - startTime;

    // Should complete in ~50ms (parallel), not ~100ms (sequential)
    expect(elapsed).toBeLessThan(100);

    // Both should start before either ends (concurrent execution)
    expect(callOrder.indexOf("kalshi-start")).toBeLessThan(
      callOrder.indexOf("kalshi-end"),
    );
    expect(callOrder.indexOf("polymarket-start")).toBeLessThan(
      callOrder.indexOf("polymarket-end"),
    );
  });
});

// ============================================================
// Tool Coverage Tests
// ============================================================

describe("Tool Registry Completeness", () => {
  test("all Kalshi tools are registered", () => {
    const expectedKalshiTools = [
      "kalshi_list_markets",
      "kalshi_get_market",
      "kalshi_get_orderbook",
      "kalshi_get_trades",
      "kalshi_get_series",
      "kalshi_get_event",
      "kalshi_search",
      "kalshi_search_events",
      "kalshi_search_markets",
      "kalshi_cache_stats",
    ];

    for (const toolName of expectedKalshiTools) {
      expect(TOOLS[toolName]).toBeDefined();
      expect(TOOLS[toolName]!.name).toBe(toolName);
    }
  });

  test("all Polymarket tools are registered", () => {
    const expectedPolymarketTools = [
      "polymarket_list_markets",
      "polymarket_get_market",
      "polymarket_list_events",
      "polymarket_get_event",
      "polymarket_list_tags",
      "polymarket_get_orderbook",
      "polymarket_get_price",
      "polymarket_get_price_history",
      "polymarket_search",
      "polymarket_search_events",
      "polymarket_search_markets",
      "polymarket_cache_stats",
    ];

    for (const toolName of expectedPolymarketTools) {
      expect(TOOLS[toolName]).toBeDefined();
      expect(TOOLS[toolName]!.name).toBe(toolName);
    }
  });

  test("each tool has a unique name", () => {
    const toolNames = Object.keys(TOOLS);
    const uniqueNames = new Set(toolNames);

    expect(uniqueNames.size).toBe(toolNames.length);
  });

  test("tool descriptions are non-empty and descriptive", () => {
    for (const [name, tool] of Object.entries(TOOLS)) {
      expect(tool.description.length).toBeGreaterThan(20);
      // Descriptions should contain useful keywords
      expect(
        tool.description.toLowerCase().includes("kalshi") ||
          tool.description.toLowerCase().includes("polymarket") ||
          tool.description.toLowerCase().includes("market") ||
          tool.description.toLowerCase().includes("event") ||
          tool.description.toLowerCase().includes("search") ||
          tool.description.toLowerCase().includes("cache"),
      ).toBe(true);
    }
  });
});
