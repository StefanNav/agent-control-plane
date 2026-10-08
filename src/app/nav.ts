export type NavSection = 'portfolio' | 'inventory' | 'operations' | 'reports' | 'settings'

/** Which chrome a route gets: full product (`app`), prototype bar only, or nothing (wall display). */
export type ShellKind = 'app' | 'prototype' | 'kiosk'

/** Route `handle` shape; AppShell reads `nav` to mark the current section. */
export interface RouteHandle {
  nav: NavSection | null
}

export const NAV_ITEMS: { id: NavSection; label: string; to: string }[] = [
  { id: 'portfolio', label: 'Portfolio', to: '/portfolio' },
  { id: 'inventory', label: 'Inventory', to: '/inventory' },
  { id: 'operations', label: 'Operations', to: '/operations' },
  { id: 'reports', label: 'Reports', to: '/reports' },
  { id: 'settings', label: 'Settings', to: '/settings' },
]
