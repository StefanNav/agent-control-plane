import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  breadcrumb?: ReactNode
  title: ReactNode
  /** Inline status next to the title (14 meta), e.g. "Draft · since 06 Nov". */
  status?: ReactNode
  /** Mono ID line next to the title, e.g. "v1.3.0 · SOP v1.3.1 · AGT-0123". */
  idLine?: ReactNode
  chips?: ReactNode
  /** "Owner Marcus" pairs. */
  people?: { role: string; name: string }[]
  /** Explanatory line under the title (14 text2, max 900). */
  sub?: ReactNode
  actions?: ReactNode
  tabs?: ReactNode
  steps?: ReactNode
}

export function PageHeader({
  breadcrumb,
  title,
  status,
  idLine,
  chips,
  people,
  sub,
  actions,
  tabs,
  steps,
}: PageHeaderProps) {
  const low = Boolean(tabs || steps)
  return (
    <div className={cx(styles.header, low && styles.low)}>
      <div className={styles.top}>
        <div className={styles.text}>
          {breadcrumb ? <span className={styles.crumb}>{breadcrumb}</span> : null}
          <span className={styles.titleRow}>
            <h1 className={styles.title}>{title}</h1>
            {status ? <span className={styles.status}>{status}</span> : null}
            {idLine ? <span className={styles.ids}>{idLine}</span> : null}
            {chips}
          </span>
          {people?.length ? (
            <span className={styles.people}>
              {people.map((person) => (
                <span key={person.role}>
                  <span>{person.role}</span> <span className={styles.name}>{person.name}</span>
                </span>
              ))}
            </span>
          ) : null}
          {sub ? <span className={styles.sub}>{sub}</span> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {steps}
      {tabs}
    </div>
  )
}
