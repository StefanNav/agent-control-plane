import { cx } from '../../../lib/cx'
import type from '../../../design-system/type.module.css'
import styles from './Interlude.module.css'
import { itemState, useReveal } from './useReveal'

/**
 * The work, in order, each with one line from the repo's docs. `group` is the reveal id that brings a
 * tile in: one line of narration names several tiles, and they come in together.
 */
const TILES = [
  {
    id: 'research',
    group: 'research',
    title: 'Research',
    line: 'Agent oversight, automation bias, alarm fatigue',
  },
  {
    id: 'vision',
    group: 'vision',
    title: 'Vision',
    line: 'Bring on an agent the way a hospital brings on a clinician',
  },
  {
    id: 'prd',
    group: 'vision',
    title: 'PRD',
    line: 'Requirements and the permission matrix',
  },
  {
    id: 'roadmap',
    group: 'vision',
    title: 'Roadmap',
    line: 'Safe at Draft, earned autonomy, then scale',
  },
  {
    id: 'epics',
    group: 'vision',
    title: 'Epics and stories',
    line: '21 epics; E1 to E15 designed and built',
  },
  {
    id: 'brief',
    group: 'brief',
    title: 'Design system brief',
    line: 'Quiet by default; colour only where a human is needed',
  },
  {
    id: 'explorations',
    group: 'brief',
    title: 'Explorations',
    line: '5 design system directions, 4 board layouts',
  },
  {
    id: 'frames',
    group: 'brief',
    title: '55 frames',
    line: 'High-fidelity screens at 1440 px',
  },
  {
    id: 'build',
    group: 'brief',
    title: '11 build phases',
    line: 'Each one a reviewed pull request',
  },
]

/** The tour's `process` interlude (spec §4.3): nine tiles in a row, lit as the narration names them. */
export function ProcessPage() {
  const reveal = useReveal('process-page')
  return (
    <article className={cx(styles.page, styles.wide)}>
      <header className={styles.head}>
        <span className={type.label}>Guided tour</span>
        <h1 className={type.pageTitle}>How I got here</h1>
      </header>
      <ol className={styles.tiles}>
        {TILES.map((tile) => (
          <li
            key={tile.id}
            data-item={tile.id}
            data-state={itemState(reveal, tile.group)}
            className={cx(styles.item, styles.tile)}
          >
            <span className={cx(styles.title, styles.tileTitle, type.ui)}>{tile.title}</span>
            <span className={type.dense}>{tile.line}</span>
          </li>
        ))}
      </ol>
    </article>
  )
}
