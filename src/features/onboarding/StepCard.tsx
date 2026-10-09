import { useId, type ReactNode } from 'react'
import styles from './onboarding.module.css'

/** A numbered step card: "02 Job description", its explanation, and who it waits on (E1). */
export function StepCard({ number, title, sub, meta, children }: { number: string; title: ReactNode; sub?: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  const id = useId()
  return (
    <section className={styles.card} aria-labelledby={id}>
      <div className={styles.head}>
        <div className={styles.heading}>
          <span className={styles.titleRow}>
            <span className={styles.num}>{number}</span>
            <h2 id={id} className={styles.title}>
              {title}
            </h2>
          </span>
          {sub ? <span className={styles.sub}>{sub}</span> : null}
        </div>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}

/** A 340 px side card with a title, a subline, body rows and an optional ruled foot. */
export function SideCard({ title, sub, children, foot, label, storyTarget }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; foot?: ReactNode; label?: string; storyTarget?: string }) {
  return (
    <section className={styles.side} aria-label={label} data-story-target={storyTarget}>
      <div className={styles.sideHead}>
        <h2 className={styles.sideTitle}>{title}</h2>
        {sub ? <span className={styles.sideSub}>{sub}</span> : null}
      </div>
      {children}
      {foot ? <div className={styles.sideFoot}>{foot}</div> : null}
    </section>
  )
}
