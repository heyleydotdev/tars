export const DIAGRAM_LINE = '#3f3f46'
export const DIAGRAM_TEXT = '#e4e4e7'
export const DIAGRAM_MUTED = '#a1a1aa'

export function wrapSvgText(text: string, maxChars: number): [string, string | null] {
  if (text.length <= maxChars) return [text, null]

  const cut = text.lastIndexOf(' ', maxChars)
  const first = text.slice(0, cut > 0 ? cut : maxChars)
  const rest = text.slice(first.length).trim()

  if (rest.length <= maxChars) return [first, rest]

  return [first, `${rest.slice(0, maxChars - 1)}…`]
}
