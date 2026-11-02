import type {
  BlueprintDetailOutput,
  BlueprintEvidenceOutput,
  BlueprintListOutput,
  BlueprintQuestionOutput,
  BlueprintRequirementOutput,
  BlueprintSummaryOutput
} from '@tars/core/schemas/blueprint'
import type { BlueprintExtractionOutput } from '@tars/core/schemas/blueprint-ai'
import type { Database } from '@tars/db/client'
import type {
  BlueprintEvidenceSelect,
  BlueprintQuestionSelect,
  BlueprintRequirementSelect,
  BlueprintSelect
} from '@tars/db/schema'
import {
  BLUEPRINT_EVIDENCE_LIMIT,
  BLUEPRINT_QUESTION_LIMIT,
  BLUEPRINT_REQUIREMENT_LIMIT
} from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import {
  buildBlueprintDraftPrompt,
  buildBlueprintExtractionPrompt,
  buildBlueprintQuestionsPrompt,
  buildBlueprintReadinessPrompt
} from '@tars/core/prompts/blueprint'
import {
  addBlueprintEvidenceSchema,
  answerBlueprintQuestionSchema,
  blueprintEvidenceIdSchema,
  blueprintIdSchema,
  blueprintRequirementIdSchema,
  createBlueprintSchema,
  saveBlueprintDraftSchema,
  setBlueprintRequirementEnabledSchema
} from '@tars/core/schemas/blueprint'
import {
  blueprintDraftJsonSchema,
  blueprintExtractionJsonSchema,
  blueprintQuestionsJsonSchema,
  blueprintReadinessJsonSchema
} from '@tars/core/schemas/blueprint-ai'
import {
  parseBlueprintDraft,
  parseBlueprintExtraction,
  parseBlueprintQuestions,
  parseBlueprintReadiness
} from '@tars/core/utils/blueprint'
import {
  blueprint,
  blueprintEvidence,
  blueprintQuestion,
  blueprintRequirement
} from '@tars/db/schema'
import { and, asc, desc, eq, inArray, sql } from '@tars/db/sql'

import { openAiMiddleware, protectedProcedure } from '../context'
import { BadRequestError, GatewayError, NotFoundError } from '../errors'
import { runStructured } from '../lib/structured'

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

async function loadBlueprint(db: Database, userId: string, id: string): Promise<BlueprintSelect> {
  const [row] = await db
    .select()
    .from(blueprint)
    .where(and(eq(blueprint.id, id), eq(blueprint.userId, userId)))
    .limit(1)

  if (!row) throw new NotFoundError()

  return row
}

function serializeEvidence(row: BlueprintEvidenceSelect): BlueprintEvidenceOutput {
  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    summary: row.summary,
    hasImage: Boolean(row.imageKey),
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.toISOString()
  }
}

function serializeRequirement(row: BlueprintRequirementSelect): BlueprintRequirementOutput {
  return {
    id: row.id,
    area: row.area,
    text: row.text,
    status: row.status,
    confidence: row.confidence,
    sourceEvidenceIds: row.sourceEvidenceIds,
    enabled: row.enabled
  }
}

function serializeQuestion(row: BlueprintQuestionSelect): BlueprintQuestionOutput {
  return {
    id: row.id,
    text: row.text,
    rationale: row.rationale,
    gap: row.gap,
    status: row.status,
    answer: row.answer,
    answeredAt: iso(row.answeredAt),
    createdAt: row.createdAt.toISOString()
  }
}

function summary(
  row: BlueprintSelect,
  requirementCount: number,
  openQuestions: number
): BlueprintSummaryOutput {
  return {
    id: row.id,
    title: row.title,
    client: row.client,
    status: row.status,
    summary: row.summary,
    requirementCount,
    openQuestions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

async function loadDetail(
  db: Database,
  userId: string,
  id: string
): Promise<BlueprintDetailOutput> {
  const row = await loadBlueprint(db, userId, id)
  const [evidence, requirements, questions] = await Promise.all([
    db
      .select()
      .from(blueprintEvidence)
      .where(eq(blueprintEvidence.blueprintId, id))
      .orderBy(asc(blueprintEvidence.createdAt)),
    db
      .select()
      .from(blueprintRequirement)
      .where(eq(blueprintRequirement.blueprintId, id))
      .orderBy(asc(blueprintRequirement.sortOrder)),
    db
      .select()
      .from(blueprintQuestion)
      .where(eq(blueprintQuestion.blueprintId, id))
      .orderBy(asc(blueprintQuestion.createdAt))
  ])

  return {
    blueprint: summary(
      row,
      requirements.length,
      questions.filter((question) => question.status === 'open').length
    ),
    evidence: evidence.map(serializeEvidence),
    requirements: requirements.map(serializeRequirement),
    questions: questions.map(serializeQuestion),
    draft: row.draft
  }
}

async function answeredFacts(
  db: Database,
  blueprintId: string
): Promise<Array<{ question: string; answer: string }>> {
  const rows = await db
    .select({ question: blueprintQuestion.text, answer: blueprintQuestion.answer })
    .from(blueprintQuestion)
    .where(
      and(eq(blueprintQuestion.blueprintId, blueprintId), eq(blueprintQuestion.status, 'answered'))
    )
    .orderBy(desc(blueprintQuestion.answeredAt))
    .limit(BLUEPRINT_QUESTION_LIMIT)

  return rows.flatMap((row) => (row.answer ? [{ question: row.question, answer: row.answer }] : []))
}

async function requirementInputs(
  db: Database,
  blueprintId: string
): Promise<
  Array<{ id: string; area: string; status: string; text: string; sources: Array<string> }>
> {
  const rows = await db
    .select()
    .from(blueprintRequirement)
    .where(
      and(eq(blueprintRequirement.blueprintId, blueprintId), eq(blueprintRequirement.enabled, true))
    )
    .orderBy(asc(blueprintRequirement.sortOrder))

  return rows.map((row) => ({
    id: row.id,
    area: row.area,
    status: row.status,
    text: row.text,
    sources: row.sourceEvidenceIds
  }))
}

async function touch(db: Database, blueprintId: string): Promise<void> {
  await db.update(blueprint).set({ updatedAt: new Date() }).where(eq(blueprint.id, blueprintId))
}

export const blueprintRouter = {
  list: protectedProcedure.handler(async ({ context }): Promise<BlueprintListOutput> => {
    const rows = await context.db
      .select()
      .from(blueprint)
      .where(eq(blueprint.userId, context.session.user.id))
      .orderBy(desc(blueprint.updatedAt))
      .limit(50)
    const ids = rows.map((row) => row.id)
    const [requirements, questions] =
      ids.length === 0
        ? [[], []]
        : await Promise.all([
            context.db
              .select({
                blueprintId: blueprintRequirement.blueprintId,
                count: sql<number>`count(*)`
              })
              .from(blueprintRequirement)
              .where(inArray(blueprintRequirement.blueprintId, ids))
              .groupBy(blueprintRequirement.blueprintId),
            context.db
              .select({ blueprintId: blueprintQuestion.blueprintId, count: sql<number>`count(*)` })
              .from(blueprintQuestion)
              .where(
                and(
                  inArray(blueprintQuestion.blueprintId, ids),
                  eq(blueprintQuestion.status, 'open')
                )
              )
              .groupBy(blueprintQuestion.blueprintId)
          ])
    const requirementCounts = new Map(
      requirements.map((row) => [row.blueprintId, Number(row.count)])
    )
    const questionCounts = new Map(questions.map((row) => [row.blueprintId, Number(row.count)]))

    return {
      items: rows.map((row) =>
        summary(row, requirementCounts.get(row.id) ?? 0, questionCounts.get(row.id) ?? 0)
      )
    }
  }),

  get: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(blueprintIdSchema)
    .handler(async ({ input, context }): Promise<BlueprintDetailOutput> =>
      loadDetail(context.db, context.session.user.id, input.id)
    ),

  create: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError })
    .input(createBlueprintSchema)
    .handler(async ({ input, context }): Promise<BlueprintDetailOutput> => {
      const id = crypto.randomUUID()

      await context.db.insert(blueprint).values({
        id,
        userId: context.session.user.id,
        title: input.title,
        client: input.client
      })

      return loadDetail(context.db, context.session.user.id, id)
    }),

  remove: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(blueprintIdSchema)
    .handler(async ({ input, context }): Promise<void> => {
      const row = await loadBlueprint(context.db, context.session.user.id, input.id)

      await context.db.delete(blueprint).where(eq(blueprint.id, row.id))
    }),

  addEvidence: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError, NOT_FOUND: NotFoundError })
    .input(addBlueprintEvidenceSchema)
    .handler(async ({ input, context, errors }): Promise<BlueprintDetailOutput> => {
      const owner = await loadBlueprint(context.db, context.session.user.id, input.blueprintId)
      const [countRow] = await context.db
        .select({ count: sql<number>`count(*)` })
        .from(blueprintEvidence)
        .where(eq(blueprintEvidence.blueprintId, owner.id))

      if (Number(countRow?.count ?? 0) >= BLUEPRINT_EVIDENCE_LIMIT) {
        throw errors.BAD_REQUEST({ message: ERRORS.blueprintEvidenceFull })
      }

      await context.db.insert(blueprintEvidence).values({
        id: crypto.randomUUID(),
        blueprintId: owner.id,
        kind: input.kind,
        content: input.content,
        summary: input.kind === 'voice' ? input.content.slice(0, 160) : null,
        status: 'ready'
      })
      await touch(context.db, owner.id)

      return loadDetail(context.db, context.session.user.id, owner.id)
    }),

  removeEvidence: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(blueprintEvidenceIdSchema)
    .handler(async ({ input, context, errors }): Promise<BlueprintDetailOutput> => {
      const [row] = await context.db
        .select({ id: blueprintEvidence.id, blueprintId: blueprintEvidence.blueprintId })
        .from(blueprintEvidence)
        .innerJoin(blueprint, eq(blueprint.id, blueprintEvidence.blueprintId))
        .where(
          and(
            eq(blueprintEvidence.id, input.evidenceId),
            eq(blueprint.userId, context.session.user.id)
          )
        )
        .limit(1)

      if (!row) {
        throw errors.NOT_FOUND()
      }

      await context.db.delete(blueprintEvidence).where(eq(blueprintEvidence.id, row.id))
      await touch(context.db, row.blueprintId)

      return loadDetail(context.db, context.session.user.id, row.blueprintId)
    }),

  setRequirementEnabled: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(setBlueprintRequirementEnabledSchema)
    .handler(async ({ input, context, errors }): Promise<BlueprintDetailOutput> => {
      const [row] = await context.db
        .select({ id: blueprintRequirement.id, blueprintId: blueprintRequirement.blueprintId })
        .from(blueprintRequirement)
        .innerJoin(blueprint, eq(blueprint.id, blueprintRequirement.blueprintId))
        .where(
          and(
            eq(blueprintRequirement.id, input.requirementId),
            eq(blueprint.userId, context.session.user.id)
          )
        )
        .limit(1)

      if (!row) {
        throw errors.NOT_FOUND()
      }

      await context.db
        .update(blueprintRequirement)
        .set({ enabled: input.enabled })
        .where(eq(blueprintRequirement.id, row.id))
      await touch(context.db, row.blueprintId)

      return loadDetail(context.db, context.session.user.id, row.blueprintId)
    }),

  removeRequirement: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(blueprintRequirementIdSchema)
    .handler(async ({ input, context, errors }): Promise<BlueprintDetailOutput> => {
      const [row] = await context.db
        .select({ id: blueprintRequirement.id, blueprintId: blueprintRequirement.blueprintId })
        .from(blueprintRequirement)
        .innerJoin(blueprint, eq(blueprint.id, blueprintRequirement.blueprintId))
        .where(
          and(
            eq(blueprintRequirement.id, input.requirementId),
            eq(blueprint.userId, context.session.user.id)
          )
        )
        .limit(1)

      if (!row) {
        throw errors.NOT_FOUND()
      }

      await context.db.delete(blueprintRequirement).where(eq(blueprintRequirement.id, row.id))
      await touch(context.db, row.blueprintId)

      return loadDetail(context.db, context.session.user.id, row.blueprintId)
    }),

  extract: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError, NOT_FOUND: NotFoundError, BAD_GATEWAY: GatewayError })
    .input(blueprintIdSchema)
    .use(openAiMiddleware)
    .handler(async ({ input, context, errors }): Promise<BlueprintDetailOutput> => {
      const owner = await loadBlueprint(context.db, context.session.user.id, input.id)
      const evidenceRows = await context.db
        .select()
        .from(blueprintEvidence)
        .where(eq(blueprintEvidence.blueprintId, owner.id))
        .orderBy(asc(blueprintEvidence.createdAt))

      if (evidenceRows.length === 0) {
        throw errors.BAD_REQUEST({ message: ERRORS.blueprintNoEvidence })
      }

      const answers = await answeredFacts(context.db, owner.id)
      const evidence = evidenceRows.flatMap((row) =>
        row.kind !== 'answer' && row.content
          ? [{ id: row.id, kind: row.kind, text: row.content.slice(0, 4_000) }]
          : []
      )

      let extracted: BlueprintExtractionOutput

      try {
        const result = await runStructured(context.openAi, {
          name: 'blueprint_extraction',
          schema: blueprintExtractionJsonSchema as Record<string, unknown>,
          instructions: buildBlueprintExtractionPrompt({ evidence, answers }),
          input: 'Map the requirements from this evidence.',
          parse: parseBlueprintExtraction
        })

        extracted = result
      } catch (error) {
        console.error('blueprint extraction failed', error)
        throw new GatewayError({ message: ERRORS.blueprintExtractionFailed })
      }

      const evidenceIds = new Set(evidenceRows.map((row) => row.id))
      const requirements = extracted.requirements
        .flatMap((item) => {
          const sourceEvidenceIds = item.sourceEvidenceIds.filter((id) => evidenceIds.has(id))

          if (sourceEvidenceIds.length === 0 && item.status !== 'suggested') return []

          return [
            {
              id: crypto.randomUUID(),
              area: item.area,
              text: item.text,
              status: item.status,
              confidence: item.confidence,
              sourceEvidenceIds
            }
          ]
        })
        .slice(0, BLUEPRINT_REQUIREMENT_LIMIT)

      await context.db
        .delete(blueprintRequirement)
        .where(eq(blueprintRequirement.blueprintId, owner.id))

      if (requirements.length > 0) {
        await context.db.insert(blueprintRequirement).values(
          requirements.map((item, index) => ({
            ...item,
            blueprintId: owner.id,
            sortOrder: index
          }))
        )
      }

      await context.db
        .delete(blueprintQuestion)
        .where(
          and(eq(blueprintQuestion.blueprintId, owner.id), eq(blueprintQuestion.status, 'open'))
        )
      await context.db
        .update(blueprint)
        .set({
          summary: extracted.summary,
          status: 'mapped',
          draft: null,
          updatedAt: new Date()
        })
        .where(eq(blueprint.id, owner.id))

      return loadDetail(context.db, context.session.user.id, owner.id)
    }),

  findGaps: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError, NOT_FOUND: NotFoundError, BAD_GATEWAY: GatewayError })
    .input(blueprintIdSchema)
    .use(openAiMiddleware)
    .handler(async ({ input, context, errors }): Promise<BlueprintDetailOutput> => {
      const owner = await loadBlueprint(context.db, context.session.user.id, input.id)
      const requirements = await requirementInputs(context.db, owner.id)

      if (requirements.length === 0) {
        throw errors.BAD_REQUEST({ message: ERRORS.blueprintNoEvidence })
      }

      const answers = await answeredFacts(context.db, owner.id)

      try {
        const readiness = await runStructured(context.openAi, {
          name: 'blueprint_readiness',
          schema: blueprintReadinessJsonSchema as Record<string, unknown>,
          instructions: buildBlueprintReadinessPrompt({ requirements, answers }),
          input: 'Is this requirement map ready for a proposal?',
          parse: parseBlueprintReadiness
        })

        if (!readiness.enough && readiness.gaps.length > 0) {
          const drafted = await runStructured(context.openAi, {
            name: 'blueprint_questions',
            schema: blueprintQuestionsJsonSchema as Record<string, unknown>,
            instructions: buildBlueprintQuestionsPrompt({
              requirements,
              gaps: readiness.gaps,
              answers
            }),
            input: 'Ask the questions that close these gaps.',
            parse: parseBlueprintQuestions
          })

          await context.db
            .delete(blueprintQuestion)
            .where(
              and(eq(blueprintQuestion.blueprintId, owner.id), eq(blueprintQuestion.status, 'open'))
            )

          if (drafted.questions.length > 0) {
            await context.db.insert(blueprintQuestion).values(
              drafted.questions.map((question) => ({
                id: crypto.randomUUID(),
                blueprintId: owner.id,
                text: question.text,
                rationale: question.rationale,
                gap: question.gap
              }))
            )
          }

          await context.db
            .update(blueprint)
            .set({ status: 'mapped', draft: null, updatedAt: new Date() })
            .where(eq(blueprint.id, owner.id))
        } else {
          await context.db
            .delete(blueprintQuestion)
            .where(
              and(eq(blueprintQuestion.blueprintId, owner.id), eq(blueprintQuestion.status, 'open'))
            )
          await context.db
            .update(blueprint)
            .set({ status: owner.draft ? 'drafted' : 'ready', updatedAt: new Date() })
            .where(eq(blueprint.id, owner.id))
        }
      } catch (error) {
        console.error('blueprint readiness failed', error)
        throw new GatewayError({ message: ERRORS.blueprintExtractionFailed })
      }

      return loadDetail(context.db, context.session.user.id, owner.id)
    }),

  answerQuestion: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError, NOT_FOUND: NotFoundError })
    .input(answerBlueprintQuestionSchema)
    .handler(async ({ input, context, errors }): Promise<BlueprintDetailOutput> => {
      const [row] = await context.db
        .select({ id: blueprintQuestion.id, blueprintId: blueprintQuestion.blueprintId })
        .from(blueprintQuestion)
        .innerJoin(blueprint, eq(blueprint.id, blueprintQuestion.blueprintId))
        .where(
          and(
            eq(blueprintQuestion.id, input.questionId),
            eq(blueprintQuestion.status, 'open'),
            eq(blueprint.userId, context.session.user.id)
          )
        )
        .limit(1)

      if (!row) throw new NotFoundError()

      const [countRow] = await context.db
        .select({ count: sql<number>`count(*)` })
        .from(blueprintEvidence)
        .where(eq(blueprintEvidence.blueprintId, row.blueprintId))

      if (Number(countRow?.count ?? 0) >= BLUEPRINT_EVIDENCE_LIMIT) {
        throw errors.BAD_REQUEST({ message: ERRORS.blueprintEvidenceFull })
      }

      await context.db
        .update(blueprintQuestion)
        .set({ status: 'answered', answer: input.answer, answeredAt: new Date() })
        .where(eq(blueprintQuestion.id, row.id))
      await context.db.insert(blueprintEvidence).values({
        id: crypto.randomUUID(),
        blueprintId: row.blueprintId,
        kind: 'answer',
        content: input.answer,
        summary: input.answer,
        status: 'ready'
      })
      await context.db
        .update(blueprint)
        .set({ draft: null, updatedAt: new Date() })
        .where(eq(blueprint.id, row.blueprintId))

      return loadDetail(context.db, context.session.user.id, row.blueprintId)
    }),

  draft: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError, NOT_FOUND: NotFoundError, BAD_GATEWAY: GatewayError })
    .input(blueprintIdSchema)
    .use(openAiMiddleware)
    .handler(async ({ input, context, errors }): Promise<BlueprintDetailOutput> => {
      const owner = await loadBlueprint(context.db, context.session.user.id, input.id)
      const requirements = await requirementInputs(context.db, owner.id)

      if (requirements.length === 0) {
        throw errors.BAD_REQUEST({ message: ERRORS.blueprintNoEvidence })
      }

      const answers = await answeredFacts(context.db, owner.id)
      let draft: string

      try {
        const result = await runStructured(context.openAi, {
          name: 'blueprint_draft',
          schema: blueprintDraftJsonSchema as Record<string, unknown>,
          instructions: buildBlueprintDraftPrompt({
            title: owner.title,
            client: owner.client,
            requirements,
            answers
          }),
          input: 'Draft the proposal.',
          parse: parseBlueprintDraft
        })

        draft = result.draft
      } catch (error) {
        console.error('blueprint draft failed', error)
        throw new GatewayError({ message: ERRORS.blueprintDraftFailed })
      }

      await context.db
        .update(blueprint)
        .set({ draft, status: 'drafted', updatedAt: new Date() })
        .where(eq(blueprint.id, owner.id))

      return loadDetail(context.db, context.session.user.id, owner.id)
    }),

  saveDraft: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(saveBlueprintDraftSchema)
    .handler(async ({ input, context }): Promise<BlueprintDetailOutput> => {
      const owner = await loadBlueprint(context.db, context.session.user.id, input.blueprintId)

      await context.db
        .update(blueprint)
        .set({ draft: input.draft, updatedAt: new Date() })
        .where(eq(blueprint.id, owner.id))

      return loadDetail(context.db, context.session.user.id, owner.id)
    })
}
