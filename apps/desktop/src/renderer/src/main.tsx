import './main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ERRORS } from '@tars/core/errors'

import App from './app'

const container = document.getElementById('root')

if (!container) {
  throw new Error(ERRORS.missingRootElement)
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
