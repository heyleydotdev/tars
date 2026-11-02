export type FileObject = {
  body: ReadableStream
  httpMetadata?: { contentType?: string }
}

export type FileBucket = {
  put: (
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } }
  ) => Promise<unknown>
  get: (key: string) => Promise<FileObject | null>
  delete: (key: string | Array<string>) => Promise<void>
}

export const FILE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const MAX_FILE_BYTES = 25 * 1024 * 1024

type SigningKey = Awaited<ReturnType<typeof crypto.subtle.importKey>>

const encoder = new TextEncoder()
const keys = new Map<string, Promise<SigningKey>>()

function signingKey(secret: string): Promise<SigningKey> {
  let key = keys.get(secret)

  if (!key) {
    key = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    )
    keys.set(secret, key)
  }

  return key
}

function payload(key: string): ArrayBuffer {
  return encoder.encode(`v1:${key}`).buffer as ArrayBuffer
}

function toBase64Url(bytes: ArrayBuffer): string {
  let value = ''

  for (const byte of new Uint8Array(bytes)) value += String.fromCharCode(byte)

  return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromBase64Url(value: string): ArrayBuffer {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return buffer
}

export async function signFileKey(secret: string, key: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), payload(key))

  return toBase64Url(signature)
}

export async function verifyFileKey(
  secret: string,
  key: string,
  signature: string
): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await signingKey(secret),
      fromBase64Url(signature),
      payload(key)
    )
  } catch {
    return false
  }
}

export async function deleteFiles(bucket: FileBucket, keys: Array<string>): Promise<void> {
  if (keys.length === 0) return

  await bucket.delete(keys)
}
