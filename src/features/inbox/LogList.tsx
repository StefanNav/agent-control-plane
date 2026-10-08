import { LogRow } from '../../design-system'
import type { selectLog } from './selectors'
import styles from './inbox.module.css'

/** The inbox Log tab: informational events, kept here and never sent to anyone. */
export function LogList({ rows }: { rows: ReturnType<typeof selectLog> }) {
  return (
    <section className={styles.listCard} aria-label="Log">
      <div className={styles.listHead}>
        <span className={styles.label}>Log · {rows.length} events</span>
        <span className={styles.sorted}>information only · never sent</span>
      </div>
      <div className={styles.logRows}>
        {rows.map((row) => (
          <LogRow key={row.id} time={row.time} sub={row.sub}>
            {row.text}
          </LogRow>
        ))}
      </div>
    </section>
  )
}
