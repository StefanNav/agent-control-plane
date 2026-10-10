import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { AgentTable, MonitorHealth } from '../../components'
import { LinkButton } from '../../design-system'
import { NotFound } from '../../layout/NotFound'
import { formatClock, formatClockSeconds, minutesBetween } from '../../lib/clock'
import { useDemo } from '../../store'
import { selectInbox } from '../inbox/selectors'
import { AgentPanel } from './AgentPanel'
import { DivisionTabs } from './DivisionTabs'
import { selectAgentPanel, selectAgentRows, selectDivisionSummaries } from './selectors'
import styles from './division.module.css'

/** One division's agents, judged against their jobs, with the selected agent beside (4b). */
export function DivisionView() {
  const { divisionId = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const state = useDemo((s) => s)
  const division = state.divisions.find((d) => d.id === divisionId)
  const rows = useMemo(() => (division ? selectAgentRows(state, division.id) : []), [state, division])
  const summary = useMemo(() => selectDivisionSummaries(state).find((d) => d.id === divisionId), [state, divisionId])
  const exceptionCount = useMemo(() => selectInbox(state, state.personaId).needsMe.length, [state])
  const selectedId = params.get('agent') ?? rows[0]?.id ?? null
  const panel = useMemo(() => (selectedId ? selectAgentPanel(state, selectedId) : null), [state, selectedId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key.toLowerCase() !== 'e' || event.metaKey || event.ctrlKey || target.closest('input, textarea, select, [contenteditable]')) return
      // Only while focus is on the page itself or on this board (WCAG 2.1.4): never from the bar, a menu or a dialog.
      const onPage = target === document.body || target.id === 'main' || target.closest('[data-shortcut-scope="division"]')
      if (!onPage || target.closest('[role="menu"], [role="dialog"]')) return
      navigate('/operations/inbox')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate])

  if (!division || !summary) return <NotFound />

  const owner = state.people.find((p) => p.id === division.ownerId)?.name
  const sponsor = state.people.find((p) => p.id === division.sponsorId)?.name
  const lateMin = minutesBetween(division.monitor.lastAt, state.now)

  return (
    <div className={styles.layout} data-shortcut-scope="division">
      <div className={styles.main}>
        <div className={styles.head}>
          <span className={styles.crumb}>Operations / Lakeshore Health / {division.name}</span>
          <div className={styles.headRow}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{division.name}</h1>
              <span className={styles.status}>
                {summary.agentCount} agents · {summary.needsHuman} need a human · owner {owner} · sponsor {sponsor}
              </span>
            </div>
            <div className={styles.headActions}>
              {division.monitor.state === 'stale' ? (
                <MonitorHealth state="stale" at={formatClock(division.monitor.lastAt)} staleFor={`${Math.round(lateMin / 60)}h`} />
              ) : (
                <span className={styles.mono}>
                  Monitor {division.monitor.state} · {formatClockSeconds(division.monitor.lastAt)}
                </span>
              )}
              <LinkButton to="/operations/inbox" variant="primary">
                Work {exceptionCount} exceptions <kbd className={styles.kbd}>E</kbd>
              </LinkButton>
            </div>
          </div>
          <DivisionTabs divisionId={division.id} current="board" />
        </div>
        <div data-story-target="division-agents">
          <AgentTable
            ariaLabel={`${division.name} agents`}
            layout="withPanel"
            rows={rows}
            selectedId={selectedId}
            onSelect={(id) => {
              const p = new URLSearchParams(params)
              p.set('agent', id)
              setParams(p, { replace: true })
            }}
            onOpen={(id) => navigate(`/operations/agents/${id}`)}
            selectOnFocus
            targetPrefix="division-"
          />
        </div>
      </div>
      {panel ? <AgentPanel panel={panel} /> : null}
    </div>
  )
}
