import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'
import './design-system/tokens.css'
import './design-system/global.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { installKeyboardFocusMode } from './design-system/focus'
import { DesktopGate } from './prototype/DesktopGate/DesktopGate'

installKeyboardFocusMode()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopGate>
      <RouterProvider router={router} />
    </DesktopGate>
  </StrictMode>,
)
