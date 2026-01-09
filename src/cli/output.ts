/**
 * Output formatting system for CLI
 *
 * Inspired by GitHub CLI's excellent output control:
 * - Multiple formats: json, table, plain
 * - Field selection to reduce output size
 * - JQ-style filtering for JSON
 * - Column formatting for terminal display
 *
 * Key design principle: Avoid "payload bombs" by allowing users
 * to specify exactly what data they need.
 */

import type { ZodType } from "zod";
import { z } from "zod";

// ============================================================
// Types
// ============================================================

export type OutputFormat = "json" | "table" | "plain" | "tsv" | "csv";

export interface OutputOptions {
  /** Output format */
  format: OutputFormat;
  /** Fields to include (dot notation supported: "market.ticker") */
  fields?: string[];
  /** JQ-style filter expression (simple subset) */
  jq?: string;
  /** Suppress all output except data */
  quiet?: boolean;
  /** No headers in table output */
  noHeaders?: boolean;
  /** Max width for table columns (0 = no limit) */
  maxWidth?: number;
  /** Pretty print JSON */
  pretty?: boolean;
}

export const OutputOptionsSchema = z.object({
  format: z.enum(["json", "table", "plain", "tsv", "csv"]).default("table"),
  fields: z.array(z.string()).optional(),
  jq: z.string().optional(),
  quiet: z.boolean().default(false),
  noHeaders: z.boolean().default(false),
  maxWidth: z.number().int().min(0).default(50),
  pretty: z.boolean().default(true),
});

// ============================================================
// Field Extraction
// ============================================================

/**
 * Get nested value using dot notation
 * Example: getNestedValue(obj, "market.ticker") -> obj.market.ticker
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined;

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;

    // Handle array indexing: "items[0]" or "items.0"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key!];
      if (Array.isArray(current)) {
        current = current[Number.parseInt(index!, 10)];
      } else {
        return undefined;
      }
    } else if (/^\d+$/.test(part) && Array.isArray(current)) {
      current = current[Number.parseInt(part, 10)];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Extract specified fields from an object
 */
export function extractFields(
  obj: unknown,
  fields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    // Use last part of path as key, or full path if contains special chars
    const key = field.includes(".") ? field : field;
    result[key] = getNestedValue(obj, field);
  }

  return result;
}

/**
 * Apply field extraction to data (handles arrays and single objects)
 */
export function applyFieldSelection(data: unknown, fields?: string[]): unknown {
  if (!fields || fields.length === 0) return data;

  if (Array.isArray(data)) {
    return data.map((item) => extractFields(item, fields));
  }

  if (typeof data === "object" && data !== null) {
    return extractFields(data, fields);
  }

  return data;
}

// ============================================================
// JQ-style Filtering (simplified subset)
// ============================================================

/**
 * Simple JQ-style filter implementation
 * Supports:
 * - Identity: "."
 * - Field access: ".field", ".field.nested"
 * - Array iteration: ".[]"
 * - Array index: ".[0]"
 * - Pipe: ".field | .nested"
 * - Select: "select(.status == \"open\")"
 * - Map: "map(.field)"
 * - Length: "length"
 * - Keys: "keys"
 * - First/Last: "first", "last"
 */
export function applyJqFilter(data: unknown, filter: string): unknown {
  if (!filter || filter === ".") return data;

  const trimmed = filter.trim();

  // Handle pipe
  if (trimmed.includes(" | ")) {
    const parts = trimmed.split(" | ");
    let result = data;
    for (const part of parts) {
      result = applyJqFilter(result, part.trim());
    }
    return result;
  }

  // Handle array iteration: .[]
  if (trimmed === ".[]") {
    if (Array.isArray(data)) return data;
    if (typeof data === "object" && data !== null) {
      return Object.values(data);
    }
    return data;
  }

  // Handle array index: .[0], .[-1]
  const indexMatch = trimmed.match(/^\.\[(-?\d+)\]$/);
  if (indexMatch) {
    if (Array.isArray(data)) {
      let idx = Number.parseInt(indexMatch[1]!, 10);
      if (idx < 0) idx = data.length + idx;
      return data[idx];
    }
    return undefined;
  }

  // Handle field access: .field, .field.nested
  if (trimmed.startsWith(".") && !trimmed.startsWith(".[")) {
    const path = trimmed.slice(1);
    if (Array.isArray(data)) {
      return data.map((item) => getNestedValue(item, path));
    }
    return getNestedValue(data, path);
  }

  // Handle "length"
  if (trimmed === "length") {
    if (Array.isArray(data)) return data.length;
    if (typeof data === "string") return data.length;
    if (typeof data === "object" && data !== null) {
      return Object.keys(data).length;
    }
    return 0;
  }

  // Handle "keys"
  if (trimmed === "keys") {
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return Object.keys(data);
    }
    if (Array.isArray(data)) {
      return data.map((_, i) => i);
    }
    return [];
  }

  // Handle "first" / "last"
  if (trimmed === "first") {
    if (Array.isArray(data)) return data[0];
    return data;
  }
  if (trimmed === "last") {
    if (Array.isArray(data)) return data[data.length - 1];
    return data;
  }

  // Handle "map(.field)"
  const mapMatch = trimmed.match(/^map\((.+)\)$/);
  if (mapMatch) {
    if (Array.isArray(data)) {
      return data.map((item) => applyJqFilter(item, mapMatch[1]!));
    }
    return data;
  }

  // Handle "select(.field == value)"
  const selectMatch = trimmed.match(
    /^select\(\.(\w+(?:\.\w+)*)\s*(==|!=|>|<|>=|<=)\s*(.+)\)$/,
  );
  if (selectMatch) {
    const [, field, op, rawValue] = selectMatch;
    // Parse the value (handle strings, numbers, booleans)
    let value: unknown;
    if (rawValue!.startsWith('"') && rawValue!.endsWith('"')) {
      value = rawValue!.slice(1, -1);
    } else if (rawValue === "true") {
      value = true;
    } else if (rawValue === "false") {
      value = false;
    } else if (rawValue === "null") {
      value = null;
    } else if (!Number.isNaN(Number(rawValue))) {
      value = Number(rawValue);
    } else {
      value = rawValue;
    }

    const compare = (item: unknown): boolean => {
      const fieldValue = getNestedValue(item, field!);
      switch (op) {
        case "==":
          return fieldValue === value;
        case "!=":
          return fieldValue !== value;
        case ">":
          return (fieldValue as number) > (value as number);
        case "<":
          return (fieldValue as number) < (value as number);
        case ">=":
          return (fieldValue as number) >= (value as number);
        case "<=":
          return (fieldValue as number) <= (value as number);
        default:
          return false;
      }
    };

    if (Array.isArray(data)) {
      return data.filter(compare);
    }
    return compare(data) ? data : null;
  }

  // Fallback: return data unchanged
  return data;
}

// ============================================================
// Table Formatting
// ============================================================

/**
 * Truncate string to max width with ellipsis
 */
function truncate(str: string, maxWidth: number): string {
  if (maxWidth <= 0 || str.length <= maxWidth) return str;
  if (maxWidth <= 3) return str.slice(0, maxWidth);
  return `${str.slice(0, maxWidth - 3)}...`;
}

/**
 * Format value for table display
 */
function formatValue(value: unknown, maxWidth: number): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    // Format large numbers with commas
    if (Number.isInteger(value) && Math.abs(value) >= 1000) {
      return value.toLocaleString();
    }
    // Format decimals
    if (!Number.isInteger(value)) {
      return value.toFixed(4).replace(/\.?0+$/, "");
    }
    return String(value);
  }
  if (typeof value === "string") {
    // Handle ISO dates
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    return truncate(value, maxWidth);
  }
  if (Array.isArray(value)) {
    return truncate(`[${value.length} items]`, maxWidth);
  }
  if (typeof value === "object") {
    return truncate(JSON.stringify(value), maxWidth);
  }
  return truncate(String(value), maxWidth);
}

/**
 * Auto-detect columns from data
 */
function inferColumns(data: unknown[]): string[] {
  if (data.length === 0) return [];

  const firstItem = data[0];
  if (typeof firstItem !== "object" || firstItem === null) {
    return ["value"];
  }

  return Object.keys(firstItem);
}

/**
 * Calculate column widths based on content
 */
function calculateColumnWidths(
  columns: string[],
  rows: string[][],
  maxWidth: number,
): number[] {
  const widths = columns.map((col) => col.length);

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cellWidth = row[i]?.length ?? 0;
      widths[i] = Math.max(widths[i] ?? 0, cellWidth);
    }
  }

  // Apply max width
  if (maxWidth > 0) {
    return widths.map((w) => Math.min(w, maxWidth));
  }

  return widths;
}

/**
 * Format data as a table
 */
export function formatTable(
  data: unknown[],
  options: OutputOptions,
  columns?: string[],
): string {
  if (data.length === 0) {
    return options.quiet ? "" : "No results";
  }

  // Determine columns
  const cols = columns ?? options.fields ?? inferColumns(data);

  // Build rows
  const rows: string[][] = data.map((item) => {
    if (typeof item !== "object" || item === null) {
      return [formatValue(item, options.maxWidth ?? 50)];
    }
    return cols.map((col) => {
      const value = getNestedValue(item, col);
      return formatValue(value, options.maxWidth ?? 50);
    });
  });

  // Calculate widths
  const widths = calculateColumnWidths(cols, rows, options.maxWidth ?? 50);

  // Build output
  const lines: string[] = [];

  // Header
  if (!options.noHeaders) {
    const header = cols
      .map((col, i) => col.toUpperCase().padEnd(widths[i] ?? 0))
      .join("  ");
    lines.push(header);
  }

  // Rows
  for (const row of rows) {
    const line = row
      .map((cell, i) => {
        const width = widths[i] ?? 0;
        return truncate(cell, width).padEnd(width);
      })
      .join("  ");
    lines.push(line);
  }

  return lines.join("\n");
}

// ============================================================
// CSV/TSV Formatting
// ============================================================

function escapeCsvValue(value: string, delimiter: string): string {
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format data as CSV or TSV
 */
export function formatDelimited(
  data: unknown[],
  options: OutputOptions,
  columns?: string[],
): string {
  if (data.length === 0) return "";

  const delimiter = options.format === "tsv" ? "\t" : ",";
  const cols = columns ?? options.fields ?? inferColumns(data);

  const lines: string[] = [];

  // Header
  if (!options.noHeaders) {
    lines.push(cols.map((c) => escapeCsvValue(c, delimiter)).join(delimiter));
  }

  // Rows
  for (const item of data) {
    if (typeof item !== "object" || item === null) {
      lines.push(escapeCsvValue(String(item), delimiter));
      continue;
    }
    const row = cols.map((col) => {
      const value = getNestedValue(item, col);
      if (value === null || value === undefined) return "";
      if (typeof value === "object")
        return escapeCsvValue(JSON.stringify(value), delimiter);
      return escapeCsvValue(String(value), delimiter);
    });
    lines.push(row.join(delimiter));
  }

  return lines.join("\n");
}

// ============================================================
// Plain Text Formatting
// ============================================================

/**
 * Format data as plain text (one value per line, useful for piping)
 */
export function formatPlain(data: unknown[], options: OutputOptions): string {
  if (data.length === 0) return "";

  // If fields specified, extract just those
  const fields = options.fields;
  if (fields && fields.length === 1) {
    // Single field: output one value per line
    return data
      .map((item) => {
        const value = getNestedValue(item, fields[0]!);
        if (value === null || value === undefined) return "";
        return String(value);
      })
      .join("\n");
  }

  // Multiple fields or no fields: compact representation
  return data
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return String(item);
      }
      const fieldsToShow = fields ?? Object.keys(item);
      return fieldsToShow
        .map((f) => {
          const v = getNestedValue(item, f);
          return `${f}=${v ?? ""}`;
        })
        .join(" ");
    })
    .join("\n");
}

// ============================================================
// JSON Formatting
// ============================================================

/**
 * Format data as JSON
 */
export function formatJson(data: unknown, options: OutputOptions): string {
  if (options.pretty) {
    return JSON.stringify(data, null, 2);
  }
  return JSON.stringify(data);
}

// ============================================================
// Main Output Function
// ============================================================

/**
 * Format and output data according to options
 *
 * This is the main entry point for CLI output. It:
 * 1. Applies field selection
 * 2. Applies JQ filtering
 * 3. Formats according to output format
 */
export function formatOutput(
  data: unknown,
  options: OutputOptions,
  defaultColumns?: string[],
): string {
  // Step 1: Apply JQ filter if specified
  let result = options.jq ? applyJqFilter(data, options.jq) : data;

  // Step 2: Apply field selection
  result = applyFieldSelection(result, options.fields);

  // Step 3: Format according to output format
  switch (options.format) {
    case "json":
      return formatJson(result, options);

    case "table": {
      const items = Array.isArray(result) ? result : [result];
      return formatTable(items, options, defaultColumns);
    }

    case "csv":
    case "tsv": {
      const items = Array.isArray(result) ? result : [result];
      return formatDelimited(items, options, defaultColumns);
    }

    case "plain": {
      const items = Array.isArray(result) ? result : [result];
      return formatPlain(items, options);
    }

    default:
      return formatJson(result, { ...options, pretty: true });
  }
}

// ============================================================
// Predefined Column Sets for Common Data Types
// ============================================================

/**
 * Default columns for different resource types
 * These provide sensible defaults that avoid overwhelming output
 */
export const DEFAULT_COLUMNS = {
  // Kalshi
  kalshiMarket: ["ticker", "title", "status", "yes_price", "volume"],
  kalshiMarketDetail: [
    "ticker",
    "title",
    "status",
    "yes_price",
    "no_price",
    "volume",
    "open_interest",
    "close_time",
  ],
  kalshiEvent: ["event_ticker", "title", "category", "markets_count"],
  kalshiSeries: ["series_ticker", "title", "category"],
  kalshiOrderbook: ["price", "quantity"],
  kalshiTrade: ["ticker", "count", "yes_price", "taker_side", "created_time"],
  kalshiOrder: [
    "order_id",
    "ticker",
    "side",
    "action",
    "type",
    "status",
    "yes_price",
    "count",
  ],
  kalshiPosition: ["ticker", "position", "market_exposure", "realized_pnl"],
  kalshiBalance: [
    "balance",
    "portfolio_value",
    "available_balance",
    "total_value",
  ],
  kalshiFill: [
    "trade_id",
    "ticker",
    "side",
    "action",
    "count",
    "yes_price",
    "created_time",
  ],
  kalshiSettlement: ["ticker", "market_result", "revenue", "settled_time"],
  kalshiPriceHistory: ["ts", "open", "high", "low", "close", "volume"],
  kalshiSearch: ["type", "ticker", "title", "score"],

  // Polymarket
  polymarketMarket: ["slug", "question", "outcomePrices", "volume", "closed"],
  polymarketMarketDetail: [
    "slug",
    "question",
    "description",
    "outcomePrices",
    "volume",
    "liquidity",
    "closed",
    "endDate",
  ],
  polymarketEvent: ["slug", "title", "volume", "closed"],
  polymarketTag: ["id", "label", "slug"],
  polymarketOrderbook: ["price", "size"],
  polymarketPrice: ["price", "midpoint", "side"],
  polymarketPriceHistory: ["t", "p"],
  polymarketSearch: ["type", "slug", "title", "score"],
} as const;

/**
 * Get default columns for a resource type
 */
export function getDefaultColumns(
  resourceType: keyof typeof DEFAULT_COLUMNS,
): string[] {
  return [...DEFAULT_COLUMNS[resourceType]];
}
