import { cx } from '../../../lib/cx'
import type from '../../../design-system/type.module.css'
import styles from './Interlude.module.css'
import { itemProps, useReveal } from './useReveal'

/** Spec §7.4, as three short lists, each brought in as the narration reaches it. */
const LISTS = [
  {
    id: 'checked',
    title: 'What I checked',
    points: [
      'Every screen traces to a user story’s acceptance criteria',
      'Building it exposed contradictions in the frames; each was resolved and logged',
      'A greyscale and wall-distance check made the stale mark a dashed square',
      'An accessibility check (WCAG 2.1 AA) on every screen',
      'All seven stories run as automated tests',
    ],
  },
  {
    id: 'bring-in',
    title: 'Who I’d bring in first, and what I’d ask',
    points: [
      'Who supervises a live agent day to day: the AI office, the sponsor or the unit leader?',
      'Do “job description” and “privileges” match how staff think about an agent’s scope?',
      'Which actions must always stay with a person?',
      'Pharmacists: does flagging a draft from the medical record fit how they work?',
      'Engineers: what can the gateway really enforce?',
    ],
  },
  {
    id: 'measure',
    title: 'What I’d measure',
    points: [
      'Time from an exception to a named owner',
      'Exceptions handled before their deadline',
      'Alerts per supervisor, and how many are dismissed',
      'Reviewer health (approval time, disagreement rate) beside independent checks',
      'Step-downs caught by rule',
    ],
  },
]

/** The tour's `validate` interlude (spec §4.3, §7.4): three lists, one per beat that names it. */
export function ValidatePage() {
  const reveal = useReveal('validate-page')
  return (
    <article className={styles.page}>
      <header className={styles.head}>
        <span className={type.label}>Guided tour</span>
        <h1 className={type.pageTitle}>How I’d validate it</h1>
      </header>
      {LISTS.map((list) => (
        <section
          key={list.id}
          aria-labelledby={`validate-${list.id}`}
          data-item={list.id}
          {...itemProps(reveal, list.id)}
          className={cx(styles.item, styles.flush)}
        >
          <h2 id={`validate-${list.id}`} className={cx(styles.title, type.sectionTitle)}>
            {list.title}
          </h2>
          <ul className={cx(styles.points, type.ui)}>
            {list.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  )
}
