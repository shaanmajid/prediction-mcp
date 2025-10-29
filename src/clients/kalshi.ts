import {
  Configuration,
  MarketsApi,
  PortfolioApi,
  SeriesApi,
  EventsApi,
} from "kalshi-typescript";

export interface KalshiConfig {
  apiKey?: string;
  privateKeyPem?: string;
  privateKeyPath?: string;
  basePath?: string;
}

export class KalshiClient {
  private marketsApi: MarketsApi;
  private portfolioApi: PortfolioApi;
  private seriesApi: SeriesApi;
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

    this.marketsApi = new MarketsApi(configuration);
    this.portfolioApi = new PortfolioApi(configuration);
    this.seriesApi = new SeriesApi(configuration);
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
    const response = await this.marketsApi.getMarkets(
      params?.limit,
      undefined, // cursor
      params?.eventTicker,
      params?.seriesTicker,
      undefined, // maxCloseTs
      undefined, // minCloseTs
      params?.status,
    );
    return response;
  }

  /**
   * Get detailed information about a specific market
   * @param ticker - Market ticker symbol
   */
  async getMarketDetails(ticker: string) {
    const response = await this.marketsApi.getMarket(ticker);
    return response;
  }

  /**
   * Get current order book for a market (bids only)
   * @param ticker - Market ticker symbol
   */
  async getOrderBook(ticker: string) {
    const response = await this.marketsApi.getMarketOrderbook(ticker);
    return response;
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
    const response = await this.marketsApi.getTrades(
      params?.limit,
      params?.cursor,
      params?.ticker,
      params?.minTs,
      params?.maxTs,
    );
    return response;
  }

  /**
   * Get series metadata by ticker
   * @param seriesTicker - Series ticker symbol
   */
  async getSeries(seriesTicker: string) {
    const response = await this.seriesApi.getSeriesByTicker(seriesTicker);
    return response;
  }

  /**
   * Get event metadata by ticker
   * @param eventTicker - Event ticker symbol
   */
  async getEvent(eventTicker: string) {
    const response = await this.eventsApi.getEvent(eventTicker);
    return response;
  }
}
