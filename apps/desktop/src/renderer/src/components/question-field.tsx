import type { QuestionKind } from '@tars/core/schemas/question'
import { Button } from '@tars/ui/components/button'
import { Input } from '@tars/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@tars/ui/components/select'
import { Spinner } from '@tars/ui/components/spinner'
import { Textarea } from '@tars/ui/components/textarea'

export default function QuestionField({
  question,
  value,
  pending,
  placeholder = 'Answer with the fact only the client knows…',
  size = 'sm',
  onChange,
  onSubmit
}: {
  question: {
    text: string
    rationale: string
    kind: QuestionKind
    options: Array<string> | null
  }
  value: string
  pending: boolean
  placeholder?: string
  size?: 'xs' | 'sm'
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const empty = value.trim().length === 0

  return (
    <div className="space-y-1.5">
      <p className="text-xs/6">{question.text}</p>
      <p className="text-muted-foreground text-xs/6">{question.rationale}</p>
      <div className="flex items-start gap-2">
        {question.kind === 'long' ? (
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="min-h-16 text-xs/6"
          />
        ) : question.kind === 'select' && question.options && question.options.length > 0 ? (
          <Select
            value={value || null}
            onValueChange={(next) => {
              if (typeof next === 'string') onChange(next)
            }}
          >
            <SelectTrigger className="w-full text-xs/6">
              <SelectValue>{(current: string) => current || 'Choose an answer…'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {question.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={question.kind === 'date' ? 'date' : 'text'}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !empty && !pending) onSubmit()
            }}
            placeholder={question.kind === 'date' ? undefined : placeholder}
          />
        )}
        <Button type="button" size={size} disabled={pending || empty} onClick={onSubmit}>
          {pending ? <Spinner className="size-3.5" /> : null}
          Answer
        </Button>
      </div>
    </div>
  )
}
