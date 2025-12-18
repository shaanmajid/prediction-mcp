import { describe, test, expect } from "bun:test";
import {
  resolveKalshiBasePath,
  KALSHI_PRODUCTION_URL,
  KALSHI_DEMO_URL,
  type KalshiClientConfig,
} from "./kalshi.js";
import { createTestConfig } from "../config.js";

/**
 * Unit tests for Kalshi client configuration
 *
 * Tests the URL resolution logic for demo/production environments.
 * Integration tests for actual API calls are in src/tools.test.ts.
 */

/** Create a KalshiClientConfig with test defaults */
function testConfig(
  overrides: Partial<KalshiClientConfig> = {},
): KalshiClientConfig {
  return { ...createTestConfig().kalshi, ...overrides };
}

describe("resolveKalshiBasePath", () => {
  test("uses production URL by default", () => {
    const result = resolveKalshiBasePath(testConfig());

    expect(result.basePath).toBe(KALSHI_PRODUCTION_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("uses demo URL when useDemo is true", () => {
    const result = resolveKalshiBasePath(testConfig({ useDemo: true }));

    expect(result.basePath).toBe(KALSHI_DEMO_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("uses production URL when useDemo is false", () => {
    const result = resolveKalshiBasePath(testConfig({ useDemo: false }));

    expect(result.basePath).toBe(KALSHI_PRODUCTION_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("explicit basePath takes precedence over useDemo", () => {
    const customUrl = "https://custom.kalshi.com/api";

    const result = resolveKalshiBasePath(
      testConfig({
        useDemo: true,
        basePath: customUrl,
      }),
    );

    expect(result.basePath).toBe(customUrl);
    expect(result.shouldWarn).toBe(true);
    expect(result.explicitBasePath).toBe(customUrl);
  });

  test("shouldWarn is true only when both demo flag AND explicit path are set", () => {
    // Demo flag only - no warning
    expect(
      resolveKalshiBasePath(testConfig({ useDemo: true })).shouldWarn,
    ).toBe(false);

    // Explicit path only - no warning
    expect(
      resolveKalshiBasePath(testConfig({ basePath: "https://custom.com" }))
        .shouldWarn,
    ).toBe(false);

    // Both set - warning
    expect(
      resolveKalshiBasePath(
        testConfig({ useDemo: true, basePath: "https://custom.com" }),
      ).shouldWarn,
    ).toBe(true);
  });
});
