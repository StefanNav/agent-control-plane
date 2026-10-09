import type { HTMLAttributes } from 'react'
import { cx } from '../../../lib/cx'
import styles from './VisuallyHidden.module.css'

export type VisuallyHiddenProps = HTMLAttributes<HTMLSpanElement>

/** Text for screen readers only: a column's name, a status line, a state the eye reads from an icon. */
export function VisuallyHidden({ className, ...rest }: VisuallyHiddenProps) {
  return <span className={cx(styles.hidden, className)} {...rest} />
}
