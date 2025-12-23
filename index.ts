#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { KalshiClient } from "./src/clients/kalshi.js";
import { PolymarketClient } from "./src/clients/polymarket.js";
import { cacheConfig, kalshiConfig, polymarketConfig } from "./src/env.js";
import { logger } from "./src/logger.js";
import {
  KalshiSearchService,
  PolymarketSearchService,
} from "./src/search/index.js";
import { getToolsList, TOOLS, type ToolContext } from "./src/tools.js";

/**
 * Error classification result
 */
export interface ClassifiedError {
  code: string;
  message: string;
}

/**
 * Classify an error into a standardized error code and message.
 * Used for MCP error responses to provide consistent error handling.
 */
export function classifyError(error: unknown): ClassifiedError {
  let errorCode = "UnknownError";
  let errorMessage = "An unknown error occurred";

  if (error instanceof Error) {
    errorMessage = error.message;

    if (error.name === "ZodError") {
      errorCode = "ValidationError";
    } else if (
      errorMessage.includes("API") ||
      errorMessage.includes("network") ||
      errorMessage.includes("fetch")
    ) {
      errorCode = "APIError";
    } else if (
      errorMessage.includes("not found") ||
      errorMessage.includes("Unknown tool")
    ) {
      errorCode = "NotFoundError";
    } else if (
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("forbidden")
    ) {
      errorCode = "AuthenticationError";
    } else if (errorMessage.includes("rate limit")) {
      errorCode = "RateLimitError";
    }
  } else {
    errorMessage = String(error);
  }

  return { code: errorCode, message: errorMessage };
}

const server = new Server(
  {
    name: "prediction-markets",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Initialize clients with validated config
const kalshiClient = new KalshiClient(kalshiConfig);
const polymarketClient = new PolymarketClient(polymarketConfig);
const kalshiSearchService = new KalshiSearchService(kalshiClient, {
  ttlSeconds: cacheConfig.ttlSeconds,
});
const polymarketSearchService = new PolymarketSearchService(polymarketClient, {
  ttlSeconds: cacheConfig.ttlSeconds,
});

const toolContext: ToolContext = {
  kalshi: kalshiClient,
  polymarket: polymarketClient,
  kalshiSearchService,
  polymarketSearchService,
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getToolsList(),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const tool = TOOLS[name];
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const data = await tool.handler(toolContext, args);
    return {
      structuredContent: data,
    };
  } catch (error) {
    const classified = classifyError(error);

    logger.error(
      { tool: name, errorCode: classified.code, message: classified.message },
      "Tool execution failed",
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: classified.code,
              message: classified.message,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Background prefetch both search caches on server startup.
 * Non-blocking: server starts immediately, caches populate in background.
 * Uses Promise.allSettled to handle failures independently.
 */
async function prefetchSearchCaches(): Promise<void> {
  logger.info("Starting background prefetch of search caches...");

  const [kalshiResult, polymarketResult] = await Promise.allSettled([
    kalshiSearchService.ensurePopulated(),
    polymarketSearchService.ensurePopulated(),
  ]);

  if (kalshiResult.status === "fulfilled") {
    const stats = kalshiSearchService.getStats();
    logger.info(
      { events: stats.events_count, markets: stats.markets_count },
      "Kalshi search cache populated",
    );
  } else {
    logger.error(
      { err: kalshiResult.reason },
      "Failed to populate Kalshi search cache",
    );
  }

  if (polymarketResult.status === "fulfilled") {
    const stats = polymarketSearchService.getStats();
    logger.info(
      { events: stats.events_count, markets: stats.markets_count },
      "Polymarket search cache populated",
    );
  } else {
    logger.error(
      { err: polymarketResult.reason },
      "Failed to populate Polymarket search cache",
    );
  }
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Prediction Markets MCP Server running on stdio");

  // Start background prefetch (non-blocking)
  prefetchSearchCaches();
}

// Only start server when run directly (not when imported for coverage/testing)
if (import.meta.main) {
  main().catch((error) => {
    logger.error({ err: error }, "Fatal error");
    process.exit(1);
  });
}
