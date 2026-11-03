import { spawnSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// scripts/ -> apps/server, so wrangler finds wrangler.jsonc no matter where the
// caller ran from.
export const serverDir = dirname(dirname(fileURLToPath(import.meta.url)))

function wrangler(args: Array<string>) {
  return spawnSync('bun', ['x', 'wrangler', 'd1', 'execute', 'DB', ...args], {
    cwd: serverDir,
    encoding: 'utf8'
  })
}

function failure(result: ReturnType<typeof wrangler>): Error {
  const text =
    result.stderr.trim() ||
    result.stdout.trim() ||
    result.error?.message ||
    'wrangler d1 execute failed'

  return new Error(text)
}

export function d1Query<T>(target: string, sql: string): Array<T> {
  const result = wrangler([target, '--json', '--command', sql])

  if (result.status !== 0) throw failure(result)

  const parsed = JSON.parse(result.stdout) as Array<{ results?: Array<T> }>

  return parsed[0]?.results ?? []
}

export function d1File(target: string, file: string): void {
  const result = wrangler([target, `--file=${file}`])

  if (result.status !== 0) throw failure(result)
}
