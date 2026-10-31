import { useState } from 'react'
import { RotateCcwIcon } from 'lucide-react'

import { MEASURE_PROMPT_LIMIT } from '@tars/core/constants'
import { Button } from '@tars/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@tars/ui/components/popover'

import type { MeasureBatchItem } from '../lib/measure'
import MeasurePromptEditor from './measure-prompt-editor'

function effectivePrompts(item: MeasureBatchItem): Array<string> {
  return item.prompts ?? item.request?.prompts ?? item.result?.prompts ?? []
}

export default function MeasurePhotoPrompts({
  item,
  disabled,
  onChange
}: {
  item: MeasureBatchItem
  disabled: boolean
  onChange: (prompts: Array<string> | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Array<string>>(() => effectivePrompts(item))
  const prompts = effectivePrompts(item)

  if (prompts.length === 0) return null

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground shrink-0">Prompts</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)

          if (next) setDraft(effectivePrompts(item))
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="min-w-0 justify-end font-mono"
              disabled={disabled}
            />
          }
        >
          <span className="truncate">{prompts.join(', ')}</span>
          {item.prompts ? (
            <span className="text-emerald-400" title="Custom prompts">
              •
            </span>
          ) : null}
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-72">
          <PopoverHeader>
            <PopoverTitle>Photo prompts</PopoverTitle>
            <PopoverDescription>Override the batch prompts for this photo only.</PopoverDescription>
          </PopoverHeader>
          <MeasurePromptEditor
            value={draft}
            max={MEASURE_PROMPT_LIMIT}
            disabled={disabled}
            placeholder="Cardboard Box"
            onChange={setDraft}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              <RotateCcwIcon />
              Use batch
            </Button>
            <Button
              type="button"
              size="xs"
              disabled={disabled || draft.length === 0}
              onClick={() => {
                onChange(draft)
                setOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
