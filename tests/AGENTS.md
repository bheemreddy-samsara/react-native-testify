# tests/AGENTS.md

## Package Identity

- Unit tests for the library + CLI utilities using **Bun’s test runner** (`bun:test`).
- Tests are intended to be fast + hermetic (no simulators/emulators).

## Setup & Run

- Run all tests (repo root): `bun test`
- Watch mode: `bun test --watch`
- Run a single file: `bun test tests/discovery.test.ts`

## Patterns & Conventions

### Test runner + structure

- Use `import { describe, expect, test } from 'bun:test'` (see `tests/registry.test.ts`).
- Prefer small, focused test files under `tests/*.test.ts`.

### Temp files + cleanup

- ✅ DO: use temporary directories and clean up.
  - Example (OS temp dir): `tests/discovery.test.ts` uses `fs.mkdtempSync(path.join(os.tmpdir(), ...))`.
  - Example (test-local dir): `tests/compare.test.ts` writes to `path.join(import.meta.dir, '.test-images')` and deletes in `afterAll`.
- ❌ DON'T: write test artifacts into the repo root (use the patterns in `tests/discovery.test.ts` and `tests/compare.test.ts`).

### Keep tests simulator-free

- ✅ DO: unit test pure logic (config validation, discovery/glob, diff math).
- ❌ DON'T: call iOS/Android tooling in unit tests.
  - Real device tooling lives in `cli/device/ios.ts` and `cli/device/android.ts`.

### Don’t mix test frameworks

- This folder is `bun:test`.
- Jest is used only by the example app (see `example/jest.config.js`).

## Touch Points / Key Files

- Registry behavior: `tests/registry.test.ts`
- Config defaults/validation: `tests/config.test.ts`
- Discovery + registry generation: `tests/discovery.test.ts`
- Image diff behavior: `tests/compare.test.ts`

## JIT Index Hints

- List tests: `fd -t f -E node_modules "\\.test\\.ts$" tests`
- Find a specific describe block: `rg -n "describe\(" tests`
- Find config-related assertions: `rg -n "validateConfig|TestifyConfig" tests`

## Common Gotchas

- Use `import.meta.dir` instead of `__dirname` (see `tests/compare.test.ts`).
- Keep tests deterministic; avoid timers unless you control them.

## Pre-PR Checks

`bun test`
