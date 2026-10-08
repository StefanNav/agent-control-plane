import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'
import './design-system/tokens.css'
import './design-system/global.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installKeyboardFocusMode } from './design-system/focus'

installKeyboardFocusMode()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div>Agent Control Plane</div>
  </StrictMode>,
)
