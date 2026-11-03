import { useState } from 'react'
import { BotIcon, GaugeIcon, SettingsIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@tars/ui/components/command'
import { useSidebar } from '@tars/ui/components/sidebar'
import { Spinner } from '@tars/ui/components/spinner'

import { useSendChatMessage } from '../lib/chat'
import { navigation } from '../lib/navigation'
import { useDeskChatStore } from '../stores/desk-chat'

const extras = [
  { title: 'Usage', to: '/usage', icon: GaugeIcon },
  { title: 'Settings', to: '/settings', icon: SettingsIcon }
]

const pages = [...navigation.flatMap((group) => group.items), ...extras]

export default function CommandMenu({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const send = useSendChatMessage()
  const setChatOpen = useDeskChatStore((state) => state.setOpen)
  const { isMobile, setOpenMobile } = useSidebar()
  const prompt = query.trim()

  function close(): void {
    setQuery('')
    onOpenChange(false)
  }

  function go(to: string): void {
    close()
    if (isMobile) setOpenMobile(false)
    navigate(to)
  }

  function ask(): void {
    if (!prompt || send.isPending) return

    send.mutate(prompt)
    setChatOpen(true)
    if (isMobile) setOpenMobile(false)
    close()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Search"
      description="Find a page or ask the agent."
    >
      <Command>
        <CommandInput
          placeholder="Search pages or ask AI…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {prompt ? (
            <>
              <CommandGroup heading="AI">
                <CommandItem value={`ask ${prompt}`} onSelect={ask} disabled={send.isPending}>
                  <BotIcon />
                  <span className="min-w-0 truncate">Ask AI: {prompt}</span>
                  {send.isPending ? <Spinner className="ml-auto size-3.5" /> : null}
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}
          <CommandGroup heading="Pages">
            {pages.map((page) => {
              const Icon = page.icon

              return (
                <CommandItem key={page.to} value={page.title} onSelect={() => go(page.to)}>
                  <Icon />
                  <span>{page.title}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
