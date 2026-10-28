import { Buffer } from 'node:buffer'
import { ipcMain } from 'electron'

import { rpc } from '../../lib/rpc-client'

async function transcribe(audio: ArrayBuffer): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { text } = await rpc.voice.transcribe({
        audio: Buffer.from(audio).toString('base64url')
      })
      return text
    } catch (error) {
      console.error(`Voice transcription attempt ${attempt} failed`, error)

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  return null
}

export function registerVoice(): void {
  ipcMain.handle('voice:transcribe', (_event, audio: ArrayBuffer) => transcribe(audio))
}
