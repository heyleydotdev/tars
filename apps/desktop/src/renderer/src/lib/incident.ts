import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  AddIncidentEvidenceInput,
  AnswerIncidentQuestionInput,
  CreateIncidentInput,
  IncidentDetailOutput,
  IncidentEvidenceIdInput,
  IncidentIdInput,
  IncidentListOutput,
  SaveIncidentPostmortemInput,
  UpdateIncidentEventInput
} from '@tars/core/schemas/incident'

import { deleteFile, uploadFile } from './files'
import { orpc } from './orpc'

const incidentsKey = orpc.incident.list.queryKey()

export function getTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function useIncidents(initialData?: IncidentListOutput) {
  return useQuery({ ...orpc.incident.list.queryOptions(), initialData })
}

export function useIncident(incidentId: string, initialData?: IncidentDetailOutput) {
  return useQuery({
    ...orpc.incident.get.queryOptions({ input: { incidentId } }),
    initialData
  })
}

function useIncidentMutation<TInput>(
  mutationFn: (input: TInput) => Promise<IncidentDetailOutput>,
  incidentId: (input: TInput) => string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (detail, input) => {
      queryClient.setQueryData(
        orpc.incident.get.queryKey({ input: { incidentId: incidentId(input) } }),
        detail
      )
      void queryClient.invalidateQueries({ queryKey: incidentsKey })
    }
  })
}

export function useCreateIncident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateIncidentInput) => orpc.incident.create.call(input),
    onSuccess: (detail) => {
      queryClient.setQueryData(
        orpc.incident.get.queryKey({ input: { incidentId: detail.incident.id } }),
        detail
      )
      void queryClient.invalidateQueries({ queryKey: incidentsKey })
    }
  })
}

export function useDeleteIncident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IncidentIdInput) => orpc.incident.remove.call(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: incidentsKey })
  })
}

export function useAddIncidentEvidence() {
  return useIncidentMutation(
    (input: AddIncidentEvidenceInput) =>
      orpc.incident.addEvidence.call({ ...input, timezone: getTimeZone() }),
    (input) => input.incidentId
  )
}

export async function addIncidentScreenshot(
  incidentId: string,
  image: Blob
): Promise<IncidentDetailOutput> {
  const { evidenceId, imageKey } = await orpc.incident.evidenceUpload.call({ incidentId })

  try {
    await uploadFile(imageKey, image)

    return await orpc.incident.addEvidence.call({
      incidentId,
      evidenceId,
      imageKey,
      kind: 'screenshot',
      timezone: getTimeZone()
    })
  } catch (error) {
    await deleteFile(imageKey).catch(() => undefined)
    throw error
  }
}

export function useAddIncidentScreenshot() {
  return useIncidentMutation(
    (input: { incidentId: string; image: Blob }) =>
      addIncidentScreenshot(input.incidentId, input.image),
    (input) => input.incidentId
  )
}

export function useRemoveIncidentEvidence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IncidentEvidenceIdInput) => orpc.incident.removeEvidence.call(input),
    onSuccess: (detail) => {
      queryClient.setQueryData(
        orpc.incident.get.queryKey({ input: { incidentId: detail.incident.id } }),
        detail
      )
      void queryClient.invalidateQueries({ queryKey: incidentsKey })
    }
  })
}

export function useRebuildIncidentTimeline() {
  return useIncidentMutation(
    (input: IncidentIdInput) =>
      orpc.incident.rebuildTimeline.call({ ...input, timezone: getTimeZone() }),
    (input) => input.incidentId
  )
}

export function useUpdateIncidentEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateIncidentEventInput) => orpc.incident.updateEvent.call(input),
    onSuccess: (detail) => {
      queryClient.setQueryData(
        orpc.incident.get.queryKey({ input: { incidentId: detail.incident.id } }),
        detail
      )
    }
  })
}

export function useFindIncidentRootCause() {
  return useIncidentMutation(
    (input: IncidentIdInput) =>
      orpc.incident.findRootCause.call({ ...input, timezone: getTimeZone() }),
    (input) => input.incidentId
  )
}

export function useAnswerIncidentQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AnswerIncidentQuestionInput) => orpc.incident.answerQuestion.call(input),
    onSuccess: (detail) => {
      queryClient.setQueryData(
        orpc.incident.get.queryKey({ input: { incidentId: detail.incident.id } }),
        detail
      )
      void queryClient.invalidateQueries({ queryKey: incidentsKey })
    }
  })
}

export function useSaveIncidentPostmortem() {
  return useIncidentMutation(
    (input: SaveIncidentPostmortemInput) => orpc.incident.savePostmortem.call(input),
    (input) => input.incidentId
  )
}

export function useApproveIncidentPostmortem() {
  return useIncidentMutation(
    (input: SaveIncidentPostmortemInput) => orpc.incident.approvePostmortem.call(input),
    (input) => input.incidentId
  )
}

export function useIncidentImageUrl(evidenceId: string | null) {
  return useQuery({
    ...orpc.incident.imageUrl.queryOptions({ input: { evidenceId: evidenceId ?? '' } }),
    enabled: Boolean(evidenceId),
    staleTime: Infinity
  })
}
