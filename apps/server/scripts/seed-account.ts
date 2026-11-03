import { randomUUID } from 'node:crypto'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { pickSeedAccount, seedSqlFor } from './seed-target'
import { d1File, d1Query, serverDir } from './wrangler'

// Turbo task: it never prompts, because Turbo does not forward stdin. The
// account arrives from `bun run seed` as --email.
const args = process.argv.slice(2)
const remote = args.includes('--remote')
const target = remote ? '--remote' : '--local'
const emailIndex = args.indexOf('--email')
const email = emailIndex >= 0 ? args[emailIndex + 1] : undefined

function main(): void {
  if (!email) throw new Error('Run this through `bun run seed`, which asks which account to fill.')

  const accounts = d1Query<{ id: string; email: string }>(
    target,
    'SELECT id, email FROM user ORDER BY created_at DESC'
  )
  const account = pickSeedAccount(accounts, email)
  const sql = seedSqlFor(readFileSync(join(serverDir, 'scripts/seed.sql'), 'utf8'), account.id)
  const file = join(tmpdir(), `tars-seed-${randomUUID()}.sql`)

  try {
    writeFileSync(file, sql)
    d1File(target, file)
  } finally {
    rmSync(file, { force: true })
  }

  console.log(
    `Seeded demo data for ${account.email} on the ${remote ? 'remote' : 'local'} database.`
  )
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
