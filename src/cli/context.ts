/**
 * CLI Context
 *
 * Manages client initialization and configuration for CLI commands.
 * Reuses the same clients as the MCP server.
 */

import { KalshiClient, type KalshiConfig } from "../clients/kalshi.js";
import {
  PolymarketClient,
  type PolymarketConfig,
} from "../clients/polymarket.js";
import { env } from "../env.js";
import {
  KalshiSearchService,
  PolymarketSearchService,
} from "../search/index.js";

// ============================================================
// Types
// ============================================================

export interface CLIContext {
  kalshi: KalshiClient;
  polymarket: PolymarketClient;
  kalshiSearch: KalshiSearchService;
  polymarketSearch: PolymarketSearchService;
  config: {
    kalshiAuthenticated: boolean;
    useDemo: boolean;
  };
}

export interface CLIOptions {
  demo?: boolean;
}

// ============================================================
// Context Creation
// ============================================================

let cachedContext: CLIContext | null = null;
let cachedOptions: CLIOptions = {};

/**
 * Create or retrieve the CLI context
 *
 * Context is lazily initialized and cached for the process lifetime.
 * This avoids re-creating clients for each command.
 */
export async function getContext(
  options: CLIOptions = {},
): Promise<CLIContext> {
  // Check if options changed (e.g., demo flag)
  const optionsChanged = cachedOptions.demo !== options.demo;

  if (cachedContext && !optionsChanged) {
    return cachedContext;
  }

  cachedOptions = { ...options };

  // Kalshi configuration
  const kalshiConfig: KalshiConfig = {
    apiKey: env.KALSHI_API_KEY,
    privateKeyPem: env.KALSHI_PRIVATE_KEY_PEM,
    privateKeyPath: env.KALSHI_PRIVATE_KEY_PATH,
    basePath: env.KALSHI_BASE_PATH,
    useDemo: options.demo ?? env.KALSHI_USE_DEMO,
  };

  const kalshiAuthenticated = !!(
    kalshiConfig.apiKey &&
    (kalshiConfig.privateKeyPem || kalshiConfig.privateKeyPath)
  );

  // Polymarket configuration
  const polymarketConfig: PolymarketConfig = {
    gammaHost: env.POLYMARKET_GAMMA_HOST,
    clobHost: env.POLYMARKET_CLOB_HOST,
    chainId: env.POLYMARKET_CHAIN_ID,
  };

  // Create clients
  const kalshi = new KalshiClient(kalshiConfig);
  const polymarket = new PolymarketClient(polymarketConfig);

  // Create search services
  const kalshiSearch = new KalshiSearchService(kalshi);
  const polymarketSearch = new PolymarketSearchService(polymarket);

  cachedContext = {
    kalshi,
    polymarket,
    kalshiSearch,
    polymarketSearch,
    config: {
      kalshiAuthenticated,
      useDemo: options.demo ?? env.KALSHI_USE_DEMO,
    },
  };

  return cachedContext;
}

/**
 * Check if Kalshi authentication is configured
 */
export function isKalshiAuthenticated(): boolean {
  return !!(
    env.KALSHI_API_KEY &&
    (env.KALSHI_PRIVATE_KEY_PEM || env.KALSHI_PRIVATE_KEY_PATH)
  );
}

/**
 * Get authentication status message
 */
export function getAuthStatus(): {
  kalshi: { authenticated: boolean; reason?: string };
  polymarket: { authenticated: boolean };
} {
  const hasApiKey = !!env.KALSHI_API_KEY;
  const hasPrivateKey = !!(
    env.KALSHI_PRIVATE_KEY_PEM || env.KALSHI_PRIVATE_KEY_PATH
  );

  let kalshiReason: string | undefined;
  if (!hasApiKey && !hasPrivateKey) {
    kalshiReason = "No credentials configured";
  } else if (!hasApiKey) {
    kalshiReason = "KALSHI_API_KEY not set";
  } else if (!hasPrivateKey) {
    kalshiReason = "KALSHI_PRIVATE_KEY_PATH or KALSHI_PRIVATE_KEY_PEM not set";
  }

  return {
    kalshi: {
      authenticated: hasApiKey && hasPrivateKey,
      reason: kalshiReason,
    },
    polymarket: {
      authenticated: true, // Polymarket is always public
    },
  };
}

/**
 * Format authentication status for display
 */
export function formatAuthStatus(): string {
  const status = getAuthStatus();
  const lines: string[] = [];

  const green = "\x1b[32m";
  const yellow = "\x1b[33m";
  const reset = "\x1b[0m";

  if (status.kalshi.authenticated) {
    lines.push(`${green}*${reset} Kalshi: authenticated`);
  } else {
    lines.push(`${yellow}*${reset} Kalshi: ${status.kalshi.reason}`);
  }

  lines.push(`${green}*${reset} Polymarket: public access (no auth required)`);

  return lines.join("\n");
}
