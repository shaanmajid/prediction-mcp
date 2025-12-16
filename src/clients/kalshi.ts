import {
  Configuration,
  MarketApi,
  PortfolioApi,
  EventsApi,
  type EventData,
  type Market,
} from "kalshi-typescript";
import { backOff } from "exponential-backoff";
import { isAxiosError } from "axios";

export interface KalshiConfig {
  apiKey?: string;
  privateKeyPem?: string;
  privateKeyPath?: string;
  basePath?: string;
}

/** Retry options for rate-limited API calls */
const RETRY_OPTIONS = {
  numOfAttempts: 4,
  startingDelay: 100,
  jitter: "full" as const,
  retry: (err: unknown) => isAxiosError(err) && err.response?.status === 429,
};

export class KalshiClient {
  private marketApi: MarketApi;
  private portfolioApi: PortfolioApi;
  private eventsApi: EventsApi;

  constructor(config: KalshiConfig = {}) {
    const configuration = new Configuration({
      apiKey: config.apiKey || process.env.KALSHI_API_KEY,
      privateKeyPem: config.privateKeyPem || process.env.KALSHI_PRIVATE_KEY_PEM,
      privateKeyPath:
        config.privateKeyPath || process.env.KALSHI_PRIVATE_KEY_PATH,
      basePath:
        config.basePath ||
        process.env.KALSHI_BASE_PATH ||
        "https://api.elections.kalshi.com/trade-api/v2",
    });

    this.marketApi = new MarketApi(configuration);
    this.portfolioApi = new PortfolioApi(configuration);
    this.eventsApi = new EventsApi(configuration);
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
   * Fetch all open events by paginating through API
   * @returns Array of all open EventData objects
   */
  async fetchAllEvents(): Promise<EventData[]> {
    const allEvents: EventData[] = [];
    let cursor: string | undefined = undefined;

    do {
      const response = await this.listEvents({
        status: "open",
        limit: 200,
        cursor,
      });

      allEvents.push(...response.data.events);
      cursor = response.data.cursor || undefined;

      // Rate limiting delay between pages
      if (cursor) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } while (cursor);

    return allEvents;
  }

  /**
   * Fetch all markets for given event tickers
   * @param eventTickers - Array of event ticker symbols
   * @returns Array of all Market objects
   */
  async fetchAllMarkets(eventTickers: string[]): Promise<Market[]> {
    const allMarkets: Market[] = [];

    for (const eventTicker of eventTickers) {
      const response = await this.listMarkets({ eventTicker });
      allMarkets.push(...response.data.markets);

      // Rate limiting delay between requests
      if (eventTickers.indexOf(eventTicker) < eventTickers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return allMarkets;
  }
}
