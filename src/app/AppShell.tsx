import { useEffect } from 'react'
import { Outlet, useMatches, useSearchParams } from 'react-router'
import { SCENARIO_IDS, type ScenarioId } from '../data/scenarios'
import { TopNav } from '../layout/TopNav/TopNav'
import { personaById } from '../prototype/personas'
import { PrototypeBar } from '../prototype/PrototypeBar/PrototypeBar'
import { StoryLayer } from '../prototype/StoryPanel/StoryLayer'
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

/** `?scenario=<id>` loads a named scenario once, then drops the param (stories and tests use it). */
function useScenarioParam() {
  const [params, setParams] = useSearchParams()
  const loadScenario = useDemo((s) => s.loadScenario)
  const requested = params.get('scenario')
  useEffect(() => {
    if (requested === null) return
    if (SCENARIO_IDS.includes(requested as ScenarioId)) loadScenario(requested as ScenarioId)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('scenario')
        return next
      },
      { replace: true },
    )
  }, [requested, loadScenario, setParams])
}

export function AppShell({ shell }: { shell: ShellKind }) {
  useScenarioParam()
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
      <StoryLayer />
    </div>
  )
}
