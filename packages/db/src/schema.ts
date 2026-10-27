// Better-auth tables are generated into this package by @tars/auth
// (`bun run generate`); re-export them and add app tables here. `createDb`
// reads this module as the schema, so anything exported from it becomes part
// of the typed `Database`.
export * from './auth-schema'
