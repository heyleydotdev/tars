import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'

import { ERRORS } from '@tars/core/errors'
import { FILE_CONTENT_TYPES, MAX_FILE_BYTES, verifyFileKey } from '@tars/core/services/files'
import { fileKeyOwner, isFilePath } from '@tars/core/utils/files'

import type { AppEnv } from '../env'

const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await c.get('auth').api.getSession({ headers: c.req.raw.headers })

  if (!session) return c.text(ERRORS.unauthorized, 401)

  c.set('session', session)

  await next()
})

function canWrite(key: string, userId: string): boolean {
  return isFilePath(key) && fileKeyOwner(key) === userId
}

function matchesEtag(header: string, etag: string): boolean {
  return header
    .split(',')
    .map((value) => value.trim().replace(/^W\//, ''))
    .some((value) => value === '*' || value === etag)
}

export const fileRoutes = new Hono<AppEnv>()

fileRoutes.get('/:key{.+}', async (c) => {
  const key = c.req.param('key')
  const signature = c.req.query('sig')

  if (!isFilePath(key)) return c.text(ERRORS.notFound, 404)

  if (!signature) return c.text(ERRORS.forbidden, 403)

  const valid = await verifyFileKey(c.env.FILE_SIGNING_SECRET, key, signature)

  if (!valid) return c.text(ERRORS.forbidden, 403)

  const ifNoneMatch = c.req.header('if-none-match')

  if (ifNoneMatch) {
    const meta = await c.env.FILES.head(key)

    if (!meta) return c.text(ERRORS.notFound, 404)

    if (matchesEtag(ifNoneMatch, meta.httpEtag)) {
      return c.body(null, 304, { etag: meta.httpEtag })
    }
  }

  const object = await c.env.FILES.get(key)

  if (!object) return c.text(ERRORS.notFound, 404)

  const etag = object.httpEtag

  return c.body(object.body, 200, {
    'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'content-length': String(object.size),
    'cache-control': 'private, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    etag
  })
})

fileRoutes.post(
  '/:key{.+}',
  requireSession,
  bodyLimit({
    maxSize: MAX_FILE_BYTES,
    onError: (c) => c.text(ERRORS.imageTooLarge, 413)
  }),
  async (c) => {
    const session = c.get('session')
    const key = c.req.param('key')

    if (!session || !canWrite(key, session.user.id)) {
      return c.text(ERRORS.uploadRejected, 403)
    }

    const contentType = c.req.header('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''

    if (!FILE_CONTENT_TYPES.includes(contentType)) {
      return c.text(ERRORS.imageTypeInvalid, 415)
    }

    const body = await c.req.arrayBuffer()

    if (body.byteLength === 0) return c.text(ERRORS.imageUnreadable, 400)

    await c.env.FILES.put(key, body, { httpMetadata: { contentType } })

    return c.json({ key }, 201)
  }
)

fileRoutes.delete('/:key{.+}', requireSession, async (c) => {
  const session = c.get('session')
  const key = c.req.param('key')

  if (!session || !canWrite(key, session.user.id)) {
    return c.text(ERRORS.uploadRejected, 403)
  }

  await c.env.FILES.delete(key)

  return c.body(null, 204)
})
