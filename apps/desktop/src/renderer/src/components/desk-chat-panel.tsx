import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@tars/ui/components/sheet'

import { useDeskChatStore } from '../stores/desk-chat'
import DeskChat from './desk-chat'

export default function DeskChatPanel() {
  const open = useDeskChatStore((state) => state.open)
  const setOpen = useDeskChatStore((state) => state.setOpen)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="data-[side=right]:sm:max-w-md"
        style={{
          top: 'var(--title-bar-height)',
          height: 'calc(100svh - var(--title-bar-height))'
        }}
      >
        <SheetHeader className="flex-row items-center gap-2 border-b px-3 py-2 pr-10">
          <span aria-hidden className="size-1.5 bg-emerald-400" />
          <SheetTitle className="font-mono text-xs">desk.chat</SheetTitle>
          <SheetDescription className="sr-only">
            Chat with TARS without leaving this page.
          </SheetDescription>
        </SheetHeader>
        {open ? <DeskChat /> : null}
      </SheetContent>
    </Sheet>
  )
}
