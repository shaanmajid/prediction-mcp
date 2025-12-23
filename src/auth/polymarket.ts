/**
 * Polymarket authentication utilities.
 *
 * Currently a stub — Polymarket's read APIs are all public.
 * This file exists for future authenticated endpoints.
 */

import type { CredentialState, PlatformAuthState } from "./types.js";

/**
 * Polymarket credential configuration (placeholder for future auth).
 */
interface PolymarketCredentialConfig {
  // Future: apiKey, wallet address, etc.
}

/**
 * Detect the credential state from Polymarket configuration.
 *
 * Currently always returns "none" since Polymarket has no auth yet.
 */
export function getPolymarketCredentialState(
  _config: PolymarketCredentialConfig,
): CredentialState {
  // Future: Check for Polymarket credentials when they add auth
  return { status: "none" };
}

/**
 * Get the default auth state for Polymarket.
 *
 * Currently always returns unauthenticated since Polymarket has no auth.
 */
export function getPolymarketAuthState(): PlatformAuthState {
  return { authenticated: false, reason: "no_credentials" };
}
