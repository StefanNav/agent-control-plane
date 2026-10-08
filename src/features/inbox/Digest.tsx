import { Link } from 'react-router'
import { StatusChip } from '../../components'
import { RuleTag } from '../../design-system'
import type { selectDigest } from './selectors'
import styles from './digest.module.css'

export interface DigestProps {
  digest: ReturnType<typeof selectDigest>
  settingsTo: string
}

/** "HS-04 v2 published: …" → a rule tag, then the rest. */
function withRuleTag(text: string) {
  const match = /^([A-Z]+-\d+ v\d+) (.*)$/.exec(text)
  if (!match) return text
  const [, tag = '', rest = ''] = match
  return (
    <>
      <RuleTag>{tag}</RuleTag> {rest}
    </>
  )
}

/** The 07:00 daily digest email (5c): what can wait for the morning, what changed, what stays in the log. */
export function Digest({ digest, settingsTo }: DigestProps) {
  return (
    <article className={styles.email} aria-label="Daily digest email">
      <header className={styles.head}>
        <span className={styles.line}>
          <span className={styles.key}>From</span> {digest.from}
        </span>
        <span className={styles.line}>
          <span className={styles.key}>To</span> {digest.to}
        </span>
        <span className={styles.subject}>{digest.subject}</span>
      </header>
      <div className={styles.body}>
        <div className={styles.intro}>
          <h2 className={styles.title}>{digest.title}</h2>
          <p className={styles.sub}>{digest.sub}</p>
        </div>

        <section className={styles.section} aria-label="Needs you">
          <h3 className={styles.label}>Needs you · {digest.needs.length}</h3>
          {digest.needs.map((item) => (
            <div key={item.id} className={styles.row}>
              <span className={styles.rowText}>
                {item.status === 'normal' ? (
                  <span className={styles.meta}>{item.label}</span>
                ) : (
                  <StatusChip status={item.status} label={item.label} />
                )}
                <span className={styles.text}>{item.text}</span>
                <span className={styles.meta}>{item.due}</span>
              </span>
              <Link to={`/operations/inbox/${item.id}`} className={styles.open}>
                {item.link}
              </Link>
            </div>
          ))}
        </section>

        <section className={styles.section} aria-label="Changed yesterday">
          <h3 className={styles.label}>Changed yesterday · {digest.changes.length}</h3>
          {digest.changes.map((change) => (
            <div key={change.id} className={styles.row}>
              <span className={styles.rowText}>
                <span className={styles.text}>{withRuleTag(change.text)}</span>
                <span className={styles.meta}>{change.sub}</span>
              </span>
            </div>
          ))}
        </section>

        <section className={styles.section} aria-label="In the log">
          <h3 className={styles.label}>In the log, not here · {digest.logTotal} events</h3>
          <p className={styles.logLine}>
            Deploys, config reads and routine policy passes.{' '}
            <Link to="/operations/inbox?tab=log">Open the log</Link>
          </p>
        </section>

        <footer className={styles.foot}>
          Critical exceptions page you as they happen. This digest covers warnings, reviews and
          questions. Change what reaches you in <Link to={settingsTo}>Delivery settings</Link>.
        </footer>
      </div>
    </article>
  )
}
