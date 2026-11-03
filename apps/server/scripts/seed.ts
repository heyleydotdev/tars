import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'

import { resolveSeedChoice } from './seed-target'
import { d1Query } from './wrangler'

// Asks first, then hands the chosen account to the Turbo task: Turbo does not
// forward stdin, so a prompt inside the task would hang.
const args = process.argv.slice(2)
const remote = args.includes('--remote')
const target = remote ? '--remote' : '--local'
const emailIndex = args.indexOf('--email')
let email = emailIndex >= 0 ? args[emailIndex + 1] : undefined

async function main(): Promise<void> {
  const accounts = d1Query<{ id: string; email: string }>(
    target,
    'SELECT id, email FROM user ORDER BY created_at DESC'
  )

  if (accounts.length === 0) {
    throw new Error('No accounts yet. Register in the app, then run seed again.')
  }

  if (!email) {
    console.log(`Accounts on the ${remote ? 'remote' : 'local'} database:`)

    for (const [index, account] of accounts.entries()) {
      console.log(`  ${index + 1}) ${account.email}  ${account.id}`)
    }

    const input = createInterface({ input: process.stdin, output: process.stdout })
    const eof = new Promise<null>((resolve) => input.once('close', () => resolve(null)))
    let account = null

    for (let attempt = 0; attempt < 3 && !account; attempt += 1) {
      const answer = await Promise.race([
        input.question(
          attempt === 0 ? 'Seed which account? Number, id, or email: ' : 'Not listed. Try again: '
        ),
        eof
      ])

      if (answer === null) break

      account = resolveSeedChoice(answer, accounts)
    }

    input.close()

    if (!account) throw new Error('No account chosen. Pass --email instead.')

    email = account.email
  }

  const result = spawnSync(
    'bun',
    [
      'x',
      'turbo',
      'run',
      remote ? 'seed:remote' : 'seed',
      '--filter=@tars/server',
      '--',
      '--email',
      email
    ],
    { stdio: 'inherit' }
  )

  process.exit(result.status ?? 1)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
