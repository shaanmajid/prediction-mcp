/**
 * Environment configuration with fail-fast validation.
 *
 * Uses @t3-oss/env-core for schema validation at import time.
 * Documentation metadata is attached via .meta() and extracted in scripts/env-docs.ts.
 */
import { createEnv } from "@t3-oss/env-core";
import pino from "pino";
import { z } from "zod";
import { DEFAULT_CACHE_TTL_SECONDS } from "./search/ttl.js";

// ============================================================
// Custom Validators
// ============================================================

/**
 * Strict boolean env var validator.
 * Only accepts explicit boolean strings — rejects typos like "TRUE" or "yes".
 */
const booleanString = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

/**
 * Log levels from pino - reuse their definition.
 * Excludes "silent" as it's not typically set via env var.
 */
const LOG_LEVELS = Object.keys(pino.levels.values).filter(
  (l) => l !== "silent",
) as [string, ...string[]];

const logLevelSchema = z.enum(LOG_LEVELS);

// ============================================================
// Schema Definition (Single Source of Truth)
// ============================================================

/**
 * Documentation metadata for each env var.
 * Stored via .meta() - extracted by scripts/env-docs.ts for doc generation.
 */
export interface DocMeta {
  description: string;
  docDefault?: string; // For transforms where default can't be inferred
}

/**
 * Schema definitions with embedded documentation via .meta().
 * Exported for scripts/env-docs.ts to extract documentation.
 */
export const serverSchema = {
  // Kalshi
  KALSHI_API_KEY: z
    .string()
    .min(1)
    .optional()
    .meta({
      description:
        "Your Kalshi API key ID. Required for authenticated operations",
    } satisfies DocMeta),

  KALSHI_PRIVATE_KEY_PATH: z
    .string()
    .min(1)
    .optional()
    .meta({
      description:
        "Path to RSA private key PEM file. Use this OR `KALSHI_PRIVATE_KEY_PEM`",
    } satisfies DocMeta),

  KALSHI_PRIVATE_KEY_PEM: z
    .string()
    .min(1)
    .optional()
    .transform((v) => v?.trim()) // Remove trailing whitespace/newlines
    .meta({
      description:
        "RSA private key as PEM string. Use this OR `KALSHI_PRIVATE_KEY_PATH`",
    } satisfies DocMeta),

  KALSHI_USE_DEMO: booleanString.default(false).meta({
    description:
      "Use Kalshi demo environment. Set to `true` to connect to demo.kalshi.co",
    docDefault: "false",
  } satisfies DocMeta),

  KALSHI_BASE_PATH: z
    .string()
    .url()
    .optional()
    .meta({
      description:
        "API endpoint override (advanced). Overrides `KALSHI_USE_DEMO` if set",
    } satisfies DocMeta),

  // Polymarket
  POLYMARKET_GAMMA_HOST: z
    .string()
    .url()
    .default("https://gamma-api.polymarket.com")
    .meta({
      description: "Polymarket Gamma API host for market discovery",
    } satisfies DocMeta),

  POLYMARKET_CLOB_HOST: z
    .string()
    .url()
    .default("https://clob.polymarket.com")
    .meta({
      description: "Polymarket CLOB API host for orderbook/trading data",
    } satisfies DocMeta),

  POLYMARKET_CHAIN_ID: z.coerce
    .number()
    .int()
    .positive()
    .default(137)
    .meta({
      description: "Polygon chain ID for Polymarket CLOB client",
    } satisfies DocMeta),

  // Logging
  LOG_LEVEL: logLevelSchema.default("info").meta({
    description: `Logging verbosity: ${LOG_LEVELS.join(", ")}`,
  } satisfies DocMeta),

  // Cache
  CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(0)
    .default(DEFAULT_CACHE_TTL_SECONDS)
    .meta({
      description:
        "Search cache time-to-live in seconds. After this duration, searches trigger a background refresh. Applies to both Kalshi and Polymarket caches. Set to 0 to disable TTL.",
    } satisfies DocMeta),
} as const;

// ============================================================
// Environment Export
// ============================================================

/**
 * Validated environment variables.
 * Fails fast at import time if validation fails.
 */
export const env = createEnv({
  server: serverSchema,
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

// ============================================================
// Nested Config Objects
// ============================================================

/** Kalshi client configuration. */
export const kalshiConfig = {
  apiKey: env.KALSHI_API_KEY,
  privateKeyPath: env.KALSHI_PRIVATE_KEY_PATH,
  privateKeyPem: env.KALSHI_PRIVATE_KEY_PEM,
  useDemo: env.KALSHI_USE_DEMO,
  basePath: env.KALSHI_BASE_PATH,
};

/** Polymarket client configuration. */
export const polymarketConfig = {
  gammaHost: env.POLYMARKET_GAMMA_HOST,
  clobHost: env.POLYMARKET_CLOB_HOST,
  chainId: env.POLYMARKET_CHAIN_ID,
};

/** Shared cache configuration. */
export const cacheConfig = {
  ttlSeconds: env.CACHE_TTL_SECONDS,
};
