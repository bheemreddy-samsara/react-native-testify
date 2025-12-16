# example/AGENTS.md

## Package Identity

- React Native example app that demonstrates integrating `@samsara-dev/react-native-testify`.
- Used by CI demo workflow to generate an HTML report (see `.github/workflows/example-ios-report-demo.yml`).

## Setup & Run

- Install (CI-style): `cd example && npm ci`
- Start Metro: `cd example && npm run start`
- Run iOS app: `cd example && npm run ios`
- Run Android app: `cd example && npm run android`
- Lint: `cd example && npm run lint`
- Unit tests (Jest): `cd example && npm test`

Testify flows:

- Record baselines (iOS): `cd example && npm run testify:record`
- Run visual tests (iOS): `cd example && npm run testify:test`

## Patterns & Conventions

### App vs Testify harness entry

- `example/index.js` toggles between the normal app and the Testify harness.
  - ✅ DO: keep harness entry isolated in `example/index.testify.js`.
  - ❌ DON'T: copy the hardcoded demo toggle (`USE_TESTIFY = true` in `example/index.js`) into production apps.

### Manual registry mode (explicit registry)

- The example’s explicit registry lives in `example/testify/registry.tsx`.
- This is the simplest integration style:
  - add components to the registry
  - run `bunx testify record/test` from the app root

✅ DO:

- Follow the wrapper/layout pattern in `example/testify/registry.tsx` (e.g., the `Centered` helper).

### Discovery mode (per-component files)

- Component variants can be colocated next to components as `*.testify.tsx`.
  - Examples: `example/src/components/Button.testify.tsx`, `example/src/components/Card.testify.tsx`.

To try discovery mode:

- Enable discovery in `example/testify.config.ts` and point the app to the generated registry.
- Generate registry: `cd example && bunx testify discover`

### Baselines + report output

- Baselines and diffs live under `example/testify/baselines/**`.
- The HTML report is written to `example/testify/baselines/testify-report.html`.

## Touch Points / Key Files

- Entry toggle: `example/index.js`
- Testify entry: `example/index.testify.js`
- Testify config: `example/testify.config.ts`
- CI config: `example/testify.ci.config.ts`
- Manual registry: `example/testify/registry.tsx`
- Component variants: `example/src/components/*.testify.tsx`
- Baselines/report: `example/testify/baselines/**`

## JIT Index Hints

- Find testify variant files: `fd -t f -E node_modules "\\.testify\\.tsx$" example/src`
- Find registry entries: `rg -n "createRegistry\(" example/testify/registry.tsx`
- Find harness wiring: `rg -n "TestifyApp|registerComponent" example/index.testify.js`

## Common Gotchas

- The example app uses npm + `package-lock.json` (don’t run `bun install` inside `example/`).
- Root Biome config ignores `example/`, so use `npm run lint` for example-only changes.
- iOS requires CocoaPods (`cd example/ios && pod install`) when dependencies change.

## Pre-PR Checks

`cd example && npm run lint && npm test`
