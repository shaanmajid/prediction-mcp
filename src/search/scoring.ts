/**
 * Shared scoring utilities for search caches.
 * Used by both Kalshi and Polymarket search implementations.
 */

/**
 * Result from a search operation containing the matched item and its relevance score.
 */
export interface SearchResult<T> {
  score: number;
  item: T;
}

/**
 * Internal statistics from the cache layer.
 * The cache knows about its own state but not about TTL policy.
 */
export interface CacheInternalStats {
  status: "empty" | "ready";
  events_count: number;
  markets_count: number;
  last_refresh: string | null;
  refresh_duration_ms: number;
  cache_age_seconds: number | null;
}

/**
 * Full statistics exposed by the service layer.
 * Extends internal stats with TTL-aware expiry information.
 */
export interface CacheStats extends CacheInternalStats {
  expires_in_seconds: number | null;
}

// Scoring algorithm constants - adjust to tune ranking behavior
export const EXACT_WORD_MATCH_SCORE = 50; // Highest: exact word boundary (\btoken\b)
export const WORD_PREFIX_MATCH_SCORE = 30; // Medium: word starts with token (\btoken)
export const SUBSTRING_MATCH_SCORE = 10; // Lowest: substring contains token
export const ALL_TOKENS_BONUS = 1.5; // Multiplier when ALL query tokens match

/**
 * Tokenizes a search query into lowercase words.
 */
export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Escapes special regex characters in a string.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Counts non-overlapping occurrences of a substring.
 */
export function countSubstringOccurrences(
  text: string,
  substring: string,
): number {
  if (substring.length === 0) return 0;
  let count = 0;
  let position = 0;
  while ((position = text.indexOf(substring, position)) !== -1) {
    count++;
    position += substring.length;
  }
  return count;
}

/**
 * Scores how well a set of tokens matches a searchable text field.
 *
 * Three-level scoring algorithm per token (no double counting):
 * 1. Exact word boundary match: EXACT_WORD_MATCH_SCORE (50) points
 * 2. Word starts with token: WORD_PREFIX_MATCH_SCORE (30) points
 * 3. Substring contains token: SUBSTRING_MATCH_SCORE (10) points
 *
 * Tie-breaking: If ALL tokens match at least once, total score × ALL_TOKENS_BONUS (1.5).
 * This ensures multi-word queries prefer items matching all terms.
 *
 * Special character handling: Uses escapeRegex() to handle $, +, *, etc.
 * Example scores for query "presidential election":
 * - "Presidential Election 2028" (both words exact): (50+50) * 1.5 = 150
 * - "Presidential Candidate" (only one word): 50 (no bonus)
 * - "election official results" (one word, no exact): 10 (substring only)
 */
export function scoreItem(tokens: string[], searchableText: string): number {
  const lowerText = searchableText.toLowerCase();
  let totalScore = 0;
  let matchedTokens = 0;

  for (const token of tokens) {
    let tokenScore = 0;
    let tokenMatched = false;

    // Word boundary match (whole word)
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(token)}\\b`, "g");
    const wordMatches = lowerText.match(wordBoundaryRegex);
    if (wordMatches) {
      tokenScore += wordMatches.length * EXACT_WORD_MATCH_SCORE;
      tokenMatched = true;
    }

    // Word starts with token
    const wordStartRegex = new RegExp(`\\b${escapeRegex(token)}`, "g");
    const startMatches = lowerText.match(wordStartRegex);
    if (startMatches) {
      // Subtract word boundary matches to avoid double counting
      const startsOnlyCount = startMatches.length - (wordMatches?.length || 0);
      if (startsOnlyCount > 0) {
        tokenScore += startsOnlyCount * WORD_PREFIX_MATCH_SCORE;
        tokenMatched = true;
      }
    }

    // Substring match
    const substringMatches = countSubstringOccurrences(lowerText, token);
    // Subtract already counted matches
    const substringOnlyCount = substringMatches - (startMatches?.length || 0);
    if (substringOnlyCount > 0) {
      tokenScore += substringOnlyCount * SUBSTRING_MATCH_SCORE;
      tokenMatched = true;
    }

    if (tokenMatched) {
      matchedTokens++;
    }

    totalScore += tokenScore;
  }

  // Bonus if all tokens matched
  if (matchedTokens === tokens.length) {
    totalScore *= ALL_TOKENS_BONUS;
  }

  return totalScore;
}
