import { describe, expect, test } from "bun:test";
import {
  ALL_TOKENS_BONUS,
  countSubstringOccurrences,
  EXACT_WORD_MATCH_SCORE,
  escapeRegex,
  SUBSTRING_MATCH_SCORE,
  scoreItem,
  tokenize,
  WORD_PREFIX_MATCH_SCORE,
} from "./scoring.js";

describe("scoring utilities", () => {
  describe("tokenize", () => {
    test("splits on whitespace", () => {
      const tokens = tokenize("hello world");
      expect(tokens).toEqual(["hello", "world"]);
    });

    test("converts to lowercase", () => {
      const tokens = tokenize("Hello WORLD");
      expect(tokens).toEqual(["hello", "world"]);
    });

    test("filters empty tokens", () => {
      const tokens = tokenize("hello   world");
      expect(tokens).toEqual(["hello", "world"]);
    });

    test("handles empty string", () => {
      const tokens = tokenize("");
      expect(tokens).toEqual([]);
    });

    test("handles whitespace-only string", () => {
      const tokens = tokenize("   ");
      expect(tokens).toEqual([]);
    });

    test("handles single word", () => {
      const tokens = tokenize("hello");
      expect(tokens).toEqual(["hello"]);
    });

    test("handles tabs and multiple spaces", () => {
      const tokens = tokenize("hello\tworld  test");
      expect(tokens).toEqual(["hello", "world", "test"]);
    });
  });

  describe("escapeRegex", () => {
    test("escapes special regex characters", () => {
      const escaped = escapeRegex("C++");
      expect(escaped).toBe("C\\+\\+");
    });

    test("escapes dollar sign", () => {
      const escaped = escapeRegex("$100");
      expect(escaped).toBe("\\$100");
    });

    test("escapes parentheses", () => {
      const escaped = escapeRegex("(test)");
      expect(escaped).toBe("\\(test\\)");
    });

    test("escapes brackets", () => {
      const escaped = escapeRegex("[test]");
      expect(escaped).toBe("\\[test\\]");
    });

    test("escapes asterisk", () => {
      const escaped = escapeRegex("test*");
      expect(escaped).toBe("test\\*");
    });

    test("escapes backslash", () => {
      const escaped = escapeRegex("test\\path");
      expect(escaped).toBe("test\\\\path");
    });

    test("escapes pipe", () => {
      const escaped = escapeRegex("a|b");
      expect(escaped).toBe("a\\|b");
    });

    test("escapes caret", () => {
      const escaped = escapeRegex("^start");
      expect(escaped).toBe("\\^start");
    });

    test("leaves normal text unchanged", () => {
      const escaped = escapeRegex("hello world");
      expect(escaped).toBe("hello world");
    });
  });

  describe("countSubstringOccurrences", () => {
    test("counts single occurrence", () => {
      expect(countSubstringOccurrences("hello world", "world")).toBe(1);
    });

    test("counts multiple occurrences", () => {
      expect(countSubstringOccurrences("test test test", "test")).toBe(3);
    });

    test("returns zero for no match", () => {
      expect(countSubstringOccurrences("hello world", "xyz")).toBe(0);
    });

    test("is case sensitive", () => {
      // countSubstringOccurrences is case-sensitive by design
      // (caller handles lowercasing in scoreItem)
      expect(countSubstringOccurrences("Hello WORLD", "world")).toBe(0);
      expect(countSubstringOccurrences("hello world", "world")).toBe(1);
    });

    test("counts non-overlapping occurrences only", () => {
      // "aaa" with substring "aa" - non-overlapping means only 1 match
      // (position advances by substring length after each match)
      expect(countSubstringOccurrences("aaa", "aa")).toBe(1);
      expect(countSubstringOccurrences("aaaa", "aa")).toBe(2);
    });

    test("handles special regex characters", () => {
      expect(countSubstringOccurrences("C++ and C++", "C++")).toBe(2);
    });
  });

  describe("scoreItem", () => {
    test("returns 0 for empty text", () => {
      expect(scoreItem(["test"], "")).toBe(0);
    });

    test("returns 0 for empty tokens", () => {
      expect(scoreItem([], "hello world")).toBe(0);
    });

    test("scores exact word boundary match highest", () => {
      const score = scoreItem(["election"], "Presidential Election 2028");
      expect(score).toBeGreaterThanOrEqual(EXACT_WORD_MATCH_SCORE);
    });

    test("scores word prefix match medium", () => {
      // "elect" should match start of "election"
      const score = scoreItem(["elect"], "Presidential Election 2028");
      expect(score).toBeGreaterThanOrEqual(WORD_PREFIX_MATCH_SCORE);
    });

    test("scores substring match lowest", () => {
      // "lect" is a substring within "election" but not at word start
      const score = scoreItem(["lect"], "Presidential Election 2028");
      expect(score).toBeGreaterThanOrEqual(SUBSTRING_MATCH_SCORE);
    });

    test("applies all-tokens bonus when all tokens match", () => {
      const scoreAllMatch = scoreItem(
        ["presidential", "election"],
        "Presidential Election 2028",
      );
      const scoreSingleMatch = scoreItem(
        ["presidential"],
        "Presidential Election 2028",
      );
      // All tokens matching should give 1.5x multiplier
      expect(scoreAllMatch).toBeGreaterThan(scoreSingleMatch * 1.4);
    });

    test("no bonus when only some tokens match", () => {
      const score = scoreItem(
        ["presidential", "nonexistent"],
        "Presidential Election 2028",
      );
      // Should still get points for "presidential" but no 1.5x bonus
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(EXACT_WORD_MATCH_SCORE * ALL_TOKENS_BONUS);
    });

    test("handles special characters in search terms", () => {
      const score = scoreItem(["c++"], "C++ Developer Market");
      expect(score).toBeGreaterThan(0);
    });

    test("handles dollar signs", () => {
      const score = scoreItem(["$100"], "Bitcoin Price $100,000 Prediction");
      expect(score).toBeGreaterThan(0);
    });
  });

  describe("scoring constants", () => {
    test("EXACT_WORD_MATCH_SCORE is highest", () => {
      expect(EXACT_WORD_MATCH_SCORE).toBeGreaterThan(WORD_PREFIX_MATCH_SCORE);
    });

    test("WORD_PREFIX_MATCH_SCORE is medium", () => {
      expect(WORD_PREFIX_MATCH_SCORE).toBeGreaterThan(SUBSTRING_MATCH_SCORE);
    });

    test("ALL_TOKENS_BONUS is 1.5", () => {
      expect(ALL_TOKENS_BONUS).toBe(1.5);
    });
  });
});
