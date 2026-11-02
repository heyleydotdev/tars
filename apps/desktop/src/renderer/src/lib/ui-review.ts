import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  GenerateUiRedesignInput,
  UiReviewDetailOutput,
  UiReviewIdInput,
  UiReviewListOutput,
  UpdateUiFindingInput
} from '@tars/core/schemas/ui-review'

import { uploadFile } from './files'
import { orpc } from './orpc'

const uiReviewsKey = orpc.uiReview.list.queryKey()

export function useUiReviews(initialData?: UiReviewListOutput) {
  return useQuery({ ...orpc.uiReview.list.queryOptions(), initialData })
}

export function useUiReview(reviewId: string | null) {
  return useQuery({
    ...orpc.uiReview.get.queryOptions({ input: { reviewId: reviewId ?? '' } }),
    enabled: Boolean(reviewId)
  })
}

function useUiReviewMutation<TInput>(mutationFn: (input: TInput) => Promise<UiReviewDetailOutput>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      queryClient.setQueryData(
        orpc.uiReview.get.queryKey({ input: { reviewId: detail.review.id } }),
        detail
      )
      void queryClient.invalidateQueries({ queryKey: uiReviewsKey })
    }
  })
}

export function useExplainUiReview() {
  return useUiReviewMutation((input: UiReviewIdInput) => orpc.uiReview.explain.call(input))
}

export async function createUiReview(
  title: string | null,
  image: Blob
): Promise<UiReviewDetailOutput> {
  const { reviewId, imageKey } = await orpc.uiReview.create.call({ title })

  try {
    await uploadFile(imageKey, image)
  } catch (error) {
    await orpc.uiReview.remove.call({ reviewId }).catch(() => undefined)
    throw error
  }

  return orpc.uiReview.explain.call({ reviewId })
}

export function useCreateUiReview() {
  return useUiReviewMutation((input: { title: string | null; image: Blob }) =>
    createUiReview(input.title, input.image)
  )
}

export function useUpdateUiFinding() {
  return useUiReviewMutation((input: UpdateUiFindingInput) =>
    orpc.uiReview.updateFinding.call(input)
  )
}

export function useGenerateUiRedesign() {
  return useUiReviewMutation((input: GenerateUiRedesignInput) => orpc.uiReview.generate.call(input))
}

export function useDeleteUiReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UiReviewIdInput) => orpc.uiReview.remove.call(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: uiReviewsKey })
  })
}
