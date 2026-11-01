const FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

const FILE_PATH = new RegExp(
  `^[a-z][a-z0-9-]*/[A-Za-z0-9_-]{1,64}/[A-Za-z0-9_-]{1,64}/[A-Za-z0-9_-]{1,80}\\.(${FILE_EXTENSIONS.join('|')})$`
)

/**
 * Keys are `scope/owner/parent/file.ext`. The owner segment is what the file
 * routes check against the session, so it is always the user id.
 */
export function fileKey(scope: string, userId: string, parentId: string, name: string): string {
  return `${scope}/${userId}/${parentId}/${name}`
}

export function isFilePath(key: string): boolean {
  return FILE_PATH.test(key)
}

export function fileKeyOwner(key: string): string | null {
  return key.split('/')[1] ?? null
}

export function fileApiPath(key: string): string {
  return `/api/files/${key}`
}

export function signedFilePath(key: string, signature: string): string {
  return `${fileApiPath(key)}?sig=${encodeURIComponent(signature)}`
}
