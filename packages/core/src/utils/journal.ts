import type { ActionActivityAction, ActivityEventOutput } from '../schemas/journal'

const ACTION_TITLES: Record<ActionActivityAction, string> = {
  'incident.deleted': 'Incident deleted',
  'incident.evidence.added': 'Evidence added',
  'incident.evidence.removed': 'Evidence removed',
  'incident.rootcause': 'Root cause found',
  'incident.answered': 'Question answered',
  'incident.time.fixed': 'Event time fixed',
  'incident.timeline.rebuilt': 'Timeline rebuilt',
  'blueprint.created': 'Blueprint created',
  'blueprint.deleted': 'Blueprint deleted',
  'blueprint.evidence.added': 'Blueprint evidence added',
  'blueprint.evidence.removed': 'Blueprint evidence removed',
  'blueprint.mapped': 'Requirements mapped',
  'blueprint.gaps': 'Gaps found',
  'blueprint.answered': 'Blueprint question answered',
  'blueprint.requirement.toggled': 'Requirement updated',
  'blueprint.requirement.removed': 'Requirement removed',
  'blueprint.drafted': 'Proposal drafted',
  'blueprint.hierarchy': 'Hierarchy generated',
  'blueprint.flow': 'Flow generated',
  'measure.deleted': 'Measurement deleted',
  'ui.created': 'UI review created',
  'ui.explained': 'Screen explained',
  'ui.redesign': 'Redesign generated',
  'ui.deleted': 'UI review deleted',
  'task.updated': 'Task updated',
  'task.deleted': 'Task deleted',
  'reminder.updated': 'Reminder updated',
  'reminder.done': 'Reminder done',
  'reminder.deleted': 'Reminder deleted',
  'expense.updated': 'Expense updated',
  'expense.deleted': 'Expense deleted'
}

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
    case 'action':
      return ACTION_TITLES[event.action]
  }
}

export function activityContent(event: ActivityEventOutput): string {
  if (event.type === 'measure.completed') {
    const photos = event.photoCount === 1 ? 'photo' : 'photos'
    const objects = event.objectCount === 1 ? 'object' : 'objects'

    return `${event.photoCount} ${photos} · ${event.objectCount} ${objects}`
  }

  if (event.type === 'action') return event.detail ?? event.title

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
    case 'action':
      return `activity-${event.action.replaceAll('.', '-')}-${event.entityId}`
  }
}

export function activityTags(event: ActivityEventOutput): Array<string> {
  if (event.type === 'action') {
    return ['activity', event.action.split('.')[0] ?? 'activity']
  }

  return ['activity', event.type.split('.')[0] ?? event.type]
}

export function activityIncidentId(activityEntryId: string): string | null {
  if (!activityEntryId.startsWith('activity-incident-')) return null

  return activityEntryId.slice('activity-incident-'.length).replace(/-(opened|approved)$/, '')
}

export function parseTagList(value: string): Array<string> {
  return [
    ...new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ]
}

export type ActivityKind =
  'task' | 'incident' | 'measure' | 'reminder' | 'expense' | 'blueprint' | 'ui' | 'activity'

export function activityKind(tags: Array<string>): ActivityKind {
  const tag = tags.find((item) => item !== 'activity')

  return tag === 'task' ||
    tag === 'incident' ||
    tag === 'measure' ||
    tag === 'reminder' ||
    tag === 'expense' ||
    tag === 'blueprint' ||
    tag === 'ui'
    ? tag
    : 'activity'
}
