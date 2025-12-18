import { describe, test, expect } from "bun:test";
import {
  resolveKalshiBasePath,
  KALSHI_PRODUCTION_URL,
  KALSHI_DEMO_URL,
} from "./kalshi.js";

/**
 * Unit tests for Kalshi client configuration.
 * Tests URL resolution logic for demo/production environments.
 */

describe("resolveKalshiBasePath", () => {
  test("uses production URL when useDemo is false", () => {
    const result = resolveKalshiBasePath({ useDemo: false });

    expect(result.basePath).toBe(KALSHI_PRODUCTION_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("uses demo URL when useDemo is true", () => {
    const result = resolveKalshiBasePath({ useDemo: true });

    expect(result.basePath).toBe(KALSHI_DEMO_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("explicit basePath takes precedence over useDemo", () => {
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
    expect(resolveKalshiBasePath({ useDemo: true }).shouldWarn).toBe(false);
    expect(
      resolveKalshiBasePath({ useDemo: false, basePath: "https://custom.com" })
        .shouldWarn,
    ).toBe(false);
    expect(
      resolveKalshiBasePath({ useDemo: true, basePath: "https://custom.com" })
        .shouldWarn,
    ).toBe(true);
  });
});
