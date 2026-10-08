import { Icon, type IconName } from '../../design-system'
import type { Status } from '../../data/types'
import { cx } from '../../lib/cx'
import styles from './StatusChip.module.css'

export interface StatusChipProps {
  status: Status
  label: string
  /** `compact` boards and tables (22 high); `header` page headers (24); `comfortable` forms and signing (30). */
  size?: 'compact' | 'header' | 'comfortable'
  /** Resolved: line border, off icon, meta text. */
  muted?: boolean
  /** In tables: draw normal inside an invisible chip so its word lines up with outlined chips. */
  align?: boolean
}

const ICON: Record<Exclude<Status, 'normal'>, IconName> = {
  review: 'ring',
  warn: 'diamond',
  crit: 'triangle',
  stale: 'stale',
  shadow: 'shadow',
  paused: 'paused',
}

const ICON_COLOR: Record<Exclude<Status, 'normal'>, string> = {
  review: 'var(--cs-rev)',
  warn: 'var(--cs-warn)',
  crit: 'var(--cs-crit)',
  stale: 'var(--cs-meta)',
  shadow: 'var(--cs-icon)',
  paused: 'var(--cs-icon)',
}

/** Needs a human: bold words. */
const ATTENTION: Status[] = ['review', 'warn', 'crit', 'stale']

/** State as colour + shape + word (component 01). Normal is just the word, in grey. */
export function StatusChip({ status, label, size = 'compact', muted = false, align = false }: StatusChipProps) {
  if (status === 'normal' && align) {
    return (
      <span data-status="normal" className={cx(styles.chip, styles[size], styles.invisible)}>
        <span className={styles.iconSpace} style={{ width: size === 'comfortable' ? 15 : 12 }} />
        <span className={cx(styles.text, styles.plain)}>{label}</span>
      </span>
    )
  }
  if (status === 'normal') {
    return (
      <span data-status="normal" className={cx(styles.plain, styles[`plain_${size}`])}>
        {label}
      </span>
    )
  }
  const iconSize = size === 'comfortable' ? 15 : 12
  return (
    <span
      data-status={status}
      className={cx(styles.chip, styles[size], styles[status], status === 'stale' && styles.dashed, muted && styles.muted)}
    >
      <Icon name={ICON[status]} size={iconSize} color={muted ? 'var(--cs-off)' : ICON_COLOR[status]} />
      <span className={cx(styles.text, ATTENTION.includes(status) && !muted && styles.strong)}>{label}</span>
    </span>
  )
}
