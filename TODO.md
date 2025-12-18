# TODO & Roadmap

## High Priority

### Search & Discovery

- [x] Implement `kalshi_search` MCP tool
  - [x] Client-side search implementation (`src/search/` with cache and service)
  - [x] Validation schemas (`SearchQuerySchema`, `CacheStatsSchema`)
  - [x] MCP tool registration and handler (`kalshi_search`, `kalshi_search_events`, `kalshi_search_markets`, `kalshi_cache_stats`)
  - [ ] Add caching layer with WebSocket-based invalidation (see [WebSocket API](https://docs.kalshi.com/websockets/market-&-event-lifecycle))

### Testing & Quality

- [x] Comprehensive unit test coverage for all tools
  - [x] Stub tests for KalshiClient instantiation
  - [x] Tests for listMarkets()
  - [x] Tests for getMarketDetails()
  - [x] Tests for getOrderBook()
  - [x] Tests for getTrades()
  - [x] Tests for getSeries()
  - [x] Tests for getEvent()
  - [x] Tests for search()
  - [x] Validation schema tests (deterministic, no mocks needed)

### Documentation

- [x] Automated tool documentation in markdown (similar to OpenAPI for MCP)
  - [x] `scripts/generate-docs.ts` generates docs from tool schemas
  - [x] CI runs `docs:check` to ensure freshness
  - [x] Auto-generated from Zod schemas via `toMCPSchema()`
- [x] Exhaustive library of all required and optional config/environment variables
  - [x] All environment variables documented in `docs/configuration.md`
  - [x] Validation via Zod schemas with helpful error messages
  - [x] Example configurations in docs (Claude Desktop, bootstrap script)

## Medium Priority

### Platform Integration

- [x] Polymarket integration
  - [x] Gamma API client implementation (`PolymarketClient`)
  - [x] CLOB API for orderbook/trading data (via `@polymarket/clob-client@5.0.0`)
  - [x] MCP tools for Polymarket (9 tools implemented)
- [ ] Market comparison tools
  - [ ] Cross-platform market discovery
  - [ ] Price comparison utilities
  - [ ] Arbitrage detection

### Features

- [ ] Price history and candlestick data
  - [ ] Implement getMarketCandlesticks() wrapper
  - [ ] MCP tool for historical data
- [ ] WebSocket support for real-time updates
  - [ ] Market & event lifecycle stream
  - [ ] Live price updates
  - [ ] Order fill notifications
- [ ] Explore SDK 3.0 new APIs
  - [ ] SearchApi for sports filters and category tags
  - [ ] LiveDataApi for real-time data
  - [ ] MultivariateApi for combo events

## Low Priority

### Nice to Have

- [ ] Manifold Markets integration (play money, lower priority)
- [ ] Metaculus integration (forecasting focused)
- [ ] Portfolio tracking tools
- [ ] Alerts and notifications

## Completed

- [x] Kalshi client implementation
- [x] Development tooling setup (ESLint, Prettier, Husky)
- [x] MCP server implementation (basic tools)
- [x] TypeScript type checking in pre-commit and CI
- [x] Series and event metadata tools for URL construction
- [x] Zod validation layer
- [x] Structured content responses (removed text fallbacks)
- [x] Upgrade to Kalshi SDK 3.0.0
- [x] Kalshi search with in-memory cache (~7s initial load, <1ms queries)
- [x] Auto-generated documentation with CI freshness checks
- [x] Comprehensive test coverage (176 tests across 8 files)

---

**Note**: This TODO list is tracked in version control. Update as tasks are completed or priorities change.
