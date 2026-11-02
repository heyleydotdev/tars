import { useEffect, useState } from 'react'
import { LogOutIcon, MicIcon } from 'lucide-react'

import { ERRORS } from '@tars/core/errors'
import { getInitials } from '@tars/core/utils/string'
import { Avatar, AvatarFallback } from '@tars/ui/components/avatar'
import { Button } from '@tars/ui/components/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle
} from '@tars/ui/components/field'
import { Input } from '@tars/ui/components/input'
import { Spinner } from '@tars/ui/components/spinner'
import { Switch } from '@tars/ui/components/switch'
import { TabsContent } from '@tars/ui/components/tabs'

import ConfirmDialog from '../components/confirm-dialog'
import ConsoleHeader from '../components/console-header'
import ConsolePanel from '../components/console-panel'
import ConsoleTabs from '../components/console-tabs'
import PendingNavigationGuard from '../components/pending-navigation-guard'
import SettingsAbout from '../components/settings-about'
import { changePassword, signOut } from '../lib/auth'
import { useUser } from '../stores/auth'
import { useVoiceStore } from '../stores/voice'

type MicState = 'unknown' | 'granted' | 'denied' | 'prompt'

const MIC_LABELS: Record<MicState, string> = {
  unknown: 'Not checked',
  granted: 'Granted',
  denied: 'Denied',
  prompt: 'Not granted yet'
}

function useMicrophonePermission() {
  const [state, setState] = useState<MicState>('unknown')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    let status: PermissionStatus | null = null

    void navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((result) => {
        if (!active) return

        status = result
        setState(result.state as MicState)
        result.onchange = () => setState(result.state as MicState)
      })
      .catch(() => undefined)

    return () => {
      active = false

      if (status) status.onchange = null
    }
  }, [])

  async function request(): Promise<void> {
    setPending(true)

    try {
      setState((await window.requestMicrophoneAccess()) ? 'granted' : 'denied')
    } catch {
      setState('denied')
    } finally {
      setPending(false)
    }
  }

  return { state, pending, request }
}

export default function Settings() {
  const user = useUser()
  const [section, setSection] = useState('account')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const wakeEnabled = useVoiceStore((state) => state.wakeEnabled)
  const setWakeEnabled = useVoiceStore((state) => state.setWakeEnabled)
  const userPaused = useVoiceStore((state) => state.userPaused)
  const togglePaused = useVoiceStore((state) => state.togglePaused)
  const microphone = useMicrophonePermission()

  useEffect(() => {
    void window
      .getAppInfo()
      .then(setAppInfo)
      .catch(() => setAppInfo(null))
  }, [])

  async function submitPassword(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (savingPassword) return

    setPasswordError(null)
    setPasswordChanged(false)

    if (newPassword.length < 8) {
      setPasswordError(ERRORS.passwordTooShort)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(ERRORS.passwordMismatch)
      return
    }

    setSavingPassword(true)

    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordChanged(true)
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : ERRORS.passwordChangeFailed)
    } finally {
      setSavingPassword(false)
    }
  }

  async function confirmSignOut(): Promise<void> {
    setSigningOut(true)

    try {
      await signOut()
      setSignOutOpen(false)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <ConsoleHeader title="settings" />

      <ConsoleTabs
        value={section}
        onValueChange={setSection}
        items={[
          { value: 'account', label: 'Account' },
          { value: 'voice', label: 'Voice' },
          { value: 'about', label: 'About' }
        ]}
      >
        <TabsContent value="account" className="flex flex-1 flex-col lg:min-h-0">
          <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]">
            <ConsolePanel
              title="account.profile"
              accent="bg-sky-400"
              className="lg:col-span-4"
              footer={<span>Signed in</span>}
            >
              <div className="space-y-4 p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">{user.name}</p>
                    <p className="text-muted-foreground truncate text-xs/6">{user.email}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs/6">
                  Your account is managed by TARS. Sign out when you are finished on this machine.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSignOutOpen(true)}
                >
                  <LogOutIcon />
                  Sign out
                </Button>
              </div>
            </ConsolePanel>

            <ConsolePanel
              title="account.password"
              accent="bg-emerald-400"
              className="lg:col-span-8"
            >
              <form className="max-w-md p-3" onSubmit={(event) => void submitPassword(event)}>
                <FieldSet>
                  <FieldLegend>Change password</FieldLegend>
                  <FieldDescription>Use at least 8 characters.</FieldDescription>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="current-password">Current password</FieldLabel>
                      <Input
                        id="current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="new-password">New password</FieldLabel>
                      <Input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                      <Input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                      />
                    </Field>
                  </FieldGroup>
                  <FieldError>{passwordError}</FieldError>
                  {passwordChanged ? (
                    <p className="text-xs/6 text-emerald-400">{ERRORS.passwordChanged}</p>
                  ) : null}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      savingPassword ||
                      currentPassword.length === 0 ||
                      newPassword.length === 0 ||
                      confirmPassword.length === 0
                    }
                  >
                    {savingPassword ? <Spinner className="size-3.5" /> : null}
                    Change password
                  </Button>
                </FieldSet>
              </form>
            </ConsolePanel>
          </div>
        </TabsContent>

        <TabsContent value="voice" className="flex flex-1 flex-col lg:min-h-0">
          <ConsolePanel title="voice" accent="bg-violet-400" className="flex-1">
            <FieldSet className="max-w-xl p-3">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="wake-listener">
                    Listen for the wake word in the background
                  </FieldLabel>
                  <FieldDescription>
                    When TARS is hidden or another window is focused, say the wake phrase to bring
                    it back. Focused dictation still uses the composer toggle.
                  </FieldDescription>
                </FieldContent>
                <Switch id="wake-listener" checked={wakeEnabled} onCheckedChange={setWakeEnabled} />
              </Field>

              <Field orientation="horizontal" className="border-border border-t pt-3">
                <FieldContent>
                  <FieldTitle>Dictation</FieldTitle>
                  <FieldDescription>
                    {userPaused
                      ? 'Paused while the window is focused.'
                      : 'Listening while the window is focused.'}
                  </FieldDescription>
                </FieldContent>
                <Button type="button" variant="outline" size="xs" onClick={togglePaused}>
                  {userPaused ? 'Resume' : 'Pause'}
                </Button>
              </Field>

              <Field orientation="horizontal" className="border-border border-t pt-3">
                <FieldContent>
                  <FieldTitle className="flex items-center gap-1.5">
                    <MicIcon className="size-3.5" />
                    Microphone
                  </FieldTitle>
                  <FieldDescription>{MIC_LABELS[microphone.state]}</FieldDescription>
                </FieldContent>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={microphone.pending}
                  onClick={() => void microphone.request()}
                >
                  {microphone.pending ? <Spinner className="size-3.5" /> : null}
                  Request access
                </Button>
              </Field>
            </FieldSet>
          </ConsolePanel>
        </TabsContent>

        <TabsContent value="about" className="flex flex-1 flex-col lg:min-h-0">
          <SettingsAbout appInfo={appInfo} />
        </TabsContent>
      </ConsoleTabs>

      <PendingNavigationGuard when={savingPassword} />

      <ConfirmDialog
        title="Log out?"
        description="You can sign back in at any time."
        confirmLabel="Log out"
        open={signOutOpen}
        pending={signingOut}
        onOpenChange={(open) => {
          if (!open) setSignOutOpen(false)
        }}
        onConfirm={() => void confirmSignOut()}
      />
    </div>
  )
}
