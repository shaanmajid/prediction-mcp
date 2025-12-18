/**
 * Environment configuration with fail-fast validation.
 *
 * Pydantic-settings pattern: schema IS documentation.
 * - Use .meta() to attach doc metadata (description, default) to schemas
 * - ENV_VAR_DOCS is derived from schema.meta() - single source of truth
 */
import { createEnv } from "@t3-oss/env-core";
import { z, type ZodTypeAny } from "zod";
import pino from "pino";

// ============================================================
// Custom Validators
// ============================================================

/**
 * Strict boolean env var validator.
 * Only accepts explicit boolean strings - rejects typos like "tru" or "yes".
 */
const booleanString = z
  .enum(["true", "false", "1", "0", ""])
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
 * Stored via .meta() - the ONLY place env vars are documented.
 */
interface DocMeta {
  description: string;
  docDefault?: string; // For transforms where default can't be inferred
}

/**
 * Schema definitions with embedded documentation via .meta().
 */
const serverSchema = {
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
        "Path to RSA private key PEM file. Use this OR KALSHI_PRIVATE_KEY_PEM",
    } satisfies DocMeta),

  KALSHI_PRIVATE_KEY_PEM: z
    .string()
    .min(1)
    .optional()
    .meta({
      description:
        "RSA private key as PEM string. Use this OR KALSHI_PRIVATE_KEY_PATH",
    } satisfies DocMeta),

  KALSHI_USE_DEMO: booleanString.default(false).meta({
    description:
      "Use Kalshi demo environment (demo.kalshi.co). Accepts: true, false, 1, 0",
    docDefault: "false",
  } satisfies DocMeta),

  KALSHI_BASE_PATH: z
    .string()
    .url()
    .optional()
    .meta({
      description:
        "API endpoint override (advanced). Overrides KALSHI_USE_DEMO if set",
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
// Documentation Metadata (Derived from Schema)
// ============================================================

export interface EnvVarDoc {
  name: string;
  description: string;
  required: boolean;
  default?: string;
}

/**
 * Extract documentation metadata from a Zod schema.
 *
 * Reads from:
 * - schema.meta() for description and docDefault
 * - schema.isOptional() for required detection
 * - z.toJSONSchema() for actual default values (when not a transform)
 */
function extractSchemaDoc(name: string, schema: ZodTypeAny): EnvVarDoc {
  // Get metadata from .meta()
  const meta = (schema.meta?.() ?? {}) as DocMeta;

  // Description is required in DocMeta, but fallback just in case
  const description = meta.description || `Environment variable ${name}`;

  // Try to get default from JSON Schema (works for non-transform schemas)
  let defaultStr: string | undefined = meta.docDefault;
  if (!defaultStr) {
    try {
      const jsonSchema = z.toJSONSchema(schema, {
        io: "input",
        unrepresentable: "any",
      }) as { default?: unknown };
      if ("default" in jsonSchema && jsonSchema.default !== undefined) {
        defaultStr = String(jsonSchema.default);
      }
    } catch {
      // Transform schemas can't be converted - use docDefault from meta
    }
  }

  // A field is required if it's not optional and has no default
  const isOptional = schema.isOptional() || defaultStr !== undefined;

  return {
    name,
    description,
    required: !isOptional,
    default: defaultStr,
  };
}

/**
 * Environment variable documentation derived from schema.
 * Used by generate-docs.ts - NOT a separate source of truth.
 */
export const ENV_VAR_DOCS: EnvVarDoc[] = Object.entries(serverSchema).map(
  ([name, schema]) => extractSchemaDoc(name, schema),
);

// ============================================================
// Type Exports
// ============================================================

export type Env = typeof env;
export type LogLevel = z.infer<typeof logLevelSchema>;
