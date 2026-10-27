import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app, ipcMain } from 'electron'

type Session = {
  id: string
  email: string
}

function sessionFile(): string {
  return join(app.getPath('userData'), 'session.json')
}

function readSession(): Session | null {
  try {
    const session = JSON.parse(readFileSync(sessionFile(), 'utf8')) as Session

    return typeof session.id === 'string' && typeof session.email === 'string' ? session : null
  } catch {
    return null
  }
}

function writeSession(session: Session): void {
  const file = sessionFile()

  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(session))
}

// Demo session only: replace this with a real auth service before shipping.
export function registerAuth(): void {
  ipcMain.handle('auth:get-session', () => readSession())

  ipcMain.handle('auth:login', (_event, input: unknown) => {
    const { email, password } = (input ?? {}) as { email?: unknown; password?: unknown }

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      throw new Error('Email and password are required.')
    }

    const session = { id: randomUUID(), email: email.trim() }

    writeSession(session)

    return session
  })

  ipcMain.handle('auth:logout', () => {
    rmSync(sessionFile(), { force: true })
  })
}
