import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  AddBlueprintEvidenceInput,
  AnswerBlueprintQuestionInput,
  BlueprintDetailOutput,
  BlueprintEvidenceIdInput,
  BlueprintIdInput,
  BlueprintListOutput,
  BlueprintRequirementIdInput,
  CreateBlueprintInput,
  SaveBlueprintDraftInput,
  SetBlueprintRequirementEnabledInput
} from '@tars/core/schemas/blueprint'

import { orpc } from './orpc'

const blueprintsKey = orpc.blueprint.list.queryKey()

export function useBlueprints(initialData?: BlueprintListOutput) {
  return useQuery({ ...orpc.blueprint.list.queryOptions(), initialData })
}

export function useBlueprint(id: string, initialData?: BlueprintDetailOutput) {
  return useQuery({
    ...orpc.blueprint.get.queryOptions({ input: { id } }),
    initialData
  })
}

function useBlueprintMutation<TInput>(
  mutationFn: (input: TInput) => Promise<BlueprintDetailOutput>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      queryClient.setQueryData(
        orpc.blueprint.get.queryKey({ input: { id: detail.blueprint.id } }),
        detail
      )
      void queryClient.invalidateQueries({ queryKey: blueprintsKey })
    }
  })
}

export function useCreateBlueprint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBlueprintInput) => orpc.blueprint.create.call(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: blueprintsKey })
  })
}

export function useDeleteBlueprint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: BlueprintIdInput) => orpc.blueprint.remove.call(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: blueprintsKey })
  })
}

export function useAddBlueprintEvidence() {
  return useBlueprintMutation((input: AddBlueprintEvidenceInput) =>
    orpc.blueprint.addEvidence.call(input)
  )
}

export function useRemoveBlueprintEvidence() {
  return useBlueprintMutation((input: BlueprintEvidenceIdInput) =>
    orpc.blueprint.removeEvidence.call(input)
  )
}

export function useSetBlueprintRequirementEnabled() {
  return useBlueprintMutation((input: SetBlueprintRequirementEnabledInput) =>
    orpc.blueprint.setRequirementEnabled.call(input)
  )
}

export function useRemoveBlueprintRequirement() {
  return useBlueprintMutation((input: BlueprintRequirementIdInput) =>
    orpc.blueprint.removeRequirement.call(input)
  )
}

export function useExtractBlueprint() {
  return useBlueprintMutation((input: BlueprintIdInput) => orpc.blueprint.extract.call(input))
}

export function useFindBlueprintGaps() {
  return useBlueprintMutation((input: BlueprintIdInput) => orpc.blueprint.findGaps.call(input))
}

export function useAnswerBlueprintQuestion() {
  return useBlueprintMutation((input: AnswerBlueprintQuestionInput) =>
    orpc.blueprint.answerQuestion.call(input)
  )
}

export function useDraftBlueprint() {
  return useBlueprintMutation((input: BlueprintIdInput) => orpc.blueprint.draft.call(input))
}

export function useSaveBlueprintDraft() {
  return useBlueprintMutation((input: SaveBlueprintDraftInput) =>
    orpc.blueprint.saveDraft.call(input)
  )
}
