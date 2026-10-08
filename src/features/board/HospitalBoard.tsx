import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { StatusChip } from '../../components'
import { FilterPill, Sparkline, Table, type Column } from '../../design-system'
import { useDemo } from '../../store'
import { BoardHeader, type BoardView } from './BoardHeader'
import { DivisionPanel } from './DivisionPanel'
import { ExceptionsFirst } from './ExceptionsFirst'
import { selectDivisionSummaries, type DivisionSummary } from './selectors'
import { StatusCounts } from './StatusCounts'
import { TileGrid } from './TileGrid'
import styles from './board.module.css'

const VIEWS: BoardView[] = ['table', 'tiles', 'exceptions']

/** The 7-day exceptions sparkline: flat at zero, red only for a division in critical state. */
export function ExceptionTrend({ division }: { division: DivisionSummary }) {
  const max = Math.max(1, ...division.exceptionsByDay)
  return (
    <Sparkline
      values={division.exceptionsByDay}
      width={72}
      height={20}
      domain={[0, max]}
      endDot={false}
      color={division.status === 'crit' ? 'var(--cs-crit)' : 'var(--cs-icon)'}
    />
  )
}

const COLUMNS: Column<DivisionSummary>[] = [
  { id: 'name', header: 'Division', width: 'minmax(0, 1fr)', render: (d) => <span className={styles.divisionName}>{d.name}</span> },
  { id: 'owner', header: 'Owner', width: '96px', render: (d) => d.owner },
  { id: 'agents', header: 'Agents', width: '64px', align: 'right', render: (d) => d.agentCount },
  { id: 'judgment', header: 'Judgment', width: 'minmax(0, 1.3fr)', render: (d) => <StatusChip status={d.status} label={d.judgment} /> },
  { id: 'open', header: 'Open exceptions', width: 'minmax(0, 1.5fr)', render: (d) => <StatusCounts counts={d.counts} /> },
  { id: 'trend', header: '7 days', width: '100px', render: (d) => <ExceptionTrend division={d} /> },
]

/** The hospital view (4a), with the tile (4d) and exceptions-first (4f) alternatives. */
export function HospitalBoard() {
  const [params, setParams] = useSearchParams()
  const view = (VIEWS.find((v) => v === params.get('view')) ?? 'table') as BoardView
  const state = useDemo((s) => s)
  const divisions = useMemo(() => selectDivisionSummaries(state), [state])
  const [attentionOnly, setAttentionOnly] = useState(false)
  const needing = divisions.filter((d) => d.needsHuman > 0)
  const shown = attentionOnly ? needing : divisions
  const selectedId = params.get('division') ?? divisions[0]?.id ?? null
  const selected = divisions.find((d) => d.id === selectedId) ?? divisions[0]

  const filters = (
    <div className={styles.sectionHead}>
      <span className={styles.sectionTitle}>
        {needing.length} {needing.length === 1 ? 'division needs' : 'divisions need'} a human
      </span>
      <span className={styles.pills}>
        <FilterPill on={!attentionOnly} onClick={() => setAttentionOnly(false)}>
          All · {divisions.length}
        </FilterPill>
        <FilterPill on={attentionOnly} onClick={() => setAttentionOnly(true)}>
          Needs a human · {needing.length}
        </FilterPill>
      </span>
    </div>
  )

  return (
    <>
      <BoardHeader view={view} />
      {view === 'tiles' ? (
        <div className={styles.body}>
          {filters}
          <TileGrid divisions={shown} />
        </div>
      ) : view === 'exceptions' ? (
        <ExceptionsFirst divisions={divisions} />
      ) : (
        <div className={styles.boardGrid}>
          <div className={styles.column}>
            {filters}
            <Table
              ariaLabel="Divisions"
              columns={COLUMNS}
              rows={shown}
              getRowId={(d) => d.id}
              selectedId={selected?.id ?? null}
              onSelect={(id) => {
                const p = new URLSearchParams(params)
                p.set('division', id)
                setParams(p, { replace: true })
              }}
              minRowHeight={68}
            />
            <span className={styles.note}>Divisions that are fine stay grey. Only a division that needs a human gets colour, a mark and words.</span>
          </div>
          {selected ? <DivisionPanel division={selected} /> : null}
        </div>
      )}
    </>
  )
}
