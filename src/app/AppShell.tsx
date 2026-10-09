import { useEffect } from 'react'
import { Outlet, useMatches, useSearchParams } from 'react-router'
import { SCENARIO_IDS, type ScenarioId } from '../data/scenarios'
import { SkipLink } from '../layout/SkipLink/SkipLink'
import { TopNav } from '../layout/TopNav/TopNav'
import { personaById } from '../prototype/personas'
import { PrototypeBar } from '../prototype/PrototypeBar/PrototypeBar'
import { StoryLayer } from '../prototype/StoryPanel/StoryLayer'
import { TourLayer, TourScreen } from '../prototype/tour/TourLayer'
import { TOUR_BAR_HEIGHT, useTour, useTourOpen } from '../prototype/tour/useTour'
import { useDemo } from '../store'
import type { NavSection, RouteHandle, ShellKind } from './nav'
import styles from './AppShell.module.css'
import { usePageChrome } from './usePageChrome'

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
  usePageChrome()
  const current = useCurrentSection()
  const initial = personaById(useDemo((s) => s.personaId)).initial
  const tourOpen = useTourOpen()
  const stepKey = useTour((s) => s.stepKey)
  // While the tour is open every step entry gets a fresh page (R6); otherwise navigation keeps it.
  const screenKey = tourOpen ? stepKey : 0
  if (shell === 'kiosk') return <Outlet />
  return (
    <div className={styles.shell}>
      <SkipLink />
      <PrototypeBar />
      {shell === 'app' ? <TopNav current={current} avatarInitial={initial} /> : null}
      <main id="main" tabIndex={-1} className={styles.main}>
        <TourScreen key={screenKey} stepKey={screenKey}>
          <Outlet />
        </TourScreen>
      </main>
      {/* Room under the page so nothing ends up beneath the tour bar (R4). */}
      {tourOpen ? <div data-tour-space aria-hidden="true" style={{ height: TOUR_BAR_HEIGHT }} /> : null}
      <StoryLayer />
      <TourLayer />
    </div>
  )
}
