import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MeasureFrameSetting = {
  visible: boolean
  color: string
}

export type MeasureAnnotations = {
  reference: MeasureFrameSetting
  objects: Record<number, MeasureFrameSetting>
  fontSize: number
}

export const DEFAULT_REFERENCE_FRAME: MeasureFrameSetting = {
  visible: true,
  color: '#fcd34d'
}

export const DEFAULT_OBJECT_FRAME: MeasureFrameSetting = {
  visible: true,
  color: '#34d399'
}

export const DEFAULT_FRAME_FONT_SIZE = 10
export const MIN_FRAME_FONT_SIZE = 8
export const MAX_FRAME_FONT_SIZE = 24

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i

function clampFontSize(value: number): number {
  return Math.min(MAX_FRAME_FONT_SIZE, Math.max(MIN_FRAME_FONT_SIZE, Math.round(value)))
}

function isFrameSetting(value: unknown): value is MeasureFrameSetting {
  if (!value || typeof value !== 'object') return false

  const frame = value as Record<string, unknown>

  return (
    typeof frame.visible === 'boolean' &&
    typeof frame.color === 'string' &&
    COLOR_PATTERN.test(frame.color)
  )
}

function mergeObjects(value: unknown): Record<number, MeasureFrameSetting> {
  if (!value || typeof value !== 'object') return {}

  const objects: Record<number, MeasureFrameSetting> = {}

  for (const [key, setting] of Object.entries(value)) {
    const index = Number(key)

    if (Number.isInteger(index) && index >= 0 && isFrameSetting(setting)) {
      objects[index] = setting
    }
  }

  return objects
}

type MeasureAnnotationsStore = MeasureAnnotations & {
  setReference: (patch: Partial<MeasureFrameSetting>) => void
  setObject: (index: number, patch: Partial<MeasureFrameSetting>) => void
  setFontSize: (fontSize: number) => void
}

export const useMeasureAnnotations = create<MeasureAnnotationsStore>()(
  persist(
    (set) => ({
      reference: DEFAULT_REFERENCE_FRAME,
      objects: {},
      fontSize: DEFAULT_FRAME_FONT_SIZE,
      setReference: (patch) => set((state) => ({ reference: { ...state.reference, ...patch } })),
      setObject: (index, patch) =>
        set((state) => ({
          objects: {
            ...state.objects,
            [index]: { ...(state.objects[index] ?? DEFAULT_OBJECT_FRAME), ...patch }
          }
        })),
      setFontSize: (fontSize) => set({ fontSize: clampFontSize(fontSize) })
    }),
    {
      name: 'tars.measure.annotations',
      partialize: (state) => ({
        reference: state.reference,
        objects: state.objects,
        fontSize: state.fontSize
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<MeasureAnnotations> | undefined

        return {
          ...current,
          reference: isFrameSetting(saved?.reference) ? saved.reference : current.reference,
          objects: mergeObjects(saved?.objects),
          fontSize:
            typeof saved?.fontSize === 'number' ? clampFontSize(saved.fontSize) : current.fontSize
        }
      }
    }
  )
)
