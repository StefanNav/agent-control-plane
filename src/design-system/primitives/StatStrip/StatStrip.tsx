import type { ReactNode } from 'react'
import { Card } from '../Card/Card'
import styles from './StatStrip.module.css'

export interface StatStripProps {
  stats: { label: ReactNode; value: ReactNode; sub?: ReactNode }[]
}

export function StatStrip({ stats }: StatStripProps) {
  return (
    <Card>
      <div className={styles.strip} style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
        {stats.map((stat, i) => (
          <div key={i} className={styles.stat}>
            <span className={styles.label}>{stat.label}</span>
            <span className={styles.value}>{stat.value}</span>
            {stat.sub ? <span className={styles.sub}>{stat.sub}</span> : null}
          </div>
        ))}
      </div>
    </Card>
  )
}
