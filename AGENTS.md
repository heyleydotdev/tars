<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Agent Instructions

## Package Manager

**bun 1.4.4** (`bun.lock`). Never npm, yarn, or pnpm. Shared versions live in the root `workspaces.catalog`; reference them as `"catalog:"`.

## Commands

| Task                 | Command                                                 |
| -------------------- | ------------------------------------------------------- |
| Everything           | `bun run build && bun run typecheck && bun run lint`    |
| One workspace        | `bunx turbo <task> --filter=@tars/<name>`               |
| One test file        | `cd apps/<name> && bunx vitest run test/<file>.spec.ts` |
| Format one workspace | `bunx turbo format --filter=@tars/<name>`               |

## Verify Before Reporting

`bun run format` → `bun run typecheck` → `bun run lint`. Add `--force` when the change is in a shared package: Turbo hashes a task on that workspace's own files, **not** on a transitive dependency's source, so editing `tooling/*` or `packages/*` can replay a stale green result.

## Traps

- **`includeIgnoreFile` needs `gitignoreResolution: true`.** `@tars/eslint` lives in `tooling/eslint/`, so the default resolves root `.gitignore` patterns against that directory, matches nothing, and looks like it works.
- **`bun fmt` needs the explicit ignore paths.** With a Prettier config it only reads the `.gitignore` in the current directory, so workspace scripts pass `--ignore-path ../../.gitignore` (and a local `.prettierignore` where generated files exist). Without them, generated files get formatted.
- **Every workspace needs `"prettier": "@tars/prettier"` and `prettier` in its own `devDependencies`** so editor integrations resolve the shared config.
- **Root files are formatted by `//#format:root`.** A new root file type means a new glob in `turbo.json`, `format:root`, and `format:write:root`.
- **`typecheck` is `bun check`.** Bun bundles TypeScript 7.0.2; `typescript` in the catalog stays on 5.9.3 for the editor and ESLint. Both must accept the tree.
- **ESLint and project references.** Each app's `eslint.config.js` must list every referenced tsconfig in `parserOptions.project`.
- **No package compiles by default.** Packages ship TypeScript source (`source-package.json`).

## Key Conventions

- File and directory names are lowercase kebab-case, except names a tool dictates (`README.md`, `AGENTS.md`, `bun.lock`, `tsconfig.*.json`).
- Tooling packages are private and scoped `@tars/*`; they are consumed via `workspace:*`.
- `clean` belongs to the workspace that owns the artifacts: the root script is `turbo run clean`, and a package that emits files defines its own `"clean": "git clean -xdf dist .cache"`.
- `apps/desktop` is Electron + React via electron-vite: main and preload bundle to CommonJS in `out/`, the renderer is a Vite/React page. Its ESLint project list must include `tsconfig.node.json`, `tsconfig.preload.json` (DOM libs for preload), and `tsconfig.web.json`.
- Electron 45 has no dependency postinstall, so `apps/desktop` declares `"postinstall": "install-electron"`; `bun install` downloads the binary there. A missing `apps/desktop/node_modules/electron/dist` means that script did not run.
- Type-aware ESLint rules require `parserOptions.project` and `tsconfigRootDir` in every workspace config.
