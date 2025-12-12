# Migrate to Zod 4 Native JSON Schema Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `zod-to-json-schema` dependency with Zod 4's native `z.toJSONSchema()` function.

**Architecture:** Direct upgrade from Zod v3.23.8 + zod-to-json-schema to Zod v4. The MCP SDK v1.24.3 now supports both Zod v3 and v4 (`"zod": "^3.25 || ^4.0"`), eliminating the need for a compatibility layer like Zodown. We'll update `validation.ts` to use the native API, regenerate documentation, and verify all tests pass.

**Tech Stack:** Zod v4, Bun, TypeScript, MCP SDK

---

## Task 1: Update Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Remove zod-to-json-schema and upgrade zod**

Run:

```bash
bun remove zod-to-json-schema
bun add zod@latest
```

Expected: `package.json` shows `zod` at v4.x and `zod-to-json-schema` removed.

**Step 2: Verify installation**

Run: `bun install`
Expected: Clean install with no peer dependency warnings.

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(deps): upgrade zod to v4, remove zod-to-json-schema"
```

---

## Task 2: Update validation.ts Imports

**Files:**

- Modify: `src/validation.ts:1-2`

**Step 1: Update imports**

Replace lines 1-2:

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
```

With:

```typescript
import { z } from "zod";
```

**Step 2: Verify file compiles**

Run: `bun run typecheck`
Expected: TypeScript error on line 117 (zodToJsonSchema is now undefined). This is expected and will be fixed in Task 3.

---

## Task 3: Update toMCPSchema Function

**Files:**

- Modify: `src/validation.ts:113-121`

**Step 1: Replace the toMCPSchema implementation**

Replace lines 113-121:

```typescript
/**
 * Convert Zod schema to JSON Schema for MCP tool definitions
 */
export function toMCPSchema(schema: z.ZodType): Record<string, unknown> {
  return zodToJsonSchema(schema, {
    target: "jsonSchema7",
    $refStrategy: "none",
  });
}
```

With:

```typescript
/**
 * Convert Zod schema to JSON Schema for MCP tool definitions
 *
 * Uses Zod v4's native toJSONSchema() which replaced the deprecated
 * zod-to-json-schema library.
 */
export function toMCPSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: "draft-7",
    reused: "inline",
  }) as Record<string, unknown>;
}
```

**Step 2: Verify types compile**

Run: `bun run typecheck`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/validation.ts
git commit -m "refactor: use Zod v4 native toJSONSchema in validation.ts"
```

---

## Task 4: Run Tests to Verify Functionality

**Files:**

- Test: `src/tools.test.ts`

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass. The integration tests verify that schemas work correctly with the MCP tools.

**Step 2: Manually verify JSON schema output**

Run:

```bash
bun -e "import { toMCPSchema, ListMarketsArgsSchema } from './src/validation.ts'; console.log(JSON.stringify(toMCPSchema(ListMarketsArgsSchema), null, 2))"
```

Expected: Valid JSON Schema 7 output with:

- `type: "object"`
- `properties` containing `status`, `limit`, `eventTicker`, `seriesTicker`
- Each property has `description` from `.describe()` calls
- `additionalProperties: false` (from `.strict()`)

**Step 3: If tests fail, debug**

If there are schema differences, check:

1. Property descriptions are preserved
2. Enum values are correct for `status`
3. Number constraints (min/max) are present for `limit`
4. String constraints (minLength) are present for required ticker fields

---

## Task 5: Regenerate Documentation

**Files:**

- Modify: `docs/tools/reference.md` (auto-generated)
- Modify: `docs/index.md` (auto-generated)
- Modify: `docs/configuration.md` (auto-generated)
- Modify: `docs/getting-started.md` (auto-generated)

**Step 1: Generate fresh documentation**

Run: `bun run docs:generate`
Expected: Console shows `[ok]` for all generated files.

**Step 2: Check documentation matches source**

Run: `bun run docs:check`
Expected: "OK: Documentation is up-to-date with source code."

**Step 3: Review generated docs for schema accuracy**

Open `docs/tools/reference.md` and verify:

- All 6 tools are documented
- Parameter types match (string, integer, enum)
- Constraints (min, max, minLength) are present
- Descriptions match source schemas

**Step 4: Commit**

```bash
git add docs/
git commit -m "docs: regenerate after Zod v4 migration"
```

---

## Task 6: Update CLAUDE.md and Issue Reference

**Files:**

- Modify: `CLAUDE.md` (if needed)

**Step 1: Check if CLAUDE.md mentions zod-to-json-schema**

Run: `grep -n "zod-to-json-schema" CLAUDE.md`
Expected: No matches (the file doesn't mention this dependency directly).

**Step 2: Close GitHub issue**

If all tests pass and docs are updated, close the issue:

Run: `gh issue close 11 --comment "Completed migration to Zod v4 native JSON Schema. Removed zod-to-json-schema dependency."`
Expected: Issue #11 closed.

---

## Task 7: Run Full Verification Suite

**Files:**

- All source files

**Step 1: Run linting**

Run: `bun run lint`
Expected: No errors.

**Step 2: Run formatting check**

Run: `bun run format:check`
Expected: All files formatted correctly.

**Step 3: Run type checking**

Run: `bun run typecheck`
Expected: No TypeScript errors.

**Step 4: Run full test suite**

Run: `bun test`
Expected: All tests pass.

**Step 5: Run docs check**

Run: `bun run docs:check`
Expected: Documentation in sync.

---

## Task 8: Final Commit and Summary

**Step 1: Verify git status**

Run: `git status`
Expected: Clean working directory (all changes committed).

**Step 2: Review commit history**

Run: `git log --oneline -5`
Expected: See commits for:

- Dependency update
- validation.ts refactor
- Documentation regeneration

**Step 3: Summary of changes**

The migration is complete. Summary:

- **Removed**: `zod-to-json-schema` dependency (deprecated)
- **Upgraded**: `zod` from v3.23.8 to v4.x
- **Updated**: `src/validation.ts` to use native `z.toJSONSchema()`
- **Regenerated**: All documentation files
- **Verified**: All tests pass, types check, linting clean

---

## Appendix: Key API Differences

### Old API (zod-to-json-schema)

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";
zodToJsonSchema(schema, {
  target: "jsonSchema7",
  $refStrategy: "none",
});
```

### New API (Zod v4 native)

```typescript
import { z } from "zod";
z.toJSONSchema(schema, {
  target: "draft-7",
  reused: "inline",
});
```

### Option Mapping

| zod-to-json-schema      | Zod v4 native            | Notes                             |
| ----------------------- | ------------------------ | --------------------------------- |
| `target: "jsonSchema7"` | `target: "draft-7"`      | Same JSON Schema version          |
| `$refStrategy: "none"`  | `reused: "inline"`       | Inline duplicates instead of $ref |
| N/A                     | `unrepresentable: "any"` | How to handle non-JSON types      |
| N/A                     | `cycles: "ref"`          | How to handle circular refs       |

---

## Rollback Plan

If issues are discovered post-migration:

```bash
# Revert to previous versions
bun remove zod
bun add zod@3.23.8 zod-to-json-schema@3.24.1

# Restore validation.ts from git
git checkout HEAD~3 -- src/validation.ts

# Regenerate docs
bun run docs:generate
```
