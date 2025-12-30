/**
 * MCP Server setup and configuration.
 *
 * This module exports the server components without side effects,
 * allowing for testing and programmatic use.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  type AuthContext,
  AuthInitError,
  initializeAuth,
} from "./auth/index.js";
import { KalshiClient } from "./clients/kalshi.js";
import { PolymarketClient } from "./clients/polymarket.js";
import { cacheConfig, kalshiConfig, polymarketConfig } from "./env.js";
import { logger } from "./logger.js";
import {
  KalshiSearchService,
  PolymarketSearchService,
} from "./search/index.js";
import { getToolsList, TOOLS, type ToolContext } from "./tools.js";

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
    const lowerMessage = errorMessage.toLowerCase();

    if (error.name === "ZodError") {
      errorCode = "ValidationError";
    } else if (
      lowerMessage.includes("api") ||
      lowerMessage.includes("network") ||
      lowerMessage.includes("fetch")
    ) {
      errorCode = "APIError";
    } else if (
      lowerMessage.includes("not found") ||
      lowerMessage.includes("unknown tool")
    ) {
      errorCode = "NotFoundError";
    } else if (
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("forbidden")
    ) {
      errorCode = "AuthenticationError";
    } else if (lowerMessage.includes("rate limit")) {
      errorCode = "RateLimitError";
    }
  } else {
    errorMessage = String(error);
  }

  return { code: errorCode, message: errorMessage };
}

/**
 * Create the MCP server instance.
 */
function createServer(): McpServer {
  return new McpServer(
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
}

/**
 * Create all platform clients and services.
 */
function createClients() {
  const kalshiClient = new KalshiClient(kalshiConfig);
  const polymarketClient = new PolymarketClient(polymarketConfig);
  const kalshiSearchService = new KalshiSearchService(kalshiClient, {
    ttlSeconds: cacheConfig.ttlSeconds,
  });
  const polymarketSearchService = new PolymarketSearchService(
    polymarketClient,
    {
      ttlSeconds: cacheConfig.ttlSeconds,
    },
  );

  const toolContext: ToolContext = {
    kalshi: kalshiClient,
    polymarket: polymarketClient,
    kalshiSearchService,
    polymarketSearchService,
  };

  return {
    kalshiClient,
    polymarketClient,
    kalshiSearchService,
    polymarketSearchService,
    toolContext,
  };
}

/**
 * Register tool handlers on the server.
 */
function registerHandlers(
  mcpServer: McpServer,
  toolContext: ToolContext,
  authContext: AuthContext,
): void {
  mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getToolsList(authContext),
    };
  });

  mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const tool = TOOLS[name];
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const data = await tool.handler(toolContext, args);
      // Include both content and structuredContent for backwards compatibility.
      // Many MCP clients don't yet support structuredContent (Claude Code, OpenCode,
      // Vercel AI SDK, etc.) and only read the content field.
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data),
          },
        ],
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
}

/**
 * Background prefetch both search caches on server startup.
 * Non-blocking: server starts immediately, caches populate in background.
 */
async function prefetchSearchCaches(
  kalshiSearchService: KalshiSearchService,
  polymarketSearchService: PolymarketSearchService,
): Promise<void> {
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

/**
 * Start the MCP server.
 *
 * Initializes clients, validates auth, registers handlers, and connects transport.
 * Throws AuthInitError on credential issues.
 */
export async function startServer(): Promise<void> {
  const mcpServer = createServer();
  const {
    kalshiClient,
    kalshiSearchService,
    polymarketSearchService,
    toolContext,
  } = createClients();

  // Initialize and validate authentication
  const authContext = await initializeAuth(kalshiConfig, kalshiClient);

  // Register tool handlers
  registerHandlers(mcpServer, toolContext, authContext);

  // Connect transport
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  logger.info(
    {
      kalshiAuth: authContext.kalshi.authenticated,
      polymarketAuth: authContext.polymarket.authenticated,
    },
    "Prediction Markets MCP Server running on stdio",
  );

  // Start background prefetch (non-blocking)
  prefetchSearchCaches(kalshiSearchService, polymarketSearchService);
}

// Re-export for external use
export { AuthInitError };
