/**
 * Authentication module for platform credential management.
 *
 * Provides credential detection, validation, and auth state types
 * for all supported prediction market platforms.
 */

import type { KalshiClient } from "../clients/kalshi.js";
import { getKalshiAuthState, type KalshiCredentialConfig } from "./kalshi.js";
import { getPolymarketAuthState } from "./polymarket.js";
import type { AuthContext } from "./types.js";

export * from "./kalshi.js";
export * from "./polymarket.js";
export * from "./types.js";

/**
 * Initialize authentication for all platforms.
 *
 * Validates credentials and returns an AuthContext for tool registration.
 * Throws AuthInitError on:
 * - Partial credentials (some but not all required fields)
 * - Invalid credentials (API rejects them)
 *
 * @param kalshiConfig - Kalshi credential configuration
 * @param kalshiClient - Kalshi API client for credential validation
 */
export async function initializeAuth(
  kalshiConfig: KalshiCredentialConfig,
  kalshiClient: KalshiClient,
): Promise<AuthContext> {
  return {
    kalshi: await getKalshiAuthState(kalshiConfig, kalshiClient),
    polymarket: getPolymarketAuthState(),
  };
}
