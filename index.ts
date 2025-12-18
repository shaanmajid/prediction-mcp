#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { kalshiConfig, polymarketConfig } from "./src/env.js";
import { KalshiClient } from "./src/clients/kalshi.js";
import { PolymarketClient } from "./src/clients/polymarket.js";
import { SearchService } from "./src/search/index.js";
import { TOOLS, getToolsList, type ToolContext } from "./src/tools.js";
import { logger } from "./src/logger.js";

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
const searchService = new SearchService(kalshiClient);

const toolContext: ToolContext = {
  kalshi: kalshiClient,
  polymarket: polymarketClient,
  searchService,
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

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Prediction Markets MCP Server running on stdio");
}

main().catch((error) => {
  logger.error({ err: error }, "Fatal error");
  process.exit(1);
});
