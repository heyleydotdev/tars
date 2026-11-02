import type OpenAI from 'openai'

import type {
  IncidentAnalysisOutput,
  IncidentDetailOutput,
  IncidentEventOutput,
  IncidentEvidenceOutput,
  IncidentEvidenceUploadOutput,
  IncidentImageUrlOutput,
  IncidentQuestionOutput,
  IncidentSummaryOutput
} from '@tars/core/schemas/incident'
import type { FileBucket, FileObject } from '@tars/core/services/files'
import type { Database } from '@tars/db/client'
import type {
  IncidentAnalysisSelect,
  IncidentEventInsert,
  IncidentEventSelect,
  IncidentEvidenceSelect,
  IncidentQuestionSelect,
  IncidentSelect
} from '@tars/db/schema'
import {
  INCIDENT_EVENT_LIMIT,
  INCIDENT_EVIDENCE_LIMIT,
  INCIDENT_QUESTION_LIMIT
} from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import {
  buildIncidentExtractionPrompt,
  buildIncidentMergePrompt,
  buildIncidentPostmortemPrompt,
  buildIncidentQuestionsPrompt,
  buildIncidentReadinessPrompt,
  buildIncidentRepairPrompt,
  buildIncidentRootCausePrompt
} from '@tars/core/prompts/incident'
import {
  addIncidentEvidenceSchema,
  answerIncidentQuestionSchema,
  createIncidentSchema,
  incidentEvidenceIdSchema,
  incidentIdSchema,
  incidentPromptSchema,
  saveIncidentPostmortemSchema,
  updateIncidentEventSchema
} from '@tars/core/schemas/incident'
import {
  incidentExtractionJsonSchema,
  incidentMergeJsonSchema,
  incidentQuestionsJsonSchema,
  incidentReadinessJsonSchema,
  incidentRootCauseJsonSchema
} from '@tars/core/schemas/incident-ai'
import { deleteFiles, signFileKey } from '@tars/core/services/files'
import { fileKey, signedFilePath } from '@tars/core/utils/files'
import { formatZonedIso } from '@tars/core/utils/format'
import {
  parseIncidentExtraction,
  parseIncidentMerge,
  parseIncidentQuestions,
  parseIncidentReadiness,
  parseIncidentRootCause,
  parseIncidentTime,
  sanitizeIncidentEvents,
  sanitizeIncidentRootCause
} from '@tars/core/utils/incident'
import {
  incident,
  incidentAnalysis,
  incidentEvent,
  incidentEvidence,
  incidentQuestion
} from '@tars/db/schema'
import { and, asc, desc, eq, inArray, sql } from '@tars/db/sql'

import { openAiMiddleware, protectedProcedure } from '../context'
import { BadRequestError, GatewayError, NotFoundError } from '../errors'
import { runStructured, runText } from '../lib/structured'

const runIncidentStructured = <T>(
  openAi: OpenAI,
  options: Parameters<typeof runStructured<T>>[1]
): Promise<T> =>
  runStructured(openAi, {
    ...options,
    repair: (issues, input, output) => buildIncidentRepairPrompt({ issues, input, output })
  })

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function serializeEvidence(row: IncidentEvidenceSelect): IncidentEvidenceOutput {
  return {
    id: row.id,
    kind: row.kind,
    source: row.source,
    content: row.content,
    hasImage: Boolean(row.imageKey),
    occurredAt: iso(row.occurredAt),
    timeSource: row.timeSource ?? null,
    timeNote: row.timeNote,
    summary: row.summary,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.toISOString()
  }
}

function serializeEvent(row: IncidentEventSelect): IncidentEventOutput {
  return {
    id: row.id,
    occurredAt: iso(row.occurredAt),
    timeSource: row.timeSource ?? null,
    description: row.description,
    confidence: row.confidence,
    sourceEvidenceIds: row.sourceEvidenceIds,
    sortOrder: row.sortOrder
  }
}

function serializeQuestion(row: IncidentQuestionSelect): IncidentQuestionOutput {
  return {
    id: row.id,
    text: row.text,
    rationale: row.rationale,
    gap: row.gap,
    status: row.status,
    kind: row.kind,
    options: row.options,
    answer: row.answer,
    answeredAt: iso(row.answeredAt),
    createdAt: row.createdAt.toISOString()
  }
}

function serializeAnalysis(row: IncidentAnalysisSelect): IncidentAnalysisOutput {
  return {
    outcome: row.outcome,
    rootCause: row.rootCause,
    confidence: row.confidence,
    supportingEventIds: row.supportingEventIds,
    alternatives: row.alternatives,
    postmortem: row.postmortem,
    status: row.status,
    approvedAt: iso(row.approvedAt),
    updatedAt: row.updatedAt.toISOString()
  }
}

type IncidentRow = IncidentSelect

async function loadIncident(
  db: Database,
  userId: string,
  incidentId: string
): Promise<IncidentRow> {
  const [row] = await db
    .select()
    .from(incident)
    .where(and(eq(incident.id, incidentId), eq(incident.userId, userId)))
    .limit(1)

  if (!row) throw new NotFoundError()

  return row
}

async function loadDetail(
  db: Database,
  userId: string,
  incidentId: string
): Promise<IncidentDetailOutput> {
  const row = await loadIncident(db, userId, incidentId)
  const [evidenceRows, eventRows, questionRows, analysisRows, counts] = await Promise.all([
    db
      .select()
      .from(incidentEvidence)
      .where(eq(incidentEvidence.incidentId, incidentId))
      .orderBy(asc(incidentEvidence.createdAt)),
    db
      .select()
      .from(incidentEvent)
      .where(eq(incidentEvent.incidentId, incidentId))
      .orderBy(asc(incidentEvent.sortOrder)),
    db
      .select()
      .from(incidentQuestion)
      .where(eq(incidentQuestion.incidentId, incidentId))
      .orderBy(asc(incidentQuestion.createdAt)),
    db.select().from(incidentAnalysis).where(eq(incidentAnalysis.incidentId, incidentId)).limit(1),
    db
      .select({ count: sql<number>`count(*)` })
      .from(incidentEvidence)
      .where(eq(incidentEvidence.incidentId, incidentId))
  ])

  const summary: IncidentSummaryOutput = {
    id: row.id,
    title: row.title,
    status: row.status,
    summary: row.summary,
    evidenceCount: Number(counts[0]?.count ?? 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }

  return {
    incident: summary,
    evidence: evidenceRows.map(serializeEvidence),
    events: eventRows.map(serializeEvent),
    questions: questionRows.map(serializeQuestion),
    analysis: analysisRows[0] ? serializeAnalysis(analysisRows[0]) : null
  }
}

async function touchIncident(
  db: Database,
  incidentId: string,
  patch: { summary?: string | null } = {}
): Promise<void> {
  await db
    .update(incident)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(incident.id, incidentId))
}

function timelineInput(rows: Array<IncidentEventSelect>, timezone?: string) {
  return rows.map((row) => ({
    id: row.id,
    occurredAt: row.occurredAt ? formatZonedIso(row.occurredAt, timezone).value : null,
    timeSource: row.timeSource ?? null,
    description: row.description,
    confidence: row.confidence,
    sourceEvidenceIds: row.sourceEvidenceIds
  }))
}

function evidenceInput(
  rows: Array<IncidentEvidenceSelect>,
  timezone?: string
): Array<{ id: string; kind: string; summary: string | null; occurredAt: string | null }> {
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    summary: row.summary,
    occurredAt: row.occurredAt ? formatZonedIso(row.occurredAt, timezone).value : null
  }))
}

async function insertEvents(db: Database, rows: Array<IncidentEventInsert>): Promise<void> {
  for (let index = 0; index < rows.length; index += 10) {
    await db.insert(incidentEvent).values(rows.slice(index, index + 10))
  }
}

async function dataUrlFromFile(object: FileObject): Promise<string> {
  const bytes = new Uint8Array(await new Response(object.body).arrayBuffer())
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return `data:${object.httpMetadata?.contentType ?? 'image/jpeg'};base64,${btoa(binary)}`
}

async function deleteImages(bucket: FileBucket, keys: Array<string>): Promise<void> {
  await deleteFiles(bucket, keys).catch((error: unknown) => {
    console.error('incident image cleanup failed', error)
  })
}

async function mergeTimeline(
  openAi: OpenAI,
  db: Database,
  incidentId: string,
  timezone?: string
): Promise<void> {
  const [evidenceRows, eventRows] = await Promise.all([
    db
      .select()
      .from(incidentEvidence)
      .where(eq(incidentEvidence.incidentId, incidentId))
      .orderBy(asc(incidentEvidence.createdAt)),
    db
      .select()
      .from(incidentEvent)
      .where(eq(incidentEvent.incidentId, incidentId))
      .orderBy(asc(incidentEvent.sortOrder))
  ])

  if (eventRows.length === 0) {
    await touchIncident(db, incidentId, { summary: null })

    return
  }

  const merged = await runIncidentStructured(openAi, {
    name: 'incident_merge',
    schema: incidentMergeJsonSchema as Record<string, unknown>,
    instructions: buildIncidentMergePrompt({
      evidence: evidenceInput(evidenceRows, timezone),
      events: timelineInput(eventRows, timezone)
    }),
    input: 'Merge the events above into one timeline.',
    parse: parseIncidentMerge
  })
  const evidenceIds = new Set(evidenceRows.map((row) => row.id))
  const events = sanitizeIncidentEvents(merged.events, evidenceIds)

  if (events.length === 0) {
    throw new Error('merge returned no usable events')
  }

  const previousIds = eventRows.map((row) => row.id)

  await insertEvents(
    db,
    events.map((event, index) => ({
      id: crypto.randomUUID(),
      incidentId,
      occurredAt: parseIncidentTime(event.occurredAt),
      timeSource: event.timeSource,
      description: event.description,
      confidence: event.confidence,
      sourceEvidenceIds: event.sourceEvidenceIds,
      sortOrder: index
    }))
  )

  // Readiness only reads the timeline, so an answer the model merged away would
  // be asked for again forever. Keep every answer as an event of its own.
  const described = new Set(events.map((event) => event.description.trim().toLowerCase()))
  const seen = new Set<string>()
  const answers = evidenceRows.filter((row) => {
    if (row.kind !== 'answer' || !row.summary) return false

    const text = row.summary.trim().toLowerCase()

    if (described.has(text) || seen.has(text)) return false

    seen.add(text)

    return true
  })

  if (answers.length > 0) {
    await insertEvents(
      db,
      answers.map((row, index) => ({
        id: crypto.randomUUID(),
        incidentId,
        occurredAt: null,
        timeSource: 'user',
        description: row.summary ?? '',
        confidence: 'high',
        sourceEvidenceIds: [row.id],
        sortOrder: events.length + index
      }))
    )
  }

  await db
    .delete(incidentEvent)
    .where(and(eq(incidentEvent.incidentId, incidentId), inArray(incidentEvent.id, previousIds)))

  // A changed timeline invalidates the previous conclusion and its citations.
  await db.delete(incidentAnalysis).where(eq(incidentAnalysis.incidentId, incidentId))

  await touchIncident(db, incidentId, { summary: merged.summary })
}

export const incidentRouter = {
  list: protectedProcedure.handler(
    async ({ context }): Promise<{ items: Array<IncidentSummaryOutput> }> => {
      const rows = await context.db
        .select()
        .from(incident)
        .where(eq(incident.userId, context.session.user.id))
        .orderBy(desc(incident.updatedAt))
        .limit(50)

      if (rows.length === 0) return { items: [] }

      const counts = await context.db
        .select({ incidentId: incidentEvidence.incidentId, count: sql<number>`count(*)` })
        .from(incidentEvidence)
        .where(
          inArray(
            incidentEvidence.incidentId,
            rows.map((row) => row.id)
          )
        )
        .groupBy(incidentEvidence.incidentId)
      const byIncident = new Map(counts.map((row) => [row.incidentId, Number(row.count)]))

      return {
        items: rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          summary: row.summary,
          evidenceCount: byIncident.get(row.id) ?? 0,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString()
        }))
      }
    }
  ),

  create: protectedProcedure
    .input(createIncidentSchema)
    .handler(async ({ input, context }): Promise<IncidentDetailOutput> => {
      const id = crypto.randomUUID()

      await context.db.insert(incident).values({
        id,
        userId: context.session.user.id,
        title: input.title
      })

      return loadDetail(context.db, context.session.user.id, id)
    }),

  get: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(incidentIdSchema)
    .handler(async ({ input, context }): Promise<IncidentDetailOutput> =>
      loadDetail(context.db, context.session.user.id, input.incidentId)
    ),

  imageUrl: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(incidentEvidenceIdSchema)
    .handler(async ({ input, context }): Promise<IncidentImageUrlOutput> => {
      const [row] = await context.db
        .select({ imageKey: incidentEvidence.imageKey })
        .from(incidentEvidence)
        .innerJoin(incident, eq(incident.id, incidentEvidence.incidentId))
        .where(
          and(
            eq(incidentEvidence.id, input.evidenceId),
            eq(incident.userId, context.session.user.id)
          )
        )
        .limit(1)

      if (!row?.imageKey) throw new NotFoundError()

      const signature = await signFileKey(context.fileSecret, row.imageKey)

      return { url: signedFilePath(row.imageKey, signature) }
    }),

  evidenceUpload: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(incidentIdSchema)
    .handler(async ({ input, context }): Promise<IncidentEvidenceUploadOutput> => {
      const owner = await loadIncident(context.db, context.session.user.id, input.incidentId)
      const evidenceId = crypto.randomUUID()

      return {
        evidenceId,
        imageKey: fileKey('incident', context.session.user.id, owner.id, `${evidenceId}.jpg`)
      }
    }),

  remove: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(incidentIdSchema)
    .handler(async ({ input, context }): Promise<void> => {
      const row = await loadIncident(context.db, context.session.user.id, input.incidentId)
      const images = await context.db
        .select({ imageKey: incidentEvidence.imageKey })
        .from(incidentEvidence)
        .where(eq(incidentEvidence.incidentId, row.id))
      const keys = images.flatMap((item) => (item.imageKey ? [item.imageKey] : []))

      await context.db.delete(incident).where(eq(incident.id, row.id))

      await deleteImages(context.files, keys)
    }),

  addEvidence: protectedProcedure
    .errors({
      NOT_FOUND: NotFoundError,
      BAD_REQUEST: BadRequestError,
      BAD_GATEWAY: GatewayError
    })
    .input(addIncidentEvidenceSchema)
    .use(openAiMiddleware)
    .handler(async ({ input, context, errors }): Promise<IncidentDetailOutput> => {
      const owner = await loadIncident(context.db, context.session.user.id, input.incidentId)
      const evidenceId = input.evidenceId ?? crypto.randomUUID()
      const id = owner.id

      const [countRow] = await context.db
        .select({ count: sql<number>`count(*)` })
        .from(incidentEvidence)
        .where(eq(incidentEvidence.incidentId, id))

      if (Number(countRow?.count ?? 0) >= INCIDENT_EVIDENCE_LIMIT) {
        throw errors.BAD_REQUEST({ message: ERRORS.incidentEvidenceFull })
      }

      if (input.evidenceId) {
        const [existing] = await context.db
          .select({ id: incidentEvidence.id })
          .from(incidentEvidence)
          .where(eq(incidentEvidence.id, evidenceId))
          .limit(1)

        if (existing) throw errors.BAD_REQUEST({ message: ERRORS.uploadRejected })
      }

      let imageKey: string | null = null
      let image: string | null = null

      if (input.kind === 'screenshot' && input.imageKey) {
        const expected = fileKey('incident', context.session.user.id, id, `${evidenceId}.jpg`)

        if (input.imageKey !== expected) {
          throw errors.BAD_REQUEST({ message: ERRORS.uploadRejected })
        }

        const object = await context.files.get(input.imageKey)

        if (!object) throw errors.BAD_REQUEST({ message: ERRORS.uploadMissing })

        imageKey = input.imageKey
        image = await dataUrlFromFile(object)
      }

      const occurredAt = parseIncidentTime(input.occurredAt)

      await context.db.insert(incidentEvidence).values({
        id: evidenceId,
        incidentId: id,
        kind: input.kind,
        source: 'upload',
        content: input.content,
        imageKey,
        occurredAt,
        timeSource: occurredAt ? 'user' : null,
        status: 'pending'
      })

      const [existingEvents] = await context.db
        .select({ count: sql<number>`count(*)` })
        .from(incidentEvent)
        .where(eq(incidentEvent.incidentId, id))
      const offset = Number(existingEvents?.count ?? 0)

      try {
        if (!image && !input.content) {
          throw new Error(ERRORS.incidentEvidenceRequired)
        }

        const extraction = await runIncidentStructured(context.openAi, {
          name: 'incident_extraction',
          schema: incidentExtractionJsonSchema as Record<string, unknown>,
          instructions: buildIncidentExtractionPrompt({
            now: new Date(),
            incidentStartedAt: owner.createdAt,
            kind: input.kind,
            content: input.content,
            fileName: null,
            timezone: input.timezone
          }),
          input: image
            ? [
                {
                  type: 'message',
                  role: 'user',
                  content: [
                    { type: 'input_text', text: 'Extract incident events from this screenshot.' },
                    { type: 'input_image', image_url: image, detail: 'auto' }
                  ]
                }
              ]
            : 'Extract incident events from the evidence above.',
          parse: parseIncidentExtraction
        })

        const timed = extraction.events.find((event) => parseIncidentTime(event.occurredAt))
        const evidenceTime = occurredAt ?? parseIncidentTime(timed?.occurredAt ?? null)
        const evidenceSource = occurredAt
          ? 'user'
          : (timed?.timeSource ?? extraction.events[0]?.timeSource ?? null)

        await context.db
          .update(incidentEvidence)
          .set({
            status: 'ready',
            summary: extraction.summary,
            timeNote: extraction.timeNote,
            occurredAt: evidenceTime,
            timeSource: evidenceSource
          })
          .where(eq(incidentEvidence.id, evidenceId))

        if (extraction.events.length > 0) {
          await insertEvents(
            context.db,
            extraction.events.slice(0, INCIDENT_EVENT_LIMIT).map((event, index) => ({
              id: crypto.randomUUID(),
              incidentId: id,
              occurredAt: parseIncidentTime(event.occurredAt),
              timeSource: event.timeSource,
              description: event.description,
              confidence: event.confidence,
              sourceEvidenceIds: [evidenceId],
              sortOrder: offset + index
            }))
          )
        }

        await touchIncident(context.db, id)
      } catch {
        await context.db
          .update(incidentEvidence)
          .set({ status: 'error', error: ERRORS.incidentExtractionFailed })
          .where(eq(incidentEvidence.id, evidenceId))
        await touchIncident(context.db, id)
      }

      return loadDetail(context.db, context.session.user.id, id)
    }),

  removeEvidence: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(incidentEvidenceIdSchema)
    .handler(async ({ input, context }): Promise<IncidentDetailOutput> => {
      const [row] = await context.db
        .select({
          id: incidentEvidence.id,
          incidentId: incidentEvidence.incidentId,
          imageKey: incidentEvidence.imageKey
        })
        .from(incidentEvidence)
        .innerJoin(incident, eq(incident.id, incidentEvidence.incidentId))
        .where(
          and(
            eq(incidentEvidence.id, input.evidenceId),
            eq(incident.userId, context.session.user.id)
          )
        )
        .limit(1)

      if (!row) throw new NotFoundError()

      await context.db.delete(incidentEvidence).where(eq(incidentEvidence.id, row.id))

      if (row.imageKey) await deleteImages(context.files, [row.imageKey])

      const events = await context.db
        .select()
        .from(incidentEvent)
        .where(eq(incidentEvent.incidentId, row.incidentId))

      for (const event of events) {
        const sourceEvidenceIds = event.sourceEvidenceIds.filter((id) => id !== row.id)

        if (sourceEvidenceIds.length === 0) {
          await context.db.delete(incidentEvent).where(eq(incidentEvent.id, event.id))
        } else if (sourceEvidenceIds.length !== event.sourceEvidenceIds.length) {
          await context.db
            .update(incidentEvent)
            .set({ sourceEvidenceIds })
            .where(eq(incidentEvent.id, event.id))
        }
      }

      await touchIncident(context.db, row.incidentId)

      return loadDetail(context.db, context.session.user.id, row.incidentId)
    }),

  rebuildTimeline: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError, BAD_GATEWAY: GatewayError })
    .input(incidentPromptSchema)
    .use(openAiMiddleware)
    .handler(async ({ input, context }): Promise<IncidentDetailOutput> => {
      const owner = await loadIncident(context.db, context.session.user.id, input.incidentId)

      try {
        await mergeTimeline(context.openAi, context.db, owner.id, input.timezone)
      } catch (error) {
        console.error('incident merge failed', error)
        throw new GatewayError({ message: ERRORS.incidentMergeFailed })
      }

      return loadDetail(context.db, context.session.user.id, owner.id)
    }),

  updateEvent: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(updateIncidentEventSchema)
    .handler(async ({ input, context }): Promise<IncidentDetailOutput> => {
      const [row] = await context.db
        .select({ id: incidentEvent.id, incidentId: incidentEvent.incidentId })
        .from(incidentEvent)
        .innerJoin(incident, eq(incident.id, incidentEvent.incidentId))
        .where(
          and(eq(incidentEvent.id, input.eventId), eq(incident.userId, context.session.user.id))
        )
        .limit(1)

      if (!row) throw new NotFoundError()

      const occurredAt = parseIncidentTime(input.occurredAt)

      await context.db
        .update(incidentEvent)
        .set({ occurredAt, timeSource: occurredAt ? 'user' : null })
        .where(eq(incidentEvent.id, row.id))
      await touchIncident(context.db, row.incidentId)

      return loadDetail(context.db, context.session.user.id, row.incidentId)
    }),

  findRootCause: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError, BAD_REQUEST: BadRequestError, BAD_GATEWAY: GatewayError })
    .input(incidentPromptSchema)
    .use(openAiMiddleware)
    .handler(async ({ input, context, errors }): Promise<IncidentDetailOutput> => {
      const owner = await loadIncident(context.db, context.session.user.id, input.incidentId)
      const eventRows = await context.db
        .select()
        .from(incidentEvent)
        .where(eq(incidentEvent.incidentId, owner.id))
        .orderBy(asc(incidentEvent.sortOrder))

      if (eventRows.length === 0) {
        throw errors.BAD_REQUEST({ message: ERRORS.incidentTimelineEmpty })
      }

      const timeline = timelineInput(eventRows, input.timezone)
      const answered = await context.db
        .select({ question: incidentQuestion.text, answer: incidentQuestion.answer })
        .from(incidentQuestion)
        .where(
          and(eq(incidentQuestion.incidentId, owner.id), eq(incidentQuestion.status, 'answered'))
        )
        .orderBy(desc(incidentQuestion.answeredAt))
        .limit(INCIDENT_QUESTION_LIMIT)
      const answers = answered.flatMap((row) =>
        row.answer ? [{ question: row.question, answer: row.answer }] : []
      )

      try {
        const readiness = await runIncidentStructured(context.openAi, {
          name: 'incident_readiness',
          schema: incidentReadinessJsonSchema as Record<string, unknown>,
          instructions: buildIncidentReadinessPrompt({ events: timeline, answers }),
          input: 'Is this timeline ready for a root cause?',
          parse: parseIncidentReadiness
        })

        if (!readiness.enough && readiness.gaps.length > 0) {
          const drafted = await runIncidentStructured(context.openAi, {
            name: 'incident_questions',
            schema: incidentQuestionsJsonSchema as Record<string, unknown>,
            instructions: buildIncidentQuestionsPrompt({
              events: timeline,
              gaps: readiness.gaps,
              answers
            }),
            input: 'Ask the questions that close these gaps.',
            parse: parseIncidentQuestions
          })

          await context.db
            .delete(incidentQuestion)
            .where(
              and(eq(incidentQuestion.incidentId, owner.id), eq(incidentQuestion.status, 'open'))
            )
          await context.db.delete(incidentAnalysis).where(eq(incidentAnalysis.incidentId, owner.id))

          if (drafted.questions.length > 0) {
            await context.db.insert(incidentQuestion).values(
              drafted.questions.map((question) => {
                const options = [
                  ...new Set(question.options.map((option) => option.trim()).filter(Boolean))
                ]

                return {
                  id: crypto.randomUUID(),
                  incidentId: owner.id,
                  text: question.text,
                  rationale: question.rationale,
                  gap: question.gap,
                  kind:
                    question.kind === 'select' && options.length === 0 ? 'short' : question.kind,
                  options: question.kind === 'select' && options.length > 0 ? options : null
                }
              })
            )
          }

          await touchIncident(context.db, owner.id)

          return loadDetail(context.db, context.session.user.id, owner.id)
        }

        const proposed = await runIncidentStructured(context.openAi, {
          name: 'incident_root_cause',
          schema: incidentRootCauseJsonSchema as Record<string, unknown>,
          instructions: buildIncidentRootCausePrompt({ events: timeline, answers }),
          input: 'Propose the most likely root cause, or say the evidence is inconclusive.',
          parse: parseIncidentRootCause
        })
        const cause = sanitizeIncidentRootCause(proposed, new Set(eventRows.map((row) => row.id)))

        let postmortem: string | null = null

        if (cause.outcome === 'proposed') {
          postmortem = (
            await runText(context.openAi, {
              instructions: buildIncidentPostmortemPrompt({
                events: timeline,
                rootCause: cause.rootCause,
                confidence: cause.confidence,
                alternatives: cause.alternatives
              }),
              input: 'Draft the postmortem in markdown.'
            })
          ).slice(0, 20_000)
        }

        await context.db
          .delete(incidentQuestion)
          .where(
            and(eq(incidentQuestion.incidentId, owner.id), eq(incidentQuestion.status, 'open'))
          )
        await context.db.delete(incidentAnalysis).where(eq(incidentAnalysis.incidentId, owner.id))
        await context.db.insert(incidentAnalysis).values({
          id: crypto.randomUUID(),
          incidentId: owner.id,
          outcome: cause.outcome,
          rootCause: cause.rootCause,
          confidence: cause.confidence,
          supportingEventIds: cause.supportingEventIds,
          alternatives: cause.alternatives,
          postmortem,
          status: 'draft'
        })
        await touchIncident(context.db, owner.id)

        return loadDetail(context.db, context.session.user.id, owner.id)
      } catch (error) {
        console.error('incident analysis failed', error)
        throw errors.BAD_GATEWAY({ message: ERRORS.incidentAnalysisFailed })
      }
    }),

  answerQuestion: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError, BAD_REQUEST: BadRequestError })
    .input(answerIncidentQuestionSchema)
    .handler(async ({ input, context, errors }): Promise<IncidentDetailOutput> => {
      const [row] = await context.db
        .select({ id: incidentQuestion.id, incidentId: incidentQuestion.incidentId })
        .from(incidentQuestion)
        .innerJoin(incident, eq(incident.id, incidentQuestion.incidentId))
        .where(
          and(
            eq(incidentQuestion.id, input.questionId),
            eq(incident.userId, context.session.user.id)
          )
        )
        .limit(1)

      if (!row) throw new NotFoundError()

      const [countRow] = await context.db
        .select({ count: sql<number>`count(*)` })
        .from(incidentEvidence)
        .where(eq(incidentEvidence.incidentId, row.incidentId))

      if (Number(countRow?.count ?? 0) >= INCIDENT_EVIDENCE_LIMIT) {
        throw errors.BAD_REQUEST({ message: ERRORS.incidentEvidenceFull })
      }

      const evidenceId = crypto.randomUUID()
      const answeredAt = new Date()

      await context.db
        .update(incidentQuestion)
        .set({ status: 'answered', answer: input.answer, answeredAt })
        .where(eq(incidentQuestion.id, row.id))

      await context.db.insert(incidentEvidence).values({
        id: evidenceId,
        incidentId: row.incidentId,
        kind: 'answer',
        source: 'user',
        content: input.answer,
        occurredAt: null,
        timeSource: null,
        summary: input.answer,
        status: 'ready'
      })

      await touchIncident(context.db, row.incidentId)

      return loadDetail(context.db, context.session.user.id, row.incidentId)
    }),

  savePostmortem: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(saveIncidentPostmortemSchema)
    .handler(async ({ input, context }): Promise<IncidentDetailOutput> => {
      const owner = await loadIncident(context.db, context.session.user.id, input.incidentId)

      await context.db
        .update(incidentAnalysis)
        .set({ postmortem: input.postmortem, updatedAt: new Date(), status: 'draft' })
        .where(eq(incidentAnalysis.incidentId, owner.id))
      await touchIncident(context.db, owner.id)

      return loadDetail(context.db, context.session.user.id, owner.id)
    }),

  approvePostmortem: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(saveIncidentPostmortemSchema)
    .handler(async ({ input, context }): Promise<IncidentDetailOutput> => {
      const owner = await loadIncident(context.db, context.session.user.id, input.incidentId)

      const [row] = await context.db
        .update(incidentAnalysis)
        .set({
          postmortem: input.postmortem,
          status: 'approved',
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(incidentAnalysis.incidentId, owner.id))
        .returning({ id: incidentAnalysis.id })

      if (!row) throw new NotFoundError()

      await touchIncident(context.db, owner.id)

      return loadDetail(context.db, context.session.user.id, owner.id)
    })
}
