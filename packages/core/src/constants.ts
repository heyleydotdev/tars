export const APP_ID = 'com.tars.desktop'
export const APP_NAME = 'Tars'
export const PROTOCOL_SCHEME = APP_ID
export const WINDOW_BACKGROUND = '#09090b'
export const META_ASR_MODEL = 'muse-voice-transcribe-1.0'
export const META_MODEL_API_URL = 'https://api.meta.ai/v1'
export const META_CHAT_MODEL = 'muse-spark-1.3'
export const META_CHAT_MAX_TOKENS = 2_000
export const META_CHAT_SYSTEM_PROMPT =
  'You are Tars, a concise and helpful personal assistant. Answer clearly and keep replies short unless the user asks for detail.'

export const VOICE_MIN_SEGMENT_MS = 2_000
export const VOICE_MAX_SEGMENT_MS = 20_000
export const VOICE_SILENCE_DURATION_MS = 1_200
export const VOICE_ANALYSER_POLL_MS = 50
export const VOICE_SAMPLE_RATE = 16_000
export const VOICE_WAKE_DEDUPLICATION_MS = 5_000
export const VOICE_SPEECH_FRAME_DURATION_MS = 20
export const VOICE_SPEECH_RMS_THRESHOLD = 0.01
export const VOICE_SPEECH_RMS_THRESHOLD_SQUARED =
  VOICE_SPEECH_RMS_THRESHOLD * VOICE_SPEECH_RMS_THRESHOLD
export const VOICE_SPEECH_ACTIVE_RATIO = 0.07

export const VOICE_WAKE_PHRASES = [
  'tars',
  'tarz',
  'tarse',
  'tarce',
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
