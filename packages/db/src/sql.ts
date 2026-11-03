// Single entry point for drizzle query builders and operators used across
// the workspace (eq, and, sql, ...). Only @tars/db depends on drizzle-orm
// directly; everything else imports from here.
export * from 'drizzle-orm/sql'

// Schema introspection, so scripts and tests can reason about table and column
// names instead of repeating them.
export { getTableColumns, getTableName, is } from 'drizzle-orm'
export { SQLiteTable } from 'drizzle-orm/sqlite-core'
