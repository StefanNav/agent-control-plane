import type { ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import styles from './FilterPill.module.css'

export interface FilterPillProps {
  on: boolean
  onClick: () => void
  children: ReactNode
}

export function FilterPill({ on, onClick, children }: FilterPillProps) {
  return (
    <button type="button" aria-pressed={on} className={cx(styles.pill, on && styles.on)} onClick={onClick}>
      {children}
    </button>
  )
}
