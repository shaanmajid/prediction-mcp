import { describe, test, expect } from "bun:test";
import { z } from "zod";
import { env } from "./env.js";

/**
 * Environment validation tests.
 *
 * Tests the Zod schemas and validators.
 * Note: The actual env object is validated at import time by t3-env.
 * Documentation extraction tests are in scripts/env-docs.test.ts.
 */

// ============================================================
// Boolean Validator Tests
// ============================================================

describe("booleanString validator", () => {
  // Recreate the validator for isolated testing
  // Note: Empty strings are handled by t3-env's emptyStringAsUndefined option
  const booleanString = z
    .enum(["true", "false", "1", "0"])
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

  test("rejects empty string (handled by emptyStringAsUndefined)", () => {
    expect(() => booleanString.parse("")).toThrow();
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
