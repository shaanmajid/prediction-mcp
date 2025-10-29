#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { KalshiClient } from "./src/clients/kalshi.js";

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
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["open", "closed", "settled"],
              description: "Filter by market status",
            },
            limit: {
              type: "number",
              description: "Maximum number of markets to return (default 100)",
            },
            eventTicker: {
              type: "string",
              description: "Filter by event ticker",
            },
            seriesTicker: {
              type: "string",
              description: "Filter by series ticker",
            },
          },
        },
      },
      {
        name: "kalshi_get_market",
        description:
          "Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.",
        inputSchema: {
          type: "object",
          properties: {
            ticker: {
              type: "string",
              description: 'Market ticker symbol (e.g. "PRES-DEM-WIN")',
            },
          },
          required: ["ticker"],
        },
      },
      {
        name: "kalshi_get_orderbook",
        description:
          "Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.",
        inputSchema: {
          type: "object",
          properties: {
            ticker: {
              type: "string",
              description: "Market ticker symbol",
            },
          },
          required: ["ticker"],
        },
      },
      {
        name: "kalshi_get_trades",
        description:
          "Get recent trade history for Kalshi markets. Can filter by specific market ticker.",
        inputSchema: {
          type: "object",
          properties: {
            ticker: {
              type: "string",
              description: "Filter trades by market ticker (optional)",
            },
            limit: {
              type: "number",
              description: "Maximum number of trades to return (default 100)",
            },
          },
        },
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
        const result = await kalshiClient.listMarkets(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      }

      case "kalshi_get_market": {
        const result = await kalshiClient.getMarketDetails(args.ticker);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      }

      case "kalshi_get_orderbook": {
        const result = await kalshiClient.getOrderBook(args.ticker);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      }

      case "kalshi_get_trades": {
        const result = await kalshiClient.getTrades(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
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
