import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { StatusChip } from '../../components'
import { Card, Table, type Column } from '../../design-system'
import { cx } from '../../lib/cx'
import { useDemo } from '../../store'
import { selectLast24h, selectOpenExceptions, type DivisionSummary } from './selectors'
import { StatusCounts } from './StatusCounts'
import styles from './board.module.css'

type Row = ReturnType<typeof selectOpenExceptions>[number]

const COLUMNS: Column<Row>[] = [
  { id: 'type', header: 'Exception', width: '180px', render: (r) => <StatusChip status={r.status} label={r.type} /> },
  { id: 'reason', header: 'Reason', width: 'minmax(0, 1.6fr)', render: (r) => r.reason },
  {
    id: 'agent',
    header: 'Agent',
    width: 'minmax(0, 1fr)',
    render: (r) => (
      <>
        <span>{r.agent}</span>
        <span className={styles.metaSmall}>{r.division}</span>
      </>
    ),
  },
  { id: 'owner', header: 'Owner', width: '84px', render: (r) => r.owner },
  { id: 'age', header: 'Age', width: '72px', render: (r) => <span className={styles.monoStrong}>{r.age}</span> },
  { id: 'deadline', header: 'Deadline', width: '112px', render: (r) => <span className={cx(styles.monoStrong, r.isNext && styles.bold)}>{r.deadline}</span> },
]

/** Every open exception in one list; divisions shrink to a filter strip (4f). */
export function ExceptionsFirst({ divisions }: { divisions: DivisionSummary[] }) {
  const navigate = useNavigate()
  const state = useDemo((s) => s)
  const rows = useMemo(() => selectOpenExceptions(state), [state])
  const last24 = useMemo(() => selectLast24h(state), [state])
  const [divisionFilter, setDivisionFilter] = useState<string | null>(null)
  const shown = divisionFilter ? rows.filter((r) => r.division === divisionFilter) : rows
  const quiet = divisions.filter((d) => d.needsHuman === 0)
  const allCounts: Partial<Record<string, number>> = {}
  for (const d of divisions) for (const [k, v] of Object.entries(d.counts)) allCounts[k] = (allCounts[k] ?? 0) + (v ?? 0)

  return (
    <div className={styles.body}>
      <Card>
        <div className={styles.strip}>
          <button type="button" className={cx(styles.stripCell, !divisionFilter && styles.stripOn)} onClick={() => setDivisionFilter(null)}>
            <span className={styles.stripHead}>
              <span className={styles.stripName}>All divisions</span>
              <span className={styles.metaSmall}>{state.agents.length} agents</span>
            </span>
            <StatusCounts counts={allCounts} compact />
          </button>
          {divisions.map((d) => (
            <button
              key={d.id}
              type="button"
              className={cx(styles.stripCell, divisionFilter === d.name && styles.stripOn)}
              onClick={() => setDivisionFilter(divisionFilter === d.name ? null : d.name)}
            >
              <span className={styles.stripHead}>
                <span className={cx(styles.stripName, d.needsHuman === 0 && styles.text2)}>{d.name}</span>
                <span className={styles.metaSmall}>{d.owner}</span>
              </span>
              {d.needsHuman ? <StatusCounts counts={d.counts} compact /> : <span className={styles.meta}>{d.status === 'shadow' ? `Shadow · ${d.agentCount}` : 'Within scope'}</span>}
            </button>
          ))}
        </div>
      </Card>
      <div className={styles.exceptionsGrid}>
        <div className={styles.column}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionTitle}>{shown.length} open exceptions across the hospital</span>
            <span className={styles.metaDense}>Critical first, then by deadline</span>
          </div>
          <Table
            ariaLabel="Open exceptions"
            columns={COLUMNS}
            rows={shown}
            getRowId={(r) => r.id}
            onSelect={(id) => navigate(`/operations/agents/${rows.find((r) => r.id === id)!.agentId}`)}
          />
        </div>
        <div className={styles.column}>
          <Card>
            <div className={styles.cardHeadStacked}>
              <span className={styles.cardTitle}>Quiet</span>
              <span className={styles.metaDense}>
                {quiet.length} divisions · {quiet.reduce((n, d) => n + d.agentCount, 0)} agents
              </span>
            </div>
            {quiet.map((d) => (
              <div key={d.id} className={styles.kvRow}>
                <span>{d.name}</span>
                <span className={styles.metaDense}>{d.status === 'shadow' ? `${d.agentCount} in shadow` : `${d.agentCount} within scope`}</span>
              </div>
            ))}
            <span className={cx(styles.note, styles.cardNote)}>No exceptions in these divisions in the last 24 hours.</span>
          </Card>
          <Card>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Last 24 hours</span>
            </div>
            <div className={styles.kvRow}>
              <span>Pages</span>
              <span className={styles.metaDense}>{last24.pages}</span>
            </div>
            <div className={styles.kvRow}>
              <span>Pauses</span>
              <span className={styles.metaDense}>{last24.pauses}</span>
            </div>
            <div className={styles.kvRow}>
              <span>Exceptions closed</span>
              <span className={styles.metaDense}>{last24.closed}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
