/**
 * Secrets set outside of the configuration (.env locally, `wrangler secret
 * put` remotely) never show up in the generated Env; declare them here.
 */
declare interface Env {
  BETTER_AUTH_SECRET?: string
  BETTER_AUTH_MIGRATE_TOKEN?: string
}
