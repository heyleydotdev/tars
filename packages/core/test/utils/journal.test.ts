import { describe, expect, it } from 'bun:test'

import type { ActivityEventOutput } from '../../src/schemas/journal'
import {
  activityContent,
  activityId,
  activityIncidentId,
  activityTags,
  activityTitle,
  taskActivityId
} from '../../src/utils/journal'

const task: ActivityEventOutput = {
  type: 'task.done',
  todoId: 'todo-1',
  title: 'Pay rent',
  dayKey: '2026-11-01',
  occurredAt: '2026-11-01T10:00:00.000Z'
}

const opened: ActivityEventOutput = {
  type: 'incident.opened',
  incidentId: 'incident-1',
  title: 'Checkout latency spike',
  occurredAt: '2026-11-01T10:00:00.000Z'
}

const approved: ActivityEventOutput = {
  type: 'incident.approved',
  incidentId: 'incident-1',
  title: 'Checkout latency spike',
  occurredAt: '2026-11-01T11:00:00.000Z'
}

const measured: ActivityEventOutput = {
  type: 'measure.completed',
  runId: 'run-1',
  photoCount: 2,
  objectCount: 1,
  occurredAt: '2026-11-01T12:00:00.000Z'
}

describe('activity ids', () => {
  it('builds deterministic ids per event type', () => {
    expect(taskActivityId('todo-1', '2026-11-01')).toBe('activity-task-todo-1-2026-11-01')
    expect(activityId(task)).toBe('activity-task-todo-1-2026-11-01')
    expect(activityId(opened)).toBe('activity-incident-incident-1-opened')
    expect(activityId(approved)).toBe('activity-incident-incident-1-approved')
    expect(activityId(measured)).toBe('activity-measure-run-1')
  })
})

describe('activity rendering', () => {
  it('titles every event kind', () => {
    expect(activityTitle(task)).toBe('Task completed')
    expect(activityTitle(opened)).toBe('Incident opened')
    expect(activityTitle(approved)).toBe('Postmortem approved')
    expect(activityTitle(measured)).toBe('Measurements completed')
  })

  it('uses the event title except for measurements', () => {
    expect(activityContent(task)).toBe('Pay rent')
    expect(activityContent(opened)).toBe('Checkout latency spike')
    expect(activityContent(measured)).toBe('2 photos · 1 object')
  })

  it('pluralizes measurement counts', () => {
    expect(
      activityContent({
        type: 'measure.completed',
        runId: 'run-2',
        photoCount: 1,
        objectCount: 0,
        occurredAt: '2026-11-01T12:00:00.000Z'
      })
    ).toBe('1 photo · 0 objects')
  })

  it('tags the kind with the activity prefix', () => {
    expect(activityTags(task)).toEqual(['activity', 'task'])
    expect(activityTags(opened)).toEqual(['activity', 'incident'])
    expect(activityTags(measured)).toEqual(['activity', 'measure'])
  })
})

describe('activityIncidentId', () => {
  it('extracts the incident from opened and approved rows', () => {
    expect(activityIncidentId('activity-incident-incident-1-opened')).toBe('incident-1')
    expect(activityIncidentId('activity-incident-incident-1-approved')).toBe('incident-1')
  })

  it('returns null for other activity rows', () => {
    expect(activityIncidentId('activity-task-todo-1-2026-11-01')).toBeNull()
    expect(activityIncidentId('note-1')).toBeNull()
  })
})
