import { describe, test, expect } from "bun:test";
import { z } from "zod";
import { env, ENV_VAR_DOCS, type EnvVarDoc } from "./env.js";

/**
 * Environment validation tests.
 *
 * Tests the Zod schemas, validators, and documentation extraction.
 * Note: The actual env object is validated at import time by t3-env.
 */

// ============================================================
// Boolean Validator Tests
// ============================================================

describe("booleanString validator", () => {
  // Recreate the validator for isolated testing
  const booleanString = z
    .enum(["true", "false", "1", "0", ""])
    .transform((v) => v === "true" || v === "1");

  test("accepts 'true' and transforms to true", () => {
    expect(booleanString.parse("true")).toBe(true);
  });

  test("accepts 'false' and transforms to false", () => {
    expect(booleanString.parse("false")).toBe(false);
  });

  test("accepts '1' and transforms to true", () => {
    expect(booleanString.parse("1")).toBe(true);
  });

  test("accepts '0' and transforms to false", () => {
    expect(booleanString.parse("0")).toBe(false);
  });

  test("accepts empty string and transforms to false", () => {
    expect(booleanString.parse("")).toBe(false);
  });

  test("rejects invalid boolean-like strings (typos)", () => {
    expect(() => booleanString.parse("tru")).toThrow();
    expect(() => booleanString.parse("TRUE")).toThrow();
    expect(() => booleanString.parse("yes")).toThrow();
    expect(() => booleanString.parse("no")).toThrow();
    expect(() => booleanString.parse("on")).toThrow();
    expect(() => booleanString.parse("off")).toThrow();
  });

  test("rejects arbitrary strings", () => {
    expect(() => booleanString.parse("anything")).toThrow();
    expect(() => booleanString.parse("False")).toThrow();
  });
});

// ============================================================
// URL Validator Tests
// ============================================================

describe("URL validation", () => {
  const urlSchema = z.string().url();

  test("accepts valid HTTPS URLs", () => {
    expect(urlSchema.parse("https://api.example.com")).toBe(
      "https://api.example.com",
    );
    expect(urlSchema.parse("https://example.com/path/to/api")).toBe(
      "https://example.com/path/to/api",
    );
  });

  test("accepts valid HTTP URLs", () => {
    expect(urlSchema.parse("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  test("rejects invalid URLs", () => {
    expect(() => urlSchema.parse("not-a-url")).toThrow();
    expect(() => urlSchema.parse("just-a-domain.com")).toThrow();
    expect(() => urlSchema.parse("ftp://wrong-protocol.com")).not.toThrow(); // ftp is valid URL
  });
});

// ============================================================
// Number Coercion Tests
// ============================================================

describe("number coercion", () => {
  const chainIdSchema = z.coerce.number().int().positive();

  test("coerces string to number", () => {
    expect(chainIdSchema.parse("137")).toBe(137);
    expect(chainIdSchema.parse("80001")).toBe(80001);
  });

  test("accepts numbers directly", () => {
    expect(chainIdSchema.parse(137)).toBe(137);
  });

  test("rejects non-integer values", () => {
    expect(() => chainIdSchema.parse("3.14")).toThrow();
    expect(() => chainIdSchema.parse(3.14)).toThrow();
  });

  test("rejects non-positive values", () => {
    expect(() => chainIdSchema.parse("0")).toThrow();
    expect(() => chainIdSchema.parse("-1")).toThrow();
  });

  test("rejects non-numeric strings", () => {
    expect(() => chainIdSchema.parse("abc")).toThrow();
    expect(() => chainIdSchema.parse("")).toThrow();
  });
});

// ============================================================
// Log Level Validator Tests
// ============================================================

describe("log level validation", () => {
  const logLevelSchema = z.enum([
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  ]);

  test("accepts all valid log levels", () => {
    const levels = [
      "trace",
      "debug",
      "info",
      "warn",
      "error",
      "fatal",
    ] as const;
    for (const level of levels) {
      expect(logLevelSchema.parse(level)).toBe(level);
    }
  });

  test("rejects invalid log levels", () => {
    expect(() => logLevelSchema.parse("verbose")).toThrow();
    expect(() => logLevelSchema.parse("WARNING")).toThrow();
    expect(() => logLevelSchema.parse("")).toThrow();
  });
});

// ============================================================
// ENV_VAR_DOCS Extraction Tests
// ============================================================

describe("ENV_VAR_DOCS metadata extraction", () => {
  test("contains all expected env vars", () => {
    const expectedNames = [
      "KALSHI_API_KEY",
      "KALSHI_PRIVATE_KEY_PATH",
      "KALSHI_PRIVATE_KEY_PEM",
      "KALSHI_USE_DEMO",
      "KALSHI_BASE_PATH",
      "POLYMARKET_GAMMA_HOST",
      "POLYMARKET_CLOB_HOST",
      "POLYMARKET_CHAIN_ID",
      "LOG_LEVEL",
    ];

    const actualNames = ENV_VAR_DOCS.map((doc) => doc.name);
    expect(actualNames).toEqual(expectedNames);
  });

  test("all docs have descriptions from .describe()", () => {
    for (const doc of ENV_VAR_DOCS) {
      expect(doc.description).toBeTruthy();
      expect(doc.description.length).toBeGreaterThan(10);
    }
  });

  test("correctly identifies required vs optional", () => {
    const findDoc = (name: string): EnvVarDoc | undefined =>
      ENV_VAR_DOCS.find((d) => d.name === name);

    // All Kalshi auth vars are optional (public data works without auth)
    expect(findDoc("KALSHI_API_KEY")?.required).toBe(false);
    expect(findDoc("KALSHI_PRIVATE_KEY_PATH")?.required).toBe(false);

    // Vars with defaults are not required
    expect(findDoc("KALSHI_USE_DEMO")?.required).toBe(false);
    expect(findDoc("POLYMARKET_GAMMA_HOST")?.required).toBe(false);
    expect(findDoc("LOG_LEVEL")?.required).toBe(false);
  });

  test("correctly extracts default values", () => {
    const findDoc = (name: string): EnvVarDoc | undefined =>
      ENV_VAR_DOCS.find((d) => d.name === name);

    expect(findDoc("KALSHI_USE_DEMO")?.default).toBe("false");
    expect(findDoc("POLYMARKET_GAMMA_HOST")?.default).toBe(
      "https://gamma-api.polymarket.com",
    );
    expect(findDoc("POLYMARKET_CLOB_HOST")?.default).toBe(
      "https://clob.polymarket.com",
    );
    expect(findDoc("POLYMARKET_CHAIN_ID")?.default).toBe("137");
    expect(findDoc("LOG_LEVEL")?.default).toBe("info");
  });

  test("optional vars without defaults have no default field", () => {
    const findDoc = (name: string): EnvVarDoc | undefined =>
      ENV_VAR_DOCS.find((d) => d.name === name);

    expect(findDoc("KALSHI_API_KEY")?.default).toBeUndefined();
    expect(findDoc("KALSHI_BASE_PATH")?.default).toBeUndefined();
  });
});

// ============================================================
// Runtime env Object Tests
// ============================================================

describe("env object (runtime validated)", () => {
  test("has expected shape", () => {
    expect(env).toBeDefined();
    expect(typeof env.KALSHI_USE_DEMO).toBe("boolean");
    expect(typeof env.POLYMARKET_CHAIN_ID).toBe("number");
    expect(typeof env.LOG_LEVEL).toBe("string");
  });

  test("applies defaults for Polymarket config", () => {
    expect(env.POLYMARKET_GAMMA_HOST).toMatch(/polymarket\.com/);
    expect(env.POLYMARKET_CLOB_HOST).toMatch(/polymarket\.com/);
    expect(env.POLYMARKET_CHAIN_ID).toBeGreaterThan(0);
  });

  test("applies default log level", () => {
    expect(["trace", "debug", "info", "warn", "error", "fatal"]).toContain(
      env.LOG_LEVEL,
    );
  });

  test("optional fields can be undefined", () => {
    // These are allowed to be undefined if not set
    // Just verify they're the correct type when present
    if (env.KALSHI_API_KEY !== undefined) {
      expect(typeof env.KALSHI_API_KEY).toBe("string");
    }
    if (env.KALSHI_BASE_PATH !== undefined) {
      expect(typeof env.KALSHI_BASE_PATH).toBe("string");
    }
  });
});
