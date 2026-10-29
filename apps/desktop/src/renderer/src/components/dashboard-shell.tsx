import { BotIcon, LogOutIcon, NotebookPenIcon, SearchIcon, WalletIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
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
  SidebarGroupLabel,
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

import { signOut } from '../lib/auth'
import { useUser } from '../stores/auth'
import { useSidebarStore } from '../stores/sidebar'

const destinations = [
  { title: 'Desk', to: '/', icon: BotIcon },
  { title: 'Journal', to: '/journal', icon: NotebookPenIcon },
  { title: 'Expenses', to: '/expenses', icon: WalletIcon }
]

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

function AppSidebar({ active, onSelect }: { active: string; onSelect: (to: string) => void }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const user = useUser()

  return (
    <Sidebar collapsible="icon" className="relative h-full">
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
          <SidebarGroupLabel>Notebook</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {destinations.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={active === item.title}
                      tooltip={item.title}
                      onClick={() => {
                        onSelect(item.to)
                        if (isMobile) setOpenMobile(false)
                      }}
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
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

export default function DashboardShell({ children }: React.PropsWithChildren) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { open, setOpen } = useSidebarStore(
    useShallow((state) => ({ open: state.open, setOpen: state.setOpen }))
  )
  const active = destinations.find((item) => item.to === pathname)?.title ?? 'Desk'

  return (
    <TooltipProvider>
      <SidebarProvider open={open} onOpenChange={setOpen} className="min-h-0 overflow-hidden">
        <AppSidebar active={active} onSelect={navigate} />
        <SidebarInset className="min-h-0">
          <header className="bg-sidebar border-sidebar-border flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">{active}</span>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
