import { useState } from 'react'
import { Button, Modal } from '../../design-system'
import { cx } from '../../lib/cx'
import type { CardContent } from './cards'
import styles from './TourCard.module.css'

export interface TourCardProps {
  content: CardContent
  /** The side of the window it floats on, away from what it talks about. */
  side: 'left' | 'right'
  /** While the tour plays, opening an image pauses it first. */
  playing: boolean
  onPause(): void
}

function Decision({ content }: { content: Extract<CardContent, { kind: 'decision' }> }) {
  return (
    <>
      <span className={styles.label}>Decision {content.n} of 3</span>
      <h2 className={styles.title}>{content.title}</h2>
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
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <button
        type="button"
        className={styles.thumb}
        aria-label={`${content.alt}, open larger`}
        onClick={() => {
          if (playing) onPause()
          setOpen(true)
        }}
      >
        <img src={content.src} alt="" className={styles.thumbImage} />
      </button>
      <p className={styles.caption}>{content.caption}</p>
      <Modal
        open={open}
        onClose={close}
        title={content.caption}
        width={960}
        actions={<Button onClick={close}>Close</Button>}
      >
        <img data-tour="image" src={content.src} alt={content.alt} className={styles.full} />
      </Modal>
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
      {content.kind === 'decision' ? <Decision content={content} /> : null}
      {content.kind === 'excerpt' ? <Excerpt content={content} /> : null}
      {content.kind === 'story' ? <StoryCard content={content} /> : null}
      {content.kind === 'image' ? (
        <ImageCard content={content} playing={playing} onPause={onPause} />
      ) : null}
    </aside>
  )
}
