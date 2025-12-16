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

### Auto-Discovery Mode (primary pattern)

This example uses auto-discovery as the primary pattern:

1. **Component variants** are defined in colocated `*.testify.tsx` files
   - Examples: `example/src/components/Button.testify.tsx`, `example/src/screens/ProfileScreen.testify.tsx`

2. **Registry is auto-generated** by running `bunx testify discover`
   - Output: `example/testify/.generated-registry.tsx`

3. **Providers/wrapper** are defined in the entry file
   - See: `example/index.testify.js`

Workflow:
```bash
# After adding/modifying *.testify.tsx files
cd example && bunx testify discover

# Record baselines
bunx testify record --ios

# Run tests
bunx testify test --ios
```

✅ DO:
- Define component variants in colocated `*.testify.tsx` files
- Run `bunx testify discover` after adding new testify files
- Define providers/wrapper in `index.testify.js`

❌ DON'T:
- Edit `.generated-registry.tsx` manually (it will be overwritten)

### Baselines + report output

- Baselines and diffs live under `example/testify/baselines/**`.
- The HTML report is written to `example/testify/baselines/testify-report.html`.

## Touch Points / Key Files

- Entry toggle: `example/index.js`
- Testify entry (with providers): `example/index.testify.js`
- Testify config: `example/testify.config.ts`
- CI config: `example/testify.ci.config.ts`
- Generated registry: `example/testify/.generated-registry.tsx`
- Component variants: `example/src/components/*.testify.tsx`
- Screen variants: `example/src/screens/*.testify.tsx`
- Baselines/report: `example/testify/baselines/**`

## JIT Index Hints

- Find testify variant files: `fd -t f -E node_modules "\\.testify\\.tsx$" example/src`
- Find harness wiring: `rg -n "TestifyApp|registerComponent|providers|wrapper" example/index.testify.js`
- Find generated registry: `cat example/testify/.generated-registry.tsx`

## Common Gotchas

- The example app uses npm + `package-lock.json` (don't run `bun install` inside `example/`).
- Root Biome config ignores `example/`, so use `npm run lint` for example-only changes.
- iOS requires CocoaPods (`cd example/ios && pod install`) when dependencies change.
- Always run `bunx testify discover` after adding new `*.testify.tsx` files.

## Pre-PR Checks

`cd example && npm run lint && npm test`
