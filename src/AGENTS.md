# src/AGENTS.md

## Package Identity

- React Native **runtime harness** that mounts registered components and communicates with the Testify CLI over WebSocket.
- Public surface is exported from `src/index.ts` (and built to `dist/src/*`).

## Setup & Run

- Install (from repo root): `pnpm install --frozen-lockfile`
- Lint: `pnpm run lint`
- Format: `pnpm run format`
- Typecheck: `pnpm run typecheck`
- Unit tests: `pnpm test`
- Build package (generates `dist/`): `pnpm run build`

## Patterns & Conventions

### Public API shape

- `src/index.ts` is the barrel export.
  - ✅ DO: add exports here for new public APIs (example: `TestifyApp` already exported from `src/index.ts`).
  - ❌ DON'T: patch generated artifacts like `dist/src/index.js` or `dist/src/config.js`.

### Registry model (component catalog)

- The registry is created via `createRegistry` in `src/registry.ts`.
  - Supports either a renderer function or a config object (`ComponentEntry`).
  - Default wait behavior is defined in `RegistryOptions` (`defaultWaitMs`), resolved in `Registry.get()`.
  - Store isolation decisions are centralized in `Registry.shouldIsolateStore()`.

Examples:

- ✅ DO: follow the resolved component structure in `src/registry.ts` (`ResolvedComponent` includes `usesDefaultWaitMs`).
- ❌ DON'T: special-case per-component behavior inside `TestifyApp` when it belongs in `src/registry.ts`.

### Harness lifecycle (mount/unmount/list)

- `src/TestifyApp.tsx` owns:
  - WebSocket connection lifecycle
  - the mount state machine (`mounting` → `ready` / `error`)
  - wrapper/provider application

Communication contract:

- Message types are defined in `src/connection.ts` (`TestifyMessage`, `Platform`).
  - ✅ DO: update the message union/types here when you add a new message type.
  - ✅ DO: keep behavior in sync with the CLI server in `cli/server.ts`.

### Idle detection

- Idle detection helpers live in `src/idleDetection.ts`.
  - `waitForRenderComplete` uses a next-frame + `InteractionManager` idle.
  - ✅ DO: keep “wait logic” in `src/idleDetection.ts` (and call it from `src/TestifyApp.tsx`).
  - ❌ DON'T: add new fixed `setTimeout` waits for default behavior in `src/TestifyApp.tsx` (fixed waits are only a fallback when idle detection is disabled).

### Providers, wrappers, and store isolation

- Providers are reduced right to build a provider tree (see `wrapWithProviders` in `src/TestifyApp.tsx`).
- Store isolation uses `registry.shouldIsolateStore(mountState.name)` + `useMemo` (see `src/TestifyApp.tsx`).
  - ✅ DO: preserve the existing Biome suppression comment near the store `useMemo`.

## Touch Points / Key Files

- Public exports: `src/index.ts`
- Harness app: `src/TestifyApp.tsx`
- Registry API: `src/registry.ts`
- WebSocket client: `src/connection.ts`
- Idle detection: `src/idleDetection.ts`
- Idle UI: `src/IdleScreen.tsx`

## JIT Index Hints

- Find exports: `rg -n "^export" src/index.ts src/config.ts`
- Find mount/list message handling: `rg -n "case 'mount'|case 'list'|message\.type" src/TestifyApp.tsx`
- Find idle detection usage: `rg -n "waitForRenderComplete|idleConfig" src/TestifyApp.tsx src/idleDetection.ts`

## Common Gotchas

- This code runs in a React Native runtime: avoid Node-only APIs in `src/`.
- Keep screenshots deterministic: avoid timestamps/randomness in harness UI (see `src/IdleScreen.tsx`).
- If you change the message protocol, update both sides (`src/connection.ts` + `cli/server.ts`).

## Pre-PR Checks

`pnpm run lint && pnpm run typecheck && pnpm test && pnpm run build`
