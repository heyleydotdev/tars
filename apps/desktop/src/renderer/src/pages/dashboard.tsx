import { useState } from 'react'
import { BotIcon, LogOutIcon, SearchIcon } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { initials } from '@tars/core/utils/string'
import { Avatar, AvatarFallback } from '@tars/ui/components/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@tars/ui/components/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar
} from '@tars/ui/components/sidebar'
import { TooltipProvider } from '@tars/ui/components/tooltip'

import TitleBar from '../components/title-bar'
import { signOut } from '../lib/auth'
import { useUser } from '../stores/auth'
import { useSidebarStore } from '../stores/sidebar'

function UserIdentity({ name, email }: { name: string; email: string }) {
  return (
    <>
      <Avatar className="size-8">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="text-muted-foreground truncate text-xs">{email}</span>
      </div>
    </>
  )
}

function AppSidebar({ active, onSelect }: { active: string; onSelect: (title: string) => void }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const user = useUser()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border flex h-9 flex-row items-center gap-2 border-b px-2 py-0 md:[-webkit-app-region:drag]">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center rounded-md text-[10px] font-semibold group-data-[collapsible=icon]:hidden">
          TA
        </div>
        <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
          TARS
        </span>
        <SidebarTrigger className="ml-auto [-webkit-app-region:no-drag]" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-muted-foreground" variant="outline">
                  <SearchIcon />
                  <span>Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={active === 'Agent'}
                  tooltip="Agent"
                  onClick={() => {
                    onSelect('Agent')
                    if (isMobile) setOpenMobile(false)
                  }}
                >
                  <BotIcon />
                  <span>Agent</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                <UserIdentity name={user.name} email={user.email} />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5">
                      <UserIdentity name={user.name} email={user.email} />
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOutIcon />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export default function Dashboard({ children }: React.PropsWithChildren) {
  const { open, setOpen } = useSidebarStore(
    useShallow((state) => ({ open: state.open, setOpen: state.setOpen }))
  )
  const [active, setActive] = useState('Agent')

  return (
    <TooltipProvider>
      <SidebarProvider open={open} onOpenChange={setOpen} className="h-svh overflow-hidden">
        <AppSidebar active={active} onSelect={setActive} />
        <SidebarInset className="h-full min-h-0">
          <TitleBar />
          <header className="bg-sidebar border-sidebar-border flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">{active}</span>
          </header>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
