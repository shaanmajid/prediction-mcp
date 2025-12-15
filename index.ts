#!/usr/bin/env bun
import { pino } from "pino";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { KalshiClient } from "./src/clients/kalshi.js";
import { PolymarketClient } from "./src/clients/polymarket.js";
import { TOOLS, getToolsList, type ToolClients } from "./src/tools.js";

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

const logger = pino({
  level: "info",
});

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

// Initialize clients
// Kalshi requires API key; Polymarket works without auth for read operations
const clients: ToolClients = {
  kalshi: new KalshiClient(),
  polymarket: new PolymarketClient(),
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

    const data = await tool.handler(clients, args);
    return {
      structuredContent: data,
    };
  } catch (error) {
    const classified = classifyError(error);

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
