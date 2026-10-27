import type { Auth } from '@tars/auth/server'
import { getMigrations } from '@tars/auth/server'

export default async function handleMigrate(
  request: Request,
  token: string | undefined,
  auth: Auth
) {
  const presented = request.headers.get('authorization')?.slice('Bearer '.length)

  if (!token || presented !== token) {
    return new Response('Not Found', { status: 404 })
  }

  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options)

  if (toBeCreated.length === 0 && toBeAdded.length === 0) {
    return Response.json({ status: 'ok', created: [], updated: [] })
  }

  await runMigrations()

  return Response.json({
    status: 'ok',
    created: toBeCreated.map((table) => table.table),
    updated: toBeAdded.map((table) => table.table)
  })
}
