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

import { orpc } from './orpc'

const incidentsKey = orpc.incident.list.queryKey()

function timezone(): string {
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
      orpc.incident.addEvidence.call({ ...input, timezone: timezone() }),
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
      orpc.incident.rebuildTimeline.call({ ...input, timezone: timezone() }),
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
      orpc.incident.findRootCause.call({ ...input, timezone: timezone() }),
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
    (input: IncidentIdInput) => orpc.incident.approvePostmortem.call(input),
    (input) => input.incidentId
  )
}

export async function loadIncidentEvidenceImage(evidenceId: string): Promise<string> {
  const stream = await orpc.incident.evidenceImage.call({ evidenceId })
  const blob = await new Response(stream, {
    headers: { 'content-type': 'image/jpeg' }
  }).blob()

  return URL.createObjectURL(blob)
}
