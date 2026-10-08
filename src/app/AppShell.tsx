import { Outlet, useMatches } from 'react-router'
import { TopNav } from '../layout/TopNav/TopNav'
import { personaById } from '../prototype/personas'
import { PrototypeBar } from '../prototype/PrototypeBar/PrototypeBar'
import { useDemo } from '../store'
import type { NavSection, RouteHandle, ShellKind } from './nav'
import styles from './AppShell.module.css'

function useCurrentSection(): NavSection | null {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i]?.handle as RouteHandle | undefined
    if (handle && 'nav' in handle) return handle.nav
  }
  return null
}

export function AppShell({ shell }: { shell: ShellKind }) {
  const current = useCurrentSection()
  const initial = personaById(useDemo((s) => s.personaId)).initial
  if (shell === 'kiosk') return <Outlet />
  return (
    <div className={styles.shell}>
      <PrototypeBar />
      {shell === 'app' ? <TopNav current={current} avatarInitial={initial} /> : null}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
