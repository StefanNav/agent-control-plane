import { RuleTag, Sparkline, Table, type Column } from '../../design-system'
import type { Status } from '../../data/types'
import { cx } from '../../lib/cx'
import { AutonomyLadder, type LadderState } from '../AutonomyLadder/AutonomyLadder'
import { StatusChip } from '../StatusChip/StatusChip'
import styles from './AgentTable.module.css'

const LEVELS = ['shadow', 'draft', 'supervised', 'autonomous'] as const

/** One agent as the division board shows it. Numbers arrive formatted ("89.6%", "—"). */
export interface AgentRowView {
  id: string
  status: Status
  label: string
  ruleTag?: string
  name: string
  version: string
  day: string
  signedAsIs: string
  edited: string
  blocked: string
  /** Seven daily acceptance values on a 75–100 scale. */
  trend: number[]
  /** Compact ladder, Shadow → Autonomous. */
  ladder: LadderState[]
  level: string
  grantor: string
  reviewDate: string
}

export interface AgentTableProps {
  rows: AgentRowView[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  onOpen?: (id: string) => void
  /** `full` = component-sheet widths; `withPanel` = division view beside the 344px agent panel (4b). */
  layout?: 'full' | 'withPanel'
  ariaLabel: string
}

const WIDTHS = {
  full: ['304px', 'minmax(0, 1fr)', '40px', '76px', '56px', '56px', '56px', '224px'],
  withPanel: ['244px', 'minmax(0, 1fr)', '40px', '100px', '56px', '56px', '56px', '172px'],
} as const

/** The division view's agent rows (component 02): judgment first, quality next to volume. */
export function AgentTable({ rows, selectedId = null, onSelect, onOpen, layout = 'full', ariaLabel }: AgentTableProps) {
  const w = WIDTHS[layout]
  const number = (row: AgentRowView, value: string, extra?: string) => (
    <span className={cx(styles.number, row.status === 'stale' && styles.withdrawn, extra)}>{value}</span>
  )
  const columns: Column<AgentRowView>[] = [
    {
      id: 'status',
      header: 'Status · rule ↓',
      width: w[0],
      render: (row) => (
        <span className={styles.status}>
          <StatusChip status={row.status} label={row.label} align />
          {row.ruleTag ? <RuleTag>{row.ruleTag}</RuleTag> : null}
        </span>
      ),
    },
    {
      id: 'agent',
      header: 'Agent',
      width: w[1],
      render: (row) => (
        <span className={styles.agent}>
          <span className={cx(styles.name, row.id === selectedId && styles.selectedName)}>{row.name}</span>
          <span className={styles.version}>{row.version}</span>
        </span>
      ),
    },
    { id: 'day', header: '24h', width: w[2], align: 'right', render: (row) => number(row, row.day) },
    { id: 'asIs', header: 'Signed as is', width: w[3], align: 'right', render: (row) => number(row, row.signedAsIs) },
    {
      id: 'edited',
      header: 'Edited',
      width: w[4],
      align: 'right',
      render: (row) =>
        number(row, row.edited, row.status === 'warn' && /edit/i.test(row.label) ? styles.warnText : undefined),
    },
    {
      id: 'blocked',
      header: 'Blocked',
      width: w[5],
      align: 'right',
      render: (row) => {
        const blocked = row.blocked !== '0' && row.blocked !== '—'
        return number(row, row.blocked, blocked ? styles.emphasis : styles.quiet)
      },
    },
    {
      id: 'trend',
      header: '7 days',
      width: w[6],
      align: 'right',
      render: (row) => (
        <Sparkline
          values={row.trend}
          width={52}
          height={16}
          domain={[75, 100]}
          strokeWidth={1.25}
          dotRadius={1.75}
          stale={row.status === 'stale'}
          endDot={row.status !== 'paused'}
        />
      ),
    },
    {
      id: 'privilege',
      header: 'Privilege',
      width: w[7],
      render: (row) => (
        <span className={cx(styles.privilege, layout === 'withPanel' && styles.privilegeTight)}>
          <AutonomyLadder
            variant="compact"
            steps={LEVELS.map((level, i) => ({ level, state: row.ladder[i] ?? 'locked' }))}
          />
          <span className={styles.level}>{row.level}</span>
          <span className={styles.grantor}>{row.grantor}</span>
          <span className={styles.due}>{row.reviewDate}</span>
        </span>
      ),
    },
  ]
  return (
    <Table
      ariaLabel={ariaLabel}
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      selectedId={selectedId}
      onSelect={onSelect}
      onOpen={onOpen}
      density="board"
      columnGap={12}
    />
  )
}
