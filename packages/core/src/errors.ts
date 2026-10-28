export const ERRORS = {
  invalidEmail: 'Enter a valid email address.',
  passwordRequired: 'Enter your password.',
  nameRequired: 'Enter your name.',
  passwordTooShort: 'Your password must be at least 8 characters.',
  signInFailed: 'We couldn’t sign you in. Check your email and password, then try again.',
  signUpFailed: 'We couldn’t create your account. Please try again.',
  tryAgain: 'Something went wrong. Please try again.',
  missingRootElement: 'Missing #root element',
  audioRequired: 'Audio is required.',
  invalidBase64: 'Invalid base64 value',
  microphoneAccessDenied:
    'Microphone access is off. Turn it on in system settings, then try again.',
  transcriptionUnavailable: 'Transcription is temporarily unavailable. Trying again…',
  microphoneAccessTitle: 'Microphone access',
  microphoneAccessMessage: 'Tars needs microphone access',
  microphoneAccessDetail:
    'Allow microphone access in system settings to use voice commands like “Hey Tars”.',
  websocketUpgradeRequired: 'Expected WebSocket upgrade',
  forbidden: 'Forbidden',
  internalServer: 'Internal Server Error'
} as const
