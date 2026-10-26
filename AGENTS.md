# Agent Instructions

## Package Manager

- Use **bun 1.4.4**; never npm, yarn, or pnpm.
- Versions live in root `workspaces.catalog`; reference them as `"catalog:"`.

## Turborepo

- Do not assume Turborepo behavior from memory. Resolve the installed package with `node -p "require.resolve('turbo/package.json')"` and read its `docs/README.md` plus the relevant pages before changing `turbo.json` or commands.
- The bundled docs match the installed version and work offline; heed deprecation notices.

## Commands

| Task                 | Command                                         |
| -------------------- | ----------------------------------------------- |
| Install              | `bun install`                                   |
| One task             | `bunx turbo <task> --filter=@tars/<name>`       |
| Desktop dev          | `bunx turbo dev --filter=@tars/desktop`         |
| Add shadcn component | `cd packages/ui && bunx shadcn add <component>` |

## Verify Before Reporting

`bun run format` → `bun run typecheck` → `bun run lint`. Add `--force` when editing `packages/*` or `tooling/*`; Turbo hashes a task on the workspace's own files, not its dependencies' source.

## Traps

- `typecheck` is `bun check` (Bun's TypeScript 7); catalog `typescript` 5.9.3 is only for editors and ESLint.
- `bun fmt` reads only the current directory's `.gitignore`; workspace scripts pass `--ignore-path ../../.gitignore`.
- Electron 45 has no dependency postinstall; `apps/desktop` runs `install-electron` in its own `postinstall`.
- `packages/ui` needs `vite.config.ts` so the shadcn CLI detects a Vite project.
- Apps importing `@tars/ui/globals.css` must add `@source` for `packages/ui/src`, or Tailwind drops the package's classes.

## Key Conventions

- File and directory names are lowercase kebab-case; tool-dictated names excepted.
- Import icons directly from `lucide-react`; no icon barrels, so tree-shaking survives.
- Packages ship TypeScript source (`@tars/tsconfig/source-package.json`); no build step.
- Workspaces depend on shared tooling via `workspace:*` and set `"prettier": "@tars/prettier"`.
- Each app's `eslint.config.js` lists every tsconfig in `parserOptions.project`; `apps/desktop` includes node, preload, and web.
- `clean` is per workspace (`git clean -xdf out .cache`); the root script runs `turbo run clean`.
