<p align="center">
  <img src="assets/logo.png" alt="Prediction Markets MCP" width="200">
</p>

# Prediction Markets MCP Server

[![CI](https://github.com/shaanmajid/prediction-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shaanmajid/prediction-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/shaanmajid/prediction-mcp/graph/badge.svg)](https://codecov.io/gh/shaanmajid/prediction-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP server providing unified access to prediction market data from [Kalshi](https://kalshi.com) and [Polymarket](https://polymarket.com).

---

## Why Use This?

Prediction markets aggregate crowd wisdom into real-time probabilities. This MCP server lets you:

- **Unify platforms** — Query Kalshi and Polymarket through one interface
- **Use natural language** — Ask "What are the odds?" instead of parsing JSON APIs
- **Get real-time data** — Access prices, orderbooks, and trade history instantly
- **Search efficiently** — Full-text search across thousands of markets in <1ms

Instead of manually browsing market websites or writing API integration code, ask your AI assistant directly.

---

## Quick Start

Add to your MCP client configuration (e.g., `~/.claude.json` for Claude Code):

```json
{
  "mcpServers": {
    "prediction-markets": {
      "command": "npx",
      "args": ["-y", "prediction-mcp"],
      "env": {
        "KALSHI_API_KEY": "your-api-key",
        "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
      }
    }
  }
}
```

> **Note:** Polymarket works without credentials. Kalshi credentials are optional.

Restart your MCP client to load the server.

---

## What Can You Ask?

Once connected, try these natural language queries:

**Market Discovery**

- _"What are the current odds on Polymarket for the next Fed rate decision?"_
- _"Show me all open Kalshi markets about the 2024 election"_
- _"What are the top trending markets on Polymarket right now?"_
- _"Find Polymarket events tagged with Politics"_

**Price & Orderbook Analysis**

- _"Show me the orderbook for the next Fed rate decision on Kalshi"_
- _"What's the current price for 'Yes' on this Polymarket market?"_
- _"Show me the price history for this market over the last week"_

**Search & Research**

- _"Search Kalshi for markets about climate change"_
- _"Find all markets related to the Federal Reserve"_
- _"What prediction markets exist for tech company earnings?"_

See [Tools Reference](reference/tools.md) for the complete list of available operations.

---

## Platforms

### Kalshi

US-regulated prediction exchange with event contracts on politics, economics, weather, and more.

- **Auth required**: API key + RSA private key ([get credentials](https://kalshi.com/account/profile))
- **Demo environment**: Test with mock funds at [demo.kalshi.co](https://demo.kalshi.co)

### Polymarket

Decentralized prediction market on Polygon with deep liquidity on major events.

- **No auth required**: All read operations are public

---

<!-- TOOLS_TABLE_START -->
## Tools

### Kalshi

| Tool | Description | Auth |
| ---- | ----------- | ---- |
| [`kalshi_list_markets`](reference/tools.md#kalshi_list_markets) | List available markets on Kalshi | — |
| [`kalshi_get_market`](reference/tools.md#kalshi_get_market) | Get detailed information about a specific Kalshi market i... | — |
| [`kalshi_get_orderbook`](reference/tools.md#kalshi_get_orderbook) | Get the current orderbook for a Kalshi market | — |
| [`kalshi_get_trades`](reference/tools.md#kalshi_get_trades) | Get recent trade history for Kalshi markets | — |
| [`kalshi_get_series`](reference/tools.md#kalshi_get_series) | Get series metadata including title for URL construction | — |
| [`kalshi_get_event`](reference/tools.md#kalshi_get_event) | Get event metadata including title for URL construction | — |
| [`kalshi_search`](reference/tools.md#kalshi_search) | Search across Kalshi events and markets using keyword mat... | — |
| [`kalshi_search_events`](reference/tools.md#kalshi_search_events) | Search Kalshi events by keyword | — |
| [`kalshi_search_markets`](reference/tools.md#kalshi_search_markets) | Search Kalshi markets by keyword | — |
| [`kalshi_cache_stats`](reference/tools.md#kalshi_cache_stats) | Get search cache statistics including event/market counts... | — |
| [`kalshi_get_price_history`](reference/tools.md#kalshi_get_price_history) | Get historical candlestick (OHLCV) data for a Kalshi market | — |
| [`kalshi_get_balance`](reference/tools.md#kalshi_get_balance) | Get your Kalshi account balance and portfolio value | Required |
| [`kalshi_get_positions`](reference/tools.md#kalshi_get_positions) | Get your current positions on Kalshi markets | Required |

### Polymarket

| Tool | Description | Auth |
| ---- | ----------- | ---- |
| [`polymarket_list_markets`](reference/tools.md#polymarket_list_markets) | List available markets on Polymarket | — |
| [`polymarket_get_market`](reference/tools.md#polymarket_get_market) | Get detailed information about a specific Polymarket mark... | — |
| [`polymarket_list_events`](reference/tools.md#polymarket_list_events) | List events on Polymarket | — |
| [`polymarket_get_event`](reference/tools.md#polymarket_get_event) | Get detailed event information by slug | — |
| [`polymarket_list_tags`](reference/tools.md#polymarket_list_tags) | List available category tags on Polymarket | — |
| [`polymarket_get_orderbook`](reference/tools.md#polymarket_get_orderbook) | Get the current orderbook for a Polymarket outcome token | — |
| [`polymarket_get_price`](reference/tools.md#polymarket_get_price) | Get the current best price for a Polymarket outcome token | — |
| [`polymarket_get_price_history`](reference/tools.md#polymarket_get_price_history) | Get historical price data for a Polymarket outcome token | — |
| [`polymarket_search`](reference/tools.md#polymarket_search) | Search across Polymarket events and markets using keyword... | — |
| [`polymarket_search_events`](reference/tools.md#polymarket_search_events) | Search Polymarket events by keyword | — |
| [`polymarket_search_markets`](reference/tools.md#polymarket_search_markets) | Search Polymarket markets by keyword | — |
| [`polymarket_cache_stats`](reference/tools.md#polymarket_cache_stats) | Get Polymarket search cache statistics including event/ma... | — |

See [Tools Reference](reference/tools.md) for full parameter documentation.
<!-- TOOLS_TABLE_END -->

---

## Links

- [Getting Started](getting-started.md) — Installation and setup
- [Configuration](reference/configuration.md) — Environment variables and MCP client config
- [Tools Reference](reference/tools.md) — Complete tool documentation
- [Troubleshooting](troubleshooting.md) — Common issues and solutions
- [GitHub](https://github.com/shaanmajid/prediction-mcp) — Source code and issues
