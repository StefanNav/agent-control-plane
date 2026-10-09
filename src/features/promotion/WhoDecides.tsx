import { Icon } from '../../design-system'
import styles from './promotion.module.css'

/** "Who decides" (14a): who asked, who signs, whether the board decides, and when it takes effect. */
export function WhoDecides({ steps, note }: { steps: { n: number; label: string; meta: string; state: 'done' | 'current' | 'todo' }[]; note: { lead: string; text: string } | null }) {
  return (
    <section className={styles.side} aria-label="Who decides">
      <div className={styles.sideHead}>
        <h2 className={styles.sideTitle}>Who decides</h2>
      </div>
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.n} className={styles.step} data-state={step.state}>
            {step.state === 'done' ? <Icon name="check" size={12} color="var(--cs-meta)" /> : <span className={styles.stepN}>{step.n}</span>}
            <span>{step.label}</span>
            <span className={styles.stepMeta}>{step.meta}</span>
          </li>
        ))}
      </ol>
      {note ? (
        <p className={styles.sideNote}>
          <strong>{note.lead}</strong> {note.text}
        </p>
      ) : null}
    </section>
  )
}
