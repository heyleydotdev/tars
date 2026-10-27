import { useState } from 'react'
import { ActivityIcon, LayoutDashboardIcon, LogOutIcon, SettingsIcon } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { Avatar, AvatarFallback } from '@tars/ui/components/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import { useSidebarStore } from '../stores/sidebar'

const navigation = [
  { title: 'Dashboard', icon: LayoutDashboardIcon },
  { title: 'Activity', icon: ActivityIcon },
  { title: 'Settings', icon: SettingsIcon }
]

function AppSidebar({ active, onSelect }: { active: string; onSelect: (title: string) => void }) {
  const { isMobile, setOpenMobile } = useSidebar()

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
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={active === item.title}
                      tooltip={item.title}
                      onClick={() => {
                        onSelect(item.title)
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
            <SidebarMenuButton size="lg" tooltip="TARS">
              <Avatar className="size-8">
                <AvatarFallback>TA</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">TARS</span>
                <span className="text-muted-foreground truncate text-xs">Local workspace</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log out" onClick={() => void signOut()}>
              <LogOutIcon />
              <span>Log out</span>
            </SidebarMenuButton>
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
  const [active, setActive] = useState('Dashboard')

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
