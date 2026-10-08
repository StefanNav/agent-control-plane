import type { HTMLAttributes } from 'react'
import { cx } from '../../../lib/cx'
import styles from './Paper.module.css'

export type PaperProps = HTMLAttributes<HTMLDivElement>

/** Form sheet: 1px `lineStrong`, r6, padding 28 32 32, gap 28. */
export function Paper({ className, ...rest }: PaperProps) {
  return <div className={cx(styles.paper, className)} {...rest} />
}
