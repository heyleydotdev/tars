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

export default function MeasureGuideButton() {
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
          <PopoverDescription>Flat, top-down photos only.</PopoverDescription>
        </PopoverHeader>
        <ol className="text-muted-foreground list-decimal space-y-1.5 pl-4 text-xs">
          <li>Place a card or A4 sheet beside the object.</li>
          <li>Keep both flat and fully in frame.</li>
          <li>Shoot straight down.</li>
          <li>Name one concept per measurement.</li>
        </ol>
        <p className="text-muted-foreground text-xs">
          Tilt and perspective reduce accuracy. Use a contrasting surface for white paper.
        </p>
      </PopoverContent>
    </Popover>
  )
}
