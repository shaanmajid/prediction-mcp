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

```bash
git clone https://github.com/shaanmajid/prediction-mcp.git
cd prediction-mcp
bun install
bun run scripts/bootstrap.ts --interactive
```

After running bootstrap, restart your MCP client to load the server.

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

## Tools

### Kalshi

| Tool                                                                | Description                                 |
| ------------------------------------------------------------------- | ------------------------------------------- |
| [`kalshi_list_markets`](reference/tools.md#kalshi_list_markets)     | List markets, filter by status/event/series |
| [`kalshi_get_market`](reference/tools.md#kalshi_get_market)         | Get market details, prices, volume          |
| [`kalshi_get_orderbook`](reference/tools.md#kalshi_get_orderbook)   | Current bids for a market                   |
| [`kalshi_get_trades`](reference/tools.md#kalshi_get_trades)         | Recent trade history                        |
| [`kalshi_search`](reference/tools.md#kalshi_search)                 | Full-text search across events and markets  |
| [`kalshi_search_events`](reference/tools.md#kalshi_search_events)   | Search events only                          |
| [`kalshi_search_markets`](reference/tools.md#kalshi_search_markets) | Search markets only                         |
| [`kalshi_get_event`](reference/tools.md#kalshi_get_event)           | Event metadata                              |
| [`kalshi_get_series`](reference/tools.md#kalshi_get_series)         | Series metadata                             |
| [`kalshi_cache_stats`](reference/tools.md#kalshi_cache_stats)       | Search cache stats, trigger refresh         |

### Polymarket

| Tool                                                                              | Description                         |
| --------------------------------------------------------------------------------- | ----------------------------------- |
| [`polymarket_list_markets`](reference/tools.md#polymarket_list_markets)           | List markets, filter by status/tags |
| [`polymarket_get_market`](reference/tools.md#polymarket_get_market)               | Get market by slug                  |
| [`polymarket_list_events`](reference/tools.md#polymarket_list_events)             | List events (grouped markets)       |
| [`polymarket_get_event`](reference/tools.md#polymarket_get_event)                 | Event details                       |
| [`polymarket_list_tags`](reference/tools.md#polymarket_list_tags)                 | Available category tags             |
| [`polymarket_get_orderbook`](reference/tools.md#polymarket_get_orderbook)         | Full orderbook (bids + asks)        |
| [`polymarket_get_price`](reference/tools.md#polymarket_get_price)                 | Current best price                  |
| [`polymarket_get_price_history`](reference/tools.md#polymarket_get_price_history) | Historical price time series        |
| [`polymarket_search`](reference/tools.md#polymarket_search)                       | Full-text search across events and markets |
| [`polymarket_search_events`](reference/tools.md#polymarket_search_events)         | Search events only                  |
| [`polymarket_search_markets`](reference/tools.md#polymarket_search_markets)       | Search markets only                 |
| [`polymarket_cache_stats`](reference/tools.md#polymarket_cache_stats)             | Search cache stats, trigger refresh |

See [Tools Reference](reference/tools.md) for full parameter documentation.

---

## Links

- [Getting Started](getting-started.md) — Installation and setup
- [Configuration](reference/configuration.md) — Environment variables and MCP client config
- [Tools Reference](reference/tools.md) — Complete tool documentation
- [Troubleshooting](troubleshooting.md) — Common issues and solutions
- [GitHub](https://github.com/shaanmajid/prediction-mcp) — Source code and issues
