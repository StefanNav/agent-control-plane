import type { ReactNode } from 'react'
import styles from './DefinitionList.module.css'

export interface DefinitionListProps {
  items: { key: ReactNode; value: ReactNode }[]
  /** Key column width in px. Default 160. */
  keyWidth?: number
}

export function DefinitionList({ items, keyWidth = 160 }: DefinitionListProps) {
  return (
    <dl className={styles.list}>
      {items.map((item, i) => (
        <div key={i} className={styles.row} style={{ gridTemplateColumns: `${keyWidth}px minmax(0, 1fr)` }}>
          <dt className={styles.key}>{item.key}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
