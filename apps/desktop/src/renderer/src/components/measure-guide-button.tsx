import { InfoIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'
import { Kbd, KbdGroup } from '@tars/ui/components/kbd'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@tars/ui/components/popover'

function Shortcut({ label, keys }: { label: string; keys: Array<string> }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <KbdGroup>
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </KbdGroup>
    </div>
  )
}

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
          <li>Name one or more objects per measurement.</li>
          <li>Use Adjust boxes if a reference or object box is slightly off.</li>
        </ol>
        <p className="text-muted-foreground text-xs">
          Tilt and perspective reduce accuracy. Use a contrasting surface for white paper.
        </p>
        <div className="border-border space-y-2 border-t pt-3">
          <p className="text-foreground text-xs font-medium">Shortcuts</p>
          <Shortcut label="Switch photos" keys={['↑', '↓']} />
          <Shortcut label="Retry" keys={['R']} />
          <Shortcut label="Export" keys={['E']} />
          <Shortcut label="Copy" keys={['C']} />
          <Shortcut label="Remove" keys={['Delete']} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
