import { create } from 'zustand'

import type { MeasureFormOutput, MeasureResultOutput } from '@tars/core/schemas/measure'

import type { MeasureBatchItem, PreparedMeasureImage } from '../lib/measure'

type MeasureWorkspaceStore = {
  items: Array<MeasureBatchItem>
  selectedId: string | null
  running: boolean
  savedRunId: string | null
  pendingRestore: Array<MeasureBatchItem> | null
  pendingRestoreDraft: MeasureFormOutput | null
  pendingRestoreRunId: string | null
  draft: MeasureFormOutput
  draftSeed: number
  addPhotos: (photos: Array<PreparedMeasureImage>) => void
  removePhoto: (id: string) => void
  selectPhoto: (id: string) => void
  updateItem: (id: string, patch: Partial<Omit<MeasureBatchItem, 'id' | 'photo'>>) => void
  setPrompts: (id: string, prompts: Array<string> | null) => void
  setPhotoResult: (id: string, result: MeasureResultOutput) => void
  clearResults: (ids?: Array<string>) => void
  setRunning: (running: boolean) => void
  setSavedRunId: (runId: string | null) => void
  setDraft: (patch: Partial<MeasureFormOutput>) => void
  requestRestore: (
    items: Array<MeasureBatchItem>,
    draft: MeasureFormOutput | null,
    runId?: string | null
  ) => void
  confirmRestore: () => void
  dismissRestore: () => void
}

function clearedResult() {
  return {
    status: 'idle' as const,
    result: null,
    error: null,
    request: null,
    notice: null
  }
}

function restoredWorkspace(
  state: MeasureWorkspaceStore,
  items: Array<MeasureBatchItem>,
  draft: MeasureFormOutput | null,
  runId: string | null
) {
  return {
    items,
    selectedId: items[0]?.id ?? null,
    savedRunId: runId,
    pendingRestore: null,
    pendingRestoreDraft: null,
    pendingRestoreRunId: null,
    ...(draft ? { draft, draftSeed: state.draftSeed + 1 } : {})
  }
}

export const useMeasureWorkspace = create<MeasureWorkspaceStore>()((set) => ({
  items: [],
  selectedId: null,
  running: false,
  savedRunId: null,
  pendingRestore: null,
  pendingRestoreDraft: null,
  pendingRestoreRunId: null,
  draft: { referenceId: '', prompts: [] },
  draftSeed: 0,
  addPhotos: (photos) =>
    set((state) => {
      const additions = photos.map((photo) => ({
        id: crypto.randomUUID(),
        photo,
        status: 'idle' as const,
        result: null,
        error: null,
        prompts: null,
        request: null,
        notice: null
      }))

      return {
        items: [...state.items, ...additions],
        selectedId: additions[0]?.id ?? state.selectedId
      }
    }),
  removePhoto: (id) =>
    set((state) => {
      const items = state.items.filter((item) => item.id !== id)

      return {
        items,
        selectedId: state.selectedId === id ? (items[0]?.id ?? null) : state.selectedId
      }
    }),
  selectPhoto: (selectedId) => set({ selectedId }),
  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    })),
  setPrompts: (id, prompts) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, prompts, ...clearedResult() } : item
      )
    })),
  setPhotoResult: (id, result) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, result, status: 'done' as const, notice: null } : item
      )
    })),
  clearResults: (ids) =>
    set((state) => ({
      items: state.items.map((item) =>
        !ids || ids.includes(item.id) ? { ...item, ...clearedResult() } : item
      ),
      savedRunId: null
    })),
  setRunning: (running) => set({ running }),
  setSavedRunId: (savedRunId) => set({ savedRunId }),
  setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  requestRestore: (items, draft, runId = null) =>
    set((state) =>
      state.items.length > 0
        ? { pendingRestore: items, pendingRestoreDraft: draft, pendingRestoreRunId: runId }
        : restoredWorkspace(state, items, draft, runId)
    ),
  confirmRestore: () =>
    set((state) =>
      state.pendingRestore
        ? restoredWorkspace(
            state,
            state.pendingRestore,
            state.pendingRestoreDraft,
            state.pendingRestoreRunId
          )
        : {}
    ),
  dismissRestore: () => set({ pendingRestore: null, pendingRestoreDraft: null })
}))
