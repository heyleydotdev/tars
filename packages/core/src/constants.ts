export const APP_ID = 'com.tars.desktop'
export const APP_NAME = 'Tars'
export const PROTOCOL_SCHEME = APP_ID
export const WINDOW_BACKGROUND = '#09090b'
export const META_ASR_URL = 'https://api.meta.ai/v1/asr/transcribe'

export const VOICE_SEGMENT_DURATION_MS = 2_500
export const VOICE_SAMPLE_RATE = 16_000
export const VOICE_WAKE_DEDUPLICATION_MS = 5_000
export const VOICE_SPEECH_FRAME_DURATION_MS = 20
export const VOICE_SPEECH_RMS_THRESHOLD = 0.015
export const VOICE_SPEECH_ACTIVE_RATIO = 0.1

export const VOICE_WAKE_PHRASES = [
  'tars',
  'hey tars',
  'hello tars',
  'hi tars',
  'ok tars',
  'okay tars',
  'yo tars'
] as const

export const VOICE_WAKE_PATTERN = new RegExp(`\\b(?:${VOICE_WAKE_PHRASES.join('|')})\\b`, 'i')

export const VOICE_CAPTURE_SETTINGS = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: VOICE_SAMPLE_RATE
} as const
