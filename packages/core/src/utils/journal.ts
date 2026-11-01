import type { ActivityEventOutput } from '../schemas/journal'

export function activityTitle(event: ActivityEventOutput): string {
  switch (event.type) {
    case 'task.done':
      return 'Task completed'
    case 'incident.opened':
      return 'Incident opened'
    case 'incident.approved':
      return 'Postmortem approved'
    case 'measure.completed':
      return 'Measurements completed'
  }
}

export function activityContent(event: ActivityEventOutput): string {
  if (event.type === 'measure.completed') {
    const photos = event.photoCount === 1 ? 'photo' : 'photos'
    const objects = event.objectCount === 1 ? 'object' : 'objects'

    return `${event.photoCount} ${photos} · ${event.objectCount} ${objects}`
  }

  return event.title
}

export function taskActivityId(todoId: string, dayKey: string): string {
  return `activity-task-${todoId}-${dayKey}`
}

export function activityId(event: ActivityEventOutput): string {
  switch (event.type) {
    case 'task.done':
      return taskActivityId(event.todoId, event.dayKey)
    case 'incident.opened':
      return `activity-incident-${event.incidentId}-opened`
    case 'incident.approved':
      return `activity-incident-${event.incidentId}-approved`
    case 'measure.completed':
      return `activity-measure-${event.runId}`
  }
}

export function activityTags(event: ActivityEventOutput): Array<string> {
  return ['activity', event.type.split('.')[0] ?? event.type]
}

export function activityIncidentId(activityEntryId: string): string | null {
  if (!activityEntryId.startsWith('activity-incident-')) return null

  return activityEntryId.slice('activity-incident-'.length).replace(/-(opened|approved)$/, '')
}

export type ActivityKind = 'task' | 'incident' | 'measure' | 'activity'

export function activityKind(tags: Array<string>): ActivityKind {
  const tag = tags.find((item) => item !== 'activity')

  return tag === 'task' || tag === 'incident' || tag === 'measure' ? tag : 'activity'
}
