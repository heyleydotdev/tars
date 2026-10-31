import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { MeasureUnit } from '@tars/core/utils/format'
import { MEASURE_UNITS } from '@tars/core/constants'

type MeasurePreferencesStore = {
  unit: MeasureUnit
  includeDetails: boolean
  setUnit: (unit: MeasureUnit) => void
  setIncludeDetails: (includeDetails: boolean) => void
}

function isUnit(value: unknown): value is MeasureUnit {
  return typeof value === 'string' && MEASURE_UNITS.includes(value as MeasureUnit)
}

export const useMeasurePreferences = create<MeasurePreferencesStore>()(
  persist(
    (set) => ({
      unit: 'mm',
      includeDetails: false,
      setUnit: (unit) => set({ unit }),
      setIncludeDetails: (includeDetails) => set({ includeDetails })
    }),
    {
      name: 'tars.measure.preferences',
      partialize: (state) => ({ unit: state.unit, includeDetails: state.includeDetails }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<MeasurePreferencesStore> | undefined

        return {
          ...current,
          unit: isUnit(saved?.unit) ? saved.unit : current.unit,
          includeDetails:
            typeof saved?.includeDetails === 'boolean'
              ? saved.includeDetails
              : current.includeDetails
        }
      }
    }
  )
)
