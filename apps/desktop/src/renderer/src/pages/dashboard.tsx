import { useState } from 'react'
import { ActivityIcon, LayoutDashboardIcon, SettingsIcon } from 'lucide-react'

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

const SIDEBAR_STORAGE_KEY = 'tars.sidebar.open'

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
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export default function Dashboard({ children }: React.PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'false'
  )
  const [active, setActive] = useState('Dashboard')

  return (
    <TooltipProvider>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={(open) => {
          setSidebarOpen(open)
          localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open))
        }}
        className="h-svh overflow-hidden"
      >
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
