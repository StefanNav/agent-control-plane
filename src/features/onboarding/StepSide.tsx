import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon, ProgressBar } from '../../design-system'
import { cx } from '../../lib/cx'
import styles from './onboarding.module.css'

export interface CheckRow {
  key: string
  label: string
  done: boolean
  current?: boolean
  right?: string
  to?: string
}

/** The step's side panel (1b–1g): progress across the record, a checklist, what else is needed, and Send. */
export function StepSide({ title, sub, progress, rows, also, alsoLabel, foot }: { title: string; sub: string; progress: number; rows: CheckRow[]; also?: string[]; alsoLabel?: string; foot: ReactNode }) {
  return (
    <section className={styles.side} aria-label={title}>
      <div className={styles.sideHead}>
        <h2 className={styles.sideTitle}>{title}</h2>
        <span className={styles.sideSub}>{sub}</span>
      </div>
      <div className={styles.progress}>
        <ProgressBar value={progress} width={278} label={sub} />
      </div>
      <ul className={styles.checks}>
        {rows.map((row) => {
          const body = (
            <>
              <span className={styles.checkIcon}>{row.done ? <Icon name="check" size={12} color="var(--cs-text2)" /> : <span className={styles.box} />}</span>
              <span className={styles.checkLabel}>{row.label}</span>
              {row.right ? <span className={styles.checkRight}>{row.right}</span> : null}
            </>
          )
          const cls = cx(styles.check, !row.done && styles.checkOpen, row.current && styles.checkCurrent)
          return (
            <li key={row.key}>
              {row.to ? (
                <Link to={row.to} className={cls} replace aria-current={row.current ? 'true' : undefined}>
                  {body}
                </Link>
              ) : (
                <span className={cls}>{body}</span>
              )}
            </li>
          )
        })}
      </ul>
      {also?.length ? (
        <div className={styles.also}>
          <h3 className={styles.caps}>{alsoLabel ?? 'Also needed'}</h3>
          {also.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ) : null}
      <div className={styles.sendFoot}>{foot}</div>
    </section>
  )
}
