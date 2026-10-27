import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  casing: 'snake_case'
  // Migrations are applied with `wrangler d1 migrations apply`, which needs no
  // credentials here: it reads the D1 binding from the app's wrangler config
  // and authenticates with the wrangler login or CLOUDFLARE_API_TOKEN.
  //
  // `drizzle-kit migrate` would instead need a remote driver plus credentials,
  // per https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit:
  //
  //   driver: "d1-http",
  //   dbCredentials: {
  //     accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  //     databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
  //     token: process.env.CLOUDFLARE_D1_TOKEN!,
  //   },
})
