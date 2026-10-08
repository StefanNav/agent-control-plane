import { Icon, type IconName } from '../../design-system'
import type { Status } from '../../data/types'
import styles from './board.module.css'

const MARK: Partial<Record<Status, { icon: IconName; color: string; one: string; many: string }>> = {
  crit: { icon: 'triangle', color: 'var(--cs-crit)', one: 'critical', many: 'critical' },
  warn: { icon: 'diamond', color: 'var(--cs-warn)', one: 'warning', many: 'warnings' },
  review: { icon: 'ring', color: 'var(--cs-rev)', one: 'review', many: 'reviews' },
  stale: { icon: 'stale', color: 'var(--cs-meta)', one: 'stale', many: 'stale' },
}

/** "▲ 1 critical  ◆ 2 warnings  ○ 1 review": icon + count (+ word unless `compact`). */
export function StatusCounts({ counts, compact = false }: { counts: Partial<Record<Status, number>>; compact?: boolean }) {
  const entries = (['crit', 'warn', 'review', 'stale'] as const).filter((st) => counts[st])
  if (!entries.length) return <span className={styles.meta}>None</span>
  return (
    <span className={styles.counts}>
      {entries.map((st) => {
        const m = MARK[st]!
        const n = counts[st]!
        return (
          <span key={st} className={styles.count}>
            <Icon name={m.icon} color={m.color} />
            {compact ? n : `${n} ${n === 1 ? m.one : m.many}`}
          </span>
        )
      })}
    </span>
  )
}
