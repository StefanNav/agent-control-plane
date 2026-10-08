import type { ReactNode } from 'react'
import { Icon } from '../../icons/Icon'
import styles from './Notice.module.css'

export type NoticeMark = 'warn' | 'crit' | 'review' | 'lock' | 'none'

export interface NoticeProps {
  mark?: NoticeMark
  /** Bold lead-in in ink. */
  lead?: ReactNode
  children: ReactNode
  /** Ghost buttons under the text. */
  actions?: ReactNode
}

const MARKS: Record<Exclude<NoticeMark, 'none'>, ReactNode> = {
  warn: <Icon name="diamond" color="var(--cs-warn)" />,
  crit: <Icon name="triangle" color="var(--cs-crit)" />,
  review: <Icon name="ring" color="var(--cs-rev)" />,
  lock: <Icon name="lock" color="var(--cs-meta)" />,
}

export function Notice({ mark = 'none', lead, children, actions }: NoticeProps) {
  return (
    <div className={styles.notice}>
      <span className={styles.mark}>{mark === 'none' ? null : MARKS[mark]}</span>
      <div className={styles.body}>
        <span className={styles.text}>
          {lead ? <strong className={styles.lead}>{lead}</strong> : null}
          {lead ? ' ' : null}
          {children}
        </span>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  )
}
