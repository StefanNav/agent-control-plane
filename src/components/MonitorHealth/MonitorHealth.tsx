import { cx } from '../../lib/cx'
import { StatusChip } from '../StatusChip/StatusChip'
import styles from './MonitorHealth.module.css'

export interface MonitorHealthProps {
  state: 'live' | 'delayed' | 'stale'
  /** Formatted time of the last data: "09:42:17", "09:36", "06:41". */
  at: string
  /** Delayed: minutes late. */
  delayMin?: number
  /** Stale: how long without data, e.g. "3h". */
  staleFor?: string
}

/** Freshness of the data behind a view (component 10). Silence never looks like health. */
export function MonitorHealth({ state, at, delayMin, staleFor }: MonitorHealthProps) {
  if (state === 'stale') return <StatusChip status="stale" label={`No data for ${staleFor ?? '?'} · last ${at}`} />
  return (
    <span className={styles.health}>
      <span className={cx(styles.dot, state === 'delayed' && styles.delayedDot)} />
      <span className={cx(styles.text, state === 'delayed' && styles.delayed)}>
        {state === 'live' ? `Live · ${at}` : `Delayed ${delayMin ?? 0} min · last ${at}`}
      </span>
    </span>
  )
}
