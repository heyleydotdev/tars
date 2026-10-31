import { useState } from 'react'
import { XIcon } from 'lucide-react'

import { cn } from '@tars/ui/lib/utils'

export default function MeasurePromptEditor({
  id,
  value,
  onChange,
  onDraftChange,
  disabled,
  placeholder,
  max = 5,
  invalid
}: {
  id?: string
  value: Array<string>
  onChange: (prompts: Array<string>) => void
  onDraftChange?: (draft: string) => void
  disabled?: boolean
  placeholder?: string
  max?: number
  invalid?: boolean
}) {
  const [draft, setDraft] = useState('')

  function updateDraft(value: string): void {
    setDraft(value)
    onDraftChange?.(value)
  }

  function commit(): void {
    const prompt = draft.trim()

    if (!prompt || value.length >= max) {
      updateDraft('')
      return
    }

    if (!value.some((item) => item.toLowerCase() === prompt.toLowerCase())) {
      onChange([...value, prompt])
    }

    updateDraft('')
  }

  function remove(prompt: string): void {
    onChange(value.filter((item) => item !== prompt))
  }

  return (
    <div
      className={cn(
        'border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 flex min-h-8 w-full min-w-0 flex-wrap items-center gap-1 border px-1.5 py-1 transition-colors focus-within:ring-1',
        invalid && 'border-destructive ring-destructive/20 ring-1',
        disabled && 'opacity-50'
      )}
    >
      {value.map((prompt) => (
        <span
          key={prompt}
          className="bg-muted text-foreground flex max-w-full items-center gap-1 px-1.5 py-0.5 text-xs"
        >
          <span className="truncate">{prompt}</span>
          <button
            type="button"
            aria-label={`Remove ${prompt}`}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground shrink-0 disabled:pointer-events-none"
            onClick={() => remove(prompt)}
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        maxLength={80}
        disabled={disabled || value.length >= max}
        placeholder={value.length === 0 ? placeholder : undefined}
        aria-invalid={invalid}
        className="placeholder:text-muted-foreground h-5 min-w-24 flex-1 bg-transparent px-1 text-xs outline-none disabled:cursor-not-allowed"
        onChange={(event) => updateDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            commit()
          }

          if (event.key === 'Backspace' && draft.length === 0 && value.length > 0) {
            remove(value[value.length - 1] ?? '')
          }
        }}
      />
      <span className="text-muted-foreground ml-auto shrink-0 pr-1 font-mono text-xs tabular-nums">
        {value.length}/{max}
      </span>
    </div>
  )
}
