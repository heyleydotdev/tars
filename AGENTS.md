# Agent Instructions

## Package Manager

- Use **bun 1.4.4**; never npm, yarn, or pnpm.
- Versions live in root `workspaces.catalog`; reference them as `"catalog:"`.

## Turborepo

- Do not assume Turborepo behavior from memory. Resolve the installed package with `node -p "require.resolve('turbo/package.json')"` and read its `docs/README.md` plus the relevant pages before changing `turbo.json` or commands.
- The bundled docs match the installed version and work offline; heed deprecation notices.

## Electron

- The npm package ships no docs. Use https://www.electronjs.org/docs/latest/ and verify APIs against `electron.d.ts` from the resolved package.
- electron-vite config and built-in defaults: https://electron-vite.org/guide/.
- The desktop window is frameless (`frame: false`); window controls use `window:*` IPC exposed as `window.api.windowControls`.
- Tray app: closing the window hides it, `before-quit` flips `isQuitting`, and the tray menu owns Quit.
- Windows identity: `productName: Tars` + `app.setName('Tars')`; dev still runs `electron.exe`, so Task Manager shows Electron until packaged.
- Dark-only: `nativeTheme.themeSource = 'dark'` in main, `class="dark"` on `<html>`, and `color-scheme: dark`.
- Keep `contextIsolation` on, expose only the preload bridge, and keep the renderer CSP in `apps/desktop/src/renderer/index.html`.

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
- Branding is uppercase `TARS` in the README and document titles; app header and tray use `Tars`.
- Import icons directly from `lucide-react`; no icon barrels, so tree-shaking survives.
- Packages ship TypeScript source (`@tars/tsconfig/source-package.json`); no build step.
- Workspaces depend on shared tooling via `workspace:*` and set `"prettier": "@tars/prettier"`.
- Each app's `eslint.config.js` lists every tsconfig in `parserOptions.project`; `apps/desktop` includes node, preload, and web.
- `clean` is per workspace (`git clean -xdf out .cache`); the root script runs `turbo run clean`.
