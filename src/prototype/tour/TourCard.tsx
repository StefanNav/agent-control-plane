import { cx } from '../../lib/cx'
import type { CardContent } from './cards'
import { DecisionContent } from './DecisionContent'
import styles from './TourCard.module.css'
import { ZoomImage } from './ZoomImage'

export interface TourCardProps {
  content: CardContent
  /** The side of the window it floats on, away from what it talks about. */
  side: 'left' | 'right'
  /** While the tour plays, opening an image pauses it first. */
  playing: boolean
  onPause(): void
}

function Excerpt({ content }: { content: Extract<CardContent, { kind: 'excerpt' }> }) {
  return (
    <figure className={styles.figure}>
      <blockquote className={styles.quote}>
        <p>{content.quote}</p>
      </blockquote>
      <figcaption className={styles.source}>{content.source}</figcaption>
    </figure>
  )
}

function StoryCard({ content }: { content: Extract<CardContent, { kind: 'story' }> }) {
  return (
    <>
      <span className={styles.label}>{content.epic}</span>
      <p className={styles.story}>{content.story}</p>
      <span className={styles.label}>Acceptance criterion</span>
      <p className={styles.criterion}>{content.criterion}</p>
    </>
  )
}

function ImageCard({
  content,
  playing,
  onPause,
}: {
  content: Extract<CardContent, { kind: 'image' }>
  playing: boolean
  onPause(): void
}) {
  return (
    <>
      <ZoomImage image={content} title={content.title} playing={playing} onPause={onPause} />
      <p className={styles.caption}>{content.caption}</p>
    </>
  )
}

/**
 * A card the tour floats beside the screen (spec §4.3, R4): a decision, a research excerpt, an
 * epic's story or a design image. It stays usable while a dialog is open.
 */
export function TourCard({ content, side, playing, onPause }: TourCardProps) {
  return (
    <aside
      aria-label="Tour card"
      data-tour="card"
      data-side={side}
      data-modal-companion
      className={cx(styles.card, side === 'left' ? styles.left : styles.right)}
    >
      {content.kind === 'decision' ? <DecisionContent content={content} /> : null}
      {content.kind === 'excerpt' ? <Excerpt content={content} /> : null}
      {content.kind === 'story' ? <StoryCard content={content} /> : null}
      {content.kind === 'image' ? (
        <ImageCard content={content} playing={playing} onPause={onPause} />
      ) : null}
    </aside>
  )
}
