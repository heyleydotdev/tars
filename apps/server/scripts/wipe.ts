import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'

// Confirmation happens here, before Turbo starts: Turbo does not forward stdin
// to the task, so a prompt inside it would hang.
const remote = process.argv.includes('--remote')
const target = remote ? 'the remote database' : 'the local database'

const input = createInterface({ input: process.stdin, output: process.stdout })
const answer = await input.question(
  `Wipe ${target}? Every task, note, expense, chat, blueprint, incident and usage row is deleted. Accounts stay. Type "wipe" to confirm: `
)
input.close()

if (answer.trim() !== 'wipe') {
  console.log('Aborted, nothing deleted.')
  process.exit(1)
}

const result = spawnSync(
  'bun',
  ['x', 'turbo', 'run', remote ? 'wipe:remote' : 'wipe', '--filter=@tars/server'],
  { stdio: 'inherit' }
)

process.exit(result.status ?? 1)
