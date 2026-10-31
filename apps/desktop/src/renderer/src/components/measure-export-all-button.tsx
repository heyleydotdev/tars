import { useState } from 'react'
import { ArchiveIcon, CopyIcon, FileSpreadsheetIcon } from 'lucide-react'

import { ERRORS } from '@tars/core/errors'
import { Button } from '@tars/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@tars/ui/components/dropdown-menu'
import { Spinner } from '@tars/ui/components/spinner'

import type { MeasureBatchItem } from '../lib/measure'
import { downloadText, exportMeasureBatch, measureCsv } from '../lib/measure'
import { useShellAlertStore } from '../stores/alert'
import { useMeasureAnnotations } from '../stores/measure-annotations'
import { useMeasurePreferences } from '../stores/measure-preferences'

export default function MeasureExportAllButton({ items }: { items: Array<MeasureBatchItem> }) {
  const [exporting, setExporting] = useState(false)
  const annotations = useMeasureAnnotations()
  const unit = useMeasurePreferences((state) => state.unit)
  const includeDetails = useMeasurePreferences((state) => state.includeDetails)
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const hasMeasured = items.some((item) => item.result)

  function reportError(error: unknown): void {
    showAlert({
      title: 'Export failed',
      description: error instanceof Error ? error.message : ERRORS.exportFailed,
      variant: 'destructive'
    })
  }

  async function exportImages(): Promise<void> {
    setExporting(true)

    try {
      await exportMeasureBatch(items, annotations, unit, includeDetails)
    } catch (error) {
      reportError(error)
    } finally {
      setExporting(false)
    }
  }

  function exportCsv(): void {
    try {
      downloadText(measureCsv(items, unit), 'measurements.csv', 'text/csv;charset=utf-8')
    } catch (error) {
      reportError(error)
    }
  }

  async function copyCsv(): Promise<void> {
    try {
      await window.copyText(measureCsv(items, unit))
    } catch (error) {
      reportError(error)
    }
  }

  if (!hasMeasured) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Batch export"
            title="Batch export"
            disabled={exporting}
          />
        }
      >
        {exporting ? <Spinner className="size-3.5" /> : <ArchiveIcon />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => void exportImages()}>
          <ArchiveIcon />
          Export images (ZIP)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCsv}>
          <FileSpreadsheetIcon />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void copyCsv()
          }}
        >
          <CopyIcon />
          Copy CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
