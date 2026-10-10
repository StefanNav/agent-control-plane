import { cx } from '../../../lib/cx'
import type from '../../../design-system/type.module.css'
import styles from './Interlude.module.css'
import { itemState, useReveal } from './useReveal'

/** The problem in three lines, each brought in as the narration names it. */
const LINES = [
  { id: 'act', text: 'AI agents that act, not just suggest' },
  { id: 'approve', text: 'Approval of every action, by a person' },
  { id: 'trust', text: 'How hospitals already trust someone new' },
]

/** The tour's `problem` interlude (spec §4.3): three lines, one per beat that names it. */
export function ProblemPage() {
  const reveal = useReveal('problem-page')
  return (
    <article className={styles.page}>
      <header className={styles.head}>
        <span className={type.label}>Guided tour</span>
        <h1 className={type.pageTitle}>The problem</h1>
      </header>
      <ol className={styles.list}>
        {LINES.map((line) => (
          <li
            key={line.id}
            data-item={line.id}
            data-state={itemState(reveal, line.id)}
            className={cx(styles.item, styles.flush, styles.title, type.sectionTitle)}
          >
            {line.text}
          </li>
        ))}
      </ol>
    </article>
  )
}
