# .github/AGENTS.md

## Package Identity

- GitHub Actions workflows for CI (build/test), release automation (Changesets), publishing, and a demo workflow for the example iOS report.

## Setup & Run

- CI uses Node 24.12 + pnpm.
- Primary workflows live in `.github/workflows/*.yml`.

## Patterns & Conventions

### Node + pnpm versions

- ✅ DO: keep Node/pnpm versions consistent across workflows.
  - Examples: `.github/workflows/build.yml`, `.github/workflows/test.yml`.

### Dependency install strategy

- Root package uses pnpm:
  - `pnpm install --frozen-lockfile`
- Example app uses npm:
  - `working-directory: example`
  - `npm ci --no-audit --no-fund`
  - cache keyed by `example/package-lock.json`
  - Example: `.github/workflows/example-ios-report-demo.yml`

### Releases / publishing

- Release PR generation: `.github/workflows/package-version.yml` (uses `changesets/action`).
- Publish workflow: `.github/workflows/publish.yml` (requires `NPM_TOKEN`).

✅ DO:

- Use `changesets/action@v1` for version PRs and publishing.

❌ DON'T:

- Don’t print secrets (publishing relies on `secrets.NPM_TOKEN` in `.github/workflows/publish.yml`).
- Don’t switch the example workflow to Bun installs; it is intentionally npm-based (`example/package-lock.json`).

## Touch Points / Key Files

- Build PRs: `.github/workflows/build.yml`
- Test PRs: `.github/workflows/test.yml`
- Create version PRs: `.github/workflows/package-version.yml`
- Publish package: `.github/workflows/publish.yml`
- Example iOS report demo: `.github/workflows/example-ios-report-demo.yml`

## JIT Index Hints

- List workflows: `ls -la .github/workflows`
- Find Node/pnpm versions: `rg -n "node-version:|pnpm" .github/workflows`
- Find secrets usage: `rg -n "secrets\." .github/workflows`

## Common Gotchas

- The example iOS demo workflow intentionally mutates a baseline to force a diff (see `.github/workflows/example-ios-report-demo.yml`).
- `package-version.yml` runs on pushes to `main` and opens PRs; keep it lightweight and deterministic.

## Pre-PR Checks

- If you change workflows, sanity check YAML + align Node/Bun versions across `build.yml` and `test.yml`.
