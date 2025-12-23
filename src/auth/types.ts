/**
 * Authentication types for platform credential management.
 *
 * These types support a three-state credential model:
 * - none: No credentials provided
 * - partial: Some but not all required credentials (fail fast)
 * - complete: All credentials present (validate against API)
 */

/**
 * Credential state for a platform's authentication requirements.
 */
export type CredentialState =
  | { status: "none" }
  | { status: "partial" }
  | { status: "complete" };

/**
 * Result of validating credentials against the platform API.
 */
export type AuthValidationResult =
  | { status: "valid" }
  | { status: "invalid"; error: string };

/**
 * Runtime auth state for a platform, used for tool registration.
 */
export type PlatformAuthState =
  | { authenticated: false; reason: "no_credentials" }
  | { authenticated: true };

/**
 * Combined auth context for all platforms.
 * Passed to getToolsList() to conditionally register auth-required tools.
 */
export interface AuthContext {
  kalshi: PlatformAuthState;
  polymarket: PlatformAuthState;
}

/**
 * Error thrown when authentication initialization fails.
 * Used for partial credentials or API validation failures.
 */
export class AuthInitError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AuthInitError";
  }
}
