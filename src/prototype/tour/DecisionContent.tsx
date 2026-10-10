import { cx } from '../../lib/cx'
import type { CardContent } from './cards'
import styles from './DecisionContent.module.css'

export interface DecisionContentProps {
  content: Extract<CardContent, { kind: 'decision' }>
  /** An id for the title, so the region holding it can be named by it. */
  titleId?: string
}

/**
 * A decision as the tour tells it (spec §4.3): "Decision n of 3", its title, the options weighed
 * with the chosen one marked by a filled dot and the word "Chosen", and the trade-off. A floating
 * card and the decisions page both show it.
 */
export function DecisionContent({ content, titleId }: DecisionContentProps) {
  return (
    <>
      <span className={styles.label}>Decision {content.n} of 3</span>
      <h2 id={titleId} className={styles.title}>
        {content.title}
      </h2>
      <ul className={styles.options}>
        {content.options.map((option) => (
          <li key={option.label} className={cx(styles.option, option.chosen && styles.chosen)}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.optionLabel}>{option.label}</span>
            {option.chosen ? <span className={styles.chosenWord}>Chosen</span> : null}
          </li>
        ))}
      </ul>
      <p className={styles.tradeoff}>Trade-off: {content.tradeoff}</p>
    </>
  )
}
