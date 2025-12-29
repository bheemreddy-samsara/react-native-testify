# cli/AGENTS.md

## Package Identity

- Node-powered CLI (bin name: `testify`) that drives a running React Native harness to:
  - record baseline screenshots
  - run visual diffs + generate an HTML report
  - discover `*.testify.tsx` files and generate a registry

## Setup & Run

- Dev (watch CLI entry): `pnpm run dev`
- Build (generates `dist/cli/index.js`): `pnpm run build`
- Lint/format/typecheck: `pnpm run lint && pnpm run format && pnpm run typecheck`
- Unit tests (no simulator/emulator required): `pnpm test`
- Run locally without install: `pnpm run dev -- --help`

## Patterns & Conventions

### CLI entry + command dispatch

- `cli/index.ts`:
  - parses `--config` (strip it before handing args to commands)
  - loads config via `loadConfig`
  - dispatches commands via `switch (command)`

Examples:

- ✅ DO: add new command modules under `cli/commands/<name>.ts` and wire them in `cli/index.ts`.
- ❌ DON'T: modify generated output `dist/cli/index.js`.

### Config loading + validation

- `cli/config.ts` is the single source of truth for defaults and validation (Zod schemas).
- Config discovery searches for `testify.config.ts|js|json` and `.testifyrc.*` (see `loadConfig`).
- When changing defaults/schema:
  - ✅ DO: update `tests/config.test.ts`.

Gotcha:

- `loadConfig` uses `jiti` so `.ts` configs work under Node.

### WebSocket server protocol

- `cli/server.ts` runs a Node WebSocket server and waits for:
  - a client connection
  - a `ready` message before running mount/list cycles

Protocol touchpoint:

- Keep the message shapes aligned with `src/connection.ts`.
  - ✅ DO: update both sides when adding/changing message fields.

### Device orchestration

- iOS simulator tooling: `cli/device/ios.ts` (`xcrun simctl`, status bar override)
- Android tooling: `cli/device/android.ts` (`adb`, optional demo mode)

Guidelines:

- ✅ DO: keep device commands centralized in `cli/device/*`.
- ❌ DON'T: make unit tests depend on simulators/emulators (tests should stay hermetic like `tests/server.test.ts`).

### Reporting + screenshot diffs

- Image diffing: `cli/compare.ts` (pixelmatch + pngjs)
- HTML report generation: `cli/report.ts`
- Primary flow: `cli/commands/test.ts` (creates `*-latest`, `*-diff`, writes report)

## Touch Points / Key Files

- CLI entry: `cli/index.ts`
- Config schema/defaults: `cli/config.ts`
- WebSocket server: `cli/server.ts`
- Commands:
  - record: `cli/commands/record.ts`
  - test: `cli/commands/test.ts`
  - discover: `cli/commands/discover.ts`
- Discovery helpers: `cli/discovery.ts`
- Device control: `cli/device/ios.ts`, `cli/device/android.ts`
- Reporting: `cli/report.ts`

## JIT Index Hints

- List commands: `fd -t f . cli/commands -d 2`
- Find config defaults: `rg -n "\.default\(" cli/config.ts`
- Find server message handling: `rg -n "waitForMessage|ready|mounted|unmounted" cli/server.ts`
- Find report output path: `rg -n "generateHtmlReport|testify-report\.html" cli -S`

## Common Gotchas

- Path resolution is relative to `process.cwd()` (user project), not the repo root.
- Keep CLI output stable and actionable; errors should include next-step hints (see `cli/commands/test.ts`).
- `discover` writes generated code to `config.discovery.generatedRegistry` (default: `./testify/.generated-registry.tsx`).

## Pre-PR Checks

`pnpm run lint && pnpm run typecheck && pnpm test && pnpm run build`
