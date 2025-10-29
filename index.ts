#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { KalshiClient } from "./src/clients/kalshi.js";
import {
  ListMarketsArgsSchema,
  GetMarketArgsSchema,
  GetOrderbookArgsSchema,
  GetTradesArgsSchema,
  toMCPSchema,
} from "./src/validation.js";

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

// Tool: List Kalshi markets
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "kalshi_list_markets",
        description:
          "List available markets on Kalshi. Filter by status (open/closed/settled), event, or series.",
        inputSchema: toMCPSchema(ListMarketsArgsSchema),
      },
      {
        name: "kalshi_get_market",
        description:
          "Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.",
        inputSchema: toMCPSchema(GetMarketArgsSchema),
      },
      {
        name: "kalshi_get_orderbook",
        description:
          "Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.",
        inputSchema: toMCPSchema(GetOrderbookArgsSchema),
      },
      {
        name: "kalshi_get_trades",
        description:
          "Get recent trade history for Kalshi markets. Can filter by specific market ticker.",
        inputSchema: toMCPSchema(GetTradesArgsSchema),
      },
    ],
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "kalshi_list_markets": {
        const params = ListMarketsArgsSchema.parse(args || {});
        const result = await kalshiClient.listMarkets(params);
        return {
          structuredContent: result.data,
        };
      }

      case "kalshi_get_market": {
        const params = GetMarketArgsSchema.parse(args);
        const result = await kalshiClient.getMarketDetails(params.ticker);
        return {
          structuredContent: result.data,
        };
      }

      case "kalshi_get_orderbook": {
        const params = GetOrderbookArgsSchema.parse(args);
        const result = await kalshiClient.getOrderBook(params.ticker);
        return {
          structuredContent: result.data,
        };
      }

      case "kalshi_get_trades": {
        const params = GetTradesArgsSchema.parse(args || {});
        const result = await kalshiClient.getTrades(params);
        return {
          structuredContent: result.data,
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
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
  console.error("Prediction Markets MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
