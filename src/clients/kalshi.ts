import {
  Configuration,
  MarketApi,
  PortfolioApi,
  EventsApi,
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
}
