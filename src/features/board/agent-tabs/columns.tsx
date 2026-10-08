import { Link } from 'react-router'
import { StatusChip } from '../../../components'
import { RuleTag, Sparkline, type Column } from '../../../design-system'
import { cx } from '../../../lib/cx'
import type { AgentOverview } from '../selectors'
import styles from './agent.module.css'

type Activity = AgentOverview['activities'][number]
type Recent = AgentOverview['recent'][number]

export const ACTIVITY_COLUMNS: Column<Activity>[] = [
  { id: 'name', header: 'Activity', width: 'minmax(0, 1.4fr)', render: (a) => <span className={styles.rowTitle}>{a.name}</span> },
  { id: 'level', header: 'Level', width: '140px', render: (a) => (a.level === 'Shadow' ? <StatusChip status="shadow" label="Shadow" /> : a.level) },
  { id: 'signed', header: 'Signed by', width: 'minmax(0, 1fr)', render: (a) => `${a.grantor}${a.grantedAt ? ` · ${a.grantedAt}` : ''}` },
  { id: 'review', header: 'Review', width: '88px', render: (a) => <span className={styles.mono}>{a.review}</span> },
  { id: 'today', header: 'Today', width: '112px', render: (a) => a.today || '—' },
  { id: 'trend', header: 'Edit rate · 14 d', width: '136px', render: (a) => (a.level === 'Shadow' ? <span className={styles.meta}>—</span> : <Sparkline values={a.trend} width={72} height={20} endDot={false} />) },
]

export const RECENT_COLUMNS: Column<Recent>[] = [
  { id: 'time', header: 'Time', width: '56px', render: (r) => <span className={styles.mono}>{r.at}</span> },
  { id: 'action', header: 'Action', width: 'minmax(0, 1.2fr)', render: (r) => r.title },
  { id: 'for', header: 'Acting for', width: 'minmax(0, 0.9fr)', render: (r) => <span className={styles.text2}>{r.actingFor}</span> },
  { id: 'policy', header: 'Policy', width: '150px', render: (r) => (r.blocked ? <RuleTag>{r.policy}</RuleTag> : <span className={styles.meta}>{r.policy}</span>) },
  { id: 'reviewer', header: 'Reviewer', width: 'minmax(0, 1fr)', render: (r) => <span className={cx(r.reviewer === 'Waiting for review' && styles.meta)}>{r.reviewer}</span> },
  {
    id: 'trace',
    header: 'Trace',
    width: '96px',
    render: (r) => (
      <Link to={`/operations/actions/${r.id}`} className={styles.traceLink}>
        {r.code}
      </Link>
    ),
  },
]

