import { isAxiosError } from "axios";
import { backOff } from "exponential-backoff";
import {
  ApiKeysApi,
  Configuration,
  type EventData,
  EventsApi,
  type Market,
  MarketApi,
  OrdersApi,
  PortfolioApi,
} from "kalshi-typescript";
import { logger } from "../logger.js";

export const KALSHI_PRODUCTION_URL =
  "https://api.elections.kalshi.com/trade-api/v2";
export const KALSHI_DEMO_URL = "https://demo-api.kalshi.co/trade-api/v2";

export interface KalshiConfig {
  apiKey?: string;
  privateKeyPem?: string;
  privateKeyPath?: string;
  basePath?: string;
  useDemo: boolean;
}

/**
 * Resolve the Kalshi API base path from config.
 * Priority: explicit basePath > useDemo flag > production default
 *
 * @returns Object with resolved basePath and whether a warning should be logged
 */
export function resolveKalshiBasePath(config: KalshiConfig): {
  basePath: string;
  shouldWarn: boolean;
  explicitBasePath: string | undefined;
} {
  const { useDemo, basePath: explicitBasePath } = config;
  const shouldWarn = useDemo && !!explicitBasePath;
  const basePath =
    explicitBasePath || (useDemo ? KALSHI_DEMO_URL : KALSHI_PRODUCTION_URL);

  return { basePath, shouldWarn, explicitBasePath };
}

const MAX_RETRY_ATTEMPTS = 4;

const isRateLimited = (err: unknown): boolean =>
  isAxiosError(err) && err.response?.status === 429;

/** Retry options for rate-limited API calls */
const RETRY_OPTIONS = {
  numOfAttempts: MAX_RETRY_ATTEMPTS,
  startingDelay: 100,
  jitter: "full" as const,
  retry: (err: unknown, attemptNumber: number) => {
    const shouldRetry = isRateLimited(err);
    if (shouldRetry) {
      logger.warn(
        {
          attempt: attemptNumber,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          status: 429,
        },
        "Kalshi rate limited, retrying",
      );
    }
    return shouldRetry;
  },
};

export class KalshiClient {
  private marketApi: MarketApi;
  private eventsApi: EventsApi;
  private portfolioApi: PortfolioApi;
  private apiKeysApi: ApiKeysApi;
  private ordersApi: OrdersApi;

  constructor(config: KalshiConfig) {
    const { basePath, shouldWarn, explicitBasePath } =
      resolveKalshiBasePath(config);

    if (shouldWarn) {
      logger.warn(
        { basePath: explicitBasePath },
        "Both KALSHI_USE_DEMO and KALSHI_BASE_PATH are set; KALSHI_BASE_PATH takes precedence",
      );
    }

    const configuration = new Configuration({
      apiKey: config.apiKey,
      privateKeyPem: config.privateKeyPem,
      privateKeyPath: config.privateKeyPath,
      basePath,
    });

    this.marketApi = new MarketApi(configuration);
    this.eventsApi = new EventsApi(configuration);
    this.portfolioApi = new PortfolioApi(configuration);
    this.apiKeysApi = new ApiKeysApi(configuration);
    this.ordersApi = new OrdersApi(configuration);
  }

  /**
   * List all available markets
   * @param params - Optional filters (status, limit, cursor, etc.)
   */
  async listMarkets(params?: {
    status?: "open" | "closed" | "settled";
    limit?: number;
    cursor?: string;
    eventTicker?: string;
    seriesTicker?: string;
  }) {
    return backOff(
      () =>
        this.marketApi.getMarkets(
          params?.limit,
          params?.cursor,
          params?.eventTicker,
          params?.seriesTicker,
          undefined, // minCreatedTs
          undefined, // maxCreatedTs
          undefined, // maxCloseTs
          undefined, // minCloseTs
          undefined, // minSettledTs
          undefined, // maxSettledTs
          params?.status,
        ),
      RETRY_OPTIONS,
    );
  }

  /**
   * Get detailed information about a specific market
   * @param ticker - Market ticker symbol
   */
  async getMarketDetails(ticker: string) {
    return backOff(() => this.marketApi.getMarket(ticker), RETRY_OPTIONS);
  }

  /**
   * Get current order book for a market (bids only)
   * @param ticker - Market ticker symbol
   */
  async getOrderBook(ticker: string) {
    return backOff(
      () => this.marketApi.getMarketOrderbook(ticker),
      RETRY_OPTIONS,
    );
  }

  /**
   * Get trade history for a market
   * @param params - Optional filters (ticker, limit, cursor, etc.)
   */
  async getTrades(params?: {
    ticker?: string;
    limit?: number;
    cursor?: string;
    minTs?: number;
    maxTs?: number;
  }) {
    return backOff(
      () =>
        this.marketApi.getTrades(
          params?.limit,
          params?.cursor,
          params?.ticker,
          params?.minTs,
          params?.maxTs,
        ),
      RETRY_OPTIONS,
    );
  }

  /**
   * Get series metadata by ticker
   * @param seriesTicker - Series ticker symbol
   */
  async getSeries(seriesTicker: string) {
    return backOff(() => this.marketApi.getSeries(seriesTicker), RETRY_OPTIONS);
  }

  /**
   * Get event metadata by ticker
   * @param eventTicker - Event ticker symbol
   */
  async getEvent(eventTicker: string) {
    return backOff(() => this.eventsApi.getEvent(eventTicker), RETRY_OPTIONS);
  }

  /**
   * List events with optional filters
   * @param params - Optional filters (status, limit, cursor, etc.)
   */
  async listEvents(params?: {
    status?: "open" | "closed" | "settled";
    limit?: number;
    cursor?: string;
    seriesTicker?: string;
    withNestedMarkets?: boolean;
  }) {
    return backOff(
      () =>
        this.eventsApi.getEvents(
          params?.limit,
          params?.cursor,
          params?.withNestedMarkets,
          undefined, // withMilestones
          params?.status,
          params?.seriesTicker,
          undefined, // minCloseTs
        ),
      RETRY_OPTIONS,
    );
  }

  /**
   * Fetch all open events with their nested markets in a single paginated call
   * Uses withNestedMarkets=true to get both events and markets efficiently
   * @returns Object containing events array and markets array
   */
  async fetchAllEventsWithMarkets(): Promise<{
    events: EventData[];
    markets: Market[];
  }> {
    const allEvents: EventData[] = [];
    const allMarkets: Market[] = [];
    let cursor: string | undefined = undefined;

    do {
      const response = await this.listEvents({
        status: "open",
        limit: 200,
        cursor,
        withNestedMarkets: true,
      });

      for (const event of response.data.events) {
        // Extract markets from event before storing
        const markets = event.markets || [];
        allMarkets.push(...markets);

        // Store event without nested markets to save memory
        const { markets: _markets, ...eventWithoutMarkets } = event;
        void _markets; // Explicitly mark as intentionally unused
        allEvents.push(eventWithoutMarkets as EventData);
      }

      cursor = response.data.cursor || undefined;

      // Rate limiting delay between pages (conservative for basic tier: 20 req/sec)
      if (cursor) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } while (cursor);

    return { events: allEvents, markets: allMarkets };
  }

  /**
   * Fetch all markets by paginating through the entire market list
   * Much faster than fetching per-event since it uses bulk pagination
   * @param eventTickers - Optional filter to only include markets for these events
   * @returns Array of all Market objects
   */
  async fetchAllMarkets(eventTickers?: string[]): Promise<Market[]> {
    const allMarkets: Market[] = [];
    let cursor: string | undefined = undefined;
    const eventTickerSet = eventTickers ? new Set(eventTickers) : null;

    do {
      const response = await this.listMarkets({
        limit: 1000,
        cursor,
      });

      // Filter to only include markets for specified events if provided
      const markets = eventTickerSet
        ? response.data.markets.filter((m) =>
            eventTickerSet.has(m.event_ticker),
          )
        : response.data.markets;

      allMarkets.push(...markets);
      cursor = response.data.cursor || undefined;

      // Rate limiting delay between pages
      if (cursor) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } while (cursor);

    return allMarkets;
  }

  /**
   * Get candlestick (OHLCV) data for a market
   * @param params - Candlestick query parameters
   */
  async getMarketCandlesticks(params: {
    seriesTicker: string;
    ticker: string;
    startTs: number;
    endTs: number;
    periodInterval: 1 | 60 | 1440;
  }) {
    return backOff(
      () =>
        this.marketApi.getMarketCandlesticks(
          params.seriesTicker,
          params.ticker,
          params.startTs,
          params.endTs,
          params.periodInterval,
        ),
      RETRY_OPTIONS,
    );
  }

  /**
   * Get portfolio balance information
   */
  async getBalance() {
    return backOff(() => this.portfolioApi.getBalance(), RETRY_OPTIONS);
  }

  /**
   * Get portfolio positions
   * @param params - Optional filters (ticker, eventTicker, etc.)
   */
  async getPositions(params?: {
    ticker?: string;
    eventTicker?: string;
    countFilter?: string;
    limit?: number;
    cursor?: string;
  }) {
    // Parameter order must match SDK's positional signature (auto-generated from OpenAPI)
    return backOff(
      () =>
        this.portfolioApi.getPositions(
          params?.cursor,
          params?.limit,
          params?.countFilter,
          params?.ticker,
          params?.eventTicker,
        ),
      RETRY_OPTIONS,
    );
  }

  /**
   * Get API keys for the authenticated user.
   *
   * This method is primarily used for credential validation on startup.
   * It verifies the API key and private key are valid by making an
   * authenticated request that returns only key metadata (no sensitive data).
   */
  async getApiKeys() {
    return backOff(() => this.apiKeysApi.getApiKeys(), RETRY_OPTIONS);
  }

  /**
   * List orders for the authenticated user
   * @param params - Optional filters (ticker, status, timestamps, etc.)
   */
  async listOrders(params?: {
    ticker?: string;
    eventTicker?: string;
    minTs?: number;
    maxTs?: number;
    status?: "resting" | "canceled" | "executed";
    limit?: number;
    cursor?: string;
  }) {
    return backOff(
      () =>
        this.ordersApi.getOrders(
          params?.ticker,
          params?.eventTicker,
          params?.minTs,
          params?.maxTs,
          params?.status,
          params?.limit,
          params?.cursor,
        ),
      RETRY_OPTIONS,
    );
  }

  /**
   * Get a specific order by ID
   * @param orderId - The unique order ID
   */
  async getOrder(orderId: string) {
    return backOff(() => this.ordersApi.getOrder(orderId), RETRY_OPTIONS);
  }

  /**
   * Get trade execution history (fills) for the authenticated user
   * @param params - Optional filters (ticker, orderId, timestamps, etc.)
   */
  async getFills(params?: {
    ticker?: string;
    orderId?: string;
    minTs?: number;
    maxTs?: number;
    limit?: number;
    cursor?: string;
  }) {
    return backOff(
      () =>
        this.portfolioApi.getFills(
          params?.ticker,
          params?.orderId,
          params?.minTs,
          params?.maxTs,
          params?.limit,
          params?.cursor,
        ),
      RETRY_OPTIONS,
    );
  }

  /**
   * Get settlement history for closed positions
   * @param params - Optional filters (ticker, eventTicker, timestamps, etc.)
   */
  async getSettlements(params?: {
    limit?: number;
    cursor?: string;
    ticker?: string;
    eventTicker?: string;
    minTs?: number;
    maxTs?: number;
  }) {
    return backOff(
      () =>
        this.portfolioApi.getSettlements(
          params?.limit,
          params?.cursor,
          params?.ticker,
          params?.eventTicker,
          params?.minTs,
          params?.maxTs,
        ),
      RETRY_OPTIONS,
    );
  }

  /**
   * Create a new order on Kalshi
   * WARNING: This places a real order with real money. Ensure all parameters are correct.
   * @param params - Order parameters
   */
  async createOrder(params: {
    ticker: string;
    action: "buy" | "sell";
    side: "yes" | "no";
    type?: "limit" | "market";
    count: number;
    yes_price?: number;
    no_price?: number;
    client_order_id?: string;
    expiration_ts?: number;
    sell_position_floor?: number;
    buy_max_cost?: number;
  }) {
    return backOff(
      () =>
        this.ordersApi.createOrder({
          ticker: params.ticker,
          action: params.action,
          side: params.side,
          type: params.type,
          count: params.count,
          yes_price: params.yes_price,
          no_price: params.no_price,
          client_order_id: params.client_order_id,
          expiration_ts: params.expiration_ts,
          sell_position_floor: params.sell_position_floor,
          buy_max_cost: params.buy_max_cost,
        }),
      RETRY_OPTIONS,
    );
  }

  /**
   * Cancel an existing order by ID
   * @param orderId - The unique order ID to cancel
   */
  async cancelOrder(orderId: string) {
    return backOff(() => this.ordersApi.cancelOrder(orderId), RETRY_OPTIONS);
  }
}
