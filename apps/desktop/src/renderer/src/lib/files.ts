import { ERRORS } from '@tars/core/errors'
import { fileApiPath } from '@tars/core/utils/files'

import { apiBaseUrl, authHeaders } from './orpc'

export function fileUrl(key: string): string {
  return new URL(fileApiPath(key), apiBaseUrl).toString()
}

export function fileSrc(url: string): string {
  return new URL(url, apiBaseUrl).toString()
}

export async function uploadFile(key: string, blob: Blob): Promise<void> {
  const response = await fetch(fileUrl(key), {
    method: 'POST',
    headers: {
      'content-type': blob.type || 'image/jpeg',
      ...(await authHeaders())
    },
    body: blob
  })

  if (!response.ok) throw new Error(ERRORS.uploadFailed)
}

export async function deleteFile(key: string): Promise<void> {
  const response = await fetch(fileUrl(key), { method: 'DELETE', headers: await authHeaders() })

  if (!response.ok && response.status !== 404) throw new Error(ERRORS.tryAgain)
}
