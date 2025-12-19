import { describe, expect, test } from "bun:test";
import { classifyError } from "./index.js";

/**
 * Unit tests for error classification logic
 *
 * These tests verify that different error types are correctly
 * mapped to standardized error codes for MCP responses.
 */

describe("classifyError()", () => {
  describe("ZodError handling", () => {
    test("classifies ZodError as ValidationError", () => {
      const zodError = new Error("Invalid input");
      zodError.name = "ZodError";

      const result = classifyError(zodError);

      expect(result.code).toBe("ValidationError");
      expect(result.message).toBe("Invalid input");
    });
  });

  describe("API error handling", () => {
    test("classifies error with 'API' in message as APIError", () => {
      const result = classifyError(new Error("API request failed"));
      expect(result.code).toBe("APIError");
    });

    test("classifies error with 'network' in message as APIError", () => {
      const result = classifyError(new Error("network error occurred"));
      expect(result.code).toBe("APIError");
    });

    test("classifies error with 'fetch' in message as APIError", () => {
      const result = classifyError(new Error("fetch failed"));
      expect(result.code).toBe("APIError");
    });
  });

  describe("NotFoundError handling", () => {
    test("classifies 'not found' as NotFoundError", () => {
      const result = classifyError(new Error("Market not found: xyz"));
      expect(result.code).toBe("NotFoundError");
    });

    test("classifies 'Unknown tool' as NotFoundError", () => {
      const result = classifyError(new Error("Unknown tool: invalid_tool"));
      expect(result.code).toBe("NotFoundError");
    });
  });

  describe("AuthenticationError handling", () => {
    test("classifies 'unauthorized' as AuthenticationError", () => {
      const result = classifyError(new Error("unauthorized access"));
      expect(result.code).toBe("AuthenticationError");
    });

    test("classifies 'forbidden' as AuthenticationError", () => {
      const result = classifyError(new Error("forbidden resource"));
      expect(result.code).toBe("AuthenticationError");
    });
  });

  describe("RateLimitError handling", () => {
    test("classifies 'rate limit' as RateLimitError", () => {
      const result = classifyError(new Error("rate limit exceeded"));
      expect(result.code).toBe("RateLimitError");
    });
  });

  describe("UnknownError handling", () => {
    test("classifies generic error as UnknownError", () => {
      const result = classifyError(new Error("Something went wrong"));
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("Something went wrong");
    });

    test("classifies empty error message as UnknownError", () => {
      const result = classifyError(new Error(""));
      expect(result.code).toBe("UnknownError");
    });

    test("classifies Error subclasses by message content", () => {
      // TypeError, RangeError, etc. are Error subclasses
      // They should be classified based on message, not constructor name
      const typeError = new TypeError(
        "Cannot read property 'foo' of undefined",
      );
      const rangeError = new RangeError("Maximum call stack size exceeded");

      expect(classifyError(typeError).code).toBe("UnknownError");
      expect(classifyError(rangeError).code).toBe("UnknownError");

      // But if the message contains classification keywords, they should match
      const networkTypeError = new TypeError("network request failed");
      expect(classifyError(networkTypeError).code).toBe("APIError");
    });
  });

  describe("non-Error object handling", () => {
    test("handles string thrown as error", () => {
      const result = classifyError("string error");
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("string error");
    });

    test("handles number thrown as error", () => {
      const result = classifyError(404);
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("404");
    });

    test("handles null thrown as error", () => {
      const result = classifyError(null);
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("null");
    });

    test("handles undefined thrown as error", () => {
      const result = classifyError(undefined);
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("undefined");
    });

    test("handles object thrown as error", () => {
      const result = classifyError({ custom: "error" });
      expect(result.code).toBe("UnknownError");
      expect(result.message).toBe("[object Object]");
    });
  });

  describe("error message preservation", () => {
    test("preserves original error message", () => {
      const originalMessage = "Detailed error: something specific happened";
      const result = classifyError(new Error(originalMessage));
      expect(result.message).toBe(originalMessage);
    });

    test("preserves message even when classified", () => {
      const result = classifyError(new Error("API error: connection refused"));
      expect(result.code).toBe("APIError");
      expect(result.message).toBe("API error: connection refused");
    });
  });
});
