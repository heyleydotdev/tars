import { InfoIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@tars/ui/components/popover'

export default function BlueprintGuideButton() {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button type="button" variant="outline" size="icon-sm" aria-label="Guide" />}
      >
        <InfoIcon />
      </PopoverTrigger>
      <PopoverContent side="left" align="end">
        <PopoverHeader>
          <PopoverTitle>Guide</PopoverTitle>
          <PopoverDescription>Brief in, proposal out.</PopoverDescription>
        </PopoverHeader>
        <ol className="text-muted-foreground list-decimal space-y-1.5 pl-4 text-xs">
          <li>Create a blueprint with a project title and an optional client.</li>
          <li>Open it, then paste the brief, email, or call transcript as evidence.</li>
          <li>Map requirements to get areas, status, and confidence.</li>
          <li>Find gaps, then answer the open questions.</li>
          <li>Draft the proposal, edit it, and save.</li>
        </ol>
        <p className="text-muted-foreground text-xs">
          Map again after adding evidence, and draft again after answering questions.
        </p>
      </PopoverContent>
    </Popover>
  )
}
