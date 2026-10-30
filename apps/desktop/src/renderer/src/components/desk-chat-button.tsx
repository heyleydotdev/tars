import { MessageSquareIcon } from 'lucide-react'

import { Button } from '@tars/ui/components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@tars/ui/components/tooltip'

import { useDeskChatStore } from '../stores/desk-chat'

export default function DeskChatButton() {
  const open = useDeskChatStore((state) => state.open)
  const setOpen = useDeskChatStore((state) => state.setOpen)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Open desk chat"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          />
        }
      >
        <MessageSquareIcon />
      </TooltipTrigger>
      <TooltipContent side="bottom">Desk chat</TooltipContent>
    </Tooltip>
  )
}
