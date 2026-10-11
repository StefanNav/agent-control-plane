import { useId } from 'react'
import { cx } from '../../../lib/cx'
import type from '../../../design-system/type.module.css'
import {
  CONFLICT,
  DIRECTIONS,
  JUDGED,
  decision,
  type Decision,
  type ImageCard,
} from '../decisionCards'
import { DecisionContent } from '../DecisionContent'
import { tourRuntime, useTour } from '../useTour'
import { ZoomImage } from '../ZoomImage'
import styles from './DecisionsPage.module.css'
import interlude from './Interlude.module.css'
import { itemProps, useReveal, type Reveal } from './useReveal'

/** Opening an image while the tour plays pauses it first; opening one at all closes the welcome. */
interface Zoom {
  playing: boolean
  onPause(): void
  onOpen(): void
}

/** An exploration: its image, at a sheet's shape or a screen's, then its name and one line. */
function Exploration({
  card,
  shape,
  zoom,
}: {
  card: ImageCard
  shape: 'tall' | 'wide'
  zoom: Zoom
}) {
  return (
    <figure className={styles.figure}>
      <ZoomImage image={card} title={card.title} className={styles[shape]} {...zoom} />
      <figcaption className={cx(styles.caption, type.dense)}>
        <span className={styles.name}>{card.title}</span>
        <span>{card.caption}</span>
      </figcaption>
    </figure>
  )
}

/** One decision, brought in by its own reveal id, beside the screen it played out on. */
function DecisionItem({
  reveal,
  id,
  card,
  zoom,
}: {
  reveal: Reveal
  id: string
  card: Decision
  zoom: Zoom
}) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={titleId}
      data-item={id}
      data-story-target={`decisions-${id}`}
      {...itemProps(reveal, id)}
      className={cx(interlude.item, styles.decision)}
    >
      <div className={styles.content}>
        <DecisionContent content={card} titleId={titleId} />
      </div>
      {card.screen ? (
        <figure className={styles.screen}>
          <ZoomImage image={card.screen} {...zoom} />
          <figcaption className={type.meta}>{card.screen.caption}</figcaption>
        </figure>
      ) : null}
    </section>
  )
}

/**
 * The tour's `decisions` interlude (spec §4.3, §7.2): the three decisions in order, each with the
 * screen it played out on, and under Decision 2 the design explorations: the five directions and
 * the conflict that broke the first, then the same crowded screens every direction was judged on.
 */
export function DecisionsPage() {
  const reveal = useReveal('decisions-page')
  const playing = useTour((s) => s.status === 'playing')
  const zoom: Zoom = {
    playing,
    onPause: () => tourRuntime().player.getState().pause(),
    // Reached by the keyboard under the welcome's scrim: opening an image is using the tour.
    onOpen: () => tourRuntime().player.getState().dismissWelcome(),
  }
  return (
    <article className={cx(interlude.page, interlude.wide)}>
      <header className={interlude.head}>
        <span className={type.label}>Guided tour</span>
        <h1 className={type.pageTitle}>Three key decisions</h1>
      </header>
      <DecisionItem reveal={reveal} id="d1" card={decision('decision-1')} zoom={zoom} />
      <DecisionItem reveal={reveal} id="d2" card={decision('decision-2')} zoom={zoom} />
      <section
        aria-labelledby="decisions-directions"
        data-item="directions"
        data-story-target="decisions-directions"
        {...itemProps(reveal, 'directions')}
        className={cx(interlude.item, styles.group)}
      >
        <h3 id="decisions-directions" className={cx(styles.groupTitle, type.ui)}>
          Five directions from one brief
        </h3>
        <div className={styles.directions}>
          {DIRECTIONS.map((card) => (
            <Exploration key={card.src} card={card} shape="tall" zoom={zoom} />
          ))}
          <Exploration card={CONFLICT} shape="wide" zoom={zoom} />
        </div>
      </section>
      <section
        aria-labelledby="decisions-judged"
        data-item="judged"
        data-story-target="decisions-judged"
        {...itemProps(reveal, 'judged')}
        className={cx(interlude.item, styles.group)}
      >
        <h3 id="decisions-judged" className={cx(styles.groupTitle, type.ui)}>
          Judged on the same real, crowded screens
        </h3>
        <div className={styles.judged}>
          {JUDGED.map((card) => (
            <Exploration key={card.src} card={card} shape="wide" zoom={zoom} />
          ))}
        </div>
      </section>
      <DecisionItem reveal={reveal} id="d3" card={decision('decision-3')} zoom={zoom} />
    </article>
  )
}
