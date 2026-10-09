import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '../../../lib/cx'
import styles from './Tabs.module.css'

export interface TabItem {
  id: string
  label: ReactNode
  /** Route to link to; without it the tab is a button that calls onSelect. */
  to?: string
}

export interface TabsProps {
  items: TabItem[]
  current: string
  onSelect?: (id: string) => void
  ariaLabel: string
}

export function Tabs({ items, current, onSelect, ariaLabel }: TabsProps) {
  return (
    <nav aria-label={ariaLabel} className={styles.tabs}>
      {items.map((item) => {
        const isCurrent = item.id === current
        const className = cx(styles.tab, isCurrent && styles.current)
        return item.to ? (
          <Link key={item.id} to={item.to} className={className} aria-current={isCurrent ? 'page' : undefined}>
            {item.label}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            className={className}
            // A button tab switches what this page shows; it is pressed, not a page of its own.
            aria-pressed={isCurrent}
            onClick={() => onSelect?.(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
