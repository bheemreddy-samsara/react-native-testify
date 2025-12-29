# AGENTS.md (root)

This repo uses a **hierarchical AGENTS.md** system.

- **Nearest-wins:** when editing a file, follow the closest `AGENTS.md` in that directory tree.
- **JIT-first:** open the referenced files and search with the provided commands; don’t paste large files.

## Project Snapshot

- **Repo type:** single published npm package (`@samsara-dev/react-native-testify`) + embedded React Native example app (`example/`).
- **Stack:** TypeScript, React Native, Node (CLI + tests), pnpm, Biome (lint/format), Changesets (release automation).
- **Main areas:** library runtime (`src/`), CLI (`cli/`), unit tests (`tests/`), example app (`example/`).

## Root Setup Commands

- Package manager: use the `packageManager` value from `package.json` (currently pnpm).
- Install (CI style): `pnpm install --frozen-lockfile`
- Build: `pnpm run build`
- Lint: `pnpm run lint`
- Format: `pnpm run format`
- Typecheck: `pnpm run typecheck`
- Test: `pnpm test`

## Universal Conventions

- **Formatting/lint:** Biome config lives in `biome.json` (single quotes + semicolons).
- **TypeScript:** `strict: true` in `tsconfig.json`.
- **Generated output:** don’t edit `dist/` by hand; update source and run `pnpm run build`.
- **Releases:** user-facing changes should add a Changeset (see `.changeset/config.json` + `.github/workflows/package-version.yml`).
- **CI expectations:** workflows use Node 24.12 + pnpm (see `.github/workflows/*.yml`).

## Security & Secrets

- Never commit tokens/keys. Publishing uses `NPM_TOKEN` via GitHub Actions (`.github/workflows/publish.yml`).
- Treat screenshots/baselines as sensitive—avoid real user data in `example/testify/baselines/**`.
- Prefer env vars over committed machine-specific paths.

## JIT Index (what to open, not what to paste)

### Directory Map

- Library runtime (React Native): `src/` → see [`src/AGENTS.md`](src/AGENTS.md)
- CLI (Node): `cli/` → see [`cli/AGENTS.md`](cli/AGENTS.md)
- Unit tests (Vitest): `tests/` → see [`tests/AGENTS.md`](tests/AGENTS.md)
- Example app (React Native): `example/` → see [`example/AGENTS.md`](example/AGENTS.md)
- CI / release automation: `.github/` → see [`.github/AGENTS.md`](.github/AGENTS.md)
- Changesets config: `.changeset/` (Changesets parses all `.md` files here; keep docs elsewhere)

### Quick Find Commands

- Find CLI commands: `rg -n "export async function run" cli/commands`
- Find config schema/defaults: `rg -n "TestifyConfigSchema|\.default\(" cli/config.ts`
- Find RN harness + registry helpers: `rg -n "TestifyApp|createRegistry|defineConfig" src example -g'*.ts' -g'*.tsx'`
- Find testify component files: `fd -t f -E node_modules -E dist -E example/node_modules "\\.testify\\.tsx$" .`
- Find baselines + reports: `fd -t f . example/testify/baselines -d 3`

## Definition of Done

- Use the current package manager for lint/typecheck/format (i.e., when instructions say `yarn lint && yarn typecheck && yarn prettier:write`, translate to `<pm> run lint && <pm> run typecheck && <pm> run format`).
- `pnpm run lint && pnpm run typecheck && pnpm test && pnpm run build`
- If you changed `example/`: `cd example && npm run lint && npm test`
