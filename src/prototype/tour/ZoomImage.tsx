import { useState } from 'react'
import { Button, Modal } from '../../design-system'
import { cx } from '../../lib/cx'
import type { TourImage } from './cards'
import styles from './ZoomImage.module.css'

export interface ZoomImageProps {
  image: TourImage
  /** The dialog's title, with the caption under it; the caption alone when there is none. */
  title?: string
  /** While the tour plays, opening the image pauses it first. */
  playing: boolean
  onPause(): void
  className?: string
}

/**
 * A thumbnail that opens its image larger in a dialog (spec §4.3), pausing the tour first if it is
 * playing. The full image takes focus, so the keyboard can scroll a tall one.
 */
export function ZoomImage({ image, title, playing, onPause, className }: ZoomImageProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      {/* Part of the tour's own UI, like its cards: opening it pauses the tour, never takes it over. */}
      <button
        type="button"
        data-tour="zoom"
        className={cx(styles.thumb, className)}
        aria-label={`${image.alt}, open larger`}
        onClick={() => {
          if (playing) onPause()
          setOpen(true)
        }}
      >
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          className={styles.thumbImage}
        />
      </button>
      <Modal
        open={open}
        onClose={close}
        title={title ?? image.caption}
        description={title === undefined ? undefined : image.caption}
        width={960}
        actions={<Button onClick={close}>Close</Button>}
      >
        {/* The tour's own dialog: while it is open, nothing on the page counts as a take-over. */}
        <img
          data-tour="image"
          tabIndex={0}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className={styles.full}
        />
      </Modal>
    </>
  )
}
