/**
 * Kalshi authentication utilities.
 *
 * Provides credential state detection and validation for Kalshi API.
 */

import { isAxiosError } from "axios";
import type { KalshiClient } from "../clients/kalshi.js";
import {
  AuthInitError,
  type AuthValidationResult,
  type CredentialState,
  type PlatformAuthState,
} from "./types.js";

/**
 * Kalshi credential fields needed for authentication.
 */
export interface KalshiCredentialConfig {
  apiKey?: string;
  privateKeyPem?: string;
  privateKeyPath?: string;
}

/**
 * Detect the credential state from Kalshi configuration.
 *
 * Rules:
 * - none: Neither apiKey nor any private key is set
 * - partial: apiKey set but no private key, OR private key set but no apiKey
 * - complete: apiKey AND (privateKeyPem OR privateKeyPath)
 */
export function getKalshiCredentialState(
  config: KalshiCredentialConfig,
): CredentialState {
  const hasApiKey = !!config.apiKey;
  const hasPrivateKey = !!config.privateKeyPem || !!config.privateKeyPath;

  if (!hasApiKey && !hasPrivateKey) {
    return { status: "none" };
  }

  if (hasApiKey && hasPrivateKey) {
    return { status: "complete" };
  }

  return { status: "partial" };
}

/** Lightweight auth check — uses getApiKeys() for privacy (no financial data). */
const KALSHI_AUTH_HEALTH_CHECK = (client: KalshiClient) => client.getApiKeys();

/**
 * Validate Kalshi credentials by making a lightweight authenticated API call.
 */
export async function validateKalshiCredentials(
  client: KalshiClient,
): Promise<AuthValidationResult> {
  try {
    // Response discarded — we only care if the request succeeds
    await KALSHI_AUTH_HEALTH_CHECK(client);
    return { status: "valid" };
  } catch (error) {
    const message = extractAuthErrorMessage(error);
    return { status: "invalid", error: message };
  }
}

/**
 * Get the auth state for Kalshi, validating credentials if provided.
 *
 * - No credentials: returns unauthenticated state
 * - Partial credentials: throws AuthInitError (fail fast)
 * - Complete credentials: validates against API, throws on failure
 */
export async function getKalshiAuthState(
  config: KalshiCredentialConfig,
  client: KalshiClient,
): Promise<PlatformAuthState> {
  const credState = getKalshiCredentialState(config);

  if (credState.status === "none") {
    return { authenticated: false, reason: "no_credentials" };
  }

  if (credState.status === "partial") {
    throw new AuthInitError(
      "Incomplete Kalshi credentials: requires both API key and private key",
    );
  }

  // Fail-fast: validate credentials against API
  const validation = await validateKalshiCredentials(client);
  if (validation.status == "invalid") {
    throw new AuthInitError("Kalshi authentication failed", {
      error: validation.error,
    });
  }

  return { authenticated: true };
}

/**
 * Extract a user-friendly error message from an authentication failure.
 */
function extractAuthErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;

    switch (status) {
      case 401:
        return "Invalid API key or private key";
      case 403:
        return "API key lacks required permissions";
      default:
        if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
          return "Could not reach Kalshi API — check your network connection";
        }
        return error.message || "Authentication failed";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Authentication failed";
}
