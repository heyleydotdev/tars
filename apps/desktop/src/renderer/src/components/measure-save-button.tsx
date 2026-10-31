import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckIcon, CloudUploadIcon } from 'lucide-react'

import { ERRORS } from '@tars/core/errors'
import { Button } from '@tars/ui/components/button'
import { Spinner } from '@tars/ui/components/spinner'

import type { MeasureBatchItem } from '../lib/measure'
import { saveMeasureRun } from '../lib/measure-history'
import { orpc } from '../lib/orpc'
import { useShellAlertStore } from '../stores/alert'
import { useMeasurePreferences } from '../stores/measure-preferences'

export default function MeasureSaveButton({ items }: { items: Array<MeasureBatchItem> }) {
  const [saving, setSaving] = useState(false)
  const [savedItems, setSavedItems] = useState<Array<MeasureBatchItem> | null>(null)
  const queryClient = useQueryClient()
  const unit = useMeasurePreferences((state) => state.unit)
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const measured = items.find((item) => item.result)
  const prompts = measured?.result?.prompts ?? measured?.request?.prompts ?? []
  const saved = savedItems === items

  async function save(): Promise<void> {
    if (!measured) return

    setSaving(true)

    try {
      await saveMeasureRun(items, prompts, unit)
      await queryClient.invalidateQueries({ queryKey: orpc.measure.history.list.queryKey() })
      setSavedItems(items)
    } catch (error) {
      showAlert({
        title: 'Save failed',
        description: error instanceof Error ? error.message : ERRORS.historySaveFailed,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!measured || prompts.length === 0) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label="Save measurement run"
      title="Save measurement run"
      disabled={saving || saved}
      onClick={() => void save()}
    >
      {saving ? (
        <Spinner className="size-3.5" />
      ) : saved ? (
        <CheckIcon className="text-emerald-400" />
      ) : (
        <CloudUploadIcon />
      )}
    </Button>
  )
}
