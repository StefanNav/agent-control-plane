import { isDeep, pebblePath, restPose, transformOf } from './geometry'
import styles from './AttuneMark.module.css'

export interface AttuneMarkProps {
  /** The mark's width in px; its height follows (130 / 140). */
  size: number
  /** `surface` on the light pages; `ink` on the prototype bar, which is ink in every theme. */
  tone?: 'surface' | 'ink'
  /** Placement only (margins, alignment). */
  className?: string
}

/** Attune's mark, still: four pebbles framed tight. Decorative: the name beside it says Attune. */
export function AttuneMark({ size, tone = 'surface', className }: AttuneMarkProps) {
  return (
    <svg
      viewBox="-70 -65 140 130"
      width={size}
      height={Math.round((size * 130) / 140)}
      aria-hidden="true"
      focusable="false"
      data-attune="mark"
      data-tone={tone}
      className={[styles.mark, className].filter(Boolean).join(' ')}
    >
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          className={isDeep(i) ? styles.deep : styles.soft}
          d={pebblePath(i, 0, 1)}
          transform={transformOf(restPose(i))}
        />
      ))}
    </svg>
  )
}
