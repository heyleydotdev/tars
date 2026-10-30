export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function titleCase(value: string): string {
  return value.replace(/(^|[\s(])(\p{L})/gu, (_match, prefix: string, letter: string) => {
    return `${prefix}${letter.toUpperCase()}`
  })
}

export function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U'
  )
}

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
}

export function safeRedirect(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/'
}
