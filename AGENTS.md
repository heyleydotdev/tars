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
- The desktop app is ESM (`"type": "module"`): main builds to `out/main/index.js`, preload to `out/preload/index.mjs`; reference the preload by `.mjs` and keep it unsandboxed with context isolation on.
- Keep `contextIsolation` on, expose only the preload bridge, and keep the renderer CSP in `apps/desktop/src/renderer/index.html`.

## Cloudflare Workers

- Workers APIs and limits change often. Retrieve current docs before KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents work: https://developers.cloudflare.com/workers/ (docs MCP: https://docs.mcp.cloudflare.com/mcp).
- Quotas live under `/platform/limits/`; product references under `/kv/`, `/r2/`, `/d1/`, `/durable-objects/`, `/queues/`, `/vectorize/`, `/workers-ai/`, `/agents/`.
- Local dev `bunx wrangler dev --env-file ../../.env`, deploy `bunx wrangler deploy`; run `bun run typegen` in `apps/server` after `wrangler.jsonc` changes and commit `worker-configuration.d.ts`.
- Required secrets are declared in `wrangler.jsonc` `secrets.required` — the source of truth for `Env` types; values come from the root `.env` locally and `wrangler secret put` when deployed.
- The Worker mounts better-auth at `/api/auth` and oRPC at `/api/rpc`; schema is drizzle-managed: run `bun run generate` from the root (auth writes `packages/db/src/auth-schema.ts`, then drizzle-kit emits migrations), applied to D1 with apps/server's `migrate:local` / `migrate:remote`.
- While `wrangler dev` runs, the Local Explorer API inspects local state: `/cdn-cgi/local/explorer/api/local/workers`, `.../storage/kv/namespaces`, `.../d1/database`, `.../r2/buckets`, plus `POST .../local/observability/query` for read-only SQL over `spans` and `logs`.
- Node.js compatibility: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Error 1102 (CPU/memory) → `/workers/platform/limits/`; all errors → https://developers.cloudflare.com/workers/observability/errors/
- Durable Objects: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/ · Workflows: https://developers.cloudflare.com/workflows/build/rules-of-workflows/

## Commands

| Task                 | Command                                         |
| -------------------- | ----------------------------------------------- |
| Install              | `bun install`                                   |
| One task             | `bunx turbo <task> --filter=@tars/<name>`       |
| Desktop dev          | `bunx turbo dev --filter=@tars/desktop`         |
| Server dev           | `bunx turbo dev --filter=@tars/server`          |
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
- Renderer pages live in `apps/desktop/src/renderer/src/pages/`; no `-page` suffix.
- Renderer routes live in `src/renderer/src/routes.tsx` (`createHashRouter`); Electron serves `file://`, so React Router framework/SPA history routing is unavailable.
- Global state lives in `src/renderer/src/stores/*` (Zustand); select multiple fields with `useShallow`.
- Auth store (`stores/auth.ts`) restores the session via `window.api.auth`; `RequireAuth`/`GuestOnly` layout routes guard pages.
- `auth:login` is demo-only (accepts any non-empty credentials); replace with a real auth service before shipping.
- Inline one-off parameter and prop types in the signature; no type alias unless reused.
- Use `React.PropsWithChildren` for components that accept children.
- Branding is uppercase `TARS` in the README and document titles; app header and tray use `Tars`.
- Import icons directly from `lucide-react`; no icon barrels, so tree-shaking survives.
- Packages ship TypeScript source (`@tars/tsconfig/source-package.json`); no build step.
- Workspaces depend on shared tooling via `workspace:*` and set `"prettier": "@tars/prettier"`.
- Each app's `eslint.config.js` lists every tsconfig in `parserOptions.project`; `apps/desktop` includes node, preload, and web.
- `clean` is per workspace (`git clean -xdf out .cache`); the root script runs `turbo run clean`.
