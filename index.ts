#!/usr/bin/env bun
import { pino } from "pino";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { KalshiClient } from "./src/clients/kalshi.js";
import { TOOLS, getToolsList } from "./src/tools.js";

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

// Initialize Kalshi client
const kalshiClient = new KalshiClient();

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

    const data = await tool.handler(kalshiClient, args);
    return {
      structuredContent: data,
    };
  } catch (error) {
    // Determine error type and code
    let errorCode = "UnknownError";
    let errorMessage = "An unknown error occurred";

    if (error instanceof Error) {
      errorMessage = error.message;

      // Classify errors
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

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: errorCode,
              message: errorMessage,
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
