import { useEffect, useState } from 'react'
import {
  BotIcon,
  ChartNoAxesColumnIcon,
  ChevronRightIcon,
  DraftingCompassIcon,
  LogOutIcon,
  NotebookPenIcon,
  RulerIcon,
  ScanEyeIcon,
  SearchIcon,
  SirenIcon,
  WalletIcon
} from 'lucide-react'
import { Outlet, useLocation, useNavigate, useNavigation } from 'react-router'
import { useShallow } from 'zustand/react/shallow'

import { ERRORS } from '@tars/core/errors'
import { getInitials } from '@tars/core/utils/string'
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar
} from '@tars/ui/components/sidebar'
import { TooltipProvider } from '@tars/ui/components/tooltip'
import { cn } from '@tars/ui/lib/utils'

import { signOut } from '../lib/auth'
import { useShellAlertStore } from '../stores/alert'
import { useUser } from '../stores/auth'
import { useDeskChatStore } from '../stores/desk-chat'
import { useSidebarStore } from '../stores/sidebar'
import { useVoiceStore } from '../stores/voice'
import ConfirmDialog from './confirm-dialog'
import DeskChatPanel from './desk-chat-panel'
import LoadingScreen from './loading-screen'
import ShellAlert from './shell-alert'

type NavItem = {
  title: string
  to: string
  icon: typeof BotIcon
  children?: Array<{ title: string; to: string }>
}

const navigation: Array<{ label: string; items: Array<NavItem> }> = [
  {
    label: 'Notebook',
    items: [
      { title: 'Desk', to: '/', icon: BotIcon },
      { title: 'Journal', to: '/journal', icon: NotebookPenIcon },
      { title: 'Expenses', to: '/expenses', icon: WalletIcon },
      { title: 'Stats', to: '/stats', icon: ChartNoAxesColumnIcon }
    ]
  },
  {
    label: 'Developer Kit',
    items: [
      {
        title: 'Measure',
        to: '/measure',
        icon: RulerIcon,
        children: [{ title: 'Saved', to: '/measure/saved' }]
      },
      { title: 'Blueprints', to: '/blueprints', icon: DraftingCompassIcon },
      { title: 'UI Review', to: '/ui-review', icon: ScanEyeIcon },
      { title: 'Incidents', to: '/incidents', icon: SirenIcon }
    ]
  }
]

const destinations = navigation.flatMap((group) => group.items)

function activeDestination(pathname: string): string {
  const exact = destinations.find((item) => item.to === pathname)

  if (exact) return exact.title

  const nested = destinations.find((item) => item.to !== '/' && pathname.startsWith(item.to))

  return nested?.title ?? 'Desk'
}

function UserIdentity({ name, email }: { name: string; email: string }) {
  return (
    <>
      <Avatar className="size-8">
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="text-muted-foreground truncate text-xs">{email}</span>
      </div>
    </>
  )
}

function AppSidebar({
  pathname,
  onSelect,
  onSignOut
}: {
  pathname: string
  onSelect: (to: string) => void
  onSignOut: () => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>({})
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
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.to || pathname.startsWith(`${item.to}/`)

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.title}
                        onClick={() => {
                          onSelect(item.to)
                          if (isMobile) setOpenMobile(false)
                        }}
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {item.children ? (
                        <>
                          <SidebarMenuAction
                            aria-expanded={!collapsedMenus[item.title]}
                            aria-label={`${
                              collapsedMenus[item.title] ? 'Expand' : 'Collapse'
                            } ${item.title}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              setCollapsedMenus((current) => ({
                                ...current,
                                [item.title]: !current[item.title]
                              }))
                            }}
                          >
                            <ChevronRightIcon
                              className={cn(
                                'transition-transform',
                                !collapsedMenus[item.title] && 'rotate-90'
                              )}
                            />
                          </SidebarMenuAction>
                          {collapsedMenus[item.title] ? null : (
                            <SidebarMenuSub>
                              {item.children.map((child) => (
                                <SidebarMenuSubItem key={child.to}>
                                  <SidebarMenuSubButton
                                    isActive={pathname === child.to}
                                    onClick={() => {
                                      onSelect(child.to)
                                      if (isMobile) setOpenMobile(false)
                                    }}
                                  >
                                    <span>{child.title}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}
                        </>
                      ) : null}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
                <DropdownMenuItem onClick={onSignOut}>
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

export default function DashboardLayout() {
  const navigate = useNavigate()
  const navigationState = useNavigation()
  const { pathname } = useLocation()
  const isNavigating = navigationState.state === 'loading' && Boolean(navigationState.location)
  const { open, setOpen } = useSidebarStore(
    useShallow((state) => ({ open: state.open, setOpen: state.setOpen }))
  )
  const voiceError = useVoiceStore((state) => state.error)
  const setVoiceError = useVoiceStore((state) => state.setError)
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const setDeskChatOpen = useDeskChatStore((state) => state.setOpen)
  const active = activeDestination(pathname)

  async function confirmSignOut() {
    setSigningOut(true)

    try {
      await signOut()
      setSignOutOpen(false)
    } finally {
      setSigningOut(false)
    }
  }

  useEffect(() => () => setDeskChatOpen(false), [setDeskChatOpen])

  useEffect(() => {
    if (!voiceError) return

    showAlert({
      title: ERRORS.voiceUnavailableTitle,
      description: voiceError,
      variant: 'destructive'
    })
    setVoiceError(null)
  }, [setVoiceError, showAlert, voiceError])

  return (
    <TooltipProvider>
      <SidebarProvider open={open} onOpenChange={setOpen} className="min-h-0 overflow-hidden">
        <AppSidebar
          pathname={pathname}
          onSelect={navigate}
          onSignOut={() => setSignOutOpen(true)}
        />
        <SidebarInset className="min-h-0">
          <ShellAlert />
          <header className="bg-sidebar border-sidebar-border flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">{active}</span>
          </header>
          <div className="relative flex min-h-0 flex-1 flex-col overflow-auto">
            <Outlet />
            {isNavigating ? (
              <div className="bg-background absolute inset-0 z-30">
                <LoadingScreen />
              </div>
            ) : null}
          </div>
        </SidebarInset>
      </SidebarProvider>
      <DeskChatPanel />
      <ConfirmDialog
        open={signOutOpen}
        pending={signingOut}
        title="Log out?"
        description="You can sign back in at any time."
        confirmLabel="Log out"
        onOpenChange={(open) => {
          if (!open) setSignOutOpen(false)
        }}
        onConfirm={() => void confirmSignOut()}
      />
    </TooltipProvider>
  )
}
