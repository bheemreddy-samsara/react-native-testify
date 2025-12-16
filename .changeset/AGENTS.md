# .changeset/AGENTS.md

## Package Identity

- Changesets configuration and release metadata.
- GitHub Actions uses Changesets to open version bump PRs and publish to npm.

## Setup & Run

- Add a changeset (recommended): `bunx @changesets/cli add`
- Check status: `bunx @changesets/cli status --since=main`
- Apply versions locally (rare): `bunx @changesets/cli version`

Publishing is usually handled by GitHub Actions:

- Release PRs: `.github/workflows/package-version.yml`
- Publish: `.github/workflows/publish.yml`

## Patterns & Conventions

- This repo is a single package (`@samsara-dev/react-native-testify`).
- For user-facing changes, add a changeset that bumps this package.

✅ DO:

- Use Changesets to drive versioning and changelog entries.

❌ DON'T:

- Don’t manually bump versions in `package.json`.
- Don’t hand-edit `CHANGELOG.md` (it is generated from changesets).

## Touch Points / Key Files

- Changesets config: `.changeset/config.json`
- Package manifest: `package.json`
- Changelog: `CHANGELOG.md`
- Release PR workflow: `.github/workflows/package-version.yml`
- Publish workflow: `.github/workflows/publish.yml`

## JIT Index Hints

- List pending changesets: `ls -la .changeset | rg -n "\\.md$" || true`
- See release workflow wiring: `rg -n "changesets/action" .github/workflows -S`

## Common Gotchas

- `.changeset/config.json` sets `baseBranch` to `main`; keep workflow triggers aligned.
- `commit: false` means the GH action manages commits for release PRs.

## Pre-PR Checks

- If the change affects users, add a changeset: `bunx @changesets/cli add`
