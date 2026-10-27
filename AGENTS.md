# Agent Instructions

## Package Manager

- Use **bun 1.4.4**; never npm, yarn, or pnpm.
- Versions shared by 2+ workspaces live in root `workspaces.catalog` and are referenced as `"catalog:"`; anything else is pinned in the owning workspace.

## Turborepo

- Do not assume Turborepo behavior from memory. Resolve the installed package with `node -p "require.resolve('turbo/package.json')"` and read its bundled docs before changing `turbo.json` or commands.
- The bundled docs match the installed version and work offline; heed deprecation notices.

## Electron

- Docs: https://www.electronjs.org/docs/latest/ (verify APIs against `electron.d.ts`), https://electron-vite.org/guide/, https://better-auth.com/docs/integrations/electron.
- The window is frameless (`frame: false`); window controls use `window:*` IPC exposed as `window.api.windowControls`.
- Tray app: closing hides the window, `before-quit` calls `markQuitting`, and the tray menu owns Quit.
- Dark-only: `nativeTheme.themeSource = 'dark'` in main, `class="dark"` on `<html>`, and `color-scheme: dark`.
- ESM app: main builds to `out/main/index.js`, preload to `out/preload/index.mjs`; reference the `.mjs` preload, keep `sandbox: false` with `contextIsolation` on.
- Auth runs in main (`src/lib/auth-client.ts`, `@better-auth/electron` + on-disk `storage()`): call `setupMain()` before ready; the renderer calls top-level bridges (`getSession`, `signIn`, `signUp`, `confirmSignOut`) and never sees cookies. The full session (user + session) crosses IPC; logout asks via native `dialog.showMessageBox`.
- Deep links use the `com.tars.desktop` scheme (electron-builder `protocols` + worker trusted origins); `setupRenderer()` in preload exposes the plugin bridges (`signOut`, `onUserUpdated`, `onAuthenticated`).
- Root `.env` feeds main/renderer through `envDir`; `VITE_BETTER_AUTH_URL` is baked at build time, so set it before packaging.
- Keep the renderer CSP in `apps/desktop/src/renderer/index.html`.

## Cloudflare Workers

- Workers APIs and limits change often. Retrieve current docs before KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents work: https://developers.cloudflare.com/workers/ (docs MCP: https://docs.mcp.cloudflare.com/mcp).
- Quotas live under `/platform/limits/`; product references under `/kv/`, `/r2/`, `/d1/`, `/durable-objects/`, `/queues/`, `/vectorize/`, `/workers-ai/`, `/agents/`.
- Local dev `bunx wrangler dev --env-file ../../.env`, deploy `bun run deploy` in `apps/server` (applies remote D1 migrations first); run `bun run typegen` after `wrangler.jsonc` changes and commit `worker-configuration.d.ts`.
- Required secrets are declared in `wrangler.jsonc` `secrets.required` — the source of truth for `Env` types; values come from the root `.env` locally and `wrangler secret put` when deployed.
- The Worker is a Hono app (`apps/server/src/index.ts`): trusted-origin CORS, better-auth at `/api/auth/*`, oRPC at `/api/rpc/*`. Schema is drizzle-managed: run `bun run generate` from the root (auth writes `packages/db/src/auth-schema.ts`, then drizzle-kit emits migrations), applied to D1 with apps/server's `migrate:local` / `migrate:remote`.
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
| Generate schema      | `bun run generate`                              |
| Apply local D1       | `cd apps/server && bun run migrate:local`       |
| Package desktop      | `cd apps/desktop && bun run build:win`          |
| Add shadcn component | `cd packages/ui && bunx shadcn add <component>` |

## Verify Before Reporting

`bun run format` → `bun run typecheck` → `bun run lint`. Add `--force` when editing `packages/*` or `tooling/*`; Turbo hashes a task on the workspace's own files, not its dependencies' source.

## Traps

- `typecheck` is `bun check` (Bun's TypeScript 7); catalog `typescript` 5.9.3 is only for editors and ESLint.
- `bun fmt` reads only the current directory's `.gitignore`; workspace scripts pass `--ignore-path ../../.gitignore`.
- Do not edit generated files: `packages/db/src/auth-schema.ts` (regenerate with `bun run generate`) or `worker-configuration.d.ts` (regenerate with `bun run typegen` in `apps/server`).
- `electron-vite dev` only rebuilds/restarts on main/preload changes with `--watch` (set in the dev script); restart once after changing config.
- Vite caches linked workspace package metadata: after changing a workspace package's `exports`, restart `electron-vite dev` and clear `apps/desktop/node_modules/.vite`.
- Electron 45 has no dependency postinstall; `apps/desktop` runs `install-electron` in its own `postinstall`.
- `packages/ui` needs `vite.config.ts` so the shadcn CLI detects a Vite project.
- Apps importing `@tars/ui/globals.css` must add `@source` for `packages/ui/src`, or Tailwind drops the package's classes.

## Key Conventions

- File and directory names are lowercase kebab-case; tool-dictated names excepted.
- Renderer pages live in `apps/desktop/src/renderer/src/pages/`; no `-page` suffix.
- Renderer routes live in `src/renderer/src/routes.tsx` (`createHashRouter`); Electron serves `file://`, so React Router framework/SPA history routing is unavailable.
- Global state lives in `src/renderer/src/stores/*` (Zustand); select multiple fields with `useShallow`.
- `stores/auth.ts` holds only the session; auth actions live in `src/renderer/src/lib/auth.ts`. Protected pages call `useUser()`, which reads the session from the `RequireAuth` outlet context — no null checks in pages.
- Preload exposes top-level bridges (`getSession`, `signIn`, `signUp`, `confirmSignOut`); `window.api` is window controls only.
- Shared zod schemas and string utils live in `@tars/core` (`schemas/*`, `utils/*`); IPC payloads use its `LoginInput`/`RegisterInput` types instead of re-validating in main.
- Inline one-off parameter and prop types in the signature; no type alias unless reused.
- Use `React.PropsWithChildren` for components that accept children.
- Branding is uppercase `TARS` in the README and document titles; app header and tray use `Tars`.
- Import icons directly from `lucide-react`; no icon barrels, so tree-shaking survives.
- Packages ship TypeScript source (`@tars/tsconfig/source-package.json`); no build step.
- Workspaces depend on shared tooling via `workspace:*` and set `"prettier": "@tars/prettier"`.
- ESLint configs (`eslint.config.js` or `.mjs`) list every tsconfig in `parserOptions.project`; `apps/desktop` includes node, preload, and web.
- `clean` scripts exist on desktop (`out .cache`) and server (`.wrangler .cache`); the root script runs `turbo run clean`.
