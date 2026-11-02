export function groupByDay<T>(
  items: Array<T>,
  dayOf: (item: T) => string
): Array<{ key: string; label: string; items: Array<T> }> {
  const groups: Array<{ key: string; label: string; items: Array<T> }> = []

  for (const item of items) {
    const key = dayOf(item)
    const last = groups[groups.length - 1]

    if (last?.key === key) {
      last.items.push(item)
      continue
    }

    groups.push({ key, label: key, items: [item] })
  }

  return groups
}
