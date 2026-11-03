<p align="center">
  <img src="apps/desktop/build/icon.png" width="88" alt="Tars app icon">
</p>

<h1 align="center">TARS</h1>

<p align="center">
  A desktop notebook that turns notes and chats into records you can act on.
</p>

Tars is an Electron desktop app with a React renderer, a Hono API on Cloudflare Workers, D1 for
data, R2 for images. You type or talk; the app extracts tasks, reminders, expenses and journal
entries, then keeps them editable. The same workspace handles the less personal work: measuring
objects in photos, reconstructing incidents from evidence, turning client notes into a blueprint,
and critiquing a screenshot into a redesigned page.

## What it does

**Notebook**

- **Desk** - one chat that becomes your records: todos, reminders, expenses and journal entries,
  written as you talk and editable afterwards.
- **Journal** - one day at a time: agenda, notes with moods and tags, plus a feed of what the app
  did for you.
- **Expenses** - ledger with category breakdown, month calendar, multiple currencies.
- **Stats** - spend and activity over time.

**Developer Kit**

- **Blueprints** - drop in client notes, screenshots, or voice memos; get requirements, gaps,
  targeted questions, a hierarchy, a user flow and a drafted proposal.
- **Incidents** - add evidence as it arrives; get a timeline linked to evidence, targeted questions
  when the picture is incomplete, a root cause with rejected alternatives and a postmortem draft to
  approve. Every claim points at the evidence it came from.
- **UI Review** - upload a screenshot, get a critique ranked by severity and a redesigned HTML page,
  with every changed area outlined and explained.
- **Measure** - measure objects in a photo taken from above against a reference card, then export
  PNG, ZIP or CSV.

Everything is dark and works from the keyboard (`⌘K` / `Ctrl+K` for search). It is metered: **Usage**
shows tokens and cost per call against the configured limit.

## Architecture

```
┌──────────────────────────── Electron ────────────────────────────┐
│  main        auth session (better-auth), window, tray, deep links │
│  preload     session/auth bridges, window controls                │
│  renderer    React 19 + react-router + TanStack Query + Zustand   │
└───────────────┬──────────────────────────────────────────────────┘
                │  oRPC over HTTP  ·  WebSocket for streaming
┌───────────────▼──────────────── Cloudflare Worker ───────────────┐
│  Hono        /api/auth/*  better-auth                            │
│              /api/rpc/*   oRPC router                            │
│              /api/ws      streaming chat                         │
│              /api/files/* signed image URLs                      │
│  D1 + Drizzle · R2 objects · Meta model API                      │
└──────────────────────────────────────────────────────────────────┘
```

- Auth runs in the Worker; the Electron main process owns the session cookie and exposes it to the
  renderer through preload bridges, so the renderer never touches cookies.
- Shared Zod schemas in `packages/core` define both the wire contracts and the UI types, so a
  renderer and a route cannot drift apart.
- The AI calls live in server routes (`packages/api/src/routes`), with structured output, schema
  validation and guardrails on the server - for example, an incident root cause with no surviving
  evidence links is forced to `inconclusive`.

## Getting started

This is the whole path from a fresh clone to a running, populated app. Everything runs on your
machine - the API, the D1 database and the images live in `apps/server/.wrangler` - so the only
outside account you need is the AI key.

### 1. Install Bun

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

`bun --version` should print `1.4.4` or newer. Node `>= 24` is only needed by editors and ESLint.

### 2. Install dependencies

```bash
bun install
```

The desktop workspace downloads Electron here (~100 MB), so the first install takes a minute.

### 3. Create the environment file

```bash
cp .env.example .env
```

Fill in the two secrets, then add your AI key. The URLs already point at the local server.

```bash
openssl rand -base64 32   # paste into BETTER_AUTH_SECRET
openssl rand -base64 32   # paste into FILE_SIGNING_SECRET
```

| Variable               | Value                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`   | Random 32+ characters; signs sessions.                                                   |
| `FILE_SIGNING_SECRET`  | Another random string; signs image URLs.                                                 |
| `BETTER_AUTH_URL`      | `http://localhost:3001`                                                                  |
| `VITE_BETTER_AUTH_URL` | `http://localhost:3001`                                                                  |
| `META_AI_API`          | Key for the Meta model endpoint: chat, blueprints, incidents, UI review, measure, voice. |

> [!TIP]
> Without `META_AI_API` the app still starts and Journal, Expenses, Stats, seed and wipe work - only
> the AI actions return an error. Add the key when you have one.

### 4. Create the local database

```bash
cd apps/server
bun run migrate:local
cd ../..
```

No Cloudflare login is needed: this creates a local D1 database, backed by SQLite, under
`apps/server/.wrangler`.

### 5. Start the app

```bash
bun run dev
```

Turbo starts the Worker on `http://localhost:3001` and opens the Electron app; both tasks show in
its terminal UI - one place for every log. Wait for `Ready on`; the window logs in against that
server.

Closing the window hides Tars to the tray; quit it from the tray menu.

### 6. Create an account

In the window, register with any name, email and password. Accounts live in your local database:
no email verification, nothing leaves the machine.

### 7. Load the demo data

Leave the app running and open a second terminal:

```bash
bun run seed
```

It lists the accounts in the local database and asks which one gets the data - answer with the
number, the id, or the email, usually the account you just created. Then switch to another page and
back so the views refetch.

### 8. Click through the app

1. **Desk** - ask it to plan something; the reply turns into tasks and reminders.
2. **Journal** - today's agenda, the notes and the activity feed of what the app did.
3. **Expenses** and **Stats** - the seeded ledger, category split and spend over time.
4. **Blueprints** - open "Client portal redesign": requirements, gaps, hierarchy, flow, draft.
5. **Incidents** - open "Checkout 502s after deploy": evidence, timeline, root cause, postmortem.
6. **UI Review** - upload a screenshot to critique; generation needs `META_AI_API`.
7. **Measure** - pick a reference and upload a photo taken from above; detection needs `META_AI_API`.
8. **Usage** - tokens and cost per call against the limit.

### If something goes wrong

- **The window cannot reach the server** - check that `BETTER_AUTH_URL` and `VITE_BETTER_AUTH_URL`
  are both `http://localhost:3001` and that the server terminal says it is ready.
- **`Address already in use` on port 3001** - stop the old server, or change `dev.port` in
  `apps/server/wrangler.jsonc` and both URLs in `.env`.
- **Electron binary missing after install** - `cd apps/desktop && bun run postinstall`.
- **`bun run seed` says "No accounts yet"** - register in the app first (step 6).
- **`bun run seed` lists many accounts** - a dev database from earlier sessions; pass
  `--email you@example.com`.
- **AI actions fail** - `META_AI_API` is empty or invalid; everything else keeps working.
- **Start over** - `bun run wipe` clears the data but keeps accounts; deleting
  `apps/server/.wrangler` and repeating step 4 resets the database completely.

### Demo data

`bun run seed` fills one account with a chat, journal notes, tasks, expenses, a blueprint, an
incident and usage events. It asks which account gets the data, because a dev database usually
holds test accounts too; pass `--email you@example.com` to skip the question. Running it again
replaces the seed rows instead of duplicating them.

`bun run wipe` deletes everything the app shows and keeps accounts, logins and the measure presets
that ship with the app. It asks you to type `wipe` first. Both commands accept `:remote` to target
the deployed database (`bun run seed:remote`, `bun run wipe:remote`).

### Deploy the server

```bash
cd apps/server

# once: create the resources, then paste the ids into wrangler.jsonc
bunx wrangler d1 create tars-db
bunx wrangler r2 bucket create tars-files

# once per secret
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put FILE_SIGNING_SECRET
bunx wrangler secret put BETTER_AUTH_URL
bunx wrangler secret put META_AI_API

# every deploy: applies remote D1 migrations, then deploys
bun run deploy
```

Update `BETTER_AUTH_TRUSTED_ORIGINS` and `USAGE_LIMIT_USD` in `wrangler.jsonc` `vars`.

### Package the desktop app

```bash
cd apps/desktop
bun run build:win     # or build:mac / build:linux
```

> [!NOTE]
> `VITE_BETTER_AUTH_URL` is inlined at build time. Set it to the deployed Worker before packaging;
> changing `.env` later does not affect an already packaged app.

## Commands

| Task                  | Command                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| Install               | `bun install`                                                            |
| Checks                | `bun run test` · `bun run typecheck` · `bun run lint` · `bun run format` |
| Both dev servers      | `bun run dev`                                                            |
| One workspace task    | `bunx turbo <task> --filter=@tars/<name>`                                |
| Desktop / server dev  | `bunx turbo dev --filter=@tars/desktop` · `--filter=@tars/server`        |
| Seed / wipe demo data | `bun run seed` · `bun run wipe`                                          |
| Schema change         | `bun run generate`, then `bun run migrate:local` in `apps/server`        |
| Package desktop       | `cd apps/desktop && bun run build:win`                                   |
| Add a UI component    | `cd packages/ui && bunx shadcn add <component>`                          |

`typecheck` is Bun's TypeScript checker; the catalog `typescript` is only for editors and ESLint.

## Project layout

```
apps/
  desktop/   Electron main (auth, window, tray), preload bridges, React renderer
  server/    Hono Worker: auth, oRPC, signed files, D1/R2 bindings, seed and wipe scripts
packages/
  api/       oRPC router, routes, AI pipeline helpers
  auth/      better-auth server and client setup
  core/      shared Zod schemas, prompts, pure utils, server services
  db/        Drizzle schema, migrations, query helpers
  ui/        components built with shadcn, markdown, code highlighting
tooling/     ESLint, Prettier and tsconfig presets
```

Tests live in `<workspace>/test` and run with Vitest: `@tars/core` (schemas and utils), `@tars/api`
(routes), `@tars/server` (Worker with real D1/R2 bindings), `@tars/desktop` (components and renderer
logic) plus a visual regression suite (`cd apps/desktop && bun run test:visual`).

Conventions for working in the repo - package manager, task layout, Electron and Workers rules - are
in [AGENTS.md](AGENTS.md).
