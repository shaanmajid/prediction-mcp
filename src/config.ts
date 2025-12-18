// src/config.ts
import { z } from "zod";
import type { Level } from "pino";
import { logger } from "./logger.js";

/**
 * Valid log levels (re-exported from pino for schema use)
 */
const LOG_LEVELS: readonly Level[] = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
] as const;

/**
 * Environment variable schema with transformation to nested config.
 *
 * Design decisions:
 * - All values optional (lenient) - server starts without credentials
 * - Invalid values cause hard failure - misconfig should crash, not silently use defaults
 * - Nested output matches client constructor interfaces
 * - Descriptions used for auto-generated documentation
 */
export const ConfigSchema = z
  .object({
    // Kalshi (all optional - enables read-only public endpoints without creds)
    KALSHI_API_KEY: z
      .string()
      .min(1)
      .optional()
      .describe("Kalshi API key ID. Not required for public market data"),
    KALSHI_PRIVATE_KEY_PATH: z
      .string()
      .optional()
      .describe(
        "Path to RSA private key PEM file. Provide this OR KALSHI_PRIVATE_KEY_PEM",
      ),
    KALSHI_PRIVATE_KEY_PEM: z
      .string()
      .optional()
      .describe(
        "RSA private key as PEM string. Provide this OR KALSHI_PRIVATE_KEY_PATH",
      ),
    KALSHI_USE_DEMO: z
      .string()
      .default("false")
      .transform((val) => val === "true")
      .describe(
        "Set to 'true' to use Kalshi demo environment (demo.kalshi.co)",
      ),

    // Polymarket (all optional with sensible defaults)
    POLYMARKET_GAMMA_HOST: z
      .string()
      .url()
      .default("https://gamma-api.polymarket.com")
      .describe("Polymarket Gamma API host for market discovery"),
    POLYMARKET_CLOB_HOST: z
      .string()
      .url()
      .default("https://clob.polymarket.com")
      .describe("Polymarket CLOB API host for orderbook/trading data"),
    POLYMARKET_CHAIN_ID: z.coerce
      .number()
      .int()
      .positive()
      .default(137)
      .describe("Polygon chain ID for Polymarket CLOB client"),

    // Logging
    LOG_LEVEL: z
      .enum(LOG_LEVELS)
      .default("info")
      .describe("Logging verbosity level"),
  })
  .transform((env) => ({
    kalshi: {
      apiKey: env.KALSHI_API_KEY,
      privateKeyPath: env.KALSHI_PRIVATE_KEY_PATH,
      privateKeyPem: env.KALSHI_PRIVATE_KEY_PEM,
      useDemo: env.KALSHI_USE_DEMO,
    },
    polymarket: {
      gammaHost: env.POLYMARKET_GAMMA_HOST,
      clobHost: env.POLYMARKET_CLOB_HOST,
      chainId: env.POLYMARKET_CHAIN_ID,
    },
    logLevel: env.LOG_LEVEL,
  }));

/** Validated config type */
export type Config = z.infer<typeof ConfigSchema>;

/** Kalshi client config (nested under config.kalshi) */
export type KalshiConfig = Config["kalshi"];

/** Polymarket client config (nested under config.polymarket) */
export type PolymarketConfig = Config["polymarket"];

/**
 * Load and validate configuration from environment variables.
 * Exits with error message if validation fails.
 *
 * Call this once at startup in index.ts, not at module import time.
 */
export function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    logger.error({ issues: result.error.issues }, "Configuration error");
    process.exit(1);
  }

  return result.data;
}

/**
 * Create a config with defaults applied (for testing).
 * In production, use loadConfig() instead.
 */
export function createTestConfig(overrides: Partial<Config> = {}): Config {
  const defaults = ConfigSchema.parse({});
  return {
    ...defaults,
    ...overrides,
    kalshi: { ...defaults.kalshi, ...overrides.kalshi },
    polymarket: { ...defaults.polymarket, ...overrides.polymarket },
  };
}
