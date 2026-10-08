import type { ReactNode } from 'react'
import styles from './LogRow.module.css'

export interface LogRowProps {
  /** Mono time, e.g. "09:47". */
  time: string
  children: ReactNode
  sub?: ReactNode
}

export function LogRow({ time, children, sub }: LogRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.time}>{time}</span>
      <span className={styles.body}>
        <span>{children}</span>
        {sub ? <span className={styles.sub}>{sub}</span> : null}
      </span>
    </div>
  )
}
