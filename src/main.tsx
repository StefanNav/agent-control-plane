import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'
import './design-system/tokens.css'
import './design-system/global.css'

import { Analytics } from '@vercel/analytics/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { installKeyboardFocusMode } from './design-system/focus'
import { countsThisVisit } from './prototype/analytics'
import { DesktopGate } from './prototype/DesktopGate/DesktopGate'
import { safeStorage } from './store/storage'

installKeyboardFocusMode()

const counted =
  import.meta.env.PROD &&
  countsThisVisit({ search: location.search, storage: safeStorage, automated: navigator.webdriver })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesktopGate>
      <RouterProvider router={router} />
    </DesktopGate>
    {/* Vercel sets these at build time; they route the script past ad blockers' default lists. */}
    {counted && (
      <Analytics
        mode="production"
        configString={import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG}
        basePath={import.meta.env.VITE_VERCEL_OBSERVABILITY_BASEPATH}
      />
    )}
  </StrictMode>,
)
