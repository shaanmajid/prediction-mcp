<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->

# Tools Reference

## Kalshi

## `kalshi_list_markets`

List available markets on Kalshi. Filter by status (open/closed/settled), event, or series.

**Parameters:**

- `status` (`"open"` | `"closed"` | `"settled"`, optional)
    - Filter markets by status. Options: 'open' (currently trading), 'closed' (trading ended, awaiting settlement), 'settled' (resolved with final outcome)

- `limit` (integer (min: 1, max: 1000), optional)
    - Maximum number of markets to return per page. Must be between 1 and 1000. Defaults to 100.

- `eventTicker` (string, optional)
    - Filter by event ticker (e.g., 'KXPRESIDENT'). Returns only markets belonging to this event.

- `seriesTicker` (string, optional)
    - Filter by series ticker (e.g., 'PRES-2024'). Returns only markets belonging to this series category.

## `kalshi_get_market`

Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.

**Parameters:**

- `ticker` (string (minLength: 1), required)
    - Market ticker symbol (e.g., 'KXPRESIDENT-2024'). Uniquely identifies a specific tradable market.

## `kalshi_get_orderbook`

Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.

**Parameters:**

- `ticker` (string (minLength: 1), required)
    - Market ticker symbol (e.g., 'KXPRESIDENT-2024'). Returns current bids for this market. Note: Only bids are returned due to binary market reciprocity.

## `kalshi_get_trades`

Get recent trade history for Kalshi markets. Can filter by specific market ticker.

**Parameters:**

- `ticker` (string, optional)
    - Filter trades by market ticker (e.g., 'KXPRESIDENT-2024'). If omitted, returns trades across all markets.

- `limit` (integer (min: 1, max: 1000), optional)
    - Maximum number of trades to return per page. Must be between 1 and 1000. Defaults to 100.

## `kalshi_get_series`

Get series metadata including title for URL construction. Series represent categories of related markets (e.g., endorsements, elections).

**Parameters:**

- `seriesTicker` (string (minLength: 1), required)
    - Series ticker symbol (e.g., 'PRES-2024'). Returns metadata about a series, which represents a category of related markets.

## `kalshi_get_event`

Get event metadata including title for URL construction. Events represent specific occurrences that can be traded on.

**Parameters:**

- `eventTicker` (string (minLength: 1), required)
    - Event ticker symbol (e.g., 'KXPRESIDENT'). Returns metadata about an event, which represents a specific occurrence that can be traded on.

## `kalshi_search`

Search across Kalshi events and markets using keyword matching. Returns results ranked by relevance. Searches event titles, market titles, and candidate/outcome names (yes_sub_title).

**Parameters:**

- `query` (string (minLength: 1), required)
    - Search terms to find events or markets

- `limit` (integer (min: 1, max: 100), required)
    - Maximum number of results to return

## `kalshi_search_events`

Search Kalshi events by keyword. Returns events ranked by relevance based on title, subtitle, and ticker matches.

**Parameters:**

- `query` (string (minLength: 1), required)
    - Search terms to find events or markets

- `limit` (integer (min: 1, max: 100), required)
    - Maximum number of results to return

## `kalshi_search_markets`

Search Kalshi markets by keyword. Returns markets ranked by relevance. Searches title, yes_sub_title (candidate/outcome names), no_sub_title, and ticker.

**Parameters:**

- `query` (string (minLength: 1), required)
    - Search terms to find events or markets

- `limit` (integer (min: 1, max: 100), required)
    - Maximum number of results to return

## `kalshi_cache_stats`

Get search cache statistics including event/market counts, cache age, TTL expiry time, and last refresh time. Optionally trigger a cache refresh.

**Parameters:**

- `refresh` (boolean, required)
    - If true, trigger a cache refresh before returning stats

## `kalshi_get_price_history`

Get historical candlestick (OHLCV) data for a Kalshi market. Returns price, volume, and open interest over time. Requires both series_ticker and market ticker.

**Parameters:**

- `series_ticker` (string (minLength: 1), required)
    - Series ticker containing the market (e.g., 'KXINX'). Find this via kalshi_get_market or kalshi_get_event.

- `ticker` (string (minLength: 1), required)
    - Market ticker symbol (e.g., 'KXINX-25DEC31-T2000'). The specific market to get candlestick data for.

- `start_ts` (integer (min: -9007199254740991, max: 9007199254740991), optional)
    - Start timestamp in Unix seconds. Defaults to 24 hours ago if not provided.

- `end_ts` (integer (min: -9007199254740991, max: 9007199254740991), optional)
    - End timestamp in Unix seconds. Defaults to now if not provided.

- `period_interval` (`1` | `60` | `1440`, required)
    - Candlestick period in minutes. Valid values: 1 (1 minute), 60 (1 hour), 1440 (1 day).

## `kalshi_get_balance`

> **Authentication:** Required (kalshi)

Get your Kalshi account balance and portfolio value. Returns values in cents and dollars. Requires Kalshi authentication.

No parameters.

## `kalshi_get_positions`

> **Authentication:** Required (kalshi)

Get your current positions on Kalshi markets. Filter by ticker, event, or settlement status. Returns market positions with P&L and exposure data. Requires Kalshi authentication.

**Parameters:**

- `ticker` (string, optional)
    - Filter by specific market ticker.

- `eventTicker` (string, optional)
    - Filter by event ticker. Multiple tickers can be comma-separated (max 10).

- `settlementStatus` (`"all"` | `"unsettled"` | `"settled"`, optional)
    - Filter by settlement status. Defaults to 'unsettled' if not specified.

- `countFilter` (string, optional)
    - Restrict to positions with non-zero values. Accepts comma-separated values: 'position', 'total_traded'.

- `limit` (integer (min: 1, max: 200), optional)
    - Maximum number of positions to return. Defaults to 100.

- `cursor` (string, optional)
    - Pagination cursor from previous response.

## Polymarket

## `polymarket_list_markets`

List available markets on Polymarket. Filter by status (open/closed) and category tags. Returns market metadata including question, prices, volume, and token IDs for CLOB operations.

**Parameters:**

- `closed` (boolean, optional)
    - Filter by market status. Set to false for active markets only (default), true for closed markets.

- `limit` (integer (min: 1, max: 1000), optional)
    - Maximum number of markets to return per page. Must be between 1 and 1000. Defaults to 100.

- `offset` (integer (min: 0, max: 9007199254740991), optional)
    - Pagination offset. Use with limit for paging through results.

- `tag_id` (string, optional)
    - Filter by tag/category ID. Get available tags from polymarket_list_tags.

## `polymarket_get_market`

Get detailed information about a specific Polymarket market by slug. Returns question, description, resolution criteria, current prices, volume, and token IDs.

**Parameters:**

- `slug` (string (minLength: 1), required)
    - Market slug (e.g., 'will-trump-win-2024'). Found in market URLs and list results.

## `polymarket_list_events`

List events on Polymarket. Events group related markets (e.g., '2024 Election' may contain multiple market questions).

**Parameters:**

- `closed` (boolean, optional)
    - Filter by event status. Set to false for active events only (default), true for closed events.

- `limit` (integer (min: 1, max: 1000), optional)
    - Maximum number of events to return per page. Must be between 1 and 1000. Defaults to 100.

- `offset` (integer (min: 0, max: 9007199254740991), optional)
    - Pagination offset. Use with limit for paging through results.

- `tag_id` (string, optional)
    - Filter by tag/category ID. Get available tags from polymarket_list_tags.

## `polymarket_get_event`

Get detailed event information by slug. Events contain metadata and may include nested markets.

**Parameters:**

- `slug` (string (minLength: 1), required)
    - Event slug (e.g., '2024-presidential-election'). Found in event URLs and list results.

## `polymarket_list_tags`

List available category tags on Polymarket. Tags can be used to filter markets and events by category (e.g., Politics, Sports, Crypto).

No parameters.

## `polymarket_get_orderbook`

Get the current orderbook for a Polymarket outcome token. Returns both bids and asks with price and size. Use token_id from market's clobTokenIds field.

**Parameters:**

- `token_id` (string (minLength: 1), required)
    - Outcome token ID from market's clobTokenIds field. Each market has separate token IDs for Yes/No outcomes.

## `polymarket_get_price`

Get the current best price for a Polymarket outcome token. Specify BUY or SELL side.

**Parameters:**

- `token_id` (string (minLength: 1), required)
    - Outcome token ID from market's clobTokenIds field.

- `side` (`"BUY"` | `"SELL"`, required)
    - Order side to get price for.

## `polymarket_get_price_history`

Get historical price data for a Polymarket outcome token. Returns time series of price points. Defaults to last 24 hours with hourly resolution.

**Parameters:**

- `token_id` (string (minLength: 1), required)
    - Outcome token ID from market's clobTokenIds field.

- `fidelity` (integer (min: 1, max: 9007199254740991), optional)
    - Data resolution in minutes. Defaults to 60 (hourly data).

- `startTs` (integer (min: -9007199254740991, max: 9007199254740991), optional)
    - Start timestamp in Unix seconds. Defaults to 24 hours ago if not provided.

- `endTs` (integer (min: -9007199254740991, max: 9007199254740991), optional)
    - End timestamp in Unix seconds. Defaults to now if not provided.

## `polymarket_search`

Search across Polymarket events and markets using keyword matching. Returns results ranked by relevance. Searches event titles, market questions, and outcome names.

**Parameters:**

- `query` (string (minLength: 1), required)
    - Search terms to find events or markets on Polymarket

- `limit` (integer (min: 1, max: 100), required)
    - Maximum number of results to return

## `polymarket_search_events`

Search Polymarket events by keyword. Returns events ranked by relevance based on title, slug, and description matches.

**Parameters:**

- `query` (string (minLength: 1), required)
    - Search terms to find events or markets on Polymarket

- `limit` (integer (min: 1, max: 100), required)
    - Maximum number of results to return

## `polymarket_search_markets`

Search Polymarket markets by keyword. Returns markets ranked by relevance. Searches question, groupItemTitle (outcome/candidate names), slug, description, and outcomes.

**Parameters:**

- `query` (string (minLength: 1), required)
    - Search terms to find events or markets on Polymarket

- `limit` (integer (min: 1, max: 100), required)
    - Maximum number of results to return

## `polymarket_cache_stats`

Get Polymarket search cache statistics including event/market counts, cache age, TTL expiry time, and last refresh time. Optionally trigger a cache refresh.

**Parameters:**

- `refresh` (boolean, required)
    - If true, trigger a cache refresh before returning stats
