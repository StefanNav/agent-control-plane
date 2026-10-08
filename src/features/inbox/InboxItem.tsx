import { Link } from 'react-router'
import { StatusChip } from '../../components'
import { cx } from '../../lib/cx'
import type { InboxItemView } from './selectors'
import styles from './inbox.module.css'

export interface InboxItemProps {
  item: InboxItemView
  to: string
  selected: boolean
}

/** One inbox card (5a): type, source and due on top, then the reason and the action it needs. */
export function InboxItem({ item, to, selected }: InboxItemProps) {
  return (
    <li>
      <Link to={to} className={cx(styles.item, selected && styles.itemSelected)} aria-current={selected ? 'true' : undefined} data-exception={item.id}>
        <span className={styles.itemTop}>
          <StatusChip status={item.status} label={item.type} />
          <span className={styles.source}>{item.source}</span>
          <span className={cx(styles.due, item.dueSoon && styles.dueSoon, item.late && styles.late)}>{item.due}</span>
        </span>
        <span className={cx(styles.reason, selected && styles.reasonSelected)}>{item.reason}</span>
        <span className={styles.action}>{item.action}</span>
      </Link>
    </li>
  )
}
