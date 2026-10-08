import { useNavigate, useSearchParams } from 'react-router'
import { Segmented, Tabs } from '../../design-system'
import { PageHeader } from '../../layout/PageHeader/PageHeader'
import { formatClock } from '../../lib/clock'
import { useDemo } from '../../store'
import { selectInbox } from '../inbox/selectors'
import { onBoard } from './selectors'
import styles from './board.module.css'

export type BoardView = 'table' | 'tiles' | 'exceptions'

/** The Operations header shared by the board views: hospital line, freshness, tabs. */
export function BoardHeader({ view }: { view: BoardView }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const now = useDemo((s) => s.now)
  const divisions = useDemo((s) => s.divisions.length)
  const agents = useDemo((s) => s.agents.filter(onBoard).length)
  const inboxCount = useDemo((s) => selectInbox(s, s.personaId).needsMe.length)
  const setView = (next: BoardView) => {
    const p = new URLSearchParams(params)
    if (next === 'table') p.delete('view')
    else p.set('view', next)
    navigate({ search: p.toString() })
  }
  return (
    <PageHeader
      breadcrumb="Operations / Board"
      title="Lakeshore Health"
      status={`Hospital · ${divisions} divisions · ${agents} agents`}
      actions={
        <span className={styles.headerActions}>
          <span className={styles.mono}>Updated {formatClock(now)} · every 30 s</span>
          <Segmented
            variant="control"
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'table', label: 'Table' },
              { value: 'tiles', label: 'Tiles' },
              { value: 'exceptions', label: 'Exceptions first' },
            ]}
          />
        </span>
      }
      tabs={
        <Tabs
          ariaLabel="Operations"
          current="board"
          items={[
            { id: 'board', label: 'Board', to: '/operations' },
            { id: 'inbox', label: inboxCount ? `Inbox · ${inboxCount}` : 'Inbox', to: '/operations/inbox' },
            { id: 'actions', label: 'Actions', to: '/operations/actions' },
            { id: 'incidents', label: 'Incidents', to: '/operations/incidents' },
          ]}
        />
      }
    />
  )
}
