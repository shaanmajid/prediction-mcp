import { describe, test, expect } from "bun:test";
import {
  resolveKalshiBasePath,
  KALSHI_PRODUCTION_URL,
  KALSHI_DEMO_URL,
} from "./kalshi.js";

/**
 * Unit tests for Kalshi client configuration
 *
 * Tests the URL resolution logic for demo/production environments.
 * Integration tests for actual API calls are in src/tools.test.ts.
 *
 * Note: Since config revamp, resolveKalshiBasePath only reads from config object,
 * not process.env, so no env manipulation needed in tests.
 */

describe("resolveKalshiBasePath", () => {
  test("uses production URL by default", () => {
    const result = resolveKalshiBasePath({});

    expect(result.basePath).toBe(KALSHI_PRODUCTION_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("uses demo URL when useDemo config is true", () => {
    const result = resolveKalshiBasePath({ useDemo: true });

    expect(result.basePath).toBe(KALSHI_DEMO_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("uses production URL when useDemo config is false", () => {
    const result = resolveKalshiBasePath({ useDemo: false });

    expect(result.basePath).toBe(KALSHI_PRODUCTION_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("explicit basePath config takes precedence over useDemo", () => {
    const customUrl = "https://custom.kalshi.com/api";

    const result = resolveKalshiBasePath({
      useDemo: true,
      basePath: customUrl,
    });

    expect(result.basePath).toBe(customUrl);
    expect(result.shouldWarn).toBe(true);
    expect(result.explicitBasePath).toBe(customUrl);
  });

  test("shouldWarn is true only when both demo flag AND explicit path are set", () => {
    // Demo flag only - no warning
    expect(resolveKalshiBasePath({ useDemo: true }).shouldWarn).toBe(false);

    // Explicit path only - no warning
    expect(
      resolveKalshiBasePath({ basePath: "https://custom.com" }).shouldWarn,
    ).toBe(false);

    // Both set - warning
    expect(
      resolveKalshiBasePath({ useDemo: true, basePath: "https://custom.com" })
        .shouldWarn,
    ).toBe(true);
  });
});
